import { test,expect } from '@playwright/test';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { testDatabase,freePort } from '../fixtures/database.js';
import { PgIdentityStore } from '../../apps/web/src/server/persistence/identity-store.js';
import { PgJoinUnitOfWork } from '../../apps/web/src/server/persistence/join-repository.js';
import { JoinCommands } from '../../packages/application/src/join-commands.js';
import { JoinQueries } from '../../packages/application/src/join-queries.js';
import { createApp } from '../../apps/web/src/server/app.js';
import type { Config } from '../../apps/web/src/server/config.js';

let db:Awaited<ReturnType<typeof testDatabase>>,server:Server,origin:string;
test.beforeAll(async()=>{
  db=await testDatabase();const port=await freePort();origin=`http://127.0.0.1:${port}`;
  const config:Config={nodeEnv:'test',port,origin,databaseUrl:'postgresql://test-only',databaseSsl:false,issuer:'https://accounts.google.com',clientId:'test-only',clientSecret:'test-only',redirectUri:`${origin}/auth/callback`};
  const uow=new PgJoinUnitOfWork(db.runtime);
  // Test IdP port only: exercises the real login transaction, Operator mapping and session routes.
  // Production main.ts always uses the Google provider; no bypass flag or test route is shipped.
  const provider={authorizationUrl:(login:{state:string})=>`${origin}/auth/callback?code=test-code&state=${login.state}`,
    verifyCallback:async(url:URL,login:{state:string})=>{if(url.searchParams.get('code')!=='test-code'||url.searchParams.get('state')!==login.state)throw new Error('Invalid test callback');return{issuer:'https://seed.example.invalid',subject:'development-operator'};}};
  const app=createApp(config,new PgIdentityStore(db.runtime),provider,pino({level:'silent'}),{commands:new JoinCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new JoinQueries(uow)});
  server=await new Promise<Server>(ok=>{const s=app.listen(port,'127.0.0.1',()=>ok(s));});
});
test.afterAll(async()=>{if(server)await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));await db?.close();});

test('document 15 browser acceptance: Login → JOIN → Verify → Commit → Person Fact → CompleteWork',async({page})=>{
  await page.goto(origin);
  await page.getByRole('link',{name:'Googleでログイン'}).click();
  await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();
  await page.getByLabel('対象者').selectOption({label:'田中 一郎'});
  await page.getByLabel('入社予定日').fill('2026-10-02');
  await page.getByRole('button',{name:'入社予定を登録',exact:true}).click();
  await expect(page.getByText('まだ判定していません。Workは作成されていません。')).toBeVisible();
  const eventId=page.url().split('/join/')[1]!;
  await page.getByRole('button',{name:'要件を評価',exact:true}).click();
  await expect(page.getByRole('heading',{name:'COMPANY_PC = REQUIRED',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'田中 一郎 — 会社PCの準備・割当',exact:true}).click();
  await expect(page.getByRole('heading',{name:'次のAction',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Why',exact:true})).toBeVisible();
  const workId=page.url().split('/work/')[1]!;
  await page.getByLabel('PC',{exact:true}).selectOption({label:'PC-0073'});
  await page.getByLabel('実施内容',{exact:true}).fill('資産ラベルと実機を照合して利用者へ割当済み');
  await page.getByLabel('実際の変更日時',{exact:true}).fill(new Date(Date.now()-60000).toISOString().slice(0,16));
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'割当を記録して変更を提案'}).click();
  await expect(page.getByRole('heading',{name:'変更提案（未確定）',exact:true})).toBeVisible();
  await expect(page.getByRole('complementary',{name:'Operational Context'}).getByText('利用PC: UNKNOWN — 未確認')).toBeVisible();
  await expect(page.getByRole('button',{name:'仕事を完了',exact:true})).toBeDisabled();
  await page.getByLabel('検証内容',{exact:true}).fill('実機とラベル、本人への割当を検証');
  await page.getByRole('button',{name:'変更を検証',exact:true}).click();
  await expect(page.getByRole('heading',{name:'検証済みの変更',exact:true})).toBeVisible();
  await expect(page.getByRole('complementary',{name:'Operational Context'}).getByText('利用PC: UNKNOWN — 未確認')).toBeVisible();
  await page.getByRole('button',{name:'変更を確定（Commit）',exact:true}).click();
  await expect(page.getByRole('heading',{name:'確定済みの変更',exact:true})).toBeVisible();
  const context=page.getByRole('complementary',{name:'Operational Context'});
  await expect(context.getByText('利用PC: PC-0073',{exact:true})).toBeVisible();
  await expect(context.getByText('FACT / VERIFIED',{exact:true})).toBeVisible();
  await context.getByText('検証と出典',{exact:true}).click();
  await expect(context.getByText(/^Source Change:/)).toBeVisible();
  await expect(context.getByText(/^Verified At:/)).toBeVisible();
  await page.getByRole('button',{name:'仕事を完了',exact:true}).click();
  await expect(page.getByText(/Owner: .*COMPLETED/)).toBeVisible();
  await page.getByRole('link',{name:'JOINへ戻る'}).click();
  await expect(page.getByTestId('readiness')).toHaveText('Device: Ready / VERIFIED');
  const timeline=page.getByRole('region',{name:'タイムライン'});
  for(const label of ['入社予定を登録','必要な対応を判定','必要な仕事を作成','割当の実施を記録','変更を提案','変更を検証','変更を確定','利用PCをFactとして登録','仕事を完了']) await expect(timeline.getByText(label,{exact:false}).first()).toBeVisible();
  await page.getByRole('link',{name:'Person Contextを開く'}).click();
  await expect(page.getByRole('heading',{name:'田中 一郎 / Person Context',exact:true})).toBeVisible();
  await expect(page.getByText('FACT / VERIFIED',{exact:true})).toBeVisible();
  // Persisted results, not UI-local success state.
  await page.reload();await expect(page.getByText('利用PC: PC-0073',{exact:true})).toBeVisible();
  expect((await db.admin.query('select status from factact.work where id=$1',[workId])).rows[0].status).toBe('COMPLETED');
  expect((await db.admin.query('select count(*)::int as n from factact.requirement_evaluations where event_id=$1',[eventId])).rows[0].n).toBe(1);
});
