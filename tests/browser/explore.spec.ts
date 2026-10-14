import { test,expect } from '@playwright/test';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { testDatabase,freePort,ids } from '../fixtures/database.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { PgExploreSearchUnitOfWork } from '../../apps/web/src/server/persistence/explore-repository.js';
import { ExploreQueries } from '../../packages/application/src/explore-queries.js';
import { PgJoinUnitOfWork } from '../../apps/web/src/server/persistence/join-repository.js';
import { JoinCommands } from '../../packages/application/src/join-commands.js';
import { JoinQueries } from '../../packages/application/src/join-queries.js';
import { PgSupportUnitOfWork } from '../../apps/web/src/server/persistence/support-repository.js';
import { SupportCommands } from '../../packages/application/src/support-commands.js';
import { createApp } from '../../apps/web/src/server/app.js';
import type { Config } from '../../apps/web/src/server/config.js';
import type { Operator } from '../../packages/domain/src/operator.js';

let db:Awaited<ReturnType<typeof testDatabase>>,server:Server,origin:string;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Demo',tenantName:'Demo',roles:['ADMIN','OPERATOR','REVIEWER']};
test.beforeAll(async()=>{
  db=await testDatabase();const port=await freePort();origin=`http://127.0.0.1:${port}`;
  const config:Config={nodeEnv:'test',port,origin,databaseUrl:'postgresql://test-only',databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test-only',clientSecret:'test-only',redirectUri:`${origin}/auth/callback`};
  const provider={authorizationUrl:(login:{state:string})=>`${origin}/auth/callback?code=test-code&state=${login.state}`,
    verifyCallback:async(url:URL,login:{state:string})=>{if(url.searchParams.get('code')!=='test-code'||url.searchParams.get('state')!==login.state)throw Error('Invalid test callback');return{issuer:'https://seed.example.invalid',subject:'development-operator'};}};
  const joinUow=new PgJoinUnitOfWork(db.runtime);
  const app=createApp(config,new PgIdentityStore(db.runtime),provider,pino({level:'silent'}),{commands:new JoinCommands(joinUow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new JoinQueries(joinUow)},undefined,{queries:new ExploreQueries(new PgExploreSearchUnitOfWork(db.runtime))});
  server=await new Promise<Server>(ok=>{const value=app.listen(port,'127.0.0.1',()=>ok(value));});
});
test.afterAll(async()=>{if(server)await new Promise<void>((ok,fail)=>server.close(error=>error?fail(error):ok()));await db?.close();});
test.beforeEach(async()=>{
  await db.reset();
  await db.admin.query("update factact.organizations set name='共通検索 組織' where id=$1",[ids.organization]);
  await db.admin.query("update factact.people set display_name='共通検索 担当者',email='explore@example.invalid' where id=$1",[ids.person]);
  await db.admin.query("update factact.devices set display_name='共通検索 端末' where id=$1",[ids.device]);
  await db.admin.query("update factact.services set name='共通検索 サービス' where id=$1",[ids.service]);
  const support=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
  const event=await support.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'検索用の問い合わせ'});
  const work=(await support.evaluate(actor,event.id,'REQUIRED','検索用')).work!;
  await support.recordResolution(actor,work.id,{mode:'GUIDANCE_ONLY',diagnosticEvidence:'検索用確認',rationale:'検索用',actionSummary:'案内'});
  await support.saveKnowledge(actor,work.id,'共通検索 ナレッジ候補','検索用の内容');
});
async function login(page:import('@playwright/test').Page) { await page.goto(origin);await page.getByRole('link',{name:'Googleでログイン'}).click();await expect(page.getByRole('heading',{name:'今、進めること'})).toBeVisible(); }

test('Explore shows six read-only result types and supports category changes',async({page})=>{
  await login(page);await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'探す',exact:true}).click();
  const query=page.getByLabel('検索語');await expect(query).toBeFocused();await query.fill('共通検索');await query.press('Enter');
  await expect(page.getByRole('heading',{name:'検索結果'})).toBeVisible();
  for(const type of ['組織','人','端末','サービス','仕事','ナレッジ候補']) await expect(page.getByText(type,{exact:true}).first()).toBeVisible();
  await expect(page.getByText('ナレッジ候補です。承認済みの手順・ルールではありません。')).toBeVisible();
  await page.getByRole('button',{name:'端末',exact:true}).click();await expect(page.getByRole('button',{name:'端末',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'検索',exact:true}).click();const resultRegion=page.getByRole('region',{name:'検索結果'});await expect(resultRegion.getByText('端末',{exact:true})).toBeVisible();await expect(resultRegion.getByText('組織',{exact:true})).toHaveCount(0);
  await query.fill('PC-0073');await page.getByRole('button',{name:'検索',exact:true}).click();await expect(page.getByText('PC-0073',{exact:true})).toBeVisible();
});

test('Explore handles no results, client validation and API errors',async({page})=>{
  await login(page);await page.getByRole('link',{name:'探す',exact:true}).click();const query=page.getByLabel('検索語');
  await query.fill('該当なしの検索語');await page.getByRole('button',{name:'検索',exact:true}).click();await expect(page.getByText('該当する情報は見つかりませんでした。')).toBeVisible();
  await query.fill('x'.repeat(201));await page.getByRole('button',{name:'検索',exact:true}).click();await expect(page.getByText('検索語は200文字以内で入力してください。')).toBeVisible();
  await page.route('**/api/explore/search?**',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'検索サービスに接続できませんでした。'}})}));
  await query.fill('API error');await page.getByRole('button',{name:'検索',exact:true}).click();await expect(page.getByText('検索サービスに接続できませんでした。')).toBeVisible();
});
