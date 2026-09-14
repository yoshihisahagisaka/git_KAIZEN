# Management Feedback Application Slice Progress v1

Status: **DEVELOPMENT / IN PROGRESS — DO NOT MERGE WITHOUT APPROVAL**  
Date: 2026-09-14

## 0. Purpose

Business LaneのManagement Feedback Customer Journeyを、現在構築中の無料IT経営診断システムへApplication / Translation Layerとして実装する進捗を記録する。

Business Lane `docs/71-management-feedback-business-output-specification-v1.md` は、2026-09-14のHuman Decisionにより本Development Laneでは **Business Contract input** として扱う。

同文書はUI / DB / API / Core Object specificationではない。DevelopmentはBusiness Meaningを弱めず、現行Diagnosis / FACTACT Architectureを優先再利用する。

Production / Controlled Pilot GOとは独立する。

## 1. Canonical Guardrails

- FACT FIRST.
- 分からないことを、分かったことにしない。
- AI Suggests. Human Decides. System Records.
- Customer Input ≠ Evidence-confirmed FACT.
- Human Approved Result ≠ FACT.
- UNKNOWNを隠さない。
- HYPOTHESISを原因確定として扱わない。
- Assessmentを自動推奨しない。
- atLIBをActorとして自動選択しない。
- A/B/C/DはBusiness Projectionであり、FACTACT Core Objectへそのまま移植しない。
- 5-page Outputを理由に専用Coreを追加しない。

## 2. MF-A — FUTURE UNKNOWN-safe / Page 2 Epistemic Separation

Status: **APPLICATION IMPLEMENTED / FULL CI VALIDATED**

Validated implementation head:
- `9c7b4574f498775530ad4cae11054251172552a2`

Validated CI:
- GitHub Actions Controlled Pilot Closure run #66
- Run ID `34828878614`
- Result: SUCCESS

Implemented:
- Q01 `分からない` を架空Futureへ変換せず、FUTURE UNKNOWNとしてCustomer-facing projection。
- `分からない` を含むmixed responseも安全側でUNKNOWN。
- Page 2を「現時点で把握していること / まだ確認が必要なこと」へTranslation。
- OBSERVATION / UNKNOWNをPage 2に保持。
- generic HYPOTHESISをPage 2からWHYへ分離。
- FACT / CONFIRMED_FACTへの自動昇格なし。
- synthetic Golden Testを追加。
- Real PostgreSQL / browser含むfull regression pass。

Core / migration change: **No**.

## 3. MF-B — WHY Connection Projection

Status: **IMPLEMENTATION IN VALIDATION**

Business Contract:

```text
HYPOTHESIS
↓
Supporting Observation / Context
↓
Evidence Needed
```

Implementation direction:
- 新Core Objectを追加しない。
- Human Approved `diagnosis_insights`、既存 `insight_sources`、OPEN `assessment_confirmation_items` を再利用。
- HYPOTHESIS / ROOT_CAUSE_HYPOTHESISとHuman Approved OBSERVATIONが同じapproved source provenanceを共有する場合のみSupporting Observationとして接続。
- `CONTRADICTS` relationはsupportとして利用しない。
- Evidence Neededは現在のOPEN Assessment Confirmation Itemのうち、対象HypothesisへHuman-linkedされたものを使用。
- Raw SourceRecord / Survey raw textをAI-04 Contextへ追加しない。
- source-less connectionをAIで補完しない。
- connection未成立でもDraft projectionは未接続として表現できるが、Customer-facing Report Approvalはfail-closedとする。

Implemented in current feature branch:
- Report prompt/policy version v2.
- WHY customer-facing projectionにSupporting Observation / ContextとEvidence Neededを追加。
- approved provenance refsをHypothesisのReport projection contextへ保持。
- AI-04 policyを現行5-page routingへ更新し、WHY connectionの推測生成を禁止。
- Report ApprovalにWHY connection readiness gateを追加。
- synthetic MF-B Golden Test追加。
- existing Report regression fixtureをHuman Reviewed Observation / Evidenceでgrounding。
- Handoff regressionを固定件数依存から、その時点のHuman Approved Insight / OPEN confirmation集合との完全一致検証へ変更。

No FACT promotion. No FACTACT Core change. No migration added for MF-B。

Current implementation head after regression fix:
- `f782ffbb7188f018898a8151b1caed4519823074`

Validation:
- GitHub Actions Controlled Pilot Closure run #81
- Run ID `34838643070`
- Status: IN PROGRESS at this record update.

## 4. MF-C — Human NEXT DECISION / Route Outcome

Status: **IMPLEMENTATION CONTRACT FROZEN — NEXT CODE SLICE**

Business Contract routes:
- A — Direct ACT
- B — Focused Confirmation
- C — Design Assessment
- D — Stop / Hold

### 4.1 Application model

A/B/C/DのBusiness labelをFACTACT Coreへ追加しない。Diagnosis Application側にgeneric `Management Feedback Outcome` を持ち、Customer-facing translationでA/B/C/Dを表示する。

Minimum persisted Meaning:
- diagnosis_case_id
- feedback_report_id
- selected_route: `DIRECT_ACT | FOCUSED_CONFIRMATION | DESIGN_ASSESSMENT | STOP_HOLD`
- material_decision
- rationale: optional
- next_action
- customer_restatement: optional but Pilotでは取得対象
- decided_by Human
- decided_at
- immutable decision-time context snapshot
- context hash
- audit command

### 4.2 Human authority

- Decision commandはSTAFF / authorized Human only。
- AIはroute candidateを別Proposalとして示せても、Decision rowを作成しない。
- Assessmentを自動選択しない。
- atLIBをActorとして自動選択しない。
- silent overwriteは禁止。修正は新Decision version / supersessionとして履歴を保持する。

### 4.3 Route behavior

- A: Direct ACT candidate handoff。Assessment lifecycleを自動開始しない。
- B: Focused Confirmation candidate handoff。Assessment lifecycleを自動開始しない。
- C: Design AssessmentをHumanが選んだことを記録する。ただしこのcommand自体はAssessment proposal / acceptanceを自動commitしない。
- D: Stop / Hold。Assessment lifecycleを自動開始しない。

既存Assessment lifecycleは当面別Human commandとして維持し、MF-FでRoute Cとの整合を閉じる。

### 4.4 Decision-time snapshot

MF-CとMF-Dは分離実装できるが、Decision保存時に最低限のimmutable snapshotを同時に記録する。snapshotにはCustomer-facing 5-page全文ではなく、Decision provenanceに必要な参照 / Meaningを保持する。

Minimum snapshot Meaning:
- current Future / Future UNKNOWN
- Human Approved Observation / UNKNOWN
- material GAP candidate refs
- unresolved Hypothesis refs
- Evidence Needed / OPEN confirmation refs
- approved feedback report id / version / content hash
- selected route
- material decision
- next action
- customer restatement if captured
- Human actor / time

Raw SurveyResponse / Transcript / AI raw outputをsnapshotへ複製しない。

### 4.5 API / failure rules

Planned admin command:
`POST /api/admin/it-management-diagnosis/cases/:id/feedback/decision`

Preconditions:
- Case = `FEEDBACK_PENDING`
- Feedback started
- delivered / bound Report exists
- Human actor
- optimistic case version match

Failure:
- stale version: 409
- feedback not started / wrong lifecycle: 409
- invalid route / fields: 422
- customer token / AI actor: reject
- audit failure: transaction rollback

Completion gateはMF-C Golden Testと既存Feedback regressionを通した後に有効化判断する。既存Caseをsilent backfillして架空Decisionを作らない。

### 4.6 Data change classification

MF-CはDiagnosis Application object追加であり、FACTACT Core changeではない。

Expected additive migration: **Yes**.
Expected architecture reset: **No**.
Business Decision Required: **No** for the above contract, unless implementation requires changing Business routes / authority / Assessment boundary.

## 5. MF-D / E / F Remaining

### MF-D Decision-time Context Snapshot
MF-Cでminimum immutable snapshotを先行保持し、MF-DではCustomer Correction後のre-decision / supersession、snapshot completeness、Pilot Evidence queryを完成させる。

### MF-E Pilot Instrumentation
AI Suggestion、Human Correction、Customer Correction、Human Approval、selected Route、Customer Restatement、Follow-up、manual re-entry、Feedback preparation time、Human Review timeを最小データで記録 / deriveする。

### MF-F Assessment / FACTACT Continuity
Route Cの場合のみ、Diagnosis ContextをProvenance付きでAssessmentへ渡し、その後既存FACTACT Decision / Work / Action / Change / Verify / Factへ接続するmapping contractをProduct Laneと確認する。

Typed temporal meaningsは単一Due Dateへ潰さない。

## 6. Business Contract / Canonical Reconciliation Note

Development implementationを止めないが、Business docs間にAssessment priceのcanonical差がある。

- 旧Canonical docs/17: ¥800,000（税別）
- Business Contract input docs/71: ¥1,200,000（税別）DECIDED

Developmentは新Management Feedback Application Sliceへ旧価格をhardcodeしない。5-page OutputでもpriceをHero表示しない。

価格を実装 / customer proposalへ接続する前にBusiness Lane側canonical reconciliationが必要。

これはArchitecture GapではなくBusiness Canonical整合事項である。

## 7. Production Readiness Boundary

Management Feedback Sliceの実装 / CI成功はControlled Customer Pilot GOを意味しない。

External Evidence、Anthropic provider、Google OAuth、Cloud Run worker、Secret/IAM、Monitoring、Cloud SQL backup/restore、staging E2E、Privacy/Legal、B9 owner、Human A–F role-play等は独立して閉じる。

Business Decision completed ≠ Production Ready.

## 8. Merge Boundary

- Implementation PR #2 remains Draft.
- `atlib-sales-tools/main` merge: **not authorized**.
- `git_KAIZEN` Development branch merge: **not authorized**.
