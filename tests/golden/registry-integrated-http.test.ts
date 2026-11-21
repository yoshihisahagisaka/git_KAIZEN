import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgRegistryReviewReader} from '../../apps/web/src/server/persistence/registry-review-reader.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {createApp} from '../../apps/web/src/server/app.js';

const proposer='20000000-0000-4000-8000-000000000091';
const reviewer='20000000-0000-4000-8000-000000000092';
const companyB='30000000-0000-4000-8000-000000000091';
const issuer='https://accounts.google.com';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
 issuer:issuer as 'https://accounts.google.com',clientId:'test',clientSecret:'test',
 redirectUri:'http://localhost:5173/auth/callback'};
const cookies={proposer:'factact_session=registry-integrated-proposer',
 reviewer:'factact_session=registry-integrated-reviewer'};
const context=(actorOperatorId:string)=>({tenantId:ids.tenant,actorOperatorId});
let db:Awaited<ReturnType<typeof testDatabase>>;
let app:ReturnType<typeof createApp>,store:PgIdentityStore,commands:RegistryEditCommands;
let recipientA:string,recipientB:string,personB:string;

const directory=(org=ids.organization)=>request(app)
 .get(`/api/scoped/registry/organizations/${org}/people?serviceId=${ids.service}`)
 .set('Cookie',cookies.proposer);
const queue=()=>request(app).get('/api/scoped/registry/review-queue?limit=20')
 .set('Cookie',cookies.reviewer);
const proposal=(name:string,revision=0)=>({serviceId:ids.service,
 requestId:randomUUID(),requestKey:randomUUID(),proposedDisplayName:name,
 reason:'登録表記の訂正依頼',expectedRegistryRevision:revision});
const propose=(personId:string,body:Record<string,unknown>)=>request(app)
 .post(`/api/scoped/registry/people/${personId}/display-name-proposals`)
 .set('Cookie',cookies.proposer).set('Origin',config.origin)
 .set('x-csrf-token','csrf-proposer').send(body);
const review=(changeId:string,action:'confirm'|'return',body:Record<string,unknown>)=>request(app)
 .post(`/api/scoped/registry/review-queue/${changeId}/${action}`)
 .set('Cookie',cookies.reviewer).set('Origin',config.origin)
 .set('x-csrf-token','csrf-reviewer').send(body);
const confirmBody={attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1'};

async function grant(actor:string,operations:string[],recipient:string){
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,now()-interval '1 day',$8)`,
  [id,ids.tenant,actor,ids.service,ids.contract,recipient,operations,ids.operator]);
 return id;
}
async function currentPerson(){
 const {rows}=await db.admin.query(`select display_name,registry_revision
  from factact.people where tenant_id=$1 and id=$2`,[ids.tenant,ids.person]);
 return rows[0];
}
async function recorded(changeId:string){
 const {rows}=await db.admin.query(`select status,work_id,action_id,rejection_reason,
  verified_by_operator_id,committed_by_operator_id,
  (select count(*)::integer from factact.audit_events a where a.aggregate_id=c.id) as audits,
  (select count(*)::integer from factact.change_evidence e where e.change_id=c.id) as evidence
  from factact.changes c where c.id=$1`,[changeId]);
 return rows[0];
}

beforeAll(async()=>{
 db=await testDatabase();
 store=new PgIdentityStore(db.runtime,db.oidc);
 commands=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
 const reader=new PgScopedAccessReader(db.runtime);
 app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject:'unused'})},
  pino({level:'silent'}),undefined,undefined,undefined,undefined,undefined,reader,
  commands,new PgRegistryReviewReader(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 for(const [actor,subject,session] of [
  [proposer,'integrated-proposer','registry-integrated-proposer'],
  [reviewer,'integrated-reviewer','registry-integrated-reviewer'],
 ] as const){
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
   values($1,$2,$3,$4,'ACTIVE')`,[actor,ids.tenant,`${subject}@example.invalid`,subject]);
  await db.admin.query(`insert into factact_private.operator_identities
   (issuer,subject,tenant_id,operator_id,is_login_default)
   values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,actor]);
  await store.createVerifiedSession(tokenHash(session),{tenantId:ids.tenant,operatorId:actor},
   actor===proposer?'csrf-proposer':'csrf-reviewer',{issuer,subject});
 }
 await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
  values($1,$2,'Customer B confidential','ACTIVE')`,[companyB,ids.tenant]);
 personB=randomUUID();
 await db.admin.query(`insert into factact.people
  (id,tenant_id,organization_id,display_name,lifecycle_status)
  values($1,$2,$3,'Customer B secret person','ACTIVE')`,[personB,ids.tenant,companyB]);
 [recipientA,recipientB]=await withTenant(db.runtime,ids.tenant,async client=>{
  const repo=new PgJoinRepository(client,ids.tenant);
  return [await repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization),
   await repo.ensureOrganizationRecipient(randomUUID(),ids.service,companyB)];
 });
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry full HTTP acceptance: two verified Actors, one field, one lifecycle',()=>{
 it('proposer saves → reviewer returns → proposer re-requests → reviewer confirms; immutable history',async()=>{
  await grant(proposer,['READ','UPDATE'],recipientA);
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const original=(await directory().expect(200)).body.data;
  expect(original.items).toEqual(expect.arrayContaining([
   expect.objectContaining({personId:ids.person,displayName:'田中 一郎',latestOwnRequest:null}),
  ]));
  const first=(await propose(ids.person,proposal('田中 太郎')).expect(202)).body.data;
  expect(first.status).toBe('PENDING_REVIEW');
  expect(await currentPerson()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
  expect((await queue().expect(200)).body.data.items).toEqual([
   expect.objectContaining({changeId:first.changeId,canConfirm:true}),
  ]);
  const rejection='旧表記と新表記を確認して再申請してください';
  await review(first.changeId,'return',{reason:rejection}).expect(200);
  expect(await currentPerson()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
  expect(await recorded(first.changeId)).toMatchObject({status:'REJECTED',work_id:null,
   action_id:null,rejection_reason:rejection,audits:2,evidence:1});
  expect((await queue().expect(200)).body.data.items).toEqual([]);
  const afterReturn=(await directory().expect(200)).body.data;
  expect(afterReturn.items).toEqual(expect.arrayContaining([
   expect.objectContaining({personId:ids.person,latestOwnRequest:expect.objectContaining({
    changeId:first.changeId,status:'REJECTED',rejectionReason:rejection,
   })}),
  ]));

  const second=(await propose(ids.person,proposal('田中 次郎')).expect(202)).body.data;
  expect(second.changeId).not.toBe(first.changeId);
  expect(second.status).toBe('PENDING_REVIEW');
  expect((await queue().expect(200)).body.data.items).toEqual([
   expect.objectContaining({changeId:second.changeId,canConfirm:true}),
  ]);
  await review(second.changeId,'confirm',confirmBody).expect(200);
  await review(second.changeId,'confirm',confirmBody).expect(200);
  expect(await currentPerson()).toEqual({display_name:'田中 次郎',registry_revision:'1'});
  expect(await recorded(first.changeId)).toMatchObject({status:'REJECTED',audits:2,evidence:1});
  expect(await recorded(second.changeId)).toMatchObject({status:'COMMITTED',work_id:null,
   action_id:null,verified_by_operator_id:reviewer,committed_by_operator_id:reviewer,
   audits:3,evidence:1});
  expect((await directory().expect(200)).body.data.items).toEqual(expect.arrayContaining([
   expect.objectContaining({personId:ids.person,latestOwnRequest:expect.objectContaining({
    changeId:second.changeId,status:'COMMITTED',
   })}),
  ]));
  expect((await queue().expect(200)).body.data.items).toEqual([]);
 });

 it('same Service A/B: proposer and reviewer cannot see or mutate B, including direct IDs',async()=>{
  await grant(proposer,['READ','UPDATE'],recipientA);
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  await grant(ids.operator,['UPDATE'],recipientB);
  const b=await commands.proposeDisplayName(context(ids.operator),{
   serviceId:ids.service,personId:personB,requestId:randomUUID(),requestKey:randomUUID(),
   proposedDisplayName:'Customer B secret replacement',reason:'Confidential B-only request',
   expectedRegistryRevision:0});
  const a=(await propose(ids.person,proposal('田中 太郎')).expect(202)).body.data;
  const outside=await propose(personB,proposal('B changed')).expect(404);
  const missing=await propose(randomUUID(),proposal('Unknown changed')).expect(404);
  expect(outside.body.error).toEqual(missing.body.error);
  await directory(companyB).expect(404);
  const reviewOutside=await review(b.changeId,'confirm',confirmBody).expect(404);
  const reviewMissing=await review(randomUUID(),'confirm',confirmBody).expect(404);
  expect(reviewOutside.body.error).toEqual(reviewMissing.body.error);
  const queued=(await queue().expect(200)).body.data;
  expect(queued.items).toEqual([expect.objectContaining({changeId:a.changeId})]);
  expect(queued).not.toHaveProperty('total');
  expect(JSON.stringify(queued)).not.toContain('Customer B');
  expect((await recorded(b.changeId)).status).toBe('PROPOSED');
  expect((await db.admin.query('select display_name from factact.people where id=$1',[personB]))
   .rows[0].display_name).toBe('Customer B secret person');
 });

 it('revoked proposer UPDATE after review-list read makes one-click confirm fully roll back',async()=>{
  const proposerGrant=await grant(proposer,['READ','UPDATE'],recipientA);
  await grant(reviewer,['REVIEW','APPROVE'],recipientA);
  const first=(await propose(ids.person,proposal('田中 太郎')).expect(202)).body.data;
  expect((await queue().expect(200)).body.data.items).toEqual([
   expect.objectContaining({changeId:first.changeId,canConfirm:true}),
  ]);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$1,
    revocation_reason='Integrated acceptance: proposer revoked'
   where id=$2`,[ids.operator,proposerGrant]);
  await review(first.changeId,'confirm',confirmBody).expect(404);
  expect(await currentPerson()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
  expect(await recorded(first.changeId)).toMatchObject({status:'PROPOSED',
   verified_by_operator_id:null,committed_by_operator_id:null,audits:1,evidence:0});
 });
});
