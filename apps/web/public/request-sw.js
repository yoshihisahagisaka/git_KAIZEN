/* Online-only shell. No cache storage or offline API. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
self.addEventListener('push',event=>{
 let data;
 try{data=event.data?.json();}catch{return;}
 if(!data||data.version!==1||typeof data.requestId!=='string'||!idPattern.test(data.requestId))return;
 event.waitUntil(self.registration.showNotification('FACTACT',{
  body:'対応依頼に更新があります。ログインしてご確認ください。',
  tag:'factact-request-'+data.requestId,
  data:{requestId:data.requestId}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const id=event.notification.data?.requestId;
 if(typeof id!=='string'||!idPattern.test(id))return;
 event.waitUntil(self.clients.openWindow('/requests/'+id));
});
