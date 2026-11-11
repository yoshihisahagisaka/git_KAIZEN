import {readFile} from 'node:fs/promises';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {readRegistryPreflight} from '../../scripts/registry-migration-preflight.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';

let db:Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{await db.reset();},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry migration preflight / fail-closed disablement',()=>{
  it('reports exact owner, ADMIN-only maintenance and 31 FORCE RLS tables using SELECT only',async()=>{
    const before=await db.admin.query(`select count(*)::integer as n from factact.audit_events`);
    const result=await readRegistryPreflight(db.admin);
    expect(result).toMatchObject({phase:'RETURN_INSTALLED',go:true,
      checks:{postgres16Plus:true,forcedTenantRls:true,runtimeNoNameUpdate:true,
        runtimeNoPrivateHelper:true,runtimeExpectedRpcs:true,returnRpcInstalled:true,
        executorNoLoginBypass:true,executorOwnsTargetFunctions:true,
        executorExactAdminOnly:true,runtimeNoExecutorMembership:true,
        executorNoBusinessTables:true,
        executorNoSchemaCreate:true,executorThirteenRlsPolicies:true,
        executorOnlyNameNotOrganization:true,executorNoGrantMutation:true}});
    const after=await db.admin.query(`select count(*)::integer as n from factact.audit_events`);
    expect(after.rows).toEqual(before.rows);
  });

  it('fails closed if the executor suddenly gains LOGIN or loses an RLS policy',async()=>{
    const client=await db.admin.connect();
    try{
      await client.query('BEGIN');
      await client.query('alter role factact_registry_executor login');
      let result=await readRegistryPreflight(client);
      expect(result.phase).toBe('INCONSISTENT');expect(result.go).toBe(false);
      await client.query('alter role factact_registry_executor nologin');
      await client.query('drop policy registry_executor_tenant on factact.people');
      result=await readRegistryPreflight(client);
      expect(result.phase).toBe('INCONSISTENT');expect(result.go).toBe(false);
    }finally{
      await client.query('ROLLBACK');client.release();
    }
    expect((await readRegistryPreflight(db.admin)).go).toBe(true);
  });

  it('disables all four Registry RPCs, preserves Person and restores ADMIN-only',async()=>{
    const sql=await readFile('scripts/registry-disable-execution.sql','utf8');
    await db.admin.query(sql);
    const result=await readRegistryPreflight(db.admin);
    expect(result.go).toBe(false);
    expect(result.checks.runtimeExpectedRpcs).toBe(false);
    expect((await db.admin.query(`select has_function_privilege('factact_runtime',
      'factact.registry_return_display_name(uuid,uuid,uuid,text)','EXECUTE') as enabled`))
      .rows[0].enabled).toBe(false);
    const command=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
    await expect(command.proposeDisplayName({tenantId:ids.tenant,actorOperatorId:ids.operator},
      {serviceId:ids.service,personId:ids.person,requestId:'90000000-0000-4000-8000-000000000001',
       requestKey:'90000000-0000-4000-8000-000000000002',proposedDisplayName:'田中 太郎',
       reason:'Synthetic disabled path',expectedRegistryRevision:0}))
      .rejects.toMatchObject({code:'42501'});
    const person=await db.admin.query('select display_name,registry_revision from factact.people where id=$1',[ids.person]);
    expect(person.rows).toEqual([{display_name:'田中 一郎',registry_revision:'0'}]);
    const memberships=await db.admin.query(`select count(*)::integer as n from pg_auth_members m
      where m.roleid='factact_registry_executor'::regrole`);
    expect(memberships.rows).toEqual([{n:1}]);
  });
});
