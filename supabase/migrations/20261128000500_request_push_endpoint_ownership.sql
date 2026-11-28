-- Require exactly one active owner of an endpoint globally, including across tenants.
-- Existing duplicate active endpoints or oversized endpoints stop this migration.
-- Historical revoked subscriptions are retained and never reactivated.
alter table factact.request_push_subscriptions
 add constraint request_push_endpoint_size check(octet_length(endpoint)<=2048);
create unique index request_push_active_endpoint_unique
 on factact.request_push_subscriptions(endpoint) where revoked_at is null;
-- Replace the original all-time session/endpoint uniqueness with active-only
-- uniqueness so an explicit new enrollment after revocation can get a new ID.
do $$
declare old_name text;
begin
 select conname into strict old_name
 from pg_catalog.pg_constraint
 where conrelid='factact.request_push_subscriptions'::regclass
 and contype='u'
 and pg_catalog.pg_get_constraintdef(oid)='UNIQUE (tenant_id, session_token_hash, endpoint)';
 execute format('alter table factact.request_push_subscriptions drop constraint %I',old_name);
end $$;
