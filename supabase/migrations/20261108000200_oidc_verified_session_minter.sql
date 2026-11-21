-- Only the trusted OIDC callback connection may mint an OIDC-verified session.
-- The ordinary runtime connection retains unverified compatibility sessions,
-- session reads/switches and scoped Grant management, but cannot mark a login
-- as OIDC-verified by supplying an issuer and subject directly over SQL.
-- Credential provisioning is separate from schema migration.
create role factact_oidc_session_minter login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;

grant usage on schema factact_private to factact_oidc_session_minter;

-- Keep the private schema closed to roles relying on PostgreSQL's default
-- PUBLIC EXECUTE. Existing application permissions are explicit role grants.
revoke execute on all functions in schema factact_private from public;
revoke execute on function factact_private.create_verified_session(text,uuid,uuid,text,text,text)
  from factact_runtime;
grant execute on function factact_private.create_verified_session(text,uuid,uuid,text,text,text)
  to factact_oidc_session_minter;

comment on role factact_oidc_session_minter is
  'Dedicated OIDC callback session mint connection; never use as general FACTACT runtime role';
