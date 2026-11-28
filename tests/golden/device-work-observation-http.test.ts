import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase,verifyExistingDevice} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgDeviceWorkObservationSessionStore} from '../../apps/web/src/server/persistence/device-work-observation-session-store.js';
import {createApp} from '../../apps/web/src/server/app.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {PgJoinUnitOfWork} from '../../apps/web/src/server/persistence/join-repository.js';
import {JoinCommands} from '../../packages/application/src/join-commands.js';
import {JoinQueries} from '../../packages/application/src/join-queries.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';

type Db=Awaited<ReturnType<typeof testDatabase>>;
const issuer='https://accounts.google.com';
const actorToken='s3c1b-recording-session';
const reviewerToken='s3c1b-review-session';
const reviewerId='20000000-0000-4000-8000-000000000089';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
 issuer:issuer as 'https://accounts.google.com',clientId:'test',clientSecret:'test',
 redirectUri:'http://localhost:5173/auth/callback'};
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Operator A',
 tenantName:'Synthetic Tenant',roles:['ADMIN','OPERATOR','REVIEWER']};
let db:Db,identity:PgIdentityStore,app:ReturnType<typeof createApp>;
let workId:string,contextId:string,orgRecipientId:string,recorderRegistryGrant:string,reviewerGrant:string;
const cookie=(token:string)=>'factact_session='+token;
const post=(path:string,token=actorToken,csrf='csrf-a')=>
 request(app).post(path).set('Cookie',cookie(token)).set('Origin',config.origin)
  .set('x-csrf-token',csrf);
const get=(path:string,token=reviewerToken)=>request(app).get(path).set('Cookie',cookie(token));
const recordPath=()=>'/api/scoped/support-work/'+workId+'/device-field-observations';
const proposalPath=(id:string)=>'/api/scoped/device-field-observations/'+id+'/proposals';
const confirmPath=(id:string)=>'/api/scoped/device-field-review-queue/'+id+'/confirm';
const queuePath='/api/scoped/device-field-review-queue';
const recordBody=(requestId=randomUUID())=>({
 requestId,targetContextId:contextId,deviceId:ids.device,fieldKey:'deviceStatus',
 observedValue:'AVAILABLE',expectedRevision:0,attestation:'DEVICE_ASSIGNABLE_CONFIRMED_V1',
});
const confirmBody={attestation:'REVIEWED_DIRECT_DEVICE_OBSERVATION_V1',
 verificationSummary:'Independent review of directly observed status'};
async function grant(who:string,scope:'WORK'|'SERVICE_RECIPIENT',
 operations:string[],recipient:string,work:string|null,object:'SUPPORT'|'REGISTRY'){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
   (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
    service_recipient_id,work_id,object_kind,operations,status,effective_from,issued_by_operator_id)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE',now()-interval '1 day',$11)`,
   [id,ids.tenant,who,ids.service,ids.contract,scope,recipient,work,object,operations,ids.operator]);
 return id;
}
async function setupSession(who:string,token:string,csrf:string,subject:string){
 await db.admin.query(`insert into factact_private.operator_identities
   (issuer,subject,tenant_id,operator_id,is_login_default,status)
   values($1,$2,$3,$4,true,'ACTIVE')`,[issuer,subject,ids.tenant,who]);
 await identity.createVerifiedSession(tokenHash(token),{tenantId:ids.tenant,operatorId:who},
  csrf,{issuer,subject});
}
async function observation(){
 const response=await post(recordPath()).send(recordBody()).expect(201);
 return response.body.data.observationId as string;
}
async function proposal(obs:string,key=randomUUID()){
 const response=await post(proposalPath(obs)).send({requestKey:key}).expect(202);
 return {changeId:response.body.data.changeId as string,key};
}


/** Audit injection is disposable PostgreSQL-only; never alters the production schema.
 * Every failure must roll back the entire Session-bound transaction. */
async function withAuditInjection<T>(eventType:string,work:()=>Promise<T>):Promise<T>{
 await db.admin.query(`create function factact_private.synthetic_s3c1b_audit_block()
   returns trigger language plpgsql as $audit$
   begin
     if new.event_type=TG_ARGV[0] then
       raise exception 'synthetic S3c1B audit failure';
     end if;
     return new;
   end $audit$`);
 await db.admin.query(`create trigger synthetic_s3c1b_audit_block
   before insert on factact.audit_events for each row
   execute function factact_private.synthetic_s3c1b_audit_block('${eventType}')`);
 try{return await work();}
 finally{
   await db.admin.query('drop trigger synthetic_s3c1b_audit_block on factact.audit_events');
   await db.admin.query('drop function factact_private.synthetic_s3c1b_audit_block()');
 }
}

/** Deterministic grant-vs-command race: do not rely on sleep ordering. */
async function waitForBlockedQuery(fragment:string):Promise<void>{
 for(let i=0;i<120;i++){
  const {rows}=await db.admin.query<{blocked:boolean}>(`
    select exists(select 1 from pg_stat_activity
      where wait_event_type='Lock' and query like $1) as blocked`,
    ['%'+fragment+'%']);
  if(rows[0]?.blocked)return;
  await new Promise<void>(resolve=>setTimeout(resolve,25));
 }
 throw Error('Expected a live PostgreSQL authority-lock waiter: '+fragment);
}

beforeAll(async()=>{
 db=await testDatabase();
 identity=new PgIdentityStore(db.runtime,db.oidc);
 app=createApp(config,identity,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject:'unused'})},
   pino({level:'silent'}),undefined,undefined,undefined,undefined,undefined,undefined,
   undefined,undefined,undefined,new PgDeviceWorkObservationSessionStore(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await verifyExistingDevice(db.admin,ids.device,'PC-0073');
 // The seed starts AVAILABLE; test the genuine UNKNOWN -> AVAILABLE knowledge transition.
 await db.admin.query("update factact.devices set device_status='UNKNOWN' where id=$1",[ids.device]);
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
   values($1,$2,'s3c1b-reviewer@example.invalid','Reviewer B','ACTIVE')`,[reviewerId,ids.tenant]);
 await setupSession(ids.operator,actorToken,'csrf-a','s3c1b-operator-a');
 await setupSession(reviewerId,reviewerToken,'csrf-b','s3c1b-reviewer-b');
 orgRecipientId=randomUUID();
 await db.admin.query(`insert into factact.service_recipients
   (id,tenant_id,service_id,recipient_type,recipient_id,recipient_organization_id,status)
   values($1,$2,$3,'ORGANIZATION',null,$4,'ACTIVE')`,
   [orgRecipientId,ids.tenant,ids.service,ids.organization]);
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),
   {id:randomUUID,now:()=>new Date().toISOString()});
 const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,
   serviceId:ids.service,symptom:'Direct deviceStatus observation'});
 const evaluated=await commands.evaluate(actor,event.id,'REQUIRED','Observe the assigned device');
 workId=evaluated.work!.id;
 const ctx=await commands.confirmContextDevice(actor,workId,{requestId:randomUUID(),
   expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
 contextId=ctx.id;
 await grant(ids.operator,'WORK',['UPDATE'],evaluated.work!.serviceRecipientId,workId,'SUPPORT');
 recorderRegistryGrant=await grant(ids.operator,'SERVICE_RECIPIENT',['UPDATE'],
   orgRecipientId,null,'REGISTRY');
 reviewerGrant=await grant(reviewerId,'SERVICE_RECIPIENT',['REVIEW','APPROVE'],
   orgRecipientId,null,'REGISTRY');
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('S3c-1B OIDC Session HTTP / PostgreSQL 17',()=>{
 it('records without Device mutation, proposes once, queues only for B, then commits with one Human action',async()=>{
  const body=recordBody();
  const first=await post(recordPath()).send(body).expect(201);
  const obs=first.body.data.observationId as string;
  expect((await post(recordPath()).send(body).expect(201)).body.data.observationId).toBe(obs);
  const key=randomUUID();
  const one=await proposal(obs,key);
  const again=await post(proposalPath(obs)).send({requestKey:key}).expect(202);
  expect(again.body.data.changeId).toBe(one.changeId);
  expect((await db.admin.query('select device_status,registry_revision from factact.devices where id=$1',
    [ids.device])).rows[0].device_status).toBe('UNKNOWN');
  expect((await get(queuePath,actorToken).expect(200)).body.data.items).toEqual([]);
  const review=(await get(queuePath).expect(200)).body.data;
  expect(review.items).toEqual([expect.objectContaining({changeId:one.changeId,
   workId,deviceId:ids.device,fieldKey:'deviceStatus',
   currentValue:'UNKNOWN',observedValue:'AVAILABLE',status:'PROPOSED'})]);
  expect(review).not.toHaveProperty('total');
  await post(confirmPath(one.changeId),reviewerToken,'csrf-b').send(confirmBody).expect(200);
  const after=await db.admin.query('select device_status,registry_revision from factact.devices where id=$1',
    [ids.device]);
  expect(after.rows[0].device_status).toBe('AVAILABLE');
  const audit=await db.admin.query('select count(*)::integer n from factact.audit_events where aggregate_id=$1',
    [one.changeId]);
  const evidence=await db.admin.query(`select count(*)::integer n from factact.device_field_events
    where source_change_id=$1 and event_kind='FIELD_VERIFIED'`,[one.changeId]);
  expect(evidence.rows[0].n).toBe(1);
  expect(audit.rows[0].n).toBe(3);
  await post(confirmPath(one.changeId),reviewerToken,'csrf-b').send(confirmBody).expect(200);
  expect((await db.admin.query('select device_status,registry_revision from factact.devices where id=$1',
    [ids.device])).rows[0]).toEqual(after.rows[0]);
  expect((await db.admin.query('select count(*)::integer n from factact.audit_events where aggregate_id=$1',
    [one.changeId])).rows[0].n).toBe(3);
  expect((await post(proposalPath(obs)).send({requestKey:key}).expect(202)).body.data.changeId)
   .toBe(one.changeId);
  expect((await get(queuePath).expect(200)).body.data.items).toEqual([]);
 });

 it('fails closed for missing session, CSRF, forged authority/source fields and wrong attestation',async()=>{
  await request(app).get(queuePath).expect(401);
  await request(app).post(recordPath()).send(recordBody()).expect(401);
  await post(recordPath(),actorToken,'wrong').send(recordBody()).expect(403);
  await post(recordPath()).set('Origin','https://evil.invalid').send(recordBody()).expect(403);
  for(const extra of ['tenantId','actorOperatorId','organizationId','organizationServiceRecipientId',
    'sourceKind','sourceEvidenceId','sourceLocator','observedAt','changeId']){
    await post(recordPath()).send({...recordBody(),[extra]:'forged'}).expect(400);
  }
  await post(recordPath()).send({...recordBody(),attestation:'DIRECT_FIELD_OBSERVED_V1'}).expect(400);
  await post(proposalPath(randomUUID())).send({requestKey:randomUUID(),actorOperatorId:ids.operator}).expect(400);
  await post(confirmPath(randomUUID()),reviewerToken,'csrf-b')
   .send({...confirmBody,changeId:randomUUID()}).expect(400);
  await get(queuePath+'?limit=51').expect(400);
  await get(queuePath+'?cursor=invalid%21').expect(400);
  expect((await db.admin.query('select count(*)::integer n from factact.device_work_field_observations'))
   .rows[0].n).toBe(0);
 });

 it('rejects same-Actor Confirm, missing Reviewer Grant and revoked Authority without mutation',async()=>{
  const obs=await observation();
  const {changeId}=await proposal(obs);
  await post(confirmPath(changeId)).send(confirmBody).expect(404);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='S3c1B Gate'
    where id=$2`,[ids.operator,reviewerGrant]);
  expect((await get(queuePath).expect(200)).body.data.items).toEqual([]);
  await post(confirmPath(changeId),reviewerToken,'csrf-b').send(confirmBody).expect(404);
  expect((await db.admin.query('select device_status from factact.devices where id=$1',
    [ids.device])).rows[0].device_status).toBe('UNKNOWN');
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='S3c1B Gate'
    where id=$2`,[ids.operator,recorderRegistryGrant]);
  await post(proposalPath(obs)).send({requestKey:randomUUID()}).expect(404);
  await post(recordPath()).send(recordBody()).expect(404);
 });

 it('revoked identity membership makes both HTTP and SQL Session gate fail closed',async()=>{
  const obs=await observation();
  await db.admin.query(`update factact_private.operator_identities set status='REVOKED',
    revoked_at=now(),revocation_reason='S3c-1B session membership revocation test'
    where issuer=$1 and subject=$2`,[issuer,'s3c1b-operator-a']);
  await post(proposalPath(obs)).send({requestKey:randomUUID()}).expect(401);
  const raw=await db.runtime.connect();
  try{
    await raw.query('begin');
    await raw.query("select set_config('factact.tenant_id',$1,true)",[ids.tenant]);
    await expect(raw.query('select factact.device_propose_observation_session($1,$2,$3)',
      [tokenHash(actorToken),obs,randomUUID()])).rejects.toMatchObject({code:'42501'});
  }finally{await raw.query('rollback');raw.release();}
  expect((await db.admin.query('select count(*)::integer n from factact.device_change_requests'))
    .rows[0].n).toBe(0);
 });


 it('hides other-customer Device identity even within the same Tenant',async()=>{
  const customerB=randomUUID(),deviceB=randomUUID();
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
    values($1,$2,'Unrelated synthetic customer','ACTIVE')`,[customerB,ids.tenant]);
  await db.admin.query(`insert into factact.devices
    (id,tenant_id,organization_id,asset_tag,display_name,device_status,registry_revision)
    values($1,$2,$3,'PC-B','Other customer','UNKNOWN',1)`,
    [deviceB,ids.tenant,customerB]);
  const outside=await post(recordPath()).send({...recordBody(),deviceId:deviceB}).expect(404);
  const missing=await post(recordPath()).send({...recordBody(),deviceId:randomUUID()}).expect(404);
  expect(outside.body.error).toEqual(missing.body.error);
  expect((await db.admin.query('select count(*)::integer n from factact.device_work_field_observations'))
    .rows[0].n).toBe(0);
 });

 it('rotates the verified Session and rejects the previous token/hash',async()=>{
  const newToken='s3c1b-rotated-operator-session';
  const switched=await identity.switchSessionContext(tokenHash(actorToken),tokenHash(newToken),
    ids.tenant,'rotated-csrf');
  expect(switched?.operatorId).toBe(ids.operator);
  await post(recordPath()).send(recordBody()).expect(401);
  const row=(await post(recordPath(),newToken,'rotated-csrf')
    .send(recordBody()).expect(201)).body.data;
  expect(row.observationId).toMatch(/^[0-9a-f-]{36}$/);
  const client=await db.runtime.connect();
  try{
    await client.query('begin');
    await client.query("select set_config('factact.tenant_id',$1,true)",[ids.tenant]);
    await expect(client.query('select factact.device_propose_observation_session($1,$2,$3)',
      [tokenHash(actorToken),row.observationId,randomUUID()])).rejects.toMatchObject({code:'42501'});
  }finally{await client.query('rollback');client.release();}
 });


 it('serializes concurrent observations of the same Work revision',async()=>{
  const [a,b]=await Promise.all([
    post(recordPath()).send(recordBody()),
    post(recordPath()).send(recordBody()),
  ]);
  expect([a.status,b.status].sort()).toEqual([201,409]);
  expect((await db.admin.query('select count(*)::integer n from factact.device_work_field_observations'))
    .rows[0].n).toBe(1);
  expect((await db.admin.query(`select count(*)::integer n from factact.evidence
    where title='SUPPORT Device field direct observation'`)).rows[0].n).toBe(1);
  expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
    where event_type='SUPPORT_DEVICE_FIELD_OBSERVED'`)).rows[0].n).toBe(1);
  expect((await db.admin.query('select device_status from factact.devices where id=$1',
    [ids.device])).rows[0].device_status).toBe('UNKNOWN');
 });

 it('rolls back HTTP Observation, Evidence and Audit together on injected audit failure',async()=>{
  await db.admin.query(`create function factact_private.synthetic_s3c1b_http_audit_failure()
    returns trigger language plpgsql as $audit$begin
      if new.event_type='SUPPORT_DEVICE_FIELD_OBSERVED' then
        raise exception 'synthetic S3c1B audit failure'; end if;
      return new;
    end$audit$`);
  await db.admin.query(`create trigger synthetic_s3c1b_http_audit_failure
    before insert on factact.audit_events for each row
    execute function factact_private.synthetic_s3c1b_http_audit_failure()`);
  try {
    await post(recordPath()).send(recordBody()).expect(500);
    expect((await db.admin.query('select count(*)::integer n from factact.device_work_field_observations'))
      .rows[0].n).toBe(0);
    expect((await db.admin.query(`select count(*)::integer n from factact.evidence
      where title='SUPPORT Device field direct observation'`)).rows[0].n).toBe(0);
    expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
      where event_type='SUPPORT_DEVICE_FIELD_OBSERVED'`)).rows[0].n).toBe(0);
  }finally{
    await db.admin.query('drop trigger synthetic_s3c1b_http_audit_failure on factact.audit_events');
    await db.admin.query('drop function factact_private.synthetic_s3c1b_http_audit_failure()');
  }
 });


 it('rolls back Proposal, Source and Change on a failed proposal Audit insert',async()=>{
  const obs=await observation(),key=randomUUID();
  const failed=await withAuditInjection('DEVICE_CHANGE_PROPOSED',async()=>
    post(proposalPath(obs)).send({requestKey:key}).expect(500));
  expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(failed.body)).not.toContain('synthetic');
  const state=await db.admin.query(`select
    (select count(*)::integer from factact.device_change_requests) as requests,
    (select count(*)::integer from factact.device_change_request_sources) as sources,
    (select count(*)::integer from factact.changes
      where change_kind='DEVICE_FIELD_VERIFICATION') as changes,
    (select count(*)::integer from factact.audit_events
      where event_type='DEVICE_CHANGE_PROPOSED') as audits`);
  expect(state.rows[0]).toEqual({requests:0,sources:0,changes:0,audits:0});
  const accepted=await proposal(obs,key);
  const retry=await post(proposalPath(obs)).send({requestKey:key}).expect(202);
  expect(retry.body.data.changeId).toBe(accepted.changeId);
  expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
    where event_type='DEVICE_CHANGE_PROPOSED' and aggregate_id=$1`,
    [accepted.changeId])).rows[0].n).toBe(1);
 });

 it('rolls back Commit, FIELD_VERIFIED and Audit on a failed commit Audit insert',async()=>{
  const obs=await observation(),{changeId}=await proposal(obs);
  const before=(await db.admin.query(
    'select device_status,registry_revision from factact.devices where id=$1',
    [ids.device])).rows[0];
  const failed=await withAuditInjection('DEVICE_CHANGE_COMMITTED',async()=>
    post(confirmPath(changeId),reviewerToken,'csrf-b').send(confirmBody).expect(500));
  expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(failed.body)).not.toContain('synthetic');
  expect((await db.admin.query('select device_status,registry_revision from factact.devices where id=$1',
    [ids.device])).rows[0]).toEqual(before);
  expect((await db.admin.query(`select status,committed_by_operator_id from factact.changes
    where id=$1`,[changeId])).rows[0]).toEqual({
      status:'PROPOSED',committed_by_operator_id:null,
    });
  expect((await db.admin.query(`select count(*)::integer n from factact.device_field_events
    where source_change_id=$1`,[changeId])).rows[0].n).toBe(0);
  expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
    where aggregate_id=$1`,[changeId])).rows[0].n).toBe(1);
  await post(confirmPath(changeId),reviewerToken,'csrf-b').send(confirmBody).expect(200);
  expect((await db.admin.query('select device_status from factact.devices where id=$1',
    [ids.device])).rows[0].device_status).toBe('AVAILABLE');
  expect((await db.admin.query(`select count(*)::integer n from factact.device_field_events
    where source_change_id=$1 and event_kind='FIELD_VERIFIED'`,
    [changeId])).rows[0].n).toBe(1);
  expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
    where aggregate_id=$1`,[changeId])).rows[0].n).toBe(3);
 });

 it('serializes concurrent reviewer Grant revocation ahead of Confirm and fails closed',async()=>{
  const obs=await observation(),{changeId}=await proposal(obs);
  const holder=await db.admin.connect();
  let revoke:Promise<unknown>|null=null;
  let confirm:Promise<unknown>|null=null;
  let released=false;
  try{
    await holder.query('begin');
    await holder.query('select factact.lock_scoped_actor_authority($1,$2)',
      [ids.tenant,reviewerId]);
    // Grant DML must block on the very same actor authority advisory lock.
    revoke=db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
      revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Concurrent S3c1B revoke'
      where id=$2`,[ids.operator,reviewerGrant]);
    await waitForBlockedQuery('update factact.scoped_actor_grants');
    // Issue the HTTP Confirm only after the revocation has entered the lock queue.
    // Start the SuperTest thenable now; merely constructing a Test does not dispatch it.
    confirm=Promise.resolve(post(confirmPath(changeId),reviewerToken,'csrf-b').send(confirmBody));
    await waitForBlockedQuery('device_confirm_observation_session');
    await holder.query('commit');released=true;
    await revoke;
    const response=await confirm as {status:number;body:{error:{code:string}}};
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect((await get(queuePath).expect(200)).body.data.items).toEqual([]);
    expect((await db.admin.query('select device_status from factact.devices where id=$1',
      [ids.device])).rows[0].device_status).toBe('UNKNOWN');
    expect((await db.admin.query('select status from factact.changes where id=$1',
      [changeId])).rows[0].status).toBe('PROPOSED');
    expect((await db.admin.query(`select count(*)::integer n from factact.device_field_events
      where source_change_id=$1`,[changeId])).rows[0].n).toBe(0);
  }finally{
    if(!released)await holder.query('rollback');
    holder.release();
    if(revoke)await Promise.allSettled([revoke,confirm??Promise.resolve()]);
  }
 });


 it('I1 reuses one SUPPORT-verified Device FACT in JOIN without a second Device or Relation',async()=>{
  const uow=new PgJoinUnitOfWork(db.runtime);
  const join=new JoinCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()});
  const queries=new JoinQueries(uow);
  const event=await join.createJoinEvent(actor,{
    organizationId:ids.organization,personId:ids.person,serviceId:ids.service,
    joinDate:'2026-11-23',
  });
  const evaluation=await join.evaluateJoinRequirements(actor,event.eventId);
  const joinWorkId=evaluation.works[0]!.id;

  // A verified assetTag at an earlier Device revision is not enough while
  // the authoritative Status is UNKNOWN. No Work creates a Registry Relation.
  const before=await queries.assignableDevices(actor,joinWorkId);
  expect(before.map(d=>d.id)).not.toContain(ids.device);
  expect((await queries.personContext(actor,ids.person)).currentRelations).toEqual([]);
  const obs=await observation(),{changeId:deviceChangeId}=await proposal(obs);
  expect((await queries.assignableDevices(actor,joinWorkId)).map(d=>d.id))
    .not.toContain(ids.device);
  expect((await db.admin.query('select device_status from factact.devices where id=$1',
    [ids.device])).rows[0].device_status).toBe('UNKNOWN');

  // A distinct authorized Human confirms the exact observed status through HTTP.
  await post(confirmPath(deviceChangeId),reviewerToken,'csrf-b').send(confirmBody).expect(200);
  const updated=await db.admin.query(`select device_status,registry_revision from factact.devices
    where id=$1`,[ids.device]);
  expect(updated.rows[0].device_status).toBe('AVAILABLE');
  expect((await queries.personContext(actor,ids.person)).currentRelations).toEqual([]);
  const eligible=await queries.assignableDevices(actor,joinWorkId);
  expect(eligible.map(d=>d.id)).toContain(ids.device);
  const statuses=await db.admin.query(`select field_key,field_value,event_kind,
    source_change_id,device_revision from factact.device_field_events
    where device_id=$1 and event_kind='FIELD_VERIFIED'
    order by device_revision,field_key`,[ids.device]);
  expect(statuses.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({field_key:'assetTag',field_value:'PC-0073',
      event_kind:'FIELD_VERIFIED'}),
    expect.objectContaining({field_key:'deviceStatus',field_value:'AVAILABLE',
      event_kind:'FIELD_VERIFIED',source_change_id:deviceChangeId}),
  ]));

  // JOIN consumes the same Device ID and executes its original Action and
  // Change path; SUPPORT verification never fabricates an assignment.
  const assigned=await join.startAssignDeviceAction(actor,{
    workId:joinWorkId,deviceId:ids.device,
    executionSummary:'JOIN: assigned the verified PC in the synthetic Work',
    effectiveFrom:'2026-11-22T09:00:00.000Z',
  });
  await join.verifyChange(actor,assigned.changeId,'JOIN: verified the Device assignment');
  await join.commitChange(actor,assigned.changeId);
  const context=await queries.personContext(actor,ids.person);
  expect(context.currentRelations).toHaveLength(1);
  expect(context.currentRelations[0]).toMatchObject({
    toEntityId:ids.device,sourceChangeId:assigned.changeId,
  });
  expect(context.verifiedFacts[0]).toMatchObject({
    assetTag:'PC-0073',semanticType:'FACT',reliability:'VERIFIED',
    sourceChangeId:assigned.changeId,
  });

  const origins=await db.admin.query(`select id,change_kind,work_id,action_id,
    device_change_request_id from factact.changes
    where id in ($1,$2) order by change_kind`,[deviceChangeId,assigned.changeId]);
  expect(origins.rows).toHaveLength(2);
  expect(origins.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({id:deviceChangeId,change_kind:'DEVICE_FIELD_VERIFICATION',
      work_id:null,action_id:null,device_change_request_id:expect.any(String)}),
    expect.objectContaining({id:assigned.changeId,change_kind:'PRIMARY_DEVICE_ASSIGNMENT',
      work_id:joinWorkId,action_id:expect.any(String),device_change_request_id:null}),
  ]));
  expect((await db.admin.query('select count(*)::integer n from factact.devices where id=$1',
    [ids.device])).rows[0].n).toBe(1);
  expect((await db.admin.query(`select count(*)::integer n from factact.device_field_events
    where source_change_id=$1`,[deviceChangeId])).rows[0].n).toBe(1);
  expect((await db.admin.query(`select count(*)::integer n from factact.device_field_events
    where source_change_id=$1`,[assigned.changeId])).rows[0].n).toBe(0);
 });

 it('restricts new Session RPC grants and preserves legacy Device write protection',async()=>{
  const {rows}=await db.admin.query(`select
    has_function_privilege('factact_runtime',
      'factact.device_record_observation_session(text,jsonb)','EXECUTE') as new_record,
    has_function_privilege('public',
      'factact.device_record_observation_session(text,jsonb)','EXECUTE') as public_record,
    has_function_privilege('factact_runtime',
      'factact.record_support_device_field_observation(uuid,uuid,jsonb)','EXECUTE') as old_record,
    has_function_privilege('factact_runtime',
      'factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)','EXECUTE') as old_propose,
    (select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='factact' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity)
      as forced_rls`);
  expect(rows[0]).toMatchObject({new_record:true,public_record:false,old_record:false,old_propose:false,forced_rls:50});
 });
});
