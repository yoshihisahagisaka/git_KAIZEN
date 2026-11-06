import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { withTenant } from '../../apps/web/src/server/persistence/database.js';
import { PgJoinRepository } from '../../apps/web/src/server/persistence/join-repository.js';
import { ids, testDatabase } from '../fixtures/database.js';

const tenantB = '10000000-0000-4000-8000-000000000002';
const organizationB = '30000000-0000-4000-8000-000000000002';
const foreignOrganization = '30000000-0000-4000-8000-000000000003';
let db: Awaited<ReturnType<typeof testDatabase>>;

beforeAll(async () => {
  db = await testDatabase();
  await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values ($1,$2,$3,$4)',
    [organizationB,ids.tenant,'Customer B','ACTIVE']);
  await db.admin.query('insert into factact.tenants(id,name,status) values ($1,$2,$3)',[tenantB,'Other Tenant','ACTIVE']);
  await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values ($1,$2,$3,$4)',
    [foreignOrganization,tenantB,'Foreign Customer','ACTIVE']);
},60_000);
afterAll(async () => { await db?.close(); },60_000);

const repo = <T>(tenantId: string, fn: (r: PgJoinRepository) => Promise<T>) =>
  withTenant(db.runtime,tenantId,c=>fn(new PgJoinRepository(c,tenantId)));

describe('Organization Service Recipient — backward-compatible Core', () => {
  it('keeps Person recipients and their existing FK semantics unchanged', async () => {
    const id=await repo(ids.tenant,r=>r.ensureRecipient(randomUUID(),ids.service,ids.person));
    expect((await repo(ids.tenant,r=>r.recipientPerson(id)))?.id).toBe(ids.person);
    expect(await repo(ids.tenant,r=>r.recipientOrganization(id))).toBeNull();
    const {rows}=await withTenant(db.runtime,ids.tenant,c=>c.query('select recipient_type,recipient_id,recipient_organization_id from factact.service_recipients where id=$1',[id]));
    expect(rows).toEqual([{recipient_type:'PERSON',recipient_id:ids.person,recipient_organization_id:null}]);
  });

  it('creates a company recipient without pretending the Caller Person is its beneficiary', async () => {
    const id=await repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
    expect(await repo(ids.tenant,r=>r.recipientPerson(id))).toBeNull();
    expect(await repo(ids.tenant,r=>r.recipientOrganization(id))).toEqual({id:ids.organization,name:expect.any(String)});
    const {rows}=await withTenant(db.runtime,ids.tenant,c=>c.query('select recipient_type,recipient_id,recipient_organization_id from factact.service_recipients where id=$1',[id]));
    expect(rows).toEqual([{recipient_type:'ORGANIZATION',recipient_id:null,recipient_organization_id:ids.organization}]);
    expect(await repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization))).toBe(id);
  });

  it('distinguishes company A and B as two recipients inside the same Tenant and Service', async () => {
    const a=await repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
    const b=await repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,organizationB));
    expect(a).not.toBe(b);
    expect((await repo(ids.tenant,r=>r.recipientOrganization(b)))?.id).toBe(organizationB);
  });

  it('does not expose a recipient to another Tenant through the restricted runtime role', async () => {
    const id=await repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
    expect(await repo(tenantB,r=>r.recipientOrganization(id))).toBeNull();
    expect((await withTenant(db.runtime,tenantB,c=>c.query('select * from factact.service_recipients where id=$1',[id]))).rowCount).toBe(0);
    expect((await db.runtime.query('select * from factact.service_recipients')).rowCount).toBe(0);
  });

  it('rejects a foreign-Tenant Organization reference even when the caller knows its UUID', async () => {
    await expect(repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,foreignOrganization)))
      .rejects.toMatchObject({code:'ORGANIZATION_INACTIVE'});
    await expect(withTenant(db.runtime,ids.tenant,c=>c.query(`insert into factact.service_recipients
      (id,tenant_id,service_id,recipient_type,recipient_organization_id)
      values ($1,$2,$3,'ORGANIZATION',$4)`,[randomUUID(),ids.tenant,ids.service,foreignOrganization])))
      .rejects.toMatchObject({code:'23503'});
  });

  it('rejects ambiguous Person/Organization combinations at the database boundary', async () => {
    await expect(withTenant(db.runtime,ids.tenant,c=>c.query(`insert into factact.service_recipients
      (id,tenant_id,service_id,recipient_type,recipient_id,recipient_organization_id)
      values ($1,$2,$3,'ORGANIZATION',$4,$5)`,[randomUUID(),ids.tenant,ids.service,ids.person,organizationB])))
      .rejects.toMatchObject({code:'23514'});
  });

  it('rejects an inactive Organization without creating a recipient', async () => {
    await db.admin.query("update factact.organizations set status='INACTIVE' where id=$1",[organizationB]);
    await expect(repo(ids.tenant,r=>r.ensureOrganizationRecipient(randomUUID(),ids.service,organizationB)))
      .rejects.toMatchObject({code:'ORGANIZATION_INACTIVE'});
    await db.admin.query("update factact.organizations set status='ACTIVE' where id=$1",[organizationB]);
  });

  it('preserves the forced Tenant RLS and existing runtime privileges on recipient rows', async () => {
    const {rows}=await db.admin.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='factact.service_recipients'::regclass");
    expect(rows).toEqual([{relrowsecurity:true,relforcerowsecurity:true}]);
    await expect(withTenant(db.runtime,ids.tenant,c=>c.query('delete from factact.service_recipients')))
      .rejects.toMatchObject({code:'42501'});
  });
});
