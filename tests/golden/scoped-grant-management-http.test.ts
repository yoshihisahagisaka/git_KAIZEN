import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgScopedGrantManager} from '../../apps/web/src/server/persistence/scoped-grant-manager.js';
import {createApp} from '../../apps/web/src/server/app.js';

const issuer='https://accounts.google.com';
const subject='synthetic-approval-http-identity';
const cookie='factact_session=grant-management-http';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
 databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc', databaseSsl:false,issuer:issuer as 'https://accounts.google.com',
 clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgIdentityStore;
let app:ReturnType<typeof createApp>;

const issueInput=()=>({
 requestId:randomUUID(),actorOperatorId:ids.operator,serviceId:ids.service,
 contractProfileId:ids.contract,scope:{kind:'SERVICE'},objectKind:'SUPPORT',
 operations:['READ'],effectiveFrom:'2026-11-08T00:00:00Z',effectiveUntil:null,
 reason:'対象業務への明示的な閲覧権限を付与',
});
const post=(body:Record<string,unknown>,csrf='csrf')=>request(app).post('/api/admin/scoped-grants')
 .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token',csrf).send(body);

beforeAll(async()=>{
 db=await testDatabase();store=new PgIdentityStore(db.runtime,db.oidc);
 app=createApp(config,store,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject})},
  pino({level:'silent'}),undefined,undefined,undefined,undefined,new PgScopedGrantManager(db.runtime));
},60_000);
beforeEach(async()=>{
 await db.reset();
 await db.admin.query('delete from factact_private.scoped_grant_approvers');
 await db.admin.query(`insert into factact_private.operator_identities
  (issuer,subject,tenant_id,operator_id,is_login_default) values($1,$2,$3,$4,true)`,
  [issuer,subject,ids.tenant,ids.operator]);
 await store.createVerifiedSession(tokenHash('grant-management-http'),
  {tenantId:ids.tenant,operatorId:ids.operator},'csrf',{issuer,subject});
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('scoped Grant administration HTTP boundary',()=>{
 it('refuses missing session and invalid CSRF before DB mutation',async()=>{
  const input=issueInput();
  expect((await request(app).post('/api/admin/scoped-grants').send(input)).status).toBe(401);
  expect((await post(input,'incorrect')).status).toBe(403);
  expect((await request(app).post('/api/admin/scoped-grants').set('Cookie',cookie)
   .set('Origin','https://attacker.invalid').set('x-csrf-token','csrf').send(input)).status).toBe(403);
 });

 it('refuses even an ADMIN without explicit verified identity approval registration',async()=>{
  const response=await post(issueInput());
  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe('GRANT_APPROVER_REQUIRED');
 });

 it('rejects client-supplied Tenant, approver identity and duplicate operations',async()=>{
  await db.admin.query(`insert into factact_private.scoped_grant_approvers
   (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,[issuer,subject]);
  expect((await post({...issueInput(),tenantId:ids.tenant})).status).toBe(400);
  expect((await post({...issueInput(),approvedByOperatorId:ids.operator})).status).toBe(400);
  expect((await post({...issueInput(),issuer,subject})).status).toBe(400);
  expect((await post({...issueInput(),operations:['READ','READ']})).status).toBe(400);
 });

 it('issues, retries and revokes through the same verified session and atomic DB command',async()=>{
  await db.admin.query(`insert into factact_private.scoped_grant_approvers
   (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,[issuer,subject]);
  const input=issueInput();
  const issued=await post(input);
  expect(issued.status).toBe(200);
  expect(issued.body.data.grantId).toBe(input.requestId);
  expect((await post(input)).body.data.grantId).toBe(input.requestId);
  const conflict=await post({...input,operations:['READ','UPDATE']});
  expect(conflict.status).toBe(409);
  const revoked=await request(app).post(`/api/admin/scoped-grants/${input.requestId}/revoke`)
   .set('Cookie',cookie).set('Origin',config.origin).set('x-csrf-token','csrf')
   .send({requestId:randomUUID(),reason:'業務終了'});
  expect(revoked.status).toBe(200);
  expect(revoked.body.data.grantId).toBe(input.requestId);
  expect((await db.admin.query('select status from factact.scoped_actor_grants where id=$1',
   [input.requestId])).rows[0].status).toBe('REVOKED');
 });
});
