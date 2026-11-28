-- Transport history only; original notification and business facts are unchanged.
alter table factact.request_push_subscriptions add constraint request_push_subscriptions_tenant_id_id_key unique(tenant_id,id);
alter table factact.service_request_notifications add constraint service_request_notifications_tenant_id_id_key unique(tenant_id,id);
create table factact.request_push_deliveries (
 id uuid primary key,
 tenant_id uuid not null,
 notification_id uuid not null,
 subscription_id uuid not null,
 state text not null check(state in ('SENDING','ACCEPTED','REJECTED','UNKNOWN','GONE','SKIPPED')),
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 http_status integer check(http_status between 100 and 599),
 unique(tenant_id,notification_id,subscription_id),
 foreign key(tenant_id,notification_id) references factact.service_request_notifications(tenant_id,id),
 foreign key(tenant_id,subscription_id) references factact.request_push_subscriptions(tenant_id,id),
 check((state='SENDING')=(finished_at is null)),
 check(finished_at is null or finished_at>=started_at)
);
alter table factact.request_push_deliveries enable row level security;
alter table factact.request_push_deliveries force row level security;
create policy tenant_isolation on factact.request_push_deliveries to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert,update(state,finished_at,http_status) on factact.request_push_deliveries to factact_runtime;
