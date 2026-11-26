import {z} from 'zod';

/** Transport only. HTTP acceptance is NOT proof of Teams posting or reading.
 * Caller must resolve endpoint from trusted deployment configuration, never HTTP input. */
const inputSchema=z.strictObject({
 eventId:z.uuid(),
 mentions:z.array(z.strictObject({objectId:z.uuid(),name:z.string().trim().min(1).max(100).refine(v=>!/[<>\r\n]/.test(v))})).max(20).default([]),

});
export type TeamsNotice= z.input<typeof inputSchema>;
export type TeamsSubmitResult={state:'ACCEPTED'|'REJECTED'|'UNKNOWN'|'DISABLED';httpStatus?:number};
type Send=typeof fetch;

export async function submitTeamsNotice(endpoint:string|undefined,notice:TeamsNotice,send:Send=fetch,appOrigin?:string):Promise<TeamsSubmitResult>{
 if(!endpoint)return {state:'DISABLED'};
 const payload=inputSchema.parse(notice);
 if(new Set(payload.mentions.map(m=>m.objectId.toLowerCase())).size!==payload.mentions.length)throw Error('Duplicate mention');
 let detailUrl:string|undefined;
 if(appOrigin){const origin=new URL(appOrigin);if(origin.protocol!=='https:'||origin.origin!==appOrigin||origin.username||origin.password)throw Error('Invalid app origin');detailUrl=new URL('/requests/'+payload.eventId,origin).href;}
 const entities=payload.mentions.map(m=>({type:'mention',text:'<at>'+m.name+'</at>',mentioned:{id:m.objectId,name:m.name}}));
 const card={type:'AdaptiveCard','$schema':'http://adaptivecards.io/schemas/adaptive-card.json',version:'1.2',body:[
  ...(entities.length?[{type:'TextBlock',text:entities.map(e=>e.text).join(' '),wrap:true}]:[]),
  {type:'TextBlock',text:'新しい対応依頼が届きました。',weight:'Bolder',wrap:true},
  {type:'TextBlock',text:'依頼番号：'+payload.eventId,wrap:true}],
  ...(entities.length?{msteams:{entities}}:{}),...(detailUrl?{actions:[{type:'Action.OpenUrl',title:'対応依頼の詳細を確認する',url:detailUrl}]}:{})};
 let url:URL;
 try{url=new URL(endpoint);}catch{return {state:'REJECTED'};}
 // Deliberately narrow Microsoft-hosted Workflow endpoints, no arbitrary URLs.
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port||
  !(host.endsWith('.logic.azure.com')||host.endsWith('.api.powerplatform.com')))
  return {state:'REJECTED'};
 try{
  const response=await send(url.toString(),{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{'content-type':'application/json'},
   body:JSON.stringify({type:'message',attachments:[{contentType:'application/vnd.microsoft.card.adaptive',contentUrl:null,content:card}]}),
  });
  // Do not consume or expose provider body (may contain secret or personal data).
  // 4xx is rejection except 408/429 which may be ambiguous; 5xx can follow side effects.
  const status=response.status;
  if(response.ok)return {state:'ACCEPTED',httpStatus:status};
  return {state:status>=400&&status<500&&status!==408&&status!==429?'REJECTED':'UNKNOWN',httpStatus:status};
 }catch{return {state:'UNKNOWN'};}
}
