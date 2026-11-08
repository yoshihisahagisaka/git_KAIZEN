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
test.use({timezoneId:'Asia/Tokyo'});
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
async function intake(page:import('@playwright/test').Page,mode:'START'|'RECEIVE_ONLY'='RECEIVE_ONLY'){
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'問い合わせ',exact:true}).click();
 await page.getByLabel('問い合わせ元',{exact:true}).selectOption({label:'田中 一郎'});
 await page.getByRole('textbox',{name:'問い合わせ内容'}).fill('会社PCでVPNにつながりません');
 await page.getByRole('button',{name:mode==='START'?'受付して対応を開始':'受付のみ',exact:true}).click();
 await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ'})).toBeVisible();
 return page.url().split('/support/')[1]!;
}
async function login(page:import('@playwright/test').Page){await page.goto(origin);await page.getByRole('link',{name:'Googleでログイン'}).click();await expect(page.getByRole('heading',{name:'今、進めること'})).toBeVisible();}

test('HR-UI: one-click intake starts the Work and preserves Event/Evaluation boundaries',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await login(page);const eventId=await intake(page,'START');
 await expect(page.getByRole('region',{name:'対応を記録'})).toBeVisible();
 await expect(page.getByRole('button',{name:'対応を開始',exact:true})).toHaveCount(0);
 const recorded=await db.admin.query('select count(*)::int n from factact.requirement_evaluations where support_event_id=$1',[eventId]);
 expect(recorded.rows[0].n).toBe(1);
 const work=await db.admin.query('select count(*)::int n from factact.work where support_event_id=$1',[eventId]);expect(work.rows[0].n).toBe(1);
 const sizes=await page.evaluate(()=>({body:parseFloat(getComputedStyle(document.body).fontSize),aside:parseFloat(getComputedStyle(document.querySelector('.support-context-desktop')!).fontSize)}));
 expect(sizes.body).toBeGreaterThanOrEqual(16);expect(sizes.aside).toBeGreaterThanOrEqual(16);
 await expect(page.getByRole('article',{name:'問い合わせ内容'})).toContainText('会社PCでVPNにつながりません');
});

test('service-first: unlisted company and new caller can start a normal Work',async({page})=>{
 await login(page);
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'問い合わせ',exact:true}).click();
 await page.getByLabel('所属・企業').selectOption('NEW');
 await page.getByLabel('新しい所属・企業名').fill('会員リスト未掲載のお客様');
 await page.getByLabel('問い合わせ者のお名前').fill('初回 問合');
 await page.getByRole('textbox',{name:'問い合わせ内容'}).fill('サポート窓口を教えてください');
 await page.getByRole('button',{name:'受付して対応を開始'}).click();
 await expect(page.getByRole('heading',{name:'初回 問合さんからの問い合わせ'})).toBeVisible();
 await expect(page.getByRole('region',{name:'対応を記録'})).toBeVisible();
 await expect(page.getByRole('article',{name:'問い合わせ内容'})).toContainText('受付時はリスト外・新規入力');
 await page.getByLabel('対応内容').fill('問い合わせへの回答を完了');
 await page.getByLabel('対応後の状態').selectOption('COMPLETED');
 await page.getByRole('button',{name:'対応を記録',exact:true}).click();
 const confirm=page.getByRole('dialog',{name:'対応完了の確認'});
 await confirm.getByLabel('終了理由').fill('回答済み');
 await confirm.getByLabel(/残る回答待ち/).check();
 await confirm.getByRole('button',{name:'確認して対応を終了'}).click();
 await expect(page.getByRole('status')).toHaveText('確認・案内の対応を完了しました');
});

test('SUPPORT V2 Golden Human Review: JOIN context, draft/back/review, outcome, correction and next inquiry',async({page})=>{
 await login(page);const eventId=await intake(page);
 const context=page.getByRole('complementary',{name:'対応アシスト'});
 await expect(context.getByRole('region',{name:'登録情報と今回の問合せ対象'})).toContainText('PC-0073');
 await expect(context.getByRole('region',{name:'登録情報と今回の問合せ対象'})).toContainText('未確認');
 await context.getByText('未確認の管理情報',{exact:true}).click();await expect(context.getByText('困っていることの詳細: 未確認',{exact:true})).toBeVisible();await context.getByText('未確認の管理情報',{exact:true}).click();
 await expect(page.getByRole('article',{name:'問い合わせ内容'}).getByText('会社PCでVPNにつながりません',{exact:true})).toBeVisible();
 await expect(page.getByText('本人から聞いた内容です。技術的な障害として確認済みではありません。')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:/PC/})).toHaveCount(0);
 await context.getByRole('button',{name:'利用PCの確認元',exact:true}).click();const source=page.getByRole('dialog',{name:'利用PCの確認元'});await expect(source.getByText('管理情報へ反映済み',{exact:false})).toBeVisible();await source.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await expect(page.getByRole('region',{name:'現在の対応状況'})).toContainText('担当');
 await expect(page.getByRole('list',{name:'対応の手順'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'確認リスト',exact:true})).toHaveCount(0);await expect(page.getByLabel('対応内容')).toBeVisible();await expect(page.getByLabel('対応後の状態')).toHaveValue('');
 await expect(page.getByRole('region',{name:'現在の対応状況'}).getByText('開発オペレーター',{exact:true})).toBeVisible();
 await expect(page.getByText('あなたがこの対応の担当です。',{exact:true})).toHaveCount(0);
 const entryRegion=page.getByRole('region',{name:'対応を記録'}),historyRegion=page.getByRole('region',{name:'問い合わせの対応履歴'});const entryBox=await entryRegion.boundingBox(),historyBox=await historyRegion.boundingBox();expect(entryBox!.y).toBeLessThan(historyBox!.y);await page.getByText('詳細・旧形式の操作',{exact:true}).click();const updatedHistoryBox=await historyRegion.boundingBox(),stateBox=await page.getByRole('region',{name:'対応状態の操作'}).boundingBox();expect(updatedHistoryBox!.y).toBeLessThan(stateBox!.y);
 const lifecycle=page.getByRole('region',{name:'対応状態の操作'}),waitingReason=lifecycle.getByRole('textbox',{name:'理由'}).first();await expect(waitingReason).toBeHidden();await lifecycle.getByText('回答・対応待ちにする',{exact:true}).click();await expect(waitingReason).toBeVisible();await lifecycle.getByText('回答・対応待ちにする',{exact:true}).click();
 await page.getByRole('button',{name:'デモ用参考手順を見る'}).click();const procedure=page.getByRole('dialog',{name:'デモ用参考手順を見る'});await expect(procedure.getByText('デモ用参考手順です。実運用で承認された手順ではありません。')).toBeVisible();await page.keyboard.press('Escape');await expect(procedure).toHaveCount(0);
 await page.getByLabel('対応内容').fill('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 const workUrl=page.url();await page.getByRole('button',{name:'対象者の現在の利用状況',exact:true}).click();
 const person=page.getByRole('dialog',{name:'対象者の現在の利用状況'});
 await expect(person.getByText('入社予定を登録',{exact:false})).toBeVisible();
 await expect(person.locator('pre:visible')).toHaveCount(0);
 await person.getByText('監査用の詳細',{exact:true}).click();
 await expect(person.locator('pre')).toContainText('JOIN_EVENT_CREATED');
 await person.getByRole('button',{name:'閉じる',exact:true}).click();
 await expect(page.getByRole('button',{name:'対象者の現在の利用状況',exact:true})).toBeFocused();
 expect(page.url()).toBe(workUrl);await expect(page.getByLabel('対応内容')).toHaveValue('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');
 await page.getByLabel('対応後の状態').selectOption('INVESTIGATING');await entryRegion.getByLabel('次回確認予定',{exact:true}).fill('2026-11-03T09:00');await page.getByRole('button',{name:'下書き保存',exact:true}).click();
 await expect(page.getByText('下書きを保存しました',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('対応内容')).toHaveValue('本人は今朝から接続不可と回答。VPN利用対象は契約窓口に確認中。');await expect(page.getByRole('region',{name:'対応を記録'}).getByLabel('次回確認予定',{exact:true})).toHaveValue('2026-11-03T09:00');
 await page.getByLabel('対応後の状態').selectOption('COMPLETED');
 await expect(page.getByText('対応の記録だけではWorkをCloseしません。',{exact:true})).toHaveCount(0);
 await expect(page.getByText(/WORKAROUND|ROOT_CAUSE|PERMANENT_RESOLUTION/)).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('support-v2-review.png'),fullPage:true});
 const recordButton=page.getByRole('button',{name:'対応を記録',exact:true}),workId=(await db.admin.query('select id from factact.work where support_event_id=$1',[eventId])).rows[0].id,beforeCancel=(await db.admin.query('select count(*)::int n from factact.support_work_records where work_id=$1',[workId])).rows[0].n;await recordButton.click();
 let close=page.getByRole('dialog',{name:'対応完了の確認'});await expect(close).toBeVisible();await expect(close.getByLabel('終了区分')).toBeFocused();await page.keyboard.press('Escape');await expect(close).toHaveCount(0);await expect(recordButton).toBeFocused();expect((await db.admin.query('select count(*)::int n from factact.support_work_records where work_id=$1',[workId])).rows[0].n).toBe(beforeCancel);await recordButton.click();close=page.getByRole('dialog',{name:'対応完了の確認'});await close.getByLabel('終了理由').fill('本人への案内を完了したため');await close.getByLabel(/残る回答待ち/).check();await close.getByRole('button',{name:'確認して対応を終了'}).click();
 await expect(page.getByRole('status')).toHaveText('確認・案内の対応を完了しました');
 const reopenButton=page.getByRole('button',{name:'対応中に戻す',exact:true});await reopenButton.click();let reopen=page.getByRole('dialog',{name:'対応中に戻す確認'});await expect(reopen.getByLabel('再開理由')).toBeFocused();await page.keyboard.press('Escape');await expect(reopen).toHaveCount(0);await expect(reopenButton).toBeFocused();await reopenButton.click();reopen=page.getByRole('dialog',{name:'対応中に戻す確認'});await reopen.getByLabel('再開理由').fill('同じ問い合わせの確認漏れ');await reopen.getByLabel('再開後の状態').selectOption('INVESTIGATING');await reopen.getByLabel('次回確認予定').fill('2026-11-04T09:00');const reopenAttempts:Array<{requestId:string}> = [];let failReopen=true;await page.route('**/api/support-work/*/reopen',async route=>{reopenAttempts.push(route.request().postDataJSON() as {requestId:string});if(failReopen){failReopen=false;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'一時的な通信失敗'}})});}else await route.continue();});const reopenSubmit=reopen.getByRole('button',{name:'確認して対応中に戻す'});await reopenSubmit.evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});await expect(page.getByRole('alert')).toHaveText('一時的な通信失敗');await expect(reopen).toBeVisible();await expect(reopen.getByLabel('再開理由')).toHaveValue('同じ問い合わせの確認漏れ');await expect(reopen.getByLabel('再開後の状態')).toHaveValue('INVESTIGATING');await expect(reopen.getByLabel('次回確認予定')).toHaveValue('2026-11-04T09:00');expect(reopenAttempts).toHaveLength(1);await reopenSubmit.click();await expect(page.getByRole('region',{name:'対応を記録'})).toBeVisible();expect(reopenAttempts).toHaveLength(2);expect(reopenAttempts[1]!.requestId).toBe(reopenAttempts[0]!.requestId);expect((await db.admin.query("select count(*)::int n from factact.support_work_lifecycle_events where work_id=$1 and kind='REOPENED'",[workId])).rows[0].n).toBe(1);await page.unroute('**/api/support-work/*/reopen');await expect(page.getByRole('region',{name:'現在の対応状況'})).toContainText('要調査');await expect(page.getByRole('region',{name:'問い合わせの対応履歴'}).getByText('対応中に戻しました',{exact:true})).toBeVisible();
 await page.getByLabel('対応内容').fill('再開後の確認を完了');await page.getByLabel('対応後の状態').selectOption('COMPLETED');await page.getByRole('button',{name:'対応を記録',exact:true}).click();close=page.getByRole('dialog',{name:'対応完了の確認'});await close.getByLabel('終了理由').fill('再確認を完了したため');await close.getByLabel(/残る回答待ち/).check();await close.getByRole('button',{name:'確認して対応を終了'}).click();await expect(page.getByRole('button',{name:'対応中に戻す',exact:true})).toBeVisible();expect((await db.admin.query('select close_sequence from factact.support_work_close_decisions where work_id=$1 order by close_sequence',[workId])).rows.map(x=>x.close_sequence)).toEqual([1,2]);
 const w=(await db.admin.query('select id,outcome from factact.work where support_event_id=$1',[eventId])).rows[0];
 expect(w.outcome).toBe('RESOLVED');
 expect((await db.admin.query('select count(*)::int as n from factact.knowledge_candidates')).rows[0].n).toBe(0);
 expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[w.id])).rows[0].n).toBe(0);
 expect((await db.admin.query("select id from factact.relations where status='ACTIVE'")).rows[0].id).toBe(relationId);
 await context.getByText('未確認の管理情報',{exact:true}).click();await expect(context.getByText('困っていることの詳細: 未確認',{exact:true})).toBeVisible();await context.getByText('未確認の管理情報',{exact:true}).click();
 const businessHistory=page.getByRole('region',{name:'問い合わせの対応履歴'});await expect(businessHistory.getByText('対応を記録しました',{exact:true}).first()).toBeVisible();const newest=await businessHistory.locator('li strong').allTextContents();
 await businessHistory.getByLabel('対応履歴の表示順').selectOption('oldest');expect(await businessHistory.locator('li strong').allTextContents()).toEqual([...newest].reverse());
 await intake(page);await page.getByRole('button',{name:'過去の関連する対応',exact:true}).click();
 const history=page.getByRole('dialog',{name:'過去の関連する対応'});
 await expect(history.getByText(/再開後の確認を完了/).first()).toBeVisible();await expect(history.locator('pre:visible')).toHaveCount(0);await history.getByText('対応の詳しい履歴と監査',{exact:true}).click();await expect(history.getByText(/本人は今朝から接続不可/).first()).toBeVisible();await history.getByText('監査用の詳細',{exact:true}).click();await expect(history.locator('pre:visible').first()).toBeVisible();await history.getByRole('button',{name:'閉じる',exact:true}).click();
 await expect(context.getByRole('region',{name:'登録情報と今回の問合せ対象'})).toContainText('PC-0073');
 expect((await db.admin.query('select count(*)::int n from factact.support_decisions where work_id=$1',[w.id])).rows[0].n).toBe(0);
});

test('UX-01 resizes both panes without losing input and keeps Context as a dialog on narrow screens',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await login(page);await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 const status=page.getByRole('region',{name:'現在の対応状況'}),work=page.getByRole('region',{name:'対応を記録'}),context=page.getByRole('complementary',{name:'対応アシスト'});await expect(status).toContainText('次にやること');await expect(status).toContainText('次回確認予定');
 const workBox=await work.boundingBox(),contextBox=await context.boundingBox();expect(workBox!.width).toBeGreaterThan(contextBox!.width*2.5);expect(workBox!.width).toBeLessThan(contextBox!.width*3.5);
 const divider=page.getByRole('separator',{name:'左右ペインの幅を調整'});await expect(divider).toBeVisible();await page.getByLabel('対応内容').fill('編集中の記録');await divider.press('ArrowLeft');const newWorkBox=await work.boundingBox();expect(newWorkBox!.width).toBeLessThan(workBox!.width);
 const gripBox=await divider.locator('span').boundingBox();await page.mouse.move(gripBox!.x+gripBox!.width/2,gripBox!.y+gripBox!.height/2);await page.mouse.down();await page.mouse.move(gripBox!.x-70,gripBox!.y+gripBox!.height/2,{steps:5});await page.mouse.up();const draggedWorkBox=await work.boundingBox();expect(draggedWorkBox!.width).toBeLessThan(newWorkBox!.width);await expect(page.getByLabel('対応内容')).toHaveValue('編集中の記録');
 await page.setViewportSize({width:800,height:900});await expect(context).toBeHidden();await expect(divider).toBeHidden();const open=page.getByRole('button',{name:'対応アシスト',exact:true});await expect(open).toBeVisible();await open.click();await expect(page.getByRole('dialog',{name:'対応アシスト'})).toContainText('登録情報');
 await expect(page.getByRole('dialog',{name:'対応アシスト'}).getByRole('region',{name:'登録情報と今回の問合せ対象'})).toBeVisible();
});

test('UX-02 records consecutive actions from a fresh form and keeps both history entries',async({page})=>{
 await login(page);const eventId=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 const entry=page.getByRole('region',{name:'対応を記録'}),history=page.getByRole('region',{name:'問い合わせの対応履歴'});let count=0;for(const text of ['1回目の対応','2回目の対応'] as const){await entry.getByLabel('対応内容').fill(text);await entry.getByLabel('対応後の状態').selectOption('INVESTIGATING');await entry.getByLabel('次回確認予定',{exact:true}).fill('2026-11-03T09:00');await entry.getByRole('button',{name:'対応を記録',exact:true}).click();await expect(history.getByText('対応を記録しました',{exact:true})).toHaveCount(++count);await expect(entry.getByLabel('対応内容')).toHaveValue('');await expect(entry.getByLabel('対応後の状態')).toHaveValue('');}
 const workId=(await db.admin.query('select id from factact.work where support_event_id=$1',[eventId])).rows[0].id;expect((await db.admin.query('select count(*)::int n from factact.support_work_records where work_id=$1',[workId])).rows[0].n).toBe(2);
});

test('legacy V1 keeps conditional correction fields and reference-knowledge operation',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()}),event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'V1互換確認'}),work=(await commands.evaluate(actor,event.id,'REQUIRED','V1互換確認')).work!;await db.admin.query('update factact.work set lifecycle_version=1 where id=$1',[work.id]);await commands.recordResolution(actor,work.id,{mode:'GUIDANCE_ONLY',diagnosticEvidence:'確認根拠',rationale:'案内が必要',actionSummary:'案内を実施'});
 await login(page);await page.goto(`${origin}/#/support/${event.id}`);await page.getByLabel('確認した内容と根拠').fill('確認した');await page.getByLabel('行った対応').selectOption('OTHER_GUIDANCE');await expect(page.getByLabel('対応の補足（必須）')).toBeVisible();await page.getByLabel('対応の補足（必須）').fill('個別案内');await page.getByLabel('標準外・追加対応なしの理由').fill('例外案内のため');await page.getByLabel('接続の結果').selectOption('UNCONFIRMED');await page.getByLabel('未確認の状況（必須）').fill('本人の回答待ち');await page.getByRole('button',{name:'問い合わせ対応を完了'}).click();await expect(page.getByRole('button',{name:'記録を訂正',exact:true})).toBeVisible();await page.getByRole('button',{name:'記録を訂正',exact:true}).click();await page.getByLabel('行った対応').selectOption('OTHER_GUIDANCE');await page.getByLabel('対応の補足（必須）').fill('訂正した個別案内');await page.getByLabel('標準外・追加対応なしの理由').fill('訂正後も例外案内');await page.getByLabel('接続の結果').selectOption('UNCONFIRMED');await page.getByLabel('未確認の状況（必須）').fill('引き続き回答待ち');await page.getByLabel('訂正理由').fill('記録内容の補正');await page.getByRole('button',{name:'訂正内容を確認'}).click();await page.getByRole('button',{name:'訂正履歴を保存'}).click();await expect(page.getByRole('region',{name:'問い合わせの対応履歴'})).toContainText('対応記録を訂正しました');
 await page.getByText('次の対応に役立つこと（任意・特になしで完了できます）',{exact:true}).click();await page.getByLabel('参考知識の見出し').fill('V1参考');await page.getByLabel('役立った内容・適用条件・限界').fill('V1の参考情報');await page.getByRole('button',{name:'参考知識の候補を保存'}).click();await expect(page.getByText('参考知識の候補として保存済みです。')).toBeVisible();expect((await db.admin.query('select count(*)::int n from factact.knowledge_candidates where source_work_id=$1',[work.id])).rows[0].n).toBe(1);
});

test('SUPPORT V2 exception and unknown paths remain explicit',async({page})=>{
 await login(page);const first=await intake(page);
 await page.getByText('対応せずに受付を閉じる',{exact:true}).click();
 await page.getByLabel('対応しない理由').fill('このサービスの受付範囲外');
 await page.getByRole('button',{name:'理由を残して受付を閉じる'}).click();
 await expect(page.getByRole('heading',{name:'対応は作成していません'})).toBeVisible();
 expect((await db.admin.query('select id from factact.work where support_event_id=$1',[first])).rows).toHaveLength(0);
 await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();const entry=page.getByRole('region',{name:'対応を記録'});await entry.getByLabel('対応内容').fill('本人に確認したが、結果の連絡はまだない。');await entry.getByLabel('対応後の状態').selectOption('CUSTOMER_WAIT');await expect(entry.getByRole('button',{name:'対応を記録',exact:true})).toBeDisabled();await entry.getByLabel('次回確認予定',{exact:true}).fill('2026-11-03T09:00');
 await page.getByRole('button',{name:'対応を記録',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('対応を記録しました');
});

test('Active Work Anchor keeps unsaved SUPPORT input across Explore and guards a different Work',async({page})=>{
 await login(page);const eventA=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();
 await page.getByLabel('対応内容').fill('保存前の確認内容');
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'探す',exact:true}).click();
 await expect(page.getByRole('heading',{name:'情報を探す',exact:true})).toBeVisible();
 const anchor=page.getByRole('complementary',{name:'現在の作業'});await expect(anchor).toContainText('田中 一郎さんからの問い合わせ');await expect(anchor).toContainText('問い合わせ対応');
 await page.getByLabel('検索語').fill('PC-0073');await page.getByRole('button',{name:'検索',exact:true}).click();await page.getByLabel('検索語').fill('田中');await page.getByRole('button',{name:'検索',exact:true}).click();
 await anchor.getByRole('link',{name:'作業に戻る',exact:true}).click();await expect(page.getByRole('heading',{name:'今回の対応を記録',exact:true})).toBeVisible();await expect(page.getByLabel('対応内容')).toHaveValue('保存前の確認内容');
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'探す',exact:true}).click();await page.goBack();await expect(page.getByLabel('対応内容')).toHaveValue('保存前の確認内容');await page.goForward();await expect(anchor.getByRole('link',{name:'作業に戻る',exact:true})).toBeVisible();
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});const eventB=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'別の問い合わせ'});await commands.evaluate(actor,eventB.id,'REQUIRED','別の確認が必要');
 page.once('dialog',dialog=>dialog.dismiss());await page.evaluate(id=>{location.hash=`/support/${id}`;},eventB.id);await expect(page.getByLabel('対応内容')).toHaveValue('保存前の確認内容');
 page.once('dialog',dialog=>dialog.accept());await page.evaluate(id=>{location.hash=`/support/${id}`;},eventB.id);await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ',exact:true})).toBeVisible();await expect(page.getByLabel('対応内容')).toHaveValue('');
 expect(eventA).not.toBe(eventB.id);
});

test('SUPPORT work opens Explore with an editable query without searching automatically',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});const source=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,serviceId:ids.service,symptom:'VPN検索用'});const sourceWork=(await commands.evaluate(actor,source.id,'REQUIRED','検索用')).work!;const decision=await commands.recordResolution(actor,sourceWork.id,{mode:'GUIDANCE_ONLY',diagnosticEvidence:'VPN',rationale:'検索用',actionSummary:'VPN案内'});await commands.saveKnowledge(actor,sourceWork.id,'VPN 関連情報','検索用のナレッジ候補');
 await login(page);await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();await page.getByLabel('対応内容').fill('保存しない入力');await page.getByRole('complementary',{name:'対応アシスト'}).getByRole('link',{name:'情報を探す',exact:true}).click();
 const query=page.getByLabel('検索語');await expect(query).toHaveValue('');await expect(page.getByRole('heading',{name:'検索結果'})).toHaveCount(0);await query.fill('田中');await page.getByRole('button',{name:'検索',exact:true}).click();let results=page.getByRole('region',{name:'検索結果'});await expect(results.getByText('仕事',{exact:true}).first()).toBeVisible();await query.fill('VPN');await page.getByRole('button',{name:'検索',exact:true}).click();results=page.getByRole('region',{name:'検索結果'});await expect(results.getByText('ナレッジ候補',{exact:true}).first()).toBeVisible();expect(decision).toBeTruthy();
 await page.getByRole('link',{name:'作業に戻る',exact:true}).click();await expect(page.getByLabel('対応内容')).toHaveValue('保存しない入力');
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

test('A1 compares Registry and current target as read-only MATCH, DIFFERENT or UNCONFIRMED',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
 await login(page);const eventId=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();await expect(page.getByRole('heading',{name:'今回の対応を記録',exact:true})).toBeVisible();
 const workId=(await db.admin.query('select id from factact.work where support_event_id=$1',[eventId])).rows[0].id,comparison=page.getByRole('region',{name:'登録情報と今回の問合せ対象'});
 await expect(comparison).toContainText('PC-0073');await expect(comparison.getByText('未確認',{exact:true})).toBeVisible();
 const before={relations:(await db.admin.query('select count(*)::int n from factact.relations')).rows[0].n,contexts:(await db.admin.query('select count(*)::int n from factact.support_work_device_contexts')).rows[0].n,audit:(await db.admin.query('select count(*)::int n from factact.audit_events')).rows[0].n};
 await page.reload();expect((await db.admin.query('select count(*)::int n from factact.relations')).rows[0].n).toBe(before.relations);expect((await db.admin.query('select count(*)::int n from factact.support_work_device_contexts')).rows[0].n).toBe(before.contexts);expect((await db.admin.query('select count(*)::int n from factact.audit_events')).rows[0].n).toBe(before.audit);
 await commands.confirmContextDevice(actor,workId,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});await page.reload();await expect(comparison.getByText('一致',{exact:true})).toBeVisible();
 const other=randomUUID();await db.admin.query("insert into factact.devices(id,tenant_id,asset_tag,display_name,device_status) values($1,$2,'PC-0099','Temporary PC','AVAILABLE')",[other,ids.tenant]);await commands.correctContextDevice(actor,workId,{requestId:randomUUID(),expectedRevision:1,deviceId:other,confirmationSource:'CALLER',reason:'本人が一時借用端末を使用'});await page.reload();await expect(comparison.getByText('異なる',{exact:true})).toBeVisible();await expect(comparison).toContainText('登録情報では【PC-0073】ですが、今回の対象は【PC-0099】です。');await expect(comparison).toContainText('最近交換・一時借用などはありましたか？');
});

test('A2 saves explicit comparison and caller statement without changing Registry',async({page})=>{
 const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),{id:randomUUID,now:()=>new Date().toISOString()});
 await login(page);const eventId=await intake(page);await page.getByRole('button',{name:'対応を開始',exact:true}).click();await expect(page.getByRole('region',{name:'対応を記録'})).toBeVisible();const workId=(await db.admin.query('select id from factact.work where support_event_id=$1',[eventId])).rows[0].id;await commands.confirmContextDevice(actor,workId,{requestId:randomUUID(),expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});await page.reload();
 const panel=page.getByRole('region',{name:'今回の対応対象'}),record=panel.getByRole('region',{name:'登録情報と今回の対象の確認記録'}),beforeRelations=(await db.admin.query('select * from factact.relations')).rows;
 type Attempt={requestId:string;kind:string;value:string;detail:string};const attempts:Attempt[]=[];let loseComparison=true,loseCaller=true;await page.route('**/api/support-work/*/context-target/observations',async route=>{const body=route.request().postDataJSON() as Attempt;attempts.push(body);if((body.kind==='REGISTRY_COMPARISON'&&loseComparison)||(body.kind==='CALLER_STATEMENT'&&loseCaller)){if(body.kind==='REGISTRY_COMPARISON')loseComparison=false;else loseCaller=false;const saved=await route.fetch();expect(saved.ok()).toBe(true);await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'応答を受信できませんでした'}})});return;}await route.continue();});
 await record.getByLabel('比較判断').selectOption('MATCH');const comparisonButton=record.getByRole('button',{name:'比較判断を記録'});await comparisonButton.dblclick();await expect(page.getByRole('alert')).toHaveText('応答を受信できませんでした');const failedComparisonAttempts=attempts.filter(x=>x.kind==='REGISTRY_COMPARISON');expect(new Set(failedComparisonAttempts.map(x=>x.requestId)).size).toBe(1);await expect(record.getByLabel('比較判断')).toHaveValue('MATCH');await comparisonButton.click();await expect(page.getByRole('region',{name:'問い合わせの対応履歴'}).getByText('登録情報との比較判断を記録しました',{exact:true})).toBeVisible();const comparisonAttempts=attempts.filter(x=>x.kind==='REGISTRY_COMPARISON');expect(new Set(comparisonAttempts.map(x=>x.requestId)).size).toBe(1);await expect(record.getByLabel('比較判断')).toHaveValue('UNKNOWN');
 await record.getByLabel('問い合わせ者から聞いた内容').fill('昨日、貸与PCを交換したと本人が申告');const callerButton=record.getByRole('button',{name:'申告を記録'});await callerButton.dblclick();await expect(page.getByRole('alert')).toHaveText('応答を受信できませんでした');const failedCallerAttempts=attempts.filter(x=>x.kind==='CALLER_STATEMENT');expect(new Set(failedCallerAttempts.map(x=>x.requestId)).size).toBe(1);await expect(record.getByLabel('問い合わせ者から聞いた内容')).toHaveValue('昨日、貸与PCを交換したと本人が申告');await callerButton.click();await expect(record.getByLabel('問い合わせ者から聞いた内容')).toHaveValue('');const firstCallerAttempts=attempts.filter(x=>x.kind==='CALLER_STATEMENT');expect(new Set(firstCallerAttempts.map(x=>x.requestId)).size).toBe(1);
 await record.getByLabel('問い合わせ者から聞いた内容').fill('交換日は昨日と本人が補足');await callerButton.click();await expect(record.getByLabel('問い合わせ者から聞いた内容')).toHaveValue('');const allCallerAttempts=attempts.filter(x=>x.kind==='CALLER_STATEMENT');expect(allCallerAttempts).toHaveLength(3);expect(allCallerAttempts[2]!.requestId).not.toBe(allCallerAttempts[1]!.requestId);await page.unroute('**/api/support-work/*/context-target/observations');
 await panel.getByText('対象の記録履歴を見る',{exact:true}).click();await expect(panel.getByText(/登録情報との比較判断: 一致/)).toBeVisible();await expect(panel.getByText(/問い合わせ者からの申告（未検証）: 未確認（昨日、貸与PCを交換したと本人が申告）/)).toBeVisible();
 const history=page.getByRole('region',{name:'問い合わせの対応履歴'});await expect(history.getByText('登録情報との比較判断を記録しました',{exact:true})).toBeVisible();await expect(history.getByText('問い合わせ者から聞いた内容を記録しました',{exact:true})).toHaveCount(2);await expect(history.getByText('問い合わせ者からの申告（未検証）',{exact:false}).first()).toBeVisible();
 expect((await db.admin.query('select * from factact.relations')).rows).toEqual(beforeRelations);expect((await db.admin.query('select count(*)::int n from factact.support_work_target_observations where work_id=$1',[workId])).rows[0].n).toBe(3);
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
 await expect(page.getByRole('heading',{name:'回答・対応待ち',exact:true}).locator('..')).toContainText('回答・対応待ち: 利用者 — 回答待ち');
 await expect(page.getByRole('heading',{name:'フォローが必要',exact:true}).locator('..')).toContainText('回答・対応待ちですが次回確認予定が未設定です');
 await expect(page.getByRole('heading',{name:'担当確認が必要',exact:true}).locator('..')).toContainText('該当する対応はありません。');
 await page.getByRole('heading',{name:'フォローが必要',exact:true}).locator('..').getByRole('link',{name:'田中 一郎さんの問い合わせ'}).click();
 await expect(page.getByRole('heading',{name:'田中 一郎さんからの問い合わせ',exact:true})).toBeVisible();
 expect((await db.admin.query('select count(*)::int n from factact.audit_events')).rows[0].n).toBe(beforeAudit);
 expect((await db.admin.query('select waiting,status,work_owner_operator_id from factact.work where id=$1',[work.id])).rows[0]).toEqual({waiting:true,status:'IN_PROGRESS',work_owner_operator_id:actor.id});
});
