import type { Pool } from 'pg';

// Startup checks actual schema objects, including test/local databases without CLI history.
export async function assertSchemaReady(pool: Pool): Promise<void> {
  const required = ['factact.join_events', 'factact.work', 'factact.relations',
    'factact.support_events', 'factact.recipient_observations', 'factact.support_work_device_contexts', 'factact.support_work_target_observations',
    'factact.support_decisions', 'factact.knowledge_candidates', 'factact.support_work_records',
    'factact.scoped_actor_grants','factact_private.scoped_grant_approvers',
    'factact_private.scoped_grant_management_requests'];
  const { rows } = await pool.query<{ name: string }>(
    'select name from unnest($1::text[]) as name where to_regclass(name) is null', [required]);
  if (rows.length) throw new Error('Database migrations are incomplete. Run npm run db:migrate for the local database before starting FACTACT.');
  const functions=[
    'factact_private.issue_scoped_actor_grant(text,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text[],timestamp with time zone,timestamp with time zone,text)',
    'factact_private.revoke_scoped_actor_grant(text,uuid,uuid,text)',
  ];
  const missing=await pool.query('select name from unnest($1::text[]) as name where to_regprocedure(name) is null',[functions]);
  if(missing.rows.length)throw new Error('Database migrations are incomplete. Scoped Grant management functions are missing.');
}
