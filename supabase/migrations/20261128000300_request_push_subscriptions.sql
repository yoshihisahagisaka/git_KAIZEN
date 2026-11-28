-- Device subscriptions are transport configuration, not business facts.
-- No delivery or external network operations in this migration.

create table factact.request_push_subscriptions (
 id uuid primary key,
 tenant_id uuid not null,
 actor_operator_id uuid not null,
 session_token_hash text not null,
 endpoint text not null,
 p256dh text not null,
 auth_secret text not null,
 created_at timestamptz not null default clock_timestamp(),
 revoked_at timestamptz,
 unique(tenant_id,session_token_hash,endpoint),
 foreign key(tenant_id,actor_operator_id)
  references factact.operators(tenant_id,id),
 check(length(session_token_hash)=64),
 check(length(endpoint) between 1 and 2048),
 check(length(p256dh) between 1 and 128),
 check(length(auth_secret) between 1 and 64),
 check(revoked_at is null or revoked_at>=created_at)
);

create index request_push_subscriptions_actor_idx
 on factact.request_push_subscriptions
 (tenant_id,actor_operator_id)
 where revoked_at is null;

alter table factact.request_push_subscriptions
 enable row level security;

alter table factact.request_push_subscriptions
 force row level security;

create policy tenant_isolation
 on factact.request_push_subscriptions
 to factact_runtime
 using(tenant_id=factact.current_tenant_id())
 with check(tenant_id=factact.current_tenant_id());

grant select,insert,update(revoked_at)
 on factact.request_push_subscriptions
 to factact_runtime;
