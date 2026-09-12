# 無料 IT経営診断 Development Canonical v1.0

Status: **CANONICAL — DEVELOPMENT / MVP DESIGN**

この文書は、IT経営KAIZEN「無料 IT経営診断システム」のMVP開発における画面、データ、状態遷移、AI責任境界、Human Review、Assessment Handoff、技術設計原則、実装順序を固定する。

Business / Service Canonicalを変更する文書ではない。サービス名、価格、診断思想、無料診断とAssessmentの価値境界、FACT FIRST、Human Decision、技術×運用×管理、6つの改善視点、Web First等を変更する必要が生じた場合は **Business Decision Required** としてBusiness Laneへ戻す。

参照すべき上位Canonical：

- `17-it-management-kaizen-business-service-canonical-v1.md`
- `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
- `19-free-it-management-diagnosis-channel-flows-v1.md`
- `20-it-management-kaizen-factact-consistency-principles-v1.md`
- `21-free-it-management-diagnosis-operating-model-v1.md`
- `00-product-vision.md`
- `01-core-prd.md`
- `03-operational-context.md`
- `12-factact-join-ux-golden-flow.md`
- `13-factact-product-ux-architecture.md`

---

## 1. Development 原則

以下をMVP実装でも崩さない。

> **FACT FIRST.**
>
> **分からないことを、分かったことにしない。**
>
> **AI Suggests. Human Decides. System Records.**
>
> **KAIZENするために、KAIZENのための仕事を増やさない。**
>
> **Future → Fact → Gap → Root Cause → KAIZEN.**
>
> **Web First. Same Method. Different Entry.**

無料診断は、アンケートとヒアリングを中心に **可能性を発見する工程** である。

有料の `IT経営KAIZEN 設計Assessment` は、必要なEvidenceを収集・確認・分析し、FACT / UNKNOWNで現在地を形成して **次の一手を経営判断できる状態まで設計する工程** である。

無料診断を簡易Assessment化しない。

---

## 2. MVP完成条件

MVPは、実顧客1社を次の一連の流れで完了できることを完成条件とする。

> 申込 → 事前アンケート → AI事前整理 → Humanによる診断Plan確定 → 60分診断 → AI診断後整理 → Human Review → 無料診断レポート → Human承認 → 経営フィードバック → Assessment提案 → Assessment Handoff

便利機能を増やすことではなく、**Business Canonicalの責任境界を保ったままEnd-to-Endで運用可能であること** をMVPの基準とする。

---

## 3. MVP画面構成

### Customer side

#### C-01 申込

- 会社・担当者・連絡先等を取得
- Diagnosis Caseを生成
- `entry_channel = WEB`
- 申込情報と診断回答を混同しない

#### C-02 事前アンケート

- Future First
- 3〜5分程度を基本
- 顧客にFACT / UNKNOWN等の内部用語を強制しない
- 回答を企業FACTへ変換しない
- 「分からない」を有効な回答として扱う

#### C-03 完了

- 60分診断では全質問を再度消化するのではなく、重点テーマを確認することを説明

### atLIB side

#### O-01 Diagnosis Case一覧

- Case状態
- Next Action
- 担当者
- 顧客
- 診断予定等

単なる件数Dashboardではなく、**次に何をすべきか** を中心にする。

#### O-02 Case Overview

Caseの中心画面。

- Future
- entry channel
- questionnaire status
- diagnosis status
-重点テーマ
- UNKNOWN
- Next Action
- report / feedback / Assessment status

#### O-03 Diagnosis Preparation

AI-01が提示した3〜5件の重点テーマ、UNKNOWN、Hypothesis、推奨質問、Evidence CandidateをHumanが確認する。

Humanは採用・修正・削除・追加・順序変更を行い、Diagnosis Planを確定する。

ここが最初のHuman Gateとなる。

#### O-04 60min Diagnosis Workspace

基本レイアウト：

- 左：Future / Diagnosis Plan / Priority Themes
- 中央：Conversation / Statements / Notes / 確認内容
- 右：AI Assist

AIは質問候補や確認不足を提案できるが、質問するかどうかはHumanが決める。

Human action例：

- Ask
- Later
- Unnecessary

顧客発言と担当者メモ・Observationを分離して保存する。

#### O-05 Human Review Workspace

AI-03が整理した内容をHumanがレビューする。

対象：

- Observation
- UNKNOWN
- Hypothesis
- Gap Candidate
- Root Cause Hypothesis
- KAIZEN Direction
- Evidence Candidate
- Assessment確認項目

Human action：

- Approve
- Approve with Edit
- Convert to UNKNOWN
- Reject / Delete

**Human Approved ≠ FACT** である。

例：

- `semantic_type = HYPOTHESIS`
- `review_status = HUMAN_APPROVED`

は「顧客レポートでHypothesisとして利用してよい」という意味であり、企業FACTとして確認されたという意味ではない。

#### O-06 Report / Feedback / Assessment Handoff

- 承認済み情報のみからレポート生成
- Humanが編集・承認
- 経営フィードバック記録
- Assessment提案状況記録
- Assessment受注時にHandoff Snapshot生成

---

## 4. 診断ドメインの情報モデル

MVPではDiagnosis DomainをFACTACT Coreから分離する。

**Diagnosis-specificな万能Factテーブルを作らない。**

主要Entity：

- Organization
- DiagnosisCase
- Participant
- SurveyQuestion
- SurveyResponse
- Future
- DiagnosisTheme
- DiagnosisPlanItem
- SourceRecord
- AIExecution
- AIProposal
- DiagnosisInsight
- HumanReview
- DiagnosisReport
- AssessmentHandoff
- CaseTransition
- AuditLog

### DiagnosisCase

Aggregate Root。

主な属性：

- id
- organization_id
- entry_channel
- diagnosis_status
- assessment_status
- owner_id
- current_next_action
- created_at / updated_at

### SurveyResponse

顧客の生回答を保持する。

- question_id
- question_version
- respondent
- raw_value
- entry_channel
- entered_by
- answered_at

**SurveyResponseをFACTへ直接変換しない。**

### Future

Futureは企業の客観FACTではなく、経営者・顧客が目指す意図・方向性として扱う。

推奨status：

- `SURVEY_STATED`
- `INTERVIEW_RECONFIRMED`

主な属性：

- statement
- time_horizon
- intent_status
- source_record_id
- reconfirmed_by
- reconfirmed_at

`CONFIRMED`という単独表現はFACTとの混同を避けるため使用しない。

### SourceRecord

Raw Sourceを保持する。

source type例：

- SURVEY_STATEMENT
- INTERVIEW_STATEMENT
- OPERATOR_NOTE
- SALES_NOTE
- TRANSCRIPT
- FEEDBACK_STATEMENT
- SCREEN_SHARED_INFORMATION
- DOCUMENT_EXISTENCE_OBSERVED

Raw SourceをAI要約で上書きしない。

### AIProposal

AIの提案を保持する。

proposal type例：

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

AIProposalはそのまま顧客向け結果にはならない。

### DiagnosisInsight

Human Review後に診断で使用可能となった構造化情報。

semantic type例：

- OBSERVATION
- UNKNOWN
- HYPOTHESIS
- GAP_CANDIDATE
- ROOT_CAUSE_HYPOTHESIS
- KAIZEN_DIRECTION
- EVIDENCE_CANDIDATE

`review_status` はsemantic typeと独立させる。

例：

- DRAFT
- HUMAN_APPROVED
- REJECTED
- SUPERSEDED

### UNKNOWN

UNKNOWNはDB NULLではない。

必要に応じ以下を区別する。

- NOT_YET_CONFIRMED
- UNRESOLVED
- CONTRADICTORY
- NOT_REQUIRED_NOW

UNKNOWNを残したまま診断・レポート・Assessment Handoffへ進める。

---

## 5. Evidence境界

無料診断では、Evidenceの提出依頼・収集・内容分析・FACT形成を通常工程としない。

無料診断の基本到達点は：

> **Evidence Candidate / Assessment確認項目**

である。

### Evidenceが自発的に提示された場合

顧客が無料診断中に台帳、管理表、手順書、規程、システム画面等を自発的に提示した場合、記録してよいFACTは原則として：

> **「そのEvidenceが存在することを確認した」**

という存在確認である。

例：

- 「端末管理台帳が存在することを確認した」
- 「キッティング手順書が存在することを確認した」
- 「管理画面が存在することを画面共有で確認した」

ただし無料診断では以下を確定しない。

- 最新である
- 正確である
- 実態と一致している
- 運用されている
- Future実現に十分である

これらはAssessmentでEvidence内容を確認・分析する。

> **Evidenceが存在することは確認できる。Evidenceが何を証明するかはAssessmentで確認する。**

MVPではEvidence Analysis / Confirmed Fact生成機能を無料診断の通常フローに持たない。

---

## 6. Diagnosis Case 状態遷移

Diagnosis lifecycleとAssessment sales lifecycleを分離する。

### Diagnosis status

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

Assessment受注可否をDiagnosis statusへ混在させない。

### Assessment status

別fieldで管理する。

- NOT_PROPOSED
- PROPOSED
- PENDING
- ACCEPTED
- DECLINED

`ACCEPTED` 時にAssessmentHandoffを生成する。

### Case StateとNext Action

Case StateとNext Actionは別物として扱う。

例：

- state = HUMAN_REVIEW_REQUIRED
- next_action = 「AI整理結果を確認してください」

待ち理由もState増殖ではなく別属性で管理する。

### AIProposal state

- GENERATED
- UNDER_REVIEW
- ACCEPTED
- ACCEPTED_WITH_EDIT
- REJECTED

Accepted AIProposalはHuman Reviewed Insightを生成できるが、自動的にFACTにはならない。

### DiagnosisInsight state

- DRAFT
- HUMAN_APPROVED
- SUPERSEDED
- REJECTED

### Report state

- DRAFT
- REVIEW_REQUIRED
- REVISION_REQUIRED
- APPROVED
- DELIVERED

### AssessmentHandoff state

- DRAFT
- READY
- TRANSFERRED
- ACCEPTED

---

## 7. System Guards

MVPで以下をBackend Guardとして実装し、自動テストする。

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

---

## 8. AI Processing

MVPのAI処理は4つに限定する。

### AI-01 Pre-Diagnosis Organizer

入力：

- SurveyResponse
- Future statement
- Case context

出力：

- 3〜5 priority themes
- Futureとの関係
- supporting sources
- 現在分かっていること
- UNKNOWN
- Hypothesis
- recommended questions
- Evidence Candidate
- why it matters

点数・成熟度スコアを使わない。

### AI-02 Interview Assistant

MVPではHuman-triggeredを基本とする。

提案type例：

- FOLLOW_UP
- CLARIFY
- CHECK_UNKNOWN
- CHECK_CONTRADICTION
- NEW_THEME

Humanが Ask / Later / Unnecessary を決める。

### AI-03 Post-Diagnosis Structurer

入力：

- Survey responses
- Human-confirmed Diagnosis Plan
- SourceRecords
- Future

出力：

- Observation
- UNKNOWN
- Hypothesis
- Gap Candidate
- Root Cause Hypothesis
- KAIZEN Direction
- Evidence Candidate
- Assessment confirmation items

各出力はSourceへtraceできること。

AI-03 output schemaには `FACT` / `CONFIRMED_FACT` を含めない。

### AI-04 Report Draft Generator

入力はHuman Approved情報に限定する。

Raw transcript、未承認AI Proposal、Rejected内容を直接渡さない。

レポート基本構成：

1. 実現したい会社の未来
2. 現在分かっていること / 現時点で分からないこと
3. Futureとの差（Gapの可能性）
4. Root Cause仮説 / KAIZENの方向性
5. 次に確認・判断すべきこと

断定表現、成熟度スコア、固定ROI、確定ロードマップを生成しない。

### Assessment HandoffにAI-05を置かない

Human Review済み情報を再度AIに解釈させない。

> **Human Approved Diagnosis Context → deterministic System Snapshot → Assessment Handoff**

とする。

---

## 9. AI共通責任ポリシー

全AI処理で共通の `FreeDiagnosisAiPolicy` を適用する。

AIができること：

- テーマ提案
- 質問提案
- UNKNOWN抽出
- Hypothesis提案
- 情報分類
- Gap Candidate提案
- Root Cause Hypothesis提案
- KAIZEN Direction提案
- Evidence Candidate提案
- Report draft

AIが単独でできないこと：

- 企業FACT確定
- Root Cause確定
- 経営Decision確定
- Evidenceの真偽・内容確定
- Report最終承認

> **AI Suggests. Human Decides. System Records.**

---

## 10. AI Context Boundary

AI責任境界をPromptだけに依存させない。

`AiContextBuilder` 等で、各AI Processへ渡す情報をSystem側で限定する。

特にReport Generatorには原則として：

- INTERVIEW_RECONFIRMED Future
- Human Approved DiagnosisInsight
- approved Assessment confirmation items

のみを渡す。

Raw transcript、unreviewed proposal、rejected proposal等を渡して新しい診断結論を作らせない。

---

## 11. Human Review

Human Reviewは省略不可。

最低限のHuman Gates：

1. Diagnosis Plan確定
2. Post-Diagnosis AI整理レビュー
3. Report最終承認
4. Assessment proposal / acceptance判断

Human ReviewのDecisionをAudit可能にする。

Review記録例：

- reviewer
- decision
- before
- after
- reason
- reviewed_at

---

## 12. Assessment Handoff

無料診断とAssessmentを情報を捨ててやり直す別プロセスにしない。

Handoff対象：

- Future
- Respondent Statement
- Observation
- UNKNOWN
- Hypothesis
- Gap Candidate
- Root Cause Hypothesis
- Evidence Candidate
- Evidence existence observation
- Assessment確認項目

これらを **元のsemantic meaningのまま** 引き継ぐ。

Handoff時にHypothesisをFACTへ変換しない。

Assessment開始後にEvidenceを確認した結果、各情報は：

- FACTになる
- 棄却される
- UNKNOWNのまま残る
- 追加Evidenceが必要となる

可能性がある。

Diagnosis → Assessment Handoff → Domain Mapping → FACTACT Domain

とし、DiagnosisInsightをFACTACT Factへ直接INSERTしない。

---

## 13. Technical Architecture Invariants

MVPは **Modular Monolith** を基本アーキテクチャとする。

理由：

- Human Gateと状態遷移を一貫して守りやすい
- Transaction境界が明確
- Auditを統一しやすい
- MVP開発速度を落とさない

ただし以下の技術製品選定はCanonical化しない。ADRで決定する。

- Next.js等のFrontend / Fullstack framework
- ORM
- Queue実装
- Cloud provider
- Authentication SDK / product
- AI provider

Canonicalとして固定する技術的不変条件：

- Modular Monolith
- Diagnosis DomainをFACTACT Coreから分離
- Raw Source / AI Proposal / Human Reviewed Insightを物理的・論理的に分離
- AI Provider Adapter
- Context Builder
- Backend Guards
- Structured AI Output
- Async AI execution
- Human fallback
- Assessment Handoff boundary
- Auditability

---

## 14. Application Commands

重要な状態変更はgeneric CRUD PATCHではなく、意味のあるCommandとして扱う。

例：

- CreateDiagnosisCase
- SubmitSurvey
- ConfirmDiagnosisPlan
- StartDiagnosis
- FinishDiagnosis
- ApproveAiProposal
- RejectAiProposal
- CompleteHumanReview
- GenerateReportDraft
- ApproveReport
- RecordFeedback
- ProposeAssessment
- AcceptAssessment
- CreateAssessmentHandoff

UIからDBを直接更新しない。

---

## 15. AI Execution / Failure Handling

AI処理は同期UIに密結合しない。

AIExecution state例：

- PENDING
- RUNNING
- SUCCEEDED
- FAILED

保持する情報：

- process type
- model/provider
- prompt version
- input snapshot/reference
- raw structured output
- status
- started_at / completed_at

AI失敗時もCaseを壊さず、Human-onlyで継続できる。

Retryは旧実行を上書きせず、別Executionとして記録する。

---

## 16. Auth / Security

MVP最低要件：

- internal user authentication
- ADMIN / DIAGNOSIS_OPERATOR程度の最小role
- backend capability check
- customer surveyは期限付きtoken URL等の軽量方式
- token hash / expiry / revoke
- TLS
- encryption at rest
- secret management
- audit log
- AIへ送信するPIIの最小化
- production logsへ不要なfull prompt / sensitive contentを出さない

---

## 17. Report

ReportのCanonical dataは構造化 `content_json` 等で保持し、HTMLだけを唯一の保存形式にしない。

Report approval時にはSnapshotをfreezeする。

Snapshot例：

- Future version
- Insight IDs / versions
- source references
- prompt version
- approver
- approved_at

MVPのPDF化はWeb rendering + print等の簡易方式でもよい。

---

## 18. MVP Scope

### P0 / MUST

- Case creation / list / overview
- Web application
- customer questionnaire
- sales visit proxy input
- SurveyResponse raw preservation
- Future
- SourceRecord
- AI-01
- Diagnosis Preparation
- 60min Workspace
- AI-03
- Human Review
- AI-04
- Report edit / approval
- Feedback
- Assessment status
- Assessment Handoff
- State Machine
- Backend Guards
- AIExecution
- Audit
- Auth

### P1

- AI-02 Interview Assistant
- detailed evidence-existence observation support
- optimistic locking
- detailed Next Action
- audit UI

### P2 / Later

- Meet / Teams transcript integration
- realtime voice AI
- speaker identification
- file upload / document analysis / OCR
- customer portal
- CRM / email / calendar integration
- automatic FACTACT sync
- analytics dashboard
- AI quality dashboard

### NOT MVP

- maturity score
- radar chart
- huge fixed questionnaire
- fully automated diagnosis
- automatic final report approval
- free diagnosis Evidence analysis
- free diagnosis FACT formation
- detailed fixed ROI
- final roadmap automation
- generic universal Fact Registry
- generic knowledge graph
- FACTACT Work/Change/Verify/Commit engine duplication
- billing / SLA engine

---

## 19. Implementation Vertical Slices

### Slice 1 — Customer Response

- DiagnosisCase
- application
- questionnaire
- Future
- SurveyResponse
- SourceRecord

### Slice 2 — Diagnosis Preparation

- AI foundation
- AI-01
- DiagnosisTheme
- DiagnosisPlan
- Human Plan confirmation

### Slice 3 — 60-minute Diagnosis

- Diagnosis Workspace
- statements / notes
- SourceRecord
- optional AI-02

### Slice 4 — Responsible Structuring

- AI-03
- AIProposal
- DiagnosisInsight
- Human Review
- UNKNOWN preservation

### Slice 5 — Customer-facing Report

- AI-04
- report editor
- Human approval
- report snapshot

### Slice 6 — Sales Completion / Assessment Handoff

- feedback
- assessment status
- deterministic Handoff Snapshot
- audit

---

## 20. Minimum Automated Tests

最低限、以下を自動テストする。

1. Customer response does not become FACT
2. AIProposal cannot directly enter Report
3. Unapproved Insight cannot enter Report
4. AI schema cannot produce FACT / CONFIRMED_FACT
5. UNKNOWN can remain through Report and Handoff
6. Rejected Hypothesis cannot enter Report
7. Assessment Handoff does not promote Hypothesis to FACT
8. Free diagnosis Evidence Candidate does not trigger Evidence analysis automatically
9. Evidence existence observation does not imply content validity
10. AI failure permits Human-only continuation
11. Diagnosis status and Assessment status are independent
12. Report approval freezes approved context snapshot

---

## 21. Implementation-ready Artifacts to Create Next

本Canonical確定後、以下の順で実装仕様を作る。

1. **ERD / Data Model detail**
2. **State Transition / Guard detail**
3. **API / Application Command specification**
4. **AI JSON Schema / Prompt Contract**
5. **Screen Wireframe / Interaction specification**
6. **ADR for concrete technology choices**
7. **Implementation backlog / task breakdown**
8. **MVP implementation**

各成果物はこのCanonicalおよびBusiness Canonicalに反してはならない。

---

## 22. Development Decision Rule

開発中に以下の変更が必要になった場合、実装都合で勝手に変更しない。

- 無料診断の役割
- Assessmentとの境界
- Evidenceの扱い
- FACT FIRST
- Human Review
- AI responsibility
- Future First
- 技術 × 運用 × 管理
- 6つの改善視点
- Web First / Sales Visitの同一Method
- FACTACTとの役割境界

これらは **Business Decision Required** としてBusiness Laneへ戻す。

一方、上記原則を変えない範囲の画面配置、API形状、DB index、具体技術製品、UI component等はDevelopment Laneで決定できる。
