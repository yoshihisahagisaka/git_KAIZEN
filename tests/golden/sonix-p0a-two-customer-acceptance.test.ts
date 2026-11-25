import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';

const serviceB='60000000-0000-4000-8000-000000000126';
const contractB='70000000-0000-4000-8000-000000000126';
const orgB='30000000-0000-4000-8000-000000000126';
const personB='40000000-0000-4000-8000-000000000126';
const actorA='20000000-0000-4000-8000-000000000126';
const actorB='20000000-0000-4000-8000-000000000127';
const outsider='20000000-0000-4000-8000-000000000128';
const at='2026-11-25T04:00:00.000Z';
const internal:Operator={id:ids.operator,tenantId:ids.tenant,
 displayName:'Internal',tenantName:'atLIB',roles:['ADMIN','OPERATOR','REVIEWER']};
let db:Awaited<ReturnType<typeof testDatabase>>,reader:PgScopedAccessReader;
let commands:SupportCommands;
let recipientA:string,recipientB:string;
let workA:string,workB:string,workServiceB:string;

beforeAll(async()=>{
 db=await testDatabase();reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
 commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),
  {id:randomUUID,now:()=>at},reader);
},60_000);
beforeEach(async()=>{
 await db.reset();
 const personName=(await db.admin.query('select display_name from factact.people where id=$1',[ids.person])).rows[0].display_name;
 await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
  values($1,$2,'AAA機密B社','ACTIVE')`,[orgB,ids.tenant]);
 await db.admin.query(`insert into factact.people(id,tenant_id,organization_id,display_name,lifecycle_status)
  values($1,$2,$3,$4,'ACTIVE')`,[personB,ids.tenant,orgB,personName]);
 await db.admin.query(`insert into factact.services
  (id,tenant_id,organization_id,service_model_code,name,status)
  values($1,$2,$3,'HELPDESK','別サービスB','ACTIVE')`,[serviceB,ids.tenant,orgB]);
 await db.admin.query(`insert into factact.contract_profiles
  (id,tenant_id,service_id,version,effective_from,status,configuration_json)
  values($1,$2,$3,1,'2026-11-01T00:00:00Z','ACTIVE',$4)`,[
   contractB,ids.tenant,serviceB,
   {support:{enabled:true,executeRoles:['ADMIN','OPERATOR']}},
 ]);
 for(const [actor,email] of [
  [actorA,'actor-a@example.invalid'],[actorB,'actor-b@example.invalid'],
  [outsider,'outsider@example.invalid'],
 ]){
  await db.admin.query(`insert into factact.operators
   (id,tenant_id,email,display_name,status) values($1,$2,$3,'Scoped','ACTIVE')`,
   [actor,ids.tenant,email]);
  // Historic Roles cannot turn an external SCOPED Actor into internal reader.
  for(const role of ['ADMIN','OPERATOR','REVIEWER'])
   await db.admin.query('insert into factact.operator_roles values($1,$2,$3)',[
    ids.tenant,actor,role,
   ]);
 }
 const data=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return {
   a:await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   b:await repo.ensureOrganizationRecipient(randomUUID(),ids.service,orgB),
   other:await repo.ensureOrganizationRecipient(randomUUID(),serviceB,orgB),
  };
 });
 recipientA=data.a;recipientB=data.b;
 async function makeWork(serviceId:string,org:string){
  const e=await commands.createEvent(internal,{
   requestId:randomUUID(),personId:ids.person,serviceId,symptom:'業務対応の問い合わせ',
  });
  const value=await commands.evaluate(internal,e.id,'REQUIRED','対応開始を人が判断');
  if(!value.work)throw Error('Missing Work');
  await commands.recordBeneficiary(internal,e.id,{
   requestId:randomUUID(),expectedRevision:0,kind:'CONFIRMED',
   organizationId:org,reason:'実際の受益企業を人が確認した',
  });
  return value.work.id;
 }
 workA=await makeWork(ids.service,ids.organization);
 workB=await makeWork(ids.service,orgB);
 workServiceB=await makeWork(serviceB,orgB);
},60_000);
afterAll(async()=>{await db?.close();},60_000);

async function grant(actor:string,serviceId:string,contractId:string,
 objectKind:'SUPPORT'|'REGISTRY',operations:string[],
 scope:'SERVICE'|'SERVICE_RECIPIENT',recipientId:string|null=null){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,service_recipient_id,object_kind,operations,
   effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9,'2026-11-01T00:00:00Z',$10)`,[
   id,ids.tenant,actor,serviceId,contractId,scope,recipientId,objectKind,
   operations,ids.operator,
 ]);
 return id;
}
async function setupA(){
 await grant(actorA,ids.service,ids.contract,'SUPPORT',['CREATE'],'SERVICE');
 const read=await grant(actorA,ids.service,ids.contract,'SUPPORT',['READ','UPDATE'],
  'SERVICE_RECIPIENT',recipientA);
 const registry=await grant(actorA,ids.service,ids.contract,'REGISTRY',['READ'],
  'SERVICE_RECIPIENT',recipientA);
 return {read,registry};
}

describe('SONIX P0-A cross-customer/cross-service scoped acceptance',()=>{
 it('A sees only recipient A, not B in same Service or another Service, even when titles are identical',async()=>{
  await setupA();
  await grant(actorB,ids.service,ids.contract,'SUPPORT',['READ'],
   'SERVICE_RECIPIENT',recipientB);
  const listA=await reader.supportWorkPage(ids.tenant,actorA,20,null);
  expect(listA.items.map(w=>w.workId)).toEqual([workA]);
  expect(JSON.stringify(listA)).not.toContain(workB);
  expect(JSON.stringify(listA)).not.toContain(workServiceB);
  expect(await reader.supportWorkSummary(ids.tenant,actorA,workB)).toBeNull();
  expect(await reader.supportWorkHistory(ids.tenant,actorA,workB,20,null)).toBeNull();
  expect(await reader.supportWorkSummary(ids.tenant,actorA,workServiceB)).toBeNull();
  expect((await reader.supportWorkPage(ids.tenant,actorB,20,null)).items.map(w=>w.workId))
   .toEqual([workB]);
  expect((await reader.supportWorkPage(ids.tenant,outsider,20,null)).items).toEqual([]);
  expect((await reader.supportWorkPage('10000000-0000-4000-8000-000000000099',actorA,20,null)).items)
   .toEqual([]);
 });
 it('authorized intake company selector is recipient-filtered BEFORE LIMIT, search and counts',async()=>{
  const {registry}=await setupA();
  const all=await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,1,null);
  expect(all.items).toEqual([{id:ids.organization,name:'Example株式会社'}]);
  expect(all.nextCursor).toBeNull();
  expect(JSON.stringify(all)).not.toContain('AAA機密B社');
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,1,null,'機密')).items)
   .toEqual([]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorA,serviceB,20,null)).items)
   .toEqual([]);
  const registryPeople=await reader.registryPeople(ids.tenant,actorA,ids.service,orgB,20,null);
  expect(registryPeople).toBeNull();
  // Explicit SERVICE-scope REGISTRY READ is an intentional broader delegation.
  const serviceWide=await grant(actorA,ids.service,ids.contract,'REGISTRY',['READ'],'SERVICE');
  const broad=await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,20,null);
  expect(broad.items.map(x=>x.id).sort()).toEqual([ids.organization,orgB].sort());
  await db.admin.query(`update factact.scoped_actor_grants set
   status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
   revocation_reason='個別契約権限失効' where id=$1`,[registry,ids.operator]);
  const after=await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,20,null);
  expect(after.items.map(x=>x.id).sort()).toEqual([ids.organization,orgB].sort());
  await db.admin.query(`update factact.scoped_actor_grants set
   status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
   revocation_reason='サービス全体権限失効' where id=$1`,[serviceWide,ids.operator]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,20,null)).items)
   .toEqual([]);
 });
 it('revocation removes Work and customer-detail access without granting a different customer',async()=>{
  const {read,registry}=await setupA();
  expect((await reader.supportWorkPage(ids.tenant,actorA,20,null)).items).toHaveLength(1);
  await db.admin.query(`update factact.scoped_actor_grants set
   status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
   revocation_reason='閲覧権限終了' where id=$1`,[read,ids.operator]);
  expect((await reader.supportWorkPage(ids.tenant,actorA,20,null)).items).toEqual([]);
  expect(await reader.supportWorkSummary(ids.tenant,actorA,workA)).toBeNull();
  expect(await reader.supportWorkSummary(ids.tenant,actorA,workB)).toBeNull();
  await db.admin.query(`update factact.scoped_actor_grants set
   status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
   revocation_reason='登録情報の閲覧終了' where id=$1`,[registry,ids.operator]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorA,ids.service,20,null)).items)
   .toEqual([]);
 });
});
