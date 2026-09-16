# Assessment Scope — AS-A1 Implementation Fit / Gap v1

Status: **DEVELOPMENT / AS-A1 COMPLETE — IMPLEMENTATION FIT-GAP**  
Date: 2026-09-16

Business Canonical:
- `docs/83-assessment-scope-commercial-adjustment-rules-v1.md`
- `docs/84-assessment-scope-recommendation-human-decision-business-requirements-v1.md`
- Business commit `67b3e2a24a9d27fd821396450070f81b824aca14`

Development:
- `docs/85-assessment-scope-estimate-preparation-implementation-handoff-v1.md`
- `docs/86-assessment-scope-recommendation-human-decision-fit-gap-v1.md`

Implementation inspected:
- `yoshihisahagisaka/atlib-sales-tools`
- branch `feat/controlled-pilot-policy-closure`
- controlled-pilot baseline around HEAD `63e5523b5e9d01cc51e82d0de969eded2f736ab5`
- `migrations/010_it_management_diagnosis_human_review.sql`
- `migrations/012_it_management_diagnosis_assessment_handoff.sql`
- `src/services/diagnosisAssessmentRepo.ts`
- `src/middleware/staffAuth.ts`
- `src/services/staffAuthService.ts`

---

## 1. AS-A1 conclusion

**FIT WITH ADDITIVE APPLICATION-LAYER GAPS. FACTACT CORE CHANGE NOT REQUIRED.**

AS-A2–A5 can proceed after implementation authorization using the existing Diagnosis Domain as source context. AS-A6 proposal-lifecycle integration has one Business timing question that should be resolved before changing the `ProposeAssessment` guard.

No old quantity boundary should be encoded.

---

## 2. Existing records reusable without migration for read projection

The Scope Context read projection can be built from existing records without first creating a new Scope master model:
- Organization / DiagnosisCase
- SurveyResponse
- Future
- Participant/roles
- SourceRecord
- DiagnosisInsight + InsightSource
- HumanReview
- AssessmentConfirmationItem
- approved Report
- Management Feedback Decision / immutable context

This is sufficient for AS-A2 to produce a provenance-preserving read model of:
- target corporation / sites when known;
- IT environment when known;
- business/IT operations when known;
- stakeholders when known;
- materials/records when known;
- special requirements when known;
- six confirmation-load dimensions;
- unresolved/missing items.

Absence remains UNKNOWN. Customer statement remains customer statement. Human Approved remains Human Approved, not Evidence-confirmed FACT.

---

## 3. AssessmentConfirmationItem reuse decision

**Decision: DO NOT reuse `assessment_confirmation_items` as the writable pre-estimate clarification lifecycle.**

Reason from current schema:
- its purpose is Assessment confirmation/evidence handoff;
- status is only `OPEN | NOT_REQUIRED | HANDED_OFF`;
- it has no `RESOLVED` state or resolution source/actor/time;
- it is linked to Diagnosis Theme / Insight / Evidence Candidate / AI execution semantics;
- existing Assessment Handoff carries these items after Assessment acceptance.

Using the same rows for pre-estimate commercial clarification would blur:
1. “what must be clarified to estimate Scope” and
2. “what must be confirmed as Evidence during Assessment”.

That would weaken the Free Diagnosis / Assessment Evidence boundary.

**Minimal additive proposal:** create Application-level `assessment_scope_clarifications` only for Route-C estimate preparation.

Minimum fields:
- id, diagnosis_case_id
- dimension (`TARGET_SCOPE | INFORMATION_LOCATION | MANAGEMENT_OWNER | EVIDENCE_ACCESS | INTERVIEW_SCOPE | SPECIAL_REQUIREMENT` plus mapping to customer-facing Scope Context dimensions where needed)
- prompt_ja
- reason_ja
- status `OPEN | RESOLVED | NOT_REQUIRED`
- source_refs_json
- resolution_source_record_id nullable
- resolved_by_user_id / resolved_at nullable
- created_by_user_id / created_at / updated_at

Do not create a questionnaire definition/version engine. Items are generated only from actual missing context.

When clarification reveals an Assessment Evidence confirmation target, create/link the normal `AssessmentConfirmationItem` separately through Human-controlled semantics rather than changing the clarification row into Evidence.

---

## 4. Authority / approval inspection

Current staff auth proves identity only:
- session payload contains `email`;
- `staffAuth.ts` exposes `staffEmail`;
- `StaffAuthService` explicitly states sales-tools currently has no admin/general role distinction and all atlib.jp staff have the same authority.

Therefore the current application **cannot enforce “manager approval” as an authority distinction** for:
- COMPACT below 750,000 JPY;
- STANDARD below 1,000,000 JPY Management Review.

### GAP-AS-AUTH-01
Additive authority/approval capability is required before these exceptional prices can be finalized in-system.

Development must not infer manager authority from email, title text, or a hard-coded person list.

Preferred minimal direction:
- keep normal staff authentication unchanged;
- add an Application-level approval principal/permission or explicit approval record backed by an authoritative configured principal set;
- Scope Decision records approval requirement and approval record ref;
- command rejects final exceptional price when required approval is absent.

**Business Decision is not required for the commercial threshold itself**; doc83 already decides it. If Business has not defined who/which role counts as the approving “上長 / Management Review authority”, that authority assignment is an organizational policy input required before production enforcement. Development must not invent the approver population.

---

## 5. Formal proposal gate inspection

Current `DiagnosisAssessmentRepo.lifecycle(..., 'propose')` requires:
- staff Human actor;
- Diagnosis status `FEEDBACK_COMPLETED`;
- latest Management Feedback Decision = `DESIGN_ASSESSMENT`;
- current Assessment status `NOT_PROPOSED`.

It does **not** require Scope Recommendation or Human Scope/Price Decision.

Business doc84 defines the order conceptually as System Recommendation → Human Scope/price Decision and requires REVIEW not to be guessed into a priced Scope. However current `ProposeAssessment` command name may represent either:
- a formal commercial proposal after quote determination; or
- an earlier sales lifecycle “Assessmentを提案する” event before final quote.

### BD-AS-02 — Business timing clarification required before AS-A6 guard change
Development should **not modify the current `ProposeAssessment` guard yet**.

Question to Business:
> `ProposeAssessment`を「Scope・価格をHuman確定した正式見積/提案」と定義し、最新のHuman Scope DecisionがCOMPACT / STANDARD / EXPANDEDであることを必須にしますか？ それとも、Scope/価格確定前の「Assessment提案開始」を別状態として許容しますか？

AS-A2–A5 do not need to wait for this answer. AS-A6 does.

---

## 6. Scope Recommendation contract after AS-A1

Application recommendation output:
- `candidate`: `COMPACT | STANDARD | REVIEW | EXPANDED`
- `reason_ja[]`
- `missing_items[]`
- `important_known_context[]`
- internal provenance refs
- generated_at
- generator metadata if AI is used

Rules:
- no numeric score required;
- no count-only automatic classification;
- REVIEW when material information is insufficient;
- no final price from AI/System;
- customer/sales-readable Japanese;
- no internal FACTACT vocabulary required in UI.

System recommendation may be regenerated as context changes; the version used for a Human Decision is frozen inside the immutable Decision basis.

---

## 7. Human Scope Decision schema direction

AS-A5 requires additive append-only persistence. Proposed classification semantics:
- `COMPACT`
- `STANDARD`
- `EXPANDED`
- `REVIEW` as Human hold/return-to-confirmation state, not final customer price plan.

Freeze:
- known context/provenance at decision time;
- remaining UNKNOWN;
- expected investigation scope;
- expected confirmation load/reasons;
- recommendation/reasons/missing items;
- Human classification;
- price when final classification;
- deviation reason when recommendation differs;
- discount reason;
- approval requirement/status/ref;
- actor/time;
- hash and supersession.

For REVIEW, final quoted price should be null and proposal-finalization must not infer a price.

For EXPANDED, additional amount remains Human-entered; no automatic price table.

---

## 8. Actual-vs-estimated load instrumentation location

Current Diagnosis/Assessment sales lifecycle does not contain reliable actual work-time records sufficient to derive:
- actual Evidence confirmation effort;
- analysis/Human decision-support effort;
- deliverable-generation effort.

Therefore AS-A7 should use an additive Assessment execution measurement record or later FACTACT operational records when they actually exist. Do not estimate actual effort from timestamps that measure only status transitions.

This is a Development GAP, not a Business conflict.

---

## 9. Updated implementation plan

### AS-A2 — authorized-next candidate
Build staff-only read projection. No migration required for projection itself.

### AS-A3
Add `assessment_scope_clarifications` migration + Route-C-only commands/UI. Reuse SourceRecord for resolution provenance where appropriate; keep AssessmentConfirmationItem separate.

### AS-A4
Add recommendation service/read output for COMPACT/STANDARD/REVIEW/EXPANDED. Start deterministic/human-fallback safe; AI optional, never final authority.

### AS-A5
Add immutable Human Scope/Price Decision + recommendation basis/hash + supersession + discount/approval state. Exceptional-price finalization must fail closed until valid approval authority is configured.

### AS-A6 — HOLD only for proposal guard
Wait for BD-AS-02 before changing `ProposeAssessment` semantics/guard. Other Assessment lifecycle remains unchanged.

### AS-A7 / AS-A8
Actual-load instrumentation then full validation/regression.

---

## 10. Business return

### CONFLICT
None.

### GAP requiring Business organizational input before exceptional-price production enforcement
**Approver authority population:** current app has no manager/admin role distinction. Business commercial thresholds are clear, but Development needs the authoritative rule/source for who can approve COMPACT <750k and STANDARD <1.0M. Do not infer it.

### Business Decision Required before AS-A6
**BD-AS-02 — ProposeAssessment timing/meaning**, question in section 5.

### Development-owned GAP
- pre-estimate projection;
- missing-only clarification entity/workflow;
- recommendation service/UI;
- immutable Scope/Price Decision;
- approval capability integration;
- actual-vs-estimated load instrumentation.

No FACTACT Core change required.

---

## 11. AS-A1 verdict

**AS-A1 COMPLETE.**

Development can proceed to AS-A2–A5 without changing Business Decisions, provided code implementation is explicitly authorized. AS-A6 proposal guard remains on hold until BD-AS-02 is answered. Production/Pilot GO is unaffected; existing external readiness blockers remain separate.
