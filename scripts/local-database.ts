// Local administration only. Never imported by the application.
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { loadConfig } from '../apps/web/src/server/config.js';
import { assertRuntimeRole, assertOidcSessionMinterRole } from '../apps/web/src/server/persistence/database.js';

async function main() {
  const config = loadConfig(process.env);
  const runtimeUrl = new URL(config.databaseUrl);
  const oidcUrl = new URL(config.oidcSessionDatabaseUrl);
  if (config.nodeEnv !== 'development' || runtimeUrl.hostname !== '127.0.0.1' || runtimeUrl.port !== '54322' || runtimeUrl.pathname !== '/postgres' || runtimeUrl.username !== 'factact_runtime') throw new Error('Expected the dedicated local Supabase development database');
  if (oidcUrl.hostname !== runtimeUrl.hostname || oidcUrl.port !== runtimeUrl.port || oidcUrl.pathname !== runtimeUrl.pathname || oidcUrl.username !== 'factact_oidc_session_minter') throw new Error('Expected the dedicated local OIDC Session minter database Role');
  const adminUrl = new URL(process.env.ADMIN_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  if (adminUrl.hostname !== runtimeUrl.hostname || adminUrl.port !== runtimeUrl.port || adminUrl.pathname !== runtimeUrl.pathname) throw new Error('Admin and runtime must address the same local database');
  const admin = new Pool({connectionString:adminUrl.href,connectionTimeoutMillis:5000});
  try {
    const {rows} = await admin.query(`select rolname from pg_roles
      where rolname in ('factact_runtime','factact_oidc_session_minter')
        and rolcanlogin and not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb`);
    if (rows.length !== 2) throw new Error('Apply local migrations first');
    const env = await readFile('.env','utf8');
    if (!/^DATABASE_URL=.*$/m.test(env) || !/^OIDC_SESSION_DATABASE_URL=.*$/m.test(env)) throw new Error('Database URLs are missing');
    // Generated hex is safe for the DDL literal; no user input is interpolated.
    const password = randomBytes(32).toString('hex');
    const oidcPassword = randomBytes(32).toString('hex');
    await admin.query('BEGIN');
    try {
      await admin.query(`alter role factact_runtime password '${password}'`);
      await admin.query(`alter role factact_oidc_session_minter password '${oidcPassword}'`);
      await admin.query('COMMIT');
    } catch (error) { await admin.query('ROLLBACK'); throw error; }
    runtimeUrl.password = password;
    oidcUrl.password = oidcPassword;
    await writeFile('.env',env.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=${runtimeUrl.href}`)
      .replace(/^OIDC_SESSION_DATABASE_URL=.*$/m,`OIDC_SESSION_DATABASE_URL=${oidcUrl.href}`),{mode:0o600});
    const runtime = new Pool({connectionString:runtimeUrl.href,connectionTimeoutMillis:5000});
    const oidc = new Pool({connectionString:oidcUrl.href,connectionTimeoutMillis:5000,max:1});
    try { await assertRuntimeRole(runtime); await assertOidcSessionMinterRole(oidc); }
    finally { await runtime.end(); await oidc.end(); }
    console.log('Local runtime and OIDC Session minter passwords configured in ignored .env; both restricted roles verified. No seed or JOIN data changed.');
  } finally { await admin.end(); }
}
main().catch(()=>{console.error('Local database setup failed. Check local migrations and administrative connection. Credentials were not logged.');process.exitCode=1;});
