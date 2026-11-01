// Localhost-only disposable Human Review environment. Never imported by production.
import EmbeddedPostgres from 'embedded-postgres';
import cookieParser from 'cookie-parser';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {access,readFile,readdir,realpath,rm,mkdtemp} from 'node:fs/promises';
import {createServer as createNetServer,type Server as NetServer} from 'node:net';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Pool,type PoolClient} from 'pg';
import pino from 'pino';
import {z} from 'zod';
import {createApp} from '../apps/web/src/server/app.js';
import {createGoogleProvider,type IdentityProvider} from '../apps/web/src/server/auth/oidc.js';
import {generateCodeVerifier,generateOpaqueValue} from '../apps/web/src/server/auth/pkce.js';
import {PgIdentityStore} from '../apps/web/src/server/persistence/identity-store.js';
import {assertRuntimeRole} from '../apps/web/src/server/persistence/database.js';
import {assertSchemaReady} from '../apps/web/src/server/persistence/schema-ready.js';
import {PgJoinUnitOfWork} from '../apps/web/src/server/persistence/join-repository.js';
import {PgSupportUnitOfWork} from '../apps/web/src/server/persistence/support-repository.js';
import {PgExploreSearchUnitOfWork} from '../apps/web/src/server/persistence/explore-repository.js';
import {JoinCommands} from '../packages/application/src/join-commands.js';
import {JoinQueries} from '../packages/application/src/join-queries.js';
import {SupportCommands} from '../packages/application/src/support-commands.js';
import {SupportQueries} from '../packages/application/src/support-queries.js';
import {ExploreQueries} from '../packages/application/src/explore-queries.js';
import type {Operator} from '../packages/domain/src/operator.js';
import type {Identity} from '../packages/application/src/operator-session.js';

const ORIGIN='http://localhost:5173',CALLBACK=ORIGIN+'/auth/callback',HOST='127.0.0.1',PORT=5173;
const TENANT='10000000-0000-4000-8000-000000000001';
const REVIEWER='20000000-0000-4000-8000-000000000002';
const PERSON='40000000-0000-4000-8000-000000000001';
const SERVICE='60000000-0000-4000-8000-000000000001';

export interface HumanReviewDatabase {directory:string;admin:Pool;runtime:Pool;close():Promise<void>}
function cli(args:string[]){const value=(name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};return{check:args.includes('--check'),envFile:value('--env-file')};}

export function validateHumanReviewEnvironment(env:NodeJS.ProcessEnv){
 const parsed=z.object({NODE_ENV:z.literal('development'),APP_ORIGIN:z.literal(ORIGIN),OIDC_ISSUER:z.literal('https://accounts.google.com'),OIDC_CLIENT_ID:z.string().min(1).refine(x=>x!=='REPLACE_ME'),OIDC_CLIENT_SECRET:z.string().min(1).refine(x=>x!=='REPLACE_ME'),OIDC_REDIRECT_URI:z.literal(CALLBACK)}).safeParse(env);
 if(!parsed.success)throw new Error('Human Review requires the configured localhost Google OIDC development settings.');
 return parsed.data;
}

async function freePort(){const server=createNetServer();await new Promise<void>((ok,fail)=>{server.once('error',fail);server.listen(0,HOST,ok);});const a=server.address();if(!a||typeof a==='string')throw new Error('No loopback database port available.');await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));return a.port;}
export async function assertReviewPortAvailable(){const server=createNetServer();await new Promise<void>((ok,fail)=>{server.once('error',fail);server.listen(PORT,HOST,ok);});await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));}

export async function removeHumanReviewDirectory(directory:string){
 const root=await realpath(process.cwd()),target=await realpath(directory);
 if(!target.startsWith(root+sep+'.factact-human-review-'))throw new Error('Unsafe Human Review cleanup target.');
 await rm(target,{recursive:true,force:true});
}

export async function startHumanReviewDatabase():Promise<HumanReviewDatabase>{
 const directory=await mkdtemp(resolve('.factact-human-review-')),port=await freePort();
 const embedded=new EmbeddedPostgres({databaseDir:directory,user:'postgres',password:'human-review-admin',port,persistent:true,createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c',`listen_addresses=${HOST}`],onLog:()=>{},onError:()=>{}});
 const admin=new Pool({host:HOST,port,user:'postgres',password:'human-review-admin',database:'postgres'}),runtime=new Pool({host:HOST,port,user:'factact_runtime',password:'human-review-runtime',database:'postgres',max:5});let closed=false;
 const close=async()=>{if(closed)return;closed=true;await runtime.end().catch(()=>{});await admin.end().catch(()=>{});await embedded.stop().catch(()=>{});await removeHumanReviewDirectory(directory);};
 try{await embedded.initialise();await embedded.start();for(const name of(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()){const sql=await readFile(resolve('supabase/migrations',name),'utf8');await admin.query('begin');try{await admin.query(sql);await admin.query('commit');}catch(e){await admin.query('rollback');throw e;}}await admin.query("alter role factact_runtime password 'human-review-runtime'");await admin.query(await readFile('supabase/seed.sql','utf8'));return{directory,admin,runtime,close};}catch(e){await close();throw e;}
}

async function bindHumanReviewIdentity(admin:Pool,identity:Identity){
 if(identity.issuer!=='https://accounts.google.com'||!identity.subject)throw new Error('Only a directly verified Google identity may be bound.');
 const client=await admin.connect();try{await client.query('begin');const existing=await client.query("select issuer,subject from factact_private.operator_identities where operator_id='20000000-0000-4000-8000-000000000001' and issuer<>'https://seed.example.invalid'");if(existing.rows.length&&(existing.rows[0].issuer!==identity.issuer||existing.rows[0].subject!==identity.subject))throw new Error('Synthetic Operator already has another reviewed identity.');await client.query('insert into factact_private.operator_identities(issuer,subject,tenant_id,operator_id) values($1,$2,$3,$4) on conflict do nothing',[identity.issuer,identity.subject,TENANT,'20000000-0000-4000-8000-000000000001']);await client.query("delete from factact_private.operator_identities where operator_id='20000000-0000-4000-8000-000000000001' and issuer='https://seed.example.invalid'");await client.query("insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,metadata_json) values($1,$2,'OPERATOR',$3,'OPERATOR_IDENTITY_BOUND',$4)",[randomUUID(),TENANT,'20000000-0000-4000-8000-000000000001',{source:'direct Google OIDC verification in disposable human review runner'}]);await client.query('commit');}catch(e){await client.query('rollback');throw e;}finally{client.release();}
}

export async function verifyHumanReviewGoogleIdentity(provider:IdentityProvider,timeoutMs=10*60*1000):Promise<Identity>{
 const app=express();app.disable('x-powered-by');app.use(cookieParser());
 let pending:{cookie:string;expires:number;state:string;nonce:string;verifier:string}|undefined,server:NetServer|undefined,settled=false;
 const finish=async()=>{if(server)await closeServer(server).catch(()=>{});};
 return new Promise<Identity>((resolveIdentity,rejectIdentity)=>{
  const succeed=(identity:Identity)=>{if(settled)return;settled=true;clearTimeout(expiry);void finish().then(()=>resolveIdentity(identity));};
  const fail=(error:Error)=>{if(settled)return;settled=true;clearTimeout(expiry);void finish().then(()=>rejectIdentity(error));};
  app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");next();});
  app.get('/',(_req,res)=>res.send('<h1>FACTACT Human Review identity verification</h1><p>Google verification does not grant a role.</p><a href="/auth/login">Verify my Google account</a>'));
  app.get('/auth/login',(_req,res)=>{pending={cookie:generateOpaqueValue(),expires:Date.now()+10*60*1000,state:generateOpaqueValue(),nonce:generateOpaqueValue(),verifier:generateCodeVerifier()};res.cookie('factact_human_review_identity',pending.cookie,{httpOnly:true,sameSite:'lax',path:'/',maxAge:10*60*1000});res.redirect(provider.authorizationUrl(pending));});
  app.get('/auth/callback',async(req,res)=>{const login=pending;if(!login||req.cookies?.factact_human_review_identity!==login.cookie||Date.now()>login.expires){res.status(400).send('Verification expired or browser did not match.');return;}pending=undefined;res.clearCookie('factact_human_review_identity',{path:'/'});try{const callback=new URL(CALLBACK);callback.search=new URL(req.originalUrl,ORIGIN).search;const identity=await provider.verifyCallback(callback,login);if(identity.issuer!=='https://accounts.google.com')throw new Error('Unexpected identity issuer.');res.send('<h1>Google identity verified</h1><p>FACTACT Human Review will now start. Sign in once more to begin.</p>');succeed(identity);}catch{res.status(401).send('Google identity verification failed. Restart the runner.');fail(new Error('Google OIDC verification failed.'));}});
  server=app.listen(PORT,HOST,()=>console.log(`Open ${ORIGIN} and verify the Google account to bind to the disposable Synthetic Operator.`));server.once('error',error=>fail(error));
  const expiry=setTimeout(()=>fail(new Error('Google identity verification expired. Restart the runner.')),timeoutMs);
 });
}

export async function seedOwnerGapFixture(admin:Pool,runtime:Pool){
 await admin.query("insert into factact.operators(id,tenant_id,email,display_name,status) values($1,$2,'inactive-owner@example.invalid','Synthetic 前担当者','ACTIVE')",[REVIEWER,TENANT]);await admin.query("insert into factact.operator_roles values($1,$2,'OPERATOR')",[TENANT,REVIEWER]);
 const actor:Operator={id:REVIEWER,tenantId:TENANT,displayName:'Synthetic 前担当者',tenantName:'atLIB Development',roles:['OPERATOR']},commands=new SupportCommands(new PgSupportUnitOfWork(runtime),{id:randomUUID,now:()=>new Date().toISOString()});
 const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:PERSON,serviceId:SERVICE,symptom:'Synthetic Owner Gap確認用の問い合わせ'});const work=(await commands.evaluate(actor,event.id,'REQUIRED','Synthetic Human Review fixture')).work;if(!work)throw new Error('Owner Gap fixture Work was not created.');await admin.query("update factact.operators set status='INACTIVE',updated_at=now() where id=$1",[REVIEWER]);return{eventId:event.id,workId:work.id};
}

async function closeServer(server:NetServer){await new Promise<void>((ok,fail)=>server.close(e=>e?fail(e):ok()));}

export async function runHumanReview(args=process.argv.slice(2)){
 const options=cli(args);if(!options.envFile)throw new Error('Use --env-file with the existing ignored Google OIDC development configuration.');process.loadEnvFile(resolve(options.envFile));const oidc=validateHumanReviewEnvironment(process.env);await assertReviewPortAvailable();await access('dist/client/index.html');
 const db=await startHumanReviewDatabase();let server:NetServer|undefined;try{const fixture=await seedOwnerGapFixture(db.admin,db.runtime);await assertRuntimeRole(db.runtime);await assertSchemaReady(db.runtime);if(options.check){const actor:Operator={id:'20000000-0000-4000-8000-000000000001',tenantId:TENANT,displayName:'開発オペレーター',tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER']},view=await new SupportQueries(new PgSupportUnitOfWork(db.runtime),{now:()=>new Date().toISOString()}).responsibility(actor);if(!view.ownerGap.some(x=>x.workId===fixture.workId&&x.reasons.includes('OWNER_UNAVAILABLE')))throw new Error('Owner Gap fixture is not visible in the Responsibility projection.');console.log('Human Review check PASS: migrations, seed, Owner Gap and restricted runtime are isolated on loopback.');console.log('Cleanup will remove only the runner database directory.');return;}
  const config={nodeEnv:'development' as const,port:PORT,origin:ORIGIN,databaseUrl:'postgresql://factact_runtime@127.0.0.1/embedded-human-review',databaseSsl:false,issuer:oidc.OIDC_ISSUER,clientId:oidc.OIDC_CLIENT_ID,clientSecret:oidc.OIDC_CLIENT_SECRET,redirectUri:oidc.OIDC_REDIRECT_URI};const provider=await createGoogleProvider(config),identity=await verifyHumanReviewGoogleIdentity(provider);await bindHumanReviewIdentity(db.admin,identity);const joinUow=new PgJoinUnitOfWork(db.runtime),supportUow=new PgSupportUnitOfWork(db.runtime),exploreUow=new PgExploreSearchUnitOfWork(db.runtime),logger=pino({redact:['password','token','clientSecret','databaseUrl','req.headers','res.headers']});
  const app=createApp(config,new PgIdentityStore(db.runtime),provider,logger,{commands:new JoinCommands(joinUow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new JoinQueries(joinUow)},{commands:new SupportCommands(supportUow,{id:randomUUID,now:()=>new Date().toISOString()}),queries:new SupportQueries(supportUow,{now:()=>new Date().toISOString()})},{queries:new ExploreQueries(exploreUow)});
  server=await new Promise<NetServer>((ok,fail)=>{const s=app.listen(PORT,HOST,()=>ok(s));s.once('error',fail);});console.log(`FACTACT Human Review: ${ORIGIN}`);console.log(`Google callback: ${CALLBACK}`);console.log(`Owner Gap fixture: #/support/${fixture.eventId}`);console.log('Responsibility views: #/responsibility');console.log('Stop with Ctrl+C. The isolated Embedded PostgreSQL directory will be removed.');
  await new Promise<void>(resolveStop=>{process.once('SIGINT',resolveStop);process.once('SIGTERM',resolveStop);});
 }finally{if(server)await closeServer(server).catch(()=>{});await db.close();console.log('Human Review environment stopped and its isolated database directory was removed.');}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runHumanReview().catch(e=>{console.error(e instanceof Error?e.message:'Human Review runner failed safely.');process.exit(1);});
