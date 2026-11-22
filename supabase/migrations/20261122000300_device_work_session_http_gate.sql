-- S3c-1B: OIDC-bound active Session is the only HTTP Device command principal.
-- One narrow entry point per operation; never accept a browser-selected Actor,
-- Tenant, organization Recipient, source Evidence or Source locator.
begin;

do $$ begin
  execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
end $$;
grant create on schema factact to factact_device_executor;
grant execute on function factact_private.read_session(text) to factact_device_executor;
set local role factact_device_executor;

create function factact.device_record_observation_session(
  p_session_hash text,p_command jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_tenant uuid;v_actor uuid;v_recipient uuid;v_count integer;
begin
  select s.tenant_id,s.operator_id into v_tenant,v_actor
    from factact_private.read_session(p_session_hash) s;
  if not found or v_tenant is distinct from factact.current_tenant_id() then
    raise exception 'Session Device command unavailable' using errcode='42501';
  end if;
  if jsonb_typeof(p_command) is distinct from 'object'
    or (select array_agg(k order by k) from jsonb_object_keys(p_command) k)
       is distinct from array['deviceId','expectedRevision','fieldKey',
          'observedValue','requestId','targetContextId','workId']::text[] then
    raise exception 'invalid Device observation payload' using errcode='22023';
  end if;

  -- The real SUPPORT Person Work determines the Customer Organization;
  -- only one active Organization ServiceRecipient is admissible.
  select count(*)::integer,(array_agg(o.id))[1] into v_count,v_recipient
    from factact.work w
    join factact.service_recipients person_r
      on person_r.tenant_id=w.tenant_id and person_r.id=w.service_recipient_id
      and person_r.recipient_type='PERSON' and person_r.status='ACTIVE'
    join factact.people person on person.tenant_id=person_r.tenant_id
      and person.id=person_r.recipient_id
    join factact.devices d on d.tenant_id=w.tenant_id
      and d.id=(p_command->>'deviceId')::uuid
      and d.organization_id=person.organization_id
    join factact.service_recipients o on o.tenant_id=w.tenant_id
      and o.service_id=w.service_id and o.recipient_type='ORGANIZATION'
      and o.recipient_organization_id=person.organization_id and o.status='ACTIVE'
    where w.tenant_id=v_tenant and w.id=(p_command->>'workId')::uuid
      and w.lane='SUPPORT' and w.status<>'COMPLETED';
  if v_count<>1 then
    raise exception 'Device observation customer unavailable' using errcode='42501';
  end if;
  return factact.record_support_device_field_observation(
    v_tenant,v_actor,p_command||jsonb_build_object(
      'organizationServiceRecipientId',v_recipient));
end $$;

create function factact.device_propose_observation_session(
  p_session_hash text,p_observation uuid,p_request_key text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_actor uuid;v_existing_actor uuid;v_change uuid;
begin
  select s.tenant_id,s.operator_id into v_tenant,v_actor
    from factact_private.read_session(p_session_hash) s;
  if not found or v_tenant is distinct from factact.current_tenant_id() then
    raise exception 'Session Device command unavailable' using errcode='42501';
  end if;
  if p_observation is null or p_request_key is null
    or length(p_request_key) not between 8 and 100
    or p_request_key !~ '^[a-zA-Z0-9_-]+$' then
    raise exception 'invalid Device proposal request' using errcode='22023';
  end if;
  -- Select the persisted Change identity before replaying. Generating a new
  -- Change ID on every retry would break the existing immutable request check.
  select r.actor_operator_id,c.id into v_existing_actor,v_change
    from factact.device_change_requests r
    join factact.changes c on c.tenant_id=r.tenant_id
      and c.device_change_request_id=r.id
    where r.tenant_id=v_tenant and r.request_key=p_request_key;
  if found and v_existing_actor is distinct from v_actor then
    raise exception 'Device proposal request key unavailable' using errcode='42501';
  end if;
  v_change:=coalesce(v_change,gen_random_uuid());
  -- The existing executor rechecks live Authority, Work, Device and Source
  -- before returning any replay result, including after Commit.
  return factact.propose_observed_device_field_change(
    v_tenant,v_actor,p_observation,v_change,p_request_key);
end $$;

create function factact.device_confirm_observation_session(
  p_session_hash text,p_change uuid,p_summary text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_actor uuid;
begin
  select s.tenant_id,s.operator_id into v_tenant,v_actor
    from factact_private.read_session(p_session_hash) s;
  if not found or v_tenant is distinct from factact.current_tenant_id() then
    raise exception 'Session Device command unavailable' using errcode='42501';
  end if;
  if p_change is null or length(btrim(coalesce(p_summary,''))) not between 1 and 1000 then
    raise exception 'invalid Device review' using errcode='22023';
  end if;
  -- Only an immutable direct Work Observation can enter this HTTP review path.
  perform 1 from factact.changes c
    join factact.device_change_requests r on r.tenant_id=c.tenant_id
      and r.id=c.device_change_request_id
    join factact.device_work_field_observations o on o.tenant_id=r.tenant_id
      and o.evidence_id=r.source_evidence_id
      and r.source_kind='SUPPORT_WORK'
      and r.source_locator='device-work-observation:'||o.id
      and r.source_observed_at=o.observed_at and r.source_work_id=o.work_id
      and r.target_device_id=o.device_id and r.actor_operator_id=o.observed_by_operator_id
    where c.tenant_id=v_tenant and c.id=p_change
      and c.change_kind='DEVICE_FIELD_VERIFICATION'
      and c.proposed_effect_json->>'field'=o.field_key
      and c.proposed_effect_json->>'observedValue'=o.observed_value;
  if not found then
    raise exception 'Device review unavailable' using errcode='42501';
  end if;
  -- Existing Confirm performs two-Actor Verify -> Commit, live grants,
  -- Work/Context/Source checks, locking and audit in one transaction.
  return factact.device_confirm_change(v_tenant,v_actor,p_change,p_summary);
end $$;

create function factact.device_pending_observation_reviews_session(
  p_session_hash text,p_limit integer,p_cursor_created_at timestamptz,
  p_cursor_change_id uuid
) returns table(
  change_id uuid,work_id uuid,device_id uuid,field_key text,current_value text,
  observed_value text,observed_at timestamptz,
  proposed_by_operator_display_name text,status text,created_at timestamptz,
  has_more boolean
) language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_actor uuid;
begin
  select s.tenant_id,s.operator_id into v_tenant,v_actor
    from factact_private.read_session(p_session_hash) s;
  if not found or v_tenant is distinct from factact.current_tenant_id() then
    raise exception 'Session Device queue unavailable' using errcode='42501';
  end if;
  if p_limit not between 1 and 50
    or (p_cursor_created_at is null) is distinct from (p_cursor_change_id is null) then
    raise exception 'invalid Device queue cursor' using errcode='22023';
  end if;
  return query
    with eligible as (
      select c.id as candidate_id,c.created_at as candidate_created_at,
        o.work_id as source_work,o.device_id as source_device,
        o.field_key as source_field,o.observed_value as source_value,
        o.observed_at as source_observed,
        op.display_name as proposer_name,c.status as change_status,
        (case o.field_key
          when 'assetTag' then d.asset_tag
          when 'displayName' then d.display_name
          when 'serialNumber' then d.serial_number
          when 'deviceStatus' then d.device_status end) as device_current_value
      from factact.changes c
      join factact.device_change_requests r on r.tenant_id=c.tenant_id
        and r.id=c.device_change_request_id
      join factact.device_work_field_observations o on o.tenant_id=r.tenant_id
        and o.evidence_id=r.source_evidence_id
        and r.source_kind='SUPPORT_WORK'
        and r.source_locator='device-work-observation:'||o.id
        and r.source_observed_at=o.observed_at
        and r.source_work_id=o.work_id and r.target_device_id=o.device_id
      join factact.devices d on d.tenant_id=o.tenant_id and d.id=o.device_id
        and d.organization_id=o.organization_id
      join factact.operators op on op.tenant_id=r.tenant_id
        and op.id=r.actor_operator_id and op.status='ACTIVE'
      where c.tenant_id=v_tenant and c.status='PROPOSED'
        and c.change_kind='DEVICE_FIELD_VERIFICATION'
        and r.request_kind='DEVICE_FIELD_VERIFICATION'
        and r.actor_operator_id<>v_actor
        and r.actor_operator_id=o.observed_by_operator_id
        and c.proposed_effect_json->>'field'=o.field_key
        and c.proposed_effect_json->>'observedValue'=o.observed_value
        and (p_cursor_created_at is null
          or (c.created_at,c.id)<(p_cursor_created_at,p_cursor_change_id))
        and factact_private.support_device_observation_authorized(
          v_tenant,v_actor,o.work_id,o.target_context_id,o.device_id,
          o.organization_service_recipient_id,'CONFIRM')
        and factact_private.support_device_observation_authorized(
          v_tenant,r.actor_operator_id,o.work_id,o.target_context_id,o.device_id,
          o.organization_service_recipient_id,'PROPOSE')
        and factact_private.device_command_authorized(
          v_tenant,v_actor,r.service_id,r.contract_profile_id,
          r.service_recipient_id,r.organization_id,r.context_work_id,'REVIEW')
        and factact_private.device_command_authorized(
          v_tenant,v_actor,r.service_id,r.contract_profile_id,
          r.service_recipient_id,r.organization_id,r.context_work_id,'APPROVE')
        and factact_private.device_command_authorized(
          v_tenant,r.actor_operator_id,r.service_id,r.contract_profile_id,
          r.service_recipient_id,r.organization_id,r.context_work_id,'UPDATE')
        and not exists(
          select 1 from factact.device_work_field_observations newer
          where newer.tenant_id=o.tenant_id and newer.work_id=o.work_id
            and newer.target_context_id=o.target_context_id
            and newer.device_id=o.device_id and newer.field_key=o.field_key
            and newer.revision>o.revision)
      order by c.created_at desc,c.id desc
      limit p_limit+1
    ), paged as (
      select *,row_number() over(order by candidate_created_at desc,candidate_id desc) as rn
        from eligible
    )
    select e.candidate_id,e.source_work,e.source_device,e.source_field,
      e.device_current_value,e.source_value,e.source_observed,e.proposer_name,
      e.change_status,e.candidate_created_at,
      (select count(*)>p_limit from paged)
    from paged e where e.rn<=p_limit
    order by e.candidate_created_at desc,e.candidate_id desc;
end $$;

reset role;
revoke all on function
  factact.device_record_observation_session(text,jsonb),
  factact.device_propose_observation_session(text,uuid,text),
  factact.device_confirm_observation_session(text,uuid,text),
  factact.device_pending_observation_reviews_session(text,integer,timestamptz,uuid)
  from public;
grant execute on function
  factact.device_record_observation_session(text,jsonb),
  factact.device_propose_observation_session(text,uuid,text),
  factact.device_confirm_observation_session(text,uuid,text),
  factact.device_pending_observation_reviews_session(text,integer,timestamptz,uuid)
  to factact_runtime;
revoke create on schema factact from factact_device_executor;
do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set false, inherit false',current_user);
  else
    execute format('revoke factact_device_executor from %I granted by %I',current_user,current_user);
  end if;
end $$;
commit;
