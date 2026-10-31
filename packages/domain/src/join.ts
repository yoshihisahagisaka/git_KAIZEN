import type { Operator } from './operator.js';
export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) { super(message); }
}
export function requireCondition(ok: unknown, code: string, message: string, status = 409): asserts ok {
  if (!ok) throw new DomainError(code, message, status);
}
export function found<T>(value: T | null): T { requireCondition(value, 'NOT_FOUND', '対象が見つかりません。', 404); return value; }
export type EvaluationResult = 'REQUIRED' | 'CONDITIONAL' | 'DECISION_REQUIRED' | 'ALREADY_SATISFIED' | 'NOT_APPLICABLE' | 'WAIVED' | 'CONDITION_NOT_MET';
export interface ContractConfiguration {
  support?: { enabled: boolean; executeRoles: Operator['roles'] } | undefined;
  requirements: { COMPANY_PC: { policy: 'REQUIRED' | 'NOT_APPLICABLE' | 'DECISION_REQUIRED'; basis: string } };
  deviceAssignment: { executeRoles: Operator['roles']; reviewRoles: Operator['roles']; allowSelfReview: boolean };
}
export interface Person { id: string; tenantId: string; organizationId: string; displayName: string }
export interface Service { id: string; tenantId: string; organizationId: string; name: string; status: string }
export interface Contract { id: string; tenantId: string; serviceId: string; version: number; effectiveFrom: string; effectiveTo: string | null; status: string; configurationJson: ContractConfiguration }
export interface JoinEvent { id: string; tenantId: string; serviceId: string; contractProfileId: string; serviceRecipientId: string; joinDate: string; status: 'CREATED' | 'EVALUATED'; createdByOperatorId: string; createdAt: string }
export interface Evaluation { id: string; tenantId: string; eventId: string; requirementCode: 'COMPANY_PC'; result: EvaluationResult; evaluationVersion: number; catalogVersion: string; basisSummary: string; basisSnapshot: { contractProfileId: string; contractProfileVersion: number; rule: ContractConfiguration['requirements']['COMPANY_PC']; relationId: string | null; primaryDeviceState: 'UNKNOWN' | 'VERIFIED' }; evaluatedByOperatorId: string; evaluatedAt: string }
export interface Work { id: string; tenantId: string; serviceId: string; contractProfileId: string; serviceRecipientId: string; sourceEventId: string; sourceRequirementEvaluationId: string; title: string; status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'; outcome: 'COMPLETED' | null; workOwnerOperatorId: string; nextAction: string; nextActionOwnerOperatorId: string; createdAt: string; updatedAt: string; closedAt: string | null }
export interface Device { id: string; tenantId: string; assetTag: string; displayName: string; deviceStatus: string }
export interface Effect { personId: string; deviceId: string; previousRelationId: string | null; previousState: 'UNKNOWN' | 'VERIFIED'; effectiveFrom: string }
export interface Action { id: string; tenantId: string; workId: string; actorOperatorId: string; resultSummary: string; startedAt: string; completedAt: string }
export interface Change { id: string; tenantId: string; workId: string; actionId: string; subjectId: string; status: 'PROPOSED' | 'VERIFIED' | 'COMMITTED' | 'REJECTED'; proposedEffectJson: Effect; verificationSummary: string | null; verifiedByOperatorId: string | null; verifiedAt: string | null; committedAt: string | null; createdAt: string }
export interface Relation { id: string; tenantId: string; fromEntityId: string; toEntityId: string; status: 'ACTIVE' | 'ENDED'; effectiveFrom: string; effectiveTo: string | null; sourceChangeId: string; reliability: 'VERIFIED'; verifiedAt: string; createdAt: string }
export interface Evidence { id: string; tenantId: string; evidenceType: 'EXECUTION_ATTESTATION' | 'VERIFICATION'; title: string; contentText: string; createdByOperatorId: string; createdAt: string }
export interface Audit { id: string; tenantId: string; aggregateType: 'JOIN_EVENT'; aggregateId: string; eventType: string; actorOperatorId: string; occurredAt: string; metadataJson: Record<string, unknown>; sequence?: number }

export function evaluatePc(rule: ContractConfiguration['requirements']['COMPANY_PC'], current: Relation | null): { result: EvaluationResult; basis: string } {
  if (rule.policy !== 'REQUIRED') return { result: rule.policy, basis: rule.basis };
  if (current) return { result: 'ALREADY_SATISFIED', basis: `${rule.basis}。検証済みの利用PCが登録されています。` };
  return { result: 'REQUIRED', basis: `${rule.basis}。現在の利用PCは未確認のため、準備・割当を確認します。` };
}
export function assertRole(actor: Operator, roles: Operator['roles']) {
  requireCondition(actor.roles.some(r => roles.includes(r)), 'FORBIDDEN', 'この操作の権限がありません。', 403);
}
export function assertExpectedRelation(effect: Effect, current: Relation | null) {
  requireCondition(effect.previousRelationId === (current?.id ?? null), 'STALE_CHANGE', '利用PCの状態が変わりました。変更を提案し直してください。');
  requireCondition(!current || effect.effectiveFrom >= current.effectiveFrom, 'INVALID_EFFECTIVE_TIME', '変更日時が現在の関係の開始日時より前です。');
}
