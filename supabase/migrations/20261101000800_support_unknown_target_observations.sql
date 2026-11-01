-- Slice 1 residual: an unidentified Work target is a deliberate Work-context fact,
-- never a fabricated Device or Registry relation.
alter table factact.support_work_device_contexts drop constraint support_work_device_contexts_kind_check;
alter table factact.support_work_device_contexts add check(kind in ('CONFIRMED','CORRECTED','UNIDENTIFIED','ENDED'));
alter table factact.support_work_device_contexts drop constraint support_work_device_contexts_check;
alter table factact.support_work_device_contexts add check(
 (kind='ENDED' and device_id is null and length(trim(reason))>0) or
 (kind='UNIDENTIFIED' and device_id is null) or
 (kind in ('CONFIRMED','CORRECTED') and device_id is not null));

create table factact.support_work_target_observations (
 id uuid primary key, tenant_id uuid not null, work_id uuid not null, target_context_id uuid not null,
 request_id uuid not null, revision integer not null check(revision>0),
 kind text not null check(kind in ('IDENTIFICATION','OWNERSHIP','MANAGEMENT_STATE')),
 value text not null check(value in ('UNIDENTIFIED','PARTIALLY_IDENTIFIED','PERSONALLY_OWNED','COMPANY_OWNED','MANAGED','UNMANAGED','UNKNOWN')),
 detail text not null default '', source_type text not null check(source_type in ('OPERATOR','CALLER','OTHER')),
 evidence_id uuid, supersedes_observation_id uuid, recorded_by_operator_id uuid not null, recorded_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,work_id,request_id), unique(tenant_id,work_id,revision),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,target_context_id) references factact.support_work_device_contexts(tenant_id,id),
 foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id),
 foreign key(tenant_id,supersedes_observation_id) references factact.support_work_target_observations(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id),
 check((kind='IDENTIFICATION' and value in ('UNIDENTIFIED','PARTIALLY_IDENTIFIED','UNKNOWN')) or
       (kind='OWNERSHIP' and value in ('PERSONALLY_OWNED','COMPANY_OWNED','UNKNOWN')) or
       (kind='MANAGEMENT_STATE' and value in ('MANAGED','UNMANAGED','UNKNOWN')))
);
create function factact.assert_support_target_observation_same_work() returns trigger language plpgsql as $$
begin
 if not exists(select 1 from factact.support_work_device_contexts c where c.tenant_id=new.tenant_id and c.id=new.target_context_id and c.work_id=new.work_id) then
  raise exception 'target context must belong to the same Work' using errcode='23514';
 end if;
 if new.supersedes_observation_id is not null and not exists(select 1 from factact.support_work_target_observations p where p.tenant_id=new.tenant_id and p.id=new.supersedes_observation_id and p.work_id=new.work_id) then
  raise exception 'superseded observation must belong to the same Work' using errcode='23514';
 end if;
 return new;
end $$;
create trigger support_target_observation_same_work before insert on factact.support_work_target_observations for each row execute function factact.assert_support_target_observation_same_work();
alter table factact.support_work_target_observations enable row level security;
alter table factact.support_work_target_observations force row level security;
create policy tenant_isolation on factact.support_work_target_observations to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.support_work_target_observations to factact_runtime;
create index support_work_target_observation_history on factact.support_work_target_observations(tenant_id,work_id,revision);
