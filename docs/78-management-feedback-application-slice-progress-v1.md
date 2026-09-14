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

No FACT promotion. No FACTACT Core change. No migration added for MF-B。

Validation is currently running; completion evidenceはFull CI green後に追記する。

## 4. MF-C — Human NEXT DECISION / Route Outcome

Status: **NEXT**

Business Contract routes:
- A — Direct ACT
- B — Focused Confirmation
- C — Design Assessment
- D — Stop / Hold

Implementation intent:
- Human-only Decision command。
- AIはcandidate route suggestionまで。commit不可。
- A/B/DでAssessment lifecycleを自動開始しない。
- CのみHuman Decision後にAssessment proposal / handoff pathへ進行可能。
- atLIBをActorとして自動選択しない。
- route変更はsilent overwriteせず履歴 / auditを保持。
- Business labelをFACTACT Coreへ追加しない。

詳細schema / APIはMF-B validation完了後、既存Audit / lifecycleで成立するかを先にFit確認して決める。

## 5. MF-D / E / F Remaining

### MF-D Decision-time Context Snapshot
Decision時点のFuture / Known Context / UNKNOWN / GAP / unresolved Hypothesis / Evidence Needed / selected Route / Customer Restatement等をimmutableに追跡する。

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
