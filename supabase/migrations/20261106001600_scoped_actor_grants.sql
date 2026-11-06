-- Persist explicit, tenant-scoped grants for a verified Actor/Operator binding.
-- No Caller, Person affiliation, Work ownership, or Role creates a grant.
-- External login/multiple-Tenant membership remains a separate ADR gate.

alter table factact.contract_profiles
  add constraint contract_profiles_tenant_id_service_unique unique (tenant_id, id, service_id);
alter table factact.work
  add constraint work_tenant_id_service_contract_unique unique (tenant_id, id, service_id, contract_profile_id);

create table factact.scoped_actor_grants (
  id uuid primary key,
  tenant_id uuid not null,
  actor_operator_id uuid not null,
  service_id uuid not null,
  contract_profile_id uuid not null,
  scope_kind text not null check (scope_kind in ('SERVICE','SERVICE_RECIPIENT','WORK')),
  service_recipient_id uuid,
  work_id uuid,
  object_kind text not null check (object_kind in ('SUPPORT','REGISTRY','PROCEDURE','KNOWLEDGE')),
  operations text[] not null check (
    cardinality(operations) between 1 and 5
    and array_position(operations, null) is null
    and operations <@ array['READ','CREATE','UPDATE','REVIEW','APPROVE']::text[]
  ),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  effective_from timestamptz not null,
  effective_until timestamptz,
  issued_by_operator_id uuid not null,
  issued_at timestamptz not null default now(),
  revoked_by_operator_id uuid,
  revoked_at timestamptz,
  revocation_reason text,
  unique (tenant_id, id),
  check (effective_until is null or effective_until > effective_from),
  check (
    (scope_kind = 'SERVICE' and service_recipient_id is null and work_id is null)
    or (scope_kind = 'SERVICE_RECIPIENT' and service_recipient_id is not null and work_id is null)
    or (scope_kind = 'WORK' and service_recipient_id is not null and work_id is not null)
  ),
  check (
    (status = 'ACTIVE' and revoked_at is null and revoked_by_operator_id is null and revocation_reason is null)
    or (status = 'REVOKED' and revoked_at is not null and revoked_by_operator_id is not null
        and revocation_reason is not null and length(trim(revocation_reason)) between 1 and 1000)
  ),
  foreign key (tenant_id, actor_operator_id) references factact.operators (tenant_id, id),
  foreign key (tenant_id, issued_by_operator_id) references factact.operators (tenant_id, id),
  foreign key (tenant_id, revoked_by_operator_id) references factact.operators (tenant_id, id),
  foreign key (tenant_id, service_id) references factact.services (tenant_id, id),
  foreign key (tenant_id, contract_profile_id, service_id)
    references factact.contract_profiles (tenant_id, id, service_id),
  foreign key (tenant_id, service_recipient_id, service_id)
    references factact.service_recipients (tenant_id, id, service_id),
  foreign key (tenant_id, work_id, service_id, contract_profile_id)
    references factact.work (tenant_id, id, service_id, contract_profile_id)
);

create index scoped_actor_grants_actor_context
  on factact.scoped_actor_grants (tenant_id, actor_operator_id, service_id, contract_profile_id);
alter table factact.scoped_actor_grants enable row level security;
alter table factact.scoped_actor_grants force row level security;
create policy tenant_isolation on factact.scoped_actor_grants
  to factact_runtime using (tenant_id = factact.current_tenant_id())
  with check (tenant_id = factact.current_tenant_id());
-- Deliberately read-only: issuance/revocation requires a separately reviewed
-- audited management command. Neither session login nor SUPPORT may mutate it.
grant select on factact.scoped_actor_grants to factact_runtime;
