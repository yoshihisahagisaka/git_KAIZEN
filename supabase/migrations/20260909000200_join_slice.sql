-- JOIN only. Hosted role/DDL privileges remain a deployment verification gate.
alter table factact.audit_events add column sequence bigint generated always as identity;
grant usage on sequence factact.audit_events_sequence_seq to factact_runtime;
create table factact.service_recipients (
 id uuid primary key, tenant_id uuid not null, service_id uuid not null,
 recipient_type text not null default 'PERSON' check (recipient_type='PERSON'),
 recipient_id uuid not null, status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
 created_at timestamptz not null default now(), unique(tenant_id,id),
 unique(tenant_id,service_id,recipient_id), unique(tenant_id,id,service_id),
 foreign key(tenant_id,service_id) references factact.services(tenant_id,id),
 foreign key(tenant_id,recipient_id) references factact.people(tenant_id,id)
);
create table factact.join_events (
 id uuid primary key, tenant_id uuid not null, service_id uuid not null,
 contract_profile_id uuid not null, service_recipient_id uuid not null,
 event_type text not null default 'JOIN' check(event_type='JOIN'),
 join_date date not null, occurred_at timestamptz not null, received_at timestamptz not null,
 source_type text not null default 'MANUAL' check(source_type='MANUAL'),
 status text not null check(status in ('CREATED','EVALUATED')),
 created_by_operator_id uuid not null, created_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,id,service_id,contract_profile_id,service_recipient_id),
 foreign key(tenant_id,service_id) references factact.services(tenant_id,id),
 foreign key(tenant_id,contract_profile_id) references factact.contract_profiles(tenant_id,id),
 foreign key(tenant_id,service_recipient_id,service_id) references factact.service_recipients(tenant_id,id,service_id),
 foreign key(tenant_id,created_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.requirement_evaluations (
 id uuid primary key, tenant_id uuid not null, event_id uuid not null,
 requirement_code text not null check(requirement_code='COMPANY_PC'),
 result text not null check(result in ('REQUIRED','CONDITIONAL','DECISION_REQUIRED','ALREADY_SATISFIED','NOT_APPLICABLE','WAIVED','CONDITION_NOT_MET')),
 evaluation_version integer not null check(evaluation_version=1),
 catalog_version text not null, basis_summary text not null, basis_snapshot jsonb not null,
 evaluated_by_type text not null check(evaluated_by_type='RULE'),
 evaluated_by_operator_id uuid not null, evaluated_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,id,event_id),
 unique(tenant_id,event_id,requirement_code,evaluation_version),
 foreign key(tenant_id,event_id) references factact.join_events(tenant_id,id),
 foreign key(tenant_id,evaluated_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.work (
 id uuid primary key, tenant_id uuid not null, service_id uuid not null,
 contract_profile_id uuid not null, service_recipient_id uuid not null,
 source_event_id uuid not null, source_requirement_evaluation_id uuid not null,
 work_type text not null check(work_type='EVENT_TASK'), lane text not null check(lane='CHANGE'),
 title text not null, status text not null check(status in ('OPEN','IN_PROGRESS','COMPLETED')),
 outcome text check(outcome='COMPLETED'), priority text not null default 'NORMAL',
 work_owner_operator_id uuid not null, next_action text not null, next_action_owner_operator_id uuid not null,
 created_at timestamptz not null, updated_at timestamptz not null, closed_at timestamptz,
 unique(tenant_id,id), unique(tenant_id,source_requirement_evaluation_id),
 check((status='COMPLETED')=(outcome is not null and closed_at is not null)),
 foreign key(tenant_id,source_event_id,service_id,contract_profile_id,service_recipient_id) references factact.join_events(tenant_id,id,service_id,contract_profile_id,service_recipient_id),
 foreign key(tenant_id,source_requirement_evaluation_id,source_event_id) references factact.requirement_evaluations(tenant_id,id,event_id),
 foreign key(tenant_id,work_owner_operator_id) references factact.operators(tenant_id,id),
 foreign key(tenant_id,next_action_owner_operator_id) references factact.operators(tenant_id,id)
);
create table factact.actions (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null,
 action_type text not null check(action_type='ASSIGN_DEVICE'), actor_operator_id uuid not null,
 status text not null check(status='COMPLETED'), input_json jsonb not null, result_summary text not null,
 started_at timestamptz not null, completed_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,id,work_id),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);
create table factact.changes (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null, action_id uuid not null,
 change_type text not null check(change_type='REALITY_CHANGE'),
 change_kind text not null check(change_kind='PRIMARY_DEVICE_ASSIGNMENT'),
 status text not null check(status in ('PROPOSED','VERIFIED','COMMITTED','REJECTED')),
 subject_type text not null check(subject_type='PERSON'), subject_id uuid not null,
 proposed_effect_json jsonb not null,
 verification_summary text, verified_by_operator_id uuid, verified_at timestamptz, committed_at timestamptz,
 created_at timestamptz not null, unique(tenant_id,id), unique(tenant_id,action_id),
 check(status not in ('VERIFIED','COMMITTED') or (verification_summary is not null and verified_by_operator_id is not null and verified_at is not null)),
 check((status='COMMITTED')=(committed_at is not null)),
 foreign key(tenant_id,action_id,work_id) references factact.actions(tenant_id,id,work_id),
 foreign key(tenant_id,subject_id) references factact.people(tenant_id,id),
 foreign key(tenant_id,verified_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.relations (
 id uuid primary key, tenant_id uuid not null,
 relation_type text not null check(relation_type='USES_PRIMARY_DEVICE'),
 from_entity_type text not null check(from_entity_type='PERSON'), from_entity_id uuid not null,
 to_entity_type text not null check(to_entity_type='DEVICE'), to_entity_id uuid not null,
 status text not null check(status in ('ACTIVE','ENDED')),
 effective_from timestamptz not null, effective_to timestamptz,
 source_change_id uuid not null, reliability text not null check(reliability='VERIFIED'),
 verified_at timestamptz not null, created_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,source_change_id),
 check((status='ACTIVE' and effective_to is null) or (status='ENDED' and effective_to >= effective_from)),
 foreign key(tenant_id,from_entity_id) references factact.people(tenant_id,id),
 foreign key(tenant_id,to_entity_id) references factact.devices(tenant_id,id),
 foreign key(tenant_id,source_change_id) references factact.changes(tenant_id,id)
);
create unique index one_primary_device_per_person on factact.relations(tenant_id,from_entity_id) where status='ACTIVE';
create unique index one_primary_user_per_device on factact.relations(tenant_id,to_entity_id) where status='ACTIVE';
create table factact.evidence (
 id uuid primary key, tenant_id uuid not null, evidence_type text not null check(evidence_type in ('EXECUTION_ATTESTATION','VERIFICATION')),
 title text not null, content_text text not null, created_by_operator_id uuid not null, created_at timestamptz not null,
 unique(tenant_id,id), foreign key(tenant_id,created_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.change_evidence (
 tenant_id uuid not null, change_id uuid not null, evidence_id uuid not null,
 primary key(tenant_id,change_id,evidence_id),
 foreign key(tenant_id,change_id) references factact.changes(tenant_id,id),
 foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id)
);
alter table factact.service_recipients enable row level security;
alter table factact.service_recipients force row level security;
create policy tenant_isolation on factact.service_recipients to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.service_recipients to factact_runtime;
alter table factact.join_events enable row level security;
alter table factact.join_events force row level security;
create policy tenant_isolation on factact.join_events to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.join_events to factact_runtime;
alter table factact.requirement_evaluations enable row level security;
alter table factact.requirement_evaluations force row level security;
create policy tenant_isolation on factact.requirement_evaluations to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.requirement_evaluations to factact_runtime;
alter table factact.work enable row level security;
alter table factact.work force row level security;
create policy tenant_isolation on factact.work to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.work to factact_runtime;
alter table factact.actions enable row level security;
alter table factact.actions force row level security;
create policy tenant_isolation on factact.actions to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.actions to factact_runtime;
alter table factact.changes enable row level security;
alter table factact.changes force row level security;
create policy tenant_isolation on factact.changes to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.changes to factact_runtime;
alter table factact.relations enable row level security;
alter table factact.relations force row level security;
create policy tenant_isolation on factact.relations to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.relations to factact_runtime;
alter table factact.evidence enable row level security;
alter table factact.evidence force row level security;
create policy tenant_isolation on factact.evidence to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.evidence to factact_runtime;
alter table factact.change_evidence enable row level security;
alter table factact.change_evidence force row level security;
create policy tenant_isolation on factact.change_evidence to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select, insert on factact.change_evidence to factact_runtime;
-- Column grants preserve history/proposed effects. No runtime DELETE privileges.
grant update(status) on factact.join_events to factact_runtime;
grant update(status,outcome,work_owner_operator_id,next_action,next_action_owner_operator_id,updated_at,closed_at) on factact.work to factact_runtime;
grant update(status,verification_summary,verified_by_operator_id,verified_at,committed_at) on factact.changes to factact_runtime;
grant update(status,effective_to) on factact.relations to factact_runtime;
-- Row locks require an UPDATE privilege; these columns are not changed by the adapter.
grant update(updated_at) on factact.people,factact.devices to factact_runtime;
create index work_event on factact.work(tenant_id,source_event_id);
create index changes_work on factact.changes(tenant_id,work_id);
