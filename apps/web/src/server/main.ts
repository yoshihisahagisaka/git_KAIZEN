import pino from 'pino';
import { loadConfig } from './config.js';
import { createPool, assertRuntimeRole } from './persistence/database.js';
import { PgIdentityStore } from './persistence/identity-store.js';
import { createGoogleProvider } from './auth/oidc.js';
import { createApp } from './app.js';

const logger = pino({ redact: ['password', 'token', 'clientSecret', 'databaseUrl', 'req.headers', 'res.headers'] });
async function main() {
  const config = loadConfig(process.env);
  const pool = createPool(config);
  try {
    await assertRuntimeRole(pool);
    const provider = await createGoogleProvider(config);
    const app = createApp(config, new PgIdentityStore(pool), provider, logger);
    const server = app.listen(config.port, () => logger.info({ port: config.port }, 'FACTACT listening'));
    const shutdown = () => {
      server.close(() => { void pool.end(); });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (error) {
    await pool.end();
    throw error;
  }
}
main().catch(() => { logger.fatal('Startup failed; check configuration, restricted database role and OIDC availability'); process.exitCode = 1; });
