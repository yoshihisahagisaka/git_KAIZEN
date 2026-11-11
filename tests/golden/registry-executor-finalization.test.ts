import {readFile} from 'node:fs/promises';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';

const finalization='20261110001100_registry_executor_finalization.sql';
const signatures=[
  'factact.registry_commit_display_name(uuid,uuid,uuid)',
  'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)',
  'factact.registry_return_display_name(uuid,uuid,uuid,text)',
  'factact.registry_verify_display_name(uuid,uuid,uuid,text)',
  'factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid)',
  'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)',
  'factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)',
];

describe('G3 A2 Registry Executor atomic Finalization',()=>{
  let db:Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async()=>{db=await testDatabase({migrationAsNonSuperuser:true});},60_000);
  afterAll(async()=>{await db?.close();},60_000);

  it('migrates as non-superuser and leaves the exact fail-closed boundary',async()=>{
    expect((await db.admin.query(`select rolsuper,rolcreaterole,rolbypassrls
      from pg_roles where rolname='factact_migrator'`)).rows)
      .toEqual([{rolsuper:false,rolcreaterole:true,rolbypassrls:false}]);
    expect((await db.admin.query(`select rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,
      rolreplication,rolbypassrls,rolinherit from pg_roles
      where rolname='factact_registry_executor'`)).rows).toEqual([{
        rolcanlogin:false,rolsuper:false,rolcreaterole:false,rolcreatedb:false,
        rolreplication:false,rolbypassrls:false,rolinherit:false,
      }]);
    expect((await db.admin.query(`select member::regrole::text as member,
      grantor::regrole::text as grantor,admin_option,set_option,inherit_option,
      (select rolsuper from pg_roles where oid=grantor) as grantor_super
      from pg_auth_members where roleid='factact_registry_executor'::regrole`)).rows)
      .toEqual([{member:'factact_migrator',grantor:'postgres',admin_option:true,
        set_option:false,inherit_option:false,grantor_super:true}]);
    expect((await db.admin.query(`select
      has_schema_privilege('factact_registry_executor','factact','CREATE') as factact_create,
      has_schema_privilege('factact_registry_executor','factact_private','CREATE') as private_create`)).rows)
      .toEqual([{factact_create:false,private_create:false}]);
    expect((await db.admin.query(`select p.oid::regprocedure::text as signature
      from pg_proc p where p.proowner='factact_registry_executor'::regrole order by signature`)).rows)
      .toEqual(signatures.map(signature=>({signature})));
    expect((await db.admin.query(`select count(*)::integer as total,
      count(*) filter(where relrowsecurity)::integer as enabled,
      count(*) filter(where relforcerowsecurity)::integer as forced
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='factact' and c.relkind='r'`)).rows)
      .toEqual([{total:31,enabled:31,forced:31}]);

    await expect(db.runtime.query(`update factact.people set display_name='forbidden'
      where id=$1`,[ids.person])).rejects.toMatchObject({code:'42501'});
    await expect(db.runtime.query(`select factact_private.registry_edit_authorized(
      $1,$2,$3,$4,$5,'UPDATE')`,[ids.tenant,ids.operator,ids.service,ids.contract,ids.person]))
      .rejects.toMatchObject({code:'42501'});

    const tenant='10000000-0000-4000-8000-000000000099';
    const organization='30000000-0000-4000-8000-000000000099';
    const person='40000000-0000-4000-8000-000000000099';
    await db.admin.query(`insert into factact.tenants(id,name,status) values($1,'Other','ACTIVE')`,[tenant]);
    await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
      values($1,$2,'Other Org','ACTIVE')`,[organization,tenant]);
    await db.admin.query(`insert into factact.people(id,tenant_id,organization_id,display_name,lifecycle_status)
      values($1,$2,$3,'Other Person','ACTIVE')`,[person,tenant,organization]);
    const client=await db.runtime.connect();
    try{
      await client.query('begin');
      await client.query(`select set_config('factact.tenant_id',$1,true)`,[ids.tenant]);
      expect((await client.query(`select count(*)::integer as n from factact.people where id=$1`,[person])).rows)
        .toEqual([{n:0}]);
      await client.query('rollback');
    }finally{client.release();}
  });

  it('rolls back every role, membership, owner, ACL and policy on injected failure',async()=>{
    const partial=await testDatabase({stopBeforeMigration:finalization,skipSeed:true,
      migrationAsNonSuperuser:true});
    try{
      const original=await readFile(`supabase/migrations/${finalization}`,'utf8');
      const injected=original.replace(/\r?\ncommit;\s*$/u,'\nselect 1/0;\ncommit;\n');
      expect(injected).not.toBe(original);
      await expect(partial.migrator.query(injected)).rejects.toMatchObject({code:'22012'});
      await partial.migrator.query('rollback');
      expect((await partial.admin.query(`select rolname from pg_roles where
        rolname='factact_registry_executor'`)).rows).toEqual([]);
      expect((await partial.admin.query(`select count(*)::integer as n from pg_auth_members m
        join pg_roles r on r.oid=m.roleid
        where r.rolname like 'factact_registry_executor%'`)).rows).toEqual([{n:0}]);
      expect((await partial.admin.query(`select count(*)::integer as n from pg_proc p
        where p.oid in (select to_regprocedure(x) from unnest($1::text[]) x)
          and p.proowner='factact_migrator'::regrole`,[signatures])).rows)
        .toEqual([{n:7}]);
      expect((await partial.admin.query(`select count(*)::integer as n from pg_policies
        where policyname='registry_executor_tenant'`)).rows).toEqual([{n:0}]);
    }finally{await partial.close();}
  },60_000);

  it('updates an Executor-owned function with temporary SET and restores ADMIN-only',async()=>{
    const definition=(await db.migrator.query(`select pg_get_functiondef(
      'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure) as sql`)).rows[0]?.sql;
    expect(definition).toBeTypeOf('string');
    await db.migrator.query('begin');
    try{
      await db.migrator.query(`grant create on schema factact,factact_private
        to factact_registry_executor`);
      await db.migrator.query(`grant factact_registry_executor to current_user
        with set true, inherit false`);
      await db.migrator.query('set local role factact_registry_executor');
      await db.migrator.query(definition as string);
      await db.migrator.query('reset role');
      await db.migrator.query(`revoke create on schema factact,factact_private
        from factact_registry_executor`);
      await db.migrator.query(`revoke factact_registry_executor from current_user
        granted by current_user`);
      await db.migrator.query('commit');
    }catch(error){await db.migrator.query('rollback');throw error;}
    expect((await db.admin.query(`select admin_option,set_option,inherit_option
      from pg_auth_members where roleid='factact_registry_executor'::regrole`)).rows)
      .toEqual([{admin_option:true,set_option:false,inherit_option:false}]);
    expect((await db.admin.query(`select
      has_schema_privilege('factact_registry_executor','factact','CREATE') as factact_create,
      has_schema_privilege('factact_registry_executor','factact_private','CREATE') as private_create`)).rows)
      .toEqual([{factact_create:false,private_create:false}]);
  });

  it('runs fail-closed disablement and restores ADMIN-only maintenance state',async()=>{
    const isolated=await testDatabase({migrationAsNonSuperuser:true,skipSeed:true});
    try{
      const sql=await readFile('scripts/registry-disable-execution.sql','utf8');
      await isolated.migrator.query(sql);
      expect((await isolated.admin.query(`select admin_option,set_option,inherit_option
        from pg_auth_members where roleid='factact_registry_executor'::regrole`)).rows)
        .toEqual([{admin_option:true,set_option:false,inherit_option:false}]);
      expect((await isolated.admin.query(`select has_function_privilege('factact_runtime',
        'factact.registry_commit_display_name(uuid,uuid,uuid)','EXECUTE') as allowed`)).rows)
        .toEqual([{allowed:false}]);
    }finally{await isolated.close();}
  });
});
