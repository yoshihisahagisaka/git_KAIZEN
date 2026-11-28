import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {IdentityStore} from '../../../../../packages/application/src/operator-session.js';
import {DomainError} from '../../../../../packages/domain/src/join.js';
import {withTenant} from './database.js';
import type {PgServiceRequestStore,RequestActor} from './service-request-store.js';

type Subscription={
 endpoint:string;
 keys:{p256dh:string;auth:string};
};

const denied=()=>new DomainError(
 'PUSH_NOT_AVAILABLE',
 '通知設定を利用できません。',
 404
);

export class PgRequestPushStore{
 constructor(
  private pool:Pool,
  private identity:IdentityStore,
  private requests:PgServiceRequestStore
 ){}

 private async authorize(
  a:RequestActor,
  hash:string
 ){
  const session=await this.identity.readSession(hash);

  if(!session||
     session.tenantId!==a.tenantId||
     session.operatorId!==a.actorId)
   throw denied();

  if(!await this.identity.loadActiveOperator(session))
   throw denied();

  if(!(await this.requests.contexts(a)).length)
   throw denied();
 }

 async register(
  a:RequestActor,
  hash:string,
  input:Subscription
 ){
  await this.authorize(a,hash);

  return withTenant(this.pool,a.tenantId,async db=>{
   await db.query(
    'select factact.lock_scoped_actor_authority($1,$2)',
    [a.tenantId,a.actorId]
   );

   const prior=await db.query<{
    id:string;
    actor_operator_id:string;
    p256dh:string;
    auth_secret:string;
    revoked_at:Date|null;
   }>(
    `select id,actor_operator_id,p256dh,auth_secret,revoked_at
     from factact.request_push_subscriptions
     where tenant_id=$1
       and session_token_hash=$2
       and endpoint=$3
     for update`,
    [a.tenantId,hash,input.endpoint]
   );

   const row=prior.rows[0];

   if(row){
    if(row.actor_operator_id!==a.actorId||
       row.p256dh!==input.keys.p256dh||
       row.auth_secret!==input.keys.auth||
       row.revoked_at)
     throw new DomainError(
      'PUSH_SUBSCRIPTION_CONFLICT',
      '端末の通知購読を再設定してください。',
      409
     );

    return {id:row.id};
   }

   const id=randomUUID();

   await db.query(
    `insert into factact.request_push_subscriptions
     (id,tenant_id,actor_operator_id,
      session_token_hash,endpoint,p256dh,auth_secret)
     values($1,$2,$3,$4,$5,$6,$7)`,
    [id,a.tenantId,a.actorId,hash,
     input.endpoint,input.keys.p256dh,input.keys.auth]
   );

   return {id};
  });
 }

 async revoke(
  a:RequestActor,
  hash:string,
  id:string
 ){
  return withTenant(this.pool,a.tenantId,async db=>{
   await db.query(
    `update factact.request_push_subscriptions
     set revoked_at=clock_timestamp()
     where tenant_id=$1
       and actor_operator_id=$2
       and session_token_hash=$3
       and id=$4
       and revoked_at is null`,
    [a.tenantId,a.actorId,hash,id]
   );

   return {ok:true};
  });
 }

 async revokeSession(
  a:RequestActor,
  hash:string
 ){
  return withTenant(this.pool,a.tenantId,async db=>{
   await db.query(
    `update factact.request_push_subscriptions
     set revoked_at=clock_timestamp()
     where tenant_id=$1
       and actor_operator_id=$2
       and session_token_hash=$3
       and revoked_at is null`,
    [a.tenantId,a.actorId,hash]
   );
  });
 }
}
