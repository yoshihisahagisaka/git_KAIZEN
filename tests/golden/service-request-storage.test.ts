import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
let db:Awaited<ReturnType<typeof testDatabase>>;
let partner:string;
beforeAll(async()=>{db=await testDatabase();},120_000);
beforeEach(async()=>{
 await db.reset();partner=randomUUID();
 await db.admin.query("insert into factact.organizations(id,tenant_id,name,status) values($1,$2,'Synthetic partner','ACTIVE')",[partner,ids.tenant]);
 await db.admin.query("insert into factact.service_request_channels(tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id) values($1,$2,$3,$4,$5)",
 [ids.tenant,ids.service,ids.contract,ids.organization,partner]);
},60_000);
afterAll(async()=>{await db?.close();},60_000);
async function add(direction='PROVIDER_TO_PARTNER',type='ONSITE_REQUEST'){
 const id=randomUUID();
 await db.admin.query(`insert into factact.service_requests(id,tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id,direction,request_type,content,created_by_operator_id,created_at)
 values($1,$2,$3,$4,$5,$6,$7,$8,'Synthetic request',$9,now())`,
 [id,ids.tenant,ids.service,ids.contract,ids.organization,partner,direction,type,ids.operator]);
 return id;
}
describe('generic request storage foundation (no runtime publication yet)',()=>{
 it('defaults channel disabled, has no implicit participant and denies runtime mutation',async()=>{
  await withTenant(db.runtime,ids.tenant,async c=>{
   expect((await c.query('select enabled from factact.service_request_channels')).rows).toEqual([{enabled:false}]);
   expect((await c.query('select * from factact.service_request_participants')).rows).toEqual([]);
  },true);
  await expect(withTenant(db.runtime,ids.tenant,c=>c.query('update factact.service_request_channels set enabled=true'))).rejects.toMatchObject({code:'42501'});
  const requestId=await add();
  await expect(withTenant(db.runtime,ids.tenant,c=>c.query("update factact.service_requests set content='changed' where id=$1",[requestId]))).rejects.toMatchObject({code:'42501'});
  await expect(withTenant(db.runtime,ids.tenant,c=>c.query('delete from factact.service_requests where id=$1',[requestId]))).rejects.toMatchObject({code:'42501'});
  await withTenant(db.runtime,randomUUID(),async c=>{
   expect((await c.query('select id from factact.service_requests')).rows).toEqual([]);
   expect((await c.query('select * from factact.service_request_channels')).rows).toEqual([]);
  },true);
 });
 it('enforces direction/category and result requirements at DB boundary',async()=>{
  await expect(add('PARTNER_TO_PROVIDER','ONSITE_REQUEST')).rejects.toMatchObject({code:'23514'});
  const requestId=await add('PARTNER_TO_PROVIDER','CALL_REQUEST');
  const append=(comment:string,revision=1)=>db.admin.query(`insert into factact.service_request_updates
    (id,tenant_id,request_id,command_id,revision,previous_status,status,comment,actor_operator_id,recorded_at)
    values($1,$2,$3,$4,$5,'PENDING','COMPLETED',$6,$7,now())`,
   [randomUUID(),ids.tenant,requestId,randomUUID(),revision,comment,ids.operator]);
  await expect(append('')).rejects.toMatchObject({code:'23514'});
  await append('回答済み');
  await expect(append('重複')).rejects.toMatchObject({code:'23505'});
  await withTenant(db.runtime,ids.tenant,async c=>{
   expect((await c.query('select status,revision,comment from factact.service_request_updates where request_id=$1',[requestId])).rows)
    .toEqual([{status:'COMPLETED',revision:1,comment:'回答済み'}]);
  },true);
 });
});
