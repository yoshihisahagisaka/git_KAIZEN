import type { JoinRepository, JoinRuntime } from './join-ports.js';
import type { Action } from '../../domain/src/join.js';
import type { SupportEvent,SupportWork,SupportEvaluation,RecipientObservation,DiagnosticEvidence,SupportDecision,KnowledgeCandidate,SupportAudit,SupportTargetObservation,SupportLifecycleEvent,SupportFollowUp,SupportCloseDecision } from '../../domain/src/support.js';
export interface SupportRepository {
 deviceContexts(workId:string):Promise<import('../../domain/src/support.js').SupportDeviceContext[]>;
 insertDeviceContext(context:import('../../domain/src/support.js').SupportDeviceContext):Promise<void>;
 targetObservations(workId:string):Promise<SupportTargetObservation[]>;
 insertTargetObservation(observation:SupportTargetObservation):Promise<void>;
 lifecycleEvents(workId:string):Promise<SupportLifecycleEvent[]>;
 insertLifecycleEvent(event:SupportLifecycleEvent):Promise<void>;
 followUps(workId:string):Promise<SupportFollowUp[]>;
 insertFollowUp(followUp:SupportFollowUp):Promise<void>;
 closeDecision(workId:string):Promise<SupportCloseDecision|null>;
 insertCloseDecision(decision:SupportCloseDecision):Promise<void>;
 records(workId:string):Promise<import('../../domain/src/support.js').SupportRecord[]>;
 insertRecord(record:import('../../domain/src/support.js').SupportRecord):Promise<void>;
 core:JoinRepository;
 lockRequest(id:string):Promise<void>;
 byRequest(id:string):Promise<SupportEvent|null>;
 event(id:string,lock?:boolean):Promise<SupportEvent|null>;
 events():Promise<SupportEvent[]>;
 insertEvent(e:SupportEvent,o:RecipientObservation):Promise<void>;
 observation(eventId:string):Promise<RecipientObservation|null>;
 evaluation(eventId:string):Promise<SupportEvaluation|null>;
 insertEvaluation(e:SupportEvaluation):Promise<void>;
 work(id:string,lock?:boolean):Promise<SupportWork|null>;
 workForEvent(id:string):Promise<SupportWork|null>;
 insertWork(w:SupportWork):Promise<void>;
 progress(w:SupportWork):Promise<void>;
 decision(workId:string):Promise<SupportDecision|null>;
 evidence(id:string):Promise<DiagnosticEvidence|null>;
 insertResolution(e:DiagnosticEvidence,a:Action,d:SupportDecision):Promise<void>;
 knowledge(workId:string):Promise<KnowledgeCandidate|null>;
 candidates(serviceId:string):Promise<KnowledgeCandidate[]>;
 insertKnowledge(k:KnowledgeCandidate):Promise<void>;
 audit(e:SupportAudit):Promise<void>;
}
export interface SupportUnitOfWork {run<T>(tenantId:string,fn:(r:SupportRepository)=>Promise<T>,readOnly?:boolean):Promise<T>}
export type SupportRuntime=JoinRuntime;
