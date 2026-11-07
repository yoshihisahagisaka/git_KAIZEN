import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';
import {PgSupportRepository} from './support-repository.js';
import type {SupportWork} from '../../../../../packages/domain/src/support.js';
import {randomUUID} from 'node:crypto';
import {isExplicitlyAuthorized,type ExplicitAccessGrant,type ExplicitAccessScope,type ResolvedAccessTarget} from '../../../../../packages/domain/src/scoped-access.js';

interface StoredGrant {
 actor_operator_id:string;tenant_id:string;service_id:string;contract_profile_id:string;
 scope_kind:ExplicitAccessScope['kind'];service_recipient_id:string|null;work_id:string|null;
 object_kind:ExplicitAccessGrant['objectKind'];operations:ExplicitAccessGrant['operations'];
 status:ExplicitAccessGrant['status'];effective_from:Date;effective_until:Date|null;
}

interface StoredSupportWorkSummary {
 work_id:string;service_id:string;contract_profile_id:string;support_event_id:string;
 title:string;status:'OPEN'|'IN_PROGRESS'|'COMPLETED';next_action:string;
 waiting:boolean;follow_up_at:Date|null;updated_at:Date;
 beneficiary_kind:'CONFIRMED'|'CLEARED'|null;confirmed_recipient_id:string|null;
}

export interface ScopedSupportWorkSummary {
 workId:string;serviceId:string;contractProfileId:string;serviceRecipientId:string;
 title:string;status:'OPEN'|'IN_PROGRESS'|'COMPLETED';nextAction:string;
 waiting:boolean;followUpAt:string|null;updatedAt:string;
}

export interface ScopedSupportWorkPage {items:ScopedSupportWorkSummary[];nextCursor:string|null}
export interface ScopedSupportWorkCursor {updatedAt:string;workId:string}
export interface ScopedSupportHistoryCursor {occurredAt:string;id:string}
export interface ScopedSupportHistoryEntry {
 id:string;revision:number;kind:string;occurredAt:string;
 responseText:string|null;disposition:'CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING'|'COMPLETED'|null;
}
export interface ScopedSupportWorkHistory {
 work:ScopedSupportWorkSummary;entries:ScopedSupportHistoryEntry[];nextCursor:string|null;
}

/** Narrow, trusted application port. It cannot fetch, write or audit a second
 * Work and never takes its Actor, Event or Tenant identity from an HTTP body.
 * Domain transition validation belongs in the subsequent command integration. */
export interface ScopedSupportWorkUpdateContext {
 work():Promise<SupportWork|null>;
 progress(work:SupportWork):Promise<void>;
 audit(eventType:string,metadata:Record<string,unknown>):Promise<void>;
}

interface StoredSupportHistoryEntry {
 id:string;revision:number;kind:string;occurred_at:Date;
 response_text:string|null;disposition:ScopedSupportHistoryEntry['disposition'];
}

/**
 * A tenant-scoped bridge to the pure scoped-access policy. Public reads are
 * read-only; the internal update boundary deliberately uses a write transaction.
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
  return withTenant(this.pool,target.tenantId,db=>this.authorizedInTransaction(db,actorId,target,at),true);
 }

 /** Internal-only UPDATE transaction boundary. No HTTP write route calls this
  * yet. The beneficiary, effective grant and Actor are resolved from the DB,
  * under the same transaction as the future mutation and Audit write.
  * An unauthorized Work is never passed to the callback. */
 async runSupportWorkUpdate<T>(tenantId:string,actorId:string,workId:string,
  mutation:(work:ScopedSupportWorkUpdateContext)=>Promise<T>):Promise<T|null>{
  if(![tenantId,actorId,workId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const work=await this.authorizedSupportWork(db,tenantId,actorId,workId,at,'UPDATE',true);
   if(!work)return null;
   const repository=new PgSupportRepository(db,tenantId);
   const context:ScopedSupportWorkUpdateContext={
    work:()=>repository.work(workId,true),
    progress:async updated=>{
     if(updated.id!==workId||updated.tenantId!==tenantId||
        updated.serviceId!==work.service_id||updated.contractProfileId!==work.contract_profile_id||
        updated.supportEventId!==work.support_event_id)
      throw Error('SCOPED_UPDATE_TARGET_MISMATCH');
     await repository.progress(updated);
    },
    audit:async(eventType,metadata)=>repository.audit({
     id:randomUUID(),tenantId,aggregateType:'SUPPORT_EVENT',aggregateId:work.support_event_id,
     eventType,actorOperatorId:actorId,occurredAt:this.clock.now(),metadataJson:metadata,
    }),
   };
   const result=await mutation(context);
   // Runtime cannot row-lock the privileged Grant/Actor tables. A final
   // READ COMMITTED check catches revocations committed during the mutation.
   // Grant issuance/revocation must eventually coordinate its own race gate.
   if(!await this.authorizedSupportWork(db,tenantId,actorId,workId,this.clock.now(),'UPDATE'))
    throw Error('SCOPED_UPDATE_AUTHORITY_CHANGED');
   return result;
  });
 }

 /**
  * Resolve the Work and
  * latest confirmed beneficiary from the database, then authorize and project
  * inside the SAME repeatable-read tenant transaction. Never accept client-
  * supplied Service/Contract/Recipient/Grant context for this lookup.
  */
 async supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>{
  if(![tenantId,actorId,workId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const work=await this.authorizedSupportWork(db,tenantId,actorId,workId,at);
   return work?this.projectSupportWork(work):null;
  },true);
 }

 /** Only Work-local recorded responses and metadata-only state transitions.
  * Drafts, raw command payloads, operator identities and other Work are excluded.
  * Authorization and history projection share one read-only tenant snapshot. */
 async supportWorkHistory(tenantId:string,actorId:string,workId:string,limit:number,
  cursor:ScopedSupportHistoryCursor|null):Promise<ScopedSupportWorkHistory|null>{
  if(![tenantId,actorId,workId].every(id=>z.uuid().safeParse(id).success)||
     !Number.isInteger(limit)||limit<1||limit>50||
     (cursor&&(!z.uuid().safeParse(cursor.id).success||!Number.isFinite(Date.parse(cursor.occurredAt)))))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const work=await this.authorizedSupportWork(db,tenantId,actorId,workId,at);
   if(!work)return null;
   const {rows}=await db.query<StoredSupportHistoryEntry>(`
    with entries as (
     select r.id,r.revision,'RESPONSE'::text as kind,r.recorded_at as occurred_at,
      r.notes->>'responseText' as response_text,r.notes->>'disposition' as disposition
     from factact.support_work_records r
     where r.tenant_id=$2 and r.work_id=$1 and r.kind='RESPONSE'
      and jsonb_typeof(r.notes->'responseText')='string'
      and r.notes->>'disposition' in ('CUSTOMER_WAIT','INVESTIGATING','MONITORING','COMPLETED')
     union all
     select e.id,e.revision,e.kind,e.recorded_at,null::text,null::text
     from factact.support_work_lifecycle_events e
     where e.tenant_id=$2 and e.work_id=$1
      and e.kind in ('CONTINUATION_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED','REOPENED')
    )
    select id,revision,kind,occurred_at,response_text,disposition from entries
    where ($3::timestamptz is null or (occurred_at,id)<($3::timestamptz,$4::uuid))
    order by occurred_at desc,id desc limit $5`,
    [workId,tenantId,cursor?.occurredAt??null,cursor?.id??null,limit]);
   const entries:ScopedSupportHistoryEntry[]=rows.map(row=>({
    id:row.id,revision:row.revision,kind:row.kind,occurredAt:row.occurred_at.toISOString(),
    responseText:row.response_text,disposition:row.disposition,
   }));
   const last=entries.at(-1);
   const nextCursor=entries.length===limit&&last
    ?Buffer.from(JSON.stringify({occurredAt:last.occurredAt,id:last.id})).toString('base64url')
    :null;
   return {work:this.projectSupportWork(work),entries,nextCursor};
  },true);
 }

 private async authorizedSupportWork(db:PoolClient,tenantId:string,actorId:string,
  workId:string,at:string,operation:'READ'|'UPDATE'='READ',lockWork=false):Promise<StoredSupportWorkSummary|null>{
   if(lockWork){
    // Beneficiary decisions lock the parent Event FOR UPDATE. Pin it FOR SHARE
    // before locking Work to prevent a concurrent reassignment during mutation.
    const {rows:events}=await db.query<{support_event_id:string}>(
     "select support_event_id from factact.work where id=$1 and lane='SUPPORT'",[workId]);
    if(!events[0]?.support_event_id)return null;
    const parent=await db.query('select 1 from factact.support_events where id=$1 for share',
     [events[0].support_event_id]);
    if(!parent.rowCount)return null;
   }
   const {rows}=await db.query<StoredSupportWorkSummary>(`
    select w.id as work_id,w.service_id,w.contract_profile_id,w.support_event_id,w.title,w.status,
      w.next_action,w.waiting,w.follow_up_at,w.updated_at,
      beneficiary.kind as beneficiary_kind,
      beneficiary.service_recipient_id as confirmed_recipient_id
    from factact.work w
    left join lateral (
      select d.kind,d.service_recipient_id
      from factact.support_event_beneficiary_decisions d
      where d.tenant_id=w.tenant_id and d.support_event_id=w.support_event_id
      order by d.revision desc limit 1
    ) beneficiary on true
    where w.id=$1 and w.lane='SUPPORT'
      and not exists (
       select 1 from factact.support_event_beneficiary_decisions prior
       where prior.tenant_id=w.tenant_id and prior.support_event_id=w.support_event_id
        and prior.kind='CONFIRMED'
        and prior.service_recipient_id is distinct from beneficiary.service_recipient_id
      ) ${lockWork?'for update of w':''}`,[workId]);
   const work=rows[0];
   if(!work||work.beneficiary_kind!=='CONFIRMED'||!work.confirmed_recipient_id)return null;
   const target:ResolvedAccessTarget={
    tenantId,serviceId:work.service_id,contractProfileId:work.contract_profile_id,
    scope:{kind:'WORK',serviceRecipientId:work.confirmed_recipient_id,workId},
    objectKind:'SUPPORT',operation,
   };
   if(!await this.authorizedInTransaction(db,actorId,target,at))return null;
   return work;
 }

 /**
  * Paged list of AUTHORIZED Work only. SQL filters grants/beneficiary before
  * LIMIT and the same policy kernel rechecks each projected Work. No total
  * tenant count or unauthorized candidate count leaves the transaction.
  */
 async supportWorkPage(tenantId:string,actorId:string,limit:number,cursor:ScopedSupportWorkCursor|null):Promise<ScopedSupportWorkPage>{
  if(![tenantId,actorId].every(id=>z.uuid().safeParse(id).success)||
     !Number.isInteger(limit)||limit<1||limit>50||
     (cursor&&(!z.uuid().safeParse(cursor.workId).success||!Number.isFinite(Date.parse(cursor.updatedAt)))))
   return {items:[],nextCursor:null};
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return {items:[],nextCursor:null};
  return withTenant(this.pool,tenantId,async db=>{
   const {rows}=await db.query<StoredSupportWorkSummary>(`
    select w.id as work_id,w.service_id,w.contract_profile_id,w.support_event_id,w.title,w.status,
      w.next_action,w.waiting,w.follow_up_at,w.updated_at,
      beneficiary.kind as beneficiary_kind,
      beneficiary.service_recipient_id as confirmed_recipient_id
    from factact.work w
    join factact.operators actor on actor.tenant_id=w.tenant_id and actor.id=$1 and actor.status='ACTIVE'
    join factact.tenants t on t.id=w.tenant_id and t.status='ACTIVE'
    join factact.services s on s.id=w.service_id and s.tenant_id=w.tenant_id and s.status='ACTIVE'
    join factact.contract_profiles c on c.id=w.contract_profile_id
      and c.tenant_id=w.tenant_id and c.service_id=w.service_id and c.status='ACTIVE'
      and c.effective_from<=$2::timestamptz
      and (c.effective_to is null or c.effective_to>$2::timestamptz)
    join lateral (
      select d.kind,d.service_recipient_id
      from factact.support_event_beneficiary_decisions d
      where d.tenant_id=w.tenant_id and d.support_event_id=w.support_event_id
      order by d.revision desc limit 1
    ) beneficiary on beneficiary.kind='CONFIRMED'
    join factact.service_recipients recipient
      on recipient.id=beneficiary.service_recipient_id and recipient.tenant_id=w.tenant_id
      and recipient.service_id=w.service_id and recipient.recipient_type='ORGANIZATION'
      and recipient.status='ACTIVE'
    join factact.organizations org
      on org.id=recipient.recipient_organization_id and org.tenant_id=w.tenant_id and org.status='ACTIVE'
    where w.lane='SUPPORT'
      -- Authorization and data projection must deny previously reassigned
      -- Work BEFORE LIMIT, not trim an already paginated tenant-wide result.
      and not exists (
       select 1 from factact.support_event_beneficiary_decisions prior
       where prior.tenant_id=w.tenant_id and prior.support_event_id=w.support_event_id
        and prior.kind='CONFIRMED'
        and prior.service_recipient_id is distinct from beneficiary.service_recipient_id
      )
      and ($3::timestamptz is null or (w.updated_at,w.id)<($3::timestamptz,$4::uuid))
      and exists (
       select 1 from factact.scoped_actor_grants g
       where g.tenant_id=w.tenant_id and g.actor_operator_id=$1
        and g.service_id=w.service_id and g.contract_profile_id=w.contract_profile_id
        and g.object_kind='SUPPORT' and 'READ'=any(g.operations)
        and g.status='ACTIVE' and g.effective_from<=$2::timestamptz
        and (g.effective_until is null or g.effective_until>$2::timestamptz)
        and (g.scope_kind='SERVICE'
          or (g.scope_kind='SERVICE_RECIPIENT' and g.service_recipient_id=recipient.id)
          or (g.scope_kind='WORK' and g.service_recipient_id=recipient.id and g.work_id=w.id))
      )
    order by w.updated_at desc,w.id desc limit $5`,
    [actorId,at,cursor?.updatedAt??null,cursor?.workId??null,limit]);
   const items:ScopedSupportWorkSummary[]=[];
   for(const work of rows){
    if(work.beneficiary_kind!=='CONFIRMED'||!work.confirmed_recipient_id)continue;
    const target:ResolvedAccessTarget={tenantId,serviceId:work.service_id,
     contractProfileId:work.contract_profile_id,
     scope:{kind:'WORK',serviceRecipientId:work.confirmed_recipient_id,workId:work.work_id},
     objectKind:'SUPPORT',operation:'READ'};
    if(await this.authorizedInTransaction(db,actorId,target,at))items.push(this.projectSupportWork(work));
   }
   // No hasMore/total: pagination metadata cannot reveal hidden candidates.
   const last=items.at(-1);
   const nextCursor=items.length===limit&&last
    ?Buffer.from(JSON.stringify({updatedAt:last.updatedAt,workId:last.workId})).toString('base64url')
    :null;
   return {items,nextCursor};
  },true);
 }

 private projectSupportWork(work:StoredSupportWorkSummary):ScopedSupportWorkSummary{
  return {workId:work.work_id,serviceId:work.service_id,contractProfileId:work.contract_profile_id,
   serviceRecipientId:work.confirmed_recipient_id!,title:work.title,status:work.status,
   nextAction:work.next_action,waiting:work.waiting,
   followUpAt:work.follow_up_at?.toISOString()??null,updatedAt:work.updated_at.toISOString()};
 }

 private async authorizedInTransaction(db:PoolClient,actorId:string,target:ResolvedAccessTarget,at:string):Promise<boolean>{
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
