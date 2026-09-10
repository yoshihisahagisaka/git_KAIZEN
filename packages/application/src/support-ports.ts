import type { JoinRepository, JoinRuntime } from './join-ports.js';
import type { Action } from '../../domain/src/join.js';
import type { SupportEvent,SupportWork,SupportEvaluation,RecipientObservation,DiagnosticEvidence,SupportDecision,KnowledgeCandidate,SupportAudit } from '../../domain/src/support.js';
export interface SupportRepository {
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
