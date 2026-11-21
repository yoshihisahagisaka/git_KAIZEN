-- Initial human Grant approver is one explicitly verified Google identity
-- associated (at provisioning time) with yoshihisa.hagisaka@atlib.jp.
-- Email alone is never an authentication or authorization predicate.
-- This table is intentionally EMPTY after migration: no real identity or
-- credential can be inferred from the development seed or operator email.
-- Legacy create_session is available for internal compatibility; unlike a
-- verified OIDC callback it must never authorize privileged Grant management.
alter table factact_private.sessions
  add column oidc_verified_login boolean not null default false;

create or replace function factact_private.create_verified_session(
  p_hash text,p_tenant uuid,p_operator uuid,p_csrf text,p_issuer text,p_subject text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
  if not exists (
    select 1 from factact_private.operator_identities m
    join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
    join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
    where m.issuer=p_issuer and m.subject=p_subject and m.tenant_id=p_tenant
      and m.operator_id=p_operator and m.status='ACTIVE' and m.is_login_default
  ) then
    raise exception 'active verified login membership required' using errcode='42501';
  end if;
  delete from factact_private.sessions where expires_at<=now();
  insert into factact_private.sessions
    (token_hash,tenant_id,operator_id,csrf_token,expires_at,issuer,subject,oidc_verified_login)
  values (p_hash,p_tenant,p_operator,p_csrf,now()+interval '8 hours',p_issuer,p_subject,true);
end $$;

-- A verified identity may intentionally switch between its own Tenant
-- memberships. Preserve, never manufacture or upgrade, login provenance.
create or replace function factact_private.switch_session_context(
  p_old_hash text,p_new_hash text,p_target_tenant uuid,p_new_csrf text
) returns table(tenant_id uuid,operator_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_issuer text;v_subject text;v_expires timestamptz;
        v_operator uuid;v_verified boolean;
begin
  select s.issuer,s.subject,s.expires_at,s.oidc_verified_login
    into v_issuer,v_subject,v_expires,v_verified
  from factact_private.sessions s
  join factact_private.operator_identities current_m
    on current_m.issuer=s.issuer and current_m.subject=s.subject
    and current_m.tenant_id=s.tenant_id and current_m.operator_id=s.operator_id
    and current_m.status='ACTIVE'
  join factact.operators current_o
    on current_o.tenant_id=s.tenant_id and current_o.id=s.operator_id and current_o.status='ACTIVE'
  join factact.tenants current_t on current_t.id=s.tenant_id and current_t.status='ACTIVE'
  where s.token_hash=p_old_hash and s.expires_at>now()
  for update of s;
  if not found then return; end if;

  select m.operator_id into v_operator
  from factact_private.operator_identities m
  join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
  where m.issuer=v_issuer and m.subject=v_subject
    and m.tenant_id=p_target_tenant and m.status='ACTIVE';
  if not found then return; end if;

  delete from factact_private.sessions where token_hash=p_old_hash;
  insert into factact_private.sessions
    (token_hash,tenant_id,operator_id,csrf_token,expires_at,issuer,subject,oidc_verified_login)
  values (p_new_hash,p_target_tenant,v_operator,p_new_csrf,v_expires,v_issuer,v_subject,v_verified);
  return query select p_target_tenant,v_operator,v_expires;
end $$;

create table factact_private.scoped_grant_approvers (
  issuer text not null check (issuer = 'https://accounts.google.com'),
  subject text not null check (length(trim(subject)) > 0),
  approved_email text not null check (approved_email = 'yoshihisa.hagisaka@atlib.jp'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (issuer,subject),
  check ((status='ACTIVE' and revoked_at is null) or
         (status='REVOKED' and revoked_at is not null))
);
create unique index one_active_scoped_grant_approver
  on factact_private.scoped_grant_approvers (approved_email)
  where status='ACTIVE';
revoke all on factact_private.scoped_grant_approvers from public;

-- Durable idempotency and authenticated-Human approval provenance.
-- No normal application role may read/write either private table.
create table factact_private.scoped_grant_management_requests (
  request_id uuid primary key,
  tenant_id uuid not null,
  grant_id uuid not null,
  operation text not null check (operation in ('ISSUE','REVOKE')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  approved_by_operator_id uuid not null,
  approved_by_issuer text not null,
  approved_by_subject text not null,
  approved_at timestamptz not null default now(),
  foreign key (tenant_id,approved_by_operator_id)
    references factact.operators (tenant_id,id)
);
create index scoped_grant_management_by_grant
  on factact_private.scoped_grant_management_requests (tenant_id,grant_id,approved_at);
revoke all on factact_private.scoped_grant_management_requests from public;

-- Call only from privileged, single-statement management commands. The
-- session hash is server-held; the browser never supplies issuer/subject.
-- FOR SHARE keeps active session, membership, Operator and approver status
-- stable until the management command commits.
create function factact_private.require_scoped_grant_approver(
  p_session_hash text,p_tenant uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_operator uuid;
begin
  select s.operator_id into v_operator
  from factact_private.sessions s
  join factact_private.operator_identities m
    on m.issuer=s.issuer and m.subject=s.subject and m.tenant_id=s.tenant_id
      and m.operator_id=s.operator_id and m.status='ACTIVE'
  join factact_private.scoped_grant_approvers a
    on a.issuer=s.issuer and a.subject=s.subject and a.status='ACTIVE'
      and a.approved_email='yoshihisa.hagisaka@atlib.jp'
  join factact.operators o on o.tenant_id=s.tenant_id and o.id=s.operator_id
    and o.status='ACTIVE'
  join factact.tenants t on t.id=s.tenant_id and t.status='ACTIVE'
  where s.token_hash=p_session_hash and s.expires_at>now()
    and s.oidc_verified_login
    and s.tenant_id=p_tenant and s.issuer='https://accounts.google.com'
  for share of s,m,a,o,t;
  if not found then
    raise exception 'verified Grant approver required' using errcode='42501';
  end if;
  return v_operator;
end $$;
revoke all on function factact_private.require_scoped_grant_approver(text,uuid) from public;

create function factact_private.issue_scoped_actor_grant(
  p_session_hash text,p_request_id uuid,p_actor uuid,p_service uuid,p_contract uuid,
  p_scope_kind text,p_recipient uuid,p_work uuid,p_object_kind text,p_operations text[],
  p_effective_from timestamptz,p_effective_until timestamptz,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_tenant uuid; v_approver uuid; v_payload jsonb; v_prior record; v_reason text;
  v_lane text; v_work_recipient uuid; v_event uuid; v_beneficiary record;
begin
  -- Only session-derived Tenant may be used. The first read takes no row lock;
  -- full, locked identity/approval verification happens after the actor lock.
  select tenant_id into v_tenant from factact_private.sessions
    where token_hash=p_session_hash;
  if v_tenant is null or p_actor is null or p_request_id is null then
    raise exception 'verified Grant approver required' using errcode='42501';
  end if;
  perform factact.lock_scoped_actor_authority(v_tenant,p_actor);
  -- Request ID also serializes retries, including attempts for other Actors.
  perform pg_advisory_xact_lock(hashtextextended('factact:grant-request:'||p_request_id::text,0));
  v_approver:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);

  v_reason:=trim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 then
    raise exception 'Grant approval reason required' using errcode='22023';
  end if;

  v_payload:=jsonb_build_object('actor',p_actor,'service',p_service,'contract',p_contract,
    'scope',p_scope_kind,'recipient',p_recipient,'work',p_work,'object',p_object_kind,
    'operations',p_operations,'from',p_effective_from,'until',p_effective_until,
    'reason',v_reason);
  select tenant_id,grant_id,operation,payload into v_prior
    from factact_private.scoped_grant_management_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.grant_id=p_request_id
      and v_prior.operation='ISSUE' and v_prior.payload=v_payload then
      return p_request_id;
    end if;
    raise exception 'Grant request retry conflict' using errcode='23505';
  end if;

  if not exists (select 1 from factact.operators
    where tenant_id=v_tenant and id=p_actor and status='ACTIVE')
    or not exists (select 1 from factact.services
      where tenant_id=v_tenant and id=p_service and status='ACTIVE')
    or not exists (select 1 from factact.contract_profiles
      where tenant_id=v_tenant and id=p_contract and service_id=p_service
        and status='ACTIVE' and effective_from<=now()
        and (effective_to is null or effective_to>now())) then
    raise exception 'invalid active Grant context' using errcode='42501';
  end if;
  if p_scope_kind='SERVICE' then
    if p_recipient is not null or p_work is not null then
      raise exception 'invalid Grant scope' using errcode='22023';
    end if;
  elsif p_scope_kind in ('SERVICE_RECIPIENT','WORK') then
    if p_recipient is null or not exists (
      select 1 from factact.service_recipients r
      left join factact.organizations o on o.tenant_id=r.tenant_id
        and o.id=r.recipient_organization_id
      where r.tenant_id=v_tenant and r.id=p_recipient and r.service_id=p_service
        and r.status='ACTIVE'
        and (r.recipient_type<>'ORGANIZATION' or o.status='ACTIVE')) then
      raise exception 'invalid active Grant recipient' using errcode='42501';
    end if;
    if p_scope_kind='SERVICE_RECIPIENT' and p_work is not null then
      raise exception 'invalid Grant scope' using errcode='22023';
    end if;
    if p_scope_kind='WORK' then
      select w.lane,w.service_recipient_id,w.support_event_id
        into v_lane,v_work_recipient,v_event
      from factact.work w where w.tenant_id=v_tenant and w.id=p_work
        and w.service_id=p_service and w.contract_profile_id=p_contract;
      if not found then
        raise exception 'invalid Grant Work' using errcode='42501';
      end if;
      if v_lane='SUPPORT' then
        select d.kind,d.service_recipient_id into v_beneficiary
          from factact.support_event_beneficiary_decisions d
          where d.tenant_id=v_tenant and d.support_event_id=v_event
          order by d.revision desc limit 1;
        if not found or v_beneficiary.kind<>'CONFIRMED'
          or v_beneficiary.service_recipient_id is distinct from p_recipient then
          raise exception 'unconfirmed Grant Work beneficiary' using errcode='42501';
        end if;
      elsif v_work_recipient is distinct from p_recipient then
        raise exception 'Grant Work recipient mismatch' using errcode='42501';
      end if;
    end if;
  else
    raise exception 'invalid Grant scope' using errcode='22023';
  end if;

  insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,work_id,object_kind,operations,effective_from,effective_until,
     issued_by_operator_id)
  values (p_request_id,v_tenant,p_actor,p_service,p_contract,p_scope_kind,
    p_recipient,p_work,p_object_kind,p_operations,p_effective_from,p_effective_until,v_approver);
  insert into factact_private.scoped_grant_management_requests
    (request_id,tenant_id,grant_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_request_id,'ISSUE',v_payload,v_approver,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,occurred_at,metadata_json)
  values (gen_random_uuid(),v_tenant,'SCOPED_ACTOR_GRANT',p_request_id,
    'SCOPED_GRANT_MANAGEMENT_ISSUE_APPROVED',v_approver,clock_timestamp(),
    jsonb_build_object('requestId',p_request_id,'grantId',p_request_id,
      'approval','VERIFIED_SINGLE_HUMAN_ADMIN_SESSION','actorOperatorId',p_actor,
      'reason',v_reason));
  return p_request_id;
end $$;

create function factact_private.revoke_scoped_actor_grant(
  p_session_hash text,p_request_id uuid,p_grant_id uuid,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_tenant uuid; v_actor uuid; v_approver uuid; v_current record;
  v_prior record; v_payload jsonb; v_reason text;
begin
  if p_request_id is null or p_grant_id is null then
    raise exception 'invalid Grant request' using errcode='22023';
  end if;
  -- The unlocked lookup only identifies the advisory key. The locked lookup
  -- below proves it has not changed. No target existence is disclosed on deny.
  select tenant_id,actor_operator_id into v_tenant,v_actor
    from factact.scoped_actor_grants where id=p_grant_id;
  if not found then
    raise exception 'Grant not available' using errcode='42501';
  end if;
  perform factact.lock_scoped_actor_authority(v_tenant,v_actor);
  perform pg_advisory_xact_lock(hashtextextended('factact:grant-request:'||p_request_id::text,0));
  v_approver:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_reason:=trim(coalesce(p_reason,''));
  if length(v_reason) not between 1 and 1000 then
    raise exception 'revocation reason required' using errcode='22023';
  end if;
  v_payload:=jsonb_build_object('grantId',p_grant_id,'reason',v_reason);
  select tenant_id,grant_id,operation,payload into v_prior
    from factact_private.scoped_grant_management_requests where request_id=p_request_id;
  if found then
    if v_prior.tenant_id=v_tenant and v_prior.grant_id=p_grant_id
      and v_prior.operation='REVOKE' and v_prior.payload=v_payload then
      return p_grant_id;
    end if;
    raise exception 'Grant request retry conflict' using errcode='23505';
  end if;
  select g.tenant_id,g.actor_operator_id,g.status into v_current
    from factact.scoped_actor_grants g where g.id=p_grant_id for update;
  if not found or v_current.tenant_id<>v_tenant or v_current.actor_operator_id<>v_actor
    or v_current.status<>'ACTIVE' then
    raise exception 'Grant not active' using errcode='42501';
  end if;
  update factact.scoped_actor_grants
     set status='REVOKED',revoked_by_operator_id=v_approver,
         revoked_at=clock_timestamp(),revocation_reason=v_reason
   where id=p_grant_id;
  insert into factact_private.scoped_grant_management_requests
    (request_id,tenant_id,grant_id,operation,payload,approved_by_operator_id,
     approved_by_issuer,approved_by_subject)
  select p_request_id,v_tenant,p_grant_id,'REVOKE',v_payload,v_approver,s.issuer,s.subject
    from factact_private.sessions s where s.token_hash=p_session_hash;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,occurred_at,metadata_json)
  values (gen_random_uuid(),v_tenant,'SCOPED_ACTOR_GRANT',p_grant_id,
    'SCOPED_GRANT_MANAGEMENT_REVOKE_APPROVED',v_approver,clock_timestamp(),
    jsonb_build_object('requestId',p_request_id,'grantId',p_grant_id,
      'approval','VERIFIED_SINGLE_HUMAN_ADMIN_SESSION','reason',v_reason));
  return p_grant_id;
end $$;

revoke all on function factact_private.issue_scoped_actor_grant(
  text,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text[],timestamptz,timestamptz,text),
  factact_private.revoke_scoped_actor_grant(text,uuid,uuid,text) from public;
grant execute on function factact_private.issue_scoped_actor_grant(
  text,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text[],timestamptz,timestamptz,text),
  factact_private.revoke_scoped_actor_grant(text,uuid,uuid,text) to factact_runtime;
