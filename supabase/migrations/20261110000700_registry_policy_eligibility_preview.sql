-- Isolated policy-eligibility evaluation Gate. NOT connected to Registry RPCs,
-- UI, authorized proposals or pending-review routing yet. The transition
-- from approved Grant-only Registry behavior requires a separate Go decision.
-- This function is callable by the non-login Registry executor only; it does
-- not give the runtime pool a private policy read or an effective permission.
-- The executor owns the function with only the exact read columns required;
-- it never inherits the migrator's broader SECURITY DEFINER privileges.

grant select(tenant_id,service_id,actor_operator_id,operator_level,recorded_at,id)
  on factact_private.operator_policy_assignment_events to factact_registry_executor;
grant select(tenant_id,service_id,operation,policy_version_id,recorded_at,id)
  on factact_private.operator_policy_publication_events to factact_registry_executor;
grant select(tenant_id,service_id,id,category_code,cells)
  on factact_private.operator_policy_versions to factact_registry_executor;

create function factact_private.registry_display_name_policy_eligibility(
  p_tenant uuid,p_actor uuid,p_service uuid,p_contract uuid,p_recipient uuid
) returns text language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_level text;v_operation text;v_version uuid;v_disposition text;
begin
  -- The first reviewed field permits only DENY or REQUEST, never COMMIT.
  -- Do not provide metadata for a wrong Tenant or missing target.
  if p_tenant is null or p_tenant is distinct from factact.current_tenant_id()
    or p_actor is null or p_service is null or p_contract is null
    or p_recipient is null then
    return 'DENY';
  end if;

  -- Existing scoped Grant mutations use the same Actor lock. Policy
  -- administration serializes per Tenant+Service, including publication.
  -- This check is transactional, but is NOT an authorization decision until
  -- explicitly wired inside the Registry propose transaction.
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||p_tenant::text||':'||p_service::text,0));

  if not factact_private.registry_edit_authorized(
    p_tenant,p_actor,p_service,p_contract,p_recipient,'UPDATE') then
    return 'DENY';
  end if;

  select e.operator_level into v_level
    from factact_private.operator_policy_assignment_events e
    where e.tenant_id=p_tenant and e.service_id=p_service
      and e.actor_operator_id=p_actor
    order by e.recorded_at desc,e.id desc limit 1;
  if v_level is null then
    return 'DENY';
  end if;

  select e.operation,e.policy_version_id into v_operation,v_version
    from factact_private.operator_policy_publication_events e
    where e.tenant_id=p_tenant and e.service_id=p_service
    order by e.recorded_at desc,e.id desc limit 1;
  if v_operation is distinct from 'PUBLISH' or v_version is null then
    return 'DENY';
  end if;

  select v.cells->>v_level into v_disposition
    from factact_private.operator_policy_versions v
    where v.tenant_id=p_tenant and v.service_id=p_service
      and v.id=v_version and v.category_code='PERSON_DISPLAY_NAME_CORRECTION';
  if v_disposition is distinct from 'REQUEST' then
    return 'DENY';
  end if;
  return 'REQUEST';
end $$;

revoke all on function factact_private.registry_display_name_policy_eligibility(
  uuid,uuid,uuid,uuid,uuid) from public;

-- Transfer ownership in this DDL transaction, without a persistent membership
-- or CREATE privilege. No runtime Role can directly invoke the helper.
grant factact_registry_executor to current_user;
grant create on schema factact_private to factact_registry_executor;
alter function factact_private.registry_display_name_policy_eligibility(
  uuid,uuid,uuid,uuid,uuid) owner to factact_registry_executor;
revoke create on schema factact_private from factact_registry_executor;
revoke factact_registry_executor from current_user;

grant execute on function factact_private.registry_display_name_policy_eligibility(
  uuid,uuid,uuid,uuid,uuid) to factact_registry_executor;
