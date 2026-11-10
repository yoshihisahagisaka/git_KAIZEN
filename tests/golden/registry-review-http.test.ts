import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {PgRegistryReviewReader} from '../../apps/web/src/server/persistence/registry-review-reader.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {createApp} from '../../apps/web/src/server/app.js';

const reviewer='20000000-0000-4000-8000-000000000088';
const companyB='30000000-0000-4000-8000-000000000088';
const issuer='https://accounts.google.com';
const subject='registry-reviewer-http';
const cookie='factact_session=registry-reviewer-http';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
 issuer:issuer as 'https://accounts.google.com',clientId:'test',clientSecret:'test',
 redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let commands:RegistryEditCommands,app:ReturnType<typeof createApp>,store:PgIdentityStore;
let recipientA:string,recipientB:string,personB:string;

const directory=()=>request(app).get('/api/scoped/registry/review-queue?limit=20').set('Cookie',cookie);
const confirm=(id:string,body:Record<string,unknown>={attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1'},csrf='csrf')=>
 request(app).post(`/api/scoped/registry/review-queue/${id}/confirm`)
  .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);
async function grant(actor:string,operations:string[],recipient:string){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,now()-interval '1 day',$8)`,
  [id,ids.tenant,actor,ids.service,ids.contract,recipient,operations,ids.operator]);
 return id;
}
async function propose(personId=ids.person,label='田中 太郎'){
 return commands.proposeDisplayName({tenantId:ids.tenant,actorOperatorId:ids.operator},
  {serviceId:ids.service,personId,requestId:randomUUID(),requestKey:randomUUID(),
   proposedDisplayName:label,reason:'登録表記の訂正申告',expectedRegistryRevision:0});
}

beforeAll(async()=>{
 db=await testDatabase();
 store=new PgIdentityStore(db.runtime,db.oidc);
 commands=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
 app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject})},
  pino({level:'silent'}),undefined,undefined,undefined,undefined,undefined,undefined,
  commands,new PgRegistryReviewReader(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'registry-reviewer@example.invalid','Reviewer','ACTIVE')`,
  [reviewer,ids.tenant]);
 // Legacy Roles cannot contribute to reviewed scope.
 for(const role of ['ADMIN','OPERATOR','REVIEWER'])await db.admin.query(
  'insert into factact.operator_roles values($1,$2,$3)',[ids.tenant,reviewer,role]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,reviewer]);
 await store.createVerifiedSession(tokenHash('registry-reviewer-http'),
  {tenantId:ids.tenant,operatorId:reviewer},'csrf',{issuer,subject});
 await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
  values($1,$2,'Customer B confidential','ACTIVE')`,[companyB,ids.tenant]);
 personB=randomUUID();
 await db.admin.query(`insert into factact.people
  (id,tenant_id,organization_id,display_name,lifecycle_status)
  values($1,$2,$3,'Customer B private','ACTIVE')`,[personB,ids.tenant,companyB]);
 [recipientA,recipientB]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repository=new PgJoinRepository(client,ids.tenant);
  return [await repository.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   await repository.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry review queue and atomic one-click Verify → Commit',()=>{
 it('requires session and CSRF, rejects forged Tenant/Actor/attestation',async()=>{
  const changeId=randomUUID();
  await request(app).get('/api/scoped/registry/review-queue').expect(401);
  await request(app).post(`/api/scoped/registry/review-queue/${changeId}/confirm`)
   .send({attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1'}).expect(401);
  await confirm(changeId,undefined,'wrong').expect(403);
  await confirm(changeId,{attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1',tenantId:ids.tenant}).expect(400);
  await confirm(changeId,{attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1',actorOperatorId:reviewer}).expect(400);
  await confirm(changeId,{attestation:'AUTO_APPROVE'}).expect(400);
 });

 it('legacy REVIEWER Role and a known Change ID do not grant queue or approval',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  const {changeId}=await propose();
  expect((await directory().expect(200)).body.data.items).toEqual([]);
  await confirm(changeId).expect(404);
  expect((await db.admin.query('select status from factact.changes where id=$1',[changeId]))
   .rows[0].status).toBe('PROPOSED');
 });

 it('shows only target-specific A review, never B in the same Service or global counts',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(ids.operator,['UPDATE'],recipientB);
  const a=await propose(),b=await propose(personB,'Customer B revised');
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const queue=(await directory().expect(200)).body.data;
  expect(queue.items).toEqual([expect.objectContaining({changeId:a.changeId,
   originalDisplayName:'田中 一郎',proposedDisplayName:'田中 太郎',canConfirm:true})]);
  expect(queue).not.toHaveProperty('total');
  expect(JSON.stringify(queue)).not.toContain('Customer B');
  const outside=await confirm(b.changeId).expect(404);
  const missing=await confirm(randomUUID()).expect(404);
  expect(outside.body.error).toEqual(missing.body.error);
 });

 it('one confirm performs distinct Verify and Commit atomically and retry does not repeat Audit',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const {changeId}=await propose();
  const confirmed=await confirm(changeId).expect(200);
  expect(confirmed.body.data).toEqual({changeId,status:'COMMITTED'});
  const {rows}=await db.admin.query(`select c.status,c.work_id,c.action_id,
    c.verified_by_operator_id,c.committed_by_operator_id,
    p.display_name,p.registry_revision,
    (select count(*)::integer from factact.audit_events a where a.aggregate_id=c.id) as audits,
    (select count(*)::integer from factact.change_evidence e where e.change_id=c.id) as evidence
    from factact.changes c join factact.registry_edit_requests r
      on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.id=r.target_person_id where c.id=$1`,[changeId]);
  expect(rows).toEqual([expect.objectContaining({status:'COMMITTED',work_id:null,action_id:null,
   verified_by_operator_id:reviewer,committed_by_operator_id:reviewer,
   display_name:'田中 太郎',registry_revision:'1',audits:3,evidence:1})]);
  await confirm(changeId).expect(200);
  expect((await db.admin.query('select count(*)::integer as n from factact.audit_events where aggregate_id=$1',
   [changeId])).rows[0].n).toBe(3);
  expect((await directory().expect(200)).body.data.items).toEqual([]);
 });

 it('REVIEW-only cannot leave half-verified state when APPROVE fails',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  await grant(reviewer,['REVIEW'],recipientA);
  const {changeId}=await propose();
  const queue=(await directory().expect(200)).body.data;
  expect(queue.items).toEqual([expect.objectContaining({changeId,canConfirm:false})]);
  await confirm(changeId).expect(404);
  const {rows}=await db.admin.query(`select status,verified_by_operator_id,
    (select count(*)::integer from factact.change_evidence where change_id=$1) as evidence,
    (select count(*)::integer from factact.audit_events where aggregate_id=$1) as audits
    from factact.changes where id=$1`,[changeId]);
  expect(rows).toEqual([{status:'PROPOSED',verified_by_operator_id:null,evidence:0,audits:1}]);
 });

 it('Grant revoked after queue read denies Confirm; no Person or history mutation',async()=>{
  await grant(ids.operator,['UPDATE'],recipientA);
  const reviewGrant=await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const {changeId}=await propose();
  expect((await directory().expect(200)).body.data.items).toHaveLength(1);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Review HTTP test'
    where id=$2`,[ids.operator,reviewGrant]);
  await confirm(changeId).expect(404);
  expect((await directory().expect(200)).body.data.items).toEqual([]);
  const current=await db.admin.query('select display_name,registry_revision from factact.people where id=$1',[ids.person]);
  expect(current.rows).toEqual([{display_name:'田中 一郎',registry_revision:'0'}]);
 });
});
