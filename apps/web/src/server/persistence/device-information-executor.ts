import type { PoolClient } from 'pg';
import type { DeviceInformationChange } from '../../../../../packages/domain/src/device-information.js';
import type {DeviceWorkFieldEvidencePort,ProposeObservedDeviceFieldChangeInput,
  RecordSupportDeviceFieldObservationInput} from '../../../../../packages/application/src/device-work-field-evidence.js';
import type {VerifiedDeviceSession} from '../../../../../packages/application/src/device-information-write-commands.js';

type DeviceSourceRow={fieldKey:string;fieldValue:string;evidenceId:string;sourceKind:string;
  locator:string;observedAt:string;workId?:string};

export class DeviceInformationDatabaseExecutor {
  constructor(private readonly client:PoolClient){}
  async propose(tenantId:string,actorId:string,change:DeviceInformationChange,
    sources:DeviceSourceRow[]):Promise<string>{
    const command={changeId:change.id,serviceId:change.serviceId,
      contractProfileId:change.contractProfileId,serviceRecipientId:change.serviceRecipientId,
      organizationId:change.organizationId,deviceId:change.deviceId,
      workId:change.workId??'',kind:change.kind==='INITIAL_INFORMATION'?'DEVICE_INITIAL_INFORMATION':
        change.kind==='INFORMATION_CORRECTION'?'DEVICE_INFORMATION_CORRECTION':'DEVICE_FIELD_VERIFICATION',
      requestKey:change.requestId,expectedRevision:change.expectedRevision,
      effect:change.effect,sources};
    const result=await this.client.query<{id:string}>(
      'select factact.device_propose_change($1,$2,$3::jsonb) id',[tenantId,actorId,command]);
    return result.rows[0]!.id;
  }
  async confirm(tenantId:string,actorId:string,changeId:string,summary:string):Promise<string>{
    const result=await this.client.query<{id:string}>(
      'select factact.device_confirm_change($1,$2,$3,$4) id',[tenantId,actorId,changeId,summary]);
    return result.rows[0]!.id;
  }
}

/** Internal server adapter only. S3c-1A intentionally has no HTTP endpoint. */
export class PgDeviceWorkFieldEvidenceExecutor implements DeviceWorkFieldEvidencePort {
  constructor(private readonly client:PoolClient) {}
  async record(actor:VerifiedDeviceSession,input:RecordSupportDeviceFieldObservationInput){
    const {rows}=await this.client.query<{id:string}>(
      'select factact.record_support_device_field_observation($1,$2,$3::jsonb) id',
      [actor.tenantId,actor.operatorId,input]);
    return rows[0]!.id;
  }
  async propose(actor:VerifiedDeviceSession,input:ProposeObservedDeviceFieldChangeInput & {changeId:string}){
    const {rows}=await this.client.query<{id:string}>(
      'select factact.propose_observed_device_field_change($1,$2,$3,$4,$5) id',
      [actor.tenantId,actor.operatorId,input.observationId,input.changeId,input.requestKey]);
    return rows[0]!.id;
  }
}
