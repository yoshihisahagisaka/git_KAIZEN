import {createECDH} from 'node:crypto';
import {createRequire} from 'node:module';
import {pushPublicKey,pushSubscriptionInput} from './request-push-validation.js';
export type PushTarget={endpoint:string;keys:{p256dh:string;auth:string}};
export type PushResult={state:'ACCEPTED'|'REJECTED'|'UNKNOWN'|'GONE';httpStatus?:number};
export type PushSender=(target:PushTarget,requestId:string)=>Promise<PushResult>;
type Vapid={subject:string;publicKey:string;privateKey:string};
type WebPush={generateRequestDetails:(target:PushTarget,payload:string,options:{vapidDetails:Vapid;TTL:number;urgency:'normal';contentEncoding:'aes128gcm'})=>{endpoint:string;method:string;headers:Record<string,string|number>;body:Buffer|null}};
export function loadPushVapid(env:NodeJS.ProcessEnv):Vapid|null{
 if(env.FACTACT_WEB_PUSH_DELIVERY_ENABLED!=='true')return null;
 const publicKey=pushPublicKey(env),privateKey=env.FACTACT_WEB_PUSH_PRIVATE_KEY,subject=env.FACTACT_WEB_PUSH_SUBJECT;
 if(!publicKey||!privateKey||!subject||!(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)))throw Error('Incomplete Web Push delivery configuration');
 try{
  const raw=Buffer.from(privateKey,'base64url');
  if(raw.length!==32||raw.toString('base64url')!==privateKey)throw Error();
  const key=createECDH('prime256v1');key.setPrivateKey(raw);
  if(key.getPublicKey().toString('base64url')!==publicKey)throw Error();
 }catch{throw Error('Web Push VAPID keys do not match');}
 return {subject,publicKey,privateKey};
}
/** Library generates RFC Web Push encrypted payload and VAPID headers.
 * Actual network transport is replaceable for synthetic tests. No redirects. */
export function createPushSender(vapid:Vapid,send:typeof fetch=fetch):PushSender{
 const library=createRequire(import.meta.url)('web-push') as WebPush;
 return async(target,requestId)=>{
  const parsed=pushSubscriptionInput.safeParse(target);
  if(!parsed.success||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))return {state:'REJECTED'};
  let details:ReturnType<WebPush['generateRequestDetails']>;
  try{details=library.generateRequestDetails(parsed.data,JSON.stringify({version:1,requestId}),{vapidDetails:vapid,TTL:60,urgency:'normal',contentEncoding:'aes128gcm'});}catch{return {state:'REJECTED'};}
  if(details.endpoint!==target.endpoint||details.method!=='POST'||!details.body)return {state:'REJECTED'};
  try{
   const headers=Object.fromEntries(Object.entries(details.headers).map(([k,v])=>[k,String(v)]));
   const response=await send(details.endpoint,{method:'POST',headers,body:new Uint8Array(details.body),redirect:'error',signal:AbortSignal.timeout(10000)});
   const httpStatus=response.status;
   await response.body?.cancel().catch(()=>{});
   if(httpStatus>=200&&httpStatus<300)return {state:'ACCEPTED',httpStatus};
   if(httpStatus===404||httpStatus===410)return {state:'GONE',httpStatus};
   return {state:httpStatus>=400&&httpStatus<500?'REJECTED':'UNKNOWN',httpStatus};
  }catch{return {state:'UNKNOWN'};}
 };
}
