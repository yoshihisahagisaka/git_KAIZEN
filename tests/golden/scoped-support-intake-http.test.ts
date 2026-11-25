import {randomUUID} from 'node:crypto';
import {beforeAll,beforeEach,afterAll,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import {createApp} from '../../apps/web/src/server/app.js';

const tenantActor='20000000-0000-4000-8000-000000000113';
const subject='scoped-new-caller-intake-http';
const issuer='https://accounts.google.com';
const cookie='factact_session=scoped-new-caller-session';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',
 databaseSsl:false,issuer:issuer as 'https://accounts.google.com',
 clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgIdentityStore,app:ReturnType<typeof createApp>;
const intake=(requestId=randomUUID())=>({
 requestId,serviceId:ids.service,symptom:'初回の電話相談',
 caller:{kind:'NEW',organizationName:'未登録の会社',displayName:'初回担当',
  distinctPersonConfirmed:false},
 decision:'REQUIRED',reason:'オペレーターが確認して対応開始',
});
const post=(body:object,csrf='csrf')=>
 request(app).post('/api/scoped/support-intake/new-caller')
  .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);
beforeAll(async()=>{
 db=await testDatabase();store=new PgIdentityStore(db.runtime,db.oidc);
 const uow=new PgSupportUnitOfWork(db.runtime);
 const reader=new PgScopedAccessReader(db.runtime,{now:()=> '2026-11-25T01:00:00.000Z'});
 const commands=new SupportCommands(uow,{id:randomUUID,now:()=> '2026-11-25T01:00:00.000Z'},reader);
 app=createApp(config,store,{
  authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject}),
 },pino({level:'silent'}),undefined,
  {commands,queries:new SupportQueries(uow)},undefined,reader);
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query(`insert into factact.operators
  (id,tenant_id,email,display_name,status)
  values($1,$2,'scoped-http@example.invalid','Scoped intake operator','ACTIVE')`,
  [tenantActor,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,tenantActor]);
 await store.createVerifiedSession(tokenHash('scoped-new-caller-session'),
  {tenantId:ids.tenant,operatorId:tenantActor},'csrf',{issuer,subject});
},60_000);
afterAll(async()=>await db?.close());
async function grant(){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE','SUPPORT',array['CREATE'],$6,$7)`,[
  id,ids.tenant,tenantActor,ids.service,ids.contract,'2026-11-01T00:00:00Z',ids.operator,
 ]);
 return id;
}
describe('scoped intake POST is human-triggered, auth/CSRF checked and narrowly typed',()=>{
 it('does not create any inquiry on GET and accepts an authorized explicit POST only',async()=>{
  await grant();
  await request(app).get('/api/scoped/support-intake/services')
   .set('Cookie',cookie).expect(200);
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows[0].n).toBe(0);
  const payload=intake();
  const response=await post(payload).expect(201);
  expect(response.body.data.eventId).toBeTruthy();
  expect(response.body.data.workId).toBeTruthy();
  const retry=await post(payload).expect(201);
  expect(retry.body.data).toEqual(response.body.data);
  const event=await db.admin.query('select created_by_operator_id from factact.support_events where id=$1',
   [response.body.data.eventId]);
  expect(event.rows).toEqual([{created_by_operator_id:tenantActor}]);
  const counts=await db.admin.query(`select
   (select count(*)::int from factact.support_events) events,
   (select count(*)::int from factact.work where lane='SUPPORT') work`);
  expect(counts.rows).toEqual([{events:1,work:1}]);
  // Current unconfirmed beneficiary: this CREATE right does not grant Work READ.
  await request(app).get('/api/scoped/support-work/'+response.body.data.workId)
   .set('Cookie',cookie).expect(404);
 });
 it('rejects untrusted actor/tenant or existing Person input and never creates a Work',async()=>{
  await grant();
  await request(app).post('/api/scoped/support-intake/new-caller').send(intake()).expect(401);
  await post(intake(),'wrong-csrf').expect(403);
  await post({...intake(),tenantId:ids.tenant}).expect(400);
  await post({...intake(),actorId:tenantActor}).expect(400);
  await post({...intake(),caller:{kind:'EXISTING',personId:ids.person}}).expect(400);
  await post({...intake(),caller:{...intake().caller,
   organizationId:ids.organization}}).expect(400);
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows[0].n).toBe(0);
 });
 it('rejects an ungranted Actor, including after revocation',async()=>{
  await post(intake()).expect(404);
  const id=await grant();
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='停止'
   where id=$1`,[id,ids.operator]);
  await post(intake()).expect(404);
  expect((await db.admin.query('select count(*)::int n from factact.support_events')).rows[0].n).toBe(0);
 });
});


const getBeneficiary=(eventId:string,serviceId=ids.service)=>
 request(app).get('/api/scoped/support-intake/events/'+eventId+'/beneficiary?serviceId='+serviceId)
 .set('Cookie',cookie);
const postBeneficiary=(eventId:string,body:object,csrf='csrf')=>
 request(app).post('/api/scoped/support-intake/events/'+eventId+'/beneficiary')
  .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);
async function operationGrant(operation:'UPDATE'|'READ',objectKind:'SUPPORT'|'REGISTRY'='SUPPORT'){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE',$6,$7,$8,$9)`,[
  id,ids.tenant,tenantActor,ids.service,ids.contract,objectKind,[operation],
  '2026-11-01T00:00:00Z',ids.operator,
 ]);
 return id;
}
describe('P0-A4 strict human beneficiary HTTP gate',()=>{
 it('returns own receipt only and permits explicit beneficiary decision with independent UPDATE',async()=>{
  await grant();
  const received=(await post(intake()).expect(201)).body.data as {eventId:string;workId:string};
  const own=(await getBeneficiary(received.eventId).expect(200)).body.data as {
   callerOrganizationId:string;beneficiaryRevision:number;
   beneficiaryKind:string|null;canConfirm:boolean;
  };
  expect(own).toMatchObject({beneficiaryRevision:0,beneficiaryKind:null,canConfirm:false});
  expect(own.callerOrganizationId).toBeTruthy();
  const command={requestId:randomUUID(),serviceId:ids.service,expectedRevision:0,
   kind:'CONFIRMED',organizationId:own.callerOrganizationId,
   humanConfirmed:true,reason:'問い合わせ内容を確認し支援対象の企業を判断'};
  await postBeneficiary(received.eventId,command).expect(404);
  await operationGrant('UPDATE');
  expect((await getBeneficiary(received.eventId).expect(200)).body.data.canConfirm).toBe(true);
  const result=(await postBeneficiary(received.eventId,command).expect(200)).body.data;
  expect(result).toMatchObject({eventId:received.eventId,kind:'CONFIRMED',revision:1});
  expect((await postBeneficiary(received.eventId,command).expect(200)).body.data).toEqual(result);
  const current=(await getBeneficiary(received.eventId).expect(200)).body.data;
  expect(current.beneficiaryRevision).toBe(1);
  // A beneficiary decision does not grant Work READ.
  await request(app).get('/api/scoped/support-work/'+received.workId)
   .set('Cookie',cookie).expect(404);
  await operationGrant('READ');
  await request(app).get('/api/scoped/support-work/'+received.workId)
   .set('Cookie',cookie).expect(200);
 });
 it('rejects forged IDs, false attestation, hidden target and CSRF bypass',async()=>{
  await grant();await operationGrant('UPDATE');
  const received=(await post(intake()).expect(201)).body.data as {eventId:string};
  const own=(await getBeneficiary(received.eventId).expect(200)).body.data as {
   callerOrganizationId:string;
  };
  const command={requestId:randomUUID(),serviceId:ids.service,expectedRevision:0,
   kind:'CONFIRMED',organizationId:own.callerOrganizationId,
   humanConfirmed:true,reason:'確認理由'};
  await request(app).get('/api/scoped/support-intake/events/'+randomUUID()+
   '/beneficiary?serviceId='+ids.service).set('Cookie',cookie).expect(404);
  await postBeneficiary(received.eventId,{...command,humanConfirmed:false}).expect(400);
  await postBeneficiary(received.eventId,{...command,tenantId:ids.tenant}).expect(400);
  await postBeneficiary(received.eventId,{...command,organizationId:ids.organization}).expect(404);
  await postBeneficiary(received.eventId,{...command,serviceId:randomUUID()}).expect(404);
  await postBeneficiary(received.eventId,command,'invalid-csrf').expect(403);
  await request(app).post('/api/scoped/support-intake/events/'+received.eventId+
   '/beneficiary').send(command).expect(401);
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions')).rows)
   .toEqual([{n:0}]);
 });
});
