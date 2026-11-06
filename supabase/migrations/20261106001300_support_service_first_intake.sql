-- Shared SUPPORT reception: never equate an optional plan-member list with customer eligibility.
-- Caller affiliation is independent of the Service owner for every SUPPORT Service.
alter table factact.services drop constraint services_service_model_code_check;
alter table factact.services add constraint services_service_model_code_check
  check (length(trim(service_model_code)) between 1 and 100);

-- Stable caller input snapshot for idempotent retries of registration + Event issuance.
alter table factact.support_events add column caller_input_snapshot jsonb;
alter table factact.support_events add constraint support_caller_input_snapshot_object
  check (caller_input_snapshot is null or jsonb_typeof(caller_input_snapshot) = 'object');

alter table factact.knowledge_candidates drop constraint knowledge_candidates_topic_check;
alter table factact.knowledge_candidates add constraint knowledge_candidates_topic_check
  check (topic in ('VPN_GUIDANCE','GENERAL_SUPPORT'));

-- A support agent may register an unverified caller and affiliation during an inquiry.
-- Existing tenant isolation RLS on these Core tables continues to apply.
grant insert on factact.organizations, factact.people to factact_runtime;

