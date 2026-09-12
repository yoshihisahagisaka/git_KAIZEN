# 無料 IT経営診断 Implementation Specification v1.0

Status: **CANONICAL IMPLEMENTATION SPECIFICATION**

この文書は、`22-free-it-management-diagnosis-development-canonical-v1.md` を実装可能な粒度へ落とした詳細仕様である。ERD / Data Model、Application Commands / API、AI JSON Schema / Context Builder、UI Wireframe / Interaction、State Guards、表示ルール、Acceptance Testsを定義する。

上位Canonicalを変更しない。Business / Service / Evidence境界に変更が必要な場合は **Business Decision Required** とする。

参照優先順位：

1. `17-it-management-kaizen-business-service-canonical-v1.md`
2. `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
3. `19-free-it-management-diagnosis-channel-flows-v1.md`
4. `20-it-management-kaizen-factact-consistency-principles-v1.md`
5. `21-free-it-management-diagnosis-operating-model-v1.md`
6. `22-free-it-management-diagnosis-development-canonical-v1.md`
7. 本文書

---

## 1. 表示・命名ルール

### 1.1 顧客会社名

DBには正式な会社名のみ保存する。

例：

- stored: `ABC株式会社`
- display: `ABC株式会社様`

顧客会社名を画面、レポート、Assessment関連表示に出す場合、原則として表示層で `様` を付与する。`様` をOrganization.nameへ保存しない。

### 1.2 提供会社名

提供会社名は常に：

> **atLIB株式会社**

と表示する。

`atLIB` 単独を顧客向け提供会社名として使用しない。

---

## 2. 実装アーキテクチャ原則

MVPはModular Monolithを基本とする。特定Framework / ORM / Hosting / Queue製品は本仕様では固定せず、ADRで決定する。

必須構造：

- Diagnosis DomainをFACTACT Coreから分離
- Raw Source / AI Proposal / Human Reviewed Insightを物理的・概念的に分離
- AI Provider Adapter
- AI Context Builder
- Backend Guard
- Audit / Decision traceability
- Assessment Handoff boundary
- AI failure時のHuman-only fallback
- Structured AI Output validation
- Asynchronous AI execution

DiagnosisからFACTACT Domainへ直接 authoritative data を書き込まない。

> Diagnosis → Assessment Handoff → Assessment / Mapping → FACTACT

---

## 3. ERD / Data Model

### 3.1 Aggregate Root

`DiagnosisCase` をAggregate Rootとする。

主要Entity：

- Organization
- DiagnosisCase
- Participant
- ParticipantRole
- SurveyQuestion
- SurveyResponse
- Future
- DiagnosisTheme
- DiagnosisPlanItem
- SourceRecord
- AIExecution
- AIProposal
- AIProposalSource
- DiagnosisInsight
- InsightSource
- HumanReview
- AssessmentConfirmationItem
- DiagnosisReport
- AssessmentHandoff
- CaseTransition
- AuditLog

### 3.2 Organization

主要field：

- id
- name
- corporate_number nullable
- created_at
- updated_at

表示時のみ会社名へ `様` を付与する。

### 3.3 DiagnosisCase

主要field：

- id
- organization_id
- entry_channel: `WEB | SALES_VISIT`
- diagnosis_status
- assessment_status
- owner_user_id nullable
- current_next_action nullable
- waiting_reason nullable
- scheduled_at nullable
- started_at nullable
- completed_at nullable
- version
- created_at
- updated_at

`version` はOptimistic Lockに使用する。

### 3.4 Participant / ParticipantRole

Participantは人を表し、Roleは複数付与可能とする。

Role例：

- RESPONDENT
- INTERVIEWEE
- EXECUTIVE
- SALES
- DIAGNOSIS_OPERATOR
- FEEDBACK_PARTICIPANT

### 3.5 SurveyQuestion

- id
- question_code
- version
- display_order
- question_text
- answer_type
- options_json
- is_required
- is_active

文章変更時はversionを上げ、question_codeは継続する。

### 3.6 SurveyResponse

Raw回答として保存する。

- id
- diagnosis_case_id
- question_id
- question_version
- respondent_participant_id nullable
- raw_value_json
- entry_channel
- entered_by_user_id nullable
- answered_at
- created_at

SurveyResponseにFACT、confidence、semantic_typeを付与しない。

### 3.7 Future

Futureは企業の客観FACTではなく、顧客・経営者の意図として扱う。

- id
- diagnosis_case_id
- statement
- time_horizon
- intent_status: `SURVEY_STATED | INTERVIEW_RECONFIRMED`
- source_ref_type
- source_ref_id
- reconfirmed_by_participant_id nullable
- reconfirmed_by_user_id nullable
- reconfirmed_at nullable
- is_current
- version
- created_at
- updated_at

Futureは履歴を残し、上書きで消さない。

### 3.8 SourceRecord

Raw Sourceを保存する。

source_type：

- INTERVIEW_STATEMENT
- OPERATOR_NOTE
- SALES_NOTE
- TRANSCRIPT
- FEEDBACK_STATEMENT
- SCREEN_SHARED_INFORMATION
- DOCUMENT_EXISTENCE_OBSERVED

主要field：

- id
- diagnosis_case_id
- source_type
- speaker_participant_id nullable
- entered_by_user_id nullable
- content
- occurred_at nullable
- parent_source_record_id nullable
- external_reference nullable
- created_at

Raw SourceをAI要約で上書きしない。

### 3.9 共通Source Reference

SurveyResponseとSourceRecordを無理に統合・複製しない。

AIProposal / DiagnosisInsightの出典は以下の形式で参照する。

- source_ref_type: `SURVEY_RESPONSE | SOURCE_RECORD`
- source_ref_id
- relation_type: `SUPPORTS | CONTRADICTS | RELATED`

> One source, one record.

### 3.10 DiagnosisTheme

- id
- diagnosis_case_id
- title
- description nullable
- future_relation nullable
- priority_order
- status
- origin: `AI_PROPOSED | HUMAN_CREATED`
- created_by_ai_proposal_id nullable
- created_by_user_id nullable

### 3.11 DiagnosisPlanItem

- id
- diagnosis_case_id
- diagnosis_theme_id nullable
- item_type: `QUESTION | CONFIRMATION | FOLLOW_UP | EVIDENCE_CANDIDATE_CHECK`
- content
- priority_order
- status
- source_ai_proposal_id nullable
- created_by_user_id nullable

`EVIDENCE_CANDIDATE_CHECK` は存在・必要性の確認までであり、Evidence提出・内容分析を意味しない。

### 3.12 AIExecution

- id
- diagnosis_case_id
- process_type
- status: `PENDING | RUNNING | SUCCEEDED | FAILED`
- provider
- model
- prompt_version
- policy_version
- input_snapshot_json or hash
- raw_output_json nullable
- validation_result_json nullable
- error_message nullable
- started_at
- completed_at nullable
- created_at

System metadataはAIに生成させない。

### 3.13 AIProposal

proposal_type：

- THEME
- QUESTION
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- GAP_CANDIDATE
- ROOT_CAUSE_HYPOTHESIS
- KAIZEN_DIRECTION
- EVIDENCE_CANDIDATE
- REPORT_DRAFT

state：

- GENERATED
- UNDER_REVIEW
- ACCEPTED
- ACCEPTED_WITH_EDIT
- REJECTED

`FACT` / `CONFIRMED_FACT` はenumとして存在させない。

### 3.14 DiagnosisInsight

Human Review後に顧客向け診断Contextとして使用できる情報。

semantic_type：

- OBSERVATION
- UNKNOWN
- HYPOTHESIS
- GAP_CANDIDATE
- ROOT_CAUSE_HYPOTHESIS
- KAIZEN_DIRECTION
- EVIDENCE_CANDIDATE

review_status：

- DRAFT
- HUMAN_APPROVED
- REJECTED
- SUPERSEDED

Human ApprovedはFACTを意味しない。

UNKNOWNの場合は必要に応じ：

- NOT_YET_CONFIRMED
- UNRESOLVED
- CONTRADICTORY
- NOT_REQUIRED_NOW

を保持する。

### 3.15 AssessmentConfirmationItem

「何が分かっているか」と「Assessmentで次に何を確認するか」を分離する。

- id
- diagnosis_case_id
- diagnosis_theme_id nullable
- title
- purpose
- priority
- related_insight_id nullable
- related_evidence_candidate_id nullable
- source_ai_proposal_id nullable
- created_by_user_id nullable
- status: `OPEN | NOT_REQUIRED | HANDED_OFF`
- created_at
- updated_at

Assessment確認項目をDiagnosisInsightのsemantic_typeに混在させない。

### 3.16 HumanReview

- id
- diagnosis_case_id
- target_type
- target_id
- action
- before_json nullable
- after_json nullable
- reason nullable
- reviewed_by_user_id
- reviewed_at

Action例：

- APPROVE
- APPROVE_WITH_EDIT
- CONVERT_TO_UNKNOWN
- REJECT
- SUPERSEDE

### 3.17 DiagnosisReport

- id
- diagnosis_case_id
- version
- status: `DRAFT | REVIEW_REQUIRED | REVISION_REQUIRED | APPROVED | DELIVERED`
- content_json
- rendered_html nullable
- snapshot_json
- created_by
- approved_by nullable
- approved_at nullable
- delivered_at nullable
- created_at
- updated_at

`content_json` をCanonicalとし、HTML / PDF等はRender結果とする。

### 3.18 AssessmentHandoff

- id
- diagnosis_case_id
- status: `DRAFT | READY | TRANSFERRED | ACCEPTED`
- snapshot_json
- created_by
- created_at
- transferred_at nullable
- accepted_at nullable

Handoff時にsemantic typeを変更しない。

---

## 4. Evidence境界の実装

無料診断ではEvidence提出依頼・収集・内容分析・FACT形成を通常工程としない。

### 4.1 Evidenceが自発的に提示された場合

顧客が台帳、管理表、手順書、規程、システム画面等を自発的に提示した場合、`DOCUMENT_EXISTENCE_OBSERVED` などのSourceRecordとして：

> **そのEvidenceが存在したことを観察した**

という情報を保存してよい。

保存してはならない判断例：

- 最新である
- 正確である
- 実態と一致する
- 適切に運用されている
- Future実現に十分である

顧客レポートへ出す場合は、SourceRecordを直接出さず、Observationとして構造化しHuman Reviewを通す。

> **Evidenceが存在することは確認できる。Evidenceが何を証明するかはAssessmentで確認する。**

---

## 5. Diagnosis / Assessment State Machine

### 5.1 Diagnosis status

- APPLICATION_STARTED
- SURVEY_IN_PROGRESS
- SURVEY_COMPLETED
- PREPARATION_IN_PROGRESS
- READY_FOR_DIAGNOSIS
- DIAGNOSIS_IN_PROGRESS
- HUMAN_REVIEW_REQUIRED
- REPORT_REVIEW_REQUIRED
- REPORT_APPROVED
- FEEDBACK_PENDING
- FEEDBACK_COMPLETED
- CLOSED
- CANCELLED

### 5.2 Assessment status

- NOT_PROPOSED
- PROPOSED
- PENDING
- ACCEPTED
- DECLINED

Diagnosis lifecycleとAssessment営業statusを混在させない。

### 5.3 主要遷移

- APPLICATION_STARTED → SURVEY_IN_PROGRESS
- SURVEY_IN_PROGRESS → SURVEY_COMPLETED
- SURVEY_COMPLETED → PREPARATION_IN_PROGRESS
- PREPARATION_IN_PROGRESS → READY_FOR_DIAGNOSIS
- READY_FOR_DIAGNOSIS → DIAGNOSIS_IN_PROGRESS
- DIAGNOSIS_IN_PROGRESS → HUMAN_REVIEW_REQUIRED
- HUMAN_REVIEW_REQUIRED → REPORT_REVIEW_REQUIRED
- REPORT_REVIEW_REQUIRED → REPORT_APPROVED
- REPORT_APPROVED → FEEDBACK_PENDING
- FEEDBACK_PENDING → FEEDBACK_COMPLETED

Assessment提案は原則 `FEEDBACK_COMPLETED` 後にのみ可能とする。

Assessmentが `ACCEPTED` の場合はHandoffを生成し、Handoff Ready後にCaseをCLOSEDへ進められる。

Assessmentが `DECLINED` の場合はCaseをCLOSEDへ進められる。

PENDING中はCaseを閉じない。

AIの成功・失敗をDiagnosis business stateとして扱わない。

---

## 6. Application Commands / API

汎用PATCHでBusiness Decisionを変更しない。意味のあるCommandを使用する。

### 6.1 Case / Survey

- `CreateDiagnosisCase`
- `StartSurvey`
- `SubmitSurveyResponse`
- `CompleteSurvey`

例：

- `POST /diagnosis-cases`
- `POST /diagnosis-cases/{id}/survey/start`
- `PUT /diagnosis-cases/{id}/survey/responses/{questionCode}`
- `POST /diagnosis-cases/{id}/survey/complete`

### 6.2 Preparation

- `RunPreDiagnosisOrganizer`
- `StartDiagnosisPreparation`
- `AcceptThemeProposal`
- `EditAndAcceptThemeProposal`
- `RejectAIProposal`
- `CreateHumanTheme`
- `AddDiagnosisPlanItem`
- `ConfirmDiagnosisPlan`

`StartDiagnosisPreparation` が `SURVEY_COMPLETED → PREPARATION_IN_PROGRESS` を担当する。AI-01完了だけでCase Stateを進めない。

### 6.3 Diagnosis

- `StartDiagnosis`
- `AddInterviewStatement`
- `AddOperatorNote`
- `RecordEvidenceExistence`
- `RequestInterviewSuggestion`
- `ResolveInterviewSuggestion`
- `FinishDiagnosis`

`RecordEvidenceExistence` には正確性・最新性・verified等の入力fieldを持たせない。

### 6.4 Human Review

- `RunPostDiagnosisStructurer`
- `ApproveAIProposal`
- `ApproveAIProposalWithEdit`
- `ConvertProposalToUnknown`
- `RejectAIProposal`
- `CreateHumanInsight`
- `SupersedeInsight`
- `CreateAssessmentConfirmationItem`
- `CompleteHumanReview`

UNKNOWNを残したままHuman Reviewを完了できる。

### 6.5 Report

- `GenerateReportDraft`
- `UpdateReportWording`
- `RequestReportRevision`
- `ApproveReport`
- `MarkReportDelivered`

HumanがReport上で新しい診断判断を直接追加してHuman Reviewを迂回してはならない。意味を変える編集は先にDiagnosisInsightを作成・Human Approvedする。

### 6.6 Feedback / Assessment

- `StartFeedback`
- `RecordFeedbackStatement`
- `CompleteFeedback`
- `ProposeAssessment`
- `MarkAssessmentPending`
- `AcceptAssessment`
- `DeclineAssessment`
- `GenerateAssessmentHandoff`
- `TransferAssessmentHandoff`

Handoff生成はdeterministic System operationとし、AIを呼ばない。

---

## 7. Read Models

UI向けに以下のRead Modelを用意する。

- Case List
- Case Overview
- Survey
- Diagnosis Preparation
- Diagnosis Workspace
- Human Review Queue
- Report Review
- Timeline
- Assessment Handoff Detail

GET API例：

- `GET /diagnosis-cases`
- `GET /diagnosis-cases/{id}/overview`
- `GET /diagnosis-cases/{id}/workspace`
- `GET /diagnosis-cases/{id}/review`
- `GET /diagnosis-cases/{id}/report`
- `GET /diagnosis-cases/{id}/timeline`

---

## 8. AI Processing Contract

MVPのAI processは4つだけとする。

- AI-01 Pre-Diagnosis Organizer
- AI-02 Interview Assistant
- AI-03 Post-Diagnosis Structurer
- AI-04 Report Draft Generator

Assessment Handoff用AI processは持たない。

### 8.1 共通Policy

AIはSuggestion / Structuring Assistantである。

AIは以下をしてはならない：

- authoritative company FACTを作る
- customer statementをFACTへ変換する
- 不確実性を隠す
- EvidenceなしにUNKNOWNを解消する
- management Decisionを代行する
- maturity scoreを出す
- root causeを確定する
- implementation planを確定する

情報不足時は推測で埋めずUNKNOWNを返す。

> **AI Suggests. Human Decides. System Records.**

Policyは `FreeDiagnosisAiPolicy` としてversion管理する。

### 8.2 AI OutputとSystem Metadata

AIに返させるのは業務payloadのみとする。

AIに生成させない：

- case_id
- generated_at
- process_type
- model
- prompt_version

これらはAIExecutionが保持する。

### 8.3 AI-01 Output

主なoutput：

- themes 1〜5件
- future_relation
- why_it_matters
- currently_known
- unknowns
- hypotheses
- recommended_questions
- evidence_candidates

原則3〜5件だが、情報不足時に無理に3件作らせない。

禁止field / concept：

- score
- maturity
- rating
- fact
- confirmed_fact
- final_root_cause

### 8.4 AI-02 Output

suggestion_type：

- FOLLOW_UP
- CLARIFY
- CHECK_UNKNOWN
- CHECK_CONTRADICTION
- NEW_THEME

AI-02は質問・確認候補までとし、「御社は属人化している」等の確定表現をしない。

### 8.5 AI-03 Output semantic type

許可：

- OBSERVATION
- UNKNOWN
- HYPOTHESIS
- GAP_CANDIDATE
- ROOT_CAUSE_HYPOTHESIS
- KAIZEN_DIRECTION
- EVIDENCE_CANDIDATE

`FACT` / `CONFIRMED_FACT` / `DECISION` をSchemaへ含めない。

Assessment確認事項は別collectionとして返し、`AssessmentConfirmationItem` へHuman Review後に生成する。

### 8.6 技術×運用×管理 / 6つの改善視点

AI-03ではタグとして使用可能。

Area：

- 技術
- 運用
- 管理

Improvement Lens：

- なくす
- 自動化する
- 標準化する
- 任せる
- 残す
- 整える

スコア化しない。

### 8.7 AI-04 Context

AI-04へ渡せるのは原則：

- Current Future + intent_status
- HUMAN_APPROVED DiagnosisInsight
- HUMAN_APPROVEDなEvidence存在Observation
- AssessmentConfirmationItem

渡さない：

- Raw Transcript
- Unreviewed AIProposal
- Rejected AIProposal
- Rejected DiagnosisInsight

Futureが `SURVEY_STATED` のままでもレポート生成は可能だが、UI上で「アンケート回答時点」等を明示する。

### 8.8 AI-04 Report structure

1. 実現したい会社の未来
2. 現在分かっていること / 現時点で分からないこと
3. Futureとの差（Gapの可能性）
4. Root Cause仮説 / KAIZENの方向性
5. 次に確認・判断すべきこと

推奨表現：

- 〜の可能性があります
- 〜と考えられます
- 現時点では確認できていません
- Assessmentで確認する価値があります

禁止表現例：

- 御社は管理できていません
- 原因は〇〇です
- 〇〇を導入すべきです
- ○％改善します

### 8.9 Context Builder

最低限以下を分離する。

- `buildPreDiagnosisContext()`
- `buildInterviewAssistantContext()`
- `buildPostDiagnosisContext()`
- `buildReportContext()`

特にReport Contextは `review_status == HUMAN_APPROVED` をBackendでfilterし、未承認情報をAIへ渡さない。

### 8.10 Validator

必須check例：

- FACT / CONFIRMED_FACT出力 → reject
- score / maturity field → reject
- 不明なsource_ref → reject
- UNKNOWN without unknown_type → reject
- Reportの参照InsightがHUMAN_APPROVEDでない → reject

Validation failure時はAIExecutionをFAILEDとし、Human-only継続を可能にする。

Customer contentはuntrusted dataとして扱い、Prompt Injection境界を設ける。

---

## 9. Report Grounding

Reportの診断的文章はHuman Approved Insightへのreferenceを持つ。

ReportBlock例：

- text
- insight_refs[]

Humanは表現修正を行えるが、新しい診断判断・意味変更を直接Reportへ追加しない。

新しい判断が必要な場合：

> DiagnosisInsight作成 → Human Review → HUMAN_APPROVED → Reportへ反映

Report承認時は以下をSnapshotとしてfreezeする。

- Future version
- DiagnosisInsight IDs + versions
- AssessmentConfirmationItem IDs
- AI policy / prompt version
- Report content version

承認済みReportをsilent rewriteしない。

---

## 10. UI / Wireframe Specification

### 10.1 Customer side

#### C-01 申込

取得するのは会社・担当者・連絡先等の最低限情報。

顧客向け表示例：

- `ABC株式会社様`
- 提供：`atLIB株式会社`

#### C-02 事前アンケート

- Future First
- 3〜5分程度
- 進捗表示は可
- maturity score / radar chartなし
- 「分からない」を正式な回答として扱う
- FACT / UNKNOWN等の内部用語を顧客へ強制しない

#### C-03 完了

「60分診断では全質問を再消化するのではなく、Futureに対して重要なテーマを確認する」ことを説明する。

### 10.2 O-01 Diagnosis Cases

管理台帳よりNext Action中心。

表示：

- 顧客会社名 + 様
- Diagnosis status
- Next Action
- owner
- scheduled_at
- Assessment status

### 10.3 O-02 Case Overview

上段にFutureとNext Actionを置く。

表示例：

- `ABC株式会社様`
- `無料 IT経営診断`
- `提供：atLIB株式会社`

### 10.4 O-03 Diagnosis Preparation

AI Suggested ThemeをHumanが：

- 採用
- 修正して採用
- 不要
- Human追加

できる。

AI提案とHuman確定を視覚・ラベルの両方で区別する。

### 10.5 O-04 60min Diagnosis Workspace

3カラム：

- 左：Future / Plan / Priority Themes
- 中央：Conversation / Statement / Operator Note
- 右：AI Assist

質問消化率を主要KPIとして表示しない。

顧客発言とOperator Noteを明確に分離する。

Evidence存在記録UIには正確性・最新性・適切性の評価fieldを置かない。

### 10.6 O-05 Human Review

Review対象：

- Observation
- UNKNOWN
- Hypothesis
- Gap Candidate
- Root Cause Hypothesis
- KAIZEN Direction
- Evidence Candidate
- Assessment Confirmation Item

操作：

- Approve
- Edit & Approve
- Convert to UNKNOWN
- Reject

Source Traceabilityを参照可能にする。

### 10.7 O-06 Report / Feedback / Assessment

Tab例：

- Report
- Feedback
- Assessment

ReportはHuman Approved Contextのみから生成。

Feedbackで得た新情報はSourceRecordとして保存する。

Assessment受注時はHandoff内容を提示し、HypothesisがFACTへ変換されないことを明示する。

### 10.8 UI Semantic labels

色だけに依存しない。

例：

- `[AI] 仮説`
- `[Human Approved] 仮説`
- `[UNKNOWN] 未確認`
- `[Observed] 存在確認`

### 10.9 AI Failure UI

例：

> AIによる整理に失敗しました。診断はそのまま続行できます。

CTA：

- 再実行
- 手動で作成

AI不調で診断全体をロックしない。

---

## 11. Backend Guards

MVPでBackend Guard + automated testを必須とする。

1. Customer ResponseをFACTへ自動昇格しない
2. AIProposalを直接Reportへ出さない
3. Human未承認InsightをReportへ出さない
4. AI Output schemaにFACT / CONFIRMED_FACTを持たせない
5. UNKNOWNを残したまま工程を進められる
6. Rejected HypothesisをReportへ出さない
7. Report approval後に意味をsilent rewriteしない
8. Assessment HandoffでHypothesisをFACTへ昇格しない
9. AI failureでもHuman-only運用で継続できる
10. 無料診断内でEvidence分析・FACT形成を通常工程にしない
11. Evidence存在Observationから内容妥当性を自動推論しない
12. Report編集でHuman Reviewを迂回した新しい診断判断を追加できない
13. AI完了だけでCase business stateを進めない
14. Assessment提案は原則Feedback完了後
15. Assessment Handoffはdeterministic snapshotで生成する

---

## 12. MVPで作らないもの

- maturity score
- radar chart
- 企業ランキング
- fully automated diagnosis
- fully automated Assessment
- generic `facts` table
- Fact Registry
- Device / Application / Contract Registry
- Rule / Authority Engine
- FACTACT Work / Action / Change / Verify / Commit Engine
- customer portal
- advanced analytics
- realtime voice AI必須化
- file Evidence analysis / OCR
- CRM / email / calendar必須連携
- automatic FACTACT sync
- billing / SLA

---

## 13. Golden / Acceptance Tests

最低限以下を自動またはGolden Testとして固定する。

1. 顧客回答「全部管理できている」→ FACT化されない
2. 「誰が管理しているか分からない」→ UNKNOWNを保持
3. 「前任者しか分からない」→ 即座に属人化確定にしない
4. PC台帳を画面共有 → 台帳存在まで。最新・正確・一致は確定しない
5. 手作業が多い → 自動化のみへ短絡しない。6つの改善視点を候補化可能
6. AIProposalはHuman ReviewなしでReportへ入らない
7. Human Approved HypothesisはHypothesis表現のままReportへ入る
8. Rejected InsightはReport Contextへ入らない
9. UNKNOWNが残っていてもReport生成可能
10. AIはFACT / CONFIRMED_FACTを出力できない
11. Evidence存在ObservationがEvidence内容検証済みFACTへ変換されない
12. Assessment HandoffでHypothesis / UNKNOWNのsemantic typeが維持される
13. AI failure時もHuman-onlyでCaseを継続可能
14. Report上の意味変更はHuman Approved Insightなしでは承認できない
15. `SURVEY_STATED` FutureでもReport生成可能で、intent statusを保持する
16. AI-01失敗でもHumanがPreparationを作成できる
17. Assessment PENDING中はCaseを自動CLOSEDにしない
18. Customer company displayは `会社名 + 様`、provider displayは `atLIB株式会社`

---

## 14. 実装順序

Vertical Sliceで実装する。

### Slice 1 — Case / Application / Survey

- Organization
- DiagnosisCase
- Participant
- SurveyQuestion / SurveyResponse
- Future
- C-01〜C-03

### Slice 2 — Preparation

- AIExecution
- AI-01
- AIProposal
- DiagnosisTheme
- DiagnosisPlanItem
- Human Gate
- O-01〜O-03

### Slice 3 — 60min Diagnosis

- SourceRecord
- 3-column Workspace
- AI-02
- Evidence existence observation
- O-04

### Slice 4 — Structuring / Human Review

- AI-03
- DiagnosisInsight
- HumanReview
- AssessmentConfirmationItem
- O-05

### Slice 5 — Report / Feedback

- AI-04
- ReportBlock grounding
- DiagnosisReport
- Report approval snapshot
- Feedback SourceRecord

### Slice 6 — Assessment Handoff

- Assessment lifecycle
- deterministic AssessmentHandoff
- Audit / CaseTransition
- Close Guards

各SliceでDomain Guard testを先行または同時実装する。

---

## 15. Implementation Ready Definition

実装開始条件は以下が満たされていること。

- 上位Canonicalに矛盾しない
- 本仕様のERD / Commands / AI Contract / UIが参照可能
- AI責任境界がSchemaとContext Builderで強制される
- Human Reviewが迂回できない
- UNKNOWNが正式状態として扱える
- Evidence存在とEvidence内容評価が分離される
- Assessment HandoffがFACT昇格を行わない
- 顧客表示名ルールと提供会社名が固定される

本仕様に反する実装変更が必要な場合、単なるコード都合で吸収せず、Development Decisionとして再検討する。Business Canonicalに影響する場合はBusiness Laneへ戻す。
