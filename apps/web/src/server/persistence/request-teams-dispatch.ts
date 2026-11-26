import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../../../../packages/domain/src/join.js';
import {submitTeamsNotice,type TeamsSubmitResult} from '../teams-notification.js';
import {withTenant} from './database.js';
import type {RequestActor,RequestService} from './service-request-store.js';

type State='SENDING'|'ACCEPTED'|'REJECTED'|'UNKNOWN';
type Attempt={id:string;attempt_no:number;state:State;command_id:string;actor_operator_id:string;http_status:number|null};
type Intent={id:string;recipient_ids:string[]};
type Mention={objectId:string;name:string};
export type TeamsDeployment={enabled:boolean;origin:string;endpointFor:(tenantId:string,serviceId:string,contractProfileId:string)=>string|undefined};
const denied=()=>new DomainError('TEAMS_NOT_AVAILABLE','Teams通知を操作できません。',404);
const present=(a:Attempt)=>({attemptId:a.id,attempt:a.attempt_no,state:a.state,httpStatus:a.http_status});
/** Internal-only adapter. No runtime entrypoint or automatic worker yet.
 * Durable claim is committed before network I/O; a stranded SENDING claim
 * must be investigated, not retried automatically. Only definite rejection
 * can be manually retried, under current authority, with a new command ID. */
export class PgRequestTeamsDispatch {
 constructor(private pool:Pool,private deployment:TeamsDeployment,private send:typeof fetch=fetch){}
 async dispatch(a:RequestActor,s:RequestService,requestId:string,commandId:string,manualRetry=false){
  if(![a.tenantId,a.actorId,s.serviceId,s.contractProfileId,requestId,commandId].every(v=>z.uuid().safeParse(v).success))throw denied();
  if(!this.deployment.enabled)return {state:'DISABLED' as const};
  const endpoint=this.deployment.endpointFor(a.tenantId,s.serviceId,s.contractProfileId);
  if(!endpoint)return {state:'DISABLED' as const};
  const claim=await withTenant(this.pool,a.tenantId,async db=>{
   await db.query('select factact.lock_scoped_actor_authority($1,$2)',[a.tenantId,a.actorId]);
   await db.query('select factact.lock_service_request_context($1,$2,$3)',[a.tenantId,s.serviceId,s.contractProfileId]);
   const q=await db.query<Intent>(`select i.id,i.recipient_ids from factact.service_request_teams_intents i
    join factact.service_requests r on r.tenant_id=i.tenant_id and r.id=i.request_id
    join factact.service_request_channels ch on ch.tenant_id=r.tenant_id and ch.service_id=r.service_id and ch.contract_profile_id=r.contract_profile_id
      and ch.provider_party_id=r.provider_party_id and ch.partner_party_id=r.partner_party_id
    join factact.service_request_participants p on p.tenant_id=ch.tenant_id and p.service_id=ch.service_id and p.contract_profile_id=ch.contract_profile_id
    join factact.operators o on o.tenant_id=p.tenant_id and o.id=p.actor_operator_id and o.status='ACTIVE'
    join factact.tenants t on t.id=r.tenant_id and t.status='ACTIVE'
    join factact.services sv on sv.tenant_id=r.tenant_id and sv.id=r.service_id and sv.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=r.tenant_id and c.id=r.contract_profile_id and c.service_id=r.service_id
      and c.status='ACTIVE' and c.effective_from<=clock_timestamp() and (c.effective_to is null or c.effective_to>clock_timestamp())
    join factact.organizations op on op.tenant_id=r.tenant_id and op.id=r.provider_party_id and op.status='ACTIVE'
    join factact.organizations pp on pp.tenant_id=r.tenant_id and pp.id=r.partner_party_id and pp.status='ACTIVE'
    where r.id=$1 and r.service_id=$2 and r.contract_profile_id=$3 and r.direction='PROVIDER_TO_PARTNER'
      and ch.enabled and ch.teams_enabled and p.actor_operator_id=$4 and p.party_role='PROVIDER'
      and p.enabled and p.can_create and p.can_read`,[requestId,s.serviceId,s.contractProfileId,a.actorId]);
   const intent=q.rows[0];if(!intent)throw denied();
   const rows=(await db.query<Attempt>('select id,attempt_no,state,command_id,actor_operator_id,http_status from factact.service_request_teams_attempts where intent_id=$1 order by attempt_no desc',[intent.id])).rows;
   const replay=rows.find(x=>x.command_id===commandId);
   if(replay){if(replay.actor_operator_id!==a.actorId)throw denied();return {existing:present(replay)} as const;}
   const last=rows[0];
   if(last&&(!manualRetry||last.state!=='REJECTED'))return {existing:present(last)} as const;
   if(!last&&manualRetry)throw denied();
   const members=await db.query<{id:string;object_id:string;display_name:string}>(`select id,object_id,display_name from factact.service_request_teams_recipients
    where service_id=$1 and contract_profile_id=$2 and enabled and id=any($3::uuid[]) order by id`,[s.serviceId,s.contractProfileId,intent.recipient_ids]);
   // Never substitute or silently omit a disabled roster member.
   if(members.rows.length!==intent.recipient_ids.length)throw new DomainError('TEAMS_ROSTER_CHANGED','通知先が変更されています。送信前に確認してください。',409);
   const mentions:Mention[]=members.rows.map(m=>({objectId:m.object_id,name:m.display_name}));
   const id=randomUUID(),attempt=(last?.attempt_no??0)+1;
   await db.query(`insert into factact.service_request_teams_attempts(id,tenant_id,intent_id,attempt_no,command_id,actor_operator_id,started_at,state)
    values($1,$2,$3,$4,$5,$6,clock_timestamp(),'SENDING')`,[id,a.tenantId,intent.id,attempt,commandId,a.actorId]);
   return {id,attempt,mentions} as const;
  });
  if('existing' in claim)return claim.existing;
  let result:TeamsSubmitResult;
  try{result=await submitTeamsNotice(endpoint,{eventId:requestId,mentions:claim.mentions},this.send,this.deployment.origin);}
  catch{result={state:'UNKNOWN'};}
  const state=result.state==='DISABLED'?'UNKNOWN':result.state;
  await withTenant(this.pool,a.tenantId,async db=>{
   const q=await db.query(`update factact.service_request_teams_attempts set state=$2,http_status=$3,finished_at=greatest(clock_timestamp(),started_at)
    where id=$1 and state='SENDING'`,[claim.id,state,result.httpStatus??null]);
   if(q.rowCount!==1)throw Error('TEAMS_ATTEMPT_FINALIZATION_FAILED');
  });
  return {attemptId:claim.id,attempt:claim.attempt,state,httpStatus:result.httpStatus??null};
 }
}
