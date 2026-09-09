import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.url().refine(value => { try { return ['postgres:', 'postgresql:'].includes(new URL(value).protocol); } catch { return false; } }),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  OIDC_ISSUER: z.literal('https://accounts.google.com'),
  OIDC_CLIENT_ID: z.string().min(1).refine(value => value !== 'REPLACE_ME'),
  OIDC_CLIENT_SECRET: z.string().min(1).refine(value => value !== 'REPLACE_ME'),
  OIDC_REDIRECT_URI: z.url(),
});

export function loadConfig(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Report keys only: never echo credentials or validation inputs.
    throw new Error(`Invalid configuration keys: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  }
  const c = result.data;
  const origin = new URL(c.APP_ORIGIN);
  const callback = new URL(c.OIDC_REDIRECT_URI);
  if (origin.origin !== c.APP_ORIGIN || callback.origin !== origin.origin || callback.pathname !== '/auth/callback' || callback.search || callback.hash) {
    throw new Error('APP_ORIGIN and OIDC_REDIRECT_URI must define the exact same-origin /auth/callback');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.protocol !== 'https:' && !(c.NODE_ENV !== 'production' && local && origin.protocol === 'http:')) {
    throw new Error('APP_ORIGIN requires HTTPS except on local development loopback');
  }
  if (c.NODE_ENV === 'production' && c.DATABASE_SSL !== 'true') throw new Error('Production database TLS is required');
  return {
    nodeEnv: c.NODE_ENV, port: c.PORT, origin: c.APP_ORIGIN,
    databaseUrl: c.DATABASE_URL, databaseSsl: c.DATABASE_SSL === 'true',
    issuer: c.OIDC_ISSUER, clientId: c.OIDC_CLIENT_ID, clientSecret: c.OIDC_CLIENT_SECRET,
    redirectUri: c.OIDC_REDIRECT_URI,
  };
}
export type Config = ReturnType<typeof loadConfig>;
