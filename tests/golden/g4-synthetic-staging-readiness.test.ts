import {readFile} from 'node:fs/promises';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {ids,loadSyntheticSeedWithRls,testDatabase} from '../fixtures/database.js';

describe('G4 synthetic seed under FORCE RLS',()=>{
  let db:Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async()=>{
    db=await testDatabase({migrationAsNonSuperuser:true,seedAsNonSuperuserWithRls:true});
  },60_000);
  afterAll(async()=>{await db?.close();},60_000);

  it('loads prerequisites as the non-superuser Migration principal without disabling RLS',async()=>{
    expect((await db.migrator.query(`select current_user,(select rolsuper from pg_roles
      where rolname=current_user) as super,current_setting('row_security') as row_security,
      current_setting('factact.tenant_id',true) as tenant_after_commit`)).rows).toEqual([{
        current_user:'factact_migrator',super:false,row_security:'on',tenant_after_commit:'',
      }]);
    expect((await db.admin.query(`select count(*)::integer as total,
      count(*) filter(where relrowsecurity and relforcerowsecurity)::integer as protected
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='factact' and c.relkind='r'`)).rows)
      .toEqual([{total:31,protected:31}]);
    expect((await db.admin.query(`select
      (select count(*)::integer from factact.tenants) as tenants,
      (select count(*)::integer from factact.people) as people,
      (select count(*)::integer from factact.services) as services,
      (select count(*)::integer from factact.contract_profiles) as contracts`)).rows)
      .toEqual([{tenants:1,people:1,services:1,contracts:1}]);
    expect((await db.admin.query(`select count(*)::integer as n from pg_policies
      where policyname='g4_synthetic_seed_migration_principal'`)).rows).toEqual([{n:0}]);
  });

  it('seeds prerequisites only and does not fabricate operational outcomes',async()=>{
    expect((await db.admin.query(`select
      (select count(*)::integer from factact.join_events) as events,
      (select count(*)::integer from factact.work) as work,
      (select count(*)::integer from factact.changes) as changes,
      (select count(*)::integer from factact.relations) as relations,
      (select count(*)::integer from factact.audit_events) as audit`)).rows)
      .toEqual([{events:0,work:0,changes:0,relations:0,audit:0}]);
  });

  it('rejects a foreign Tenant write and leaves no partial row',async()=>{
    const foreignTenant='10000000-0000-4000-8000-000000000099';
    const client=await db.migrator.connect();
    try{
      await client.query('begin');
      await client.query(`select set_config('factact.tenant_id',$1,true)`,[ids.tenant]);
      await expect(client.query(`insert into factact.tenants(id,name,status)
        values($1,'Foreign synthetic tenant','ACTIVE')`,[foreignTenant]))
        .rejects.toMatchObject({code:'42501'});
      await client.query('rollback');
    }finally{client.release();}
    expect((await db.admin.query('select count(*)::integer as n from factact.tenants where id=$1',
      [foreignTenant])).rows).toEqual([{n:0}]);
  });

  it('keeps Runtime separate from seed and maintenance authority',async()=>{
    await expect(db.runtime.query(`insert into factact.tenants(id,name,status)
      values('10000000-0000-4000-8000-000000000098','Runtime forged','ACTIVE')`))
      .rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query(`select count(*)::integer as n from pg_auth_members
      where roleid='factact_registry_executor'::regrole
        and member='factact_runtime'::regrole`)).rows).toEqual([{n:0}]);
  });

  it('rolls back seed rows and temporary policies on an injected failure',async()=>{
    const isolated=await testDatabase({migrationAsNonSuperuser:true,skipSeed:true});
    try{
      const seed=await readFile('supabase/seed.sql','utf8');
      await expect(loadSyntheticSeedWithRls(isolated.migrator,seed,true))
        .rejects.toMatchObject({code:'22012'});
      expect((await isolated.admin.query(`select
        (select count(*)::integer from factact.tenants) as tenants,
        (select count(*)::integer from pg_policies
          where policyname='g4_synthetic_seed_migration_principal') as policies`)).rows)
        .toEqual([{tenants:0,policies:0}]);
    }finally{await isolated.close();}
  },60_000);
});
