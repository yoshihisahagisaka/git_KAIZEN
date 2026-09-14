# Controlled Customer Pilot — External Evidence Execution Pack Progress v1

Status: **DEVELOPMENT IMPLEMENTATION / EXTERNAL EXECUTION READY — NOT PILOT GO**  
Date: 2026-09-14

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- current implementation head at this record: `939b619805ce9b59e1b79c355fdb75ec3372b254`
- Draft PR: #2

Source Canonical:
- `docs/32-free-it-management-diagnosis-production-readiness-gate-v1.md`
- `docs/65-free-it-management-diagnosis-business-launch-gate-v1.md`
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`
- `docs/69-controlled-customer-pilot-closure-slice-a-b-progress-v1.md`
- `docs/70-controlled-customer-pilot-closure-slice-c-d-progress-v1.md`
- `docs/71-controlled-customer-pilot-retention-deletion-execution-progress-v1.md`
- `docs/72-controlled-customer-pilot-data-classification-feedback-pilot-evidence-progress-v1.md`
- `docs/73-controlled-customer-pilot-external-manifest-adapter-progress-v1.md`

## 1. Purpose

Application-side closure has progressed to the point where the remaining Critical Path is dominated by real Cloud / Provider / Operational Evidence.

This cycle adds a safe execution pack so the external checks can be performed without inventing new Business Decisions or treating configuration existence as Production/Pilot GO.

## 2. Added — read-only external preflight collector

Implementation:
- `scripts/readiness/collect-external-evidence.cjs`
- npm command: `npm run readiness:external-preflight`

The collector requires explicit project/service/instance/bucket identifiers and performs only read-only `gcloud describe/list` operations.

It emits a sanitized JSON summary containing:
- Cloud SQL database version / backup setting / PITR setting / retained-backup field where available / latest successful backup metadata.
- Cloud Run service/region/latest ready revision, service-account presence, ingress and scaling/CPU annotations where exposed.
- deletion reconciliation GCS bucket location / uniform bucket-level access / versioning setting.
- presence-only checks for expected Secret Manager secret names.
- explicit `false` markers for checks that the preflight cannot prove: restore rehearsal, real manifest export/readback, Anthropic execution, OAuth allowed/disallowed tests, monitoring alert delivery, staging E2E and Pilot GO.

The collector deliberately excludes:
- Secret values.
- environment variable values.
- OAuth tokens.
- customer raw content.
- full Cloud Run service JSON.

This is Evidence collection assistance, not an authority decision.

## 3. Added — External Evidence Execution Pack

Implementation repo document:
- `docs/controlled-pilot-external-evidence-execution-pack-v1.md`

It defines the execution sequence and STOP conditions for:
1. read-only GCP preflight.
2. real deletion-manifest GCS export/readback.
3. isolated Cloud SQL backup/PITR restore rehearsal.
4. deletion reconciliation VERIFY/APPLY/idempotency.
5. Approved Report/Handoff/Decision/Audit integrity checks.
6. real Anthropic AI-01〜04.
7. real Google OAuth allowed/disallowed account behavior.
8. Secret Manager/IAM checks.
9. Cloud Run request-outside-CPU / min instance / multi-instance / lease recovery evidence.
10. Monitoring alert delivery.
11. final Legal/Privacy customer copy and B9 named ownership.
12. actual Human Business Acceptance A〜F.
13. real WEB / SALES_VISIT staging E2E.
14. final docs/32 Production Readiness Gate rerun.

## 4. Restore rehearsal maintenance fix

Existing local rehearsal helper `scripts/readiness/rehearse-docker.cjs` contained stale assumptions from the prior readiness baseline:
- fixed Node 20 expectation.
- fixed 12-migration ledger expectation.

The current branch uses Node 22 and has additive migrations beyond that baseline.

The helper was updated to:
- require Node 22 in the runtime smoke.
- derive the expected migration count from the current `schema_migrations` ledger.
- verify migration rerun skip count against the live ledger instead of hard-coding 12.
- verify the restored DB and runtime against that same derived ledger count.

This prevents a stale local readiness helper from giving misleading validation results.

## 5. CI boundary

CI validates syntax of the external preflight collector but does not execute it against GCP because real authenticated Cloud Evidence must come from the approved environment/operator.

This distinction is intentional:
- script syntax / application mechanism -> CI evidence.
- real Cloud configuration / IAM / restore / provider behavior -> External Evidence.

A successful CI run does not close the external gates by itself.

## 6. Remaining Critical Path

### External Cloud / continuity
- real controlled-pilot GCS bucket/IAM and immutable manifest upload/readback.
- real Cloud SQL backup/PITR isolated restore.
- deletion reconciliation against restored DB.
- measured internal RPO <=24h and RTO <=24h.
- backup retention 30-day evidence.

### Provider / identity / runtime
- real Anthropic AI-01〜04 and provider retention/privacy review.
- real Google OAuth allowed/disallowed account evidence.
- Secret Manager/IAM evidence.
- Cloud Run request-outside-CPU / min instance / scale / multi-instance / deploy-shutdown lease evidence.
- proxy/rate-limit and Monitoring alert delivery evidence.

### Business operation
- final Legal/Privacy-approved customer wording/link.
- B9 named operational owners and failure/correction/duplicate handling.
- actual Human A〜F role-play.
- real WEB / SALES_VISIT staging E2E.

### Final gate
- rerun docs/32 against current code/environment/Evidence.
- return Controlled Customer Pilot `GO` / `CONDITIONAL GO` / `NO-GO`.

## 7. Current Gate

Controlled Customer Pilot remains:

**NO-GO — EXTERNAL / OPERATIONAL EVIDENCE CLOSURE REMAINS**

Reason:
- Application mechanism has materially advanced.
- External Evidence has not yet been executed in this Development session.
- Business Decision completed != Production Ready.
- Development CI PASS != Controlled Customer Pilot GO.

No main merge is authorized by this record.
