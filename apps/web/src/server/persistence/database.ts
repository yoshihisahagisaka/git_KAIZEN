import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import type { Config } from '../config.js';

// ADAPT: atlib-msp-customer-portal/src/db/pool.ts; transaction context is FACTACT-specific.
export function createPool(config: Pick<Config, 'databaseUrl' | 'databaseSsl'>): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
    max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 10000, application_name: 'factact',
  });
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

export async function withTenant<T>(pool: Pool, tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  z.uuid().parse(tenantId);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
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
