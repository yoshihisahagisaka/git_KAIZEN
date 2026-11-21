/**
 * Explicit, actor-neutral access decision for a trusted, already-resolved target.
 *
 * This is a pure policy kernel. It does not authenticate a browser session,
 * resolve an inquiry Caller, determine Service Recipient ownership, or load
 * grants from persistence. Callers must resolve all of those server-side.
 * In particular, a Tenant is not synonymous with a customer Organization.
 *
 * The internal-only Read Authority v1 remains separate until the external
 * identity, membership and repository boundaries are implemented and reviewed.
 */

export type ScopedObjectKind = 'SUPPORT' | 'REGISTRY' | 'PROCEDURE' | 'KNOWLEDGE';
export type ScopedOperation = 'READ' | 'CREATE' | 'UPDATE' | 'REVIEW' | 'APPROVE';

export type ExplicitAccessScope =
  | { kind: 'SERVICE' }
  | { kind: 'SERVICE_RECIPIENT'; serviceRecipientId: string }
  | { kind: 'WORK'; serviceRecipientId: string; workId: string };

/** Source identifiers must come from persisted Service/Contract/Work relations. */
export interface ResolvedAccessTarget {
  tenantId: string;
  serviceId: string;
  contractProfileId: string;
  scope: ExplicitAccessScope;
  objectKind: ScopedObjectKind;
  operation: ScopedOperation;
}

/** Persisted grants must be independently checked for revocation and validity. */
export interface ExplicitAccessGrant {
  actorId: string;
  tenantId: string;
  serviceId: string;
  contractProfileId: string;
  scope: ExplicitAccessScope;
  objectKind: ScopedObjectKind;
  operations: readonly ScopedOperation[];
  status: 'ACTIVE' | 'REVOKED';
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface ScopedAccessRequest {
  /** Authenticated Actor principal ID, never the inquiry Caller or Person ID. */
  actorId: string;
  /** Verified using the effective Contract Profile at the request time. */
  contractIsEffective: boolean;
  target: ResolvedAccessTarget;
  grants: readonly ExplicitAccessGrant[];
  at: string;
}

function validIdentifier(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validScope(scope: ExplicitAccessScope): boolean {
  if (!scope || typeof scope !== 'object') return false;
  const keys = Object.keys(scope);
  if (scope.kind === 'SERVICE') return keys.length === 1;
  if (scope.kind === 'SERVICE_RECIPIENT') return keys.length === 2 && validIdentifier(scope.serviceRecipientId);
  if (scope.kind === 'WORK') return keys.length === 3 && validIdentifier(scope.serviceRecipientId) && validIdentifier(scope.workId);
  return false;
}

function contains(granted: ExplicitAccessScope, target: ExplicitAccessScope): boolean {
  if (granted.kind === 'SERVICE') return true;
  if (target.kind === 'SERVICE') return false;
  if (granted.serviceRecipientId !== target.serviceRecipientId) return false;
  if (granted.kind === 'SERVICE_RECIPIENT') return true;
  return target.kind === 'WORK' && granted.workId === target.workId;
}

function isEffective(grant: ExplicitAccessGrant, at: number): boolean {
  if (grant.status !== 'ACTIVE') return false;
  const from = Date.parse(grant.effectiveFrom);
  if (!Number.isFinite(from) || at < from) return false;
  if (grant.effectiveUntil === null) return true;
  const until = Date.parse(grant.effectiveUntil);
  return Number.isFinite(until) && from < until && at < until;
}

const allowedKinds: readonly ScopedObjectKind[] = ['SUPPORT', 'REGISTRY', 'PROCEDURE', 'KNOWLEDGE'];
const allowedOperations: readonly ScopedOperation[] = ['READ', 'CREATE', 'UPDATE', 'REVIEW', 'APPROVE'];

/** Default deny. No role, affiliation, ownership or Caller-based implicit allow. */
export function isExplicitlyAuthorized(request: ScopedAccessRequest): boolean {
  if (!request || typeof request !== 'object' || !request.target || !Array.isArray(request.grants)) return false;
  const { actorId, contractIsEffective, target, grants } = request;
  const at = Date.parse(request.at);
  if (contractIsEffective !== true || !Number.isFinite(at) || !validIdentifier(actorId)) return false;
  if (!validIdentifier(target.tenantId) || !validIdentifier(target.serviceId) ||
      !validIdentifier(target.contractProfileId) || !validScope(target.scope) ||
      !allowedKinds.includes(target.objectKind) || !allowedOperations.includes(target.operation)) return false;

  return grants.some(grant =>
    !!grant &&
    grant.actorId === actorId &&
    grant.tenantId === target.tenantId &&
    grant.serviceId === target.serviceId &&
    grant.contractProfileId === target.contractProfileId &&
    grant.objectKind === target.objectKind &&
    Array.isArray(grant.operations) && grant.operations.includes(target.operation) &&
    validScope(grant.scope) &&
    contains(grant.scope, target.scope) &&
    isEffective(grant, at)
  );
}
