import { randomUUID } from 'node:crypto';
import { requireCondition } from '../../domain/src/join.js';
import type {
  DeviceAuthorizedContext, DeviceFieldInput, DeviceInformationChange,
  DeviceInformationField, DeviceInformationSource, DeviceScopedGrant,
  RegisteredDeviceInformation,
} from '../../domain/src/device-information.js';
import {
  commitDeviceInformationChange, deviceAssetKey, proposeDeviceFieldVerification,
  proposeDeviceInformationCorrection, proposeDeviceInitialInformation,
  requireDeviceRegistryGrant, verifyDeviceInformationChange,
} from './device-information-contract.js';

/**
 * S2a: a deliberately narrow Application command boundary.
 *
 * NOT an HTTP handler, SQL writer, privileged RPC, or deployable Device API.
 * All authoritative values come from the eventual authenticated transaction
 * adapter. It must lock live Device and Grant state and rollback all writes,
 * Evidence links and Audit together when any operation fails.
 */
export interface VerifiedDeviceSession {
  readonly operatorId: string;
  readonly tenantId: string;
}
export interface DeviceCommandTarget {
  serviceId: string;
  organizationId: string;
  workId?: string;
}
export type DeviceInputField = DeviceInformationField | 'deviceStatus';
export interface DeviceCommandReceipt {
  change: DeviceInformationChange;
  device: RegisteredDeviceInformation;
}
export interface DeviceChangeRecord {
  change: DeviceInformationChange;
  requestFingerprint: string;
  verificationSummary: string | null;
  committedDevice: RegisteredDeviceInformation | null;
}
export interface DeviceWriteTransaction {
  /** Server-resolved current Tenant/Service/Contract/Recipient and Actor status. */
  resolveContext(actor: VerifiedDeviceSession, target: DeviceCommandTarget):
    Promise<DeviceAuthorizedContext | null>;
  /** Current database-scoped grants, not client-supplied role lists. */
  grants(context: DeviceAuthorizedContext): Promise<readonly DeviceScopedGrant[]>;
  /** A real Evidence / Work / target / actor / field-value correspondence. */
  sourceIsAdmissible(
    context: DeviceAuthorizedContext, source: DeviceInformationSource,
    field: DeviceInputField, value: string, deviceId: string | null,
  ): Promise<boolean>;
  /** Lock current Device where appropriate; never expose other customer rows. */
  deviceById(context: DeviceAuthorizedContext, id: string): Promise<RegisteredDeviceInformation | null>;
  /** Lock the customer + asset identity, including absence for a Create. */
  deviceByAssetTag(context: DeviceAuthorizedContext, assetTag: string):
    Promise<RegisteredDeviceInformation | null>;
  /** Durable idempotency bound to tenant + proposer + request key. */
  changeByRequest(actor: VerifiedDeviceSession, requestId: string):
    Promise<DeviceChangeRecord | null>;
  /** A scoped, non-enumerating lookup of a stored immutable proposal. */
  changeById(actor: VerifiedDeviceSession, changeId: string):
    Promise<DeviceChangeRecord | null>;
  recordProposal(change: DeviceInformationChange, requestFingerprint: string): Promise<void>;
  /** Persist VERIFY, COMMIT, changed fields, source links and revision atomically. */
  recordCommit(
    verified: DeviceInformationChange, committed: DeviceCommandReceipt,
    verificationSummary: string,
  ): Promise<void>;
  audit(
    context: DeviceAuthorizedContext, type: string,
    metadata: Record<string, string | number | null>,
  ): Promise<void>;
}
export interface DeviceWriteUnitOfWork {
  /** Must be one rollback-capable tenant transaction, including all tx methods. */
  run<T>(actor: VerifiedDeviceSession, callback: (tx: DeviceWriteTransaction) => Promise<T>): Promise<T>;
}

function ensureActor(actor: VerifiedDeviceSession) {
  requireCondition(Boolean(actor?.tenantId && actor.operatorId),
    'DEVICE_AUTH_REQUIRED', 'ログインが必要です。', 403);
}
function requestId(value: string) {
  requireCondition(typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value),
    'INVALID_REQUEST_KEY', '保存番号を確認してください。', 400);
}
function fingerprint(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort()
    .map(key => JSON.stringify(key) + ':' + fingerprint(object[key])).join(',') + '}';
}
async function requireScope(
  tx: DeviceWriteTransaction, actor: VerifiedDeviceSession, target: DeviceCommandTarget,
): Promise<{ context: DeviceAuthorizedContext; grants: readonly DeviceScopedGrant[] }> {
  const context = await tx.resolveContext(actor, target);
  requireCondition(context !== null && context.actorId === actor.operatorId &&
    context.tenantId === actor.tenantId &&
    context.organizationId === target.organizationId &&
    context.serviceId === target.serviceId &&
    (context.workId ?? null) === (target.workId ?? null),
    'DEVICE_CONTEXT_UNAVAILABLE', '対象が見つかりません。', 404);
  return {context, grants: await tx.grants(context)};
}

function sourcePairs(change: DeviceInformationChange): Array<{
  field: DeviceInputField; value: string; source: DeviceInformationSource;
}> {
  if (change.kind === 'FIELD_VERIFICATION') return [{
    field: change.effect.field, value: change.effect.observedValue,
    source: change.effect.verificationSource,
  }];
  if (change.kind === 'INFORMATION_CORRECTION') {
    return (Object.entries(change.effect.changes) as Array<[DeviceInformationField, DeviceFieldInput | undefined]>)
      .filter((pair): pair is [DeviceInformationField, DeviceFieldInput] => !!pair[1])
      .map(([field, input]) => ({field, value: input.value, source: input.source}));
  }
  const fields: Array<[DeviceInformationField, DeviceFieldInput | undefined]> = [
    ['assetTag', change.effect.assetTag], ['displayName', change.effect.displayName],
    ['serialNumber', change.effect.serialNumber],
  ];
  return fields.filter((pair): pair is [DeviceInformationField, DeviceFieldInput] => !!pair[1])
    .map(([field, input]) => ({field, value: input.value, source: input.source}));
}
async function requireActualSources(
  tx: DeviceWriteTransaction, context: DeviceAuthorizedContext,
  change: DeviceInformationChange,
) {
  const sources = sourcePairs(change);
  requireCondition(sources.length > 0, 'DEVICE_EVIDENCE_REQUIRED', '根拠が必要です。', 400);
  for (const item of sources) {
    const isCurrent = await tx.sourceIsAdmissible(context, item.source,
      item.field, item.value, change.kind === 'INITIAL_INFORMATION' ? null : change.deviceId);
    requireCondition(isCurrent, 'DEVICE_EVIDENCE_UNAVAILABLE', '根拠を確認できません。', 403);
  }
}
function targetOf(change: DeviceInformationChange): DeviceCommandTarget {
  return {
    serviceId: change.serviceId, organizationId: change.organizationId,
    ...(change.workId ? {workId: change.workId} : {}),
  };
}

export class DeviceInformationWriteCommands {
  constructor(private readonly unit: DeviceWriteUnitOfWork,
    private readonly newId: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString()) {}

  async proposeInitial(
    actor: VerifiedDeviceSession, target: DeviceCommandTarget, key: string,
    input: {assetTag: string; displayName: string; serialNumber?: string; source: DeviceInformationSource},
  ): Promise<DeviceInformationChange> {
    ensureActor(actor); requestId(key);
    return this.unit.run(actor, async tx => {
      const {context, grants} = await requireScope(tx, actor, target);
      requireDeviceRegistryGrant(context, grants, 'CREATE', this.now(), context.tenantId, context.organizationId);
      const hash = fingerprint({kind:'INITIAL_INFORMATION',target,input});
      const prior = await tx.changeByRequest(actor, key);
      if (prior) {
        requireCondition(prior.requestFingerprint === hash &&
          prior.change.proposedByActorId === actor.operatorId,
          'DEVICE_RETRY_CONFLICT', '同じ保存番号の内容が異なります。');
        return prior.change;
      }
      const [t,o,tag] = deviceAssetKey(context.tenantId,context.organizationId,input.assetTag);
      requireCondition(t === actor.tenantId && o === context.organizationId,
        'DEVICE_CONTEXT_UNAVAILABLE', '対象が見つかりません。', 404);
      requireCondition(await tx.deviceByAssetTag(context,tag!) === null,
        'DEVICE_ALREADY_EXISTS', '既存Deviceとの照合が必要です。');
      const change = proposeDeviceInitialInformation(context, grants, this.now(),
        {id:this.newId(),requestId:key,deviceId:this.newId()}, input);
      await requireActualSources(tx,context,change);
      await tx.recordProposal(change,hash);
      await tx.audit(context,'DEVICE_CHANGE_PROPOSED',{changeId:change.id,kind:change.kind});
      return change;
    });
  }

  async proposeCorrection(
    actor: VerifiedDeviceSession, target: DeviceCommandTarget, key: string, deviceId: string,
    changes: Partial<Record<'displayName' | 'serialNumber', DeviceFieldInput>>,
  ): Promise<DeviceInformationChange> {
    ensureActor(actor); requestId(key);
    requireCondition(Boolean(changes) && typeof changes === 'object' &&
      Object.keys(changes).every(field => field === 'displayName' || field === 'serialNumber'),
      'INVALID_DEVICE_FIELD', '変更対象の項目が不正です。', 400);
    return this.unit.run(actor, async tx => {
      const {context,grants} = await requireScope(tx, actor, target);
      requireDeviceRegistryGrant(context,grants,'UPDATE',this.now(),context.tenantId,context.organizationId);
      const hash = fingerprint({kind:'INFORMATION_CORRECTION',target,deviceId,changes});
      const prior = await tx.changeByRequest(actor,key);
      if (prior) {
        requireCondition(prior.requestFingerprint === hash &&
          prior.change.proposedByActorId === actor.operatorId,
          'DEVICE_RETRY_CONFLICT', '同じ保存番号の内容が異なります。');
        return prior.change;
      }
      const device = await tx.deviceById(context,deviceId);
      requireCondition(device !== null,'DEVICE_CONTEXT_UNAVAILABLE','対象が見つかりません。',404);
      const change=proposeDeviceInformationCorrection(context,grants,this.now(),
        {id:this.newId(),requestId:key,deviceId},device,changes);
      await requireActualSources(tx,context,change);
      await tx.recordProposal(change,hash);
      await tx.audit(context,'DEVICE_CHANGE_PROPOSED',{changeId:change.id,kind:change.kind});
      return change;
    });
  }

  async proposeFieldVerification(
    actor: VerifiedDeviceSession, target: DeviceCommandTarget, key: string, deviceId: string,
    field: DeviceInputField, observedValue: string, source: DeviceInformationSource,
  ): Promise<DeviceInformationChange> {
    ensureActor(actor); requestId(key);
    return this.unit.run(actor, async tx => {
      const {context,grants} = await requireScope(tx,actor,target);
      requireDeviceRegistryGrant(context,grants,'UPDATE',this.now(),context.tenantId,context.organizationId);
      const hash=fingerprint({kind:'FIELD_VERIFICATION',target,deviceId,field,observedValue,source});
      const prior=await tx.changeByRequest(actor,key);
      if (prior) {
        requireCondition(prior.requestFingerprint === hash &&
          prior.change.proposedByActorId === actor.operatorId,
          'DEVICE_RETRY_CONFLICT', '同じ保存番号の内容が異なります。');
        return prior.change;
      }
      const device=await tx.deviceById(context,deviceId);
      requireCondition(device !== null,'DEVICE_CONTEXT_UNAVAILABLE','対象が見つかりません。',404);
      const change=proposeDeviceFieldVerification(context,grants,this.now(),
        {id:this.newId(),requestId:key,deviceId},device,field,observedValue,source);
      await requireActualSources(tx,context,change);
      await tx.recordProposal(change,hash);
      await tx.audit(context,'DEVICE_CHANGE_PROPOSED',{changeId:change.id,kind:change.kind});
      return change;
    });
  }

  async confirm(
    actor: VerifiedDeviceSession, changeId: string, verificationSummary: string,
  ): Promise<DeviceCommandReceipt> {
    ensureActor(actor);
    requireCondition(typeof changeId === 'string' && changeId.length > 0,
      'DEVICE_CHANGE_UNAVAILABLE','対象が見つかりません。',404);
    requireCondition(typeof verificationSummary === 'string' &&
      verificationSummary.trim().length >= 1 && verificationSummary.length <= 1000,
      'DEVICE_VERIFICATION_REQUIRED','確認内容を入力してください。',400);
    return this.unit.run(actor, async tx => {
      const stored=await tx.changeById(actor,changeId);
      requireCondition(stored !== null,'DEVICE_CHANGE_UNAVAILABLE','対象が見つかりません。',404);
      const change=stored.change;
      const {context,grants}=await requireScope(tx,actor,targetOf(change));
      requireCondition(context.tenantId===change.tenantId &&
        context.serviceRecipientId===change.serviceRecipientId,
        'DEVICE_CHANGE_UNAVAILABLE','対象が見つかりません。',404);
      requireDeviceRegistryGrant(context,grants,'REVIEW',this.now(),change.tenantId,change.organizationId);
      requireDeviceRegistryGrant(context,grants,'APPROVE',this.now(),change.tenantId,change.organizationId);
      requireCondition(change.proposedByActorId!==actor.operatorId,
        'SELF_REVIEW_FORBIDDEN','申請者と異なる確認者が必要です。',403);
      if(change.status==='COMMITTED') {
        requireCondition(change.committedByActorId===actor.operatorId &&
          stored.committedDevice!==null && stored.verificationSummary===verificationSummary.trim(),
          'DEVICE_RETRY_CONFLICT','確定済みの確認内容と一致しません。',409);
        return {change,device:stored.committedDevice};
      }
      requireCondition(change.status==='PROPOSED',
        'DEVICE_CHANGE_UNAVAILABLE','対象が見つかりません。',404);
      const current=change.kind==='INITIAL_INFORMATION' ? null :
        await tx.deviceById(context,change.deviceId);
      if(change.kind==='INITIAL_INFORMATION') {
        requireCondition(await tx.deviceByAssetTag(context,change.effect.assetTag.value)===null,
          'DEVICE_ALREADY_EXISTS','既存Deviceとの照合が必要です。');
      } else {
        requireCondition(current !== null,'DEVICE_CHANGE_UNAVAILABLE','対象が見つかりません。',404);
      }
      await requireActualSources(tx,context,change);
      const reviewed=verifyDeviceInformationChange(context,grants,this.now(),change);
      const committed=commitDeviceInformationChange(context,grants,this.now(),reviewed,current);
      await tx.recordCommit(reviewed,committed,verificationSummary.trim());
      await tx.audit(context,'DEVICE_CHANGE_VERIFIED',{changeId:change.id,kind:change.kind});
      await tx.audit(context,'DEVICE_CHANGE_COMMITTED',{changeId:change.id,kind:change.kind});
      return committed;
    });
  }
}
