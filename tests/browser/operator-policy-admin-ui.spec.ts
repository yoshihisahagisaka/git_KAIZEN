import {test,expect,type Page} from '@playwright/test';
import type {Server} from 'node:http';
import {freePort,ids,testDatabase} from '../fixtures/database.js';
import {createApp} from '../../apps/web/src/server/app.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgOperatorPolicyAdmin} from '../../apps/web/src/server/persistence/operator-policy-admin.js';
import type {Config} from '../../apps/web/src/server/config.js';
import pino from 'pino';

const issuer='https://accounts.google.com';
const subject='synthetic-operator-policy-browser';
const actorId='20000000-0000-4000-8000-000000000099';
let db:Awaited<ReturnType<typeof testDatabase>>,server:Server,origin:string;

test.use({timezoneId:'Asia/Tokyo'});
test.beforeAll(async()=>{
  db=await testDatabase();const port=await freePort();origin=`http://127.0.0.1:${port}`;
  const config:Config={nodeEnv:'test',port,origin,databaseUrl:'postgresql://test-only',
    oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,
    issuer,clientId:'test-only',clientSecret:'test-only',redirectUri:`${origin}/auth/callback`};
  const app=createApp(config,new PgIdentityStore(db.runtime,db.oidc),{
    authorizationUrl:(login:{state:string})=>`${origin}/auth/callback?code=ok&state=${login.state}`,
    verifyCallback:async(url:URL,login:{state:string})=>{
      if(url.searchParams.get('state')!==login.state)throw Error('OIDC rejected');
      return {issuer,subject};
    },
  },pino({level:'silent'}),undefined,undefined,undefined,undefined,undefined,
    undefined,undefined,undefined,new PgOperatorPolicyAdmin(db.runtime));
  server=await new Promise<Server>(resolve=>{
    const s=app.listen(port,'127.0.0.1',()=>resolve(s));
  });
});
test.afterAll(async()=>{
  if(server)await new Promise<void>((ok,fail)=>server.close(error=>error?fail(error):ok()));
  await db?.close();
});
test.beforeEach(async()=>{
  await db.reset();
  await db.admin.query('delete from factact_private.scoped_grant_approvers');
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'policy-ui@example.invalid','後藤 さん','ACTIVE')`,[actorId,ids.tenant]);
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default)
    values($1,$2,$3,$4,true)`,[issuer,subject,ids.tenant,ids.operator]);
});

async function login(page:Page){
  await page.goto(origin);
  await page.getByRole('link',{name:'Googleでログイン'}).click();
  await expect(page.getByText(/Development/).first()).toBeVisible();
}
async function approve(){
  await db.admin.query(`insert into factact_private.scoped_grant_approvers
    (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
    [issuer,subject]);
}

test('only approved administrator sees simple level → version → explicit publish → disable and history',async({page})=>{
  await page.setViewportSize({width:1366,height:900});
  await login(page);
  // Even the seeded ADMIN has no operator-policy management authority.
  await expect(page.getByRole('region',{name:'運用設定（管理者）'})).toHaveCount(0);
  await approve();
  await page.reload();
  const panel=page.getByRole('region',{name:'運用設定（管理者）'});
  await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:'設定を開く'}).click();
  await panel.getByLabel('対象サービス').selectOption(ids.service);
  const assignment=panel.getByRole('region',{name:'運用者レベル設定'});
  await expect(assignment).toBeVisible();
  await assignment.getByLabel('運用者',{exact:true}).selectOption(actorId);
  await expect(assignment).toContainText('未割当');
  await assignment.getByLabel('設定するレベル').selectOption('STANDARD');
  await assignment.getByLabel('設定理由（必須）').fill('社内訓練を完了');
  await assignment.getByRole('button',{name:'割当を保存'}).click();
  await expect(assignment).toContainText('現在の割当：一般');
  const category=panel.getByRole('region',{name:'変更カテゴリ設定'});
  await category.getByLabel('新人').selectOption('DENY');
  await category.getByLabel('一般').selectOption('REQUEST');
  await category.getByLabel('責任者').selectOption('REQUEST');
  await category.getByLabel('設定版を作成する理由（必須）').fill('2名確認が必要');
  await category.getByRole('button',{name:'新しい設定版を保存'}).click();
  const publication=panel.getByRole('region',{name:'設定の公開と停止'});
  await expect(publication).toContainText('公開なし');
  await expect(publication.getByLabel('公開する設定版')).toHaveValue(/.+/);
  await expect(publication.getByLabel('公開前の設定内容')).toContainText('一般：申請');
  await publication.getByLabel('公開理由（必須）').fill('内容を確認済み');
  await publication.getByRole('button',{name:'この設定版を公開'}).click();
  await expect(publication).toContainText('第1版を公開中');
  await publication.getByLabel('公開停止の理由（必須）').fill('手順再確認');
  await publication.getByRole('button',{name:'公開を停止'}).click();
  await expect(publication).toContainText('公開なし');
  const history=panel.getByRole('region',{name:'運用設定の履歴'});
  await expect(history).toContainText('後藤 さん：一般');
  await expect(history).toContainText('第1版を作成');
  await expect(history).toContainText('第1版を公開');
  await expect(history).toContainText('公開を停止');
  expect((await db.admin.query('select count(*)::integer as n from factact.scoped_actor_grants')).rows[0].n).toBe(0);
});

test('revocation during an open management screen denies the pending write and hides the directory',async({page})=>{
  await approve();await login(page);
  const panel=page.getByRole('region',{name:'運用設定（管理者）'});
  await panel.getByRole('button',{name:'設定を開く'}).click();
  await panel.getByLabel('対象サービス').selectOption(ids.service);
  const assignment=panel.getByRole('region',{name:'運用者レベル設定'});
  await assignment.getByLabel('運用者',{exact:true}).selectOption(actorId);
  await assignment.getByLabel('設定するレベル').selectOption('NEWCOMER');
  await assignment.getByLabel('設定理由（必須）').fill('取消後は保存できない');
  await db.admin.query(`update factact_private.scoped_grant_approvers
    set status='REVOKED',revoked_at=now() where subject=$1`,[subject]);
  await assignment.getByRole('button',{name:'割当を保存'}).click();
  await expect(panel).toHaveCount(0);
  expect((await db.admin.query('select count(*)::integer as n from factact_private.operator_policy_assignment_events')).rows[0].n).toBe(0);
});
