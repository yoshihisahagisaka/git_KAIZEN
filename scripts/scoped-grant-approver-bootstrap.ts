// Deliberately separate from normal login. Only a local administrator may
// register a recently OIDC-verified approver after an explicit Operator bind.
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';

export const SINGLE_GRANT_APPROVER_EMAIL='yoshihisa.hagisaka@atlib.jp';
const proofSchema=z.object({
  issuer:z.literal('https://accounts.google.com'),
  subject:z.string().min(1),
  verifiedEmail:z.literal(SINGLE_GRANT_APPROVER_EMAIL),
  verifiedAt:z.iso.datetime(),
}).strict();

export function validateGrantApproverProof(input:unknown, now=Date.now()) {
  const proof=proofSchema.parse(input);
  const age=now-Date.parse(proof.verifiedAt);
  if (age<0 || age>10*60*1000) throw new Error('Fresh, verified Google account proof required');
  return proof;
}

export async function provisionLocalGrantApprover(
  pool:Pool, input:unknown, tenantId:string, operatorId:string, now=Date.now(),
):Promise<'CREATED'|'EXISTS'> {
  const proof=validateGrantApproverProof(input,now);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("select pg_advisory_xact_lock(hashtextextended('factact:single-grant-approver-bootstrap',0))");
    const membership=await client.query(`
      select 1 from factact_private.operator_identities m
      join factact.operators o on o.id=m.operator_id and o.tenant_id=m.tenant_id and o.status='ACTIVE'
      join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
      where m.issuer=$1 and m.subject=$2 and m.tenant_id=$3 and m.operator_id=$4
        and m.status='ACTIVE' for share of m,o,t`,
      [proof.issuer,proof.subject,tenantId,operatorId]);
    if (membership.rowCount!==1) throw new Error('Verified Google identity must already be explicitly bound to the active local Operator/Tenant');
    const existing=await client.query<{issuer:string;subject:string;status:string}>(
      'select issuer,subject,status from factact_private.scoped_grant_approvers for update');
    if (existing.rows.length) {
      if (existing.rows.length!==1 || existing.rows[0]?.issuer!==proof.issuer ||
          existing.rows[0]?.subject!==proof.subject || existing.rows[0]?.status!=='ACTIVE') {
        throw new Error('Existing approver record requires explicit administrative review; no automatic replacement');
      }
      await client.query('COMMIT');
      return 'EXISTS';
    }
    await client.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values ($1,$2,$3)`,
      [proof.issuer,proof.subject,SINGLE_GRANT_APPROVER_EMAIL]);
    await client.query(`insert into factact.audit_events
      (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
      values ($1,$2,'OPERATOR',$3,'SCOPED_GRANT_APPROVER_BOOTSTRAPPED',$3,$4::jsonb)`,
      [randomUUID(),tenantId,operatorId,JSON.stringify({source:'verified-local-google-oidc',approvedEmail:SINGLE_GRANT_APPROVER_EMAIL})]);
    await client.query('COMMIT');
    return 'CREATED';
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release();}
}
