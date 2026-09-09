import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import { testDatabase,ids } from '../fixtures/database.js';
import { PgJoinUnitOfWork } from '../../apps/web/src/server/persistence/join-repository.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { withTenant } from '../../apps/web/src/server/persistence/database.js';
import { JoinCommands } from '../../packages/application/src/join-commands.js';
import { JoinQueries } from '../../packages/application/src/join-queries.js';
import type { JoinRepository } from '../../packages/application/src/join-ports.js';
import type { Operator } from '../../packages/domain/src/operator.js';
import { createApp } from '../../apps/web/src/server/app.js';
import type { Config } from '../../apps/web/src/server/config.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';

let db:Awaited<ReturnType<typeof testDatabase>>, c:JoinCommands,q:JoinQueries,uow:PgJoinUnitOfWork;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'開発オペレーター',tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER']};
const time={id:randomUUID,now:()=> '2026-10-01T09:00:00.000Z'};
beforeAll(async()=>{db=await testDatabase();uow=new PgJoinUnitOfWork(db.runtime);c=new JoinCommands(uow,time);q=new JoinQueries(uow);});
beforeEach(async()=>db.reset());
afterAll(async()=>db?.close());
const create=()=>c.createJoinEvent(actor,{organizationId:ids.organization,personId:ids.person,serviceId:ids.service,joinDate:'2026-10-02'});
async function work() {const e=await create();const result=await c.evaluateJoinRequirements(actor,e.eventId);return {eventId:e.eventId,workId:result.works[0]!.id,evaluationId:result.evaluations[0]!.id};}
async function proposed() {const w=await work();const a=await c.startAssignDeviceAction(actor,{workId:w.workId,deviceId:ids.device,executionSummary:'資産ラベルを確認して本人へ割当済み',effectiveFrom:'2026-10-01T08:00:00.000Z'});return {...w,...a};}
async function committed() {const p=await proposed();await c.verifyChange(actor,p.changeId,'資産ラベルと実機を確認');const relation=await c.commitChange(actor,p.changeId);return {...p,relation};}
async function secondDevice() {const id=randomUUID();await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,display_name,device_status) values($1,$2,'PC-0088','Replacement','AVAILABLE')",[id,ids.tenant]);return id;}
async function policy(value:string) {await db.admin.query("update factact.contract_profiles set configuration_json=jsonb_set(configuration_json,'{requirements,COMPANY_PC,policy}',to_jsonb($1::text)) where id=$2",[value,ids.contract]);}

describe('document 15 Golden Tests',()=>{
  it('GT-01 JOIN Event does not create fixed Work',async()=>{const e=await create();const view=await q.joinWorkspace(actor,e.eventId);expect(view.works).toEqual([]);expect(view.requirementEvaluations).toEqual([]);expect(view.deviceFact).toBeNull();expect(view.readiness).toBe('UNKNOWN');});
  it('GT-02 REQUIRED creates exactly one owned Work with Why',async()=>{const w=await work();const view=await q.workDetail(actor,w.workId);expect(view.why.result).toBe('REQUIRED');expect(view.work.sourceRequirementEvaluationId).toBe(w.evaluationId);expect(view.work.workOwnerOperatorId).toBe(actor.id);expect(view.why.basisSnapshot).toMatchObject({contractProfileId:ids.contract,contractProfileVersion:1,primaryDeviceState:'UNKNOWN'});expect(view.nextAction).not.toBe('');});
  it('GT-03 NOT_APPLICABLE is an explicit No Work result',async()=>{await policy('NOT_APPLICABLE');const e=await create();await c.evaluateJoinRequirements(actor,e.eventId);const v=await q.joinWorkspace(actor,e.eventId);expect(v.requirementEvaluations[0]?.result).toBe('NOT_APPLICABLE');expect(v.works).toEqual([]);expect(v.readiness).toBe('NOT_REQUIRED');});
  it('GT-03 ALREADY_SATISFIED reuses the committed Fact without Work',async()=>{await committed();const e=await create();const v=await c.evaluateJoinRequirements(actor,e.eventId);expect(v.evaluations[0]?.result).toBe('ALREADY_SATISFIED');expect(v.works).toEqual([]);});
  it('GT-04 concurrent repeated evaluation cannot duplicate Work or evaluation',async()=>{const e=await create();const [a,b]=await Promise.all([c.evaluateJoinRequirements(actor,e.eventId),c.evaluateJoinRequirements(actor,e.eventId)]);expect(a.works[0]?.id).toBe(b.works[0]?.id);expect((await q.joinWorkspace(actor,e.eventId)).works).toHaveLength(1);expect(a.evaluations[0]?.id).toBe(b.evaluations[0]?.id);});
  it('GT-05 Action creates a proposal, never a Registry relation',async()=>{const p=await proposed();expect((await q.workDetail(actor,p.workId)).changes[0]?.status).toBe('PROPOSED');expect((await q.personContext(actor,ids.person)).verifiedFacts).toEqual([]);expect(p.proposedEffect.previousState).toBe('UNKNOWN');});
  it('GT-06 PROPOSED Change cannot Commit',async()=>{const p=await proposed();await expect(c.commitChange(actor,p.changeId)).rejects.toMatchObject({code:'CHANGE_NOT_VERIFIED'});expect((await q.personContext(actor,ids.person)).currentRelations).toEqual([]);});
  it('GT-07 verified Change and Relation commit together and retry returns same result',async()=>{const p=await committed();expect((await q.workDetail(actor,p.workId)).changes[0]?.status).toBe('COMMITTED');expect((await q.personContext(actor,ids.person)).currentRelations[0]?.sourceChangeId).toBe(p.changeId);expect((await c.commitChange(actor,p.changeId)).id).toBe(p.relation.id);});
  it('GT-07 failure after Relation insertion rolls back Change, Relation and audit',async()=>{
    const p=await proposed();await c.verifyChange(actor,p.changeId,'確認済み');
    const failing=new JoinCommands({run:(tenant,fn)=>uow.run(tenant,r=>fn(new Proxy(r,{get(target,key){if(key==='appendAudit')return async()=>{throw new Error('injected audit failure');};const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}}) as JoinRepository))},time);
    await expect(failing.commitChange(actor,p.changeId)).rejects.toThrow('injected audit failure');
    expect((await q.personContext(actor,ids.person)).currentRelations).toEqual([]);expect((await q.workDetail(actor,p.workId)).changes[0]?.status).toBe('VERIFIED');
    expect((await q.joinWorkspace(actor,p.eventId)).recentTimeline.map(e=>e.eventType)).not.toContain('CHANGE_COMMITTED');
  });
  it('GT-08 CompleteWork cannot fake reality; after Commit completion does not change Relations',async()=>{
    const p=await proposed();await expect(c.completeWork(actor,p.workId,'COMPLETED')).rejects.toMatchObject({code:'COMMITTED_CHANGE_REQUIRED'});
    await c.verifyChange(actor,p.changeId,'確認済み');await expect(c.completeWork(actor,p.workId,'COMPLETED')).rejects.toMatchObject({code:'COMMITTED_CHANGE_REQUIRED'});
    await c.commitChange(actor,p.changeId);const before=(await q.personContext(actor,ids.person)).relationHistory;
    await c.completeWork(actor,p.workId,'COMPLETED');expect((await q.personContext(actor,ids.person)).relationHistory).toEqual(before);expect((await q.joinWorkspace(actor,p.eventId)).readiness).toBe('READY');
  });
  it('GT-09 Person Context shows verified PC-0073 with provenance and verification time',async()=>{const p=await committed();expect((await q.personContext(actor,ids.person)).verifiedFacts[0]).toMatchObject({assetTag:'PC-0073',semanticType:'FACT',reliability:'VERIFIED',sourceChangeId:p.changeId,verifiedAt:time.now()});});
  it('GT-10 explicit replacement ends the old Relation and preserves original provenance',async()=>{
    const p=await committed(),deviceId=await secondDevice();
    const next=await c.startAssignDeviceAction(actor,{workId:p.workId,deviceId,executionSummary:'交換用PCを割当済み',effectiveFrom:'2026-10-01T08:30:00.000Z',replacesRelationId:p.relation.id});
    await c.verifyChange(actor,next.changeId,'交換内容確認');await c.commitChange(actor,next.changeId);
    const v=await q.personContext(actor,ids.person);expect(v.relationHistory).toHaveLength(2);expect(v.relationHistory.find(x=>x.id===p.relation.id)).toMatchObject({status:'ENDED',effectiveTo:'2026-10-01T08:30:00.000Z',sourceChangeId:p.changeId});expect(v.verifiedFacts[0]?.deviceId).toBe(deviceId);
  });
  it('GT-11 foreign tenant cannot read or mutate Person, Work, Change or Relation',async()=>{
    const p=await committed(),tenant=randomUUID(),operatorId=randomUUID();
    await db.admin.query("insert into factact.tenants(id,name,status) values($1,'Other','ACTIVE')",[tenant]);
    await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'other@example.invalid','Other','ACTIVE')",[operatorId,tenant]);
    for(const role of actor.roles) await db.admin.query('insert into factact.operator_roles values($1,$2,$3)',[tenant,operatorId,role]);
    const other={...actor,id:operatorId,tenantId:tenant};
    for(const op of [()=>q.personContext(other,ids.person),()=>q.workDetail(other,p.workId),()=>q.joinWorkspace(other,p.eventId),()=>c.verifyChange(other,p.changeId,'forged'),()=>c.commitChange(other,p.changeId),()=>c.completeWork(other,p.workId,'COMPLETED'),()=>c.takeWorkOwnership(other,p.workId)]) await expect(op()).rejects.toMatchObject({code:'NOT_FOUND'});
    for(const table of ['people','work','changes','relations']) expect(await withTenant(db.runtime,tenant,async client=>(await client.query(`select * from factact.${table}`)).rowCount)).toBe(0);
    expect(await withTenant(db.runtime,tenant,async client=>(await client.query("update factact.relations set status='ENDED',effective_to=now() where id=$1",[p.relation.id])).rowCount)).toBe(0);
    expect((await q.personContext(actor,ids.person)).currentRelations[0]?.id).toBe(p.relation.id);
  });
  it('GT-12 Timeline and linked IDs prove the complete provenance chain',async()=>{
    const p=await committed();await c.completeWork(actor,p.workId,'COMPLETED');
    const v=await q.workDetail(actor,p.workId), context=await q.personContext(actor,ids.person);
    expect(context.verifiedFacts[0]?.sourceChangeId).toBe(p.changeId);expect(v.changes[0]?.actionId).toBe(p.actionId);expect(v.actions[0]?.workId).toBe(p.workId);expect(v.work.sourceRequirementEvaluationId).toBe(p.evaluationId);expect(v.why.eventId).toBe(p.eventId);
    expect(v.timeline.map(e=>e.eventType)).toEqual(['JOIN_EVENT_CREATED','REQUIREMENT_EVALUATED','WORK_CREATED','WORK_OWNERSHIP_SET','ACTION_STARTED','ACTION_COMPLETED','CHANGE_PROPOSED','CHANGE_VERIFIED','CHANGE_COMMITTED','RELATION_EFFECTIVE','WORK_COMPLETED']);
  });
});

describe('concurrency, authority and HTTP guards',()=>{
  it('different concurrent proposals for one Person cannot both commit',async()=>{
    const first=await proposed(),secondWork=await work(),deviceId=await secondDevice();
    const second=await c.startAssignDeviceAction(actor,{workId:secondWork.workId,deviceId,executionSummary:'別の実施記録',effectiveFrom:'2026-10-01T08:10:00.000Z'});
    await c.verifyChange(actor,first.changeId,'確認');await c.verifyChange(actor,second.changeId,'確認');
    const results=await Promise.allSettled([c.commitChange(actor,first.changeId),c.commitChange(actor,second.changeId)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);expect((await q.personContext(actor,ids.person)).currentRelations).toHaveLength(1);
  });
  it('contract Authority and self-review guards apply even to a logged-in admin',async()=>{
    const p=await proposed();await db.admin.query("update factact.contract_profiles set configuration_json=jsonb_set(configuration_json,'{deviceAssignment,allowSelfReview}','false') where id=$1",[ids.contract]);
    await expect(c.verifyChange(actor,p.changeId,'self')).rejects.toMatchObject({code:'SELF_REVIEW_FORBIDDEN'});
    await db.admin.query("delete from factact.operator_roles where operator_id=$1 and role='REVIEWER'",[actor.id]);
    await expect(c.verifyChange(actor,p.changeId,'self')).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('decision-required and missing information do not fabricate Facts or Work',async()=>{await policy('DECISION_REQUIRED');const e=await create();const v=await c.evaluateJoinRequirements(actor,e.eventId);expect(v.works).toEqual([]);expect(v.evaluations[0]?.basisSnapshot.primaryDeviceState).toBe('UNKNOWN');expect((await q.joinWorkspace(actor,e.eventId)).readiness).toBe('DECISION_WAITING');});
  it('rejected proposals retain history and allow an explicit new proposal',async()=>{const p=await proposed();await c.rejectChange(actor,p.changeId,'実施内容を訂正');const next=await c.startAssignDeviceAction(actor,{workId:p.workId,deviceId:ids.device,executionSummary:'訂正した実施内容',effectiveFrom:'2026-10-01T08:00:00.000Z'});expect(next.changeId).not.toBe(p.changeId);expect((await q.workDetail(actor,p.workId)).changes.map(c=>c.status)).toContain('REJECTED');});
  it('every command URL and unsafe method passes the same exact Origin/CSRF boundary',async()=>{
    const config:Config={nodeEnv:'test',port:8080,origin:'http://localhost:8080',databaseUrl:'postgresql://unused',databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test',clientSecret:'test',redirectUri:'http://localhost:8080/auth/callback'};
    const store=new PgIdentityStore(db.runtime);await store.createSession(tokenHash('test-session'),{tenantId:ids.tenant,operatorId:ids.operator},'csrf');
    const app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>{throw new Error('not used');}},pino({level:'silent'}),{commands:c,queries:q});
    const urls=['/api/join-events',`/api/join-events/${randomUUID()}/evaluate-requirements`,`/api/work/${randomUUID()}/take-ownership`,`/api/work/${randomUUID()}/actions/assign-device`,`/api/changes/${randomUUID()}/verify`,`/api/changes/${randomUUID()}/commit`,`/api/changes/${randomUUID()}/reject`,`/api/work/${randomUUID()}/complete`,'/auth/logout'];
    for(const url of urls){await request(app).post(url).expect(401);await request(app).post(url).set('Cookie','factact_session=test-session').expect(403);await request(app).post(url).set('Cookie','factact_session=test-session').set('Origin',config.origin+'.evil').set('x-csrf-token','csrf').expect(403);}
    for(const method of ['post','put','patch','delete'] as const) await request(app)[method]('/api/future-command').set('Cookie','factact_session=test-session').set('Origin',config.origin).set('x-csrf-token','wrong').expect(403);
    const res=await request(app).post('/api/join-events').set('Cookie','factact_session=test-session').set('Origin',config.origin).set('x-csrf-token','csrf').send({organizationId:ids.organization,personId:ids.person,serviceId:ids.service,joinDate:'2026-10-02'}).expect(201);
    expect(res.body.data.eventId).toBeTruthy();
  });
});
