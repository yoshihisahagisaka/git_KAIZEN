-- SUPPORT Work Context is an append-only record of a deliberate human selection.
-- It is intentionally separate from the verified Person -> Device Registry relation.
create table factact.support_work_device_contexts (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null,
 request_id uuid not null, revision integer not null check(revision>0),
 kind text not null check(kind in ('CONFIRMED','CORRECTED','ENDED')),
 device_id uuid,
 confirmation_source text not null check(confirmation_source in ('OPERATOR','CALLER','OTHER')),
 evidence_id uuid,
 reason text not null default '', supersedes_context_id uuid,
 recorded_by_operator_id uuid not null, recorded_at timestamptz not null,
 check((kind='ENDED' and device_id is null and length(trim(reason))>0) or
       (kind in ('CONFIRMED','CORRECTED') and device_id is not null)),
 check(kind<>'CORRECTED' or length(trim(reason))>0),
 unique(tenant_id,id), unique(tenant_id,work_id,revision), unique(tenant_id,work_id,request_id),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,device_id) references factact.devices(tenant_id,id),
 foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id),
 foreign key(tenant_id,supersedes_context_id) references factact.support_work_device_contexts(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id)
);
alter table factact.support_work_device_contexts enable row level security;
alter table factact.support_work_device_contexts force row level security;
create policy tenant_isolation on factact.support_work_device_contexts to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_device_contexts to factact_runtime;
-- No UPDATE/DELETE privilege: current state is derived from the newest record.
create index support_work_device_context_history on factact.support_work_device_contexts(tenant_id,work_id,revision);
