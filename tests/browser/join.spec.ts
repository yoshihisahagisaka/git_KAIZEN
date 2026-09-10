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

test.beforeEach(async()=>{await db.reset();});

async function openPreparation(page:import('@playwright/test').Page) {
  await page.goto(origin);
  await page.getByRole('link',{name:'Googleでログイン'}).click();
  await expect(page.getByRole('heading',{name:'今、進めること',exact:true})).toBeVisible();
  await page.getByLabel('対象者',{exact:true}).selectOption({label:'田中 一郎'});
  await page.getByLabel('入社予定日').fill('2026-10-02');
  await page.getByRole('button',{name:'入社予定を登録',exact:true}).click();
  await expect(page.getByText('必要な準備はまだ確認していません。対応はまだ作成されていません。')).toBeVisible();
  const eventId=page.url().split('/join/')[1]!;
  await page.getByRole('button',{name:'必要な準備を確認',exact:true}).click();
  await expect(page.getByRole('heading',{name:'会社PCの準備が必要です',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'田中 一郎さんのPC準備',exact:true}).click();
  await expect(page.getByRole('heading',{name:'次にやること',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'なぜこの対応が必要？',exact:true})).toBeVisible();
  return {eventId,workId:page.url().split('/work/')[1]!};
}

test('document 15 + UX-GT-09,11–17: operator JOIN preparation through confirmed Person Fact',async({page})=>{
  const {eventId,workId}=await openPreparation(page);
  const context=page.getByRole('complementary',{name:'現在のIT利用状況'});
  await test.step('UX-GT-09 ownership and why me before execution',async()=>{
    const ownership=page.getByRole('region',{name:'担当と依頼元'});
    await expect(ownership.getByText('あなたの担当です',{exact:true})).toBeVisible();
    await expect(ownership.getByText(/^担当になった理由:/)).toBeVisible();
    await expect(ownership.getByText('依頼元: 田中 一郎さんの入社対応')).toBeVisible();
  });
  await test.step('UX-GT-11–14 procedure, configuration, differences and actionable unknowns',async()=>{
    await expect(page.getByRole('heading',{name:'必要な設定と手順'})).toBeVisible();
    await expect(page.getByText('OS・標準設定:',{exact:false})).toBeVisible();
    await page.getByText('入社PC準備の標準手順を見る',{exact:true}).click();
    await expect(page.getByText('FACTACT同梱デモ手順 / demo-v1',{exact:true})).toBeVisible();
    await expect(page.getByText('実環境の承認者・最終確認日: 未確認')).toBeVisible();
    await expect(page.getByRole('heading',{name:'今回の追加対応・未確認事項'})).toBeVisible();
    await expect(page.getByText('準備前に対象者とサービスの担当窓口へ、',{exact:false})).toBeVisible();
    await expect(context.getByText('追加設定・VPN利用要否: 未確認')).toBeVisible();
    await page.getByText('資産番号が一致しないとき',{exact:true}).click();
    await expect(page.getByText('同梱デモナレッジ / demo-v1',{exact:false})).toBeVisible();
  });
  await test.step('UX-GT-15–16 eligibility before selection; candidate is not a Fact',async()=>{
    await expect(page.getByText('候補に表示する理由:',{exact:false})).toBeVisible();
    await expect(page.getByText('利用可能な候補 / 実機と構成は未確認')).toBeVisible();
    await page.getByRole('button',{name:'PC-0073を準備対象にする',exact:true}).click();
    await expect(page.getByRole('heading',{name:'準備対象: PC-0073（まだ利用PCではありません）'})).toBeVisible();
    await expect(context.getByText('利用PC: 未確認',{exact:true})).toBeVisible();
    expect((await db.admin.query('select count(*)::int as n from factact.actions')).rows[0].n).toBe(0);
    expect((await db.admin.query('select count(*)::int as n from factact.relations')).rows[0].n).toBe(0);
    await page.reload();
    await expect(page.getByRole('heading',{name:'準備対象: PC-0073（まだ利用PCではありません）'})).not.toBeVisible();
    await page.getByRole('button',{name:'PC-0073を準備対象にする',exact:true}).click();
  });
  await page.screenshot({path:test.info().outputPath('work-preparation.png'),fullPage:true});
  await page.getByLabel('準備・引き渡しの実施内容',{exact:true}).fill('デモ: 実機ラベルと対象者を照合して準備・引き渡し済み');
  await page.getByLabel('実際の引き渡し日時',{exact:true}).fill(new Date(Date.now()-60000).toISOString().slice(0,16));
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'準備・引き渡しの実施内容を保存'}).click();
  await expect(page.getByRole('heading',{name:'実際の引き渡しを確認',exact:true})).toBeVisible();
  await expect(context.getByText('利用PC: 未確認',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'PC準備の対応を完了',exact:true})).toBeDisabled();
  await page.getByLabel('引き渡しを確認した方法・根拠',{exact:true}).fill('デモ: 実機・本人・引き渡し記録を照合');
  await page.getByRole('button',{name:'実際にPCを引き渡したことを確認',exact:true}).click();
  await expect(page.getByRole('heading',{name:'引き渡し確認済み・管理情報は未反映',exact:true})).toBeVisible();
  await expect(context.getByText('利用PC: 未確認',{exact:true})).toBeVisible();
  await test.step('UX-GT-17 reflect confirmed information without registry re-entry',async()=>{
    await expect(page.getByText('実施内容の再入力は不要です。',{exact:false})).toBeVisible();
    await page.getByRole('button',{name:'PC-0073を利用PCとして管理情報に反映',exact:true}).click();
    await expect(page.getByRole('heading',{name:'利用PCを管理情報に反映しました',exact:true})).toBeVisible();
    await expect(context.getByText('利用PC: PC-0073',{exact:true})).toBeVisible();
    await expect(context.getByText('確認済み',{exact:true})).toBeVisible();
    await expect(context.getByText('追加設定・VPN利用要否: 未確認')).toBeVisible();
    await context.getByText('確認根拠と出典',{exact:true}).click();
    await expect(context.getByText(/^Source Change:/)).toBeVisible();
    await expect(context.getByText('FACT / VERIFIED',{exact:true})).toBeVisible();
  });
  await page.getByRole('button',{name:'PC準備の対応を完了',exact:true}).click();
  await expect(page.getByText('PC準備の対応は完了しました',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'入社対応へ戻る'}).click();
  await expect(page.getByTestId('readiness')).toHaveText('利用PCは確認済みです');
  const timeline=page.getByRole('region',{name:'対応履歴'});
  for(const label of ['入社予定を登録','必要な準備を確認','PC準備の対応を作成','準備・引き渡しの実施を記録','管理情報への反映内容を作成','実際の引き渡しを確認','確認した内容を管理情報に反映','利用PCを確認済みの情報として登録','PC準備の対応を完了']) await expect(timeline.getByText(label,{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'対象者の利用状況を開く'}).click();
  await expect(page.getByRole('heading',{name:'田中 一郎さんの利用状況',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('利用PC: PC-0073',{exact:true})).toBeVisible();
  expect((await db.admin.query('select status from factact.work where id=$1',[workId])).rows[0].status).toBe('COMPLETED');
  expect((await db.admin.query('select count(*)::int as n from factact.requirement_evaluations where event_id=$1',[eventId])).rows[0].n).toBe(1);
});

test('UX-GT-09–10 responsibility differs from the current executor; unknown assignment source is explicit',async({page})=>{
  const {workId}=await openPreparation(page);
  // Read-projection fixture only. No alternate authentication or command behavior.
  await page.route(`**/api/work/${workId}`,async route=>{
    const response=await route.fetch(); const body=await response.json();
    body.data.ownerName='別の担当責任者';
    body.data.work.workOwnerOperatorId='20000000-0000-4000-8000-000000000099';
    body.data.work.nextActionOwnerOperatorId=body.data.work.workOwnerOperatorId;
    body.data.timeline=body.data.timeline.filter((e:{eventType:string})=>e.eventType!=='WORK_OWNERSHIP_SET');
    await route.fulfill({response,json:body});
  });
  await page.reload();
  const ownership=page.getByRole('region',{name:'担当と依頼元'});
  await expect(ownership.getByText('他の担当者が責任を持つ対応です')).toBeVisible();
  await expect(ownership.getByText('この対応の担当: 別の担当責任者')).toBeVisible();
  await expect(ownership.getByText(/^現在操作している人:/)).toBeVisible();
  await expect(ownership.getByText('操作を行っても、この対応の担当は自動では変わりません。')).toBeVisible();
  await expect(ownership.getByText('担当になった理由: 未確認')).toBeVisible();
  await expect(page.getByRole('button',{name:'この対応の担当を引き受ける'})).toBeVisible();
});

test('unknown guidance and unavailable candidates do not invent standards or recommendations',async({page})=>{
  const {workId}=await openPreparation(page);
  await page.route(`**/api/work/${workId}`,async route=>{
    const response=await route.fetch();const body=await response.json();
    body.data.work.contractProfileId='70000000-0000-4000-8000-000000000099';
    await route.fulfill({response,json:body});
  });
  await page.route('**/api/devices',route=>route.fulfill({json:{ok:true,data:[]}}));
  await page.reload();
  await expect(page.getByText('適用する標準設定・手順: 未確認。',{exact:false})).toBeVisible();
  await expect(page.getByText('入社PC準備の標準手順を見る',{exact:true})).not.toBeVisible();
  await expect(page.getByText('選べるPCがありません。',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'PC-0073を準備対象にする'})).not.toBeVisible();
});