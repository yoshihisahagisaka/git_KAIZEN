import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {testDatabase,ids} from '../fixtures/database.js';
import {prepareSupportDemo} from '../../scripts/prepare-support-demo.js';
import {assertSchemaReady} from '../../apps/web/src/server/persistence/schema-ready.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import type {Operator} from '../../packages/domain/src/operator.js';
let db:Awaited<ReturnType<typeof testDatabase>>;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Demo',tenantName:'Demo',roles:['OPERATOR','REVIEWER','ADMIN']};
beforeAll(async()=>{db=await testDatabase();});beforeEach(async()=>db.reset());afterAll(async()=>db?.close());
async function prepare(){const c=await db.admin.connect();try{return await prepareSupportDemo(c);}finally{c.release();}}
it('fresh migration/seed setup is ready and exposes authorized SUPPORT service',async()=>{
 await assertSchemaReady(db.runtime);await prepare();
 const q=new SupportQueries(new PgSupportUnitOfWork(db.runtime));expect((await q.list(actor)).services.map(s=>s.id)).toEqual([ids.service]);
});
it('existing unscoped demo upgrades without rewriting original contract or identity, and retries safely',async()=>{
 await db.admin.query("update factact.contract_profiles set configuration_json=configuration_json-'support' where id=$1",[ids.contract]);
 const before=(await db.admin.query('select * from factact.contract_profiles where id=$1',[ids.contract])).rows;
 const bindings=(await db.admin.query('select * from factact_private.operator_identities')).rows;
 await prepare();await prepare();
 expect((await db.admin.query('select * from factact.contract_profiles where id=$1',[ids.contract])).rows).toEqual(before);
 expect((await db.admin.query('select * from factact_private.operator_identities')).rows).toEqual(bindings);
 const uow=new PgSupportUnitOfWork(db.runtime),q=new SupportQueries(uow),c=new SupportCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()});
 const list=await q.list(actor);expect(list.services).toHaveLength(1);expect(list.services[0]?.id).not.toBe(ids.service);
 const e=await c.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:list.services[0]!.id,symptom:'デモの問い合わせ'});
 expect((await c.evaluate(actor,e.id,'REQUIRED','症状を確認する必要がある')).work?.workOwnerOperatorId).toBe(ids.operator);
});
it('missing SUPPORT schema fails startup instead of serving a broken shell',async()=>{
 await db.admin.query('alter table factact.support_events rename to support_events_not_migrated');
 try{await expect(assertSchemaReady(db.runtime)).rejects.toThrow('Database migrations are incomplete');}
 finally{await db.admin.query('alter table factact.support_events_not_migrated rename to support_events');}
 await assertSchemaReady(db.runtime);
});
