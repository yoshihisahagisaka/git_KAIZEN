import type { Pool } from 'pg';

// Startup checks actual schema objects, including test/local databases without CLI history.
export async function assertSchemaReady(pool: Pool): Promise<void> {
  const required = ['factact.join_events', 'factact.work', 'factact.relations',
    'factact.support_events', 'factact.recipient_observations', 'factact.support_work_device_contexts', 'factact.support_work_target_observations',
    'factact.device_work_field_observations',
    'factact.support_decisions', 'factact.knowledge_candidates', 'factact.support_work_records',
    'factact.scoped_actor_grants','factact_private.scoped_grant_approvers',
    'factact_private.scoped_grant_management_requests', 'factact.service_request_channels', 'factact.service_request_participants', 'factact.service_requests', 'factact.service_request_updates', 'factact.service_request_notifications','factact.service_request_teams_recipients','factact.service_request_teams_intents','factact.service_request_teams_attempts','factact.contact_points'];
  const { rows } = await pool.query<{ name: string }>(
    'select name from unnest($1::text[]) as name where to_regclass(name) is null', [required]);
  if (rows.length) throw new Error('Database migrations are incomplete. Run npm run db:migrate for the local database before starting FACTACT.');
  const portalColumn=await pool.query(`select 1 from pg_attribute
    where attrelid='factact.operators'::regclass and attname='request_portal_only'
      and atttypid='boolean'::regtype and attnotnull and not attisdropped`);
  if(portalColumn.rowCount!==1)throw new Error('Database migrations are incomplete. Request portal account boundary is missing.');
  const functions=[
    'factact.lock_service_request_context(uuid,uuid,uuid)',
    'factact_private.issue_scoped_actor_grant(text,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text[],timestamp with time zone,timestamp with time zone,text)',
    'factact_private.revoke_scoped_actor_grant(text,uuid,uuid,text)',
  ];
  const missing=await pool.query('select name from unnest($1::text[]) as name where to_regprocedure(name) is null',[functions]);
  if(missing.rows.length)throw new Error('Database migrations are incomplete. Scoped Grant management functions are missing.');
  // S3c-1B must fail closed before serving HTTP if the exact Session wrappers
  // or their least-privilege function ACLs have not been migrated.
  const deviceFunctions=[
    'factact.device_record_observation_session(text,jsonb)',
    'factact.device_propose_observation_session(text,uuid,text)',
    'factact.device_confirm_observation_session(text,uuid,text)',
    'factact.device_pending_observation_reviews_session(text,integer,timestamp with time zone,uuid)',
  ];
  const gate=await pool.query(`
    select name from unnest($1::text[]) as name
    left join pg_proc p on p.oid=to_regprocedure(name)
    where p.oid is null
      or not has_function_privilege(current_user,p.oid,'EXECUTE')
      or exists(select 1
        from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        where acl.grantee=0 and acl.privilege_type='EXECUTE')
  `,[deviceFunctions]);
  if(gate.rows.length)throw new Error('Database migrations are incomplete. Device Session RPC/ACL gate is missing.');
}
