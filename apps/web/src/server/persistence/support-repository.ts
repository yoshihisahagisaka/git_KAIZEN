import type {Pool,PoolClient} from 'pg';
import {withTenant} from './database.js';
import {PgJoinRepository} from './join-repository.js';
import type {SupportRepository,SupportUnitOfWork} from '../../../../../packages/application/src/support-ports.js';
import type {SupportEvent,SupportWork,SupportEvaluation,RecipientObservation,DiagnosticEvidence,SupportDecision,KnowledgeCandidate,SupportAudit,SupportTargetObservation,SupportLifecycleEvent,SupportFollowUp,SupportCloseDecision} from '../../../../../packages/domain/src/support.js';
import type {Action} from '../../../../../packages/domain/src/join.js';
export class PgSupportUnitOfWork implements SupportUnitOfWork {
 constructor(private pool:Pool){}
 run<T>(tenant:string,fn:(r:SupportRepository)=>Promise<T>,readOnly=false){return withTenant(this.pool,tenant,db=>fn(new PgSupportRepository(db,tenant)),readOnly);}
}
class PgSupportRepository implements SupportRepository {
 deviceContexts(id:string){return this.many<import('../../../../../packages/domain/src/support.js').SupportDeviceContext>('select * from factact.support_work_device_contexts where work_id=$1 order by revision',[id]);}
 insertDeviceContext(context:import('../../../../../packages/domain/src/support.js').SupportDeviceContext){return this.insert('support_work_device_contexts',context);}
 targetObservations(id:string){return this.many<SupportTargetObservation>('select * from factact.support_work_target_observations where work_id=$1 order by revision',[id]);}
 insertTargetObservation(observation:SupportTargetObservation){return this.insert('support_work_target_observations',observation);}
 lifecycleEvents(id:string){return this.many<SupportLifecycleEvent>('select * from factact.support_work_lifecycle_events where work_id=$1 order by revision',[id]);}
 insertLifecycleEvent(event:SupportLifecycleEvent){return this.insert('support_work_lifecycle_events',event);}
 followUps(id:string){return this.many<SupportFollowUp>('select * from factact.support_work_follow_ups where work_id=$1 order by revision',[id]);}
 insertFollowUp(followUp:SupportFollowUp){return this.insert('support_work_follow_ups',followUp);}
 closeDecision(id:string){return this.one<SupportCloseDecision>('select * from factact.support_work_close_decisions where work_id=$1',[id]);}
 insertCloseDecision(decision:SupportCloseDecision){return this.insert('support_work_close_decisions',decision);}
 records(id:string){return this.many<import('../../../../../packages/domain/src/support.js').SupportRecord>('select * from factact.support_work_records where work_id=$1 order by revision',[id]);}
 insertRecord(record:import('../../../../../packages/domain/src/support.js').SupportRecord){return this.insert('support_work_records',record);}
 core:PgJoinRepository;
 constructor(private db:PoolClient,private tenant:string){this.core=new PgJoinRepository(db,tenant);}
 private async many<T>(sql:string,args:unknown[]=[]):Promise<T[]>{return (await this.db.query(sql,args)).rows.map(raw=>Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),v instanceof Date?v.toISOString():v])) as T);}
 private async one<T>(sql:string,args:unknown[]=[]):Promise<T|null>{return (await this.many<T>(sql,args))[0]??null;}
 private async insert(table:string,data:object){const entries=Object.entries(data);await this.db.query(`insert into factact.${table} (${entries.map(([k])=>k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())).join(',')}) values (${entries.map((_,i)=>'$'+(i+1)).join(',')})`,entries.map(([,v])=>v));}
 async lockRequest(id:string){await this.db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[this.tenant+':support:'+id]);}
 byRequest(id:string){return this.one<SupportEvent>('select * from factact.support_events where request_id=$1',[id]);}
 event(id:string,lock=false){return this.one<SupportEvent>(`select * from factact.support_events where id=$1 ${lock?'for update':''}`,[id]);}
 events(){return this.many<SupportEvent>('select * from factact.support_events order by created_at desc,id');}
 async insertEvent(e:SupportEvent,o:RecipientObservation){await this.insert('support_events',e);await this.insert('recipient_observations',o);}
 observation(id:string){return this.one<RecipientObservation>('select * from factact.recipient_observations where support_event_id=$1',[id]);}
 evaluation(id:string){return this.one<SupportEvaluation>('select * from factact.requirement_evaluations where support_event_id=$1',[id]);}
 insertEvaluation(e:SupportEvaluation){return this.insert('requirement_evaluations',{...e,evaluatedByType:'HUMAN'});}
 work(id:string,lock=false){return this.one<SupportWork>(`select * from factact.work where lane='SUPPORT' and id=$1 ${lock?'for update':''}`,[id]);}
 workForEvent(id:string){return this.one<SupportWork>("select * from factact.work where lane='SUPPORT' and support_event_id=$1",[id]);}
 insertWork(w:SupportWork){return this.insert('work',{...w,workType:'INCIDENT',lane:'SUPPORT'});}
 async progress(w:SupportWork){await this.db.query('update factact.work set status=$2,outcome=$3,next_action=$4,updated_at=$5,closed_at=$6,lifecycle_version=$7,waiting=$8,waiting_party=$9,waiting_reason=$10,next_action_open=$11,follow_up_at=$12,lifecycle_revision=$13 where id=$1',[w.id,w.status,w.outcome,w.nextAction,w.updatedAt,w.closedAt,w.lifecycleVersion,w.waiting,w.waitingParty,w.waitingReason,w.nextActionOpen,w.followUpAt,w.lifecycleRevision]);}
 decision(id:string){return this.one<SupportDecision>('select * from factact.support_decisions where work_id=$1',[id]);}
 evidence(id:string){return this.one<DiagnosticEvidence>("select * from factact.evidence where evidence_type='DIAGNOSTIC' and id=$1",[id]);}
 async insertResolution(e:DiagnosticEvidence,a:Action,d:SupportDecision){await this.insert('evidence',e);await this.insert('actions',{...a,actionType:'INVESTIGATE_GUIDE',status:'COMPLETED',inputJson:{decisionMode:d.mode,evidenceId:e.id}});await this.insert('support_decisions',d);}
 knowledge(id:string){return this.one<KnowledgeCandidate>('select * from factact.knowledge_candidates where source_work_id=$1',[id]);}
 candidates(serviceId:string){return this.many<KnowledgeCandidate>("select k.* from factact.knowledge_candidates k join factact.work w on w.id=k.source_work_id and w.tenant_id=k.tenant_id where w.service_id=$1 order by k.created_at desc,k.id",[serviceId]);}
 insertKnowledge(k:KnowledgeCandidate){return this.insert('knowledge_candidates',k);}
 audit(e:SupportAudit){return this.insert('audit_events',e);}
}
