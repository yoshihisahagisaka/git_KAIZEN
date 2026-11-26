import {z} from 'zod';

/** Transport only. HTTP acceptance is NOT proof of Teams posting or reading.
 * Caller must resolve endpoint from trusted deployment configuration, never HTTP input. */
const inputSchema=z.strictObject({
 eventId:z.uuid(),mentionEmail:z.email().max(320).optional(),
});
export type TeamsNotice= z.input<typeof inputSchema>;
export type TeamsSubmitResult={state:'ACCEPTED'|'REJECTED'|'UNKNOWN'|'DISABLED';httpStatus?:number};
type Send=typeof fetch;

export async function submitTeamsNotice(endpoint:string|undefined,notice:TeamsNotice,send:Send=fetch):Promise<TeamsSubmitResult>{
 if(!endpoint)return {state:'DISABLED'};
 const payload=inputSchema.parse(notice);
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
   body:JSON.stringify({type:'FACTACT_SPECIALIST_REQUEST',eventId:payload.eventId,
    message:'新しい専門対応依頼が届きました。',mentionEmail:payload.mentionEmail??null}),
  });
  // Do not consume or expose provider body (may contain secret or personal data).
  // 4xx is rejection except 408/429 which may be ambiguous; 5xx can follow side effects.
  const status=response.status;
  if(response.ok)return {state:'ACCEPTED',httpStatus:status};
  return {state:status>=400&&status<500&&status!==408&&status!==429?'REJECTED':'UNKNOWN',httpStatus:status};
 }catch{return {state:'UNKNOWN'};}
}
