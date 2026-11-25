import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';

const actorId='20000000-0000-4000-8000-000000000125';
const now='2026-11-25T04:00:00.000Z';
const operator:Operator={
 id:actorId,tenantId:ids.tenant,displayName:'scoped lifecycle operator',
 tenantName:'atLIB',roles:[],readAuthorityMode:'SCOPED',
};
let db:Awaited<ReturnType<typeof testDatabase>>,store:PgScopedAccessReader,
 commands:SupportCommands;
beforeAll(async()=>{
 db=await testDatabase();
 store=new PgScopedAccessReader(db.runtime,{now:()=>now});
 commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),
  {id:randomUUID,now:()=>now},store);
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'lifecycle@example.invalid','Scoped','ACTIVE')`,[actorId,ids.tenant]);
},60_000);
afterAll(async()=>{await db?.close();},60_000);
async function grant(operations:string[]){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE','SUPPORT',$6,$7,$8)`,[
  id,ids.tenant,actorId,ids.service,ids.contract,operations,
  '2026-11-01T00:00:00.000Z',ids.operator,
 ]);
 return id;
}
async function setup(approve:boolean){
 await grant(['CREATE','UPDATE','READ']);
 if(approve)await grant(['APPROVE']);
 const received=await commands.recordScopedNewCallerIntake(operator,{
  requestId:randomUUID(),serviceId:ids.service,symptom:'受付後に対応完了',
  caller:{kind:'NEW',organizationName:'新規受付の対象企業',
   displayName:'受付担当者',distinctPersonConfirmed:false},
  decision:'REQUIRED',reason:'確認した相談に対応を開始',
 });
 const receipt=await store.scopedIntakeReceipt(ids.tenant,actorId,ids.service,received.eventId);
 if(!receipt||!received.workId)throw Error('missing Work/receipt');
 await commands.recordScopedIntakeBeneficiary(operator,ids.service,received.eventId,{
  requestId:randomUUID(),expectedRevision:0,kind:'CONFIRMED',
  organizationId:receipt.callerOrganizationId,reason:'対象企業を人が確認した',
 });
 return {eventId:received.eventId,workId:received.workId};
}
const close=(workId:string,requestId=randomUUID())=>commands.recordScopedSupportClose(operator,workId,{
 requestId,expectedLifecycleRevision:0,expectedRecordRevision:0,
 responseText:'手順を案内し、結果を確認した',disposition:'COMPLETED' as const,followUpAt:null,
 close:{outcome:'RESOLVED' as const,closeReason:'問い合わせが解決済み',
  confirmsOutstandingResponsibilityEnded:true as const},
});
const reopen=(workId:string,closeId:string,requestId=randomUUID())=>
 commands.reopenScopedSupportWork(operator,workId,{
  requestId,expectedLifecycleRevision:1,expectedCloseDecisionId:closeId,
  reason:'追加の問い合わせにより再開が必要',
  disposition:'INVESTIGATING' as const,followUpAt:'2026-11-27T02:00:00.000Z',
 });

describe('SONIX P0-A7 scoped lifecycle, independent UPDATE/APPROVE gate',()=>{
 it('denies Close without a current APPROVE even when UPDATE and READ allow normal replies',async()=>{
  const {workId}=await setup(false);
  expect(await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId)).toBeNull();
  await expect(close(workId)).rejects.toMatchObject({status:404});
  expect((await db.admin.query('select status from factact.work where id=$1',[workId])).rows)
   .toEqual([{status:'OPEN'}]);
  expect((await db.admin.query('select count(*)::int n from factact.support_work_close_decisions')).rows)
   .toEqual([{n:0}]);
 });
 it('records Close with human provenance then authorized Reopen, without duplicate Work',async()=>{
  const {workId,eventId}=await setup(true);
  expect(await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId))
   .toMatchObject({workId,status:'OPEN',lifecycleRevision:0,
    recordRevision:0,latestCloseDecisionId:null});
  const req=randomUUID(),first=await close(workId,req);
  const replay=await close(workId,req);
  expect(replay.id).toBe(first.id);
  const closed=await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId);
  expect(closed?.status).toBe('COMPLETED');
  expect(closed?.latestCloseDecisionId).toBeTruthy();
  expect(closed?.lifecycleRevision).toBe(1);
  const reopened=await reopen(workId,closed!.latestCloseDecisionId!);
  expect(reopened.kind).toBe('REOPENED');
  const after=await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId);
  expect(after?.status).toBe('IN_PROGRESS');
  expect(after?.lifecycleRevision).toBe(2);
  expect((await db.admin.query('select count(*)::int n from factact.work where support_event_id=$1',
   [eventId])).rows).toEqual([{n:1}]);
  const lifecycle=(await db.admin.query('select kind from factact.support_work_lifecycle_events where work_id=$1 order by revision',
   [workId])).rows.map(x=>x.kind);
  expect(lifecycle).toEqual(['RESPONSE_RECORDED','REOPENED']);
  expect((await db.admin.query('select count(*)::int n from factact.support_work_close_decisions where work_id=$1',
   [workId])).rows).toEqual([{n:1}]);
 });
 it('rechecking revoked APPROVE prevents Reopen while preserving completed Work',async()=>{
  const {workId}=await setup(true);
  await close(workId);
  const current=await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId);
  const g=await db.admin.query(`select id from factact.scoped_actor_grants
    where actor_operator_id=$1 and 'APPROVE'=any(operations)`,[actorId]);
  const id=g.rows[0].id as string;
  await db.admin.query(`update factact.scoped_actor_grants
    set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
      revocation_reason='権限が終了' where id=$1`,[id,ids.operator]);
  await expect(reopen(workId,current!.latestCloseDecisionId!))
   .rejects.toMatchObject({status:404});
  expect((await db.admin.query('select status from factact.work where id=$1',[workId])).rows)
   .toEqual([{status:'COMPLETED'}]);
 });
 it('rejects stale lifecycle revision and incorrect previous Close decision',async()=>{
  const {workId}=await setup(true);await close(workId);
  const ctx=(await store.scopedSupportLifecycleContext(ids.tenant,actorId,workId))!;
  await expect(reopen(workId,randomUUID())).rejects.toMatchObject({code:'STALE_REVISION'});
  await reopen(workId,ctx.latestCloseDecisionId!);
  await expect(reopen(workId,ctx.latestCloseDecisionId!))
   .rejects.toMatchObject({code:'WORK_STATE_CONFLICT'});
 });
});
