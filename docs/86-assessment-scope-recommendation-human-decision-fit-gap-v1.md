# Assessment Scope Recommendation / Human Decision — Fit / Gap v1

Status: **DEVELOPMENT / FIT-GAP — BUSINESS DECISION RECEIVED, NO CODE IMPLEMENTATION AUTHORIZED**  
Date: 2026-09-16

Business Canonical checked:
- `docs/83-assessment-scope-commercial-adjustment-rules-v1.md` at Business commit `67b3e2a24a9d27fd821396450070f81b824aca14`
- `docs/84-assessment-scope-recommendation-human-decision-business-requirements-v1.md` at Business commit `67b3e2a24a9d27fd821396450070f81b824aca14`

Development baseline checked:
- `docs/85-assessment-scope-estimate-preparation-implementation-handoff-v1.md`
- implementation `yoshihisahagisaka/atlib-sales-tools` controlled-pilot baseline HEAD `63e5523b5e9d01cc51e82d0de969eded2f736ab5`
- current `src/services/diagnosisAssessmentRepo.ts`

---

## 1. Overall result

**PARTIAL FIT — NO FACTACT CORE CHANGE REQUIRED.**

Latest Business doc83/doc84 is semantically compatible with the current Diagnosis architecture and with the Application/Translation-layer direction in Development doc85.

COMPACT can be added as a Scope Recommendation / Human commercial decision without making it a FACTACT Core Object and without changing the Assessment methodology, quality, deliverables or management-decision destination.

The main work is additive Application-layer implementation: context projection, missing-only clarification, recommendation, Human decision, immutable history and later delivery-load comparison.

No direct Business-vs-FACTACT architectural CONFLICT was identified.

---

## 2. Fit / Gap by requested requirement

### 2.1 COMPACT addition — FIT at semantic level / GAP in implementation

Business now decides:
- COMPACT standard price: 800,000 JPY excl. tax.
- sales discretion: 750,000–790,000 JPY excl. tax.
- below 750,000 JPY: manager approval.
- COMPACT is not a discounted STANDARD.
- COMPACT / STANDARD share methodology, quality, destination and deliverables; primary difference is FACT confirmation load.

This removes Development doc85's previous Business Decision Required for COMPACT.

Implementation GAP:
- current proposed `AssessmentScopeDecision` contract in doc85 only allows STANDARD | REVIEW | EXPANDED.
- it must be revised to `COMPACT | STANDARD | REVIEW | EXPANDED` for recommendation/decision semantics, while preserving REVIEW as non-final safety state.
- pricing/approval validation must be added at Application layer; it must not become a FACTACT Core contract.

### 2.2 Existing-information reuse — FIT / implementation projection GAP

Existing architecture already has reusable context:
- Organization / DiagnosisCase
- SurveyResponse
- Future
- Participant/Role
- SourceRecord
- Human Approved DiagnosisInsight + provenance
- AssessmentConfirmationItem
- approved/delivered Management Feedback report
- immutable Management Feedback Decision/context

Therefore no new estimate Survey is needed.

GAP: no current read projection assembles these into Scope/Confirmation Load context for estimate preparation.

### 2.3 Missing-only additional confirmation — FIT direction / GAP implementation

Business requirement aligns with current progressive-acquisition architecture.

GAP:
- no current Route-C-only missing-scope clarification workflow.
- `AssessmentConfirmationItem` reuse remains a code/schema Fit/Gap question because it currently represents Assessment confirmation targets; pre-estimate commercial clarification must not be confused with Evidence verification.

Development rule: if reuse blurs semantics, add a minimal Application-level clarification entity rather than changing FACTACT Core or creating a generic questionnaire.

### 2.4 Scope candidate + reason + missing information — FIT direction / GAP implementation

Current AI/Human governance supports advisory output.

Required recommendation output can be Application-level:
- candidate: COMPACT | STANDARD | REVIEW | EXPANDED
- customer/sales-readable reasons
- unresolved/missing information needed for decision
- provenance/source references internally

No numeric score is required. Counts cannot directly determine recommendation or price.

GAP: no current recommendation service/read model/UI.

### 2.5 REVIEW as safety state — FIT

Business definition of REVIEW is fully compatible with FACT FIRST / UNKNOWN and Human Decision principles:

> do not guess unknown information to finalize an estimate.

REVIEW should be representable as recommendation/working state when material information is insufficient, with:
- why decision cannot yet be made;
- what must be confirmed next.

Important implementation distinction:
- REVIEW is valid as a System Recommendation and Human working/hold decision.
- REVIEW must not be treated as a final customer price plan.
- formal commercial proposal should not silently convert REVIEW to a priced Scope.

### 2.6 Human adoption/change/hold — FIT direction / GAP implementation

Existing Management Feedback Decision proves the architecture already supports Human-only immutable decisions, optimistic versioning, frozen context/hash and supersession history.

This pattern can be reused at Application level for Assessment Scope Decision.

Required Human UX:
- see recommendation/reasons/known context/remaining unknowns/clarification results/proposed price/discount approval state;
- adopt recommendation;
- choose another Scope;
- return to REVIEW;
- record reason when Human Decision differs from System Recommendation.

GAP: no current Assessment Scope Decision command/table/UI.

### 2.7 Recommendation + Human Decision immutable record — FIT pattern / GAP implementation

Business requires frozen decision basis and history. Existing Management Feedback Decision pattern is a strong implementation fit.

Recommended additive record:
- case/version
- System Recommendation + reasons + source refs
- known context / remaining unknowns
- expected scope / confirmation load
- Human Scope
- Human price
- deviation reason when different from recommendation
- discount reason / approval requirement / approval record
- actor/time
- basis snapshot/hash
- supersedes decision id

DB UPDATE/DELETE should be rejected. New information creates a new decision version.

### 2.8 NEW FACT → Scope change history — FIT

Append-only version/supersession pattern supports this without Core change.

Do not literally require that every commercial change source is already an authoritative FACTACT Fact if Assessment has not yet formed it. Preserve the actual epistemic/provenance state of the newly confirmed information and record why Human changed Scope. Business wording “NEW FACT” is respected as the target business concept; Development must not promote a customer statement into FACT merely to satisfy the label.

### 2.9 Expected vs actual Assessment load — PARTIAL FIT / GAP

Estimate-time load can be frozen in the Scope Decision snapshot.

Actual Assessment load cannot be reconstructed reliably from current estimate data alone. Future comparison requires operational instrumentation for actual:
- confirmation work/time;
- unexpected work;
- analysis/Human decision-support effort;
- deliverable-generation effort;
- Scope changes.

This is an Application/measurement GAP, not a Core gap. Missing actual data must remain NOT_OBSERVED/UNKNOWN, not guessed.

### 2.10 FACTACT Core need — FIT / NO CORE CHANGE

No new Core Object is required for:
- COMPACT/STANDARD/REVIEW/EXPANDED commercial scope;
- recommendation reasons;
- estimate clarification;
- commercial price/discount approval;
- immutable quote-basis history.

These belong to Diagnosis/Assessment Application and Translation layers.

---

## 3. Pricing / approval Fit

Business Canonical now provides enough commercial rules to remove the prior COMPACT blocker.

Application validation should encode only explicit Business rules:

### COMPACT
- standard 800,000 JPY excl. tax
- 750,000–790,000 JPY = sales discretion
- below 750,000 JPY = manager approval required

### STANDARD
- standard 1,200,000 JPY excl. tax
- 1,000,000–1,190,000 JPY = sales discretion
- below 1,000,000 JPY = not normal discount; Management Review / individual Decision with recorded reason

### REVIEW
- no final customer price plan
- missing information must not be guessed

### EXPANDED
- 1,200,000 JPY baseline + Human-entered individual additional Scope estimate
- no automatic additional-price table exists

System must not infer approval from price alone when an approval record is required. Approval authority/role mapping must use existing staff authority capabilities if available; if no suitable manager-approval authority model exists, this is an implementation GAP to expose in AS-A1 rather than invent a new Business role.

---

## 4. Required update to Development doc85

Development doc85 was correct for the earlier Business state but is now stale in these points:

1. remove “COMPACT commercial rule is Business Decision Required”.
2. add COMPACT to Scope Recommendation/Human Decision contract.
3. add 800k / 750–790k / <750k approval rules.
4. add STANDARD 1.0–1.19M discretion / <1.0M Management Review rule.
5. define REVIEW explicitly as no-guess safety state, not merely “additional confirmation”.
6. require recommendation output = candidate + reason + missing information.
7. require Human deviation reason when Decision differs from Recommendation.
8. include discount reason/approval status in immutable Decision record.
9. keep methodology/deliverables identical between COMPACT and STANDARD.

Do not reintroduce withdrawn quantity thresholds.

---

## 5. CONFLICT / GAP / UNKNOWN to return to Business

### CONFLICT
**None identified.**

Latest Business decisions fit the current architecture without FACTACT Core change.

### GAP — Development-owned unless AS-A1 proves otherwise
- Scope/Confirmation Load projection not implemented.
- missing-only Route-C clarification not implemented.
- Scope Recommendation service/UI not implemented.
- immutable Scope/Price Human Decision not implemented.
- discount/approval record not implemented.
- actual-vs-estimated Assessment load instrumentation not implemented.
- doc85 needs superseding/update for latest COMPACT Business Decision.

### UNKNOWN requiring implementation inspection, not yet Business Decision
1. Can existing `AssessmentConfirmationItem` be reused safely for pre-estimate missing clarification without conflating it with Assessment Evidence confirmation?
2. Does current auth/authority model contain a suitable manager approval capability for COMPACT <750k and STANDARD <1.0M Management Review?
3. Where should actual Assessment confirmation/analysis/deliverable effort be captured with minimum duplication?

### Potential Business Decision Required only if implementation fit fails
**BD-AS-02 — formal proposal gate timing.**
Current `DiagnosisAssessmentRepo.lifecycle(... action='propose')` requires Feedback Completed + latest Human Route C, but does not require a Scope/Price Decision. Development proposes that a formal commercial `ProposeAssessment` should require a current Human Scope Decision that is not REVIEW. If Business intends “Assessment proposal” to occur before Scope/price determination as a distinct pre-proposal stage, the lifecycle terminology/timing needs Business clarification. Do not change this guard by assumption.

No other new Business Decision is currently required.

---

## 6. Updated implementation sequence

Proceed only after explicit implementation authorization:

1. **AS-A1** — inspect schema/auth/AssessmentConfirmationItem/proposal lifecycle; resolve the three implementation UNKNOWNs and BD-AS-02 only if needed.
2. **AS-A2** — Scope + Confirmation Load projection from existing context.
3. **AS-A3** — Route-C missing-only clarification.
4. **AS-A4** — COMPACT/STANDARD/REVIEW/EXPANDED recommendation + reasons + missing information.
5. **AS-A5** — immutable Human Scope/Price Decision + deviation/discount/approval history.
6. **AS-A6** — Assessment proposal lifecycle integration.
7. **AS-A7** — actual-vs-estimated load instrumentation.
8. **AS-A8** — Golden/PostgreSQL/browser/full regression.

No implementation is started by this Fit/Gap document.
