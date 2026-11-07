import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { ids, testDatabase } from '../fixtures/database.js';
import { withTenant } from '../../apps/web/src/server/persistence/database.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import { createApp } from '../../apps/web/src/server/app.js';
import { PgJoinUnitOfWork } from '../../apps/web/src/server/persistence/join-repository.js';
import { PgSupportUnitOfWork } from '../../apps/web/src/server/persistence/support-repository.js';
import { PgExploreSearchUnitOfWork } from '../../apps/web/src/server/persistence/explore-repository.js';
import { JoinCommands } from '../../packages/application/src/join-commands.js';
import { JoinQueries } from '../../packages/application/src/join-queries.js';
import { SupportCommands } from '../../packages/application/src/support-commands.js';
import { SupportQueries } from '../../packages/application/src/support-queries.js';
import { ExploreQueries } from '../../packages/application/src/explore-queries.js';

const scopedActor = '20000000-0000-4000-8000-000000000055';
const secondCompany = '30000000-0000-4000-8000-000000000055';
const config = {
  nodeEnv: 'test' as const, port: 8080, origin: 'http://localhost:5173',
  databaseUrl: 'postgresql://test', databaseSsl: false,
  issuer: 'https://accounts.google.com' as const, clientId: 'test', clientSecret: 'test',
  redirectUri: 'http://localhost:5173/auth/callback',
};
let db: Awaited<ReturnType<typeof testDatabase>>;
let store: PgIdentityStore;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  db = await testDatabase();
  store = new PgIdentityStore(db.runtime);
  const join = new PgJoinUnitOfWork(db.runtime);
  const support = new PgSupportUnitOfWork(db.runtime);
  app = createApp(config, store, {
    authorizationUrl: () => 'https://accounts.google.com/authorize',
    verifyCallback: async () => ({ issuer: config.issuer, subject: 'scoped-actor-fixture' }),
  }, pino({ level: 'silent' }), {
    commands: new JoinCommands(join, { id: randomUUID, now: () => new Date().toISOString() }),
    queries: new JoinQueries(join),
  }, {
    commands: new SupportCommands(support, { id: randomUUID, now: () => new Date().toISOString() }),
    queries: new SupportQueries(support),
  }, { queries: new ExploreQueries(new PgExploreSearchUnitOfWork(db.runtime)) });
}, 60_000);
beforeEach(async () => {
  await db.reset();
  await db.admin.query('insert into factact.organizations(id,tenant_id,name,status) values($1,$2,$3,$4)',
    [secondCompany, ids.tenant, 'Other customer secret', 'ACTIVE']);
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'scoped@example.invalid','Scoped actor','ACTIVE')`, [scopedActor, ids.tenant]);
  // Deliberately assign every internal Role to prove that Role cannot widen
  // a newly enrolled scoped Actor's privileges.
  for (const role of ['ADMIN', 'OPERATOR', 'REVIEWER']) {
    await db.admin.query('insert into factact.operator_roles values($1,$2,$3)', [ids.tenant, scopedActor, role]);
  }
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
  [config.issuer, 'scoped-actor-fixture', ids.tenant, scopedActor]);
  await store.createVerifiedSession(tokenHash('scoped-actor-session'),
    { tenantId: ids.tenant, operatorId: scopedActor }, 'csrf',
    { issuer: config.issuer, subject: 'scoped-actor-fixture' });
}, 60_000);
afterAll(async () => { await db?.close(); }, 60_000);

const cookie = 'factact_session=scoped-actor-session';

describe('internal Read Authority v1 is explicit, never inferred from Role, Tenant or company', () => {
  it('preserves reviewed legacy Role-bearing internal Operators without automatic expansion to new Operators', async () => {
    const { rows } = await db.admin.query(`select id,read_authority_mode from factact.operators
      where id=any($1::uuid[]) order by id`, [[ids.operator, scopedActor]]);
    expect(rows.find(r => r.id === ids.operator)?.read_authority_mode).toBe('INTERNAL_V1');
    expect(rows.find(r => r.id === scopedActor)?.read_authority_mode).toBe('SCOPED');
    expect((await store.loadActiveOperator({ tenantId: ids.tenant, operatorId: ids.operator }))?.roles).toEqual(['ADMIN', 'OPERATOR', 'REVIEWER']);
    expect((await store.loadActiveOperator({ tenantId: ids.tenant, operatorId: scopedActor }))?.roles).toEqual([]);
  });

  it('protects every existing broad JOIN, SUPPORT and Explore read route from a Role-bearing SCOPED Actor', async () => {
    const session = await request(app).get('/api/session').set('Cookie', cookie).expect(200);
    expect(session.body.data.operator).toMatchObject({ tenantId: ids.tenant, id: scopedActor, roles: [] });
    for (const route of [
      '/api/home', '/api/devices', `/api/people/${ids.person}/context`, '/api/work',
      '/api/support', '/api/support-responsibility', '/api/explore/search?q=Other%20customer%20secret',
    ]) {
      const res = await request(app).get(route).set('Cookie', cookie).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(JSON.stringify(res.body)).not.toContain('Other customer secret');
    }
  });

  it('protects existing business writes even with valid Origin and CSRF and an assigned OPERATOR Role', async () => {
    for (const [path, body] of [
      ['/api/join-events', { organizationId: ids.organization, personId: ids.person,
        serviceId: ids.service, joinDate: '2026-11-07' }],
      ['/api/support', { requestId: randomUUID(), personId: ids.person,
        serviceId: ids.service, symptom: 'Valid but unauthorized' }],
    ] as const) {
      const res = await request(app).post(path).set('Cookie', cookie)
        .set('Origin', config.origin).set('x-csrf-token', 'csrf').send(body).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    expect((await db.admin.query('select count(*)::integer as count from factact.support_events')).rows[0].count).toBe(0);
  });

  it('downgrade to SCOPED revokes internal broad access immediately, even for a still-authenticated legacy actor', async () => {
    await store.createSession(tokenHash('legacy-session'), { tenantId: ids.tenant, operatorId: ids.operator }, 'legacy-csrf');
    await request(app).get('/api/explore/search?q=田中').set('Cookie', 'factact_session=legacy-session').expect(200);
    await db.admin.query("update factact.operators set read_authority_mode='SCOPED' where id=$1", [ids.operator]);
    const session = await request(app).get('/api/session').set('Cookie', 'factact_session=legacy-session').expect(200);
    expect(session.body.data.operator.roles).toEqual([]);
    await request(app).get('/api/explore/search?q=田中').set('Cookie', 'factact_session=legacy-session').expect(403);
    await request(app).get('/api/support').set('Cookie', 'factact_session=legacy-session').expect(403);
  });

  it('runtime cannot modify its own read authority; selecting a Tenant never elevates scoped authority', async () => {
    await expect(withTenant(db.runtime, ids.tenant, client =>
      client.query("update factact.operators set read_authority_mode='INTERNAL_V1' where id=$1", [scopedActor])
    )).rejects.toMatchObject({ code: '42501' });
    const contexts = await request(app).get('/api/session/contexts').set('Cookie', cookie).expect(200);
    expect(contexts.body.data.contexts).toHaveLength(1);
    expect(contexts.body.data.contexts[0].operatorId).toBe(scopedActor);
    expect((await store.loadActiveOperator({ tenantId: ids.tenant, operatorId: scopedActor }))?.roles).toEqual([]);
  });
});
