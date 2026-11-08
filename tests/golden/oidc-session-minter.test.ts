import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertOidcSessionMinterRole, assertRuntimeRole } from '../../apps/web/src/server/persistence/database.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { ids, testDatabase } from '../fixtures/database.js';

const issuer = 'https://accounts.google.com';
const subject = 'synthetic-oidc-session-minter';
let db: Awaited<ReturnType<typeof testDatabase>>;

beforeAll(async () => { db = await testDatabase(); }, 60_000);
beforeEach(async () => {
  await db.reset();
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default)
    values($1,$2,$3,$4,true)`, [issuer, subject, ids.tenant, ids.operator]);
}, 60_000);
afterAll(async () => { await db?.close(); }, 60_000);

const verifiedSql = 'select factact_private.create_verified_session($1,$2,$3,$4,$5,$6)';
const params = (hash: string) => [hash, ids.tenant, ids.operator, 'csrf', issuer, subject];

describe('OIDC Session minting SQL authority separation', () => {
  it('fails closed at startup if either pool uses the wrong or an elevated Role', async () => {
    await expect(assertRuntimeRole(db.runtime)).resolves.toBeUndefined();
    await expect(assertOidcSessionMinterRole(db.oidc)).resolves.toBeUndefined();
    await expect(assertRuntimeRole(db.oidc)).rejects.toThrow('factact_runtime');
    await expect(assertOidcSessionMinterRole(db.runtime)).rejects.toThrow('factact_oidc_session_minter');
    await expect(assertOidcSessionMinterRole(db.admin)).rejects.toThrow('factact_oidc_session_minter');
  });

  it('denies minting a verified session with normal runtime credentials despite known active membership', async () => {
    const hash = tokenHash(randomUUID());
    await expect(db.runtime.query(verifiedSql, params(hash))).rejects.toMatchObject({ code: '42501' });
    const result = await db.admin.query('select token_hash from factact_private.sessions where token_hash=$1', [hash]);
    expect(result.rowCount).toBe(0);
  });

  it('allows the dedicated minter to persist only a valid verified OIDC session', async () => {
    const hash = tokenHash(randomUUID());
    const store = new PgIdentityStore(db.runtime, db.oidc);
    await store.createVerifiedSession(hash, { tenantId: ids.tenant, operatorId: ids.operator }, 'csrf', { issuer, subject });
    const result = await db.admin.query<{ issuer: string; subject: string; oidc_verified_login: boolean }>(
      'select issuer,subject,oidc_verified_login from factact_private.sessions where token_hash=$1', [hash]);
    expect(result.rows[0]).toEqual({ issuer, subject, oidc_verified_login: true });
    await expect(db.oidc.query(verifiedSql, params(tokenHash(randomUUID())).map((p, index) => index === 5 ? 'unknown-subject' : p)))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('minter has no direct table, compatibility session or scoped Grant management privileges', async () => {
    await expect(db.oidc.query('select * from factact_private.sessions')).rejects.toMatchObject({ code: '42501' });
    await expect(db.oidc.query('select * from factact_private.scoped_grant_approvers')).rejects.toMatchObject({ code: '42501' });
    await expect(db.oidc.query('select factact_private.create_session($1,$2,$3,$4)',
      [randomUUID(), ids.tenant, ids.operator, 'csrf'])).rejects.toMatchObject({ code: '42501' });
    await expect(db.oidc.query('select factact_private.read_session($1)', [randomUUID()]))
      .rejects.toMatchObject({ code: '42501' });
    await expect(db.oidc.query(`select factact_private.issue_scoped_actor_grant(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz,$13)`, [
      randomUUID(),randomUUID(),ids.operator,ids.service,ids.contract,'SERVICE',null,null,
      'SUPPORT',['READ'],'2026-11-08T00:00:00Z',null,'test',
    ])).rejects.toMatchObject({ code: '42501' });
  });

  it('disallows changing the SQL Role in either direction', async () => {
    await expect(db.oidc.query('set role factact_runtime')).rejects.toMatchObject({ code: '42501' });
    await expect(db.runtime.query('set role factact_oidc_session_minter')).rejects.toMatchObject({ code: '42501' });
  });
});
