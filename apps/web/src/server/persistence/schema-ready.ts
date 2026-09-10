import type { Pool } from 'pg';

// Startup checks actual schema objects, including test/local databases without CLI history.
export async function assertSchemaReady(pool: Pool): Promise<void> {
  const required = ['factact.join_events', 'factact.work', 'factact.relations',
    'factact.support_events', 'factact.recipient_observations',
    'factact.support_decisions', 'factact.knowledge_candidates', 'factact.support_work_records'];
  const { rows } = await pool.query<{ name: string }>(
    'select name from unnest($1::text[]) as name where to_regclass(name) is null', [required]);
  if (rows.length) throw new Error('Database migrations are incomplete. Run npm run db:migrate for the local database before starting FACTACT.');
}
