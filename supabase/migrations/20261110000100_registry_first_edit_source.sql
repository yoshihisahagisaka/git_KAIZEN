-- First Registry edit persistence slice. No HTTP route or authoritative Person
-- mutation is enabled here. The existing JOIN Change lineage stays intact.

alter table factact.people
  add column registry_revision bigint not null default 0
    check (registry_revision >= 0);

-- A real user request is the source, not a fabricated Work/execution Action.
-- Its target Organization/ServiceRecipient relationship must also be resolved
-- and rechecked by the authorized application command in the same transaction.
create table factact.registry_edit_requests (
  id uuid primary key,
  tenant_id uuid not null,
  actor_operator_id uuid not null,
  service_id uuid not null,
  contract_profile_id uuid not null,
  service_recipient_id uuid not null,
  target_person_id uuid not null,
  source_work_id uuid,
  request_key uuid not null,
  original_display_name text not null,
  proposed_display_name text not null,
  expected_registry_revision bigint not null,
  reason text not null,
  source_information_state text not null default 'UNVERIFIED_STATEMENT'
    check (source_information_state = 'UNVERIFIED_STATEMENT'),
  review_policy_code text not null default 'PERSON_DISPLAY_NAME_DUAL_CONTROL_V1'
    check (review_policy_code = 'PERSON_DISPLAY_NAME_DUAL_CONTROL_V1'),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, actor_operator_id, request_key),
  check (length(btrim(original_display_name)) between 1 and 200),
  check (length(btrim(proposed_display_name)) between 1 and 200),
  check (original_display_name is distinct from proposed_display_name),
  check (expected_registry_revision >= 0),
  check (length(btrim(reason)) between 1 and 1000),
  foreign key (tenant_id, actor_operator_id)
    references factact.operators (tenant_id, id),
  foreign key (tenant_id, service_id)
    references factact.services (tenant_id, id),
  foreign key (tenant_id, contract_profile_id, service_id)
    references factact.contract_profiles (tenant_id, id, service_id),
  foreign key (tenant_id, service_recipient_id, service_id)
    references factact.service_recipients (tenant_id, id, service_id),
  foreign key (tenant_id, target_person_id)
    references factact.people (tenant_id, id),
  foreign key (tenant_id, source_work_id, service_id, contract_profile_id)
    references factact.work (tenant_id, id, service_id, contract_profile_id)
);

create index registry_edit_requests_target
  on factact.registry_edit_requests (tenant_id, target_person_id, created_at);
create index registry_edit_requests_recipient
  on factact.registry_edit_requests (tenant_id, service_recipient_id, created_at);

alter table factact.registry_edit_requests enable row level security;
alter table factact.registry_edit_requests force row level security;
create policy tenant_isolation on factact.registry_edit_requests
  to factact_runtime
  using (tenant_id = factact.current_tenant_id())
  with check (tenant_id = factact.current_tenant_id());
-- Immutable source: no UPDATE/DELETE, and no direct Registry field update.
grant select, insert on factact.registry_edit_requests to factact_runtime;

-- JOIN requires the Work+Action pair. Registry requires the genuine request.
-- Exactly one provenance path can be present, including on later status updates.
alter table factact.changes
  alter column work_id drop not null,
  alter column action_id drop not null,
  add column registry_edit_request_id uuid,
  add column proposed_by_operator_id uuid,
  add column committed_by_operator_id uuid;

alter table factact.changes
  drop constraint changes_change_type_check,
  drop constraint changes_change_kind_check,
  add constraint changes_change_type_check
    check (change_type in ('REALITY_CHANGE', 'KNOWLEDGE_STATE_CHANGE')),
  add constraint changes_change_kind_check
    check (change_kind in ('PRIMARY_DEVICE_ASSIGNMENT', 'PERSON_DISPLAY_NAME_CORRECTION')),
  add constraint changes_exactly_one_source_check check (
    (work_id is not null and action_id is not null
      and registry_edit_request_id is null
      and change_type = 'REALITY_CHANGE'
      and change_kind = 'PRIMARY_DEVICE_ASSIGNMENT')
    or
    (work_id is null and action_id is null
      and registry_edit_request_id is not null
      and proposed_by_operator_id is not null
      and change_type = 'KNOWLEDGE_STATE_CHANGE'
      and change_kind = 'PERSON_DISPLAY_NAME_CORRECTION')
  ),
  add constraint registry_change_two_actor_check check (
    registry_edit_request_id is null or (
      (verified_by_operator_id is null
        or verified_by_operator_id <> proposed_by_operator_id)
      and (committed_by_operator_id is null
        or committed_by_operator_id <> proposed_by_operator_id)
      and (status <> 'COMMITTED' or committed_by_operator_id is not null)
    )
  ),
  add constraint registry_change_request_tenant_fk
    foreign key (tenant_id, registry_edit_request_id)
    references factact.registry_edit_requests (tenant_id, id),
  add constraint registry_change_proposer_fk
    foreign key (tenant_id, proposed_by_operator_id)
    references factact.operators (tenant_id, id),
  add constraint registry_change_committer_fk
    foreign key (tenant_id, committed_by_operator_id)
    references factact.operators (tenant_id, id),
  add constraint registry_change_request_unique
    unique (tenant_id, registry_edit_request_id);

-- The schema contract alone does not grant UPDATE(display_name) or access to
-- new committing operations. A separately reviewed command/privilege slice
-- must establish target-specific authorization, row/Grant locks and Audit.
