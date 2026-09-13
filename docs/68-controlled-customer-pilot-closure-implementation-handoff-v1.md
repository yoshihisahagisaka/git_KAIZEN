# 無料IT経営診断 — Controlled Customer Pilot Closure Implementation Handoff v1

Status: **DEVELOPMENT IMPLEMENTATION HANDOFF — READY FOR IMPLEMENTATION**  
Date: 2026-09-13

Source Canonical:
- `docs/65-free-it-management-diagnosis-business-launch-gate-v1.md`
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- target branch: `feat/controlled-pilot-policy-closure`

Baseline observed on branch:
- `src/routes/itManagementDiagnosis.ts` creates WEB cases with strict application input and currently has no customer notice acknowledgement field.
- `public/it-management-diagnosis.html` currently has contact/application form but no Business Policy notice/acknowledgement UI.
- `public/js/it-management-diagnosis-survey.js` posts only company/contact/email/phone on create.
- existing AI context builders already use explicit whitelist patterns; `preDiagnosisContext.ts` excludes contact identity/tokens, `interviewAssistantContext.ts` bounds raw SourceRecord excerpts, and `reportContext.ts` uses Human Approved Context only.

## 1. Goal

Close the shortest implementation path required before Controlled Customer Pilot re-evaluation without changing Business meaning or FACTACT Core Architecture.

Implement additive controls for:
1. versioned customer notice acknowledgement;
2. separate Transcript/Recording consent guard;
3. retention classification and deterministic expiry;
4. Human-approved deletion/anonymization workflow;
5. deletion/restore reconciliation foundation;
6. AI context minimization evidence;
7. Business Launch Gate 5-block translation and Pilot Evidence Capture where still open;
8. tests and evidence sufficient for docs/32 re-run.

## 2. Non-negotiable boundaries

- Do not add a FACT Core Object.
- Do not promote customer statements, operator notes or AI output to authoritative FACT in free diagnosis.
- AI remains Suggestion/Proposal.
- Human Review/Correction/Approval remains mandatory.
- atLIB is not automatically selected as execution Actor.
- Transcript/Recording is not standard free-diagnosis input.
- General diagnosis acknowledgement cannot substitute for Transcript consent.
- Internal RPO/RTO 24h are not external SLA promises.
- Final Legal wording is not invented by Development.
- No direct merge to `main`.

## 3. Closure Slice A — Customer Notice / Consent

### A1. Data model
Use additive migration with the next available migration number after current branch migrations.

Add a notice acknowledgement record or equivalent normalized structure containing only:
- id
- diagnosis_case_id/application linkage
- notice_type = `STANDARD_DIAGNOSIS`
- notice_version
- channel (`WEB` / `SALES_VISIT` where applicable)
- acknowledged_at
- actor/reference minimum necessary
- created_at

Do not store a duplicate of the legal text as customer data. Store the immutable notice/version identifier; approved copy should be versioned configuration/content.

### A2. WEB application guard
Public WEB case creation must fail unless the required current notice version was explicitly acknowledged.

Expected request contract can add an acknowledgement envelope, but existing application fields remain unchanged semantically.

Staff SALES_VISIT behavior must not silently inherit WEB consent semantics. If staff enters customer data on behalf of a customer, record the channel and apply the approved operating rule; do not invent consent on customer's behalf.

### A3. Customer UI hook
Before submit, UI must have a Business Policy notice area capable of showing approved copy for:
- service purpose;
- Assessment boundary;
- information-use purpose;
- AI-supported analysis;
- Human Review;
- follow-up;
- Privacy/Data Handling link;
- Transcript/Recording not standard.

Until Legal/Privacy-approved wording is supplied, use a configuration placeholder that prevents production/pilot enablement rather than inventing legal language.

### A4. Transcript/Recording consent guard
Create a separate consent record/interface for `TRANSCRIPT_RECORDING`.

Required before any Transcript/Recording SourceRecord is created/imported/processed:
- consent version
- scope/purpose
- consented_at
- actor/customer reference minimum necessary
- case id

No consent => reject operation.

If the current product has no standard Transcript capture endpoint, implement the guard at the domain/service boundary that future Transcript creation must call, and add a regression test proving Transcript creation without consent is rejected.

## 4. Closure Slice B — Retention / Deletion Lifecycle

### B1. Retention classes
Implement deterministic mapping without universal EAV/FACT table:
- `GENERAL_RAW_DIAGNOSIS`: Case Close + 1 year
- `TRANSCRIPT_RECORDING`: purpose complete + max 90 days
- `RAW_AI_IO`: Case Close + max 90 days
- `APPROVED_DECISION_EVIDENCE`: 5 years

Document exact table/entity mapping before destructive mode is enabled.

### B2. Retention worker
Implement:
- dry-run mode as default;
- idempotent retry-safe selection;
- deterministic expiry projection;
- hold/exception support with reason, approver, start and end condition;
- non-sensitive audit of deletion/anonymization batch;
- destructive mode explicitly gated.

Never use one blanket cascade delete for a diagnosis case.

### B3. Customer deletion request workflow
Operational workflow (not FACTACT Core Object):
`REQUESTED → SCOPED → APPROVED / REJECTED → EXECUTION_PENDING → COMPLETED / PARTIALLY_RETAINED / FAILED`

Human approval required before destructive execution.

Minimum fields:
- request id
- customer/case scope
- requested_at
- scoped retention classes
- decision/reason
- approved_by
- restricted-retention exception
- executed_at/completion status
- audit refs

### B4. Anonymization
Do not claim anonymized if identity can easily be restored via a stable reversible key.

Preserve surviving Approved records' required provenance using non-identifying references where possible.

## 5. Closure Slice C — Restore / Deletion Consistency

Create durable deletion/tombstone/reconciliation data sufficient to prevent a later database restore from permanently resurrecting data already approved for deletion.

Restore runbook must require, before traffic restoration:
1. restore isolated database;
2. apply migrations;
3. replay/verify deletion reconciliation set;
4. validate Approved Report/Handoff/Audit integrity;
5. run application smoke checks;
6. only then return traffic.

External evidence must measure:
- actual recoverable point: RPO <= 24h target;
- actual end-to-end restoration: RTO <= 24h target;
- backup retention target 30 days.

No configuration-only PASS.

## 6. Closure Slice D — AI Context Minimization

Revalidate process-by-process:

### AI-01
Existing `preDiagnosisContext.ts` is explicit-whitelist and excludes contact identity/tokens. Preserve this pattern. Verify only required Survey/Future context reaches provider.

### AI-02
Existing `interviewAssistantContext.ts` includes bounded SourceRecord excerpts. Verify:
- only necessary Source types/context;
- full Transcript is excluded unless separately consented and necessary;
- maximum excerpt/count limits are enforced;
- no contact/staff/secrets.

### AI-03
Existing `postDiagnosisContext.ts` reuses bounded interview context. Verify no later authoritative data leak and no unnecessary raw context.

### AI-04
Existing `reportContext.ts` already queries Human Approved Insight + Future + Assessment confirmation only. Keep this boundary.

For AI-01〜04 record process/provider/model/prompt-policy/context-ref metadata without logging raw sensitive prompt/body.

Provider-side retention/privacy settings remain External Evidence Required.

## 7. Management Feedback Translation

Keep internal semantic types unchanged.

Customer/management view should translate to:
1. FUTURE
2. 現在分かっていること / 現時点で分からないこと
3. GAP
4. WHY（仮説）
5. NEXT DECISION

Rules:
- `OBSERVATION` does not become authoritative FACT merely by label.
- `UNKNOWN` remains visible.
- `ROOT_CAUSE_HYPOTHESIS` must render as hypothesis.
- `KAIZEN_DIRECTION` remains candidate, not Decision.
- `NEXT DECISION` comes from Human Approved context/Assessment confirmation needs; AI does not auto-decide Assessment or atLIB execution.

## 8. Pilot Evidence Capture

Prefer additive metadata/read model over new Core Object.

Capture for pilot:
- customer segment/account reference
- entry trigger
- FUTURE theme
- completion/abandonment
- confusing question
- UNKNOWN pattern
- operator correction point
- AI misclassification
- management feedback reaction
- Assessment need understood
- next action
- customer feedback

Avoid unnecessary personal data.

## 9. Acceptance tests

Add/extend Golden, browser and security tests.

Mandatory cases:

### Consent
- WEB create rejected without current notice acknowledgement.
- stale/unknown notice version rejected.
- accepted notice stores version/timestamp/channel only.
- general acknowledgement cannot authorize Transcript.
- Transcript operation rejected without separate explicit consent.

### Retention
- Case Close projects General Raw expiry +1y.
- AI Raw I/O expiry +90d.
- Transcript uses purpose_completed_at +90d, not Case Close+1y.
- Approved Report/Handoff/Audit classified 5y.
- legal/contract hold prevents deletion.
- dry-run does not mutate.
- destructive mode idempotent.

### Deletion
- no Human approval => no destructive action.
- Approved deletion writes execution audit.
- restricted-retention path does not silently delete required audit.
- anonymization does not leave directly identifiable values in the tested target fields.
- restore reconciliation removes/reapplies previously deleted scope before service readiness.

### AI
- no contact email/name/token appears in AI-01 context.
- AI-02 bounded excerpts only.
- Transcript excluded by default.
- AI-04 remains Human Approved Context only.

### Business Acceptance A〜F
Reuse doc65 Case A〜F as fixtures/scenarios, including many UNKNOWN, existing vendor, direct project, complex issue and wrong AI interpretation corrected by Human.

## 10. Regression required

Before handoff completion:
- `npm ci`
- `npm run build`
- all existing diagnosis Golden tests
- all existing diagnosis browser tests
- readiness/security tests
- real PostgreSQL migration tests
- additive-upgrade test from current main schema
- migration rerun/idempotency expectations where applicable

Do not mark PASS if skipped due external credentials; mark `BLOCKED_EXTERNAL` with exact evidence missing.

## 11. External Evidence Closure after implementation

Still required before Pilot verdict:
- supported Node runtime and dependency status
- real Secret Manager/IAM/injection
- real Anthropic AI-01〜04
- provider retention/privacy evidence
- real Google Workspace OAuth including disallowed account behavior
- Cloud Run Worker CPU/scale/multi-instance/deploy-shutdown lease recovery
- trust proxy/XFF/rate-limit in deployed topology
- Cloud Monitoring alert delivery
- Cloud SQL backup/PITR/restore rehearsal
- staging WEB and SALES_VISIT E2E
- named operational owners per doc65 B9
- approved Legal/Privacy customer-facing wording

## 12. Required implementation result report

Return:
- branch
- final SHA
- changed files
- migrations added
- test counts/results
- each Slice A〜E status: PASS / FAIL / BLOCKED_EXTERNAL
- Business/Legal constraints encountered
- Technical/provider constraints encountered
- canonical deviations (must be explicit)
- latest Controlled Pilot verdict, but only after docs/32 re-run.

Until implementation + External Evidence closure is complete:

**Controlled Customer Pilot = NO-GO — CLOSURE IN PROGRESS**
