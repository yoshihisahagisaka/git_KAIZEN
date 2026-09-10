-- SUPPORT specialization of shared Evaluation/Work/Action/Evidence, not a ticket store.
create table factact.support_events (
 id uuid primary key, tenant_id uuid not null, request_id uuid not null,
 service_id uuid not null, contract_profile_id uuid not null, service_recipient_id uuid not null,
 created_by_operator_id uuid not null, created_at timestamptz not null,
 unique(tenant_id,id), unique(tenant_id,request_id),
 unique(tenant_id,id,service_id,contract_profile_id,service_recipient_id),
 foreign key(tenant_id,service_id) references factact.services(tenant_id,id),
 foreign key(tenant_id,contract_profile_id) references factact.contract_profiles(tenant_id,id),
 foreign key(tenant_id,service_recipient_id,service_id) references factact.service_recipients(tenant_id,id,service_id),
 foreign key(tenant_id,created_by_operator_id) references factact.operators(tenant_id,id)
);
alter table factact.requirement_evaluations alter column event_id drop not null;
alter table factact.requirement_evaluations add column support_event_id uuid;
alter table factact.requirement_evaluations add unique(tenant_id,id,support_event_id);
alter table factact.requirement_evaluations add unique(tenant_id,support_event_id,requirement_code,evaluation_version);
alter table factact.requirement_evaluations add foreign key(tenant_id,support_event_id) references factact.support_events(tenant_id,id);
alter table factact.requirement_evaluations drop constraint requirement_evaluations_requirement_code_check;
alter table factact.requirement_evaluations drop constraint requirement_evaluations_evaluated_by_type_check;
alter table factact.requirement_evaluations add check(
 (event_id is not null and support_event_id is null and requirement_code='COMPANY_PC' and evaluated_by_type='RULE') or
 (event_id is null and support_event_id is not null and requirement_code='SUPPORT_ASSISTANCE' and evaluated_by_type='HUMAN'));
alter table factact.work alter column source_event_id drop not null;
alter table factact.work add column support_event_id uuid;
alter table factact.work drop constraint work_work_type_check;
alter table factact.work drop constraint work_lane_check;
alter table factact.work drop constraint work_outcome_check;
alter table factact.work add check(
 (source_event_id is not null and support_event_id is null and work_type='EVENT_TASK' and lane='CHANGE' and (outcome is null or outcome='COMPLETED')) or
 (source_event_id is null and support_event_id is not null and work_type='INCIDENT' and lane='SUPPORT' and (outcome is null or outcome in ('COMPLETED','NO_ACTION_REQUIRED'))));
alter table factact.work add foreign key(tenant_id,support_event_id,service_id,contract_profile_id,service_recipient_id) references factact.support_events(tenant_id,id,service_id,contract_profile_id,service_recipient_id);
alter table factact.work add foreign key(tenant_id,source_requirement_evaluation_id,support_event_id) references factact.requirement_evaluations(tenant_id,id,support_event_id);
alter table factact.actions drop constraint actions_action_type_check;
alter table factact.actions add check(action_type in ('ASSIGN_DEVICE','INVESTIGATE_GUIDE'));
alter table factact.evidence drop constraint evidence_evidence_type_check;
alter table factact.evidence add check(evidence_type in ('EXECUTION_ATTESTATION','VERIFICATION','DIAGNOSTIC'));
create table factact.recipient_observations (
 id uuid primary key,tenant_id uuid not null,support_event_id uuid not null,
 content_text text not null check(length(trim(content_text))>0),
 source_type text not null check(source_type='CALLER'),
 semantic_type text not null check(semantic_type='OBSERVATION'),reliability text not null check(reliability='UNVERIFIED'),
 observed_at timestamptz not null,recorded_by_operator_id uuid not null,
 review_policy text not null check(review_policy='REVIEW_FOR_EACH_INQUIRY'),
 unique(tenant_id,id),unique(tenant_id,support_event_id),
 foreign key(tenant_id,support_event_id) references factact.support_events(tenant_id,id),
 foreign key(tenant_id,recorded_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.support_decisions (
 id uuid primary key,tenant_id uuid not null,work_id uuid not null,evidence_id uuid not null,action_id uuid not null,
 mode text not null check(mode in ('GUIDANCE_ONLY','NO_ACTION_REQUIRED')),
 rationale text not null check(length(trim(rationale))>0),
 decided_by_operator_id uuid not null,decided_at timestamptz not null,
 unique(tenant_id,id),unique(tenant_id,work_id),unique(tenant_id,id,work_id,evidence_id),
 foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
 foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id),
 foreign key(tenant_id,action_id,work_id) references factact.actions(tenant_id,id,work_id),
 foreign key(tenant_id,decided_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.knowledge_candidates (
 id uuid primary key,tenant_id uuid not null,source_work_id uuid not null,source_decision_id uuid not null,source_evidence_id uuid not null,
 title text not null check(length(trim(title))>0),content_text text not null check(length(trim(content_text))>0),
 status text not null check(status='CANDIDATE'),topic text not null check(topic='VPN_GUIDANCE'),
 created_by_operator_id uuid not null,created_at timestamptz not null,
 unique(tenant_id,id),unique(tenant_id,source_work_id),
 foreign key(tenant_id,source_decision_id,source_work_id,source_evidence_id) references factact.support_decisions(tenant_id,id,work_id,evidence_id),
 foreign key(tenant_id,created_by_operator_id) references factact.operators(tenant_id,id)
);
do $$ declare t text; begin
 foreach t in array array['support_events','recipient_observations','support_decisions','knowledge_candidates'] loop
 execute format('alter table factact.%I enable row level security',t);
 execute format('alter table factact.%I force row level security',t);
 execute format('create policy tenant_isolation on factact.%I to factact_runtime using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id())',t);
 execute format('grant select,insert on factact.%I to factact_runtime',t);
 end loop;
end $$;
-- FOR UPDATE serializes evaluation retries; no business data column is updated.
grant update(id) on factact.support_events to factact_runtime;
create index support_work_event on factact.work(tenant_id,support_event_id);
