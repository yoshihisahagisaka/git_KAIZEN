// Explicit local-only administration: does not perform a production bootstrap.
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {z} from 'zod';
import {provisionLocalGrantApprover} from './scoped-grant-approver-bootstrap.js';

async function main() {
  const env=z.object({NODE_ENV:z.literal('development'),ADMIN_DATABASE_URL:z.url()}).parse(process.env);
  const url=new URL(env.ADMIN_DATABASE_URL);
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) ||
      !['postgres:','postgresql:'].includes(url.protocol)) {
    throw new Error('Only an explicitly configured loopback development database is allowed');
  }
  const proof=JSON.parse(await readFile('.env.scoped-grant-approver.json','utf8')) as unknown;
  const pool=new Pool({connectionString:env.ADMIN_DATABASE_URL});
  try {
    const result=await provisionLocalGrantApprover(pool,proof,
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001');
    console.log(`Local single-approver bootstrap: ${result}; no subject or credentials logged.`);
  } finally {await pool.end();}
}

main().catch(()=>{console.error('Local approver bootstrap denied. Check fresh approved Google proof, explicit active Operator membership and local DB configuration.');process.exitCode=1;});
