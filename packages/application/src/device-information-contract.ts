import { DomainError, requireCondition } from '../../domain/src/join.js';
import type {
  DeviceAuthorizedContext, DeviceFieldInput, DeviceInformationChange, DeviceInformationField,
  DeviceInformationSource, DeviceOperationalStatus, DeviceRegistryOperation, DeviceScopedGrant,
  RegisteredDeviceInformation,
} from '../../domain/src/device-information.js';

// Pure Product policy/transition kernel. It does not issue grants, write a DB,
// create a fictitious Work, or expose an HTTP mutation endpoint. The eventual
// adapter must lock/re-read current Grants, target and revision transactionally.

function nonblank(value: string, code: string, maximum = 200) {
  requireCondition(typeof value === 'string' && value.trim().length > 0 && value.length <= maximum,
    code, 'Device情報または根拠を確認してください。', 400);
  return value.trim();
}

function assertIso(when: string) {
  requireCondition(typeof when === 'string' && !Number.isNaN(Date.parse(when)) &&
    new Date(when).toISOString() === when, 'INVALID_SOURCE_TIME', '確認日時を確認してください。', 400);
}

function checkSource(source: DeviceInformationSource, customerRegisterOnly = false) {
  requireCondition(Boolean(source) && ['CUSTOMER_REGISTER','SUPPORT_WORK','PHYSICAL_INVENTORY','TRUSTED_SYSTEM'].includes(source.kind),
    'INVALID_SOURCE', '情報の出所が不明です。', 400);
  if (customerRegisterOnly) requireCondition(source.kind === 'CUSTOMER_REGISTER',
    'INVALID_SOURCE', '初期資料の出所を確認してください。', 400);
  nonblank(source.evidenceId, 'EVIDENCE_REQUIRED');
  nonblank(source.locator, 'SOURCE_LOCATOR_REQUIRED', 400);
  assertIso(source.observedAt);
  if (source.kind === 'SUPPORT_WORK') nonblank(source.workId ?? '', 'WORK_EVIDENCE_REQUIRED');
}

function assertTarget(context: DeviceAuthorizedContext, targetTenantId: string, targetOrganizationId: string) {
  requireCondition(context.tenantId === targetTenantId && context.organizationId === targetOrganizationId,
    'DEVICE_SCOPE_DENIED', 'この対象を操作する権限がありません。', 403);
  requireCondition(context.actorActive && context.serviceActive && context.contractActive && context.recipientActive,
    'DEVICE_SCOPE_DENIED', 'この対象を操作する権限がありません。', 403);
}

export function requireDeviceRegistryGrant(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[],
  operation: DeviceRegistryOperation, at: string, tenantId: string, organizationId: string,
): void {
  assertTarget(context, tenantId, organizationId);
  assertIso(at);
  // A SERVICE grant is deliberately insufficient for a multi-customer service.
  // The caller must resolve the exact customer recipient from the live DB.
  const allowed = grants.some(g => g.objectKind === 'REGISTRY' && g.actorId === context.actorId &&
    g.tenantId === context.tenantId && g.serviceId === context.serviceId &&
    g.contractProfileId === context.contractProfileId && g.serviceRecipientId === context.serviceRecipientId &&
    g.status === 'ACTIVE' && g.effectiveFrom <= at && (g.effectiveUntil === null || at < g.effectiveUntil) &&
    g.operations.includes(operation) &&
    (g.scopeKind === 'SERVICE_RECIPIENT' && g.workId === null ||
      g.scopeKind === 'WORK' && Boolean(context.workId) && g.workId === context.workId));
  requireCondition(allowed, 'DEVICE_SCOPE_DENIED', 'この対象を操作する権限がありません。', 403);
}

export function deviceAssetKey(tenantId: string, organizationId: string, assetTag: string) {
  // Preserve case and Unicode: aggressive normalization could silently merge
  // two real assets. Database uniqueness must use the same conservative rule.
  return [nonblank(tenantId, 'INVALID_SCOPE'), nonblank(organizationId, 'INVALID_SCOPE'),
    nonblank(assetTag, 'ASSET_TAG_REQUIRED')];
}

export type DeviceRowDisposition = 'NEW' | 'UPDATE' | 'UNCHANGED' | 'REVIEW';

export function classifyDeviceRow(input: {
  tenantId: string; organizationId: string; assetTag: string; displayName: string; serialNumber?: string;
}, existing: readonly RegisteredDeviceInformation[], batchAssetTags: readonly string[] = []): DeviceRowDisposition {
  if (!input.assetTag?.trim() || !input.displayName?.trim()) return 'REVIEW';
  const tag = input.assetTag.trim();
  if (batchAssetTags.filter(t => t.trim() === tag).length > 1) return 'REVIEW';
  const inCustomer = existing.filter(d => d.tenantId === input.tenantId && d.organizationId === input.organizationId);
  const matches = inCustomer.filter(d => d.fields.assetTag.value === tag);
  if (matches.length > 1) return 'REVIEW';
  if (input.serialNumber?.trim() && inCustomer.some(d => d.id !== matches[0]?.id &&
    d.fields.serialNumber?.value === input.serialNumber?.trim())) return 'REVIEW';
  if (!matches.length) return 'NEW';
  const current = matches[0]!;
  return current.fields.displayName.value === input.displayName.trim() &&
    (current.fields.serialNumber?.value ?? '') === (input.serialNumber?.trim() ?? '') ? 'UNCHANGED' : 'UPDATE';
}

function initialField(value: string, source: DeviceInformationSource): DeviceFieldInput {
  return { value: nonblank(value, 'DEVICE_FIELD_REQUIRED'), source };
}

type ProposalIdentity = { id: string; requestId: string; deviceId: string };
function proposalBase(
  ids: ProposalIdentity, context: DeviceAuthorizedContext, kind: DeviceInformationChange['kind'],
  expectedRevision: number, at: string,
) {
  nonblank(ids.id, 'INVALID_CHANGE_ID'); nonblank(ids.requestId, 'INVALID_REQUEST_ID');
  nonblank(ids.deviceId, 'INVALID_DEVICE_ID'); assertIso(at);
  return { ...ids, kind, tenantId: context.tenantId, organizationId: context.organizationId,
    serviceId: context.serviceId, contractProfileId: context.contractProfileId,
    serviceRecipientId: context.serviceRecipientId, workId: context.workId ?? null,
    expectedRevision, status: 'PROPOSED' as const, proposedByActorId: context.actorId, proposedAt: at,
    verifiedByActorId: null, verifiedAt: null, committedByActorId: null, committedAt: null };
}

export function proposeDeviceInitialInformation(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[], at: string,
  ids: ProposalIdentity, input: { assetTag: string; displayName: string; serialNumber?: string; source: DeviceInformationSource },
): DeviceInformationChange {
  requireDeviceRegistryGrant(context, grants, 'CREATE', at, context.tenantId, context.organizationId);
  checkSource(input.source, true);
  const effect = { assetTag: initialField(input.assetTag, input.source),
    displayName: initialField(input.displayName, input.source),
    ...(input.serialNumber?.trim() ? {serialNumber: initialField(input.serialNumber, input.source)} : {}) };
  return { ...proposalBase(ids, context, 'INITIAL_INFORMATION', 0, at), kind: 'INITIAL_INFORMATION', effect };
}

export function proposeDeviceInformationCorrection(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[], at: string,
  ids: ProposalIdentity, current: RegisteredDeviceInformation,
  corrections: Partial<Record<Exclude<DeviceInformationField, 'assetTag'>, DeviceFieldInput>>,
): DeviceInformationChange {
  requireDeviceRegistryGrant(context, grants, 'UPDATE', at, current.tenantId, current.organizationId);
  requireCondition(ids.deviceId === current.id, 'DEVICE_SCOPE_DENIED', '対象のDeviceが一致しません。', 403);
  const changes: Partial<Record<DeviceInformationField, DeviceFieldInput>> = {};
  for (const field of ['displayName', 'serialNumber'] as const) {
    const proposed = corrections[field];
    if (!proposed) continue;
    checkSource(proposed.source);
    const nextValue = nonblank(proposed.value, 'DEVICE_FIELD_REQUIRED');
    if (current.fields[field]?.value !== nextValue) changes[field] = { value: nextValue, source: proposed.source };
  }
  requireCondition(Object.keys(changes).length > 0, 'NO_CHANGE', '修正対象がありません。', 400);
  // Asset-tag/Organization identity migration is a separate, collision-reviewed gate.
  return { ...proposalBase(ids, context, 'INFORMATION_CORRECTION', current.revision, at),
    kind: 'INFORMATION_CORRECTION', effect: {changes} };
}

export function proposeDeviceFieldVerification(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[], at: string,
  ids: ProposalIdentity, current: RegisteredDeviceInformation,
  field: DeviceInformationField | 'deviceStatus', observedValue: string,
  source: DeviceInformationSource,
): DeviceInformationChange {
  requireDeviceRegistryGrant(context, grants, 'UPDATE', at, current.tenantId, current.organizationId);
  requireCondition(ids.deviceId === current.id, 'DEVICE_SCOPE_DENIED', '対象のDeviceが一致しません。', 403);
  checkSource(source);
  requireCondition(source.kind !== 'CUSTOMER_REGISTER', 'REALITY_EVIDENCE_REQUIRED',
    '資料の記載だけでは現況を検証できません。', 400);
  if (source.kind === 'SUPPORT_WORK') requireCondition(source.workId === context.workId,
    'WORK_SCOPE_MISMATCH', '別のWorkの根拠は使用できません。', 403);
  const value = nonblank(observedValue, 'DEVICE_FIELD_REQUIRED');
  if (field === 'deviceStatus') {
    requireCondition(['AVAILABLE', 'UNAVAILABLE', 'RETIRED'].includes(value),
      'INVALID_DEVICE_STATUS', '業務状態を実査してください。', 400);
  } else {
    requireCondition(['assetTag','displayName','serialNumber'].includes(field),
      'INVALID_DEVICE_FIELD', '検証対象項目が不明です。', 400);
    requireCondition(current.fields[field]?.value === value, 'FIELD_VALUE_MISMATCH',
      '現況と登録値が異なります。訂正を申請してください。');
  }
  return { ...proposalBase(ids, context, 'FIELD_VERIFICATION', current.revision, at),
    kind: 'FIELD_VERIFICATION', effect: { field, observedValue: value, verificationSource: source } };
}

function requireProposalScope(context: DeviceAuthorizedContext, proposal: DeviceInformationChange) {
  assertTarget(context, proposal.tenantId, proposal.organizationId);
  requireCondition(context.serviceId === proposal.serviceId && context.contractProfileId === proposal.contractProfileId &&
    context.serviceRecipientId === proposal.serviceRecipientId && (context.workId ?? null) === proposal.workId,
    'DEVICE_SCOPE_DENIED', 'この対象を操作する権限がありません。', 403);
}

export function verifyDeviceInformationChange(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[], at: string,
  change: DeviceInformationChange,
): DeviceInformationChange {
  requireProposalScope(context, change);
  requireDeviceRegistryGrant(context, grants, 'REVIEW', at, change.tenantId, change.organizationId);
  requireCondition(change.proposedByActorId !== context.actorId, 'SELF_REVIEW_FORBIDDEN',
    '申請者と異なる確認担当者が必要です。', 403);
  requireCondition(change.status === 'PROPOSED', 'CHANGE_NOT_PROPOSED', '申請中の変更だけ検証できます。');
  return { ...change, status: 'VERIFIED', verifiedByActorId: context.actorId, verifiedAt: at };
}

export function commitDeviceInformationChange(
  context: DeviceAuthorizedContext, grants: readonly DeviceScopedGrant[], at: string,
  change: DeviceInformationChange, current: RegisteredDeviceInformation | null,
): { change: DeviceInformationChange; device: RegisteredDeviceInformation } {
  requireProposalScope(context, change);
  requireDeviceRegistryGrant(context, grants, 'APPROVE', at, change.tenantId, change.organizationId);
  requireCondition(change.proposedByActorId !== context.actorId, 'SELF_REVIEW_FORBIDDEN',
    '申請者と異なる確定担当者が必要です。', 403);
  requireCondition(change.status === 'VERIFIED' && Boolean(change.verifiedByActorId) &&
    Boolean(change.verifiedAt) && change.verifiedByActorId !== change.proposedByActorId,
    'CHANGE_NOT_VERIFIED', '確認済みの変更だけ確定できます。');
  requireCondition(change.kind === 'INITIAL_INFORMATION' ? current === null : current?.id === change.deviceId,
    'DEVICE_STATE_CONFLICT', '対象の登録状態が変わりました。');
  requireCondition((current?.revision ?? 0) === change.expectedRevision,
    'STALE_DEVICE_REVISION', '登録情報が更新されています。');
  if (current) assertTarget(context, current.tenantId, current.organizationId);
  const commit = { ...change, status: 'COMMITTED' as const, committedByActorId: context.actorId, committedAt: at };
  if (change.kind === 'INITIAL_INFORMATION') {
    const {assetTag,displayName,serialNumber} = change.effect;
    for (const field of [assetTag, displayName, serialNumber].filter((f): f is DeviceFieldInput => Boolean(f))) {
      nonblank(field.value, 'DEVICE_FIELD_REQUIRED');
      checkSource(field.source, true);
    }
    const sourceBacked = (field: DeviceFieldInput) => ({...field, verification: null});
    const device: RegisteredDeviceInformation = {
      id: change.deviceId, tenantId: change.tenantId, organizationId: change.organizationId, revision: 1,
      fields: {assetTag: sourceBacked(assetTag), displayName: sourceBacked(displayName),
        ...(serialNumber ? { serialNumber: sourceBacked(serialNumber) } : {})},
      operationalStatus: {value: 'UNKNOWN', verification: null},
    };
    return {change: commit, device};
  }
  if (!current) throw new DomainError('DEVICE_STATE_CONFLICT', '対象の登録状態が変わりました。');
  const fields = {...current.fields};
  const device: RegisteredDeviceInformation = {...current, fields, revision: current.revision + 1,
    operationalStatus: current.operationalStatus};
  if (change.kind === 'INFORMATION_CORRECTION') {
    for (const [key, value] of Object.entries(change.effect.changes)) {
      // The contract limits this to these two fields, even against forged payloads.
      requireCondition(key === 'displayName' || key === 'serialNumber', 'INVALID_DEVICE_FIELD',
        '変更対象項目が不正です。', 400);
      if (value) {
        nonblank(value.value, 'DEVICE_FIELD_REQUIRED');
        checkSource(value.source);
        fields[key] = {...value, verification: null};
      }
    }
  } else {
    const {field, observedValue, verificationSource} = change.effect;
    checkSource(verificationSource);
    requireCondition(verificationSource.kind !== 'CUSTOMER_REGISTER', 'REALITY_EVIDENCE_REQUIRED',
      '資料の記載だけでは現況を検証できません。', 400);
    if (verificationSource.kind === 'SUPPORT_WORK') requireCondition(
      verificationSource.workId === change.workId, 'WORK_SCOPE_MISMATCH',
      '別のWorkの根拠は使用できません。', 403);
    // The review Actor accepts the field evidence at verification time;
    // source.observedAt records when the physical/system observation occurred.
    const verification = {actorId: change.verifiedByActorId!, verifiedAt: change.verifiedAt!,
      source: verificationSource};
    if (field === 'deviceStatus') {
      requireCondition(['AVAILABLE','UNAVAILABLE','RETIRED'].includes(observedValue), 'INVALID_DEVICE_STATUS',
        '業務状態を実査してください。', 400);
      device.operationalStatus = {value: observedValue as DeviceOperationalStatus, verification};
    } else {
      requireCondition(fields[field]?.value === observedValue, 'FIELD_VALUE_MISMATCH',
        '検証対象の項目が更新されています。');
      fields[field] = {...fields[field], verification};
    }
  }
  return {change: commit, device};
}

export function deviceAssignmentEligibility(device: RegisteredDeviceInformation,
  tenantId: string, organizationId: string, hasActiveRelation: boolean): 'ELIGIBLE' | 'DENIED' {
  if (device.tenantId !== tenantId || device.organizationId !== organizationId) return 'DENIED';
  if (hasActiveRelation || !device.fields.assetTag.verification) return 'DENIED';
  if (device.operationalStatus.value !== 'AVAILABLE' || !device.operationalStatus.verification) return 'DENIED';
  return 'ELIGIBLE';
}
