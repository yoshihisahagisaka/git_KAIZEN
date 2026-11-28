import {api} from './api.js';

type BadgeContext={
 serviceId:string;
 contractProfileId:string;
};

type BadgeDevice={
 setAppBadge?:(count?:number)=>Promise<void>;
 clearAppBadge?:()=>Promise<void>;
};

let generation=0;
let pending=Promise.resolve();

export function sumUnreadCounts(
 values:readonly number[]
):number{
 if(values.some(n=>!Number.isSafeInteger(n)||n<0))
  throw Error('Invalid unread count');

 const total=values.reduce((a,b)=>a+b,0);

 if(!Number.isSafeInteger(total))
  throw Error('Invalid unread total');

 return total;
}

function applyBadge(
 count:number,
 current:number
):Promise<void>{
 const device=navigator as Navigator & BadgeDevice;

 pending=pending.catch(()=>{}).then(async()=>{
  if(current!==generation)return;

  try{
   if(count===0){
    if(device.clearAppBadge)
     await device.clearAppBadge();
    else if(device.setAppBadge)
     await device.setAppBadge(0);
   }else if(device.setAppBadge){
    await device.setAppBadge(count);
   }
  }catch{
   // Unsupported platform or OS restriction.
   // The existing in-app notification list remains available.
  }
 });

 return pending;
}

export async function clearRequestBadge(){
 const current=++generation;
 await applyBadge(0,current);
}

export async function refreshRequestBadge(
 contexts:readonly BadgeContext[]
){
 const current=++generation;

 try{
  const unique=new Map(
   contexts.map(c=>[
    c.serviceId+':'+c.contractProfileId,c
   ])
  );

  const counts=await Promise.all(
   Array.from(unique.values()).map(async c=>{
    const query=new URLSearchParams({
     serviceId:c.serviceId,
     contractProfileId:c.contractProfileId
    });

    const data=await api<{unread:number}>(
     '/api/request-notifications?'+query
    );

    return data.unread;
   })
  );

  await applyBadge(sumUnreadCounts(counts),current);
 }catch{
  // Do not retain a potentially unauthorized stale count.
  await applyBadge(0,current);
 }
}
