# IT経営KAIZEN 無料診断 — Sales Launch FIT / GAP v1

Status: **DEVELOPMENT / SALES LAUNCH FIT-GAP — IMPLEMENTATION AUTHORIZED BY USER**  
Date: 2026-09-17

## 1. Inputs

Latest Business main checked through commit `67680200334b65620c6348559682dee2480732a4`.

New Business Canonical inputs:
- `docs/88-it-management-kaizen-management-conversation-to-free-diagnosis-sales-principles-v1.md`
- `docs/89-it-management-kaizen-sales-education-and-practice-guide-principles-v1.md`
- `docs/89-it-management-kaizen-free-diagnosis-naming-v1.md`
- `docs/90-it-management-kaizen-system-ai-assisted-service-delivery-and-sales-guide-v1.md`

Existing Development Canonical remains applicable, including docs/22–31, 65–88 where not superseded by newer Business decisions.

Implementation baseline inspected:
- repository `yoshihisahagisaka/atlib-sales-tools`
- source branch `feat/assessment-scope-preparation`
- HEAD `23a527e908e4adfeeacca03a03790ac66034a459`
- Sales Launch implementation branch: `feat/free-diagnosis-sales-launch`

## 2. Overall result

**PARTIAL FIT — NO FACTACT CORE CHANGE REQUIRED.**

Current system already has the core Diagnosis Domain, Survey v2, customer Web survey, staff proxy entry, progressive save/resume, AI preparation, 60-minute workspace, Human Review, report/feedback, Management Feedback Decision, and Assessment continuity.

The main Sales Launch gaps are Application/UI/Translation gaps rather than Core architecture gaps.

## 3. FIT

### Web survey foundation — FIT
- Customer Web entry exists.
- Survey v2 is shared with staff proxy input.
- Q01–Q10 canonical survey model is already implemented.
- `分からない` remains valid.
- answers are raw SurveyResponse, not FACT.
- save/resume and completion lifecycle exist.

### Proxy input foundation — FIT
- staff-authenticated proxy input exists and uses the same Survey v2 model.
- staff identity is recorded through authenticated commands.
- existing case can be resumed by staff.

### Diagnosis workflow — FIT
- Future-first preparation, AI suggestion, Human Review, grounded report and Management Feedback flow exist.
- AI does not silently create authoritative FACT.
- Human approval remains required.

### Assessment continuity — FIT / ongoing
- Route C, Scope Context, missing-only clarification and safe Scope Recommendation work already exists on the implementation baseline.
- new Business doc90 is consistent with COMPACT / STANDARD / EXPANDED + REVIEW safety and Human Scope Decision.

## 4. GAP

### GAP-LAUNCH-01 — naming/UI copy
Current UI still displays legacy `無料 IT経営診断` / `無料IT経営診断` in customer and admin surfaces.

Required:
- new visible surfaces use canonical `IT経営KAIZEN 無料診断`;
- contextual short form `無料診断` allowed;
- internal route/table identifiers need not be renamed for launch.

### GAP-LAUNCH-02 — pre-diagnosis management conversation handoff
Business requires information acquired before formal diagnosis consent to be reusable, while not treating the conversation itself as a diagnosis.

Current proxy flow creates a DiagnosisCase immediately. There is no explicit pre-consent sales-conversation record/lifecycle.

Required minimal Application model:
- a staff-only pre-diagnosis Sales Conversation / Intake draft separate from DiagnosisCase;
- record customer statement / known-or-observed item, UNKNOWN, and salesperson hypothesis/note separately;
- explicit customer consent/decision to start free diagnosis;
- only then create/link DiagnosisCase and carry forward reusable records with provenance;
- carried information remains statement/observation/hypothesis/unknown, never auto-promoted to FACT.

### GAP-LAUNCH-03 — proxy free-note epistemic separation
Current proxy page supports Survey v2 but lacks the Business-required three-way supplemental note capture:
1. 顧客の発言 / 確認できたこと
2. まだ分かっていないこと
3. 営業担当者の気づき / 仮説 / メモ

Required:
- ordinary Japanese UI;
- SourceRecord / semantic type mapping that preserves provenance;
- no duplicate large sales questionnaire.

### GAP-LAUNCH-04 — progressive reuse UX
Backend has reusable records, but admin UI does not yet clearly show:
- what is already known/reported;
- what remains unknown;
- what is salesperson hypothesis;
- what should be asked next.

Required:
- admin diagnosis overview/preparation should show these separately;
- additional questioning should focus on missing information rather than restart Survey.

### GAP-LAUNCH-05 — management/analysis screen
Current admin overview is operational and raw-response centric. Business requires a launch-usable analysis view that helps staff prepare management feedback.

Required minimum read model/UI:
- FUTURE
- confirmed/recorded customer statements and observations (not mislabeled FACT)
- UNKNOWN
- GAP candidates
- WHY hypotheses + confirmation needed
- improvement options organized through `技術 / 運用 / 管理 × なくす / 自動化する / 標準化する / 任せる / 残す / 整える`
- provenance and Human Review state
- NEXT DECISION / route outcome

The 3×6 lens is an analysis/presentation lens, not a maturity score and not a FACTACT Core taxonomy.

### GAP-LAUNCH-06 — consent wording / 60-minute event wording
Current customer UI still says staff will contact the customer about `60分診断`, which can imply a fixed mandatory event.

Business now states free diagnosis is not limited to a fixed 60-minute event and may reuse prior information.

Required:
- copy should say additional confirmation/interview is performed only as needed;
- do not promise that all cases require a separate 60-minute session.

### GAP-LAUNCH-07 — launch readiness evidence
Feature existence is not Sales Launch GO.
Need reproducible tests for:
- Web survey happy path/resume
- proxy entry
- pre-consent conversation → consent → DiagnosisCase handoff
- epistemic separation
- admin analysis view
- AI/Human boundary
- report/feedback
- auth/security
- real PostgreSQL migration
- browser flow

External production blockers from Production Readiness remain applicable until independently closed.

## 5. CONFLICT

**No Business-vs-Development architectural conflict found.**

New Business requirements reinforce existing principles: Future First, FACT/UNKNOWN separation, AI Suggests/Human Decides, progressive acquisition, no duplicate questioning, and actor neutrality.

The only supersession is visible naming: legacy `無料IT経営診断` is replaced by `IT経営KAIZEN 無料診断`. Internal technical identifiers may remain for compatibility.

## 6. UNKNOWN

1. The actual rendered “営業実践ガイド v4” artifact itself was not found as a versioned file in the GitHub SSOT during this inspection. The latest Business Canonical decisions that define its operating requirements (docs/88–90 and naming decision) were found and are used here. If v4 contains additional requirements not committed to SSOT, they are not yet Development inputs.
2. Legal/Privacy final customer-facing privacy text/link remains outside this implementation decision unless Business/Legal has since committed a newer canonical.
3. Production infrastructure/external readiness remains separate from application completion.

## 7. Sales Launch implementation sequence

SL-A1 visible naming + customer/proxy wording alignment.

SL-A2 pre-diagnosis Sales Conversation/Intake draft + explicit consent/start boundary.

SL-A3 three-way supplemental notes + provenance handoff.

SL-A4 progressive reuse / missing-only admin UX.

SL-A5 management analysis read model + 3×6 improvement lens UI, with AI advisory and Human Review boundary.

SL-A6 end-to-end Web/proxy/admin browser tests and real PostgreSQL validation.

SL-A7 Production/Sales Launch readiness gate: distinguish Application Ready from Production GO; do not claim GO while external blockers remain.

## 8. Guardrails

- Do not change Survey v2 Q01–Q10 merely to satisfy sales capture.
- Do not create a second large sales questionnaire.
- Customer statement ≠ Evidence-confirmed FACT.
- Salesperson hypothesis ≠ FACT.
- AI recommendation ≠ Human Decision.
- 3×6 lens ≠ score/maturity model.
- Do not auto-select atLIB as execution actor.
- Do not rename database/API identifiers solely for branding if that adds migration risk.
- Do not merge implementation to main without explicit approval.
