-- Actor-specific notification intent, atomic with request publication/response.
-- No transport delivery or external network action in this migration.
create table factact.service_request_notifications (
 id uuid primary key,
 tenant_id uuid not null,
 request_id uuid not null,
 revision integer not null check(revision>=0),
 recipient_operator_id uuid not null,
 kind text not null check(kind in ('CREATED','STARTED','COMMENTED','COMPLETED')),
 created_at timestamptz not null,
 acknowledged_at timestamptz,
 unique(tenant_id,request_id,revision,recipient_operator_id),
 check((revision=0)=(kind='CREATED')),
 check(acknowledged_at is null or acknowledged_at>=created_at),
 foreign key(tenant_id,request_id) references factact.service_requests(tenant_id,id),
 foreign key(tenant_id,recipient_operator_id) references factact.operators(tenant_id,id)
);
create index service_request_notifications_inbox on factact.service_request_notifications(tenant_id,recipient_operator_id,created_at desc,id desc);
alter table factact.service_request_notifications enable row level security;
alter table factact.service_request_notifications force row level security;
create policy tenant_isolation on factact.service_request_notifications to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert,update(acknowledged_at) on factact.service_request_notifications to factact_runtime;
