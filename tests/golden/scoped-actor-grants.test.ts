import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import type {ExplicitAccessScope,ResolvedAccessTarget,ScopedOperation} from '../../packages/domain/src/scoped-access.js';

const at='2026-11-06T12:00:00.000Z';
const companyB='30000000-0000-4000-8000-000000000002';
const otherOperator='20000000-0000-4000-8000-000000000002';
const otherTenant='10000000-0000-4000-8000-000000000002';
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Operator',tenantName:'Development',roles:['ADMIN','OPERATOR','REVIEWER']};
const runtime={id:randomUUID,now:()=>at};
let db:Awaited<ReturnType<typeof testDatabase>>;
let reader:PgScopedAccessReader,commands:SupportCommands;
let recipientA:string,recipientB:string;

const target=(scope:ExplicitAccessScope,operation:ScopedOperation='READ',overrides:Partial<ResolvedAccessTarget>={}):ResolvedAccessTarget=>({
 tenantId:ids.tenant,serviceId:ids.service,contractProfileId:ids.contract,
 scope,objectKind:'SUPPORT',operation,...overrides,
});
const recipient=(id:string):ExplicitAccessScope=>({kind:'SERVICE_RECIPIENT',serviceRecipientId:id});
const workScope=(recipientId:string,workId:string):ExplicitAccessScope=>({kind:'WORK',serviceRecipientId:recipientId,workId});
const grant=async(scope:ExplicitAccessScope,options:{
 actorId?:string;operations?:ScopedOperation[];from?:string;until?:string|null;
 serviceId?:string;contractId?:string;objectKind?:ResolvedAccessTarget['objectKind'];
}={})=>{
 const id=randomUUID(),kind=scope.kind;
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,service_recipient_id,work_id,
   object_kind,operations,effective_from,effective_until,issued_by_operator_id)
  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[
  id,ids.tenant,options.actorId??ids.operator,options.serviceId??ids.service,options.contractId??ids.contract,
  kind,kind==='SERVICE'?null:scope.serviceRecipientId,kind==='WORK'?scope.workId:null,
  options.objectKind??'SUPPORT',options.operations??['READ'],options.from??'2026-11-01T00:00:00Z',
  options.until??null,ids.operator,
 ]);
 return id;
};
const createSupportWork=async()=>{
 const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'支援先の確認前'});
 const result=await commands.evaluate(actor,event.id,'REQUIRED','一次対応が必要');
 if(!result.work)throw Error('Expected SUPPORT work');
 return {eventId:event.id,workId:result.work.id};
};
const confirm=async(eventId:string,organizationId:string,revision=0)=>
 commands.recordBeneficiary(actor,eventId,{requestId:randomUUID(),expectedRevision:revision,
  kind:'CONFIRMED',organizationId,reason:'申告とは独立した顧客確認'});

beforeAll(async()=>{
 db=await testDatabase();
 reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
 commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),runtime);
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values($1,$2,$3,$4)',[companyB,ids.tenant,'支援先 B','ACTIVE']);
 await db.admin.query('insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,$3,$4,$5)',[otherOperator,ids.tenant,'other@example.invalid','Other operator','ACTIVE']);
 [recipientA,recipientB]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return [await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
          await repo.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('persisted explicit Actor grants resolve trusted Service/Recipient/Work membership',()=>{
 it('defaults to deny even for ADMIN or a Caller affiliated with the same Organization',async()=>{
  const scope=recipient(recipientA);
  expect(await reader.authorized(ids.operator,target(scope))).toBe(false);
  expect(await reader.authorized(ids.person,target(scope))).toBe(false);
  expect(await reader.authorized(otherOperator,target(scope))).toBe(false);
 });
 it('isolates recipients within the same Tenant and Service, and operations are exact',async()=>{
  await grant(recipient(recipientA),{operations:['READ']});
  expect(await reader.authorized(ids.operator,target(recipient(recipientA)))).toBe(true);
  expect(await reader.authorized(ids.operator,target(recipient(recipientB)))).toBe(false);
  expect(await reader.authorized(ids.operator,target(recipient(recipientA),'UPDATE'))).toBe(false);
  expect(await reader.authorized(otherOperator,target(recipient(recipientA)))).toBe(false);
  expect(await reader.authorized(ids.operator,target({kind:'SERVICE'}))).toBe(false);
 });
 it('allows broader Service scope only when explicitly persisted for the correct Actor and object kind',async()=>{
  await grant({kind:'SERVICE'},{operations:['READ','UPDATE'],objectKind:'SUPPORT'});
  expect(await reader.authorized(ids.operator,target(recipient(recipientB),'UPDATE'))).toBe(true);
  expect(await reader.authorized(ids.operator,target({kind:'SERVICE'}))).toBe(true);
  expect(await reader.authorized(ids.operator,target(recipient(recipientA),'READ',{objectKind:'KNOWLEDGE'}))).toBe(false);
  expect(await reader.authorized(otherOperator,target(recipient(recipientB)))).toBe(false);
 });
 it('denies inactive Actor, Service, Contract, Recipient and expired grants at request time',async()=>{
  const id=await grant(recipient(recipientA));
  const check=()=>reader.authorized(ids.operator,target(recipient(recipientA)));
  expect(await check()).toBe(true);
  await db.admin.query("update factact.operators set status='INACTIVE' where id=$1",[ids.operator]);
  expect(await check()).toBe(false);
  await db.admin.query("update factact.operators set status='ACTIVE' where id=$1",[ids.operator]);
  await db.admin.query("update factact.services set status='INACTIVE' where id=$1",[ids.service]);
  expect(await check()).toBe(false);
  await db.admin.query("update factact.services set status='ACTIVE' where id=$1",[ids.service]);
  await db.admin.query("update factact.contract_profiles set status='INACTIVE' where id=$1",[ids.contract]);
  expect(await check()).toBe(false);
  await db.admin.query("update factact.contract_profiles set status='ACTIVE' where id=$1",[ids.contract]);
  await db.admin.query('update factact.contract_profiles set effective_to=$2 where id=$1',[ids.contract,'2026-11-05T00:00:00Z']);
  expect(await check()).toBe(false);
  await db.admin.query('update factact.contract_profiles set effective_to=null where id=$1',[ids.contract]);
  await db.admin.query("update factact.service_recipients set status='INACTIVE' where id=$1",[recipientA]);
  expect(await check()).toBe(false);
  await db.admin.query("update factact.service_recipients set status='ACTIVE' where id=$1",[recipientA]);
  await db.admin.query("update factact.organizations set status='INACTIVE' where id=$1",[ids.organization]);
  expect(await check()).toBe(false);
  await db.admin.query("update factact.organizations set status='ACTIVE' where id=$1",[ids.organization]);
  await db.admin.query('update factact.scoped_actor_grants set effective_until=$2 where id=$1',[id,'2026-11-05T12:00:00Z']);
  expect(await check()).toBe(false);
 });
 it('denies malformed identifiers without allowing SQL parser failures to become authorization results',async()=>{
  await grant({kind:'SERVICE'});
  expect(await reader.authorized('not-a-uuid',target({kind:'SERVICE'}))).toBe(false);
  expect(await reader.authorized(ids.operator,target({kind:'SERVICE'},'READ',{tenantId:'not-a-uuid'}))).toBe(false);
  expect(await reader.authorized(ids.operator,target(recipient('not-a-uuid')))).toBe(false);
  expect(await reader.authorized(ids.operator,target(workScope(recipientA,'not-a-uuid')))).toBe(false);
 });
 it('requires latest confirmed beneficiary, never the Caller affiliation, for SUPPORT Work scope',async()=>{
  const {eventId,workId}=await createSupportWork();
  await grant(workScope(recipientB,workId));
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,workId)))).toBe(false);
  await confirm(eventId,companyB);
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,workId)))).toBe(true);
  expect(await reader.authorized(ids.operator,target(workScope(recipientA,workId)))).toBe(false);
  await commands.recordBeneficiary(actor,eventId,{requestId:randomUUID(),expectedRevision:1,
   kind:'CLEARED',organizationId:null,reason:'受益先の確認を取り消した'});
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,workId)))).toBe(false);
 });
 it('does not broaden Work-only grant to another Work or all recipient records',async()=>{
  const first=await createSupportWork(),second=await createSupportWork();
  await confirm(first.eventId,companyB);
  await confirm(second.eventId,companyB);
  await grant(workScope(recipientB,first.workId));
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,first.workId)))).toBe(true);
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,second.workId)))).toBe(false);
  expect(await reader.authorized(ids.operator,target(recipient(recipientB)))).toBe(false);
 });
 it('checks true Work/Contract relations even where a valid broad grant exists',async()=>{
  const {eventId,workId}=await createSupportWork();await confirm(eventId,companyB);
  await grant({kind:'SERVICE'});
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,workId)))).toBe(true);
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,randomUUID())))).toBe(false);
  expect(await reader.authorized(ids.operator,target(workScope(recipientB,workId),'READ',{contractProfileId:randomUUID()}))).toBe(false);
  expect(await reader.authorized(ids.operator,target(recipient(recipientB),'READ',{serviceId:randomUUID()}))).toBe(false);
 });
 it('revokes an active grant immediately without preserving session-level permission',async()=>{
  const id=await grant(recipient(recipientA)),check=()=>reader.authorized(ids.operator,target(recipient(recipientA)));
  expect(await check()).toBe(true);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_by_operator_id=$2,revoked_at=$3,revocation_reason='解除を承認済み' where id=$1`,[id,ids.operator,at]);
  expect(await check()).toBe(false);
  await expect(db.admin.query(`update factact.scoped_actor_grants
   set revocation_reason=null where id=$1`,[id])).rejects.toMatchObject({code:'23514'});
 });
 it('enforces composite FK and scope constraints against recipient, Work and operation forgery',async()=>{
  const invalid={kind:'WORK',serviceRecipientId:recipientB,workId:randomUUID()} as const;
  await expect(grant(invalid)).rejects.toMatchObject({code:'23503'});
  await expect(grant({kind:'SERVICE_RECIPIENT',serviceRecipientId:randomUUID()})).rejects.toMatchObject({code:'23503'});
  await expect(grant({kind:'SERVICE'},{operations:['READ','FAKE' as ScopedOperation]})).rejects.toMatchObject({code:'23514'});
  await expect(grant({kind:'SERVICE'},{operations:['READ',null as unknown as ScopedOperation]})).rejects.toMatchObject({code:'23514'});
  const malformedScope=()=>db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,service_recipient_id,
     object_kind,operations,effective_from,issued_by_operator_id)
    values ($1,$2,$3,$4,$5,'SERVICE',$6,'SUPPORT',$7,$8,$9)`,[
   randomUUID(),ids.tenant,ids.operator,ids.service,ids.contract,recipientB,['READ'],'2026-11-01T00:00:00Z',ids.operator]);
  await expect(malformedScope()).rejects.toMatchObject({code:'23514'});
  await db.admin.query('insert into factact.tenants(id,name,status) values($1,$2,$3)',[otherTenant,'Isolated','ACTIVE']);
  await expect(db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     object_kind,operations,effective_from,issued_by_operator_id)
    values ($1,$2,$3,$4,$5,'SERVICE','SUPPORT',$6,$7,$8)`,[
    randomUUID(),otherTenant,ids.operator,ids.service,ids.contract,['READ'],'2026-11-01T00:00:00Z',ids.operator,
  ])).rejects.toMatchObject({code:'23503'});
  await expect(withTenant(db.runtime,otherTenant,client=>client.query('select * from factact.scoped_actor_grants'))).resolves.toMatchObject({rowCount:0});
 });
 it('keeps runtime role read-only and enforces FORCE RLS on persisted grants',async()=>{
  const id=await grant(recipient(recipientA));
  expect((await db.admin.query(`select relrowsecurity,relforcerowsecurity from pg_class
    where oid='factact.scoped_actor_grants'::regclass`)).rows).toEqual([{relrowsecurity:true,relforcerowsecurity:true}]);
  await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
   'update factact.scoped_actor_grants set effective_until=now() where id=$1',[id]
  ))).rejects.toMatchObject({code:'42501'});
  await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
   'delete from factact.scoped_actor_grants where id=$1',[id]
  ))).rejects.toMatchObject({code:'42501'});
  await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
   `insert into factact.scoped_actor_grants(id,tenant_id) values ($1,$2)`,[randomUUID(),ids.tenant]
  ))).rejects.toMatchObject({code:'42501'});
 });
});
