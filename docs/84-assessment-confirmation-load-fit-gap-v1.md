# Assessment Confirmation Load Fit / Gap v1

Status: **DEVELOPMENT / FIT-GAP — NO IMPLEMENTATION AUTHORIZED**  
Date: 2026-09-16

## 0. Business input

Survey v2 Q01–Q10 remains unchanged by default.

Business is considering Assessment price/scope based not on company size itself but on the **investigation load required to confirm the FACT needed for management decisions**.

Primary load dimensions:
1. 対象範囲
2. 情報の分散
3. 管理主体の分散
4. エビデンス確認難易度
5. ヒアリング負荷
6. 特殊調査要件

System presents Scope candidates and reasons; Human makes the final Scope/estimate decision. Missing scope information should preferably be confirmed only for customers proceeding through Route C, not by universally expanding Survey v2.

This document is Fit/Gap only. No code implementation is authorized.

## 1. Overall result

**Overall: PARTIAL FIT.**

Current Survey v2 + 60-minute Diagnosis + existing Diagnosis data model can provide substantial **signals** for confirmation load, but cannot reliably establish the complete investigation load before Route C.

The strongest existing fit is not Survey v2 alone. It is the accumulated Diagnosis Context:

`SurveyResponse + Future + Participant/Role + SourceRecord + Human Approved Insight + AssessmentConfirmationItem + Management Feedback context`

The main gap is a structured read-side projection that translates these existing records into the six load dimensions and explicitly shows what is still unknown.

## 2. Fit / Gap by confirmation-load dimension

| Confirmation-load dimension | Survey v2 | 60-minute Diagnosis / current model | Result | Missing information / handling |
|---|---|---|---|---|
| 対象範囲 | Q04/Q05/Q09 give broad state but do not define investigation boundaries | Organization, Participants, interview/sales/operator statements, Themes and confirmation items can reveal scope | **PARTIAL FIT** | exact corporations/sites/systems/operations requiring detailed investigation may remain unknown; Route-C-only clarification |
| 情報の分散 | Q04 indicates how well IT environment is understood; Q08 indicates management-information delivery | statements/observations can reveal separate lists, systems, owners, locations and missing visibility | **PARTIAL FIT** | no canonical structured measure of where required information is distributed; derive signals from reviewed context, then confirm unresolved repositories/sources after Route C |
| 管理主体の分散 | Q07 authority/responsibility and Q09 IT organization are directly relevant | Participant/roles and interview observations can identify internal/external/departmental management actors | **PARTIAL FIT to FIT for signal** | complete management-owner map is not guaranteed; confirm only actors relevant to Assessment scope after Route C |
| エビデンス確認難易度 | Survey v2 does not ask Evidence availability/quality | EVIDENCE_CANDIDATE, AssessmentConfirmationItem, DOCUMENT_EXISTENCE_OBSERVED and UNKNOWN can show what must be confirmed; free diagnosis intentionally does not judge what Evidence proves | **PARTIAL FIT / GAP** | availability, recency, consistency, access path, cross-check need and proof strength cannot be determined reliably in free diagnosis; pre-estimate may confirm availability/access burden, while substantive Evidence analysis remains Assessment |
| ヒアリング負荷 | Q07/Q09 provide organization/authority pattern | Participant/Role plus diagnosis statements can identify known interviewees/functions | **PARTIAL FIT** | required interview population, separate interviews, role fragmentation and unavailable key persons may remain unknown; Route-C-only clarification |
| 特殊調査要件 | Q06 risk and Q10 free comment may surface special conditions | sales/interview notes and Human Approved context can capture IPO/ISMS/overseas/large core system etc. | **PARTIAL FIT / GAP** | silence cannot prove absence; use conditional Route-C check for material special requirements not already known |

## 3. What Survey v2 can and cannot tell us

### Useful confirmation-load signals already present
- Q03: whether improvement/planning is systematic or reactive.
- Q04: whether the IT environment is visible or requires person-dependent confirmation.
- Q05: operational fragmentation/person-dependence/manual work signals.
- Q06: management visibility of security/IT risk.
- Q07: authority/decision ownership pattern.
- Q08: whether management information is already organized or must be assembled ad hoc.
- Q09: internal/external/兼任/no-owner IT organization pattern.
- Q10: optional hints about special scope/complexity.

### Not reliably available from Survey v2
- exact investigation boundary;
- number and identity of information repositories relevant to Assessment;
- complete management-owner map;
- Evidence availability/access/consistency/recency/cross-check burden;
- actual interview population and interview separation required;
- systematic absence/presence of all special investigation requirements.

Therefore Survey v2 must not be converted into a pre-estimate questionnaire.

## 4. 60-minute Diagnosis fit

The 60-minute Diagnosis is more useful than Survey v2 for confirmation-load estimation because it can capture concrete statements and observations without changing the fixed questionnaire.

Existing model can preserve:
- Interview Statement
- Sales Note / Operator Note
- Screen-shared information
- Document existence observed
- Participant and roles
- Human Approved Observation / UNKNOWN / Hypothesis / Gap / Evidence Candidate
- Assessment Confirmation Items

However, free diagnosis must preserve its boundary:

> Evidenceが存在することは確認できる。Evidenceが何を証明するかはAssessmentで確認する。

Accordingly, Development may estimate **confirmation burden signals** such as “the needed record is not yet identified”, “multiple owners appear to hold separate information”, or “additional interviews are likely needed”, but must not claim Evidence completeness, accuracy or proof strength without Assessment verification.

## 5. Proposed internal Confirmation Load Context

Development proposal: extend the doc83 Scope Context design with a read-side **Confirmation Load Context**. This is Application/Translation-layer terminology, not a FACTACT Core Object.

Minimum internal dimensions:
- `scope_boundary_load`
- `information_dispersion_load`
- `management_owner_dispersion_load`
- `evidence_confirmation_load`
- `interview_load`
- `special_requirement_load`

Each dimension should contain:
- known/reused supporting references;
- unresolved items;
- advisory signals/reasons;
- observability/completeness state;
- no authoritative price decision.

Do not force a numeric score. Prefer reasoned signals such as:
- `NO_MATERIAL_SIGNAL`
- `REVIEW_SIGNAL`
- `INSUFFICIENT_INFORMATION`

Human remains responsible for STANDARD / REVIEW / EXPANDED and estimate.

## 6. Route-C-only additional confirmation

After latest Human Route C, the system should build the accumulated Scope/Confirmation Load Context and present only missing questions that can materially affect investigation load.

Examples of conditional clarification, only when not already known:
- Which corporations/sites/systems/operations actually require detailed confirmation?
- Where are the relevant records/information maintained, and are they centralized or distributed?
- Who owns/controls the relevant systems, records and operational decisions?
- Are the expected records available, accessible, current enough to inspect, or likely to require reconciliation across multiple sources?
- Which functions/people must be interviewed separately to confirm the current state?
- Are IPO/ISMS/overseas/large core systems or other special investigation conditions in scope?

These are not a new fixed questionnaire. They are a dynamically generated missing-information checklist based on accumulated context.

## 7. Relationship to Business review indicators

The previously decided indicators (e.g. detailed corporations >=2, individually confirmed sites >=4, interviews >=7, detailed systems >20, individually analyzed operations >10) remain advisory.

This Fit/Gap adds an important interpretation:

**Counts are proxies for investigation load, not the price basis itself.**

For example:
- one corporation may still require REVIEW because Evidence is fragmented across many owners/sources;
- multiple sites may remain STANDARD if the same centrally managed evidence can confirm the required FACT efficiently;
- a large SaaS count alone does not imply EXPANDED if most systems are irrelevant to the management decision being assessed.

No deterministic threshold may automatically set price or EXPANDED.

## 8. Customer / Sales translation

Do not expose internal terminology such as `Confirmation Load Context`, `UNKNOWN`, `FACTACT`, or internal signal enums.

Possible ordinary-Japanese presentation:
- `確認する範囲`
- `情報がどこにあるか`
- `誰に確認する必要があるか`
- `資料・記録の確認方法`
- `ヒアリングが必要な範囲`
- `個別に確認が必要な条件`

System output should explain reasons, for example:

> 現在の情報では、複数部門に確認が必要になる可能性があります。見積前に、対象となる担当部門を確認します。

rather than showing an internal score.

## 9. FIT / GAP / CONFLICT / UNKNOWN summary

### FIT
- Survey v2 already contains several useful load signals.
- 60-minute Diagnosis and existing Source/Insight/Participant/ConfirmationItem model can capture concrete context without questionnaire expansion.
- existing epistemic boundaries support “known vs still needs confirmation”.
- Human-final scope decision aligns with current Human Decision principles.

### GAP
- no structured six-dimension Confirmation Load projection.
- no systematic pre-estimate view of information/management-owner dispersion.
- Evidence confirmation burden is only partially observable before Assessment.
- interview requirement completeness is not guaranteed.
- special requirement absence cannot be inferred from silence.
- Route-C-only dynamic missing-scope clarification is not yet implemented.

### CONFLICT
No architectural conflict found if this remains Application/Translation-layer advisory context and free diagnosis does not become Evidence analysis or a fixed estimate questionnaire.

### UNKNOWN
- exact Business definition of what additional investigation belongs inside standard 120万円 vs requires additional Scope beyond Human judgment/review indicators.
- whether Human Scope Decision requires an immutable quote-basis snapshot/hash and formal re-decision history.
- Product MF-F mapping and typed temporal semantics remain separate.

## 10. Development recommendation

Update the planned AS-A slice rather than create Survey v3.

Recommended target flow:

`Existing Diagnosis Context → Scope Context + Confirmation Load Context → missing-information checklist → Route-C-only clarification → system presents scope candidate/reasons → Human STANDARD/REVIEW/EXPANDED decision → estimate`

Implementation should not begin until this Fit/Gap is accepted and the remaining Human Scope Decision audit/version requirements are decided or explicitly delegated to Development design.
