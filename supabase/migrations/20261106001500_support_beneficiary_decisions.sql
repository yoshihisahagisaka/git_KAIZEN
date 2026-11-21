-- Caller Person is the legacy technical recipient. The confirmed receiving
-- company is a separate, append-only SUPPORT association, not an entitlement.
alter table factact.support_events
  add constraint support_events_tenant_id_service_unique unique (tenant_id, id, service_id);

alter table factact.service_recipients
  add constraint service_recipients_typed_service_unique unique (tenant_id, id, service_id, recipient_type);

create table factact.support_event_beneficiary_decisions (
  id uuid primary key,
  tenant_id uuid not null,
  support_event_id uuid not null,
  service_id uuid not null,
  request_id uuid not null,
  revision integer not null check (revision > 0),
  kind text not null check (kind in ('CONFIRMED', 'CLEARED')),
  service_recipient_id uuid,
  recipient_type text not null default 'ORGANIZATION' check (recipient_type = 'ORGANIZATION'),
  reason text not null check (length(trim(reason)) between 1 and 1000),
  recorded_by_operator_id uuid not null,
  recorded_at timestamptz not null,
  check (
    (kind = 'CONFIRMED' and service_recipient_id is not null)
    or (kind = 'CLEARED' and service_recipient_id is null)
  ),
  unique (tenant_id, id),
  unique (tenant_id, support_event_id, request_id),
  unique (tenant_id, support_event_id, revision),
  foreign key (tenant_id, support_event_id, service_id)
    references factact.support_events (tenant_id, id, service_id),
  foreign key (tenant_id, service_recipient_id, service_id, recipient_type)
    references factact.service_recipients (tenant_id, id, service_id, recipient_type),
  foreign key (tenant_id, recorded_by_operator_id)
    references factact.operators (tenant_id, id)
);

create index support_beneficiary_by_event
  on factact.support_event_beneficiary_decisions (tenant_id, support_event_id, revision desc);
alter table factact.support_event_beneficiary_decisions enable row level security;
alter table factact.support_event_beneficiary_decisions force row level security;
create policy tenant_isolation on factact.support_event_beneficiary_decisions
  to factact_runtime using (tenant_id = factact.current_tenant_id())
  with check (tenant_id = factact.current_tenant_id());
grant select, insert on factact.support_event_beneficiary_decisions to factact_runtime;
