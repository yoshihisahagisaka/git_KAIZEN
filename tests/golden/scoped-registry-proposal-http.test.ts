import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {createApp} from '../../apps/web/src/server/app.js';

const actor='20000000-0000-4000-8000-000000000077';
const companyB='30000000-0000-4000-8000-000000000077';
const subject='registry-http-proposer';
const cookie='factact_session=registry-http-proposal';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
 issuer:'https://accounts.google.com' as const,clientId:'test',clientSecret:'test',
 redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgIdentityStore,app:ReturnType<typeof createApp>;
let recipientA:string,personB:string;

const body=()=>({serviceId:ids.service,requestId:randomUUID(),requestKey:randomUUID(),
 proposedDisplayName:'田中 太郎',reason:'本人から表記訂正の依頼',expectedRegistryRevision:0});
const post=(personId:string,input:Record<string,unknown>,csrf='csrf')=>request(app)
 .post(`/api/scoped/registry/people/${personId}/display-name-proposals`)
 .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(input);
const directory=(organizationId:string)=>request(app)
 .get(`/api/scoped/registry/organizations/${organizationId}/people?serviceId=${ids.service}`)
 .set('Cookie',cookie);
const grant=async(operations:string[])=>{
 const grantId=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,now()-interval '1 day',$8)`,
  [grantId,ids.tenant,actor,ids.service,ids.contract,recipientA,operations,ids.operator]);
 return grantId;
};

beforeAll(async()=>{
 db=await testDatabase();
 store=new PgIdentityStore(db.runtime,db.oidc);
 const reader=new PgScopedAccessReader(db.runtime);
 app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer:config.issuer,subject})},
  pino({level:'silent'}),undefined,undefined,undefined,undefined,undefined,reader,
  new RegistryEditCommands(new PgRegistryEditStore(db.runtime)));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'registry-proposer@example.invalid','Registry HTTP proposer','ACTIVE')`,
  [actor,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[config.issuer,subject,ids.tenant,actor]);
 await store.createVerifiedSession(tokenHash('registry-http-proposal'),
  {tenantId:ids.tenant,operatorId:actor},'csrf',{issuer:config.issuer,subject});
 await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
  values($1,$2,'Customer B confidential','ACTIVE')`,[companyB,ids.tenant]);
 personB=randomUUID();
 await db.admin.query(`insert into factact.people
  (id,tenant_id,organization_id,display_name,lifecycle_status)
  values($1,$2,$3,'Customer B private person','ACTIVE')`,[personB,ids.tenant,companyB]);
 [recipientA]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return [await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   await repo.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('SCOPED Registry display-name HTTP proposal',()=>{
 it('requires verified session, exact CSRF/Origin and strict caller body',async()=>{
  const value=body();
  await request(app).post(`/api/scoped/registry/people/${ids.person}/display-name-proposals`)
   .send(value).expect(401);
  await post(ids.person,value,'wrong').expect(403);
  await request(app).post(`/api/scoped/registry/people/${ids.person}/display-name-proposals`)
   .set('Cookie',cookie).set('Origin','https://attacker.invalid').set('x-csrf-token','csrf')
   .send(value).expect(403);
  await post(ids.person,{...value,tenantId:ids.tenant}).expect(400);
  await post(ids.person,{...value,actorOperatorId:actor}).expect(400);
  await post(ids.person,{...value,organizationId:ids.organization}).expect(400);
  await post(ids.person,{...value,expectedRegistryRevision:-1}).expect(400);
  await post(ids.person,{...value,reason:''}).expect(400);
  await post(ids.person,value).expect(404);
 });

 it('keeps READ-only directory visible but rejects unauthorized edits',async()=>{
  await grant(['READ']);
  const listing=(await directory(ids.organization).expect(200)).body.data;
  expect(listing.canPropose).toBe(false);
  expect(listing.items).toEqual(expect.arrayContaining([
   expect.objectContaining({personId:ids.person,registryRevision:0}),
  ]));
  await post(ids.person,body()).expect(404);
 });

 it('saves one pending Change, not a Person edit or fabricated Work; exact retry is idempotent',async()=>{
  await grant(['READ','UPDATE']);
  expect((await directory(ids.organization).expect(200)).body.data.canPropose).toBe(true);
  const input=body();
  const saved=await post(ids.person,input).expect(202);
  expect(saved.body.data).toMatchObject({changeId:expect.any(String),status:'PENDING_REVIEW'});
  const changeId=saved.body.data.changeId as string;
  expect((await post(ids.person,input).expect(202)).body.data.changeId).toBe(changeId);
  await post(ids.person,{...input,proposedDisplayName:'田中 三郎'}).expect(409);
  const {rows}=await db.admin.query(`select c.status,c.work_id,c.action_id,
    r.reason,r.target_person_id,r.source_work_id,p.display_name,p.registry_revision,
    (select count(*)::integer from factact.audit_events a
      where a.aggregate_id=c.id) as audit_count
    from factact.changes c join factact.registry_edit_requests r
      on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.tenant_id=r.tenant_id and p.id=r.target_person_id
    where c.id=$1`,[changeId]);
  expect(rows).toEqual([expect.objectContaining({status:'PROPOSED',work_id:null,action_id:null,
   source_work_id:null,reason:input.reason,target_person_id:ids.person,
   display_name:'田中 一郎',registry_revision:'0',audit_count:1})]);
 });

 it('does not reveal B or unknown Person under A-only Grant, even with shared Service',async()=>{
  await grant(['READ','UPDATE']);
  await directory(companyB).expect(404);
  const outside=await post(personB,body()).expect(404);
  const missing=await post(randomUUID(),body()).expect(404);
  expect(outside.body.error).toEqual(missing.body.error);
  expect(JSON.stringify(outside.body)).not.toContain('Customer B');
  expect((await db.admin.query(`select count(*)::integer as n from factact.registry_edit_requests`))
   .rows[0].n).toBe(0);
 });

 it('stops on revoked Grant and stale revision with no unauthorized Audit',async()=>{
  const granted=await grant(['READ','UPDATE']);
  const stale={...body(),expectedRegistryRevision:1};
  await post(ids.person,stale).expect(409);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$1,
       revocation_reason='HTTP revocation test'
   where id=$2`,[ids.operator,granted]);
  await directory(ids.organization).expect(404);
  await post(ids.person,body()).expect(404);
  expect((await db.admin.query(`select count(*)::integer as n from factact.registry_edit_requests`))
   .rows[0].n).toBe(0);
 });
});
