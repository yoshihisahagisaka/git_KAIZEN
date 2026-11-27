-- Undirected, append-only inquiry reference; no Work lifecycle mutation.
create table factact.support_inquiry_links (
 id uuid primary key,tenant_id uuid not null,left_event_id uuid not null,right_event_id uuid not null,
 revision integer not null check(revision>0),kind text not null check(kind in ('LINKED','UNLINKED')),
 command_id uuid not null,actor_operator_id uuid not null,recorded_at timestamptz not null,
 check(left_event_id<right_event_id),
 unique(tenant_id,left_event_id,right_event_id,revision),unique(tenant_id,command_id),
 foreign key(tenant_id,left_event_id) references factact.support_events(tenant_id,id),
 foreign key(tenant_id,right_event_id) references factact.support_events(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);
create index support_inquiry_links_right on factact.support_inquiry_links(tenant_id,right_event_id);
alter table factact.support_inquiry_links enable row level security;
alter table factact.support_inquiry_links force row level security;
create policy tenant_isolation on factact.support_inquiry_links to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_inquiry_links to factact_runtime;
