import {randomUUID} from 'node:crypto';
import {beforeAll,beforeEach,afterAll,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';

const actorId='20000000-0000-4000-8000-000000000111';
const serviceB='60000000-0000-4000-8000-000000000111';
const contractB='70000000-0000-4000-8000-000000000111';
const at='2026-11-25T04:00:00.000Z';
let db:Awaited<ReturnType<typeof testDatabase>>,reader:PgScopedAccessReader;
beforeAll(async()=>{db=await testDatabase();reader=new PgScopedAccessReader(db.runtime,{now:()=>at});},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'scoped-intake@example.invalid','Scoped operator','ACTIVE')`,
  [actorId,ids.tenant]);
 await db.admin.query(`insert into factact.services
  (id,tenant_id,organization_id,service_model_code,name,status)
  values($1,$2,$3,'HELPDESK','Service B','ACTIVE')`,
  [serviceB,ids.tenant,ids.organization]);
 await db.admin.query(`insert into factact.contract_profiles
  (id,tenant_id,service_id,version,effective_from,status,configuration_json)
  values($1,$2,$3,1,$4,'ACTIVE',$5)`,
  [contractB,ids.tenant,serviceB,'2026-11-01T00:00:00Z',
   {support:{enabled:true,executeRoles:['OPERATOR']}}]);
},60_000);
afterAll(async()=>await db?.close());
async function grant(serviceId:string,contractId:string,operations:string[]=['CREATE']){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE','SUPPORT',$6,$7,$8)`,
  [id,ids.tenant,actorId,serviceId,contractId,operations,
   '2026-11-01T00:00:00Z',ids.operator]);
 return id;
}
const list=(limit=20)=>reader.scopedIntakeServices(ids.tenant,actorId,limit,null);
describe('SONIX P0-A1 scoped service-first selector',()=>{
 it('returns only services delegated for current SUPPORT CREATE, without customer data',async()=>{
  await grant(ids.service,ids.contract);
  await grant(serviceB,contractB,['READ']);
  const data=await list();
  expect(data.items).toEqual([{id:ids.service,name:'情シスKAIZEN'}]);
  expect(data.nextCursor).toBeNull();
  expect(JSON.stringify(data)).not.toContain('Service B');
  expect(JSON.stringify(data)).not.toContain('organization');
 });
 it('re-checks revocation and actor status on every request',async()=>{
  const id=await grant(ids.service,ids.contract);
  expect((await list()).items).toHaveLength(1);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='契約終了'
   where id=$1`,[id,ids.operator]);
  expect((await list()).items).toEqual([]);
  await grant(ids.service,ids.contract);
  await db.admin.query("update factact.operators set status='INACTIVE' where id=$1",[actorId]);
  expect((await list()).items).toEqual([]);
 });
 it('denies ambiguous active contracts and unrelated tenant',async()=>{
  await grant(ids.service,ids.contract);
  await db.admin.query(`insert into factact.contract_profiles
   (id,tenant_id,service_id,version,effective_from,status,configuration_json)
   values($1,$2,$3,2,'2026-11-01T00:00:00Z','ACTIVE',$4)`,
   [randomUUID(),ids.tenant,ids.service,{support:{enabled:true,executeRoles:['OPERATOR']}}]);
  expect((await list()).items).toEqual([]);
  const other=await reader.scopedIntakeServices('10000000-0000-4000-8000-000000000099',actorId,20,null);
  expect(other.items).toEqual([]);
 });
});

describe('SONIX P0-A2 isolated service recipient directory',()=>{
 it('needs separate REGISTRY READ; returned Organizations belong to authorized Service only',async()=>{
  const orgB='30000000-0000-4000-8000-000000000111';
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
   values($1,$2,'Another service private customer','ACTIVE')`,[orgB,ids.tenant]);
  await withTenant(db.runtime,ids.tenant,async client=>{
   const repository=new PgJoinRepository(client,ids.tenant);
   await repository.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization);
   await repository.ensureOrganizationRecipient(randomUUID(),serviceB,orgB);
  });
  await grant(ids.service,ids.contract);
  const missing=await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null);
  expect(missing.items).toEqual([]);
  const registryGrant=randomUUID();
  await db.admin.query(`insert into factact.scoped_actor_grants
   (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
    scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
   values($1,$2,$3,$4,$5,'SERVICE','REGISTRY',array['READ'],$6,$7)`,
   [registryGrant,ids.tenant,actorId,ids.service,ids.contract,
    '2026-11-01T00:00:00Z',ids.operator]);
  await db.admin.query(`insert into factact.contact_points(id,tenant_id,organization_id,display_phone,normalized_phone,source,observed_at,verification_state)
   values($1,$2,$3,'03-1234-5678','0312345678','synthetic',now(),'UNVERIFIED'),($4,$2,$5,'03-1234-5678','0312345678','synthetic',now(),'UNVERIFIED')`,
   [randomUUID(),ids.tenant,ids.organization,randomUUID(),orgB]);
  const match=await reader.scopedMemberCandidates(ids.tenant,actorId,ids.service,'Ｅｘａｍｐｌｅ','０３－１２３４－５６７８');
  expect(match).toEqual({items:[{organizationId:ids.organization,name:'Example株式会社',nameEvidence:'EXACT',phoneMatch:true}],tooMany:false});
  expect((await reader.scopedMemberCandidates(ids.tenant,actorId,ids.service,'','0312345678')).items).toHaveLength(1);
  expect((await reader.scopedMemberCandidates(ids.tenant,actorId,ids.service,'unknown','0312345679')).items).toEqual([]);
  expect((await reader.scopedMemberCandidates(ids.tenant,actorId,serviceB,'','0312345678')).items).toEqual([]);
  const visible=await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null);
  expect(visible.items).toEqual([{id:ids.organization,name:'Example株式会社'}]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null,'ＥＸＡＭＰＬＥ')).items)
   .toEqual([{id:ids.organization,name:'Example株式会社'}]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null,'private')).items)
   .toEqual([]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null,'%')).items)
   .toEqual([]);
  expect(JSON.stringify(visible)).not.toContain('private customer');
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorId,serviceB,20,null)).items).toEqual([]);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='委任終了'
   where id=$1`,[registryGrant,ids.operator]);
  expect((await reader.scopedIntakeOrganizations(ids.tenant,actorId,ids.service,20,null)).items).toEqual([]);
  expect((await reader.scopedMemberCandidates(ids.tenant,actorId,ids.service,'Example','0312345678')).items).toEqual([]);
 });
});


describe('support service navigation candidates',()=>{
 it('separates READ navigation from CREATE and keeps the original intake directory restricted',async()=>{
  await grant(ids.service,ids.contract,['READ']);
  await grant(serviceB,contractB,['CREATE']);
  const page=await reader.scopedSupportServiceContexts(ids.tenant,actorId,20,null);
  expect(page.items).toEqual(expect.arrayContaining([
   {id:ids.service,name:'情シスKAIZEN',canReceive:false},
   {id:serviceB,name:'Service B',canReceive:true},
  ]));
  expect(page.items).toHaveLength(2);
  expect((await list()).items).toEqual([{id:serviceB,name:'Service B'}]);
 });
 it('does not expose services with UPDATE only or revoked READ',async()=>{
  const id=await grant(ids.service,ids.contract,['READ']);
  await grant(serviceB,contractB,['UPDATE']);
  expect((await reader.scopedSupportServiceContexts(ids.tenant,actorId,20,null)).items).toHaveLength(1);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='委任終了' where id=$1`,[id,ids.operator]);
  expect((await reader.scopedSupportServiceContexts(ids.tenant,actorId,20,null)).items).toEqual([]);
 });
});
