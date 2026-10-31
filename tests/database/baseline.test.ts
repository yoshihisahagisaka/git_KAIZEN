import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { readFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { withTenant, assertRuntimeRole } from '../../apps/web/src/server/persistence/database.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import { authenticateSession } from '../../packages/application/src/operator-session.js';

const tenantA = '10000000-0000-4000-8000-000000000001';
const tenantB = '10000000-0000-4000-8000-000000000002';
const operatorA = '20000000-0000-4000-8000-000000000001';
const personA = '40000000-0000-4000-8000-000000000001';
let embedded: EmbeddedPostgres;
let admin: Pool;
let runtime: Pool;
let store: PgIdentityStore;
let directory: string;

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

beforeAll(async () => {
  // Fresh isolated real PostgreSQL, never a supplied production/remote URL.
  directory = await mkdtemp(resolve('.factact-db-test-'));
  const port = await freePort();
  embedded = new EmbeddedPostgres({ databaseDir: directory, user: 'postgres', password: 'test-admin', port,
    persistent: true, createPostgresUser: false, initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'], onLog: () => {}, onError: () => {},
  });
  await embedded.initialise();
  await embedded.start();
  admin = new Pool({ host: '127.0.0.1', port, user: 'postgres', password: 'test-admin', database: 'postgres' });
  const migration = await readFile('supabase/migrations/20260909000100_platform_baseline.sql', 'utf8');
  await admin.query('BEGIN');
  try { await admin.query(migration); await admin.query('COMMIT'); } catch (error) { await admin.query('ROLLBACK'); throw error; }
  await admin.query(await readFile('supabase/seed.sql', 'utf8'));
  await admin.query("alter role factact_runtime password 'test-runtime'");
  // Second tenant is a test fixture, not demo seed or a second customer-as-tenant model.
  await admin.query("insert into factact.tenants (id,name,status) values ($1,'Isolation fixture','ACTIVE')", [tenantB]);
  runtime = new Pool({ host: '127.0.0.1', port, user: 'factact_runtime', password: 'test-runtime', database: 'postgres', max: 1 });
  store = new PgIdentityStore(runtime);
});
afterAll(async () => {
  await runtime?.end(); await admin?.end();
  await embedded?.stop();
  if (directory) {
    // Verify the resolved recursive-delete target is confined to this workspace fixture.
    const root = await realpath(process.cwd());
    const target = await realpath(directory);
    if (!target.startsWith(root + sep + '.factact-db-test-')) throw new Error('Unsafe test cleanup target');
    await rm(target, { recursive: true, force: true });
  }
});

describe('PostgreSQL migration, identity and RLS baseline', () => {
  it('rejects a privileged runtime connection', async () => {
    await expect(assertRuntimeRole(runtime)).resolves.toBeUndefined();
    await expect(assertRuntimeRole(admin)).rejects.toThrow('restricted');
  });
  it('seed preserves only prerequisites and an explicit bounded requirement', async () => {
    const rows = await withTenant(runtime, tenantA, async c => (await c.query('select configuration_json from factact.contract_profiles')).rows);
    expect(rows[0].configuration_json.requirements.COMPANY_PC.policy).toBe('REQUIRED');
    const { rows: tables } = await admin.query("select tablename from pg_tables where schemaname='factact'");
    expect(tables.map(t => t.tablename)).not.toContain('relations');
  });
  it('all business tables have enabled and forced RLS', async () => {
    const { rows } = await admin.query("select relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='factact' and c.relkind='r'");
    expect(rows.length).toBe(9);
    expect(rows.every(r => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
  it('missing tenant context returns no business rows', async () => {
    expect((await runtime.query('select * from factact.people')).rowCount).toBe(0);
  });
  it('same-tenant Person is readable; another tenant cannot read it even without a tenant predicate', async () => {
    expect(await withTenant(runtime, tenantA, async c => (await c.query('select * from factact.people where id=$1', [personA])).rowCount)).toBe(1);
    expect(await withTenant(runtime, tenantB, async c => (await c.query('select * from factact.people where id=$1', [personA])).rowCount)).toBe(0);
  });
  it('missing context and foreign-tenant audit writes fail', async () => {
    const sql = "insert into factact.audit_events (id,tenant_id,aggregate_type,aggregate_id,event_type) values ($1,$2,'PERSON',$3,'TEST')";
    await expect(runtime.query(sql, [randomUUID(), tenantA, personA])).rejects.toMatchObject({ code: '42501' });
    await expect(withTenant(runtime, tenantB, c => c.query(sql, [randomUUID(), tenantA, personA]))).rejects.toMatchObject({ code: '42501' });
  });
  it('composite foreign key rejects an actor from another tenant', async () => {
    await expect(withTenant(runtime, tenantB, c => c.query("insert into factact.audit_events (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id) values ($1,$2,'PERSON',$3,'TEST',$4)", [randomUUID(), tenantB, personA, operatorA]))).rejects.toMatchObject({ code: '23503' });
  });
  it('audit rollback is atomic and tenant context does not leak through the one-connection pool', async () => {
    const id = randomUUID();
    await expect(withTenant(runtime, tenantA, async c => {
      await c.query("insert into factact.audit_events (id,tenant_id,aggregate_type,aggregate_id,event_type) values ($1,$2,'PERSON',$3,'TEST')", [id, tenantA, personA]);
      throw new Error('abort');
    })).rejects.toThrow('abort');
    expect((await admin.query('select 1 from factact.audit_events where id=$1', [id])).rowCount).toBe(0);
    expect((await runtime.query('select * from factact.people')).rowCount).toBe(0);
    await withTenant(runtime, tenantA, c => c.query('select * from factact.people'));
    expect((await runtime.query('select * from factact.people')).rowCount).toBe(0);
  });
  it('runtime cannot update/delete audit, change contract, or read private tables', async () => {
    for (const sql of ['delete from factact.audit_events', "update factact.contract_profiles set version=2", 'select * from factact_private.sessions']) {
      await expect(withTenant(runtime, tenantA, c => c.query(sql))).rejects.toMatchObject({ code: '42501' });
    }
  });
  it('identity mapping returns internal IDs and keeps unknown subjects unknown', async () => {
    expect(await store.resolveIdentity({ issuer: 'https://seed.example.invalid', subject: 'development-operator' })).toEqual({ tenantId: tenantA, operatorId: operatorA });
    expect(await store.resolveIdentity({ issuer: 'https://accounts.google.com', subject: 'development-operator' })).toBeNull();
  });
  it('concurrent callback consumption succeeds exactly once and expired transactions fail', async () => {
    const hash = tokenHash('login');
    const login = { state: 'state', nonce: 'nonce', verifier: 'verifier' };
    await store.beginLogin(hash, login);
    const results = await Promise.all([store.consumeLogin(hash), store.consumeLogin(hash)]);
    expect(results.filter(Boolean)).toEqual([login]);
    await store.beginLogin(hash, login);
    await admin.query("update factact_private.login_transactions set expires_at=now()-interval '1 second'");
    expect(await store.consumeLogin(hash)).toBeNull();
  });
  it('session expiry, revocation and inactive Operator are enforced server-side', async () => {
    const hash = tokenHash('session');
    await store.createSession(hash, { tenantId: tenantA, operatorId: operatorA }, 'csrf');
    expect((await authenticateSession(store, hash))?.operator.id).toBe(operatorA);
    await admin.query("update factact.operators set status='INACTIVE' where id=$1", [operatorA]);
    expect(await authenticateSession(store, hash)).toBeNull();
    await admin.query("update factact.operators set status='ACTIVE' where id=$1", [operatorA]);
    await admin.query("update factact_private.sessions set expires_at=now()-interval '1 second'");
    expect(await authenticateSession(store, hash)).toBeNull();
    await store.revokeSession(hash);
    expect(await store.readSession(hash)).toBeNull();
  });
});
