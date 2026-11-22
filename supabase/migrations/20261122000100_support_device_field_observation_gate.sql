-- S3c-1A: immutable SUPPORT Work direct-observation binding and the only
-- admissible Device FIELD_VERIFICATION proposal path.
begin;

create table factact.device_work_field_observations (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  contract_profile_id uuid not null,
  organization_id uuid not null,
  work_id uuid not null,
  work_person_recipient_id uuid not null,
  organization_service_recipient_id uuid not null,
  target_context_id uuid not null,
  device_id uuid not null,
  field_key text not null check(field_key in
    ('assetTag','displayName','serialNumber','deviceStatus')),
  observed_value text not null check(length(btrim(observed_value)) between 1 and 2000),
  observed_at timestamptz not null,
  observed_by_operator_id uuid not null,
  evidence_id uuid not null,
  request_key uuid not null,
  revision integer not null check(revision>0),
  supersedes_id uuid,
  recorded_at timestamptz not null,
  unique(tenant_id,id),
  unique(tenant_id,work_id,request_key),
  unique(tenant_id,work_id,revision),
  foreign key(tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key(tenant_id,contract_profile_id) references factact.contract_profiles(tenant_id,id),
  foreign key(tenant_id,organization_id) references factact.organizations(tenant_id,id),
  foreign key(tenant_id,work_id) references factact.work(tenant_id,id),
  foreign key(tenant_id,work_person_recipient_id)
    references factact.service_recipients(tenant_id,id),
  foreign key(tenant_id,organization_service_recipient_id)
    references factact.service_recipients(tenant_id,id),
  foreign key(tenant_id,target_context_id)
    references factact.support_work_device_contexts(tenant_id,id),
  foreign key(tenant_id,device_id) references factact.devices(tenant_id,id),
  foreign key(tenant_id,observed_by_operator_id) references factact.operators(tenant_id,id),
  foreign key(tenant_id,evidence_id) references factact.evidence(tenant_id,id),
  foreign key(tenant_id,supersedes_id)
    references factact.device_work_field_observations(tenant_id,id)
);
alter table factact.device_work_field_observations enable row level security;
alter table factact.device_work_field_observations force row level security;
revoke all on factact.device_work_field_observations from public,factact_runtime;
create index device_work_field_observation_history on
  factact.device_work_field_observations(tenant_id,work_id,device_id,field_key,revision);

create function factact_private.reject_device_work_field_observation_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'Device Work field observation is append-only' using errcode='55000';
end $$;
revoke all on function factact_private.reject_device_work_field_observation_mutation()
  from public,factact_runtime;
create trigger support_device_field_observation_append_only before update or delete
  on factact.device_work_field_observations for each row
  execute function factact_private.reject_device_work_field_observation_mutation();

-- Resolve the real Person-recipient SUPPORT Work and independently require
-- REGISTRY UPDATE on the active Organization recipient for the same Service.
create function factact_private.support_device_observation_authorized(
  p_tenant uuid,p_actor uuid,p_work uuid,p_context uuid,p_device uuid,
  p_org_recipient uuid,p_operation text
) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select p_tenant=factact.current_tenant_id()
    and p_operation in ('RECORD','PROPOSE','CONFIRM')
    and exists(select 1 from factact.tenants t where t.id=p_tenant and t.status='ACTIVE')
    and exists(select 1 from factact.operators a where a.tenant_id=p_tenant
      and a.id=p_actor and a.status='ACTIVE')
    and exists(
      select 1
      from factact.work w
      join factact.services s on s.tenant_id=w.tenant_id and s.id=w.service_id
        and s.status='ACTIVE'
      join factact.contract_profiles cp on cp.tenant_id=w.tenant_id
        and cp.id=w.contract_profile_id and cp.service_id=w.service_id
        and cp.status='ACTIVE' and cp.effective_from<=now()
        and (cp.effective_to is null or cp.effective_to>now())
      join factact.service_recipients person_recipient on
        person_recipient.tenant_id=w.tenant_id and person_recipient.id=w.service_recipient_id
        and person_recipient.service_id=w.service_id
        and person_recipient.recipient_type='PERSON' and person_recipient.status='ACTIVE'
      join factact.people person on person.tenant_id=person_recipient.tenant_id
        and person.id=person_recipient.recipient_id
        and person.lifecycle_status in ('JOINING','ACTIVE')
      join factact.organizations org on org.tenant_id=person.tenant_id
        and org.id=person.organization_id and org.status='ACTIVE'
      join factact.service_recipients org_recipient on
        org_recipient.tenant_id=w.tenant_id and org_recipient.id=p_org_recipient
        and org_recipient.service_id=w.service_id
        and org_recipient.recipient_type='ORGANIZATION'
        and org_recipient.recipient_organization_id=org.id
        and org_recipient.status='ACTIVE'
      join factact.devices d on d.tenant_id=w.tenant_id and d.id=p_device
        and d.organization_id=org.id
      join factact.support_work_device_contexts context on
        context.tenant_id=w.tenant_id and context.id=p_context and context.work_id=w.id
        and context.device_id=d.id and context.kind in ('CONFIRMED','CORRECTED')
      where w.tenant_id=p_tenant and w.id=p_work and w.lane='SUPPORT'
        and w.status<>'COMPLETED'
        and context.revision=(select max(latest.revision)
          from factact.support_work_device_contexts latest
          where latest.tenant_id=w.tenant_id and latest.work_id=w.id)
        and (p_operation='CONFIRM' or exists(select 1 from factact.scoped_actor_grants support_grant
          where support_grant.tenant_id=w.tenant_id
            and support_grant.actor_operator_id=p_actor
            and support_grant.service_id=w.service_id
            and support_grant.contract_profile_id=w.contract_profile_id
            and support_grant.object_kind='SUPPORT'
            and 'UPDATE'=any(support_grant.operations)
            and support_grant.status='ACTIVE'
            and support_grant.effective_from<=now()
            and (support_grant.effective_until is null or support_grant.effective_until>now())
            and (support_grant.scope_kind='SERVICE'
              or (support_grant.scope_kind='SERVICE_RECIPIENT'
                and support_grant.service_recipient_id=w.service_recipient_id)
              or (support_grant.scope_kind='WORK'
                and support_grant.service_recipient_id=w.service_recipient_id
                and support_grant.work_id=w.id))))
        and exists(select 1 from factact.scoped_actor_grants registry_grant
          where registry_grant.tenant_id=w.tenant_id
            and registry_grant.actor_operator_id=p_actor
            and registry_grant.service_id=w.service_id
            and registry_grant.contract_profile_id=w.contract_profile_id
            and registry_grant.scope_kind='SERVICE_RECIPIENT'
            and registry_grant.service_recipient_id=org_recipient.id
            and registry_grant.work_id is null
            and registry_grant.object_kind='REGISTRY'
            and (case when p_operation='CONFIRM' then
              array['REVIEW','APPROVE'] <@ registry_grant.operations
              else 'UPDATE'=any(registry_grant.operations) end)
            and registry_grant.status='ACTIVE'
            and registry_grant.effective_from<=now()
            and (registry_grant.effective_until is null or registry_grant.effective_until>now()))
    );
$$;
revoke all on function factact_private.support_device_observation_authorized(
  uuid,uuid,uuid,uuid,uuid,uuid,text) from public,factact_runtime;

create function factact.record_support_device_field_observation(
  p_tenant uuid,p_actor uuid,p_command jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_id uuid:=gen_random_uuid();
  v_evidence uuid:=gen_random_uuid();
  v_request uuid:=nullif(p_command->>'requestId','')::uuid;
  v_work uuid:=nullif(p_command->>'workId','')::uuid;
  v_context uuid:=nullif(p_command->>'targetContextId','')::uuid;
  v_device uuid:=nullif(p_command->>'deviceId','')::uuid;
  v_org_recipient uuid:=nullif(p_command->>'organizationServiceRecipientId','')::uuid;
  v_field text:=p_command->>'fieldKey';
  v_value text:=p_command->>'observedValue';
  v_expected integer:=(p_command->>'expectedRevision')::integer;
  v_now timestamptz:=now();
  v_work_row record;v_device_row record;v_prior record;v_latest record;v_revision integer;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or jsonb_typeof(p_command)<>'object'
    or (select array_agg(k order by k) from jsonb_object_keys(p_command) k)
       <> array['deviceId','expectedRevision','fieldKey','observedValue',
                'organizationServiceRecipientId','requestId','targetContextId','workId']::text[]
    or v_field not in ('assetTag','displayName','serialNumber','deviceStatus')
    or length(btrim(coalesce(v_value,''))) not between 1 and 2000
    or v_expected<0 then
    raise exception 'invalid SUPPORT Device observation' using errcode='22023';
  end if;
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  select * into v_prior from factact.device_work_field_observations
    where tenant_id=p_tenant and work_id=v_work and request_key=v_request;
  if found then
    if v_prior.observed_by_operator_id=p_actor and v_prior.target_context_id=v_context
      and v_prior.device_id=v_device and v_prior.organization_service_recipient_id=v_org_recipient
      and v_prior.field_key=v_field and v_prior.observed_value=v_value
      and v_prior.revision=v_expected+1 then return v_prior.id; end if;
    raise exception 'SUPPORT Device observation retry conflict' using errcode='40001';
  end if;
  if not factact_private.support_device_observation_authorized(p_tenant,p_actor,v_work,
      v_context,v_device,v_org_recipient,'RECORD') then
    raise exception 'SUPPORT Device observation authority required' using errcode='42501';
  end if;
  select w.service_id,w.contract_profile_id,w.service_recipient_id,
    person.organization_id into v_work_row
    from factact.work w join factact.service_recipients recipient
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
      'workId',v_work,'targetContextId',v_context,
      'deviceId',v_device,'fieldKey',v_field,'observedValue',v_value,
      'observedAt',v_now,'observedByOperatorId',p_actor)::text,p_actor,v_now);
  insert into factact.device_work_field_observations(id,tenant_id,service_id,
    contract_profile_id,organization_id,work_id,work_person_recipient_id,
    organization_service_recipient_id,target_context_id,device_id,field_key,
    observed_value,observed_at,observed_by_operator_id,evidence_id,
    request_key,revision,supersedes_id,recorded_at)
  values(v_id,p_tenant,v_work_row.service_id,v_work_row.contract_profile_id,
    v_work_row.organization_id,v_work,v_work_row.service_recipient_id,v_org_recipient,
    v_context,v_device,v_field,v_value,v_now,p_actor,v_evidence,v_request,v_revision,
    (select old.id from factact.device_work_field_observations old
      where old.tenant_id=p_tenant and old.work_id=v_work and old.target_context_id=v_context
        and old.device_id=v_device and old.field_key=v_field
      order by old.revision desc limit 1),v_now);
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values(gen_random_uuid(),p_tenant,
    'SUPPORT_DEVICE_FIELD_OBSERVATION',v_id,'SUPPORT_DEVICE_FIELD_OBSERVED',p_actor,
    jsonb_build_object('workId',v_work,'targetContextId',v_context,'deviceId',v_device,
      'fieldKey',v_field,'revision',v_revision,'evidenceId',v_evidence));
  return v_id;
end $$;

create function factact.propose_observed_device_field_change(
  p_tenant uuid,p_actor uuid,p_observation uuid,p_change uuid,p_request_key text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v record;v_prior record;v_fingerprint text;v_request uuid:=gen_random_uuid();
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or p_observation is null or p_change is null
    or length(p_request_key) not between 8 and 100
    or p_request_key!~'^[a-zA-Z0-9_-]+$' then
    raise exception 'invalid observed Device proposal' using errcode='22023';
  end if;
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  select o.*,d.registry_revision,d.asset_tag,d.display_name,d.serial_number,d.device_status
    into v from factact.device_work_field_observations o
    join factact.devices d on d.tenant_id=o.tenant_id and d.id=o.device_id
    where o.tenant_id=p_tenant and o.id=p_observation for update of d;
  if not found then
    raise exception 'observed Device source unavailable' using errcode='42501';
  end if;
  perform 1 from factact.work where tenant_id=p_tenant and id=v.work_id for update;
  perform 1 from factact.devices where tenant_id=p_tenant and id=v.device_id for update;
  if v.observed_by_operator_id<>p_actor
    or (v.field_key='deviceStatus' and v.observed_value not in
      ('AVAILABLE','UNAVAILABLE','RETIRED'))
    or (v.field_key<>'deviceStatus' and v.observed_value is distinct from
      (case v.field_key when 'assetTag' then v.asset_tag
        when 'displayName' then v.display_name when 'serialNumber' then v.serial_number end))
    or not factact_private.support_device_observation_authorized(p_tenant,p_actor,
      v.work_id,v.target_context_id,v.device_id,v.organization_service_recipient_id,'PROPOSE')
    or exists(select 1 from factact.device_work_field_observations newer
      where newer.tenant_id=p_tenant and newer.work_id=v.work_id
        and newer.target_context_id=v.target_context_id and newer.device_id=v.device_id
        and newer.field_key=v.field_key and newer.revision>v.revision) then
    raise exception 'observed Device source unavailable' using errcode='42501';
  end if;
  v_fingerprint:=md5(jsonb_build_object('observationId',v.id,'changeId',p_change,
    'requestKey',p_request_key,'deviceRevision',v.registry_revision)::text);
  select r.*,c.id change_id into v_prior from factact.device_change_requests r
    join factact.changes c on c.tenant_id=r.tenant_id and c.device_change_request_id=r.id
    where r.tenant_id=p_tenant and r.actor_operator_id=p_actor
      and r.request_key=p_request_key;
  if found then
    if v_prior.change_id=p_change and v_prior.request_fingerprint=v_fingerprint then
      return p_change; end if;
    raise exception 'Device request key conflict' using errcode='23505';
  end if;
  insert into factact.device_change_requests(id,tenant_id,actor_operator_id,service_id,
    contract_profile_id,service_recipient_id,organization_id,target_device_id,request_key,
    request_kind,expected_registry_revision,proposed_effect_json,source_evidence_id,
    source_kind,source_locator,source_observed_at,source_work_id,request_fingerprint,context_work_id)
  values(v_request,p_tenant,p_actor,v.service_id,v.contract_profile_id,
    v.organization_service_recipient_id,v.organization_id,v.device_id,p_request_key,
    'DEVICE_FIELD_VERIFICATION',v.registry_revision,
    jsonb_build_object('field',v.field_key,'observedValue',v.observed_value,
      'verificationSource',jsonb_build_object('kind','SUPPORT_WORK',
        'origin','OPERATOR_DIRECT_OBSERVATION','evidenceId',v.evidence_id,
        'locator','device-work-observation:'||v.id,'observedAt',v.observed_at,'workId',v.work_id,
        'observationId',v.id)),v.evidence_id,'SUPPORT_WORK','device-work-observation:'||v.id,
    v.observed_at,v.work_id,v_fingerprint,null);
  insert into factact.device_change_request_sources(tenant_id,request_id,field_key,
    field_value,source_evidence_id,source_kind,source_locator,source_observed_at,source_work_id)
  values(p_tenant,v_request,v.field_key,v.observed_value,v.evidence_id,'SUPPORT_WORK',
    'device-work-observation:'||v.id,v.observed_at,v.work_id);
  insert into factact.changes(id,tenant_id,work_id,action_id,change_type,change_kind,
    subject_type,subject_id,device_subject_id,device_change_request_id,
    proposed_by_operator_id,proposed_effect_json,status,created_at)
  values(p_change,p_tenant,null,null,'KNOWLEDGE_STATE_CHANGE','DEVICE_FIELD_VERIFICATION',
    'DEVICE',null,v.device_id,v_request,p_actor,
    jsonb_build_object('field',v.field_key,'observedValue',v.observed_value,
      'verificationSource',jsonb_build_object('kind','SUPPORT_WORK',
        'origin','OPERATOR_DIRECT_OBSERVATION','evidenceId',v.evidence_id,
        'locator','device-work-observation:'||v.id,'observedAt',v.observed_at,'workId',v.work_id,
        'observationId',v.id)),'PROPOSED',now());
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values(gen_random_uuid(),p_tenant,'DEVICE_CHANGE',
    p_change,'DEVICE_CHANGE_PROPOSED',p_actor,
    jsonb_build_object('requestId',v_request,'kind','DEVICE_FIELD_VERIFICATION',
      'observationId',v.id,'workId',v.work_id));
  return p_change;
end $$;

-- The generic command must never accept a caller-labelled field verification.
-- Only propose_observed_device_field_change can construct this request kind.
do $$ begin
  execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
end $$;
grant create on schema factact,factact_private to factact_device_executor;
set local role factact_device_executor;
alter function factact.device_propose_change(uuid,uuid,jsonb)
  rename to device_propose_change_pre_s3c1a;
reset role;

create function factact.device_propose_change(p_tenant uuid,p_actor uuid,p_command jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
begin
  if p_command->>'kind'='DEVICE_FIELD_VERIFICATION' then
    raise exception 'bounded Work observation required for Device field verification'
      using errcode='42501';
  end if;
  return factact.device_propose_change_pre_s3c1a(p_tenant,p_actor,p_command);
end $$;

-- Revalidate the immutable binding immediately before FIELD_VERIFIED is written.
create function factact_private.require_bound_device_field_verification()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare v record;
begin
  -- Disposable seed/admin fixtures have no Change. Runtime cannot insert this
  -- ledger directly; every real Device command supplies source_change_id.
  if new.event_kind<>'FIELD_VERIFIED' or new.source_change_id is null then return new; end if;
  select o.*,r.actor_operator_id,r.service_recipient_id,r.expected_registry_revision
    into v from factact.device_change_requests r
    join factact.device_work_field_observations o
      on o.tenant_id=r.tenant_id and o.evidence_id=r.source_evidence_id
      and r.source_locator='device-work-observation:'||o.id
      and o.observed_at=r.source_observed_at
      and o.work_id=r.source_work_id and o.device_id=r.target_device_id
    where r.tenant_id=new.tenant_id and r.id=(select c.device_change_request_id
      from factact.changes c where c.tenant_id=new.tenant_id and c.id=new.source_change_id)
      and r.request_kind='DEVICE_FIELD_VERIFICATION'
      and r.source_kind='SUPPORT_WORK'
      and o.field_key=new.field_key and o.observed_value=new.field_value;
  if found then
    perform 1 from factact.work where tenant_id=new.tenant_id and id=v.work_id for update;
  end if;
  if not found or v.actor_operator_id<>new.recorded_by_operator_id
    or new.device_revision<>v.expected_registry_revision+1
    or not factact_private.support_device_observation_authorized(new.tenant_id,
      new.recorded_by_operator_id,v.work_id,v.target_context_id,new.device_id,
      v.organization_service_recipient_id,'PROPOSE')
    or not factact_private.support_device_observation_authorized(new.tenant_id,
      new.verified_by_operator_id,v.work_id,v.target_context_id,new.device_id,
      v.organization_service_recipient_id,'CONFIRM')
    or exists(select 1 from factact.device_work_field_observations newer
      where newer.tenant_id=v.tenant_id and newer.work_id=v.work_id
        and newer.target_context_id=v.target_context_id and newer.device_id=v.device_id
        and newer.field_key=v.field_key and newer.revision>v.revision) then
    raise exception 'bound Device field observation unavailable' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function factact_private.require_bound_device_field_verification()
  from public,factact_runtime;
create trigger require_bound_device_field_verification before insert
  on factact.device_field_events for each row
  execute function factact_private.require_bound_device_field_verification();

-- Least privilege for the existing Device executor only.
grant select on factact.support_work_device_contexts,factact.device_work_field_observations
  to factact_device_executor;
grant insert on factact.device_work_field_observations,factact.evidence
  to factact_device_executor;
-- SELECT FOR UPDATE is used only to serialize an observation against Work
-- completion. Runtime cannot SET this non-login/noinherit executor role.
grant update(status) on factact.work to factact_device_executor;
create policy device_executor_tenant on factact.support_work_device_contexts for select
  to factact_device_executor using(tenant_id=factact.current_tenant_id());
create policy device_executor_tenant on factact.device_work_field_observations for all
  to factact_device_executor using(tenant_id=factact.current_tenant_id())
  with check(tenant_id=factact.current_tenant_id());

set local role factact_device_executor;
revoke all on function factact.device_propose_change_pre_s3c1a(uuid,uuid,jsonb)
  from public,factact_runtime;
reset role;
revoke all on function factact.record_support_device_field_observation(uuid,uuid,jsonb)
  from public;
revoke all on function factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)
  from public;
revoke all on function factact.record_support_device_field_observation(uuid,uuid,jsonb),
  factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)
  from factact_runtime;
revoke all on function factact.device_propose_change(uuid,uuid,jsonb) from public;
grant execute on function factact.device_propose_change(uuid,uuid,jsonb) to factact_runtime;

alter function factact_private.support_device_observation_authorized(
  uuid,uuid,uuid,uuid,uuid,uuid,text) owner to factact_device_executor;
alter function factact.record_support_device_field_observation(uuid,uuid,jsonb)
  owner to factact_device_executor;
alter function factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)
  owner to factact_device_executor;
alter function factact.device_propose_change(uuid,uuid,jsonb) owner to factact_device_executor;
alter function factact_private.require_bound_device_field_verification()
  owner to factact_device_executor;

revoke create on schema factact,factact_private from factact_device_executor;
do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set false, inherit false',current_user);
  else
    execute format('revoke factact_device_executor from %I granted by %I',current_user,current_user);
  end if;
end $$;

commit;
