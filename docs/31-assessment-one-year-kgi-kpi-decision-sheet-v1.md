# IT経営KAIZEN Assessment — 1-Year KGI / KPI Decision Sheet v1

Status: **WORKING CANONICAL — BUSINESS / ASSESSMENT HANDOFF**

この文書は、IT経営KAIZEN 設計Assessmentで形成した経営Decisionを、継続支援 / KAIZEN Project / 顧客自身 / 既存Vendor等によるACTと、FACTACT上の継続的なCHANGE確認へ引き継ぐための「1-Year KGI / KPI Decision Sheet」のBusiness Requirementを定義する。

本SheetはKPI管理表を作ること自体を目的としない。

> **Assessmentで経営者と決めた「1年後に会社のITをどう変えるか」を、日々のWorkとFACTへ接続する。**

## 1. Sheetの役割

Assessmentの完成をReport納品で終わらせない。

> **FUTURE → FACT / UNKNOWN → GAP → 6 Lenses → KAIZEN Option → Human Decision → 1-Year KGI → KPI / Verification → ACT / Actor → Daily Work → CHANGE / NEW FACT**

本SheetはAssessmentの最終Decisionと、その後の実行・継続運用の開始点を同じ情報でつなぐ。

## 2. 1-Year KGIの定義

IT経営KAIZENにおけるKGIは、Assessmentで確認した現在地のFACT / UNKNOWNとFutureとのGapに対し、HumanがDecisionした**1年後に実現したいCHANGE**である。

> **KGI = 1年後に実現したいCHANGE**

KGIはAIによる未来予測、atLIBによる成果保証、根拠のない改善率ではない。

KGIは、
- Current FACT / UNKNOWN
- Future
- Gap
- 採用するKAIZEN
- 実行可能性
- Actor / Authority
- 継続運用方法
を踏まえてHumanがDecisionする。

## 3. KGIの形式

KGIを数値だけに限定しない。

### A. Quantitative CHANGE

例：
- Employee WaitingをBaselineから削減する
- 入社IT WorkのHuman WorkをBaselineから削減する
- 業務停止時間を削減する

定量値を置く場合、Baselineと測定方法を明示する。

### B. State CHANGE

例：
- 入退社時のAccount Lifecycleが標準Workflowとして運用されている
- 重要AccountのAuthority / Current Stateが確認可能な状態になっている
- 重要Vendorの責任境界とEscalation経路が明確になっている

状態KGIも感覚で達成判定せず、Evidence / FACTでVerificationする。

## 4. KGI数 — PROPOSAL

初期設計では、経営が本当に優先するKGIを**原則3つ程度**に絞ることを推奨候補とする。

これは固定上限ではなく、Assessmentで多数のGapが見つかった場合でも、すべてを1年間の経営目標へ昇格させないための設計方針である。

> **この1年間で、会社のITを何から変えるかをDecisionする。**

KGI数の最終標準は実案件で検証する。

## 5. KPIの定義

> **KPI = KGIのCHANGEへ向かっているかを、日々のWorkから確認するFACT**

KPIを先に並べてKGIを後付けしない。

> **KGI → Verification Question → 必要なFACT → KPI**

を基本順序とする。

可能な限り、FACTACTの日常Workから自然に形成・集計できるFACTを使い、KAIZEN管理のための二重入力を増やさない。

> **KAIZENするために、KAIZENのための仕事を増やさない。**

## 6. 社員創出時間 — Representative Management Metric

生産性 / 業務効率に関するKGIでは、**社員創出時間**を経営向け代表指標候補として扱う。

> **社員創出時間 = IT経営KAIZENによるCHANGEによって、IT対応・待機・重複作業・手作業等から解放され、本来の仕事に使えるようになった社員時間**

対象はIT担当者だけに限定しない。

- IT運用担当者のHuman Work削減
- 一般社員のIT Waiting削減
- 重複入力 / 手作業削減
- 障害による業務停止時間削減
等を、Evidenceが存在する範囲で扱う。

社員創出時間は全KGIを一本化する万能Scoreではない。

Security / Risk / Governance / Business Continuity等は、そのCHANGEを最も正しく示すFACTで評価する。

社員創出時間の算定はFACT FIRSTとし、Baseline / After / 対象件数等の根拠を保持する。取得不能はUNKNOWN、推計値はEstimateとしてFACTと区別する。

## 7. 6 Lensesとの関係

6 LensesはKGI/KPIの採点軸ではなく、FACTからKAIZEN Optionを考える共通Lensである。

> **なくす・自動化する・標準化する・任せる・残す・整える**

役割は次のように分ける。

- FUTURE：どんな会社にしたいか
- KGI：1年後に何を変えるか
- KPI：変わっているかを何のFACTで確認するか
- 6 Lenses：仕事をどう変えるか
- Human Decision：何を実行するか
- ACT：誰が実行するか
- CHANGE / NEW FACT：本当に何が変わったか

## 8. Decision Sheet標準構造 — PROPOSAL

1 KGIにつき、最低限次を保持する方向とする。

### A. FUTURE / Management Intent
- 経営者が実現したいFuture
- このKGIがFutureへどうつながるか

### B. Current FACT / UNKNOWN
- Baselineとなる確認済みFACT
- 未確認のUNKNOWN
- Evidence source

### C. GAP / Management Meaning
- Futureとの差
- Risk / Impact
- 経営上なぜ重要か

### D. 1-Year KGI
- 1年後に実現したいCHANGE
- Quantitative / State CHANGE
- Target date
- KGI Owner / Decision Authority

### E. KPI / Verification Plan
- Verification Question
- KPI / FACT
- Baseline
- Target / expected direction when appropriate
- Measurement source
- Measurement cadence
- UNKNOWN / Estimate handling

### F. KAIZEN Design
- 6 LensesによるKAIZEN Option
- 採用したKAIZEN
- 採用しなかったOption / 保留事項（必要時）

### G. Decision / ACT / Actor
- Human Decision
- ACT
- Actor：Customer / Existing Vendor / Other Vendor / atLIB / Pending
- Authority / Approval requirement
- Expected timing

### H. Review
- Monthly：KPI / Work FACT / KAIZEN / CHANGE
- Quarterly：Trend / KGI progress / Decision Review
- Annual：KGI vs actual NEW FACT / NEXT KGI

## 9. Monthly / Quarterly / AnnualへのHandoff

### Monthly

> **今月、仕事は良くなったか？**

KPI、Service FACT、実施ACT、確認できたCHANGE、次のKAIZEN Option、Decision Requiredを確認する。

### Quarterly

> **このままで1年後のKGIへ近づいているか？**

複数月のTrend、継続Gap、Risk / Impact、KAIZEN効果、KGIへの軌道をReviewする。

### Annual

> **経営と決めたCHANGEは実現したか？**

Assessment / 前年Baselineと実際のNEW FACTを比較し、達成 / 未達を事実として確認する。

未達を失敗として隠さない。未達そのものをNEW FACTとして、次のRoot Cause Hypothesis / KAIZEN / Decisionへつなげる。

その時点のNEW FACTを次年度Baselineとし、次の1-Year KGIをHumanがDecisionする。

## 10. KGI変更ルール — DIRECTION

KGIは途中変更可能とするが、都合よく上書きしない。

変更候補例：
- Future / Business Priorityの変更
- 新しい重大FACT / Riskの判明
- 前提条件の変更
- 実行可能性に関する新しいEvidence

変更時は、旧KGI、変更理由、新しいEvidence / FACT、Human Decision、新KGIを追跡可能にする。

> **KGI v1 → NEW FACT / Evidence → Human Decision → KGI v2**

## 11. atLIBが約束すること / 約束しないこと

atLIBがすべてのKGI達成値を成果保証することを本Sheetの前提としない。

本サービスが提供する中心価値は、

> **目標をDecisionする → FACTで追う → 6 LensesでKAIZENする → ACTする → CHANGEをFACTで検証する**

というCycleを継続することである。

KAIZEN ActorはatLIBに限定しない。Assessmentの成功条件もatLIBへの継続発注ではない。

## 12. FACTACTへの実装境界

本Sheetを実現するためだけにKGI / KPI専用Core Objectを新設することをBusiness Laneから要求しない。

まず既存FACTACTのDecision / Context / Work / Fact / Evidence / Action / Change / Relation等と、View / Projection / Query / Aggregation / Difference / Rule / Reportingで表現可能かをProduct Laneで確認する。

> **Service仕様を現在のFACTACT CoreからどうProjectionするかを先に考える。**

既存Coreで表現できないことが確認された場合のみGAPとしてProduct Laneへ返す。

## 13. 顧客向け1枚表現候補

> **1年後、会社のITをどう変えるか。**
>
> Assessmentで現在地を事実で確認し、経営者と1年後の目標を決めます。
> 日々のIT業務から進捗を確認し、6つの視点で継続的にKAIZENします。
> 1年後、本当に何が変わったかを事実で確認し、その事実から次の1年を決めます。

生産性改善を含む場合の補助表現候補：

> **ITで失われていた時間を、社員が未来をつくる時間へ。**

この表現は社員創出時間を説明する候補であり、すべてのAssessment価値を時間換算するものではない。
