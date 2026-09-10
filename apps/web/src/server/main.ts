import { PgSupportUnitOfWork } from './persistence/support-repository.js';
import { SupportCommands } from '../../../../packages/application/src/support-commands.js';
import { SupportQueries } from '../../../../packages/application/src/support-queries.js';
import pino from 'pino';
import { loadConfig } from './config.js';
import { createPool, assertRuntimeRole } from './persistence/database.js';
import { assertSchemaReady } from './persistence/schema-ready.js';
import { PgIdentityStore } from './persistence/identity-store.js';
import { createGoogleProvider } from './auth/oidc.js';
import { createApp } from './app.js';
import { PgJoinUnitOfWork } from './persistence/join-repository.js';
import { JoinCommands } from '../../../../packages/application/src/join-commands.js';
import { JoinQueries } from '../../../../packages/application/src/join-queries.js';
import { randomUUID } from 'node:crypto';

const logger = pino({ redact: ['password', 'token', 'clientSecret', 'databaseUrl', 'req.headers', 'res.headers'] });
async function main() {
  const config = loadConfig(process.env);
  const pool = createPool(config);
  try {
    await assertRuntimeRole(pool);
    await assertSchemaReady(pool);
    const provider = await createGoogleProvider(config);
    const uow = new PgJoinUnitOfWork(pool);
    const supportUow = new PgSupportUnitOfWork(pool);
    const app = createApp(config, new PgIdentityStore(pool), provider, logger, { commands: new JoinCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()}), queries: new JoinQueries(uow) }, {commands:new SupportCommands(supportUow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new SupportQueries(supportUow)});
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
main().catch(() => { logger.fatal('Startup failed; check configuration, apply pending migrations (npm run db:migrate locally), verify the restricted database role and OIDC availability'); process.exitCode = 1; });
