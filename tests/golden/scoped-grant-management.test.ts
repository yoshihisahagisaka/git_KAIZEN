import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';

const issuer='https://accounts.google.com';
const subject='synthetic-verified-approver';
const otherSubject='synthetic-other-verified-user';
const approvedHash=tokenHash('scoped-grant-approval-session');
const otherHash=tokenHash('scoped-grant-other-session');
const actor='20000000-0000-4000-8000-000000000088';
const at='2026-11-08T12:00:00Z';
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgIdentityStore;

const issue=(hash:string,requestId:string,options:{
  actorId?:string;serviceId?:string;contractId?:string;scope?:string;
  recipientId?:string|null;workId?:string|null;operations?:string[];
}={})=>db.runtime.query<{grant_id:string}>(`select factact_private.issue_scoped_actor_grant(
  $1,$2,$3,$4,$5,$6,$7,$8,'SUPPORT',$9,$10::timestamptz,$11::timestamptz,$12) as grant_id`,[
  hash,requestId,options.actorId??actor,options.serviceId??ids.service,
  options.contractId??ids.contract,options.scope??'SERVICE',
  options.recipientId??null,options.workId??null,options.operations??['READ'],
  '2026-11-08T00:00:00Z',null,'業務上必要な閲覧権限を明示的に付与',
]);
const revoke=(hash:string,requestId:string,grantId:string,reason:string)=>
 db.runtime.query<{grant_id:string}>(`select factact_private.revoke_scoped_actor_grant($1,$2,$3,$4) as grant_id`,
  [hash,requestId,grantId,reason]);
const grant=(id:string)=>db.admin.query<{status:string;issued_by_operator_id:string;revoked_by_operator_id:string|null}>(
 'select status,issued_by_operator_id,revoked_by_operator_id from factact.scoped_actor_grants where id=$1',[id]);
const audit=(id:string)=>db.admin.query<{event_type:string;actor_operator_id:string|null}>(
 `select event_type,actor_operator_id from factact.audit_events
  where aggregate_type='SCOPED_ACTOR_GRANT' and aggregate_id=$1 order by occurred_at,id`,[id]);

beforeAll(async()=>{db=await testDatabase();store=new PgIdentityStore(db.runtime);},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('delete from factact_private.scoped_grant_approvers');
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'external-actor@example.invalid','External Actor','ACTIVE')`,[actor,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true),($1,$5,$3,$6,true)`,
  [issuer,subject,ids.tenant,ids.operator,otherSubject,actor]);
 await store.createVerifiedSession(approvedHash,{tenantId:ids.tenant,operatorId:ids.operator},'csrf',
  {issuer,subject});
 await store.createVerifiedSession(otherHash,{tenantId:ids.tenant,operatorId:actor},'csrf2',
  {issuer,subject:otherSubject});
},60_000);
afterAll(async()=>{await db?.close();},60_000);

const registerApprovedIdentity=()=>db.admin.query(`insert into factact_private.scoped_grant_approvers
 (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,[issuer,subject]);

describe('single verified identity approval for scoped Grant management',()=>{
 it('fails closed before explicit issuer/subject registration, even if Operator email matches',async()=>{
  await db.admin.query('update factact.operators set email=$2 where id=$1',
   [ids.operator,'yoshihisa.hagisaka@atlib.jp']);
  const id=randomUUID();
  await expect(issue(approvedHash,id)).rejects.toMatchObject({code:'42501'});
  expect((await grant(id)).rowCount).toBe(0);
  expect((await audit(id)).rowCount).toBe(0);
 });

 it('allows only registered, active Google subject and writes both lifecycle + verified approval Audit',async()=>{
  await registerApprovedIdentity();
  const id=randomUUID();
  await expect(issue(otherHash,id)).rejects.toMatchObject({code:'42501'});
  expect((await issue(approvedHash,id)).rows[0]?.grant_id).toBe(id);
  expect((await issue(approvedHash,id)).rows[0]?.grant_id).toBe(id);
  expect((await grant(id)).rows[0]).toMatchObject({status:'ACTIVE',issued_by_operator_id:ids.operator});
  expect((await audit(id)).rows).toEqual([
   {event_type:'SCOPED_GRANT_ISSUED',actor_operator_id:ids.operator},
   {event_type:'SCOPED_GRANT_MANAGEMENT_ISSUE_APPROVED',actor_operator_id:ids.operator},
  ]);
  expect((await db.admin.query('select * from factact_private.scoped_grant_management_requests where request_id=$1',[id])).rowCount).toBe(1);
  await expect(issue(approvedHash,id,{operations:['READ','UPDATE']})).rejects.toMatchObject({code:'23505'});
 });

 it('refuses wrong Actor/Tenant, expired context and malformed target scope',async()=>{
  await registerApprovedIdentity();
  await expect(issue(approvedHash,randomUUID(),{actorId:randomUUID()})).rejects.toMatchObject({code:'42501'});
  await expect(issue(approvedHash,randomUUID(),{serviceId:randomUUID()})).rejects.toMatchObject({code:'42501'});
  await expect(issue(approvedHash,randomUUID(),{scope:'WORK',workId:randomUUID()})).rejects.toMatchObject({code:'42501'});
  await db.admin.query('update factact.contract_profiles set status=$2 where id=$1',[ids.contract,'INACTIVE']);
  await expect(issue(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
 });

 it('requires a confirmed beneficiary before issuing a SUPPORT Work Grant',async()=>{
  await registerApprovedIdentity();
  const recipient=randomUUID(),work=randomUUID();
  await db.admin.query(`insert into factact.service_recipients
   (id,tenant_id,service_id,recipient_type,recipient_organization_id,status)
   values($1,$2,$3,'ORGANIZATION',$4,'ACTIVE')`,[recipient,ids.tenant,ids.service,ids.organization]);
  // A Work ID from elsewhere, or without beneficiary confirmation, cannot be granted.
  await expect(issue(approvedHash,randomUUID(),{
   scope:'WORK',recipientId:recipient,workId:work,
  })).rejects.toMatchObject({code:'42501'});
 });

 it('revokes atomically with approval Audit, idempotent retry and immediate effective denial',async()=>{
  await registerApprovedIdentity();
  const id=randomUUID();
  await issue(approvedHash,id);
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>at});
  const target={tenantId:ids.tenant,serviceId:ids.service,contractProfileId:ids.contract,
   scope:{kind:'SERVICE' as const},objectKind:'SUPPORT' as const,operation:'READ' as const};
  expect(await reader.authorized(actor,target)).toBe(true);
  const revokeId=randomUUID();
  await expect(revoke(otherHash,revokeId,id,'担当契約終了')).rejects.toMatchObject({code:'42501'});
  expect((await revoke(approvedHash,revokeId,id,'担当契約終了')).rows[0]?.grant_id).toBe(id);
  expect((await revoke(approvedHash,revokeId,id,'担当契約終了')).rows[0]?.grant_id).toBe(id);
  expect((await grant(id)).rows[0]).toMatchObject({status:'REVOKED',revoked_by_operator_id:ids.operator});
  expect(await reader.authorized(actor,target)).toBe(false);
  expect((await audit(id)).rows.map(row=>row.event_type)).toEqual([
   'SCOPED_GRANT_ISSUED','SCOPED_GRANT_MANAGEMENT_ISSUE_APPROVED',
   'SCOPED_GRANT_REVOKED','SCOPED_GRANT_MANAGEMENT_REVOKE_APPROVED',
  ]);
  await expect(revoke(approvedHash,randomUUID(),id,'担当契約終了')).rejects.toMatchObject({code:'42501'});
  await expect(revoke(approvedHash,revokeId,id,'異なる理由')).rejects.toMatchObject({code:'23505'});
 });

 it('rejects approval revocation and membership revocation even for an existing session',async()=>{
  await registerApprovedIdentity();
  await db.admin.query(`update factact_private.scoped_grant_approvers
    set status='REVOKED',revoked_at=now() where issuer=$1 and subject=$2`,[issuer,subject]);
  await expect(issue(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
  await db.admin.query(`update factact_private.scoped_grant_approvers
    set status='ACTIVE',revoked_at=null where issuer=$1 and subject=$2`,[issuer,subject]);
  await db.admin.query(`update factact_private.operator_identities
   set status='REVOKED',revoked_at=now(),revocation_reason='退任' where issuer=$1 and subject=$2`,[issuer,subject]);
  await expect(issue(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
 });

 it('never promotes the legacy compatibility create_session into Grant approval',async()=>{
  // The second Operator has one unique ACTIVE identity membership, so the
  // compatibility session can be created without a verified OIDC callback.
  await db.admin.query(`insert into factact_private.scoped_grant_approvers
   (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
   [issuer,otherSubject]);
  const legacyHash=tokenHash('legacy-grant-compatibility-session');
  await store.createSession(legacyHash,{tenantId:ids.tenant,operatorId:actor},'csrf');
  await expect(issue(legacyHash,randomUUID(),{actorId:actor})).rejects.toMatchObject({code:'42501'});
 });

 it('preserves verified OIDC provenance when a session context token rotates',async()=>{
  await registerApprovedIdentity();
  const rotated=tokenHash('rotated-grant-approval-session');
  expect(await store.switchSessionContext(approvedHash,rotated,ids.tenant,'next-csrf')).not.toBeNull();
  expect((await issue(rotated,randomUUID())).rows).toHaveLength(1);
  await expect(issue(approvedHash,randomUUID())).rejects.toMatchObject({code:'42501'});
 });

 it('rolls back a Grant and management receipt if its verified Audit cannot be inserted',async()=>{
  await registerApprovedIdentity();
  const id=randomUUID();
  await db.admin.query(`alter table factact.audit_events add constraint deny_grant_management_audit
   check (event_type <> 'SCOPED_GRANT_MANAGEMENT_ISSUE_APPROVED') not valid`);
  try {
   await expect(issue(approvedHash,id)).rejects.toThrow();
   expect((await grant(id)).rowCount).toBe(0);
   expect((await audit(id)).rowCount).toBe(0);
   expect((await db.admin.query('select 1 from factact_private.scoped_grant_management_requests where request_id=$1',[id])).rowCount).toBe(0);
  } finally {
   await db.admin.query('alter table factact.audit_events drop constraint deny_grant_management_audit');
  }
 });

 it('does not expose the private approver allowlist or direct Grant DML to runtime',async()=>{
  await registerApprovedIdentity();
  await expect(db.runtime.query('select * from factact_private.scoped_grant_approvers')).rejects.toMatchObject({code:'42501'});
  await expect(db.runtime.query('delete from factact.scoped_actor_grants')).rejects.toMatchObject({code:'42501'});
 });
});
