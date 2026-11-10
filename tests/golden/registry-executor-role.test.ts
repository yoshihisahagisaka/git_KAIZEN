import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';

let db:Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async()=>{db=await testDatabase();},60_000);
beforeEach(async()=>{await db.reset();},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry privileged functions use a restricted NOLOGIN / FORCE RLS owner',()=>{
  it('owns exactly the four Registry RPC/helper functions without login or RLS bypass',async()=>{
    const {rows:roles}=await db.admin.query(`select rolcanlogin,rolsuper,rolbypassrls,
      rolcreaterole,rolcreatedb,rolinherit from pg_roles
      where rolname='factact_registry_executor'`);
    expect(roles).toEqual([{rolcanlogin:false,rolsuper:false,rolbypassrls:false,
      rolcreaterole:false,rolcreatedb:false,rolinherit:false}]);
    const {rows:owners}=await db.admin.query(`select p.proname,r.rolname as owner
      from pg_proc p join pg_roles r on r.oid=p.proowner
      where p.oid=any(array[
        'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure,
        'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)'::regprocedure,
        'factact.registry_verify_display_name(uuid,uuid,uuid,text)'::regprocedure,
        'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure
      ]) order by p.proname`);
    expect(owners).toHaveLength(4);
    expect(owners.every(row=>row.owner==='factact_registry_executor')).toBe(true);
    const {rows:members}=await db.admin.query(`select 1 from pg_auth_members m
      join pg_roles r on r.oid=m.roleid where r.rolname='factact_registry_executor'`);
    expect(members).toEqual([]);
    const {rows:schemas}=await db.admin.query(`select
      has_schema_privilege('factact_registry_executor','factact','CREATE') as factact_create,
      has_schema_privilege('factact_registry_executor','factact_private','CREATE') as private_create`);
    expect(schemas[0]).toEqual({factact_create:false,private_create:false});
  });

  it('has only the business field writes needed for Registry correction, never Grant mutation',async()=>{
    const {rows}=await db.admin.query(`select
      has_column_privilege('factact_registry_executor','factact.people','display_name','UPDATE') as name_update,
      has_column_privilege('factact_registry_executor','factact.people','registry_revision','UPDATE') as revision_update,
      has_column_privilege('factact_registry_executor','factact.people','organization_id','UPDATE') as organization_update,
      has_column_privilege('factact_registry_executor','factact.people','email','UPDATE') as email_update,
      has_table_privilege('factact_registry_executor','factact.scoped_actor_grants','INSERT') as grant_insert,
      has_table_privilege('factact_registry_executor','factact.scoped_actor_grants','UPDATE') as grant_update,
      has_table_privilege('factact_registry_executor','factact.registry_edit_requests','DELETE') as source_delete,
      has_function_privilege('factact_runtime',
        'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE') as runtime_private_helper,
      has_function_privilege('factact_runtime',
        'factact.registry_commit_display_name(uuid,uuid,uuid)','EXECUTE') as runtime_commit`);
    expect(rows[0]).toEqual({name_update:true,revision_update:true,organization_update:false,
      email_update:false,grant_insert:false,grant_update:false,source_delete:false,
      runtime_private_helper:false,runtime_commit:true});
  });

  it('enforces Tenant RLS when executing as the actual non-superuser function owner',async()=>{
    const client=await db.admin.connect();
    try{
      await client.query('BEGIN');
      await client.query('set local role factact_registry_executor');
      await client.query("select set_config('factact.tenant_id',$1,true)",[ids.tenant]);
      const own=await client.query('select id from factact.people where id=$1',[ids.person]);
      expect(own.rows).toEqual([{id:ids.person}]);
      await client.query("select set_config('factact.tenant_id',$1,true)",[
        '10000000-0000-4000-8000-000000000002',
      ]);
      const other=await client.query('select id from factact.people where id=$1',[ids.person]);
      expect(other.rows).toEqual([]);
      await client.query("select set_config('factact.tenant_id',$1,true)",[ids.tenant]);
      await expect(client.query(`update factact.people set organization_id=$1
        where id=$2`,[ids.organization,ids.person])).rejects.toMatchObject({code:'42501'});
    }finally{
      await client.query('ROLLBACK');client.release();
    }
  });
});
