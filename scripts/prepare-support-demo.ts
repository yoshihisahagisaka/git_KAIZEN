import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function prepareSupportDemo(db: PoolClient) {
  const tenant='10000000-0000-4000-8000-000000000001';
  const service='60000000-0000-4000-8000-000000000001';
  await db.query('BEGIN');
  try {
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[tenant+':support-demo-upgrade']);
    const {rows}=await db.query(`select * from factact.contract_profiles where tenant_id=$1 and service_id=$2
      and status='ACTIVE' and effective_from<=now() and (effective_to is null or effective_to>now()) for update`,[tenant,service]);
    if(rows.length!==1) throw new Error('Expected exactly one effective demo contract');
    const old=rows[0];
    if(old.configuration_json.support?.enabled===true) {await db.query('COMMIT');return 'Existing SUPPORT scope retained; no changes.';}
    // Keep pinned JOIN contracts and unfinished work intact. SUPPORT is a separate
    // authorized service context, reading the same Person/Device registry facts.
    const supportService='60000000-0000-4000-8000-000000000002';
    const supportContract='70000000-0000-4000-8000-000000000002';
    const existing=await db.query('select configuration_json from factact.contract_profiles where tenant_id=$1 and id=$2 and service_id=$3 and status=\'ACTIVE\'',[tenant,supportContract,supportService]);
    if(existing.rows.length) {
      if(existing.rows[0].configuration_json.support?.enabled!==true) throw new Error('Existing demo SUPPORT configuration requires review');
      await db.query('COMMIT');return 'Existing dedicated SUPPORT demo service retained.';
    }
    await db.query(`insert into factact.services(id,tenant_id,organization_id,service_model_code,name,status)
      select $1,tenant_id,organization_id,service_model_code,'情シスKAIZEN（問い合わせデモ）','ACTIVE' from factact.services where tenant_id=$2 and id=$3`,[supportService,tenant,service]);
    await db.query(`insert into factact.contract_profiles(id,tenant_id,service_id,version,effective_from,status,configuration_json)
      values($1,$2,$3,1,transaction_timestamp(),'ACTIVE',$4)`,[supportContract,tenant,supportService,{...old.configuration_json,support:{enabled:true,executeRoles:['OPERATOR']}}]);
    await db.query(`insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,metadata_json)
      values($1,$2,'CONTRACT_PROFILE',$3,'LOCAL_SUPPORT_SCOPE_ENABLED',$4)`,[randomUUID(),tenant,supportContract,{sourceServiceId:service,serviceId:supportService,source:'explicit local demo administration'}]);
    await db.query('COMMIT');
    return 'Dedicated SUPPORT demo service enabled. Original contracts, pending JOIN work, facts and identity bindings preserved.';
  } catch(e) {await db.query('ROLLBACK');throw e;}
}
async function main() {
  const runtime=new URL(process.env.DATABASE_URL??'');
  const admin=new URL(process.env.ADMIN_DATABASE_URL??'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  if(process.env.NODE_ENV!=='development'||runtime.hostname!=='127.0.0.1'||runtime.port!=='54322'||runtime.pathname!=='/postgres'||runtime.username!=='factact_runtime'||admin.hostname!==runtime.hostname||admin.port!==runtime.port||admin.pathname!==runtime.pathname) throw new Error('Dedicated local demo database required');
  const pool=new Pool({connectionString:admin.href,connectionTimeoutMillis:5000});
  try {const client=await pool.connect();try{console.log(await prepareSupportDemo(client));}finally{client.release();}}finally{await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(()=>{console.error('Local SUPPORT preparation failed. Check migrations, local admin access, and existing demo service/contract configuration. No credentials logged.');process.exitCode=1;});
