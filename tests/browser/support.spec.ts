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
async function triage(page:import('@playwright/test').Page){await page.getByLabel('対応が必要・不要と判断した理由').fill('VPN利用対象と症状を確認して案内する必要がある');await page.getByRole('button',{name:'対応の必要性と担当を記録'}).click();await expect(page.getByText('あなたの担当です',{exact:true})).toBeVisible();}
test('SUPPORT-UX-01–08: reuse JOIN Fact, investigate reported symptoms, preserve learning for next inquiry',async({page})=>{
 await login(page);const eventId=await intake(page);
 const context=page.getByRole('complementary',{name:'確認済みの現在の利用状況'});
 await expect(context.getByRole('heading',{name:'利用PC: PC-0073'})).toBeVisible();
 await expect(context.getByText('確認済み',{exact:true})).toBeVisible();
 await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();
 await expect(page.getByRole('article',{name:'本人からの申告'}).getByText('会社PCでVPNにつながりません',{exact:true})).toBeVisible();
 await expect(page.getByText('本人から聞いた内容です。技術的な障害として確認済みではありません。')).toBeVisible();
 await expect(page.getByRole('textbox',{name:/PC/})).toHaveCount(0);
 await context.getByText('利用PCの確認元',{exact:true}).click();await expect(context.getByText(`Relation: ${relationId}`,{exact:true})).toBeVisible();
 await triage(page);
 await expect(page.getByText('担当になった理由: 対応が必要と確認した担当者として登録されています。')).toBeVisible();
 await expect(page.getByRole('heading',{name:'次にやること'})).toBeVisible();
 await expect(page.getByText('VPN利用要否と症状を確認する',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'なぜこの確認が必要？'})).toBeVisible();
 await page.getByText('VPN接続トラブルの一次切り分けを見る',{exact:true}).click();
 await expect(page.getByText('同梱デモ手順 / support-demo-v1',{exact:false})).toBeVisible();
 await page.getByText('VPN接続時によくある確認ポイント',{exact:true}).click();
 await expect(page.getByText('同梱デモの参考知識。',{exact:false})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('support-context.png'),fullPage:true});
 await page.getByLabel('確認した内容と根拠').fill('デモ: 契約窓口が利用対象であると回答。本人に接続先を確認。');
 await page.getByLabel('その判断をした理由').fill('今回の根拠により、既知の接続確認手順を案内する。');
 await page.getByLabel('実際に行った調査・案内').fill('接続先を本人が確認する手順を案内した。設定変更はしていない。');
 await page.getByRole('button',{name:'確認・判断・案内の実施を記録'}).click();
 await expect(page.getByRole('heading',{name:'確認・案内の実施記録'})).toBeVisible();
 await expect(page.getByText('管理情報の変更: ありません。利用PC・VPN設定を変更した記録ではありません。')).toBeVisible();
 await expect(context.getByText('VPN利用要否: 未確認',{exact:true})).toBeVisible();
 await page.getByLabel('参考知識の見出し').fill('VPN案内前に利用対象の根拠を確認');
 await page.getByLabel('役立った内容・適用条件・限界').fill('契約窓口の根拠を確認してから案内。実際の設定変更は別途確認が必要。');
 await page.getByRole('button',{name:'参考知識の候補を保存'}).click();
 await expect(page.getByText('参考知識の候補 / 未承認 — 適用ルールではありません')).toBeVisible();
 await page.getByRole('button',{name:'問い合わせ対応を完了'}).click();
 await expect(page.getByText('確認・案内の対応を完了しました',{exact:true})).toBeVisible();
 const work=(await db.admin.query('select id,outcome from factact.work where support_event_id=$1',[eventId])).rows[0];
 expect(work.outcome).toBe('COMPLETED');
 expect((await db.admin.query('select count(*)::int as n from factact.changes where work_id=$1',[work.id])).rows[0].n).toBe(0);
 expect((await db.admin.query("select id from factact.relations where status='ACTIVE'")).rows[0].id).toBe(relationId);
 await intake(page);
 await expect(page.getByRole('heading',{name:'VPN案内前に利用対象の根拠を確認'})).toBeVisible();
 await expect(page.getByText('参考知識の候補 / 未承認 — 適用ルールではありません')).toBeVisible();
 await page.getByText('元の対応・確認根拠',{exact:true}).click();
 await expect(page.getByText(`Work: ${work.id}`,{exact:true})).toBeVisible();
 await page.reload();await expect(context.getByRole('heading',{name:'利用PC: PC-0073'})).toBeVisible();
});