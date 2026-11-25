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


async function otherGrant(objectKind:'SUPPORT'|'REGISTRY',operations:string[]){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE',$6,$7,$8,$9)`,[
  id,ids.tenant,scopedId,ids.service,ids.contract,objectKind,operations,
  '2026-11-01T00:00:00Z',ids.operator,
 ]);
 return id;
}
const confirm=(eventId:string,organizationId:string,requestId=randomUUID(),
 expectedRevision=0)=>commands.recordScopedIntakeBeneficiary(scoped,ids.service,eventId,{
  requestId,expectedRevision,kind:'CONFIRMED',organizationId,
  reason:'担当者が問い合わせ内容と支援対象企業を明示確認',
});

describe('P0-A4 explicit beneficiary attribution after SCOPED intake',()=>{
 it('shows only own new Caller organization without automatic beneficiary or Work visibility',async()=>{
  await grant();
  const received=await commands.recordScopedNewCallerIntake(scoped,input());
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
  const receipt=await reader.scopedIntakeReceipt(ids.tenant,scopedId,ids.service,received.eventId);
  expect(receipt).toMatchObject({
   eventId:received.eventId,serviceId:ids.service,
   workId:received.workId,callerOrganizationName:'未登録の問い合わせ企業',
   beneficiaryRevision:0,beneficiaryKind:null,canConfirm:false,
  });
  expect((await reader.supportWorkPage(ids.tenant,scopedId,20,null)).items).toEqual([]);
  const rows=await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions');
  expect(rows.rows).toEqual([{n:0}]);
 });
 it('requires extra explicit SUPPORT UPDATE for human beneficiary decision; reuses existing Work',async()=>{
  await grant();
  const received=await commands.recordScopedNewCallerIntake(scoped,input());
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
  const receipt=(await reader.scopedIntakeReceipt(ids.tenant,scopedId,ids.service,received.eventId))!;
  await expect(confirm(received.eventId,receipt.callerOrganizationId)).rejects.toMatchObject({status:404});
  await otherGrant('SUPPORT',['UPDATE']);
  const requestId=randomUUID();
  const result=await confirm(received.eventId,receipt.callerOrganizationId,requestId);
  expect(result).toMatchObject({
   kind:'CONFIRMED',revision:1,recordedByOperatorId:scopedId,
  });
  const replay=await confirm(received.eventId,receipt.callerOrganizationId,requestId);
  expect(replay.id).toBe(result.id);
  expect((await reader.scopedIntakeReceipt(ids.tenant,scopedId,ids.service,received.eventId))?.beneficiaryRevision).toBe(1);
  expect(await reader.supportWorkSummary(ids.tenant,scopedId,received.workId!)).toBeNull();
  const rows=await db.admin.query('select count(*)::int n from factact.work where support_event_id=$1',[received.eventId]);
  expect(rows.rows).toEqual([{n:1}]);
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions where support_event_id=$1',[received.eventId])).rows).toEqual([{n:1}]);
  await otherGrant('SUPPORT',['READ']);
  const accessible=await reader.supportWorkSummary(ids.tenant,scopedId,received.workId!);
  expect(accessible?.workId).toBe(received.workId);
  expect(accessible?.serviceRecipientId).toBe(result.serviceRecipientId);
  // Attribution never promotes the Caller statement into verified Registry.
  expect((await db.admin.query(`select reliability from factact.recipient_observations
   where support_event_id=$1`,[received.eventId])).rows).toEqual([{reliability:'UNVERIFIED'}]);
 });
 it('rejects a forged other-customer Organization ID without separately authorized Registry',async()=>{
  await grant();await otherGrant('SUPPORT',['UPDATE']);
  const received=await commands.recordScopedNewCallerIntake(scoped,input());
  await expect(confirm(received.eventId,ids.organization)).rejects.toMatchObject({status:404});
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions')).rows)
   .toEqual([{n:0}]);
  expect(await new PgScopedAccessReader(db.runtime,{now:()=>at})
   .scopedIntakeReceipt(ids.tenant,ids.operator,ids.service,received.eventId)).toBeNull();
 });
 it('allows a different registered service recipient only with independent REGISTRY READ',async()=>{
  await grant();await otherGrant('SUPPORT',['UPDATE']);
  const {withTenant}=await import('../../apps/web/src/server/persistence/database.js');
  const {PgJoinRepository}=await import('../../apps/web/src/server/persistence/join-repository.js');
  await withTenant(db.runtime,ids.tenant,async client=>{
   await new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,ids.organization);
  });
  const received=await commands.recordScopedNewCallerIntake(scoped,input());
  await expect(confirm(received.eventId,ids.organization)).rejects.toMatchObject({status:404});
  await otherGrant('REGISTRY',['READ']);
  const result=await confirm(received.eventId,ids.organization);
  expect(result.kind).toBe('CONFIRMED');
  const target=await db.admin.query(`select recipient_organization_id
    from factact.service_recipients where id=$1`,[result.serviceRecipientId]);
  expect(target.rows).toEqual([{recipient_organization_id:ids.organization}]);
 });
 it('respects revocation, another Event owner and optimistic human revision',async()=>{
  await grant();
  const update=await otherGrant('SUPPORT',['UPDATE']);
  const received=await commands.recordScopedNewCallerIntake(scoped,input());
  const own=(await new PgScopedAccessReader(db.runtime,{now:()=>at})
   .scopedIntakeReceipt(ids.tenant,scopedId,ids.service,received.eventId))!;
  await db.admin.query(`update factact.scoped_actor_grants
    set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
     revocation_reason='委任終了' where id=$1`,[update,ids.operator]);
  await expect(confirm(received.eventId,own.callerOrganizationId)).rejects.toMatchObject({status:404});
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions')).rows)
   .toEqual([{n:0}]);
  await otherGrant('SUPPORT',['UPDATE']);
  await confirm(received.eventId,own.callerOrganizationId);
  await expect(confirm(received.eventId,own.callerOrganizationId,randomUUID(),0))
   .rejects.toMatchObject({code:'STALE_REVISION'});
 });
});


describe('P0-A5 authorized registered Caller intake reusing SUPPORT',()=>{
 it('reuses one existing Person with a separately scoped REGISTRY READ and no auto beneficiary',async()=>{
  await grant();
  const {withTenant}=await import('../../apps/web/src/server/persistence/database.js');
  const {PgJoinRepository}=await import('../../apps/web/src/server/persistence/join-repository.js');
  await withTenant(db.runtime,ids.tenant,async client=>
   new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,ids.organization));
  const request={requestId:randomUUID(),serviceId:ids.service,symptom:'登録済みの問い合わせ者からの質問',
   caller:{kind:'EXISTING' as const,personId:ids.person},
   decision:'REQUIRED' as const,reason:'業務対応が必要と確認'};
  await expect(commands.recordScopedExistingCallerIntake(scoped,request))
   .rejects.toMatchObject({status:404});
  await otherGrant('REGISTRY',['READ']);
  const received=await commands.recordScopedExistingCallerIntake(scoped,request);
  const retry=await commands.recordScopedExistingCallerIntake(scoped,request);
  expect(retry).toEqual(received);
  expect(received.workId).toBeTruthy();
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
  expect(await reader.scopedIntakeReceipt(ids.tenant,scopedId,ids.service,received.eventId))
   .toMatchObject({eventId:received.eventId,callerOrganizationId:ids.organization,
    beneficiaryRevision:0,canConfirm:false});
  expect((await db.admin.query("select count(*)::int n from factact.people")).rows).toEqual([{n:1}]);
  expect((await db.admin.query("select count(*)::int n from factact.organizations")).rows).toEqual([{n:1}]);
  expect((await db.admin.query("select count(*)::int n from factact.support_event_beneficiary_decisions")).rows)
   .toEqual([{n:0}]);
  await otherGrant('SUPPORT',['UPDATE']);
  const decision=await confirm(received.eventId,ids.organization);
  expect(decision.kind).toBe('CONFIRMED');
  expect(await reader.supportWorkSummary(ids.tenant,scopedId,received.workId!)).toBeNull();
  await otherGrant('SUPPORT',['READ']);
  expect((await reader.supportWorkSummary(ids.tenant,scopedId,received.workId!))?.workId)
   .toBe(received.workId);
 });
 it('cannot reference a Person outside a registered Service Recipient even with broad Registry READ',async()=>{
  await grant();await otherGrant('REGISTRY',['READ']);
  const otherOrg=randomUUID(),otherPerson=randomUUID();
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
   values($1,$2,'非受託の企業','ACTIVE')`,[otherOrg,ids.tenant]);
  await db.admin.query(`insert into factact.people(id,tenant_id,organization_id,
   display_name,lifecycle_status) values($1,$2,$3,'別の問い合わせ者','ACTIVE')`,
   [otherPerson,ids.tenant,otherOrg]);
  await expect(commands.recordScopedExistingCallerIntake(scoped,{
   requestId:randomUUID(),serviceId:ids.service,symptom:'顧客が違う',
   caller:{kind:'EXISTING',personId:otherPerson},decision:'REQUIRED',reason:'要確認',
  })).rejects.toMatchObject({status:404});
  expect((await db.admin.query("select count(*)::int n from factact.support_events")).rows)
   .toEqual([{n:0}]);
 });
});


describe('P0-A6 scoped new Person at an existing Organization',()=>{
 async function setup(){
  await grant();
  const {withTenant}=await import('../../apps/web/src/server/persistence/database.js');
  const {PgJoinRepository}=await import('../../apps/web/src/server/persistence/join-repository.js');
  await withTenant(db.runtime,ids.tenant,async dbClient=>
   new PgJoinRepository(dbClient,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,ids.organization));
 }
 const request=(id=randomUUID(),name='新規受付 担当',distinct=false)=>({
  requestId:id,serviceId:ids.service,symptom:'既存企業から別の担当者の相談',
  caller:{kind:'NEW' as const,organizationId:ids.organization,
   displayName:name,distinctPersonConfirmed:distinct},
  decision:'REQUIRED' as const,reason:'本人が相談した内容から担当者が判断',
 });
 it('uses existing Organization, creates exactly one UNVERIFIED Person and Event/Work',async()=>{
  await setup();await otherGrant('REGISTRY',['READ','CREATE']);
  const before=(await db.admin.query('select count(*)::int n from factact.organizations')).rows[0].n;
  const arg=request(),first=await commands.recordScopedNewPersonAtExistingOrganization(scoped,arg);
  expect((await commands.recordScopedNewPersonAtExistingOrganization(scoped,arg))).toEqual(first);
  expect(first.workId).toBeTruthy();
  expect((await db.admin.query('select count(*)::int n from factact.organizations')).rows[0].n).toBe(before);
  const people=await db.admin.query(`select display_name,organization_id from factact.people
    where display_name=$1`,[arg.caller.displayName]);
  expect(people.rows).toEqual([{display_name:arg.caller.displayName,organization_id:ids.organization}]);
  const event=await db.admin.query('select caller_input_snapshot from factact.support_events where id=$1',[first.eventId]);
  expect(event.rows[0].caller_input_snapshot).toMatchObject({
   kind:'NEW',organizationId:ids.organization,
   displayName:arg.caller.displayName,distinctPersonConfirmed:false,
  });
  expect((await db.admin.query('select reliability from factact.recipient_observations where support_event_id=$1',[first.eventId])).rows)
   .toEqual([{reliability:'UNVERIFIED'}]);
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions')).rows)
   .toEqual([{n:0}]);
 });
 it('requires separate REGISTRY CREATE; SUPPORT CREATE+READ alone cannot register a Person',async()=>{
  await setup();await otherGrant('REGISTRY',['READ']);
  await expect(commands.recordScopedNewPersonAtExistingOrganization(scoped,request()))
   .rejects.toMatchObject({status:404});
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows)
   .toEqual([{n:0}]);
  await otherGrant('REGISTRY',['CREATE']);
  expect((await commands.recordScopedNewPersonAtExistingOrganization(scoped,request())).workId).toBeTruthy();
 });
 it('same-name Person must be explicitly confirmed as distinct, without merging any Person',async()=>{
  await setup();await otherGrant('REGISTRY',['READ','CREATE']);
  const person=(await db.admin.query('select display_name from factact.people where id=$1',[ids.person])).rows[0].display_name as string;
  await expect(commands.recordScopedNewPersonAtExistingOrganization(scoped,request(randomUUID(),person)))
   .rejects.toMatchObject({code:'DUPLICATE_PERSON'});
  const input=request(randomUUID(),person,true);
  const result=await commands.recordScopedNewPersonAtExistingOrganization(scoped,input);
  expect(result.eventId).toBeTruthy();
  expect((await db.admin.query('select count(*)::int n from factact.people where organization_id=$1 and display_name=$2',
   [ids.organization,person])).rows).toEqual([{n:2}]);
 });
 it('forged Organization outside Service does not produce a Person or Event',async()=>{
  await setup();await otherGrant('REGISTRY',['READ','CREATE']);
  const wrong=randomUUID();
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
   values($1,$2,'別サービスのみ','ACTIVE')`,[wrong,ids.tenant]);
  await expect(commands.recordScopedNewPersonAtExistingOrganization(scoped,{
   ...request(),caller:{kind:'NEW',organizationId:wrong,displayName:'認可されない対象',
    distinctPersonConfirmed:false},
  })).rejects.toMatchObject({status:404});
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows)
   .toEqual([{n:0}]);
 });
});
