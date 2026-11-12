// Test-only native PostgreSQL. Never imported by production, Domain or Application.
import EmbeddedPostgres from 'embedded-postgres';
import { Pool } from 'pg';
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createServer } from 'node:net';

export async function freePort() {
  const server=createServer();
  await new Promise<void>((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
  const address=server.address();
  if(!address || typeof address==='string') throw new Error('No test port');
  await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));
  return address.port;
}
interface TestDatabaseOptions {
  stopBeforeMigration?: string;
  skipSeed?: boolean;
  migrationAsNonSuperuser?: boolean;
  seedAsNonSuperuserWithRls?: boolean;
}

const syntheticSeedTables=['tenants','operators','operator_roles','organizations','people',
  'devices','services','contract_profiles'];

export async function loadSyntheticSeedWithRls(migrator:Pool,seed:string,injectFailure=false){
  await migrator.query('begin');
  try{
    await migrator.query(`select set_config('factact.tenant_id',$1,true)`,[ids.tenant]);
    await migrator.query(`create policy g4_synthetic_seed_migration_principal
      on factact.tenants to factact_migrator
      using(id=factact.current_tenant_id()) with check(id=factact.current_tenant_id())`);
    for(const table of syntheticSeedTables.filter(table=>table!=='tenants'))
      await migrator.query(`create policy g4_synthetic_seed_migration_principal
        on factact.${table} to factact_migrator
        using(tenant_id=factact.current_tenant_id())
        with check(tenant_id=factact.current_tenant_id())`);
    await migrator.query(seed);
    if(injectFailure)await migrator.query('select 1/0');
    for(const table of syntheticSeedTables) await migrator.query(`drop policy
      g4_synthetic_seed_migration_principal on factact.${table}`);
    await migrator.query('commit');
  }catch(error){await migrator.query('rollback');throw error;}
}

export async function testDatabase(options:TestDatabaseOptions={}) {
  const directory=await mkdtemp(resolve('.factact-db-test-')), port=await freePort();
  // The fixture and its clients use TCP only. Disable Unix sockets so tests
  // also run in sandboxes where creating local socket files is restricted.
  const embedded=new EmbeddedPostgres({databaseDir:directory,user:'postgres',password:'test-admin',port,persistent:true,createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c','unix_socket_directories='],onLog:()=>{},onError:()=>{}});
  const admin=new Pool({host:'127.0.0.1',port,user:'postgres',password:'test-admin',database:'postgres'});
  const migrator=new Pool({host:'127.0.0.1',port,user:'factact_migrator',password:'test-migrator',database:'postgres',max:1});
  const runtime=new Pool({host:'127.0.0.1',port,user:'factact_runtime',password:'test-runtime',database:'postgres',max:5});
  const oidc=new Pool({host:'127.0.0.1',port,user:'factact_oidc_session_minter',password:'test-oidc',database:'postgres',max:1});
  // PostgreSQL sends SQLSTATE 57P01 to any connection still finishing socket
  // teardown during an intentional embedded-server stop. Only swallow this
  // expected notification AFTER fixture shutdown begins, not query failures.
  let shuttingDown=false;
  const poolError=(error:Error & {code?:string})=>{
    if(shuttingDown&&error.code==='57P01')return;
    throw error;
  };
  admin.on('error',poolError);
  migrator.on('error',poolError);
  runtime.on('error',poolError);
  oidc.on('error',poolError);
  async function close() {
    shuttingDown=true;
    await runtime.end();await oidc.end();await migrator.end();await admin.end();await embedded.stop();
    const root=await realpath(process.cwd()),target=await realpath(directory);
    if(!target.startsWith(root+sep+'.factact-db-test-')) throw new Error('Unsafe fixture cleanup target');
    await rm(target,{recursive:true,force:true});
  }
  try {
    await embedded.initialise();await embedded.start();
    const migrationClient=options.migrationAsNonSuperuser?migrator:admin;
    if(options.migrationAsNonSuperuser){
      // G3 explicitly exercises PostgreSQL 17 with CREATEROLE but without
      // SUPERUSER/BYPASSRLS. Existing suites keep their prior fixture unless
      // they opt into this hosted-compatibility condition.
      await admin.query(`create role factact_migrator login password 'test-migrator'
        createrole nosuperuser nocreatedb noreplication nobypassrls noinherit`);
      await admin.query('grant create on database postgres to factact_migrator');
    }
    for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()) {
      if(name===options.stopBeforeMigration)break;
      await migrationClient.query('BEGIN');
      try {await migrationClient.query(await readFile(resolve('supabase/migrations',name),'utf8'));await migrationClient.query('COMMIT');}
      catch(e) {await migrationClient.query('ROLLBACK');throw e;}
    }
    await admin.query("alter role factact_runtime password 'test-runtime'");
    await admin.query("alter role factact_oidc_session_minter password 'test-oidc'");
    const seed=await readFile('supabase/seed.sql','utf8');
    async function reset() {await admin.query('truncate factact.tenants, factact_private.login_transactions restart identity cascade');await admin.query(seed);}
    if(options.seedAsNonSuperuserWithRls&&!options.migrationAsNonSuperuser)
      throw new Error('RLS seed validation requires the non-superuser Migration principal');
    if(!options.skipSeed&&options.seedAsNonSuperuserWithRls)
      await loadSyntheticSeedWithRls(migrator,seed);
    else if(!options.skipSeed)await reset();
    return {admin,migrator,runtime,oidc,reset,close};
  } catch(e) {await close();throw e;}
}
export const ids={tenant:'10000000-0000-4000-8000-000000000001',operator:'20000000-0000-4000-8000-000000000001',organization:'30000000-0000-4000-8000-000000000001',person:'40000000-0000-4000-8000-000000000001',device:'50000000-0000-4000-8000-000000000001',service:'60000000-0000-4000-8000-000000000001',contract:'70000000-0000-4000-8000-000000000001'};
