import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import {SupportQueries} from '../../packages/application/src/support-queries.js';
import {ids} from '../fixtures/database.js';
import type {Operator} from '../../packages/domain/src/operator.js';
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
  const app=createApp(config,new PgIdentityStore(db.runtime),provider,pino({level:'silent'}),{commands:new JoinCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new JoinQueries(uow)},{commands:new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()}),queries:new SupportQueries(new PgSupportUnitOfWork(db.runtime))});
  server=await new Promise<Server>(ok=>{const s=app.listen(port,'127.0.0.1',()=>ok(s));});
});
test.afterAll(async()=>{if(server)await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));await db?.close();});

const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Demo',tenantName:'Demo',roles:['ADMIN','OPERATOR','REVIEWER']};
let relationId:string,joinWorkId:string;
test.beforeEach(async()=>{
 await db.reset();const c=new JoinCommands(new PgJoinUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
 const e=await c.createJoinEvent(actor,{personId:ids.person,organizationId:ids.organization,serviceId:ids.service,joinDate:'2026-10-02'});
 const evaluation=await c.evaluateJoinRequirements(actor,e.eventId);joinWorkId=evaluation.works[0]!.id;
 const proposal=await c.startAssignDeviceAction(actor,{workId:joinWorkId,deviceId:ids.device,executionSummary:'デモ: 実機照合・引き渡し済み',effectiveFrom:new Date(Date.now()-60000).toISOString()});
 await c.verifyChange(actor,proposal.changeId,'デモ: 引き渡し確認済み');relationId=(await c.commitChange(actor,proposal.changeId)).id;
});
async function intake(page:import('@playwright/test').Page){
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'問い合わせ',exact:true}).click();
 await page.getByLabel('問い合わせ元',{exact:true}).selectOption({label:'田中 一郎'});
 await page.getByLabel('本人からの申告',{exact:true}).fill('会社PCでVPNにつながりません');
 await page.getByRole('button',{name:'問い合わせを記録',exact:true}).click();
 await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ'})).toBeVisible();
 return page.url().split('/support/')[1]!;
}
async function login(page:import('@playwright/test').Page){await page.goto(origin);await page.getByRole('link',{name:'Googleでログイン'}).click();await expect(page.getByRole('heading',{name:'今、進めること'})).toBeVisible();}

test('SUPPORT V2 Golden Human Review: JOIN context, draft/back/review, outcome, correction and next inquiry',async({page})=>{
 await login(page);const eventId=await intake(page);
 const context=page.getByRole('complementary',{name:'確認済みの現在の利用状況'});
 await expect(context.getByRole('heading',{name:'利用PC: PC-0073'})).toBeVisible();
 await expect(context.getByText('確認済み',{exact:true})).toBeVisible();
 await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();
 await expect(page.getByRole('article',{name:'本人からの申告'}).getByText('会社PCでVPNにつながりません',{exact:true})).toBeVisible();
 await expect(page.getByText('本人から聞いた内容です。技術的な障害として確認済みではありません。')).toBeVisible();
 await expect(page.getByRole('textbox',{name:/PC/})).toHaveCount(0);
 await context.getByText('利用PCの確認元',{exact:true}).click();await expect(context.getByText(`Relation: ${relationId}`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await expect(page.getByText('あなたの担当です',{exact:true})).toBeVisible();
 await expect(page.getByText('担当になった理由: 対応を開始した担当者として登録されています。')).toBeVisible();
 await expect(page.getByRole('textbox',{name:/理由/})).toHaveCount(0);
 await page.getByText('標準の確認手順を見る',{exact:true}).click();
 await expect(page.getByText('同梱デモ手順 / support-demo-v2',{exact:false})).toBeVisible();
 await page.getByLabel('確認した内容と根拠').fill('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 await page.getByRole('button',{name:'下書き保存',exact:true}).click();
 await expect(page.getByText('下書きを保存しました',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await page.getByLabel('行った対応',{exact:true}).selectOption('RESTART_GUIDANCE');
 await page.getByLabel('実際に行ったこと',{exact:true}).fill('本人にPC再起動を案内し、再起動したとの回答を得た。');
 await expect(page.getByRole('textbox',{name:/理由/})).toHaveCount(0);
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await page.getByLabel('接続の結果',{exact:true}).selectOption('CONNECTED');
 await page.getByLabel('結果の確認元',{exact:true}).selectOption('CALLER');
 await page.getByLabel('結果をどう確認したか').fill('本人から接続できたとの回答。');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await expect(page.getByText('次の対応に役立つこと: 特になし',{exact:false})).toBeVisible();
 await expect(page.getByText(/WORKAROUND|ROOT_CAUSE|PERMANENT_RESOLUTION/)).toHaveCount(0);
 await page.getByRole('button',{name:'戻る',exact:true}).click();
 await page.getByLabel('結果をどう確認したか').fill('本人から「再起動後に接続できた」と回答。');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await page.screenshot({path:test.info().outputPath('support-v2-review.png'),fullPage:true});
 await page.getByRole('button',{name:'問い合わせ対応を完了',exact:true}).click();
 await expect(page.getByText('確認・案内の対応を完了しました',{exact:true})).toBeVisible();
 const w=(await db.admin.query('select id,outcome from factact.work where support_event_id=$1',[eventId])).rows[0];
 expect(w.outcome).toBe('COMPLETED');
 expect((await db.admin.query('select count(*)::int as n from factact.knowledge_candidates')).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query("select id from factact.relations where status='ACTIVE'")).rows[0].id).toBe(relationId);
 await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'記録を訂正',exact:true}).click();
 await page.getByLabel('結果をどう確認したか').fill('本人から接続できたと回答。確認時刻は10:15。');
 await page.getByLabel('訂正理由',{exact:true}).fill('確認時刻の記載漏れ');
 await page.getByRole('button',{name:'訂正内容を確認'}).click();
 await page.getByRole('button',{name:'訂正履歴を保存'}).click();
 await expect(page.getByRole('button',{name:'記録を訂正',exact:true})).toBeVisible();
 await page.getByText('監査用の詳細',{exact:true}).click();
 await expect(page.getByText('元の確認根拠:',{exact:false})).toContainText('再起動後に接続できた');
 await intake(page);
 const history=page.getByRole('region',{name:'過去の関連する対応'});
 await expect(history.getByText('PC再起動を案内：',{exact:false})).toBeVisible();
 await expect(history.getByText('本人から接続できたと回答。確認時刻は10:15。',{exact:true})).toBeVisible();
 await expect(history.getByText('訂正後の記録',{exact:false})).toBeVisible();
 await expect(context.getByRole('heading',{name:'利用PC: PC-0073'})).toBeVisible();
 // Optional V1 candidate creation and provenance are still usable after completion.
 await page.goto(`${origin}/#/support/${eventId}`);
 await page.getByText('次の対応に役立つこと（任意・特になしで完了できます）',{exact:true}).click();
 await page.getByLabel('参考知識の見出し').fill('VPN案内前に利用対象の根拠を確認');
 await page.getByLabel('役立った内容・適用条件・限界').fill('確認対象の参考。恒久的な解決の認定ではない。');
 await page.getByRole('button',{name:'参考知識の候補を保存'}).click();
 await page.getByText('参考知識を見る',{exact:true}).click();
 await expect(page.getByText('参考知識の候補 / 未承認 — 適用ルールではありません')).toBeVisible();
 await page.getByText('元の対応・確認根拠',{exact:true}).click();
 await expect(page.getByText(`Work: ${w.id}`,{exact:true})).toBeVisible();
});

test('SUPPORT V2 exception and unknown paths remain explicit',async({page})=>{
 await login(page);const first=await intake(page);
 await page.getByText('対応せずに受付を閉じる',{exact:true}).click();
 await page.getByLabel('対応しない理由').fill('このサービスの受付範囲外');
 await page.getByRole('button',{name:'理由を残して受付を閉じる'}).click();
 await expect(page.getByRole('heading',{name:'対応は作成していません'})).toBeVisible();
 expect((await db.admin.query('select id from factact.work where support_event_id=$1',[first])).rows).toHaveLength(0);
 await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await page.getByLabel('確認した内容と根拠').fill('本人に確認したが、結果の連絡はまだない。');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await page.getByLabel('行った対応',{exact:true}).selectOption('NO_ACTION_REQUIRED');
 await expect(page.getByLabel('標準外・追加対応なしの理由')).toBeVisible();
 await page.getByLabel('実際に行ったこと',{exact:true}).fill('本人へ状況を確認した。');
 await page.getByLabel('標準外・追加対応なしの理由').fill('本人が追加の案内は不要と回答。');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await expect(page.getByLabel('接続の結果',{exact:true})).toHaveValue('UNCONFIRMED');
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 await page.getByRole('button',{name:'問い合わせ対応を完了',exact:true}).click();
 await expect(page.getByText('調査完了・追加対応不要',{exact:true})).toBeVisible();
});
