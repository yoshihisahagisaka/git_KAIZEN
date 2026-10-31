# 無料 IT経営診断 Slice 3 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の **Slice 3 — 60min Diagnosis Workspace / SourceRecord / AI-02 Interview Assistant** を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

Slice 2は `atlib-sales-tools/main` commit `00500a14311901a9afa47db76bb16ea77a78093d` までで完了している。

> **FACT FIRST.**
>
> **AI Suggests. Human Decides. System Records.**
>
> **分からないことを、分かったことにしない。**

---

## 1. Codexが最初に読むSSOT

1. `docs/17-it-management-kaizen-business-service-canonical-v1.md`
2. `docs/18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
3. `docs/19-free-it-management-diagnosis-channel-flows-v1.md`
4. `docs/20-it-management-kaizen-factact-consistency-principles-v1.md`
5. `docs/21-free-it-management-diagnosis-operating-model-v1.md`
6. `docs/22-free-it-management-diagnosis-development-canonical-v1.md`
7. `docs/23-free-it-management-diagnosis-implementation-spec-v1.md`
8. `docs/24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md`
9. `docs/26-free-it-management-diagnosis-survey-v2-question-set-v1.md`
10. `docs/27-free-it-management-diagnosis-slice2-codex-implementation-handoff-v1.md`
11. 本文書

矛盾がある場合は上位Canonicalを優先し、解決不能ならコードで勝手に決めず報告する。

---

## 2. Slice 3 Goal

Slice 2で `READY_FOR_DIAGNOSIS` になったDiagnosis Caseを、実際の60分診断で使用できるWorkspaceとして次の状態まで進める。

```text
READY_FOR_DIAGNOSIS
  -> Humanが診断開始
  -> DIAGNOSIS_IN_PROGRESS
  -> Future / Diagnosis Plan / Priority Themesを見ながら対話
  -> Interview Statement / Operator NoteをRaw Sourceとして記録
  -> 必要時のみHumanがAI-02へ質問候補を要求
  -> AI-02 SuggestionをHumanが Ask / Later / Unnecessary で判断
  -> 顧客が自発的にEvidenceを提示した場合は存在のみ記録可能
  -> Humanが診断終了
  -> HUMAN_REVIEW_REQUIRED
```

Slice 3の完成点は **60分診断で得たRaw Sourceが意味を勝手に確定されず保存され、Humanが診断を終了してHuman Reviewへ渡せること** である。

---

## 3. Scope

### Implement

- `SourceRecord`
- O-04 60min Diagnosis Workspace
- `StartDiagnosis`
- `AddInterviewStatement`
- `AddOperatorNote`
- `RecordEvidenceExistence`
- AI-02 Interview Assistant
- `RequestInterviewSuggestion`
- `ResolveInterviewSuggestion`
- `FinishDiagnosis`
- Future再確認を行った場合の `INTERVIEW_RECONFIRMED` Future履歴
- Diagnosis Workspace Read Model
- Source traceability
- AI failure時のHuman-only continuation
- CaseTransition / AuditLog
- Golden Tests / browser tests

### Do not implement

- AI-03 Post-Diagnosis Structurer
- DiagnosisInsight
- Human Review Workspace O-05
- AssessmentConfirmationItem
- Report / AI-04
- Feedback
- Assessment Handoff
- FACTACT integration
- Evidence file upload / OCR / content analysis
- realtime voice AI必須化
- 自動診断 / 自動Root Cause確定

---

## 4. Responsibility Boundary

### Human / System may record as Raw Source

- 顧客の発言
- 担当者メモ
- Sales note（既存Sourceが必要な場合）
- Transcript（MVPでは貼付/入力等の非リアルタイム方式で可）
- 画面共有で見えた情報
- Evidenceが存在したという観察

Raw Sourceは **意味づけ前の記録** である。

### AI-02 may suggest

- `FOLLOW_UP`
- `CLARIFY`
- `CHECK_UNKNOWN`
- `CHECK_CONTRADICTION`
- `NEW_THEME`

AIは「次に何を確認すると価値があるか」を提案する。

### AI-02 must not establish

- FACT / CONFIRMED_FACT
- ObservationのHuman承認
- Root Cause確定
- Gap確定
- management Decision
- service recommendation as decided action
- Evidence validity / accuracy / currentness
- 「御社は属人化している」等の確定診断

### Human must decide

- AI suggestionを実際に質問するか
- Laterにするか
- Unnecessaryにするか
- 顧客発言をどう記録するか
- Operator Noteをどう記録するか
- Evidence存在を記録するか
- Futureを再確認したと扱うか
- 診断を終了するか

---

## 5. Persistence to Add / Extend

既存migrationを変更せず、新migrationを追加する。

推奨：`009_it_management_diagnosis_workspace.sql`

### source_records

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `source_type`
- `speaker_participant_id NULL FK`
- `entered_by_user_id NULL`
- `content TEXT NOT NULL`
- `occurred_at TIMESTAMPTZ NULL`
- `parent_source_record_id NULL FK`
- `external_reference NULL`
- timestamps

Slice 3で許可する `source_type`：

- `INTERVIEW_STATEMENT`
- `OPERATOR_NOTE`
- `TRANSCRIPT`
- `SCREEN_SHARED_INFORMATION`
- `DOCUMENT_EXISTENCE_OBSERVED`

将来の `SALES_NOTE` / `FEEDBACK_STATEMENT` を妨げない設計にする。

### AIExecution extension

既存 `ai_executions` を非破壊で拡張し、`process_type` に `INTERVIEW_ASSISTANT` を追加する。

AI-02も以下を保持する：

- provider / model
- prompt_version / policy_version
- input snapshot
- raw output
- validation status
- failure information
- timing

System metadataをAI outputへ含めない。

### AI-02 Suggestion persistence

既存 `AIProposal` を再利用することを基本とする。

- 通常の質問候補は `proposal_type = QUESTION`
- `NEW_THEME` は `proposal_type = THEME`
- AI-02固有の `suggestion_type` は `content_json.suggestion_type` に保持する
- `FOLLOW_UP / CLARIFY / CHECK_UNKNOWN / CHECK_CONTRADICTION` を新しいDiagnosis semantic typeへ昇格させない

Human resolution mapping：

- Ask -> `ACCEPTED`
- Later -> `UNDER_REVIEW`
- Unnecessary -> `REJECTED`

このstatusは「診断結果として承認した」ことを意味せず、**質問候補に対するHumanの運用判断**として扱う。AI-02 ProposalからDiagnosisInsightを生成しない。

AI-02のAIProposalには `ai_execution_id` とsource refsを保持する。

---

## 6. SourceRecord Rules

### 6.1 Interview Statement

顧客の発言をRaw Sourceとして保存する。

例：

> 「入社連絡が前日になることがあります」

これを保存しただけで：

- 入社プロセスが悪い
- 人事連携に問題がある
- 属人化している

等へ変換しない。

### 6.2 Operator Note

担当者のメモは顧客発言と別Recordにする。

例：

- Customer Statement: 「PC準備に1日かかります」
- Operator Note: 「作業工程の内訳を次回確認したい」

Operator Noteを顧客発言として扱わない。

### 6.3 Transcript

Transcriptを保存する場合もRaw Sourceであり、AI要約で上書きしない。

Transcriptから切り出したStatementを作る場合は `parent_source_record_id` 等でtraceabilityを維持する。

### 6.4 Evidence existence observation

顧客が自発的に台帳・管理表・手順書・規程・システム画面等を提示した場合のみ、存在を記録できる。

例：

> 「端末管理台帳が存在することを画面共有で確認した」

入力UI / APIには以下の評価fieldを持たせない：

- accurate
- current
- valid
- verified
- sufficient
- 運用されているか
- 実態と一致するか

> **Evidenceが存在することは確認できる。Evidenceが何を証明するかはAssessmentで確認する。**

Evidence提出依頼、ファイル収集、内容分析はSlice 3に入れない。

---

## 7. Future Reconfirmation

60分診断中にFutureを再確認した場合、既存Futureを上書きして履歴を消さない。

Human commandとして明示的に実行する。

推奨：`ReconfirmFuture`

Behavior：

- current Futureを履歴として保持
- 新versionを作成
- `intent_status = INTERVIEW_RECONFIRMED`
- 元Futureとのtraceabilityを保持
- reconfirmed_by_user_id / reconfirmed_atを記録
- AuditLog

単にWorkspaceを開いた、または顧客がFutureに触れただけで自動Reconfirmしない。

Futureが `SURVEY_STATED` のままでも診断を完了できる。

---

## 8. Case State / Commands

### StartDiagnosis

Precondition：

- Case = `READY_FOR_DIAGNOSIS`
- Human staff actor
- Human-confirmed Diagnosis Plan exists

Behavior：

- Case -> `DIAGNOSIS_IN_PROGRESS`
- started_atを必要に応じ記録
- CaseTransition / AuditLog

### AddInterviewStatement

Precondition：

- Case = `DIAGNOSIS_IN_PROGRESS`

Behavior：

- `INTERVIEW_STATEMENT` SourceRecord生成
- speakerを指定可能
- Raw Sourceのみ
- semantic classificationを付与しない

### AddOperatorNote

- `OPERATOR_NOTE` SourceRecord生成
- Customer Statementとは別Record

### RecordEvidenceExistence

- `DOCUMENT_EXISTENCE_OBSERVED` または適切な存在観察SourceRecordを生成
- 存在のみ記録
- 内容妥当性fieldなし

### RequestInterviewSuggestion

- Human-triggeredのみ
- AIExecutionを生成
- Context Builder -> Provider Adapter -> schema validation -> AIProposal保存
- AI成功だけではCase State / Theme / Plan / SourceRecord / Insightを変更しない

### ResolveInterviewSuggestion

Human action：

- `ASK`
- `LATER`
- `UNNECESSARY`

AI原文を上書きしない。

ASKは「この質問をすることをHumanが選んだ」という意味であり、回答や診断結果の承認ではない。

### FinishDiagnosis

Precondition：

- Case = `DIAGNOSIS_IN_PROGRESS`
- Human actor

Behavior：

- Case -> `HUMAN_REVIEW_REQUIRED`
- completed_at / diagnosis session completion informationを記録
- CaseTransition / AuditLog

UNKNOWNや未解決AI suggestionが残っていても完了可能。

質問消化率100%を完了条件にしない。

---

## 9. AI-02 Context Builder

明示的な関数境界を持つ。

推奨：

`buildInterviewAssistantContext(caseId)`

入力に含める：

- Current Future + intent_status
- Human-confirmed Diagnosis Plan snapshot/current plan
- Active DiagnosisTheme
- Raw SurveyResponse
- Slice 3で現在までに保存されたSourceRecord
- unresolved UNKNOWN / HypothesisのうちPreparation AIProposalとして参照価値があるもの
- 直近のHuman resolution済み/未解決AI-02 suggestion（重複質問防止に必要な最小限）

入力に含めない：

- legacy score / radar / suggested services
- FACTACT Fact
- Evidence content analysis
- rejected unrelated proposal
- customer access token / cookie / secret

顧客発言・Transcript・SurveyResponseはuntrusted contentとして扱う。

Contextは必要十分に絞り、毎回無制限に全Transcriptを送らない。MVPでは直近Source + Plan/Theme + Futureを中心にする。

---

## 10. AI-02 Output Contract

Structured JSONのみを正本とする。

推奨shape：

```json
{
  "suggestions": [
    {
      "suggestion_type": "FOLLOW_UP",
      "text": "string",
      "purpose": "string",
      "related_theme_id": "uuid-or-null",
      "source_refs": [
        {
          "source_ref_type": "SOURCE_RECORD",
          "source_ref_id": "uuid",
          "relation": "RELATED"
        }
      ]
    }
  ]
}
```

`suggestion_type`：

- `FOLLOW_UP`
- `CLARIFY`
- `CHECK_UNKNOWN`
- `CHECK_CONTRADICTION`
- `NEW_THEME`

Rules：

- 0〜5件。価値ある追加確認がなければ0件を許可
- 質問を作るためにUNKNOWNを無理に解消しない
- source refsは同一Caseの実在する `SURVEY_RESPONSE | SOURCE_RECORD` のみ
- `related_theme_id` は同一CaseのACTIVE Themeのみ
- FACT / CONFIRMED_FACT禁止
- score / maturity / rating禁止
- final_root_cause禁止
- Evidence妥当性評価禁止
- service recommendation禁止
- System metadata禁止

`NEW_THEME` もAIだけで正式DiagnosisThemeを生成しない。Humanが必要と判断した場合に別のHuman commandでTheme/Planへ反映する。

---

## 11. O-04 60min Diagnosis Workspace

既存admin UI / CSS / authを再利用する。

基本3カラム：

### Left — Context

- `会社名 + 様`
- 提供：`atLIB株式会社`
- Current Future + intent status
- Human-confirmed Diagnosis Plan
- Priority Themes
- Case status / Next Action

### Center — Conversation / Raw Source

明確に分離して入力・表示する：

- 顧客発言
- 担当者メモ
- Transcript（実装する場合）
- Evidence存在観察

各Recordにsource typeラベルを表示する。

Raw Sourceを `[FACT]` と表示しない。

### Right — AI Assist

- Humanが「AIに次の確認候補を聞く」操作を行う
- AI suggestion type
- suggestion text
- purpose
- source trace
- Human action：Ask / Later / Unnecessary
- AI failure時：再実行 / Human-onlyで継続

AI suggestionを自動で質問欄へ挿入・自動送信しない。

### UX guard

- 質問消化率を主要KPIにしない
- 「残り○問を全部聞く」ことを促さない
- Futureに対して重要な確認へ集中する
- UNKNOWNを残せる
- AI不調で画面をロックしない

---

## 12. Next Action Projection

推奨：

- `READY_FOR_DIAGNOSIS` -> `60分診断を開始してください`
- `DIAGNOSIS_IN_PROGRESS` -> `Futureに対して重要な点を確認し、診断を進めてください`
- `HUMAN_REVIEW_REQUIRED` -> `診断内容を整理し、Human Reviewを行ってください`

Next Actionを第二のstate machineにしない。

---

## 13. Backend Guards / Golden Tests

最低限以下を自動テストする。

1. `READY_FOR_DIAGNOSIS` 以外からStartDiagnosis不可
2. StartDiagnosisはHuman actor必須
3. Customer access tokenでWorkspace command不可
4. Interview Statement保存だけでFACT / Observation / Hypothesisを生成しない
5. Operator NoteをInterview Statementとして保存しない
6. Raw SourceをAI要約で上書きしない
7. AI-02はHuman-triggeredのみ
8. AI-02成功だけでCase stateが変わらない
9. AI-02成功だけでTheme / Plan / SourceRecord / DiagnosisInsightを生成しない
10. AI-02 outputにFACT / CONFIRMED_FACTを許可しない
11. score / maturity / ratingを許可しない
12. invalid cross-case source refをreject
13. invalid cross-case theme refをreject
14. AI failure後もSourceRecord追加・FinishDiagnosis可能
15. ASK resolutionは質問候補のHuman選択でありFACT/Insightを生成しない
16. LATER suggestionが残っていてもFinishDiagnosis可能
17. UNKNOWNが残っていてもFinishDiagnosis可能
18. Evidence存在記録からaccuracy/currentness/validityを生成しない
19. Evidence existence APIに評価fieldを受け付けない
20. Future reconfirmは明示Human commandのみ
21. `SURVEY_STATED` FutureのままFinishDiagnosis可能
22. FinishDiagnosisはHuman actor必須
23. FinishDiagnosisで `DIAGNOSIS_IN_PROGRESS -> HUMAN_REVIEW_REQUIRED`
24. customer company display = `会社名 + 様`
25. provider display = `atLIB株式会社`
26. legacy API / tables remain non-destructive

---

## 14. API Direction

既存admin namespace配下へ追加する。

推奨：

- `GET /api/admin/it-management-diagnosis/cases/:id/workspace`
- `POST /api/admin/it-management-diagnosis/cases/:id/diagnosis/start`
- `POST /api/admin/it-management-diagnosis/cases/:id/sources/interview-statements`
- `POST /api/admin/it-management-diagnosis/cases/:id/sources/operator-notes`
- `POST /api/admin/it-management-diagnosis/cases/:id/sources/evidence-existence`
- `POST /api/admin/it-management-diagnosis/cases/:id/future/reconfirm`
- `POST /api/admin/it-management-diagnosis/cases/:id/interview-assistant/run`
- `POST /api/admin/it-management-diagnosis/cases/:id/interview-assistant/proposals/:proposalId/resolve`
- `POST /api/admin/it-management-diagnosis/cases/:id/diagnosis/finish`

既存staff auth / command-header gate / rate limitを再利用する。

汎用PATCHでBusiness Stateを変更しない。

---

## 15. Concurrency / Audit

- Case transition commandはCase row lock + version / state guardを使用
- SourceRecord追加は同一Caseに紐づくことをDB/Repositoryで保証
- AI provider call中にDB transactionを保持しない
- AIExecutionはSlice 2のlease / timeout / recovery patternを再利用可能
- AI result保存時にCase stateが変わっていた場合はauthoritative objectへ反映しない
- Human commandはAuditLogへ記録
- AI original output / proposalをHuman操作でsilent rewriteしない

---

## 16. Existing Resource Reuse

Reuse First. Canonical First.

Slice 2から優先再利用：

- `DiagnosisPreparationRepo` のtransaction / lock / audit pattern
- `PreDiagnosisWorker` のasync execution / lease / timeout pattern
- AI Provider Adapter pattern
- structured JSON Schema + Zod validation pattern
- existing admin auth gate
- existing admin CSS / layout / JS patterns
- Case Overview / Preparation navigation

ただしSlice 2のPreparation semanticをそのままDiagnosis Source semanticへ流用しない。

`SurveyResponse`, `SourceRecord`, `AIProposal`, `DiagnosisTheme`, `DiagnosisPlanItem` の責任境界を維持する。

---

## 17. Slice 3 Non-Goals

- diagnosis score
- maturity score
- radar
- auto root cause
- auto KAIZEN plan
- auto service proposal
- realtime meeting bot必須化
- audio/video recording infrastructure
- Evidence upload/OCR/analysis
- DiagnosisInsight
- Human Approved diagnosis result
- Report
- Assessment
- FACTACT sync

---

## 18. Acceptance Criteria

Slice 3は以下を満たした時にImplementation Completeとする。

1. `READY_FOR_DIAGNOSIS` CaseをHumanが開始できる
2. 3-column WorkspaceでFuture / Plan / Raw Source / AI Assistを扱える
3. Interview StatementとOperator Noteが別SourceRecordとして保存される
4. Evidence存在のみを安全に記録できる
5. AI-02をHuman-triggeredで利用できる
6. AI suggestionをAsk / Later / UnnecessaryでHumanが判断できる
7. AI-02がauthoritative semanticを生成しない
8. AI failureでも診断を継続・終了できる
9. Future reconfirmが履歴を保って明示的に行える
10. HumanがFinishDiagnosisすると `HUMAN_REVIEW_REQUIRED` へ進む
11. UNKNOWN / unresolved suggestionが残っていても完了できる
12. Golden Tests / browser testsが通る
13. Slice 1 / Slice 2 regressionがない
14. legacy API / tableを破壊しない

---

## 19. Codex Implementation Instructions

実装先：

`yoshihisahagisaka/atlib-sales-tools`

base：

`main` at `00500a14311901a9afa47db76bb16ea77a78093d`

推奨feature branch：

`feat/it-management-diagnosis-slice3`

実装順：

1. current main / migrations / Slice 2 code確認
2. migration 009
3. SourceRecord Domain / Repository
4. Diagnosis start / finish commands
5. Workspace Read Model / API
6. O-04 UI
7. Future Reconfirm
8. AI-02 Context Builder / Provider / Validator / Worker
9. AI suggestion Human resolution
10. Golden Tests
11. browser / manual verification
12. implementation record
13. commit / push
14. mainへmergeせずレビュー待ち

Stop Conditions：

- Business Canonical変更が必要
- 無料診断とAssessmentのEvidence境界変更が必要
- AIにFACT確定権限を与える必要が生じた
- realtime meeting botを必須要件にしないと実装できない
- legacy systemを破壊的変更しないと実装できない

該当時は実装を止めて報告する。

---

## 20. Verification

最低限：

- `npm install`
- `npm run build`
- existing tests
- Slice 1 Golden Tests
- Slice 2 Golden Tests
- Slice 3 Golden Tests
- browser tests
- `git diff --check`

可能ならAI live testはenv設定時のみ実行し、未設定なら明示skipする。

---

## 21. Completion Report Format

Codex完了報告：

1. Summary
2. Files changed
3. Persistence / migration
4. SourceRecord boundary
5. Diagnosis state transition
6. Future reconfirm behavior
7. AI-02 Provider / schema / source validation
8. Human resolution behavior
9. Evidence existence boundary
10. Tests and results
11. Browser / manual verification
12. Remaining issues
13. Canonical deviations
14. Latest commit SHA

mainへmergeせず、feature branchへcommit / pushした状態でDevelopment Laneレビューを受ける。
