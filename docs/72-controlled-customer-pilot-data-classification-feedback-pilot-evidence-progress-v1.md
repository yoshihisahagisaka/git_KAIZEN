# Controlled Customer Pilot — Data Classification / Feedback / Pilot Evidence Progress v1

Status: **DEVELOPMENT IMPLEMENTATION / FULL CI VALIDATED — NOT PILOT GO**  
Date: 2026-09-14

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- validated code head: `46f8d218c4106e573dbc8921cb5f938541f26189`
- Draft PR: #2
- full CI: `34793748001` — **SUCCESS**

Source Canonical:
- `docs/65-free-it-management-diagnosis-business-launch-gate-v1.md`
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`
- `docs/69-controlled-customer-pilot-closure-slice-a-b-progress-v1.md`
- `docs/70-controlled-customer-pilot-closure-slice-c-d-progress-v1.md`
- `docs/71-controlled-customer-pilot-retention-deletion-execution-progress-v1.md`

## 1. Executive result

This closure cycle materially advances three Business Launch Gate gaps without architecture redesign:

1. Retention / deletion data classification is widened only where current semantics are clear and remains fail-closed where cross-Case or accountability semantics are ambiguous.
2. Management Feedback is translated to the Business five-block language without creating FACT authority in the free diagnosis.
3. Pilot Evidence Capture is implemented as coded operational evidence using existing Audit storage, without creating a new Core Object or collecting unnecessary raw customer content.

Controlled Customer Pilot remains **NO-GO** because External Evidence and actual Human/operational acceptance remain open.

## 2. Retention / deletion classification — current exact implementation

### GENERAL_RAW_DIAGNOSIS

Human-approved execution can anonymize:
- `survey_responses.raw_value_json`.
- non-Transcript `source_records` content and identifying raw references.
- `participants` contact identity.
- `organizations.name` only where that Organization belongs to exactly one Diagnosis Case.

If an Organization is referenced by multiple Cases, the worker fails closed with an explicit review requirement. It does not anonymize another Case as a side effect.

This preserves FACT FIRST: a cross-Case ownership assumption is not invented merely to make deletion succeed.

### TRANSCRIPT_RECORDING

Transcript remains a separate retention class and is not folded into General Raw.

The retention boundary continues to use `purpose_completed_at + 90 days`, subject to Human-approved execution / Hold rules.

### RAW_AI_IO

Application-controlled Raw AI lifecycle now includes both provider execution raw data and parsed structured AI output:
- `ai_executions.input_snapshot_json` → `{}`.
- `ai_executions.raw_output_json` → NULL.
- `ai_proposals.title` → `[REDACTED]`.
- `ai_proposals.content_json` → `{}`.

The system retains IDs, process/provider/model/status, proposal type/status/order and source/Human provenance needed for accountability.

Reason: converting provider output into `ai_proposals` must not silently turn generated AI wording into a long-term record.

### APPROVED_DECISION_EVIDENCE

Current worker does **not** destructively change this class.

The implementation now exposes an explicit inventory including:
- Approved/Delivered Report.
- READY/TRANSFERRED/ACCEPTED Handoff.
- HUMAN_APPROVED Insight.
- Human Review.
- Assessment Confirmation Item.
- lifecycle Transition.
- Audit.
- Policy Acknowledgement.
- Transcript Consent record.
- Deletion Request record.

This makes the 5-year accountability boundary visible without inventing an automatic expiry-destruction policy for immutable/accountability records.

Current technical state:
- inventory: **IMPLEMENTED**.
- 5-year destructive expiry: **DISABLED / FAIL-CLOSED** pending separately reviewed exact semantics.

## 3. Restore reconciliation coverage

ANONYMIZE replay now supports:
- SourceRecord raw fields.
- SurveyResponse raw value.
- Participant identity.
- Organization identity.
- AIExecution Raw I/O.
- AIProposal generated wording/payload.

`RESTRICT_RETAIN` remains Human Decision provenance and is not a destructive replay target.

Physical row `DELETE` remains fail-closed.

Application mechanism PASS does not close continuity: the manifest still needs durable storage outside the database/backup lineage and a real Cloud SQL restore/reconciliation rehearsal.

## 4. Management Feedback five-block translation

Internal section keys remain stable for compatibility; the presentation/translation layer is aligned to the Business Launch Gate:

1. **FUTURE** — 実現したい会社の未来
2. **現在分かっていること / 現時点で分からないこと**
3. **GAP** — Futureとの差（Gapの可能性）
4. **WHY** — なぜこのGapが起きている可能性があるか
5. **NEXT DECISION** — 次に確認・判断すべきこと

Semantic routing:
- `ROOT_CAUSE_HYPOTHESIS` → WHY.
- `KAIZEN_DIRECTION` → NEXT DECISION as a candidate.
- `EVIDENCE_CANDIDATE` → NEXT DECISION.
- `GAP_CANDIDATE` remains GAP.

The Translation Layer does not promote Observation/customer statement/Human Approved Insight into authoritative FACT and does not allow AI to create Decision authority.

## 5. Pilot Evidence Capture

A minimal staff-only Pilot Evidence read/write path is implemented using existing `diagnosis_audit_logs` rather than a new Core Object/table.

Captured coded signals:
- customer segment.
- entry trigger.
- Future theme code.
- completion / abandonment status.
- confusing question codes.
- UNKNOWN pattern codes.
- operator correction categories.
- AI misclassification categories.
- Management Feedback reaction.
- whether Assessment need was understood.
- next action code.
- customer feedback signal.

Data-minimization boundary:
- no raw customer quote.
- no contact identity.
- no Transcript content.
- no arbitrary free-form operator note.

This satisfies the application mechanism needed for doc65 B10 while keeping Human pilot learning lightweight.

## 6. Business Acceptance A–F mapping

Implementation repo document `docs/business-launch-acceptance-a-f-v1.md` maps doc65 acceptance cases to current controls:

A. many known facts.  
B. many unanswered / UNKNOWN.  
C. existing vendor.  
D. simple direct project.  
E. complex management issue.  
F. wrong AI interpretation.

Existing automated controls cover semantic integrity, Human correction, no forced atLIB Actor, no forced Assessment funnel and report grounding.

However, doc65 requires actual internal role-play. Automated test mapping is **not** acceptance completion.

Human A–F role-play remains OPEN.

## 7. Full CI evidence

GitHub Actions run `34793748001` at implementation code head `46f8d218c4106e573dbc8921cb5f938541f26189`: **SUCCESS**.

Passed:
- `npm ci`.
- TypeScript build.
- diagnosis.
- preparation.
- workspace.
- Human review.
- report, including current five-block translation.
- Assessment handoff.
- readiness security.
- policy closure.
- restore / AI closure.
- retention-deletion, including Organization fail-close and structured AI output wiping.
- Pilot Evidence capture.
- real PostgreSQL 17 readiness tests.
- Chromium desktop/mobile browser tests.

Real external AI/provider/cloud checks are not replaced by CI.

## 8. Updated Fit / Gap

### Application-level materially closed
- B2 semantic separation / correction path.
- B3 five-block Translation Layer.
- B4 Human Review / approval.
- B6 deterministic Assessment handoff.
- B7 no automatic atLIB Actor selection.
- B10 minimal Pilot Evidence Capture mechanism.
- BD-01 / BD-02 current exact raw deletion/anonymization execution for clear classes.
- BD-03 minimum-context / Transcript default-deny application boundary.

### Still OPEN / external or operational
- B5 actual Management Feedback usability role-play.
- B8 final Legal/Privacy-approved customer wording/link and real deployed UX evidence.
- B9 named operational ownership / failure / correction / duplicate-test handling evidence.
- A–F actual Human role-play.
- durable external deletion-reconciliation manifest storage.
- real Cloud SQL backup/PITR/restore/reconciliation/smoke.
- measured internal RPO/RTO <=24h and backup retention 30d Evidence.
- real Anthropic AI-01〜04 + provider retention/privacy Evidence.
- real Google OAuth allowed/disallowed account Evidence.
- Secret Manager / IAM.
- Cloud Run worker / scale / lease / request-outside-CPU / deploy-shutdown behavior.
- proxy/rate-limit and Monitoring delivery Evidence.
- remaining dependency findings review.
- real WEB / SALES_VISIT staging E2E.

### Deliberately fail-closed
- Approved Decision Evidence exact destructive handling after the 5-year period.
- ambiguous derived data classification.
- shared Organization deletion/anonymization without cross-Case review.

These fail-closed boundaries are not architecture blockers for the service design itself; they must not be silently relaxed for launch convenience.

## 9. Current Gate and next Critical Path

Controlled Customer Pilot: **NO-GO — EXTERNAL / OPERATIONAL CLOSURE REMAINS**.

Next shortest Critical Path:
1. establish external durable reconciliation-manifest storage/export and integrity controls.
2. execute real Cloud SQL restore/reconciliation rehearsal and measure continuity targets.
3. close real AI/OAuth/Secret-IAM/Cloud Run/Monitoring/platform Evidence.
4. obtain final Legal/Privacy customer copy and assign B9 operational ownership.
5. execute Human A–F role-play and real staging WEB/SALES_VISIT E2E.
6. re-run `docs/32` Production Readiness A–K on current code/environment/Evidence.
7. return Controlled Customer Pilot **GO / CONDITIONAL GO / NO-GO** with Evidence.

No main merge is authorized by this record.

**Business Decision completed != Production Ready. Development CI PASS != Controlled Customer Pilot GO.**
