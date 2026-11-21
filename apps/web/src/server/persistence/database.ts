import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { Config } from '../config.js';

export function assertDistinctDatabaseCredentials(config: Pick<Config, 'databaseUrl' | 'oidcSessionDatabaseUrl'>): void {
  const runtime = new URL(config.databaseUrl);
  const minter = new URL(config.oidcSessionDatabaseUrl);
  // Distinct SQL Roles provide no separation if both passwords are reused.
  // The server never logs or echoes any credential on an invalid configuration.
  if (runtime.username !== 'factact_runtime' || minter.username !== 'factact_oidc_session_minter'
    || !runtime.password || !minter.password || decodeURIComponent(runtime.password) === decodeURIComponent(minter.password)) {
    throw new Error('Database connections require distinct Runtime and OIDC Session minter credentials');
  }
}

// ADAPT: atlib-msp-customer-portal/src/db/pool.ts; transaction context is FACTACT-specific.
function databaseSslOption(config: Pick<Config, 'databaseSsl' | 'databaseLocalProxy'>) {
  return config.databaseLocalProxy ? false : config.databaseSsl ? { rejectUnauthorized: true } : false;
}

export function createPool(config: Pick<Config, 'databaseUrl' | 'databaseSsl' | 'databaseLocalProxy'>): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: databaseSslOption(config),
    max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 10000, application_name: 'factact',
  });
}

export function createOidcSessionPool(config: Pick<Config, 'oidcSessionDatabaseUrl' | 'databaseSsl' | 'databaseLocalProxy'>): Pool {
  return new Pool({
    connectionString: config.oidcSessionDatabaseUrl,
    ssl: databaseSslOption(config),
    max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 10000, application_name: 'factact_oidc_session',
  });
}

export async function assertOidcSessionMinterRole(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ safe: boolean }>(`
    select current_user = 'factact_oidc_session_minter'
      and r.rolcanlogin and not r.rolsuper and not r.rolbypassrls
      and not r.rolcreaterole and not r.rolcreatedb
      and not exists (
        select 1 from pg_auth_members m where m.member = r.oid
      )
      and not exists (
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('factact','factact_private') and c.relowner = r.oid
      ) as safe from pg_roles r where r.rolname = current_user
  `);
  if (rows[0]?.safe !== true) throw new Error('OIDC Session database connection must use the restricted factact_oidc_session_minter role');
}

export async function assertRuntimeRole(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ safe: boolean }>(`
    select current_user = 'factact_runtime'
      and not r.rolsuper and not r.rolbypassrls
      and not exists (
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('factact','factact_private') and c.relowner = r.oid
      ) as safe from pg_roles r where r.rolname = current_user
  `);
  if (rows[0]?.safe !== true) throw new Error('Database connection must use the restricted factact_runtime role');
}

export async function withTenant<T>(pool: Pool, tenantId: string, work: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
  z.uuid().parse(tenantId);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    await client.query("select set_config('factact.tenant_id', $1, true)", [tenantId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally {
    client.release(discard);
  }
}
