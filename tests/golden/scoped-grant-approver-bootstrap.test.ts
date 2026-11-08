import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {provisionLocalGrantApprover} from '../../scripts/scoped-grant-approver-bootstrap.js';

const issuer='https://accounts.google.com';
const subject='verified-bootstrap-subject';
const now=Date.parse('2026-11-08T10:00:00Z');
const proof={issuer,subject,verifiedEmail:'yoshihisa.hagisaka@atlib.jp',verifiedAt:new Date(now).toISOString()};
let db:Awaited<ReturnType<typeof testDatabase>>;
const provision=(input:unknown=proof)=>provisionLocalGrantApprover(db.admin,input,ids.tenant,ids.operator,now);
const records=()=>db.admin.query('select issuer,subject,status from factact_private.scoped_grant_approvers');

beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{
  await db.reset();
  await db.admin.query('delete from factact_private.scoped_grant_approvers');
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('local verified single-approver bootstrap (synthetic only)',()=>{
  it('refuses unbound identity, creating no approval or Audit',async()=>{
    await expect(provision()).rejects.toThrow('explicitly bound');
    expect((await records()).rowCount).toBe(0);
    expect((await db.admin.query("select 1 from factact.audit_events where event_type='SCOPED_GRANT_APPROVER_BOOTSTRAPPED'")).rowCount).toBe(0);
  });
  it('provisions once against active explicit membership with an Audit, then safely no-ops',async()=>{
    await db.admin.query(`insert into factact_private.operator_identities
      (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
      [issuer,subject,ids.tenant,ids.operator]);
    expect(await provision()).toBe('CREATED');
    expect(await provision()).toBe('EXISTS');
    expect((await records()).rows).toEqual([{issuer,subject,status:'ACTIVE'}]);
    expect((await db.admin.query("select 1 from factact.audit_events where event_type='SCOPED_GRANT_APPROVER_BOOTSTRAPPED'")).rowCount).toBe(1);
  });
  it('never replaces a different active/revoked approver or accepts stale proof',async()=>{
    await db.admin.query(`insert into factact_private.operator_identities
      (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
      [issuer,subject,ids.tenant,ids.operator]);
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,'another-previous-subject',$2)`,
      [issuer,proof.verifiedEmail]);
    await expect(provision()).rejects.toThrow('review');
    await db.admin.query("update factact_private.scoped_grant_approvers set status='REVOKED',revoked_at=now()");
    await expect(provision()).rejects.toThrow('review');
    await expect(provision({...proof,verifiedAt:new Date(now-700_000).toISOString()})).rejects.toThrow('Fresh');
    expect((await records()).rowCount).toBe(1);
  });
});
