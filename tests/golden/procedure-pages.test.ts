import {randomUUID} from 'node:crypto';
import {beforeAll,beforeEach,afterAll,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {PgProcedurePageStore} from '../../apps/web/src/server/persistence/procedure-page-store.js';
import type {Operator} from '../../packages/domain/src/operator.js';

const at='2026-11-07T12:00:00Z';
const scoped='20000000-0000-4000-8000-000000000091';
const otherTenant='10000000-0000-4000-8000-000000000091';
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'atLIB operator',
 tenantName:'Development',roles:['ADMIN','OPERATOR','REVIEWER']};
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgProcedurePageStore,commands:SupportCommands,workId:string,eventId:string,recipientId:string;
const input=(requestId=randomUUID())=>({requestId,scopeKind:'SERVICE' as const,serviceId:ids.service,
 category:'PROCEDURE' as const,title:'PCの確認',bodyText:'【対応手順】\n1. 電源を確認\nhttps://docs.google.com/document/d/test',
 sortOrder:10,reason:'SONIX準備で内容を承認'});
const log=(id:string)=>db.admin.query('select event_type,metadata_json from factact.audit_events where aggregate_id=$1 order by occurred_at,id',[id]);

beforeAll(async()=>{db=await testDatabase();store=new PgProcedurePageStore(db.runtime,{now:()=>at});
 commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>at});},60_000);
beforeEach(async()=>{
 await db.reset();
 const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,
  serviceId:ids.service,symptom:'PCの電源が入らない'});
 eventId=event.id;
 const result=await commands.evaluate(actor,eventId,'REQUIRED','初期対応対象');
 if(!result.work)throw Error('No SUPPORT Work');
 workId=result.work.id;
 recipientId=await withTenant(db.runtime,ids.tenant,async client=>
  new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
 await commands.recordBeneficiary(actor,eventId,{kind:'CONFIRMED',requestId:randomUUID(),
  expectedRevision:0,organizationId:ids.organization,reason:'人が支援先を確認'});
},60_000);
afterAll(async()=>{await db?.close();},60_000);

async function grant(kind:'SUPPORT'|'PROCEDURE',scopedActor=scoped,scope='SERVICE_RECIPIENT'){
 const grantId=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
  values ($1,$2,$3,$4,$5,$6,$7,$8,array['READ'], $9,$10)`,[
  grantId,ids.tenant,scopedActor,ids.service,ids.contract,scope,
  scope==='SERVICE'?null:recipientId,kind,'2026-11-01T00:00:00Z',ids.operator]);
 return grantId;
}

describe('simple procedure pages: RLS, authority and immutable edits',()=>{
 it('does not publish a new page and returns only approved service/common pages',async()=>{
  const page=await store.create(ids.tenant,ids.operator,input());
  expect(page.status).toBe('DRAFT');
  expect((await store.listForWork(ids.tenant,ids.operator,workId,{q:'',category:null,limit:20,cursor:null})).items).toEqual([]);
  const published=await store.changeStatus(ids.tenant,ids.operator,page.id,'PUBLISHED',{
   requestId:randomUUID(),expectedRevision:1,reason:'承認済みの内容のみ公開'});
  expect(published.revision).toBe(2);
  const list=await store.listForWork(ids.tenant,ids.operator,workId,{q:'確認',category:'PROCEDURE',limit:20,cursor:null});
  expect(list.items).toHaveLength(1);
  expect(list.items[0]).not.toHaveProperty('bodyText');
  expect((await store.detailForWork(ids.tenant,ids.operator,workId,page.id)).bodyText).toContain('https://docs.google.com');
  const common=await store.create(ids.tenant,ids.operator,{...input(),requestId:randomUUID(),scopeKind:'COMMON',serviceId:null,category:'FAQ',title:'共通FAQ'});
  await store.changeStatus(ids.tenant,ids.operator,common.id,'PUBLISHED',{requestId:randomUUID(),expectedRevision:1,reason:'共通FAQ公開'});
  expect((await store.listForWork(ids.tenant,ids.operator,workId,{q:'',category:null,limit:20,cursor:null})).items).toHaveLength(2);
  expect((await store.listForWork(ids.tenant,ids.operator,workId,{q:'',category:'SCRIPT',limit:20,cursor:null})).items).toHaveLength(0);
 });

 it('records every edit without replacing previous text; idempotent requests and stale revisions are safe',async()=>{
  const reqId=randomUUID(),original=input(reqId);
  const first=await store.create(ids.tenant,ids.operator,original);
  expect((await store.create(ids.tenant,ids.operator,original)).id).toBe(first.id);
  await expect(store.create(ids.tenant,ids.operator,{...original,title:'違う内容'})).rejects.toMatchObject({status:409});
  const update={requestId:randomUUID(),expectedRevision:1,category:'PROCEDURE' as const,
   title:'新しいPC確認',bodyText:'【対応手順】\n新しい内容',sortOrder:5,reason:'手順見直し'};
  const second=await store.update(ids.tenant,ids.operator,first.id,update);
  expect(second.revision).toBe(2);
  await expect(store.update(ids.tenant,ids.operator,first.id,{...update,requestId:randomUUID()}))
   .rejects.toMatchObject({status:409});
  const edits=await db.admin.query('select previous_body_text,kind,revision from factact.procedure_page_edits where page_id=$1 order by revision',[first.id]);
  expect(edits.rows).toEqual([
   {previous_body_text:null,kind:'CREATED',revision:1},
   {previous_body_text:original.bodyText,kind:'UPDATED',revision:2},
  ]);
  expect((await log(first.id)).rows.map(x=>x.event_type)).toEqual(['PROCEDURE_CREATED','PROCEDURE_UPDATED']);
 });

 it('requires separate procedure READ beyond SUPPORT READ for a SCOPED Actor, and respects revocation',async()=>{
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
   values($1,$2,'scoped-procedure@example.invalid','Scoped', 'ACTIVE')`,[scoped,ids.tenant]);
  await db.admin.query('insert into factact.operator_roles(tenant_id,operator_id,role) values($1,$2,\'ADMIN\')',[ids.tenant,scoped]);
  const page=await store.create(ids.tenant,ids.operator,input());
  await store.changeStatus(ids.tenant,ids.operator,page.id,'PUBLISHED',{requestId:randomUUID(),expectedRevision:1,reason:'公開'});
  await grant('SUPPORT');
  await expect(store.detailForWork(ids.tenant,scoped,workId,page.id)).rejects.toMatchObject({status:404});
  await expect(store.adminOverview(ids.tenant,scoped)).rejects.toMatchObject({status:403});
  const docGrant=await grant('PROCEDURE');
  expect((await store.detailForWork(ids.tenant,scoped,workId,page.id)).id).toBe(page.id);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
   revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='運用終了'
   where id=$1`,[docGrant,ids.operator]);
  await expect(store.detailForWork(ids.tenant,scoped,workId,page.id)).rejects.toMatchObject({status:404});
 });

 it('is tenant-isolated and uses forced RLS for current pages and immutable history',async()=>{
  const page=await store.create(ids.tenant,ids.operator,input());
  for(const name of ['procedure_pages','procedure_page_edits']){
   const flags=await db.admin.query(`select relrowsecurity,relforcerowsecurity from pg_class
    where oid=$1::regclass`,[`factact.${name}`]);
   expect(flags.rows[0]).toEqual({relrowsecurity:true,relforcerowsecurity:true});
  }
  const visible=await withTenant(db.runtime,otherTenant,client=>client.query(
   'select id from factact.procedure_pages where id=$1',[page.id]));
  expect(visible.rows).toEqual([]);
  await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
   'delete from factact.procedure_pages where id=$1',[page.id]))).rejects.toMatchObject({code:'42501'});
 });

 it('keeps page, edit history and Audit atomic if an audit insert fails',async()=>{
  await db.admin.query(`create function public.fail_procedure_audit() returns trigger language plpgsql as $$
   begin if new.aggregate_type='PROCEDURE_PAGE' then raise exception 'injected audit failure'; end if; return new; end $$`);
  await db.admin.query(`create trigger fail_procedure_audit before insert on factact.audit_events
   for each row execute function public.fail_procedure_audit()`);
  try{
   await expect(store.create(ids.tenant,ids.operator,input())).rejects.toThrow();
   const count=await db.admin.query('select count(*)::integer n from factact.procedure_pages');
   expect(count.rows[0].n).toBe(0);
   const edits=await db.admin.query('select count(*)::integer n from factact.procedure_page_edits');
   expect(edits.rows[0].n).toBe(0);
  } finally {
   await db.admin.query('drop trigger fail_procedure_audit on factact.audit_events');
   await db.admin.query('drop function public.fail_procedure_audit()');
  }
 });
});
