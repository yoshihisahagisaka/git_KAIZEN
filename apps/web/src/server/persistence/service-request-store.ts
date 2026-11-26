import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../../../../packages/domain/src/join.js';
import {createRequest,appendRequestUpdate,projectRequest,requestTypes,type RequestEntry,type RequestUpdate,type RequestType,type RequestDirection,type RequestStatus} from '../../../../../packages/domain/src/service-request.js';
import {withTenant} from './database.js';

export interface RequestActor {tenantId:string;actorId:string}
export interface RequestService {serviceId:string;contractProfileId:string}
interface Channel {provider_party_id:string;partner_party_id:string;party_role:'PROVIDER'|'PARTNER';can_create:boolean;can_read:boolean;can_respond:boolean}
interface Row {id:string;tenant_id:string;service_id:string;contract_profile_id:string;provider_party_id:string;partner_party_id:string;direction:RequestDirection;request_type:RequestType;content:string;customer_name:string;contact_name:string;desired_at:Date|null;parent_work_id:string|null;created_by_operator_id:string;created_at:Date}
interface UpdateRow {id:string;command_id:string;request_id:string;revision:number;previous_status:RequestStatus;status:RequestStatus;comment:string;actor_operator_id:string;recorded_at:Date}
export interface RequestCreate {id:string;type:RequestType;content:string;customerName?:string;contactName?:string;desiredAt?:string|null}
export interface RequestRespond {commandId:string;expectedRevision:number;status:RequestStatus;comment:string}
const denied=()=>new DomainError('REQUEST_NOT_AVAILABLE','依頼を参照・操作できません。',404);
const bad=()=>new DomainError('INVALID_REQUEST','依頼の入力内容を確認してください。',400);
const uuid=(v:string)=>z.uuid().safeParse(v).success;
function entry(r:Row):RequestEntry {
 const forward=r.direction==='PROVIDER_TO_PARTNER';
 return {id:r.id,tenantId:r.tenant_id,serviceId:r.service_id,contractProfileId:r.contract_profile_id,
 senderPartyId:forward?r.provider_party_id:r.partner_party_id,recipientPartyId:forward?r.partner_party_id:r.provider_party_id,
 direction:r.direction,parentWorkId:r.parent_work_id,type:r.request_type,content:r.content,customerName:r.customer_name,
 contactName:r.contact_name,desiredAt:r.desired_at?.toISOString()??null,createdBy:r.created_by_operator_id,createdAt:r.created_at.toISOString()};
}
function update(r:UpdateRow):RequestUpdate{return {id:r.id,commandId:r.command_id,requestId:r.request_id,revision:r.revision,
 previousStatus:r.previous_status,status:r.status,comment:r.comment,actorId:r.actor_operator_id,recordedAt:r.recorded_at.toISOString()};}
function sender(c:Channel,r:Row){return (c.party_role==='PROVIDER')===(r.direction==='PROVIDER_TO_PARTNER');}
function matches(c:Channel,r:Row){return c.provider_party_id===r.provider_party_id&&c.partner_party_id===r.partner_party_id;}
/** Internal DB adapter only. HTTP must supply a verified Session actor; no browser actor/tenant/direction fields.
 * Initial publication is standalone; linking a parent Work requires separate current Work authority. */
export class PgServiceRequestStore {
 constructor(private pool:Pool){}
 private validate(a:RequestActor,s:RequestService){if(![a.tenantId,a.actorId,s.serviceId,s.contractProfileId].every(uuid))throw bad();}
 private async lock(db:PoolClient,a:RequestActor,s:RequestService){
  await db.query('select factact.lock_scoped_actor_authority($1,$2)',[a.tenantId,a.actorId]);
  await db.query('select factact.lock_service_request_context($1,$2,$3)',[a.tenantId,s.serviceId,s.contractProfileId]);
 }
 private async access(db:PoolClient,a:RequestActor,s:RequestService):Promise<Channel>{
  const q=await db.query<Channel>(`select ch.provider_party_id,ch.partner_party_id,p.party_role,p.can_create,p.can_read,p.can_respond
   from factact.service_request_channels ch
   join factact.service_request_participants p using(tenant_id,service_id,contract_profile_id)
   join factact.operators o on o.tenant_id=p.tenant_id and o.id=p.actor_operator_id and o.status='ACTIVE'
   join factact.tenants t on t.id=ch.tenant_id and t.status='ACTIVE'
   join factact.services sv on sv.tenant_id=ch.tenant_id and sv.id=ch.service_id and sv.status='ACTIVE'
   join factact.contract_profiles c on c.tenant_id=ch.tenant_id and c.id=ch.contract_profile_id and c.service_id=ch.service_id
     and c.status='ACTIVE' and c.effective_from<=clock_timestamp() and (c.effective_to is null or c.effective_to>clock_timestamp())
   join factact.organizations op on op.tenant_id=ch.tenant_id and op.id=ch.provider_party_id and op.status='ACTIVE'
   join factact.organizations pp on pp.tenant_id=ch.tenant_id and pp.id=ch.partner_party_id and pp.status='ACTIVE'
   where ch.tenant_id=$1 and ch.service_id=$2 and ch.contract_profile_id=$3 and p.actor_operator_id=$4
    and ch.enabled and p.enabled`,[a.tenantId,s.serviceId,s.contractProfileId,a.actorId]);
  if(!q.rows[0])throw denied();return q.rows[0];
 }
 private async load(db:PoolClient,s:RequestService,id:string):Promise<Row>{
  const q=await db.query<Row>('select * from factact.service_requests where id=$1 and service_id=$2 and contract_profile_id=$3',[id,s.serviceId,s.contractProfileId]);
  if(!q.rows[0])throw denied();return q.rows[0];
 }
 private async history(db:PoolClient,id:string){
  return (await db.query<UpdateRow>('select * from factact.service_request_updates where request_id=$1 order by revision',[id])).rows.map(update);
 }
 async contexts(a:RequestActor){
  if(![a.tenantId,a.actorId].every(uuid))throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   const rows=await db.query<{service_id:string;contract_profile_id:string;name:string}>(`select ch.service_id,ch.contract_profile_id,sv.name
     from factact.service_request_channels ch join factact.service_request_participants p using(tenant_id,service_id,contract_profile_id)
     join factact.services sv on sv.tenant_id=ch.tenant_id and sv.id=ch.service_id
     where p.actor_operator_id=$1 and p.enabled and p.can_read and ch.enabled order by sv.name,ch.service_id,ch.contract_profile_id`,[a.actorId]);
   const items=[];
   for(const row of rows.rows){
    const s={serviceId:row.service_id,contractProfileId:row.contract_profile_id};
    try{
     const c=await this.access(db,a,s);if(!c.can_read)continue;
     items.push({...s,name:row.name,canCreate:c.can_create,types:requestTypes(c.party_role==='PROVIDER'?'PROVIDER_TO_PARTNER':'PARTNER_TO_PROVIDER')});
    }catch(e){if(!(e instanceof DomainError&&e.code==='REQUEST_NOT_AVAILABLE'))throw e;}
   }
   return items;
  },true);
 }
 async list(a:RequestActor,s:RequestService,q:{side:'SENT'|'RECEIVED';limit:number;beforeId?:string}){
  this.validate(a,s);
  if(!['SENT','RECEIVED'].includes(q.side)||!Number.isInteger(q.limit)||q.limit<1||q.limit>50||(q.beforeId&&!uuid(q.beforeId)))throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   const c=await this.access(db,a,s);if(!c.can_read)throw denied();
   const direction:RequestDirection=((c.party_role==='PROVIDER')===(q.side==='SENT'))?'PROVIDER_TO_PARTNER':'PARTNER_TO_PROVIDER';
   const params=[s.serviceId,s.contractProfileId,c.provider_party_id,c.partner_party_id,direction,q.beforeId??null,q.limit+1];
   const result=await db.query<Row&{status:RequestStatus;revision:number}>(`select r.*,coalesce(u.status,'PENDING') as status,coalesce(u.revision,0) as revision
    from factact.service_requests r left join lateral(
      select status,revision from factact.service_request_updates where request_id=r.id order by revision desc limit 1
    ) u on true
    where r.service_id=$1 and r.contract_profile_id=$2 and r.provider_party_id=$3 and r.partner_party_id=$4 and r.direction=$5
     and ($6::uuid is null or (r.created_at,r.id)<(select b.created_at,b.id from factact.service_requests b
       where b.id=$6 and b.service_id=$1 and b.contract_profile_id=$2 and b.provider_party_id=$3 and b.partner_party_id=$4 and b.direction=$5))
    order by r.created_at desc,r.id desc limit $7`,params);
   const selected=result.rows.slice(0,q.limit);
   return {items:selected.map(r=>({id:r.id,type:r.request_type,customerName:r.customer_name,content:r.content,createdAt:r.created_at.toISOString(),status:r.status,revision:r.revision})),
    nextCursor:result.rows.length>q.limit?selected.at(-1)?.id??null:null};
  },true);
 }
 async resolveContext(a:RequestActor,id:string):Promise<RequestService>{
  if(![a.tenantId,a.actorId,id].every(uuid))throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   const r=(await db.query<Row>('select * from factact.service_requests where id=$1',[id])).rows[0];
   if(!r)throw denied();
   const s={serviceId:r.service_id,contractProfileId:r.contract_profile_id},c=await this.access(db,a,s);
   if(!c.can_read||!matches(c,r))throw denied();return s;
  },true);
 }
 private async notify(db:PoolClient,a:RequestActor,s:RequestService,id:string,revision:number,kind:'CREATED'|'STARTED'|'COMMENTED'|'COMPLETED',target:'PROVIDER'|'PARTNER',at:string){
  await db.query(`insert into factact.service_request_notifications(id,tenant_id,request_id,revision,recipient_operator_id,kind,created_at)
   select gen_random_uuid(),p.tenant_id,$4,$5,p.actor_operator_id,$6,$7
   from factact.service_request_participants p join factact.operators o
    on o.tenant_id=p.tenant_id and o.id=p.actor_operator_id and o.status='ACTIVE'
   where p.tenant_id=$1 and p.service_id=$2 and p.contract_profile_id=$3 and p.enabled and p.can_read and p.party_role=$8
   and p.actor_operator_id<>$9 on conflict(tenant_id,request_id,revision,recipient_operator_id) do nothing`,
   [a.tenantId,s.serviceId,s.contractProfileId,id,revision,kind,at,target,a.actorId]);
 }
 async notifications(a:RequestActor,s:RequestService){
  this.validate(a,s);
  return withTenant(this.pool,a.tenantId,async db=>{
   const c=await this.access(db,a,s);if(!c.can_read)throw denied();
   const params=[a.actorId,s.serviceId,s.contractProfileId,c.provider_party_id,c.partner_party_id,c.party_role];
   const filter=`from factact.service_request_notifications n join factact.service_requests r on r.tenant_id=n.tenant_id and r.id=n.request_id
    where n.recipient_operator_id=$1 and r.service_id=$2 and r.contract_profile_id=$3 and r.provider_party_id=$4 and r.partner_party_id=$5
     and (($6::text='PROVIDER')=((r.direction='PARTNER_TO_PROVIDER')=(n.revision=0)))`;
   const count=await db.query<{n:number}>('select count(*)::integer as n '+filter+' and n.acknowledged_at is null',params);
   const result=await db.query<{id:string;request_id:string;kind:string;created_at:Date;acknowledged_at:Date|null}>('select n.id,n.request_id,n.kind,n.created_at,n.acknowledged_at '+filter+' order by n.created_at desc,n.id desc limit 50',params);
   return {unread:count.rows[0]?.n??0,items:result.rows.map(n=>({id:n.id,requestId:n.request_id,kind:n.kind,createdAt:n.created_at.toISOString(),read:n.acknowledged_at!==null}))};
  },true);
 }
 async acknowledge(a:RequestActor,s:RequestService,id:string,throughRevision:number){
  this.validate(a,s);if(!uuid(id)||!Number.isInteger(throughRevision)||throughRevision<0)throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   await this.lock(db,a,s);const c=await this.access(db,a,s);if(!c.can_read)throw denied();
   const r=await this.load(db,s,id);if(!matches(c,r))throw denied();
   await db.query(`update factact.service_request_notifications set acknowledged_at=greatest(clock_timestamp(),created_at)
    where request_id=$1 and recipient_operator_id=$2 and revision<=$3 and acknowledged_at is null
     and (revision=0)=$4`,[id,a.actorId,throughRevision,!sender(c,r)]);
   return {id};
  });
 }
 async create(a:RequestActor,s:RequestService,input:RequestCreate){
  this.validate(a,s);if(!uuid(input.id))throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   await this.lock(db,a,s);const c=await this.access(db,a,s);if(!c.can_create||!c.can_read)throw denied();
   const forward=c.party_role==='PROVIDER';
   const e=createRequest({...s,tenantId:a.tenantId,senderPartyId:forward?c.provider_party_id:c.partner_party_id,
    recipientPartyId:forward?c.partner_party_id:c.provider_party_id,direction:forward?'PROVIDER_TO_PARTNER':'PARTNER_TO_PROVIDER',parentWorkId:null},input,a.actorId,new Date().toISOString());
   const old=(await db.query<Row>('select * from factact.service_requests where id=$1',[e.id])).rows[0];
   if(old){
    const p=entry(old);
    const comparable=(x:RequestEntry)=>JSON.stringify([x.tenantId,x.serviceId,x.contractProfileId,x.senderPartyId,x.recipientPartyId,x.direction,x.type,x.content,x.customerName,x.contactName,x.desiredAt===null?null:new Date(x.desiredAt).toISOString(),x.createdBy,x.parentWorkId]);
    if(comparable(p)!==comparable(e))throw new DomainError('RETRY_CONFLICT','同じ保存番号の内容が異なります。');
    return {id:p.id};
   }
   await db.query(`insert into factact.service_requests(id,tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id,direction,request_type,content,customer_name,contact_name,desired_at,parent_work_id,created_by_operator_id,created_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,null,$13,$14)`,
    [e.id,e.tenantId,e.serviceId,e.contractProfileId,c.provider_party_id,c.partner_party_id,e.direction,e.type,e.content,e.customerName,e.contactName,e.desiredAt,e.createdBy,e.createdAt]);
   await this.notify(db,a,s,e.id,0,'CREATED',forward?'PARTNER':'PROVIDER',e.createdAt);
   return {id:e.id};
  });
 }
 async detail(a:RequestActor,s:RequestService,id:string){
  this.validate(a,s);if(!uuid(id))throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   const c=await this.access(db,a,s);if(!c.can_read)throw denied();
   const r=await this.load(db,s,id);if(!matches(c,r))throw denied();
   const e=entry(r),history=await this.history(db,id);
   return {id:e.id,type:e.type,content:e.content,customerName:e.customerName,contactName:e.contactName,desiredAt:e.desiredAt,createdAt:e.createdAt,
    side:sender(c,r)?'SENT' as const:'RECEIVED' as const,canRespond:c.can_respond&&!sender(c,r)&&projectRequest(e,history).status!=='COMPLETED',
    status:projectRequest(e,history).status,revision:history.length,
    history:history.map(h=>({revision:h.revision,status:h.status,comment:h.comment,recordedAt:h.recordedAt}))};
  },true);
 }
 async respond(a:RequestActor,s:RequestService,id:string,input:RequestRespond){
  this.validate(a,s);if(!uuid(id)||!uuid(input.commandId)||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw bad();
  return withTenant(this.pool,a.tenantId,async db=>{
   await this.lock(db,a,s);const c=await this.access(db,a,s);if(!c.can_read||!c.can_respond)throw denied();
   const r=await this.load(db,s,id);if(!matches(c,r)||sender(c,r))throw denied();
   const e=entry(r),history=await this.history(db,id);
   const h=appendRequestUpdate(e,history,{...input,id:randomUUID()},a.actorId,new Date().toISOString());
   if(!history.some(x=>x.id===h.id)){await db.query(`insert into factact.service_request_updates(id,tenant_id,request_id,command_id,revision,previous_status,status,comment,actor_operator_id,recorded_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[h.id,a.tenantId,id,h.commandId,h.revision,h.previousStatus,h.status,h.comment,h.actorId,h.recordedAt]);
    await this.notify(db,a,s,id,h.revision,h.status==='COMPLETED'?'COMPLETED':h.previousStatus==='PENDING'?'STARTED':'COMMENTED',c.party_role==='PROVIDER'?'PARTNER':'PROVIDER',h.recordedAt);
   }
   return {id,revision:h.revision,status:h.status};
  });
 }
}
