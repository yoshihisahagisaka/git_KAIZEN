import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';

const issuer='https://accounts.google.com';
const approvedSubject='synthetic-policy-administrator';
const otherSubject='synthetic-policy-nonadministrator';
const approvedHash=tokenHash('policy-administrator-verified-session');
const otherHash=tokenHash('policy-other-verified-session');
const actor='20000000-0000-4000-8000-000000000097';
const cells={NEWCOMER:'DENY',STANDARD:'REQUEST',LEAD:'REQUEST'};
let db:Awaited<ReturnType<typeof testDatabase>>,store:PgIdentityStore;

const assign=(hash:string,id:string,level:string|null='NEWCOMER',service=ids.service,
 target=actor,reason='担当の運用者レベルを設定')=>db.runtime.query<{result:string}>(`
 select factact_private.operator_policy_assign_level($1,$2,$3,$4,$5,$6) as result`,
 [hash,id,service,target,level,reason]);
const version=(hash:string,id:string,values:unknown=cells,service=ids.service,
 reason='表示名訂正に必要な確認手順を設定')=>db.runtime.query<{result:string}>(`
 select factact_private.operator_policy_create_version($1,$2,$3,$4::jsonb,$5) as result`,
 [hash,id,service,JSON.stringify(values),reason]);
const publish=(hash:string,id:string,versionId:string|null,service=ids.service,
 reason='設定の公開状態を管理')=>db.runtime.query<{result:string}>(`
 select factact_private.operator_policy_publish($1,$2,$3,$4,$5) as result`,
 [hash,id,service,versionId,reason]);
const audit=()=>db.admin.query<{event_type:string;actor_operator_id:string}>(`
 select event_type,actor_operator_id from factact.audit_events
 where aggregate_type='OPERATOR_POLICY' order by occurred_at,id`);
const registerApprover=()=>db.admin.query(`insert into factact_private.scoped_grant_approvers
 (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
 [issuer,approvedSubject]);

beforeAll(async()=>{db=await testDatabase();store=new PgIdentityStore(db.runtime,db.oidc);},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('delete from factact_private.scoped_grant_approvers');
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'policy-actor@example.invalid','Policy actor','ACTIVE')`,[actor,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true),($1,$5,$3,$6,true)`,
  [issuer,approvedSubject,ids.tenant,ids.operator,otherSubject,actor]);
 await store.createVerifiedSession(approvedHash,{tenantId:ids.tenant,operatorId:ids.operator},
  'policy-csrf',{issuer,subject:approvedSubject});
 await store.createVerifiedSession(otherHash,{tenantId:ids.tenant,operatorId:actor},
  'policy-other-csrf',{issuer,subject:otherSubject});
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('approved operator-policy administration: append-only records, never implicit authority',()=>{
 it('migrates empty; runtime has no direct table or policy-revision DML privileges',async()=>{
  for(const table of ['operator_policy_assignment_events','operator_policy_versions',
   'operator_policy_publication_events','operator_policy_admin_requests']){
   expect((await db.admin.query(`select 1 from factact_private.${table}`)).rowCount).toBe(0);
   await expect(db.runtime.query(`select * from factact_private.${table}`))
    .rejects.toMatchObject({code:'42501'});
   await expect(db.runtime.query(`delete from factact_private.${table}`))
    .rejects.toMatchObject({code:'42501'});
  }
  expect((await db.admin.query(`select count(*)::integer as n
   from factact.scoped_actor_grants`)).rows[0].n).toBe(0);
  await expect(assign(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
  await expect(version(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
 });

 it('only explicitly verified designated approver may assign; other OIDC and role-only denied',async()=>{
  await registerApprover();
  await db.admin.query(`insert into factact.operator_roles
   (tenant_id,operator_id,role) values($1,$2,'ADMIN')`,[ids.tenant,actor]);
  const id=randomUUID();
  await expect(assign(otherHash,id)).rejects.toMatchObject({code:'42501'});
  expect((await assign(approvedHash,id)).rows[0]!.result).toBe(id);
  expect((await assign(approvedHash,id)).rows[0]!.result).toBe(id);
  await expect(assign(approvedHash,id,'LEAD')).rejects.toMatchObject({code:'23505'});
  expect((await db.admin.query(`select actor_operator_id,operator_level,
   approved_by_operator_id from factact_private.operator_policy_assignment_events`)).rows)
   .toEqual([{actor_operator_id:actor,operator_level:'NEWCOMER',approved_by_operator_id:ids.operator}]);
  expect((await audit()).rows).toEqual([
   {event_type:'OPERATOR_POLICY_LEVEL_ASSIGNED',actor_operator_id:ids.operator},
  ]);
  expect((await db.admin.query(`select count(*)::integer as n from factact.scoped_actor_grants`))
   .rows[0].n).toBe(0);
 });

 it('assignment is per Service and Actor, with explicit unassign history, not overwritten',async()=>{
  await registerApprover();
  await assign(approvedHash,randomUUID(),'STANDARD');
  await assign(approvedHash,randomUUID(),'LEAD');
  await assign(approvedHash,randomUUID(),null);
  const {rows}=await db.admin.query(`select operator_level from
   factact_private.operator_policy_assignment_events
   where tenant_id=$1 and service_id=$2 and actor_operator_id=$3
   order by recorded_at,id`,[ids.tenant,ids.service,actor]);
  expect(rows.map(row=>row.operator_level)).toEqual(['STANDARD','LEAD',null]);
  await expect(assign(approvedHash,randomUUID(),'RESPONSIBLE'))
   .rejects.toMatchObject({code:'22023'});
  await expect(assign(approvedHash,randomUUID(),'NEWCOMER',randomUUID()))
   .rejects.toMatchObject({code:'42501'});
  await db.admin.query('update factact.operators set status=$2 where id=$1',[actor,'INACTIVE']);
  await expect(assign(approvedHash,randomUUID(),'NEWCOMER'))
   .rejects.toMatchObject({code:'42501'});
 });

 it('creates numbered immutable policy snapshots; never permits COMMIT for display name',async()=>{
  await registerApprover();
  const first=randomUUID(),second=randomUUID();
  expect((await version(approvedHash,first)).rows[0]!.result).toBe(first);
  expect((await version(approvedHash,first)).rows[0]!.result).toBe(first);
  expect((await version(approvedHash,second,{...cells,NEWCOMER:'REQUEST'})).rows[0]!.result).toBe(second);
  await expect(version(approvedHash,first,{...cells,STANDARD:'DENY'}))
   .rejects.toMatchObject({code:'23505'});
  const {rows}=await db.admin.query(`select version,category_code,cells
   from factact_private.operator_policy_versions order by version`);
  expect(rows).toEqual([
   {version:1,category_code:'PERSON_DISPLAY_NAME_CORRECTION',cells},
   {version:2,category_code:'PERSON_DISPLAY_NAME_CORRECTION',cells:{...cells,NEWCOMER:'REQUEST'}},
  ]);
  await expect(version(approvedHash,randomUUID(),{...cells,LEAD:'COMMIT'}))
   .rejects.toMatchObject({code:'22023'});
  await expect(version(approvedHash,randomUUID(),{NEWCOMER:'REQUEST'}))
   .rejects.toMatchObject({code:'22023'});
  await expect(version(approvedHash,randomUUID(),{...cells,OTHER:'REQUEST'}))
   .rejects.toMatchObject({code:'22023'});
  expect((await db.admin.query(`select count(*)::integer as n
   from factact_private.operator_policy_publication_events`)).rows[0].n).toBe(0);
 });

 it('separate audited publish/disable events do not silently enforce or create a Grant',async()=>{
  await registerApprover();
  const versionId=randomUUID(),publication=randomUUID(),disabled=randomUUID();
  await version(approvedHash,versionId);
  await expect(publish(otherHash,publication,versionId)).rejects.toMatchObject({code:'42501'});
  await expect(publish(approvedHash,randomUUID(),randomUUID()))
   .rejects.toMatchObject({code:'42501'});
  await publish(approvedHash,publication,versionId);
  await publish(approvedHash,publication,versionId);
  await expect(publish(approvedHash,publication,null)).rejects.toMatchObject({code:'23505'});
  await publish(approvedHash,disabled,null);
  const {rows}=await db.admin.query(`select operation,policy_version_id
   from factact_private.operator_policy_publication_events order by recorded_at,id`);
  expect(rows).toEqual([
   {operation:'PUBLISH',policy_version_id:versionId},
   {operation:'DISABLE',policy_version_id:null},
  ]);
  expect((await audit()).rows.map(row=>row.event_type)).toEqual([
   'OPERATOR_POLICY_VERSION_CREATED','OPERATOR_POLICY_PUBLISHED','OPERATOR_POLICY_DISABLED',
  ]);
  expect((await db.admin.query(`select count(*)::integer as n from factact.scoped_actor_grants`))
   .rows[0].n).toBe(0);
 });

 it('rejects revoked approver or membership, inactive service, and legacy session',async()=>{
  await registerApprover();
  const legacyHash=tokenHash('policy-compatibility-session');
  await store.createSession(legacyHash,{tenantId:ids.tenant,operatorId:actor},'legacy-csrf');
  await expect(version(legacyHash,randomUUID())).rejects.toMatchObject({code:'42501'});
  await db.admin.query(`update factact_private.scoped_grant_approvers
   set status='REVOKED',revoked_at=now() where subject=$1`,[approvedSubject]);
  await expect(version(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
  await db.admin.query(`update factact_private.scoped_grant_approvers
   set status='ACTIVE',revoked_at=null where subject=$1`,[approvedSubject]);
  await db.admin.query(`update factact_private.operator_identities
   set status='REVOKED',revoked_at=now(),revocation_reason='撤回' where subject=$1`,[approvedSubject]);
  await expect(assign(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
  await db.admin.query(`update factact_private.operator_identities
   set status='ACTIVE',revoked_at=null,revocation_reason=null where subject=$1`,[approvedSubject]);
  await db.admin.query('update factact.services set status=$2 where id=$1',[ids.service,'INACTIVE']);
  await expect(version(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
 });

 it('if Audit insertion fails, level assignment and idempotency receipt roll back atomically',async()=>{
  await registerApprover();
  const id=randomUUID();
  await db.admin.query(`alter table factact.audit_events add constraint deny_policy_audit
   check (event_type <> 'OPERATOR_POLICY_LEVEL_ASSIGNED') not valid`);
  try{
   await expect(assign(approvedHash,id)).rejects.toThrow();
   expect((await db.admin.query(`select * from factact_private.operator_policy_assignment_events
    where id=$1`,[id])).rowCount).toBe(0);
   expect((await db.admin.query(`select * from factact_private.operator_policy_admin_requests
    where request_id=$1`,[id])).rowCount).toBe(0);
   expect((await audit()).rowCount).toBe(0);
  }finally{
   await db.admin.query('alter table factact.audit_events drop constraint deny_policy_audit');
  }
 });

 it('parallel snapshot writes serialize version allocation per tenant and Service',async()=>{
  await registerApprover();
  await Promise.all([version(approvedHash,randomUUID()),version(approvedHash,randomUUID())]);
  expect((await db.admin.query(`select version from factact_private.operator_policy_versions
   order by version`)).rows).toEqual([{version:1},{version:2}]);
 });
});
