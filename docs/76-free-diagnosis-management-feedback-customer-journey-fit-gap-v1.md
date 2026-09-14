# 無料IT経営診断 — Business Journey / Management Feedback Architecture Fit-Gap v1

Status: **DEVELOPMENT / ARCHITECTURE VALIDATION — INPUT TO BUSINESS & PRODUCT LANES**  
Date: 2026-09-14

## 0. Scope / Boundary

Business Lane `main` の以下を、現行Diagnosis Architecture / FACTACT Canonical / 実装branchに対して検証した。

- `docs/67-free-diagnosis-management-feedback-assessment-customer-journey-v1.md`
- `docs/68-management-feedback-pilot-script-s-company-v1.md`
- `docs/69-s-company-management-feedback-5page-sample-v1.md`

本検証はProduction / Controlled Pilot GOではない。Business Requirementを理由にCore Objectを追加せず、現行Core → Translation / Projection → Application Layer → Architecture Gapの順で評価する。

Guardrails:
- FACT FIRST.
- 分からないことを、分かったことにしない。
- AI Suggests. Human Decides. System Records.
- Customer Input ≠ Evidence-confirmed FACT.
- Human Approved ≠ FACT.
- atLIBをActorとして自動選択しない。

## A. Overall Fit

**PARTIAL FIT**

Business Journeyの主要Meaningは現行Canonicalと整合する。特にFUTURE-first、Raw Source / AI Proposal / Human Approved Insightの分離、UNKNOWN維持、Human Review、5-block feedback projection、Assessment Handoff、FACTACT側のDecision → Action → Change → Verify → Factという方向性にConflictはない。

一方、実顧客Journeyとして必要な次のMeaningは現行Applicationに不足する。

1. FUTURE自体がまだUNKNOWNのCaseを、Customer-facing Feedbackで自然に扱うProjection。
2. Page 2でCustomer Input / Observation / UNKNOWNをEvidence-confirmed FACTと誤認させない表示分離。
3. WHYの `Hypothesis → Supporting Observation → Evidence Needed` の明示Connection。
4. Management Feedback後のRoute A/B/C/DのHuman Decision記録。
5. Decision時点のKnown / UNKNOWN / Evidence Neededのimmutable snapshot / provenance。
6. typed temporal meaning（期限 / 約束日 / 確認日 / 再開日 / Verification日 / Review日）。
7. Pilot measurementの一部（Route、Customer restatement、Follow-up、二重入力、prep/review時間）の構造化計測。
8. Assessment Handoff後にAssessment Domain / FACTACTへ実際に接続するmapping/runtime。

これらは現時点で新FACTACT Core Objectを必要とすると判断しない。主にDiagnosis Application / Translation Layerで閉じられる。時間概念のみProduct LaneでCore/Shared capability要否のValidationが必要。

## B. Requirement-by-Requirement Matrix

| # | 判定 | 現行Evidence | 足りないもの | Architecture変更要否 | App / Translation対応 |
|---|---|---|---|---|---|
| 1 FUTURE first-class | **PARTIAL FIT** | Diagnosisにversioned `Future` Entity。`statement`, `time_horizon`, `SURVEY_STATED / INTERVIEW_RECONFIRMED`。FUTUREは客観FACTではなく意図として分離。 | S社のようにFUTURE自体が未確認の状態をCustomer-facingに自然に示す明示Projection。現ReportはFuture block必須。 | Core変更不要見込み。Diagnosis model/status追加要否は実装設計で判断。 | **Yes** |
| 2 Customer Input vs Evidence FACT | **FIT (Diagnosis boundary)** | `SurveyResponse` / `SourceRecord` Raw保存。FACT enumなし。Evidence存在確認とEvidenceが何を証明するかを分離。 | Assessment側でEvidence-confirmed FACTへ昇格するruntimeはDiagnosis外。 | Diagnosis Core変更不要。 | **Yes** |
| 3 UNKNOWN維持 | **FIT** | `DiagnosisInsight.UNKNOWN` + `NOT_YET_CONFIRMED / UNRESOLVED / CONTRADICTORY / NOT_REQUIRED_NOW`。UNKNOWNを残してReview/Handoff可能。 | Customer-facing wording/projectionの磨き込みのみ。 | No | **Yes** |
| 4 AI Suggestion vs Human Approved | **FIT** | `AIProposal` と `DiagnosisInsight` / `HumanReview` を分離。Human Approved ≠ FACT。 | なし。 | No | Already supported |
| 5 Feedback前Human Review | **FIT** | HUMAN_REVIEW_REQUIRED → REPORT_REVIEW_REQUIRED → REPORT_APPROVED → FEEDBACK_PENDING。ReportはHuman Approved insightのみ。 | なし。 | No | Already supported |
| 6 5-block Feedback | **PARTIAL FIT** | 実装Report projectionは `FUTURE / CURRENT_AND_UNKNOWN / GAP / ROOT_CAUSE_AND_KAIZEN / NEXT_CONFIRMATION` をBusiness titleへ翻訳し5 sections固定。 | Page 2のCustomer Input/Observation/Unknown分離、FUTURE UNKNOWN表示、Page 5 Route Decision。一般HYPOTHESISがPage2に落ち得るprojectionも要整理。 | Core変更不要。 | **Yes** |
| 7 WHY Connection | **PARTIAL FIT** | Root Cause Hypothesis / Observation / Evidence Candidate semantic types、Insight Source provenance、AssessmentConfirmationItemとの関連を保持可能。 | `Hypothesis → Supporting Observation → Evidence Needed` をCustomer-facingに一組として再現する明示association/projection。 | FACTACT Core変更不要。Diagnosis app relationを小さく追加する可能性。 | **Yes** |
| 8 Route A/B/C/D | **GAP** | Assessment lifecycleは `NOT_PROPOSED / PROPOSED / PENDING / ACCEPTED / DECLINED`。Feedback completionは存在。 | Direct ACT / Focused Confirmation / Design Assessment / Stop-HoldというHuman Decision outcomeの構造化記録とNext Action。 | Core変更不要。Business labelをCore化しない。 | **Yes** |
| 9 Decision時点Context trace | **PARTIAL FIT** | Report approval snapshot、Audit、Human Review、Assessment Handoff snapshotは存在。 | Selected route / decisionと、その時点のKnown / UNKNOWN / Evidence Needed refsを一体で凍結するFeedback Outcome snapshotがない。 | Core変更不要見込み。 | **Yes** |
| 10 Diagnosis→Assessment provenance | **PARTIAL FIT** | deterministic `AssessmentHandoff`、Future、Human Approved Insight、OPEN confirmation item、semantic type維持。 | Downstream AssessmentがHandoffをそのままconsumeする実装 / mappingと、二重入力計測。 | Core変更不要。Assessment app integration必要。 | **Yes** |
| 11 Assessment→Decision→ACT→CHANGE→NEW FACT | **PARTIAL FIT** | FACTACT Canonicalは `Event → Requirement → Work → Action → Change → Verify → Fact → Learn → KAIZEN`、Decision / Change / Verifyをfirst-class UXとして扱う。 | Assessment Human Approved outputをFACTACTのDecision/Work/Action/Changeへmappingするruntimeは未実装・未検証。 | **Product mapping validation required**。新Core Objectは現時点不要。 | Partly |
| 12 Typed time meanings | **GAP** | Diagnosisに`scheduled_at`、FACTACT UXにDue / Follow-upの概念はある。 | Next Decision確認日、Assessment回答予定日、Evidence確認日、ACT期限、Vendor約束日、Verification日、Quarterly/Annual Reviewを意味別に保持するCanonical contractが不足。 | **Unknown — Product Lane validation required**。単一Due Dateへの圧縮は禁止。 | 一部はApp対応可、共有意味はProduct判断 |
| 13 Pilot Evidence | **PARTIAL FIT** | AIProposal、HumanReview、SourceRecord、Audit。Controlled Pilot evidenceはcoded signalsとして correction category / AI misclassification / feedback reaction / next action等を記録可能。 | selected Route、Customer restatement、Follow-up、Assessment再入力/二重入力、Feedback prep time、Human Review timeを十分な粒度で構造化計測していない。 | Core変更不要。 | **Yes** |

## C. Management Feedback 5-page Output Fit

| Page | 判定 | 理由 / 最小Gap |
|---|---|---|
| Page 1 — FUTURE | **Application追加が必要** | FUTURE EntityとReport blockは存在するが、S社のような「FUTUREはまだUNKNOWN / 当日Customerが定義」を自然に表示するProjectionが不足。未確認FUTUREを架空statementで埋めないこと。 |
| Page 2 — FACT / UNKNOWN | **Human Review後なら可能 / Application追加が必要** | Human Approved Observation/UNKNOWNを出せる。ただしFree DiagnosisではEvidence-confirmed FACTを作らないため、Customer Input / Observationを「FACT」と誤表示しないTranslationが必要。一般HYPOTHESISをPage2へ混在させない。 |
| Page 3 — GAP | **Human Review後なら可能** | `GAP_CANDIDATE` をHuman Approved後にGAP sectionへprojection済み。FUTURE未確認時は「確認テーマ候補」として表示する条件分岐が必要。 |
| Page 4 — WHY | **Application追加が必要** | `ROOT_CAUSE_HYPOTHESIS` をWHYへ出せるが、Business sampleの `Hypothesis + Supporting Observation + Evidence Needed` の組表示にはexplicit projection/associationが不足。 |
| Page 5 — NEXT DECISION | **Application追加が必要** | NEXT DECISION titleは実装済みだが、Route A/B/C/DのHuman Decisionとselected outcome、Customer restatement、follow-upは構造化されていない。Assessmentを自動推奨しないguardは維持可能。 |

**Architecture Gapとして5ページ専用Coreを追加する必要はない。** 5ページはReport / Management Feedback Viewであり、既存typed contextのProjectionとして扱う。

## D. Context Continuity

### Diagnosis → Feedback

**FIT / PARTIAL FIT**

- Raw: SurveyResponse / SourceRecord
- AI: AIExecution / AIProposal
- Human reviewed: DiagnosisInsight / HumanReview
- Customer-facing: DiagnosisReport snapshot

Provenanceは維持できる。Feedback中のCustomer correctionもSourceRecord / Human Reviewの新versionとして扱える。

### Feedback → Assessment

**PARTIAL FIT**

Assessment Handoffは存在し、semantic typeを変えずsnapshot化できる。OPEN AssessmentConfirmationItemも渡せる。ただしRoute C selectionそのものとDecision-time snapshotがまだ不足し、Assessment consumer runtimeは未完成。

### Assessment → Decision

**GAP / Product integration pending**

Business MeaningはCanonicalと整合するが、Assessment側でEvidenceからFACTを形成しHuman Decisionへ接続する実装は本無料診断repoの完成範囲外。

### Decision → ACT → CHANGE / Verification

**Architecture FIT / Runtime UNKNOWN-PARTIAL**

FACTACT CanonicalはDecision、Action、Change、Verify、Fact、Learningを区別しているため意味上Conflictはない。一方、Assessment outputからFACTACTへ実際にmappingし、Actor Allocation、Expected Change、Verification Targetを連続運用するintegration evidenceは未取得。

## E. S社Controlled Pilot — Minimum Gap

### 今すぐ必要

1. **FUTURE UNKNOWN-safe Feedback**
   - S社FUTUREを未確認のまま明示し、当日Customer wordingでreconfirmできる。
2. **Page 2 epistemic separation**
   - Customer Input / Observation / UNKNOWNをEvidence-confirmed FACTと誤認させない。
3. **WHY connection projection**
   - Hypothesis / Supporting Observation / Evidence Neededを1セットで表示。
4. **Feedback Outcome / Route Human Decision**
   - A/B/C/DをBusiness Viewで選択し、内部ではgeneric decision/outcome codeとして記録。
5. **Decision-time Context snapshot**
   - selected route、relevant approved insight refs、UNKNOWN refs、Evidence Needed refs、Customer restatement、decider/timeを凍結。
6. **Pilot instrumentation**
   - feedback duration、prep time、review time、Customer correction、selected route、restatement、follow-up、manual re-entryを取得。
7. **S社データ投入禁止維持**
   - Controlled Pilot GO / explicit Conditional GOまでは実システムへ投入しない。

### 将来改善でよい

- 5ページ専用DB model。
- Route Bの独立商品化。
- 5ページを固定PDF artifactとして扱うこと。
- Full Assessment automation。
- Route毎の高度なworkflow orchestration。
- Pilot学習用の高度analytics/dashboard。

## F. Product Lane Architecture Validation Input

| Business Use Case | Why | Information / Evidence | Required Connection | Current Fit | Gap | Proposed Product handling | Core change required? |
|---|---|---|---|---|---|---|---|
| FUTURE as management future state | IT理想ではなく会社の将来像が比較基準 | Customer wording, horizon, trigger, management expectation | Future ↔ current context ↔ Gap / Decision | PARTIAL FIT | Future itself UNKNOWNの表現とFeedback projection | Diagnosis Future/Unknown projection。KPIとは分離 | **No** |
| WHY explainability | 断定せず仮説と検証条件を説明 | Hypothesis, observations, source refs, evidence needed | Hypothesis → Observation → Evidence Needed | PARTIAL FIT | explicit association/view不足 | Diagnosis relation/projectionで実装 | **No** |
| Management Feedback Decision Route | Assessment営業化を防ぐ | route, decider, time, reason, next action | Feedback snapshot → Human Decision → next work | GAP | A/B/C/D selection/result recordなし | Business labelsはTranslation。generic decision outcome + refsとしてApplicationで保持 | **No** |
| Decision-time epistemic snapshot | 後から「何を根拠に決めたか」を追う | approved refs, unknown refs, evidence-needed refs, report version | Decision → exact context snapshot | PARTIAL FIT | route decisionとのbinding不足 | immutable snapshot/reference set | **No** |
| Diagnosis → Assessment continuity | 二重入力防止・provenance維持 | Future, approved insights, unknowns, evidence candidates | Diagnosis Handoff → Assessment Context | PARTIAL FIT | consumer/runtime未完成 | existing Handoffをconsume。semantic type維持 | **No** |
| Assessment → FACTACT | 診断資料で終わらせず実行・検証へ | verified Fact/Evidence, Decision, Actor, Expected Change | Assessment → Decision → Work/Action → Change → Verify → Fact | PARTIAL FIT | mapping/runtime evidenceなし | Product mapping / integration contractを定義 | **No at present / validate** |
| Typed temporal semantics | 約束・期限・確認・再開を潰さない | date/time + meaning + owner/source | Decision/Work/Action/Change/Review ↔ typed time | GAP | shared canonical contract不足 | Product LaneでTemporal intent / commitment semanticsをFit-Gap | **Unknown** |
| Pilot evidence / timing | Customer Journey改善をFACTで判断 | AI suggestion, corrections, approval, route, restatement, durations, re-entry | lifecycle events → coded pilot evidence | PARTIAL FIT | duration/re-entry/route/restatement不足 | Audit/event projection + derived metrics。Raw PIIを学習eventへ複製しない | **No** |

## Additional repository governance finding

**CONFLICT — document numbering only, not Architecture.**

Business Lane `main` は `docs/67〜69` を新しいBusiness Journey文書として使用している。一方、Development branch `dev/controlled-pilot-closure-v2` では既に別内容の `docs/67〜70` をTechnical Policy / progress記録として使用している。

このままDevelopment branchをmainへmergeするとpath conflict / canonical ambiguityが発生する。Business文書の内容を変更せず、merge前にDevelopment側progress docsを未使用番号へrenameする必要がある。

これはCore Architecture ConflictではなくSSOT document namespace conflictである。

## Decision / Next Step

- **Architecture redesign: NOT REQUIRED at this stage.**
- **New FACTACT Core Object: NOT REQUIRED at this stage.**
- Diagnosis Application/Translation Layerの小さな追加でS社Management Feedback Pilotの主要Gapを閉じられる。
- Typed temporal semanticsのみProduct LaneへArchitecture Validation Inputとして返す。
- Assessment → FACTACT mappingはProduct Laneでcontract validationを行い、現行Coreで成立しない具体的Evidenceが出た場合のみCore changeをHuman Decisionへ戻す。
- Production/Pilot GOは本Fit-Gapと独立。External Evidence / Privacy-Legal / Cloud / Provider / staging gatesは従来どおりNO-GO判定を維持する。
