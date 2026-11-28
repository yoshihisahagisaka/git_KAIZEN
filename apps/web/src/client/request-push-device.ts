import {api} from './api.js';

export type PushConfig={enabled:boolean;publicKey:string|null};
export type DevicePushState='ON'|'OFF'|'PROMPT'|'DENIED'|'DISABLED';
export const preferenceKey='factact-request-push-off-v1';
let memoryOff=false;
export function defaultPushEnabled(stored:string|null){return stored!=='off';}
export function devicePushWanted(){
 try{return defaultPushEnabled(localStorage.getItem(preferenceKey));}
 catch{return !memoryOff;}
}
export function setDevicePushWanted(wanted:boolean){
 memoryOff=!wanted;
 try{if(wanted)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,'off');}catch{/* current page only */}
}
export function pushSupported(){
 return window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
}
export function decodePushKey(value:string):Uint8Array<ArrayBuffer>{
 if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid application key');
 const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length!==65||bytes[0]!==4)throw Error('Invalid application key');
 return bytes;
}
async function registration(){
 const r=await navigator.serviceWorker.getRegistration('/');
 if(r?.active)return r;
 let timer:number|undefined;
 try{
  return await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{
   timer=window.setTimeout(()=>reject(Error('Service Worker not ready')),10000);
  })]);
 }finally{if(timer!==undefined)window.clearTimeout(timer);}
}
async function current(){
 return (await registration()).pushManager.getSubscription();
}
async function status(csrf:string,sub:PushSubscription){
 return api<{id:string|null}>('/api/request-push/status',csrf,{endpoint:sub.endpoint});
}
let tail:Promise<unknown>=Promise.resolve();
function serialized<T>(work:()=>Promise<T>):Promise<T>{
 const run=tail.catch(()=>{}).then(()=>navigator.locks
  ?navigator.locks.request('factact-request-push-device',work):work());
 tail=run;
 return run;
}
async function remove(csrf:string){
 const sub=await current();
 if(!sub)return;
 const existing=await status(csrf,sub);
 if(existing.id)await api('/api/request-push/revoke',csrf,{id:existing.id});
 if(!await sub.unsubscribe()&&await current())throw Error('Browser unsubscribe failed');
}
async function reconcile(csrf:string,config:PushConfig):Promise<DevicePushState>{
 if(!devicePushWanted()){await remove(csrf);return 'OFF';}
 if(!config.enabled||!config.publicKey)return 'DISABLED';
 if(Notification.permission==='denied'){await remove(csrf);return 'DENIED';}
 if(Notification.permission!=='granted')return 'PROMPT';
 const reg=await registration();
 const old=await reg.pushManager.getSubscription();
 if(old){
  const existing=await status(csrf,old);
  if(existing.id)return 'ON';
  // A previous session may still own this endpoint. Never silently bind
  // that same browser subscription to a different session.
  if(!await old.unsubscribe()&&await reg.pushManager.getSubscription())
   throw Error('Old subscription not removed');
 }
 if(!devicePushWanted())return 'OFF';
 const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodePushKey(config.publicKey)});
 if(!devicePushWanted()){await sub.unsubscribe();return 'OFF';}
 const keys=sub.toJSON().keys;
 if(!keys?.p256dh||!keys.auth)throw Error('Missing subscription keys');
 await api('/api/request-push/subscriptions',csrf,{endpoint:sub.endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}});
 return 'ON';
}
export function synchronizeDevicePush(csrf:string,config:PushConfig){
 return serialized(()=>reconcile(csrf,config));
}
/** Permission is requested ONLY directly from a user gesture. */
export async function enableDevicePush(csrf:string,config:PushConfig){
 if(!config.enabled||!config.publicKey)throw Error('Disabled');
 setDevicePushWanted(true);
 if(Notification.permission==='default')await Notification.requestPermission();
 return synchronizeDevicePush(csrf,config);
}
export function disableDevicePush(csrf:string){
 setDevicePushWanted(false);
 return serialized(async()=>{await remove(csrf);return 'OFF' as const;});
}
/** Session has already been invalidated; preference survives logout. */
export async function forgetLocalPush(){
 if(!pushSupported())return;
 try{await serialized(async()=>{const sub=await current();if(sub)await sub.unsubscribe();});}catch{/* server-side invalidation remains mandatory */}
}
