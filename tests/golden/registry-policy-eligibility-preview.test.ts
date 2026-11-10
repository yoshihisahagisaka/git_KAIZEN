import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';

const actor='20000000-0000-4000-8000-000000000097';
const issuer='https://accounts.google.com';
const subject='synthetic-policy-preview-administrator';
const sessionHash=tokenHash('synthetic-policy-preview-verified-session');
const cells={NEWCOMER:'DENY',STANDARD:'REQUEST',LEAD:'REQUEST'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let recipient:string;
let grantId:string;

const assign=(level:string|null,target=actor,service=ids.service)=>db.runtime.query(`
  select factact_private.operator_policy_assign_level($1,$2,$3,$4,$5,$6)`,
  [sessionHash,randomUUID(),service,target,level,'Synthetic eligibility assignment']);
const version=async(values:unknown=cells,service=ids.service)=>{
 const id=randomUUID();
 await db.runtime.query(`select factact_private.operator_policy_create_version(
   $1,$2,$3,$4::jsonb,$5)`,
   [sessionHash,id,service,JSON.stringify(values),'Synthetic eligibility version']);
 return id;
};
const publish=(id:string|null,service=ids.service)=>db.runtime.query(`
  select factact_private.operator_policy_publish($1,$2,$3,$4,$5)`,
  [sessionHash,randomUUID(),service,id,'Synthetic eligibility publication']);

// The preview deliberately is not callable from factact_runtime. This helper
// simulates its future *internal* invocation with the non-login Registry owner,
// independently of every existing production application Registry endpoint.
const eligibility=async({tenant=ids.tenant,contextTenant=ids.tenant,operator=actor,
 service=ids.service,contract=ids.contract,customer=recipient}:{tenant?:string;
 contextTenant?:string;operator?:string;service?:string;contract?:string;
 customer?:string}={}):Promise<string>=>{
 const client=await db.admin.connect();
 try{
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE factact_registry_executor');
  await client.query('select set_config($1,$2,true)',
   ['factact.tenant_id',contextTenant]);
  const result=await client.query<{eligibility:string}>(`
   select factact_private.registry_display_name_policy_eligibility(
    $1,$2,$3,$4,$5) as eligibility`,
   [tenant,operator,service,contract,customer]);
  await client.query('COMMIT');
  return result.rows[0]!.eligibility;
 }catch(error){
  await client.query('ROLLBACK');
  throw error;
 }finally{client.release();}
};
const grant=async(operations:string[]=['UPDATE'],customer=recipient)=>{
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,'ACTIVE',
   now()-interval '1 day',$8)`,
  [id,ids.tenant,actor,ids.service,ids.contract,customer,operations,ids.operator]);
 return id;
};

beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('delete from factact_private.scoped_grant_approvers');
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'preview-actor@example.invalid','Preview operator','ACTIVE')`,
  [actor,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,ids.operator]);
 const identity=new PgIdentityStore(db.runtime,db.oidc);
 await identity.createVerifiedSession(sessionHash,{tenantId:ids.tenant,operatorId:ids.operator},
  'policy-preview-csrf',{issuer,subject});
 await db.admin.query(`insert into factact_private.scoped_grant_approvers
  (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
  [issuer,subject]);
 recipient=await withTenant(db.runtime,ids.tenant,client=>
  new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
   randomUUID(),ids.service,ids.organization));
 grantId=await grant();
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('isolated Registry policy eligibility preview: no active cutover',()=>{
 it('defaults to DENY without level/publication; runtime has no private execute or table read',async()=>{
  expect(await eligibility()).toBe('DENY');
  await assign('STANDARD');
  expect(await eligibility()).toBe('DENY');
  await version();
  expect(await eligibility()).toBe('DENY');
  await expect(withTenant(db.runtime,ids.tenant,client=>client.query(`
   select factact_private.registry_display_name_policy_eligibility($1,$2,$3,$4,$5)`,
   [ids.tenant,actor,ids.service,ids.contract,recipient])))
   .rejects.toMatchObject({code:'42501'});
  for(const table of ['operator_policy_assignment_events','operator_policy_versions',
   'operator_policy_publication_events']){
   await expect(db.runtime.query(`select * from factact_private.${table}`))
    .rejects.toMatchObject({code:'42501'});
  }
  const privilege=(await db.admin.query(`select
   pg_get_userbyid(p.proowner) as owner,
   has_function_privilege('factact_runtime',p.oid,'EXECUTE') as runtime_execute,
   has_function_privilege('factact_registry_executor',p.oid,'EXECUTE') as executor_execute
   from pg_proc p where p.oid='factact_private.registry_display_name_policy_eligibility(
    uuid,uuid,uuid,uuid,uuid)'::regprocedure`)).rows[0];
  expect(privilege).toEqual({owner:'factact_registry_executor',runtime_execute:false,
   executor_execute:true});
 });

 it('returns REQUEST only for the latest published REQUEST cell and assigned level',async()=>{
  await assign('NEWCOMER');
  const first=await version();
  await publish(first);
  expect(await eligibility()).toBe('DENY');
  await assign('STANDARD');
  expect(await eligibility()).toBe('REQUEST');
  const blocked=await version({NEWCOMER:'DENY',STANDARD:'DENY',LEAD:'REQUEST'});
  await publish(blocked);
  expect(await eligibility()).toBe('DENY');
  await publish(first);
  expect(await eligibility()).toBe('REQUEST');
  await assign(null);
  expect(await eligibility()).toBe('DENY');
  await assign('LEAD');
  expect(await eligibility()).toBe('REQUEST');
  await publish(null);
  expect(await eligibility()).toBe('DENY');
  await publish(first);
  expect(await eligibility()).toBe('REQUEST');
 });

 it('intersects exact UPDATE Grant and active target; policy never expands a Grant',async()=>{
  await assign('STANDARD');
  await publish(await version());
  expect(await eligibility()).toBe('REQUEST');
  expect(await eligibility({operator:ids.operator})).toBe('DENY');
  expect(await eligibility({contract:randomUUID()})).toBe('DENY');
  expect(await eligibility({service:randomUUID()})).toBe('DENY');
  const secondOrganization=randomUUID();
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
   values($1,$2,'Unrelated recipient','ACTIVE')`,[secondOrganization,ids.tenant]);
  const secondRecipient=await withTenant(db.runtime,ids.tenant,client=>
   new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,secondOrganization));
  expect(await eligibility({customer:secondRecipient})).toBe('DENY');
  await db.admin.query(`update factact.scoped_actor_grants
   set operations=array['REVIEW']::text[] where id=$1`,[grantId]);
  expect(await eligibility()).toBe('DENY');
  await db.admin.query(`update factact.scoped_actor_grants
   set operations=array['UPDATE']::text[] where id=$1`,[grantId]);
  expect(await eligibility()).toBe('REQUEST');
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',effective_until=now() where id=$1`,[grantId]);
  expect(await eligibility()).toBe('DENY');
  grantId=await grant();
  expect(await eligibility()).toBe('REQUEST');
  await db.admin.query('update factact.operators set status=$2 where id=$1',
   [actor,'INACTIVE']);
  expect(await eligibility()).toBe('DENY');
 });

 it('denies foreign or mismatched Tenant context and emits no operational side effects',async()=>{
  await assign('STANDARD');
  await publish(await version());
  const snapshot=async()=>{
   const result=await db.admin.query(`select
    (select count(*)::int from factact.changes) as changes,
    (select count(*)::int from factact.registry_edit_requests) as requests,
    (select count(*)::int from factact.audit_events) as audits,
    (select count(*)::int from factact.scoped_actor_grants) as grants,
    (select count(*)::int from factact_private.operator_policy_publication_events) as publications`);
   return result.rows[0];
  };
  const before=await snapshot();
  expect(await eligibility({tenant:randomUUID()})).toBe('DENY');
  expect(await eligibility({contextTenant:randomUUID()})).toBe('DENY');
  expect(await eligibility({customer:randomUUID()})).toBe('DENY');
  expect(await eligibility()).toBe('REQUEST');
  expect(await snapshot()).toEqual(before);
  const person=(await db.admin.query('select display_name,registry_revision from factact.people where id=$1',
   [ids.person])).rows[0];
  expect(person).toEqual({display_name:'田中 一郎',registry_revision:'0'});
 });
});
