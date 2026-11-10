import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgOperatorPolicyAdmin} from '../../apps/web/src/server/persistence/operator-policy-admin.js';
import {createApp} from '../../apps/web/src/server/app.js';

const issuer='https://accounts.google.com';
const administrator='synthetic-policy-http-approved';
const deniedSubject='synthetic-policy-http-denied';
const adminCookie='factact_session=policy-http-admin';
const deniedCookie='factact_session=policy-http-denied';
const actor='20000000-0000-4000-8000-000000000099';
const tenantB='10000000-0000-4000-8000-000000000099';
const orgB='30000000-0000-4000-8000-000000000099';
const serviceB='60000000-0000-4000-8000-000000000099';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',
  databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',
  databaseSsl:false,issuer:issuer as 'https://accounts.google.com',
  clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>;
let store:PgIdentityStore;
let app:ReturnType<typeof createApp>;

const get=(path='/api/admin/operator-policy',cookie=adminCookie)=>
  request(app).get(path).set('Cookie',cookie);
const post=(suffix:string,body:Record<string,unknown>,cookie=adminCookie,
  origin=config.origin,csrf='admin-csrf')=>request(app)
  .post(`/api/admin/operator-policy/${suffix}`).set('Cookie',cookie)
  .set('Origin',origin).set('x-csrf-token',csrf).send(body);
const levelInput=()=>({requestId:randomUUID(),serviceId:ids.service,actorId:actor,
  level:'STANDARD',reason:'業務経験を確認してレベルを設定'});
const versionInput=()=>({requestId:randomUUID(),serviceId:ids.service,
  cells:{NEWCOMER:'DENY',STANDARD:'REQUEST',LEAD:'REQUEST'},
  reason:'表示名訂正の確認ルール'});

beforeAll(async()=>{
  db=await testDatabase();store=new PgIdentityStore(db.runtime,db.oidc);
  app=createApp(config,store,{authorizationUrl:()=>'',
    verifyCallback:async()=>({issuer,subject:administrator})},pino({level:'silent'}),
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
    new PgOperatorPolicyAdmin(db.runtime));
},60_000);
beforeEach(async()=>{
  await db.reset();
  await db.admin.query('delete from factact_private.scoped_grant_approvers');
  await db.admin.query(`insert into factact.operators
    (id,tenant_id,email,display_name,status)
    values($1,$2,'actor-policy-http@example.invalid','設定対象の運用者','ACTIVE')`,
    [actor,ids.tenant]);
  await db.admin.query(`insert into factact_private.operator_identities
    (issuer,subject,tenant_id,operator_id,is_login_default)
    values($1,$2,$3,$4,true),($1,$5,$3,$6,true)`,
    [issuer,administrator,ids.tenant,ids.operator,deniedSubject,actor]);
  await store.createVerifiedSession(tokenHash('policy-http-admin'),
    {tenantId:ids.tenant,operatorId:ids.operator},'admin-csrf',{issuer,subject:administrator});
  await store.createVerifiedSession(tokenHash('policy-http-denied'),
    {tenantId:ids.tenant,operatorId:actor},'denied-csrf',{issuer,subject:deniedSubject});
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('administrator-only HTTP for operator level × category policy',()=>{
  it('no designated administrator: no policy directory and no writes even for legacy ADMIN',async()=>{
    await db.admin.query(`insert into factact.operator_roles(tenant_id,operator_id,role)
      values($1,$2,'ADMIN')`,[ids.tenant,actor]);
    expect((await get()).status).toBe(403);
    expect((await get('/api/admin/operator-policy',deniedCookie)).status).toBe(403);
    expect((await post('levels',levelInput(),deniedCookie,config.origin,'denied-csrf')).status).toBe(403);
    expect((await post('versions',versionInput())).status).toBe(403);
    expect((await db.admin.query('select count(*)::integer as n from factact_private.operator_policy_assignment_events')).rows[0].n).toBe(0);
  });

  it('approved verified administrator sees only active current-Tenant services and actors, no implicit policy',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    await db.admin.query(`insert into factact.tenants(id,name,status)
      values($1,'B: confidential tenant','ACTIVE')`,[tenantB]);
    await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
      values($1,$2,'B: confidential organization','ACTIVE')`,[orgB,tenantB]);
    await db.admin.query(`insert into factact.services(id,tenant_id,organization_id,
      service_model_code,name,status) values($1,$2,$3,'JOSYS_KAIZEN','B: secret service','ACTIVE')`,
      [serviceB,tenantB,orgB]);
    const root=await get();
    expect(root.status).toBe(200);
    expect(root.body.data.service).toBeNull();
    expect(root.body.data.services).toEqual([expect.objectContaining({id:ids.service})]);
    expect(JSON.stringify(root.body)).not.toContain('B:');
    const active=await get(`/api/admin/operator-policy?serviceId=${ids.service}`);
    expect(active.status).toBe(200);
    expect(active.body.data.actors).toEqual(expect.arrayContaining([
      {id:actor,name:'設定対象の運用者',level:null},
    ]));
    expect(active.body.data.versions).toEqual([]);
    expect(active.body.data.publications).toEqual([]);
    expect(active.body.data.current).toBeNull();
    expect((await get(`/api/admin/operator-policy?serviceId=${serviceB}`)).status).toBe(403);
    expect((await get(`/api/admin/operator-policy?tenantId=${tenantB}`)).status).toBe(400);
    expect((await get('/api/admin/operator-policy?actorQuery=%25')).status).toBe(200);
  });

  it('exact CSRF/Origin and strict payload never accept browser Tenant, approver or COMMIT',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    const value=levelInput();
    expect((await post('levels',value,adminCookie,config.origin,'wrong')).status).toBe(403);
    expect((await post('levels',value,adminCookie,'https://evil.invalid')).status).toBe(403);
    expect((await post('levels',{...value,tenantId:ids.tenant})).status).toBe(400);
    expect((await post('levels',{...value,approvedBy:ids.operator})).status).toBe(400);
    expect((await post('versions',{...versionInput(),cells:{
      NEWCOMER:'DENY',STANDARD:'REQUEST',LEAD:'COMMIT'}})).status).toBe(400);
    expect((await post('versions',{...versionInput(),cells:{NEWCOMER:'DENY'}})).status).toBe(400);
    expect((await post('levels',{...value,serviceId:randomUUID()})).status).toBe(403);
    expect((await get('/api/admin/operator-policy?actorQuery='+encodeURIComponent('x'.repeat(81)))).status).toBe(400);
    expect((await db.admin.query('select count(*)::integer as n from factact.audit_events where aggregate_type=$1',['OPERATOR_POLICY'])).rows[0].n).toBe(0);
  });

  it('save level, immutable version, explicit publish and stop; history audited; no Grant or Registry write',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    const level=levelInput();
    expect((await post('levels',level)).body.data).toEqual({requestId:level.requestId});
    expect((await post('levels',level)).body.data).toEqual({requestId:level.requestId});
    expect((await post('levels',{...level,level:'LEAD'})).status).toBe(409);
    const version=versionInput();
    expect((await post('versions',version)).body.data).toEqual({versionId:version.requestId});
    const before=await get(`/api/admin/operator-policy?serviceId=${ids.service}`);
    expect(before.body.data.actors).toEqual(expect.arrayContaining([{
      id:actor,name:'設定対象の運用者',level:'STANDARD',
    }]));
    expect(before.body.data.versions).toEqual([expect.objectContaining({
      id:version.requestId,version:1,cells:version.cells,
    })]);
    expect(before.body.data.current).toBeNull();
    const publish={requestId:randomUUID(),serviceId:ids.service,
      versionId:version.requestId,reason:'対象設定を確認し、公開履歴を記録'};
    expect((await post('publications',publish)).status).toBe(200);
    const published=await get(`/api/admin/operator-policy?serviceId=${ids.service}`);
    expect(published.body.data.current).toMatchObject({operation:'PUBLISH',version:1});
    const stop={requestId:randomUUID(),serviceId:ids.service,versionId:null,
      reason:'運用内容の再検討のため公開停止'};
    expect((await post('publications',stop)).status).toBe(200);
    const stopped=await get(`/api/admin/operator-policy?serviceId=${ids.service}`);
    expect(stopped.body.data.current).toMatchObject({operation:'DISABLE',versionId:null});
    expect(stopped.body.data.assignments).toEqual([expect.objectContaining({
      actorName:'設定対象の運用者',level:'STANDARD',reason:level.reason,
    })]);
    expect(stopped.body.data.publications.map((item:{operation:string})=>item.operation)).toEqual(['DISABLE','PUBLISH']);
    const audit=(await db.admin.query(`select event_type from factact.audit_events
      where aggregate_type='OPERATOR_POLICY' order by occurred_at`)).rows;
    expect(audit.map(item=>item.event_type)).toEqual([
      'OPERATOR_POLICY_LEVEL_ASSIGNED','OPERATOR_POLICY_VERSION_CREATED',
      'OPERATOR_POLICY_PUBLISHED','OPERATOR_POLICY_DISABLED',
    ]);
    expect((await db.admin.query('select count(*)::integer as n from factact.scoped_actor_grants')).rows[0].n).toBe(0);
    expect((await db.admin.query('select count(*)::integer as n from factact.changes')).rows[0].n).toBe(0);
  });

  it('revoked approver and membership fail closed for both read and write after prior success',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    expect((await get()).status).toBe(200);
    await db.admin.query(`update factact_private.scoped_grant_approvers
      set status='REVOKED',revoked_at=now() where subject=$1`,[administrator]);
    expect((await get()).status).toBe(403);
    expect((await post('levels',levelInput())).status).toBe(403);
    await db.admin.query(`update factact_private.scoped_grant_approvers
      set status='ACTIVE',revoked_at=null where subject=$1`,[administrator]);
    await db.admin.query(`update factact_private.operator_identities
      set status='REVOKED',revoked_at=now(),revocation_reason='member stopped'
      where subject=$1`,[administrator]);
    // Active membership is checked by the global Session boundary first:
    // a revoked identity invalidates authentication (401), not just the
    // policy-administration authorization (403).
    expect((await get()).status).toBe(401);
    expect((await post('versions',versionInput())).status).toBe(401);
  });

  it('read is restricted to the single function and does not reveal private identity provenance',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    const res=await get(`/api/admin/operator-policy?serviceId=${ids.service}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(administrator);
    expect(JSON.stringify(res.body)).not.toContain('yoshihisa.hagisaka@atlib.jp');
    await expect(db.runtime.query('select * from factact_private.operator_policy_admin_requests'))
      .rejects.toMatchObject({code:'42501'});
    await expect(db.runtime.query('select * from factact_private.operator_policy_assignment_events'))
      .rejects.toMatchObject({code:'42501'});
  });

  it('activation has its own audited HTTP operation, strict CSRF and fail-closed STOP',async()=>{
    await db.admin.query(`insert into factact_private.scoped_grant_approvers
      (issuer,subject,approved_email) values($1,$2,'yoshihisa.hagisaka@atlib.jp')`,
      [issuer,administrator]);
    const activate={requestId:randomUUID(),serviceId:ids.service,versionId:randomUUID(),
      reason:'Staging Syntheticサービスの適用開始'};
    expect((await post('activations',activate)).status).toBe(403);
    expect((await post('activations',activate,adminCookie,config.origin,'wrong')).status).toBe(403);
    expect((await post('activations',{...activate,tenantId:ids.tenant})).status).toBe(400);
    expect((await post('activations',activate,deniedCookie,config.origin,'denied-csrf')).status).toBe(403);
    const empty=await get(`/api/admin/operator-policy/activations?serviceId=${ids.service}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual({current:null,events:[]});
    expect((await get('/api/admin/operator-policy/activations')).status).toBe(400);
    const version=versionInput();
    expect((await post('versions',version)).status).toBe(200);
    const publication={requestId:randomUUID(),serviceId:ids.service,
      versionId:version.requestId,reason:'Stagingでルール版を公開'};
    expect((await post('publications',publication)).status).toBe(200);
    const start={...activate,versionId:version.requestId};
    expect((await post('activations',start)).body.data).toEqual({requestId:start.requestId});
    expect((await post('activations',start)).body.data).toEqual({requestId:start.requestId});
    expect((await post('activations',{...start,versionId:null})).status).toBe(409);
    const active=await get(`/api/admin/operator-policy/activations?serviceId=${ids.service}`);
    expect(active.body.data.current).toMatchObject({
      operation:'ACTIVATE',version:1,versionId:version.requestId,
      publicationId:publication.requestId,
    });
    const stop={requestId:randomUUID(),serviceId:ids.service,versionId:null,
      reason:'Staging検証の切戻しとして新規申請を停止'};
    expect((await post('activations',stop)).status).toBe(200);
    expect((await get(`/api/admin/operator-policy/activations?serviceId=${ids.service}`))
      .body.data.current.operation).toBe('STOP');
    expect((await post('activations',{...stop,requestId:randomUUID()})).status).toBe(403);
    const audit=(await db.admin.query(`select event_type from factact.audit_events
      where event_type in ('OPERATOR_POLICY_ACTIVATED','OPERATOR_POLICY_STOPPED')
      order by occurred_at,id`)).rows.map(item=>item.event_type);
    expect(audit).toEqual(['OPERATOR_POLICY_ACTIVATED','OPERATOR_POLICY_STOPPED']);
    expect((await db.admin.query('select count(*)::int as n from factact.scoped_actor_grants'))
      .rows[0].n).toBe(0);
  });
});
