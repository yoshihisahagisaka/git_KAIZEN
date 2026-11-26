import {z} from 'zod';
import type {TeamsDeployment} from './persistence/request-teams-dispatch.js';
/** Secret-injected JSON, not browser settings. Default disabled. Never echo values. */
export function loadTeamsDeployment(env:NodeJS.ProcessEnv,origin:string):TeamsDeployment{
 if(env.FACTACT_TEAMS_SEND_ENABLED!=='true')return {enabled:false,origin,endpointFor:()=>undefined};
 try{
  if(new URL(origin).protocol!=='https:')throw Error();
  const entries=z.array(z.strictObject({tenantId:z.uuid(),serviceId:z.uuid(),contractProfileId:z.uuid(),endpoint:z.url()})).min(1).parse(JSON.parse(env.FACTACT_TEAMS_ENDPOINTS_JSON??''));
  const map=new Map<string,string>();
  for(const e of entries){
   const u=new URL(e.endpoint),k=[e.tenantId,e.serviceId,e.contractProfileId].join(':');
   if(map.has(k)||u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!(u.hostname.endsWith('.logic.azure.com')||u.hostname.endsWith('.api.powerplatform.com')))throw Error();
   map.set(k,e.endpoint);
  }
  return {enabled:true,origin,endpointFor:(t,s,c)=>map.get([t,s,c].join(':'))};
 }catch{throw Error('Invalid Teams deployment configuration');}
}
