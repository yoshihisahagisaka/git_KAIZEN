-- Privileged Grant changes must leave an append-only Audit Event in the same
-- transaction. The trigger is a backstop for direct privileged SQL too; it
-- does NOT approve a change or attribute the SQL session to a Human.
-- Normal factact_runtime still has SELECT ONLY on scoped_actor_grants.

create function factact.audit_scoped_actor_grant_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog as $$
declare
  changed factact.scoped_actor_grants%rowtype;
  previous_status text;
  event_kind text;
  recorded_operator uuid;
begin
  if tg_op = 'DELETE' then
    changed := old;
    previous_status := old.status;
    event_kind := 'SCOPED_GRANT_DELETED';
    recorded_operator := null;
  elsif tg_op = 'INSERT' then
    changed := new;
    previous_status := null;
    event_kind := 'SCOPED_GRANT_ISSUED';
    recorded_operator := new.issued_by_operator_id;
  else
    changed := new;
    previous_status := old.status;
    if old.status = 'ACTIVE' and new.status = 'REVOKED' then
      event_kind := 'SCOPED_GRANT_REVOKED';
      recorded_operator := new.revoked_by_operator_id;
    else
      event_kind := 'SCOPED_GRANT_UPDATED';
      recorded_operator := null;
    end if;
  end if;

  insert into factact.audit_events
    (id, tenant_id, aggregate_type, aggregate_id, event_type,
     actor_operator_id, occurred_at, metadata_json)
  values
    (gen_random_uuid(), changed.tenant_id, 'SCOPED_ACTOR_GRANT', changed.id,
     event_kind, recorded_operator, clock_timestamp(),
     jsonb_build_object(
       'grantId', changed.id,
       'actorOperatorId', changed.actor_operator_id,
       'serviceId', changed.service_id,
       'contractProfileId', changed.contract_profile_id,
       'scopeKind', changed.scope_kind,
       'serviceRecipientId', changed.service_recipient_id,
       'workId', changed.work_id,
       'objectKind', changed.object_kind,
       'operations', changed.operations,
       'previousStatus', previous_status,
       'status', changed.status,
       'effectiveFrom', changed.effective_from,
       'effectiveUntil', changed.effective_until,
       'issuedByOperatorId', changed.issued_by_operator_id,
       'revokedByOperatorId', changed.revoked_by_operator_id,
       'revocationReason', changed.revocation_reason,
       'auditSource', 'DATABASE_GRANT_LIFECYCLE_TRIGGER',
       'attribution', 'GRANT_ROW_FIELDS_NOT_AUTHENTICATED_APPROVAL'
     ));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

revoke all on function factact.audit_scoped_actor_grant_change() from public;

-- AFTER trigger ensures that an audit insert failure aborts the Grant change.
-- BEFORE row trigger from 20261107000400 already holds the actor authority
-- lock, so Grant mutation and audit share that transaction/commit boundary.
create trigger scoped_actor_grant_lifecycle_audit
 after insert or update or delete on factact.scoped_actor_grants
 for each row execute function factact.audit_scoped_actor_grant_change();
