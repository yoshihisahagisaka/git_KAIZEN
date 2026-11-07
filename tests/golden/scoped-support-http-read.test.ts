import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {createApp} from '../../apps/web/src/server/app.js';

const now='2026-11-07T00:00:00.000Z';
const companyB='30000000-0000-4000-8000-000000000077';
const scopedActor='20000000-0000-4000-8000-000000000077';
const sessionCookie='factact_session=scoped-support-read';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',databaseSsl:false,issuer:'https://accounts.google.com' as const,
 clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'};
const internal:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Internal',tenantName:'Development',roles:['ADMIN','OPERATOR','REVIEWER']};
let db:Awaited<ReturnType<typeof testDatabase>>;
let commands:SupportCommands,reader:PgScopedAccessReader,store:PgIdentityStore,app:ReturnType<typeof createApp>;
let recipientA:string,recipientB:string;
let workA:string,workB:string,eventA:string,eventB:string;

async function createWork(symptom:string){
 const event=await commands.createEvent(internal,{requestId:randomUUID(),personId:ids.person,
  serviceId:ids.service,symptom});
 const evaluation=await commands.evaluate(internal,event.id,'REQUIRED','対応対象');
 if(!evaluation.work)throw Error('Expected SUPPORT Work');
 return {eventId:event.id,workId:evaluation.work.id};
}
async function confirm(eventId:string,organizationId:string,expectedRevision=0){
 return commands.recordBeneficiary(internal,eventId,{kind:'CONFIRMED',requestId:randomUUID(),
  expectedRevision,organizationId,reason:'受益企業を人が確認'});
}
async function grant(scope:'SERVICE'|'SERVICE_RECIPIENT'|'WORK',recipientId:string|null=null,workId:string|null=null,
 options:{operations?:string[];objectKind?:string}={}){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,service_recipient_id,
   work_id,object_kind,operations,effective_from,issued_by_operator_id)
  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[
  id,ids.tenant,scopedActor,ids.service,ids.contract,scope,recipientId,workId,
  options.objectKind??'SUPPORT',options.operations??['READ'],'2026-11-01T00:00:00.000Z',ids.operator,
 ]);
 return id;
}
const get=(id:string)=>request(app).get(`/api/scoped/support-work/${id}`).set('Cookie',sessionCookie);
const getPage=(query='')=>request(app).get(`/api/scoped/support-work${query}`).set('Cookie',sessionCookie);
const getHistory=(id:string,query='')=>request(app).get(`/api/scoped/support-work/${id}/history${query}`).set('Cookie',sessionCookie);
async function recordResponse(id:string,text:string,expectedLifecycleRevision=0,expectedRecordRevision=0){
 return commands.recordSupportResponse(internal,id,{requestId:randomUUID(),
  expectedLifecycleRevision,expectedRecordRevision,responseText:text,
  disposition:'MONITORING',followUpAt:'2026-11-08T00:00:00.000Z'});
}

beforeAll(async()=>{
 db=await testDatabase();
 const uow=new PgSupportUnitOfWork(db.runtime);
 commands=new SupportCommands(uow,{now:()=>now,id:randomUUID});
 reader=new PgScopedAccessReader(db.runtime,{now:()=>now});
 store=new PgIdentityStore(db.runtime);
 app=createApp(config,store,{
  authorizationUrl:()=> 'https://accounts.google.com/authorize',
  verifyCallback:async()=>({issuer:config.issuer,subject:'scoped-support-user'}),
 },pino({level:'silent'}),undefined,{commands,queries:new SupportQueries(uow)},undefined,reader);
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values($1,$2,$3,$4)',
  [companyB,ids.tenant,'Company B confidential','ACTIVE']);
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'scoped-support@example.invalid','Scoped reader','ACTIVE')`,[scopedActor,ids.tenant]);
 // Deliberate Role assignment: the internal broad Read Authority must remain denied.
 for(const role of ['ADMIN','OPERATOR','REVIEWER']){
  await db.admin.query('insert into factact.operator_roles values($1,$2,$3)',[ids.tenant,scopedActor,role]);
 }
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[config.issuer,'scoped-support-user',ids.tenant,scopedActor]);
 await store.createVerifiedSession(tokenHash('scoped-support-read'),
  {tenantId:ids.tenant,operatorId:scopedActor},'csrf',
  {issuer:config.issuer,subject:'scoped-support-user'});
 [recipientA,recipientB]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return [await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   await repo.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
 const a=await createWork('A customer detail'),b=await createWork('B customer confidential');
 workA=a.workId;workB=b.workId;eventA=a.eventId;eventB=b.eventId;
 // Both inquiries were received from the SAME Caller Person in company A.
 // Confirmed beneficiary, not Caller affiliation, determines the Work scope.
 await confirm(eventA,ids.organization);
 await confirm(eventB,companyB);
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('scoped SUPPORT Work direct-ID HTTP read',()=>{
 it('denies every Work without an explicit grant despite assigned internal Roles',async()=>{
  const session=await request(app).get('/api/session').set('Cookie',sessionCookie).expect(200);
  expect(session.body.data.operator.roles).toEqual([]);
  await get(workA).expect(404);
  await get(workB).expect(404);
  await request(app).get('/api/support').set('Cookie',sessionCookie).expect(403);
  await request(app).get(`/api/scoped/support-work/${workA}`).expect(401);
 });

 it('allows recipient A only, hiding recipient B and nonexistent Work with indistinguishable 404',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA);
  const allowed=await get(workA).expect(200);
  expect(allowed.body.data).toMatchObject({workId:workA,serviceId:ids.service,
   contractProfileId:ids.contract,serviceRecipientId:recipientA});
  expect(Object.keys(allowed.body.data).sort()).toEqual([
   'contractProfileId','followUpAt','nextAction','serviceId','serviceRecipientId',
   'status','title','updatedAt','waiting','workId',
  ]);
  const forbidden=await get(workB).expect(404),missing=await get(randomUUID()).expect(404);
  expect(forbidden.body.error.code).toBe('NOT_FOUND');
  expect(forbidden.body.error).toEqual(missing.body.error);
  expect(JSON.stringify(forbidden.body)).not.toContain('B customer confidential');
  // Browser-provided affiliation/context cannot override the persisted beneficiary.
  await request(app).get(`/api/scoped/support-work/${workB}?serviceRecipientId=${recipientA}&serviceId=${ids.service}`)
   .set('Cookie',sessionCookie).expect(404);
  await request(app).get('/api/support').set('Cookie',sessionCookie).expect(403);
 });

 it('keeps Work-only grants narrow and expands to B only for an explicit Service grant',async()=>{
  const second=await createWork('A second Work');
  await confirm(second.eventId,ids.organization);
  await grant('WORK',recipientA,workA);
  await get(workA).expect(200);
  await get(second.workId).expect(404);
  await get(workB).expect(404);
  await grant('SERVICE');
  await get(workB).expect(200);
  await get(second.workId).expect(200);
 });

 it('requires the SUPPORT object kind and READ operation independently of Role',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA,null,{operations:['UPDATE']});
  await grant('SERVICE_RECIPIENT',recipientA,null,{objectKind:'KNOWLEDGE'});
  await get(workA).expect(404);
  await grant('SERVICE_RECIPIENT',recipientA);
  await get(workA).expect(200);
 });

 it('revokes access on the next request of the SAME session',async()=>{
  const id=await grant('SERVICE_RECIPIENT',recipientA);
  await get(workA).expect(200);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='失効確認'
   where id=$1`,[id,now,ids.operator]);
  await get(workA).expect(404);
 });

 it('denies the Work when latest beneficiary is cleared or changed, even with a stored grant',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA);
  await get(workA).expect(200);
  await commands.recordBeneficiary(internal,eventA,{kind:'CLEARED',requestId:randomUUID(),
   expectedRevision:1,organizationId:null,reason:'受益先の確認を取り消した'});
  await get(workA).expect(404);
  await confirm(eventA,companyB,2);
  await get(workA).expect(404);
  await grant('SERVICE_RECIPIENT',recipientB);
  await get(workA).expect(200);
 });

 it('denies inactive recipient or expired Contract while preserving an active grant',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA);
  await get(workA).expect(200);
  await db.admin.query("update factact.service_recipients set status='INACTIVE' where id=$1",[recipientA]);
  await get(workA).expect(404);
  await db.admin.query("update factact.service_recipients set status='ACTIVE' where id=$1",[recipientA]);
  await db.admin.query('update factact.contract_profiles set effective_to=$2 where id=$1',
   [ids.contract,'2026-11-06T00:00:00.000Z']);
  await get(workA).expect(404);
 });
});

describe('scoped SUPPORT Work authorized list and pagination',()=>{
 it('returns no tenant-wide records, count or continuation without a grant, despite ADMIN Role',async()=>{
  const response=await getPage().expect(200);
  expect(response.body.data).toEqual({items:[],nextCursor:null});
  expect(JSON.stringify(response.body)).not.toContain('Company B confidential');
  await request(app).get('/api/support').set('Cookie',sessionCookie).expect(403);
  await request(app).get('/api/scoped/support-work').expect(401);
 });

 it('lists only recipient A with no B existence/count leak, even though both have the same Caller',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA);
  const res=await getPage().expect(200);
  expect(res.body.data.items.map((w:{workId:string})=>w.workId)).toEqual([workA]);
  expect(res.body.data).not.toHaveProperty('total');
  expect(res.body.data.nextCursor).toBeNull();
  expect(JSON.stringify(res.body)).not.toContain(workB);
  expect(JSON.stringify(res.body)).not.toContain('Company B confidential');
 });

 it('paginates AFTER authorization, never counting hidden B Work as a page item',async()=>{
  const second=await createWork('Another A Work');
  await confirm(second.eventId,ids.organization);
  await grant('SERVICE_RECIPIENT',recipientA);
  const first=await getPage('?limit=1').expect(200);
  expect(first.body.data.items).toHaveLength(1);
  expect(first.body.data.nextCursor).toEqual(expect.any(String));
  const next=await getPage(`?limit=1&cursor=${first.body.data.nextCursor}`).expect(200);
  expect(next.body.data.items).toHaveLength(1);
  const seen=[first.body.data.items[0].workId,next.body.data.items[0].workId].sort();
  expect(seen).toEqual([workA,second.workId].sort());
  expect(seen).not.toContain(workB);
  expect((await getPage(`?limit=1&cursor=${next.body.data.nextCursor}`).expect(200)).body.data.items).toEqual([]);
 });

 it('respects Work-only, correct object/operation and explicit Service-wide scopes',async()=>{
  await grant('WORK',recipientA,workA,{operations:['UPDATE']});
  await grant('SERVICE_RECIPIENT',recipientB,null,{objectKind:'KNOWLEDGE'});
  expect((await getPage().expect(200)).body.data.items).toEqual([]);
  await grant('WORK',recipientA,workA);
  expect((await getPage().expect(200)).body.data.items.map((w:{workId:string})=>w.workId)).toEqual([workA]);
  await grant('SERVICE');
  const all=(await getPage().expect(200)).body.data.items.map((w:{workId:string})=>w.workId);
  expect(all.sort()).toEqual([workA,workB].sort());
 });

 it('rechecks revocation, latest beneficiary and Contract on every page of an existing session',async()=>{
  const grantId=await grant('SERVICE_RECIPIENT',recipientA);
  expect((await getPage().expect(200)).body.data.items).toHaveLength(1);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='解除'
   where id=$1`,[grantId,now,ids.operator]);
  expect((await getPage().expect(200)).body.data.items).toEqual([]);
  await grant('SERVICE_RECIPIENT',recipientA);
  await commands.recordBeneficiary(internal,eventA,{kind:'CLEARED',requestId:randomUUID(),
   expectedRevision:1,organizationId:null,reason:'対象確認を取消'});
  expect((await getPage().expect(200)).body.data.items).toEqual([]);
  await confirm(eventA,ids.organization,2);
  await db.admin.query('update factact.contract_profiles set effective_to=$2 where id=$1',
   [ids.contract,'2026-11-06T00:00:00.000Z']);
  expect((await getPage().expect(200)).body.data.items).toEqual([]);
 });

 it('rejects malformed paging inputs without exposing SQL or target details',async()=>{
  await getPage('?limit=0').expect(400);
  await getPage('?limit=51').expect(400);
  await getPage('?cursor=not-a-cursor').expect(400);
  await getPage(`?serviceRecipientId=${recipientB}`).expect(400);
 });
});

describe('scoped SUPPORT Work detail and bounded activity history',()=>{
 it('returns indistinguishable 404 for missing, ungranted A and ungranted B Work',async()=>{
  await recordResponse(workA,'A response');
  await recordResponse(workB,'B confidential response');
  const a=await getHistory(workA).expect(404);
  const b=await getHistory(workB).expect(404);
  const missing=await getHistory(randomUUID()).expect(404);
  expect(a.body.error).toEqual(missing.body.error);
  expect(b.body.error).toEqual(missing.body.error);
  expect(JSON.stringify(a.body)).not.toContain('response');
  await request(app).get(`/api/scoped/support-work/${workA}/history`).expect(401);
 });

 it('returns only authorized A Work responses and sanitized lifecycle, never drafts or B records',async()=>{
  await commands.recordWork(internal,workA,{requestId:randomUUID(),expectedRevision:0,kind:'DRAFT',
   correctionReason:'',notes:{form:'SIMPLE_RESPONSE',responseText:'A internal draft secret',
    disposition:'MONITORING',followUpAt:null}});
  await commands.setWaiting(internal,workA,{requestId:randomUUID(),expectedRevision:0,
   party:'A',reason:'Private internal waiting reason',nextAction:'Next step'});
  await recordResponse(workA,'A recorded response',1,1);
  await recordResponse(workB,'B confidential response');
  await grant('SERVICE_RECIPIENT',recipientA);
  const response=await getHistory(workA).expect(200);
  const data=response.body.data;
  expect(data.work).toMatchObject({workId:workA,serviceRecipientId:recipientA});
  expect(data.entries.map((e:{kind:string})=>e.kind).sort()).toEqual(['RESPONSE','WAITING_SET']);
  expect(data.entries.find((e:{kind:string})=>e.kind==='RESPONSE')).toMatchObject({
   responseText:'A recorded response',disposition:'MONITORING',revision:2,
  });
  expect(data.entries.find((e:{kind:string})=>e.kind==='WAITING_SET')).toMatchObject({
   responseText:null,disposition:null,
  });
  expect(Object.keys(data.entries[0]).sort()).toEqual([
   'disposition','id','kind','occurredAt','responseText','revision',
  ]);
  const serialized=JSON.stringify(response.body);
  for(const secret of ['A internal draft secret','Private internal waiting reason','B confidential response',
   'commandPayload','recordedByOperatorId','Company B confidential'])expect(serialized).not.toContain(secret);
  await getHistory(workB).expect(404);
 });

 it('paginates authorized Work-local events and rechecks revocation on an existing session',async()=>{
  await commands.setWaiting(internal,workA,{requestId:randomUUID(),expectedRevision:0,
   party:'A',reason:'Waiting',nextAction:'Resume'});
  await commands.resumeWork(internal,workA,{requestId:randomUUID(),expectedRevision:1,
   nextAction:'Continue'});
  await recordResponse(workA,'A response',2);
  await recordResponse(workB,'B response');
  const grantId=await grant('WORK',recipientA,workA);
  const seen:string[]=[];
  let cursor:string|null=null;
  for(let n=0;n<4;n++){
   const page:{body:{data:{entries:{kind:string}[];nextCursor:string|null}}}=
    await getHistory(workA,`?limit=1${cursor?`&cursor=${cursor}`:''}`).expect(200);
   if(!page.body.data.entries.length)break;
   expect(page.body.data.entries).toHaveLength(1);
   seen.push(page.body.data.entries[0]!.kind);
   cursor=page.body.data.nextCursor;
   if(!cursor)break;
  }
  expect(seen.sort()).toEqual(['RESPONSE','RESUMED','WAITING_SET']);
  expect(JSON.stringify(seen)).not.toContain('B response');
  await getHistory(workB).expect(404);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='revoked'
   where id=$1`,[grantId,now,ids.operator]);
  await getHistory(workA).expect(404);
 });

 it('requires correct READ grant, active beneficiary and effective contract for every page',async()=>{
  await recordResponse(workA,'A response');
  await grant('WORK',recipientA,workA,{operations:['UPDATE']});
  await grant('SERVICE_RECIPIENT',recipientA,null,{objectKind:'KNOWLEDGE'});
  await getHistory(workA).expect(404);
  await grant('SERVICE_RECIPIENT',recipientA);
  await getHistory(workA).expect(200);
  await commands.recordBeneficiary(internal,eventA,{kind:'CLEARED',requestId:randomUUID(),
   expectedRevision:1,organizationId:null,reason:'受益先解除'});
  await getHistory(workA).expect(404);
  await confirm(eventA,ids.organization,2);
  await getHistory(workA).expect(200);
  await db.admin.query('update factact.contract_profiles set effective_to=$2 where id=$1',
   [ids.contract,'2026-11-06T00:00:00.000Z']);
  await getHistory(workA).expect(404);
 });

 it('does not retroactively expose A response history after reassignment to beneficiary B',async()=>{
  await recordResponse(workA,'A private response before reassignment');
  await grant('SERVICE_RECIPIENT',recipientB);
  await confirm(eventA,companyB,1);
  // Summary uses the latest beneficiary, but prior Work history is not
  // automatically approved for newly assigned customer B.
  await get(workA).expect(200);
  const denied=await getHistory(workA).expect(404);
  expect(JSON.stringify(denied.body)).not.toContain('A private response');
 });

 it('permits Service-wide access to each Work without joining the other Work history',async()=>{
  await recordResponse(workA,'A own response');
  await recordResponse(workB,'B own response');
  await grant('SERVICE');
  const a=await getHistory(workA).expect(200);
  const b=await getHistory(workB).expect(200);
  expect(a.body.data.entries.map((e:{responseText:string|null})=>e.responseText)).toEqual(['A own response']);
  expect(b.body.data.entries.map((e:{responseText:string|null})=>e.responseText)).toEqual(['B own response']);
 });

 it('rejects untrusted history pagination and recipient arguments',async()=>{
  await grant('SERVICE_RECIPIENT',recipientA);
  await getHistory(workA,'?limit=0').expect(400);
  await getHistory(workA,'?limit=51').expect(400);
  await getHistory(workA,'?cursor=not-a-cursor').expect(400);
  await getHistory(workA,`?serviceRecipientId=${recipientB}`).expect(400);
 });
});
