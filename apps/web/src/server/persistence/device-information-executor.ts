import type { PoolClient } from 'pg';
import type { DeviceInformationChange } from '../../../../../packages/domain/src/device-information.js';

type DeviceSourceRow={fieldKey:string;fieldValue:string;evidenceId:string;sourceKind:string;
  locator:string;observedAt:string;workId?:string};

export class DeviceInformationDatabaseExecutor {
  constructor(private readonly client:PoolClient){}
  async propose(tenantId:string,actorId:string,change:DeviceInformationChange,
    fingerprint:string,sources:DeviceSourceRow[]):Promise<string>{
    const command={changeId:change.id,serviceId:change.serviceId,
      contractProfileId:change.contractProfileId,serviceRecipientId:change.serviceRecipientId,
      organizationId:change.organizationId,deviceId:change.deviceId,
      workId:change.workId??'',kind:change.kind==='INITIAL_INFORMATION'?'DEVICE_INITIAL_INFORMATION':
        change.kind==='INFORMATION_CORRECTION'?'DEVICE_INFORMATION_CORRECTION':'DEVICE_FIELD_VERIFICATION',
      requestKey:change.requestId,expectedRevision:change.expectedRevision,
      effect:change.effect,fingerprint,sources};
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
