-- G3 A2 atomic Registry Executor Finalization.
-- All seven Registry functions already have their final definitions. This one
-- transaction creates the bounded executor,
-- applies exact grants/policies/ACLs, transfers ownership, removes every
-- temporary authority and verifies the final catalog. Any failure rolls back
-- the complete file and prevents Supabase CLI from recording this timestamp.

begin;

do $$
begin
  if to_regrole('factact_registry_executor') is not null then
    raise exception 'Registry executor already exists'
      using errcode='55000';
  end if;
end $$;

-- PostgreSQL 17 automatically gives a non-superuser CREATEROLE creator an
-- ADMIN TRUE / SET FALSE / INHERIT FALSE relationship to the role it creates.
-- Temporarily enable SET only for this ownership transfer. ADMIN is retained
-- after finalization so the dedicated Migration principal can perform future
-- maintenance; it does not confer normal Executor execution privileges.
create role factact_registry_executor nologin nosuperuser nocreatedb
  nocreaterole noinherit noreplication nobypassrls;
do $maintenance_enable$
begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_registry_executor to %I with admin true, set true, inherit false',current_user);
  else
    execute format('grant factact_registry_executor to %I with set true, inherit false',current_user);
  end if;
end $maintenance_enable$;

grant usage on schema factact,factact_private to factact_registry_executor;
grant execute on function factact.current_tenant_id() to factact_registry_executor;
grant execute on function factact.lock_scoped_actor_authority(uuid,uuid)
  to factact_registry_executor;
grant execute on function factact_private.registry_person_context_lock(uuid,uuid,uuid,uuid,uuid)
  to factact_registry_executor;

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

grant select(tenant_id,service_id,actor_operator_id,operator_level,recorded_at,id)
  on factact_private.operator_policy_assignment_events to factact_registry_executor;
grant select(tenant_id,service_id,operation,policy_version_id,recorded_at,id)
  on factact_private.operator_policy_publication_events to factact_registry_executor;
grant select(tenant_id,service_id,id,category_code,cells)
  on factact_private.operator_policy_versions to factact_registry_executor;
grant select(tenant_id,service_id,id,operation,policy_version_id,
  publication_event_id,recorded_at)
  on factact_private.operator_policy_activation_events to factact_registry_executor;

grant insert on factact.registry_edit_requests,factact.changes,
  factact.evidence,factact.change_evidence,factact.audit_events
  to factact_registry_executor;
grant update(display_name,registry_revision,updated_at)
  on factact.people to factact_registry_executor;
grant update(status,verification_summary,verified_by_operator_id,verified_at,
  committed_at,committed_by_operator_id,rejected_by_operator_id,rejected_at,
  rejection_reason)
  on factact.changes to factact_registry_executor;
grant usage on sequence factact.audit_events_sequence_seq to factact_registry_executor;

-- SELECT FOR SHARE needs one UPDATE-capable column on these locked rows. No
-- business field is writable through these bookkeeping-column grants.
grant update(updated_at) on factact.tenants,factact.organizations,factact.services
  to factact_registry_executor;
grant update(created_at) on factact.contract_profiles,factact.service_recipients
  to factact_registry_executor;

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

-- Reassert the exact callable boundary before ownership moves. PUBLIC gets no
-- Registry function; Runtime gets only the four authenticated application RPCs.
revoke all on function
  factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text),
  factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint),
  factact.registry_verify_display_name(uuid,uuid,uuid,text),
  factact.registry_commit_display_name(uuid,uuid,uuid),
  factact.registry_return_display_name(uuid,uuid,uuid,text),
  factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid),
  factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)
  from public;
revoke all on function
  factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text),
  factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid),
  factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)
  from factact_runtime;
grant execute on function
  factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint),
  factact.registry_verify_display_name(uuid,uuid,uuid,text),
  factact.registry_commit_display_name(uuid,uuid,uuid),
  factact.registry_return_display_name(uuid,uuid,uuid,text)
  to factact_runtime;

-- PostgreSQL requires SET capability to the new owner plus temporary CREATE
-- on the target schemas. Both are removed before this transaction commits.
grant create on schema factact,factact_private to factact_registry_executor;
alter function factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)
  owner to factact_registry_executor;
alter function factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)
  owner to factact_registry_executor;
alter function factact.registry_verify_display_name(uuid,uuid,uuid,text)
  owner to factact_registry_executor;
alter function factact.registry_commit_display_name(uuid,uuid,uuid)
  owner to factact_registry_executor;
alter function factact.registry_return_display_name(uuid,uuid,uuid,text)
  owner to factact_registry_executor;
alter function factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid)
  owner to factact_registry_executor;
alter function factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)
  owner to factact_registry_executor;
revoke create on schema factact,factact_private from factact_registry_executor;

-- Remove only the Migration principal's temporary self-grant. PostgreSQL's
-- bootstrap-superuser ADMIN-only grant remains as the maintenance relation.
do $maintenance_restore$
begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_registry_executor to %I with admin true, set false, inherit false',current_user);
  else
    execute format('revoke factact_registry_executor from %I granted by %I',current_user,current_user);
  end if;
end $maintenance_restore$;

-- Fail closed inside the same transaction unless every security invariant is
-- already true. The Migration principal is deliberately not accepted as an
-- Executor member even with SET/INHERIT disabled.
do $registry_executor_verify$
declare
  v_executor oid := to_regrole('factact_registry_executor');
  v_function_count integer;
  v_policy_count integer;
  v_table_count integer;
begin
  if v_executor is null then
    raise exception 'Registry executor missing after finalization' using errcode='55000';
  end if;
  if not exists(select 1 from pg_roles where oid=v_executor and not rolcanlogin
    and not rolsuper and not rolbypassrls and not rolcreaterole
    and not rolcreatedb and not rolreplication and not rolinherit) then
    raise exception 'Registry executor attributes are unsafe' using errcode='55000';
  end if;
  if (select count(*) from pg_auth_members where roleid=v_executor)<>1
    or exists(select 1 from pg_auth_members m
      where m.roleid=v_executor and (m.member<>current_user::regrole
        or not m.admin_option or m.set_option or m.inherit_option
        or not exists(select 1 from pg_roles g
          where g.oid=m.grantor and g.rolsuper)))
    or current_user='factact_runtime'
    or exists(select 1 from pg_auth_members where member=v_executor) then
    raise exception 'Registry executor ADMIN-only relationship is not exact: %',
      (select json_agg(json_build_object('member',member::regrole::text,
        'grantor',grantor::regrole::text,'admin',admin_option,'set',set_option,
        'inherit',inherit_option)) from pg_auth_members where roleid=v_executor)
      using errcode='55000';
  end if;
  if has_schema_privilege('factact_registry_executor','factact','CREATE')
    or has_schema_privilege('factact_registry_executor','factact_private','CREATE') then
    raise exception 'Registry executor schema CREATE remains' using errcode='55000';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('factact','factact_private') and c.relowner=v_executor) then
    raise exception 'Registry executor owns a relation' using errcode='55000';
  end if;

  select count(*) into v_function_count from pg_proc p where p.proowner=v_executor
    and p.oid=any(array[
      'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure,
      'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)'::regprocedure,
      'factact.registry_verify_display_name(uuid,uuid,uuid,text)'::regprocedure,
      'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure,
      'factact.registry_return_display_name(uuid,uuid,uuid,text)'::regprocedure,
      'factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid)'::regprocedure,
      'factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)'::regprocedure
    ]);
  if v_function_count<>7 or exists(select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where p.proowner=v_executor and n.nspname in ('factact','factact_private')
      and not (p.oid=any(array[
        'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)'::regprocedure,
        'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)'::regprocedure,
        'factact.registry_verify_display_name(uuid,uuid,uuid,text)'::regprocedure,
        'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure,
        'factact.registry_return_display_name(uuid,uuid,uuid,text)'::regprocedure,
        'factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid)'::regprocedure,
        'factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)'::regprocedure
      ]))) then
    raise exception 'Registry executor function ownership is not exact' using errcode='55000';
  end if;

  select count(*) into v_policy_count from pg_policies
    where schemaname='factact' and policyname='registry_executor_tenant'
      and 'factact_registry_executor'=any(roles);
  if v_policy_count<>13 then
    raise exception 'Registry executor RLS policy count is not 13' using errcode='55000';
  end if;
  select count(*) into v_table_count from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='factact' and c.relkind='r';
  if v_table_count<>31 or exists(select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='factact' and c.relkind='r'
      and (not c.relrowsecurity or not c.relforcerowsecurity)) then
    raise exception 'FACTACT ENABLE/FORCE RLS invariant failed' using errcode='55000';
  end if;
  if has_column_privilege('factact_runtime','factact.people','display_name','UPDATE')
    or has_function_privilege('factact_runtime',
      'factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text)','EXECUTE')
    or has_function_privilege('factact_runtime',
      'factact_private.registry_display_name_policy_eligibility(uuid,uuid,uuid,uuid,uuid)','EXECUTE')
    or has_function_privilege('factact_runtime',
      'factact_private.registry_policy_activation_decision(uuid,uuid,uuid,uuid,uuid)','EXECUTE') then
    raise exception 'Runtime Registry boundary is unsafe' using errcode='55000';
  end if;
end $registry_executor_verify$;

commit;
