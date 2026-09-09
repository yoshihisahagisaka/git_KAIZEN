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
export async function testDatabase() {
  const directory=await mkdtemp(resolve('.factact-db-test-')), port=await freePort();
  const embedded=new EmbeddedPostgres({databaseDir:directory,user:'postgres',password:'test-admin',port,persistent:true,createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:()=>{}});
  const admin=new Pool({host:'127.0.0.1',port,user:'postgres',password:'test-admin',database:'postgres'});
  const runtime=new Pool({host:'127.0.0.1',port,user:'factact_runtime',password:'test-runtime',database:'postgres',max:5});
  async function close() {
    await runtime.end();await admin.end();await embedded.stop();
    const root=await realpath(process.cwd()),target=await realpath(directory);
    if(!target.startsWith(root+sep+'.factact-db-test-')) throw new Error('Unsafe fixture cleanup target');
    await rm(target,{recursive:true,force:true});
  }
  try {
    await embedded.initialise();await embedded.start();
    for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()) {
      await admin.query('BEGIN');
      try {await admin.query(await readFile(resolve('supabase/migrations',name),'utf8'));await admin.query('COMMIT');}
      catch(e) {await admin.query('ROLLBACK');throw e;}
    }
    await admin.query("alter role factact_runtime password 'test-runtime'");
    const seed=await readFile('supabase/seed.sql','utf8');
    async function reset() {await admin.query('truncate factact.tenants, factact_private.login_transactions restart identity cascade');await admin.query(seed);}
    await reset();
    return {admin,runtime,reset,close};
  } catch(e) {await close();throw e;}
}
export const ids={tenant:'10000000-0000-4000-8000-000000000001',operator:'20000000-0000-4000-8000-000000000001',organization:'30000000-0000-4000-8000-000000000001',person:'40000000-0000-4000-8000-000000000001',device:'50000000-0000-4000-8000-000000000001',service:'60000000-0000-4000-8000-000000000001',contract:'70000000-0000-4000-8000-000000000001'};
