import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';

const reviewer='20000000-0000-4000-8000-000000000089';
const companyB='30000000-0000-4000-8000-000000000089';
const context=(actorOperatorId:string)=>({tenantId:ids.tenant,actorOperatorId});
let db:Awaited<ReturnType<typeof testDatabase>>;
let commands:RegistryEditCommands,recipientA:string,recipientB:string,personB:string;

async function grant(actor:string,operations:string[],recipient:string){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,now()-interval '1 day',$8)`,
  [id,ids.tenant,actor,ids.service,ids.contract,recipient,operations,ids.operator]);
 return id;
}
async function propose(personId=ids.person,displayName='田中 太郎'){
 return commands.proposeDisplayName(context(ids.operator),{serviceId:ids.service,
  personId,requestId:randomUUID(),requestKey:randomUUID(),
  proposedDisplayName:displayName,reason:'現在の表示表記を訂正',expectedRegistryRevision:0});
}

beforeAll(async()=>{
 db=await testDatabase();
 commands=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'registry-return-reviewer@example.invalid','Reviewer','ACTIVE')`,
  [reviewer,ids.tenant]);
 await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
  values($1,$2,'Customer B confidential','ACTIVE')`,[companyB,ids.tenant]);
 personB=randomUUID();
 await db.admin.query(`insert into factact.people
  (id,tenant_id,organization_id,display_name,lifecycle_status)
  values($1,$2,$3,'Customer B private','ACTIVE')`,[personB,ids.tenant,companyB]);
 [recipientA,recipientB]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return [await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   await repo.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry reviewer return/reject with immutable reason and no Person mutation',()=>{
 it('preserves existing SUPPORT DIAGNOSTIC Evidence acceptance when adding REVIEW_RETURN',async()=>{
  const {rows}=await db.admin.query(`select pg_get_constraintdef(oid) as definition
    from pg_constraint where conrelid='factact.evidence'::regclass
      and conname='evidence_evidence_type_check'`);
  expect(rows).toHaveLength(1);
  for(const allowed of ['EXECUTION_ATTESTATION','VERIFICATION','DIAGNOSTIC','REVIEW_RETURN'])
   expect(rows[0].definition).toContain(allowed);
 });

 it('REVIEW-only rejects, stores exact reason/Evidence/Audit, is idempotent and allows fresh proposal',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose();
  const reason='入力内容に相違があるため、登録表記を確認してください';
  expect(await commands.returnDisplayName(context(reviewer),changeId,reason))
   .toEqual({changeId});
  expect(await commands.returnDisplayName(context(reviewer),changeId,reason))
   .toEqual({changeId});
  const {rows}=await db.admin.query(`select c.status,c.rejection_reason,
    c.rejected_by_operator_id,c.rejected_at,c.work_id,c.action_id,
    p.display_name,p.registry_revision,
    (select count(*)::integer from factact.audit_events a where a.aggregate_id=c.id) as audits,
    (select count(*)::integer from factact.change_evidence e where e.change_id=c.id) as evidence
    from factact.changes c join factact.registry_edit_requests r
      on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.id=r.target_person_id where c.id=$1`,[changeId]);
  expect(rows).toEqual([expect.objectContaining({status:'REJECTED',rejection_reason:reason,
   rejected_by_operator_id:reviewer,rejected_at:expect.any(Date),
   work_id:null,action_id:null,display_name:'田中 一郎',registry_revision:'0',
   audits:2,evidence:1})]);
  const evidence=await db.admin.query(`select e.evidence_type,e.content_text,
    e.created_by_operator_id from factact.change_evidence ce join factact.evidence e
    on e.tenant_id=ce.tenant_id and e.id=ce.evidence_id where ce.change_id=$1`,[changeId]);
  expect(evidence.rows).toEqual([{evidence_type:'REVIEW_RETURN',
   content_text:reason,created_by_operator_id:reviewer}]);
  const newRequest=await propose(ids.person,'田中 次郎');
  expect(newRequest.changeId).not.toBe(changeId);
  expect((await db.admin.query(`select status from factact.changes where id=$1`,[changeId]))
   .rows[0].status).toBe('REJECTED');
 });

 it('a verified but not committed proposal can be returned without erasing verification evidence',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose();
  await commands.verifyDisplayName(context(reviewer),changeId,'提案書類上の表記を確認');
  await commands.returnDisplayName(context(reviewer),changeId,'最終確認で再訂正が必要');
  const {rows}=await db.admin.query(`select status,verified_by_operator_id,
    rejected_by_operator_id,committed_at,
    (select count(*)::integer from factact.audit_events where aggregate_id=$1) as audits,
    (select count(*)::integer from factact.change_evidence where change_id=$1) as evidence
    from factact.changes where id=$1`,[changeId]);
  expect(rows).toEqual([{status:'REJECTED',verified_by_operator_id:reviewer,
   rejected_by_operator_id:reviewer,committed_at:null,audits:3,evidence:2}]);
  await expect(commands.confirmDisplayName(context(reviewer),changeId))
   .rejects.toMatchObject({code:'42501'});
 });

 it('a second reason or another reviewer cannot rewrite a rejected record',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose();
  await commands.returnDisplayName(context(reviewer),changeId,'説明内容の再確認');
  await expect(commands.returnDisplayName(context(reviewer),changeId,'別の理由'))
   .rejects.toMatchObject({code:'40001'});
  expect((await db.admin.query(`select rejection_reason from factact.changes where id=$1`,
   [changeId])).rows[0].rejection_reason).toBe('説明内容の再確認');
 });

 it('legacy role and proposer self-review never grant return',async()=>{
  await grant(ids.operator,['UPDATE','REVIEW'],recipientA);
  const {changeId}=await propose();
  await db.admin.query(`insert into factact.operator_roles values($1,$2,'REVIEWER')`,
   [ids.tenant,reviewer]);
  await expect(commands.returnDisplayName(context(reviewer),changeId,'権限なし'))
   .rejects.toMatchObject({code:'42501'});
  await expect(commands.returnDisplayName(context(ids.operator),changeId,'自己承認しない'))
   .rejects.toMatchObject({code:'42501'});
  expect((await db.admin.query(`select status from factact.changes where id=$1`,[changeId]))
   .rows[0].status).toBe('PROPOSED');
 });

 it('A-only reviewer cannot reject B Change by direct ID in same Service',async()=>{
  await grant(ids.operator,['UPDATE'],recipientB);
  await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose(personB,'Customer B revised');
  await expect(commands.returnDisplayName(context(reviewer),changeId,'対象外'))
   .rejects.toMatchObject({code:'42501'});
  expect((await db.admin.query(`select status from factact.changes where id=$1`,[changeId]))
   .rows[0].status).toBe('PROPOSED');
 });

 it('revoked REVIEW Grant after proposal denies return with no partial history',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  const grantId=await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose();
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Review return test'
    where id=$2`,[ids.operator,grantId]);
  await expect(commands.returnDisplayName(context(reviewer),changeId,'無効権限'))
   .rejects.toMatchObject({code:'42501'});
  const {rows}=await db.admin.query(`select c.status,c.rejection_reason,
    (select count(*)::integer from factact.audit_events where aggregate_id=c.id) as audits,
    (select count(*)::integer from factact.change_evidence where change_id=c.id) as evidence
    from factact.changes c where c.id=$1`,[changeId]);
  expect(rows).toEqual([{status:'PROPOSED',rejection_reason:null,audits:1,evidence:0}]);
 });

 it('COMMITTED proposal cannot be rejected and direct runtime Change UPDATE remains prohibited',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const {changeId}=await propose();
  await commands.confirmDisplayName(context(reviewer),changeId);
  await expect(commands.returnDisplayName(context(reviewer),changeId,'確定後の試行'))
   .rejects.toMatchObject({code:'40001'});
  await expect(withTenant(db.runtime,ids.tenant,async client=>client.query(
   `update factact.changes set status='REJECTED' where id=$1`,[changeId])))
   .rejects.toMatchObject({code:'42501'});
  const {rows}=await db.admin.query(`select c.status,p.display_name
    from factact.changes c join factact.registry_edit_requests r
      on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.id=r.target_person_id where c.id=$1`,[changeId]);
  expect(rows).toEqual([{status:'COMMITTED',display_name:'田中 太郎'}]);
 });
});
