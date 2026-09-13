# FACTACT Compression Evidence — Product Fit / Gap v1

Status: **BUSINESS → PRODUCT VALIDATION INPUT / FIT-GAP**
Date: 2026-09-13
Related: docs/17-factact-ux-translation-layer.md, docs/18-operator-work-context-v1.md, docs/48, docs/49, docs/50

## 1. Purpose

Business Laneで定義したHuman Work Compressionを、FACTACT自身の運用Evidenceで将来検証できるかを、現行Canonicalに照らしてFit / Partial Fit / Gapへ分類する。

本書はProduct実装指示ではない。
Core Object追加を要求しない。
Product Laneで既存Core / History / Audit / Work / Action / Change / Evidence / Relation / Projectionを使って実現可能性を確認するためのValidation Inputである。

---

## 2. Existing Canonical Evidence — FACT

現行Canonicalにはすでに以下の思想・Semanticsが存在する。

### FACT 1 — Work execution must avoid duplicate administration

doc18:

> Work → Action → evidence / observed result → Change → Verify → Commit → Person–Device Relation / Registry updated

> **一度行った仕事を、もう一度「記録する仕事」にしない。**

これはBusiness Laneで今回定義した「管理表更新作業をなくす」と直接整合する。

### FACT 2 — Operator Context reduces search work

doc18ではOperatorが別Spreadsheet / Chat / Folder / Tribal Knowledgeを探し回らず、Work内で必要Contextを得ることを要求している。

これはSEARCH Human Work CompressionのProduct-side foundationになる。

### FACT 3 — Procedure and Knowledge are available in Work context

doc18ではProcedure / Contextual Knowledge / target-specific exceptionsをWorkから利用可能にする。

これはStandardization / Knowledge ReuseによるHuman Work削減のfoundationになる。

### FACT 4 — Unknown is not silently converted to Fact

doc17 / doc18ではUNKNOWNを明示し、Suggestion / Recommendation / SelectionとConfirmed Factを区別する。

したがってCompressionのためにVerificationを消して品質を落とす設計にはなっていない。

### FACT 5 — Change and management reflection are separated semantically

doc17 / doc18ではAction → Change → Verify → Commit → Relation / Factの厳密性を維持する。

これは「作業したから自動的に現実も変わった」と誤認せず、Evidenceに基づいて管理情報を形成するfoundationになる。

---

## 3. Fit / Gap Matrix

| Business Evidence Need | Current Fit | Reason / Gap |
|---|---|---|
| Work Created | FIT | WorkがCore operational unitとして存在 |
| Work Ownership / Assignment | FIT | Canonical UX / ownership contextあり |
| Work Context / Related Entity | FIT | Operator Work Context / relation semanticsあり |
| Human Decision boundary | FIT | Human Decision / UNKNOWN / consequence preview思想と整合 |
| Action / Change distinction | FIT | Action → Change → Verify → CommitがCanonical |
| Evidence attached to Work/Change | FIT | Evidence / observed resultをCanonicalで要求 |
| Duplicate registry update elimination | FIT in principle | doc18 Section 7で明示。ただしService Model横断の実装範囲は要確認 |
| Context Search reduction | PARTIAL FIT | ContextをWorkへ集約するUX思想はあるが、SEARCH時間計測は未確認 |
| Procedure reuse | FIT in principle | ProcedureをWorkから1 actionで利用可能にする思想あり |
| Knowledge reuse | FIT in principle | Contextual Knowledgeあり。Reuse event計測は未確認 |
| Work Started timestamp | PARTIAL / UNKNOWN | Work lifecycle/historyから取れる可能性。Canonical evidenceとして確認必要 |
| Human Action duration | GAP / UNKNOWN | Human Timeを直接計測するCanonicalは確認できていない |
| Human Touch count | GAP / UNKNOWN | Action/historyから推計可能性はあるが定義未確認 |
| Waiting state / waiting duration | PARTIAL / UNKNOWN | SUPPORT側Waiting概念との整合可能性があるがBusiness evidenceとして未確認 |
| Rework / Reopen | PARTIAL / UNKNOWN | Historyで表現可能性。明示metric未確認 |
| Automation executed | GAP / UNKNOWN | External Action / automation execution evidenceの標準event定義未確認 |
| Management Projection generated | PARTIAL FIT | Projection思想との整合はあるがCompression evidenceとしての生成/更新event未確認 |
| One Work → multiple management views | PARTIAL FIT | Relation / Registry / Projectionで実現可能性。実装Pattern確認必要 |
| Reporting without duplicate input | FIT in principle / implementation unknown | Core思想は整合。Management reporting実装範囲は要確認 |
| Compression metric calculation | GAP | Product metricとして未定義。Business analytics/projectionでよい可能性あり |

---

## 4. Important Finding

今回のBusiness Modelのために、新しいFACTACT思想を追加する必要は現時点では見えていない。

むしろ既存Canonicalにすでに：

> **一度行った仕事を、もう一度「記録する仕事」にしない。**

が存在する。

Business Laneで今回発見したのは、このProduct PrincipleがUX価値だけではなく、**Managed CapabilityのUnit Economicsを変える可能性がある**というBusiness Meaningである。

つまり：

> Product Principle → Human Work Compression → Delivery COGS Reduction → Customer Price / Margin Flexibility

という接続が新しく明確になった。

---

## 5. Do NOT Turn FACTACT into a Time Tracking System

Human Work Compressionを測るために、OperatorへStopwatch入力や詳細Timesheetを常時要求すると、FACTACT自身が新しい管理Workを作る。

これはCore Principleに反する。

> **KAIZENするために、KAIZENのための仕事を増やさない。**

したがってEvidence取得優先順位は：

1. System eventから自然に取れる
2. Existing Work lifecycleから推計できる
3. External System evidenceから取れる
4. Validation期間だけ限定計測する
5. 常時Human入力を増やす — 最後の手段

とする。

---

## 6. Recommended Product Validation Questions

Product Laneでは新機能実装より先に、以下を既存Coreで回答する。

### Q1. Work lifecycle timestamps

Work created / assigned / opened / action / waiting / resumed / completed等のHistoryを既存構造から取得できるか。

### Q2. Human vs System Action

ActionがHuman executionかSystem / External executionかをEvidenceとして区別できるか。

目的はAI判断を自動化することではなくHuman Work量を測ること。

### Q3. Duplicate Administration

Workで確認されたFact / Relation / Changeを、別Registry Flowへ再入力せず複数Projectionで利用できるか。

### Q4. External Evidence

MDM / IdP / SaaS / Monitoring等のExternal EvidenceをWork / Changeへ接続し、Humanが同じ情報を再記録しなくてよいか。

### Q5. Knowledge Reuse

Procedure / KnowledgeがWorkで利用されたことを、Operator入力を増やさず確認できるか。

### Q6. Waiting / Rework

Waiting / Resume / Reopenを既存History semanticsで表現できるか。

### Q7. Management Projection

Daily WorkからMonthly / Management Viewを生成する際、Reporting専用の再入力が必要にならないか。

### Q8. Measurement Boundary

Human durationをProduct Coreへ持つ必要が本当にあるか。それともValidation instrumentation / analytics layerで十分か。

---

## 7. Likely Architecture Direction — PROPOSAL

現時点ではHuman Work CompressionをCore domain objectにしない。

候補：

> Core operational records
> → immutable History / Audit / Evidence
> → Analytics / Projection
> → Compression Metrics

つまりCompression RateはFactそのものではなく、複数Fact / Eventから計算される**Derived Management Metric**として扱う方向が自然。

例：

- Work count
- Action events
- Actor type
- lifecycle timestamps
- Waiting transitions
- Change / Commit
- Reopen

からAnalytics Layerで：

- Human Touches
- Elapsed Time
- Waiting Time
- Rework Rate
- Automation Ratio

等をProjectionする。

Human Work MinutesだけはSystem Eventから正確に取れない可能性があるため、Time Study期間のSampling / Observationと組み合わせる。

---

## 8. Human Time Measurement — PROPOSAL

常時Timesheetを避けるため、三段階で検証する。

### Level 1 — Event-derived

System eventsだけで取れるもの：
- Count
- Touch
- lifecycle
- Waiting
- Reopen
- Automation

### Level 2 — Sampled Time Study

代表Workについて一定期間だけHuman active timeを観測する。

### Level 3 — Statistical / Operational Model

十分なFACTがたまった後：

`Work Volume × Median Active Human Time by Work Type / Step`

で月間Human Workを推定する。

ただし推定値はObserved Factと区別する。

---

## 9. Product Acceptance for Business Validation

Business Laneが価格再検証へ進むために、FACTACT Product側で最低限欲しい状態：

1. Work / Action / Change / Evidence / Relationが追跡可能
2. Human / System executionを区別可能
3. lifecycle / waiting / reopenを追跡可能、または不足を明示
4. Work結果を別管理表へ再入力せずProjectionへ利用可能
5. External EvidenceをWorkへ接続可能
6. Reporting用の二重入力を要求しない
7. Analytics LayerでWork Volume / Touch / Waiting / Rework / Automationを集計可能
8. Human TimeはSamplingで補完可能

これらを満たせば、Business Model検証のためだけにFACTACT Coreを大きく変更する必要はない可能性が高い。

---

## 10. Business Implication

FACTACTの価値を「Ticket管理効率化」に限定しない。

Business側では次の二つを分けて評価する。

### Customer-side

> 同じIT Functionを維持・向上しながら、顧客の不要Human Workをどれだけなくしたか。

### atLIB-side

> 同じIT Functionを提供しながら、atLIB Delivery Human Work / COGSをどれだけ減らしたか。

FACTACTは両方のOperating Modelを変える可能性がある。

---

## 11. Current Conclusion

### FIT

FACTACTの既存思想はHuman Work Compression仮説と強く整合する。
特にDuplicate Administration elimination / Operator Context / Evidence-based Change / Procedure / Knowledgeは直接的なfoundationである。

### GAP / UNKNOWN

主な不足確認点は新しいBusiness Objectではなく**Measurement / Instrumentation**である。

- Human duration
- Human vs System Action
- Waiting duration
- Rework
- Automation execution
- Management Projection generation

### Decision

現時点でCore Object追加はDecisionしない。

Product Laneへは「新しい機能を作る」ではなく、既存CoreでQ1〜Q8をFit / Gap確認するValidation Inputとして渡す。
