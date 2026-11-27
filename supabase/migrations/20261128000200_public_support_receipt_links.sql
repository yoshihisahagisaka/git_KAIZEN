-- One immutable intake-to-inquiry association. Original receipt remains unchanged.
alter table factact.public_support_receipts add constraint public_support_receipts_tenant_id_unique unique(tenant_id,id);
create table factact.public_support_receipt_links (
 tenant_id uuid not null,receipt_id uuid not null,event_id uuid not null,
 actor_operator_id uuid not null,recorded_at timestamptz not null,
 primary key(tenant_id,receipt_id),
 foreign key(tenant_id,receipt_id) references factact.public_support_receipts(tenant_id,id),
 foreign key(tenant_id,event_id) references factact.support_events(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);
alter table factact.public_support_receipt_links enable row level security;
alter table factact.public_support_receipt_links force row level security;
create policy tenant_isolation on factact.public_support_receipt_links to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.public_support_receipt_links to factact_runtime;
