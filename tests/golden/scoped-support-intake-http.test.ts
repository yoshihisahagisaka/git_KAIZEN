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
  const recent='/api/scoped/support-intake/services/'+ids.service+'/organizations/'+own.callerOrganizationId+'/recent';
  expect((await request(app).get(recent).set('Cookie',cookie).expect(200)).body.data.items).toEqual([]);
  const registry=await operationGrant('READ','REGISTRY');
  const history=(await request(app).get(recent).set('Cookie',cookie).expect(200)).body.data.items;
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({workId:received.workId,registryOrganizationId:own.callerOrganizationId});
  const other='/api/scoped/support-intake/services/'+ids.service+'/organizations/'+ids.organization+'/recent';
  expect((await request(app).get(other).set('Cookie',cookie).expect(200)).body.data.items).toEqual([]);
  await request(app).get(recent).expect(401);
  await request(app).get(recent+'?tenantId='+ids.tenant).set('Cookie',cookie).expect(400);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='停止' where id=$1`,[registry,ids.operator]);
  expect((await request(app).get(recent).set('Cookie',cookie).expect(200)).body.data.items).toEqual([]);
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


describe('P0-A5 existing Caller HTTP request uses independent REGISTRY READ',()=>{
 it('accepts an authorized registered Person without new Person/Org and keeps beneficiary unconfirmed',async()=>{
  await grant();
  const {withTenant}=await import('../../apps/web/src/server/persistence/database.js');
  const {PgJoinRepository}=await import('../../apps/web/src/server/persistence/join-repository.js');
  await withTenant(db.runtime,ids.tenant,async client=>
   new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,ids.organization));
  const existing={
   requestId:randomUUID(),serviceId:ids.service,symptom:'既存担当者からの受付',
   caller:{kind:'EXISTING',personId:ids.person},
   decision:'REQUIRED',reason:'対応が必要と判断',
  };
  const endpoint='/api/scoped/support-intake/existing-caller';
  const receive=(body:object)=>request(app).post(endpoint)
   .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token','csrf').send(body);
  await receive(existing).expect(404);
  await operationGrant('READ','REGISTRY');
  await receive({...existing,tenantId:ids.tenant}).expect(400);
  await receive({...existing,caller:{...existing.caller,organizationId:ids.organization}})
   .expect(400);
  const result=(await receive(existing).expect(201)).body.data;
  expect(result.eventId).toBeTruthy();expect(result.workId).toBeTruthy();
  expect((await receive(existing).expect(201)).body.data).toEqual(result);
  const receipt=(await getBeneficiary(result.eventId).expect(200)).body.data;
  expect(receipt).toMatchObject({callerOrganizationId:ids.organization,
   beneficiaryRevision:0,canConfirm:false});
  expect((await db.admin.query('select count(*)::int n from factact.people')).rows).toEqual([{n:1}]);
  expect((await db.admin.query('select count(*)::int n from factact.organizations')).rows).toEqual([{n:1}]);
  expect((await db.admin.query('select count(*)::int n from factact.support_event_beneficiary_decisions')).rows)
   .toEqual([{n:0}]);
 });
});

describe('P0-A receive-only preserves an unevaluated Event',()=>{
 it('records one Event without Evaluation or Work, then starts it only by separate authorized human action',async()=>{
  await grant();
  const payload={...intake(),decision:'DEFERRED',reason:''};
  const received=(await post(payload).expect(201)).body.data;
  expect(received.workId).toBeNull();
  expect((await post(payload).expect(201)).body.data).toEqual(received);
  expect((await db.admin.query('select count(*)::int n from factact.requirement_evaluations where support_event_id=$1',[received.eventId])).rows).toEqual([{n:0}]);
  expect((await db.admin.query('select count(*)::int n from factact.work where support_event_id=$1',[received.eventId])).rows).toEqual([{n:0}]);
  await post({...payload,decision:'REQUIRED',reason:'対応開始'}).expect(409);
  const evaluate=(eventId:string,body:object,csrf='csrf')=>request(app)
   .post('/api/scoped/support-intake/events/'+eventId+'/evaluate')
   .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);
  const decision={serviceId:ids.service,decision:'REQUIRED',reason:''};
  await evaluate(received.eventId,decision).expect(404);
  await operationGrant('UPDATE');
  await evaluate(received.eventId,decision,'wrong-csrf').expect(403);
  await evaluate(randomUUID(),decision).expect(404);
  await evaluate(received.eventId,{...decision,serviceId:randomUUID()}).expect(404);
  const started=(await evaluate(received.eventId,decision).expect(200)).body.data;
  expect(started.workId).toBeTruthy();
  expect((await evaluate(received.eventId,decision).expect(200)).body.data).toEqual(started);
  expect((await db.admin.query('select count(*)::int n from factact.requirement_evaluations where support_event_id=$1',[received.eventId])).rows).toEqual([{n:1}]);
  expect((await db.admin.query('select count(*)::int n from factact.work where support_event_id=$1',[received.eventId])).rows).toEqual([{n:1}]);
  await request(app).get('/api/scoped/support-work/'+started.workId).set('Cookie',cookie).expect(404);
 });
});

describe('own pending receipts',()=>{
 it('lists own unevaluated Events for the selected service only and removes them after authorized evaluation',async()=>{
  const grantId=await grant();
  const held=(await post({...intake(),decision:'DEFERRED',reason:''}).expect(201)).body.data;
  await post({...intake(),caller:{...intake().caller,organizationName:'別受付企業'}}).expect(201);
  const list=(serviceId:string=ids.service)=>request(app).get('/api/scoped/support-intake/pending?serviceId='+serviceId).set('Cookie',cookie);
  expect((await list().expect(200)).body.data.items).toEqual([expect.objectContaining({eventId:held.eventId,canStart:false})]);
  expect((await list(randomUUID()).expect(200)).body.data.items).toEqual([]);
  await operationGrant('UPDATE');
  expect((await list().expect(200)).body.data.items).toEqual([expect.objectContaining({eventId:held.eventId,canStart:true})]);
  await request(app).post('/api/scoped/support-intake/events/'+held.eventId+'/evaluate')
   .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token','csrf')
   .send({serviceId:ids.service,decision:'REQUIRED',reason:''}).expect(200);
  expect((await list().expect(200)).body.data.items).toEqual([]);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='停止' where id=$1`,[grantId,ids.operator]);
  expect((await list().expect(200)).body.data.items).toEqual([]);
 });
});

describe('related inquiry references',()=>{
 it('registers symmetrically, unlinks without changing Work, and denies revoked access',async()=>{
  await grant();await operationGrant('UPDATE');const readGrant=await operationGrant('READ');
  async function receive(suffix:string){
   const payload=intake();payload.caller.organizationName+=' '+suffix;payload.caller.displayName+=' '+suffix;
   const data=(await post(payload).expect(201)).body.data as {eventId:string;workId:string};
   const own=(await getBeneficiary(data.eventId).expect(200)).body.data;
   await postBeneficiary(data.eventId,{requestId:randomUUID(),serviceId:ids.service,expectedRevision:0,kind:'CONFIRMED',organizationId:own.callerOrganizationId,humanConfirmed:true,reason:'確認'}).expect(200);
   return data;
  }
  const a=await receive('A'),b=await receive('B');
  const url=(id:string)=>'/api/scoped/support-work/'+id+'/related-inquiries';
  const get=(id:string)=>request(app).get(url(id)).set('Cookie',cookie);
  const change=(id:string,body:object,csrf='csrf')=>request(app).post(url(id)).set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);
  const snapshot=async()=>(await db.admin.query('select id,status,lifecycle_revision from factact.work where id=any($1::uuid[]) order by id',[[a.workId,b.workId]])).rows;
  const before=await snapshot();
  const link={eventId:b.eventId,commandId:randomUUID(),kind:'LINKED'};
  await change(a.workId,link,'wrong').expect(403);
  await change(a.workId,{...link,eventId:a.eventId}).expect(404);
  await change(a.workId,{...link,eventId:randomUUID()}).expect(404);
  await change(a.workId,link).expect(200);
  await change(a.workId,link).expect(200);
  expect((await get(a.workId).expect(200)).body.data.items).toEqual([expect.objectContaining({eventId:b.eventId,workId:b.workId})]);
  expect((await get(b.workId).expect(200)).body.data.items).toEqual([expect.objectContaining({eventId:a.eventId,workId:a.workId})]);
  await change(b.workId,{eventId:a.eventId,commandId:randomUUID(),kind:'UNLINKED'}).expect(200);
  await change(a.workId,link).expect(200);
  expect((await get(a.workId).expect(200)).body.data.items).toEqual([]);
  expect(await snapshot()).toEqual(before);
  expect((await db.admin.query('select kind from factact.support_inquiry_links order by revision')).rows).toEqual([{kind:'LINKED'},{kind:'UNLINKED'}]);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='停止' where id=$1`,[readGrant,ids.operator]);
  await get(a.workId).expect(404);await change(a.workId,link).expect(404);
 });
});

 describe('public receipt link',()=>{
 it('keeps unmatched original receipt, links only with authority and removes it from pending queue',async()=>{
  await grant();await operationGrant('UPDATE');await operationGrant('READ');
  const receiptId=randomUUID();
  await db.admin.query(`insert into factact.public_support_receipts(id,tenant_id,service_id,submission_id,company_name,department,contact_name,email,phone,category,description,privacy_notice_version) values($1,$2,$3,$4,'未知企業','','申告者','test@example.invalid','0312345678','PC','原文','v1')`,[receiptId,ids.tenant,ids.service,randomUUID()]);
  const base='/api/scoped/support-intake/services/'+ids.service+'/web-receipts';
  const list=()=>request(app).get(base).set('Cookie',cookie);
  const link=(workId:string,csrf='csrf')=>request(app).post(base+'/'+receiptId+'/link').set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send({workId});
  expect((await list().expect(200)).body.data.items).toEqual([expect.objectContaining({id:receiptId,description:'原文'})]);
  const data=(await post(intake()).expect(201)).body.data;
  await link(data.workId).expect(404);
  const own=(await getBeneficiary(data.eventId).expect(200)).body.data;
  await postBeneficiary(data.eventId,{requestId:randomUUID(),serviceId:ids.service,expectedRevision:0,kind:'CONFIRMED',organizationId:own.callerOrganizationId,humanConfirmed:true,reason:'確認'}).expect(200);
  await link(data.workId,'wrong').expect(403);
  await link(data.workId).expect(200);await link(data.workId).expect(200);
  expect((await list().expect(200)).body.data.items).toEqual([]);
  expect((await db.admin.query('select description from factact.public_support_receipts where id=$1',[receiptId])).rows).toEqual([{description:'原文'}]);
  expect((await db.admin.query('select event_id from factact.public_support_receipt_links where receipt_id=$1',[receiptId])).rows).toEqual([{event_id:data.eventId}]);
 });
});


describe('atomic web receipt intake',()=>{
 it('creates the Event and receipt association atomically',
 async()=>{
  await grant();

  const receiptId=randomUUID();

  await db.admin.query(
   `insert into factact.public_support_receipts
    (id,tenant_id,service_id,submission_id,
     company_name,department,contact_name,email,
     phone,category,description,privacy_notice_version)
    values($1,$2,$3,$4,
     '未登録企業','','申告者','test@example.invalid',
     '0312345678','PC','Web原文','v1')`,
   [receiptId,ids.tenant,ids.service,randomUUID()]
  );

  const payload={
   ...intake(),
   webReceiptId:receiptId,
   symptom:'Web原文'
  };

  // CREATE alone cannot associate an original Web receipt.
  await post(payload).expect(404);

  expect((await db.admin.query(
   'select event_id from factact.public_support_receipt_links where receipt_id=$1',
   [receiptId]
  )).rows).toEqual([]);

  await operationGrant('READ');

  const first=(await post(payload).expect(201)).body.data;

  const retry=(await post(payload).expect(201)).body.data;

  expect(retry).toEqual(first);

  const {webReceiptId:_receipt,...withoutReceipt}=payload;
  await post(withoutReceipt).expect(409);

  const anotherReceipt=randomUUID();

  await db.admin.query(
   `insert into factact.public_support_receipts
    (id,tenant_id,service_id,submission_id,
     company_name,department,contact_name,email,
     phone,category,description,privacy_notice_version)
    values($1,$2,$3,$4,
     '別企業','','別担当者','other@example.invalid',
     '0399999999','PC','別受付','v1')`,
   [anotherReceipt,ids.tenant,ids.service,randomUUID()]
  );

  await post({
   ...payload,
   webReceiptId:anotherReceipt
  }).expect(409);

  expect((await db.admin.query(
   'select event_id from factact.public_support_receipt_links where receipt_id=$1',
   [anotherReceipt]
  )).rows).toEqual([]);

  const links=await db.admin.query(
   `select event_id
    from factact.public_support_receipt_links
    where receipt_id=$1`,
   [receiptId]
  );

  expect(links.rows).toEqual([
   {event_id:first.eventId}
  ]);

  const countBefore=await db.admin.query(
   'select count(*)::int n from factact.support_events'
  );

  await post({
   ...payload,
   requestId:randomUUID()
  }).expect(409);

  const countAfter=await db.admin.query(
   'select count(*)::int n from factact.support_events'
  );

  expect(countAfter.rows).toEqual(countBefore.rows);

  await post({
   ...intake(),
   webReceiptId:randomUUID()
  }).expect(404);

  const finalCount=await db.admin.query(
   'select count(*)::int n from factact.support_events'
  );

  expect(finalCount.rows).toEqual(countBefore.rows);

  const original=await db.admin.query(
   'select description from factact.public_support_receipts where id=$1',
   [receiptId]
  );

  expect(original.rows).toEqual([
   {description:'Web原文'}
  ]);
 });
});
