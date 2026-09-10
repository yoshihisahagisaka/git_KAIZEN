import { supportRoutes, type SupportServices } from './support-routes.js';
import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { Config } from './config.js';
import type { IdentityStore } from '../../../../packages/application/src/operator-session.js';
import type { IdentityProvider } from './auth/oidc.js';
import { createAuthRouter } from './auth/routes.js';
import { commandBoundary } from './auth/command-boundary.js';
import { joinRoutes, type JoinServices } from './join-routes.js';
import { DomainError } from '../../../../packages/domain/src/join.js';
import { ZodError } from 'zod';

export function createApp(config: Config, store: IdentityStore, provider: IdentityProvider, logger: Logger, join?: JoinServices, support?: SupportServices) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null } } }));
  // ADAPT: portal src/server.ts. Do not log callback query strings, cookies or token-bearing headers.
  app.use(pinoHttp({ logger, genReqId: () => randomUUID(), serializers: {
    req: req => ({ id: req.id, method: req.method, path: String(req.url).split('?')[0] }),
    res: res => ({ statusCode: res.statusCode }),
  } }));
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
  app.use(cookieParser());
  app.use(express.json({ limit: '16kb' }));
  app.use(commandBoundary(config, store));
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use(createAuthRouter(config, store, provider));
  if (join) app.use('/api',joinRoutes(join));
  if (support) app.use('/api',supportRoutes(support));
  app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } }));
  app.use('/auth', (_req, res) => res.sendStatus(404));
  app.use(express.static(resolve('dist/client')));
  app.get('/', (_req, res) => res.sendFile(resolve('dist/client/index.html')));
  const errors: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    if (error instanceof DomainError) { res.status(error.status).json({ok:false,error:{code:error.code,message:error.message},correlationId:req.id}); return; }
    if (error instanceof ZodError || (error instanceof SyntaxError && 'body' in error)) { res.status(400).json({ok:false,error:{code:'INVALID_INPUT',message:'入力内容を確認してください。'},correlationId:req.id}); return; }
    // Avoid provider/DB error bodies that can contain SQL parameters or tokens.
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    // SQLSTATE only, never SQL text, detail, parameters or provider response bodies.
    const databaseCode = typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
    req.log.error({ correlationId: req.id, databaseCode }, 'Request failed');
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: '処理を完了できませんでした。' }, correlationId: req.id });
  };
  app.use(errors);
  return app;
}
