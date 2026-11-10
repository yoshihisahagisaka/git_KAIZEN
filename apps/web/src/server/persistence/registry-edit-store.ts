import type {Pool} from 'pg';
import {withTenant} from './database.js';
import type {ProposeDisplayNameInput,RegistryEditStore,VerifiedRegistryActor}
  from '../../../../../packages/application/src/registry-edit-commands.js';

/**
 * Narrow adapter. Every RPC is one ACID tenant transaction. The DB function
 * derives recipient/contract, rechecks active REGISTRY Grant under the same
 * authority lock as revoke, verifies Person revision and writes Audit.
 * Session and request validation live at the HTTP boundary; no browser-supplied
 * Tenant or Actor is treated as authority by this adapter.
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
  async confirm(actor:VerifiedRegistryActor,changeId:string,summary:string):Promise<string>{
    // Keep the reviewed Change lifecycle distinct internally, while ensuring
    // Verify evidence cannot be left half-committed when Commit fails.
    return withTenant(this.pool,actor.tenantId,async db=>{
      const {rows}=await db.query<{status:string;verified_by_operator_id:string|null;
        committed_by_operator_id:string|null}>(`
        select status,verified_by_operator_id,committed_by_operator_id
        from factact.changes where tenant_id=$1 and id=$2
          and change_kind='PERSON_DISPLAY_NAME_CORRECTION'
          and registry_edit_request_id is not null`,[actor.tenantId,changeId]);
      const state=rows[0];
      if(state?.status==='PROPOSED'){
        await db.query(`select factact.registry_verify_display_name(
          $1::uuid,$2::uuid,$3::uuid,$4::text)`,
          [actor.tenantId,actor.actorOperatorId,changeId,summary]);
      }else if(!state||!['VERIFIED','COMMITTED'].includes(state.status)||
        state.verified_by_operator_id!==actor.actorOperatorId||
        (state.status==='COMMITTED'&&state.committed_by_operator_id!==actor.actorOperatorId)){
        throw Object.assign(new Error('Registry change unavailable'),{code:'42501'});
      }
      const {rows:committed}=await db.query<{change_id:string}>(`
        select factact.registry_commit_display_name($1::uuid,$2::uuid,$3::uuid)
          as change_id`,[actor.tenantId,actor.actorOperatorId,changeId]);
      return committed[0]!.change_id;
    });
  }
  async returnForRevision(actor:VerifiedRegistryActor,changeId:string,reason:string):Promise<string>{
    return withTenant(this.pool,actor.tenantId,async db=>{
      const {rows}=await db.query<{change_id:string}>(`
        select factact.registry_return_display_name(
          $1::uuid,$2::uuid,$3::uuid,$4::text) as change_id`,
        [actor.tenantId,actor.actorOperatorId,changeId,reason]);
      return rows[0]!.change_id;
    });
  }
}
