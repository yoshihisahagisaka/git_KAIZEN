import {z} from 'zod';

const allowedHosts=new Set([
 'fcm.googleapis.com',
 'updates.push.services.mozilla.com',
 'web.push.apple.com',
 'wns.windows.com'
]);

export function validPushEndpoint(value:string):boolean{
 try{
  const u=new URL(value);

  if(value!==u.href||Buffer.byteLength(value,'utf8')>2048||u.protocol!=='https:'||
     u.username||u.password||u.port||u.hash)
   return false;

  return allowedHosts.has(u.hostname)||
   u.hostname.endsWith('.push.apple.com')||
   u.hostname.endsWith('.notify.windows.com');
 }catch{
  return false;
 }
}

function base64urlKey(value:string,bytes:number):boolean{
 if(!/^[A-Za-z0-9_-]+$/.test(value))
  return false;

 const raw=Buffer.from(value,'base64url');

 return raw.length===bytes&&
  raw.toString('base64url')===value;
}

export const pushSubscriptionInput=z.strictObject({
 endpoint:z.string().max(2048).refine(validPushEndpoint),
 keys:z.strictObject({
  p256dh:z.string().max(128).refine(
   v=>base64urlKey(v,65)&&
    Buffer.from(v,'base64url')[0]===4
  ),
  auth:z.string().max(64).refine(
   v=>base64urlKey(v,16)
  )
 })
});

export function pushPublicKey(
 env:NodeJS.ProcessEnv
):string|null{
 if(env.FACTACT_WEB_PUSH_ENABLED!=='true')
  return null;

 const key=env.FACTACT_WEB_PUSH_PUBLIC_KEY;

 if(!key||!base64urlKey(key,65)||
    Buffer.from(key,'base64url')[0]!==4)
  throw Error('Invalid Web Push public key configuration');

 return key;
}
