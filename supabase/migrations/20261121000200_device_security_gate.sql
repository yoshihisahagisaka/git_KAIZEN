-- S3.0: fail-closed replay identity before any Device mutation endpoint exists.
-- The parent implementation remains private; Runtime receives only this wrapper.
begin;

-- The preceding finalization deliberately removed SET from the Migration
-- principal. Re-enable it only for this owned-function maintenance transaction.
do $$ begin
  execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
end $$;
grant create on schema factact,factact_private to factact_device_executor;
set local role factact_device_executor;

revoke all on function factact.device_propose_change(uuid,uuid,jsonb)
  from public,factact_runtime;
alter function factact.device_propose_change(uuid,uuid,jsonb)
  set schema factact_private;
alter function factact_private.device_propose_change(uuid,uuid,jsonb)
  rename to device_propose_change_internal;
reset role;

create function factact.device_propose_change(p_tenant uuid,p_actor uuid,p_command jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_service uuid:=nullif(p_command->>'serviceId','')::uuid;
  v_contract uuid:=nullif(p_command->>'contractProfileId','')::uuid;
  v_recipient uuid:=nullif(p_command->>'serviceRecipientId','')::uuid;
  v_org uuid:=nullif(p_command->>'organizationId','')::uuid;
  v_work uuid:=nullif(p_command->>'workId','')::uuid;
  v_kind text:=p_command->>'kind';
  v_operation text;
  v_fingerprint text;
  v_prior record;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or jsonb_typeof(p_command)<>'object'
    or jsonb_typeof(p_command->'sources')<>'array'
    or jsonb_array_length(p_command->'sources')=0
    or v_kind not in ('DEVICE_INITIAL_INFORMATION','DEVICE_INFORMATION_CORRECTION','DEVICE_FIELD_VERIFICATION') then
    raise exception 'invalid Device proposal' using errcode='22023';
  end if;
  v_operation:=case when v_kind='DEVICE_INITIAL_INFORMATION' then 'CREATE' else 'UPDATE' end;
  -- Current scope is mandatory even for a byte-identical replay. Revoked or
  -- inactive Actors/Recipients/Services must not learn or reuse a prior result.
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  if not factact_private.device_command_authorized(p_tenant,p_actor,v_service,v_contract,
      v_recipient,v_org,v_work,v_operation) then
    raise exception 'Device command authority required' using errcode='42501';
  end if;
  -- Re-check current evidence custody metadata before looking up a retry.
  if exists(select 1 from jsonb_to_recordset(p_command->'sources') as s(
      "evidenceId" uuid,"sourceKind" text,"workId" uuid)
    left join factact.evidence e on e.tenant_id=p_tenant and e.id=s."evidenceId"
    where e.id is null or e.evidence_type<>'SOURCE_REFERENCE'
      or e.created_by_operator_id<>p_actor
      or ((s."sourceKind"='SUPPORT_WORK')<>(s."workId" is not null))
      or (s."sourceKind"='SUPPORT_WORK' and s."workId" is distinct from v_work)
      or (s."sourceKind"='SUPPORT_WORK' and not exists(select 1 from factact.work w
        where w.tenant_id=p_tenant and w.id=s."workId" and w.service_id=v_service
          and w.contract_profile_id=v_contract and w.service_recipient_id=v_recipient))) then
    raise exception 'Device source unavailable' using errcode='42501';
  end if;
  -- PostgreSQL jsonb text is key-canonical. The caller-provided fingerprint is
  -- ignored and replaced by a server-computed identity over the full command,
  -- including ordered per-field source entries.
  v_fingerprint:=md5((p_command-'fingerprint')::text);
  select r.request_fingerprint,c.id as change_id into v_prior
    from factact.device_change_requests r join factact.changes c
      on c.tenant_id=r.tenant_id and c.device_change_request_id=r.id
    where r.tenant_id=p_tenant and r.actor_operator_id=p_actor
      and r.request_key=p_command->>'requestKey';
  if found and v_prior.request_fingerprint is distinct from v_fingerprint then
    raise exception 'Device request key conflict' using errcode='23505';
  end if;
  return factact_private.device_propose_change_internal(p_tenant,p_actor,
    jsonb_set(p_command,'{fingerprint}',to_jsonb(v_fingerprint),true));
end $$;

set local role factact_device_executor;
revoke all on function factact_private.device_propose_change_internal(uuid,uuid,jsonb)
  from public,factact_runtime;
reset role;
revoke all on function factact.device_propose_change(uuid,uuid,jsonb) from public;
grant execute on function factact.device_propose_change(uuid,uuid,jsonb) to factact_runtime;
alter function factact.device_propose_change(uuid,uuid,jsonb) owner to factact_device_executor;

grant select on factact.device_field_events to factact_device_executor;

create function factact.device_scoped_registry_read(
  p_tenant uuid,p_actor uuid,p_service uuid,p_contract uuid,p_recipient uuid,p_organization uuid,
  p_limit integer,p_after_asset text,p_after_id uuid
) returns table(id uuid,asset_tag text,display_name text,serial_number text,
  device_status text,registry_revision bigint,asset_verified_at timestamptz,status_verified_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_limit not between 1 and 50
    or not exists(select 1 from factact.operators a where a.tenant_id=p_tenant
      and a.id=p_actor and a.status='ACTIVE')
    or not exists(select 1 from factact.services s where s.tenant_id=p_tenant
      and s.id=p_service and s.status='ACTIVE')
    or not exists(select 1 from factact.contract_profiles c where c.tenant_id=p_tenant
      and c.id=p_contract and c.service_id=p_service and c.status='ACTIVE'
      and c.effective_from<=now() and (c.effective_to is null or c.effective_to>now()))
    or not exists(select 1 from factact.service_recipients r join factact.organizations o
      on o.tenant_id=r.tenant_id and o.id=r.recipient_organization_id and o.status='ACTIVE'
      where r.tenant_id=p_tenant and r.id=p_recipient and r.service_id=p_service
        and r.recipient_type='ORGANIZATION' and r.recipient_organization_id=p_organization
        and r.status='ACTIVE')
    or not exists(select 1 from factact.scoped_actor_grants g where g.tenant_id=p_tenant
      and g.actor_operator_id=p_actor and g.service_id=p_service
      and g.contract_profile_id=p_contract and g.scope_kind='SERVICE_RECIPIENT'
      and g.service_recipient_id=p_recipient and g.work_id is null
      and g.object_kind='REGISTRY' and 'READ'=any(g.operations) and g.status='ACTIVE'
      and g.effective_from<=now() and (g.effective_until is null or g.effective_until>now())) then
    raise exception 'Device directory unavailable' using errcode='42501';
  end if;
  return query select d.id,d.asset_tag,d.display_name,d.serial_number,d.device_status,
    d.registry_revision,asset.verified_at,status.verified_at
  from factact.devices d
  left join lateral(select e.verified_at from factact.device_field_events e
    where e.tenant_id=d.tenant_id and e.device_id=d.id and e.field_key='assetTag'
      and e.event_kind='FIELD_VERIFIED' and e.field_value=d.asset_tag
    order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) asset on true
  left join lateral(select e.verified_at from factact.device_field_events e
    where e.tenant_id=d.tenant_id and e.device_id=d.id and e.field_key='deviceStatus'
      and e.event_kind='FIELD_VERIFIED' and e.field_value=d.device_status
    order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) status on true
  where d.tenant_id=p_tenant and d.organization_id=p_organization
    and (p_after_asset is null or (d.asset_tag,d.id)>(p_after_asset,p_after_id))
  order by d.asset_tag,d.id limit p_limit;
end $$;
revoke all on function factact.device_scoped_registry_read(uuid,uuid,uuid,uuid,uuid,uuid,integer,text,uuid)
  from public;
grant execute on function factact.device_scoped_registry_read(uuid,uuid,uuid,uuid,uuid,uuid,integer,text,uuid)
  to factact_runtime;
alter function factact.device_scoped_registry_read(uuid,uuid,uuid,uuid,uuid,uuid,integer,text,uuid)
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
