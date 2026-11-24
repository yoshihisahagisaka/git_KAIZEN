import {createHash,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../../../../packages/domain/src/join.js';
import {isExplicitlyAuthorized,type ExplicitAccessGrant,type ExplicitAccessScope,type ResolvedAccessTarget} from '../../../../../packages/domain/src/scoped-access.js';
import {validProcedureBody,type ProcedureCategory} from '../../../../../packages/domain/src/procedure-page-text.js';
import {withTenant} from './database.js';

export type ProcedureScope='COMMON'|'SERVICE';
export type ProcedureStatus='DRAFT'|'PUBLISHED'|'HIDDEN';
export interface ProcedurePage {
 id:string;scopeKind:ProcedureScope;serviceId:string|null;
 category:ProcedureCategory;title:string;bodyText:string;status:ProcedureStatus;
 sortOrder:number;revision:number;updatedAt:string;
}
export type ProcedurePageSummary=Omit<ProcedurePage,'bodyText'>;
export interface ProcedurePageCursor {sortOrder:number;id:string}
export interface ProcedurePageList {items:ProcedurePageSummary[];nextCursor:ProcedurePageCursor|null}
export interface ProcedurePageCreate {
 requestId:string;scopeKind:ProcedureScope;serviceId:string|null;
 category:ProcedureCategory;title:string;bodyText:string;sortOrder:number;reason:string;
}
export interface ProcedurePageEdit {
 requestId:string;expectedRevision:number;category:ProcedureCategory;
 title:string;bodyText:string;sortOrder:number;reason:string;
}
export interface ProcedurePageToggle {
 requestId:string;expectedRevision:number;reason:string;
}

interface PageRow {
 id:string;tenant_id:string;scope_kind:ProcedureScope;service_id:string|null;
 category:ProcedureCategory;title:string;body_text:string;status:ProcedureStatus;
 sort_order:number;revision:number;updated_at:Date;
}
interface GrantRow {
 actor_operator_id:string;tenant_id:string;service_id:string;contract_profile_id:string;
 scope_kind:ExplicitAccessScope['kind'];service_recipient_id:string|null;work_id:string|null;
 object_kind:ExplicitAccessGrant['objectKind'];operations:ExplicitAccessGrant['operations'];
 status:ExplicitAccessGrant['status'];effective_from:Date;effective_until:Date|null;
}

const denied=()=>new DomainError('PROCEDURE_NOT_AVAILABLE','手順書を参照できません。',404);
const noAdmin=()=>new DomainError('PROCEDURE_ADMIN_REQUIRED','手順書の管理権限がありません。',403);
const conflict=()=>new DomainError('PROCEDURE_REVISION_CONFLICT','別の担当者が更新しました。再読み込みしてください。',409);
const badInput=()=>new DomainError('INVALID_PROCEDURE','手順書の内容を確認してください。',400);
const uuid=(x:string)=>z.uuid().safeParse(x).success;

function present(r:PageRow):ProcedurePage {
 return {id:r.id,scopeKind:r.scope_kind,serviceId:r.service_id,category:r.category,
  title:r.title,bodyText:r.body_text,status:r.status,sortOrder:r.sort_order,
  revision:r.revision,updatedAt:r.updated_at.toISOString()};
}
function summarize(page:ProcedurePage):ProcedurePageSummary {
 const {bodyText:_hidden,...summary}=page;
 return summary;
}
function hash(command:string,input:object){
 return createHash('sha256').update(JSON.stringify({command,input})).digest('hex');
}
function checkedBody(body:string,title:string){
 if(!title.trim()||title.trim().length>160||!validProcedureBody(body))throw badInput();
}
function grantScope(row:GrantRow):ExplicitAccessScope{
 if(row.scope_kind==='SERVICE')return {kind:'SERVICE'};
 if(row.scope_kind==='SERVICE_RECIPIENT')return {kind:'SERVICE_RECIPIENT',serviceRecipientId:row.service_recipient_id!};
 return {kind:'WORK',serviceRecipientId:row.service_recipient_id!,workId:row.work_id!};
}
function grant(row:GrantRow):ExplicitAccessGrant{
 return {actorId:row.actor_operator_id,tenantId:row.tenant_id,serviceId:row.service_id,
  contractProfileId:row.contract_profile_id,scope:grantScope(row),
  objectKind:row.object_kind,operations:row.operations,status:row.status,
  effectiveFrom:row.effective_from.toISOString(),effectiveUntil:row.effective_until?.toISOString()??null};
}

/** Session is authenticated upstream; every DB request independently rechecks
 * current Operator mode/roles, Work/Contract and live grants in one tenant
 * transaction. The caller's affiliation/telephone never contributes Authority. */
export class PgProcedurePageStore {
 constructor(private pool:Pool,private clock:{now():string}={now:()=>new Date().toISOString()}){}

 private async admin(db:PoolClient,actorId:string){
  const r=await db.query(`select 1 from factact.operators o
   join factact.tenants t on t.id=o.tenant_id and t.status='ACTIVE'
   join factact.operator_roles roles on roles.tenant_id=o.tenant_id
     and roles.operator_id=o.id and roles.role='ADMIN'
   where o.id=$1 and o.status='ACTIVE' and o.read_authority_mode='INTERNAL_V1'`,[actorId]);
  if(!r.rowCount)throw noAdmin();
 }

 private async serviceExists(db:PoolClient,serviceId:string|null,scope:ProcedureScope){
  if(scope==='COMMON'){
   if(serviceId!==null)throw badInput();
   return;
  }
  if(!serviceId||!uuid(serviceId))throw badInput();
  const r=await db.query("select 1 from factact.services where id=$1 and status='ACTIVE'",[serviceId]);
  if(!r.rowCount)throw badInput();
 }

 private async workAccess(db:PoolClient,tenantId:string,actorId:string,workId:string){
  const at=this.clock.now();
  const result=await db.query<{
    service_id:string;contract_profile_id:string;support_event_id:string;
    mode:'INTERNAL_V1'|'SCOPED';recipient_id:string|null;beneficiary_kind:'CONFIRMED'|'CLEARED'|null;
  }>(`select w.service_id,w.contract_profile_id,w.support_event_id,
     actor.read_authority_mode as mode,
     beneficiary.service_recipient_id as recipient_id,beneficiary.kind as beneficiary_kind
   from factact.work w
   join factact.operators actor on actor.id=$2 and actor.tenant_id=w.tenant_id
      and actor.status='ACTIVE'
   join factact.tenants t on t.id=w.tenant_id and t.status='ACTIVE'
   join factact.services s on s.id=w.service_id and s.tenant_id=w.tenant_id and s.status='ACTIVE'
   join factact.contract_profiles c on c.id=w.contract_profile_id and c.service_id=w.service_id
      and c.tenant_id=w.tenant_id and c.status='ACTIVE'
      and c.effective_from<=$3::timestamptz
      and (c.effective_to is null or c.effective_to>$3::timestamptz)
   left join lateral(
     select d.kind,d.service_recipient_id
     from factact.support_event_beneficiary_decisions d
     where d.tenant_id=w.tenant_id and d.support_event_id=w.support_event_id
     order by d.revision desc limit 1
   ) beneficiary on true
   where w.id=$1 and w.lane='SUPPORT'`,[workId,actorId,at]);
  const row=result.rows[0];
  if(!row)throw denied();
  if(row.mode==='INTERNAL_V1'){
   const roles=await db.query("select 1 from factact.operator_roles where operator_id=$1 and role in ('ADMIN','OPERATOR','REVIEWER')",[actorId]);
   if(!roles.rowCount)throw denied();
   return {serviceId:row.service_id};
  }
  if(row.mode!=='SCOPED'||row.beneficiary_kind!=='CONFIRMED'||!row.recipient_id)throw denied();
  const recipient=await db.query(`select 1 from factact.service_recipients r
   join factact.organizations o on o.tenant_id=r.tenant_id and o.id=r.recipient_organization_id
     and o.status='ACTIVE'
   where r.id=$1 and r.service_id=$2 and r.recipient_type='ORGANIZATION'
     and r.status='ACTIVE'`,[row.recipient_id,row.service_id]);
  if(!recipient.rowCount)throw denied();
  const previous=await db.query(`select 1 from factact.support_event_beneficiary_decisions d
   where d.support_event_id=$1 and d.kind='CONFIRMED'
     and d.service_recipient_id is distinct from $2::uuid limit 1`,
   [row.support_event_id,row.recipient_id]);
  if(previous.rowCount)throw denied();
  const all=await db.query<GrantRow>(`select actor_operator_id,tenant_id,service_id,contract_profile_id,
    scope_kind,service_recipient_id,work_id,object_kind,operations,status,effective_from,effective_until
    from factact.scoped_actor_grants
    where actor_operator_id=$1 and service_id=$2 and contract_profile_id=$3
      and object_kind in ('SUPPORT','PROCEDURE')`,[actorId,row.service_id,row.contract_profile_id]);
  const grants=all.rows.map(grant);
  const scope:ExplicitAccessScope={kind:'WORK',serviceRecipientId:row.recipient_id,workId};
  for(const objectKind of ['SUPPORT','PROCEDURE'] as const){
   const target:ResolvedAccessTarget={tenantId,serviceId:row.service_id,contractProfileId:row.contract_profile_id,
    scope,objectKind,operation:'READ'};
   if(!isExplicitlyAuthorized({actorId,target,contractIsEffective:true,grants,at}))throw denied();
  }
  return {serviceId:row.service_id};
 }

 async listForWork(tenantId:string,actorId:string,workId:string,
  query:{q:string;category:ProcedureCategory|null;limit:number;cursor:ProcedurePageCursor|null}):Promise<ProcedurePageList>{
  if(![tenantId,actorId,workId].every(uuid)||query.q.length>100||query.limit<1||query.limit>20)throw badInput();
  const q=query.q.trim().normalize('NFKC').toLocaleLowerCase();
  if(query.cursor&&(!uuid(query.cursor.id)||!Number.isInteger(query.cursor.sortOrder)))throw badInput();
  return withTenant(this.pool,tenantId,async db=>{
   const work=await this.workAccess(db,tenantId,actorId,workId);
   const {rows}=await db.query<PageRow>(`select * from factact.procedure_pages p
     where p.status='PUBLISHED' and
       (p.scope_kind='COMMON' or (p.scope_kind='SERVICE' and p.service_id=$1))
       and ($2::text is null or p.category=$2)
       and ($3::text='' or strpos(lower(normalize(p.title,NFKC)), $3)>0
         or strpos(lower(normalize(p.body_text,NFKC)), $3)>0)
       and ($4::integer is null or (p.sort_order,p.id)>($4::integer,$5::uuid))
     order by p.sort_order,p.id limit $6`,
     [work.serviceId,query.category,q,query.cursor?.sortOrder??null,query.cursor?.id??null,query.limit+1]);
   const selected=rows.slice(0,query.limit),last=selected.at(-1);
   return {items:selected.map(x=>summarize(present(x))),
    nextCursor:rows.length>query.limit&&last?{sortOrder:last.sort_order,id:last.id}:null};
  },true);
 }

 async detailForWork(tenantId:string,actorId:string,workId:string,pageId:string):Promise<ProcedurePage>{
  if(![tenantId,actorId,workId,pageId].every(uuid))throw denied();
  return withTenant(this.pool,tenantId,async db=>{
   const {serviceId}=await this.workAccess(db,tenantId,actorId,workId);
   const r=await db.query<PageRow>(`select * from factact.procedure_pages
     where id=$1 and status='PUBLISHED'
      and (scope_kind='COMMON' or (scope_kind='SERVICE' and service_id=$2))`,
    [pageId,serviceId]);
   if(!r.rows[0])throw denied();
   return present(r.rows[0]);
  },true);
 }

 async adminOverview(tenantId:string,actorId:string):Promise<{services:{id:string;name:string}[];pages:ProcedurePage[]}>{
  if(![tenantId,actorId].every(uuid))throw noAdmin();
  return withTenant(this.pool,tenantId,async db=>{
   await this.admin(db,actorId);
   const [services,pages]=await Promise.all([
    db.query<{id:string;name:string}>("select id,name from factact.services where status='ACTIVE' order by name,id limit 100"),
    db.query<PageRow>("select * from factact.procedure_pages order by updated_at desc,id desc limit 200"),
   ]);
   return {services:services.rows,pages:pages.rows.map(present)};
  },true);
 }

 private async replay(db:PoolClient,actorId:string,requestId:string,commandHash:string){
  await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[requestId]);
  const old=await db.query<{page_id:string;command_hash:string;actor_operator_id:string}>(
   "select page_id,command_hash,actor_operator_id from factact.procedure_page_edits where request_id=$1",[requestId]);
  if(!old.rows[0])return null;
  if(old.rows[0].actor_operator_id!==actorId||old.rows[0].command_hash!==commandHash)throw conflict();
  return this.load(db,old.rows[0].page_id);
 }

 private async load(db:PoolClient,pageId:string,lock=false):Promise<PageRow>{
  const r=await db.query<PageRow>(`select * from factact.procedure_pages where id=$1 ${lock?'for update':''}`,[pageId]);
  if(!r.rows[0])throw denied();
  return r.rows[0];
 }

 private async history(db:PoolClient,tenantId:string,actorId:string,pageId:string,requestId:string,
  commandHash:string,kind:'CREATED'|'UPDATED'|'PUBLISHED'|'HIDDEN',
  revision:number,reason:string,previous:PageRow|null){
  const editId=randomUUID();
  await db.query(`insert into factact.procedure_page_edits
   (id,tenant_id,page_id,request_id,command_hash,actor_operator_id,kind,
    previous_title,previous_body_text,previous_status,revision,reason)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
   [editId,tenantId,pageId,requestId,commandHash,actorId,kind,previous?.title??null,
    previous?.body_text??null,previous?.status??null,revision,reason]);
  await db.query(`insert into factact.audit_events
   (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
   values ($1,$2,'PROCEDURE_PAGE',$3,$4,$5,$6::jsonb)`,
   [randomUUID(),tenantId,pageId,'PROCEDURE_'+kind,actorId,
    JSON.stringify({revision,requestId})]);
 }

 async create(tenantId:string,actorId:string,data:ProcedurePageCreate):Promise<ProcedurePage>{
  if(![tenantId,actorId,data.requestId].every(uuid))throw badInput();
  checkedBody(data.bodyText,data.title);
  const h=hash('CREATE',data);
  return withTenant(this.pool,tenantId,async db=>{
   await this.admin(db,actorId);
   const replay=await this.replay(db,actorId,data.requestId,h);
   if(replay)return present(replay);
   await this.serviceExists(db,data.serviceId,data.scopeKind);
   const id=randomUUID();
   await db.query(`insert into factact.procedure_pages
    (id,tenant_id,scope_kind,service_id,category,title,body_text,sort_order,
      created_by_operator_id,updated_by_operator_id)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
    [id,tenantId,data.scopeKind,data.serviceId,data.category,data.title.trim(),data.bodyText,
     data.sortOrder,actorId]);
   await this.history(db,tenantId,actorId,id,data.requestId,h,'CREATED',1,data.reason,null);
   return present(await this.load(db,id));
  });
 }

 async update(tenantId:string,actorId:string,pageId:string,data:ProcedurePageEdit):Promise<ProcedurePage>{
  if(![tenantId,actorId,pageId,data.requestId].every(uuid))throw badInput();
  checkedBody(data.bodyText,data.title);
  const h=hash('UPDATE',{pageId,...data});
  return withTenant(this.pool,tenantId,async db=>{
   await this.admin(db,actorId);
   const replay=await this.replay(db,actorId,data.requestId,h);
   if(replay)return present(replay);
   const previous=await this.load(db,pageId,true);
   if(previous.revision!==data.expectedRevision)throw conflict();
   await db.query(`update factact.procedure_pages
     set title=$2,body_text=$3,category=$4,sort_order=$5,revision=revision+1,
       updated_by_operator_id=$6,updated_at=now()
     where id=$1`,[pageId,data.title.trim(),data.bodyText,data.category,data.sortOrder,actorId]);
   await this.history(db,tenantId,actorId,pageId,data.requestId,h,'UPDATED',
    previous.revision+1,data.reason,previous);
   return present(await this.load(db,pageId));
  });
 }

 async changeStatus(tenantId:string,actorId:string,pageId:string,
  status:'PUBLISHED'|'HIDDEN',data:ProcedurePageToggle):Promise<ProcedurePage>{
  if(![tenantId,actorId,pageId,data.requestId].every(uuid))throw badInput();
  const kind=status==='PUBLISHED'?'PUBLISHED':'HIDDEN',h=hash(kind,{pageId,...data});
  return withTenant(this.pool,tenantId,async db=>{
   await this.admin(db,actorId);
   const replay=await this.replay(db,actorId,data.requestId,h);
   if(replay)return present(replay);
   const previous=await this.load(db,pageId,true);
   if(previous.revision!==data.expectedRevision)throw conflict();
   if(previous.status===status)throw new DomainError('PROCEDURE_NO_CHANGE','公開状態は既に同じです。',409);
   await db.query(`update factact.procedure_pages
     set status=$2,revision=revision+1,updated_by_operator_id=$3,updated_at=now()
     where id=$1`,[pageId,status,actorId]);
   await this.history(db,tenantId,actorId,pageId,data.requestId,h,kind,
    previous.revision+1,data.reason,previous);
   return present(await this.load(db,pageId));
  });
 }
}
