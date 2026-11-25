import {randomUUID} from 'node:crypto';
import {beforeAll,beforeEach,afterAll,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import type {Operator} from '../../packages/domain/src/operator.js';

const scopedId='20000000-0000-4000-8000-000000000112';
const at='2026-11-25T01:00:00.000Z';
const scoped:Operator={id:scopedId,tenantId:ids.tenant,displayName:'Scoped operator',
 tenantName:'atLIB Development',roles:[],readAuthorityMode:'SCOPED'};
let db:Awaited<ReturnType<typeof testDatabase>>,commands:SupportCommands;
const input=(requestId=randomUUID())=>({
 requestId,serviceId:ids.service,symptom:'社内PCの起動についての質問',
 caller:{kind:'NEW' as const,organizationName:'未登録の問い合わせ企業',
   displayName:'初回担当',distinctPersonConfirmed:false as const},
 decision:'REQUIRED' as const,reason:'担当者が受付内容を確認して対応が必要と判断',
});
async function grant(){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE','SUPPORT',array['CREATE'],$6,$7)`,
  [id,ids.tenant,scopedId,ids.service,ids.contract,
   '2026-11-01T00:00:00.000Z',ids.operator]);
 return id;
}
beforeAll(async()=>{
 db=await testDatabase();
 const reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
 commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),
  {id:randomUUID,now:()=>at},reader);
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators
  (id,tenant_id,email,display_name,status)
  values($1,$2,'scoped-intake@example.invalid','Scoped operator','ACTIVE')`,
  [scopedId,ids.tenant]);
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('SONIX P0-A3 first scoped new/unlisted caller intake',()=>{
 it('reuses Event, unverified Observation, Human Evaluation and Work with one explicit request',async()=>{
  await grant();
  const payload=input(),received=await commands.recordScopedNewCallerIntake(scoped,payload);
  expect(received.workId).toBeTruthy();
  const event=await db.admin.query(`select id,service_id,created_by_operator_id,caller_input_snapshot
    from factact.support_events where id=$1`,[received.eventId]);
  expect(event.rows).toHaveLength(1);
  expect(event.rows[0].service_id).toBe(ids.service);
  expect(event.rows[0].created_by_operator_id).toBe(scopedId);
  expect(event.rows[0].caller_input_snapshot).toMatchObject({
   kind:'NEW',organizationName:payload.caller.organizationName,
   displayName:payload.caller.displayName,
  });
  const observation=await db.admin.query(`select reliability,source_type,content_text
   from factact.recipient_observations where support_event_id=$1`,[received.eventId]);
  expect(observation.rows).toEqual([{
   reliability:'UNVERIFIED',source_type:'CALLER',content_text:payload.symptom,
  }]);
  const evaluated=await db.admin.query(`select result,evaluated_by_operator_id from factact.requirement_evaluations
   where support_event_id=$1`,[received.eventId]);
  expect(evaluated.rows).toEqual([{result:'REQUIRED',evaluated_by_operator_id:scopedId}]);
  const work=await db.admin.query(`select id,service_id,work_owner_operator_id,status
   from factact.work where support_event_id=$1`,[received.eventId]);
  expect(work.rows).toEqual([{
   id:received.workId,service_id:ids.service,work_owner_operator_id:scopedId,status:'OPEN',
  }]);
  const beneficiary=await db.admin.query('select id from factact.support_event_beneficiary_decisions where support_event_id=$1',[received.eventId]);
  expect(beneficiary.rows).toEqual([]);
  const events=await db.admin.query(`select event_type from factact.audit_events
   where aggregate_id=$1 order by occurred_at,event_type`,[received.eventId]);
  expect(events.rows.map(row=>row.event_type).sort()).toEqual([
   'SUPPORT_CONTACT_REGISTERED','SUPPORT_EVALUATED','SUPPORT_RECEIVED',
  ]);
 });
 it('is idempotent under same request id and rejects changed retry',async()=>{
  await grant();
  const value=input(),first=await commands.recordScopedNewCallerIntake(scoped,value);
  const replay=await commands.recordScopedNewCallerIntake(scoped,value);
  expect(replay).toEqual(first);
  await expect(commands.recordScopedNewCallerIntake(scoped,{...value,symptom:'別の内容'}))
   .rejects.toMatchObject({code:'RETRY_CONFLICT'});
  const counts=await db.admin.query(`select
   (select count(*)::int from factact.support_events) as events,
   (select count(*)::int from factact.work where lane='SUPPORT') as work,
   (select count(*)::int from factact.organizations where name=$1) as new_org,
   (select count(*)::int from factact.people where display_name=$2) as new_person`,
   [value.caller.organizationName,value.caller.displayName]);
  expect(counts.rows).toEqual([{events:1,work:1,new_org:1,new_person:1}]);
 });
 it('denies a missing or revoked Service CREATE grant without writing anything',async()=>{
  await expect(commands.recordScopedNewCallerIntake(scoped,input())).rejects.toMatchObject({status:404});
  const id=await grant();
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='停止'
   where id=$1`,[id,ids.operator]);
  await expect(commands.recordScopedNewCallerIntake(scoped,input())).rejects.toMatchObject({status:404});
  const r=await db.admin.query('select count(*)::int as n from factact.support_events');
  expect(r.rows).toEqual([{n:0}]);
 });
 it('rejects another Service even with a matching Session and no explicit Grant',async()=>{
  await grant();
  await expect(commands.recordScopedNewCallerIntake(scoped,{...input(),
   serviceId:'60000000-0000-4000-8000-000000000112'})).rejects.toMatchObject({status:404});
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows[0].n).toBe(0);
 });
 it('does not reveal an existing different-customer Organization by name at intake',async()=>{
  await grant();
  const payload={...input(),caller:{...input().caller,
   organizationName:'Example株式会社',displayName:'初回企業の別担当'}};
  const accepted=await commands.recordScopedNewCallerIntake(scoped,payload);
  expect(accepted.eventId).toBeTruthy();
  const res=await db.admin.query('select count(*)::int n from factact.organizations where name=$1',[payload.caller.organizationName]);
  // An unverified reception is isolated from global customer lookup.
  // Human merge/Registry verification is separate, not an information leak.
  expect(res.rows[0].n).toBe(2);
 });
});
