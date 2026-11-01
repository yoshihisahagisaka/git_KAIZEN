-- Review fixes for Slice 2. Existing history remains append-only and unchanged.
alter table factact.support_work_lifecycle_events add column command_payload jsonb not null default '{}'::jsonb;
alter table factact.support_work_follow_ups add column command_payload jsonb not null default '{}'::jsonb;
alter table factact.support_work_close_decisions add column command_payload jsonb not null default '{}'::jsonb;

-- V1 values retain their existing meaning. V2 explicit Close outcomes are now projected on Work.
alter table factact.work drop constraint work_check1;
alter table factact.work add constraint work_support_outcome_check check(
 (source_event_id is not null and support_event_id is null and work_type='EVENT_TASK' and lane='CHANGE' and (outcome is null or outcome='COMPLETED')) or
 (source_event_id is null and support_event_id is not null and work_type='INCIDENT' and lane='SUPPORT' and (outcome is null or outcome in ('COMPLETED','NO_ACTION_REQUIRED','RESOLVED','NOT_ELIGIBLE','WITHDRAWN','FORMALLY_TRANSFERRED','OTHER_RESPONSIBILITY_ENDED'))));
