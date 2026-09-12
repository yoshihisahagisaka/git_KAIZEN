# 無料 IT経営診断 Slice 4 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の **Slice 4 — Post-Diagnosis Structuring / DiagnosisInsight / Human Review** を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

Slice 3は `atlib-sales-tools/main` commit `4132f6ad6b5f50cf7622dd6cc2cc44af6a9efe37` までで完了している。

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
11. `docs/28-free-it-management-diagnosis-slice3-codex-implementation-handoff-v1.md`
12. 本文書

矛盾がある場合は上位Canonicalを優先し、解決不能ならコードで勝手に決めず報告する。

---

## 2. Slice 4 Goal

Slice 3で `HUMAN_REVIEW_REQUIRED` になったDiagnosis Caseを、AI-03で構造化し、Human Reviewを通して顧客向け診断Contextとして使用可能な状態まで進める。

```text
HUMAN_REVIEW_REQUIRED
  -> HumanがAI-03 Post-Diagnosis Structurerを実行
  -> AIProposal生成
  -> Human Review Workspaceで1件ずつ判断
  -> Approve / Approve with Edit / Convert to UNKNOWN / Reject
  -> HUMAN_APPROVED DiagnosisInsightを生成
  -> AssessmentConfirmationItemを必要に応じHumanが生成
  -> HumanがReview完了
  -> REPORT_REVIEW_REQUIRED
```

Slice 4の完成点は、**Raw Source / AI Proposal / Human Reviewed Insightが分離されたまま、Report生成に渡せるHuman Approved Contextが成立すること** である。

AI成功だけでCase Stateを進めない。AIProposal生成だけでDiagnosisInsightを生成しない。

---

## 3. Scope

### Implement

- AI-03 Post-Diagnosis Structurer
- `DiagnosisInsight`
- `InsightSource`
- `HumanReview`
- `AssessmentConfirmationItem`
- O-05 Human Review Workspace
- `RunPostDiagnosisStructurer`
- `ApproveAIProposal`
- `ApproveAIProposalWithEdit`
- `ConvertProposalToUnknown`
- `RejectAIProposal`
- `CreateHumanInsight`
- `SupersedeInsight`
- `CreateAssessmentConfirmationItem`
- `CompleteHumanReview`
- `HUMAN_REVIEW_REQUIRED -> REPORT_REVIEW_REQUIRED`
- Golden Tests / browser tests

### Do not implement

- AI-04 Report Draft Generator
- DiagnosisReport / Report approval
- Feedback
- Assessment proposal lifecycle
- AssessmentHandoff
- FACTACT integration
- Evidence content analysis
- Confirmed Fact generation
- maturity score / radar / ranking

---

## 4. Responsibility Boundary

### AI-03 may propose

- `OBSERVATION`
- `UNKNOWN`
- `HYPOTHESIS`
- `GAP_CANDIDATE`
- `ROOT_CAUSE_HYPOTHESIS`
- `KAIZEN_DIRECTION`
- `EVIDENCE_CANDIDATE`
- Assessment confirmation items as a **separate collection**
- Area tag: `技術 | 運用 | 管理`
- Improvement Lens tag: `なくす | 自動化する | 標準化する | 任せる | 残す | 整える`

### AI-03 must not establish

- `FACT`
- `CONFIRMED_FACT`
- `DECISION`
- Evidence validity / accuracy / currentness
- final root cause
- management decision
- implementation plan as decided action
- maturity / score / rating

### Human must decide

- AIProposalを顧客向け診断Contextとして使えるか
- semantic typeを維持したまま承認するか
- 表現を修正して承認するか
- UNKNOWNへ変換するか
- Rejectするか
- Human独自Insightを追加するか
- 古いInsightをSupersedeするか
- Assessmentで何を確認すべきか
- Human Reviewを完了するか

> **Human Approved ≠ FACT**

例：`semantic_type = HYPOTHESIS` + `review_status = HUMAN_APPROVED` は、顧客レポートでHypothesisとして使ってよいという意味であり、企業FACTではない。

---

## 5. Persistence to Add

既存migrationを変更せず、新migrationを追加する。

推奨：`010_it_management_diagnosis_human_review.sql`

### diagnosis_insights

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `diagnosis_theme_id NULL FK`
- `semantic_type`
- `title`
- `content`
- `unknown_type NULL`
- `area_tag NULL`
- `improvement_lens NULL`
- `review_status = DRAFT | HUMAN_APPROVED | REJECTED | SUPERSEDED`
- `source_ai_proposal_id NULL FK`
- `created_by = AI_ACCEPTED | HUMAN`
- `created_by_user_id`
- `version`
- timestamps

許可semantic type：

- `OBSERVATION`
- `UNKNOWN`
- `HYPOTHESIS`
- `GAP_CANDIDATE`
- `ROOT_CAUSE_HYPOTHESIS`
- `KAIZEN_DIRECTION`
- `EVIDENCE_CANDIDATE`

禁止：

- `FACT`
- `CONFIRMED_FACT`
- `DECISION`

`UNKNOWN` は `unknown_type` 必須：

- `NOT_YET_CONFIRMED`
- `UNRESOLVED`
- `CONTRADICTORY`
- `NOT_REQUIRED_NOW`

### insight_sources

SurveyResponse / SourceRecordの共通Source Referenceを保持する。

最低限：

- `diagnosis_insight_id FK`
- `diagnosis_case_id FK`
- `source_ref_type = SURVEY_RESPONSE | SOURCE_RECORD`
- `source_ref_id`
- `relation = SUPPORTS | CONTRADICTS | RELATED`

同一Caseの実在Sourceだけを参照可能にする。

### human_reviews

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `target_type`
- `target_id`
- `action`
- `before_json NULL`
- `after_json NULL`
- `reason NULL`
- `reviewed_by_user_id`
- `reviewed_at`

Action：

- `APPROVE`
- `APPROVE_WITH_EDIT`
- `CONVERT_TO_UNKNOWN`
- `REJECT`
- `SUPERSEDE`

### assessment_confirmation_items

DiagnosisInsightとは別Entityにする。

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `diagnosis_theme_id NULL FK`
- `title`
- `purpose`
- `priority`
- `related_insight_id NULL FK`
- `related_evidence_candidate_id NULL FK`
- `source_ai_proposal_id NULL FK`
- `created_by_user_id`
- `status = OPEN | NOT_REQUIRED | HANDED_OFF`
- timestamps

「何が分かっているか」と「次に何を確認するか」を混ぜない。

---

## 6. AIProposal Extension

AI-03では既存 `ai_executions` / `ai_proposals` / `ai_proposal_sources` を再利用する。

`process_type` に：

- `POST_DIAGNOSIS_STRUCTURER`

を追加する。

AI-03で許可するproposal type：

- `OBSERVATION`
- `UNKNOWN`
- `HYPOTHESIS`
- `GAP_CANDIDATE`
- `ROOT_CAUSE_HYPOTHESIS`
- `KAIZEN_DIRECTION`
- `EVIDENCE_CANDIDATE`

Assessment confirmation itemsはAIProposal semantic typeへ混在させず、AI outputの別collectionとして保持し、Human action後に `AssessmentConfirmationItem` を生成する。

AI system metadataはAI outputへ含めない。

---

## 7. AI-03 Context Builder

明示的な関数境界を持つ。

推奨：

`buildPostDiagnosisContext(caseId)`

入力に含める：

- Current Future + intent_status
- Human-confirmed Diagnosis Plan snapshot
- Active DiagnosisTheme / Plan Item
- Raw SurveyResponse
- Slice 3 SourceRecord
- AI-02 suggestion/resolutionのうち、対話文脈理解に必要な最小限
- Preparation UNKNOWN / Hypothesisのうち関連するもの

入力に含めない：

- legacy score / radar / suggested services
- FACTACT authoritative Fact
- Evidence content analysis
- customer token / cookie / secret
- rejected unrelated proposal
- Human Review後の将来Insight（まだ存在しない）

Raw Sourceはuntrusted contentとして扱う。

Transcript等は無制限に全件送らず、必要十分なContextを構成する。切り詰めた場合はexcerptであることを保持する。

---

## 8. AI-03 Output Contract

Structured JSONのみを正本とする。

推奨shape：

```json
{
  "insight_candidates": [
    {
      "semantic_type": "HYPOTHESIS",
      "title": "string",
      "content": "string",
      "unknown_type": null,
      "diagnosis_theme_id": "uuid-or-null",
      "area_tag": "運用",
      "improvement_lens": "標準化する",
      "source_refs": [
        {
          "source_ref_type": "SOURCE_RECORD",
          "source_ref_id": "uuid",
          "relation": "SUPPORTS"
        }
      ]
    }
  ],
  "assessment_confirmation_items": [
    {
      "title": "string",
      "purpose": "string",
      "priority": 1,
      "diagnosis_theme_id": "uuid-or-null",
      "related_candidate_index": 0
    }
  ]
}
```

Rules：

- semantic typeは許可listのみ
- `UNKNOWN` なら `unknown_type` 必須
- UNKNOWNをEvidenceなしに解消しない
- source refsは同一Caseの実在Sourceのみ
- theme refは同一CaseのACTIVE Themeのみ
- FACT / CONFIRMED_FACT / DECISION禁止
- score / maturity / rating禁止
- final root cause禁止
- Evidence妥当性評価禁止
- implementation decision禁止
- service recommendation as decided action禁止
- System metadata禁止
- Assessment confirmation itemをInsight semantic typeにしない

Area / Improvement Lensはタグでありスコア化しない。

---

## 9. Human Review Commands

### RunPostDiagnosisStructurer

Precondition：

- Case = `HUMAN_REVIEW_REQUIRED`
- Human staff actor

Behavior：

- AIExecution作成
- AI-03 Context Builder
- Provider Adapter
- schema validation
- AIProposal保存
- Assessment confirmation candidateはAI outputとして保持
- **Case Stateを変更しない**
- **DiagnosisInsightを生成しない**

AI失敗でもHuman-onlyでReview可能。

### ApproveAIProposal

- Human action必須
- AIProposal originalは保持
- semantic typeを維持
- DiagnosisInsightを `HUMAN_APPROVED` で生成
- source refsをInsightSourceへコピー
- HumanReviewを記録

### ApproveAIProposalWithEdit

- original AIProposalを上書きしない
- Human編集後のDiagnosisInsightを生成
- semantic type変更を許可する場合も許可list内のみ
- `FACT / CONFIRMED_FACT / DECISION` へ変更不可
- HumanReviewへbefore / afterを記録

### ConvertProposalToUnknown

- AIProposalの意味を無かったことにせず、Human判断としてUNKNOWN Insightを生成
- `unknown_type` 必須
- HumanReview記録

### RejectAIProposal

- AIProposal = REJECTED
- DiagnosisInsightを生成しない
- HumanReview記録

### CreateHumanInsight

- AIなしでHumanがInsightを作成可能
- semantic typeは許可listのみ
- source refs必須を基本とする
- UNKNOWNの場合unknown_type必須
- created_by = HUMAN
- review_status = HUMAN_APPROVED
- Audit / HumanReview記録

### SupersedeInsight

- 既存HUMAN_APPROVED Insightをsilent rewriteしない
- old Insightを `SUPERSEDED`
- replacement Insightを別version / 別recordとして生成
- HumanReview / Audit

### CreateAssessmentConfirmationItem

- Human actionで生成
- DiagnosisInsightとは別Entity
- Evidence Candidateに関連づける場合も「何を確認するか」を記録するだけ
- Evidence内容評価をしない

### CompleteHumanReview

Preconditions：

- Case = `HUMAN_REVIEW_REQUIRED`
- Human actor
- Reportで利用する予定のInsightは `HUMAN_APPROVED`
- AIProposal未処理が残っていても、Humanが意図的に残したものは完了を妨げない
- UNKNOWNが残っていても完了可能

Behavior：

- Case -> `REPORT_REVIEW_REQUIRED`
- CaseTransition / AuditLog

質問数、Insight数、UNKNOWN解消率、AI成功を完了条件にしない。

---

## 10. Evidence Boundary in Human Review

Evidence存在SourceRecordからObservation候補を作る場合、内容は存在確認まで。

許可例：

- 「端末管理台帳が存在することを画面共有で確認した」

禁止：

- 最新である
- 正確である
- 実態と一致する
- 適切に運用されている
- 十分である

Human Review UIにもEvidence validityを承認するfieldを置かない。

---

## 11. O-05 Human Review Workspace

既存admin UI / auth / CSSを再利用する。

最低表示：

### Header

- `会社名 + 様`
- provider = `atLIB株式会社`
- Current Future + intent status
- Case status
- Next Action

### Left / Context

- Future
- Diagnosis Plan
- Priority Themes
- Raw Source trace

### Main Review Queue

AIProposalごとに：

- `[AI] semantic type`
- title / content
- source refs
- Theme
- Area / Improvement Lens
- UNKNOWN type if applicable

Human actions：

- Approve
- Edit & Approve
- Convert to UNKNOWN
- Reject

### Approved Context

- `[Human Approved] Observation`
- `[Human Approved] Hypothesis`
- `[UNKNOWN] 未確認`
- Gap Candidate
- Root Cause Hypothesis
- KAIZEN Direction
- Evidence Candidate

色だけで意味を伝えない。

### Assessment Confirmation

Insightとは別領域に表示し、Assessmentで次に確認する項目として管理する。

---

## 12. Next Action Projection

推奨：

- `HUMAN_REVIEW_REQUIRED` -> `AI整理結果とRaw Sourceを確認し、診断ContextをHuman Reviewしてください`
- `REPORT_REVIEW_REQUIRED` -> `Human Approved Contextから無料診断レポートを作成してください`

Next Actionを第二のstate machineにしない。

---

## 13. Backend Guards / Golden Tests

最低限、以下を自動テストする。

1. AI-03成功だけではCase Stateが変わらない
2. AI-03成功だけではDiagnosisInsightが生成されない
3. FACT / CONFIRMED_FACT / DECISIONはAI schemaにもInsight semantic enumにも存在しない
4. score / maturity / ratingをreject
5. invalid source refをreject
6. invalid / cross-case theme refをreject
7. UNKNOWN without unknown_typeをreject
8. Human Approved HypothesisはHypothesisのまま
9. Human Approved ≠ FACT
10. RejectしたAIProposalからInsightを生成しない
11. Edit & ApproveでもAI originalを上書きしない
12. Convert to UNKNOWNでUNKNOWN Insightを生成しunknown_typeを保持
13. Human-only Insight作成可能
14. Human-onlyでReview完了可能
15. UNKNOWNが残っていてもReview完了可能
16. AI failureでもReview継続・完了可能
17. Evidence存在Observationからaccuracy/currentness/validityを推論しない
18. AssessmentConfirmationItemはDiagnosisInsight semantic typeではない
19. Source refsは同一CaseのSurveyResponse / SourceRecordだけ
20. Supersedeで旧Insightをsilent rewriteしない
21. HUMAN_REVIEW_REQUIRED以外ではReview command不可
22. customer tokenでadmin Review API不可
23. staff authなしでReview API不可
24. `SURVEY_STATED` FutureのままReview完了可能
25. `INTERVIEW_RECONFIRMED` Futureもintent statusを保持
26. AI-03 workerがAI-01 / AI-02 jobをclaimしない
27. AI-01 / AI-02 workerがAI-03 jobをclaimしない
28. Report用Read ModelへDRAFT / REJECTED Insightを出さない（Slice 4ではfilter/read modelだけ準備してよい）

---

## 14. API Direction

既存admin namespace配下へ追加する。

推奨：

- `GET /api/admin/it-management-diagnosis/cases/:id/review`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/ai/run`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/proposals/:proposalId/approve`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/proposals/:proposalId/approve-with-edit`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/proposals/:proposalId/convert-to-unknown`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/proposals/:proposalId/reject`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/insights`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/insights/:insightId/supersede`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/assessment-confirmation-items`
- `POST /api/admin/it-management-diagnosis/cases/:id/review/complete`

既存Google Workspace staff auth、rate limit、command-header / cross-site guardを再利用する。

---

## 15. Reuse First

再利用対象：

- Express / TypeScript / PostgreSQL
- Google Workspace staff auth
- Admin command gate / rate limit
- existing DiagnosisCase locking/version/audit pattern
- existing AIExecution persisted queue / lease / recovery
- process_typeごとのWorker分離
- existing Anthropic SDK / API key config / Provider adapter pattern
- existing structured JSON + Zod validation pattern
- admin CSS / table / card / button styles
- company display helper / provider name rule

新しい汎用frameworkや別AI orchestration基盤を導入しない。

---

## 16. Non-goals

Slice 4では作らない：

- Report本文 / PDF / PPTX
- AI-04
- Feedback
- Assessment proposal / sales lifecycle
- AssessmentHandoff
- FACTACT Fact registration
- Evidence upload/OCR/content analysis
- maturity / radar / score
- automatic diagnosis / automatic root cause confirmation

---

## 17. Completion Criteria

以下をすべて満たすこと。

- HUMAN_REVIEW_REQUIRED CaseでAI-03をHuman-triggered実行できる
- AIProposalはそのままInsightにならない
- Human Reviewを通してのみHUMAN_APPROVED Insightが生成される
- semantic typeを維持しFACT化しない
- UNKNOWNを残せる
- Human-only Reviewが可能
- AI failureでもReview完了可能
- AssessmentConfirmationItemをInsightと分離
- Evidence存在とEvidence内容評価を分離
- Review完了はHuman commandのみ
- `REPORT_REVIEW_REQUIRED`へ遷移できる
- Slice 1〜3 regressionが通る

---

## 18. Codex Stop Conditions

以下の場合は実装を止めて報告する。

- FACT / CONFIRMED_FACTを無料診断のDiagnosisInsightへ追加する必要が出た
- AIProposalから自動でHUMAN_APPROVED Insightを生成する必要が出た
- Evidence content validityを無料診断内で評価する必要が出た
- Human ReviewなしでReportへ出す必要が出た
- maturity score / radar / rankingが必要になった
- Business / Service / Assessment境界の変更が必要になった

これらは **Business Decision Required** またはDevelopment Decisionであり、コード都合で変更しない。

---

## 19. Verification

最低限：

- `npm install`
- `npm run build`
- existing tests
- Slice 1 Golden Tests
- Slice 2 Golden Tests
- Slice 3 Golden Tests
- Slice 4 Golden Tests
- browser tests desktop/mobile
- `git diff --check`

実Anthropic / Google OAuth / production PostgreSQLが未設定ならlive testはskip可。ただしfake provider / real SQL testで責任境界を固定する。

---

## 20. Completion Report Format

実装後、次の形式で報告する。

1. Summary
2. Files changed
3. Persistence / migration
4. AI-03 Provider / schema / context validation
5. DiagnosisInsight semantics
6. Human Review behavior
7. AssessmentConfirmationItem behavior
8. State transition
9. Evidence boundary
10. Tests and results
11. Browser / manual verification
12. Remaining issues
13. Canonical deviations
14. Latest commit SHA

mainへmergeせず、feature branchへcommit / pushしてレビュー待ちにする。
