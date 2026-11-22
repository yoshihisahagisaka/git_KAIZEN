import {randomUUID} from 'node:crypto';
import {requireCondition} from '../../domain/src/join.js';
import type {VerifiedDeviceSession} from './device-information-write-commands.js';

export const SUPPORT_DEVICE_FIELD_KEYS =
  ['assetTag','displayName','serialNumber','deviceStatus'] as const;
export type SupportDeviceFieldKey = typeof SUPPORT_DEVICE_FIELD_KEYS[number];

export interface RecordSupportDeviceFieldObservationInput {
  requestId: string;
  workId: string;
  targetContextId: string;
  deviceId: string;
  organizationServiceRecipientId: string;
  fieldKey: SupportDeviceFieldKey;
  observedValue: string;
  expectedRevision: number;
}
export interface ProposeObservedDeviceFieldChangeInput {
  observationId: string;
  requestKey: string;
}
export interface DeviceWorkFieldEvidencePort {
  record(actor: VerifiedDeviceSession,input: RecordSupportDeviceFieldObservationInput): Promise<string>;
  propose(actor: VerifiedDeviceSession,input: ProposeObservedDeviceFieldChangeInput & {changeId:string}):
    Promise<string>;
}

/** Internal-only S3c-1A boundary. No HTTP route is registered for it. */
export class DeviceWorkFieldEvidenceCommands {
  constructor(private readonly port:DeviceWorkFieldEvidencePort,
    private readonly newId:()=>string=randomUUID) {}

  record(actor:VerifiedDeviceSession,input:RecordSupportDeviceFieldObservationInput){
    requireCondition(Boolean(actor?.tenantId&&actor.operatorId),'DEVICE_AUTH_REQUIRED',
      'ログインが必要です。',403);
    requireCondition(SUPPORT_DEVICE_FIELD_KEYS.includes(input.fieldKey)&&
      input.observedValue.trim().length>0&&input.observedValue.length<=2000&&
      Number.isInteger(input.expectedRevision)&&input.expectedRevision>=0,
    'INVALID_DEVICE_OBSERVATION','確認内容を確認してください。',400);
    return this.port.record(actor,input);
  }

  propose(actor:VerifiedDeviceSession,input:ProposeObservedDeviceFieldChangeInput){
    requireCondition(Boolean(actor?.tenantId&&actor.operatorId),'DEVICE_AUTH_REQUIRED',
      'ログインが必要です。',403);
    requireCondition(/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestKey),
      'INVALID_REQUEST_KEY','保存番号を確認してください。',400);
    return this.port.propose(actor,{...input,changeId:this.newId()});
  }
}
