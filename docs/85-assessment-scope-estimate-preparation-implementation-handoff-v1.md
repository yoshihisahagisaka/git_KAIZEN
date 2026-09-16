# Assessment Scope / Estimate Preparation — Implementation Handoff v1

Status: **DEVELOPMENT / IMPLEMENTATION HANDOFF — DO NOT MERGE WITHOUT APPROVAL**  
Date: 2026-09-16

Business source of truth for this handoff:
- `docs/83-assessment-scope-commercial-adjustment-rules-v1.md`
- Business commit: `c7e7ca6aa0e4b11108ba406ee2e2bc23180ff6b2`

Development references:
- `docs/22-free-it-management-diagnosis-development-canonical-v1.md`
- `docs/23-free-it-management-diagnosis-implementation-spec-v1.md`
- `docs/26-free-it-management-diagnosis-survey-v2-question-set-v1.md`
- `docs/76-free-diagnosis-management-feedback-customer-journey-fit-gap-v1.md`
- `docs/77-s-company-management-feedback-pilot-minimum-gap-implementation-handoff-v1.md`
- `docs/81-management-feedback-mf-e-validation-product-decision-package-v1.md`
- `docs/84-assessment-confirmation-load-fit-gap-v1.md`

Implementation repository:
- `yoshihisahagisaka/atlib-sales-tools`
- current controlled-pilot feature line remains separate from `main`; no merge is authorized by this document.

---

## 1. Purpose

Implement the minimum additive Application/Translation-layer capability needed to prepare Design Assessment scope and estimate after Management Feedback / Human Route C, while reusing information already acquired by Free Diagnosis.

Primary principle:

> Assessment Scope / price is based on the **confirmation load required to establish the FACT needed for management decisions**, not company size or simple item counts.

The system organizes decision material. Human decides Scope and price. System records the decision and history.

This slice must not redesign FACTACT Core and must not turn Free Diagnosis into a simplified Assessment.

---

## 2. Fixed Business decisions

### 2.1 Commercial baseline
- STANDARD: `1,200,000 JPY excl. tax`.
- REVIEW: internal state requiring additional confirmation before Human decision; not a customer product name.
- EXPANDED: STANDARD 1.2M JPY + individually estimated additional Scope.
- COMPACT exists as Business product design in progress; its formal price/commercial boundary is **not decided**. Development must not implement an automatic Compact price or final Compact commercial rule in this slice.

### 2.2 Confirmation Load six axes
At minimum:
1. scope boundary / 対象範囲
2. information dispersion / 情報の分散
3. management-owner dispersion / 管理主体の分散
4. evidence confirmation difficulty / エビデンス確認難易度
5. interview load / ヒアリング負荷
6. special investigation requirements / 特殊調査要件

### 2.3 Counts
Employee/corporation/site/system/SaaS/vendor/interview/work/material counts may be decision material but are not price boundaries.

Old numeric boundaries such as corporation >=2, site >=4, interview >=7, system >20, operation >10 are **withdrawn as Business Canonical Scope boundaries** and must not be implemented as automatic rules.

### 2.4 Human decision
System/AI may suggest Scope candidate and reasons. It must not automatically finalize price or EXPANDED.

### 2.5 Immutable estimate basis
When Human decides estimate/scope, freeze at least:
- known company state at decision time;
- unresolved items;
- expected investigation scope;
- expected confirmation load and reasons;
- system candidate/reasons if presented;
- Human Scope decision;
- Human price decision;
- decision actor/time.

Later changes append a new decision/version; never overwrite the historical estimate basis.

---

## 3. Existing components to reuse

Reuse current Diagnosis Domain instead of creating a parallel estimate questionnaire/domain:
- Organization
- DiagnosisCase
- Participant / ParticipantRole
- SurveyResponse
- Future
- SourceRecord
- DiagnosisTheme
- DiagnosisInsight / InsightSource
- HumanReview
- AssessmentConfirmationItem
- approved DiagnosisReport
- Management Feedback Decision + immutable Decision-time Context
- Assessment lifecycle
- AssessmentHandoff after acceptance
- AuditLog

Do not copy raw Survey/Transcript/AI data into estimate snapshots when references/sanitized Human-reviewed context are sufficient.

Current AssessmentHandoff remains an **after-Assessment-acceptance execution handoff**. Do not move or overload it for pre-estimate use.

---

## 4. Proposed Application model

Names below are Development-level proposal and may be adjusted in code review while preserving semantics.

### 4.1 AssessmentScopeContext — read projection, not authoritative record
Build on demand from existing records.

Minimum projection:
- diagnosis_case_id
- organization ref/display
- latest Human Management Feedback Decision ref/version/hash
- route_code (must be DESIGN_ASSESSMENT for estimate-preparation commands)
- future ref/status
- `scope_dimensions[]`
- `confirmation_load_dimensions[]`
- unresolved_scope_items[]
- source/provenance refs
- projection_generated_at

Scope dimensions must cover at least:
- target corporation(s)
- sites
- IT environment
- business/IT operations
- stakeholders/interview targets
- materials/records
- special requirements

Each item/dimension must distinguish:
- already available from accumulated context;
- needs confirmation;
- not relevant to this estimate when Human determines so;
- unknown/insufficient information.

Do not infer “none” from no mention.

### 4.2 ConfirmationLoadSignal — advisory only
For each six-axis dimension, provide reasons and source refs. Avoid mandatory numeric score.

Suggested internal state:
- `NO_MATERIAL_SIGNAL`
- `REVIEW_SIGNAL`
- `INSUFFICIENT_INFORMATION`

This state is advisory and must never directly set Human Scope or price.

### 4.3 ScopeClarificationItem — Route-C-only missing information
Prefer reusing/extending existing `AssessmentConfirmationItem` semantics if Fit/Gap proves it can preserve purpose/status/provenance without conflating pre-estimate clarification with Assessment Evidence confirmation.

If that reuse would blur the Evidence boundary, add a minimal Application-level clarification entity. Do not create a generic questionnaire engine.

Minimum semantics:
- dimension
- question/prompt shown to staff/customer in ordinary Japanese
- reason needed for estimate
- source refs showing why unresolved
- status OPEN / RESOLVED / NOT_REQUIRED
- resolution source ref
- resolved_by / resolved_at

Responses should enter existing SourceRecord/Human Review mechanisms where semantically appropriate rather than duplicate already acquired information.

### 4.4 AssessmentScopeDecision — immutable append-only Human decision
A dedicated Application-level estimate decision record is recommended because Business requires frozen estimate basis and re-decision history before Assessment acceptance.

Minimum fields:
- id
- diagnosis_case_id
- version
- scope_classification: `STANDARD | REVIEW | EXPANDED` for this implementation slice
- decided_price_ex_tax_jpy
- currency = JPY
- expected_scope_json
- confirmation_load_json
- unresolved_items_json
- system_candidate_json nullable
- basis_snapshot_json
- basis_hash
- supersedes_decision_id nullable
- decided_by_user_id
- decided_at
- reason
- created_at

DB guard: UPDATE/DELETE rejected after insert. Correction/change = append next version.

`COMPACT` must not be accepted as a final priced classification until Business publishes its formal price/commercial boundary. If UI needs to show Compact potential, show only a non-final advisory/product-design note, not a final Scope Decision.

---

## 5. Context builder rules

The projection must use the current accumulated Human-usable context, including where applicable:
- Organization
- current Future
- Survey v2 raw responses as customer statements, not FACT
- SourceRecords
- Human Approved DiagnosisInsights and source refs
- Participants/Roles
- OPEN/NOT_REQUIRED AssessmentConfirmationItems
- approved/delivered Management Feedback Report refs/hash
- latest Human Management Feedback Decision and Decision-time Context

Rules:
1. Human Approved does not mean Evidence-confirmed FACT.
2. Customer statement does not mean FACT.
3. Evidence existence observation does not mean Evidence proves the statement.
4. Absence of a record does not mean “none”.
5. HYPOTHESIS remains HYPOTHESIS.
6. UNKNOWN may remain.
7. System may organize/suggest; Human decides.
8. Context builder must not silently promote semantic types.

---

## 6. Confirmation Load interpretation

### 6.1 対象範囲
Look for how many distinct corporations/sites/departments/environments/operations actually require confirmation for the management decision, and whether representative/common confirmation can cover them.

Counts alone are not the signal.

### 6.2 情報の分散
Look for whether required information is centralized or distributed across ledgers, departments, storage locations, systems or people; whether collection/reconciliation appears necessary.

### 6.3 管理主体の分散
Look for whether overall ownership is centralized/clear or fragmented across departments/people/vendors. Multiple vendors alone is not high load.

### 6.4 エビデンス確認難易度
Pre-estimate may organize known availability/location/access/reconciliation signals. It must not perform the Assessment's substantive proof determination.

Distinguish at least:
- confirmed no material/record exists;
- existence known, meaning/proof not yet assessed;
- location/access unknown;
- multiple/contradictory records likely require reconciliation.

Do not search indefinitely for confirmed-nonexistent Evidence.

### 6.5 ヒアリング負荷
Look for whether a small number of people can confirm the needed current state or separate functions/owners/vendors must be interviewed.

### 6.6 特殊調査要件
IPO/ISMS/overseas/core-system labels alone do not cause Expanded. The reason must state what additional confirmation is required for the current management decision.

---

## 7. Workflow / state guards

Target flow:

`Free Diagnosis → Human Review → Management Feedback → Human Route C → Scope Context → missing-only clarification → System candidate/reasons → Human Scope/Price Decision → Assessment commercial lifecycle → accepted Assessment → existing AssessmentHandoff`

Guards:
- scope/estimate preparation command requires latest Human Management Feedback Decision = Route C / DESIGN_ASSESSMENT.
- no automatic Assessment proposal/acceptance from Scope candidate.
- no automatic price finalization.
- no automatic Expanded.
- REVIEW may remain until Human has enough information.
- Human can decide STANDARD or EXPANDED with explicitly recorded unresolved items if Business operator intentionally accepts that uncertainty; reason required.
- final Scope/Price decision must be staff/Human-only.
- later scope/price change creates next immutable version.

Integration question for implementation Fit/Gap: decide whether the existing `ProposeAssessment` command should require a current Human Scope Decision. Preferred Development default: require at least one current Human Scope Decision before formal commercial proposal, but do not change this guard until regression impact is validated.

---

## 8. UI / Translation layer

Internal terms may remain strict in code. Sales/customer UI must use ordinary Japanese.

Suggested operator labels:
- Assessment Scope Context → `今回の調査範囲`
- Confirmation Load → `確認に必要な作業`
- information dispersion → `情報がどこにあるか`
- management-owner dispersion → `誰に確認する必要があるか`
- evidence confirmation difficulty → `資料・記録の確認方法`
- interview load → `ヒアリングが必要な範囲`
- special requirement → `個別に確認が必要な条件`
- REVIEW → `追加確認が必要`
- STANDARD → `標準範囲`
- EXPANDED → `追加調査を含む範囲`

Do not expose FACTACT Core names, UNKNOWN/HYPOTHESIS enums, internal route codes, or “Progressive Scope Acquisition” as required customer/sales vocabulary.

---

## 9. Implementation slices

### AS-A1 — Fit/Gap + projection contract
- inspect current schema/repos/routes/UI at implementation HEAD.
- prove which Scope/Load fields can be projected without migration.
- decide whether pre-estimate clarification can reuse AssessmentConfirmationItem or needs additive entity.
- document no-Core-change result or stop for Product validation if a genuine Core gap appears.

### AS-A2 — Scope / Confirmation Load read projection
- staff-only read endpoint.
- read-only/repeatable snapshot where practical.
- source/provenance refs.
- no Case version update, AI authority, or audit mutation for reads.
- missing/unknown remains explicit.

### AS-A3 — Route-C-only missing clarification
- generate/display only unresolved scope-driving clarification items.
- no fixed estimate questionnaire.
- do not re-ask already confirmed items.
- resolution is Human-controlled and provenance-linked.

### AS-A4 — System Scope candidate / reasons
- deterministic rules and/or AI may assist only if input is constrained to approved/safe context.
- output must include reasons and unresolved items.
- no numeric score required.
- no count threshold auto-classification.
- no final price field from AI.
- Human-only fallback mandatory.

### AS-A5 — immutable Human Scope / Price Decision
- additive migration for append-only decision/history if Fit/Gap confirms.
- Human-only command.
- frozen basis snapshot/hash.
- optimistic version guard.
- supersession chain.
- DB UPDATE/DELETE protection.
- audit command.

### AS-A6 — Assessment lifecycle integration
- display latest decision/history.
- validate whether formal `ProposeAssessment` requires current Human Scope/Price Decision.
- preserve separate Assessment lifecycle and existing post-acceptance Handoff.
- no auto proposal/acceptance.

### AS-A7 — learning/evidence instrumentation
Capture future-comparable records without inventing actual delivery load:
- estimate-time expected confirmation load snapshot;
- actual Assessment confirmation work only when real operational records exist;
- unexpected additional confirmation;
- scope change and reason;
- final Scope classification/price.

Do not fabricate actual load from estimate data.

### AS-A8 — validation
At minimum:
- Golden tests for six dimensions and no semantic promotion.
- “already known → not re-asked” test.
- “silence → UNKNOWN, not none” test.
- “no document confirmed → not treated same as fragmented/conflicting documents” test.
- “multiple vendors but centralized governance → not automatically high load” test.
- count-only scenario cannot auto-set Scope/price.
- Route A/B/D cannot perform estimate-preparation write commands.
- AI/system cannot finalize Scope/price.
- immutable decision UPDATE/DELETE rejected.
- re-decision preserves old snapshot/hash.
- STANDARD defaults to 1.2M only when Human chooses STANDARD; EXPANDED price remains Human-entered.
- COMPACT final price blocked until Business Decision.
- existing MF-A–E, Assessment lifecycle, retention/deletion, PostgreSQL/browser regressions remain green.

---

## 10. Security / retention / audit

- Apply existing staff auth and safe command protections.
- Scope Decision and quote-basis snapshot are Business Decision/Audit records; align retention with approved Decision/Audit retention unless a stricter Business policy is later defined.
- Deletion requests must not blanket-delete immutable approved decision history; follow current customer-data policy and tombstone/reconciliation rules.
- raw transcript/raw AI I/O must not be copied into immutable estimate snapshot merely for convenience.
- system suggestion metadata, if AI is used, must preserve model/run/source refs and accepted/edited/rejected disposition under existing AI governance.

---

## 11. Explicit non-goals

- Survey v3.
- new fixed estimate questionnaire.
- automatic price calculator based on company size/counts.
- automatic STANDARD/EXPANDED final classification.
- Compact commercial implementation before Business price/boundary Decision.
- Evidence analysis in Free Diagnosis.
- FACT formation from customer statements.
- FACTACT Core redesign.
- replacing existing AssessmentHandoff.
- merging current Draft PR/main without explicit approval.

---

## 12. Business Decision Required / Conflict / Gap / Unknown after handoff

### Business Decision Required
**BD-AS-01 — COMPACT commercial rule**
Business doc83 explicitly leaves Compact price and commercial boundary in progress. Development can implement the current STANDARD / REVIEW / EXPANDED path without Compact finalization, but must not accept a final priced COMPACT decision until Business Canonical is supplied.

No other Business Decision is required to start AS-A1–A5 if Development is authorized to choose normal implementation details.

### CONFLICT
No direct conflict found between latest Business doc83 and current Diagnosis architecture.

One historical conflict is resolved: old numeric boundaries must be removed from Development assumptions. They are not canonical rules.

### GAP
- no current pre-estimate Scope/Confirmation Load projection;
- no Route-C-only missing clarification workflow;
- no immutable Human Scope/Price Decision record;
- no frozen quote-basis snapshot/history;
- no current actual-vs-estimated Assessment load comparison model.

These are Application-layer gaps and do not currently justify FACTACT Core change.

### UNKNOWN / Product validation
- Whether existing AssessmentConfirmationItem can cleanly serve both Assessment confirmation targets and pre-estimate clarification requires code/schema Fit/Gap in AS-A1.
- Whether formal ProposeAssessment must be hard-gated on a current Scope/Price Decision should be validated against existing lifecycle and Business wording; Development proposes yes for a formal commercial proposal, but if this changes Business sales timing it must be returned as Business Decision Required.
- MF-F Diagnosis→Assessment→FACTACT semantic mapping and typed temporal semantics remain Product-lane work and must not be invented by AS-A.

---

## 13. Codex execution instruction

When implementation is authorized, Codex must begin with **AS-A1 only** and return Fit/Gap before schema/business-lifecycle changes.

Codex must:
1. read Business doc83 at commit `c7e7ca6aa0e4b11108ba406ee2e2bc23180ff6b2` and this handoff;
2. inspect current `atlib-sales-tools` feature-branch implementation, migrations, AssessmentConfirmationItem, Management Feedback Decision, Assessment lifecycle and Handoff;
3. identify reusable records and exact gaps;
4. explicitly prove that withdrawn numeric boundaries are not encoded;
5. propose minimal additive schema/API/UI changes;
6. stop and report any Business/Product conflict before implementation;
7. not merge PR/main.

Implementation after AS-A1 requires explicit continuation approval under the Development Lane workflow.
