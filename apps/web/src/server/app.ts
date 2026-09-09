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

export function createApp(config: Config, store: IdentityStore, provider: IdentityProvider, logger: Logger) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  // ADAPT: portal src/server.ts. Do not log callback query strings, cookies or token-bearing headers.
  app.use(pinoHttp({ logger, genReqId: () => randomUUID(), serializers: {
    req: req => ({ id: req.id, method: req.method, path: String(req.url).split('?')[0] }),
    res: res => ({ statusCode: res.statusCode }),
  } }));
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
  app.use(cookieParser());
  app.use(express.json({ limit: '16kb' }));
  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use(createAuthRouter(config, store, provider));
  app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } }));
  app.use('/auth', (_req, res) => res.sendStatus(404));
  app.use(express.static(resolve('dist/client')));
  app.get('/', (_req, res) => res.sendFile(resolve('dist/client/index.html')));
  const errors: ErrorRequestHandler = (_error, req, res, _next) => {
    // Avoid provider/DB error bodies that can contain SQL parameters or tokens.
    req.log.error({ correlationId: req.id }, 'Request failed');
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: '処理を完了できませんでした。' }, correlationId: req.id });
  };
  app.use(errors);
  return app;
}
