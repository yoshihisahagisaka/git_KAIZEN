# Controlled Customer Pilot Closure — Slice A/B Progress v1

Status: **DEVELOPMENT IMPLEMENTATION VALIDATED LOCALLY/CI — NOT PILOT GO**  
Date: 2026-09-13

Implementation repo branch:
- `yoshihisahagisaka/atlib-sales-tools`
- `feat/controlled-pilot-policy-closure`
- validated head: `c363745dfa0fbbfaee1ea103631aee82b5c30d33`
- Draft PR: #2

Source Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`

## 1. Implemented in Slice A

- versioned pre-submit diagnosis policy acknowledgement technical hook.
- WEB application API requires the current policy notice version + acknowledgement.
- Case creation and acknowledgement provenance are committed in the same DB transaction; acknowledgement failure does not leave a returned usable WEB Case without provenance.
- acknowledgement provenance is stored separately from diagnosis answers.
- WEB survey start refuses to proceed without acknowledgement provenance.
- customer UI displays the Business Policy boundary and requires acknowledgement before application.
- final Legal/Privacy wording remains explicitly outside Development authority.
- Transcript/Recording consent is separate from standard diagnosis acknowledgement.
- DB-level guard rejects Transcript SourceRecord insert unless an ACTIVE separate Transcript consent exists.
- staff-only API records/revokes explicit Transcript consent with version/scope/timestamp/provenance.

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

## 3. Runtime remediation

Production/migration/build container base was moved from Node 20 to Node 22 LTS on the feature branch.

`package.json` engine requirement is now `>=22`.

This closes the code-level Node 20 runtime selection issue, but Production Gate must still verify the actual deployed Cloud Run/runtime image after deployment.

## 4. Validation evidence

GitHub Actions workflow:
- workflow: `Controlled Pilot Closure`
- run id: `34756684683`
- head: `c363745dfa0fbbfaee1ea103631aee82b5c30d33`
- runner Node: 22
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

Focused policy closure tests cover:
- missing pre-submit acknowledgement rejection.
- acknowledgement provenance storage.
- DB-level Transcript consent guard.
- separate consent recording before Transcript capture.
- deletion request REQUESTED → SCOPED → APPROVED.
- retention dry-run indicates destructive execution disabled.

Regression adjustment:
- workspace Golden fixtures that intentionally exercise Transcript behavior now explicitly record test consent before Transcript capture.
- no production bypass was added; the DB-level no-consent guard remains effective and is separately tested.

## 5. Findings from validation

### Resolved in this closure cycle
- initial audit-count regression caused by adding acknowledgement lifecycle audit was removed; immutable acknowledgement row is the provenance record while existing lifecycle transition/audit cardinality remains compatible.
- legacy workspace tests were updated to reflect the new explicit Transcript-consent precondition.
- WEB Case creation + acknowledgement was hardened to a single transaction.
- Node 20 container selection was replaced by Node 22.

### Still open
- `npm ci` reports **7 moderate severity dependency vulnerabilities**. This remains a Production Readiness item; no silent `npm audit fix` is applied without dependency impact review.
- destructive retention/deletion/anonymization worker execution is not enabled.
- exact table-by-table anonymization semantics still require implementation/test before destructive mode.
- Transcript `purpose_completed_at` operational command/UI is not yet implemented.
- restore reconciliation replay implementation is Slice C.
- provider-side retention evidence and real AI-01〜04 validation is Slice D / External Evidence.
- final Legal/Privacy-approved customer wording/link remains external review input.
- real Google OAuth, Secret/IAM, Cloud Run worker behavior, Monitoring, Cloud SQL backup/PITR/restore and staging E2E remain External Evidence Gate items.

## 6. Current Gate

Controlled Customer Pilot: **NO-GO — CLOSURE IN PROGRESS**

Business Decision BD-01〜05: **RESOLVED**.  
Slice A technical plumbing: **IMPLEMENTED / CI PASS**.  
Slice B foundation: **IMPLEMENTED / CI PASS / DESTRUCTIVE MODE DISABLED**.  
Slice C〜E: **OPEN**.  
External Evidence Closure: **OPEN**.

No Architecture redesign or new FACT Core Object has been introduced.

Business Decision completed ≠ Production Ready.
