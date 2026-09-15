# Management Feedback MF-E — Pilot Instrumentation Handoff v1

Status: **DEVELOPMENT / IMPLEMENTATION HANDOFF — DO NOT MERGE WITHOUT APPROVAL**  
Date: 2026-09-15

## 0. Baseline

Implementation baseline: `atlib-sales-tools` feature branch `feat/controlled-pilot-policy-closure`, validated HEAD `f03aa649e96d3bc9785e2747a770937296a4a726`.

Remote CI: Controlled Pilot Closure run #95 / `34843579645` = SUCCESS.

MF-A / MF-B / MF-C / MF-D are treated as implemented Application slices. PR #2 remains Draft and `main` remains unmerged. Production / Controlled Customer Pilot remains **NO-GO** because External Evidence and operational gates remain open.

Business Contract input remains `docs/71-management-feedback-business-output-specification-v1.md`.

## 1. Purpose

MF-E measures whether the Management Feedback journey actually works in a controlled pilot without creating a new measurement workload for operators.

Principle:

> KAIZENするために、KAIZENのための仕事を増やさない。

Therefore existing authoritative application records and audit/event timestamps are the primary evidence source. Manual Pilot Evidence entry is limited to signals that cannot be safely derived from existing records.

MF-E is instrumentation. It does **not** create FACT, change Business routes, grant AI authority, select atLIB as Actor, start Assessment, or modify FACTACT Core.

## 2. Evidence model

### 2.1 Derived first

Prefer deterministic derivation from existing records for:

- AI suggestion generated / failed
- Human correction / rejection / approval of AI proposal
- Human Review completion
- Report approval / delivery
- Feedback start / completion
- Human NEXT DECISION route A/B/C/D
- re-decision / supersession count
- Customer Restatement existence as a same-Case source reference
- Assessment proposal after Route C
- manual fallback / re-entry when already represented by audit commands
- elapsed time between lifecycle events where timestamps already exist

Do not duplicate raw SurveyResponse, Transcript, Customer Restatement text, Report body, or raw AI input/output into Pilot Evidence.

### 2.2 Manual coded evidence only when not derivable

Existing `PilotEvidenceRepo` may continue to capture coded operational observations such as:

- confusing question code
- UNKNOWN pattern code
- operator correction category
- AI misclassification category
- Management Feedback reaction
- customer feedback signal

Free-form customer quotes, contact data and transcript text remain excluded.

## 3. Minimum MF-E metrics

The pilot query/projection should be able to produce, per Case where data exists:

1. `ai_suggestion_count`
2. `ai_failure_count`
3. `human_ai_correction_count`
4. `human_ai_rejection_count`
5. `human_approval_count`
6. `customer_correction_or_restatement_observed`
7. `selected_route`
8. `redecision_count`
9. `assessment_proposed_after_route_c`
10. `manual_fallback_count`
11. `feedback_preparation_duration`
12. `human_review_duration`
13. `feedback_conversation_duration` only if start/end semantics are already authoritative; otherwise UNKNOWN / not derivable
14. existing coded Pilot Evidence signals

A missing event is not automatically interpreted as zero when the system cannot prove the event was observable. Use `NOT_DERIVABLE` / `NOT_OBSERVED` semantics where appropriate instead of fabricating precision.

## 4. Implementation direction

Reuse existing Diagnosis Application tables and audit logs. Prefer a read-side projection/service over a new write-side event model.

Expected slice:

### MF-E1 — Evidence inventory
Map each metric to its authoritative source table/command and classify `DERIVED | MANUAL_CODED | NOT_DERIVABLE`.

### MF-E2 — Derived projection
Add a staff-only read model/API for per-Case Pilot instrumentation. It must not mutate diagnosis state.

### MF-E3 — Manual evidence reconciliation
Keep the existing coded `RecordControlledPilotEvidence` mechanism for non-derivable observations. Do not ask operators to re-enter values already available from lifecycle/audit records.

### MF-E4 — Golden / PostgreSQL regression
Synthetic tests must prove:
- no raw customer/transcript/AI payload copied into instrumentation;
- route and re-decision are derived from Human Decision history;
- Assessment proposal is counted only as a separate Human command after latest Route C;
- duration calculations use authoritative event timestamps only;
- absent/unobservable data stays UNKNOWN / NOT_DERIVABLE rather than guessed;
- AI cannot write Human Decision or authoritative Pilot outcome through this slice.

## 5. Boundaries

No Business Decision is required to implement the above read-side instrumentation.

Do not implement or decide:
- typed temporal semantics for vendor promise / evidence confirmation / review / follow-up;
- Diagnosis → Assessment → FACTACT Core mapping;
- FACTACT Core Object changes;
- Assessment price;
- retention / deletion / AI consent / SLA customer promise changes.

Those remain Business/Product Lane inputs where applicable.

## 6. Business / Product referrals

### Business Decision Required
1. RTO canonical reconciliation: current Business policy previously recorded pilot internal RPO/RTO as 24h, while current Controlled Pilot verification target requests RTO <=8h. Development must not convert the 8h target into a customer promise until Business Canonical is reconciled.
2. Assessment price canonical reconciliation before any price is connected to customer-facing implementation: newer 120万円（税別） vs historical 80万円（税別）.

### Product Decision Required
1. typed temporal semantics.
2. Diagnosis → Assessment → FACTACT mapping, required before MF-F is finalized.

## 7. Completion gate

MF-E is complete only when:
- source inventory is documented;
- derived projection is deterministic;
- manual duplicate entry is removed/avoided where derivation exists;
- synthetic regression and real PostgreSQL regression pass;
- existing MF-A/B/C/D and Controlled Pilot Closure regression remain green;
- PR #2 remains Draft / main unmerged unless separately authorized.

MF-E completion does **not** mean Pilot GO. External Cloud/AI/OAuth/Legal/operational Evidence remains a separate gate.
