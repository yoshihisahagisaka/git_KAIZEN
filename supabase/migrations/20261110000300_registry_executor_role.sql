-- Scoped Registry RPC execution identity. This role is a non-login database
-- capability, NOT a human Actor/Grant or another authorization hierarchy.
-- It MUST NOT own a table, bypass RLS, or inherit factact_runtime privileges.
-- All statements run in the migrator's transaction; fail closed if the
-- migrator cannot provision the role and transfer function ownership.

create role factact_registry_executor nologin nosuperuser nocreatedb
  nocreaterole noinherit nobypassrls;

grant usage on schema factact,factact_private to factact_registry_executor;
grant execute on function factact.current_tenant_id() to factact_registry_executor;
grant execute on function factact.lock_scoped_actor_authority(uuid,uuid)
  to factact_registry_executor;
grant execute on function factact_private.registry_person_context_lock(uuid,uuid,uuid,uuid,uuid)
  to factact_registry_executor;

-- Exact read columns needed by the stored procedure's target/Grant checks.
grant select(id,status) on factact.tenants to factact_registry_executor;
grant select(id,tenant_id,status) on factact.operators to factact_registry_executor;
grant select(id,tenant_id,status) on factact.organizations to factact_registry_executor;
grant select(id,tenant_id,organization_id,display_name,registry_revision)
  on factact.people to factact_registry_executor;
grant select(id,tenant_id,status) on factact.services to factact_registry_executor;
grant select(id,tenant_id,service_id,status,effective_from,effective_to)
  on factact.contract_profiles to factact_registry_executor;
grant select(id,tenant_id,service_id,recipient_type,recipient_organization_id,status)
  on factact.service_recipients to factact_registry_executor;
grant select(tenant_id,actor_operator_id,service_id,contract_profile_id,
  scope_kind,service_recipient_id,object_kind,operations,status,effective_from,effective_until)
  on factact.scoped_actor_grants to factact_registry_executor;
grant select on factact.registry_edit_requests,factact.changes,
  factact.evidence,factact.change_evidence to factact_registry_executor;

-- Write only the typed source/Change, verification evidence, specific Person
-- columns and append-only Audit. No source UPDATE/DELETE, no arbitrary Person
-- UPDATE, and no grant issuance/revocation rights are introduced.
grant insert on factact.registry_edit_requests,factact.changes,
  factact.evidence,factact.change_evidence,factact.audit_events
  to factact_registry_executor;
grant update(display_name,registry_revision,updated_at)
  on factact.people to factact_registry_executor;
grant update(status,verification_summary,verified_by_operator_id,verified_at,
  committed_at,committed_by_operator_id)
  on factact.changes to factact_registry_executor;
grant usage on sequence factact.audit_events_sequence_seq to factact_registry_executor;

-- PostgreSQL requires UPDATE on at least one column of every table locked by
-- SELECT FOR SHARE (even without modifying that column). The RPCs lock these
-- rows, but never issue UPDATE against these bookkeeping timestamps. Grant no
-- business-field UPDATE on Tenant/Org/Service/Contract/Recipient.
grant update(updated_at) on factact.tenants,factact.organizations,factact.services
  to factact_registry_executor;
grant update(created_at) on factact.contract_profiles,factact.service_recipients
  to factact_registry_executor;

-- FORCE RLS remains enabled. Only the dedicated executor receives these
-- additional Tenant policies, with no change to factact_runtime's policies.
do $registry_executor_rls$
declare v_table text;
begin
  foreach v_table in array array[
    'operators','organizations','people','services','contract_profiles',
    'service_recipients','scoped_actor_grants','registry_edit_requests',
    'changes','evidence','change_evidence','audit_events'
  ] loop
    execute format('create policy registry_executor_tenant on factact.%I
      for all to factact_registry_executor
      using (tenant_id=factact.current_tenant_id())
      with check (tenant_id=factact.current_tenant_id())',v_table);
  end loop;
end $registry_executor_rls$;
create policy registry_executor_tenant on factact.tenants
  for all to factact_registry_executor
  using (id=factact.current_tenant_id())
  with check (id=factact.current_tenant_id());

-- PostgreSQL requires membership in the new owner and CREATE on the target
-- schema to ALTER FUNCTION OWNER. Grant both only inside this DDL transaction,
-- then revoke them before COMMIT; neither is a persistent executor privilege.
grant factact_registry_executor to current_user;
grant create on schema factact,factact_private to factact_registry_executor;

alter function factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)
  owner to factact_registry_executor;
alter function factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)
  owner to factact_registry_executor;
alter function factact.registry_verify_display_name(uuid,uuid,uuid,text)
  owner to factact_registry_executor;
alter function factact.registry_commit_display_name(uuid,uuid,uuid)
  owner to factact_registry_executor;

revoke create on schema factact,factact_private from factact_registry_executor;
revoke factact_registry_executor from current_user;

-- The runtime can execute ONLY the three authenticated application-boundary
-- RPCs. Private helpers are executable only by their non-login owner, and
-- ordinary runtime SQL still cannot UPDATE the authoritative Person columns.
