-- S3c-1A acceptance follow-up: re-authorize every immutable Work-bound
-- Device command replay and keep proposal identity stable after commit.
begin;

do $$ begin
  execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
end $$;
grant create on schema factact,factact_private to factact_device_executor;
set local role factact_device_executor;

create or replace function factact.record_support_device_field_observation(
  p_tenant uuid,p_actor uuid,p_command jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_id uuid:=gen_random_uuid();v_evidence uuid:=gen_random_uuid();
  v_request uuid:=nullif(p_command->>'requestId','')::uuid;
  v_work uuid:=nullif(p_command->>'workId','')::uuid;
  v_context uuid:=nullif(p_command->>'targetContextId','')::uuid;
  v_device uuid:=nullif(p_command->>'deviceId','')::uuid;
  v_org_recipient uuid:=nullif(p_command->>'organizationServiceRecipientId','')::uuid;
  v_field text:=p_command->>'fieldKey';v_value text:=p_command->>'observedValue';
  v_expected integer:=(p_command->>'expectedRevision')::integer;v_now timestamptz:=now();
  v_work_row record;v_device_row record;v_prior record;v_latest record;v_revision integer;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or jsonb_typeof(p_command)<>'object'
    or (select array_agg(k order by k) from jsonb_object_keys(p_command) k)
       <> array['deviceId','expectedRevision','fieldKey','observedValue',
                'organizationServiceRecipientId','requestId','targetContextId','workId']::text[]
    or v_field not in ('assetTag','displayName','serialNumber','deviceStatus')
    or length(btrim(coalesce(v_value,''))) not between 1 and 2000 or v_expected<0 then
    raise exception 'invalid SUPPORT Device observation' using errcode='22023';
  end if;
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  if not factact_private.support_device_observation_authorized(p_tenant,p_actor,v_work,
      v_context,v_device,v_org_recipient,'RECORD') then
    raise exception 'SUPPORT Device observation authority required' using errcode='42501';
  end if;
  select w.service_id,w.contract_profile_id,w.service_recipient_id,person.organization_id
    into v_work_row from factact.work w join factact.service_recipients recipient
      on recipient.tenant_id=w.tenant_id and recipient.id=w.service_recipient_id
      and recipient.recipient_type='PERSON'
    join factact.people person on person.tenant_id=recipient.tenant_id
      and person.id=recipient.recipient_id
    where w.tenant_id=p_tenant and w.id=v_work for update of w;
  select d.*,case v_field when 'assetTag' then d.asset_tag
      when 'displayName' then d.display_name when 'serialNumber' then d.serial_number
      when 'deviceStatus' then d.device_status end current_value into v_device_row
    from factact.devices d where d.tenant_id=p_tenant and d.id=v_device for update;
  if not factact_private.support_device_observation_authorized(p_tenant,p_actor,v_work,
      v_context,v_device,v_org_recipient,'RECORD') then
    raise exception 'SUPPORT Device observation authority required' using errcode='42501';
  end if;
  select * into v_prior from factact.device_work_field_observations
    where tenant_id=p_tenant and work_id=v_work and request_key=v_request;
  if found then
    if v_prior.observed_by_operator_id=p_actor and v_prior.target_context_id=v_context
      and v_prior.device_id=v_device and v_prior.organization_service_recipient_id=v_org_recipient
      and v_prior.field_key=v_field and v_prior.observed_value=v_value
      and v_prior.revision=v_expected+1 then return v_prior.id; end if;
    raise exception 'SUPPORT Device observation retry conflict' using errcode='40001';
  end if;
  select * into v_latest from factact.device_work_field_observations
    where tenant_id=p_tenant and work_id=v_work order by revision desc limit 1;
  v_revision:=coalesce(v_latest.revision,0)+1;
  if v_expected<>coalesce(v_latest.revision,0) then
    raise exception 'stale SUPPORT Device observation revision' using errcode='40001';
  end if;
  insert into factact.evidence(id,tenant_id,evidence_type,title,content_text,
    created_by_operator_id,created_at)
  values(v_evidence,p_tenant,'SOURCE_REFERENCE','SUPPORT Device field direct observation',
    jsonb_build_object('origin','OPERATOR_DIRECT_OBSERVATION','observationId',v_id,
      'workId',v_work,'targetContextId',v_context,'deviceId',v_device,'fieldKey',v_field,
      'observedValue',v_value,'observedAt',v_now,'observedByOperatorId',p_actor)::text,p_actor,v_now);
  insert into factact.device_work_field_observations(id,tenant_id,service_id,
    contract_profile_id,organization_id,work_id,work_person_recipient_id,
    organization_service_recipient_id,target_context_id,device_id,field_key,observed_value,
    observed_at,observed_by_operator_id,evidence_id,request_key,revision,supersedes_id,recorded_at)
  values(v_id,p_tenant,v_work_row.service_id,v_work_row.contract_profile_id,
    v_work_row.organization_id,v_work,v_work_row.service_recipient_id,v_org_recipient,
    v_context,v_device,v_field,v_value,v_now,p_actor,v_evidence,v_request,v_revision,
    (select old.id from factact.device_work_field_observations old
      where old.tenant_id=p_tenant and old.work_id=v_work and old.target_context_id=v_context
        and old.device_id=v_device and old.field_key=v_field order by old.revision desc limit 1),v_now);
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values(gen_random_uuid(),p_tenant,
    'SUPPORT_DEVICE_FIELD_OBSERVATION',v_id,'SUPPORT_DEVICE_FIELD_OBSERVED',p_actor,
    jsonb_build_object('workId',v_work,'targetContextId',v_context,'deviceId',v_device,
      'fieldKey',v_field,'revision',v_revision,'evidenceId',v_evidence));
  return v_id;
end $$;

create or replace function factact.propose_observed_device_field_change(
  p_tenant uuid,p_actor uuid,p_observation uuid,p_change uuid,p_request_key text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v record;v_prior record;v_fingerprint text;v_request uuid:=gen_random_uuid();v_effect jsonb;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or p_observation is null or p_change is null or length(p_request_key) not between 8 and 100
    or p_request_key!~'^[a-zA-Z0-9_-]+$' then
    raise exception 'invalid observed Device proposal' using errcode='22023';
  end if;
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  select o.*,d.registry_revision,d.asset_tag,d.display_name,d.serial_number,d.device_status
    into v from factact.device_work_field_observations o
    join factact.devices d on d.tenant_id=o.tenant_id and d.id=o.device_id
    where o.tenant_id=p_tenant and o.id=p_observation for update of d;
  if not found then raise exception 'observed Device source unavailable' using errcode='42501'; end if;
  perform 1 from factact.work where tenant_id=p_tenant and id=v.work_id for update;
  if v.observed_by_operator_id<>p_actor
    or (v.field_key='deviceStatus' and v.observed_value not in ('AVAILABLE','UNAVAILABLE','RETIRED'))
    or (v.field_key<>'deviceStatus' and v.observed_value is distinct from
      (case v.field_key when 'assetTag' then v.asset_tag when 'displayName' then v.display_name
        when 'serialNumber' then v.serial_number end))
    or not factact_private.support_device_observation_authorized(p_tenant,p_actor,
      v.work_id,v.target_context_id,v.device_id,v.organization_service_recipient_id,'PROPOSE')
    or exists(select 1 from factact.device_work_field_observations newer
      where newer.tenant_id=p_tenant and newer.work_id=v.work_id
        and newer.target_context_id=v.target_context_id and newer.device_id=v.device_id
        and newer.field_key=v.field_key and newer.revision>v.revision) then
    raise exception 'observed Device source unavailable' using errcode='42501';
  end if;
  v_effect:=jsonb_build_object('field',v.field_key,'observedValue',v.observed_value,
    'verificationSource',jsonb_build_object('kind','SUPPORT_WORK',
      'origin','OPERATOR_DIRECT_OBSERVATION','evidenceId',v.evidence_id,
      'locator','device-work-observation:'||v.id,'observedAt',v.observed_at,
      'workId',v.work_id,'observationId',v.id));
  v_fingerprint:=md5(jsonb_build_object('observationId',v.id,'changeId',p_change,
    'requestKey',p_request_key,'deviceId',v.device_id,'effect',v_effect)::text);
  select r.*,c.id change_id into v_prior from factact.device_change_requests r
    join factact.changes c on c.tenant_id=r.tenant_id and c.device_change_request_id=r.id
    where r.tenant_id=p_tenant and r.request_key=p_request_key;
  if found then
    if v_prior.actor_operator_id=p_actor and v_prior.change_id=p_change
      and v_prior.target_device_id=v.device_id and v_prior.request_kind='DEVICE_FIELD_VERIFICATION'
      and v_prior.proposed_effect_json=v_effect and v_prior.source_evidence_id=v.evidence_id
      and v_prior.source_kind='SUPPORT_WORK'
      and v_prior.source_locator='device-work-observation:'||v.id
      and v_prior.source_observed_at=v.observed_at and v_prior.source_work_id=v.work_id
      and v_prior.context_work_id is null then return p_change; end if;
    raise exception 'Device request key conflict' using errcode='23505';
  end if;
  insert into factact.device_change_requests(id,tenant_id,actor_operator_id,service_id,
    contract_profile_id,service_recipient_id,organization_id,target_device_id,request_key,
    request_kind,expected_registry_revision,proposed_effect_json,source_evidence_id,
    source_kind,source_locator,source_observed_at,source_work_id,request_fingerprint,context_work_id)
  values(v_request,p_tenant,p_actor,v.service_id,v.contract_profile_id,
    v.organization_service_recipient_id,v.organization_id,v.device_id,p_request_key,
    'DEVICE_FIELD_VERIFICATION',v.registry_revision,v_effect,v.evidence_id,'SUPPORT_WORK',
    'device-work-observation:'||v.id,v.observed_at,v.work_id,v_fingerprint,null);
  insert into factact.device_change_request_sources(tenant_id,request_id,field_key,field_value,
    source_evidence_id,source_kind,source_locator,source_observed_at,source_work_id)
  values(p_tenant,v_request,v.field_key,v.observed_value,v.evidence_id,'SUPPORT_WORK',
    'device-work-observation:'||v.id,v.observed_at,v.work_id);
  insert into factact.changes(id,tenant_id,work_id,action_id,change_type,change_kind,
    subject_type,subject_id,device_subject_id,device_change_request_id,
    proposed_by_operator_id,proposed_effect_json,status,created_at)
  values(p_change,p_tenant,null,null,'KNOWLEDGE_STATE_CHANGE','DEVICE_FIELD_VERIFICATION',
    'DEVICE',null,v.device_id,v_request,p_actor,v_effect,'PROPOSED',now());
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values(gen_random_uuid(),p_tenant,'DEVICE_CHANGE',
    p_change,'DEVICE_CHANGE_PROPOSED',p_actor,jsonb_build_object('requestId',v_request,
      'kind','DEVICE_FIELD_VERIFICATION','observationId',v.id,'workId',v.work_id));
  return p_change;
end $$;

alter function factact.device_confirm_change(uuid,uuid,uuid,text)
  rename to device_confirm_change_pre_s3c1a_replay_authority;
revoke all on function factact.device_confirm_change_pre_s3c1a_replay_authority(
  uuid,uuid,uuid,text) from public,factact_runtime;

create function factact.device_confirm_change(p_tenant uuid,p_actor uuid,p_change uuid,p_summary text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v record;v_observation record;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null or p_change is null
    or length(btrim(coalesce(p_summary,''))) not between 1 and 1000 then
    raise exception 'invalid Device confirmation' using errcode='22023';
  end if;
  select c.status,c.committed_by_operator_id,c.verification_summary,r.* into v
    from factact.changes c join factact.device_change_requests r
      on r.tenant_id=c.tenant_id and r.id=c.device_change_request_id
    where c.tenant_id=p_tenant and c.id=p_change;
  if not found or v.actor_operator_id=p_actor then
    raise exception 'Device change unavailable' using errcode='42501';
  end if;
  if v.actor_operator_id::text<p_actor::text then
    perform factact.lock_scoped_actor_authority(p_tenant,v.actor_operator_id);
    perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  else
    perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
    perform factact.lock_scoped_actor_authority(p_tenant,v.actor_operator_id);
  end if;
  select c.status,c.committed_by_operator_id,c.verification_summary,r.* into v
    from factact.changes c join factact.device_change_requests r
      on r.tenant_id=c.tenant_id and r.id=c.device_change_request_id
    where c.tenant_id=p_tenant and c.id=p_change for update of c;
  if not factact_private.device_command_authorized(p_tenant,p_actor,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,'REVIEW')
    or not factact_private.device_command_authorized(p_tenant,p_actor,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,'APPROVE')
    or not factact_private.device_command_authorized(p_tenant,v.actor_operator_id,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,
      case when v.request_kind='DEVICE_INITIAL_INFORMATION' then 'CREATE' else 'UPDATE' end) then
    raise exception 'Device confirmation authority unavailable' using errcode='42501';
  end if;
  if v.request_kind='DEVICE_FIELD_VERIFICATION' then
    select o.* into v_observation from factact.device_work_field_observations o
      where o.tenant_id=p_tenant and o.evidence_id=v.source_evidence_id
        and v.source_kind='SUPPORT_WORK'
        and v.source_locator='device-work-observation:'||o.id
        and o.observed_at=v.source_observed_at and o.work_id=v.source_work_id
        and o.device_id=v.target_device_id
        and not exists(select 1 from factact.device_work_field_observations newer
          where newer.tenant_id=o.tenant_id and newer.work_id=o.work_id
            and newer.target_context_id=o.target_context_id and newer.device_id=o.device_id
            and newer.field_key=o.field_key and newer.revision>o.revision);
    if not found
      or not factact_private.support_device_observation_authorized(p_tenant,v.actor_operator_id,
        v_observation.work_id,v_observation.target_context_id,v_observation.device_id,
        v_observation.organization_service_recipient_id,'PROPOSE')
      or not factact_private.support_device_observation_authorized(p_tenant,p_actor,
        v_observation.work_id,v_observation.target_context_id,v_observation.device_id,
        v_observation.organization_service_recipient_id,'CONFIRM') then
      raise exception 'bound Device field observation unavailable' using errcode='42501';
    end if;
  end if;
  return factact.device_confirm_change_pre_s3c1a_replay_authority(
    p_tenant,p_actor,p_change,p_summary);
end $$;

revoke all on function factact.device_confirm_change(uuid,uuid,uuid,text) from public;
grant execute on function factact.device_confirm_change(uuid,uuid,uuid,text) to factact_runtime;
alter function factact.record_support_device_field_observation(uuid,uuid,jsonb)
  owner to factact_device_executor;
alter function factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)
  owner to factact_device_executor;
alter function factact.device_confirm_change_pre_s3c1a_replay_authority(uuid,uuid,uuid,text)
  owner to factact_device_executor;
alter function factact.device_confirm_change(uuid,uuid,uuid,text) owner to factact_device_executor;

reset role;
revoke create on schema factact,factact_private from factact_device_executor;
do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set false, inherit false',current_user);
  else
    execute format('revoke factact_device_executor from %I granted by %I',current_user,current_user);
  end if;
end $$;
commit;
