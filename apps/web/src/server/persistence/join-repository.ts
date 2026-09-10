import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { JoinRepository, JoinUnitOfWork } from '../../../../../packages/application/src/join-ports.js';
import { DomainError, type Action, type Audit, type Change, type Contract, type Device, type Evaluation, type Evidence, type JoinEvent, type Person, type Relation, type Service, type Work } from '../../../../../packages/domain/src/join.js';
import type { Operator } from '../../../../../packages/domain/src/operator.js';
import { withTenant } from './database.js';

const roles = z.array(z.enum(['ADMIN','OPERATOR','REVIEWER'])).min(1);
const configuration = z.strictObject({
  support: z.strictObject({ enabled:z.boolean(), executeRoles:roles }).optional(),
  requirements: z.strictObject({ COMPANY_PC: z.strictObject({ policy: z.enum(['REQUIRED','NOT_APPLICABLE','DECISION_REQUIRED']), basis: z.string().min(1) }) }),
  deviceAssignment: z.strictObject({ executeRoles: roles, reviewRoles: roles, allowSelfReview: z.boolean() }),
});
function row<T>(raw: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value instanceof Date ? (key === 'join_date' ? value.toISOString().slice(0,10) : value.toISOString()) : value])) as T;
}

export class PgJoinUnitOfWork implements JoinUnitOfWork {
  constructor(private readonly pool: Pool) {}
  run<T>(tenantId: string, fn: (repo: JoinRepository) => Promise<T>, readOnly = false): Promise<T> {
    return withTenant(this.pool, tenantId, client => fn(new PgJoinRepository(client, tenantId)),readOnly);
  }
}
export class PgJoinRepository implements JoinRepository {
  constructor(private readonly db: PoolClient, private readonly tenantId: string) {}
  private async one<T>(sql: string, args: unknown[] = []): Promise<T | null> { const { rows } = await this.db.query(sql,args); return rows[0] ? row<T>(rows[0]) : null; }
  private async many<T>(sql: string, args: unknown[] = []): Promise<T[]> { return (await this.db.query(sql,args)).rows.map(r => row<T>(r)); }
  // Internal SQL helper only; never exposed as a generic mutation API.
  private async insert(table: string, data: Record<string, unknown>) {
    const entries = Object.entries(data);
    const columns = entries.map(([key]) => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`));
    await this.db.query(`insert into factact.${table} (${columns.join(',')}) values (${columns.map((_,i) => `$${i+1}`).join(',')})`, entries.map(([,value]) => value));
  }
  async operator(id: string): Promise<Operator | null> {
    const o = await this.one<{ id: string; tenantId: string; displayName: string; tenantName: string; roles: Operator['roles'] }>(`select o.id,o.tenant_id,o.display_name,t.name as tenant_name,
      array(select role from factact.operator_roles r where r.operator_id=o.id and r.tenant_id=o.tenant_id) as roles
      from factact.operators o join factact.tenants t on t.id=o.tenant_id where o.id=$1 and o.status='ACTIVE' and t.status='ACTIVE'`, [id]);
    return o;
  }
  person(id: string, lock=false) { return this.one<Person>(`select * from factact.people where id=$1 ${lock?'for update':''}`, [id]); }
  service(id: string) { return this.one<Service>('select * from factact.services where id=$1', [id]); }
  private parseContract(c: Contract): Contract {
    const parsed = configuration.safeParse(c.configurationJson);
    if (!parsed.success) throw new DomainError('INVALID_CONTRACT_CONFIGURATION','契約の設定を確認してください。');
    return { ...c, configurationJson: parsed.data };
  }
  async effectiveContracts(serviceId: string, at: string) { return (await this.many<Contract>("select * from factact.contract_profiles where service_id=$1 and status='ACTIVE' and effective_from <= $2 and (effective_to is null or effective_to > $2)",[serviceId,at])).map(c=>this.parseContract(c)); }
  async contract(id: string) { const c = await this.one<Contract>('select * from factact.contract_profiles where id=$1',[id]); return c ? this.parseContract(c) : null; }
  async ensureRecipient(id: string, serviceId: string, personId: string) {
    await this.db.query("insert into factact.service_recipients(id,tenant_id,service_id,recipient_id) values($1,$2,$3,$4) on conflict(tenant_id,service_id,recipient_id) do nothing",[id,this.tenantId,serviceId,personId]);
    const found = await this.one<{id:string}>("select id from factact.service_recipients where service_id=$1 and recipient_id=$2 and status='ACTIVE'",[serviceId,personId]);
    if (!found) throw new DomainError('RECIPIENT_INACTIVE','サービス対象者が無効です。');
    return found.id;
  }
  recipientPerson(recipientId: string) { return this.one<Person>("select p.* from factact.people p join factact.service_recipients r on r.recipient_id=p.id and r.tenant_id=p.tenant_id where r.id=$1 and r.status='ACTIVE'",[recipientId]); }
  insertEvent(event: JoinEvent) { return this.insert('join_events',{...event, occurredAt: event.createdAt, receivedAt: event.createdAt}); }
  event(id: string, lock=false) { return this.one<JoinEvent>(`select * from factact.join_events where id=$1 ${lock?'for update':''}`,[id]); }
  evaluations(eventId: string) { return this.many<Evaluation>('select * from factact.requirement_evaluations where event_id=$1 order by evaluated_at,id',[eventId]); }
  insertEvaluation(evaluation: Evaluation) { return this.insert('requirement_evaluations',{...evaluation,evaluatedByType:'RULE'}); }
  async markEvaluated(eventId: string) { await this.db.query("update factact.join_events set status='EVALUATED' where id=$1",[eventId]); }
  insertWork(work: Work) { return this.insert('work',{...work, workType:'EVENT_TASK',lane:'CHANGE'}); }
  work(id: string, lock=false) { return this.one<Work>(`select * from factact.work where lane='CHANGE' and id=$1 ${lock?'for update':''}`,[id]); }
  async saveWorkProgress(w: Work) {
    await this.db.query('update factact.work set status=$2,outcome=$3,work_owner_operator_id=$4,next_action=$5,next_action_owner_operator_id=$6,updated_at=$7,closed_at=$8 where id=$1',
      [w.id,w.status,w.outcome,w.workOwnerOperatorId,w.nextAction,w.nextActionOwnerOperatorId,w.updatedAt,w.closedAt]);
  }
  works(eventId: string) { return this.many<Work>('select * from factact.work where source_event_id=$1 order by created_at,id',[eventId]); }
  device(id: string, lock=false) { return this.one<Device>(`select * from factact.devices where id=$1 ${lock?'for update':''}`,[id]); }
  deviceRelation(deviceId: string) { return this.one<Relation>("select * from factact.relations where to_entity_id=$1 and status='ACTIVE'",[deviceId]); }
  currentRelation(personId: string) { return this.one<Relation>("select * from factact.relations where from_entity_id=$1 and status='ACTIVE'",[personId]); }
  insertAction(action: Action, deviceId: string) { return this.insert('actions',{...action,actionType:'ASSIGN_DEVICE',status:'COMPLETED',inputJson:{deviceId}}); }
  action(id: string) { return this.one<Action>('select * from factact.actions where id=$1',[id]); }
  actions(workId: string) { return this.many<Action>('select * from factact.actions where work_id=$1 order by started_at,id',[workId]); }
  insertChange(change: Change) { return this.insert('changes',{...change,changeType:'REALITY_CHANGE',changeKind:'PRIMARY_DEVICE_ASSIGNMENT',subjectType:'PERSON'}); }
  change(id: string, lock=false) { return this.one<Change>(`select * from factact.changes where id=$1 ${lock?'for update':''}`,[id]); }
  changes(workId: string) { return this.many<Change>('select * from factact.changes where work_id=$1 order by created_at,id',[workId]); }
  async saveChangeReview(c: Change) { await this.db.query('update factact.changes set status=$2,verification_summary=$3,verified_by_operator_id=$4,verified_at=$5,committed_at=$6 where id=$1',[c.id,c.status,c.verificationSummary,c.verifiedByOperatorId,c.verifiedAt,c.committedAt]); }
  async endRelation(id: string, at: string) { await this.db.query("update factact.relations set status='ENDED',effective_to=$2 where id=$1 and status='ACTIVE'",[id,at]); }
  insertRelation(relation: Relation) { return this.insert('relations',{...relation,relationType:'USES_PRIMARY_DEVICE',fromEntityType:'PERSON',toEntityType:'DEVICE'}); }
  relationForChange(changeId: string) { return this.one<Relation>('select * from factact.relations where source_change_id=$1',[changeId]); }
  async insertEvidence(evidence: Evidence, changeId: string) { await this.insert('evidence',{...evidence}); await this.linkEvidence(evidence.id,changeId); }
  evidence(id: string) { return this.one<Evidence>('select * from factact.evidence where id=$1',[id]); }
  changeEvidence(changeId: string) { return this.many<Evidence>('select e.* from factact.evidence e join factact.change_evidence ce on ce.evidence_id=e.id and ce.tenant_id=e.tenant_id where ce.change_id=$1 order by e.created_at,e.id',[changeId]); }
  organization(id: string) { return this.one<{id:string;name:string}>('select id,name from factact.organizations where id=$1',[id]); }
  async linkEvidence(id: string, changeId: string) { await this.db.query('insert into factact.change_evidence(tenant_id,change_id,evidence_id) values($1,$2,$3) on conflict do nothing',[this.tenantId,changeId,id]); }
  appendAudit(audit: Audit) { return this.insert('audit_events',{...audit}); }
  timeline(eventId: string) { return this.many<Audit>('select * from factact.audit_events where aggregate_id=$1 order by sequence',[eventId]); }
  people() { return this.many<Person>('select * from factact.people order by display_name,id'); }
  services() { return this.many<Service>("select * from factact.services where status='ACTIVE' order by name,id"); }
  events() { return this.many<JoinEvent>('select * from factact.join_events order by created_at desc,id'); }
  devices() { return this.many<Device>("select d.* from factact.devices d where d.device_status='AVAILABLE' and not exists(select 1 from factact.relations r where r.to_entity_id=d.id and r.tenant_id=d.tenant_id and r.status='ACTIVE') order by asset_tag"); }
  relations(personId: string) { return this.many<Relation>('select * from factact.relations where from_entity_id=$1 order by effective_from,id',[personId]); }
  personWorks(personId: string) { return this.many<Work>(`select w.* from factact.work w join factact.service_recipients r on r.id=w.service_recipient_id and r.tenant_id=w.tenant_id where w.lane='CHANGE' and r.recipient_id=$1 order by w.created_at,w.id`,[personId]); }
}
