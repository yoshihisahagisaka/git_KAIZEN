-- Fresh FACTACT schema. No sibling business schemas were copied.
-- Supabase CLI owns migration history. Run as the migration/admin role.
create role factact_runtime login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create schema factact;
create schema factact_private;
revoke all on schema factact, factact_private from public;
grant usage on schema factact, factact_private to factact_runtime;

create function factact.current_tenant_id() returns uuid
language sql stable set search_path = pg_catalog
as $$ select nullif(current_setting('factact.tenant_id', true), '')::uuid $$;
revoke all on function factact.current_tenant_id() from public;
grant execute on function factact.current_tenant_id() to factact_runtime;

create table factact.tenants (
  id uuid primary key,
  name text not null,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table factact.operators (
  id uuid primary key,
  tenant_id uuid not null references factact.tenants(id),
  email text not null,
  display_name text not null,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create table factact.operator_roles (
  tenant_id uuid not null,
  operator_id uuid not null,
  role text not null check (role in ('ADMIN', 'OPERATOR', 'REVIEWER')),
  primary key (tenant_id, operator_id, role),
  foreign key (tenant_id, operator_id) references factact.operators(tenant_id, id)
);
create table factact.organizations (
  id uuid primary key,
  tenant_id uuid not null references factact.tenants(id),
  name text not null,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);
create table factact.people (
  id uuid primary key,
  tenant_id uuid not null,
  organization_id uuid not null,
  display_name text not null,
  email text,
  lifecycle_status text not null check (lifecycle_status in ('JOINING', 'ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, organization_id) references factact.organizations(tenant_id, id)
);
create table factact.devices (
  id uuid primary key,
  tenant_id uuid not null references factact.tenants(id),
  asset_tag text not null,
  serial_number text,
  display_name text not null,
  device_status text not null check (device_status in ('AVAILABLE', 'UNAVAILABLE', 'RETIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, asset_tag)
);
create table factact.services (
  id uuid primary key,
  tenant_id uuid not null,
  organization_id uuid not null,
  service_model_code text not null check (service_model_code = 'JOSYS_KAIZEN'),
  name text not null,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, organization_id) references factact.organizations(tenant_id, id)
);
create table factact.contract_profiles (
  id uuid primary key,
  tenant_id uuid not null,
  service_id uuid not null,
  version integer not null check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  configuration_json jsonb not null check (jsonb_typeof(configuration_json) = 'object'),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, service_id, version),
  check (effective_to is null or effective_to > effective_from),
  foreign key (tenant_id, service_id) references factact.services(tenant_id, id)
);
create table factact.audit_events (
  id uuid primary key,
  tenant_id uuid not null references factact.tenants(id),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  actor_operator_id uuid,
  occurred_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  foreign key (tenant_id, actor_operator_id) references factact.operators(tenant_id, id)
);

-- No blanket future-table grants: new domain tables require deliberate privileges/policies.
do $$
declare table_name text;
begin
  foreach table_name in array array['tenants','operators','operator_roles','organizations','people','devices','services','contract_profiles','audit_events'] loop
    execute format('alter table factact.%I enable row level security', table_name);
    execute format('alter table factact.%I force row level security', table_name);
    execute format('create policy tenant_isolation on factact.%I to factact_runtime using (%I = factact.current_tenant_id()) with check (%I = factact.current_tenant_id())',
      table_name, case when table_name = 'tenants' then 'id' else 'tenant_id' end,
      case when table_name = 'tenants' then 'id' else 'tenant_id' end);
  end loop;
end $$;
grant select on factact.tenants, factact.operators, factact.operator_roles,
  factact.organizations, factact.people, factact.devices, factact.services,
  factact.contract_profiles, factact.audit_events to factact_runtime;
grant insert on factact.audit_events to factact_runtime;
create index audit_events_timeline on factact.audit_events (tenant_id, aggregate_id, occurred_at);

-- Infrastructure identity binding is deliberately separate from Person and Operator IDs.
create table factact_private.operator_identities (
  issuer text not null,
  subject text not null,
  tenant_id uuid not null,
  operator_id uuid not null,
  primary key (issuer, subject),
  foreign key (tenant_id, operator_id) references factact.operators(tenant_id, id)
);
create table factact_private.login_transactions (
  token_hash text primary key check (length(token_hash) = 64),
  state text not null,
  nonce text not null,
  verifier text not null,
  expires_at timestamptz not null
);
create table factact_private.sessions (
  token_hash text primary key check (length(token_hash) = 64),
  tenant_id uuid not null,
  operator_id uuid not null,
  csrf_token text not null,
  expires_at timestamptz not null,
  foreign key (tenant_id, operator_id) references factact.operators(tenant_id, id)
);
create index sessions_expiry on factact_private.sessions (expires_at);

create function factact_private.begin_login(p_hash text, p_state text, p_nonce text, p_verifier text)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  delete from factact_private.login_transactions where expires_at <= now();
  insert into factact_private.login_transactions values (p_hash, p_state, p_nonce, p_verifier, now() + interval '10 minutes');
end $$;
create function factact_private.consume_login(p_hash text)
returns table (state text, nonce text, verifier text)
language sql security definer set search_path = pg_catalog as $$
  delete from factact_private.login_transactions
  where token_hash = p_hash and expires_at > now()
  returning state, nonce, verifier
$$;
create function factact_private.resolve_identity(p_issuer text, p_subject text)
returns table (tenant_id uuid, operator_id uuid)
language sql stable security definer set search_path = pg_catalog as $$
  select tenant_id, operator_id from factact_private.operator_identities
  where issuer = p_issuer and subject = p_subject
$$;
create function factact_private.create_session(p_hash text, p_tenant uuid, p_operator uuid, p_csrf text)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  delete from factact_private.sessions where expires_at <= now();
  insert into factact_private.sessions values (p_hash, p_tenant, p_operator, p_csrf, now() + interval '8 hours');
end $$;
create function factact_private.read_session(p_hash text)
returns table (tenant_id uuid, operator_id uuid, csrf_token text)
language sql stable security definer set search_path = pg_catalog as $$
  select tenant_id, operator_id, csrf_token from factact_private.sessions
  where token_hash = p_hash and expires_at > now()
$$;
create function factact_private.revoke_session(p_hash text)
returns void language sql security definer set search_path = pg_catalog as $$
  delete from factact_private.sessions where token_hash = p_hash
$$;
revoke all on all tables in schema factact_private from public, factact_runtime;
revoke all on all functions in schema factact_private from public;
grant execute on function factact_private.begin_login(text,text,text,text),
  factact_private.consume_login(text), factact_private.resolve_identity(text,text),
  factact_private.create_session(text,uuid,uuid,text), factact_private.read_session(text),
  factact_private.revoke_session(text) to factact_runtime;
