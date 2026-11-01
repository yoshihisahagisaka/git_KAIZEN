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
import { PgExploreSearchUnitOfWork } from '../../apps/web/src/server/persistence/explore-repository.js';
import { ExploreQueries } from '../../packages/application/src/explore-queries.js';
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
  const app=createApp(config,new PgIdentityStore(db.runtime),provider,pino({level:'silent'}),{commands:new JoinCommands(uow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new JoinQueries(uow)},{commands:new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()}),queries:new SupportQueries(new PgSupportUnitOfWork(db.runtime))},{queries:new ExploreQueries(new PgExploreSearchUnitOfWork(db.runtime))});
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
 await context.getByText('未確認の管理情報',{exact:true}).click();await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();await context.getByText('未確認の管理情報',{exact:true}).click();
 await expect(page.getByRole('article',{name:'本人からの申告'}).getByText('会社PCでVPNにつながりません',{exact:true})).toBeVisible();
 await expect(page.getByText('本人から聞いた内容です。技術的な障害として確認済みではありません。')).toBeVisible();
 await expect(page.getByRole('textbox',{name:/PC/})).toHaveCount(0);
 await context.getByRole('button',{name:'利用PCの確認元',exact:true}).click();const source=page.getByRole('dialog',{name:'利用PCの確認元'});await expect(source.getByText('管理情報へ反映済み',{exact:false})).toBeVisible();await source.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await expect(page.getByRole('region',{name:'現在の対応状況'})).toContainText('担当');
 await expect(page.getByRole('list',{name:'対応の手順'})).toHaveCount(0);
 for(const heading of ['確認リスト','確認したこと','行った対応','対応結果'])await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'現在の対応状況'}).getByText('開発オペレーター',{exact:true})).toBeVisible();
 await expect(page.getByText('あなたがこの対応の担当です。',{exact:true})).toBeVisible();
 await expect(page.getByRole('textbox',{name:/理由/})).toHaveCount(0);
 await page.getByRole('button',{name:'デモ用参考手順を見る'}).click();const procedure=page.getByRole('dialog',{name:'デモ用参考手順を見る'});await expect(procedure.getByText('デモ用参考手順です。実運用で承認された手順ではありません。')).toBeVisible();await page.keyboard.press('Escape');await expect(procedure).toHaveCount(0);
 await page.getByLabel('確認した内容と根拠').fill('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 const workUrl=page.url();await page.getByRole('button',{name:'対象者の現在の利用状況',exact:true}).click();
 const person=page.getByRole('dialog',{name:'対象者の現在の利用状況'});
 await expect(person.getByText('入社予定を登録',{exact:false})).toBeVisible();
 await expect(person.locator('pre:visible')).toHaveCount(0);
 await person.getByText('監査用の詳細',{exact:true}).click();
 await expect(person.locator('pre')).toContainText('JOIN_EVENT_CREATED');
 await person.getByRole('button',{name:'閉じる',exact:true}).click();
 await expect(page.getByRole('button',{name:'対象者の現在の利用状況',exact:true})).toBeFocused();
 expect(page.url()).toBe(workUrl);await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 await page.getByRole('button',{name:'下書き保存',exact:true}).click();
 await expect(page.getByText('下書きを保存しました',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 await page.getByLabel('行った対応',{exact:true}).selectOption('RESTART_GUIDANCE');
 await expect(page.getByLabel('対応の補足（任意）')).toHaveValue('');
 await expect(page.getByRole('textbox',{name:/理由/})).toHaveCount(0);
 await page.getByLabel('接続の結果',{exact:true}).selectOption('CONNECTED');
 await page.getByLabel('結果の確認元',{exact:true}).selectOption('CALLER');
 await expect(page.getByLabel('結果の補足（任意）')).toHaveValue('');
 await expect(page.getByText('対応の記録だけではWorkをCloseしません。',{exact:true})).toBeVisible();
 await expect(page.getByText(/WORKAROUND|ROOT_CAUSE|PERMANENT_RESOLUTION/)).toHaveCount(0);
 await page.getByLabel('結果の補足（任意）').fill('本人から「再起動後に接続できた」と回答。');
 await page.screenshot({path:test.info().outputPath('support-v2-review.png'),fullPage:true});
 await page.getByRole('button',{name:'対応を記録',exact:true}).click();
 await expect(page.getByText('対応を記録しました。Closeは責任状態から明示してください。',{exact:true})).toBeVisible();
 await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('');
 await expect(page.getByLabel('対応の補足（任意）')).toHaveValue('');
 const lifecycle=page.getByRole('region',{name:'対応の責任状態'});await lifecycle.getByText('対応をCloseする',{exact:true}).click();await lifecycle.getByLabel('Close理由').fill('本人への案内を完了したため');await lifecycle.getByLabel('根拠').fill('担当者が結果を確認');await lifecycle.getByRole('button',{name:'対応をClose',exact:true}).click();await expect(lifecycle.getByText('解決としてCloseしました / 本人への案内を完了したため')).toBeVisible();
 const w=(await db.admin.query('select id,outcome from factact.work where support_event_id=$1',[eventId])).rows[0];
 expect(w.outcome).toBe('RESOLVED');
 expect((await db.admin.query('select count(*)::int as n from factact.knowledge_candidates')).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query("select id from factact.relations where status='ACTIVE'")).rows[0].id).toBe(relationId);
 await context.getByText('未確認の管理情報',{exact:true}).click();await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();await context.getByText('未確認の管理情報',{exact:true}).click();
 await page.getByRole('button',{name:'記録を訂正',exact:true}).click();
 await page.getByLabel('結果の補足（任意）').fill('本人から接続できたと回答。確認時刻は10:15。');
 await page.getByLabel('訂正理由',{exact:true}).fill('確認時刻の記載漏れ');
 await page.getByRole('button',{name:'訂正内容を確認'}).click();
 await page.getByRole('button',{name:'訂正履歴を保存'}).click();
 await expect(page.getByRole('button',{name:'記録を訂正',exact:true})).toBeVisible();
 const businessHistory=page.getByRole('region',{name:'問い合わせの対応履歴'});await expect(businessHistory.getByText('対応記録を訂正しました',{exact:true})).toBeVisible();const newest=await businessHistory.locator('li strong').allTextContents();
 await businessHistory.getByLabel('対応履歴の表示順').selectOption('oldest');expect(await businessHistory.locator('li strong').allTextContents()).toEqual([...newest].reverse());
 await page.getByText('監査用の詳細',{exact:true}).click();
 await expect(page.getByText('元の確認根拠:',{exact:false})).toContainText('再起動後に接続できた');
 await intake(page);await page.getByRole('button',{name:'過去の関連する対応',exact:true}).click();
 const history=page.getByRole('dialog',{name:'過去の関連する対応'});
 await expect(history.getByText('PC再起動を案内',{exact:true}).first()).toBeVisible();
 await expect(history.getByText('本人から接続できたと回答。確認時刻は10:15。',{exact:true}).first()).toBeVisible();
 await expect(history.getByText('訂正後の記録',{exact:false})).toBeVisible();await expect(history.locator('pre:visible')).toHaveCount(0);await history.getByText('対応の詳しい履歴と監査',{exact:true}).click();await history.getByText('監査用の詳細',{exact:true}).click();await expect(history.locator('pre:visible').first()).toBeVisible();await history.getByRole('button',{name:'閉じる',exact:true}).click();
 await expect(context.getByRole('heading',{name:'利用PC: PC-0073'})).toBeVisible();
 // Optional V1 candidate creation and provenance are still usable after completion.
 await page.goto(`${origin}/#/support/${eventId}`);
 await page.getByText('次の対応に役立つこと（任意・特になしで完了できます）',{exact:true}).click();
 await page.getByLabel('参考知識の見出し').fill('VPN案内前に利用対象の根拠を確認');
 await page.getByLabel('役立った内容・適用条件・限界').fill('確認対象の参考。恒久的な解決の認定ではない。');
 await page.getByRole('button',{name:'参考知識の候補を保存'}).click();
 await page.getByRole('button',{name:'参考知識を見る',exact:true}).click();
 await expect(page.getByText('参考知識の候補 / 未承認 — 適用ルールではありません')).toBeVisible();
 await page.getByText('元の対応・確認根拠',{exact:true}).click();
 await expect(page.getByText(`Work: ${w.id}`,{exact:true})).toBeVisible();
});

test('UX-01 uses a wide Work surface and keeps Context available as a dialog on narrow screens',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await login(page);await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 const status=page.getByRole('region',{name:'現在の対応状況'}),work=page.getByRole('region',{name:'対応を記録'}),context=page.getByRole('complementary',{name:'確認済みの現在の利用状況'});await expect(status).toContainText('次にやること');await expect(status).toContainText('Follow-up');
 const workBox=await work.boundingBox(),contextBox=await context.boundingBox();expect(workBox!.width).toBeGreaterThan(contextBox!.width*2);
 await page.setViewportSize({width:800,height:900});await expect(context).toBeHidden();const open=page.getByRole('button',{name:'判断のための参照情報',exact:true});await expect(open).toBeVisible();await open.click();await expect(page.getByRole('dialog',{name:'判断のための参照情報'})).toContainText('本人からの申告');
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
 await page.getByLabel('行った対応',{exact:true}).selectOption('OTHER_GUIDANCE');
 await expect(page.getByLabel('対応の補足（必須）')).toBeVisible();
 await expect(page.getByLabel('接続の結果',{exact:true})).toBeVisible();
 await page.getByLabel('行った対応',{exact:true}).selectOption('NO_ACTION_REQUIRED');
 await expect(page.getByLabel('標準外・追加対応なしの理由')).toBeVisible();
 await page.getByLabel('対応の補足（任意）').fill('本人へ状況を確認した。');
 await page.getByLabel('標準外・追加対応なしの理由').fill('本人が追加の案内は不要と回答。');
 await expect(page.getByLabel('接続の結果',{exact:true})).toHaveValue('UNCONFIRMED');await expect(page.getByLabel('未確認の状況（必須）')).toBeVisible();await page.getByLabel('未確認の状況（必須）').fill('本人から結果の連絡待ち。');
 await page.getByRole('button',{name:'対応を記録',exact:true}).click();
 await expect(page.getByText('対応を記録しました。Closeは責任状態から明示してください。',{exact:true})).toBeVisible();
});

test('Active Work Anchor keeps unsaved SUPPORT input across Explore and guards a different Work',async({page})=>{
 await login(page);const eventA=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await page.getByLabel('確認した内容と根拠').fill('保存前の確認内容');
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'探す',exact:true}).click();
 await expect(page.getByRole('heading',{name:'情報を探す',exact:true})).toBeVisible();
 const anchor=page.getByRole('complementary',{name:'現在の作業'});await expect(anchor).toContainText('田中 一郎さんからの問い合わせ');await expect(anchor).toContainText('問い合わせ対応');
 await page.getByLabel('検索語').fill('PC-0073');await page.getByRole('button',{name:'検索',exact:true}).click();await page.getByLabel('検索語').fill('田中');await page.getByRole('button',{name:'検索',exact:true}).click();
 await anchor.getByRole('link',{name:'作業に戻る',exact:true}).click();await expect(page.getByRole('heading',{name:'今回の対応を記録',exact:true})).toBeVisible();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('保存前の確認内容');
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'探す',exact:true}).click();await page.goBack();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('保存前の確認内容');await page.goForward();await expect(anchor.getByRole('link',{name:'作業に戻る',exact:true})).toBeVisible();
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});const eventB=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'別の問い合わせ'});await commands.evaluate(actor,eventB.id,'REQUIRED','別の確認が必要');
 page.once('dialog',dialog=>dialog.dismiss());await page.evaluate(id=>{location.hash=`/support/${id}`;},eventB.id);await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('保存前の確認内容');
 page.once('dialog',dialog=>dialog.accept());await page.evaluate(id=>{location.hash=`/support/${id}`;},eventB.id);await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ',exact:true})).toBeVisible();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('');
 expect(eventA).not.toBe(eventB.id);
});

test('SUPPORT work opens Explore with an editable query without searching automatically',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});const source=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'VPN検索用'});const sourceWork=(await commands.evaluate(actor,source.id,'REQUIRED','検索用')).work!;const decision=await commands.recordResolution(actor,sourceWork.id,{mode:'GUIDANCE_ONLY',diagnosticEvidence:'VPN',rationale:'検索用',actionSummary:'VPN案内'});await commands.saveKnowledge(actor,sourceWork.id,'VPN 関連情報','検索用のナレッジ候補');
 await login(page);await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();await page.getByLabel('確認した内容と根拠').fill('保存しない入力');await page.getByRole('link',{name:'関連情報を探す',exact:true}).click();
 const query=page.getByLabel('検索語');await expect(query).toHaveValue('VPN');await expect(page.getByRole('heading',{name:'検索結果'})).toHaveCount(0);await query.fill('VPN');await page.getByRole('button',{name:'検索',exact:true}).click();const results=page.getByRole('region',{name:'検索結果'});await expect(results.getByText('仕事',{exact:true}).first()).toBeVisible();await expect(results.getByText('ナレッジ候補',{exact:true}).first()).toBeVisible();expect(decision).toBeTruthy();
 await page.getByRole('link',{name:'作業に戻る',exact:true}).click();await expect(page.getByLabel('確認した内容と根拠')).toHaveValue('保存しない入力');
});

test('SUPPORT Device Work Context requires an explicit Work-side confirmation and preserves Registry',async({page})=>{
 await login(page);const eventId=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 const before=(await db.admin.query('select * from factact.relations')).rows;
 await page.getByRole('link',{name:'機器を探す',exact:true}).click();await page.getByLabel('検索語').fill('PC-0073');await page.getByRole('button',{name:'検索',exact:true}).click();
 await page.getByRole('link',{name:'この端末を今回の対象候補として作業へ戻る',exact:true}).click();
 await expect(page.getByText('検索結果を見ただけでは記録されません。今回の対応対象として明示的に記録してください。')).toBeVisible();
 await page.getByRole('button',{name:'今回の対象として記録',exact:true}).click();
 await expect(page.getByRole('region',{name:'今回の対応対象'}).locator('strong')).toHaveText('PC-0073');
 expect((await db.admin.query('select * from factact.relations')).rows).toEqual(before);
 expect((await db.admin.query('select count(*)::int as n from factact.support_work_device_contexts c join factact.work w on w.id=c.work_id where w.support_event_id=$1',[eventId])).rows[0].n).toBe(1);
});

test('completed SUPPORT Work shows Device Context history without edit controls',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'completed context'});const work=(await commands.evaluate(actor,event.id,'REQUIRED','review')).work!;await db.admin.query('update factact.work set lifecycle_version=1 where id=$1',[work.id]);await commands.confirmContextDevice(actor,work.id,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});await commands.recordWork(actor,work.id,{requestId:randomUUID(),expectedRevision:0,kind:'COMPLETION',notes:{checks:'確認',action:'RESTART_GUIDANCE',actionDetails:'',result:'CONNECTED',resultSource:'CALLER',resultDetails:'',exceptionReason:''},correctionReason:''});
 await login(page);await page.goto(`${origin}/#/support/${event.id}`);const context=page.getByRole('region',{name:'今回の対応対象'});await expect(context.locator('strong')).toHaveText('PC-0073');await expect(context.getByText('完了した対応の対象記録です。表示のみで変更できません。')).toBeVisible();await expect(context.getByRole('link',{name:'機器を探す'})).toHaveCount(0);await expect(context.getByRole('button',{name:/対象/})).toHaveCount(0);
});

test('SUPPORT records an unidentified target explicitly without creating Registry facts',async({page})=>{
 await login(page);const eventId=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 const before=(await db.admin.query('select * from factact.relations')).rows;
 const panel=page.getByRole('region',{name:'今回の対応対象'});await panel.getByLabel('未特定の状況（任意）').fill('管理番号は未確認');await panel.getByRole('button',{name:'対象は未特定として記録',exact:true}).click();
 await expect(panel.getByText('今回の対象は未特定として記録されています。未特定のまま対応を続けられます。')).toBeVisible();await expect(panel.getByText('サポート可否: 未評価（適用Ruleが未登録です）')).toBeVisible();
 expect((await db.admin.query('select * from factact.relations')).rows).toEqual(before);expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=(select id from factact.work where support_event_id=$1)',[eventId])).rows[0].n).toBe(0);
});

test('Responsibility management shows explainable My Work, Waiting and follow-up views without mutation',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
 const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'回答待ちの問い合わせ'});
 const work=(await commands.evaluate(actor,event.id,'REQUIRED','確認が必要')).work!;
 await commands.setWaiting(actor,work.id,{requestId:randomUUID(),expectedRevision:0,party:'利用者',reason:'回答待ち',nextAction:'利用者へ確認する'});
 const beforeAudit=(await db.admin.query('select count(*)::int n from factact.audit_events')).rows[0].n;
 await login(page);await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'対応管理',exact:true}).click();
 await expect(page.getByRole('heading',{name:'対応管理',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'自分の対応',exact:true}).locator('..')).toContainText('田中 一郎さんの問い合わせ');
 await expect(page.getByRole('heading',{name:'Waiting',exact:true}).locator('..')).toContainText('Waiting: 利用者 — 回答待ち');
 await expect(page.getByRole('heading',{name:'フォローが必要',exact:true}).locator('..')).toContainText('Waiting中ですがFollow-upが未設定です');
 await expect(page.getByRole('heading',{name:'担当確認が必要',exact:true}).locator('..')).toContainText('該当する対応はありません。');
 await page.getByRole('heading',{name:'フォローが必要',exact:true}).locator('..').getByRole('link',{name:'田中 一郎さんの問い合わせ'}).click();
 await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ',exact:true})).toBeVisible();
 expect((await db.admin.query('select count(*)::int n from factact.audit_events')).rows[0].n).toBe(beforeAudit);
 expect((await db.admin.query('select waiting,status,work_owner_operator_id from factact.work where id=$1',[work.id])).rows[0]).toEqual({waiting:true,status:'IN_PROGRESS',work_owner_operator_id:actor.id});
});
