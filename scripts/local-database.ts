// Local administration only. Never imported by the application.
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { loadConfig } from '../apps/web/src/server/config.js';
import { assertRuntimeRole } from '../apps/web/src/server/persistence/database.js';

async function main() {
  const config = loadConfig(process.env);
  const runtimeUrl = new URL(config.databaseUrl);
  if (config.nodeEnv !== 'development' || runtimeUrl.hostname !== '127.0.0.1' || runtimeUrl.port !== '54322' || runtimeUrl.pathname !== '/postgres' || runtimeUrl.username !== 'factact_runtime') throw new Error('Expected the dedicated local Supabase development database');
  const adminUrl = new URL(process.env.ADMIN_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  if (adminUrl.hostname !== runtimeUrl.hostname || adminUrl.port !== runtimeUrl.port || adminUrl.pathname !== runtimeUrl.pathname) throw new Error('Admin and runtime must address the same local database');
  const admin = new Pool({connectionString:adminUrl.href,connectionTimeoutMillis:5000});
  try {
    const {rows} = await admin.query("select rolname from pg_roles where rolname='factact_runtime' and not rolsuper and not rolbypassrls");
    if (rows.length !== 1) throw new Error('Apply local migrations first');
    // Generated hex is safe for the DDL literal; no user input is interpolated.
    const password = randomBytes(32).toString('hex');
    await admin.query(`alter role factact_runtime password '${password}'`);
    runtimeUrl.password = password;
    const env = await readFile('.env','utf8');
    if (!/^DATABASE_URL=.*$/m.test(env)) throw new Error('DATABASE_URL is missing');
    await writeFile('.env',env.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=${runtimeUrl.href}`),{mode:0o600});
    const runtime = new Pool({connectionString:runtimeUrl.href,connectionTimeoutMillis:5000});
    try { await assertRuntimeRole(runtime); } finally { await runtime.end(); }
    console.log('Local runtime password configured in ignored .env; restricted role verified. No seed or JOIN data changed.');
  } finally { await admin.end(); }
}
main().catch(()=>{console.error('Local database setup failed. Check local migrations and administrative connection. Credentials were not logged.');process.exitCode=1;});
