import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';

let db:Awaited<ReturnType<typeof testDatabase>>;

const insertGrant=async(id:string)=>db.admin.query(`
 insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
   scope_kind,object_kind,operations,effective_from,issued_by_operator_id)
 values ($1,$2,$3,$4,$5,'SERVICE','SUPPORT',array['READ','UPDATE'],
         '2026-11-01T00:00:00Z',$6)
`,[id,ids.tenant,ids.operator,ids.service,ids.contract,ids.operator]);

type AuditRow={
 tenant_id:string;aggregate_type:string;aggregate_id:string;event_type:string;
 actor_operator_id:string|null;metadata_json:Record<string,unknown>;
};
const audit=async(grantId:string)=>(await db.admin.query<AuditRow>(`
 select tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json
 from factact.audit_events where aggregate_type='SCOPED_ACTOR_GRANT' and aggregate_id=$1
 order by occurred_at,id
`,[grantId])).rows;

beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{await db.reset();},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('privileged scoped Grant lifecycle is automatically audited in its transaction',()=>{
 it('records trusted DB row identity and explicit non-approval attribution on issuance',async()=>{
  const id=randomUUID();
  await insertGrant(id);
  const rows=await audit(id);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
   tenant_id:ids.tenant,aggregate_type:'SCOPED_ACTOR_GRANT',aggregate_id:id,
   event_type:'SCOPED_GRANT_ISSUED',actor_operator_id:ids.operator,
  });
  expect(rows[0]!.metadata_json).toMatchObject({
   grantId:id,actorOperatorId:ids.operator,serviceId:ids.service,
   contractProfileId:ids.contract,scopeKind:'SERVICE',objectKind:'SUPPORT',
   operations:['READ','UPDATE'],status:'ACTIVE',
   auditSource:'DATABASE_GRANT_LIFECYCLE_TRIGGER',
   attribution:'GRANT_ROW_FIELDS_NOT_AUTHENTICATED_APPROVAL',
  });
  expect(rows[0]!.metadata_json).not.toHaveProperty('approvalId');
 });

 it('records revoke and non-revocation corrections distinctly, without claiming the SQL operator',async()=>{
  const id=randomUUID();
  await insertGrant(id);
  await db.admin.query('update factact.scoped_actor_grants set effective_until=$2 where id=$1',
   [id,'2026-12-01T00:00:00Z']);
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',revoked_by_operator_id=$2,revoked_at=now(),revocation_reason=$3
   where id=$1`,[id,ids.operator,'利用終了に伴う明示的な失効']);
  const rows=await audit(id);
  expect(rows.map(row=>row.event_type)).toEqual([
   'SCOPED_GRANT_ISSUED','SCOPED_GRANT_UPDATED','SCOPED_GRANT_REVOKED',
  ]);
  expect(rows[1]!.actor_operator_id).toBeNull();
  expect(rows[2]!.actor_operator_id).toBe(ids.operator);
  expect(rows[2]!.metadata_json).toMatchObject({
   previousStatus:'ACTIVE',status:'REVOKED',revocationReason:'利用終了に伴う明示的な失効',
  });
 });

 it('preserves a deletion tombstone in audit history (not a supported management command)',async()=>{
  const id=randomUUID();
  await insertGrant(id);
  await db.admin.query('delete from factact.scoped_actor_grants where id=$1',[id]);
  const rows=await audit(id);
  expect(rows.map(row=>row.event_type)).toEqual(['SCOPED_GRANT_ISSUED','SCOPED_GRANT_DELETED']);
  expect(rows[1]!.actor_operator_id).toBeNull();
  expect(rows[1]!.metadata_json).toMatchObject({grantId:id,status:'ACTIVE'});
  expect((await db.admin.query('select id from factact.scoped_actor_grants where id=$1',[id])).rowCount).toBe(0);
 });

 it('does not commit a Grant when the audit insertion fails',async()=>{
  const id=randomUUID();
  await db.admin.query(`alter table factact.audit_events add constraint reject_test_grant_audit
   check (aggregate_type <> 'SCOPED_ACTOR_GRANT') not valid`);
  try {
   await expect(insertGrant(id)).rejects.toThrow();
   expect((await db.admin.query('select id from factact.scoped_actor_grants where id=$1',[id])).rowCount).toBe(0);
   expect(await audit(id)).toHaveLength(0);
  } finally {
   await db.admin.query('alter table factact.audit_events drop constraint reject_test_grant_audit');
  }
 });

 it('keeps runtime SELECT-only and leaves failed application-side mutation unaudited',async()=>{
  const id=randomUUID();
  await insertGrant(id);
  const before=await audit(id);
  await expect(withTenant(db.runtime,ids.tenant,async client=>{
   await client.query(`update factact.scoped_actor_grants set status='REVOKED' where id=$1`,[id]);
  })).rejects.toThrow();
  await expect(withTenant(db.runtime,ids.tenant,async client=>{
   await client.query('delete from factact.scoped_actor_grants where id=$1',[id]);
  })).rejects.toThrow();
  expect(await audit(id)).toEqual(before);
  expect((await db.admin.query('select status from factact.scoped_actor_grants where id=$1',[id])).rows[0].status).toBe('ACTIVE');
 });
});
