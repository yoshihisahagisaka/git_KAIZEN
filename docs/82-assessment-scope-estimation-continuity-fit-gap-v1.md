# Assessment Scope / Estimation Continuity Fit-Gap v1

Status: **DEVELOPMENT / FIT-GAP PROPOSAL — NO IMPLEMENTATION AUTHORIZED**  
Date: 2026-09-16

## 0. Business input

Business has fixed the standard Design Assessment price at **120万円（税別）** and asks Development to maximize reuse of information already acquired by the Free IT Management Diagnosis / Management Feedback when deciding whether Assessment is needed, its investigation scope, and estimate.

Business principle:

> 一度確認したことを、次の工程で再度聞かない。確認できた情報は引き継ぎ、まだ分からないことだけを必要な時点で確認する。

This document analyzes fit/gap only. No implementation is authorized by this document.

## 1. Current architecture relevant to continuity

Current Diagnosis Domain already separates:
- Organization
- Participant / roles
- SurveyResponse raw source
- Future
- SourceRecord (Interview / Sales / Operator / Feedback / observed document existence)
- Human Approved DiagnosisInsight
- AssessmentConfirmationItem
- approved DiagnosisReport
- Management Feedback Decision / Decision-time Context
- deterministic AssessmentHandoff

AssessmentHandoff currently carries Organization, current Future, approved Report reference/hash, Human Approved Insights with source references, OPEN Assessment Confirmation Items, and Themes. It does not change semantic types and is created only after a separate Human Assessment acceptance.

Therefore the architectural direction of reusing confirmed information is already present. The primary gap is not a new questionnaire; it is structured scope/estimate context and timing.

## 2. Business-required information vs current acquisition

| Business information | Current availability | Can be inferred/confirmed from existing flow? | Classification | Recommended acquisition point |
|---|---|---|---|---|
| 対象となる法人 | Organization exists for the Diagnosis Case. Current model represents one primary Organization per Case. Group/subsidiary scope is not a first-class Assessment scope set. | Primary corporation yes. Additional legal entities only if recorded in interview/sales notes, not reliably structured. | **PARTIAL FIT / GAP** | Primary corporation: reuse. Additional target corporations: confirm only when scope may include them, preferably Management Feedback or pre-estimate clarification. |
| 拠点 | No dedicated location/site entity in current Diagnosis canonical. May appear in Q10, interview statement, sales note, operator note. | Possible as Human-reviewed context, but cannot be assumed complete. | **GAP** | Do not add to Survey v2 by default. Confirm at Management Feedback if location complexity is already relevant; otherwise pre-estimate clarification. |
| 主なIT環境 | Q04 captures visibility, not actual inventory. Interview/notes/observed screen/document existence can capture named environment. Human Approved Observation can structure it. | Partially. Free diagnosis can know what was stated/observed, but cannot treat inventory completeness/accuracy as FACT. | **PARTIAL FIT** | Reuse approved observations. Ask only missing scope-driving environment categories before estimate. Evidence validation remains Assessment. |
| 主な業務・IT運用 | Q05 gives broad operational state; Q09 gives broad IT organization. Interview and Human Approved Observations can add concrete operations. | Yes at broad level; detailed process inventory is not guaranteed. | **PARTIAL FIT** | Reuse diagnosis/interview. Pre-estimate ask only scope-driving missing operations; detailed verification belongs in Assessment. |
| 今回確認したい経営課題 | Q01 Future, Q02 IT expectation, Q10 free comment, diagnosis themes/Gaps and Management Feedback provide strong context. | Yes, subject to Future UNKNOWN / Human confirmation. | **FIT** | Reuse. If Future remains UNKNOWN, confirm during Management Feedback rather than add Survey questions. |
| 主な関係者・ヒアリング対象 | Participant/ParticipantRole exists and supports RESPONDENT, INTERVIEWEE, EXECUTIVE, FEEDBACK_PARTICIPANT etc. Q07/Q09 describe authority/organization broadly. | Known participants can be reused; complete Assessment interview population is not guaranteed. | **PARTIAL FIT** | Reuse existing participants. Confirm additional required functions/roles before estimate when interview count materially affects scope. |
| 確認が必要と想定される資料・記録 | AssessmentConfirmationItem and EVIDENCE_CANDIDATE already model what should be confirmed next; free diagnosis may record document existence without judging what it proves. | Yes for identified candidates; completeness is not guaranteed. | **FIT / PARTIAL FIT** | Reuse OPEN confirmation items and evidence candidates. Add missing scope-driving material categories pre-estimate; actual Evidence analysis is Assessment. |
| IPO / ISMS / 海外拠点 / 大規模基幹等の特殊要件 | No dedicated standard structured field in Survey v2/current Handoff. May be captured in Q10, Sales Note, Interview Statement, Human Approved Observation/Hypothesis. | Detectable when mentioned, but absence cannot prove none. | **GAP** | Conditional confirmation before estimate. If surfaced during diagnosis, carry forward and do not re-ask. Do not make all customers answer all special-requirement questions. |

## 3. What Survey v2 already contributes

Survey v2 should remain unchanged for this requirement unless Business later explicitly versions it.

Useful existing inputs:
- Q01 Future → intended future, not objective FACT.
- Q02 IT expectation → management expectation.
- Q03 → planning/improvement style.
- Q04 → visibility of IT environment, not inventory.
- Q05 → broad daily operation burden.
- Q06 → management view of security/risk.
- Q07 → decision/responsibility pattern.
- Q08 → management information pattern.
- Q09 → IT organization pattern.
- Q10 → optional scope/special-requirement hints.

The Survey does **not** currently establish legal-entity scope sets, site counts, system inventory, complete process inventory, complete interview population or absence/presence of every special requirement.

## 4. Development proposal — Progressive Scope Acquisition

Do not create a second Assessment-estimate questionnaire now.

Use one accumulated **Assessment Scope Context** as a read/projection concept across existing sources. Each scope dimension should be represented as one of:
- `KNOWN_FROM_EXISTING_CONTEXT`
- `NEEDS_CONFIRMATION`
- `NOT_RELEVANT`
- `UNKNOWN`

Internally these may reference strict Diagnosis semantic types. Customer/sales UI must translate them into ordinary Japanese, for example:
- `確認できている内容`
- `見積前に確認したい内容`
- `今回の対象外`
- `まだ分からない内容`

Do not expose FACTACT internal terminology as required sales/customer vocabulary.

### Stage A — Free Diagnosis
Acquire only information needed to find improvement possibilities and next decisions. Do not increase Survey v2 simply to price Assessment.

### Stage B — Management Feedback
Confirm only scope-driving items naturally relevant to the management conversation, especially:
- Future still UNKNOWN
- target corporation ambiguity
- obvious multi-site / overseas / IPO / ISMS / core-system complexity already surfaced
- likely key interview roles

This must not turn Management Feedback into an estimate interview.

### Stage C — Pre-estimate clarification (only Route C / Assessment candidate)
Generate a **missing-scope checklist** from accumulated context. Ask only unresolved items that can materially change Assessment scope/estimate.

Typical conditional checks:
- additional legal entities in scope?
- number/type of sites relevant to the issue?
- major environment/system categories not yet known?
- key business/IT operations to include?
- additional interview roles/functions?
- material/record categories expected?
- IPO / ISMS / overseas / large core system / other special requirements?

The checklist must suppress items already sufficiently confirmed and preserve provenance rather than copy/rewrite answers.

### Stage D — Assessment
Evidence collection/analysis and decision-grade FACT formation occur here. Pre-estimate scope context is not automatically promoted to FACT.

## 5. Data model Fit / Gap

### FIT
- Organization can carry the primary corporation.
- Participant/Role can carry already known people/roles.
- SurveyResponse and SourceRecord preserve original answers once.
- Human Approved Insight can structure relevant diagnosis context without promoting it to FACT.
- AssessmentConfirmationItem already expresses what needs to be confirmed next.
- AssessmentHandoff is deterministic and preserves semantic types/source provenance.
- Management Feedback Decision/Context can prove Route C and decision-time context.

### GAP
- no explicit structured representation of multi-corporation Assessment scope.
- no explicit structured site/location scope.
- no standard structured scope-estimation dimensions / completeness state.
- special investigation requirements are not systematically detectable when not mentioned.
- current AssessmentHandoff is generated after Assessment acceptance; estimation needs a reusable projection **before proposal/acceptance**. Reusing the post-acceptance Handoff as the estimate object would create a lifecycle conflict.
- current close/lifecycle semantics may still require separate resolution for non-Assessment routes; not part of this change.

### CONFLICT
No direct conflict with Business principle was found if implementation uses existing sources/provenance and conditional missing-information confirmation.

Potential conflict to avoid:
- adding all scope questions to mandatory Survey v2;
- treating customer statements as Evidence-confirmed FACT;
- using AssessmentHandoff before its current lifecycle point merely to obtain an estimate snapshot;
- making Assessment the automatic outcome of Free Diagnosis;
- exposing FACTACT internal terminology directly to sales/customers.

### UNKNOWN
- exact Business rule that converts scope dimensions into price adjustment beyond standard 120万円.
- thresholds at which corporation/site/interview/system complexity changes the estimate.
- whether a formal quote needs a frozen scope snapshot/hash and approval/audit lifecycle.
- final Product decision for Diagnosis → Assessment → FACTACT mapping from doc81.
- typed temporal semantics.

## 6. Minimal-change implementation proposal

Recommended future implementation, subject to approval:

1. Keep Survey v2 unchanged.
2. Add a read-side `Assessment Scope Context` projection before estimate, built from existing Organization, Participants, Survey, SourceRecord, Human Approved Insights, AssessmentConfirmationItems, approved Report and latest Management Feedback Decision.
3. Projection outputs known/missing scope dimensions with provenance and ordinary-Japanese labels.
4. Add a Human-controlled `pre-estimate clarification` only for unresolved scope-driving dimensions after Route C. Prefer existing SourceRecord / Participant / Human Review mechanisms rather than duplicate answers.
5. Do not create a second generic questionnaire.
6. When Business later defines pricing/complexity rules, keep price calculation separate from epistemic classification. A scope rule may say an item affects estimate; it must not turn an unverified statement into FACT.
7. Keep existing post-acceptance AssessmentHandoff for Assessment execution continuity. Do not overload it for pre-estimate scope calculation. If a frozen quote-basis snapshot is required, design it as an Application-level estimate/quote artifact only after Business defines approval/version requirements.

## 7. Answer to Business Lane

1. Already available: primary Organization; Future/management issue context; broad IT visibility/operations/risk/authority/management information/IT organization; known participants; identified Evidence candidates/confirmation items; any special conditions explicitly captured in free text/interview/sales notes.
2. Derivable without re-asking: scope-relevant information already present in Human-reviewed observations and source provenance, plus known participants and identified confirmation/evidence candidates. Absence of a mention must not be interpreted as absence of a condition.
3. Main missing information: complete target-corporation set, site scope, scope-driving environment/operation details, complete interview population, and systematic special-requirement presence/absence.
4. Acquisition: do not expand Survey v2 by default; use Management Feedback for naturally relevant ambiguity, then Route-C-only pre-estimate clarification for remaining scope-driving UNKNOWNs; Evidence verification stays in Assessment.
5. Continuity: current model is substantially reusable, but current AssessmentHandoff occurs too late for estimation. A pre-estimate read projection is the minimum-change bridge.
6. Overall: **PARTIAL FIT**. No architectural conflict; several structured scope gaps and one lifecycle gap exist. These can be handled in the Diagnosis/Application translation layer without FACTACT Core redesign.

## 8. Decisions / next step

**Development proposal — NOT YET A DECISION:** approve the Progressive Scope Acquisition approach and allow Development to produce an implementation handoff after Business confirms the remaining quote/complexity rules required for MVP.

Do not implement from this document until explicit approval is received.
