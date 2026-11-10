-- Bounded first Registry command path. These SECURITY DEFINER commands are the
-- ONLY application path for an authoritative Person.display_name correction.
-- Runtime still has no UPDATE(display_name,registry_revision) privilege.
-- Deployment/DDL-owner security review remains a separate No-Go gate.

-- The schema slice permitted raw source INSERT for isolated migration tests.
-- Now that the authorized RPC owns provenance, shut that path before rollout.
revoke insert on factact.registry_edit_requests from factact_runtime;

create function factact_private.guard_registry_change_direct_dml()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if current_user='factact_runtime' and
    (new.registry_edit_request_id is not null
     or (tg_op='UPDATE' and old.registry_edit_request_id is not null)) then
    raise exception 'Registry Change transitions require an authorized command'
      using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function factact_private.guard_registry_change_direct_dml() from public;
create trigger guard_registry_change_direct_dml
  before insert or update on factact.changes
  for each row execute function factact_private.guard_registry_change_direct_dml();

create function factact_private.registry_edit_authorized(
  p_tenant uuid,p_actor uuid,p_service uuid,p_contract uuid,p_recipient uuid,p_operation text
) returns boolean language sql stable security definer set search_path=pg_catalog as $$
  select p_tenant = factact.current_tenant_id()
    and p_operation in ('UPDATE','REVIEW','APPROVE')
    and exists (select 1 from factact.tenants t
      where t.id=p_tenant and t.status='ACTIVE')
    and exists (select 1 from factact.operators a
      where a.tenant_id=p_tenant and a.id=p_actor and a.status='ACTIVE')
    and exists (select 1 from factact.services s
      where s.tenant_id=p_tenant and s.id=p_service and s.status='ACTIVE')
    and exists (select 1 from factact.contract_profiles c
      where c.tenant_id=p_tenant and c.id=p_contract and c.service_id=p_service
        and c.status='ACTIVE' and c.effective_from<=now()
        and (c.effective_to is null or c.effective_to>now()))
    and exists (select 1 from factact.service_recipients r
      join factact.organizations o on o.id=r.recipient_organization_id
        and o.tenant_id=r.tenant_id and o.status='ACTIVE'
      where r.tenant_id=p_tenant and r.id=p_recipient and r.service_id=p_service
        and r.recipient_type='ORGANIZATION' and r.status='ACTIVE')
    and exists (select 1 from factact.scoped_actor_grants g
      where g.tenant_id=p_tenant and g.actor_operator_id=p_actor
        and g.service_id=p_service and g.contract_profile_id=p_contract
        and g.object_kind='REGISTRY' and p_operation=any(g.operations)
        and g.status='ACTIVE' and g.effective_from<=now()
        and (g.effective_until is null or g.effective_until>now())
        and (g.scope_kind='SERVICE'
          or (g.scope_kind='SERVICE_RECIPIENT' and g.service_recipient_id=p_recipient)))
$$;
revoke all on function factact_private.registry_edit_authorized(uuid,uuid,uuid,uuid,uuid,text) from public;

create function factact.registry_propose_display_name(
  p_tenant uuid,p_actor uuid,p_person uuid,p_service uuid,p_request uuid,
  p_request_key uuid,p_proposed text,p_reason text,p_expected_revision bigint
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_context record;v_prior record;v_change uuid;
begin
  if p_tenant is distinct from factact.current_tenant_id()
    or p_actor is null or p_person is null or p_request is null or p_request_key is null
    or length(btrim(coalesce(p_proposed,''))) not between 1 and 200
    or length(btrim(coalesce(p_reason,''))) not between 1 and 1000
    or p_expected_revision is null or p_expected_revision<0 then
    raise exception 'invalid Registry edit request' using errcode='22023';
  end if;
  -- The same actor-key lock is taken by Grant revocation and deactivation.
  perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  select r.*,c.id as change_id into v_prior
    from factact.registry_edit_requests r
    join factact.changes c on c.tenant_id=r.tenant_id
      and c.registry_edit_request_id=r.id
    where r.tenant_id=p_tenant and r.actor_operator_id=p_actor
      and r.request_key=p_request_key;

  select c.id as contract_id,r.id as recipient_id,p.display_name,p.registry_revision
    into strict v_context
    from factact.people p
    join factact.organizations o on o.id=p.organization_id and o.tenant_id=p.tenant_id
      and o.status='ACTIVE'
    join factact.services s on s.tenant_id=p.tenant_id and s.id=p_service
      and s.organization_id=p.organization_id and s.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id and c.service_id=s.id
      and c.status='ACTIVE' and c.effective_from<=now()
      and (c.effective_to is null or c.effective_to>now())
    join factact.service_recipients r on r.tenant_id=p.tenant_id
      and r.service_id=s.id and r.recipient_organization_id=p.organization_id
      and r.recipient_type='ORGANIZATION' and r.status='ACTIVE'
    where p.tenant_id=p_tenant and p.id=p_person
    for share of p,o,s,c,r;

  if not factact_private.registry_edit_authorized(p_tenant,p_actor,p_service,
    v_context.contract_id,v_context.recipient_id,'UPDATE') then
    raise exception 'Registry update authority required' using errcode='42501';
  end if;
  -- A retry must not create another Change, amend the original, or silently
  -- accept a different payload. A committed retry is still idempotent.
  if v_prior.id is not null then
    if v_prior.id=p_request and v_prior.target_person_id=p_person
      and v_prior.service_id=p_service and v_prior.contract_profile_id=v_context.contract_id
      and v_prior.service_recipient_id=v_context.recipient_id
      and v_prior.proposed_display_name=p_proposed and v_prior.reason=p_reason
      and v_prior.expected_registry_revision=p_expected_revision then
      return v_prior.change_id;
    end if;
    raise exception 'Registry request key conflict' using errcode='23505';
  end if;
  if v_context.display_name=p_proposed or v_context.registry_revision<>p_expected_revision then
    raise exception 'stale or unchanged Registry target' using errcode='40001';
  end if;
  insert into factact.registry_edit_requests
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
     service_recipient_id,target_person_id,source_work_id,request_key,
     original_display_name,proposed_display_name,expected_registry_revision,reason)
  values(p_request,p_tenant,p_actor,p_service,v_context.contract_id,
     v_context.recipient_id,p_person,null,p_request_key,
     v_context.display_name,p_proposed,p_expected_revision,p_reason);
  v_change:=gen_random_uuid();
  insert into factact.changes
    (id,tenant_id,work_id,action_id,registry_edit_request_id,proposed_by_operator_id,
     change_type,change_kind,status,subject_type,subject_id,proposed_effect_json,created_at)
  values(v_change,p_tenant,null,null,p_request,p_actor,'KNOWLEDGE_STATE_CHANGE',
     'PERSON_DISPLAY_NAME_CORRECTION','PROPOSED','PERSON',p_person,
     jsonb_build_object('beforeDisplayName',v_context.display_name,
       'afterDisplayName',p_proposed,'expectedRevision',p_expected_revision),now());
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values(gen_random_uuid(),p_tenant,'REGISTRY_CHANGE',v_change,'CHANGE_PROPOSED',p_actor,
    jsonb_build_object('requestId',p_request,'personId',p_person,
      'sourceInformationState','UNVERIFIED_STATEMENT'));
  return v_change;
exception when no_data_found or too_many_rows then
  raise exception 'Registry target context unavailable or ambiguous' using errcode='42501';
end $$;

create function factact.registry_verify_display_name(
  p_tenant uuid,p_actor uuid,p_change uuid,p_summary text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_row record;v_at timestamptz:=now();v_evidence uuid;
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or p_change is null or length(btrim(coalesce(p_summary,''))) not between 1 and 1000 then
    raise exception 'invalid Registry review' using errcode='22023';
  end if;
  select r.actor_operator_id,r.service_id,r.contract_profile_id,r.service_recipient_id
    into v_row from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
     and r.id=c.registry_edit_request_id
    where c.tenant_id=p_tenant and c.id=p_change;
  if not found or v_row.actor_operator_id=p_actor then
    raise exception 'distinct Registry reviewer required' using errcode='42501';
  end if;
  -- Sorted authority lock order prevents review/revocation deadlocks.
  if v_row.actor_operator_id::text < p_actor::text then
    perform factact.lock_scoped_actor_authority(p_tenant,v_row.actor_operator_id);
    perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
  else
    perform factact.lock_scoped_actor_authority(p_tenant,p_actor);
    perform factact.lock_scoped_actor_authority(p_tenant,v_row.actor_operator_id);
  end if;
  select c.status,c.proposed_effect_json,r.*,p.display_name,p.registry_revision,
     p.organization_id into v_row
    from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
     and r.id=c.registry_edit_request_id
    join factact.people p on p.tenant_id=r.tenant_id and p.id=r.target_person_id
    where c.tenant_id=p_tenant and c.id=p_change and c.subject_id=r.target_person_id
      and c.change_type='KNOWLEDGE_STATE_CHANGE'
      and c.change_kind='PERSON_DISPLAY_NAME_CORRECTION'
    for update of c,p;
  if not found or v_row.status<>'PROPOSED'
    or v_row.actor_operator_id=p_actor
    or v_row.display_name<>v_row.original_display_name
    or v_row.registry_revision<>v_row.expected_registry_revision
    or v_row.proposed_effect_json<>jsonb_build_object(
        'beforeDisplayName',v_row.original_display_name,
        'afterDisplayName',v_row.proposed_display_name,
        'expectedRevision',v_row.expected_registry_revision)
    or not exists(select 1 from factact.service_recipients r
        where r.tenant_id=p_tenant and r.id=v_row.service_recipient_id
          and r.recipient_organization_id=v_row.organization_id
          and r.recipient_type='ORGANIZATION' and r.status='ACTIVE')
    or not factact_private.registry_edit_authorized(p_tenant,p_actor,
        v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'REVIEW')
    or not factact_private.registry_edit_authorized(p_tenant,v_row.actor_operator_id,
        v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'UPDATE') then
    raise exception 'Registry review context changed or unauthorized' using errcode='42501';
  end if;
  v_evidence:=gen_random_uuid();
  insert into factact.evidence
    (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
  values(v_evidence,p_tenant,'VERIFICATION','Registry表示名訂正の確認',p_summary,p_actor,v_at);
  insert into factact.change_evidence(tenant_id,change_id,evidence_id)
  values(p_tenant,p_change,v_evidence);
  update factact.changes set status='VERIFIED',verification_summary=p_summary,
    verified_by_operator_id=p_actor,verified_at=v_at where id=p_change and tenant_id=p_tenant;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values(gen_random_uuid(),p_tenant,'REGISTRY_CHANGE',p_change,'CHANGE_VERIFIED',p_actor,
    jsonb_build_object('requestId',v_row.id,'evidenceId',v_evidence));
  return p_change;
end $$;

create function factact.registry_commit_display_name(
  p_tenant uuid,p_actor uuid,p_change uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_row record;v_actor uuid;v_actors uuid[];v_at timestamptz:=now();
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null or p_change is null then
    raise exception 'invalid Registry commit' using errcode='22023';
  end if;
  select r.actor_operator_id,c.verified_by_operator_id into v_row
    from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
      and r.id=c.registry_edit_request_id
    where c.tenant_id=p_tenant and c.id=p_change;
  if not found or v_row.actor_operator_id=p_actor or v_row.verified_by_operator_id is null then
    raise exception 'verified distinct Registry Actor required' using errcode='42501';
  end if;
  -- Locks for proposer, verifier and committer, sorted by Actor UUID.
  select array_agg(distinct a order by a) into v_actors
    from unnest(array[v_row.actor_operator_id,v_row.verified_by_operator_id,p_actor]) a;
  foreach v_actor in array v_actors loop
    perform factact.lock_scoped_actor_authority(p_tenant,v_actor);
  end loop;
  select c.status,c.proposed_effect_json,c.verified_by_operator_id,c.verified_at,
    c.committed_by_operator_id,r.*,p.display_name,p.registry_revision,
    p.organization_id into v_row
    from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
      and r.id=c.registry_edit_request_id
    join factact.people p on p.tenant_id=r.tenant_id and p.id=r.target_person_id
    where c.tenant_id=p_tenant and c.id=p_change and c.subject_id=r.target_person_id
      and c.change_type='KNOWLEDGE_STATE_CHANGE'
      and c.change_kind='PERSON_DISPLAY_NAME_CORRECTION'
    for update of c,p;
  if not found or v_row.actor_operator_id=p_actor or v_row.verified_by_operator_id=p_actor
    or not factact_private.registry_edit_authorized(p_tenant,p_actor,
       v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'APPROVE') then
    raise exception 'Registry commit authority required' using errcode='42501';
  end if;
  if v_row.status='COMMITTED' then
    if v_row.committed_by_operator_id=p_actor
      and v_row.display_name=v_row.proposed_display_name
      and v_row.registry_revision=v_row.expected_registry_revision+1 then
      return p_change;
    end if;
    raise exception 'Registry commit retry conflict' using errcode='40001';
  end if;
  if v_row.status<>'VERIFIED' or v_row.verified_at is null
    or v_row.display_name<>v_row.original_display_name
    or v_row.registry_revision<>v_row.expected_registry_revision
    or v_row.proposed_effect_json<>jsonb_build_object(
       'beforeDisplayName',v_row.original_display_name,
       'afterDisplayName',v_row.proposed_display_name,
       'expectedRevision',v_row.expected_registry_revision)
    or not exists(select 1 from factact.change_evidence ce
      join factact.evidence e on e.tenant_id=ce.tenant_id and e.id=ce.evidence_id
      where ce.tenant_id=p_tenant and ce.change_id=p_change
        and e.evidence_type='VERIFICATION'
        and e.created_by_operator_id=v_row.verified_by_operator_id)
    or not exists(select 1 from factact.service_recipients r
      where r.tenant_id=p_tenant and r.id=v_row.service_recipient_id
        and r.recipient_organization_id=v_row.organization_id
        and r.recipient_type='ORGANIZATION' and r.status='ACTIVE')
    or not factact_private.registry_edit_authorized(p_tenant,v_row.actor_operator_id,
       v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'UPDATE')
    or not factact_private.registry_edit_authorized(p_tenant,v_row.verified_by_operator_id,
       v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'REVIEW') then
    raise exception 'stale, unsupported or revoked Registry change' using errcode='40001';
  end if;
  update factact.people set display_name=v_row.proposed_display_name,
    registry_revision=registry_revision+1,updated_at=v_at
    where tenant_id=p_tenant and id=v_row.target_person_id
      and registry_revision=v_row.expected_registry_revision;
  if not found then
    raise exception 'stale Registry revision' using errcode='40001';
  end if;
  update factact.changes set status='COMMITTED',committed_at=v_at,
    committed_by_operator_id=p_actor where id=p_change and tenant_id=p_tenant;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values(gen_random_uuid(),p_tenant,'REGISTRY_CHANGE',p_change,'CHANGE_COMMITTED',p_actor,
    jsonb_build_object('requestId',v_row.id,'personId',v_row.target_person_id,
      'beforeDisplayName',v_row.original_display_name,
      'afterDisplayName',v_row.proposed_display_name,
      'beforeRevision',v_row.expected_registry_revision,
      'afterRevision',v_row.expected_registry_revision+1,
      'verifiedBy',v_row.verified_by_operator_id));
  return p_change;
end $$;

revoke all on function factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint) from public;
revoke all on function factact.registry_verify_display_name(uuid,uuid,uuid,text) from public;
revoke all on function factact.registry_commit_display_name(uuid,uuid,uuid) from public;
grant execute on function factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint) to factact_runtime;
grant execute on function factact.registry_verify_display_name(uuid,uuid,uuid,text) to factact_runtime;
grant execute on function factact.registry_commit_display_name(uuid,uuid,uuid) to factact_runtime;
