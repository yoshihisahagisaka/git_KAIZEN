import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import {createApp} from '../../apps/web/src/server/app.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import request from 'supertest';
import pino from 'pino';

let db:Awaited<ReturnType<typeof testDatabase>>;
let commands:SupportCommands,queries:SupportQueries;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Demo',tenantName:'Demo',roles:['ADMIN','OPERATOR','REVIEWER']};
const runtime={id:randomUUID,now:()=>new Date().toISOString()};
const companyB='30000000-0000-4000-8000-000000000002';
const otherTenant='10000000-0000-4000-8000-000000000002';
const otherCompany='30000000-0000-4000-8000-000000000003';

beforeAll(async()=>{db=await testDatabase();const uow=new PgSupportUnitOfWork(db.runtime);commands=new SupportCommands(uow,runtime);queries=new SupportQueries(uow,runtime);},60_000);
beforeEach(async()=>{await db.reset();await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values($1,$2,$3,$4)',[companyB,ids.tenant,'実際の支援先 B','ACTIVE']);},60_000);
afterAll(async()=>{await db?.close();},60_000);
const intake=()=>commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'外部ベンダーからの問合せ'});
const confirm=(eventId:string,organizationId=companyB,expectedRevision=0,requestId=randomUUID())=>commands.recordBeneficiary(actor,eventId,{requestId,expectedRevision,kind:'CONFIRMED',organizationId,reason:'担当者が受益企業を別途確認'});

describe('SUPPORT beneficiary is separate from Caller, append-only, without access grants',()=>{
 it('starts unknown even when Caller has an Organization, then identifies a different beneficiary',async()=>{
  const event=await intake(),before=await queries.detail(actor,event.id);
  expect(before.organization.id).toBe(ids.organization);
  expect(before.beneficiary).toBeNull();expect(before.beneficiaryHistory).toEqual([]);
  const decision=await confirm(event.id),after=await queries.detail(actor,event.id);
  expect(decision).toMatchObject({kind:'CONFIRMED',revision:1,serviceId:ids.service});
  expect(after.person.id).toBe(ids.person);expect(after.organization.id).toBe(ids.organization);
  expect(after.event.serviceRecipientId).toBe(event.serviceRecipientId);
  expect(after.beneficiary).toEqual({id:companyB,name:'実際の支援先 B'});
  expect(after.businessHistory.map(x=>x.kind)).toContain('BENEFICIARY_CONFIRMED');
  expect((await db.admin.query("select count(*)::int n from factact.audit_events where aggregate_id=$1 and event_type='SUPPORT_BENEFICIARY_CONFIRMED'",[event.id])).rows[0].n).toBe(1);
  expect((await db.admin.query('select count(*)::int n from factact.service_recipients where recipient_type=$1',['ORGANIZATION'])).rows[0].n).toBe(1);
 });
 it('records correction and clearing as history, never mutates original association',async()=>{
  const event=await intake();await confirm(event.id,companyB);
  const second=await confirm(event.id,ids.organization,1);
  const cleared=await commands.recordBeneficiary(actor,event.id,{requestId:randomUUID(),expectedRevision:2,kind:'CLEARED',organizationId:null,reason:'確認の根拠が取り消された'});
  const after=await queries.detail(actor,event.id);
  expect(second.revision).toBe(2);expect(cleared.revision).toBe(3);
  expect(after.beneficiary).toBeNull();expect(after.beneficiaryHistory.map(x=>x.kind)).toEqual(['CONFIRMED','CONFIRMED','CLEARED']);
  expect(after.businessHistory.map(x=>x.kind)).toContain('BENEFICIARY_CLEARED');
  expect(after.event.serviceRecipientId).toBe(event.serviceRecipientId);
 });
 it('makes retries idempotent and rejects mismatched payloads or stale revisions',async()=>{
  const event=await intake(),req=randomUUID(),first=await confirm(event.id,companyB,0,req);
  expect((await confirm(event.id,companyB,0,req)).id).toBe(first.id);
  await expect(confirm(event.id,ids.organization,0,req)).rejects.toMatchObject({code:'RETRY_CONFLICT'});
  await expect(confirm(event.id,ids.organization,0)).rejects.toMatchObject({code:'STALE_REVISION'});
  await expect(commands.recordBeneficiary(actor,event.id,{requestId:randomUUID(),expectedRevision:1,kind:'CLEARED',organizationId:companyB,reason:'x'})).rejects.toMatchObject({code:'INVALID_INPUT'});
  await expect(commands.recordBeneficiary(actor,event.id,{requestId:randomUUID(),expectedRevision:1,kind:'CLEARED',organizationId:null,reason:'   '})).rejects.toMatchObject({code:'REASON_REQUIRED'});
  expect((await queries.detail(actor,event.id)).beneficiaryHistory).toHaveLength(1);
 });
 it('rejects foreign-Tenant companies and never creates a beneficiary for them',async()=>{
  const event=await intake();await db.admin.query('insert into factact.tenants(id,name,status) values($1,$2,$3)',[otherTenant,'Different Tenant','ACTIVE']);
  await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values($1,$2,$3,$4)',[otherCompany,otherTenant,'Foreign','ACTIVE']);
  await expect(confirm(event.id,otherCompany)).rejects.toMatchObject({code:'ORGANIZATION_INACTIVE'});
  expect((await queries.detail(actor,event.id)).beneficiary).toBeNull();
  expect((await withTenant(db.runtime,otherTenant,c=>c.query('select * from factact.support_event_beneficiary_decisions where support_event_id=$1',[event.id]))).rowCount).toBe(0);
 });
 it('the database refuses Person recipients and cross-Service or cross-Tenant event forgery',async()=>{
  const event=await intake(),personRecipient=event.serviceRecipientId;
  const insert=(recipient:string,service=ids.service,tenant=ids.tenant,revision=1)=>withTenant(db.runtime,tenant,c=>c.query(`insert into factact.support_event_beneficiary_decisions
    (id,tenant_id,support_event_id,service_id,request_id,revision,kind,service_recipient_id,reason,recorded_by_operator_id,recorded_at)
    values($1,$2,$3,$4,$5,$8,'CONFIRMED',$6,'human confirmed',$7,now())`,[randomUUID(),tenant,event.id,service,randomUUID(),recipient,ids.operator,revision]));
  await expect(insert(personRecipient)).rejects.toMatchObject({code:'23503'});
  const confirmed=await confirm(event.id);
  await expect(insert(confirmed.serviceRecipientId!,randomUUID(),ids.tenant,2)).rejects.toMatchObject({code:'23503'});
  await expect(insert(confirmed.serviceRecipientId!,ids.service,randomUUID(),2)).rejects.toMatchObject({code:'23503'});
  expect((await queries.detail(actor,event.id)).beneficiaryHistory).toHaveLength(1);
 });
 it('holds RLS/insert-only grants and atomically rolls back when audit fails',async()=>{
  const event=await intake();
  const original=new PgSupportUnitOfWork(db.runtime);
  const faulty=new SupportCommands({run:(tenant,fn)=>original.run(tenant,r=>{r.audit=async()=>{throw Error('audit failure');};return fn(r);})},runtime);
  await expect(faulty.recordBeneficiary(actor,event.id,{requestId:randomUUID(),expectedRevision:0,kind:'CONFIRMED',organizationId:companyB,reason:'confirmed'})).rejects.toThrow('audit failure');
  expect((await queries.detail(actor,event.id)).beneficiaryHistory).toEqual([]);
  const {rows}=await db.admin.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='factact.support_event_beneficiary_decisions'::regclass");
  expect(rows).toEqual([{relrowsecurity:true,relforcerowsecurity:true}]);
  await expect(withTenant(db.runtime,ids.tenant,c=>c.query('delete from factact.support_event_beneficiary_decisions'))).rejects.toMatchObject({code:'42501'});
  await expect(withTenant(db.runtime,ids.tenant,c=>c.query('update factact.support_event_beneficiary_decisions set reason=$1',['overwritten']))).rejects.toMatchObject({code:'42501'});
 });
 it('routes confirmation through strict input, current session and CSRF protection',async()=>{
  const event=await intake(),store=new PgIdentityStore(db.runtime,db.oidc);
  await store.createSession(tokenHash('beneficiary-test'),{tenantId:ids.tenant,operatorId:ids.operator},'csrf');
  const app=createApp({nodeEnv:'test',port:8080,origin:'http://localhost:5173',databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc', databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'},store,{authorizationUrl:()=>'',verifyCallback:async()=>{throw Error();}},pino({level:'silent'}),undefined,{commands,queries});
  const path=`/api/support/${event.id}/beneficiary`,body={requestId:randomUUID(),expectedRevision:0,kind:'CONFIRMED',organizationId:companyB,reason:'内部確認'};
  expect((await request(app).post(path).send(body)).status).toBe(401);
  expect((await request(app).post(path).set('Cookie','factact_session=beneficiary-test').send(body)).status).toBe(403);
  expect((await request(app).post(path).set('Cookie','factact_session=beneficiary-test').set('Origin','http://evil.invalid').set('x-csrf-token','csrf').send(body)).status).toBe(403);
  const authorized=()=>request(app).post(path).set('Cookie','factact_session=beneficiary-test').set('Origin','http://localhost:5173').set('x-csrf-token','csrf');
  expect((await authorized().send({...body,adminOverride:true})).status).toBe(400);
  expect((await authorized().send(body)).status).toBe(200);
  expect((await authorized().send(body)).status).toBe(200);
  expect((await queries.detail(actor,event.id)).beneficiary?.id).toBe(companyB);
 });
});
