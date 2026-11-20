import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { withTenant } from '../../apps/web/src/server/persistence/database.js';
import { ids, testDatabase } from '../fixtures/database.js';

type Db = Awaited<ReturnType<typeof testDatabase>>;
let db: Db;

const orgB = '30000000-0000-4000-8000-000000000002';
const tenantB = '10000000-0000-4000-8000-000000000002';

beforeAll(async () => { db = await testDatabase(); });
beforeEach(async () => { await db.reset(); });
afterAll(async () => { if (db) await db.close(); });

async function sourceEvidence() {
  const id = randomUUID();
  // Structural FK fixture only; S2 must define genuine source-document Evidence.
  await db.admin.query(
    "insert into factact.evidence (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at) values ($1,$2,'VERIFICATION','synthetic fixture','fixture only',$3,now())",
    [id, ids.tenant, ids.operator]);
  return id;
}

async function scopedDevice() {
  await db.admin.query(
    "update factact.devices set organization_id=$2, device_status='UNKNOWN' where id=$1",
    [ids.device, ids.organization]);
}

async function insertEvent(overrides: Record<string, unknown> = {}) {
  const evidenceId = await sourceEvidence();
  const values = {
    id: randomUUID(), tenant_id: ids.tenant, device_id: ids.device,
    organization_id: ids.organization, device_revision: 1,
    field_key:'assetTag', event_kind:'SOURCE_ACCEPTED', field_value:'PC-0073',
    source_kind:'CUSTOMER_REGISTER', source_evidence_id:evidenceId,
    source_locator:'sheet:assets,row:2', source_observed_at:'2026-11-17T00:00:00.000Z',
    source_work_id:null, source_change_id:null, recorded_by_operator_id:ids.operator,
    verified_by_operator_id:null, verified_at:null, ...overrides,
  };
  const keys = Object.keys(values);
  const query = 'insert into factact.device_field_events ('+keys.join(',')+
    ') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+')';
  await db.admin.query(query,Object.values(values));
  return values.id as string;
}

describe('S1 Device storage — isolated synthetic PostgreSQL', () => {
  it('preserves legacy unowned/AVAILABLE Device without promoting it to verified', async () => {
    const {rows} = await db.admin.query(
      'select organization_id,device_status,registry_revision from factact.devices where id=$1',
      [ids.device]);
    expect(rows[0]).toEqual({
      organization_id:null,device_status:'AVAILABLE',registry_revision:'0'});
  });

  it('represents UNKNOWN operational status independently of provenance', async () => {
    await scopedDevice();
    const {rows} = await db.admin.query(
      'select organization_id,device_status from factact.devices where id=$1',[ids.device]);
    expect(rows[0]).toEqual({organization_id:ids.organization,device_status:'UNKNOWN'});
    expect((await db.admin.query(
      'select id from factact.device_field_events where device_id=$1',[ids.device])).rowCount).toBe(0);
  });

  it('denies cross-tenant Organization attribution with the composite FK', async () => {
    await db.admin.query(
      "insert into factact.tenants(id,name,status) values ($1,'tenant B','ACTIVE')",[tenantB]);
    await db.admin.query(
      "insert into factact.organizations(id,tenant_id,name,status) values ($1,$2,'customer B','ACTIVE')",
      [orgB,tenantB]);
    await expect(db.admin.query(
      'update factact.devices set organization_id=$1 where id=$2',[orgB,ids.device]))
      .rejects.toMatchObject({code:'23503'});
  });

  it('retains old tenant-wide asset-tag uniqueness pending separate safe cutover', async () => {
    await db.admin.query(
      "insert into factact.organizations(id,tenant_id,name,status) values ($1,$2,'customer B','ACTIVE')",
      [orgB,ids.tenant]);
    await expect(db.admin.query(
      "insert into factact.devices (id,tenant_id,organization_id,asset_tag,display_name,device_status) values ($1,$2,$3,'PC-0073','other customer','UNKNOWN')",
      [randomUUID(),ids.tenant,orgB])).rejects.toMatchObject({code:'23505'});
  });

  it('requires FORCE RLS and refuses direct runtime history CRUD', async () => {
    const {rows} = await db.admin.query(
      "select c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='factact' and c.relname='device_field_events'");
    expect(rows[0]).toEqual({relrowsecurity:true,relforcerowsecurity:true});
    for(const sql of [
      'select * from factact.device_field_events',
      'delete from factact.device_field_events',
      'insert into factact.device_field_events(id) values (gen_random_uuid())',
    ]){
      await expect(withTenant(db.runtime,ids.tenant,c=>c.query(sql)))
        .rejects.toMatchObject({code:'42501'});
    }
  });

  it('enforces same-device customer FK and existing Evidence reference', async () => {
    await scopedDevice();
    const id=await insertEvent();
    expect((await db.admin.query(
      'select 1 from factact.device_field_events where id=$1',[id])).rowCount).toBe(1);
    await db.admin.query(
      "insert into factact.organizations(id,tenant_id,name,status) values ($1,$2,'customer B','ACTIVE')",
      [orgB,ids.tenant]);
    await expect(insertEvent({organization_id:orgB}))
      .rejects.toMatchObject({code:'23503'});
    await expect(insertEvent({source_evidence_id:randomUUID()}))
      .rejects.toMatchObject({code:'23503'});
  });

  it('never promotes a customer-sheet claim into a verified field', async () => {
    await scopedDevice();
    await expect(insertEvent({
      event_kind:'FIELD_VERIFIED',verified_by_operator_id:ids.operator,
      verified_at:'2026-11-17T01:00:00.000Z',
    })).rejects.toMatchObject({code:'23514'});
    await expect(insertEvent({
      event_kind:'SOURCE_ACCEPTED',verified_by_operator_id:ids.operator,
      verified_at:'2026-11-17T01:00:00.000Z',
    })).rejects.toMatchObject({code:'23514'});
    await expect(insertEvent({
      field_key:'deviceStatusClaim',event_kind:'FIELD_VERIFIED',field_value:'利用中',
      source_kind:'PHYSICAL_INVENTORY',verified_by_operator_id:ids.operator,
      verified_at:'2026-11-17T01:00:00.000Z',
    })).rejects.toMatchObject({code:'23514'});
  });

  it('records history append-only, including privileged update/delete attempt', async () => {
    await scopedDevice();
    const id=await insertEvent();
    await expect(db.admin.query(
      'update factact.device_field_events set field_value=$2 where id=$1',[id,'modified']))
      .rejects.toMatchObject({code:'55000'});
    await expect(db.admin.query(
      'delete from factact.device_field_events where id=$1',[id]))
      .rejects.toMatchObject({code:'55000'});
  });

  it('never links field history to a legacy Device without known customer', async () => {
    await expect(insertEvent()).rejects.toMatchObject({code:'23503'});
  });
});
