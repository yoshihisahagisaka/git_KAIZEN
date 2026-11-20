-- S2b-1: a typed Device Source-Request and common Change linkage.
-- DRAFT ONLY. No SQL RPC, runtime Device writes or customer-facing read.
-- Safe source union extends JOIN (and, if present, Person First Edit) without
-- pretending a new Device exists before its reviewed Commit.
-- No automatic legacy attribution, grant elevation or AVAILABLE promotion.

-- A reference-only Evidence subtype; no source file storage or retention policy.
ALTER TABLE factact.evidence
  DROP CONSTRAINT evidence_evidence_type_check;
ALTER TABLE factact.evidence
  ADD CONSTRAINT evidence_evidence_type_check
    CHECK (evidence_type IN ('EXECUTION_ATTESTATION','VERIFICATION','DIAGNOSTIC','SOURCE_REFERENCE'));

-- Existing Evidence had tenant-wide Runtime read/insert grants. New source
-- references can contain customer-specific provenance and must not inherit
-- unrestricted Tenant-level exposure or impersonated inserts.
CREATE POLICY source_reference_runtime_select_deny ON factact.evidence
  AS RESTRICTIVE FOR SELECT TO factact_runtime
  USING (evidence_type <> 'SOURCE_REFERENCE');
CREATE POLICY source_reference_runtime_insert_deny ON factact.evidence
  AS RESTRICTIVE FOR INSERT TO factact_runtime
  WITH CHECK (evidence_type <> 'SOURCE_REFERENCE');

CREATE TABLE factact.device_change_requests (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  actor_operator_id uuid NOT NULL,
  service_id uuid NOT NULL,
  contract_profile_id uuid NOT NULL,
  service_recipient_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  target_device_id uuid NOT NULL,
  request_key text NOT NULL CHECK
    (length(request_key) BETWEEN 8 AND 100 AND request_key ~ '^[a-zA-Z0-9_-]+$'),
  request_kind text NOT NULL CHECK (request_kind IN
    ('DEVICE_INITIAL_INFORMATION','DEVICE_INFORMATION_CORRECTION','DEVICE_FIELD_VERIFICATION')),
  expected_registry_revision bigint NOT NULL CHECK (expected_registry_revision >= 0),
  proposed_effect_json jsonb NOT NULL CHECK
    (jsonb_typeof(proposed_effect_json) = 'object'),
  source_evidence_id uuid NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN
    ('CUSTOMER_REGISTER','SUPPORT_WORK','PHYSICAL_INVENTORY','TRUSTED_SYSTEM')),
  source_locator text NOT NULL CHECK
    (length(btrim(source_locator)) BETWEEN 1 AND 400),
  source_observed_at timestamptz NOT NULL,
  source_work_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,id),
  UNIQUE (tenant_id,id,target_device_id,actor_operator_id,request_kind),
  UNIQUE (tenant_id,actor_operator_id,request_key),
  FOREIGN KEY (tenant_id,actor_operator_id) REFERENCES factact.operators(tenant_id,id),
  FOREIGN KEY (tenant_id,service_id) REFERENCES factact.services(tenant_id,id),
  FOREIGN KEY (tenant_id,contract_profile_id) REFERENCES factact.contract_profiles(tenant_id,id),
  FOREIGN KEY (tenant_id,service_recipient_id,service_id)
    REFERENCES factact.service_recipients(tenant_id,id,service_id),
  FOREIGN KEY (tenant_id,organization_id) REFERENCES factact.organizations(tenant_id,id),
  FOREIGN KEY (tenant_id,source_evidence_id) REFERENCES factact.evidence(tenant_id,id),
  FOREIGN KEY (tenant_id,source_work_id) REFERENCES factact.work(tenant_id,id),
  CHECK ((source_kind = 'SUPPORT_WORK') = (source_work_id IS NOT NULL)),
  CHECK (
    (request_kind = 'DEVICE_INITIAL_INFORMATION' AND
       expected_registry_revision = 0 AND source_kind = 'CUSTOMER_REGISTER') OR
    (request_kind = 'DEVICE_INFORMATION_CORRECTION') OR
    (request_kind = 'DEVICE_FIELD_VERIFICATION' AND source_kind <> 'CUSTOMER_REGISTER')
  )
);
CREATE INDEX device_change_requests_target
 ON factact.device_change_requests (tenant_id,organization_id,target_device_id,created_at);
ALTER TABLE factact.device_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE factact.device_change_requests FORCE ROW LEVEL SECURITY;
-- No runtime policy. No direct runtime data access or write privilege.
REVOKE ALL ON factact.device_change_requests FROM PUBLIC,factact_runtime;

CREATE FUNCTION factact_private.reject_device_change_request_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'Device change source is immutable' USING ERRCODE='55000';
END $$;
REVOKE ALL ON FUNCTION factact_private.reject_device_change_request_mutation()
  FROM PUBLIC,factact_runtime;
CREATE TRIGGER device_change_requests_append_only
  BEFORE UPDATE OR DELETE ON factact.device_change_requests
  FOR EACH ROW EXECUTE FUNCTION factact_private.reject_device_change_request_mutation();

-- Extend the existing common Change; do NOT alter old JOIN Action/Person FKs.
-- The Person-specific Registry proposal Migration (#60) may already have added
-- the same provenance/Actor columns in a fresh, ordered full-stack DB.
ALTER TABLE factact.changes
  ALTER COLUMN work_id DROP NOT NULL,
  ALTER COLUMN action_id DROP NOT NULL,
  ALTER COLUMN subject_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS proposed_by_operator_id uuid,
  ADD COLUMN IF NOT EXISTS committed_by_operator_id uuid,
  ADD COLUMN device_change_request_id uuid,
  ADD COLUMN device_subject_id uuid;

ALTER TABLE factact.changes
  DROP CONSTRAINT changes_change_type_check,
  DROP CONSTRAINT changes_change_kind_check,
  DROP CONSTRAINT changes_subject_type_check;

ALTER TABLE factact.changes
  ADD CONSTRAINT changes_change_type_check
    CHECK (change_type IN ('REALITY_CHANGE','KNOWLEDGE_STATE_CHANGE')),
  ADD CONSTRAINT changes_change_kind_check
    CHECK (change_kind IN ('PRIMARY_DEVICE_ASSIGNMENT',
      'PERSON_DISPLAY_NAME_CORRECTION',
      'DEVICE_INITIAL_INFORMATION','DEVICE_INFORMATION_CORRECTION',
      'DEVICE_FIELD_VERIFICATION')),
  ADD CONSTRAINT changes_subject_type_check
    CHECK (subject_type IN ('PERSON','DEVICE')),
  ADD CONSTRAINT device_change_request_source_fk
    FOREIGN KEY (tenant_id,device_change_request_id,device_subject_id,
      proposed_by_operator_id,change_kind)
    REFERENCES factact.device_change_requests
      (tenant_id,id,target_device_id,actor_operator_id,request_kind),
  ADD CONSTRAINT device_change_request_unique UNIQUE(tenant_id,device_change_request_id),
  ADD CONSTRAINT device_change_two_actor_check CHECK (
    device_change_request_id IS NULL OR (
      proposed_by_operator_id IS NOT NULL AND
      (verified_by_operator_id IS NULL OR verified_by_operator_id <> proposed_by_operator_id) AND
      (committed_by_operator_id IS NULL OR committed_by_operator_id <> proposed_by_operator_id) AND
      (status <> 'COMMITTED' OR
        (verified_by_operator_id IS NOT NULL AND committed_by_operator_id IS NOT NULL))
    )
  );

-- An initial proposed Device does not exist yet. Hence device_subject_id is
-- tied to the immutable request, not an FK to devices before Commit.
DO $device_change_exactly_one_source$
DECLARE person_branch text := '';
        join_registry_absent text := '';
        device_registry_absent text := '';
BEGIN
 IF EXISTS (SELECT 1 FROM pg_constraint
   WHERE conrelid='factact.changes'::regclass
     AND conname='changes_exactly_one_source_check') THEN
   ALTER TABLE factact.changes DROP CONSTRAINT changes_exactly_one_source_check;
 END IF;

 -- Preserve the exact Person First Edit branch only if its Source exists.
 IF to_regclass('factact.registry_edit_requests') IS NOT NULL THEN
   join_registry_absent := 'AND registry_edit_request_id IS NULL';
   device_registry_absent := 'AND registry_edit_request_id IS NULL';
   person_branch := '
     OR (work_id IS NULL AND action_id IS NULL
       AND registry_edit_request_id IS NOT NULL
       AND device_change_request_id IS NULL AND device_subject_id IS NULL
       ' || join_registry_absent || '
       AND subject_type = ''PERSON'' AND subject_id IS NOT NULL
       AND proposed_by_operator_id IS NOT NULL
       AND change_type = ''KNOWLEDGE_STATE_CHANGE''
       AND change_kind = ''PERSON_DISPLAY_NAME_CORRECTION'')';
 END IF;

 EXECUTE '
   ALTER TABLE factact.changes
   ADD CONSTRAINT changes_exactly_one_source_check CHECK (
     (work_id IS NOT NULL AND action_id IS NOT NULL
       AND device_change_request_id IS NULL AND device_subject_id IS NULL
       AND subject_type = ''PERSON'' AND subject_id IS NOT NULL
       AND change_type = ''REALITY_CHANGE''
       AND change_kind = ''PRIMARY_DEVICE_ASSIGNMENT'')
     ' || person_branch || '
     OR (work_id IS NULL AND action_id IS NULL
       AND device_change_request_id IS NOT NULL
       AND device_subject_id IS NOT NULL
       ' || device_registry_absent || '
       AND subject_type = ''DEVICE'' AND subject_id IS NULL
       AND proposed_by_operator_id IS NOT NULL
       AND change_type = ''KNOWLEDGE_STATE_CHANGE''
       AND change_kind IN
        (''DEVICE_INITIAL_INFORMATION'',''DEVICE_INFORMATION_CORRECTION'',''DEVICE_FIELD_VERIFICATION''))
   )';
END $device_change_exactly_one_source$;

-- Existing runtime still legitimately uses JOIN Change rows. Never allow it
-- to insert or edit a Device Change via the pre-existing generic grants.
CREATE POLICY device_changes_runtime_select_deny ON factact.changes
  AS RESTRICTIVE FOR SELECT TO factact_runtime
  USING (device_change_request_id IS NULL AND device_subject_id IS NULL);
CREATE POLICY device_changes_runtime_insert_deny ON factact.changes
  AS RESTRICTIVE FOR INSERT TO factact_runtime
  WITH CHECK (device_change_request_id IS NULL AND device_subject_id IS NULL);
CREATE POLICY device_changes_runtime_update_deny ON factact.changes
  AS RESTRICTIVE FOR UPDATE TO factact_runtime
  USING (device_change_request_id IS NULL AND device_subject_id IS NULL)
  WITH CHECK (device_change_request_id IS NULL AND device_subject_id IS NULL);

-- Source request and Change persistence are **inert** until an independently
-- security-reviewed restricted executor and transactional DB adapter exist.
-- No Runtime EXECUTE grant or privileged Device SQL function is introduced.
