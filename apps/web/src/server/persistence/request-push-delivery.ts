import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';
import type {PushSender,PushResult} from '../request-push-transport.js';

type Candidate={notification_id:string;subscription_id:string;request_id:string;endpoint:string;p256dh:string;auth_secret:string};
type Claim={id:string;notification_id:string;subscription_id:string};
// Same current party/contract/READ conditions as service-request-store.notifications.
// A notification from before enrollment or older than 24h is not a new push.
const eligible=`from factact.service_request_notifications n
 join factact.request_push_subscriptions s on s.tenant_id=n.tenant_id and s.actor_operator_id=n.recipient_operator_id
 join lateral factact_private.read_session(s.session_token_hash) ses on ses.tenant_id=s.tenant_id and ses.operator_id=s.actor_operator_id
 join factact.service_requests r on r.tenant_id=n.tenant_id and r.id=n.request_id
 join factact.service_request_channels ch on ch.tenant_id=r.tenant_id and ch.service_id=r.service_id and ch.contract_profile_id=r.contract_profile_id
  and ch.provider_party_id=r.provider_party_id and ch.partner_party_id=r.partner_party_id
 join factact.service_request_participants p on p.tenant_id=ch.tenant_id and p.service_id=ch.service_id and p.contract_profile_id=ch.contract_profile_id and p.actor_operator_id=n.recipient_operator_id
 join factact.operators o on o.tenant_id=p.tenant_id and o.id=p.actor_operator_id and o.status='ACTIVE'
 join factact.tenants t on t.id=r.tenant_id and t.status='ACTIVE'
 join factact.services sv on sv.tenant_id=r.tenant_id and sv.id=r.service_id and sv.status='ACTIVE'
 join factact.contract_profiles c on c.tenant_id=r.tenant_id and c.id=r.contract_profile_id and c.service_id=r.service_id
  and c.status='ACTIVE' and c.effective_from<=clock_timestamp() and (c.effective_to is null or c.effective_to>clock_timestamp())
 join factact.organizations op on op.tenant_id=r.tenant_id and op.id=r.provider_party_id and op.status='ACTIVE'
 join factact.organizations pp on pp.tenant_id=r.tenant_id and pp.id=r.partner_party_id and pp.status='ACTIVE'
 where s.revoked_at is null and n.acknowledged_at is null and n.created_at>=s.created_at
 and n.created_at>=clock_timestamp()-interval '24 hours'
 and ch.enabled and p.enabled and p.can_read
 and ((p.party_role='PROVIDER')=((r.direction='PARTNER_TO_PROVIDER')=(n.revision=0)))
 and not exists(select 1 from factact.request_push_subscriptions other
  join lateral factact_private.read_session(other.session_token_hash) other_session on other_session.tenant_id=other.tenant_id and other_session.operator_id=other.actor_operator_id
  where other.endpoint=s.endpoint and other.id<>s.id and other.revoked_at is null)`;
const fields='n.id as notification_id,s.id as subscription_id,r.id as request_id,s.endpoint,s.p256dh,s.auth_secret ';
export class PgRequestPushDelivery{
 constructor(private pool:Pool,private sender:PushSender,private enabled=false){}
 private async claim(tenantId:string):Promise<Claim|null>{
  return withTenant(this.pool,tenantId,async db=>{
   const q=await db.query<{notification_id:string;subscription_id:string}>(`select n.id notification_id,s.id subscription_id ${eligible}
    and not exists(select 1 from factact.request_push_deliveries d where d.tenant_id=n.tenant_id and d.notification_id=n.id and d.subscription_id=s.id)
    order by n.created_at,n.id,s.id limit 1`);
   const row=q.rows[0];if(!row)return null;
   const id=randomUUID();
   const insert=await db.query(`insert into factact.request_push_deliveries(id,tenant_id,notification_id,subscription_id,state)
    values($1,$2,$3,$4,'SENDING') on conflict(tenant_id,notification_id,subscription_id) do nothing`,[id,tenantId,row.notification_id,row.subscription_id]);
   return insert.rowCount===1?{id,...row}:null;
  });
 }
 private async recheck(tenantId:string,claim:Claim){
  return withTenant(this.pool,tenantId,async db=>{
   const q=await db.query<Candidate>(`select ${fields}${eligible} and n.id=$1 and s.id=$2
    and exists(select 1 from factact.request_push_deliveries d where d.id=$3 and d.state='SENDING' and d.notification_id=n.id and d.subscription_id=s.id)`,[claim.notification_id,claim.subscription_id,claim.id]);
   return q.rows[0]??null;
  },true);
 }
 async run(tenantId:string,limit=20){
  if(!this.enabled)return {processed:0};
  z.uuid().parse(tenantId);
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid batch size');
  // Retire expired, revoked or no-longer-valid sessions within this tenant.
  // Never transfer an endpoint from another tenant or account automatically.
  await withTenant(this.pool,tenantId,async db=>{
   await db.query(`update factact.request_push_subscriptions s
    set revoked_at=greatest(clock_timestamp(),s.created_at)
    where s.tenant_id=$1 and s.revoked_at is null
    and not exists(select 1 from factact_private.read_session(s.session_token_hash) ses
     where ses.tenant_id=s.tenant_id and ses.operator_id=s.actor_operator_id)`,[tenantId]);
  });
  let processed=0;
  for(let i=0;i<limit;i++){
   const claim=await this.claim(tenantId);if(!claim)break;
   // The claim is durable before any external I/O. Never auto-retry a claim.
   // Read live subscription, session and party authority immediately before send.
   const target=await this.recheck(tenantId,claim);
   let result:PushResult|{state:'SKIPPED';httpStatus?:number}={state:'SKIPPED'};
   if(target){
    try{result=await this.sender({endpoint:target.endpoint,keys:{p256dh:target.p256dh,auth:target.auth_secret}},target.request_id);}
    catch{result={state:'UNKNOWN'};}
   }
   await withTenant(this.pool,tenantId,async db=>{
    const q=await db.query(`update factact.request_push_deliveries set state=$2,http_status=$3,finished_at=greatest(clock_timestamp(),started_at) where id=$1 and state='SENDING'`,[claim.id,result.state,result.httpStatus??null]);
    if(q.rowCount!==1)throw Error('PUSH_FINALIZATION_FAILED');
    if(result.state==='GONE')await db.query('update factact.request_push_subscriptions set revoked_at=greatest(clock_timestamp(),created_at) where id=$1 and revoked_at is null',[claim.subscription_id]);
   });
   processed++;
  }
  return {processed};
 }
}
