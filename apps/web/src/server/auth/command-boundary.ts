import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Config } from '../config.js';
import { authenticateSession, type IdentityStore } from '../../../../../packages/application/src/operator-session.js';
import { tokenHash } from './pkce.js';

export function sessionCookieName(config: Config) { return config.nodeEnv === 'production' ? '__Host-factact_session' : 'factact_session'; }
function equalToken(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Mounted once before all routes. All unsafe HTTP methods (including future routes)
// require session + exact Origin + CSRF. GET OIDC uses its own one-use state/nonce/PKCE protocol.
export function commandBoundary(config: Config, store: IdentityStore): RequestHandler {
  return async (req, res, next) => {
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!unsafe && !/^\/api(?:\/|$)/i.test(req.path)) { next(); return; }
    res.setHeader('Cache-Control', 'no-store');
    const token: unknown = req.cookies?.[sessionCookieName(config)];
    const session = typeof token === 'string' ? await authenticateSession(store, tokenHash(token)) : null;
    if (!session) { res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'ログインしてください。' }, correlationId: req.id }); return; }
    if (unsafe && (req.get('origin') !== config.origin || !equalToken(req.get('x-csrf-token'), session.csrfToken))) {
      res.status(403).json({ ok: false, error: { code: 'CSRF_REJECTED', message: '画面を再読み込みしてやり直してください。' }, correlationId: req.id }); return;
    }
    // Explicit account restriction; do not infer it from currently enabled grants.
    // Exact method/path allowlist, including future API additions by default denial.
    if(session.operator.requestPortalOnly){
      const path=req.path;
      const readable=req.method==='GET'||req.method==='HEAD';
      const allowed=(readable&&['/api/session','/api/session/contexts','/api/request-contexts','/api/request-teams-recipients','/api/request-notifications','/api/request-push/config','/api/requests'].includes(path))
        ||(readable&&/^\/api\/requests\/[0-9a-f-]{36}$/i.test(path))
        ||(req.method==='POST'&&['/api/requests','/api/request-push/subscriptions','/api/request-push/revoke','/api/session/context','/auth/logout'].includes(path))
        ||(req.method==='POST'&&/^\/api\/requests\/[0-9a-f-]{36}\/(responses|acknowledge)$/i.test(path));
      if(!allowed){res.status(403).json({ok:false,error:{code:'PORTAL_ONLY',message:'対応依頼以外の機能は利用できません。'},correlationId:req.id});return;}
    }
    res.locals.session = session;
    res.locals.sessionTokenHash = tokenHash(token as string);
    next();
  };
}
