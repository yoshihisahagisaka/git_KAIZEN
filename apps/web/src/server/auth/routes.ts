import { Router, type CookieOptions } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { Config } from '../config.js';
import type { IdentityStore } from '../../../../../packages/application/src/operator-session.js';
import { authenticateSession, resolveActiveOperator } from '../../../../../packages/application/src/operator-session.js';
import type { IdentityProvider } from './oidc.js';
import { generateCodeVerifier, generateOpaqueValue, tokenHash } from './pkce.js';

export function sameToken(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAuthRouter(config: Config, store: IdentityStore, provider: IdentityProvider): Router {
  const router = Router();
  const production = config.nodeEnv === 'production';
  const sessionCookie = production ? '__Host-factact_session' : 'factact_session';
  const flowCookie = production ? '__Host-factact_login' : 'factact_login';
  // ADAPT: PPAP src/lib/cookies.ts; lifetimes also enforced in PostgreSQL.
  const cookie: CookieOptions = { httpOnly: true, secure: production || config.origin.startsWith('https:'), sameSite: 'lax', path: '/' };
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  router.get('/auth/login', async (_req, res) => {
    const flow = generateOpaqueValue();
    const login = { state: generateOpaqueValue(), nonce: generateOpaqueValue(), verifier: generateCodeVerifier() };
    const destination = provider.authorizationUrl(login);
    await store.beginLogin(tokenHash(flow), login);
    res.cookie(flowCookie, flow, { ...cookie, maxAge: 10 * 60 * 1000 });
    res.redirect(destination);
  });
  router.get('/auth/callback', async (req, res) => {
    const flow: unknown = req.cookies?.[flowCookie];
    res.clearCookie(flowCookie, cookie);
    if (typeof flow !== 'string') { res.status(400).send('ログインをやり直してください。'); return; }
    const login = await store.consumeLogin(tokenHash(flow));
    if (!login) { res.status(400).send('ログインの有効期限が切れています。'); return; }
    let identity;
    try {
      const callback = new URL(config.redirectUri);
      callback.search = new URL(req.originalUrl, config.origin).search;
      identity = await provider.verifyCallback(callback, login);
    } catch {
      res.status(401).send('ログインを確認できませんでした。'); return;
    }
    const operator = await resolveActiveOperator(store, identity);
    if (!operator) { res.status(403).send('利用可能なオペレーター登録がありません。'); return; }
    const previous: unknown = req.cookies?.[sessionCookie];
    if (typeof previous === 'string') await store.revokeSession(tokenHash(previous));
    const token = generateOpaqueValue();
    await store.createSession(tokenHash(token), { tenantId: operator.tenantId, operatorId: operator.id }, generateOpaqueValue());
    res.cookie(sessionCookie, token, { ...cookie, maxAge: 8 * 60 * 60 * 1000 });
    res.redirect('/');
  });
  router.get('/api/session', async (req, res) => {
    const token: unknown = req.cookies?.[sessionCookie];
    const session = typeof token === 'string' ? await authenticateSession(store, tokenHash(token)) : null;
    if (!session) { res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'ログインしてください。' }, correlationId: req.id }); return; }
    res.json({ ok: true, data: session, warnings: [], correlationId: req.id });
  });
  router.post('/auth/logout', async (req, res) => {
    const token: unknown = req.cookies?.[sessionCookie];
    const session = typeof token === 'string' ? await authenticateSession(store, tokenHash(token)) : null;
    if (!session || typeof token !== 'string') { res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' }, correlationId: req.id }); return; }
    if (req.get('origin') !== config.origin || !sameToken(req.get('x-csrf-token'), session.csrfToken)) {
      res.status(403).json({ ok: false, error: { code: 'CSRF_REJECTED' }, correlationId: req.id }); return;
    }
    await store.revokeSession(tokenHash(token));
    res.clearCookie(sessionCookie, cookie);
    res.json({ ok: true, data: {}, warnings: [], correlationId: req.id });
  });
  return router;
}
