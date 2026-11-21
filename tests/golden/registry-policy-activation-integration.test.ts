import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';

const issuer='https://accounts.google.com';
const subject='synthetic-activation-verified-administrator';
const adminHash=tokenHash('synthetic-activation-approved-session');
const reviewer='20000000-0000-4000-8000-000000000002';
const proposerContext={tenantId:ids.tenant,actorOperatorId:ids.operator};
const reviewerContext={tenantId:ids.tenant,actorOperatorId:reviewer};
const cells={NEWCOMER:'DENY',STANDARD:'REQUEST',LEAD:'REQUEST'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let commands:RegistryEditCommands;
let recipient:string;
let proposerGrant:string;

const input=(revision=0,name='田中 次郎')=>({serviceId:ids.service,personId:ids.person,
 requestId:randomUUID(),requestKey:randomUUID(),proposedDisplayName:name,
 reason:'Synthetic Staging表示名訂正',expectedRegistryRevision:revision});
const grant=async(actor:string,operations:string[],customer=recipient)=>{
 const id=randomUUID();
 await db.admin.query(`insert into factact.scoped_actor_grants
  (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
   service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
  values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,'ACTIVE',
   now()-interval '1 day',$8)`,
  [id,ids.tenant,actor,ids.service,ids.contract,customer,operations,ids.operator]);
 return id;
};
const assign=async(level:string|null='STANDARD')=>db.runtime.query(`
 select factact_private.operator_policy_assign_level($1,$2,$3,$4,$5,$6)`,
 [adminHash,randomUUID(),ids.service,ids.operator,level,'Synthetic Staging level assignment']);
const createVersion=async(values:unknown=cells)=>{
 const versionId=randomUUID();
 await db.runtime.query(`select factact_private.operator_policy_create_version(
  $1,$2,$3,$4::jsonb,$5)`,
  [adminHash,versionId,ids.service,JSON.stringify(values),'Staging policy snapshot']);
 return versionId;
};
const publish=async(versionId:string|null)=>{
 const publicationId=randomUUID();
 await db.runtime.query(`select factact_private.operator_policy_publish($1,$2,$3,$4,$5)`,
  [adminHash,publicationId,ids.service,versionId,'Staging snapshot publication']);
 return publicationId;
};
const activation=async(versionId:string|null,id=randomUUID())=>{
 await db.runtime.query(`select factact_private.operator_policy_set_activation(
  $1,$2,$3,$4,$5)`,[adminHash,id,ids.service,versionId,
   versionId?'Staging Synthetic activation':'Staging Synthetic stop']);
 return id;
};
const verifyAndCommit=async(changeId:string)=>{
 await commands.verifyDisplayName(reviewerContext,changeId,'別の担当者が本人情報と原本を照合');
 await commands.commitDisplayName(reviewerContext,changeId);
};
const auditMode=async(changeId:string)=>{
 const result=await db.admin.query<{metadata_json:Record<string,string>}>(`
  select metadata_json from factact.audit_events where aggregate_id=$1
    and event_type='CHANGE_PROPOSED'`,[changeId]);
 return result.rows[0]!.metadata_json;
};

beforeAll(async()=>{
 db=await testDatabase();
 commands=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('delete from factact_private.scoped_grant_approvers');
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,'synthetic-activation-reviewer@example.invalid','Synthetic reviewer','ACTIVE')`,
  [reviewer,ids.tenant]);
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,ids.operator]);
 const identity=new PgIdentityStore(db.runtime,db.oidc);
 await identity.createVerifiedSession(adminHash,
  {tenantId:ids.tenant,operatorId:ids.operator},'staging-policy-csrf',{issuer,subject});
 await db.admin.query(`insert into factact_private.scoped_grant_approvers
  (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
  [issuer,subject]);
 recipient=await withTenant(db.runtime,ids.tenant,client=>
  new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
   randomUUID(),ids.service,ids.organization));
 proposerGrant=await grant(ids.operator,['UPDATE']);
 await grant(reviewer,['REVIEW','APPROVE']);
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry per-Service activation: Synthetic Staging transition',()=>{
 it('keeps legacy pending, requires policy for new requests, and STOP cannot reopen legacy',async()=>{
  // No activation event: the prior approved path remains unchanged.
  const before=input(0,'田中 旧申請');
  const legacy=await commands.proposeDisplayName(proposerContext,before);
  expect((await auditMode(legacy.changeId)).policyMode).toBe('LEGACY_GRANT_ONLY');
  const version=await createVersion();
  await publish(version);
  const startId=await activation(version);
  // Old pending Change was created without policy; an activation must not
  // strand its separately granted reviewer or change the original source.
  await verifyAndCommit(legacy.changeId);
  expect((await db.admin.query('select display_name from factact.people where id=$1',
   [ids.person])).rows[0].display_name).toBe('田中 旧申請');
  await expect(commands.proposeDisplayName(proposerContext,input(1)))
   .rejects.toMatchObject({code:'42501'}); // No assigned level.
  await assign('STANDARD');
  const later=input(1,'田中 新申請');
  const active=await commands.proposeDisplayName(proposerContext,later);
  expect(await auditMode(active.changeId)).toMatchObject({
   policyMode:'POLICY_REQUEST',activationEventId:startId,policyVersionId:version,
  });
  await activation(null);
  await expect(commands.proposeDisplayName(proposerContext,input(1,'田中 停止後')))
   .rejects.toMatchObject({code:'42501'});
  // Exact replay of the already persisted proposal remains idempotent.
  expect((await commands.proposeDisplayName(proposerContext,later)).changeId)
   .toBe(active.changeId);
  await verifyAndCommit(active.changeId);
  expect((await db.admin.query(`select display_name,registry_revision
    from factact.people where id=$1`,[ids.person])).rows[0]).toEqual({
     display_name:'田中 新申請',registry_revision:'2',
    });
  await expect(commands.proposeDisplayName(proposerContext,input(2,'田中 未再開')))
   .rejects.toMatchObject({code:'42501'});
  await activation(version);
  const resumed=await commands.proposeDisplayName(proposerContext,input(2,'田中 再開'));
  expect((await auditMode(resumed.changeId)).policyMode).toBe('POLICY_REQUEST');
 });

 it('pins exact publication event; republishing same version cannot silently switch policy',async()=>{
  const version=await createVersion();
  await assign();
  await publish(version);
  await activation(version);
  const first=await commands.proposeDisplayName(proposerContext,input());
  expect((await auditMode(first.changeId)).policyMode).toBe('POLICY_REQUEST');
  // Publishing the SAME version is still a new policy event, not activation.
  await publish(version);
  await expect(commands.proposeDisplayName(proposerContext,input(0,'田中 未再適用')))
   .rejects.toMatchObject({code:'42501'});
  await activation(version);
  const second=await commands.proposeDisplayName(proposerContext,input(0,'田中 再適用'));
  expect((await auditMode(second.changeId)).activationEventId)
   .not.toBe((await auditMode(first.changeId)).activationEventId);
  await publish(null);
  await expect(commands.proposeDisplayName(proposerContext,input(0,'田中 公開停止')))
   .rejects.toMatchObject({code:'42501'});
  await expect(activation(version)).rejects.toMatchObject({code:'42501'});
 });

 it('denies non-request level, revoked exact Grant and another customer even when active',async()=>{
  const version=await createVersion();
  await publish(version);
  await activation(version);
  await assign('NEWCOMER');
  await expect(commands.proposeDisplayName(proposerContext,input()))
   .rejects.toMatchObject({code:'42501'});
  await assign('STANDARD');
  const orgB=randomUUID(),personB=randomUUID();
  await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
   values($1,$2,'Synthetic Customer B','ACTIVE')`,[orgB,ids.tenant]);
  await db.admin.query(`insert into factact.people
   (id,tenant_id,organization_id,display_name,lifecycle_status)
   values($1,$2,$3,'Synthetic Person B','ACTIVE')`,[personB,ids.tenant,orgB]);
  await withTenant(db.runtime,ids.tenant,client=>
   new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(
    randomUUID(),ids.service,orgB));
  await expect(commands.proposeDisplayName(proposerContext,{
   ...input(),personId:personB,
  })).rejects.toMatchObject({code:'42501'});
  await db.admin.query(`update factact.scoped_actor_grants
   set status='REVOKED',effective_until=now(),revoked_at=now(),
    revoked_by_operator_id=$2,revocation_reason='Synthetic revocation'
   where id=$1`,[proposerGrant,ids.operator]);
  await expect(commands.proposeDisplayName(proposerContext,input()))
   .rejects.toMatchObject({code:'42501'});
  expect((await db.admin.query('select count(*)::int as n from factact.changes'))
   .rows[0].n).toBe(0);
 });
});
