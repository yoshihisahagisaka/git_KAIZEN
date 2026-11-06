import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {resolveActiveOperator} from '../../packages/application/src/operator-session.js';

const tenantB='10000000-0000-4000-8000-000000000002';
const operatorB='20000000-0000-4000-8000-000000000002';
const anotherOperatorB='20000000-0000-4000-8000-000000000003';
const identity={issuer:'https://accounts.google.com',subject:'verified-subject-fixture'};
let db:Awaited<ReturnType<typeof testDatabase>>,store:PgIdentityStore;

const membership=async(tenantId:string,operatorId:string,primary:boolean,subject=identity.subject)=>{
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default)
  values ($1,$2,$3,$4,$5)`,[identity.issuer,subject,tenantId,operatorId,primary]);
};
const revoke=async(tenantId:string)=>db.admin.query(`update factact_private.operator_identities
 set status='REVOKED',revoked_at=now(),revocation_reason='権限付与を解除済み'
 where issuer=$1 and subject=$2 and tenant_id=$3`,[identity.issuer,identity.subject,tenantId]);

beforeAll(async()=>{db=await testDatabase();store=new PgIdentityStore(db.runtime);},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('insert into factact.tenants(id,name,status) values($1,$2,$3)',[tenantB,'Second tenant','ACTIVE']);
 await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
  values($1,$2,$3,$4,'ACTIVE'),($5,$2,$6,$7,'ACTIVE')`,
  [operatorB,tenantB,'external@example.invalid','External actor',
   anotherOperatorB,'second@example.invalid','Another actor']);
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('explicit OIDC identity-to-Tenant contexts (no switch or domain authority yet)',()=>{
 it('preserves the existing single-Tenant identity and default login behavior',async()=>{
  const old={issuer:'https://seed.example.invalid',subject:'development-operator'};
  expect(await store.resolveIdentity(old)).toEqual({tenantId:ids.tenant,operatorId:ids.operator});
  expect(await store.verifiedIdentityContexts(old)).toEqual([
   {tenantId:ids.tenant,operatorId:ids.operator,isLoginDefault:true},
  ]);
  expect(await store.resolveIdentity({issuer:identity.issuer,subject:old.subject})).toBeNull();
 });
 it('one verified identity can have two explicit Tenant memberships and one login default',async()=>{
  await membership(ids.tenant,ids.operator,true);
  await membership(tenantB,operatorB,false);
  expect(await store.resolveIdentity(identity)).toEqual({tenantId:ids.tenant,operatorId:ids.operator});
  expect(await store.verifiedIdentityContexts(identity)).toEqual([
   {tenantId:ids.tenant,operatorId:ids.operator,isLoginDefault:true},
   {tenantId:tenantB,operatorId:operatorB,isLoginDefault:false},
  ]);
  // Candidate membership does not grant internal Role or access across Tenants.
  expect((await resolveActiveOperator(store,identity))?.tenantId).toBe(ids.tenant);
  expect((await withTenant(db.runtime,tenantB,c=>c.query('select role from factact.operator_roles where operator_id=$1',[operatorB]))).rows).toEqual([]);
  expect((await withTenant(db.runtime,tenantB,c=>c.query('select id from factact.people where tenant_id=$1',[ids.tenant]))).rowCount).toBe(0);
 });
 it('a second active login default is rejected instead of choosing the first row',async()=>{
  await membership(ids.tenant,ids.operator,true);
  await expect(membership(tenantB,operatorB,true)).rejects.toMatchObject({code:'23505'});
  await membership(tenantB,operatorB,false);
  await expect(db.admin.query(`update factact_private.operator_identities set is_login_default=true
   where issuer=$1 and subject=$2 and tenant_id=$3`,[identity.issuer,identity.subject,tenantB])).rejects.toMatchObject({code:'23505'});
  expect(await store.resolveIdentity(identity)).toEqual({tenantId:ids.tenant,operatorId:ids.operator});
 });
 it('revoked, inactive Operator and inactive Tenant memberships disappear immediately',async()=>{
  await membership(ids.tenant,ids.operator,true);
  await membership(tenantB,operatorB,false);
  await revoke(ids.tenant);
  expect(await store.resolveIdentity(identity)).toBeNull();
  expect(await store.verifiedIdentityContexts(identity)).toEqual([
   {tenantId:tenantB,operatorId:operatorB,isLoginDefault:false},
  ]);
  await db.admin.query("update factact.operators set status='INACTIVE' where id=$1",[operatorB]);
  expect(await store.verifiedIdentityContexts(identity)).toEqual([]);
  await db.admin.query("update factact.operators set status='ACTIVE' where id=$1",[operatorB]);
  await db.admin.query("update factact.tenants set status='INACTIVE' where id=$1",[tenantB]);
  expect(await store.verifiedIdentityContexts(identity)).toEqual([]);
 });
 it('does not infer an identity from email, employer, issuer mismatch or a different subject',async()=>{
  await membership(tenantB,operatorB,true);
  const other={issuer:identity.issuer,subject:randomUUID()};
  expect(await store.resolveIdentity(other)).toBeNull();
  expect(await store.verifiedIdentityContexts(other)).toEqual([]);
  expect(await store.verifiedIdentityContexts({issuer:'https://other.invalid',subject:identity.subject})).toEqual([]);
  expect(await store.verifiedIdentityContexts({issuer:identity.issuer,subject:'external@example.invalid'})).toEqual([]);
 });
 it('rejects duplicate identity-Tenant mapping and cross-Tenant Operator forgery by FK',async()=>{
  await membership(tenantB,operatorB,true);
  await expect(membership(tenantB,anotherOperatorB,false)).rejects.toMatchObject({code:'23505'});
  await expect(membership(ids.tenant,operatorB,false)).rejects.toMatchObject({code:'23503'});
  await expect(db.admin.query(`update factact_private.operator_identities
   set status='REVOKED',revocation_reason=null,revoked_at=now()
   where issuer=$1 and subject=$2 and tenant_id=$3`,[
   identity.issuer,identity.subject,tenantB,
  ])).rejects.toMatchObject({code:'23514'});
 });
 it('keeps memberships private: runtime cannot read or mutate tables directly',async()=>{
  await membership(tenantB,operatorB,true);
  for(const sql of [
   'select * from factact_private.operator_identities',
   `update factact_private.operator_identities set status='REVOKED'`,
   'delete from factact_private.operator_identities',
   `insert into factact_private.operator_identities(issuer,subject,tenant_id,operator_id) values('forged','forged',$1,$2)`,
  ]){
   await expect(withTenant(db.runtime,tenantB,c=>c.query(sql,[...(sql.includes('$1')?[tenantB,operatorB]:[])]))).rejects.toMatchObject({code:'42501'});
  }
  expect(await store.verifiedIdentityContexts(identity)).toHaveLength(1);
 });
});
