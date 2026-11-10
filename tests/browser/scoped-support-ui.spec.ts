import {test,expect,type Page} from '@playwright/test';
import type {Server} from 'node:http';
import {randomUUID} from 'node:crypto';
import pino from 'pino';
import {ids,testDatabase,freePort} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository,PgJoinUnitOfWork} from '../../apps/web/src/server/persistence/join-repository.js';
import {JoinCommands} from '../../packages/application/src/join-commands.js';
import {JoinQueries} from '../../packages/application/src/join-queries.js';
import {PgExploreSearchUnitOfWork} from '../../apps/web/src/server/persistence/explore-repository.js';
import {ExploreQueries} from '../../packages/application/src/explore-queries.js';
import {PgScopedGrantManager} from '../../apps/web/src/server/persistence/scoped-grant-manager.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedAccessReader} from '../../apps/web/src/server/persistence/scoped-access-reader.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {PgRegistryReviewReader} from '../../apps/web/src/server/persistence/registry-review-reader.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
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
  const joinUow=new PgJoinUnitOfWork(db.runtime);
  const exploreUow=new PgExploreSearchUnitOfWork(db.runtime);
  commands=new SupportCommands(uow,{now:()=>now,id:randomUUID});
  const reader=new PgScopedAccessReader(db.runtime,{now:()=>now});
  const app=createApp(config,new PgIdentityStore(db.runtime,db.oidc),{
    authorizationUrl:(login:{state:string})=>`${origin}/auth/callback?code=test-code&state=${login.state}`,
    verifyCallback:async(url:URL,login:{state:string})=>{
      if(url.searchParams.get('code')!=='test-code'||url.searchParams.get('state')!==login.state)throw Error('Test OIDC rejected');
      return {issuer:'https://seed.example.invalid',subject:'external-scoped-ui-actor'};
    },
  },pino({level:'silent'}),
    {commands:new JoinCommands(joinUow,{now:()=>now,id:randomUUID}),queries:new JoinQueries(joinUow)},
    {commands:new SupportCommands(uow,{now:()=>now,id:randomUUID},reader),queries:new SupportQueries(uow)},
    {queries:new ExploreQueries(exploreUow)},reader,new PgScopedGrantManager(db.runtime),reader,
    new RegistryEditCommands(new PgRegistryEditStore(db.runtime)),
    new PgRegistryReviewReader(db.runtime));
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
async function grantRegistryA(operations:string[]=['READ'],actor:string=scopedActor){
  const {rows}=await db.admin.query<{id:string}>(`
    select id from factact.service_recipients
    where tenant_id=$1 and service_id=$2 and recipient_organization_id=$3
      and recipient_type='ORGANIZATION' and status='ACTIVE'`,[ids.tenant,ids.service,ids.organization]);
  if(!rows[0])throw Error('Missing A Organization recipient');
  const id=randomUUID();
  await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,object_kind,operations,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,$8,$9)`,
    [id,ids.tenant,actor,ids.service,ids.contract,rows[0].id,operations,'2026-11-01T00:00:00.000Z',ids.operator]);
  return id;
}

async function pendingRegistryChange(){
  await grantRegistryA(['UPDATE'],ids.operator);
  return new RegistryEditCommands(new PgRegistryEditStore(db.runtime)).proposeDisplayName(
    {tenantId:ids.tenant,actorOperatorId:ids.operator},{serviceId:ids.service,personId:ids.person,
      requestId:randomUUID(),requestKey:randomUUID(),proposedDisplayName:'田中 太郎',
      reason:'利用者による登録表記の訂正申告',expectedRegistryRevision:0});
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

test('SUPPORT-only actor sees no directory context and never requests REGISTRY API',async({page})=>{
  const requested:string[]=[];
  page.on('request',request=>requested.push(new URL(request.url()).pathname));
  await login(page);
  await page.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'選択した対応の詳細'})).toContainText('田中 一郎');
  await expect(page.getByRole('region',{name:'受益企業の登録情報'})).toHaveCount(0);
  expect(requested.filter(path=>path.startsWith('/api/scoped/registry/'))).toEqual([]);
});

test('separate REGISTRY READ reveals only confirmed beneficiary A people, with no email or B details',async({page})=>{
  await db.admin.query(`insert into factact.people
    (id,tenant_id,organization_id,display_name,email,lifecycle_status)
    values($1,$2,$3,'B secret person','b-private@example.invalid','ACTIVE')`,
    [randomUUID(),ids.tenant,companyB]);
  await grantRegistryA();
  await login(page);
  await page.locator('.scoped-work-button').click();
  const directory=page.getByRole('region',{name:'受益企業の登録情報'});
  await expect(directory).toBeVisible();
  await expect(directory).toContainText('田中 一郎');
  await expect(directory).toContainText('登録手続き中');
  await expect(directory).not.toContainText('B secret person');
  await expect(directory).not.toContainText('b-private@example.invalid');
  await expect(directory.locator('input,textarea')).toHaveCount(0);
  await expect(directory.getByRole('button',{name:'編集'})).toHaveCount(0);
  expect((await page.request.get(`${origin}/api/scoped/registry/organizations/${companyB}/people?serviceId=${ids.service}`)).status()).toBe(404);
});

test('one Registry 保存 creates pending Change without mutating Person or opening customer B',async({page})=>{
  await grantRegistryA(['READ','UPDATE']);
  const requested:string[]=[];
  page.on('request',req=>requested.push(new URL(req.url()).pathname));
  await login(page);
  await page.locator('.scoped-work-button').click();
  const directory=page.getByRole('region',{name:'受益企業の登録情報'});
  await expect(directory).toContainText('田中 一郎');
  await directory.getByRole('button',{name:'編集'}).click();
  const form=directory.getByRole('form',{name:'表示名の変更依頼'});
  await form.getByLabel('訂正後の表示名').fill('田中 太郎');
  await form.getByLabel('訂正理由').fill('顧客から登録表記の訂正依頼');
  await form.getByRole('button',{name:'保存'}).click();
  await expect(directory.getByRole('status')).toContainText('確認待ち');
  await expect(directory).toContainText('田中 一郎');
  await expect(directory).not.toContainText('田中 太郎');
  await expect(form).toHaveCount(0);
  expect(requested.filter(path=>path.endsWith('/display-name-proposals'))).toEqual([
    `/api/scoped/registry/people/${ids.person}/display-name-proposals`,
  ]);
  const {rows}=await db.admin.query(`select c.status,c.work_id,c.action_id,r.reason,
    p.display_name from factact.changes c join factact.registry_edit_requests r
    on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.id=r.target_person_id`);
  expect(rows).toEqual([expect.objectContaining({status:'PROPOSED',work_id:null,
    action_id:null,reason:'顧客から登録表記の訂正依頼',display_name:'田中 一郎'})]);
  expect((await page.request.get(`${origin}/api/scoped/registry/organizations/${companyB}/people?serviceId=${ids.service}`)).status()).toBe(404);
});

test('revocation after opening the Registry edit form fails closed at 保存',async({page})=>{
  const registryGrant=await grantRegistryA(['READ','UPDATE']);
  await login(page);
  await page.locator('.scoped-work-button').click();
  const directory=page.getByRole('region',{name:'受益企業の登録情報'});
  await directory.getByRole('button',{name:'編集'}).click();
  const form=directory.getByRole('form',{name:'表示名の変更依頼'});
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Registry edit browser revoke'
    where id=$2`,[ids.operator,registryGrant]);
  await form.getByLabel('訂正後の表示名').fill('変更できない表記');
  await form.getByLabel('訂正理由').fill('取消後の試行');
  await form.getByRole('button',{name:'保存'}).click();
  await expect(directory.getByRole('alert')).toContainText('登録情報を取得できませんでした');
  await expect(directory).not.toContainText('田中 一郎');
  expect((await db.admin.query('select count(*)::integer as n from factact.registry_edit_requests')).rows[0].n).toBe(0);
});

test('revoking REGISTRY READ removes previously visible directory while keeping SUPPORT Work',async({page})=>{
  const registryGrant=await grantRegistryA();
  await login(page);
  await page.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'受益企業の登録情報'})).toContainText('田中 一郎');
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='Browser registry revoke'
    where id=$1`,[registryGrant,now,ids.operator]);
  await page.getByRole('button',{name:'一覧を更新'}).click();
  await expect(page.locator('.scoped-work-button')).toHaveCount(1);
  await page.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'選択した対応の詳細'})).toContainText('田中 一郎');
  await expect(page.getByRole('region',{name:'受益企業の登録情報'})).toHaveCount(0);
  expect((await page.request.get(`${origin}/api/scoped/registry/organizations/${ids.organization}/people?serviceId=${ids.service}`)).status()).toBe(404);
});

test('legacy ADMIN/OPERATOR/REVIEWER Roles cannot bypass internal APIs under the same scoped browser session',async({page})=>{
  await login(page);
  const paths=['/api/home','/api/work','/api/devices','/api/support',
    '/api/support-responsibility','/api/explore/search?q=Customer'];
  for(const path of paths){
    const response=await page.request.get(`${origin}${path}`);
    expect(response.status(),path).toBe(403);
    expect(await response.text()).not.toContain('Customer B confidential');
  }
  const session=await page.request.get(`${origin}/api/session`);
  expect((await session.json()).data.operator).toMatchObject({readAuthorityMode:'SCOPED',roles:[]});
  await expect(page.locator('.scoped-work-button')).toHaveCount(1);
  await page.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'選択した対応の詳細'})).toContainText('田中 一郎');
});

test('READ-only actor cannot see response or correction controls',async({page})=>{
  await commands.recordSupportResponse(internal,workA,{requestId:randomUUID(),expectedLifecycleRevision:0,
    expectedRecordRevision:0,responseText:'Internal author only',disposition:'MONITORING',followUpAt:'2026-11-10T01:00:00.000Z'});
  await login(page);
  await page.locator('.scoped-work-button').click();
  await expect(page.getByRole('region',{name:'対応履歴'})).toContainText('Internal author only');
  await expect(page.getByRole('region',{name:'対応の記録'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'この記録を訂正'})).toHaveCount(0);
});

test('UPDATE actor records response and appends own text correction; B remains invisible',async({page})=>{
  await db.admin.query('update factact.scoped_actor_grants set operations=$2 where id=$1',
    [grantId,['READ','UPDATE']]);
  await login(page);
  await expect(page.locator('.scoped-work-button')).toHaveCount(1);
  await page.locator('.scoped-work-button').click();
  const form=page.getByRole('region',{name:'対応の記録'});
  await expect(form).toBeVisible();
  await form.getByLabel('対応内容').fill('External A response');
  await form.getByLabel('対応後の状態').selectOption('MONITORING');
  await form.getByLabel('次回確認予定').fill('2026-11-12T15:00');
  await form.getByRole('button',{name:'対応を記録'}).click();
  await expect(page.getByRole('region',{name:'対応履歴'})).toContainText('External A response');
  await page.getByRole('button',{name:'この記録を訂正'}).click();
  const correction=page.getByRole('region',{name:'対応内容の訂正'});
  await correction.getByLabel('訂正後の対応内容').fill('External A corrected text');
  await correction.getByLabel('訂正理由').fill('表現の誤り');
  await correction.getByRole('button',{name:'訂正を追記'}).click();
  const history=page.getByRole('region',{name:'対応履歴'});
  await expect(history).toContainText('External A corrected text');
  await expect(history).toContainText('External A response');
  await expect(history.getByRole('button',{name:'この記録を訂正'})).toHaveCount(1);
  expect((await page.request.get(`${origin}/api/scoped/support-work/${workB}`)).status()).toBe(404);
  await expect(page.getByText('Customer B confidential')).toHaveCount(0);
});

test('revoked UPDATE/READ grant denies an open form and removes the Work after revalidation',async({page})=>{
  await db.admin.query('update factact.scoped_actor_grants set operations=$2 where id=$1',
    [grantId,['READ','UPDATE']]);
  await login(page);
  await page.locator('.scoped-work-button').click();
  const form=page.getByRole('region',{name:'対応の記録'});
  await expect(form).toBeVisible();
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=$2,revoked_by_operator_id=$3,revocation_reason='Write revocation browser regression'
    where id=$1`,[grantId,now,ids.operator]);
  await form.getByLabel('対応内容').fill('Should not be persisted');
  await form.getByLabel('次回確認予定').fill('2026-11-12T15:00');
  await form.getByRole('button',{name:'対応を記録'}).click();
  await expect(page.getByRole('alert')).toContainText('記録できませんでした');
  await page.getByRole('button',{name:'最新情報を確認'}).click();
  await expect(page.getByText('現在、閲覧できる対応はありません。')).toBeVisible();
  await expect(form).toHaveCount(0);
  expect((await page.request.get(`${origin}/api/scoped/support-work/${workA}`)).status()).toBe(404);
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

test('independent Registry reviewer confirms Person correction in one click without SUPPORT access',async({page})=>{
  const {changeId}=await pendingRegistryChange();
  await grantRegistryA(['REVIEW','APPROVE']);
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Reviewer has no SUPPORT READ'
    where id=$2`,[ids.operator,grantId]);
  await login(page);
  await expect(page.locator('.scoped-work-button')).toHaveCount(0);
  const review=page.getByRole('region',{name:'Registry確認待ち'});
  await review.getByRole('button',{name:'確認する'}).click();
  await expect(review).toContainText('田中 一郎');
  await expect(review).toContainText('田中 太郎');
  await expect(review).toContainText('利用者による登録表記の訂正申告');
  await expect(review).not.toContainText('Customer B confidential');
  await review.getByRole('button',{name:'確認して確定'}).click();
  await expect(review.getByRole('status')).toContainText('変更を確定しました');
  await expect(review).toContainText('現在確認できる変更依頼はありません。');
  const result=await db.admin.query(`select c.status,c.verified_by_operator_id,
    c.committed_by_operator_id,p.display_name,p.registry_revision
    from factact.changes c join factact.registry_edit_requests r
      on r.tenant_id=c.tenant_id and r.id=c.registry_edit_request_id
    join factact.people p on p.id=r.target_person_id where c.id=$1`,[changeId]);
  expect(result.rows).toEqual([expect.objectContaining({status:'COMMITTED',
    verified_by_operator_id:scopedActor,committed_by_operator_id:scopedActor,
    display_name:'田中 太郎',registry_revision:'1'})]);
});

test('revoked reviewer cannot confirm an already displayed proposal and sees refresh failure',async({page})=>{
  const {changeId}=await pendingRegistryChange();
  const reviewGrant=await grantRegistryA(['REVIEW','APPROVE']);
  await login(page);
  const review=page.getByRole('region',{name:'Registry確認待ち'});
  await review.getByRole('button',{name:'確認する'}).click();
  await expect(review).toContainText('田中 太郎');
  await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
    revoked_at=now(),revoked_by_operator_id=$1,revocation_reason='Revoked after read'
    where id=$2`,[ids.operator,reviewGrant]);
  await review.getByRole('button',{name:'確認して確定'}).click();
  await expect(review.getByRole('alert')).toContainText('確定できなかったか');
  await expect(review).toContainText('現在確認できる変更依頼はありません。');
  expect((await db.admin.query('select status from factact.changes where id=$1',[changeId]))
    .rows[0].status).toBe('PROPOSED');
});
