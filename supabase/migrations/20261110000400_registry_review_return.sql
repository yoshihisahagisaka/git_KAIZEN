-- Registry review return: one bounded REJECTED transition with a real reason,
-- immutable Evidence, Audit and a distinct human reviewer. Never mutate Person
-- or rewrite the original proposal. Applying this migration is NOT approved.

alter table factact.changes
  add column rejected_by_operator_id uuid,
  add column rejected_at timestamptz,
  add column rejection_reason text,
  add constraint registry_change_rejection_reason_check check (
    registry_edit_request_id is null or
    (status='REJECTED' and rejected_by_operator_id is not null
      and rejected_at is not null and rejection_reason is not null
      and length(btrim(rejection_reason)) between 1 and 1000)
    or
    (status<>'REJECTED' and rejected_by_operator_id is null
      and rejected_at is null and rejection_reason is null)
  ),
  add constraint registry_change_rejected_by_fk
    foreign key (tenant_id,rejected_by_operator_id)
    references factact.operators (tenant_id,id);

alter table factact.evidence
  drop constraint evidence_evidence_type_check,
  add constraint evidence_evidence_type_check
    check (evidence_type in ('EXECUTION_ATTESTATION','VERIFICATION','DIAGNOSTIC','REVIEW_RETURN'));

-- G3 A2 grants these bounded lifecycle columns only during atomic 01100
-- Finalization. Runtime still cannot UPDATE Changes or Person directly.

create function factact.registry_return_display_name(
  p_tenant uuid,p_actor uuid,p_change uuid,p_reason text
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_row record;v_actor uuid;v_actors uuid[];
  v_evidence uuid;v_at timestamptz:=now();v_reason text:=btrim(coalesce(p_reason,''));
begin
  if p_tenant is distinct from factact.current_tenant_id() or p_actor is null
    or p_change is null or length(v_reason) not between 1 and 1000 then
    raise exception 'invalid Registry return' using errcode='22023';
  end if;

  select r.actor_operator_id into v_row
    from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
      and r.id=c.registry_edit_request_id
    where c.tenant_id=p_tenant and c.id=p_change;
  if not found or v_row.actor_operator_id=p_actor then
    raise exception 'Registry change unavailable' using errcode='42501';
  end if;

  -- Lock proposal Actor and reviewer Actor in the exact sorted order used by
  -- Verify/Commit, and by Grant revoke/deactivation. No authorization hint is
  -- trusted from the UI or a previous pending-queue read.
  select array_agg(distinct a order by a) into v_actors
    from unnest(array[v_row.actor_operator_id,p_actor]) a;
  foreach v_actor in array v_actors loop
    perform factact.lock_scoped_actor_authority(p_tenant,v_actor);
  end loop;

  select c.status,c.proposed_effect_json,c.rejected_by_operator_id,
    c.rejection_reason,r.*,p.organization_id into v_row
    from factact.changes c
    join factact.registry_edit_requests r on r.tenant_id=c.tenant_id
      and r.id=c.registry_edit_request_id
    join factact.people p on p.tenant_id=r.tenant_id
      and p.id=r.target_person_id
    where c.tenant_id=p_tenant and c.id=p_change
      and c.subject_id=r.target_person_id
      and c.change_type='KNOWLEDGE_STATE_CHANGE'
      and c.change_kind='PERSON_DISPLAY_NAME_CORRECTION'
    for update of c,p;

  if not found or v_row.actor_operator_id=p_actor
    or v_row.proposed_effect_json<>jsonb_build_object(
      'beforeDisplayName',v_row.original_display_name,
      'afterDisplayName',v_row.proposed_display_name,
      'expectedRevision',v_row.expected_registry_revision)
    or not factact_private.registry_person_context_lock(p_tenant,v_row.target_person_id,
      v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id)
    or not factact_private.registry_edit_authorized(p_tenant,p_actor,
      v_row.service_id,v_row.contract_profile_id,v_row.service_recipient_id,'REVIEW') then
    raise exception 'Registry change unavailable' using errcode='42501';
  end if;

  -- An exact same-Actor/same-reason retry returns the original result with no
  -- additional Evidence/Audit. A different reviewer/reason cannot rewrite it.
  if v_row.status='REJECTED' then
    if v_row.rejected_by_operator_id=p_actor and v_row.rejection_reason=v_reason then
      return p_change;
    end if;
    raise exception 'Registry return retry conflict' using errcode='40001';
  end if;
  if v_row.status not in ('PROPOSED','VERIFIED') then
    raise exception 'Registry change not returnable' using errcode='40001';
  end if;

  v_evidence:=gen_random_uuid();
  insert into factact.evidence
    (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
  values(v_evidence,p_tenant,'REVIEW_RETURN','Registry表示名訂正の差し戻し',
    v_reason,p_actor,v_at);
  insert into factact.change_evidence(tenant_id,change_id,evidence_id)
  values(p_tenant,p_change,v_evidence);
  update factact.changes set status='REJECTED',rejected_by_operator_id=p_actor,
    rejected_at=v_at,rejection_reason=v_reason
    where tenant_id=p_tenant and id=p_change;
  insert into factact.audit_events
    (id,tenant_id,aggregate_type,aggregate_id,event_type,actor_operator_id,metadata_json)
  values(gen_random_uuid(),p_tenant,'REGISTRY_CHANGE',p_change,'CHANGE_REJECTED',p_actor,
    jsonb_build_object('requestId',v_row.id,'evidenceId',v_evidence,
      'reason',v_reason,'beforeDisplayName',v_row.original_display_name,
      'proposedDisplayName',v_row.proposed_display_name));
  return p_change;
end $$;

revoke all on function factact.registry_return_display_name(uuid,uuid,uuid,text) from public;
grant execute on function factact.registry_return_display_name(uuid,uuid,uuid,text)
  to factact_runtime;

-- G3 A2 defers restricted ownership to the atomic 01100 Finalization after
-- all seven Registry functions have their final definitions.
