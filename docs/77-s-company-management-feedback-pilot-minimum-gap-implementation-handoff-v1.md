# S社 Controlled Pilot — Management Feedback Minimum Gap Implementation Handoff v1

Status: **DEVELOPMENT / IMPLEMENTATION HANDOFF — DO NOT MERGE WITHOUT APPROVAL**  
Date: 2026-09-14

## 0. Purpose

Business Lane docs/67–69 と Development Fit-Gap docs/76 を、現在構築中の無料IT経営診断システムへ実装するための最小Sliceを定義する。

これは別システム、新しい5ページ専用Core、FACTACT Core redesignを作る要求ではない。既存 `atlib-sales-tools` Diagnosis Domain / Report / Feedback / Assessment Handoffを継続利用する。

Production / Controlled Pilot GO判定とは独立する。S社実データはGOまたは明示的CONDITIONAL GO前に投入しない。

## 1. Fixed Guardrails

- FACT FIRST.
- 分からないことを、分かったことにしない。
- AI Suggests. Human Decides. System Records.
- Customer Input ≠ Evidence-confirmed FACT.
- Human Approved ≠ FACT.
- Assessmentを自動推奨しない。
- Route Cの場合だけDesign Assessmentへ進める。
- Business label A/B/C/DをFACTACT Core Objectへ移植しない。
- 5ページを理由に5ページ専用DB/Coreを追加しない。
- typed temporal semanticsはProduct Lane validation前に単一Due Dateへ圧縮しない。

## 2. Existing Implementation to Reuse

- `diagnosis_futures`: versioned Future / `SURVEY_STATED`, `INTERVIEW_RECONFIRMED`.
- `survey_responses`, `source_records`: raw Customer Input / interview / feedback provenance.
- `ai_executions`, `ai_proposals`: AI suggestion layer.
- `diagnosis_insights`, `diagnosis_insight_sources`, `human_reviews`: Human Review layer.
- `assessment_confirmation_items`: Evidence / Assessment confirmation candidate layer.
- `diagnosis_reports`: 5-section Management Feedback projection, approval snapshot and versioning.
- `FEEDBACK_STATEMENT`: Customer correction/restatement raw source during feedback.
- `assessment_handoffs`: deterministic Diagnosis → Assessment context handoff.
- `diagnosis_audit_logs`, `case_transitions`: lifecycle/audit provenance.
- controlled-pilot coded evidence capture.

No existing semantic type may be silently promoted to FACT.

## 3. Slice MF-A — FUTURE UNKNOWN-safe + Page 2 Epistemic Separation

### Goal
S社のようにManagement FUTUREが未確認でも、架空Futureを作らずManagement Feedbackを準備できるようにする。同時にPage 2でCustomer Input / Observation / UNKNOWNをEvidence-confirmed FACTと誤認させない。

### Required behavior
- Future未確認状態を明示できる。
- Customer-facing Page 1は未確認時に「Management Feedbackで確認するFuture」として表示する。
- Feedback中に顧客自身の表現を得た場合、既存versioned Future/reconfirmation pathを使い履歴を残す。
- Page 2 customer titleはBusiness meaningとして「現在分かっていること / 現時点で分からないこと」を維持してよいが、item-level labelで semantic state/source を明示する。
- `OBSERVATION`, `UNKNOWN`, `HYPOTHESIS` を混ぜない。一般HYPOTHESISを「分かっていること」として表示しない。
- Free DiagnosisでEvidence-confirmed FACTを新規形成しない。

### Architecture
Core change: **No**. Diagnosis Application / Translation projectionで対応する。Future schema changeが本当に必要な場合のみ追加migrationを検討し、先に既存intent/status表現で成立するか確認する。

### Acceptance
- Future unknown fixtureでreport generation/reviewが成立する。
- Future unknownを架空statementで埋めない。
- Page 2 fixtureでObservation/Unknown/Hypothesisが視覚・テキスト上区別される。
- Report meaning validation / Human approval guardを維持する。

## 4. Slice MF-B — WHY Connection Projection

### Goal
Page 4を `Hypothesis → Supporting Observation → Evidence Needed` のBusiness Meaningで表示する。

### Required behavior
- Root Causeは断定せずHypothesis labelを保持する。
- Supporting Observationは既存Insight Source / Human Approved Observation等のprovenanceへ辿れる。
- Evidence Neededは既存`EVIDENCE_CANDIDATE` / `assessment_confirmation_items`を優先再利用する。
- Customer-facing outputでは「判断するには何を確認する必要があるか」を表示できる。
- relationがない場合、AIが推測で結ばない。UNKNOWN/未接続を許容する。

### Architecture
Core change: **No**. まずProjection/association mappingで実装する。新relation tableが必要でもDiagnosis Application relationでありFACTACT Core追加ではない。

### Acceptance
- WHY fixtureがHypothesis、Supporting Observation、Evidence Neededを明示する。
- source/refを後から追跡できる。
- unsupported connectionを自動生成しない。

## 5. Slice MF-C — Human NEXT DECISION / Route Outcome

### Goal
Management Feedback後、HumanがA/B/C/DのいずれかをDecisionし、Assessment自動ファネル化を防ぐ。

### Business routes
- A: Direct ACT
- B: Focused Confirmation
- C: Design Assessment
- D: Stop / Hold

### Internal handling
Business labelをCore terminologyにしない。Diagnosis ApplicationでHuman-selected feedback outcomeとして保持し、route code / decider / decided_at / reason-or-restatement / next action / follow-up referenceを記録する。

Route behavior:
- A: Assessment lifecycleを自動開始しない。
- B: Assessment lifecycleを自動開始しない。
- C: Human decision後にのみ既存Assessment proposal/handoff lifecycleへ進行可能。
- D: Assessment lifecycleを自動開始しない。Hold/StopはBusiness outcomeとして記録し、Case close policyとは混同しない。

### Architecture
Core change: **No**. Diagnosis Application outcome/decision record + auditを想定する。既存Audit JSONだけで十分か、typed additive tableが必要かは実装時に耐久性/問い合わせ性で判断する。

### Acceptance
- A/B/DからAssessment proposalを自動生成できない。
- Cのみ明示Human command後にAssessmentへ進める。
- AI processからrouteをcommitできない。
- route changeはsilent overwriteせずhistory/auditを残す。

## 6. Slice MF-D — Decision-time Context Snapshot

### Goal
「そのDecision時点で何が分かっていたか / UNKNOWNだったか / Evidence確認が必要だったか」を後から再現する。

### Snapshot minimum
- feedback report id/version/content hash
- current Future id/version/status
- Human Approved Insight refs + versions + semantic types
- UNKNOWN refs
- GAP / Root Cause Hypothesis refs
- Evidence Candidate / Assessment Confirmation refs
- selected route/outcome
- customer restatement source ref where present
- decider and decided_at
- next action / follow-up typed only within currently approved Diagnosis semantics

Snapshotはimmutable。後続Insight/Future修正で過去Decisionのmeaningを変更しない。

### Architecture
Core change: **No**. Diagnosis Application snapshot/reference set。

### Acceptance
- Decision後にFuture/Insightが更新されてもDecision snapshotが変化しない。
- snapshotからRaw customer dataを不必要に複製しない。ID/ref中心。
- deleted/anonymized raw data lifecycleと矛盾しない。

## 7. Slice MF-E — Pilot Instrumentation

### Goal
Business docs/67–69のJourneyが実顧客で成立したかをFACTベースで検証する。

### Capture / derive
- AI Suggestion: existing AIExecution/AIProposal refs.
- Human Correction: existing HumanReview/audit refs + coded correction category.
- Customer Correction: Feedback SourceRecord ref + coded signal.
- Human Approval: existing report/review audit.
- selected Next Decision / Route: MF-C outcome.
- Customer restatement: source ref + presence/type; raw textをanalyticsへ複製しない。
- Follow-up: outcome/follow-up event/reference.
- Assessment manual re-entry / duplicate input: coded event/count.
- Feedback preparation time: lifecycle timestamps/eventsからderive可能ならderive。
- Human Review time: lifecycle timestamps/eventsからderive可能ならderive。

### Data minimization
Pilot analyticsへCustomer quote/contact/Transcript/raw report bodyを複製しない。既存coded evidence modelを拡張する。

### Architecture
Core change: **No**.

## 8. Slice MF-F — Assessment / FACTACT Continuity Contract

### Goal
Route Cでのみ、Diagnosis contextを再入力せずAssessmentへ引き継ぎ、その後FACTACTのDecision / Work / Action / Change / Verify / Factへ接続可能なcontractを定義する。

### Diagnosis → Assessment
既存Assessment Handoffを再利用し、Future、Human Approved Insight、UNKNOWN、Evidence/Confirmation candidates、Decision snapshot provenanceを渡す。Customer InputをEvidence-confirmed FACTへ昇格させない。

### Assessment → FACTACT
実装前にProduct Lane mapping validationを受ける。期待する方向は既存FACTACT canonical objectsの再利用であり、新Core Object追加を前提にしない。

### Typed time boundary
Next Decision確認日 / Assessment回答予定日 / Evidence確認日 / ACT期限 / Vendor約束日 / Change Verification日 / Quarterly/Annual Reviewを単一`due_at`へ圧縮しない。Product Lane validationが終わるまではDiagnosis固有の既存意味を越えた共通化を実装しない。

## 9. Implementation Order

1. **MF-A** FUTURE UNKNOWN-safe + Page2 epistemic separation
2. **MF-B** WHY connection projection
3. **MF-C** Human NEXT DECISION / Route outcome
4. **MF-D** Decision-time Context snapshot
5. **MF-E** Pilot instrumentation
6. **MF-F** Assessment / FACTACT continuity contract

MF-A〜Eは現在の無料IT経営診断システムのfeature branchを継続して実装する。MF-FのFACTACT側commitはProduct Lane validation前に行わない。

## 10. Validation

各Sliceで最低限:
- TypeScript build
- relevant Golden tests
- PostgreSQL migration test if schema changed
- browser desktop/mobile for customer/operator-visible changes
- existing Slice1–6 regression
- policy closure / retention deletion regression where new records/snapshots are introduced
- no FACT enum/promotion regression
- no automatic Assessment recommendation regression

S社固有の実データはtest fixtureへコピーしない。Business Use Caseはsynthetic fixtureで検証する。

## 11. Production Readiness Boundary

このHandoff完了、各Slice実装、CI成功のいずれもControlled Customer Pilot GOを意味しない。

External Evidence、Anthropic provider、Google OAuth、Cloud Run worker、Secret/IAM、Monitoring、Cloud SQL backup/restore、staging E2E、Privacy/Legal、B9 owner、Human A–F role-playは独立して閉じる。

Business Decision completed ≠ Production Ready.

## 12. Current Decision

- Business Journey: **accepted as implementation input**.
- Overall Architecture Fit: **PARTIAL FIT / NO CONFLICT**.
- New FACTACT Core Object: **not authorized / not required at present**.
- Next implementation action: **MF-A**.
- Main merge: **not authorized**.
