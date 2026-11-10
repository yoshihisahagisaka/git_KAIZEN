-- Operator levels are management labels, not Actors, legacy Roles or Grants.
-- Deliberately no published policy, level assignment, client API or Registry
-- eligibility change is installed by this migration. Policy enforcement is a
-- separate, reviewed Gate. All administrative provenance is append-only.

create table factact_private.operator_policy_assignment_events (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  actor_operator_id uuid not null,
  operator_level text check (operator_level in ('NEWCOMER','STANDARD','LEAD')),
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  approved_by_operator_id uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key (tenant_id,actor_operator_id) references factact.operators(tenant_id,id),
  foreign key (tenant_id,approved_by_operator_id) references factact.operators(tenant_id,id)
);
create index operator_policy_assignment_history
  on factact_private.operator_policy_assignment_events
  (tenant_id,service_id,actor_operator_id,recorded_at desc,id desc);

create table factact_private.operator_policy_versions (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  version integer not null check (version > 0),
  category_code text not null default 'PERSON_DISPLAY_NAME_CORRECTION'
    check (category_code = 'PERSON_DISPLAY_NAME_CORRECTION'),
  -- There is no approved immediate-commit/self-review case in the first slice.
  -- Every level is explicit, and COMMIT is intentionally not an allowed cell.
  cells jsonb not null check (jsonb_typeof(cells) = 'object'
    and cells ?& array['NEWCOMER','STANDARD','LEAD']
    and cells - 'NEWCOMER' - 'STANDARD' - 'LEAD' = '{}'::jsonb
    and cells->>'NEWCOMER' in ('DENY','REQUEST')
    and cells->>'STANDARD' in ('DENY','REQUEST')
    and cells->>'LEAD' in ('DENY','REQUEST')),
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  approved_by_operator_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_id,service_id,version),
  unique (tenant_id,service_id,id),
  foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key (tenant_id,approved_by_operator_id) references factact.operators(tenant_id,id)
);

-- A publication is a separate audited event. No existing Registry command
-- reads this ledger yet, and published data never issues a scoped Grant.
create table factact_private.operator_policy_publication_events (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  operation text not null check (operation in ('PUBLISH','DISABLE')),
  policy_version_id uuid,
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  approved_by_operator_id uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  check ((operation='PUBLISH' and policy_version_id is not null)
    or (operation='DISABLE' and policy_version_id is null)),
  foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key (tenant_id,service_id,policy_version_id)
    references factact_private.operator_policy_versions(tenant_id,service_id,id),
  foreign key (tenant_id,approved_by_operator_id) references factact.operators(tenant_id,id)
);
create index operator_policy_publication_history
  on factact_private.operator_policy_publication_events
  (tenant_id,service_id,recorded_at desc,id desc);

-- Globally unique request key prevents changing operation/payload on retries.
-- The approved verified subject is private and never returned through API.
create table factact_private.operator_policy_admin_requests (
  request_id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  operation text not null check (operation in
    ('ASSIGN_LEVEL','CREATE_VERSION','PUBLISH','DISABLE')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  approved_by_operator_id uuid not null,
  approved_by_issuer text not null,
  approved_by_subject text not null,
  approved_at timestamptz not null default clock_timestamp(),
  foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
  foreign key (tenant_id,approved_by_operator_id) references factact.operators(tenant_id,id)
);

revoke all on factact_private.operator_policy_assignment_events,
  factact_private.operator_policy_versions,
  factact_private.operator_policy_publication_events,
  factact_private.operator_policy_admin_requests from public,factact_runtime;

-- Reuse the separately approved verified one-human Google identity control.
-- A policy command rechecks this live session, membership and approver under
-- lock; an Operator email, Role, level or scoped Grant never substitutes.
create function factact_private.operator_policy_assign_level(
  p_session_hash text,p_request_id uuid,p_service uuid,p_actor uuid,
  p_level text,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_admin uuid;v_payload jsonb;v_prior record;v_reason text;
begin
  select tenant_id into v_tenant from factact_private.sessions where token_hash=p_session_hash;
  if v_tenant is null or p_request_id is null or p_service is null or p_actor is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||v_tenant::text||':'||p_service::text,0));
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_reason:=btrim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 or
    (p_level is not null and p_level not in ('NEWCOMER','STANDARD','LEAD')) then
    raise exception 'invalid operator policy assignment' using errcode='22023';
  end if;
  v_payload:=jsonb_build_object('service',p_service,'actor',p_actor,
    'level',p_level,'reason',v_reason);
  select tenant_id,service_id,operation,payload into v_prior
    from factact_private.operator_policy_admin_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.service_id=p_service
      and v_prior.operation='ASSIGN_LEVEL' and v_prior.payload=v_payload then
      return p_request_id;
    end if;
    raise exception 'policy request retry conflict' using errcode='23505';
  end if;
  if not exists (select 1 from factact.services where tenant_id=v_tenant
    and id=p_service and status='ACTIVE') or not exists (
    select 1 from factact.operators where tenant_id=v_tenant and id=p_actor and status='ACTIVE'
  ) then raise exception 'policy target unavailable' using errcode='42501'; end if;
  insert into factact_private.operator_policy_assignment_events
    (id,tenant_id,service_id,actor_operator_id,operator_level,reason,approved_by_operator_id)
  values (p_request_id,v_tenant,p_service,p_actor,p_level,v_reason,v_admin);
  insert into factact_private.operator_policy_admin_requests
    (request_id,tenant_id,service_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_service,'ASSIGN_LEVEL',v_payload,v_admin,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values (gen_random_uuid(),v_tenant,'OPERATOR_POLICY',p_service,
    'OPERATOR_POLICY_LEVEL_ASSIGNED',v_admin,
    jsonb_build_object('requestId',p_request_id,'actorOperatorId',p_actor,
      'level',p_level,'reason',v_reason));
  return p_request_id;
end $$;

create function factact_private.operator_policy_create_version(
  p_session_hash text,p_request_id uuid,p_service uuid,p_cells jsonb,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_admin uuid;v_payload jsonb;v_prior record;
        v_reason text;v_next integer;v_level text;
begin
  select tenant_id into v_tenant from factact_private.sessions where token_hash=p_session_hash;
  if v_tenant is null or p_request_id is null or p_service is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||v_tenant::text||':'||p_service::text,0));
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_reason:=btrim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 or
    coalesce(jsonb_typeof(p_cells),'')<>'object' then
    raise exception 'invalid operator policy version' using errcode='22023';
  end if;
  if not (p_cells ?& array['NEWCOMER','STANDARD','LEAD']) or
    (p_cells - 'NEWCOMER' - 'STANDARD' - 'LEAD') <> '{}'::jsonb then
    raise exception 'incomplete operator policy version' using errcode='22023';
  end if;
  foreach v_level in array array['NEWCOMER','STANDARD','LEAD'] loop
    if coalesce(jsonb_typeof(p_cells->v_level),'')<>'string' or
      coalesce(p_cells->>v_level,'') not in ('DENY','REQUEST') then
      raise exception 'unapproved operator policy disposition' using errcode='22023';
    end if;
  end loop;
  v_payload:=jsonb_build_object('service',p_service,'category',
    'PERSON_DISPLAY_NAME_CORRECTION','cells',p_cells,'reason',v_reason);
  select tenant_id,service_id,operation,payload into v_prior
    from factact_private.operator_policy_admin_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.service_id=p_service
      and v_prior.operation='CREATE_VERSION' and v_prior.payload=v_payload then
      return p_request_id;
    end if;
    raise exception 'policy request retry conflict' using errcode='23505';
  end if;
  if not exists (select 1 from factact.services where tenant_id=v_tenant
    and id=p_service and status='ACTIVE') then
    raise exception 'policy service unavailable' using errcode='42501';
  end if;
  select coalesce(max(version),0)+1 into v_next
    from factact_private.operator_policy_versions
    where tenant_id=v_tenant and service_id=p_service;
  insert into factact_private.operator_policy_versions
    (id,tenant_id,service_id,version,cells,reason,approved_by_operator_id)
  values (p_request_id,v_tenant,p_service,v_next,p_cells,v_reason,v_admin);
  insert into factact_private.operator_policy_admin_requests
    (request_id,tenant_id,service_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_service,'CREATE_VERSION',v_payload,v_admin,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values (gen_random_uuid(),v_tenant,'OPERATOR_POLICY',p_service,
    'OPERATOR_POLICY_VERSION_CREATED',v_admin,
    jsonb_build_object('requestId',p_request_id,'version',v_next,
      'category','PERSON_DISPLAY_NAME_CORRECTION','cells',p_cells,'reason',v_reason));
  return p_request_id;
end $$;

create function factact_private.operator_policy_publish(
  p_session_hash text,p_request_id uuid,p_service uuid,
  p_version uuid,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_admin uuid;v_payload jsonb;v_prior record;
        v_reason text;v_operation text;
begin
  select tenant_id into v_tenant from factact_private.sessions where token_hash=p_session_hash;
  if v_tenant is null or p_request_id is null or p_service is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'factact:operator-policy:'||v_tenant::text||':'||p_service::text,0));
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_reason:=btrim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 then
    raise exception 'policy publication reason required' using errcode='22023';
  end if;
  v_operation:=case when p_version is null then 'DISABLE' else 'PUBLISH' end;
  v_payload:=jsonb_build_object('service',p_service,'versionId',p_version,'reason',v_reason);
  select tenant_id,service_id,operation,payload into v_prior
    from factact_private.operator_policy_admin_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.service_id=p_service
      and v_prior.operation=v_operation and v_prior.payload=v_payload then
      return p_request_id;
    end if;
    raise exception 'policy request retry conflict' using errcode='23505';
  end if;
  if not exists (select 1 from factact.services where tenant_id=v_tenant
    and id=p_service and status='ACTIVE') or (p_version is not null and not exists (
      select 1 from factact_private.operator_policy_versions
      where tenant_id=v_tenant and service_id=p_service and id=p_version
    )) then raise exception 'policy publication unavailable' using errcode='42501'; end if;
  insert into factact_private.operator_policy_publication_events
    (id,tenant_id,service_id,operation,policy_version_id,reason,approved_by_operator_id)
  values (p_request_id,v_tenant,p_service,v_operation,p_version,v_reason,v_admin);
  insert into factact_private.operator_policy_admin_requests
    (request_id,tenant_id,service_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_service,v_operation,v_payload,v_admin,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values (gen_random_uuid(),v_tenant,'OPERATOR_POLICY',p_service,
    case when p_version is null then 'OPERATOR_POLICY_DISABLED' else 'OPERATOR_POLICY_PUBLISHED' end,
    v_admin,jsonb_build_object('requestId',p_request_id,'versionId',p_version,
      'reason',v_reason,'enforcement','NOT_WIRED_IN_THIS_GATE'));
  return p_request_id;
end $$;

revoke all on function factact_private.operator_policy_assign_level(text,uuid,uuid,uuid,text,text),
  factact_private.operator_policy_create_version(text,uuid,uuid,jsonb,text),
  factact_private.operator_policy_publish(text,uuid,uuid,uuid,text) from public;
grant execute on function factact_private.operator_policy_assign_level(text,uuid,uuid,uuid,text,text),
  factact_private.operator_policy_create_version(text,uuid,uuid,jsonb,text),
  factact_private.operator_policy_publish(text,uuid,uuid,uuid,text) to factact_runtime;
