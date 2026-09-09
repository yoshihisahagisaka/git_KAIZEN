import { Pool } from 'pg';
import { z } from 'zod';

// Explicit development administration, never an application route or auth fallback.
const env = z.object({
  NODE_ENV: z.literal('development'), ADMIN_DATABASE_URL: z.url(),
  OPERATOR_SUBJECT: z.string().min(1), OIDC_ISSUER: z.literal('https://accounts.google.com'),
}).parse(process.env);
const url = new URL(env.ADMIN_DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Binding tool is local-development only');
const pool = new Pool({ connectionString: env.ADMIN_DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const tenantId = '10000000-0000-4000-8000-000000000001';
  const operatorId = '20000000-0000-4000-8000-000000000001';
  // Do not silently replace an existing real identity binding or transfer another user's identity.
  const { rows } = await client.query(`select 1 from factact_private.operator_identities where operator_id=$1 and issuer <> 'https://seed.example.invalid'`, [operatorId]);
  if (rows.length) throw new Error('Operator already has a real identity binding; explicit administrative review is required');
  await client.query('insert into factact_private.operator_identities (issuer,subject,tenant_id,operator_id) values ($1,$2,$3,$4)', [env.OIDC_ISSUER, env.OPERATOR_SUBJECT, tenantId, operatorId]);
  await client.query("delete from factact_private.operator_identities where operator_id=$1 and issuer='https://seed.example.invalid'", [operatorId]);
  await client.query(`insert into factact.audit_events (id,tenant_id,aggregate_type,aggregate_id,event_type,metadata_json)
    values (gen_random_uuid(),$1,'OPERATOR',$2,'OPERATOR_IDENTITY_BOUND','{"source":"local administrative binding"}')`, [tenantId, operatorId]);
  await client.query('COMMIT');
  console.log('Development Operator identity bound. Subject and credentials were not logged.');
} catch {
  await client.query('ROLLBACK');
  console.error('Identity binding failed; check local configuration, seed and existing identity bindings.');
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
