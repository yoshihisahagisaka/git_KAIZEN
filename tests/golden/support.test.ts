import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import {testDatabase,ids} from '../fixtures/database.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {PgJoinUnitOfWork} from '../../apps/web/src/server/persistence/join-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import {JoinCommands} from '../../packages/application/src/join-commands.js';
import {JoinQueries} from '../../packages/application/src/join-queries.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import {createApp} from '../../apps/web/src/server/app.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
let db:Awaited<ReturnType<typeof testDatabase>>,s:SupportCommands,q:SupportQueries,j:JoinCommands,jq:JoinQueries;
const a:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Demo',tenantName:'Demo',roles:['ADMIN','OPERATOR','REVIEWER']};
const clock={id:randomUUID,now:()=> '2026-10-01T09:00:00.000Z'};
const resolution={mode:'GUIDANCE_ONLY' as const,diagnosticEvidence:'デモ: 契約窓口の利用対象確認と本人のエラー表示を照合',rationale:'利用対象の根拠が得られたため、既知の接続手順を案内する',actionSummary:'接続手順の確認方法を案内した。設定変更は行っていない'};
const notes:import('../../packages/domain/src/support.js').SupportNotes={checks:'本人は今朝から接続不可と申告。利用対象は未確認。',action:'RESTART_GUIDANCE',actionDetails:'本人に再起動を案内し、実施したとの回答。',result:'CONNECTED',resultSource:'CALLER',resultDetails:'本人は再接続できたと回答。',exceptionReason:''};
const recordInput=(kind:'DRAFT'|'COMPLETION'|'CORRECTION',expectedRevision=0)=>({requestId:randomUUID(),expectedRevision,kind,notes:{...notes},correctionReason:kind==='CORRECTION'?'確認時刻を訂正':''});
beforeAll(async()=>{db=await testDatabase();const su=new PgSupportUnitOfWork(db.runtime),ju=new PgJoinUnitOfWork(db.runtime);s=new SupportCommands(su,clock);q=new SupportQueries(su);j=new JoinCommands(ju,clock);jq=new JoinQueries(ju);});
beforeEach(async()=>db.reset());afterAll(async()=>db?.close());
const intake=()=>s.createEvent(a,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'会社PCでVPNにつながりません'});
// Existing V1 behavior remains covered as historical compatibility. Slice 2 V2 cases create their own Work below.
async function work(){const e=await intake();const r=await s.evaluate(a,e.id,'REQUIRED','利用対象と症状の確認・案内が必要');await db.admin.query('update factact.work set lifecycle_version=1 where id=$1',[r.work!.id]);return{e,w:{...r.work!,lifecycleVersion:1}};}
async function workV2(){const e=await intake();const r=await s.evaluate(a,e.id,'REQUIRED','利用対象と症状の確認・案内が必要');return{e,w:r.work!};}
async function joinFact(){const e=await j.createJoinEvent(a,{organizationId:ids.organization,personId:ids.person,serviceId:ids.service,joinDate:'2026-10-02'});const r=await j.evaluateJoinRequirements(a,e.eventId),w=r.works[0]!;const p=await j.startAssignDeviceAction(a,{workId:w.id,deviceId:ids.device,executionSummary:'実機確認・引き渡し済み',effectiveFrom:'2026-10-01T07:00:00.000Z'});await j.verifyChange(a,p.changeId,'本人・実機を確認');return {workId:w.id,relation:await j.commitChange(a,p.changeId)};}
async function setReadRoles(roles:Operator['roles']){await db.admin.query('delete from factact.operator_roles where tenant_id=$1 and operator_id=$2',[ids.tenant,ids.operator]);for(const role of roles)await db.admin.query('insert into factact.operator_roles values($1,$2,$3)',[ids.tenant,ids.operator,role]);}
it('SUPPORT Read Authority v1 uses current Roles and remains separate from Command Authority',async()=>{const e=await intake();for(const role of ['ADMIN','OPERATOR','REVIEWER'] as const){await setReadRoles([role]);expect((await q.detail(a,e.id)).event.id).toBe(e.id);}await expect(s.createEvent(a,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'reviewer cannot execute'})).rejects.toMatchObject({code:'FORBIDDEN'});await setReadRoles([]);await expect(q.detail(a,e.id)).rejects.toMatchObject({code:'FORBIDDEN'});await db.admin.query("update factact.operators set status='INACTIVE' where id=$1",[ids.operator]);await expect(q.list(a)).rejects.toMatchObject({code:'NOT_FOUND'});});
it('SUPPORT-GT-01 Event is not Work',async()=>{const e=await intake();const v=await q.detail(a,e.id);expect(v.work).toBeNull();expect(v.evaluation).toBeNull();});
it('SUPPORT-GT-02 explicit required triage creates owned shared Work with reproducible basis',async()=>{const {e,w}=await work();expect(w.workOwnerOperatorId).toBe(a.id);expect(w.nextAction).toContain('VPN');expect((await q.detail(a,e.id)).evaluation?.basisSnapshot).toMatchObject({contractProfileId:ids.contract,decision:'REQUIRED'});expect((await db.admin.query('select lane,work_type from factact.work where id=$1',[w.id])).rows[0]).toEqual({lane:'SUPPORT',work_type:'INCIDENT'});});
it('SUPPORT-GT-03 reuses exact JOIN Relation and provenance without a SUPPORT device column',async()=>{const fact=await joinFact(),{e}=await work();const v=await q.detail(a,e.id);expect(v.deviceFact?.relation.id).toBe(fact.relation.id);expect(v.deviceFact?.device.assetTag).toBe('PC-0073');expect(v.deviceFact?.sourceChange.workId).toBe(fact.workId);const cols=await db.admin.query("select column_name from information_schema.columns where table_schema='factact' and table_name in ('support_events','recipient_observations','support_decisions') and column_name like '%device%'");expect(cols.rows).toEqual([]);});
it('SUPPORT-GT-04 caller report stays an unverified Observation',async()=>{const e=await intake(),v=await q.detail(a,e.id);expect(v.observation).toMatchObject({contentText:'会社PCでVPNにつながりません',sourceType:'CALLER',semanticType:'OBSERVATION',reliability:'UNVERIFIED',reviewPolicy:'REVIEW_FOR_EACH_INQUIRY'});expect(v.deviceFact).toBeNull();});
it('SUPPORT-GT-05 absent details stay unknown even after a scoped diagnostic Decision',async()=>{const {e,w}=await work();const before=(await q.detail(a,e.id)).unknowns;await s.recordResolution(a,w.id,resolution);expect((await q.detail(a,e.id)).unknowns).toEqual(before);expect(before).toContain('VPN利用要否');});
it('SUPPORT-GT-06 guidance completes without a fake Change or Registry write',async()=>{const fact=await joinFact(),{w}=await work();const before=await db.admin.query('select * from factact.relations');await s.recordResolution(a,w.id,resolution);await s.complete(a,w.id);expect((await db.admin.query('select * from factact.relations')).rows).toEqual(before.rows);expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[w.id])).rows[0].n).toBe(0);expect(fact.relation.sourceChangeId).toBeTruthy();});
it('SUPPORT-GT-07 reality mutation is rejected by SUPPORT and JOIN still requires Verify/Commit',async()=>{const {w}=await work();await expect(s.recordResolution(a,w.id,{...resolution,mode:'REALITY_CHANGE' as 'GUIDANCE_ONLY'})).rejects.toMatchObject({code:'REALITY_CHANGE_NOT_SUPPORTED'});await expect(j.completeWork(a,w.id,'COMPLETED')).rejects.toMatchObject({code:'NOT_FOUND'});const e=await j.createJoinEvent(a,{organizationId:ids.organization,personId:ids.person,serviceId:ids.service,joinDate:'2026-10-02'});const r=await j.evaluateJoinRequirements(a,e.eventId);const p=await j.startAssignDeviceAction(a,{workId:r.works[0]!.id,deviceId:ids.device,executionSummary:'割当記録',effectiveFrom:'2026-10-01T08:00:00.000Z'});await expect(j.commitChange(a,p.changeId)).rejects.toMatchObject({code:'CHANGE_NOT_VERIFIED'});expect((await jq.personContext(a,ids.person)).verifiedFacts).toEqual([]);});
it('SUPPORT-GT-08 knowledge candidate links Work/Evidence/Decision and resurfaces in later inquiry',async()=>{const {w}=await work();const d=await s.recordResolution(a,w.id,resolution);const k=await s.saveKnowledge(a,w.id,'接続案内前の確認','利用対象の根拠を確認してから案内する。設定変更が必要なら別対応。');expect(k).toMatchObject({sourceWorkId:w.id,sourceDecisionId:d.id,sourceEvidenceId:d.evidenceId,status:'CANDIDATE'});const next=await intake();expect((await q.detail(a,next.id)).relatedKnowledge[0]?.id).toBe(k.id);});
it('SUPPORT-GT-09 current relation wins after replacement; old history survives',async()=>{const fact=await joinFact(),{e}=await work(),deviceId=randomUUID();await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,display_name,device_status) values($1,$2,'PC-0088','Replacement','AVAILABLE')",[deviceId,ids.tenant]);const p=await j.startAssignDeviceAction(a,{workId:fact.workId,deviceId,executionSummary:'置換済み',effectiveFrom:'2026-10-01T08:00:00.000Z',replacesRelationId:fact.relation.id});await j.verifyChange(a,p.changeId,'置換を確認');const replacement=await j.commitChange(a,p.changeId);expect((await q.detail(a,e.id)).deviceFact?.relation.id).toBe(replacement.id);expect((await q.detail(a,(await intake()).id)).deviceFact?.device.assetTag).toBe('PC-0088');expect((await jq.personContext(a,ids.person)).relationHistory.find(r=>r.id===fact.relation.id)?.status).toBe('ENDED');});
it('SUPPORT-GT-10 real runtime role isolates every SUPPORT record and context',async()=>{await joinFact();const {e,w}=await work();await s.recordResolution(a,w.id,resolution);await s.saveKnowledge(a,w.id,'参考','参考内容');const tenant=randomUUID(),operator=randomUUID();await db.admin.query("insert into factact.tenants(id,name,status) values($1,'Other','ACTIVE')",[tenant]);await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'other@example.invalid','Other','ACTIVE')",[operator,tenant]);await db.admin.query("insert into factact.operator_roles values($1,$2,'OPERATOR')",[tenant,operator]);const other={...a,id:operator,tenantId:tenant};expect((await q.list(other)).inquiries).toEqual([]);for(const op of [()=>q.detail(other,e.id),()=>s.evaluate(other,e.id,'REQUIRED','forge'),()=>s.recordResolution(other,w.id,resolution),()=>s.saveKnowledge(other,w.id,'forge','forge'),()=>s.complete(other,w.id)])await expect(op()).rejects.toMatchObject({code:'NOT_FOUND'});for(const table of ['support_events','work','recipient_observations','evidence','support_decisions','knowledge_candidates','relations']){expect(await withTenant(db.runtime,tenant,async c=>(await c.query(`select * from factact.${table}`)).rowCount)).toBe(0);expect((await db.runtime.query(`select * from factact.${table}`)).rowCount).toBe(0);}await expect(withTenant(db.runtime,tenant,c=>c.query('insert into factact.knowledge_candidates select $1,$2,source_work_id,source_decision_id,source_evidence_id,title,content_text,status,topic,$3,created_at from factact.knowledge_candidates',[randomUUID(),tenant,operator]))).resolves.toMatchObject({rowCount:0});});
it('SUPPORT-GT-11 concurrent command retries do not duplicate records and reject changed payload',async()=>{const input={requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'VPNにつながらない'};const [e,e2]=await Promise.all([s.createEvent(a,input),s.createEvent(a,input)]);expect(e.id).toBe(e2.id);await expect(s.createEvent(a,{...input,symptom:'different'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});const [x,y]=await Promise.all([s.evaluate(a,e.id,'REQUIRED','確認必要'),s.evaluate(a,e.id,'REQUIRED','確認必要')]);expect(x.work?.id).toBe(y.work?.id);const w=x.work!;const [d,d2]=await Promise.all([s.recordResolution(a,w.id,resolution),s.recordResolution(a,w.id,resolution)]);expect(d.id).toBe(d2.id);const [k,k2]=await Promise.all([s.saveKnowledge(a,w.id,'参考','内容'),s.saveKnowledge(a,w.id,'参考','内容')]);expect(k.id).toBe(k2.id);await Promise.all([s.complete(a,w.id),s.complete(a,w.id)]);expect((await q.detail(a,e.id)).timeline.filter(e=>e.eventType==='SUPPORT_COMPLETED')).toHaveLength(1);expect((await db.admin.query("select count(*)::int as n from factact.evidence where evidence_type='DIAGNOSTIC'")).rows[0].n).toBe(1);});
it('SUPPORT-GT-12 No Work differs from investigated NO_ACTION_REQUIRED',async()=>{const e=await intake();await s.evaluate(a,e.id,'NOT_APPLICABLE','受付範囲外');expect((await q.detail(a,e.id)).work).toBeNull();const {w}=await work();await s.recordResolution(a,w.id,{...resolution,mode:'NO_ACTION_REQUIRED',rationale:'調査した結果、追加案内が不要と判断'});expect((await s.complete(a,w.id)).outcome).toBe('NO_ACTION_REQUIRED');});
it('SUPPORT requires active Contract Authority and evidence before completion',async()=>{const {w}=await work();await expect(s.complete(a,w.id)).rejects.toMatchObject({code:'NOT_FOUND'});await db.admin.query("update factact.contract_profiles set configuration_json=configuration_json-'support' where id=$1",[ids.contract]);await expect(s.recordResolution(a,w.id,resolution)).rejects.toMatchObject({code:'SUPPORT_NOT_AUTHORIZED'});});
it('SUPPORT commands share Origin/session CSRF protection and reject foreign fields',async()=>{const store=new PgIdentityStore(db.runtime);await store.createSession(tokenHash('support-test'),{tenantId:a.tenantId,operatorId:a.id},'csrf');const app=createApp({nodeEnv:'test',port:8080,origin:'http://localhost:5173',databaseUrl:'postgresql://test',databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'},store,{authorizationUrl:()=>'',verifyCallback:async()=>{throw Error();}},pino({level:'silent'}),undefined,{commands:s,queries:q});for(const path of ['/api/support','/api/support/'+randomUUID()+'/evaluate','/api/support-work/'+randomUUID()+'/resolution','/api/support-work/'+randomUUID()+'/knowledge','/api/support-work/'+randomUUID()+'/complete','/api/support-work/'+randomUUID()+'/records']){expect((await request(app).post(path).send({})).status).toBe(401);expect((await request(app).post(path).set('Cookie','factact_session=support-test').send({})).status).toBe(403);expect((await request(app).post(path).set('Cookie','factact_session=support-test').set('Origin','http://evil.invalid').set('x-csrf-token','csrf').send({})).status).toBe(403);}expect((await request(app).post('/api/support').set('Cookie','factact_session=support-test').set('Origin','http://localhost:5173').set('x-csrf-token','csrf').send({requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'report',deviceId:ids.device})).status).toBe(400);});
it('SUPPORT resolution rolls back Evidence, Action and Decision if audit fails',async()=>{
 const {w}=await work();const real=new PgSupportUnitOfWork(db.runtime);
 const faulty=new SupportCommands({run:(tenant,fn)=>real.run(tenant,r=>{r.audit=async()=>{throw new Error('injected audit failure');};return fn(r);})},clock);
 await expect(faulty.recordResolution(a,w.id,resolution)).rejects.toThrow('injected audit failure');
 expect((await db.admin.query("select count(*)::int as n from factact.evidence where evidence_type='DIAGNOSTIC'")).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.actions where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.support_decisions where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query('select status from factact.work where id=$1',[w.id])).rows[0].status).toBe('OPEN');
});
it('SUPPORT composite foreign keys reject forged cross-tenant observation links',async()=>{
 const e=await intake(),tenant=randomUUID(),operator=randomUUID();
 await db.admin.query("insert into factact.tenants(id,name,status) values($1,'Other','ACTIVE')",[tenant]);
 await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'other@example.invalid','Other','ACTIVE')",[operator,tenant]);
 await expect(withTenant(db.runtime,tenant,c=>c.query("insert into factact.recipient_observations(id,tenant_id,support_event_id,content_text,source_type,semantic_type,reliability,observed_at,recorded_by_operator_id,review_policy) values($1,$2,$3,'forged','CALLER','OBSERVATION','UNVERIFIED',now(),$4,'REVIEW_FOR_EACH_INQUIRY')",[randomUUID(),tenant,e.id,operator]))).rejects.toMatchObject({code:'23503'});
});

it('Slice 1 residual: unidentified target is append-only Work context and later Device confirmation preserves it',async()=>{
 const {e,w}=await work(),beforeRelations=(await db.admin.query('select * from factact.relations')).rows;
 const input={requestId:randomUUID(),expectedRevision:0,sourceType:'CALLER' as const,detail:'管理番号は未確認。本人は自宅のPCと申告。'};const unknown=await s.recordUnidentifiedTarget(a,w.id,input);await expect(s.recordUnidentifiedTarget(a,w.id,input)).resolves.toEqual(unknown);await expect(s.recordUnidentifiedTarget(a,w.id,{...input,detail:'別の申告'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 await s.recordTargetObservation(a,w.id,{requestId:randomUUID(),expectedRevision:1,kind:'OWNERSHIP',value:'PERSONALLY_OWNED',detail:'本人申告',sourceType:'CALLER'});
 const afterUnknown=await q.detail(a,e.id);expect(afterUnknown.currentDeviceContext).toMatchObject({id:unknown.id,kind:'UNIDENTIFIED',deviceId:null});expect(afterUnknown.currentContextDevice).toBeNull();expect(afterUnknown.targetObservations).toMatchObject([{kind:'IDENTIFICATION',value:'UNIDENTIFIED'},{kind:'OWNERSHIP',value:'PERSONALLY_OWNED'}]);expect(afterUnknown.eligibility).toEqual({state:'UNKNOWN',reason:'NO_APPLICABLE_RULE',ruleSource:null});
 const confirmed=await s.confirmContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,deviceId:ids.device,confirmationSource:'OPERATOR'});
 const after=await q.detail(a,e.id);expect(after.currentDeviceContext?.id).toBe(confirmed.id);expect(after.currentContextDevice?.id).toBe(ids.device);expect(after.deviceContextHistory.map(x=>x.context.kind)).toEqual(['UNIDENTIFIED','CONFIRMED']);expect((await db.admin.query('select * from factact.relations')).rows).toEqual(beforeRelations);expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.support_work_target_observations where work_id=$1',[w.id])).rows[0].n).toBe(2);
});

it('Slice 1 residual: target observations reject stale, retry-conflicting and cross-Work references',async()=>{
 const {w}=await work();const unknown=await s.recordUnidentifiedTarget(a,w.id,{requestId:randomUUID(),expectedRevision:0,sourceType:'OPERATOR',detail:''});
 const input={requestId:randomUUID(),expectedRevision:1,kind:'MANAGEMENT_STATE' as const,value:'UNKNOWN' as const,detail:'',sourceType:'OPERATOR' as const};const saved=await s.recordTargetObservation(a,w.id,input);await expect(s.recordTargetObservation(a,w.id,input)).resolves.toEqual(saved);await expect(s.recordTargetObservation(a,w.id,{...input,value:'MANAGED'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});await expect(s.recordTargetObservation(a,w.id,{...input,requestId:randomUUID(),expectedRevision:0})).rejects.toMatchObject({code:'STALE_REVISION'});
 const other=(await work()).w;await expect(withTenant(db.runtime,a.tenantId,c=>c.query("insert into factact.support_work_target_observations(id,tenant_id,work_id,target_context_id,request_id,revision,kind,value,detail,source_type,recorded_by_operator_id,recorded_at) values($1,$2,$3,$4,$5,1,'OWNERSHIP','UNKNOWN','','OPERATOR',$6,now())",[randomUUID(),a.tenantId,other.id,unknown.id,randomUUID(),a.id]))).rejects.toMatchObject({code:'23514'});
 await s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,reason:'別対象を確認するため'});const next=await s.recordUnidentifiedTarget(a,w.id,{requestId:randomUUID(),expectedRevision:2,sourceType:'OPERATOR',detail:''});await expect(withTenant(db.runtime,a.tenantId,c=>c.query("insert into factact.support_work_target_observations(id,tenant_id,work_id,target_context_id,request_id,revision,kind,value,detail,source_type,supersedes_observation_id,recorded_by_operator_id,recorded_at) values($1,$2,$3,$4,$5,3,'MANAGEMENT_STATE','UNKNOWN','','OPERATOR',$6,$7,now())",[randomUUID(),a.tenantId,w.id,next.id,randomUUID(),saved.id,a.id]))).rejects.toMatchObject({code:'23514'});
});

it('V2 normal intake records explicit human basis; exception still needs reason',async()=>{
 const e=await intake();await expect(s.evaluate(a,e.id,'NOT_APPLICABLE','')).rejects.toMatchObject({code:'INVALID_TRIAGE'});
 const evaluated=await s.evaluate(a,e.id,'REQUIRED');expect(evaluated.evaluation.basisSummary).toContain('標準受付');
 expect(evaluated.evaluation.basisSnapshot.contractProfileVersion).toBe(1);expect(evaluated.work?.workOwnerOperatorId).toBe(a.id);
});
it('V2 drafts are editable append-only records, not Actions, Decisions or Facts',async()=>{
 const {e,w}=await work();const first=await s.recordWork(a,w.id,recordInput('DRAFT'));
 await s.recordWork(a,w.id,{...recordInput('DRAFT',first.revision),notes:{...notes,checks:'訂正した確認内容'}});
 const v=await q.detail(a,e.id);expect(v.records).toHaveLength(2);expect(v.records[0]?.notes.checks).toBe(notes.checks);expect(v.records[1]?.notes.checks).toBe('訂正した確認内容');expect(v.decision).toBeNull();expect(v.work?.status).toBe('OPEN');
 expect((await db.admin.query('select * from factact.actions where work_id=$1',[w.id])).rows).toHaveLength(0);
 await expect(withTenant(db.runtime,a.tenantId,c=>c.query('delete from factact.support_work_records where work_id=$1',[w.id]))).rejects.toMatchObject({code:'42501'});
 await expect(withTenant(db.runtime,a.tenantId,c=>c.query("update factact.support_work_records set correction_reason='overwrite' where work_id=$1",[w.id]))).rejects.toMatchObject({code:'42501'});
});
it('V2 finish atomically records Action, outcome evidence, Decision and completion without Knowledge or Change',async()=>{
 await joinFact();const {e,w}=await work(),before=(await db.admin.query('select * from factact.relations')).rows;
 await s.recordWork(a,w.id,recordInput('COMPLETION'));const v=await q.detail(a,e.id);
 expect(v.work?.outcome).toBe('COMPLETED');expect(v.evidence?.contentText).toContain('CALLER');expect(v.evidence?.contentText).toContain('接続できた');expect(v.decision?.rationale).toContain('標準手順');expect(v.action?.resultSummary).toContain('PC再起動');expect(v.knowledge).toBeNull();expect(v.unknowns).toHaveLength(4);
 expect((await db.admin.query('select * from factact.relations')).rows).toEqual(before);
 expect((await db.admin.query('select * from factact.changes where work_id=$1',[w.id])).rows).toHaveLength(0);
 const next=await intake();expect((await q.detail(a,next.id)).previousWork[0]?.record?.notes.resultSource).toBe('CALLER');
});
it('V2 retry and stale-edit guards preserve the first committed record',async()=>{
 const {e,w}=await work(),input=recordInput('DRAFT');const [x,y]=await Promise.all([s.recordWork(a,w.id,input),s.recordWork(a,w.id,input)]);expect(x.id).toBe(y.id);
 await expect(s.recordWork(a,w.id,{...input,notes:{...notes,checks:'different'}})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 await expect(s.recordWork(a,w.id,recordInput('COMPLETION'))).rejects.toMatchObject({code:'STALE_REVISION'});
 const final=recordInput('COMPLETION',1);await Promise.all([s.recordWork(a,w.id,final),s.recordWork(a,w.id,final)]);
 expect((await q.detail(a,e.id)).records).toHaveLength(2);expect((await q.detail(a,e.id)).timeline.filter(x=>x.eventType==='SUPPORT_COMPLETED')).toHaveLength(1);
 await expect(s.recordWork(a,w.id,recordInput('DRAFT',2))).rejects.toMatchObject({code:'WORK_STATE_CONFLICT'});
});
it('V2 correction preserves original Evidence/Action and surfaces corrected history without another execution',async()=>{
 const {e,w}=await work();await s.recordWork(a,w.id,recordInput('COMPLETION'));const original=await q.detail(a,e.id);
 await expect(s.recordWork(a,w.id,{...recordInput('CORRECTION',1),correctionReason:''})).rejects.toMatchObject({code:'REASON_REQUIRED'});
 await s.recordWork(a,w.id,{...recordInput('CORRECTION',1),notes:{...notes,result:'NOT_CONNECTED',resultDetails:'回答を読み違えた。本人は接続不可と申告。'}});
 const v=await q.detail(a,e.id);expect(v.evidence).toEqual(original.evidence);expect(v.action).toEqual(original.action);expect(v.records[0]?.notes.result).toBe('CONNECTED');expect(v.records[1]?.notes.result).toBe('NOT_CONNECTED');
 expect((await db.admin.query('select * from factact.actions where work_id=$1',[w.id])).rows).toHaveLength(1);
 expect((await q.detail(a,(await intake()).id)).previousWork[0]?.record?.notes.result).toBe('NOT_CONNECTED');
});
it('V2 unsupported certainty and unexplained exceptions are rejected',async()=>{
 const {w}=await work();for(const n of [{...notes,resultSource:'UNKNOWN' as const},{...notes,action:'NO_ACTION_REQUIRED' as const},{...notes,action:'OTHER_GUIDANCE' as const}])await expect(s.recordWork(a,w.id,{...recordInput('COMPLETION'),notes:n})).rejects.toMatchObject({status:400});
 await s.recordWork(a,w.id,{...recordInput('COMPLETION'),notes:{...notes,result:'UNCONFIRMED',resultSource:'UNKNOWN',resultDetails:'本人からの連絡待ち'}});expect((await q.detail(a,(await intake()).id)).previousWork[0]?.record?.notes.result).toBe('UNCONFIRMED');
});
it('V2 records honor tenant isolation and current Contract Authority',async()=>{
 const {w}=await work();await s.recordWork(a,w.id,recordInput('DRAFT'));
 const tenant=randomUUID();expect(await withTenant(db.runtime,tenant,async c=>(await c.query('select * from factact.support_work_records')).rows)).toEqual([]);
 expect((await db.runtime.query('select * from factact.support_work_records')).rows).toEqual([]);
 await db.admin.query("update factact.contract_profiles set configuration_json=configuration_json-'support' where id=$1",[ids.contract]);await expect(s.recordWork(a,w.id,recordInput('COMPLETION',1))).rejects.toMatchObject({code:'SUPPORT_NOT_AUTHORIZED'});
});
it('V2 audit failure rolls back the entire completion including structured record',async()=>{
 const {e,w}=await work(),real=new PgSupportUnitOfWork(db.runtime);
 const faulty=new SupportCommands({run:(tenant,fn)=>real.run(tenant,r=>{r.audit=async()=>{throw Error('audit failure');};return fn(r);})},clock);
 await expect(faulty.recordWork(a,w.id,recordInput('COMPLETION'))).rejects.toThrow('audit failure');
 const v=await q.detail(a,e.id);expect(v.records).toHaveLength(0);expect(v.decision).toBeNull();expect(v.work?.status).toBe('OPEN');
});
it('V2 edits an unfinished V1 account while retaining its original execution evidence',async()=>{
 const {e,w}=await work();await s.recordResolution(a,w.id,resolution);const original=await q.detail(a,e.id);
 await s.recordWork(a,w.id,recordInput('DRAFT'));await s.recordWork(a,w.id,recordInput('COMPLETION',1));
 const v=await q.detail(a,e.id);expect(v.work?.status).toBe('COMPLETED');expect(v.evidence).toEqual(original.evidence);expect(v.action).toEqual(original.action);expect(v.records.at(-1)?.notes.actionDetails).toBe(notes.actionDetails);
});
it('Human Review C/D: structured action/result/source suffice without repeated free text and survive correction',async()=>{
 const {e,w}=await work(),input={...recordInput('COMPLETION'),notes:{...notes,actionDetails:'',resultDetails:''}};
 const record=await s.recordWork(a,w.id,input);const v=await q.detail(a,e.id);
 expect(v.records[0]?.notes).toEqual(input.notes);expect(v.action?.resultSummary.trim()).toBe('PC再起動を案内');
 expect(v.evidence?.contentText).toContain('接続できた');expect(v.evidence?.contentText).toContain('CALLER');
 expect(v.decision?.evidenceId).toBe(v.evidence?.id);expect(v.recordAuthors).toContainEqual({id:a.id,displayName:'開発オペレーター'});
 await s.recordWork(a,w.id,{...recordInput('CORRECTION',record.revision),notes:{...input.notes,result:'NOT_CONNECTED'}});
 const corrected=await q.detail(a,e.id);expect(corrected.evidence).toEqual(v.evidence);expect(corrected.action).toEqual(v.action);expect(corrected.records.at(-1)?.notes.result).toBe('NOT_CONNECTED');
});
it('Human Review E: Other and Unknown require explanation, not fabricated default evidence',async()=>{
 const {w}=await work();
 for(const n of [{...notes,action:'OTHER_GUIDANCE' as const,actionDetails:'',exceptionReason:'標準外の確認が必要'},{...notes,result:'UNCONFIRMED' as const,resultSource:'UNKNOWN' as const,resultDetails:''}])await expect(s.recordWork(a,w.id,{...recordInput('COMPLETION'),notes:n})).rejects.toMatchObject({code:'EVIDENCE_REQUIRED'});
});
it('Context-01 explicit Device Context is append-only, separate from Registry and survives correction/end',async()=>{
 const {e,w}=await work(),before=(await db.admin.query('select * from factact.relations')).rows;
 const first=await s.confirmContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
 let v=await q.detail(a,e.id);expect(v.currentContextDevice?.assetTag).toBe('PC-0073');expect(v.deviceContextHistory).toHaveLength(1);expect(v.deviceContextHistory[0]?.context.id).toBe(first.id);
 const other=randomUUID();await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,display_name,device_status) values($1,$2,'PC-0099','Context only','AVAILABLE')",[other,ids.tenant]);
 await s.correctContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,deviceId:other,confirmationSource:'CALLER',reason:'最初の機器番号を聞き違えた'});
 v=await q.detail(a,e.id);expect(v.currentContextDevice?.assetTag).toBe('PC-0099');expect(v.deviceContextHistory).toHaveLength(2);expect(v.deviceContextHistory[1]?.context.supersedesContextId).toBe(first.id);
 await s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:2,reason:'対象機器を特定できない状態に戻した'});
 v=await q.detail(a,e.id);expect(v.currentDeviceContext).toBeNull();expect(v.deviceContextHistory).toHaveLength(3);expect((await db.admin.query('select * from factact.relations')).rows).toEqual(before);
});
it('Context-01 guards idempotency, stale revisions, tenant boundary and completed Work',async()=>{
 const {w}=await work(),input={requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR' as const};
 const [x,y]=await Promise.all([s.confirmContextDevice(a,w.id,input),s.confirmContextDevice(a,w.id,input)]);expect(x.id).toBe(y.id);
 await expect(s.confirmContextDevice(a,w.id,{...input,deviceId:randomUUID()})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 await expect(s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:0,reason:'stale'})).rejects.toMatchObject({code:'STALE_REVISION'});
 const tenant=randomUUID(),device=randomUUID();await db.admin.query("insert into factact.tenants(id,name,status) values($1,'Other','ACTIVE')",[tenant]);await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,display_name,device_status) values($1,$2,'OTHER-1','Other','AVAILABLE')",[device,tenant]);
 await expect(s.correctContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,deviceId:device,confirmationSource:'OPERATOR',reason:'forge'})).rejects.toMatchObject({code:'NOT_FOUND'});
 await s.recordWork(a,w.id,recordInput('COMPLETION'));await expect(s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,reason:'after completion'})).rejects.toMatchObject({code:'WORK_STATE_CONFLICT'});
 await expect(withTenant(db.runtime,a.tenantId,c=>c.query('delete from factact.support_work_device_contexts where work_id=$1',[w.id]))).rejects.toMatchObject({code:'42501'});
});
it('Context-01 review: End permits a new Confirm, while Correct and a second End remain invalid',async()=>{
 const {e,w}=await work();const first=await s.confirmContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
 const ended=await s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:1,reason:'再確認が必要'});
 await expect(s.endContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:2,reason:'duplicate'})).rejects.toMatchObject({code:'CONTEXT_STATE_CONFLICT'});
 await expect(s.correctContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:2,deviceId:ids.device,confirmationSource:'OPERATOR',reason:'invalid'})).rejects.toMatchObject({code:'CONTEXT_STATE_CONFLICT'});
 const again=await s.confirmContextDevice(a,w.id,{requestId:randomUUID(),expectedRevision:2,deviceId:ids.device,confirmationSource:'CALLER'});const v=await q.detail(a,e.id);
 expect(again.revision).toBe(3);expect(again.supersedesContextId).toBe(ended.id);expect(v.currentContextDevice?.id).toBe(ids.device);expect(first.id).not.toBe(again.id);
});
it('Context-01 review: completed Work accepts only an identical retry and rejects unrelated Evidence',async()=>{
 const {w}=await work(),input={requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR' as const};const saved=await s.confirmContextDevice(a,w.id,input);
 await s.recordWork(a,w.id,recordInput('COMPLETION'));await expect(s.confirmContextDevice(a,w.id,input)).resolves.toEqual(saved);
 await expect(s.confirmContextDevice(a,w.id,{...input,requestId:randomUUID(),expectedRevision:1})).rejects.toMatchObject({code:'WORK_STATE_CONFLICT'});
 const {e:openEvent,w:open}=await work();await s.recordResolution(a,open.id,resolution);const ownEvidence=(await q.detail(a,openEvent.id)).evidence!.id;const unrelated=randomUUID();await db.admin.query("insert into factact.evidence(id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at) values($1,$2,'DIAGNOSTIC','other','other',$3,now())",[unrelated,ids.tenant,ids.operator]);await expect(s.confirmContextDevice(a,open.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR',evidenceId:unrelated})).rejects.toMatchObject({code:'EVIDENCE_CONTEXT_MISMATCH'});await expect(s.confirmContextDevice(a,open.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR',evidenceId:ownEvidence})).resolves.toMatchObject({evidenceId:ownEvidence});
});
it('Context-01 review: database rejects a supersession that crosses Work within one Tenant',async()=>{
 const workA=(await work()).w,workB=(await work()).w;
 const contextA=await s.confirmContextDevice(a,workA.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
 const registryBefore=(await db.admin.query('select * from factact.relations order by id')).rows;
 const insert=`insert into factact.support_work_device_contexts
  (id,tenant_id,work_id,request_id,revision,kind,device_id,confirmation_source,evidence_id,reason,supersedes_context_id,recorded_by_operator_id,recorded_at)
  values($1,$2,$3,$4,$5,'CORRECTED',$6,'OPERATOR',null,'review test',$7,$8,$9)`;
 await expect(withTenant(db.runtime,a.tenantId,c=>c.query(insert,[randomUUID(),a.tenantId,workB.id,randomUUID(),1,ids.device,contextA.id,a.id,clock.now()]))).rejects.toMatchObject({code:'23514'});
 expect((await db.admin.query('select work_id,revision from factact.support_work_device_contexts order by work_id,revision')).rows).toEqual([{work_id:workA.id,revision:1}]);
 expect((await db.admin.query('select * from factact.relations order by id')).rows).toEqual(registryBefore);
 await expect(withTenant(db.runtime,a.tenantId,c=>c.query(insert,[randomUUID(),a.tenantId,workA.id,randomUUID(),2,ids.device,contextA.id,a.id,clock.now()]))).resolves.toMatchObject({rowCount:1});
 expect((await db.admin.query('select revision from factact.support_work_device_contexts where work_id=$1 order by revision',[workA.id])).rows).toEqual([{revision:1},{revision:2}]);
});

it('Slice 2: v2 continuation records Action without closing Work, then retains Waiting and Resume history',async()=>{
 const {e,w}=await workV2();expect(w.lifecycleVersion).toBe(2);
 const continuation=await s.recordContinuation(a,w.id,{requestId:randomUUID(),expectedRevision:0,notes,nextAction:'本人から結果を確認する',nextActionOpen:true});
 let v=await q.detail(a,e.id);expect(v.work).toMatchObject({status:'IN_PROGRESS',closedAt:null,nextActionOpen:true,workOwnerOperatorId:a.id});expect(v.records.at(-1)?.kind).toBe('CONTINUATION');expect(v.lifecycleEvents).toHaveLength(1);expect(continuation.kind).toBe('CONTINUATION_RECORDED');
 const waiting=await s.setWaiting(a,w.id,{requestId:randomUUID(),expectedRevision:1,party:'利用者',reason:'本人の再接続結果を待つ',nextAction:'本人へ結果を確認する'});v=await q.detail(a,e.id);expect(v.work).toMatchObject({waiting:true,waitingParty:'利用者',workOwnerOperatorId:a.id});expect(v.needsFollowUp).toBe(true);expect(waiting.kind).toBe('WAITING_SET');
 await s.resumeWork(a,w.id,{requestId:randomUUID(),expectedRevision:2,nextAction:'本人へ結果を確認する'});v=await q.detail(a,e.id);expect(v.work).toMatchObject({waiting:false,nextActionOpen:true,workOwnerOperatorId:a.id});expect(v.lifecycleEvents.map(x=>x.kind)).toEqual(['CONTINUATION_RECORDED','WAITING_SET','RESUMED']);
});

it('Slice 2: v2 follow-up is append-only, clearable and does not auto-close',async()=>{
 const {e,w}=await workV2();const at='2026-10-03T09:00:00.000Z';const set=await s.setFollowUp(a,w.id,{requestId:randomUUID(),expectedRevision:0,followUpAt:at,sourceType:'HUMAN_DECISION',basisText:'担当者判断',reason:'翌営業日に確認'});
 let v=await q.detail(a,e.id);expect(v.work?.followUpAt).toBe(at);expect(v.followUps[0]).toMatchObject({id:set.id,kind:'SET',sourceType:'HUMAN_DECISION'});await s.clearFollowUp(a,w.id,{requestId:randomUUID(),expectedRevision:1,sourceType:'HUMAN_DECISION',basisText:'担当者判断',reason:'確認不要になった'});v=await q.detail(a,e.id);expect(v.work?.followUpAt).toBeNull();expect(v.followUps.map(x=>x.kind)).toEqual(['SET','CLEARED']);expect(v.work?.status).not.toBe('COMPLETED');
});

it('Slice 2: Close requires explicit cleared responsibility, preserves provenance and is retry safe',async()=>{
 const {e,w}=await workV2();await s.recordContinuation(a,w.id,{requestId:randomUUID(),expectedRevision:0,notes,nextAction:'結果確認',nextActionOpen:true});
 await expect(s.closeWork(a,w.id,{requestId:randomUUID(),expectedRevision:1,outcome:'RESOLVED',closeReason:'対応を終えた',provenanceType:'HUMAN_DECISION',provenanceReference:'担当者が確認'})).rejects.toMatchObject({code:'CLOSE_GUARD_UNMET'});
 await s.clearNextAction(a,w.id,{requestId:randomUUID(),expectedRevision:1,reason:'追加の対応は不要'});const input={requestId:randomUUID(),expectedRevision:2,outcome:'RESOLVED' as const,closeReason:'本人への案内を完了',provenanceType:'HUMAN_DECISION' as const,provenanceReference:'担当者が結果を確認'};const closed=await s.closeWork(a,w.id,input);await expect(s.closeWork(a,w.id,input)).resolves.toEqual(closed);await expect(s.closeWork(a,w.id,{...input,closeReason:'異なる理由'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 const v=await q.detail(a,e.id);expect(v.work).toMatchObject({status:'COMPLETED',outcome:'RESOLVED',nextActionOpen:false});expect(v.closeDecision).toMatchObject({id:closed.id,outcome:'RESOLVED',closeReason:input.closeReason,guardSnapshot:{waiting:false,nextActionOpen:false,requiredVerificationOpen:false}});expect(v.closeDecision?.guardSnapshot).toMatchObject({verificationBasis:['SUPPORT_GUIDANCE_ACTION_HAS_NO_REQUIRED_VERIFICATION']});expect(v.records.filter(x=>x.kind==='CONTINUATION')).toHaveLength(1);
});

it('Slice 2 review: Close rejects open and unknown Verification requirements, preserving the guard basis',async()=>{
 const closeInput=(expectedRevision:number)=>({requestId:randomUUID(),expectedRevision,outcome:'RESOLVED' as const,closeReason:'確認済み',provenanceType:'HUMAN_DECISION' as const,provenanceReference:'担当者の明示判断'});
 const {w:openChange}=await workV2();await s.clearNextAction(a,openChange.id,{requestId:randomUUID(),expectedRevision:0,reason:'Close判断へ'});
 const actionId=randomUUID(),changeId=randomUUID();await db.admin.query("insert into factact.actions(id,tenant_id,work_id,action_type,actor_operator_id,status,input_json,result_summary,started_at,completed_at) values($1,$2,$3,'ASSIGN_DEVICE',$4,'COMPLETED','{}','割当記録',now(),now())",[actionId,ids.tenant,openChange.id,ids.operator]);await db.admin.query("insert into factact.changes(id,tenant_id,work_id,action_id,change_type,change_kind,status,subject_type,subject_id,proposed_effect_json,created_at) values($1,$2,$3,$4,'REALITY_CHANGE','PRIMARY_DEVICE_ASSIGNMENT','PROPOSED','PERSON',$5,'{}',now())",[changeId,ids.tenant,openChange.id,actionId,ids.person]);
 await expect(s.closeWork(a,openChange.id,closeInput(1))).rejects.toMatchObject({code:'CLOSE_GUARD_UNMET'});
 const {w:unknown}=await workV2();await s.clearNextAction(a,unknown.id,{requestId:randomUUID(),expectedRevision:0,reason:'Close判断へ'});await db.admin.query("insert into factact.actions(id,tenant_id,work_id,action_type,actor_operator_id,status,input_json,result_summary,started_at,completed_at) values($1,$2,$3,'ASSIGN_DEVICE',$4,'COMPLETED','{}','未分類の実施',now(),now())",[randomUUID(),ids.tenant,unknown.id,ids.operator]);await expect(s.closeWork(a,unknown.id,closeInput(1))).rejects.toMatchObject({code:'CLOSE_GUARD_UNMET'});
});

it('Slice 2 review: every explicit Close outcome is retained on the V2 Work projection',async()=>{
 for(const outcome of ['RESOLVED','WITHDRAWN','NOT_ELIGIBLE','FORMALLY_TRANSFERRED','OTHER_RESPONSIBILITY_ENDED'] as const){const {e,w}=await workV2();await s.clearNextAction(a,w.id,{requestId:randomUUID(),expectedRevision:0,reason:'責任終了を確認'});await s.closeWork(a,w.id,{requestId:randomUUID(),expectedRevision:1,outcome,closeReason:'明示Close',provenanceType:'HUMAN_DECISION',provenanceReference:'担当者判断'});expect((await q.detail(a,e.id)).work?.outcome).toBe(outcome);}
});

it('Slice 2 review: command retries compare complete payloads and Waiting plus Follow-up remains atomic',async()=>{
 const {e,w}=await workV2(),requestId=randomUUID(),input={requestId,expectedRevision:0,party:'利用者',reason:'回答待ち',nextAction:'翌日に確認',followUpAt:'2026-10-03T09:00:00.000Z',sourceType:'CUSTOMER_COMMITMENT' as const,basisText:'利用者の折返し予定'};const [first,retry]=await Promise.all([s.setWaiting(a,w.id,input),s.setWaiting(a,w.id,input)]);expect(retry.id).toBe(first.id);await expect(s.setWaiting(a,w.id,{...input,basisText:'異なる根拠'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});const v=await q.detail(a,e.id);expect(v.lifecycleEvents.filter(x=>x.requestId===requestId)).toHaveLength(1);expect(v.followUps.filter(x=>x.requestId===requestId)).toHaveLength(1);expect(v.followUps[0]).toMatchObject({sourceType:'CUSTOMER_COMMITMENT',basisText:'利用者の折返し予定',recordedByOperatorId:a.id});
 await expect(s.setFollowUp(a,w.id,{requestId:randomUUID(),expectedRevision:1,followUpAt:'not-a-date',sourceType:'HUMAN_DECISION',basisText:'根拠',reason:'確認'})).rejects.toMatchObject({code:'INVALID_INPUT'});
});

it('Slice 2 review: every lifecycle command accepts only its original request payload',async()=>{
 const {w}=await workV2();const continuation={requestId:randomUUID(),expectedRevision:0,notes,nextAction:'結果確認',nextActionOpen:true};await s.recordContinuation(a,w.id,continuation);await expect(s.recordContinuation(a,w.id,continuation)).resolves.toMatchObject({requestId:continuation.requestId});await expect(s.recordContinuation(a,w.id,{...continuation,notes:{...notes,checks:'異なる確認'}})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 const waiting={requestId:randomUUID(),expectedRevision:1,party:'利用者',reason:'回答待ち',nextAction:'確認する'};await s.setWaiting(a,w.id,waiting);const resumed={requestId:randomUUID(),expectedRevision:2,nextAction:'回答を再確認する'};await s.resumeWork(a,w.id,resumed);await expect(s.resumeWork(a,w.id,resumed)).resolves.toMatchObject({requestId:resumed.requestId});await expect(s.resumeWork(a,w.id,{...resumed,nextAction:'異なる対応'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 const cleared={requestId:randomUUID(),expectedRevision:3,reason:'対応不要'};await s.clearNextAction(a,w.id,cleared);await expect(s.clearNextAction(a,w.id,cleared)).resolves.toMatchObject({requestId:cleared.requestId});await expect(s.clearNextAction(a,w.id,{...cleared,reason:'異なる理由'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 const follow={requestId:randomUUID(),expectedRevision:4,followUpAt:'2026-10-03T09:00:00.000Z',sourceType:'HUMAN_DECISION' as const,basisText:'担当者判断',reason:'翌日に確認'};await s.setFollowUp(a,w.id,follow);await expect(s.setFollowUp(a,w.id,follow)).resolves.toMatchObject({requestId:follow.requestId});await expect(s.setFollowUp(a,w.id,{...follow,basisText:'異なる根拠'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
 const clearFollow={requestId:randomUUID(),expectedRevision:5,sourceType:'HUMAN_DECISION' as const,basisText:'担当者判断',reason:'確認不要'};await s.clearFollowUp(a,w.id,clearFollow);await expect(s.clearFollowUp(a,w.id,clearFollow)).resolves.toMatchObject({requestId:clearFollow.requestId});await expect(s.clearFollowUp(a,w.id,{...clearFollow,reason:'異なる理由'})).rejects.toMatchObject({code:'RETRY_CONFLICT'});
});

it('Slice 2 review: concurrent Waiting and Close cannot bypass lifecycle revision or responsibility guards',async()=>{
 const {w}=await workV2();const results=await Promise.allSettled([s.setWaiting(a,w.id,{requestId:randomUUID(),expectedRevision:0,party:'利用者',reason:'回答待ち',nextAction:'確認する'}),s.closeWork(a,w.id,{requestId:randomUUID(),expectedRevision:0,outcome:'RESOLVED',closeReason:'Close試行',provenanceType:'HUMAN_DECISION',provenanceReference:'担当者判断'})]);expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(results.filter(x=>x.status==='rejected')).toHaveLength(1);
});

it('Slice 2: Waiting and stale revision block Close; no command auto-closes Work',async()=>{
 const {w}=await workV2();await s.setWaiting(a,w.id,{requestId:randomUUID(),expectedRevision:0,party:'外部窓口',reason:'回答待ち',nextAction:'回答を確認する'});await expect(s.closeWork(a,w.id,{requestId:randomUUID(),expectedRevision:1,outcome:'FORMALLY_TRANSFERRED',closeReason:'移管',provenanceType:'FORMAL_TRANSFER',provenanceReference:'受付番号'})).rejects.toMatchObject({code:'CLOSE_GUARD_UNMET'});await expect(s.resumeWork(a,w.id,{requestId:randomUUID(),expectedRevision:0,nextAction:'stale'})).rejects.toMatchObject({code:'STALE_REVISION'});expect((await q.detail(a,(await intake()).id)).work).toBeNull();
});

it('Slice 2: grounded formal transfer can close an otherwise unresolved responsibility',async()=>{
 const {e,w}=await workV2();await s.clearNextAction(a,w.id,{requestId:randomUUID(),expectedRevision:0,reason:'正式移管のため元Workの次Actionを終了'});const closed=await s.closeWork(a,w.id,{requestId:randomUUID(),expectedRevision:1,outcome:'FORMALLY_TRANSFERRED',closeReason:'契約窓口が責任を引き受けた',provenanceType:'FORMAL_TRANSFER',provenanceReference:'移管受付番号 TR-001'});const v=await q.detail(a,e.id);expect(v.closeDecision).toMatchObject({id:closed.id,outcome:'FORMALLY_TRANSFERRED',provenanceType:'FORMAL_TRANSFER'});expect(v.work?.status).toBe('COMPLETED');
});
