import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import { testDatabase,ids } from '../fixtures/database.js';
import { PgExploreSearchUnitOfWork } from '../../apps/web/src/server/persistence/explore-repository.js';
import { ExploreQueries } from '../../packages/application/src/explore-queries.js';
import { PgSupportUnitOfWork } from '../../apps/web/src/server/persistence/support-repository.js';
import { SupportCommands } from '../../packages/application/src/support-commands.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { tokenHash } from '../../apps/web/src/server/auth/pkce.js';
import { createApp } from '../../apps/web/src/server/app.js';
import type { Config } from '../../apps/web/src/server/config.js';
import type { Operator } from '../../packages/domain/src/operator.js';

let db:Awaited<ReturnType<typeof testDatabase>>,queries:ExploreQueries,support:SupportCommands;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'開発オペレーター',tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER']};
const config:Config={nodeEnv:'test',port:8080,origin:'http://localhost:8080',databaseUrl:'postgresql://unused',databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test',clientSecret:'test',redirectUri:'http://localhost:8080/auth/callback'};

beforeAll(async()=>{
  db=await testDatabase();
  queries=new ExploreQueries(new PgExploreSearchUnitOfWork(db.runtime));
  support=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
});
beforeEach(async()=>{
  await db.reset();
  await db.admin.query("update factact.people set email='Ichiro.Tanaka@example.invalid' where id=$1",[ids.person]);
  await db.admin.query("update factact.devices set serial_number='SERIAL-ABC-73' where id=$1",[ids.device]);
});
afterAll(async()=>db?.close());

async function supportKnowledge(currentActor=actor,personId=ids.person,serviceId=ids.service,title='VPN接続前の確認') {
  const event=await support.createEvent(currentActor,{requestId:randomUUID(),personId,serviceId,symptom:'OBSERVATION-ONLY-TOKEN 接続できない'});
  const evaluated=await support.evaluate(currentActor,event.id,'REQUIRED','確認が必要');
  const work=evaluated.work!;
  const decision=await support.recordResolution(currentActor,work.id,{mode:'GUIDANCE_ONLY',diagnosticEvidence:'EVIDENCE-ONLY-TOKEN を確認',rationale:'案内可能',actionSummary:'接続を案内'});
  const knowledge=await support.saveKnowledge(currentActor,work.id,title,'CONTENT-ONLY-TOKEN 利用対象を確認する');
  return {event,work,decision,knowledge};
}

describe('Explore-01 read search',()=>{
  it('orders Organization exact, prefix and contains matches stably',async()=>{
    const prefix=randomUUID(),contains=randomUUID();
    await db.admin.query("insert into factact.organizations(id,tenant_id,name,status) values($1,$3,'Example株式会社 東日本','ACTIVE'),($2,$3,'東日本 Example株式会社','ACTIVE')",[prefix,contains,ids.tenant]);
    const results=(await queries.search(actor,{query:'example株式会社',types:['ORGANIZATION'],limit:20})).results;
    expect(results.map(x=>x.entityId)).toEqual([ids.organization,prefix,contains]);
    expect(results.every(x=>x.resultType==='ORGANIZATION')).toBe(true);
  });

  it('searches Person display name and email case-insensitively',async()=>{
    expect((await queries.search(actor,{query:'田中',types:['PERSON'],limit:20})).results[0]).toMatchObject({resultType:'PERSON',entityId:ids.person,primaryLabel:'田中 一郎'});
    expect((await queries.search(actor,{query:'ichiro.tanaka@EXAMPLE',types:['PERSON'],limit:20})).results[0]).toMatchObject({entityId:ids.person,secondaryLabel:'Ichiro.Tanaka@example.invalid'});
  });

  it('searches Device asset tag, serial number and display name',async()=>{
    for(const term of ['pc-0073','serial-abc','会社pc']) {
      expect((await queries.search(actor,{query:term,types:['DEVICE'],limit:20})).results[0]).toMatchObject({resultType:'DEVICE',entityId:ids.device});
    }
    expect((await queries.search(actor,{query:'serial-abc-73',types:['DEVICE'],limit:20})).results[0]?.metadata).toMatchObject({serialNumber:'SERIAL-ABC-73',deviceStatus:'AVAILABLE'});
  });

  it('searches Service name',async()=>{
    expect((await queries.search(actor,{query:'情シス',types:['SERVICE'],limit:20})).results[0]).toMatchObject({resultType:'SERVICE',entityId:ids.service,primaryLabel:'情シスKAIZEN'});
  });

  it('searches Work by exact UUID and title but not Observation or Evidence text',async()=>{
    const fixture=await supportKnowledge();
    expect((await queries.search(actor,{query:fixture.work.id,types:['WORK'],limit:20})).results[0]).toMatchObject({resultType:'WORK',entityId:fixture.work.id});
    expect((await queries.search(actor,{query:'VPN接続',types:['WORK'],limit:20})).results.some(x=>x.entityId===fixture.work.id)).toBe(true);
    expect((await queries.search(actor,{query:'OBSERVATION-ONLY-TOKEN',types:['WORK'],limit:20})).results).toEqual([]);
    expect((await queries.search(actor,{query:'EVIDENCE-ONLY-TOKEN',types:['WORK'],limit:20})).results).toEqual([]);
  });

  it('searches Knowledge Candidate title, content and topic without changing its meaning',async()=>{
    const fixture=await supportKnowledge();
    for(const term of ['接続前','content-only-token','vpn_guidance']) {
      const result=(await queries.search(actor,{query:term,types:['KNOWLEDGE_CANDIDATE'],limit:20})).results[0];
      expect(result).toMatchObject({resultType:'KNOWLEDGE_CANDIDATE',entityId:fixture.knowledge.id});
      expect(result?.metadata).toMatchObject({topic:'VPN_GUIDANCE',sourceWorkId:fixture.work.id});
    }
  });

  it('applies type filters and returns a valid empty result',async()=>{
    const device=(await queries.search(actor,{query:'PC',types:['DEVICE'],limit:20})).results;
    expect(device.length).toBeGreaterThan(0);expect(device.every(x=>x.resultType==='DEVICE')).toBe(true);
    expect((await queries.search(actor,{query:'NO-SUCH-FACTACT-ENTITY',limit:20})).results).toEqual([]);
  });

  it('RLS prevents cross-tenant Person, Device, Work and Knowledge Candidate results',async()=>{
    const tenant=randomUUID(),organization=randomUUID(),operator=randomUUID(),person=randomUUID(),device=randomUUID(),service=randomUUID(),contract=randomUUID();
    await db.admin.query("insert into factact.tenants(id,name,status) values($1,'Foreign Tenant','ACTIVE')",[tenant]);
    await db.admin.query("insert into factact.organizations(id,tenant_id,name,status) values($1,$2,'FOREIGN-SECRET Organization','ACTIVE')",[organization,tenant]);
    await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'foreign@example.invalid','Foreign Operator','ACTIVE')",[operator,tenant]);
    for(const role of actor.roles) await db.admin.query('insert into factact.operator_roles values($1,$2,$3)',[tenant,operator,role]);
    await db.admin.query("insert into factact.people(id,tenant_id,organization_id,display_name,email,lifecycle_status) values($1,$2,$3,'FOREIGN-SECRET Person','foreign-secret@example.invalid','ACTIVE')",[person,tenant,organization]);
    await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,serial_number,display_name,device_status) values($1,$2,'FOREIGN-SECRET-DEVICE','FOREIGN-SECRET-SERIAL','Foreign Device','AVAILABLE')",[device,tenant]);
    await db.admin.query("insert into factact.services(id,tenant_id,organization_id,service_model_code,name,status) values($1,$2,$3,'JOSYS_KAIZEN','FOREIGN-SECRET Service','ACTIVE')",[service,tenant,organization]);
    await db.admin.query(`insert into factact.contract_profiles(id,tenant_id,service_id,version,effective_from,status,configuration_json) values($1,$2,$3,1,now(),'ACTIVE',
      '{"support":{"enabled":true,"executeRoles":["OPERATOR"]},"requirements":{"COMPANY_PC":{"policy":"REQUIRED","basis":"fixture"}},"deviceAssignment":{"executeRoles":["OPERATOR"],"reviewRoles":["REVIEWER"],"allowSelfReview":true}}')`,[contract,tenant,service]);
    const other={...actor,id:operator,tenantId:tenant};
    const fixture=await supportKnowledge(other,person,service,'FOREIGN-SECRET Knowledge');
    expect(fixture.work.title).toContain('FOREIGN-SECRET');
    expect((await queries.search(actor,{query:'FOREIGN-SECRET',limit:50})).results).toEqual([]);
  });

  it('is read-only across business tables',async()=>{
    await supportKnowledge();
    const tables=['work','relations','recipient_observations','actions','evidence','support_decisions','knowledge_candidates'];
    const before=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.admin.query(`select count(*)::int as count from factact.${table}`)).rows[0].count])));
    await queries.search(actor,{query:'VPN',limit:50});
    const after=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await db.admin.query(`select count(*)::int as count from factact.${table}`)).rows[0].count])));
    expect(after).toEqual(before);
  });

  it('exposes an authenticated validated GET API',async()=>{
    const store=new PgIdentityStore(db.runtime);await store.createSession(tokenHash('explore-test'),{tenantId:ids.tenant,operatorId:ids.operator},'csrf');
    const app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>{throw Error('not used');}},pino({level:'silent'}),undefined,undefined,{queries});
    await request(app).get('/api/explore/search?q=PC&types=DEVICE&limit=20').expect(401);
    const valid=await request(app).get('/api/explore/search?q=PC&types=DEVICE&limit=20').set('Cookie','factact_session=explore-test').expect(200);
    expect(valid.body.data.results[0]).toMatchObject({resultType:'DEVICE',entityId:ids.device});
    for(const path of ['/api/explore/search','/api/explore/search?q=%20%20','/api/explore/search?q=PC&types=CUSTOMER','/api/explore/search?q=PC&limit=0','/api/explore/search?q=PC&limit=51','/api/explore/search?q=PC&limit=abc']) {
      const response=await request(app).get(path).set('Cookie','factact_session=explore-test').expect(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    }
  });
});
