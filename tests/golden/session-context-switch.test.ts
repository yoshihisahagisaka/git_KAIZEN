import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../apps/web/src/server/app.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { withTenant } from '../../apps/web/src/server/persistence/database.js';
import { ids, testDatabase } from '../fixtures/database.js';

const tenantB = '10000000-0000-4000-8000-000000000002';
const operatorB = '20000000-0000-4000-8000-000000000002';
const unassignedTenant = '10000000-0000-4000-8000-000000000003';
const identity = { issuer: 'https://accounts.google.com' as const, subject: 'session-context-fixture' };
const config = {
  nodeEnv: 'test' as const, port: 8080, origin: 'http://localhost:5173',
  databaseUrl: 'postgresql://test', databaseSsl: false,
  issuer: identity.issuer, clientId: 'test', clientSecret: 'test',
  redirectUri: 'http://localhost:5173/auth/callback',
};
let db: Awaited<ReturnType<typeof testDatabase>>;
let store: PgIdentityStore;

function app() {
  return createApp(config, store, {
    authorizationUrl: () => 'https://accounts.google.com/authorize',
    verifyCallback: async () => identity,
  }, pino({ level: 'silent' }));
}

function sessionCookie(headers: Record<string, unknown>): string {
  const value = String(headers['set-cookie']).match(/factact_session=[^;,]+/)?.[0];
  if (!value) throw new Error('Missing opaque session cookie');
  return value;
}

const tokenFromCookie = (cookie: string) => cookie.slice('factact_session='.length);

async function logIn() {
  const server = app();
  const start = await request(server).get('/auth/login').expect(302);
  const flow = String(start.headers['set-cookie']).match(/factact_login=[^;,]+/)?.[0];
  if (!flow) throw new Error('Missing one-time login cookie');
  const callback = await request(server).get('/auth/callback?code=fake')
    .set('Cookie', flow).expect(302);
  const cookie = sessionCookie(callback.headers);
  const session = await request(server).get('/api/session').set('Cookie', cookie).expect(200);
  return { server, cookie, csrf: session.body.data.csrfToken as string };
}

function switchTo(server: ReturnType<typeof app>, cookie: string, csrf: string, tenantId: string) {
  return request(server).post('/api/session/context').set('Cookie', cookie)
    .set('Origin', config.origin).set('x-csrf-token', csrf).send({ tenantId });
}

async function revoke(tenantId: string) {
  await db.admin.query(`update factact_private.operator_identities
    set status='REVOKED',revoked_at=now(),revocation_reason='Membership revoked in test'
    where issuer=$1 and subject=$2 and tenant_id=$3`,
  [identity.issuer, identity.subject, tenantId]);
}

beforeAll(async () => { db = await testDatabase(); store = new PgIdentityStore(db.runtime); }, 60_000);
beforeEach(async () => {
  await db.reset();
  await db.admin.query('insert into factact.tenants(id,name,status) values($1,$2,$3),($4,$5,$3)',
    [tenantB, 'Tenant B', 'ACTIVE', unassignedTenant, 'Unassigned Tenant']);
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,$3,$4,'ACTIVE')`, [operatorB, tenantB, 'b@example.invalid', 'Tenant B Operator']);
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default)
    values($1,$2,$3,$4,true),($1,$2,$5,$6,false)`,
  [identity.issuer, identity.subject, ids.tenant, ids.operator, tenantB, operatorB]);
}, 60_000);
afterAll(async () => { await db?.close(); }, 60_000);

describe('verified identity-bound session and Tenant context switch', () => {
  it('binds OIDC issuer/subject in a private session, lists only its active contexts', async () => {
    const { server, cookie } = await logIn();
    const stored = (await db.admin.query(`select issuer,subject,tenant_id,operator_id
      from factact_private.sessions where token_hash=$1`, [tokenHash(tokenFromCookie(cookie))])).rows[0];
    expect(stored).toMatchObject({ ...identity, tenant_id: ids.tenant, operator_id: ids.operator });
    const contexts = await request(server).get('/api/session/contexts').set('Cookie', cookie).expect(200);
    expect(contexts.body.data.contexts).toEqual([
      { tenantId: ids.tenant, operatorId: ids.operator, tenantName: 'atLIB Development',
        operatorDisplayName: '開発オペレーター', isLoginDefault: true, isCurrent: true },
      { tenantId: tenantB, operatorId: operatorB, tenantName: 'Tenant B',
        operatorDisplayName: 'Tenant B Operator', isLoginDefault: false, isCurrent: false },
    ]);
    expect(JSON.stringify(contexts.body)).not.toContain(identity.subject);
    expect(JSON.stringify(contexts.body)).not.toContain(identity.issuer);
  });

  it('rotates both opaque session token and CSRF, switches Tenant-local Operator without inheriting roles', async () => {
    const { server, cookie, csrf } = await logIn();
    const original = await db.admin.query('select expires_at from factact_private.sessions where token_hash=$1',
      [tokenHash(tokenFromCookie(cookie))]);
    const changed = await switchTo(server, cookie, csrf, tenantB).expect(200);
    const nextCookie = sessionCookie(changed.headers);
    expect(nextCookie).not.toEqual(cookie);
    expect(changed.body.data.csrfToken).not.toBe(csrf);
    expect(changed.body.data.operator).toMatchObject({ id: operatorB, tenantId: tenantB, roles: [] });
    await request(server).get('/api/session').set('Cookie', cookie).expect(401);
    const active = await request(server).get('/api/session').set('Cookie', nextCookie).expect(200);
    expect(active.body.data.operator.tenantId).toBe(tenantB);
    expect(active.body.data.csrfToken).toBe(changed.body.data.csrfToken);
    const nextExpiry = await db.admin.query('select expires_at from factact_private.sessions where token_hash=$1',
      [tokenHash(tokenFromCookie(nextCookie))]);
    expect(nextExpiry.rows[0].expires_at).toEqual(original.rows[0].expires_at);
    expect((await withTenant(db.runtime, tenantB, c => c.query('select role from factact.operator_roles'))).rows).toEqual([]);
    expect((await request(server).get('/api/session/contexts').set('Cookie', nextCookie).expect(200))
      .body.data.contexts[1].isCurrent).toBe(true);
    await switchTo(server, nextCookie, csrf, ids.tenant).expect(403);
  });

  it('does not switch to an unassigned Tenant or one assigned to another subject', async () => {
    const { server, cookie, csrf } = await logIn();
    const bad = await switchTo(server, cookie, csrf, unassignedTenant).expect(403);
    expect(bad.headers['set-cookie']).toBeUndefined();
    await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
      values($1,$2,$3,$4,'ACTIVE')`,
      [randomUUID(), unassignedTenant, 'other@example.invalid', 'Other']);
    const otherOperator = (await db.admin.query('select id from factact.operators where tenant_id=$1', [unassignedTenant])).rows[0].id;
    await db.admin.query(`insert into factact_private.operator_identities
      (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
      [identity.issuer, 'another-subject', unassignedTenant, otherOperator]);
    await switchTo(server, cookie, csrf, unassignedTenant).expect(403);
    await request(server).get('/api/session').set('Cookie', cookie).expect(200);
  });

  it('revoking the selected membership immediately invalidates its existing session', async () => {
    const { server, cookie, csrf } = await logIn();
    const changed = await switchTo(server, cookie, csrf, tenantB).expect(200);
    const newCookie = sessionCookie(changed.headers);
    await revoke(tenantB);
    await request(server).get('/api/session').set('Cookie', newCookie).expect(401);
    await request(server).get('/api/session/contexts').set('Cookie', newCookie).expect(401);
    await switchTo(server, newCookie, changed.body.data.csrfToken, ids.tenant).expect(401);
    expect(await store.readSession(tokenHash(tokenFromCookie(newCookie)))).toBeNull();
  });

  it('rechecks target membership on every list/switch and never reveals revoked context', async () => {
    const { server, cookie, csrf } = await logIn();
    await revoke(tenantB);
    const list = await request(server).get('/api/session/contexts').set('Cookie', cookie).expect(200);
    expect(list.body.data.contexts).toHaveLength(1);
    await switchTo(server, cookie, csrf, tenantB).expect(403);
    await revoke(ids.tenant);
    await request(server).get('/api/session').set('Cookie', cookie).expect(401);
  });

  it('rejects inactive target Operator or Tenant and expired sessions', async () => {
    const { server, cookie, csrf } = await logIn();
    await db.admin.query("update factact.operators set status='INACTIVE' where id=$1", [operatorB]);
    await switchTo(server, cookie, csrf, tenantB).expect(403);
    await db.admin.query("update factact.operators set status='ACTIVE' where id=$1", [operatorB]);
    await db.admin.query("update factact.tenants set status='INACTIVE' where id=$1", [tenantB]);
    await switchTo(server, cookie, csrf, tenantB).expect(403);
    await db.admin.query("update factact_private.sessions set expires_at=now()-interval '1 second' where token_hash=$1",
      [tokenHash(tokenFromCookie(cookie))]);
    await request(server).get('/api/session').set('Cookie', cookie).expect(401);
    await switchTo(server, cookie, csrf, ids.tenant).expect(401);
  });

  it('does not authorize an unbound legacy session and refuses its context switch', async () => {
    const hash = tokenHash('unbound-legacy-token');
    await db.admin.query(`insert into factact_private.sessions(token_hash,tenant_id,operator_id,csrf_token,expires_at)
      values($1,$2,$3,$4,now()+interval '1 hour')`, [hash, ids.tenant, ids.operator, 'csrf']);
    expect(await store.readSession(hash)).toBeNull();
    expect(await store.listSessionContexts(hash)).toEqual([]);
    expect(await store.switchSessionContext(hash, tokenHash('other-token'), tenantB, 'new-csrf')).toBeNull();
    await request(app()).get('/api/session').set('Cookie', 'factact_session=unbound-legacy-token').expect(401);
  });

  it('fails closed when verified session creation uses the wrong subject, tenant or non-default membership', async () => {
    await expect(store.createVerifiedSession(tokenHash('wrong-subject'),
      { tenantId: ids.tenant, operatorId: ids.operator }, 'csrf',
      { ...identity, subject: 'not-bound' })).rejects.toMatchObject({ code: '42501' });
    await expect(store.createVerifiedSession(tokenHash('wrong-target-operator'),
      { tenantId: tenantB, operatorId: ids.operator }, 'csrf', identity)).rejects.toMatchObject({ code: '42501' });
    await expect(store.createVerifiedSession(tokenHash('not-default'),
      { tenantId: tenantB, operatorId: operatorB }, 'csrf', identity)).rejects.toMatchObject({ code: '42501' });
    expect((await db.admin.query('select count(*)::integer as count from factact_private.sessions')).rows[0].count).toBe(0);
  });

  it('only one concurrent switch can consume a session token', async () => {
    const { cookie } = await logIn();
    const previous = tokenHash(tokenFromCookie(cookie));
    const [first, second] = await Promise.all([
      store.switchSessionContext(previous, tokenHash('concurrent-1'), tenantB, 'csrf-1'),
      store.switchSessionContext(previous, tokenHash('concurrent-2'), tenantB, 'csrf-2'),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await store.readSession(previous)).toBeNull();
    expect([await store.readSession(tokenHash('concurrent-1')),
      await store.readSession(tokenHash('concurrent-2'))].filter(Boolean)).toHaveLength(1);
  });
});
