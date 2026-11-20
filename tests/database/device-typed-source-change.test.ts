import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {ids,testDatabase} from '../fixtures/database.js';

type TestDb=Awaited<ReturnType<typeof testDatabase>>;
let db:TestDb;
let recipient:string;
const createdBy=ids.operator;

beforeAll(async()=>{db=await testDatabase();});
beforeEach(async()=>{
  await db.reset();
  recipient=randomUUID();
  // Only structural schema fixture: main's recipient is PERSON only.
  // Actual Device Commands must require Organization Recipient from upstream.
  await db.admin.query(
    "insert into factact.service_recipients (id,tenant_id,service_id,recipient_type,recipient_id,status) values ($1,$2,$3,'PERSON',$4,'ACTIVE')",
    [recipient,ids.tenant,ids.service,ids.person]);
});
afterAll(async()=>{if(db)await db.close();});

async function evidence(){
  const id=randomUUID();
  await db.admin.query(
    "insert into factact.evidence(id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at) values ($1,$2,'SOURCE_REFERENCE','Synthetic asset sheet','sha256:synthetic-only',$3,now())",
    [id,ids.tenant,createdBy]);
  return id;
}
async function request(overrides:Record<string,unknown>={}){
  const evidenceId=await evidence();
  const row:{
    id:string;tenant_id:string;actor_operator_id:string;service_id:string;
    contract_profile_id:string;service_recipient_id:string;organization_id:string;
    target_device_id:string;request_key:string;request_kind:string;
    expected_registry_revision:number;proposed_effect_json:unknown;
    source_evidence_id:string;source_kind:string;source_locator:string;
    source_observed_at:string;source_work_id:string|null;
  }={
    id:randomUUID(),tenant_id:ids.tenant,actor_operator_id:createdBy,
    service_id:ids.service,contract_profile_id:ids.contract,
    service_recipient_id:recipient,organization_id:ids.organization,
    target_device_id:randomUUID(),request_key:'r00000001',
    request_kind:'DEVICE_INITIAL_INFORMATION',expected_registry_revision:0,
    proposed_effect_json:{assetTag:'PC-018',displayName:'営業PC'},
    source_evidence_id:evidenceId,source_kind:'CUSTOMER_REGISTER',
    source_locator:'Assets:row2',source_observed_at:'2026-11-20T01:00:00.000Z',
    source_work_id:null,
  };
  const data={...row,...overrides};
  const keys=Object.keys(data);
  const params=keys.map((_,i)=>'$'+(i+1)).join(',');
  await db.admin.query(
    'insert into factact.device_change_requests ('+keys.join(',')+') values ('+params+')',
    Object.values(data));
  return data;
}
async function change(
  req:Awaited<ReturnType<typeof request>>, overrides:Record<string,unknown>={}
){
  const data={
    id:randomUUID(),tenant_id:ids.tenant,work_id:null,action_id:null,
    change_type:'KNOWLEDGE_STATE_CHANGE',change_kind:req.request_kind,
    subject_type:'DEVICE',subject_id:null,device_subject_id:req.target_device_id,
    device_change_request_id:req.id,proposed_by_operator_id:req.actor_operator_id,
    proposed_effect_json:req.proposed_effect_json,status:'PROPOSED',
    created_at:'2026-11-20T01:05:00.000Z',...overrides,
  };
  const keys=Object.keys(data);
  await db.admin.query(
    'insert into factact.changes ('+keys.join(',')+') values ('+
      keys.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(data));
  return data;
}

describe('S2b Device typed source / common Change invariants — synthetic DB',()=>{
  it('creates source reference Evidence without storing the source spreadsheet',async()=>{
    const ev=await evidence();
    const {rows}=await db.admin.query(
      'select evidence_type,content_text from factact.evidence where id=$1',[ev]);
    expect(rows[0]).toEqual({
      evidence_type:'SOURCE_REFERENCE',content_text:'sha256:synthetic-only'});
  });

  it('typed Device request and common PROPOSED Change share exact immutable identity',async()=>{
    const req=await request();
    const c=await change(req);
    const {rows}=await db.admin.query(
      'select change_kind,change_type,subject_type,subject_id,device_subject_id,device_change_request_id,status from factact.changes where id=$1',
      [c.id]);
    expect(rows[0]).toMatchObject({
      change_kind:'DEVICE_INITIAL_INFORMATION',change_type:'KNOWLEDGE_STATE_CHANGE',
      subject_type:'DEVICE',subject_id:null,device_subject_id:req.target_device_id,
      device_change_request_id:req.id,status:'PROPOSED',
    });
    // No Device is created at Proposal. Registration/commit is S2b-2.
    expect((await db.admin.query('select 1 from factact.devices where id=$1',
      [req.target_device_id])).rowCount).toBe(0);
  });

  it('runtime cannot access Device source ledger or read a Device Change',async()=>{
    const req=await request();
    const c=await change(req);
    for(const sql of [
      'select * from factact.device_change_requests',
      'delete from factact.device_change_requests',
      'insert into factact.device_change_requests(id) values (gen_random_uuid())',
    ]){
      await expect(withTenant(db.runtime,ids.tenant,x=>x.query(sql)))
        .rejects.toMatchObject({code:'42501'});
    }
    const rows=await withTenant(db.runtime,ids.tenant,x=>x.query(
      'select id from factact.changes where id=$1',[c.id]));
    expect(rows.rowCount).toBe(0);
  });

  it('runtime direct UPDATE of a Device Change is suppressed; no authorized RPC exists',async()=>{
    const req=await request();
    const c=await change(req);
    const result=await withTenant(db.runtime,ids.tenant,x=>x.query(
      "update factact.changes set status='REJECTED' where id=$1",[c.id]));
    expect(result.rowCount).toBe(0);
    const {rows}=await db.admin.query('select status from factact.changes where id=$1',[c.id]);
    expect(rows[0]?.status).toBe('PROPOSED');
  });

  it('a Device request is immutable (no UPDATE or DELETE even by table owner)',async()=>{
    const req=await request();
    await expect(db.admin.query(
      "update factact.device_change_requests set source_locator='different' where id=$1",
      [req.id])).rejects.toMatchObject({code:'55000'});
    await expect(db.admin.query(
      'delete from factact.device_change_requests where id=$1',[req.id]))
      .rejects.toMatchObject({code:'55000'});
  });

  it('unique Actor request key prevents duplicate proposals at the source boundary',async()=>{
    await request();
    await expect(request()).rejects.toMatchObject({code:'23505'});
  });

  it('a forged Device Change subject cannot be linked to another request',async()=>{
    const req=await request();
    await expect(change(req,{device_subject_id:randomUUID()}))
      .rejects.toMatchObject({code:'23503'});
    await expect(change(req,{proposed_by_operator_id:randomUUID()}))
      .rejects.toMatchObject({code:'23503'});
  });

  it('mixed JOIN Action and Device Source is denied by the exact-source CHECK',async()=>{
    const req=await request();
    await expect(change(req,{work_id:randomUUID()}))
      .rejects.toMatchObject({code:'23514'});
    await expect(change(req,{action_id:randomUUID()}))
      .rejects.toMatchObject({code:'23514'});
  });

  it('Device source is not allowed to masquerade as a PERSON Change',async()=>{
    const req=await request();
    await expect(change(req,{subject_type:'PERSON'}))
      .rejects.toMatchObject({code:'23514'});
    await expect(change(req,{subject_id:ids.person}))
      .rejects.toMatchObject({code:'23514'});
  });

  it('customer register cannot attest physical FIELD_VERIFICATION',async()=>{
    await expect(request({
      request_kind:'DEVICE_FIELD_VERIFICATION',
      expected_registry_revision:1,
      source_kind:'CUSTOMER_REGISTER',
    })).rejects.toMatchObject({code:'23514'});
  });

  it('self-verification on Device Change cannot satisfy dual control',async()=>{
    const req=await request();
    const c=await change(req);
    await expect(db.admin.query(
      "update factact.changes set status='VERIFIED',verified_by_operator_id=$2,verified_at=now(),verification_summary='self' where id=$1",
      [c.id,createdBy])).rejects.toMatchObject({code:'23514'});
    expect((await db.admin.query('select status from factact.changes where id=$1',
      [c.id])).rows[0]?.status).toBe('PROPOSED');
  });

  it('committed Device Change needs distinct verifier and committer',async()=>{
    const req=await request();
    const c=await change(req);
    const reviewer=randomUUID();
    await db.admin.query(
      "insert into factact.operators(id,tenant_id,email,display_name,status) values ($1,$2,'reviewer@example.invalid','Synthetic Reviewer','ACTIVE')",
      [reviewer,ids.tenant]);
    await db.admin.query(
      "update factact.changes set status='VERIFIED',verified_by_operator_id=$2,verified_at=now(),verification_summary='checked' where id=$1",
      [c.id,reviewer]);
    await expect(db.admin.query(
      "update factact.changes set status='COMMITTED',committed_at=now(),committed_by_operator_id=$2 where id=$1",
      [c.id,createdBy])).rejects.toMatchObject({code:'23514'});
    await db.admin.query(
      "update factact.changes set status='COMMITTED',committed_at=now(),committed_by_operator_id=$2 where id=$1",
      [c.id,reviewer]);
    expect((await db.admin.query('select status from factact.changes where id=$1',[c.id]))
      .rows[0]?.status).toBe('COMMITTED');
    // S2b-1 only proves schema constraints; no source event, Device or Audit
    // was generated by those manually privileged fixture updates.
  });

  it('source Evidence and Organization cannot reference another Tenant',async()=>{
    await expect(request({organization_id:randomUUID()}))
      .rejects.toMatchObject({code:'23503'});
    await expect(request({source_evidence_id:randomUUID()}))
      .rejects.toMatchObject({code:'23503'});
  });

  it('source and common Change table keep FORCE RLS enabled',async()=>{
    const {rows}=await db.admin.query(
      "select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='factact' and c.relname in ('device_change_requests','changes')");
    expect(rows).toHaveLength(2);
    expect(rows.every(r=>r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
