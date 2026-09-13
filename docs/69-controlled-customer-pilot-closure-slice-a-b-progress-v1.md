# Controlled Customer Pilot Closure — Slice A/B Progress v1

Status: **DEVELOPMENT IMPLEMENTATION IN PROGRESS — NOT GO**  
Date: 2026-09-13

Implementation repo branch:
- `yoshihisahagisaka/atlib-sales-tools`
- `feat/controlled-pilot-policy-closure`

Source Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`

## 1. Implemented in Slice A

- versioned pre-submit diagnosis policy acknowledgement technical hook.
- WEB application API requires the current policy notice version + acknowledgement.
- acknowledgement provenance is stored separately from diagnosis answers.
- WEB survey start refuses to proceed without acknowledgement provenance.
- customer UI displays the Business Policy boundary and requires acknowledgement before application.
- final Legal/Privacy wording remains explicitly outside Development authority.
- Transcript/Recording consent is separate from standard diagnosis acknowledgement.
- DB-level guard rejects Transcript SourceRecord insert unless an ACTIVE separate Transcript consent exists.
- staff-only API records/revokes explicit Transcript consent with version/scope/timestamp/audit.

## 2. Implemented in Slice B foundation

- additive migration 013.
- deletion request operational workflow tables and staff commands.
- Human scope + approve/reject flow.
- retention class vocabulary:
  - GENERAL_RAW_DIAGNOSIS
  - TRANSCRIPT_RECORDING
  - RAW_AI_IO
  - APPROVED_DECISION_EVIDENCE
- retention hold structure.
- deletion tombstone structure for future restore reconciliation.
- retention dry-run read model.
- destructive deletion/anonymization execution remains disabled by design until staging verification/review.

This is intentional and follows the handoff requirement to gate destructive mode until migration/test/review evidence exists.

## 3. Tests added

`test/controlledPilotPolicyClosure.golden.test.ts`

Covers:
- missing pre-submit acknowledgement rejection.
- acknowledgement provenance storage.
- DB-level Transcript consent guard.
- separate consent recording.
- deletion request REQUESTED → SCOPED → APPROVED.
- retention dry-run indicates destructive execution disabled.

Existing reusable diagnosis harness loads migration 013. Existing direct WEB test fixture now records policy acknowledgement before survey start.

## 4. Current known open work

- build/test execution evidence has not yet been recorded in this document.
- destructive retention/deletion/anonymization worker execution is not enabled.
- exact table-by-table anonymization semantics still require implementation/test before destructive mode.
- Transcript `purpose_completed_at` operational command/UI is not yet implemented.
- restore reconciliation replay implementation is Slice C.
- provider-side retention evidence and AI-01〜04 data-minimization closure is Slice D.
- final Legal/Privacy-approved customer wording/link is still external review input.
- External Evidence Gate remains open.

## 5. Current Gate

Controlled Customer Pilot: **NO-GO — CLOSURE IN PROGRESS**

Business Decision BD-01〜05: RESOLVED.  
Slice A technical plumbing: IMPLEMENTED / VALIDATION PENDING.  
Slice B foundation: IMPLEMENTED / DESTRUCTIVE MODE DISABLED / VALIDATION PENDING.  
Slice C〜E: OPEN.

Business Decision completed ≠ Production Ready.
