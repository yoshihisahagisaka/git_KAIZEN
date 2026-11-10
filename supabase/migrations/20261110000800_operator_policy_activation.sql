-- Explicit per-Service activation is distinct from publishing or assigning.
-- Never backfill an activation; no seeded Service is activated on migration.
-- Only Synthetic/Staging execution has been approved; Production remains No-Go.

alter table factact_private.operator_policy_admin_requests
  drop constraint operator_policy_admin_requests_operation_check;
alter table factact_private.operator_policy_admin_requests
  add constraint operator_policy_admin_requests_operation_check
    check (operation in ('ASSIGN_LEVEL','CREATE_VERSION','PUBLISH','DISABLE',
      'ACTIVATE','STOP'));
alter table factact_private.operator_policy_publication_events
  add constraint operator_policy_publication_service_event_unique
    unique (tenant_id,service_id,id);

create table factact_private.operator_policy_activation_events (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  operation text not null check (operation in ('ACTIVATE','STOP')),
  policy_version_id uuid,
  publication_event_id uuid,
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  approved_by_operator_id uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  check ((operation='ACTIVATE' and policy_version_id is not null
      and publication_event_id is not null)
    or (operation='STOP' and policy_version_id is null
      and publication_event_id is null)),
  foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key (tenant_id,service_id,policy_version_id)
    references factact_private.operator_policy_versions(tenant_id,service_id,id),
  foreign key (tenant_id,service_id,publication_event_id)
    references factact_private.operator_policy_publication_events(
      tenant_id,service_id,id),
  foreign key (tenant_id,approved_by_operator_id)
    references factact.operators(tenant_id,id)
);
create index operator_policy_activation_history on
  factact_private.operator_policy_activation_events
  (tenant_id,service_id,recorded_at desc,id desc);
revoke all on factact_private.operator_policy_activation_events
  from public,factact_runtime;

-- A single explicitly designated human is reverified live for every operation.
-- STOP is fail-closed; only a new audited ACTIVATE may resume new proposals.
create function factact_private.operator_policy_set_activation(
  p_session_hash text,p_request_id uuid,p_service uuid,p_version uuid,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_admin uuid;v_payload jsonb;v_prior record;
        v_reason text;v_operation text;v_publication record;v_current text;
        v_publication_id uuid;
begin
  select tenant_id into v_tenant from factact_private.sessions
    where token_hash=p_session_hash;
  if v_tenant is null or p_request_id is null or p_service is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||v_tenant::text||':'||p_service::text,0));
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_reason:=btrim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 then
    raise exception 'activation reason required' using errcode='22023';
  end if;
  v_operation:=case when p_version is null then 'STOP' else 'ACTIVATE' end;
  v_payload:=jsonb_build_object('service',p_service,'versionId',p_version,
    'reason',v_reason);
  select tenant_id,service_id,operation,payload into v_prior
    from factact_private.operator_policy_admin_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.service_id=p_service
      and v_prior.operation=v_operation and v_prior.payload=v_payload then
      return p_request_id;
    end if;
    raise exception 'activation retry conflict' using errcode='23505';
  end if;
  if not exists(select 1 from factact.services
    where tenant_id=v_tenant and id=p_service and status='ACTIVE') then
    raise exception 'activation Service unavailable' using errcode='42501';
  end if;
  select operation into v_current
    from factact_private.operator_policy_activation_events
    where tenant_id=v_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 1;
  if p_version is null then
    if v_current is distinct from 'ACTIVATE' then
      raise exception 'no active policy to stop' using errcode='42501';
    end if;
  else
    select id,operation,policy_version_id into v_publication
      from factact_private.operator_policy_publication_events
      where tenant_id=v_tenant and service_id=p_service
      order by recorded_at desc,id desc limit 1;
    if v_publication.operation is distinct from 'PUBLISH'
      or v_publication.policy_version_id is distinct from p_version then
      raise exception 'published policy version required' using errcode='42501';
    end if;
    v_publication_id:=v_publication.id;
  end if;
  insert into factact_private.operator_policy_activation_events
    (id,tenant_id,service_id,operation,policy_version_id,publication_event_id,
     reason,approved_by_operator_id)
  values(p_request_id,v_tenant,p_service,v_operation,p_version,
    v_publication_id,v_reason,v_admin);
  insert into factact_private.operator_policy_admin_requests
    (request_id,tenant_id,service_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_service,v_operation,v_payload,v_admin,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values(gen_random_uuid(),v_tenant,'OPERATOR_POLICY',p_service,
    case when p_version is null then 'OPERATOR_POLICY_STOPPED'
      else 'OPERATOR_POLICY_ACTIVATED' end,v_admin,
    jsonb_build_object('requestId',p_request_id,'policyVersionId',p_version,
      'publicationEventId',v_publication_id,
      'reason',v_reason,'newProposalMode',
      case when p_version is null then 'DENY' else 'POLICY_REQUEST' end));
  return p_request_id;
end $$;
revoke all on function factact_private.operator_policy_set_activation(
  text,uuid,uuid,uuid,text) from public;
grant execute on function factact_private.operator_policy_set_activation(
  text,uuid,uuid,uuid,text) to factact_runtime;

-- Only the non-login Registry executor may inspect activation state to decide
-- whether the existing proposal command uses legacy checks, policy, or DENY.
grant select(tenant_id,service_id,id,operation,policy_version_id,
  publication_event_id,recorded_at)
  on factact_private.operator_policy_activation_events to factact_registry_executor;

create function factact_private.registry_policy_activation_decision(
  p_tenant uuid,p_actor uuid,p_service uuid,p_contract uuid,p_recipient uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_event record;v_publication record;
begin
  if p_tenant is null or p_tenant is distinct from factact.current_tenant_id()
    or p_actor is null or p_service is null or p_contract is null
    or p_recipient is null then
    return jsonb_build_object('mode','DENY');
  end if;
  -- Match proposal/Grant lock order even in an isolated evaluator invocation.
  -- Serialize every activation/publication snapshot per Service.
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||p_tenant::text||':'||p_service::text,0));
  select id,operation,policy_version_id,publication_event_id into v_event
    from factact_private.operator_policy_activation_events
    where tenant_id=p_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 1;
  if not found then
    return jsonb_build_object('mode','LEGACY_GRANT_ONLY');
  end if;
  if v_event.operation is distinct from 'ACTIVATE' then
    return jsonb_build_object('mode','DENY','activationId',v_event.id);
  end if;
  -- Versions are pinned at ACTIVATE. Another publication or disable is NOT an
  -- implicit approval of a new effective policy. Fail closed until an explicit
  -- re-ACTIVATE, even if the previously pinned version is later re-published.
  select id,operation,policy_version_id into v_publication
    from factact_private.operator_policy_publication_events
    where tenant_id=p_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 1;
  if v_publication.id is distinct from v_event.publication_event_id
    or v_publication.operation is distinct from 'PUBLISH'
    or v_publication.policy_version_id is distinct from v_event.policy_version_id
    or factact_private.registry_display_name_policy_eligibility(
      p_tenant,p_actor,p_service,p_contract,p_recipient) is distinct from 'REQUEST' then
    return jsonb_build_object('mode','DENY','activationId',v_event.id);
  end if;
  return jsonb_build_object('mode','POLICY_REQUEST','activationId',v_event.id,
    'policyVersionId',v_event.policy_version_id);
end $$;
revoke all on function factact_private.registry_policy_activation_decision(
  uuid,uuid,uuid,uuid,uuid) from public;
grant factact_registry_executor to current_user;
grant create on schema factact_private to factact_registry_executor;
alter function factact_private.registry_policy_activation_decision(
  uuid,uuid,uuid,uuid,uuid) owner to factact_registry_executor;
revoke create on schema factact_private from factact_registry_executor;
revoke factact_registry_executor from current_user;
