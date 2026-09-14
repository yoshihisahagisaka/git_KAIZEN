# Controlled Customer Pilot — External Deletion Manifest Adapter Progress v1

Status: **DEVELOPMENT IMPLEMENTATION / CI VALIDATED — REAL GCS EVIDENCE OPEN**  
Date: 2026-09-14

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- validated code head: `cdeb71c97a9d2137ad419a324daa950d3192904d`
- Draft PR: #2
- full CI: `34794154220` — **SUCCESS**

Source Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/70-controlled-customer-pilot-closure-slice-c-d-progress-v1.md`
- `docs/71-controlled-customer-pilot-retention-deletion-execution-progress-v1.md`
- `docs/72-controlled-customer-pilot-data-classification-feedback-pilot-evidence-progress-v1.md`

## 1. Purpose

Advance the continuity Critical Path by turning the existing in-DB tombstone manifest mechanism into an implementation that can be persisted outside the database / backup lineage.

This record does **not** claim that real GCS persistence or Cloud SQL restore has been executed.

## 2. Implemented external manifest adapter

Added application-level GCS adapter for deletion reconciliation manifests.

The adapter:
- wraps the existing deletion reconciliation manifest in a versioned external bundle.
- includes the deterministic manifest SHA-256 hash.
- verifies the manifest hash before upload and after readback.
- creates a time-scoped, content-addressed object name containing the hash but no raw customer content.
- uploads using Google Application Default Credentials / OAuth storage scope.
- uses GCS generation precondition `ifGenerationMatch=0` so an existing immutable manifest object is not silently overwritten.
- treats an already-existing object as acceptable only after readback and hash verification.
- supports explicit read / verify operations.

No customer raw content is written to logs by the export command. Standard output contains only bucket/object identifiers, hashes and tombstone count.

## 3. Operator export command

Added an explicit operator command:

`npm run retention:export-manifest`

Required runtime input:
- database configuration.
- `DIAGNOSIS_RECONCILIATION_GCS_BUCKET`.
- optional `DIAGNOSIS_RECONCILIATION_GCS_PREFIX`.
- Google Application Default Credentials / workload identity with the required object permissions.

The command:
1. reads current deletion tombstones from the live DB.
2. builds deterministic reconciliation manifest.
3. wraps it in the external integrity bundle.
4. uploads immutable GCS object.
5. reads it back and verifies manifest hash.
6. emits only non-sensitive execution identifiers/hash Evidence.

## 4. CI evidence

GitHub Actions run `34794154220` at code head `cdeb71c97a9d2137ad419a324daa950d3192904d`: **SUCCESS**.

New `test:external-manifest` passes and confirms:
- bundle self-verification.
- SHA-256 integrity.
- tamper detection.
- deterministic content-addressed/time-scoped object naming.
- object name does not expose target/raw record identifiers.

The full regression workflow also passed build, diagnosis/preparation/workspace/review/report/handoff, policy/readiness/restore, retention-deletion, pilot-evidence, PostgreSQL 17 and browser suites.

## 5. Gate interpretation

### Application implementation
External manifest export / integrity adapter: **IMPLEMENTED / CI PASS**.

### External Evidence
Real GCS bucket/IAM/upload/readback: **OPEN / BLOCKED_EXTERNAL until executed**.

Real Cloud SQL backup/PITR/isolated restore + external manifest replay + application smoke: **OPEN**.

Internal RPO <=24h, RTO <=24h and backup retention 30d: **NOT YET EVIDENCED**.

Therefore, this implementation materially advances Gate C/J but does not close them.

## 6. Next Critical Path

1. provision/identify the controlled-pilot GCS manifest bucket outside the Cloud SQL backup lineage.
2. set minimum IAM for the export/restore operator or workload identity.
3. execute real export, immutable upload and verified readback; record object/hash Evidence.
4. perform isolated Cloud SQL restore / PITR rehearsal.
5. replay/verify deletion manifest before traffic.
6. run Approved-record integrity and application smoke checks.
7. measure actual RPO/RTO and verify configured backup retention.

Controlled Customer Pilot remains **NO-GO — EXTERNAL / OPERATIONAL CLOSURE REMAINS**.

No main merge is authorized by this record.
