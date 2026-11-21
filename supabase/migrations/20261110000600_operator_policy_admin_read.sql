-- Explicitly approved administrator-only projection for the management UI.
-- The runtime role has NO direct access to private policy tables or a broad
-- Actor directory. Every read is checked against the live verified Google
-- subject, membership, Tenant, session and approved human identity.
create function factact_private.operator_policy_admin_overview(
  p_session_hash text,p_service uuid default null,p_actor_query text default ''
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_tenant uuid;v_admin uuid;v_services jsonb;v_actors jsonb:='[]'::jsonb;
  v_versions jsonb:='[]'::jsonb;v_assignments jsonb:='[]'::jsonb;
  v_publications jsonb:='[]'::jsonb;v_current jsonb:=null;
  v_service_name text;v_has_more_actors boolean:=false;v_search text;
begin
  select tenant_id into v_tenant from factact_private.sessions
    where token_hash=p_session_hash;
  if v_tenant is null then
    raise exception 'verified policy administrator required' using errcode='42501';
  end if;
  v_admin:=factact_private.require_scoped_grant_approver(p_session_hash,v_tenant);
  v_search:=btrim(coalesce(p_actor_query,''));
  if length(v_search)>80 then
    raise exception 'invalid operator search' using errcode='22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name)
    order by s.name,s.id),'[]'::jsonb) into v_services
  from factact.services s
  where s.tenant_id=v_tenant and s.status='ACTIVE';
  if p_service is null then
    return jsonb_build_object('services',v_services,'service',null,
      'actors',v_actors,'hasMoreActors',false,'versions',v_versions,
      'assignments',v_assignments,'publications',v_publications,'current',null);
  end if;
  select s.name into v_service_name from factact.services s
    where s.tenant_id=v_tenant and s.id=p_service and s.status='ACTIVE';
  if not found then
    raise exception 'policy service unavailable' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.display_name,
    'level',(select e.operator_level
      from factact_private.operator_policy_assignment_events e
      where e.tenant_id=v_tenant and e.service_id=p_service
        and e.actor_operator_id=a.id
      order by e.recorded_at desc,e.id desc limit 1))
    order by a.display_name,a.id),'[]'::jsonb) into v_actors
  from (select id,display_name from factact.operators
    where tenant_id=v_tenant and status='ACTIVE'
      and position(lower(v_search) in lower(display_name))>0
    order by display_name,id limit 50) a;
  select exists(select 1 from factact.operators o
    where o.tenant_id=v_tenant and o.status='ACTIVE'
      and position(lower(v_search) in lower(o.display_name))>0
    offset 50 limit 1) into v_has_more_actors;

  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,
    'cells',v.cells,'reason',v.reason,'at',v.created_at,
    'by',approved.display_name) order by v.version desc),'[]'::jsonb)
    into v_versions
  from (select * from factact_private.operator_policy_versions
    where tenant_id=v_tenant and service_id=p_service
    order by version desc limit 50) v
  join factact.operators approved on approved.tenant_id=v.tenant_id
    and approved.id=v.approved_by_operator_id;

  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'actorId',e.actor_operator_id,
    'actorName',target.display_name,'level',e.operator_level,
    'reason',e.reason,'at',e.recorded_at,'by',approved.display_name)
    order by e.recorded_at desc,e.id desc),'[]'::jsonb)
    into v_assignments
  from (select * from factact_private.operator_policy_assignment_events
    where tenant_id=v_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 30) e
  join factact.operators target on target.tenant_id=e.tenant_id
    and target.id=e.actor_operator_id
  join factact.operators approved on approved.tenant_id=e.tenant_id
    and approved.id=e.approved_by_operator_id;

  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,
    'operation',e.operation,'versionId',e.policy_version_id,
    'version',v.version,'reason',e.reason,'at',e.recorded_at,
    'by',approved.display_name) order by e.recorded_at desc,e.id desc),'[]'::jsonb)
    into v_publications
  from (select * from factact_private.operator_policy_publication_events
    where tenant_id=v_tenant and service_id=p_service
    order by recorded_at desc,id desc limit 30) e
  left join factact_private.operator_policy_versions v
    on v.tenant_id=e.tenant_id and v.service_id=e.service_id
      and v.id=e.policy_version_id
  join factact.operators approved on approved.tenant_id=e.tenant_id
    and approved.id=e.approved_by_operator_id;
  if jsonb_array_length(v_publications)>0 then
    v_current:=v_publications->0;
  end if;

  return jsonb_build_object('services',v_services,
    'service',jsonb_build_object('id',p_service,'name',v_service_name),
    'actors',v_actors,'hasMoreActors',v_has_more_actors,
    'versions',v_versions,'assignments',v_assignments,
    'publications',v_publications,'current',v_current);
end $$;

revoke all on function factact_private.operator_policy_admin_overview(text,uuid,text)
  from public;
grant execute on function factact_private.operator_policy_admin_overview(text,uuid,text)
  to factact_runtime;
