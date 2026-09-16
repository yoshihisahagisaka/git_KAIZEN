# Assessment Proposal Lifecycle Mapping v1

Status: **DEVELOPMENT / BUSINESS DECISION RECEIVED — IMPLEMENTATION MAPPING**  
Date: 2026-09-16

Business Decision received as BD-AS-02:

> Scope・価格確定前の「Assessment提案開始」と、Human Scope Decision後の「正式Assessment提案／見積」をBusiness上は区別する。正式提案には最新のHuman Scope Decision（COMPACT / STANDARD / EXPANDED）を必須とする。Scope未確定の段階でもAssessmentを提案候補として顧客へ提示することは許容する。既存FACTACT上でのObject / State / ActionへのマッピングはFit確認のうえDevelopment Laneで決定する。

Business Canonical context:
- docs/83-assessment-scope-commercial-adjustment-rules-v1.md
- docs/84-assessment-scope-recommendation-human-decision-business-requirements-v1.md

Development context:
- docs/85-assessment-scope-estimate-preparation-implementation-handoff-v1.md
- docs/86-assessment-scope-recommendation-human-decision-fit-gap-v1.md
- docs/87-assessment-scope-as-a1-implementation-fit-gap-v1.md

---

## 1. Decision mapping result

**FIT — no new FACTACT Core Object/State/Action required.**

The two Business moments are different Application-layer meanings and should not be collapsed into one Assessment lifecycle transition.

### A. Assessment提案候補 / 提案開始
Meaning:
- Management Feedback Human NEXT DECISION = Route C / DESIGN_ASSESSMENT.
- Assessment is a valid next path to discuss with the customer.
- Scope and price may still be REVIEW / not yet determined.
- No commercial commitment is created.

Mapping:
- reuse latest immutable Management Feedback Decision `DESIGN_ASSESSMENT` as the eligibility/intent record;
- Scope Context / clarification / recommendation follows;
- do **not** create a second FACTACT Core state for “proposal candidate”.

Customer/sales UI wording may be `Assessment提案候補` / `Assessmentの検討を開始` as normal Japanese. Internal Route C remains Application terminology, not FACTACT Core.

### B. 正式Assessment提案／見積
Meaning:
- Human has finalized Scope and price.
- latest Human Scope Decision must be one of `COMPACT | STANDARD | EXPANDED`.
- `REVIEW` is not eligible.
- required exceptional-price approval must be satisfied.
- this is the point at which a formal commercial proposal/estimate may be recorded.

Mapping:
- keep the existing Assessment lifecycle `propose` action as the **formal Assessment proposal** transition;
- strengthen its Application-layer preconditions after AS-A5 exists;
- no new FACTACT Core Action required.

Required preconditions for future AS-A6 implementation:
1. diagnosis status = FEEDBACK_COMPLETED;
2. latest Management Feedback Decision = DESIGN_ASSESSMENT;
3. latest Human Scope Decision exists;
4. Scope Decision classification in COMPACT | STANDARD | EXPANDED;
5. price is valid for the selected classification;
6. if exceptional-price approval is required, a valid approval exists;
7. current Assessment status = NOT_PROPOSED.

`REVIEW` must fail closed for formal proposal.

---

## 2. Why no new Core state

The Business distinction is real, but it does not require a new universal lifecycle object:
- “proposal candidate” is already represented by Human NEXT DECISION Route C plus subsequent Scope preparation context;
- “formal proposal” already has the Assessment Application lifecycle `propose` transition;
- Scope Recommendation and Scope/Price Decision are commercial/Application records, not FACTACT Facts or Core Decisions by default;
- the actual management/authority decision remains Human-recorded with provenance/history.

Adding a generic Core `PROPOSAL_STARTED` state would make a sales-specific distinction universal without evidence that FACTACT Core needs it.

---

## 3. AS-A6 is unblocked semantically

BD-AS-02 is resolved.

AS-A6 no longer needs a Business timing decision. It can be implemented after AS-A5 by strengthening the existing formal `propose` command guard rather than adding a new proposal-start lifecycle state.

The earlier HOLD in docs/87 is superseded by this mapping.

---

## 4. Remaining authority GAP

Separate from BD-AS-02, production enforcement of exceptional-price approval still needs an authoritative approver population/permission source.

Development will not infer manager authority from email or job title.

Until configured, exceptional-price finalization must fail closed; normal-price and sales-discretion bands can proceed under the explicit Business rules.

---

## 5. Implementation sequence now

AS-A2 Scope Context projection
→ AS-A3 missing-only clarification
→ AS-A4 System Recommendation
→ AS-A5 Human Scope/Price Decision + approval state/history
→ AS-A6 strengthen existing formal Assessment `propose` guard
→ AS-A7 actual-vs-estimated load instrumentation
→ AS-A8 full validation/regression.

No FACTACT Core change is authorized or required by BD-AS-02.
