-- Explicit context memberships for one verified OIDC Identity.
-- These are authorization candidates, not access grants.
-- Legacy single-Tenant login keeps an explicit default; no arbitrary first-row selection.

alter table factact_private.operator_identities
  drop constraint operator_identities_pkey;
alter table factact_private.operator_identities
  add column status text not null default 'ACTIVE'
    check (status in ('ACTIVE','REVOKED')),
  -- Existing bootstrap insertion remains the single explicit login context.
  -- Further memberships must be inserted with is_login_default=false.
  add column is_login_default boolean not null default true,
  add column granted_at timestamptz not null default now(),
  add column revoked_at timestamptz,
  add column revocation_reason text,
  add constraint operator_identity_revocation_check check (
    (status='ACTIVE' and revoked_at is null and revocation_reason is null)
    or (status='REVOKED' and revoked_at is not null and revocation_reason is not null
      and length(trim(revocation_reason)) between 1 and 1000)
  );
-- All current records were unambiguously single-tenant before this migration.
alter table factact_private.operator_identities
  add primary key (issuer,subject,tenant_id);
create unique index operator_identity_one_active_login_default
  on factact_private.operator_identities (issuer,subject)
  where status='ACTIVE' and is_login_default;
create unique index operator_identity_one_issuer_binding_per_tenant_operator
  on factact_private.operator_identities (issuer,tenant_id,operator_id);

-- The pre-existing bootstrap lookup remains compatible and fail-closed.
-- No active default (or a revoked/inactive mapped Actor) means no login.
create or replace function factact_private.resolve_identity(p_issuer text, p_subject text)
returns table (tenant_id uuid,operator_id uuid)
language sql stable security definer set search_path = pg_catalog as $$
  select m.tenant_id,m.operator_id
  from factact_private.operator_identities m
  join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
  where m.issuer=p_issuer and m.subject=p_subject
    and m.status='ACTIVE' and m.is_login_default=true
$$;

-- List candidate contexts only AFTER a verified OIDC callback.
-- No choice is trusted from email or a browser-provided principal.
create function factact_private.resolve_identity_contexts(p_issuer text,p_subject text)
returns table (tenant_id uuid,operator_id uuid,is_login_default boolean)
language sql stable security definer set search_path = pg_catalog as $$
  select m.tenant_id,m.operator_id,m.is_login_default
  from factact_private.operator_identities m
  join factact.operators o on o.tenant_id=m.tenant_id and o.id=m.operator_id and o.status='ACTIVE'
  join factact.tenants t on t.id=m.tenant_id and t.status='ACTIVE'
  where m.issuer=p_issuer and m.subject=p_subject and m.status='ACTIVE'
  order by m.is_login_default desc,m.tenant_id,m.operator_id
$$;
revoke all on function factact_private.resolve_identity_contexts(text,text) from public;
grant execute on function factact_private.resolve_identity_contexts(text,text) to factact_runtime;
