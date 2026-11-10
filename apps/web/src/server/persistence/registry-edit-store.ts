import type {Pool} from 'pg';
import {withTenant} from './database.js';
import type {ProposeDisplayNameInput,RegistryEditStore,VerifiedRegistryActor}
  from '../../../../../packages/application/src/registry-edit-commands.js';

/**
 * Narrow adapter. Every RPC is one ACID tenant transaction. The DB function
 * derives recipient/contract, rechecks active REGISTRY Grant under the same
 * authority lock as revoke, verifies Person revision and writes Audit.
 * This adapter is NOT connected to an HTTP route in this slice.
 */
export class PgRegistryEditStore implements RegistryEditStore {
  constructor(private readonly pool:Pool){}
  async propose(actor:VerifiedRegistryActor,input:ProposeDisplayNameInput):Promise<string>{
    return withTenant(this.pool,actor.tenantId,async db=>{
      const {rows}=await db.query<{change_id:string}>(`
        select factact.registry_propose_display_name(
          $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::text,$8::text,$9::bigint
        ) as change_id`,[
          actor.tenantId,actor.actorOperatorId,input.personId,input.serviceId,
          input.requestId,input.requestKey,input.proposedDisplayName,input.reason,
          input.expectedRegistryRevision,
        ]);
      return rows[0]!.change_id;
    });
  }
  async verify(actor:VerifiedRegistryActor,changeId:string,summary:string):Promise<string>{
    return withTenant(this.pool,actor.tenantId,async db=>{
      const {rows}=await db.query<{change_id:string}>(`
        select factact.registry_verify_display_name($1::uuid,$2::uuid,$3::uuid,$4::text) as change_id`,
        [actor.tenantId,actor.actorOperatorId,changeId,summary]);
      return rows[0]!.change_id;
    });
  }
  async commit(actor:VerifiedRegistryActor,changeId:string):Promise<string>{
    return withTenant(this.pool,actor.tenantId,async db=>{
      const {rows}=await db.query<{change_id:string}>(`
        select factact.registry_commit_display_name($1::uuid,$2::uuid,$3::uuid) as change_id`,
        [actor.tenantId,actor.actorOperatorId,changeId]);
      return rows[0]!.change_id;
    });
  }
}
