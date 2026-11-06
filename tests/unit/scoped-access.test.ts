import { describe, expect, it } from 'vitest';
import { isExplicitlyAuthorized, type ExplicitAccessGrant, type ScopedAccessRequest } from '../../packages/domain/src/scoped-access.js';

const at = '2026-11-06T12:00:00.000Z';
const recipientA = { kind: 'SERVICE_RECIPIENT', serviceRecipientId: 'recipient-A' } as const;
const recipientB = { kind: 'SERVICE_RECIPIENT', serviceRecipientId: 'recipient-B' } as const;
const workA = { kind: 'WORK', serviceRecipientId: 'recipient-A', workId: 'work-A' } as const;
const workB = { kind: 'WORK', serviceRecipientId: 'recipient-A', workId: 'work-B' } as const;

const grant: ExplicitAccessGrant = {
  actorId: 'actor-A', tenantId: 'tenant-1', serviceId: 'service-1',
  contractProfileId: 'contract-1', scope: recipientA,
  objectKind: 'SUPPORT', operations: ['READ', 'UPDATE'],
  status: 'ACTIVE', effectiveFrom: '2026-11-01T00:00:00.000Z', effectiveUntil: null,
};
const request: ScopedAccessRequest = {
  actorId: 'actor-A', contractIsEffective: true,
  target: { tenantId: 'tenant-1', serviceId: 'service-1', contractProfileId: 'contract-1', scope: recipientA, objectKind: 'SUPPORT', operation: 'READ' },
  grants: [grant], at,
};
const check = (override: Partial<ScopedAccessRequest> = {}) => isExplicitlyAuthorized({ ...request, ...override });
const target = (override: Partial<ScopedAccessRequest['target']>) => check({ target: { ...request.target, ...override } });

describe('explicit actor-neutral access: fail closed', () => {
  it('requires an effective, affirmative grant; no default role or ownership allow', () => {
    expect(check({ grants: [] })).toBe(false);
    expect(check()).toBe(true);
  });

  it('does not infer actor authority from the Caller or their affiliation', () => {
    expect(check({ actorId: 'caller-person-ID' })).toBe(false);
    expect(check({ actorId: 'vendor-affiliation-ID' })).toBe(false);
  });

  it('does not allow another tenant, service or contract', () => {
    expect(target({ tenantId: 'tenant-2' })).toBe(false);
    expect(target({ serviceId: 'service-2' })).toBe(false);
    expect(target({ contractProfileId: 'contract-2' })).toBe(false);
  });

  it('does not allow another customer within the same Tenant and Service', () => {
    expect(target({ scope: recipientB })).toBe(false);
    expect(target({ scope: recipientA })).toBe(true);
  });

  it('can read a recipient Work, but never another recipient Work', () => {
    expect(target({ scope: workA })).toBe(true);
    expect(target({ scope: { ...workA, serviceRecipientId: 'recipient-B' } })).toBe(false);
  });

  it('Work-only delegation cannot read another Work or the wider recipient history', () => {
    const restricted = { ...grant, scope: workA } as const;
    expect(check({ grants: [restricted], target: { ...request.target, scope: workA } })).toBe(true);
    expect(check({ grants: [restricted], target: { ...request.target, scope: workB } })).toBe(false);
    expect(check({ grants: [restricted], target: { ...request.target, scope: recipientA } })).toBe(false);
  });

  it('service-wide access is possible only by an explicit Service grant', () => {
    const serviceGrant = { ...grant, scope: { kind: 'SERVICE' } as const };
    expect(check({ grants: [serviceGrant], target: { ...request.target, scope: recipientB } })).toBe(true);
    expect(target({ scope: { kind: 'SERVICE' } })).toBe(false);
    expect(check({ grants: [serviceGrant], target: { ...request.target, serviceId: 'service-2' } })).toBe(false);
  });

  it('Read grants are not automatic Update or Approval grants', () => {
    expect(target({ operation: 'APPROVE' })).toBe(false);
    expect(target({ operation: 'CREATE' })).toBe(false);
    expect(target({ operation: 'UPDATE' })).toBe(true);
  });

  it('does not reuse SUPPORT grants for Registry, Procedure or Knowledge', () => {
    expect(target({ objectKind: 'REGISTRY' })).toBe(false);
    expect(target({ objectKind: 'PROCEDURE' })).toBe(false);
    expect(target({ objectKind: 'KNOWLEDGE' })).toBe(false);
  });

  it('rejects missing, inactive and future contracts/grants', () => {
    expect(check({ contractIsEffective: false })).toBe(false);
    expect(check({ grants: [{ ...grant, status: 'REVOKED' }] })).toBe(false);
    expect(check({ grants: [{ ...grant, effectiveFrom: '2026-11-07T00:00:00.000Z' }] })).toBe(false);
  });

  it('expires grants immediately at the exclusive effectiveUntil boundary', () => {
    expect(check({ grants: [{ ...grant, effectiveUntil: at }] })).toBe(false);
    expect(check({ grants: [{ ...grant, effectiveUntil: '2026-11-07T00:00:00.000Z' }] })).toBe(true);
    expect(check({ grants: [{ ...grant, effectiveUntil: '2026-10-30T00:00:00.000Z' }] })).toBe(false);
  });

  it('rejects malformed or incomplete grant/target/time scope rather than broadening', () => {
    expect(check({ at: 'invalid' })).toBe(false);
    expect(check({ actorId: '' })).toBe(false);
    expect(target({ serviceId: '' })).toBe(false);
    expect(target({ scope: { kind: 'SERVICE_RECIPIENT', serviceRecipientId: '' } })).toBe(false);
    expect(check({ grants: [{ ...grant, scope: { kind: 'WORK', workId: '', serviceRecipientId: 'recipient-A' } }] })).toBe(false);
    expect(check({ grants: [{ ...grant, effectiveFrom: 'not-a-date' }] })).toBe(false);
    expect(check({ grants: [{ ...grant, effectiveUntil: 'not-a-date' }] })).toBe(false);
    expect(check({ grants: [{ ...grant, operations: undefined as never }] })).toBe(false);
    expect(check({ grants: [{ ...grant, scope: { kind: 'SERVICE', serviceRecipientId: 'recipient-A' } as never }] })).toBe(false);
    expect(check({ grants: [null as never] })).toBe(false);
    expect(check({ grants: undefined as never })).toBe(false);
    expect(check({ target: null as never })).toBe(false);
    expect(check({ contractIsEffective: 'true' as never })).toBe(false);
  });

  it('requires a correctly scoped grant even when some grants in the set are valid elsewhere', () => {
    expect(check({ grants: [
      { ...grant, actorId: 'different-actor' },
      { ...grant, serviceId: 'different-service' },
      { ...grant, scope: recipientB },
    ] })).toBe(false);
  });
});
