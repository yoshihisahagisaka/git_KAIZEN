import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../apps/web/src/server/config.js';
import { assertDistinctDatabaseCredentials, createOidcSessionPool, createPool } from '../../apps/web/src/server/persistence/database.js';
const valid = {
  NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://factact_runtime:test@localhost:54322/postgres', DATABASE_SSL: 'false',
  OIDC_SESSION_DATABASE_URL: 'postgresql://factact_oidc_session_minter:test@localhost:54322/postgres',
  OIDC_ISSUER: 'https://accounts.google.com', OIDC_CLIENT_ID: 'test-client', OIDC_CLIENT_SECRET: 'test-secret',
  OIDC_REDIRECT_URI: 'http://localhost:5173/auth/callback',
};
const hostedProxy = {
  ...valid, NODE_ENV: 'production', APP_ORIGIN: 'https://factact.example.invalid',
  OIDC_REDIRECT_URI: 'https://factact.example.invalid/auth/callback',
  DATABASE_CONNECTION_MODE: 'local-proxy', DATABASE_SSL: 'false',
  DATABASE_URL: 'postgresql://factact_runtime:runtime@127.0.0.1:5432/postgres',
  OIDC_SESSION_DATABASE_URL: 'postgresql://factact_oidc_session_minter:minter@127.0.0.1:5432/postgres',
};
describe('configuration boundary', () => {
  it('accepts loopback development without unrelated integration secrets', () => { expect(loadConfig(valid).port).toBe(8080); });
  it('rejects production HTTP and disabled TLS', () => { expect(() => loadConfig({ ...valid, NODE_ENV: 'production' })).toThrow(); });
  it('rejects cross-origin callback and arbitrary issuer', () => {
    expect(() => loadConfig({ ...valid, OIDC_REDIRECT_URI: 'https://other.invalid/auth/callback' })).toThrow();
    expect(() => loadConfig({ ...valid, OIDC_ISSUER: 'https://untrusted.invalid' })).toThrow();
  });
  it('does not disclose invalid secret values in errors', () => {
    expect(() => loadConfig({ ...valid, DATABASE_URL: 'sensitive-invalid-password' })).toThrow('Invalid configuration keys: DATABASE_URL');
    expect(() => loadConfig({ ...valid, OIDC_SESSION_DATABASE_URL: 'sensitive-invalid-password' })).toThrow('Invalid configuration keys: OIDC_SESSION_DATABASE_URL');
    expect(() => loadConfig({ ...valid, OIDC_SESSION_DATABASE_URL: undefined })).toThrow('Invalid configuration keys: OIDC_SESSION_DATABASE_URL');
  });
  it('requires two independently provisioned database credentials before server startup', () => {
    const config = loadConfig(valid);
    expect(() => assertDistinctDatabaseCredentials(config)).toThrow('distinct Runtime and OIDC Session');
    expect(() => assertDistinctDatabaseCredentials({ ...config,
      oidcSessionDatabaseUrl: 'postgresql://factact_oidc_session_minter:independent@localhost:54322/postgres',
    })).not.toThrow();
    expect(() => assertDistinctDatabaseCredentials({ ...config, oidcSessionDatabaseUrl: config.databaseUrl })).toThrow('distinct Runtime and OIDC Session');
  });
  it('allows a production local Auth Proxy hop only through explicit loopback mode', async () => {
    const config = loadConfig(hostedProxy);
    expect(config.databaseLocalProxy).toBe(true);
    expect(() => assertDistinctDatabaseCredentials(config)).not.toThrow();
    const runtime = createPool(config), minter = createOidcSessionPool(config);
    try {
      expect(runtime.options.ssl).toBe(false);
      expect(minter.options.ssl).toBe(false);
      expect(runtime.options.max).toBe(5);
      expect(minter.options.max).toBe(1);
    } finally { await runtime.end(); await minter.end(); }
  });
  it('fails closed on proxy TLS, remote endpoints, missing port or SSL URI overrides', () => {
    expect(() => loadConfig({ ...hostedProxy, DATABASE_SSL: 'true' })).toThrow('DATABASE_SSL=false');
    expect(() => loadConfig({ ...hostedProxy, DATABASE_URL: 'postgresql://factact_runtime:runtime@db.example.invalid:5432/postgres' })).toThrow('DATABASE_URL must use an explicit local TCP proxy endpoint');
    expect(() => loadConfig({ ...hostedProxy, OIDC_SESSION_DATABASE_URL: 'postgresql://factact_oidc_session_minter:minter@localhost:5432/postgres' })).toThrow('OIDC_SESSION_DATABASE_URL must use an explicit local TCP proxy endpoint');
    expect(() => loadConfig({ ...hostedProxy, DATABASE_URL: 'postgresql://factact_runtime:runtime@127.0.0.1/postgres' })).toThrow('DATABASE_URL must use an explicit local TCP proxy endpoint');
    expect(() => loadConfig({ ...hostedProxy, DATABASE_URL: hostedProxy.DATABASE_URL + '?sslmode=require' })).toThrow('must not override database TLS settings');
    expect(() => loadConfig({ ...hostedProxy, DATABASE_URL: hostedProxy.DATABASE_URL + '?host=remote.example.invalid' })).toThrow('DATABASE_URL must use an explicit local TCP proxy endpoint');
  });
  it('preserves verified TLS for production direct database mode', async () => {
    const config = loadConfig({ ...hostedProxy, DATABASE_CONNECTION_MODE: 'direct', DATABASE_SSL: 'true' });
    const runtime = createPool(config), minter = createOidcSessionPool(config);
    try {
      expect(runtime.options.ssl).toEqual({ rejectUnauthorized: true });
      expect(minter.options.ssl).toEqual({ rejectUnauthorized: true });
    } finally { await runtime.end(); await minter.end(); }
    expect(() => loadConfig({ ...hostedProxy, DATABASE_CONNECTION_MODE: 'direct' })).toThrow('Production database TLS is required');
    expect(() => loadConfig({ ...hostedProxy, DATABASE_CONNECTION_MODE: 'direct', DATABASE_SSL: 'true', DATABASE_URL: hostedProxy.DATABASE_URL + '?sslmode=disable' })).toThrow('must not override database TLS settings');
  });
});
