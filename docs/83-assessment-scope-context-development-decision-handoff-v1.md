# Assessment Scope Context — Development Decision / Implementation Handoff Input v1

Status: **DEVELOPMENT / BUSINESS DECISION RECEIVED — IMPLEMENTATION DESIGN INPUT**  
Date: 2026-09-16

## 0. Business Decision received

Business has decided:

- Design Assessment standard price: **120万円（税別）**.
- Assessment Scope is handled in three Business states:
  - `STANDARD`: standard 120万円.
  - `REVIEW`: additional confirmation is required before Human scope/estimate decision.
  - `EXPANDED`: 120万円 + individually estimated additional Scope.
- System presents **decision material** for STANDARD / REVIEW / EXPANDED; final Scope and estimate are decided by a Human.
- corporation/site/SaaS/employee/system/work counts do not automatically determine price.
- information already confirmed in Free Diagnosis / Management Feedback is reused.
- after Human Route C, only missing scope-driving information is additionally confirmed.
- no new estimate-only questionnaire.
- Survey v2 is not expanded uniformly merely for Scope estimation.
- customer/sales UI uses ordinary Japanese, not internal terms such as Progressive Scope Acquisition or FACTACT terminology.

This resolves the Business price canonical discrepancy for this Development work: **120万円（税別） is the current standard Assessment price**. Historical 80万円 must not be used in new customer-facing implementation.

## 1. Minimum Scope Context dimensions

The Application/Translation layer must be able to project at least:

1. target corporations / 対象法人
2. sites / 拠点
3. IT environment / IT環境
4. business and IT operations / 業務・運用
5. stakeholders/interview targets / 関係者
6. materials/records / 資料・記録
7. special investigation requirements / 特殊要件

These are scope-estimation dimensions, not FACTACT Core Objects.

Each dimension should retain provenance to existing Diagnosis/Feedback records and an epistemic/completeness state. The implementation must distinguish information already known from information requiring confirmation and must not infer absence from silence.

## 2. Initial review indicators

Business provides the following **initial review indicators**:

- detailed-investigation corporations: `>= 2`
- individually confirmed sites: `>= 4`
- individual interviews: `>= 7`
- systems requiring detailed confirmation: `> 20`
- business processes requiring individual analysis: `> 10`

These indicators are **not automatic price rules and not automatic EXPANDED rules**.

Their permitted role is to generate Human-facing scope attention / confirmation signals. Crossing an indicator may support `REVIEW` decision material but cannot by itself:
- set a price;
- classify the final scope as EXPANDED;
- create/accept Assessment;
- select atLIB as Actor;
- create FACT;
- override Human judgment.

Employee count and SaaS count may be displayed/reused if already known and relevant, but no numeric automatic price threshold has been decided for them.

## 3. Development interpretation of STANDARD / REVIEW / EXPANDED

The three values are Business scope/estimate states. They must not be promoted into FACTACT Core terminology.

### STANDARD
Human has decided the expected Assessment scope fits the standard 120万円 scope based on available context.

### REVIEW
There is material missing/ambiguous scope information, or review indicators / special conditions make Human confirmation necessary. `REVIEW` is not a negative evaluation and not an automatic surcharge.

### EXPANDED
Human has decided additional Scope beyond the standard Assessment is required. Price is `120万円 + additional Scope individual estimate`; the system does not derive the additional price merely from counts.

Recommended separation:
- `system_scope_signal`: advisory material, may indicate `STANDARD_CANDIDATE | REVIEW_RECOMMENDED` or equivalent non-authoritative suggestion.
- `human_scope_decision`: `STANDARD | REVIEW | EXPANDED` with actor/time/reason and, when appropriate, version/history.

Do not let an AI or deterministic threshold write the Human scope decision.

## 4. Acquisition timing

### Free Diagnosis
Keep Survey v2 unchanged for this requirement. Reuse existing SurveyResponse, SourceRecord, Participant, Future and Human Approved Insights.

### Management Feedback
Confirm naturally relevant ambiguity only. Do not turn Management Feedback into a quotation interview.

### After Route C / before estimate
Build the Scope Context from accumulated information and generate a missing-information list. Ask only unresolved scope-driving items.

Examples:
- additional corporations actually included in detailed investigation;
- sites requiring individual confirmation;
- systems requiring detailed confirmation;
- operations requiring individual analysis;
- additional interview roles/people;
- material/record categories expected;
- IPO / ISMS / overseas / major core-system or other special requirements.

Already confirmed information must be displayed/reused rather than asked again.

### Assessment
Evidence collection/analysis and decision-grade FACT formation remain Assessment work. Scope Context does not become FACT merely because it was sufficient for an estimate.

## 5. Customer / Sales translation

Internal strict state may be retained in code/database. Customer/sales UI must use ordinary Japanese.

Suggested display examples:
- Scope Context → `今回の調査範囲`
- known/reused → `確認できている内容`
- missing/needs confirmation → `見積前に確認したい内容`
- STANDARD → `標準範囲`
- REVIEW → `追加確認が必要`
- EXPANDED → `追加調査を含む範囲`
- special requirements → `個別に確認が必要な条件`

Do not require sales/customers to learn `UNKNOWN`, `FACT`, `HYPOTHESIS`, `Progressive Scope Acquisition`, FACTACT object names, or internal route codes.

## 6. Fit / Gap update from doc82

### FIT
- Business has now fixed the standard price at 120万円.
- Business has fixed the three scope states and Human-final-decision rule.
- minimum Scope Context dimensions are fixed.
- initial review indicators are fixed as advisory, not price automation.
- current Diagnosis model can reuse primary Organization, Participants, raw Sources, Human Approved Insights and AssessmentConfirmationItems.
- existing provenance model supports one-time acquisition/reuse.

### GAP remaining for implementation design
- pre-estimate Scope Context read projection does not yet exist.
- structured multi-corporation/site/system/operation scope values may need additive Application-level representation when they cannot be represented reliably by existing source/insight records.
- Human Scope Decision / version/history does not yet exist as a dedicated estimate decision record.
- missing-scope clarification workflow after Route C does not yet exist.
- current post-acceptance AssessmentHandoff remains too late for pre-estimate use and must not be overloaded.

### CONFLICT
No Business/Development architectural conflict identified.

### UNKNOWN / separate decisions
- exact additional-price calculation for EXPANDED remains Human individual estimate.
- no employee/SaaS automatic threshold is decided.
- whether quote-basis Scope Decision requires immutable snapshot/hash is an implementation/audit design question to resolve in the implementation handoff.
- Product decisions for MF-F Diagnosis → Assessment → FACTACT mapping and typed temporal semantics remain separate.
- RTO canonical reconciliation remains separate from Scope design.

## 7. Recommended next Development slice

Before MF-F, or as a clearly separated Application slice that does not depend on FACTACT mapping, Development may prepare an implementation handoff for:

**AS-A — Assessment Scope Context / Estimate Preparation**

Proposed sub-slices:
1. AS-A1 Scope Context source inventory and projection.
2. AS-A2 Route-C-only missing-information clarification.
3. AS-A3 advisory review signals using Business indicators.
4. AS-A4 Human Scope Decision STANDARD / REVIEW / EXPANDED.
5. AS-A5 ordinary-Japanese sales/operator UI and audit/history.
6. AS-A6 Golden/PostgreSQL/browser regression and Assessment lifecycle integration.

Guardrails:
- no new generic estimate questionnaire;
- no Survey v2 expansion for this reason;
- no automatic price decision;
- no automatic EXPANDED decision;
- no automatic Assessment proposal/acceptance;
- no FACT promotion;
- no FACTACT Core change;
- no customer/sales internal terminology exposure;
- preserve PR #2 Draft / no main merge until explicit Human approval.

## 8. Current decision status

Business requirements in this document are **DECISION**.

AS-A implementation structure is a **DEVELOPMENT PROPOSAL** until explicitly approved for implementation.

No code implementation has been started by this document.
