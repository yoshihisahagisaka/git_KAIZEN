-- Append-only procedure drafts and correction attestations, not Registry facts.
create table factact.support_work_records (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null,
 request_id uuid not null, revision integer not null check(revision>0),
 kind text not null check(kind in ('DRAFT','COMPLETION','CORRECTION')),
 notes jsonb not null check(jsonb_typeof(notes)='object'),
 correction_reason text not null default '',
 recorded_by_operator_id uuid not null, recorded_at timestamptz not null,
 check(kind<>'CORRECTION' or length(trim(correction_reason))>0),
 unique(tenant_id,work_id,revision), unique(tenant_id,work_id,request_id),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id)
);
alter table factact.support_work_records enable row level security;
alter table factact.support_work_records force row level security;
create policy tenant_isolation on factact.support_work_records to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_records to factact_runtime;
-- Deliberately no UPDATE/DELETE privilege. No Event-to-Work cardinality change.
