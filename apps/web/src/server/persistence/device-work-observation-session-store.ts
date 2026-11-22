import type {Pool} from 'pg';
import {withTenant} from './database.js';
import type {AuthenticatedDeviceWorkObservationStore,DeviceReviewCursor,
  DeviceObservationCommand,DeviceReviewPage,DeviceSessionPrincipal} from '../device-work-observation-routes.js';

interface PendingRow {
  change_id:string;work_id:string;device_id:string;field_key:string;
  current_value:string|null;observed_value:string;observed_at:Date;
  proposed_by_operator_display_name:string;status:'PROPOSED';created_at:Date;
  has_more:boolean;
}

/** The browser never supplies Tenant/Actor/recipient/source identifiers.
 * This adapter passes only the server-verified session hash to bounded SQL.
 * All four operations re-read the active OIDC membership in PostgreSQL. */
export class PgDeviceWorkObservationSessionStore implements AuthenticatedDeviceWorkObservationStore {
  constructor(private readonly pool:Pool){}

  async record(principal:DeviceSessionPrincipal,command:DeviceObservationCommand):Promise<string>{
    return withTenant(this.pool,principal.tenantId,async db=>{
      const {rows}=await db.query<{id:string}>(
        'select factact.device_record_observation_session($1,$2::jsonb) id',
        [principal.sessionHash,JSON.stringify(command)]);
      return rows[0]!.id;
    });
  }

  async propose(principal:DeviceSessionPrincipal,observationId:string,requestKey:string):Promise<string>{
    return withTenant(this.pool,principal.tenantId,async db=>{
      const {rows}=await db.query<{id:string}>(
        'select factact.device_propose_observation_session($1,$2,$3) id',
        [principal.sessionHash,observationId,requestKey]);
      return rows[0]!.id;
    });
  }

  async pending(principal:DeviceSessionPrincipal,limit:number,
    cursor:DeviceReviewCursor|null):Promise<DeviceReviewPage>{
    return withTenant(this.pool,principal.tenantId,async db=>{
      const {rows}=await db.query<PendingRow>(
        'select * from factact.device_pending_observation_reviews_session($1,$2,$3,$4)',
        [principal.sessionHash,limit,cursor?.createdAt??null,cursor?.changeId??null]);
      const last=rows.at(-1);
      return {
        items:rows.map(row=>({
          changeId:row.change_id,workId:row.work_id,deviceId:row.device_id,
          fieldKey:row.field_key,currentValue:row.current_value,
          observedValue:row.observed_value,observedAt:new Date(row.observed_at).toISOString(),
          proposedByOperatorDisplayName:row.proposed_by_operator_display_name,
          status:row.status,
        })),
        nextCursor:last?.has_more?Buffer.from(JSON.stringify({
          createdAt:new Date(last.created_at).toISOString(),changeId:last.change_id,
        })).toString('base64url'):null,
      };
    },true);
  }

  async confirm(principal:DeviceSessionPrincipal,changeId:string,summary:string):Promise<string>{
    return withTenant(this.pool,principal.tenantId,async db=>{
      const {rows}=await db.query<{id:string}>(
        'select factact.device_confirm_observation_session($1,$2,$3) id',
        [principal.sessionHash,changeId,summary]);
      return rows[0]!.id;
    });
  }
}
