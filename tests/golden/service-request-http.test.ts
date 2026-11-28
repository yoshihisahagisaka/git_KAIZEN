import {randomUUID,createECDH} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import request from 'supertest';
import pino from 'pino';
import {ids,testDatabase} from '../fixtures/database.js';
import {tokenHash} from '../../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../../apps/web/src/server/persistence/identity-store.js';
import {PgServiceRequestStore} from '../../apps/web/src/server/persistence/service-request-store.js';
import {createApp} from '../../apps/web/src/server/app.js';
import {PgRequestPushStore} from '../../apps/web/src/server/persistence/request-push-store.js';
const issuer='https://accounts.google.com';
const config={nodeEnv:'test' as const,port:8080,origin:'http://localhost:5173',databaseUrl:'postgresql://test',oidcSessionDatabaseUrl:'postgresql://test-oidc',databaseSsl:false,issuer:issuer as 'https://accounts.google.com',clientId:'test',clientSecret:'test',redirectUri:'http://localhost:5173/auth/callback'};
let db:Awaited<ReturnType<typeof testDatabase>>,identity:PgIdentityStore,app:ReturnType<typeof createApp>;
const context={serviceId:ids.service,contractProfileId:ids.contract};
const cookie=(token:string)=>'factact_session='+token;
const get=(path:string,token='provider')=>request(app).get(path).set('Cookie',cookie(token));
const post=(path:string,token='provider')=>request(app).post(path).set('Cookie',cookie(token)).set('Origin',config.origin).set('x-csrf-token','csrf-'+token);
async function session(actor:string,token:string){
 await db.admin.query("insert into factact_private.operator_identities(issuer,subject,tenant_id,operator_id,is_login_default,status) values($1,$2,$3,$4,true,'ACTIVE')",[issuer,token,ids.tenant,actor]);
 await identity.createVerifiedSession(tokenHash(token),{tenantId:ids.tenant,operatorId:actor},'csrf-'+token,{issuer,subject:token});
}
beforeAll(async()=>{
 db=await testDatabase();identity=new PgIdentityStore(db.runtime,db.oidc);
 const ecdh=createECDH('prime256v1');ecdh.generateKeys();
 vi.stubEnv('FACTACT_WEB_PUSH_ENABLED','true');
 vi.stubEnv('FACTACT_WEB_PUSH_PUBLIC_KEY',ecdh.getPublicKey().toString('base64url'));
 app=createApp(config,identity,{authorizationUrl:()=>'',verifyCallback:async()=>({issuer,subject:'unused'})},pino({level:'silent'}),
 undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,new PgServiceRequestStore(db.runtime),undefined,undefined,new PgRequestPushStore(db.runtime,identity,new PgServiceRequestStore(db.runtime)));
 vi.unstubAllEnvs();
},120_000);
beforeEach(async()=>{
 await db.reset();const partner=randomUUID(),org=randomUUID();
 await db.admin.query("insert into factact.organizations(id,tenant_id,name,status) values($1,$2,'Synthetic partner','ACTIVE')",[org,ids.tenant]);
 await db.admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'partner@example.invalid','Partner','ACTIVE')",[partner,ids.tenant]);
 await db.admin.query("insert into factact.service_request_channels(tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id,enabled) values($1,$2,$3,$4,$5,true)",[ids.tenant,ids.service,ids.contract,ids.organization,org]);
 await db.admin.query("insert into factact.service_request_participants(tenant_id,service_id,contract_profile_id,actor_operator_id,party_role,can_create,can_read,can_respond,enabled) values($1,$2,$3,$4,'PROVIDER',true,true,true,true),($1,$2,$3,$5,'PARTNER',true,true,true,true)",[ids.tenant,ids.service,ids.contract,ids.operator,partner]);
 await db.admin.query('update factact.operators set request_portal_only=true where id=$1',[partner]);
 await session(ids.operator,'provider');await session(partner,'partner');
},60_000);
afterAll(async()=>{await db?.close();},60_000);
describe('service request HTTP boundary',()=>{
 it('uses only confirmed roster IDs, does not expose object IDs and records zero mentions',async()=>{
  const member=randomUUID(),objectId=randomUUID();
  await db.admin.query('update factact.service_request_channels set teams_enabled=true');
  await db.admin.query("insert into factact.service_request_teams_recipients(id,tenant_id,service_id,contract_profile_id,object_id,display_name,enabled) values($1,$2,$3,$4,$5,'担当者A',true)",[member,ids.tenant,ids.service,ids.contract,objectId]);
  expect((await get('/api/request-teams-recipients').query(context).expect(200)).body.data).toEqual({enabled:true,items:[{id:member,name:'担当者A'}]});
  expect((await get('/api/request-teams-recipients','partner').query(context).expect(200)).body.data).toEqual({enabled:false,items:[]});
  const body={...context,id:randomUUID(),type:'INQUIRY',content:'確認'};
  await post('/api/requests').send({...body,teams:{mode:'SELECTED',recipientIds:[objectId]}}).expect(400);
  await post('/api/requests').send({...body,teams:{mode:'NONE',recipientIds:[]}}).expect(201);
  expect((await db.admin.query('select selection,recipient_ids from factact.service_request_teams_intents where request_id=$1',[body.id])).rows).toEqual([{selection:'NONE',recipient_ids:[]}]);
  await post('/api/requests').send({...body,id:randomUUID(),teams:{mode:'ALL',recipientIds:[member]}}).expect(201);
 });
 it('requires session and CSRF; rejects forged actor/direction; supports bidirectional detail and response',async()=>{
  const body={...context,id:randomUUID(),type:'ONSITE_REQUEST',content:'現地対応'};
  await request(app).get('/api/request-contexts').expect(401);
  await post('/api/requests').set('x-csrf-token','wrong').send(body).expect(403);
  await post('/api/requests').send({...body,direction:'PARTNER_TO_PROVIDER'}).expect(400);
  await post('/api/requests').send({...body,actorId:ids.operator}).expect(400);
  await post('/api/requests','partner').send(body).expect(400);
  await post('/api/requests').send(body).expect(201);
  const d=(await get('/api/requests/'+body.id,'partner').expect(200)).body.data;
  expect(d).toMatchObject({side:'RECEIVED',canRespond:true,status:'PENDING'});
  expect(d).not.toHaveProperty('parentWorkId');
  expect(d).not.toHaveProperty('tenantId');
  const inbox=await get('/api/request-notifications','partner').query(context).expect(200);
  expect(inbox.body.data).toMatchObject({unread:1,items:[{requestId:body.id,read:false}]});
  await post('/api/requests/'+body.id+'/acknowledge','partner').set('x-csrf-token','wrong').send({throughRevision:0}).expect(403);
  await post('/api/requests/'+body.id+'/acknowledge','partner').send({throughRevision:0}).expect(200);
  expect((await get('/api/request-notifications','partner').query(context).expect(200)).body.data.unread).toBe(0);
  expect((await get('/api/requests/'+body.id,'partner').expect(200)).body.data.status).toBe('PENDING');
  const response={commandId:randomUUID(),expectedRevision:0,status:'COMPLETED',comment:'対応完了'};
  await post('/api/requests/'+body.id+'/responses').send(response).expect(404);
  await post('/api/requests/'+body.id+'/responses','partner').send(response).expect(200);
  expect((await get('/api/requests/'+body.id).expect(200)).body.data).toMatchObject({status:'COMPLETED',revision:1});
  expect((await get('/api/requests').query({...context,side:'SENT'}).expect(200)).body.data.items).toHaveLength(1);
  await get('/api/support-work','partner').expect(403);
  await get('/API/support-work','partner').expect(403);
  await get('/api/admin/procedure-pages','partner').expect(403);
  await db.admin.query("update factact.service_request_participants set enabled=false where party_role='PARTNER'");
  await get('/api/requests/'+body.id,'partner').expect(404);
  await get('/api/support-work','partner').expect(403);
  await get('/api/request-notifications','partner').query(context).expect(404);
  await post('/api/requests/'+body.id+'/acknowledge','partner').send({throughRevision:1}).expect(404);
  await post('/api/requests/'+body.id+'/responses','partner').send(response).expect(404);
 });
});


describe('session-bound push subscription storage',()=>{
 it('registers idempotently, isolates actors and revokes on logout',async()=>{
  const push=new PgRequestPushStore(
   db.runtime,identity,new PgServiceRequestStore(db.runtime)
  );

  const a={tenantId:ids.tenant,actorId:ids.operator};
  const hash=tokenHash('provider');

  const input={
   endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',
   keys:{
    p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'),
    auth:Buffer.alloc(16,2).toString('base64url')
   }
  };

  const first=await push.register(a,hash,input);

  expect(await push.register(a,hash,input)).toEqual(first);

  await expect(
   push.register(a,tokenHash('partner'),input)
  ).rejects.toThrow();

  await expect(
   push.register(a,hash,{
    ...input,keys:{...input.keys,auth:Buffer.alloc(16,3).toString('base64url')}
   })
  ).rejects.toThrow();

  await post('/auth/logout').send({}).expect(200);

  expect(await identity.readSession(hash)).toBeNull();

  const rows=(await db.admin.query(
   'select id,revoked_at from factact.request_push_subscriptions where id=$1',
   [first.id]
  )).rows;

  expect(rows).toHaveLength(1);
  expect(rows[0].revoked_at).not.toBeNull();

  await expect(
   push.register(a,hash,input)
  ).rejects.toThrow();
 });
});

describe('push subscription HTTP boundary',()=>{
 it('requires session and CSRF; resolves and revokes only own subscription',async()=>{
  const ecdh=createECDH('prime256v1');ecdh.generateKeys();
  const input={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-http',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,3).toString('base64url')}};
  const path='/api/request-push/';
  await request(app).get(path+'config').expect(401);
  expect((await get(path+'config','partner').expect(200)).body.data.enabled).toBe(true);
  await post(path+'subscriptions','partner').set('x-csrf-token','wrong').send(input).expect(403);
  await post(path+'subscriptions','partner').send({...input,actorId:ids.operator}).expect(400);
  const first=(await post(path+'subscriptions','partner').send(input).expect(201)).body.data;
  await post(path+'status','partner').set('x-csrf-token','wrong').send({endpoint:input.endpoint}).expect(403);
  expect((await post(path+'status','partner').send({endpoint:input.endpoint}).expect(200)).body.data).toEqual(first);
  expect((await post(path+'status').send({endpoint:input.endpoint}).expect(200)).body.data).toEqual({id:null});
  await post(path+'revoke').send(first).expect(200);
  expect((await post(path+'status','partner').send({endpoint:input.endpoint}).expect(200)).body.data).toEqual(first);
  await post(path+'revoke','partner').send(first).expect(200);
  expect((await post(path+'status','partner').send({endpoint:input.endpoint}).expect(200)).body.data).toEqual({id:null});
 });
});
