-- Session context is derived from a verified issuer/subject membership, never an email
-- or an Operator/Tenant supplied by the browser. Existing unbound sessions fail closed.
alter table factact_private.sessions
  add column issuer text,
  add column subject text,
  add constraint session_identity_pair check ((issuer is null) = (subject is null));

-- Compatibility for existing internal/test callers. A Tenant-local Operator alone
-- is not an identity: only a unique ACTIVE membership may derive this binding.
-- The OIDC callback uses create_verified_session below instead.
create or replace function factact_private.create_session(
  p_hash text,p_tenant uuid,p_operator uuid,p_csrf text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare v_issuer text; v_subject text; v_count integer;
begin
  select count(*)::integer,min(m.issuer),min(m.subject)
    into v_count,v_issuer,v_subject
  from factact_private.operator_identities m
  join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
  where m.tenant_id=p_tenant and m.operator_id=p_operator and m.status='ACTIVE';
  if v_count<>1 then
    raise exception 'unique active identity binding required' using errcode='42501';
  end if;
  delete from factact_private.sessions where expires_at<=now();
  insert into factact_private.sessions(token_hash,tenant_id,operator_id,csrf_token,expires_at,issuer,subject)
    values(p_hash,p_tenant,p_operator,p_csrf,now()+interval '8 hours',v_issuer,v_subject);
end $$;

create function factact_private.create_verified_session(
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
  insert into factact_private.sessions(token_hash,tenant_id,operator_id,csrf_token,expires_at,issuer,subject)
    values(p_hash,p_tenant,p_operator,p_csrf,now()+interval '8 hours',p_issuer,p_subject);
end $$;

-- Every request rechecks the exact session membership and the active Tenant/Operator.
-- Legacy sessions without a verified binding automatically stop authorizing access.
create or replace function factact_private.read_session(p_hash text)
returns table(tenant_id uuid,operator_id uuid,csrf_token text)
language sql stable security definer set search_path=pg_catalog as $$
  select s.tenant_id,s.operator_id,s.csrf_token
  from factact_private.sessions s
  join factact_private.operator_identities m
    on m.issuer=s.issuer and m.subject=s.subject and m.tenant_id=s.tenant_id
    and m.operator_id=s.operator_id and m.status='ACTIVE'
  join factact.operators o on o.tenant_id=s.tenant_id and o.id=s.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=s.tenant_id and t.status='ACTIVE'
  where s.token_hash=p_hash and s.expires_at>now()
$$;

-- Enumerate ONLY currently valid memberships of the server-side session identity.
create function factact_private.list_session_contexts(p_hash text)
returns table(tenant_id uuid,operator_id uuid,tenant_name text,operator_display_name text,
  is_login_default boolean,is_current boolean)
language sql stable security definer set search_path=pg_catalog as $$
  select m.tenant_id,m.operator_id,t.name,o.display_name,m.is_login_default,
    m.tenant_id=s.tenant_id and m.operator_id=s.operator_id
  from factact_private.sessions s
  join factact_private.operator_identities current_m
    on current_m.issuer=s.issuer and current_m.subject=s.subject
    and current_m.tenant_id=s.tenant_id and current_m.operator_id=s.operator_id
    and current_m.status='ACTIVE'
  join factact.operators current_o
    on current_o.tenant_id=s.tenant_id and current_o.id=s.operator_id and current_o.status='ACTIVE'
  join factact.tenants current_t on current_t.id=s.tenant_id and current_t.status='ACTIVE'
  join factact_private.operator_identities m on m.issuer=s.issuer and m.subject=s.subject and m.status='ACTIVE'
  join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
  where s.token_hash=p_hash and s.expires_at>now()
  order by m.is_login_default desc,m.tenant_id,m.operator_id
$$;

-- Atomic single-use token rotation. No issuer, subject, or Operator is accepted
-- from the client. Keep the original expiry to prevent switching from renewing login.
create function factact_private.switch_session_context(
  p_old_hash text,p_new_hash text,p_target_tenant uuid,p_new_csrf text
) returns table(tenant_id uuid,operator_id uuid,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_issuer text;v_subject text;v_expires timestamptz;v_operator uuid;
begin
  select s.issuer,s.subject,s.expires_at
    into v_issuer,v_subject,v_expires
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
  insert into factact_private.sessions(token_hash,tenant_id,operator_id,csrf_token,expires_at,issuer,subject)
    values(p_new_hash,p_target_tenant,v_operator,p_new_csrf,v_expires,v_issuer,v_subject);
  return query select p_target_tenant,v_operator,v_expires;
end $$;

revoke all on function factact_private.create_verified_session(text,uuid,uuid,text,text,text),
  factact_private.list_session_contexts(text),
  factact_private.switch_session_context(text,text,uuid,text) from public;
grant execute on function factact_private.create_verified_session(text,uuid,uuid,text,text,text),
  factact_private.list_session_contexts(text),
  factact_private.switch_session_context(text,text,uuid,text) to factact_runtime;
