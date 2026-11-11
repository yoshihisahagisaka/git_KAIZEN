-- Replace only the proposal command, retaining its existing restricted owner,
-- signatures, Grant checks, source/Audit invariants and client contract.
-- No Service is activated by this migration. Existing proposals are retained
-- through Verify/Commit independently of later activation or STOP events.

create or replace function factact.registry_propose_display_name(
  p_tenant uuid,p_actor uuid,p_person uuid,p_service uuid,p_request uuid,
  p_request_key uuid,p_proposed text,p_reason text,p_expected_revision bigint
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_context record;v_prior record;v_change uuid;v_policy jsonb;
begin
  if p_tenant is distinct from factact.current_tenant_id()
    or p_actor is null or p_person is null or p_request is null or p_request_key is null
    or length(btrim(coalesce(p_proposed,''))) not between 1 and 200
    or length(btrim(coalesce(p_reason,''))) not between 1 and 1000
    or p_expected_revision is null or p_expected_revision<0 then
    raise exception 'invalid Registry edit request' using errcode='22023';
  end if;
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
    join factact.tenants t on t.id=p.tenant_id and t.status='ACTIVE'
    join factact.services s on s.tenant_id=p.tenant_id and s.id=p_service
      and s.status='ACTIVE'
    join factact.contract_profiles c on c.tenant_id=s.tenant_id and c.service_id=s.id
      and c.status='ACTIVE' and c.effective_from<=now()
      and (c.effective_to is null or c.effective_to>now())
    join factact.service_recipients r on r.tenant_id=p.tenant_id
      and r.service_id=s.id and r.recipient_organization_id=p.organization_id
      and r.recipient_type='ORGANIZATION' and r.status='ACTIVE'
    where p.tenant_id=p_tenant and p.id=p_person
    for share of p,o,t,s,c,r;

  if not factact_private.registry_edit_authorized(p_tenant,p_actor,p_service,
    v_context.contract_id,v_context.recipient_id,'UPDATE') then
    raise exception 'Registry update authority required' using errcode='42501';
  end if;
  -- An existing request may be retried after activation/STOP. It never adds a
  -- new proposal and still requires the current exact Grant above.
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

  -- For never-activated Services the approved Grant-only behavior is intact.
  -- ACTIVATE adds a Policy REQUEST condition; STOP or drift fails closed.
  v_policy:=factact_private.registry_policy_activation_decision(
    p_tenant,p_actor,p_service,v_context.contract_id,v_context.recipient_id);
  if v_policy->>'mode' not in ('LEGACY_GRANT_ONLY','POLICY_REQUEST')
    or v_policy->>'mode' is null then
    raise exception 'Registry proposal policy denied' using errcode='42501';
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
      'sourceInformationState','UNVERIFIED_STATEMENT',
      'policyMode',v_policy->>'mode',
      'activationEventId',v_policy->>'activationId',
      'policyVersionId',v_policy->>'policyVersionId'));
  return v_change;
exception when no_data_found or too_many_rows then
  raise exception 'Registry target context unavailable or ambiguous' using errcode='42501';
end $$;

-- The Migration principal still owns this unpublished function at this point.
-- G3 A2 transfers the final definition to the non-login Registry executor in
-- atomic 01100 Finalization. Runtime EXECUTE and direct-update protections are
-- re-asserted there without changing this authorization logic.
