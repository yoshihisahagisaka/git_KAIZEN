/**
 * The first bounded Registry correction contract. This does not implement an
 * authorization command or make an Actor's statement an authoritative Fact.
 * Application commands must resolve target/scope/Grants from persistent state.
 */

export const FIRST_REGISTRY_CHANGE_KIND = 'PERSON_DISPLAY_NAME_CORRECTION' as const;
export const FIRST_REGISTRY_REVIEW_POLICY = 'PERSON_DISPLAY_NAME_DUAL_CONTROL_V1' as const;

export type RegistryEditTransition = 'PROPOSE' | 'VERIFY' | 'COMMIT';
export type RegistryEditOperation = 'UPDATE' | 'REVIEW' | 'APPROVE';

/** This is a required Grant operation, never a role or a policy-template label. */
export const registryTransitionOperation: Readonly<Record<RegistryEditTransition, RegistryEditOperation>> = {
  PROPOSE: 'UPDATE',
  VERIFY: 'REVIEW',
  COMMIT: 'APPROVE',
};

/** The source is an actual human request, not a fabricated Work/Action. */
export interface PersonDisplayNameEditRequest {
  requestId: string;
  requestKey: string;
  tenantId: string;
  actorOperatorId: string;
  serviceId: string;
  contractProfileId: string;
  serviceRecipientId: string;
  targetPersonId: string;
  sourceWorkId: string | null;
  originalDisplayName: string;
  proposedDisplayName: string;
  expectedRegistryRevision: number;
  reason: string;
  sourceInformationState: 'UNVERIFIED_STATEMENT';
  reviewPolicyCode: typeof FIRST_REGISTRY_REVIEW_POLICY;
}

/**
 * The first slice always separates the submitting Actor from the reviewer and
 * committer. This guard is necessary but never sufficient for authorization.
 */
export function isDistinctRegistryReviewer(proposerId: string, reviewerId: string): boolean {
  return typeof proposerId === 'string' && proposerId.length > 0 &&
    typeof reviewerId === 'string' && reviewerId.length > 0 && proposerId !== reviewerId;
}

/** Validation of the narrow first effect, before any persistence. */
export function validDisplayNameCorrection(input: Pick<PersonDisplayNameEditRequest,
  'originalDisplayName' | 'proposedDisplayName' | 'expectedRegistryRevision' | 'reason'>): boolean {
  if (!input || typeof input !== 'object') return false;
  const validName = (name: unknown) =>
    typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 200;
  return validName(input.originalDisplayName) && validName(input.proposedDisplayName) &&
    input.originalDisplayName !== input.proposedDisplayName &&
    Number.isSafeInteger(input.expectedRegistryRevision) && input.expectedRegistryRevision >= 0 &&
    typeof input.reason === 'string' && input.reason.trim().length >= 1 && input.reason.trim().length <= 1000;
}
