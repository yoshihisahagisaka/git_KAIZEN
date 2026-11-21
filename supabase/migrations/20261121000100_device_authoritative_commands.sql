-- S2b-2: bounded Device proposal/confirmation commands and least-privilege executor.
-- No generic Runtime Device, source, field-event, Change or Audit write is granted.
begin;

alter table factact.device_change_requests
  add column request_fingerprint text,
  add column context_work_id uuid,
  add constraint device_change_request_fingerprint_check
    check (request_fingerprint is null or length(request_fingerprint) between 32 and 128),
  add constraint device_change_request_context_work_fk
    foreign key (tenant_id,context_work_id) references factact.work(tenant_id,id);

create table factact.device_change_request_sources (
  tenant_id uuid not null,
  request_id uuid not null,
  field_key text not null check (field_key in
    ('assetTag','displayName','serialNumber','deviceStatus')),
  field_value text not null check (length(btrim(field_value)) between 1 and 2000),
  source_evidence_id uuid not null,
  source_kind text not null check (source_kind in
    ('CUSTOMER_REGISTER','SUPPORT_WORK','PHYSICAL_INVENTORY','TRUSTED_SYSTEM')),
  source_locator text not null check (length(btrim(source_locator)) between 1 and 400),
  source_observed_at timestamptz not null,
  source_work_id uuid,
  primary key (tenant_id,request_id,field_key),
  foreign key (tenant_id,request_id)
    references factact.device_change_requests(tenant_id,id),
  foreign key (tenant_id,source_evidence_id)
    references factact.evidence(tenant_id,id),
  foreign key (tenant_id,source_work_id) references factact.work(tenant_id,id),
  check ((source_kind='SUPPORT_WORK')=(source_work_id is not null))
);
alter table factact.device_change_request_sources enable row level security;
alter table factact.device_change_request_sources force row level security;
revoke all on factact.device_change_request_sources from public,factact_runtime;

create function factact_private.reject_device_request_source_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  raise exception 'Device request source is append-only' using errcode='55000';
end $$;
revoke all on function factact_private.reject_device_request_source_mutation() from public;
create trigger device_change_request_sources_append_only before update or delete
  on factact.device_change_request_sources for each row
  execute function factact_private.reject_device_request_source_mutation();

create function factact_private.device_command_authorized(
  p_tenant uuid,p_actor uuid,p_service uuid,p_contract uuid,p_recipient uuid,
  p_organization uuid,p_work uuid,p_operation text
) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select p_tenant=factact.current_tenant_id()
    and p_operation in ('CREATE','UPDATE','REVIEW','APPROVE')
    and exists(select 1 from factact.tenants where id=p_tenant and status='ACTIVE')
    and exists(select 1 from factact.operators where tenant_id=p_tenant and id=p_actor and status='ACTIVE')
    and exists(select 1 from factact.services where tenant_id=p_tenant and id=p_service and status='ACTIVE')
    and exists(select 1 from factact.contract_profiles where tenant_id=p_tenant and id=p_contract
      and service_id=p_service and status='ACTIVE' and effective_from<=now()
      and (effective_to is null or effective_to>now()))
    and exists(select 1 from factact.service_recipients r
      join factact.organizations o on o.tenant_id=r.tenant_id
        and o.id=r.recipient_organization_id and o.status='ACTIVE'
      where r.tenant_id=p_tenant and r.id=p_recipient and r.service_id=p_service
        and r.recipient_type='ORGANIZATION' and r.recipient_organization_id=p_organization
        and r.status='ACTIVE')
    and (p_work is null or exists(select 1 from factact.work w where w.tenant_id=p_tenant
      and w.id=p_work and w.service_id=p_service and w.contract_profile_id=p_contract
      and w.service_recipient_id=p_recipient))
    and exists(select 1 from factact.scoped_actor_grants g
      where g.tenant_id=p_tenant and g.actor_operator_id=p_actor
        and g.service_id=p_service and g.contract_profile_id=p_contract
        and g.object_kind='REGISTRY' and p_operation=any(g.operations)
        and g.status='ACTIVE' and g.effective_from<=now()
        and (g.effective_until is null or g.effective_until>now())
        and ((g.scope_kind='SERVICE_RECIPIENT' and g.service_recipient_id=p_recipient and p_work is null)
          or (g.scope_kind='WORK' and g.service_recipient_id=p_recipient and g.work_id=p_work)))
$$;
revoke all on function factact_private.device_command_authorized(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,factact_runtime;

create function factact.device_propose_change(p_tenant uuid,p_actor uuid,p_command jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_change uuid:=(p_command->>'changeId')::uuid;
  v_request uuid:=gen_random_uuid();
  v_service uuid:=(p_command->>'serviceId')::uuid;
  v_contract uuid:=(p_command->>'contractProfileId')::uuid;
  v_recipient uuid:=(p_command->>'serviceRecipientId')::uuid;
  v_org uuid:=(p_command->>'organizationId')::uuid;
  v_device uuid:=(p_command->>'deviceId')::uuid;
  v_work uuid:=nullif(p_command->>'workId','')::uuid;
  v_kind text:=p_command->>'kind';
  v_key text:=p_command->>'requestKey';
  v_revision bigint:=(p_command->>'expectedRevision')::bigint;
  v_effect jsonb:=p_command->'effect';
  v_sources jsonb:=p_command->'sources';
  v_fingerprint text:=p_command->>'fingerprint';
  v_prior record;v_source record;v_first record;v_operation text;
  v_expected_source jsonb;v_expected_value text;v_expected_count integer;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or jsonb_typeof(p_command)<>'object' or jsonb_typeof(v_effect)<>'object'
    or jsonb_typeof(v_sources)<>'array' or jsonb_array_length(v_sources)=0
    or v_kind not in ('DEVICE_INITIAL_INFORMATION','DEVICE_INFORMATION_CORRECTION','DEVICE_FIELD_VERIFICATION')
    or length(v_key) not between 8 and 100 or v_key!~'^[a-zA-Z0-9_-]+$'
    or length(v_fingerprint) not between 32 and 128 then
    raise exception 'invalid Device proposal' using errcode='22023';
  end if;
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  select r.*,c.id change_id into v_prior from factact.device_change_requests r
    join factact.changes c on c.tenant_id=r.tenant_id and c.device_change_request_id=r.id
    where r.tenant_id=p_tenant and r.actor_operator_id=p_actor and r.request_key=v_key;
  if found then
    if v_prior.change_id=v_change and v_prior.target_device_id=v_device
      and v_prior.request_kind=v_kind and v_prior.expected_registry_revision=v_revision
      and v_prior.proposed_effect_json=v_effect and v_prior.request_fingerprint=v_fingerprint then
      return v_change;
    end if;
    raise exception 'Device request key conflict' using errcode='23505';
  end if;
  v_operation:=case when v_kind='DEVICE_INITIAL_INFORMATION' then 'CREATE' else 'UPDATE' end;
  if not factact_private.device_command_authorized(p_tenant,p_actor,v_service,v_contract,
      v_recipient,v_org,v_work,v_operation) then
    raise exception 'Device command authority required' using errcode='42501';
  end if;
  if v_kind='DEVICE_INITIAL_INFORMATION' then
    if v_revision<>0 or exists(select 1 from factact.devices d where d.tenant_id=p_tenant
      and d.organization_id=v_org and d.asset_tag=v_effect->>'assetTag') then
      raise exception 'stale or duplicate Device' using errcode='40001';
    end if;
  elsif not exists(select 1 from factact.devices d where d.tenant_id=p_tenant and d.id=v_device
      and d.organization_id=v_org and d.registry_revision=v_revision for update) then
    raise exception 'stale Device revision' using errcode='40001';
  end if;
  for v_source in select * from jsonb_to_recordset(v_sources) as s(
    "fieldKey" text,"fieldValue" text,"evidenceId" uuid,"sourceKind" text,
    locator text,"observedAt" timestamptz,"workId" uuid)
  loop
    if v_kind='DEVICE_INITIAL_INFORMATION' then
      v_expected_value:=v_effect->v_source."fieldKey"->>'value';
      v_expected_source:=v_effect->v_source."fieldKey"->'source';
    elsif v_kind='DEVICE_INFORMATION_CORRECTION' then
      v_expected_value:=v_effect->'changes'->v_source."fieldKey"->>'value';
      v_expected_source:=v_effect->'changes'->v_source."fieldKey"->'source';
    else
      v_expected_value:=v_effect->>'observedValue';
      v_expected_source:=v_effect->'verificationSource';
    end if;
    if v_source."fieldKey" not in ('assetTag','displayName','serialNumber','deviceStatus')
      or length(btrim(coalesce(v_source."fieldValue",''))) not between 1 and 2000
      or v_source."sourceKind" not in ('CUSTOMER_REGISTER','SUPPORT_WORK','PHYSICAL_INVENTORY','TRUSTED_SYSTEM')
      or (v_source."sourceKind"='SUPPORT_WORK')<>(v_source."workId" is not null)
      or (v_source."sourceKind"='SUPPORT_WORK' and v_source."workId" is distinct from v_work)
      or (v_kind='DEVICE_FIELD_VERIFICATION' and v_source."sourceKind"='CUSTOMER_REGISTER')
      or v_source."fieldValue" is distinct from v_expected_value
      or v_source."evidenceId"::text is distinct from v_expected_source->>'evidenceId'
      or v_source."sourceKind" is distinct from v_expected_source->>'kind'
      or v_source.locator is distinct from v_expected_source->>'locator'
      or v_source."observedAt" is distinct from (v_expected_source->>'observedAt')::timestamptz
      or v_source."workId" is distinct from nullif(v_expected_source->>'workId','')::uuid
      or (v_kind='DEVICE_FIELD_VERIFICATION'
        and v_source."fieldKey" is distinct from v_effect->>'field')
      or not exists(select 1 from factact.evidence e where e.tenant_id=p_tenant
        and e.id=v_source."evidenceId" and e.evidence_type='SOURCE_REFERENCE'
        and e.created_by_operator_id=p_actor) then
      raise exception 'Device source unavailable' using errcode='42501';
    end if;
    if v_source."sourceKind"='SUPPORT_WORK' and not exists(select 1 from factact.work w
      where w.tenant_id=p_tenant and w.id=v_source."workId" and w.service_id=v_service
        and w.contract_profile_id=v_contract and w.service_recipient_id=v_recipient) then
      raise exception 'Device Work source unavailable' using errcode='42501';
    end if;
    if v_first is null then v_first:=v_source; end if;
  end loop;
  v_expected_count:=case
    when v_kind='DEVICE_INITIAL_INFORMATION' then
      2+case when v_effect ? 'serialNumber' then 1 else 0 end
    when v_kind='DEVICE_INFORMATION_CORRECTION' then
      (select count(*) from jsonb_object_keys(v_effect->'changes'))
    else 1 end;
  if jsonb_array_length(v_sources)<>v_expected_count then
    raise exception 'Device source/effect mismatch' using errcode='22023';
  end if;
  insert into factact.device_change_requests(id,tenant_id,actor_operator_id,service_id,
    contract_profile_id,service_recipient_id,organization_id,target_device_id,request_key,
    request_kind,expected_registry_revision,proposed_effect_json,source_evidence_id,
    source_kind,source_locator,source_observed_at,source_work_id,request_fingerprint,context_work_id)
  values(v_request,p_tenant,p_actor,v_service,v_contract,v_recipient,v_org,v_device,v_key,
    v_kind,v_revision,v_effect,v_first."evidenceId",v_first."sourceKind",v_first.locator,
    v_first."observedAt",v_first."workId",v_fingerprint,v_work);
  insert into factact.device_change_request_sources
    (tenant_id,request_id,field_key,field_value,source_evidence_id,source_kind,
     source_locator,source_observed_at,source_work_id)
  select p_tenant,v_request,s."fieldKey",s."fieldValue",s."evidenceId",s."sourceKind",
    s.locator,s."observedAt",s."workId" from jsonb_to_recordset(v_sources) as s(
      "fieldKey" text,"fieldValue" text,"evidenceId" uuid,"sourceKind" text,locator text,
      "observedAt" timestamptz,"workId" uuid);
  insert into factact.changes(id,tenant_id,work_id,action_id,change_type,change_kind,
    subject_type,subject_id,device_subject_id,device_change_request_id,
    proposed_by_operator_id,proposed_effect_json,status,created_at)
  values(v_change,p_tenant,null,null,'KNOWLEDGE_STATE_CHANGE',v_kind,'DEVICE',null,
    v_device,v_request,p_actor,v_effect,'PROPOSED',now());
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values(gen_random_uuid(),p_tenant,'DEVICE_CHANGE',
    v_change,'DEVICE_CHANGE_PROPOSED',p_actor,jsonb_build_object('requestId',v_request,'kind',v_kind));
  return v_change;
end $$;

create function factact.device_confirm_change(p_tenant uuid,p_actor uuid,p_change uuid,p_summary text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v record;v_source record;v_at timestamptz:=now();v_next bigint;v_status text;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null or p_change is null
    or length(btrim(coalesce(p_summary,''))) not between 1 and 1000 then
    raise exception 'invalid Device confirmation' using errcode='22023';
  end if;
  select c.status,c.verified_by_operator_id,c.committed_by_operator_id,c.verification_summary,
    r.* into v from factact.changes c join factact.device_change_requests r
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
  select c.status,c.verified_by_operator_id,c.committed_by_operator_id,c.verification_summary,
    r.* into v from factact.changes c join factact.device_change_requests r
      on r.tenant_id=c.tenant_id and r.id=c.device_change_request_id
    where c.tenant_id=p_tenant and c.id=p_change for update of c;
  if v.status='COMMITTED' then
    if v.committed_by_operator_id=p_actor and v.verification_summary=btrim(p_summary) then return p_change; end if;
    raise exception 'Device confirmation retry conflict' using errcode='40001';
  end if;
  if v.status<>'PROPOSED'
    or not factact_private.device_command_authorized(p_tenant,p_actor,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,'REVIEW')
    or not factact_private.device_command_authorized(p_tenant,p_actor,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,'APPROVE')
    or not factact_private.device_command_authorized(p_tenant,v.actor_operator_id,v.service_id,
      v.contract_profile_id,v.service_recipient_id,v.organization_id,v.context_work_id,
      case when v.request_kind='DEVICE_INITIAL_INFORMATION' then 'CREATE' else 'UPDATE' end) then
    raise exception 'Device confirmation authority unavailable' using errcode='42501';
  end if;
  if exists(select 1 from factact.device_change_request_sources s left join factact.evidence e
      on e.tenant_id=s.tenant_id and e.id=s.source_evidence_id
      where s.tenant_id=p_tenant and s.request_id=v.id
        and (e.id is null or e.evidence_type<>'SOURCE_REFERENCE'
          or e.created_by_operator_id<>v.actor_operator_id)) then
    raise exception 'Device source no longer admissible' using errcode='42501';
  end if;
  if v.request_kind='DEVICE_INITIAL_INFORMATION' then
    if exists(select 1 from factact.devices d where d.tenant_id=p_tenant
      and d.organization_id=v.organization_id and d.asset_tag=v.proposed_effect_json->'assetTag'->>'value') then
      raise exception 'duplicate Device' using errcode='40001';
    end if;
    insert into factact.devices(id,tenant_id,organization_id,asset_tag,display_name,serial_number,
      device_status,registry_revision,created_at,updated_at)
    values(v.target_device_id,p_tenant,v.organization_id,v.proposed_effect_json->'assetTag'->>'value',
      v.proposed_effect_json->'displayName'->>'value',v.proposed_effect_json->'serialNumber'->>'value','UNKNOWN',1,v_at,v_at);
    v_next:=1;
  else
    select registry_revision into v_next from factact.devices where tenant_id=p_tenant
      and id=v.target_device_id and organization_id=v.organization_id for update;
    if v_next is null or v_next<>v.expected_registry_revision then
      raise exception 'stale Device revision' using errcode='40001';
    end if;
    v_next:=v_next+1;
    if v.request_kind='DEVICE_INFORMATION_CORRECTION' then
      update factact.devices set
        display_name=coalesce(v.proposed_effect_json->'changes'->'displayName'->>'value',display_name),
        serial_number=coalesce(v.proposed_effect_json->'changes'->'serialNumber'->>'value',serial_number),
        registry_revision=v_next,updated_at=v_at
      where tenant_id=p_tenant and id=v.target_device_id;
    else
      v_status:=v.proposed_effect_json->>'observedValue';
      update factact.devices set device_status=case when v.proposed_effect_json->>'field'='deviceStatus'
        then v_status else device_status end,registry_revision=v_next,updated_at=v_at
      where tenant_id=p_tenant and id=v.target_device_id;
    end if;
  end if;
  for v_source in select * from factact.device_change_request_sources
    where tenant_id=p_tenant and request_id=v.id
  loop
    insert into factact.device_field_events(id,tenant_id,device_id,organization_id,device_revision,
      field_key,event_kind,field_value,source_kind,source_evidence_id,source_locator,
      source_observed_at,source_work_id,source_change_id,recorded_by_operator_id,recorded_at,
      verified_by_operator_id,verified_at)
    values(gen_random_uuid(),p_tenant,v.target_device_id,v.organization_id,v_next,v_source.field_key,
      case when v.request_kind='DEVICE_FIELD_VERIFICATION' then 'FIELD_VERIFIED'
           when v.request_kind='DEVICE_INFORMATION_CORRECTION' then 'FIELD_CORRECTED' else 'SOURCE_ACCEPTED' end,
      v_source.field_value,v_source.source_kind,v_source.source_evidence_id,v_source.source_locator,
      v_source.source_observed_at,v_source.source_work_id,p_change,v.actor_operator_id,v_at,
      case when v.request_kind='DEVICE_FIELD_VERIFICATION' then p_actor end,
      case when v.request_kind='DEVICE_FIELD_VERIFICATION' then v_at end);
  end loop;
  update factact.changes set status='COMMITTED',verification_summary=btrim(p_summary),
    verified_by_operator_id=p_actor,verified_at=v_at,committed_by_operator_id=p_actor,committed_at=v_at
    where tenant_id=p_tenant and id=p_change;
  insert into factact.audit_events(id,tenant_id,aggregate_type,aggregate_id,event_type,
    actor_operator_id,metadata_json) values
    (gen_random_uuid(),p_tenant,'DEVICE_CHANGE',p_change,'DEVICE_CHANGE_VERIFIED',p_actor,
      jsonb_build_object('requestId',v.id)),
    (gen_random_uuid(),p_tenant,'DEVICE_CHANGE',p_change,'DEVICE_CHANGE_COMMITTED',p_actor,
      jsonb_build_object('requestId',v.id,'deviceId',v.target_device_id,'revision',v_next));
  return p_change;
end $$;

revoke all on function factact.device_propose_change(uuid,uuid,jsonb) from public;
revoke all on function factact.device_confirm_change(uuid,uuid,uuid,text) from public;
grant execute on function factact.device_propose_change(uuid,uuid,jsonb) to factact_runtime;
grant execute on function factact.device_confirm_change(uuid,uuid,uuid,text) to factact_runtime;

create role factact_device_executor nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set true, inherit false',current_user);
  else
    execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
  end if;
end $$;
grant usage on schema factact,factact_private to factact_device_executor;
grant execute on function factact.current_tenant_id(),factact.lock_scoped_actor_authority(uuid,uuid)
  to factact_device_executor;
grant select on factact.tenants,factact.operators,factact.organizations,factact.services,
  factact.contract_profiles,factact.service_recipients,factact.scoped_actor_grants,
  factact.work,factact.devices,factact.evidence,factact.device_change_requests,
  factact.device_change_request_sources,factact.changes to factact_device_executor;
grant insert on factact.device_change_requests,factact.device_change_request_sources,
  factact.changes,factact.devices,factact.device_field_events,factact.audit_events
  to factact_device_executor;
grant update(asset_tag,display_name,serial_number,device_status,registry_revision,updated_at)
  on factact.devices to factact_device_executor;
grant update(status,verification_summary,verified_by_operator_id,verified_at,
  committed_by_operator_id,committed_at) on factact.changes to factact_device_executor;
grant usage on sequence factact.audit_events_sequence_seq to factact_device_executor;
do $$ declare t text; begin foreach t in array array['operators','organizations','services',
  'contract_profiles','service_recipients','scoped_actor_grants','work','devices','evidence',
  'device_change_requests','device_change_request_sources','changes','device_field_events','audit_events'] loop
  execute format('create policy device_executor_tenant on factact.%I for all to factact_device_executor using (tenant_id=factact.current_tenant_id()) with check (tenant_id=factact.current_tenant_id())',t);
end loop; end $$;
create policy device_executor_tenant on factact.tenants for all to factact_device_executor
  using(id=factact.current_tenant_id()) with check(id=factact.current_tenant_id());
grant create on schema factact,factact_private to factact_device_executor;
alter function factact_private.device_command_authorized(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)
  owner to factact_device_executor;
alter function factact.device_propose_change(uuid,uuid,jsonb) owner to factact_device_executor;
alter function factact.device_confirm_change(uuid,uuid,uuid,text) owner to factact_device_executor;
revoke create on schema factact,factact_private from factact_device_executor;
do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set false, inherit false',current_user);
  else execute format('revoke factact_device_executor from %I granted by %I',current_user,current_user); end if;
end $$;

do $$ declare r oid:=to_regrole('factact_device_executor'); begin
  if r is null or not exists(select 1 from pg_roles where oid=r and not rolcanlogin
    and not rolsuper and not rolbypassrls and not rolinherit) then
    raise exception 'unsafe Device executor' using errcode='55000';
  end if;
  if has_schema_privilege('factact_device_executor','factact','CREATE')
    or has_table_privilege('factact_runtime','factact.device_change_requests','INSERT')
    or has_table_privilege('factact_runtime','factact.device_field_events','INSERT') then
    raise exception 'unsafe Device ACL' using errcode='55000';
  end if;
end $$;
commit;
