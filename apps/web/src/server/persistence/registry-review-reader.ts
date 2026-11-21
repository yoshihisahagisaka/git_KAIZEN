import type {Pool} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';

export interface RegistryReviewCursor {createdAt:string;changeId:string}
export interface RegistryReviewItem {
 changeId:string;serviceId:string;personId:string;organizationName:string;
 currentDisplayName:string;originalDisplayName:string;proposedDisplayName:string;
 reason:string;sourceInformationState:'UNVERIFIED_STATEMENT';
 status:'PROPOSED'|'VERIFIED';createdAt:string;canConfirm:boolean;
}
export interface RegistryReviewPage {items:RegistryReviewItem[];nextCursor:string|null}

interface ReviewRow {
 change_id:string;service_id:string;person_id:string;organization_name:string;
 current_display_name:string;original_display_name:string;proposed_display_name:string;
 reason:string;source_information_state:'UNVERIFIED_STATEMENT';
 status:'PROPOSED'|'VERIFIED';created_at:Date;
 verified_by_operator_id:string|null;can_approve:boolean;
}

/** Every list row is filtered by a currently effective target-specific REVIEW
 * Grant, active Actor/Tenant/Service/Contract/Recipient and actual Person
 * Organization. No Tenant-wide status count, Caller inference or Role fallback. */
export class PgRegistryReviewReader {
 constructor(private readonly pool:Pool){}

 async pending(tenantId:string,actorId:string,limit:number,
  cursor:RegistryReviewCursor|null):Promise<RegistryReviewPage>{
  if(![tenantId,actorId].every(id=>z.uuid().safeParse(id).success)||
    !Number.isInteger(limit)||limit<1||limit>50||
    (cursor&&(!z.uuid().safeParse(cursor.changeId).success||
      !Number.isFinite(Date.parse(cursor.createdAt)))))throw Error('INVALID_REGISTRY_REVIEW_SCOPE');
  return withTenant(this.pool,tenantId,async db=>{
   const {rows}=await db.query<ReviewRow>(`
    with eligible as (
      select c.id as change_id,c.status,c.created_at,c.verified_by_operator_id,
        r.service_id,r.target_person_id as person_id,
        r.original_display_name,r.proposed_display_name,r.reason,r.source_information_state,
        p.display_name as current_display_name,o.name as organization_name,
        exists(select 1 from factact.scoped_actor_grants approve
          where approve.tenant_id=r.tenant_id and approve.actor_operator_id=$2
            and approve.service_id=r.service_id
            and approve.contract_profile_id=r.contract_profile_id
            and approve.object_kind='REGISTRY' and 'APPROVE'=any(approve.operations)
            and approve.status='ACTIVE' and approve.effective_from<=now()
            and (approve.effective_until is null or approve.effective_until>now())
            and (approve.scope_kind='SERVICE' or
              (approve.scope_kind='SERVICE_RECIPIENT'
               and approve.service_recipient_id=r.service_recipient_id))) as can_approve
      from factact.changes c
      join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
        and r.id=c.registry_edit_request_id and r.target_person_id=c.subject_id
      join factact.people p on p.tenant_id=r.tenant_id and p.id=r.target_person_id
      join factact.organizations o on o.tenant_id=p.tenant_id
        and o.id=p.organization_id and o.status='ACTIVE'
      join factact.tenants t on t.id=r.tenant_id and t.status='ACTIVE'
      join factact.operators reviewer on reviewer.tenant_id=r.tenant_id
        and reviewer.id=$2 and reviewer.status='ACTIVE'
      join factact.services s on s.tenant_id=r.tenant_id
        and s.id=r.service_id and s.status='ACTIVE'
      join factact.contract_profiles contract on contract.tenant_id=r.tenant_id
        and contract.id=r.contract_profile_id and contract.service_id=s.id
        and contract.status='ACTIVE' and contract.effective_from<=now()
        and (contract.effective_to is null or contract.effective_to>now())
      join factact.service_recipients recipient on recipient.tenant_id=r.tenant_id
        and recipient.id=r.service_recipient_id and recipient.service_id=s.id
        and recipient.recipient_type='ORGANIZATION' and recipient.status='ACTIVE'
        and recipient.recipient_organization_id=p.organization_id
      where c.tenant_id=$1 and c.change_type='KNOWLEDGE_STATE_CHANGE'
        and c.change_kind='PERSON_DISPLAY_NAME_CORRECTION'
        and c.status in ('PROPOSED','VERIFIED')
        and r.actor_operator_id<>$2
        and exists(select 1 from factact.scoped_actor_grants review
          where review.tenant_id=r.tenant_id and review.actor_operator_id=$2
            and review.service_id=r.service_id
            and review.contract_profile_id=r.contract_profile_id
            and review.object_kind='REGISTRY' and 'REVIEW'=any(review.operations)
            and review.status='ACTIVE' and review.effective_from<=now()
            and (review.effective_until is null or review.effective_until>now())
            and (review.scope_kind='SERVICE' or
              (review.scope_kind='SERVICE_RECIPIENT'
               and review.service_recipient_id=r.service_recipient_id)))
    )
    select * from eligible
    where ($3::timestamptz is null or (created_at,change_id)<($3::timestamptz,$4::uuid))
    order by created_at desc,change_id desc limit $5`,
    [tenantId,actorId,cursor?.createdAt??null,cursor?.changeId??null,limit+1]);
   const selected=rows.slice(0,limit),last=selected.at(-1);
   return {items:selected.map(row=>({
    changeId:row.change_id,serviceId:row.service_id,personId:row.person_id,
    organizationName:row.organization_name,currentDisplayName:row.current_display_name,
    originalDisplayName:row.original_display_name,proposedDisplayName:row.proposed_display_name,
    reason:row.reason,sourceInformationState:row.source_information_state,
    status:row.status,createdAt:row.created_at.toISOString(),
    canConfirm:row.can_approve&&(row.status==='PROPOSED'||
      row.verified_by_operator_id===actorId),
   })),nextCursor:rows.length>limit&&last?
    Buffer.from(JSON.stringify({createdAt:last.created_at.toISOString(),changeId:last.change_id}))
     .toString('base64url'):null};
  },true);
 }
}
