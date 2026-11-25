import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';
import {PgSupportRepository} from './support-repository.js';
import type {SupportWork} from '../../../../../packages/domain/src/support.js';
import type {ScopedSupportWorkUpdateContext,SupportResponseRepository} from '../../../../../packages/application/src/support-ports.js';
import {randomUUID} from 'node:crypto';
import {isExplicitlyAuthorized,type ExplicitAccessGrant,type ExplicitAccessScope,type ResolvedAccessTarget} from '../../../../../packages/domain/src/scoped-access.js';
export type {ScopedSupportWorkUpdateContext} from '../../../../../packages/application/src/support-ports.js';

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
 lifecycle_revision:number;record_revision:number;
 beneficiary_kind:'CONFIRMED'|'CLEARED'|null;confirmed_recipient_id:string|null;
}

export interface ScopedSupportWorkSummary {
 workId:string;serviceId:string;contractProfileId:string;serviceRecipientId:string;
 title:string;status:'OPEN'|'IN_PROGRESS'|'COMPLETED';nextAction:string;
 waiting:boolean;followUpAt:string|null;updatedAt:string;
 lifecycleRevision:number;recordRevision:number;canUpdate:boolean;
 registryOrganizationId:string|null;
}

/** A just-received inquiry remains non-authoritative until an Operator
 * explicitly attributes its beneficiary. Being a beneficiary is NOT
 * membership verification, identity verification, or an access Grant. */
export interface ScopedIntakeReceipt {
 eventId:string;serviceId:string;workId:string|null;
 callerOrganizationId:string;callerOrganizationName:string;
 beneficiaryRevision:number;beneficiaryKind:'CONFIRMED'|'CLEARED'|null;
 canConfirm:boolean;
}
export interface ScopedIntakeOrganization {id:string;name:string}
export interface ScopedIntakeOrganizationCursor {name:string;id:string}
export interface ScopedIntakeOrganizationPage {
 items:ScopedIntakeOrganization[];
 nextCursor:ScopedIntakeOrganizationCursor|null;
}
export interface ScopedIntakeService {id:string;name:string}
export interface ScopedIntakeServiceCursor {name:string;id:string}
export interface ScopedIntakeServicePage {
 items:ScopedIntakeService[];
 nextCursor:ScopedIntakeServiceCursor|null;
}
export interface ScopedSupportWorkPage {items:ScopedSupportWorkSummary[];nextCursor:string|null}
export interface ScopedSupportWorkCursor {updatedAt:string;workId:string}
export interface ScopedSupportHistoryCursor {occurredAt:string;id:string}
export interface ScopedSupportHistoryEntry {
 id:string;revision:number;kind:string;occurredAt:string;
 responseText:string|null;disposition:'CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING'|'COMPLETED'|null;
 canCorrect:boolean;
 supersedesRecordId?:string;correctionReason?:string;
}
export interface ScopedSupportWorkHistory {
 work:ScopedSupportWorkSummary;entries:ScopedSupportHistoryEntry[];nextCursor:string|null;
}

export interface ScopedRegistryPeopleCursor {displayName:string;personId:string}
export interface ScopedRegistryPeoplePage {
 organizationId:string;organizationName:string;
 canPropose:boolean;
 items:Array<{personId:string;displayName:string;registryRevision:number;
  lifecycleStatus:'JOINING'|'ACTIVE'|'INACTIVE';
  latestOwnRequest:{changeId:string;status:'PROPOSED'|'VERIFIED'|'COMMITTED'|'REJECTED';
   proposedDisplayName:string;rejectionReason:string|null}|null}>;
 nextCursor:string|null;
}

export interface ScopedRegistryDeviceCursor {assetTag:string;deviceId:string}
export interface ScopedRegistryDevicePage {
 organizationId:string;organizationName:string;
 items:Array<{deviceId:string;assetTag:string;displayName:string;serialNumber:string|null;
  operationalStatus:'UNKNOWN'|'AVAILABLE'|'UNAVAILABLE'|'RETIRED';registryRevision:number;
  assetTagVerifiedAt:string|null;operationalStatusVerifiedAt:string|null;
  sourceState:'SOURCE_BACKED_UNVERIFIED'|'PARTIALLY_VERIFIED'|'VERIFIED'}>;
 nextCursor:string|null;
}

interface StoredSupportHistoryEntry {
 id:string;revision:number;kind:string;occurred_at:Date;
 response_text:string|null;disposition:ScopedSupportHistoryEntry['disposition'];
 supersedes_record_id:string|null;correction_reason:string|null;
 own_record:boolean;has_correction:boolean;
}

/**
 * A tenant-scoped bridge to the pure scoped-access policy. Public reads are
 * read-only; the internal update boundary deliberately uses a write transaction.
 * No API route may accept actorId or a resolved target from a Caller body.
 * The HTTP/session resolver must establish the Actor and target IDs separately.
 */
export class PgScopedAccessReader {
 constructor(private readonly pool:Pool,private readonly clock:{now():string}={now:()=>new Date().toISOString()}){}

 /** Reuse the existing verified Organization ServiceRecipient and REGISTRY READ
  * grant. The caller's affiliation is never an authorization input. No email,
  * global count, unverified observation or cross-customer query is projected. */
 async registryPeople(tenantId:string,actorId:string,serviceId:string,organizationId:string,
  limit:number,cursor:ScopedRegistryPeopleCursor|null):Promise<ScopedRegistryPeoplePage|null>{
  if(![tenantId,actorId,serviceId,organizationId].every(id=>z.uuid().safeParse(id).success)||
    !Number.isInteger(limit)||limit<1||limit>50||
    (cursor&&(!cursor.displayName||cursor.displayName.length>200||!z.uuid().safeParse(cursor.personId).success)))return null;
  const at=this.clock.now();if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const {rows:contexts}=await db.query<{recipient_id:string;contract_id:string;organization_name:string}>(`
    select r.id as recipient_id,c.id as contract_id,o.name as organization_name
    from factact.service_recipients r
    join factact.organizations o on o.tenant_id=r.tenant_id and o.id=r.recipient_organization_id
      and o.status='ACTIVE'
    join factact.services s on s.tenant_id=r.tenant_id and s.id=r.service_id and s.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id and c.service_id=s.id
      and c.status='ACTIVE' and c.effective_from<=$4::timestamptz
      and (c.effective_to is null or c.effective_to>$4::timestamptz)
    where r.tenant_id=$1 and r.service_id=$2 and r.recipient_organization_id=$3
      and r.recipient_type='ORGANIZATION' and r.status='ACTIVE'
    order by c.version desc`,[tenantId,serviceId,organizationId,at]);
   let organizationName:string|null=null,canPropose=false,selectedRecipientId:string|null=null;
   for(const context of contexts){
    if(await this.authorizedInTransaction(db,actorId,{
     tenantId,serviceId,contractProfileId:context.contract_id,
     scope:{kind:'SERVICE_RECIPIENT',serviceRecipientId:context.recipient_id},
     objectKind:'REGISTRY',operation:'READ',
    },at)){
     organizationName=context.organization_name;
     selectedRecipientId=context.recipient_id;
     canPropose=await this.authorizedInTransaction(db,actorId,{
      tenantId,serviceId,contractProfileId:context.contract_id,
      scope:{kind:'SERVICE_RECIPIENT',serviceRecipientId:context.recipient_id},
      objectKind:'REGISTRY',operation:'UPDATE',
     },at);
     break;
    }
   }
   if(organizationName===null||selectedRecipientId===null)return null;
   const {rows}=await db.query<{id:string;display_name:string;registry_revision:string;
    lifecycle_status:'JOINING'|'ACTIVE'|'INACTIVE';own_change_id:string|null;
    own_status:'PROPOSED'|'VERIFIED'|'COMMITTED'|'REJECTED'|null;
    own_proposed_display_name:string|null;own_rejection_reason:string|null}>(`
    select p.id,p.display_name,p.registry_revision,p.lifecycle_status,
      own.change_id as own_change_id,own.status as own_status,
      own.proposed_display_name as own_proposed_display_name,
      own.rejection_reason as own_rejection_reason
    from factact.people p
    left join lateral (
      select c.id as change_id,c.status,r.proposed_display_name,c.rejection_reason
      from factact.registry_edit_requests r
      join factact.changes c on c.tenant_id=r.tenant_id
        and c.registry_edit_request_id=r.id and c.subject_id=p.id
      where r.tenant_id=$1 and r.target_person_id=p.id
        and r.actor_operator_id=$6 and r.service_id=$7
        and r.service_recipient_id=$8
      order by r.created_at desc,r.id desc limit 1
    ) own on true
    where p.tenant_id=$1 and p.organization_id=$2
      and ($3::text is null or (p.display_name,p.id)>($3::text,$4::uuid))
    order by p.display_name,p.id limit $5`,
    [tenantId,organizationId,cursor?.displayName??null,cursor?.personId??null,limit,
      actorId,serviceId,selectedRecipientId]);
   const last=rows.at(-1);
   return {organizationId,organizationName,canPropose,
    items:rows.map(p=>({personId:p.id,displayName:p.display_name,
     registryRevision:Number(p.registry_revision),lifecycleStatus:p.lifecycle_status,
     latestOwnRequest:p.own_change_id&&p.own_status&&p.own_proposed_display_name?
      {changeId:p.own_change_id,status:p.own_status,
       proposedDisplayName:p.own_proposed_display_name,
       rejectionReason:p.own_rejection_reason}:null})),
    nextCursor:rows.length===limit&&last
     ?Buffer.from(JSON.stringify({displayName:last.display_name,personId:last.id})).toString('base64url')
     :null};
  },true);
 }

 /** Customer-scoped Device identification only. Raw source locator/Evidence is
  * deliberately excluded. Legacy organization-null rows and other customers
  * can neither affect pagination nor be inferred from result counts. */
 async registryDevices(tenantId:string,actorId:string,serviceId:string,organizationId:string,
  limit:number,cursor:ScopedRegistryDeviceCursor|null):Promise<ScopedRegistryDevicePage|null>{
  if(![tenantId,actorId,serviceId,organizationId].every(id=>z.uuid().safeParse(id).success)||
    !Number.isInteger(limit)||limit<1||limit>50||
    (cursor&&(!cursor.assetTag||cursor.assetTag.length>200||!z.uuid().safeParse(cursor.deviceId).success)))return null;
  const at=this.clock.now();if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const {rows:contexts}=await db.query<{recipient_id:string;contract_id:string;organization_name:string}>(`
    select r.id as recipient_id,c.id as contract_id,o.name as organization_name
    from factact.service_recipients r
    join factact.organizations o on o.tenant_id=r.tenant_id and o.id=r.recipient_organization_id
      and o.status='ACTIVE'
    join factact.services s on s.tenant_id=r.tenant_id and s.id=r.service_id and s.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id and c.service_id=s.id
      and c.status='ACTIVE' and c.effective_from<=$4::timestamptz
      and (c.effective_to is null or c.effective_to>$4::timestamptz)
    where r.tenant_id=$1 and r.service_id=$2 and r.recipient_organization_id=$3
      and r.recipient_type='ORGANIZATION' and r.status='ACTIVE'
    order by c.version desc`,[tenantId,serviceId,organizationId,at]);
   let organizationName:string|null=null,selectedRecipient:string|null=null,selectedContract:string|null=null;
   for(const context of contexts){
    const exact=(await db.query(`select 1 from factact.scoped_actor_grants g
      where g.tenant_id=$1 and g.actor_operator_id=$2 and g.service_id=$3
        and g.contract_profile_id=$4 and g.scope_kind='SERVICE_RECIPIENT'
        and g.service_recipient_id=$5 and g.work_id is null
        and g.object_kind='REGISTRY' and 'READ'=any(g.operations)
        and g.status='ACTIVE' and g.effective_from<=$6::timestamptz
        and (g.effective_until is null or g.effective_until>$6::timestamptz) limit 1`,
      [tenantId,actorId,serviceId,context.contract_id,context.recipient_id,at])).rowCount===1;
    if(exact&&await this.authorizedInTransaction(db,actorId,{
     tenantId,serviceId,contractProfileId:context.contract_id,
     scope:{kind:'SERVICE_RECIPIENT',serviceRecipientId:context.recipient_id},
     objectKind:'REGISTRY',operation:'READ',
    },at)){organizationName=context.organization_name;selectedRecipient=context.recipient_id;
      selectedContract=context.contract_id;break;}
   }
   if(organizationName===null||selectedRecipient===null||selectedContract===null)return null;
   const {rows}=await db.query<{id:string;asset_tag:string;display_name:string;
    serial_number:string|null;device_status:'UNKNOWN'|'AVAILABLE'|'UNAVAILABLE'|'RETIRED';
    registry_revision:string;asset_verified_at:Date|null;status_verified_at:Date|null}>(`
    select d.id,d.asset_tag,d.display_name,d.serial_number,d.device_status,d.registry_revision,
      d.asset_verified_at,d.status_verified_at
    from factact.device_scoped_registry_read($1,$2,$3,$4,$5,$6,$7,$8,$9) d`,
    [tenantId,actorId,serviceId,selectedContract,selectedRecipient,organizationId,limit,
      cursor?.assetTag??null,cursor?.deviceId??null]);
   const last=rows.at(-1);
   return {organizationId,organizationName,items:rows.map(d=>({deviceId:d.id,
    assetTag:d.asset_tag,displayName:d.display_name,serialNumber:d.serial_number,
    operationalStatus:d.device_status,registryRevision:Number(d.registry_revision),
    assetTagVerifiedAt:d.asset_verified_at?.toISOString()??null,
    operationalStatusVerifiedAt:d.status_verified_at?.toISOString()??null,
    sourceState:d.asset_verified_at&&d.status_verified_at?'VERIFIED':
      d.asset_verified_at||d.status_verified_at?'PARTIALLY_VERIFIED':'SOURCE_BACKED_UNVERIFIED'})),
    nextCursor:rows.length===limit&&last?Buffer.from(JSON.stringify({
     assetTag:last.asset_tag,deviceId:last.id})).toString('base64url'):null};
  },true);
 }

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

 /** Server-owned UPDATE transaction boundary, invoked only by validated
  * scoped SUPPORT application commands. Beneficiary, effective Grant and Actor
  * are resolved from the DB in the mutation/Audit transaction. Unauthorized
  * Work is never passed to the callback. */
 async runSupportWorkUpdate<T>(tenantId:string,actorId:string,workId:string,
  mutation:(work:ScopedSupportWorkUpdateContext)=>Promise<T>):Promise<T|null>{
  if(![tenantId,actorId,workId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   // Mandatory first lock: Grant INSERT/UPDATE/DELETE and Actor deactivation
   // acquire the identical actor-keyed transaction lock in DB triggers.
   // A revoke cannot commit between authorization and this Work's COMMIT.
   // This does not grant factact_runtime UPDATE rights on privileged tables.
   await db.query('select factact.lock_scoped_actor_authority($1::uuid,$2::uuid)',
    [tenantId,actorId]);
   const work=await this.authorizedSupportWork(db,tenantId,actorId,workId,at,'UPDATE',true);
   if(!work)return null;
   const repository=new PgSupportRepository(db,tenantId);
   const assertWork=(id:string)=>{
    if(id!==workId)throw Error('SCOPED_UPDATE_TARGET_MISMATCH');
   };
   const assertEvent=(id:string)=>{
    if(id!==work.support_event_id)throw Error('SCOPED_UPDATE_TARGET_MISMATCH');
   };
   const assertRecord=(row:{tenantId:string;workId:string;recordedByOperatorId:string})=>{
    assertWork(row.workId);
    if(row.tenantId!==tenantId||row.recordedByOperatorId!==actorId)
     throw Error('SCOPED_UPDATE_ACTOR_MISMATCH');
   };
   const progress=async(updated:SupportWork)=>{
    assertWork(updated.id);
    if(updated.tenantId!==tenantId||
       updated.serviceId!==work.service_id||updated.contractProfileId!==work.contract_profile_id||
       updated.supportEventId!==work.support_event_id)
     throw Error('SCOPED_UPDATE_TARGET_MISMATCH');
    await repository.progress(updated);
   };
   const audit:ScopedSupportWorkUpdateContext['audit']=async(eventType,metadata)=>repository.audit({
    id:randomUUID(),tenantId,aggregateType:'SUPPORT_EVENT',aggregateId:work.support_event_id,
    eventType,actorOperatorId:actorId,occurredAt:this.clock.now(),metadataJson:metadata,
   });
   const response:SupportResponseRepository={
    core:{
     service:id=>{if(id!==work.service_id)throw Error('SCOPED_UPDATE_TARGET_MISMATCH');return repository.core.service(id);},
     contract:id=>{if(id!==work.contract_profile_id)throw Error('SCOPED_UPDATE_TARGET_MISMATCH');return repository.core.contract(id);},
    },
    work:(id)=>{assertWork(id);return repository.work(workId,true);},
    event:id=>{assertEvent(id);return repository.event(work.support_event_id);},
    records:id=>{assertWork(id);return repository.records(workId);},
    lifecycleEvents:id=>{assertWork(id);return repository.lifecycleEvents(workId);},
    followUps:id=>{assertWork(id);return repository.followUps(workId);},
    closeDecisions:id=>{assertWork(id);return repository.closeDecisions(workId);},
    insertRecord:row=>{
     assertRecord(row);
     if(row.kind!=='RESPONSE'&&row.kind!=='RESPONSE_CORRECTION')
      throw Error('SCOPED_UPDATE_RECORD_KIND_MISMATCH');
     return repository.insertRecord(row);
    },
    insertLifecycleEvent:row=>{
     assertRecord(row);
     if(row.kind!=='RESPONSE_RECORDED')throw Error('SCOPED_UPDATE_LIFECYCLE_KIND_MISMATCH');
     return repository.insertLifecycleEvent(row);
    },
    insertFollowUp:row=>{
     assertRecord(row);
     if(row.kind!=='SET')throw Error('SCOPED_UPDATE_FOLLOW_UP_KIND_MISMATCH');
     return repository.insertFollowUp(row);
    },
    insertCloseDecision:async()=>{throw Error('SCOPED_CLOSE_NOT_AUTHORIZED');},
    verificationItems:async()=>{throw Error('SCOPED_CLOSE_NOT_AUTHORIZED');},
    progress,
    audit:row=>{
     if(row.tenantId!==tenantId||row.aggregateType!=='SUPPORT_EVENT'||
        row.aggregateId!==work.support_event_id||row.actorOperatorId!==actorId)
      throw Error('SCOPED_UPDATE_ACTOR_MISMATCH');
     return audit(row.eventType,row.metadataJson);
    },
   };
   const context:ScopedSupportWorkUpdateContext={
    work:()=>repository.work(workId,true),
    progress,audit,response,
   };
   const result=await mutation(context);
   // Still re-check time-bound eligibility before commit. The actor-keyed
   // transaction lock closes the Grant/Actor status change-to-COMMIT race.
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
 /**
  * Entry point for the existing service-first SUPPORT intake.
  * Only an explicitly delegated SERVICE-level SUPPORT CREATE grant makes a
  * Service visible. No Organization, Person or Work data are projected here.
  * REGISTRY reads remain a separate independent gate in subsequent slices.
  */
 /** The only SCOPED intake write entry. Existing SUPPORT Commands produce the
  * Event, Observation, Human Evaluation, optional Work and Audit. Rejected
  * actors never receive a Repository nor observe customer rows. */
 async runSupportIntake<T>(tenantId:string,actorId:string,serviceId:string,
  mutation:(repository:PgSupportRepository)=>Promise<T>):Promise<T|null>{
  if(![tenantId,actorId,serviceId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   // Grant issue/revocation and Actor deactivation share this lock.
   await db.query('select factact.lock_scoped_actor_authority($1::uuid,$2::uuid)',
    [tenantId,actorId]);
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,at))return null;
   const result=await mutation(new PgSupportRepository(db,tenantId));
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,this.clock.now()))
    throw Error('SCOPED_INTAKE_AUTHORITY_CHANGED');
   return result;
  });
 }

 private async scopedCanCreateService(db:PoolClient,tenantId:string,actorId:string,
  serviceId:string,at:string):Promise<boolean>{
  const {rows}=await db.query<{contract_id:string}>(`
   select c.id as contract_id from factact.services s
   join factact.tenants t on t.id=s.tenant_id and t.status='ACTIVE'
   join factact.operators a on a.tenant_id=s.tenant_id
      and a.id=$1 and a.status='ACTIVE' and a.read_authority_mode='SCOPED'
   join factact.contract_profiles c on c.tenant_id=s.tenant_id
      and c.service_id=s.id and c.status='ACTIVE'
      and c.effective_from<=$3::timestamptz
      and (c.effective_to is null or c.effective_to>$3::timestamptz)
      and c.configuration_json->'support'->>'enabled'='true'
   where s.id=$2 and s.status='ACTIVE'`,[actorId,serviceId,at]);
  if(rows.length!==1)return false;
  return this.authorizedInTransaction(db,actorId,{
   tenantId,serviceId,contractProfileId:rows[0]!.contract_id,
   scope:{kind:'SERVICE'},objectKind:'SUPPORT',operation:'CREATE',
  },at);
 }

 /** Reuse the common SUPPORT command for an EXISTING Person, but only
  * after resolving one active recipient company under the selected Service
  * and independent recipient-scoped REGISTRY READ. Caller status is not proof
  * of entitlement or a verified Fact; beneficiary remains a Human decision. */
 async runSupportExistingCallerIntake<T>(tenantId:string,actorId:string,
  serviceId:string,personId:string,
  mutation:(repository:PgSupportRepository)=>Promise<T>):Promise<T|null>{
  if(![tenantId,actorId,serviceId,personId].every(id=>z.uuid().safeParse(id).success))
   return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   await db.query('select factact.lock_scoped_actor_authority($1::uuid,$2::uuid)',
    [tenantId,actorId]);
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,at))
    return null;
   const {rows}=await db.query<{service_recipient_id:string;contract_profile_id:string}>(`
    select recipient.id as service_recipient_id,c.id as contract_profile_id
    from factact.people p
    join factact.organizations org on org.tenant_id=p.tenant_id
      and org.id=p.organization_id and org.status='ACTIVE'
    join factact.service_recipients recipient on recipient.tenant_id=org.tenant_id
      and recipient.service_id=$3 and recipient.recipient_organization_id=org.id
      and recipient.recipient_type='ORGANIZATION' and recipient.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=recipient.tenant_id
      and c.service_id=recipient.service_id and c.status='ACTIVE'
      and c.effective_from<=$5::timestamptz
      and (c.effective_to is null or c.effective_to>$5::timestamptz)
    where p.tenant_id=$1 and p.id=$4
    for share of p,recipient`,[tenantId,actorId,serviceId,personId,at]);
   if(rows.length!==1)return null;
   const target:ResolvedAccessTarget={
    tenantId,serviceId,contractProfileId:rows[0]!.contract_profile_id,
    scope:{kind:'SERVICE_RECIPIENT',
     serviceRecipientId:rows[0]!.service_recipient_id},
    objectKind:'REGISTRY',operation:'READ',
   };
   if(!await this.authorizedInTransaction(db,actorId,target,at))return null;
   const result=await mutation(new PgSupportRepository(db,tenantId));
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,this.clock.now())||
      !await this.authorizedInTransaction(db,actorId,target,this.clock.now()))
    throw Error('SCOPED_EXISTING_CALLER_AUTHORITY_CHANGED');
   return result;
  });
 }

 /** The own receipt is distinct from a tenant-wide SUPPORT detail.
  * The caller's recorded affiliation is shown only to its receiving
  * Actor. The selected beneficiary is not populated automatically. */
 async scopedIntakeReceipt(tenantId:string,actorId:string,serviceId:string,
  eventId:string):Promise<ScopedIntakeReceipt|null>{
  if(![tenantId,actorId,serviceId,eventId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,at))return null;
   const receipt=await this.ownIntake(db,tenantId,actorId,serviceId,eventId,at);
   if(!receipt)return null;
   const canConfirm=await this.authorizedInTransaction(db,actorId,{
    tenantId,serviceId,contractProfileId:receipt.contractProfileId,
    scope:{kind:'SERVICE'},objectKind:'SUPPORT',operation:'UPDATE',
   },at);
   return {eventId:receipt.eventId,serviceId,workId:receipt.workId,
    callerOrganizationId:receipt.callerOrganizationId,
    callerOrganizationName:receipt.callerOrganizationName,
    beneficiaryRevision:receipt.beneficiaryRevision,
    beneficiaryKind:receipt.beneficiaryKind,canConfirm};
  },true);
 }

 private async ownIntake(db:PoolClient,tenantId:string,actorId:string,
  serviceId:string,eventId:string,at:string):Promise<{
   eventId:string;contractProfileId:string;callerOrganizationId:string;
   callerOrganizationName:string;beneficiaryRevision:number;
   beneficiaryKind:'CONFIRMED'|'CLEARED'|null;workId:string|null;
  }|null>{
  const {rows}=await db.query<{
   event_id:string;contract_profile_id:string;
   caller_organization_id:string;caller_organization_name:string;
   beneficiary_revision:number;beneficiary_kind:'CONFIRMED'|'CLEARED'|null;
   work_id:string|null;
  }>(`
   select e.id as event_id,e.contract_profile_id,
    org.id as caller_organization_id,org.name as caller_organization_name,
    coalesce(latest.revision,0)::integer as beneficiary_revision,
    latest.kind as beneficiary_kind,w.id as work_id
   from factact.support_events e
   join factact.contract_profiles c on c.tenant_id=e.tenant_id
     and c.id=e.contract_profile_id and c.service_id=e.service_id
     and c.status='ACTIVE' and c.effective_from<=$5::timestamptz
     and (c.effective_to is null or c.effective_to>$5::timestamptz)
   join factact.service_recipients caller on caller.tenant_id=e.tenant_id
     and caller.id=e.service_recipient_id and caller.recipient_type='PERSON'
   join factact.people person on person.tenant_id=caller.tenant_id
     and person.id=caller.recipient_id
   join factact.organizations org on org.tenant_id=person.tenant_id
     and org.id=person.organization_id and org.status='ACTIVE'
   left join factact.work w on w.tenant_id=e.tenant_id
     and w.support_event_id=e.id and w.lane='SUPPORT'
   left join lateral (
    select d.kind,d.revision
    from factact.support_event_beneficiary_decisions d
    where d.tenant_id=e.tenant_id and d.support_event_id=e.id
    order by d.revision desc limit 1
   ) latest on true
   where e.tenant_id=$1 and e.created_by_operator_id=$2
     and e.service_id=$3 and e.id=$4
     and e.caller_input_snapshot->>'kind' in ('NEW','EXISTING')`,
   [tenantId,actorId,serviceId,eventId,at]);
  const row=rows[0];
  if(!row)return null;
  return {eventId:row.event_id,contractProfileId:row.contract_profile_id,
   callerOrganizationId:row.caller_organization_id,
   callerOrganizationName:row.caller_organization_name,
   beneficiaryRevision:row.beneficiary_revision,
   beneficiaryKind:row.beneficiary_kind,workId:row.work_id};
 }

 /** All beneficiary changes are human-triggered, serialized with the Actor
  * grant lock and Event row lock used by the existing SupportCommands. */
 async runSupportIntakeBeneficiary<T>(tenantId:string,actorId:string,serviceId:string,
  eventId:string,organizationId:string,
  mutation:(repository:PgSupportRepository)=>Promise<T>):Promise<T|null>{
  if(![tenantId,actorId,serviceId,eventId,organizationId]
    .every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   await db.query('select factact.lock_scoped_actor_authority($1::uuid,$2::uuid)',
    [tenantId,actorId]);
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,at))return null;
   const own=await this.ownIntake(db,tenantId,actorId,serviceId,eventId,at);
   if(!own)return null;
   const mayUpdate=await this.authorizedInTransaction(db,actorId,{
    tenantId,serviceId,contractProfileId:own.contractProfileId,
    scope:{kind:'SERVICE'},objectKind:'SUPPORT',operation:'UPDATE',
   },at);
   if(!mayUpdate)return null;
   const ownAffiliation=organizationId===own.callerOrganizationId;
   if(!ownAffiliation){
    const registry=await this.authorizedInTransaction(db,actorId,{
     tenantId,serviceId,contractProfileId:own.contractProfileId,
     scope:{kind:'SERVICE'},objectKind:'REGISTRY',operation:'READ',
    },at);
    if(!registry)return null;
    const target=await db.query(`
      select 1 from factact.service_recipients recipient
      join factact.organizations org on org.tenant_id=recipient.tenant_id
        and org.id=recipient.recipient_organization_id
        and org.status='ACTIVE'
      where recipient.tenant_id=$1 and recipient.service_id=$2
        and recipient.recipient_type='ORGANIZATION'
        and recipient.status='ACTIVE'
        and recipient.recipient_organization_id=$3`,
     [tenantId,serviceId,organizationId]);
    if(!target.rowCount)return null;
   }
   const result=await mutation(new PgSupportRepository(db,tenantId));
   const current=this.clock.now();
   if(!await this.scopedCanCreateService(db,tenantId,actorId,serviceId,current)||
     !await this.authorizedInTransaction(db,actorId,{
      tenantId,serviceId,contractProfileId:own.contractProfileId,
      scope:{kind:'SERVICE'},objectKind:'SUPPORT',operation:'UPDATE',
     },current)||
     (!ownAffiliation&&!await this.authorizedInTransaction(db,actorId,{
      tenantId,serviceId,contractProfileId:own.contractProfileId,
      scope:{kind:'SERVICE'},objectKind:'REGISTRY',operation:'READ',
     },current)))
    throw Error('SCOPED_BENEFICIARY_AUTHORITY_CHANGED');
   return result;
  });
 }

 async scopedIntakeServices(tenantId:string,actorId:string,limit:number,
  cursor:ScopedIntakeServiceCursor|null):Promise<ScopedIntakeServicePage>{
  if(![tenantId,actorId].every(id=>z.uuid().safeParse(id).success)||
    !Number.isInteger(limit)||limit<1||limit>20||
    (cursor&&(!z.uuid().safeParse(cursor.id).success||!cursor.name||
      cursor.name.length>200)))return {items:[],nextCursor:null};
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return {items:[],nextCursor:null};
  return withTenant(this.pool,tenantId,async db=>{
   // Filter authorization before LIMIT. Never page a tenant-wide service list
   // and then hide unauthorized rows or return tenant-level total counts.
   const {rows}=await db.query<{id:string;name:string}>(`
    select s.id,s.name from factact.services s
    join factact.tenants t on t.id=s.tenant_id and t.status='ACTIVE'
    join factact.operators a on a.tenant_id=s.tenant_id
      and a.id=$1 and a.status='ACTIVE' and a.read_authority_mode='SCOPED'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id
      and c.service_id=s.id and c.status='ACTIVE'
      and c.effective_from<=$2::timestamptz
      and (c.effective_to is null or c.effective_to>$2::timestamptz)
      and c.configuration_json->'support'->>'enabled'='true'
    where s.status='ACTIVE'
      and (select count(*) from factact.contract_profiles only_current
       where only_current.tenant_id=s.tenant_id and only_current.service_id=s.id
        and only_current.status='ACTIVE'
        and only_current.effective_from<=$2::timestamptz
        and (only_current.effective_to is null or only_current.effective_to>$2::timestamptz))=1
      and exists (
        select 1 from factact.scoped_actor_grants g
        where g.tenant_id=s.tenant_id
          and g.actor_operator_id=a.id and g.service_id=s.id
          and g.contract_profile_id=c.id and g.scope_kind='SERVICE'
          and g.object_kind='SUPPORT' and 'CREATE'=any(g.operations)
          and g.status='ACTIVE' and g.effective_from<=$2::timestamptz
          and (g.effective_until is null or g.effective_until>$2::timestamptz))
      and ($3::text is null or (s.name,s.id)>($3::text,$4::uuid))
    order by s.name,s.id limit $5`,
    [actorId,at,cursor?.name??null,cursor?.id??null,limit+1]);
   const items=rows.slice(0,limit);
   const last=items.at(-1);
   return {items,nextCursor:rows.length>limit&&last?
    {name:last.name,id:last.id}:null};
  },true);
 }

 /**
  * Read only registered Organization recipients of one explicitly allowed
  * Service. REGISTERED is not synonymous with membership/verified eligibility.
  * SUPPORT CREATE cannot unlock Registry browsing: REGISTRY READ is independent.
  */
 async scopedIntakeOrganizations(tenantId:string,actorId:string,serviceId:string,
  limit:number,cursor:ScopedIntakeOrganizationCursor|null):Promise<ScopedIntakeOrganizationPage>{
  const empty:ScopedIntakeOrganizationPage={items:[],nextCursor:null};
  if(![tenantId,actorId,serviceId].every(id=>z.uuid().safeParse(id).success)||
    !Number.isInteger(limit)||limit<1||limit>20||
    (cursor&&(!z.uuid().safeParse(cursor.id).success||!cursor.name||
      cursor.name.length>200)))return empty;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return empty;
  return withTenant(this.pool,tenantId,async db=>{
   const context=await db.query<{id:string}>(`
    select c.id from factact.services s
    join factact.tenants t on t.id=s.tenant_id and t.status='ACTIVE'
    join factact.operators a on a.tenant_id=s.tenant_id
      and a.id=$1 and a.status='ACTIVE' and a.read_authority_mode='SCOPED'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id
      and c.service_id=s.id and c.status='ACTIVE'
      and c.effective_from<=$3::timestamptz
      and (c.effective_to is null or c.effective_to>$3::timestamptz)
      and c.configuration_json->'support'->>'enabled'='true'
    where s.id=$2 and s.status='ACTIVE'`,[actorId,serviceId,at]);
   if(context.rows.length!==1)return empty;
   const contractProfileId=context.rows[0]!.id;
   for(const [objectKind,operation] of [
    ['SUPPORT','CREATE'],['REGISTRY','READ'],
   ] as const){
    if(!await this.authorizedInTransaction(db,actorId,{
      tenantId,serviceId,contractProfileId,scope:{kind:'SERVICE'},
      objectKind,operation,
    },at))return empty;
   }
   const {rows}=await db.query<ScopedIntakeOrganization>(`
     select distinct o.id,o.name
     from factact.service_recipients r
     join factact.organizations o on o.tenant_id=r.tenant_id
       and o.id=r.recipient_organization_id and o.status='ACTIVE'
     where r.service_id=$1 and r.status='ACTIVE'
       and r.recipient_type='ORGANIZATION'
       and ($2::text is null or (o.name,o.id)>($2::text,$3::uuid))
     order by o.name,o.id limit $4`,
     [serviceId,cursor?.name??null,cursor?.id??null,limit+1]);
   const items=rows.slice(0,limit),last=items.at(-1);
   return {items,nextCursor:rows.length>limit&&last?
    {name:last.name,id:last.id}:null};
  },true);
 }

 async supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>{
  if(![tenantId,actorId,workId].every(id=>z.uuid().safeParse(id).success))return null;
  const at=this.clock.now();
  if(!Number.isFinite(Date.parse(at)))return null;
  return withTenant(this.pool,tenantId,async db=>{
   const work=await this.authorizedSupportWork(db,tenantId,actorId,workId,at);
   if(!work)return null;
   const canUpdate=await this.canUpdateWork(db,tenantId,actorId,work,at);
   const registryOrganizationId=await this.readableRegistryOrganization(db,tenantId,actorId,work,at);
   return this.projectSupportWork(work,canUpdate,registryOrganizationId);
  },true);
 }

 /** Only Work-local recorded responses/corrections and metadata-only state transitions.
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
   const canUpdate=await this.canUpdateWork(db,tenantId,actorId,work,at);
   const registryOrganizationId=await this.readableRegistryOrganization(db,tenantId,actorId,work,at);
   const {rows}=await db.query<StoredSupportHistoryEntry>(`
    with entries as (
     select r.id,r.revision,'RESPONSE'::text as kind,r.recorded_at as occurred_at,
      r.notes->>'responseText' as response_text,r.notes->>'disposition' as disposition,
      null::text as supersedes_record_id,null::text as correction_reason,
      (r.recorded_by_operator_id=$6::uuid) as own_record,
      exists(select 1 from factact.support_work_records newer
       where newer.tenant_id=r.tenant_id and newer.work_id=r.work_id
        and newer.kind='RESPONSE_CORRECTION' and newer.notes->>'supersedesRecordId'=r.id::text) as has_correction
     from factact.support_work_records r
     where r.tenant_id=$2 and r.work_id=$1 and r.kind='RESPONSE'
      and jsonb_typeof(r.notes->'responseText')='string'
      and r.notes->>'disposition' in ('CUSTOMER_WAIT','INVESTIGATING','MONITORING','COMPLETED')
     union all
     select r.id,r.revision,'RESPONSE_CORRECTION'::text,r.recorded_at,
      r.notes->>'responseText',null::text,r.notes->>'supersedesRecordId',r.correction_reason,
      (r.recorded_by_operator_id=$6::uuid),
      exists(select 1 from factact.support_work_records newer
       where newer.tenant_id=r.tenant_id and newer.work_id=r.work_id
        and newer.kind='RESPONSE_CORRECTION' and newer.notes->>'supersedesRecordId'=r.id::text)
     from factact.support_work_records r
     where r.tenant_id=$2 and r.work_id=$1 and r.kind='RESPONSE_CORRECTION'
      and jsonb_typeof(r.notes->'responseText')='string'
      and jsonb_typeof(r.notes->'supersedesRecordId')='string'
     union all
     select e.id,e.revision,e.kind,e.recorded_at,null::text,null::text,null::text,null::text,
      false::boolean,false::boolean
     from factact.support_work_lifecycle_events e
     where e.tenant_id=$2 and e.work_id=$1
      and e.kind in ('CONTINUATION_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED','REOPENED')
    )
    select id,revision,kind,occurred_at,response_text,disposition,
     supersedes_record_id,correction_reason,own_record,has_correction from entries
    where ($3::timestamptz is null or (occurred_at,id)<($3::timestamptz,$4::uuid))
    order by occurred_at desc,id desc limit $5`,
    [workId,tenantId,cursor?.occurredAt??null,cursor?.id??null,limit,actorId]);
   const entries:ScopedSupportHistoryEntry[]=rows.map(row=>({
    id:row.id,revision:row.revision,kind:row.kind,occurredAt:row.occurred_at.toISOString(),
    responseText:row.response_text,disposition:row.disposition,
    canCorrect:canUpdate&&row.own_record&&!row.has_correction&&
      (row.kind==='RESPONSE_CORRECTION'||
       (row.kind==='RESPONSE'&&row.disposition!=='COMPLETED')),
    ...(row.kind==='RESPONSE_CORRECTION'?{
     supersedesRecordId:row.supersedes_record_id!,correctionReason:row.correction_reason!}:{}),
   }));
   const last=entries.at(-1);
   const nextCursor=entries.length===limit&&last
    ?Buffer.from(JSON.stringify({occurredAt:last.occurredAt,id:last.id})).toString('base64url')
    :null;
   return {work:this.projectSupportWork(work,canUpdate,registryOrganizationId),entries,nextCursor};
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
      w.next_action,w.waiting,w.follow_up_at,w.updated_at,w.lifecycle_revision,
      (select coalesce(max(r.revision),0)::integer from factact.support_work_records r
       where r.tenant_id=w.tenant_id and r.work_id=w.id) as record_revision,
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
      w.next_action,w.waiting,w.follow_up_at,w.updated_at,w.lifecycle_revision,
      (select coalesce(max(r.revision),0)::integer from factact.support_work_records r
       where r.tenant_id=w.tenant_id and r.work_id=w.id) as record_revision,
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
    if(await this.authorizedInTransaction(db,actorId,target,at)){
     const canUpdate=await this.canUpdateWork(db,tenantId,actorId,work,at);
     const registryOrganizationId=await this.readableRegistryOrganization(db,tenantId,actorId,work,at);
     items.push(this.projectSupportWork(work,canUpdate,registryOrganizationId));
    }
   }
   // No hasMore/total: pagination metadata cannot reveal hidden candidates.
   const last=items.at(-1);
   const nextCursor=items.length===limit&&last
    ?Buffer.from(JSON.stringify({updatedAt:last.updatedAt,workId:last.workId})).toString('base64url')
    :null;
   return {items,nextCursor};
  },true);
 }

 private async canUpdateWork(db:PoolClient,tenantId:string,actorId:string,
  work:StoredSupportWorkSummary,at:string):Promise<boolean>{
   if(work.status==='COMPLETED'||!work.confirmed_recipient_id)return false;
   return this.authorizedInTransaction(db,actorId,{
    tenantId,serviceId:work.service_id,contractProfileId:work.contract_profile_id,
    scope:{kind:'WORK',serviceRecipientId:work.confirmed_recipient_id,workId:work.work_id},
    objectKind:'SUPPORT',operation:'UPDATE',
   },at);
 }

 /** A link to an Organization directory is separately gated by REGISTRY READ
  * on this Work's latest confirmed beneficiary; SUPPORT READ alone gives no
  * Directory visibility. Resolve the current recipient and grant in the same
  * read-only tenant snapshot as the Work summary. */
 private async readableRegistryOrganization(db:PoolClient,tenantId:string,actorId:string,
  work:StoredSupportWorkSummary,at:string):Promise<string|null>{
  if(work.beneficiary_kind!=='CONFIRMED'||!work.confirmed_recipient_id)return null;
  const {rows}=await db.query<{organization_id:string}>(`
   select r.recipient_organization_id as organization_id
   from factact.service_recipients r
   join factact.organizations o on o.tenant_id=r.tenant_id
    and o.id=r.recipient_organization_id and o.status='ACTIVE'
   where r.tenant_id=$1 and r.id=$2 and r.service_id=$3
    and r.recipient_type='ORGANIZATION' and r.status='ACTIVE'`,
   [tenantId,work.confirmed_recipient_id,work.service_id]);
  if(!rows[0]?.organization_id)return null;
  const allowed=await this.authorizedInTransaction(db,actorId,{
   tenantId,serviceId:work.service_id,contractProfileId:work.contract_profile_id,
   scope:{kind:'SERVICE_RECIPIENT',serviceRecipientId:work.confirmed_recipient_id},
   objectKind:'REGISTRY',operation:'READ',
  },at);
  return allowed?rows[0].organization_id:null;
 }

 private projectSupportWork(work:StoredSupportWorkSummary,canUpdate=false,
  registryOrganizationId:string|null=null):ScopedSupportWorkSummary{
  return {workId:work.work_id,serviceId:work.service_id,contractProfileId:work.contract_profile_id,
   serviceRecipientId:work.confirmed_recipient_id!,title:work.title,status:work.status,
   nextAction:work.next_action,waiting:work.waiting,
   followUpAt:work.follow_up_at?.toISOString()??null,updatedAt:work.updated_at.toISOString(),
   lifecycleRevision:work.lifecycle_revision,recordRevision:work.record_revision,canUpdate,
   registryOrganizationId};
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
