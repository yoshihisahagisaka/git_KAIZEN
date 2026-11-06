import { Router, type CookieOptions } from 'express';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { IdentityStore } from '../../../../../packages/application/src/operator-session.js';
import { authenticateSession, resolveActiveOperator } from '../../../../../packages/application/src/operator-session.js';
import type { IdentityProvider } from './oidc.js';
import { generateCodeVerifier, generateOpaqueValue, tokenHash } from './pkce.js';

const contextSwitchSchema = z.object({ tenantId: z.uuid() }).strict();

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
    await store.createVerifiedSession(tokenHash(token), { tenantId: operator.tenantId, operatorId: operator.id }, generateOpaqueValue(), identity);
    res.cookie(sessionCookie, token, { ...cookie, maxAge: 8 * 60 * 60 * 1000 });
    res.redirect('/');
  });
  router.get('/api/session', async (req, res) => {
    const token: unknown = req.cookies?.[sessionCookie];
    const session = typeof token === 'string' ? await authenticateSession(store, tokenHash(token)) : null;
    if (!session) { res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'ログインしてください。' }, correlationId: req.id }); return; }
    res.json({ ok: true, data: session, warnings: [], correlationId: req.id });
  });
  // commandBoundary has already verified active session, exact Origin and CSRF.
  // Context candidates and the target Operator are resolved exclusively in PostgreSQL.
  router.get('/api/session/contexts', async (req, res) => {
    const contexts = await store.listSessionContexts(res.locals.sessionTokenHash);
    res.json({ ok: true, data: { contexts }, warnings: [], correlationId: req.id });
  });
  router.post('/api/session/context', async (req, res) => {
    const { tenantId } = contextSwitchSchema.parse(req.body);
    const oldHash: string = res.locals.sessionTokenHash;
    const newToken = generateOpaqueValue();
    const csrfToken = generateOpaqueValue();
    const next = await store.switchSessionContext(oldHash, tokenHash(newToken), tenantId, csrfToken);
    if (!next) {
      res.status(403).json({ ok: false, error: { code: 'CONTEXT_NOT_ALLOWED', message: '利用可能な所属先ではありません。' }, correlationId: req.id });
      return;
    }
    // The switch does not extend the underlying 8-hour login lifetime.
    res.cookie(sessionCookie, newToken, { ...cookie, maxAge: Math.max(0, next.expiresAt.getTime() - Date.now()) });
    const activeSession = await store.readSession(tokenHash(newToken));
    const operator = activeSession ? await store.loadActiveOperator(activeSession) : null;
    if (!operator) {
      // Membership/Operator could have been revoked immediately after rotation.
      await store.revokeSession(tokenHash(newToken));
      res.clearCookie(sessionCookie, cookie);
      res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'もう一度ログインしてください。' }, correlationId: req.id });
      return;
    }
    res.json({ ok: true, data: { operator, csrfToken }, warnings: [], correlationId: req.id });
  });
  router.post('/auth/logout', async (req, res) => {
    await store.revokeSession(res.locals.sessionTokenHash);
    res.clearCookie(sessionCookie, cookie);
    res.json({ ok: true, data: {}, warnings: [], correlationId: req.id });
  });
  return router;
}
