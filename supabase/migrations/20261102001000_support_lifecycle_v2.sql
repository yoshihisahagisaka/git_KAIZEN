-- Slice 2: v2 SUPPORT lifecycle. Existing Work stays v1; no history is rewritten.
alter table factact.work add column lifecycle_version integer not null default 1 check(lifecycle_version in (1,2));
alter table factact.work add column waiting boolean not null default false;
alter table factact.work add column waiting_party text;
alter table factact.work add column waiting_reason text;
alter table factact.work add column next_action_open boolean not null default true;
alter table factact.work add column follow_up_at timestamptz;
alter table factact.work add column lifecycle_revision integer not null default 0 check(lifecycle_revision>=0);
alter table factact.work add check((not waiting and waiting_party is null and waiting_reason is null) or (waiting and length(trim(waiting_party))>0 and length(trim(waiting_reason))>0));

alter table factact.support_work_records drop constraint support_work_records_kind_check;
alter table factact.support_work_records add check(kind in ('DRAFT','COMPLETION','CORRECTION','CONTINUATION'));

create table factact.support_work_lifecycle_events (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null, request_id uuid not null,
 revision integer not null check(revision>0), kind text not null check(kind in ('CONTINUATION_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED')),
 next_action text not null default '', waiting_party text not null default '', waiting_reason text not null default '',
 recorded_by_operator_id uuid not null, recorded_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,work_id,request_id), unique(tenant_id,work_id,revision),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.support_work_follow_ups (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null, request_id uuid not null,
 revision integer not null check(revision>0), kind text not null check(kind in ('SET','CLEARED')),
 follow_up_at timestamptz, source_type text not null check(source_type in ('HUMAN_DECISION','CONTRACT','RULE','CUSTOMER_COMMITMENT','OTHER')),
 basis_text text not null default '', reason text not null default '', supersedes_follow_up_id uuid,
 recorded_by_operator_id uuid not null, recorded_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,work_id,request_id), unique(tenant_id,work_id,revision),
 check((kind='SET' and follow_up_at is not null) or (kind='CLEARED' and follow_up_at is null)),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,supersedes_follow_up_id) references factact.support_work_follow_ups(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.support_work_close_decisions (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null, request_id uuid not null,
 outcome text not null check(outcome in ('RESOLVED','NOT_ELIGIBLE','WITHDRAWN','FORMALLY_TRANSFERRED','OTHER_RESPONSIBILITY_ENDED')),
 close_reason text not null, provenance_type text not null check(provenance_type in ('HUMAN_DECISION','EVIDENCE','RULE','FORMAL_TRANSFER','OTHER')),
 provenance_reference text not null default '', evidence_id uuid, guard_snapshot jsonb not null,
 decided_by_operator_id uuid not null, decided_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,work_id), unique(tenant_id,work_id,request_id),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id),
 foreign key(tenant_id,decided_by_operator_id) references factact.operators(tenant_id,id)
);

alter table factact.support_work_lifecycle_events enable row level security;
alter table factact.support_work_lifecycle_events force row level security;
create policy tenant_isolation on factact.support_work_lifecycle_events to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_lifecycle_events to factact_runtime;
alter table factact.support_work_follow_ups enable row level security;
alter table factact.support_work_follow_ups force row level security;
create policy tenant_isolation on factact.support_work_follow_ups to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_follow_ups to factact_runtime;
alter table factact.support_work_close_decisions enable row level security;
alter table factact.support_work_close_decisions force row level security;
create policy tenant_isolation on factact.support_work_close_decisions to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_close_decisions to factact_runtime;
grant update(status,outcome,next_action,updated_at,closed_at,lifecycle_version,waiting,waiting_party,waiting_reason,next_action_open,follow_up_at,lifecycle_revision) on factact.work to factact_runtime;
create index support_lifecycle_history on factact.support_work_lifecycle_events(tenant_id,work_id,revision);
create index support_follow_up_history on factact.support_work_follow_ups(tenant_id,work_id,revision);
