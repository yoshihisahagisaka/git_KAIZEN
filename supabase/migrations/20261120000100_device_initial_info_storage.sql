-- S1: additive Device customer-scope and source/field history primitives.
-- DRAFT ONLY. Do not apply to Hosted/Production, merge or expose write/read API.
-- The existing tenant-wide asset tag uniqueness is deliberately retained.
-- Legacy organization_id NULL / existing AVAILABLE rows stay unverified and
-- must remain excluded from future customer Scoped Read and safe JOIN admission.
BEGIN;

ALTER TABLE factact.devices
  ADD COLUMN organization_id uuid,
  ADD COLUMN registry_revision bigint NOT NULL DEFAULT 0;

ALTER TABLE factact.devices
  ADD CONSTRAINT devices_registry_revision_nonnegative
    CHECK (registry_revision >= 0),
  ADD CONSTRAINT devices_organization_same_tenant_fk
    FOREIGN KEY (tenant_id, organization_id)
    REFERENCES factact.organizations(tenant_id, id),
  ADD CONSTRAINT devices_tenant_id_organization_unique
    UNIQUE (tenant_id, id, organization_id);

ALTER TABLE factact.devices
  DROP CONSTRAINT devices_device_status_check;
ALTER TABLE factact.devices
  ADD CONSTRAINT devices_device_status_check CHECK
    (device_status IN ('UNKNOWN','AVAILABLE','UNAVAILABLE','RETIRED'));

-- Transitional unique key: does not replace the original (tenant_id, asset_tag)
-- constraint. Allowing identical tags in different customers is a separate
-- reconciled migration after legacy ownership and existing JOIN review.
CREATE UNIQUE INDEX devices_scoped_asset_tag_unique
  ON factact.devices(tenant_id, organization_id, asset_tag)
  WHERE organization_id IS NOT NULL;

-- Device-specific provenance, NOT a generic Fact/EAV store or file archive.
-- This records an accepted source claim separately from a verified field.
-- No runtime grants/policy: S2 must supply authorized typed DB commands.
CREATE TABLE factact.device_field_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  device_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  device_revision bigint NOT NULL CHECK (device_revision > 0),
  field_key text NOT NULL CHECK (field_key IN
    ('assetTag','displayName','serialNumber','deviceStatusClaim','deviceStatus')),
  event_kind text NOT NULL CHECK (event_kind IN
    ('SOURCE_ACCEPTED','FIELD_CORRECTED','FIELD_VERIFIED')),
  field_value text NOT NULL CHECK
    (length(btrim(field_value)) BETWEEN 1 AND 2000),
  source_kind text NOT NULL CHECK (source_kind IN
    ('CUSTOMER_REGISTER','SUPPORT_WORK','PHYSICAL_INVENTORY','TRUSTED_SYSTEM')),
  source_evidence_id uuid NOT NULL,
  source_locator text NOT NULL CHECK
    (length(btrim(source_locator)) BETWEEN 1 AND 400),
  source_observed_at timestamptz NOT NULL,
  source_work_id uuid,
  source_change_id uuid,
  recorded_by_operator_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  verified_by_operator_id uuid,
  verified_at timestamptz,
  UNIQUE (tenant_id, id),
  CONSTRAINT device_field_event_device_scope_fk
    FOREIGN KEY (tenant_id, device_id, organization_id)
    REFERENCES factact.devices(tenant_id, id, organization_id),
  CONSTRAINT device_field_event_evidence_tenant_fk
    FOREIGN KEY (tenant_id, source_evidence_id)
    REFERENCES factact.evidence(tenant_id, id),
  CONSTRAINT device_field_event_work_tenant_fk
    FOREIGN KEY (tenant_id, source_work_id)
    REFERENCES factact.work(tenant_id, id),
  CONSTRAINT device_field_event_change_tenant_fk
    FOREIGN KEY (tenant_id, source_change_id)
    REFERENCES factact.changes(tenant_id, id),
  CONSTRAINT device_field_event_actor_tenant_fk
    FOREIGN KEY (tenant_id, recorded_by_operator_id)
    REFERENCES factact.operators(tenant_id, id),
  CONSTRAINT device_field_event_verifier_tenant_fk
    FOREIGN KEY (tenant_id, verified_by_operator_id)
    REFERENCES factact.operators(tenant_id, id),
  CONSTRAINT device_field_event_source_work_check CHECK
    ((source_kind = 'SUPPORT_WORK') = (source_work_id IS NOT NULL)),
  CONSTRAINT device_field_event_kind_check CHECK (
    (event_kind = 'SOURCE_ACCEPTED'
      AND field_key <> 'deviceStatus'
      AND verified_by_operator_id IS NULL AND verified_at IS NULL)
    OR
    (event_kind = 'FIELD_CORRECTED'
      AND field_key IN ('displayName','serialNumber')
      AND verified_by_operator_id IS NULL AND verified_at IS NULL)
    OR
    (event_kind = 'FIELD_VERIFIED'
      AND field_key <> 'deviceStatusClaim'
      AND source_kind <> 'CUSTOMER_REGISTER'
      AND verified_by_operator_id IS NOT NULL AND verified_at IS NOT NULL)
  )
);

CREATE INDEX device_field_events_device_history
  ON factact.device_field_events
    (tenant_id, device_id, device_revision, recorded_at, id);

ALTER TABLE factact.device_field_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE factact.device_field_events FORCE ROW LEVEL SECURITY;
-- Deliberately NO runtime SELECT/INSERT/UPDATE/DELETE and NO runtime policy.
REVOKE ALL ON factact.device_field_events FROM PUBLIC, factact_runtime;

CREATE FUNCTION factact_private.reject_device_field_event_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Device field evidence history is append-only'
    USING ERRCODE = '55000';
END
$$;
REVOKE ALL ON FUNCTION factact_private.reject_device_field_event_mutation()
  FROM PUBLIC, factact_runtime;
CREATE TRIGGER device_field_events_append_only
  BEFORE UPDATE OR DELETE ON factact.device_field_events
  FOR EACH ROW
  EXECUTE FUNCTION factact_private.reject_device_field_event_mutation();

COMMIT;
