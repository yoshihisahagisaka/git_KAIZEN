import {Router} from 'express';
import {z} from 'zod';
import {resolve} from 'node:path';
import {DomainError} from '../../../../packages/domain/src/join.js';
import {publicReceiptInput,type PgPublicSupportReceiptStore} from './persistence/public-support-receipt.js';
const settings=z.strictObject({slug:z.string().regex(/^[a-z0-9-]{1,48}$/),tenantId:z.uuid(),serviceId:z.uuid(),name:z.string().trim().min(1).max(120),privacyNoticeVersion:z.string().trim().min(1).max(100),privacyUrl:z.url().refine(v=>v.startsWith('https://')),siteKey:z.string().min(1).max(200)});
export type PublicIntakeSettings=z.infer<typeof settings>;
export type PublicIntakeDeployment={entries:PublicIntakeSettings[];secret:string;origin:string};
export function loadPublicIntake(env:NodeJS.ProcessEnv,origin:string):PublicIntakeDeployment|null{
 if(env.FACTACT_PUBLIC_INTAKE_ENABLED!=='true')return null;
 try{
  const entries=z.array(settings).min(1).max(20).parse(JSON.parse(env.FACTACT_PUBLIC_INTAKE_JSON??''));
  if(new Set(entries.map(e=>e.slug)).size!==entries.length)throw Error();
  const secret=z.string().min(1).max(512).parse(env.FACTACT_PUBLIC_INTAKE_TURNSTILE_SECRET);
  if(!origin.startsWith('https://'))throw Error();
  return {entries,secret,origin};
 }catch{throw Error('Invalid public inquiry deployment configuration');}
}
export async function verifyPublicIntakeToken(deployment:PublicIntakeDeployment,token:string,send:typeof fetch=fetch):Promise<boolean>{
 try{
  const response=await send('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body:new URLSearchParams({secret:deployment.secret,response:token}),
   signal:AbortSignal.timeout(5000),redirect:'error',
  });
  if(!response.ok)return false;
  const data=z.object({success:z.boolean(),hostname:z.string().optional(),action:z.string().optional()}).safeParse(await response.json());
  return data.success&&data.data.success&&data.data.hostname===new URL(deployment.origin).hostname&&data.data.action==='public_inquiry';
 }catch{return false;}
}
export function publicIntakeRoutes(store:Pick<PgPublicSupportReceiptStore,'receive'>,deployment:PublicIntakeDeployment,send:typeof fetch=fetch){
 const router=Router();
 const input=publicReceiptInput.extend({turnstileToken:z.string().min(1).max(2048)});
 const find=(slug:string)=>deployment.entries.find(e=>e.slug===slug);
 router.get('/inquiry/:slug', (req,res)=>{
  if(!find(req.params.slug)){res.sendStatus(404);return;}
  res.set('Cache-Control','no-store');
  // Only this public page may frame and load the challenge provider.
  res.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  res.sendFile(resolve('dist/client/index.html'));
 });
 router.get('/public-inquiry/:slug/config',(req,res)=>{
  const entry=find(req.params.slug);res.set('Cache-Control','no-store');
  if(!entry){res.sendStatus(404);return;}
  res.json({ok:true,data:{name:entry.name,privacyUrl:entry.privacyUrl,siteKey:entry.siteKey}});
 });
 router.post('/public-inquiry/:slug/submit',async(req,res)=>{
  res.set('Cache-Control','no-store');
  const entry=find(req.params.slug);
  if(!entry){res.sendStatus(404);return;}
  if(req.get('origin')!==deployment.origin||!req.is('application/json'))throw new DomainError('INVALID_INPUT','受付画面から送信してください。',403);
  const {turnstileToken,...payload}=input.parse(req.body);
  if(!await verifyPublicIntakeToken(deployment,turnstileToken,send))throw new DomainError('CHALLENGE_FAILED','送信確認をやり直してください。',400);
  await store.receive(entry,payload);
  res.status(201).json({ok:true,data:{accepted:true}});
 });
 return router;
}
