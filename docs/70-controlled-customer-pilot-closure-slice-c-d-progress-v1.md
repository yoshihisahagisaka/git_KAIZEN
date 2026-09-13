# Controlled Customer Pilot Closure — Slice C/D Progress v1

Status: **DEVELOPMENT IMPLEMENTATION / CI VALIDATED — NOT PILOT GO**  
Date: 2026-09-13

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- validated head: `d5183dc930be1439ab49714f1fca0f7a0b9f3bcc`
- Draft PR: #2

Source Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`
- `docs/69-controlled-customer-pilot-closure-slice-a-b-progress-v1.md`

## 1. Slice C — Restore / Deletion Consistency

Implemented foundation:
- additive migration `014_it_management_diagnosis_restore_reconciliation.sql`.
- restore reconciliation run audit table.
- deterministic deletion-reconciliation manifest export from deletion tombstones.
- stable SHA-256 manifest hash.
- VERIFY / APPLY reconciliation modes.
- idempotent ANONYMIZE replay support for:
  - SourceRecord raw content,
  - AIExecution raw input/output,
  - Participant identity,
  - SurveyResponse raw value.
- `RESTRICT_RETAIN` remains non-destructive.
- physical `DELETE` remains deliberately fail-closed until table-by-table dependency semantics are explicitly implemented and tested.

Critical architectural point:
- deletion tombstones stored only inside the same database are not sufficient for restore safety.
- the reconciliation manifest is explicitly designed to be persisted outside the database / backup lineage that may later be restored.
- after a restore, the external manifest must be replayed or verified before traffic resumes.

Golden validation simulates the resurrection case:
1. create customer-derived raw data.
2. create an ANONYMIZE tombstone.
3. export reconciliation manifest.
4. simulate an older database restore by removing the newer tombstone while raw data remains.
5. VERIFY detects the target without modifying it.
6. APPLY re-anonymizes the restored raw data from the externally held manifest.
7. a second APPLY is idempotent.

This closes the application-level reconciliation mechanism, but does **not** close the External Evidence Gate. Real Cloud SQL backup/PITR/restore rehearsal, durable external manifest storage, operational access control, measured RPO/RTO and restore runbook execution are still required.

## 2. Slice D — AI Context Minimization

AI-02 / AI-03 Transcript handling was tightened:
- Transcript is excluded from AI context by default even when Transcript capture consent exists.
- inclusion requires a separate explicit caller decision `includeConsentedTranscript=true`.
- SQL independently verifies an ACTIVE Transcript consent for the Case.
- included Transcript is bounded to the existing source limit and maximum 2,000-character excerpt.
- current production AI-02 / AI-03 paths do not set the opt-in, therefore Transcript does not reach the provider by default.
- AI-03 inherits the same default exclusion through the shared interview context builder.

Existing boundaries remain:
- contact identity, access tokens, staff identity and session secrets are not part of AI context.
- AI output remains Proposal only until Human Review.
- no FACT authority is granted by AI or by Human approval of a free-diagnosis Insight.
- AI-04 remains Human-Approved context only.

External Provider Evidence remains open:
- real Anthropic AI-01〜04 execution evidence,
- provider-side retention / privacy confirmation,
- production secret/IAM injection,
- failure/timeout behavior in deployed runtime.

## 3. CI Evidence

GitHub Actions:
- workflow: `Controlled Pilot Closure`
- run id: `34758451176`
- head: `d5183dc930be1439ab49714f1fca0f7a0b9f3bcc`
- result: **SUCCESS**

Successful steps:
- `npm ci`
- `npm run build`
- `npm run test:diagnosis`
- `npm run test:preparation`
- `npm run test:workspace`
- `npm run test:review`
- `npm run test:report`
- `npm run test:handoff`
- `npm run test:readiness`
- `npm run test:policy-closure`
- `npm run test:restore-ai-closure`

New focused tests validate:
- AI-02 / AI-03 default Transcript exclusion.
- explicit consent + explicit necessity opt-in before bounded Transcript context inclusion.
- AI context secret/contact exclusion.
- restore reconciliation re-applies anonymization after simulated old-backup resurrection.
- reconciliation replay idempotency.
- unsupported physical DELETE fails closed without deleting the target.

## 4. Findings / Remaining Work

Resolved at application/CI level in this slice:
- restore resurrection can be reconciled from an externally persisted manifest.
- restore reconciliation executions are auditable.
- AI-02/03 Transcript handling is now default-deny rather than consent-implies-send.
- existing diagnosis regression suite remains green.

Still open before Controlled Customer Pilot reevaluation:
- durable external location / job for the reconciliation manifest.
- real Cloud SQL backup + PITR + isolated restore + reconciliation + application smoke rehearsal.
- measured internal RPO <= 24h target and end-to-end RTO <= 24h target; these are not external SLA promises.
- backup retention target verification.
- final table-by-table destructive deletion semantics / worker, or an approved Pilot restriction that keeps physical deletion disabled.
- Transcript `purpose_completed_at` operational command/UI and retention execution linkage.
- real Anthropic AI-01〜04 plus provider retention/privacy evidence.
- real Google Workspace OAuth, Secret Manager/IAM, Cloud Run worker/lease/scale behavior, Monitoring alert delivery, staging WEB + SALES_VISIT E2E.
- final Legal/Privacy-approved customer-facing wording/link.
- review of the currently reported 7 moderate npm dependency vulnerabilities.
- Production Readiness Gate (`docs/32`) rerun using current code and current external Evidence.

## 5. Current Gate

Controlled Customer Pilot: **NO-GO — EXTERNAL / OPERATIONAL CLOSURE REMAINS**

- Business Decision BD-01〜05: **RESOLVED**.
- Slice A: **IMPLEMENTED / CI PASS**.
- Slice B foundation: **IMPLEMENTED / CI PASS / destructive execution restricted**.
- Slice C application reconciliation foundation: **IMPLEMENTED / CI PASS / EXTERNAL RESTORE EVIDENCE OPEN**.
- Slice D application context minimization: **IMPLEMENTED / CI PASS / REAL PROVIDER EVIDENCE OPEN**.
- External Evidence Closure: **OPEN**.

No new FACT Core Object, no automatic atLIB Actor selection, and no architecture redesign were introduced.

Development implementation PASS ≠ Controlled Customer Pilot GO.
