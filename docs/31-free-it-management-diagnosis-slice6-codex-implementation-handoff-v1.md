# 無料 IT経営診断 Slice 6 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の **Slice 6 — Assessment Lifecycle / Deterministic Handoff / Close Guards / Audit Completion** を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

Slice 5は `atlib-sales-tools/main` commit `a30f100a913781d0c2e4a2816b6f7364523bc2fd` までで完了している。

> **FACT FIRST.**
>
> **AI Suggests. Human Decides. System Records.**
>
> **Human Approved ≠ FACT.**
>
> **Assessment Handoffでsemantic typeを変えない。**
>
> **HandoffはAI生成物ではなく、Human Approved ContextをdeterministicにfreezeしたSystem snapshotである。**

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
13. `docs/30-free-it-management-diagnosis-slice5-codex-implementation-handoff-v1.md`
14. 本文書

矛盾がある場合は上位Canonicalを優先し、解決不能ならコードで勝手に決めず報告する。

---

## 2. Slice 6 Goal

Slice 5で `FEEDBACK_COMPLETED` になったDiagnosis Caseを、Assessment営業statusとHandoffまで安全に進め、無料診断MVPのend-to-endを完成させる。

```text
FEEDBACK_COMPLETED
  -> HumanがAssessment提案
  -> assessment_status = PROPOSED
  -> 必要に応じ PENDING
  -> Humanが ACCEPTED / DECLINED を決定

ACCEPTED
  -> deterministic Assessment Handoff生成
  -> Handoff READY
  -> Human/System transfer
  -> Handoff TRANSFERRED / ACCEPTED
  -> Case CLOSED可能

DECLINED
  -> Case CLOSED可能

PENDING
  -> Case CLOSED不可
```

Slice 6の完成点は、**無料診断で形成したFuture / Human Approved Insight / UNKNOWN / Hypothesis / Evidence Candidate / AssessmentConfirmationItem等をsemantic typeを変えずにAssessmentへ引き継ぎ、営業判断と診断ライフサイクルを混同せずCaseを安全に閉じられること** である。

---

## 3. Scope

### Implement

- Assessment lifecycle
  - `ProposeAssessment`
  - `MarkAssessmentPending`
  - `AcceptAssessment`
  - `DeclineAssessment`
- `AssessmentHandoff`
- deterministic Handoff snapshot builder
- `GenerateAssessmentHandoff`
- `TransferAssessmentHandoff`
- 必要なら `AcceptAssessmentHandoff` 相当の明示操作
- Assessment / Handoff read model
- O-06 Assessment tab
- Case Close Guards
- `CloseDiagnosisCase`
- CaseTransition / AuditLogの最終整備
- Golden Tests / browser tests
- MVP end-to-end regression

### Do not implement

- Assessment本体のEvidence収集・検証
- Evidence content analysis / OCR
- Assessment内でのFACT確定UI
- FACTACTへのauthoritative import
- automatic FACTACT sync
- AIによるHandoff生成
- AIによるAssessment受注判断
- billing / contract / invoice
- CRM必須連携
- Assessment実行プロジェクト管理

---

## 4. Diagnosis StatusとAssessment Statusを分離する

Diagnosis statusは既存のまま独立して扱う。

Assessment status：

- `NOT_PROPOSED`
- `PROPOSED`
- `PENDING`
- `ACCEPTED`
- `DECLINED`

Assessment営業statusをDiagnosis statusへ埋め込まない。

原則：

- Assessment提案は `FEEDBACK_COMPLETED` 後のみ
- `PENDING` 中はCaseを閉じない
- `ACCEPTED` はHandoff生成可能
- `DECLINED` はCase close可能
- AI executionの成功/失敗はAssessment statusを変えない

---

## 5. Assessment Commands

### ProposeAssessment

Preconditions：

- Case diagnosis_status = `FEEDBACK_COMPLETED`
- assessment_status = `NOT_PROPOSED`
- Human staff actor

Behavior：

- assessment_status -> `PROPOSED`
- 提案日時 / 提案者を必要に応じ記録
- AuditLog

提案理由や営業メモを保存する場合もFACTとして扱わない。

### MarkAssessmentPending

Preconditions：

- assessment_status = `PROPOSED`
- Human staff actor

Behavior：

- assessment_status -> `PENDING`
- AuditLog

### AcceptAssessment

Preconditions：

- assessment_status = `PROPOSED | PENDING`
- Human staff actor

Behavior：

- assessment_status -> `ACCEPTED`
- accepted_at / accepted_byを必要に応じ記録
- AuditLog

### DeclineAssessment

Preconditions：

- assessment_status = `PROPOSED | PENDING`
- Human staff actor

Behavior：

- assessment_status -> `DECLINED`
- declined_at / declined_by / reason nullable
- AuditLog

営業判断をAIへ委譲しない。

---

## 6. AssessmentHandoff Persistence

既存migrationを変更せず、新migrationを追加する。

推奨：`012_it_management_diagnosis_assessment_handoff.sql`

### assessment_handoffs

最低限：

- `id UUID PK`
- `diagnosis_case_id FK`
- `version INTEGER`
- `status = DRAFT | READY | TRANSFERRED | ACCEPTED`
- `snapshot_json JSONB NOT NULL`
- `snapshot_hash TEXT NOT NULL`
- `created_by_user_id`
- `created_at`
- `transferred_by_user_id NULL`
- `transferred_at NULL`
- `accepted_by_user_id NULL`
- `accepted_at NULL`
- timestamps

原則1 Caseにつき最新Handoffを追えること。再生成が必要ならversionを上げ、旧Handoffをsilent rewriteしない。

---

## 7. Handoffはdeterministic System operation

**Handoff生成時にAIを呼ばない。**

推奨関数境界：

`buildAssessmentHandoffSnapshot(caseId)`

入力はDBのauthoritativeなDiagnosis Domain状態からdeterministicに組み立てる。

最低限含める：

- Organization ID / display name
- Diagnosis Case ID
- Entry Channel
- Current Future
  - ID
  - version
  - statement
  - time_horizon
  - intent_status
- Approved / Delivered Report reference
  - report ID
  - report version
  - approval snapshot reference / hash
- `HUMAN_APPROVED` DiagnosisInsightのみ
  - Insight ID
  - version
  - semantic_type
  - title
  - content
  - unknown_type
  - area_tag
  - improvement_lens
  - source refs
- OPENなAssessmentConfirmationItem
- 必要なDiagnosisTheme references
- Evidence Candidate
- Evidence存在Observation
- Diagnosis / Assessment status at handoff
- generated_atはSystem metadataとしてSystemが付与

Raw Transcript / Raw SurveyResponse全文をHandoffへ無制限に複製しない。Source refを維持し、Assessment側が必要な確認対象を追跡できる形にする。

---

## 8. Semantic Preservation

Handoff生成時にsemantic typeを変更しない。

禁止例：

- `HYPOTHESIS -> FACT`
- `UNKNOWN -> FACT`
- `OBSERVATION -> FACT`
- `EVIDENCE_CANDIDATE -> VERIFIED_EVIDENCE`
- `ROOT_CAUSE_HYPOTHESIS -> ROOT_CAUSE`

HandoffにはHuman Approvedというreview statusと、元semantic typeをそのまま保持する。

> **AssessmentはHandoffを受け取った後、Evidence確認を通じてFACTを形成する。無料診断HandoffがFACTを先取りしない。**

---

## 9. Assessment確認項目

`AssessmentConfirmationItem` はHandoff時に：

- `OPEN` のものをsnapshotへ含める
- transfer後、必要に応じ `HANDED_OFF` へ更新可能

ただし、snapshot生成とstatus更新は明確に分離すること。

Handoff生成だけで確認済みにしない。

`NOT_REQUIRED` は原則Handoff対象外。

---

## 10. GenerateAssessmentHandoff

Preconditions：

- diagnosis_status = `FEEDBACK_COMPLETED`
- assessment_status = `ACCEPTED`
- Human staff actor
- Current Futureが存在
- Reportが少なくとも承認済み/Delivery済み

Behavior：

1. deterministic snapshotを生成
2. snapshot validation
3. snapshot hash生成
4. `AssessmentHandoff` を `READY` で保存
5. AuditLog

AIExecutionを作らない。

Handoff生成だけでCaseをCLOSEDにしない。

---

## 11. TransferAssessmentHandoff

Preconditions：

- assessment_status = `ACCEPTED`
- Handoff = `READY`
- Human staff actor

Behavior：

- Handoff -> `TRANSFERRED`
- transferred_by / transferred_at
- Snapshotは変更しない
- snapshot hash一致を再確認可能にする
- 対象AssessmentConfirmationItemを必要に応じ `HANDED_OFF`
- AuditLog

Handoff transfer後に内容をsilent rewriteしない。

もし受領確認をMVPで実装する場合：

- `TRANSFERRED -> ACCEPTED`
- Human/Systemの明示command
- accepted_by / accepted_at

受領確認を実装しない場合でも、status enumは将来拡張を妨げないこと。

---

## 12. Close Guards

推奨Command：`CloseDiagnosisCase`

Close可能条件：

### Assessment DECLINED

- diagnosis_status = `FEEDBACK_COMPLETED`
- assessment_status = `DECLINED`

### Assessment ACCEPTED

- assessment_status = `ACCEPTED`
- Handoffが最低 `TRANSFERRED`（または実装した場合 `ACCEPTED`）

禁止：

- `NOT_PROPOSED` で自動close
- `PROPOSED` でclose
- `PENDING` でclose
- `ACCEPTED` だがHandoff未生成/未transferでclose

Behavior：

- diagnosis_status -> `CLOSED`
- closed_at / closed_byを必要に応じ記録
- CaseTransition
- AuditLog

Case CloseはHuman command。AIやHandoff生成成功だけで自動closeしない。

---

## 13. Handoff Immutability / Versioning

`READY` 以降のHandoff snapshotをsilent rewriteしない。

推奨：

- snapshot_json / snapshot_hashをfreeze
- DB triggerまたはbackend guardでREADY/TRANSFERRED/ACCEPTEDのsnapshot変更を拒否
- 再生成が必要なら新versionのHandoffを作る

旧versionを削除・上書きしない。

Report snapshot同様、当時何を引き継いだかを後から再現可能にする。

---

## 14. O-06 Assessment Tab

表示：

- 顧客会社名 + `様`
- provider `atLIB株式会社`
- diagnosis_status
- assessment_status
- Assessment提案状態
- Handoff status / version
- Handoffに含まれるFuture
- Human Approved Insight一覧
  - semantic labelを必ず表示
  - UNKNOWNをUNKNOWNとして表示
  - HypothesisをHypothesisとして表示
- AssessmentConfirmationItem
- Evidence Candidate
- Generate Handoff
- Transfer Handoff
- Close Case

色だけにsemantic stateを依存しない。

顧客向けにFACTと誤認させるUI文言を使わない。

---

## 15. Read Model / Audit

最低限：

- current assessment status
- proposal / pending / accepted / declined metadata
- latest handoff
- handoff version history
- handoff snapshot summary
- close eligibility + reason
- relevant AuditLog / CaseTransition

UIで「今何をすべきか」が分かるNext Actionを維持する。

---

## 16. Backend Guards / Golden Tests

最低限以下を固定する。

1. Assessment proposalは `FEEDBACK_COMPLETED` 前にできない
2. AIはassessment_statusを変更できない
3. `PENDING` 中はCaseをcloseできない
4. `ACCEPTED` 前にHandoff生成できない
5. Handoff生成時にAIExecutionが作られない
6. Handoffはdeterministic snapshotである
7. HandoffにHUMAN_APPROVED Insight以外が入らない
8. SUPERSEDED / REJECTED / DRAFT InsightがHandoffへ入らない
9. HYPOTHESISがHandoffでFACTへ変わらない
10. UNKNOWNがHandoffでFACTへ変わらない
11. EVIDENCE_CANDIDATEがverified扱いにならない
12. Evidence存在Observationから内容妥当性を推論しない
13. AssessmentConfirmationItemはsemantic typeへ変換されない
14. NOT_REQUIRED confirmation itemは通常Handoff対象外
15. foreign CaseのInsight / Handoff / Reportを参照できない
16. Handoff snapshot hashが保存される
17. READY以降のsnapshotをsilent rewriteできない
18. Handoff再生成時は新versionになる
19. Handoff生成だけでCaseがCLOSEDにならない
20. Handoff transferだけでsemantic typeが変わらない
21. Assessment DECLINEDならHuman close可能
22. Assessment ACCEPTEDでもHandoff未transferならclose不可
23. Assessment ACCEPTED + Handoff TRANSFERREDならHuman close可能
24. `NOT_PROPOSED / PROPOSED / PENDING` はclose不可
25. customer tokenでAssessment管理APIへアクセスできない
26. staff auth / command header / cross-site guardを維持
27. legacy API/tableを壊さない
28. company display = `会社名 + 様`
29. provider display = `atLIB株式会社`
30. end-to-end: WEB entry -> Survey -> Preparation -> Diagnosis -> Human Review -> Report -> Feedback -> Assessment -> Handoff -> Close が成立

---

## 17. State / Next Action examples

推奨Next Action：

- FEEDBACK_COMPLETED + NOT_PROPOSED -> `Assessmentを提案`
- FEEDBACK_COMPLETED + PROPOSED -> `Assessment回答を確認`
- FEEDBACK_COMPLETED + PENDING -> `Assessment回答待ち`
- FEEDBACK_COMPLETED + ACCEPTED + no handoff -> `Assessment Handoffを作成`
- FEEDBACK_COMPLETED + ACCEPTED + READY -> `Assessmentへ引き渡す`
- FEEDBACK_COMPLETED + ACCEPTED + TRANSFERRED -> `Caseを完了`
- FEEDBACK_COMPLETED + DECLINED -> `Caseを完了`
- CLOSED -> `完了`

---

## 18. Business Decision Stop Conditions

以下が必要になった場合は勝手に実装せず **Business Decision Required** として止める：

- Assessment価格や商品名変更
- Assessment提案をFeedback前に許可する変更
- Handoff時に無料診断semanticをFACTへ昇格する変更
- Assessment受注をAIが自動決定する変更
- FACTACTへ自動authoritative importする変更
- 無料診断でEvidence内容検証まで行う変更

---

## 19. Completion Report Format

実装完了時は最低限以下を報告する。

1. Summary
2. Files changed
3. Persistence / migration
4. Assessment lifecycle behavior
5. Handoff deterministic builder / snapshot
6. Semantic preservation
7. Confirmation item behavior
8. Handoff immutability / versioning
9. Close Guards
10. State / Next Action
11. Tests and results
12. Browser / manual verification
13. End-to-end regression result
14. Remaining issues
15. Canonical deviations
16. Latest commit SHA

mainへmergeせず、feature branchへpushしてレビュー待ちにする。

---

## 20. Definition of Done

Slice 6は以下をすべて満たして完了とする。

- Assessment営業statusがDiagnosis lifecycleから分離されている
- Assessment提案はFeedback完了後のみ
- HandoffはAIを使わずdeterministic
- Handoffでsemantic typeを変更しない
- Human Approved ≠ FACTを維持
- UNKNOWNをUNKNOWNのまま引き継げる
- Evidence Candidateを未検証のまま引き継げる
- AssessmentConfirmationItemを別Entityのまま引き継ぐ
- PENDING中にCaseを閉じられない
- ACCEPTED時はHandoff transfer完了前にCaseを閉じられない
- DECLINED時はHumanがCaseを閉じられる
- snapshotのsilent rewriteを防ぐ
- end-to-end MVPフローが成立
- Slice 1〜5の回帰を壊さない

このSliceが完了すると、無料 IT経営診断MVPの実装Vertical Slice 1〜6は一巡完了となる。