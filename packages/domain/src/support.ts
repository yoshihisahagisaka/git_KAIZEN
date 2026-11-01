import type { Work, Evaluation, Evidence, Audit } from './join.js';
export interface SupportEvent {id:string;tenantId:string;requestId:string;serviceId:string;contractProfileId:string;serviceRecipientId:string;createdByOperatorId:string;createdAt:string}
export interface SupportWork extends Omit<Work,'sourceEventId'|'outcome'> {supportEventId:string;outcome:'COMPLETED'|'NO_ACTION_REQUIRED'|null;lifecycleVersion:number;waiting:boolean;waitingParty:string|null;waitingReason:string|null;nextActionOpen:boolean;followUpAt:string|null;lifecycleRevision:number}
export interface SupportEvaluation extends Omit<Evaluation,'eventId'|'requirementCode'|'basisSnapshot'> {supportEventId:string;requirementCode:'SUPPORT_ASSISTANCE';basisSnapshot:{contractProfileId:string;contractProfileVersion:number;triageReason:string;decision:'REQUIRED'|'NOT_APPLICABLE'}}
export interface RecipientObservation {id:string;tenantId:string;supportEventId:string;contentText:string;sourceType:'CALLER';semanticType:'OBSERVATION';reliability:'UNVERIFIED';observedAt:string;recordedByOperatorId:string;reviewPolicy:'REVIEW_FOR_EACH_INQUIRY'}
export interface DiagnosticEvidence extends Omit<Evidence,'evidenceType'> {evidenceType:'DIAGNOSTIC'}
export interface SupportDecision {id:string;tenantId:string;workId:string;evidenceId:string;actionId:string;mode:'GUIDANCE_ONLY'|'NO_ACTION_REQUIRED';rationale:string;decidedByOperatorId:string;decidedAt:string}
export interface KnowledgeCandidate {id:string;tenantId:string;sourceWorkId:string;sourceDecisionId:string;sourceEvidenceId:string;title:string;contentText:string;status:'CANDIDATE';topic:'VPN_GUIDANCE';createdByOperatorId:string;createdAt:string}
export type SupportAudit=Omit<Audit,'aggregateType'>&{aggregateType:'SUPPORT_EVENT'};

// A bounded procedure record, never an Operational Fact or an editable Registry.
export interface SupportNotes {
 checks:string;
 action:'RESTART_GUIDANCE'|'CONNECTION_GUIDANCE'|'OTHER_GUIDANCE'|'NO_ACTION_REQUIRED';
 actionDetails:string;
 result:'CONNECTED'|'NOT_CONNECTED'|'UNCONFIRMED';
 resultSource:'CALLER'|'OPERATOR'|'UNKNOWN';
 resultDetails:string;
 exceptionReason:string;
}
export interface SupportRecord {
 id:string;tenantId:string;workId:string;requestId:string;revision:number;
 kind:'DRAFT'|'COMPLETION'|'CORRECTION'|'CONTINUATION';notes:SupportNotes;correctionReason:string;
 recordedByOperatorId:string;recordedAt:string;
}
// Deliberate Work Context, not a Registry fact and not diagnostic evidence of a cause.
export interface SupportDeviceContext {
 id:string;tenantId:string;workId:string;requestId:string;revision:number;
 kind:'CONFIRMED'|'CORRECTED'|'UNIDENTIFIED'|'ENDED';deviceId:string|null;
 confirmationSource:'OPERATOR'|'CALLER'|'OTHER';evidenceId:string|null;reason:string;
 supersedesContextId:string|null;recordedByOperatorId:string;recordedAt:string;
}
// Work-scoped observations retain what is known about a target without promoting it to Registry fact.
export interface SupportTargetObservation {
 id:string;tenantId:string;workId:string;targetContextId:string;requestId:string;revision:number;
 kind:'IDENTIFICATION'|'OWNERSHIP'|'MANAGEMENT_STATE';
 value:'UNIDENTIFIED'|'PARTIALLY_IDENTIFIED'|'PERSONALLY_OWNED'|'COMPANY_OWNED'|'MANAGED'|'UNMANAGED'|'UNKNOWN';
 detail:string;sourceType:'OPERATOR'|'CALLER'|'OTHER';evidenceId:string|null;
 supersedesObservationId:string|null;recordedByOperatorId:string;recordedAt:string;
}
export interface SupportEligibility {state:'UNKNOWN';reason:'NO_APPLICABLE_RULE';ruleSource:null}
export interface SupportLifecycleEvent {id:string;tenantId:string;workId:string;requestId:string;revision:number;kind:'CONTINUATION_RECORDED'|'WAITING_SET'|'RESUMED'|'NEXT_ACTION_CLEARED';nextAction:string;waitingParty:string;waitingReason:string;recordedByOperatorId:string;recordedAt:string}
export interface SupportFollowUp {id:string;tenantId:string;workId:string;requestId:string;revision:number;kind:'SET'|'CLEARED';followUpAt:string|null;sourceType:'HUMAN_DECISION'|'CONTRACT'|'RULE'|'CUSTOMER_COMMITMENT'|'OTHER';basisText:string;reason:string;supersedesFollowUpId:string|null;recordedByOperatorId:string;recordedAt:string}
export interface SupportCloseDecision {id:string;tenantId:string;workId:string;requestId:string;outcome:'RESOLVED'|'NOT_ELIGIBLE'|'WITHDRAWN'|'FORMALLY_TRANSFERRED'|'OTHER_RESPONSIBILITY_ENDED';closeReason:string;provenanceType:'HUMAN_DECISION'|'EVIDENCE'|'RULE'|'FORMAL_TRANSFER'|'OTHER';provenanceReference:string;evidenceId:string|null;guardSnapshot:Record<string,unknown>;decidedByOperatorId:string;decidedAt:string}
export const supportActionLabels:Record<SupportNotes['action'],string>={RESTART_GUIDANCE:'PC再起動を案内',CONNECTION_GUIDANCE:'接続手順を案内',OTHER_GUIDANCE:'その他の確認・案内',NO_ACTION_REQUIRED:'確認の結果、追加対応なし'};
export const supportResultLabels:Record<SupportNotes['result'],string>={CONNECTED:'接続できた',NOT_CONNECTED:'接続できなかった',UNCONFIRMED:'結果は未確認'};
