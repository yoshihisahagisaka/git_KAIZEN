import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../apps/web/src/server/config.js';
const valid = {
  NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://factact_runtime:test@localhost:54322/postgres', DATABASE_SSL: 'false',
  OIDC_ISSUER: 'https://accounts.google.com', OIDC_CLIENT_ID: 'test-client', OIDC_CLIENT_SECRET: 'test-secret',
  OIDC_REDIRECT_URI: 'http://localhost:5173/auth/callback',
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
  });
});
