/** Read-only Registry Migration/owner Gate. No DDL or business mutations. */
import {pathToFileURL} from 'node:url';
import {Pool, type QueryResult} from 'pg';

export interface RegistryPreflightQuery {
  query(sql:string):Promise<QueryResult<RegistryPreflightRow>>;
}

interface RegistryPreflightRow {
  database_name:string;actor_name:string;server_version:number;
  may_create_role:boolean;actor_schema_create:boolean;
  actor_function_owner_count:number;actor_table_owner_count:number;
  executor_exists:boolean;executor_no_login_safe:boolean;
  executor_function_owner_count:number;executor_member_count:number;
  executor_business_table_owner_count:number;executor_schema_create:boolean;
  force_rls_count:number;executor_rls_policy_count:number;
  executor_name_update:boolean;executor_org_update:boolean;executor_grant_write:boolean;
  runtime_name_update:boolean;runtime_source_insert:boolean;
  runtime_private_helper:boolean;runtime_rpc_count:number;
  return_rpc_exists:boolean;return_rpc_executor_owned:boolean;
}

export type RegistryPreflightPhase='BEFORE_MIGRATION'|'INSTALLED'|'RETURN_INSTALLED'|'INCONSISTENT';
export interface RegistryPreflightResult {
  phase:RegistryPreflightPhase;go:boolean;
  database:string;actor:string;serverVersion:number;
  checks:Record<string,boolean>;
}

const SQL=`
with migration_actor as (
 select rolname,rolsuper,rolcreaterole from pg_roles where rolname=current_user
), executor as (
 select oid,not rolcanlogin and not rolsuper and not rolbypassrls
   and not rolcreaterole and not rolcreatedb and not rolinherit as safe
 from pg_roles where rolname='factact_registry_executor'
), target_functions as (
 select p.proowner from pg_proc p where p.oid=any(array[
  'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure,
  'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)'::regprocedure,
  'factact.registry_verify_display_name(uuid,uuid,uuid,text)'::regprocedure,
  'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure,
  to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)')
 ])
), target_tables as (
 select unnest(array['tenants','operators','organizations','people','services',
  'contract_profiles','service_recipients','scoped_actor_grants',
  'registry_edit_requests','changes','evidence','change_evidence','audit_events']) as name
), tables as (
 select t.name,c.relowner,c.relrowsecurity,c.relforcerowsecurity
 from target_tables t
 left join pg_class c on c.oid=to_regclass('factact.'||t.name)
)
select current_database() as database_name,current_user as actor_name,
 current_setting('server_version_num')::integer as server_version,
 (select rolsuper or rolcreaterole from migration_actor) as may_create_role,
 (has_schema_privilege(current_user,'factact','CREATE')
  and has_schema_privilege(current_user,'factact_private','CREATE')) as actor_schema_create,
 (select count(*)::integer from target_functions f
  where f.proowner=current_user::regrole) as actor_function_owner_count,
 (select count(*)::integer from tables t
  where t.relowner is not null and (t.relowner=current_user::regrole
   or (select rolsuper from migration_actor))) as actor_table_owner_count,
 exists(select 1 from executor) as executor_exists,
 coalesce((select safe from executor),false) as executor_no_login_safe,
 (select count(*)::integer from target_functions f
  where f.proowner=(select oid from executor)) as executor_function_owner_count,
 (select count(*)::integer from pg_auth_members m
  where m.roleid=(select oid from executor)
   or m.member=(select oid from executor)) as executor_member_count,
 (select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('factact','factact_private')
   and c.relowner=(select oid from executor)) as executor_business_table_owner_count,
 (case when exists(select 1 from executor) then
  has_schema_privilege('factact_registry_executor','factact','CREATE') or
  has_schema_privilege('factact_registry_executor','factact_private','CREATE')
  else false end) as executor_schema_create,
 (select count(*)::integer from tables t
  where t.relrowsecurity and t.relforcerowsecurity) as force_rls_count,
 (select count(*)::integer from pg_policies p join target_tables t
  on t.name=p.tablename where p.schemaname='factact'
   and p.policyname='registry_executor_tenant') as executor_rls_policy_count,
 (case when exists(select 1 from executor) then
  has_column_privilege('factact_registry_executor','factact.people','display_name','UPDATE')
  else false end) as executor_name_update,
 (case when exists(select 1 from executor) then
  has_column_privilege('factact_registry_executor','factact.people','organization_id','UPDATE')
  else false end) as executor_org_update,
 (case when exists(select 1 from executor) then
  has_table_privilege('factact_registry_executor','factact.scoped_actor_grants','UPDATE')
    or has_table_privilege('factact_registry_executor','factact.scoped_actor_grants','INSERT')
  else false end) as executor_grant_write,
 has_column_privilege('factact_runtime','factact.people','display_name','UPDATE')
  as runtime_name_update,
 has_table_privilege('factact_runtime','factact.registry_edit_requests','INSERT')
  as runtime_source_insert,
 (has_function_privilege('factact_runtime',
   'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE')
  or has_function_privilege('factact_runtime',
   'factact_private.registry_person_context_lock(uuid,uuid,uuid,uuid,uuid)','EXECUTE'))
  as runtime_private_helper,
 (to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)') is not null)
  as return_rpc_exists,
 coalesce((select p.proowner=(select oid from executor) from pg_proc p
  where p.oid=to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)')),
   false) as return_rpc_executor_owned,
 (select count(*)::integer from unnest(array[
  'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)',
  'factact.registry_verify_display_name(uuid,uuid,uuid,text)',
  'factact.registry_commit_display_name(uuid,uuid,uuid)',
  'factact.registry_return_display_name(uuid,uuid,uuid,text)']) as f(signature)
  where to_regprocedure(f.signature) is not null
    and has_function_privilege('factact_runtime',to_regprocedure(f.signature),'EXECUTE'))
  as runtime_rpc_count
`;

/** One SELECT only. Can run with a read-only transaction/DB credential. */
export async function readRegistryPreflight(db:RegistryPreflightQuery):Promise<RegistryPreflightResult>{
  const {rows}=await db.query(SQL);const r=rows[0];
  if(!r)throw Error('REGISTRY_PREFLIGHT_UNAVAILABLE');
  const expectedRpcCount=r.return_rpc_exists?4:3;
  const expectedFunctionCount=r.return_rpc_exists?5:4;
  const common=r.server_version>=160000 && r.force_rls_count===13
    && !r.runtime_name_update && !r.runtime_source_insert
    && !r.runtime_private_helper && r.runtime_rpc_count===expectedRpcCount;
  const before=!r.executor_exists && !r.return_rpc_exists && r.may_create_role
    && r.actor_schema_create && r.actor_function_owner_count===4
    && r.actor_table_owner_count===13;
  const installed=r.executor_exists && r.executor_no_login_safe
    && r.executor_function_owner_count===expectedFunctionCount
    && (!r.return_rpc_exists || r.return_rpc_executor_owned)
    && r.executor_member_count===0
    && r.executor_business_table_owner_count===0 && !r.executor_schema_create
    && r.executor_rls_policy_count===13 && r.executor_name_update
    && !r.executor_org_update && !r.executor_grant_write;
  const phase:RegistryPreflightPhase=before?'BEFORE_MIGRATION':
    installed?(r.return_rpc_exists?'RETURN_INSTALLED':'INSTALLED'):'INCONSISTENT';
  return {phase,go:common&&(before||installed),database:r.database_name,
    actor:r.actor_name,serverVersion:r.server_version,
    checks:{postgres16Plus:r.server_version>=160000,forcedTenantRls:r.force_rls_count===13,
      runtimeNoNameUpdate:!r.runtime_name_update,runtimeNoSourceInsert:!r.runtime_source_insert,
      runtimeNoPrivateHelper:!r.runtime_private_helper,
      runtimeExpectedRpcs:r.runtime_rpc_count===expectedRpcCount,
      returnRpcInstalled:r.return_rpc_exists && r.return_rpc_executor_owned,
      migratorRoleCreation:r.may_create_role,
      migratorOwnsBaseFunctions:r.actor_function_owner_count===4,
      migratorOwnsTables:r.actor_table_owner_count===13,
      migratorSchemaCreate:r.actor_schema_create,
      executorNoLoginBypass:r.executor_no_login_safe,
      executorOwnsTargetFunctions:r.executor_function_owner_count===expectedFunctionCount,
      executorNoMembership:r.executor_member_count===0,
      executorNoBusinessTables:r.executor_business_table_owner_count===0,
      executorNoSchemaCreate:!r.executor_schema_create,
      executorThirteenRlsPolicies:r.executor_rls_policy_count===13,
      executorOnlyNameNotOrganization:r.executor_name_update&&!r.executor_org_update,
      executorNoGrantMutation:!r.executor_grant_write},
  };
}

async function main():Promise<void>{
  const url=process.env.FACTACT_MIGRATION_DATABASE_URL;
  if(!url){process.stderr.write('FACTACT_MIGRATION_DATABASE_URL is required.\n');process.exitCode=2;return;}
  const ssl=process.env.FACTACT_MIGRATION_DB_SSL==='true';
  const pool=new Pool({connectionString:url,ssl:ssl?{rejectUnauthorized:true}:false,
    connectionTimeoutMillis:5000,statement_timeout:5000,max:1,
    application_name:'factact-registry-migrator-preflight'});
  try{
    const result=await readRegistryPreflight(pool);
    // Neither credentials nor connection URL are emitted.
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(!result.go)process.exitCode=1;
  }catch(error){
    const code=(error as {code?:string}).code;
    process.stderr.write('Registry preflight unavailable: '+(code??'UNKNOWN')+'\n');
    process.exitCode=2;
  }finally{await pool.end();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  await main();
}
