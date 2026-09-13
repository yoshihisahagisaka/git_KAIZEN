# 無料 IT経営診断 Slice 5 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の **Slice 5 — Report Draft / Report Grounding / Approval / Feedback** を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

Slice 4は `atlib-sales-tools/main` commit `632e9cd49f8208ec831a0299f650d444d120dd03` までで完了している。

> **FACT FIRST.**
>
> **AI Suggests. Human Decides. System Records.**
>
> **Human Approved ≠ FACT.**
>
> **ReportはHuman Approved ContextのProjectionであり、新しい診断判断を作る場所ではない。**

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
11. `docs/28-free-it-management-diagnosis-slice3-codex-implementation-handoff-v1.md`
12. `docs/29-free-it-management-diagnosis-slice4-codex-implementation-handoff-v1.md`
13. 本文書

矛盾がある場合は上位Canonicalを優先し、解決不能ならコードで勝手に決めず報告する。

---

## 2. Slice 5 Goal

Slice 4で `REPORT_REVIEW_REQUIRED` になったDiagnosis Caseを、Human Approved Contextだけから無料診断レポートを作成し、Human承認・Delivery・経営フィードバック開始まで進める。

```text
REPORT_REVIEW_REQUIRED
  -> HumanがAI-04 Report Draftを実行
  -> Human Approved ContextだけからDraft生成
  -> Report Review
  -> wording edit / revision
  -> HumanがReport承認
  -> REPORT_APPROVED
  -> Delivery
  -> FEEDBACK_PENDING
  -> HumanがFeedback開始
  -> FEEDBACK SourceRecordを記録
  -> HumanがFeedback完了
  -> FEEDBACK_COMPLETED
```

Slice 5の完成点は、**Human Approved ContextだけにGroundedされたReportがHuman承認され、Feedbackで得た新情報がRaw Sourceとして保存されること** である。

---

## 3. Scope

### Implement

- AI-04 Report Draft Generator
- `DiagnosisReport`
- Report content blocks + `insight_refs[]`
- `GenerateReportDraft`
- `UpdateReportWording`
- `RequestReportRevision`
- `ApproveReport`
- `MarkReportDelivered`
- Report approval snapshot freeze
- O-06 Report / Feedback UI の Report / Feedback部分
- `StartFeedback`
- `RecordFeedbackStatement`
- `CompleteFeedback`
- `FEEDBACK_STATEMENT` SourceRecord
- `REPORT_REVIEW_REQUIRED -> REPORT_APPROVED -> FEEDBACK_PENDING -> FEEDBACK_COMPLETED`
- Golden Tests / browser tests

### Do not implement

- Assessment proposal / pending / accept / decline lifecycle
- Assessment Handoff
- FACTACT integration
- Feedback情報の自動FACT化
- Reportからの新DiagnosisInsight自動生成
- Evidence content analysis
- maturity score / radar / ranking

---

## 4. Responsibility Boundary

### AI-04 may do

- Human Approved Contextの文章化
- 5-section report draftの生成
- wording suggestion
- HUMAN_APPROVED Insightを参照したreport block作成

### AI-04 must not do

- Raw Transcript / Raw SurveyResponseから新しい診断判断を作る
- Unreviewed / Rejected / SUPERSEDED Insightを利用する
- semantic typeを変更する
- FACT / CONFIRMED_FACTを生成する
- Root Causeを確定する
- Evidenceの正確性・最新性・妥当性を評価する
- management Decisionを代行する
- implementation decision / service recommendationを決定済みとして記述する

### Human must decide

- Draftを修正するか
- wording変更が意味変更に該当するか
- Reportを承認するか
- Delivery済みにするか
- Feedbackを開始・終了するか

> **Report editing must not bypass Human Review.**

Report上で新しい診断判断が必要な場合は、Slice 4の `DiagnosisInsight -> Human Review -> HUMAN_APPROVED` に戻してからReportへ反映する。

---

## 5. Persistence to Add / Extend

既存migrationを変更せず、新migrationを追加する。

推奨：`011_it_management_diagnosis_report_feedback.sql`

### diagnosis_reports

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `version INTEGER`
- `status = DRAFT | REVIEW_REQUIRED | REVISION_REQUIRED | APPROVED | DELIVERED`
- `content_json JSONB NOT NULL`
- `rendered_html NULL`
- `snapshot_json JSONB NULL`
- `created_by`
- `created_by_user_id NULL`
- `approved_by_user_id NULL`
- `approved_at NULL`
- `delivered_at NULL`
- timestamps

ReportのCanonicalは `content_json` とする。HTML/PDF等はrender結果でありCanonicalではない。

### ReportBlock

`content_json` 内の診断的blockは最低限：

- `block_id`
- `section`
- `text`
- `insight_refs[]`

診断的文章は最低1つの `HUMAN_APPROVED DiagnosisInsight` にGroundする。

Future紹介等、Insightを必要としないblockはblock typeを明示してよい。

### source_records extension

`source_type` に：

- `FEEDBACK_STATEMENT`

を追加する。

Feedback SourceRecordもRaw Sourceであり、自動Insight / FACTを生成しない。

---

## 6. AI-04 Context Builder

明示的な関数境界：

`buildReportContext(caseId)`

入力に含める：

- Current Future + `intent_status`
- `review_status = HUMAN_APPROVED` のDiagnosisInsightのみ
- HUMAN_APPROVEDなEvidence存在Observation
- OPENなAssessmentConfirmationItem
- 顧客表示名 `会社名 + 様`
- provider表示 `atLIB株式会社`

入力に含めない：

- Raw Transcript
- Raw SurveyResponse
- Raw SourceRecordそのもの
- unreviewed AIProposal
- rejected AIProposal
- DRAFT / REJECTED / SUPERSEDED DiagnosisInsight
- legacy score / radar / suggested services
- FACTACT Fact
- token / cookie / secret

Futureが `SURVEY_STATED` のままでもReport生成可能。intent statusを保持し、表示上「アンケート回答時点」等を示せるようにする。

---

## 7. AI-04 Output Contract

Structured JSONのみを正本とする。

Report structureは5section：

1. 実現したい会社の未来
2. 現在分かっていること / 現時点で分からないこと
3. Futureとの差（Gapの可能性）
4. Root Cause仮説 / KAIZENの方向性
5. 次に確認・判断すべきこと

推奨shape：

```json
{
  "sections": [
    {
      "section_key": "CURRENT_AND_UNKNOWN",
      "title": "現在分かっていること / 現時点で分からないこと",
      "blocks": [
        {
          "block_id": "uuid-or-system-generated",
          "text": "string",
          "insight_refs": ["uuid"]
        }
      ]
    }
  ]
}
```

Rules：

- insight_refsはAI inputに含まれたHUMAN_APPROVED Insightのみ
- semantic typeを保持する表現にする
- UNKNOWNを断定へ変えない
- HYPOTHESIS / ROOT_CAUSE_HYPOTHESISは仮説表現を維持
- FACT / CONFIRMED_FACT禁止
- score / maturity / rating禁止
- Evidence妥当性評価禁止
- implementation decision禁止
- System metadata禁止

推奨表現：

- `〜の可能性があります`
- `〜と考えられます`
- `現時点では確認できていません`
- `Assessmentで確認する価値があります`

禁止例：

- `御社は管理できていません`
- `原因は〇〇です`
- `〇〇を導入すべきです`
- `○％改善します`

---

## 8. Report Commands

### GenerateReportDraft

Precondition：

- Case = `REPORT_REVIEW_REQUIRED`
- Human staff actor

Behavior：

- AIExecution process_type=`REPORT_DRAFT_GENERATOR`
- `buildReportContext()`
- AI-04実行
- structured output validation
- DiagnosisReportを `DRAFT` または `REVIEW_REQUIRED` で生成
- **Case Stateを変更しない**

AI failureでもHuman-only Report作成を可能にする。

### UpdateReportWording

許可：

- 語尾
- 敬語
- 可読性
- 同じ意味の言い換え
- section順や見出し調整など診断意味を変えない編集

禁止：

- 新しいGapを追加
- 新しいRoot Causeを追加
- UNKNOWNを解消
- Hypothesisを断定
- Insightにないサービス導入判断を追加

BackendでReport blockの `insight_refs` がHUMAN_APPROVEDか検証する。

意味変更が必要な場合は `RequestReportRevision` とし、Human Reviewへ戻すための明示導線を設ける。MVPではCase Stateを自動巻き戻しせず、Revision Requiredを記録し、先に新InsightをHuman Approvedしてから再生成/更新する方式でもよい。

### RequestReportRevision

- Report status = `REVISION_REQUIRED`
- reason記録
- silent rewrite禁止

### ApproveReport

Precondition：

- Case = `REPORT_REVIEW_REQUIRED`
- Report status = `REVIEW_REQUIRED` または適切なreviewable状態
- Human actor
- 全診断blockのInsight refsがHUMAN_APPROVED

Behavior：

- Report = `APPROVED`
- Case -> `REPORT_APPROVED`
- approval snapshot freeze
- CaseTransition / AuditLog

### MarkReportDelivered

Precondition：

- Report = `APPROVED`
- Case = `REPORT_APPROVED`

Behavior：

- Report = `DELIVERED`
- delivered_at
- Case -> `FEEDBACK_PENDING`
- CaseTransition / AuditLog

---

## 9. Approval Snapshot Freeze

Report承認時に最低限freezeする：

- Current Future ID + version + intent_status
- DiagnosisInsight IDs + versions + semantic_type
- AssessmentConfirmationItem IDs + status
- AI policy version
- AI prompt version
- Report content version / content hash
- approved_by / approved_at

承認済みReportをsilent rewriteしない。

承認後にInsightがSupersedeされても、既承認Report snapshotは当時の承認内容を保持する。

再発行が必要なら新Report versionを作る。

---

## 10. Feedback

### StartFeedback

Precondition：

- Case = `FEEDBACK_PENDING`
- Human actor

Feedback開始は必要に応じsession情報をAuditへ記録する。

### RecordFeedbackStatement

- `FEEDBACK_STATEMENT` SourceRecordとしてRawに保存
- speaker指定可
- 原文を保持
- AI要約で上書きしない
- FACT化しない
- 自動DiagnosisInsight生成しない

### CompleteFeedback

- Human actor
- Case = `FEEDBACK_PENDING`
- Case -> `FEEDBACK_COMPLETED`
- CaseTransition / AuditLog

Feedbackで重要な新情報が得られても、このSliceで自動的にReportを書き換えない。

---

## 11. O-06 UI

Tab：

- Report
- Feedback
- Assessment（Slice 6で本実装）

Report Tab：

- `会社名 + 様`
- provider `atLIB株式会社`
- Current Future + intent status
- Report status
- 5section
- blockごとのsemantic label / Insight source trace
- Draft生成
- wording edit
- revision request
- approval
- delivery

Feedback Tab：

- Feedback status
- Feedback Statement入力
- Raw Source履歴
- Complete Feedback

色だけに意味を依存しない。

---

## 12. Backend Guards / Golden Tests

最低限：

1. AI-04 ContextにRaw Transcript / Raw SurveyResponseが入らない
2. DRAFT / REJECTED / SUPERSEDED InsightがAI-04 Contextに入らない
3. HUMAN_APPROVED InsightだけがReport Contextに入る
4. Human Approved HypothesisはReportでもHypothesis表現を維持
5. UNKNOWNはReportで断定へ変換されない
6. Report blockが未承認Insightを参照できない
7. AI-04出力にFACT / CONFIRMED_FACT / score / maturityを許可しない
8. AI failureでもHuman-only Reportを作成可能
9. wording editで新しいInsight意味を追加できない
10. meaning changeはHuman ReviewなしでApproveできない
11. ApproveReportはHuman actor必須
12. AI-04成功だけでCase stateは進まない
13. Approval snapshotがFuture versionをfreezeする
14. Approval snapshotがInsight IDs + versionsをfreezeする
15. Approval snapshotがAssessmentConfirmationItem IDsをfreezeする
16. Approval後にReport contentをsilent updateできない
17. 再発行は新versionになる
18. MarkReportDeliveredでのみFEEDBACK_PENDINGへ進む
19. Feedback StatementはSourceRecordでありFACTではない
20. Feedback Statementから自動Insightを生成しない
21. Feedbackで得た情報が既承認Reportをsilent rewriteしない
22. SURVEY_STATED FutureでもReport生成・承認可能
23. customer tokenでadmin Report/Feedback API操作不可
24. staff auth / command header / cross-site guards維持
25. company display=`会社名 + 様`, provider=`atLIB株式会社`
26. legacy API / table / migration非破壊

---

## 13. API Direction

既存admin namespace配下へ追加する。

推奨：

- `GET /api/admin/it-management-diagnosis/cases/:id/report`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/ai/run`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/manual`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/wording`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/revision-request`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/approve`
- `POST /api/admin/it-management-diagnosis/cases/:id/report/deliver`
- `POST /api/admin/it-management-diagnosis/cases/:id/feedback/start`
- `POST /api/admin/it-management-diagnosis/cases/:id/feedback/statements`
- `POST /api/admin/it-management-diagnosis/cases/:id/feedback/complete`

汎用PATCHでBusiness transitionを変更しない。

---

## 14. Completion Criteria

Slice 5完了条件：

1. Human Approved ContextだけからReportを生成できる
2. AI-04がHuman Reviewを迂回できない
3. Report blockがInsight refsでGroundされる
4. Meaning-changing editがInsight追加なしに承認されない
5. Report approval snapshotがfreezeされる
6. Report approval / deliveryがHuman commandでのみ進む
7. Feedback StatementがRaw Sourceとして保存される
8. Feedback完了までE2Eで進められる
9. AI failureでもHuman-only運用可能
10. Slice 1〜4のGolden Testsが回帰成功
11. Slice 5 Golden / browser tests成功
12. legacy資産を非破壊で維持

---

## 15. Completion Report Format

実装完了後は次を報告する。

1. Summary
2. Files changed
3. Persistence / migration
4. AI-04 Provider / schema / context validation
5. Report grounding behavior
6. Wording / meaning-change guard
7. Approval snapshot behavior
8. Report state transition
9. Feedback SourceRecord behavior
10. Tests and results
11. Browser / manual verification
12. Remaining issues
13. Canonical deviations
14. Latest commit SHA

mainへmergeせず、feature branchへcommit・pushし、remote SHA一致・clean worktreeを確認してレビュー待ちとする。
