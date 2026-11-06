import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';
import {isExplicitlyAuthorized,type ExplicitAccessGrant,type ExplicitAccessScope,type ResolvedAccessTarget} from '../../../../../packages/domain/src/scoped-access.js';

interface StoredGrant {
 actor_operator_id:string;tenant_id:string;service_id:string;contract_profile_id:string;
 scope_kind:ExplicitAccessScope['kind'];service_recipient_id:string|null;work_id:string|null;
 object_kind:ExplicitAccessGrant['objectKind'];operations:ExplicitAccessGrant['operations'];
 status:ExplicitAccessGrant['status'];effective_from:Date;effective_until:Date|null;
}

/**
 * A tenant-scoped, read-only bridge to the pure scoped-access policy.
 * No API route may accept actorId or a resolved target from a Caller body.
 * The HTTP/session resolver must establish the Actor and target IDs separately.
 */
export class PgScopedAccessReader {
 constructor(private readonly pool:Pool,private readonly clock:{now():string}={now:()=>new Date().toISOString()}){}

 async authorized(actorId:string,target:ResolvedAccessTarget):Promise<boolean>{
  // The kernel is also a shape validator. Reject without querying a malformed scope.
  const at=this.clock.now();
  if(!target||!target.scope||!['SERVICE','SERVICE_RECIPIENT','WORK'].includes(target.scope.kind)||
     !Number.isFinite(Date.parse(at))||
     ![actorId,target.tenantId,target.serviceId,target.contractProfileId].every(id=>z.uuid().safeParse(id).success)||
     (target.scope.kind!=='SERVICE'&&!z.uuid().safeParse(target.scope.serviceRecipientId).success)||
     (target.scope.kind==='WORK'&&!z.uuid().safeParse(target.scope.workId).success))return false;
  return withTenant(this.pool,target.tenantId,async db=>{
   if(!await this.targetIsCurrent(db,actorId,target,at))return false;
   const {rows}=await db.query<StoredGrant>(`select actor_operator_id,tenant_id,service_id,contract_profile_id,
      scope_kind,service_recipient_id,work_id,object_kind,operations,status,effective_from,effective_until
     from factact.scoped_actor_grants
     where actor_operator_id=$1 and service_id=$2 and contract_profile_id=$3 and object_kind=$4`,
    [actorId,target.serviceId,target.contractProfileId,target.objectKind]);
   const grants:ExplicitAccessGrant[]=rows.map(row=>({
    actorId:row.actor_operator_id,tenantId:row.tenant_id,serviceId:row.service_id,
    contractProfileId:row.contract_profile_id,
    scope:this.scope(row),objectKind:row.object_kind,operations:row.operations,
    status:row.status,effectiveFrom:row.effective_from.toISOString(),effectiveUntil:row.effective_until?.toISOString()??null,
   }));
   return isExplicitlyAuthorized({actorId,contractIsEffective:true,target,grants,at});
  },true);
 }

 private scope(g:StoredGrant):ExplicitAccessScope{
  if(g.scope_kind==='SERVICE')return {kind:'SERVICE'};
  if(g.scope_kind==='SERVICE_RECIPIENT')return {kind:'SERVICE_RECIPIENT',serviceRecipientId:g.service_recipient_id!};
  return {kind:'WORK',serviceRecipientId:g.service_recipient_id!,workId:g.work_id!};
 }

 private async targetIsCurrent(db:PoolClient,actorId:string,target:ResolvedAccessTarget,at:string):Promise<boolean>{
  // Active identity, Service and Contract must be checked on every request,
  // not copied from an existing session, role or grant.
  const context=await db.query(`select 1 from factact.operators a
    join factact.tenants t on t.id=a.tenant_id and t.status='ACTIVE'
    join factact.services s on s.tenant_id=a.tenant_id and s.id=$2 and s.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id and c.service_id=s.id and c.id=$3
    where a.id=$1 and a.status='ACTIVE' and c.status='ACTIVE'
      and c.effective_from<=$4::timestamptz and (c.effective_to is null or c.effective_to>$4::timestamptz)`,
   [actorId,target.serviceId,target.contractProfileId,at]);
  if(!context.rowCount)return false;
  if(target.scope.kind==='SERVICE')return Object.keys(target.scope).length===1;
  if(!target.scope.serviceRecipientId)return false;
  const recipient=await db.query(`select 1 from factact.service_recipients r
    left join factact.organizations o
      on o.tenant_id=r.tenant_id and o.id=r.recipient_organization_id
    where r.id=$1 and r.service_id=$2 and r.status='ACTIVE'
      and (r.recipient_type<>'ORGANIZATION' or o.status='ACTIVE')`,
   [target.scope.serviceRecipientId,target.serviceId]);
  if(!recipient.rowCount)return false;
  if(target.scope.kind==='SERVICE_RECIPIENT')return Object.keys(target.scope).length===2;
  if(target.scope.kind!=='WORK'||!target.scope.workId||Object.keys(target.scope).length!==3)return false;
  const {rows:works}=await db.query<{lane:string;service_recipient_id:string;support_event_id:string|null}>(`
    select lane,service_recipient_id,support_event_id from factact.work
    where id=$1 and service_id=$2 and contract_profile_id=$3`,
   [target.scope.workId,target.serviceId,target.contractProfileId]);
  const work=works[0];if(!work)return false;
  if(work.lane!=='SUPPORT')return work.service_recipient_id===target.scope.serviceRecipientId;
  // Legacy SUPPORT work.service_recipient_id points to the Caller Person.
  // Only the *latest confirmed* beneficiary can bind an external Work scope.
  if(!work.support_event_id)return false;
  const {rows:history}=await db.query<{kind:'CONFIRMED'|'CLEARED';service_recipient_id:string|null}>(`
    select kind,service_recipient_id from factact.support_event_beneficiary_decisions
    where support_event_id=$1 order by revision desc limit 1`,[work.support_event_id]);
  return history[0]?.kind==='CONFIRMED'&&history[0].service_recipient_id===target.scope.serviceRecipientId;
 }
}
