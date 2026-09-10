import type { Work, Evaluation, Evidence, Audit } from './join.js';
export interface SupportEvent {id:string;tenantId:string;requestId:string;serviceId:string;contractProfileId:string;serviceRecipientId:string;createdByOperatorId:string;createdAt:string}
export interface SupportWork extends Omit<Work,'sourceEventId'|'outcome'> {supportEventId:string;outcome:'COMPLETED'|'NO_ACTION_REQUIRED'|null}
export interface SupportEvaluation extends Omit<Evaluation,'eventId'|'requirementCode'|'basisSnapshot'> {supportEventId:string;requirementCode:'SUPPORT_ASSISTANCE';basisSnapshot:{contractProfileId:string;contractProfileVersion:number;triageReason:string;decision:'REQUIRED'|'NOT_APPLICABLE'}}
export interface RecipientObservation {id:string;tenantId:string;supportEventId:string;contentText:string;sourceType:'CALLER';semanticType:'OBSERVATION';reliability:'UNVERIFIED';observedAt:string;recordedByOperatorId:string;reviewPolicy:'REVIEW_FOR_EACH_INQUIRY'}
export interface DiagnosticEvidence extends Omit<Evidence,'evidenceType'> {evidenceType:'DIAGNOSTIC'}
export interface SupportDecision {id:string;tenantId:string;workId:string;evidenceId:string;actionId:string;mode:'GUIDANCE_ONLY'|'NO_ACTION_REQUIRED';rationale:string;decidedByOperatorId:string;decidedAt:string}
export interface KnowledgeCandidate {id:string;tenantId:string;sourceWorkId:string;sourceDecisionId:string;sourceEvidenceId:string;title:string;contentText:string;status:'CANDIDATE';topic:'VPN_GUIDANCE';createdByOperatorId:string;createdAt:string}
export type SupportAudit=Omit<Audit,'aggregateType'>&{aggregateType:'SUPPORT_EVENT'};
