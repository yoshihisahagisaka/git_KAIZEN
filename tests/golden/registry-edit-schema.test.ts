import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';

const reviewer='20000000-0000-4000-8000-000000000002';
const otherTenant='10000000-0000-4000-8000-000000000002';
const now='2026-11-10T10:00:00Z';
let db:Awaited<ReturnType<typeof testDatabase>>;
let organizationRecipient:string;

beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{
  await db.reset();
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'reviewer@example.invalid','Reviewer','ACTIVE')`,[reviewer,ids.tenant]);
  organizationRecipient=await withTenant(db.runtime,ids.tenant,client=>
    new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
},60_000);
afterAll(async()=>{await db?.close();},60_000);

const insertRequest=async(options:Record<string,unknown>={})=>{
  const source={id:randomUUID(),tenantId:ids.tenant,actorId:ids.operator,serviceId:ids.service,
    contractId:ids.contract,recipientId:organizationRecipient,personId:ids.person,requestKey:randomUUID(),
    original:'田中 一郎',proposed:'田中 太郎',revision:0,reason:'登録表記の訂正',...options};
  await withTenant(db.runtime,ids.tenant,client=>client.query(`
    insert into factact.registry_edit_requests
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,service_recipient_id,
     target_person_id,request_key,original_display_name,proposed_display_name,
     expected_registry_revision,reason,created_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[
      source.id,source.tenantId,source.actorId,source.serviceId,source.contractId,
      source.recipientId,source.personId,source.requestKey,source.original,source.proposed,
      source.revision,source.reason,now,
    ]));
  return source;
};
const insertChange=async(requestId:string,overrides:Record<string,unknown>={})=>{
  const change={id:randomUUID(),workId:null,actionId:null,requestId,proposer:ids.operator,
    type:'KNOWLEDGE_STATE_CHANGE',kind:'PERSON_DISPLAY_NAME_CORRECTION',status:'PROPOSED',...overrides};
  await withTenant(db.runtime,ids.tenant,client=>client.query(`
    insert into factact.changes
    (id,tenant_id,work_id,action_id,registry_edit_request_id,proposed_by_operator_id,
     change_type,change_kind,status,subject_type,subject_id,proposed_effect_json,created_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,'PERSON',$10,$11,$12)`,[
      change.id,ids.tenant,change.workId,change.actionId,change.requestId,change.proposer,
      change.type,change.kind,change.status,ids.person,
      {beforeDisplayName:'田中 一郎',afterDisplayName:'田中 太郎',expectedRevision:0},now,
    ]));
  return change;
};

describe('Registry first-edit persistence is isolated from JOIN and authoritative Person mutation',()=>{
  it('stores a real standalone request and a PROPOSED Change without Work/Action or Person mutation',async()=>{
    const source=await insertRequest();
    const change=await insertChange(source.id);
    const result=await withTenant(db.runtime,ids.tenant,client=>client.query(`
      select c.status,c.work_id,c.action_id,c.registry_edit_request_id,c.change_type,c.change_kind,
             p.display_name,p.registry_revision
      from factact.changes c join factact.people p on p.id=c.subject_id and p.tenant_id=c.tenant_id
      where c.id=$1`,[change.id]));
    expect(result.rows).toEqual([{
      status:'PROPOSED',work_id:null,action_id:null,registry_edit_request_id:source.id,
      change_type:'KNOWLEDGE_STATE_CHANGE',change_kind:'PERSON_DISPLAY_NAME_CORRECTION',
      display_name:'田中 一郎',registry_revision:'0',
    }]);
  });

  it('keeps source immutable and grants no direct Person display-name update',async()=>{
    const source=await insertRequest();
    const personUpdate=()=>withTenant(db.runtime,ids.tenant,client=>client.query(
      'update factact.people set display_name=$2 where id=$1',[ids.person,'Unauthorized']));
    await expect(personUpdate()).rejects.toMatchObject({code:'42501'});
    await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
      'update factact.registry_edit_requests set reason=$2 where id=$1',[source.id,'rewritten']))).rejects.toMatchObject({code:'42501'});
    await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
      'delete from factact.registry_edit_requests where id=$1',[source.id]))).rejects.toMatchObject({code:'42501'});
    const flags=await db.admin.query(`select relrowsecurity,relforcerowsecurity from pg_class
      where oid='factact.registry_edit_requests'::regclass`);
    expect(flags.rows).toEqual([{relrowsecurity:true,relforcerowsecurity:true}]);
  });

  it('rejects malformed request data, duplicate idempotency and forged cross-tenant references',async()=>{
    const first=await insertRequest();
    await expect(insertRequest({requestKey:first.requestKey})).rejects.toMatchObject({code:'23505'});
    await expect(insertRequest({proposed:'田中 一郎'})).rejects.toMatchObject({code:'23514'});
    await expect(insertRequest({proposed:'  '})).rejects.toMatchObject({code:'23514'});
    await expect(insertRequest({reason:''})).rejects.toMatchObject({code:'23514'});
    await expect(insertRequest({revision:-1})).rejects.toMatchObject({code:'23514'});
    await expect(insertRequest({recipientId:randomUUID()})).rejects.toMatchObject({code:'23503'});
    await expect(insertRequest({personId:randomUUID()})).rejects.toMatchObject({code:'23503'});
    await db.admin.query('insert into factact.tenants(id,name,status) values($1,$2,$3)',[otherTenant,'Other','ACTIVE']);
    await expect(insertRequest({tenantId:otherTenant})).rejects.toMatchObject({code:'42501'});
    const invisible=await withTenant(db.runtime,otherTenant,client=>client.query(
      'select id from factact.registry_edit_requests where id=$1',[first.id]));
    expect(invisible.rows).toEqual([]);
  });

  it('allows exactly one source path and one Change per Registry request',async()=>{
    const source=await insertRequest();
    await insertChange(source.id);
    await expect(insertChange(source.id)).rejects.toMatchObject({code:'23505'});
    const another=await insertRequest();
    await expect(insertChange(another.id,{type:'REALITY_CHANGE'})).rejects.toMatchObject({code:'23514'});
    await expect(insertChange(another.id,{kind:'PRIMARY_DEVICE_ASSIGNMENT'})).rejects.toMatchObject({code:'23514'});
    await expect(insertChange(another.id,{proposer:null})).rejects.toMatchObject({code:'23514'});
    await expect(insertChange(null as unknown as string)).rejects.toMatchObject({code:'23514'});
    await expect(insertChange(another.id,{workId:randomUUID()})).rejects.toMatchObject({code:'23514'});
  });

  it('refuses same-Actor Registry review or commit even at the schema boundary',async()=>{
    const source=await insertRequest();
    const change=await insertChange(source.id);
    await expect(db.admin.query(`update factact.changes
      set status='VERIFIED',verification_summary='確認',verified_by_operator_id=$2,verified_at=$3
      where id=$1`,[change.id,ids.operator,now])).rejects.toMatchObject({code:'23514'});
    await db.admin.query(`update factact.changes
      set status='VERIFIED',verification_summary='別人確認',verified_by_operator_id=$2,verified_at=$3
      where id=$1`,[change.id,reviewer,now]);
    await expect(db.admin.query(`update factact.changes
      set status='COMMITTED',committed_by_operator_id=$2,committed_at=$3
      where id=$1`,[change.id,ids.operator,now])).rejects.toMatchObject({code:'23514'});
    await expect(db.admin.query(`update factact.changes
      set status='COMMITTED',committed_at=$2 where id=$1`,[change.id,now])).rejects.toMatchObject({code:'23514'});
    const statuses=await db.admin.query('select status,committed_at from factact.changes where id=$1',[change.id]);
    expect(statuses.rows).toEqual([{status:'VERIFIED',committed_at:null}]);
  });
});
