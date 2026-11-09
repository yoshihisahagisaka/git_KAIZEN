import {test,expect,type Page} from '@playwright/test';
import type {Server} from 'node:http';
import {randomUUID} from 'node:crypto';
import pino from 'pino';
import {ids,testDatabase,freePort} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import {createApp} from '../../apps/web/src/server/app.js';
import type {Config} from '../../apps/web/src/server/config.js';
import type {Operator} from '../../packages/domain/src/operator.js';

const scopedActor='20000000-0000-4000-8000-000000000095';
const companyB='30000000-0000-4000-8000-000000000095';
const tenantB='10000000-0000-4000-8000-000000000095';
const actorB='20000000-0000-4000-8000-000000000096';
const now='2026-11-09T00:00:00.000Z';
const internal:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Internal',tenantName:'Development',roles:['ADMIN','OPERATOR','REVIEWER']};
let db:Awaited<ReturnType<typeof testDatabase>>,server:Server,origin:string;
let commands:SupportCommands,workA:string,workB:string,grantId:string;

test.use({timezoneId:'Asia/Tokyo'});
test.beforeAll(async()=>{
  db=await testDatabase();const port=await freePort();origin=`http://127.0.0.1:${port}`;
  const config:Config={nodeEnv:'test',port,origin,databaseUrl:'postgresql://test-only',
    oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
    issuer:'https://accounts.google.com',clientId:'test-only',clientSecret:'test-only',redirectUri:`${origin}/auth/callback`};
  const uow=new PgSupportUnitOfWork(db.runtime);
  commands=new SupportCommands(uow,{now:()=>now,id:randomUUID});
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>now});
  const app=createApp(config,new PgIdentityStore(db.runtime,db.oidc),{
    authorizationUrl:(login:{state:string})=>`${origin}/auth/callback?code=test-code&state=${login.state}`,
    verifyCallback:async(url:URL,login:{state:string})=>{
      if(url.searchParams.get('code')!=='test-code'||url.searchParams.get('state')!==login.state)throw Error('Test OIDC rejected');
      return {issuer:'https://seed.example.invalid',subject:'external-scoped-ui-actor'};
    },
  },pino({level:'silent'}),undefined,
    {commands:new SupportCommands(uow,{now:()=>now,id:randomUUID},reader),queries:new SupportQueries(uow)},
    undefined,reader);
  server=await new Promise<Server>(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));});
});
test.afterAll(async()=>{
  if(server)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  await db?.close();
});
test.beforeEach(async()=>{
  await db.reset();
  await db.admin.query("insert into factact.organizations(id,tenant_id,name,status) values($1,$2,'Customer B confidential','ACTIVE')",[companyB,ids.tenant]);
  await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'external-ui@example.invalid','External reader','ACTIVE')",[scopedActor,ids.tenant]);
  // Even all three legacy Roles do not turn the SCOPED Actor into INTERNAL_V1.
  for(const role of ['ADMIN','OPERATOR','REVIEWER'])await db.admin.query(
    'insert into factact.operator_roles values($1,$2,$3)',[ids.tenant,scopedActor,role]);
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
    ['https://seed.example.invalid','external-scoped-ui-actor',ids.tenant,scopedActor]);
  const recipientA=await withTenant(db.runtime,ids.tenant,async client=>{
    const repo=new PgJoinRepository(client,ids.tenant);
    return repo.ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization);
  });
  for(const [title,organizationId] of [['Customer A authorized',ids.organization],['Customer B confidential',companyB]] as [string,string][]){
    const event=await commands.createEvent(internal,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:title});
    const evaluation=await commands.evaluate(internal,event.id,'REQUIRED','問い合わせ対応');
    if(!evaluation.work)throw Error('Missing SUPPORT Work');
    await commands.recordBeneficiary(internal,event.id,{kind:'CONFIRMED',requestId:randomUUID(),expectedRevision:0,organizationId,reason:'受益企業を確認'});
    if(organizationId===ids.organization)workA=evaluation.work.id;
    else workB=evaluation.work.id;
  }
  grantId=randomUUID();
  await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'SUPPORT',$7,$8,$9)`,
    [grantId,ids.tenant,scopedActor,ids.service,ids.contract,recipientA,['READ'],'2026-11-01T00:00:00.000Z',ids.operator]);
});

async function login(page:Page){
  await page.goto(origin);
  await page.getByRole('link',{name:'Googleでログイン'}).click();
  await expect(page.getByRole('heading',{name:'問い合わせ・対応状況'})).toBeVisible();
}

test('scoped read UI shows A only, detail and allowed history; never calls internal broad APIs',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await commands.recordSupportResponse(internal,workA,{requestId:randomUUID(),expectedLifecycleRevision:0,
    expectedRecordRevision:0,responseText:'Customer A response only',disposition:'MONITORING',followUpAt:'2026-11-10T01:00:00.000Z'});
  const requested:string[]=[];
  page.on('request',request=>requested.push(new URL(request.url()).pathname));
  await login(page);
  const list=page.getByRole('region',{name:'許可された対応一覧'});
  // The Work title is intentionally generic (Caller + 問い合わせ); the
  // inquiry symptom is NOT included in the scoped list/read projection.
  await expect(list.locator('.scoped-work-button')).toHaveCount(1);
  await expect(list.getByRole('button',{name:/田中 一郎さんからの問い合わせ/})).toBeVisible();
  await expect(page.getByText('Customer B confidential')).toHaveCount(0);
  await list.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'選択した対応の詳細'})).toContainText('Customer A response only');
  expect(requested.some(path=>path.startsWith('/api/support')||path.startsWith('/api/home')||path.startsWith('/api/explore'))).toBe(false);
  expect(requested).toContain('/api/scoped/support-work');
  expect(requested).toContain(`/api/scoped/support-work/${workA}/history`);
  const secret=await page.request.get(`${origin}/api/scoped/support-work/${workB}`);
  expect(secret.status()).toBe(404);
});

test('revocation removes previously visible Work on revalidation without disclosing B',async({page})=>{
  await login(page);
  await expect(page.locator('.scoped-work-button')).toHaveCount(1);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='Browser regression'
    where id=$1`,[grantId,now,ids.operator]);
  await page.getByRole('button',{name:'一覧を更新'}).click();
  await expect(page.getByText('現在、閲覧できる対応はありません。')).toBeVisible();
  await expect(page.locator('.scoped-work-button')).toHaveCount(0);
  await expect(page.getByText('Customer B confidential')).toHaveCount(0);
  expect((await page.request.get(`${origin}/api/scoped/support-work/${workA}`)).status()).toBe(404);
});

test('switching authorized Tenant discards A data and selects scoped-only empty context',async({page})=>{
  await db.admin.query("insert into factact.tenants(id,name,status) values($1,'External Other Tenant','ACTIVE')",[tenantB]);
  await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'external-other@example.invalid','External alternate','ACTIVE')",[actorB,tenantB]);
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,false)`,
    ['https://seed.example.invalid','external-scoped-ui-actor',tenantB,actorB]);
  await login(page);
  await expect(page.locator('.scoped-work-button')).toHaveCount(1);
  await page.getByLabel('利用する所属先').selectOption(tenantB);
  await expect(page.getByText('External alternate / External Other Tenant')).toBeVisible();
  await expect(page.getByText('現在、閲覧できる対応はありません。')).toBeVisible();
  await expect(page.locator('.scoped-work-button')).toHaveCount(0);
  await expect(page.getByText('Customer B confidential')).toHaveCount(0);
  expect((await page.request.get(`${origin}/api/scoped/support-work/${workA}`)).status()).toBe(404);
});
