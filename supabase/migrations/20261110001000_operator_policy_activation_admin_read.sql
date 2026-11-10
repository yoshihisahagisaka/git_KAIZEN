-- Separate read-only status for the activation control. The existing overview
-- response shape is unchanged for older clients. Only the verified designated
-- approver can read the private activation history; runtime cannot SELECT it.
create function factact_private.operator_policy_activation_overview(
  p_session_hash text,p_service uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_tenant uuid;v_admin uuid;v_events jsonb:='[]'::jsonb;
begin
  select tenant_id into v_tenant from factact_private.sessions
    where token_hash=p_session_hash;
  if v_tenant is null or p_service is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  if not exists(select 1 from factact.services
    where tenant_id=v_tenant and id=p_service and status='ACTIVE') then
    raise exception 'policy service unavailable' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'operation',e.operation,
    'versionId',e.policy_version_id,'publicationId',e.publication_event_id,
    'version',v.version,'reason',e.reason,
    'at',e.recorded_at,'by',approved.display_name)
    order by e.recorded_at desc,e.id desc),'[]'::jsonb)
    into v_events
  from (select * from factact_private.operator_policy_activation_events
    where tenant_id=v_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 30) e
  left join factact_private.operator_policy_versions v
    on v.tenant_id=e.tenant_id and v.service_id=e.service_id
      and v.id=e.policy_version_id
  join factact.operators approved on approved.tenant_id=e.tenant_id
    and approved.id=e.approved_by_operator_id;
  return jsonb_build_object('current',case when jsonb_array_length(v_events)>0
    then v_events->0 else null end,'events',v_events);
end $$;
revoke all on function factact_private.operator_policy_activation_overview(
  text,uuid) from public;
grant execute on function factact_private.operator_policy_activation_overview(
  text,uuid) to factact_runtime;
