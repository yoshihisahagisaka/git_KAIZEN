import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../apps/web/src/server/app.js';
import { authenticateSession, resolveActiveOperator, type IdentityStore, type LoginTransaction } from '../../packages/application/src/operator-session.js';
import { codeChallengeFromVerifier, tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import type { IdentityProvider } from '../../apps/web/src/server/auth/oidc.js';
import type { Config } from '../../apps/web/src/server/config.js';

const operator = { id: '20000000-0000-4000-8000-000000000001', tenantId: '10000000-0000-4000-8000-000000000001', displayName: 'Operator', tenantName: 'Development', roles: [] };
const config: Config = {
  nodeEnv: 'test', port: 8080, origin: 'http://localhost:5173', databaseUrl: 'postgresql://unused', databaseSsl: false,
  issuer: 'https://accounts.google.com', clientId: 'test', clientSecret: 'test', redirectUri: 'http://localhost:5173/auth/callback',
};
let store: IdentityStore;
let provider: IdentityProvider;
let login: LoginTransaction;
beforeEach(() => {
  login = { state: 'expected-state', nonce: 'expected-nonce', verifier: 'expected-verifier' };
  store = {
    beginLogin: vi.fn().mockResolvedValue(undefined), consumeLogin: vi.fn().mockResolvedValue(login),
    resolveIdentity: vi.fn().mockResolvedValue({ tenantId: operator.tenantId, operatorId: operator.id }),
    createSession: vi.fn().mockResolvedValue(undefined), readSession: vi.fn().mockResolvedValue({ tenantId: operator.tenantId, operatorId: operator.id, csrfToken: 'csrf' }),
    revokeSession: vi.fn().mockResolvedValue(undefined), loadActiveOperator: vi.fn().mockResolvedValue(operator),
  };
  provider = { authorizationUrl: vi.fn().mockReturnValue('https://accounts.google.com/authorize'), verifyCallback: vi.fn().mockResolvedValue({ issuer: config.issuer, subject: 'external-subject' }) };
});
const app = () => createApp(config, store, provider, pino({ level: 'silent' }));
describe('authentication boundary', () => {
  it('matches the RFC 7636 S256 test vector', () => {
    expect(codeChallengeFromVerifier('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('unknown identity cannot enroll itself', async () => {
    vi.mocked(store.resolveIdentity).mockResolvedValue(null);
    expect(await resolveActiveOperator(store, { issuer: config.issuer, subject: 'unknown' })).toBeNull();
    expect(store.loadActiveOperator).not.toHaveBeenCalled();
  });
  it('inactive Operator invalidates an existing session', async () => {
    vi.mocked(store.loadActiveOperator).mockResolvedValue(null);
    expect(await authenticateSession(store, 'hash')).toBeNull();
  });
  it('missing or expired session is denied', async () => {
    await request(app()).get('/api/session').expect(401);
    vi.mocked(store.readSession).mockResolvedValue(null);
    await request(app()).get('/api/session').set('Cookie', 'factact_session=expired').expect(401);
  });
  it('login persists secrets server-side and sets only an opaque cookie', async () => {
    const res = await request(app()).get('/auth/login').expect(302);
    const saved = vi.mocked(store.beginLogin).mock.calls[0]!;
    expect(saved[0]).toHaveLength(64);
    expect(new Set([saved[1].state, saved[1].nonce, saved[1].verifier]).size).toBe(3);
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly');
    expect(String(res.headers['set-cookie'])).not.toContain(saved[1].verifier);
  });
  it('missing login cookie never reaches the identity provider', async () => {
    await request(app()).get('/auth/callback?code=secret').expect(400);
    expect(provider.verifyCallback).not.toHaveBeenCalled();
  });
  it('expired or consumed login transaction is rejected', async () => {
    vi.mocked(store.consumeLogin).mockResolvedValue(null);
    await request(app()).get('/auth/callback').set('Cookie', 'factact_login=flow').expect(400);
    expect(provider.verifyCallback).not.toHaveBeenCalled();
  });
  it('protocol rejection cannot create a session', async () => {
    vi.mocked(provider.verifyCallback).mockRejectedValue(new Error('bad state/nonce/token'));
    await request(app()).get('/auth/callback?state=bad').set('Cookie', 'factact_login=flow').expect(401);
    expect(store.createSession).not.toHaveBeenCalled();
  });
  it('verified identity maps to an internal Operator; session is rotated and hashed', async () => {
    const res = await request(app()).get('/auth/callback?code=code&state=expected-state').set('Cookie', ['factact_login=flow', 'factact_session=old']).expect(302);
    expect(store.consumeLogin).toHaveBeenCalledWith(tokenHash('flow'));
    expect(store.resolveIdentity).toHaveBeenCalledWith({ issuer: config.issuer, subject: 'external-subject' });
    expect(store.revokeSession).toHaveBeenCalledWith(tokenHash('old'));
    expect(vi.mocked(store.createSession).mock.calls[0]?.[0]).toHaveLength(64);
    expect(String(res.headers['set-cookie'])).not.toContain('external-subject');
  });
  it('forged tenant input cannot change the session Operator', async () => {
    const res = await request(app()).get('/api/session?tenant_id=other').set('Cookie', 'factact_session=token').set('x-tenant-id', 'other').expect(200);
    expect(res.body.data.operator.tenantId).toBe(operator.tenantId);
  });
  it('logout requires both exact origin and CSRF token, then revokes session', async () => {
    const server = app();
    await request(server).post('/auth/logout').set('Cookie', 'factact_session=token').expect(403);
    await request(server).post('/auth/logout').set('Cookie', 'factact_session=token').set('origin', 'https://attacker.invalid').set('x-csrf-token', 'csrf').expect(403);
    expect(store.revokeSession).not.toHaveBeenCalled();
    await request(server).post('/auth/logout').set('Cookie', 'factact_session=token').set('origin', config.origin).set('x-csrf-token', 'csrf').expect(200);
    expect(store.revokeSession).toHaveBeenCalledWith(tokenHash('token'));
  });
  it('production cookies use Secure and __Host- prefix', async () => {
    const server = createApp({ ...config, nodeEnv: 'production', origin: 'https://factact.example', redirectUri: 'https://factact.example/auth/callback' }, store, provider, pino({ level: 'silent' }));
    const res = await request(server).get('/auth/login').expect(302);
    expect(String(res.headers['set-cookie'])).toContain('__Host-factact_login=');
    expect(String(res.headers['set-cookie'])).toContain('Secure');
  });
});
