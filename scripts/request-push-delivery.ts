import {z} from 'zod';
import {loadPushWorkerDatabase} from '../apps/web/src/server/request-push-worker-config.js';
import {createPool,assertRuntimeRole} from '../apps/web/src/server/persistence/database.js';
import {assertSchemaReady} from '../apps/web/src/server/persistence/schema-ready.js';
import {createPushSender,loadPushVapid} from '../apps/web/src/server/request-push-transport.js';
import {PgRequestPushDelivery} from '../apps/web/src/server/persistence/request-push-delivery.js';
async function main(){
 const vapid=loadPushVapid(process.env);
 if(!vapid){console.log('PUSH_DELIVERY=DISABLED');return;}
 const tenantId=z.uuid().parse(process.env.FACTACT_WEB_PUSH_TENANT_ID);
 const pool=createPool(loadPushWorkerDatabase(process.env));
 try{
  await assertRuntimeRole(pool);await assertSchemaReady(pool);
  const result=await new PgRequestPushDelivery(pool,createPushSender(vapid),true).run(tenantId);
  console.log(JSON.stringify({processed:result.processed}));
 }finally{await pool.end();}
}
main().catch(()=>{console.error('PUSH_DELIVERY_FAILED');process.exitCode=1;});
