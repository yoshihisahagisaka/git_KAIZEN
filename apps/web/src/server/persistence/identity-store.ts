import type { Pool } from 'pg';
import { z } from 'zod';
import type { Identity, IdentityStore, LoginTransaction, OperatorRef, SessionRef } from '../../../../../packages/application/src/operator-session.js';
import type { Operator } from '../../../../../packages/domain/src/operator.js';
import { withTenant } from './database.js';

const refSchema = z.object({ tenant_id: z.uuid(), operator_id: z.uuid() });
const rolesSchema = z.array(z.enum(['ADMIN', 'OPERATOR', 'REVIEWER']));

export class PgIdentityStore implements IdentityStore {
  constructor(private readonly pool: Pool) {}
  async beginLogin(hash: string, login: LoginTransaction): Promise<void> {
    await this.pool.query('select factact_private.begin_login($1,$2,$3,$4)', [hash, login.state, login.nonce, login.verifier]);
  }
  async consumeLogin(hash: string): Promise<LoginTransaction | null> {
    const { rows } = await this.pool.query('select * from factact_private.consume_login($1)', [hash]);
    return rows[0] ? z.object({ state: z.string(), nonce: z.string(), verifier: z.string() }).parse(rows[0]) : null;
  }
  async resolveIdentity(identity: Identity): Promise<OperatorRef | null> {
    const { rows } = await this.pool.query('select * from factact_private.resolve_identity($1,$2)', [identity.issuer, identity.subject]);
    if (!rows[0]) return null;
    const row = refSchema.parse(rows[0]);
    return { tenantId: row.tenant_id, operatorId: row.operator_id };
  }
  async createSession(hash: string, ref: OperatorRef, csrfToken: string): Promise<void> {
    await this.pool.query('select factact_private.create_session($1,$2,$3,$4)', [hash, ref.tenantId, ref.operatorId, csrfToken]);
  }
  async readSession(hash: string): Promise<SessionRef | null> {
    const { rows } = await this.pool.query('select * from factact_private.read_session($1)', [hash]);
    if (!rows[0]) return null;
    const row = refSchema.extend({ csrf_token: z.string() }).parse(rows[0]);
    return { tenantId: row.tenant_id, operatorId: row.operator_id, csrfToken: row.csrf_token };
  }
  async revokeSession(hash: string): Promise<void> {
    await this.pool.query('select factact_private.revoke_session($1)', [hash]);
  }
  async loadActiveOperator(ref: OperatorRef): Promise<Operator | null> {
    return withTenant(this.pool, ref.tenantId, async client => {
      const { rows } = await client.query(`
        select o.id, o.display_name, t.name as tenant_name,
          array(select role from factact.operator_roles r where r.operator_id = o.id and r.tenant_id = o.tenant_id order by role) as roles
        from factact.operators o join factact.tenants t on t.id = o.tenant_id
        where o.id = $1 and o.status = 'ACTIVE' and t.status = 'ACTIVE'
      `, [ref.operatorId]);
      if (!rows[0]) return null;
      const row = z.object({ id: z.uuid(), display_name: z.string(), tenant_name: z.string(), roles: rolesSchema }).parse(rows[0]);
      return { id: row.id, tenantId: ref.tenantId, displayName: row.display_name, tenantName: row.tenant_name, roles: row.roles };
    });
  }
}
