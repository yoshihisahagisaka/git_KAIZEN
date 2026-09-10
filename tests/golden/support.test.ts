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
async function work(){const e=await intake();const r=await s.evaluate(a,e.id,'REQUIRED','利用対象と症状の確認・案内が必要');return{e,w:r.work!};}
async function joinFact(){const e=await j.createJoinEvent(a,{organizationId:ids.organization,personId:ids.person,serviceId:ids.service,joinDate:'2026-10-02'});const r=await j.evaluateJoinRequirements(a,e.eventId),w=r.works[0]!;const p=await j.startAssignDeviceAction(a,{workId:w.id,deviceId:ids.device,executionSummary:'実機確認・引き渡し済み',effectiveFrom:'2026-10-01T07:00:00.000Z'});await j.verifyChange(a,p.changeId,'本人・実機を確認');return {workId:w.id,relation:await j.commitChange(a,p.changeId)};}
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
 await s.recordWork(a,w.id,{...recordInput('COMPLETION'),notes:{...notes,result:'UNCONFIRMED',resultSource:'UNKNOWN',resultDetails:''}});expect((await q.detail(a,(await intake()).id)).previousWork[0]?.record?.notes.result).toBe('UNCONFIRMED');
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
