# 無料 IT経営診断 Slice 2 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の **Slice 2 — Diagnosis Preparation / AI-01 Pre-Diagnosis Organizer** を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

Slice 1は `atlib-sales-tools/main` commit `6c856d5b09a762f1a9e700afa9fcbf115683ec08` までで完了している。

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
10. 本文書

矛盾がある場合は上位Canonicalを優先し、解決不能なら勝手にコードで決めず報告する。

---

## 2. Slice 2 Goal

Slice 1で `SURVEY_COMPLETED` になったDiagnosis Caseを、次の状態までEnd-to-Endで進める。

```text
SURVEY_COMPLETED
  -> AI-01 Pre-Diagnosis Organizer 実行
  -> AIProposal生成
  -> HumanがDiagnosis Preparationを開始
  -> PREPARATION_IN_PROGRESS
  -> AI提案を採用 / 修正採用 / 却下
  -> Human独自Theme / Plan Item追加可能
  -> HumanがDiagnosis Planを確定
  -> READY_FOR_DIAGNOSIS
```

Slice 2の完成点は **Human Approved Diagnosis Plan** である。

AI成功だけで `PREPARATION_IN_PROGRESS` または `READY_FOR_DIAGNOSIS` へ進めてはならない。

---

## 3. Scope

### Implement

- AI-01 Pre-Diagnosis Organizer
- AIExecution
- AIProposal
- AIProposalSource
- DiagnosisTheme
- DiagnosisPlanItem
- O-03 Diagnosis Preparation UI
- Case OverviewへのPreparation状態表示
- Human review actions for AI-01 proposals
- `SURVEY_COMPLETED -> PREPARATION_IN_PROGRESS -> READY_FOR_DIAGNOSIS`
- AI failure時のHuman-only fallback
- Golden Tests

### Do not implement

- AI-02 Interview Assistant
- 60分診断Workspace本体
- SourceRecord for interview
- AI-03 Post-Diagnosis Structurer
- DiagnosisInsight / Human Review Workspace
- Report
- Feedback
- Assessment Handoff
- FACTACT integration
- Evidence content analysis
- FACT formation

---

## 4. Responsibility Boundary

### AI may propose

- priority Theme
- recommended Question
- UNKNOWN
- Hypothesis
- Evidence Candidate
- Futureとの関係
- why it matters
- supporting source references

### AI must not establish

- FACT
- CONFIRMED_FACT
- maturity score
- diagnosis score
- final root cause
- management decision
- service recommendation as a decided action
- Evidence validity / accuracy / currentness

### Human must decide

- Themeを採用するか
- Themeの表現を修正するか
- 推奨質問をDiagnosis Planへ入れるか
- UNKNOWN / Hypothesisを確認対象として扱うか
- Evidence Candidateを確認対象にするか
- Diagnosis Planを確定するか

---

## 5. Persistence to Add

既存migrationを変更せず、次の新migrationを追加する。

推奨：`008_it_management_diagnosis_preparation.sql`

### ai_executions

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `process_type` = `PRE_DIAGNOSIS_ORGANIZER`
- `status` = `PENDING | RUNNING | SUCCEEDED | FAILED`
- `provider`
- `model`
- `prompt_version`
- `policy_version`
- `input_snapshot_json` または input hash + canonical input snapshot
- `raw_output_json NULL`
- `validation_status`
- `error_code NULL`
- `started_at / completed_at`
- timestamps

AI metadataはSystemが記録する。AI自身のJSON outputへ `case_id`, `generated_at`, `model`, `prompt_version` 等を生成させない。

### ai_proposals

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `ai_execution_id FK`
- `proposal_type`
- `status = GENERATED | UNDER_REVIEW | ACCEPTED | ACCEPTED_WITH_EDIT | REJECTED`
- `title`
- `content_json`
- `display_order`
- timestamps

Slice 2で許可するproposal type：

- `THEME`
- `QUESTION`
- `UNKNOWN`
- `HYPOTHESIS`
- `EVIDENCE_CANDIDATE`

`FACT` / `CONFIRMED_FACT` はschema / DB enum / validatorのいずれにも追加しない。

### ai_proposal_sources

SurveyResponse等へのtraceabilityを保持する。

最低限：

- `ai_proposal_id FK`
- `source_ref_type = SURVEY_RESPONSE`
- `source_ref_id`
- `relation = SUPPORTS | CONTRADICTS | RELATED`

Slice 2ではSurveyResponseをSourceRecordへ複製しない。

### diagnosis_themes

HumanがDiagnosis Preparationで扱う正式Theme。

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `title`
- `description NULL`
- `future_relation`
- `priority_order`
- `source_ai_proposal_id NULL`
- `created_by = AI_ACCEPTED | HUMAN`
- `status = ACTIVE | REMOVED`
- timestamps

AIProposalを採用した時のみThemeを生成する。AIProposal生成だけではDiagnosisThemeを生成しない。

### diagnosis_plan_items

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `diagnosis_theme_id NULL FK`
- `item_type = QUESTION | CONFIRMATION | FOLLOW_UP | EVIDENCE_CANDIDATE_CHECK`
- `text`
- `purpose NULL`
- `priority_order`
- `source_ai_proposal_id NULL`
- `created_by = AI_ACCEPTED | HUMAN`
- `status = ACTIVE | REMOVED`
- timestamps

`EVIDENCE_CANDIDATE_CHECK` は「Evidenceが存在するか / Assessmentで確認する必要があるか」を確認するものであり、Evidence内容を無料診断で分析する指示ではない。

---

## 6. Case State / Commands

Business state transitionは明示Commandで行う。

### RunPreDiagnosisOrganizer

Preconditions:

- Case = `SURVEY_COMPLETED` またはPreparation中の再実行が明示的に許可された状態
- current Future exists
- Survey v2 responses accessible

Behavior:

- AIExecution作成
- Context Builderで入力を作成
- Provider Adapter経由でAI実行
- structured output validate
- validならAIProposal保存
- failureならAIExecution = FAILED
- **Case business stateは変更しない**

### StartDiagnosisPreparation

Precondition:

- Case = `SURVEY_COMPLETED`

Behavior:

- Case -> `PREPARATION_IN_PROGRESS`
- CaseTransition / AuditLog

AI成功は必須条件にしない。AIが失敗していてもHuman-onlyでPreparation開始可能。

### AcceptThemeProposal

- THEME proposalをACCEPTED
- DiagnosisTheme生成
- supporting source refs維持
- Audit

### EditAndAcceptThemeProposal

- original AIProposalを `ACCEPTED_WITH_EDIT`
- Human編集後のDiagnosisThemeを生成
- AI原文を上書きしない

### RejectAIProposal

- AIProposal = REJECTED
- downstream objectを生成しない

### CreateHumanTheme

- HumanがAIなしでDiagnosisThemeを作成可能

### AddDiagnosisPlanItem

- HumanがPlan Itemを追加可能
- AI提案から採用する場合も、Human actionを経て作成する

### ConfirmDiagnosisPlan

Preconditions:

- Case = `PREPARATION_IN_PROGRESS`
- at least 1 ACTIVE DiagnosisTheme
- at least 1 ACTIVE DiagnosisPlanItem

Behavior:

- Case -> `READY_FOR_DIAGNOSIS`
- Human actor必須
- CaseTransition / AuditLog

AI aloneでは実行不可。

---

## 7. AI-01 Context Builder

関数境界を明示する。

推奨：

`buildPreDiagnosisContext(caseId)`

入力に含める：

- Current Future + `intent_status`
- Survey v2 question definitions
- Raw SurveyResponses
- customer organization display context
- entry channel

入力に含めない：

- legacy score
- radar
- suggested services
- FACTACT Fact
- Evidence analysis result
- rejected / unrelated legacy diagnosis data

顧客回答はuntrusted contentとして扱い、Prompt Injection境界を明示する。

---

## 8. AI-01 Output Contract

AI outputはstructured JSONのみを正本とし、schema validateする。

推奨shape：

```json
{
  "themes": [
    {
      "title": "string",
      "future_relation": "string",
      "why_it_matters": "string",
      "available_context": [
        {
          "text": "string",
          "source_refs": [
            {
              "source_ref_type": "SURVEY_RESPONSE",
              "source_ref_id": "uuid",
              "relation": "SUPPORTS"
            }
          ]
        }
      ],
      "unknowns": [
        {
          "text": "string",
          "unknown_type": "NOT_YET_CONFIRMED"
        }
      ],
      "hypotheses": [
        {
          "text": "string"
        }
      ],
      "recommended_questions": [
        {
          "text": "string",
          "purpose": "string"
        }
      ],
      "evidence_candidates": [
        {
          "text": "string",
          "purpose": "string"
        }
      ]
    }
  ]
}
```

Rules:

- Theme count 1〜5。情報が十分なら3〜5を目標
- `currently_known` ではなく `available_context` 等、FACT確定と誤解しにくい名前を使用
- `unknown_type` はSlice 2では原則 `NOT_YET_CONFIRMED`
- Evidence Candidateは「確認候補」でありEvidence内容の評価結果ではない
- score / rating / maturityは禁止
- FACT / CONFIRMED_FACTは禁止
- final_root_causeは禁止
- invalid source refは禁止

System metadataをAI outputへ含めない。

---

## 9. Provider Adapter

AI provider呼び出しをDiagnosis Domainへ直書きしない。

推奨境界：

- `AIProvider` interface
- existing Anthropic SDK / configはadapter側で再利用可能
- process-specific prompt builder
- schema validator
- timeout / failure handling

Provider failure時：

- AIExecution = FAILED
- Caseは操作可能
- O-03で「AI整理に失敗 / 再実行 / Humanのみで続行」を表示

AI failureでCase全体をlockしない。

---

## 10. O-03 Diagnosis Preparation UI

既存admin UI / CSS / authを再利用する。

最低表示：

### Header

- `会社名 + 様`
- provider = `atLIB株式会社`
- Current Future + intent status
- Case status
- Next Action

### AI Preparation area

Themeごとに：

- `[AI] Theme`
- Future relation
- why it matters
- available context + source trace
- UNKNOWN
- Hypothesis
- recommended questions
- Evidence Candidates

Human actions：

- 採用
- 編集して採用
- 却下
- Human Theme追加
- Question / Confirmation追加
- 順序変更

### Confirm Plan

HumanがDiagnosis Planを確認し `ConfirmDiagnosisPlan` を実行する。

「AI整理済み」は「診断準備完了」と同義にしない。

---

## 11. Next Action Projection

Next ActionはCase Stateから導出する。

推奨：

- `SURVEY_COMPLETED` -> `AI事前整理を実行し、診断準備を開始してください`
- `PREPARATION_IN_PROGRESS` -> `重点テーマと確認項目をレビューし、診断Planを確定してください`
- `READY_FOR_DIAGNOSIS` -> `60分診断を開始してください`

Next Actionを第二のstate machineにしない。

---

## 12. Backend Guards

最低限テストする。

1. AIProposal生成だけではCase stateが変わらない
2. AIProposal生成だけではDiagnosisThemeが生成されない
3. Human actionなしでREADY_FOR_DIAGNOSISへ進めない
4. AI outputにFACT / CONFIRMED_FACTが含まれた場合reject
5. score / maturity / ratingをreject
6. invalid source refをreject
7. AI failure後もStartDiagnosisPreparation可能
8. rejected proposalからTheme / Plan Itemを作れない
9. edited acceptでもAI originalを上書きしない
10. SurveyResponseをFACTへ昇格しない
11. Evidence CandidateをEvidence validityへ昇格しない
12. Human-only Theme / PlanでREADY_FOR_DIAGNOSISへ進める
13. `SURVEY_STATED` FutureのままPreparation / Readyへ進める
14. staff authなしでPreparation command不可
15. customer access tokenでadmin Preparation API不可

---

## 13. API Direction

既存admin namespace配下へ追加する。

推奨：

- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/ai/run`
- `GET /api/admin/it-management-diagnosis/cases/:id/preparation`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/start`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/proposals/:proposalId/accept`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/proposals/:proposalId/accept-with-edit`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/proposals/:proposalId/reject`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/themes`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/plan-items`
- `POST /api/admin/it-management-diagnosis/cases/:id/preparation/confirm`

Generic PATCHでbusiness transitionを隠さない。

---

## 14. Logging / Privacy

- Raw customer answersをapplication logへ出さない
- AI raw prompt / raw outputを通常loggerへ出さない
- AIExecution DBには必要な監査情報を保存する
- access tokenをAI Contextへ渡さない
- staff auth cookie / tokenをAIへ渡さない
- errorsにcustomer contentを含めない

---

## 15. Golden Tests

最低限：

1. SURVEY_COMPLETED CaseからAI-01実行
2. valid AI output -> AIExecution SUCCEEDED + AIProposal保存
3. AI成功でもCase statusはSURVEY_COMPLETEDのまま
4. StartDiagnosisPreparation -> PREPARATION_IN_PROGRESS
5. Theme proposal accept -> DiagnosisTheme生成
6. edit accept -> original proposal保持 + edited Theme生成
7. reject -> downstreamなし
8. Human Theme追加
9. AI Question採用 -> DiagnosisPlanItem生成
10. Human Plan Item追加
11. Confirm Plan -> READY_FOR_DIAGNOSIS
12. AI未実行 / AI FAILEDでもHuman-only PlanでREADY可能
13. FACT output reject
14. score / maturity output reject
15. invalid source ref reject
16. customer self-answerはFACTにならない
17. Evidence Candidateは確認候補のまま
18. admin auth / command guard維持
19. legacy API / Slice 1 flow regressionなし
20. Survey v2 driftなし

---

## 16. Verification

実装後：

- `npm install`
- `npm run build`
- existing tests
- Slice 1 diagnosis tests
- Slice 2 Golden Tests
- relevant browser tests
- `git diff --check`

AI live testはAPI keyの有無で明示的にskip可能。ただしProvider Adapterはfake/stubでdeterministic test可能にする。

---

## 17. Stop Conditions

以下が必要になった場合はコードで勝手に決めず報告する。

- 無料診断 / Assessment境界変更
- Survey v2質問内容変更
- 顧客自己回答のFACT化
- Evidence内容分析の無料診断への持込み
- AIによるHuman Gate bypass
- maturity / score復活
- FACTACT Coreへの直接 authoritative write
- Business message / price変更

---

## 18. Completion Report

Codex完了報告：

1. Summary
2. Files changed
3. Persistence / migration
4. AI Provider Adapter / schema
5. Human Gate implementation
6. State transition implementation
7. Tests and results
8. Browser/manual verification
9. Remaining issues
10. Canonical deviations
11. Latest commit SHA

`Canonical deviations` は原則 `None` とする。
