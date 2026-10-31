# IT経営KAIZEN 継続支援 — Quarterly Management / KAIZEN Review v1

Status: **WORKING CANONICAL — BUSINESS / REPORTING SERVICE SPEC**

この文書は、IT経営KAIZEN 継続支援におけるQuarterly Reviewを、Monthly Reportの3か月合算ではなく、Assessment / Annual Reviewで経営とDecisionした1-Year KGIに対して、複数月のFACTから軌道・Trend・Gap・Risk・KAIZEN効果を確認し、次QuarterのDecisionへつなげるManagement Reviewとして定義する。

> **Quarterly Reviewの中心Question：このままで、経営と決めた1年後のKGIへ近づいているか？**

## 1. Annual Cycle上の位置づけ

> **Assessment → 1-Year KGI → Daily Work → Monthly KPI / KAIZEN → Quarterly Management Review → ACT / CHANGE → Annual KGI / CHANGE Review → NEXT KGI**

Monthlyが日常Workと直近KAIZENを管理する単位であるのに対し、Quarterlyは複数月のFACTを使って「現在の進み方そのものが妥当か」をReviewする。

Quarterlyの目的は3か月分の件数報告ではない。

## 2. Quarterly Reviewが答える問い

1. 1-Year KGIに対して現在どこまでCHANGEしているか。
2. KPI / FACTは単月変動ではなくどのようなTrendを示しているか。
3. 実施したKAIZENは実際にCHANGEを生んだか。
4. CHANGEしていない / 悪化している領域はどこか。
5. 新しく見えてきたGap / Risk / UNKNOWNは何か。
6. 現在のKAIZENを続けるべきか、変えるべきか。
7. 次QuarterにHuman Decisionが必要なことは何か。

## 3. Quarterly Review構成 — PROPOSAL

### Page 1 — Executive / KGI Progress Summary

経営 / IT責任者が最初に見るページ。

#### A. 1-Year KGI
- KGI
- Baseline
- Target / Expected State
- Target date
- KGI Owner / Decision Authority

#### B. Current Position

3か月のFACTを使い、KGIに対する現在位置を示す。

人工的な達成Scoreを必須にしない。Quantitative KGIではBaseline / actual / targetを比較し、State KGIではEvidenceで状態を確認する。

#### C. Key CHANGE / NEW FACT

Quarter内に確認できた重要CHANGEを示す。

> **Before FACT → KAIZEN / Decision → ACT → After FACT → CHANGE / NEW FACT**

「実施した施策一覧」ではなく、実施結果として何が変わったかを優先する。

#### D. Employee Time Created — applicable only

社員創出時間が利用できるKGIでは、
- Quarter創出時間
- Year-to-date累計
- 主な創出要因
- 算定根拠
を表示候補とする。

EstimateはEstimateとして明示する。

#### E. Management Decision Required

Quarterlyで経営 / IT責任者がDecisionすべき事項を明示する。

## 4. Trend Review

Monthlyでは断定できない複数月の変化を確認する。

候補：
- KGI-linked KPI Trend
- Employee Waiting Trend
- Human Work Trend
- Manual Action / Rework Trend
- Repeat / Recurrence Trend
- Incident / Business Impact Trend
- Vendor Waiting / Dependency Trend
- Service Quality Trend
- Knowledge / Standardizationによる変化
- Current State / UNKNOWNの変化

Trendは単なる増減ではなく、KGI / Futureに対して何を意味するかを確認する。

AIはTrend候補を提示できるが、因果関係をEvidenceなしに確定しない。

## 5. KAIZEN Effect Review

Quarterlyでは、実施したKAIZENについて「やったか」ではなく「効いたか」をReviewする。

最低限の考え方：

> **Baseline / Before → KAIZEN Option → Human Decision → ACT → After → CHANGE / No Change / UNKNOWN**

分類候補：
- CHANGE Confirmed
- Partial CHANGE
- No Material CHANGE observed
- Verification Pending
- UNKNOWN

これらは独自Scoreではなく、Review状態の表現候補である。

期待したCHANGEが確認できない場合も隠さない。それ自体をNEW FACTとして次のKAIZENへ使う。

## 6. 6 Lensesによる次QuarterのKAIZEN

Quarterlyでは、蓄積したFACT / Trend / Difference / Gapに対し、6 Lensesを使って次のKAIZEN Optionを形成する。

> **なくす・自動化する・標準化する・任せる・残す・整える**

全Lensを機械的に埋めない。

例：
- Repeat Workが残る → なくす / 標準化する / 自動化する
- Human Waitingが大きい → 任せる / 整える
- Vendor Waitingが構造化 → 整える / 任せる
- Human Decisionが価値を持つ → 残す

AIはOptionをSuggestできる。何を採用するかはHuman Decision。

## 7. KGI軌道が悪い場合

KPIが想定方向へ動いていない場合、KGIを自動的に下げない。

> **FACT → Difference / Gap → Root Cause Hypothesis → 6 Lenses → KAIZEN Option → Human Decision → ACT**

を先に行う。

KGI変更は、Future / Business Priority / 重大Risk / 前提FACT等の変更が確認され、HumanがDecisionした場合に行う。

変更時は旧KGIを上書きせず、Evidence / Reason / Decisionを追跡可能にする。

## 8. Quarterly Decision Types — PROPOSAL

Quarterly Reviewから生まれるDecisionを、少なくとも次のように整理できる。

- Continue：現在のKAIZEN / ACTを継続
- Change Approach：KAIZEN方法を変更
- Add ACT：追加ACTを実施
- Change Actor：Customer / Existing Vendor / Other Vendor / atLIB等のActorを変更
- Investigate：重要UNKNOWNのEvidence取得
- Change KGI：新しいFACTに基づきKGI自体を変更
- No Action：現時点では変更しない

この分類はBusiness UX候補であり、新しいFACTACT Core Objectを要求しない。

## 9. Service QualityとKGIを混同しない

QuarterlyではService Desk等の初動SLO TrendもReviewできるが、それを顧客のKGI達成そのものと混同しない。

- Service Quality：atLIB Serviceが正常に機能しているか
- KGI / KPI：会社が目指すCHANGEへ近づいているか

Service Qualityが悪い場合はatLIB側のKAIZEN対象となる。

## 10. Commercial Neutrality

Quarterly ReviewでKAIZEN Optionが見つかっても、atLIBへの追加発注を前提にしない。

> **何を変えるかを先にDecisionする。誰が担うかは、その後に決める。**

Actor候補：
- Customer
- Existing Vendor
- Other Vendor
- atLIB
- 実施せずEvidence追加

atLIBがActorとして選ばれ、自動化 / RPA / System変更 / 高度技術対応等が必要な場合はKAIZEN Projectとして別途扱うことができる。

## 11. AI / Human Review

基本FACT集計はAI OFFでも成立させる。

> **FACTACT集計 → AI Trend / Difference / KAIZEN Option支援 → Human Review → Quarterly Review確定 → Human Decision**

AIは、
- multi-month Trend候補
- Difference
- Attention Point
- Risk / Impact候補
- Root Cause Hypothesis
- 6 LensesによるKAIZEN Option
- Management向け説明文
を支援できる。

AIは、Evidenceなしに因果 / Root Cause / FACTを確定しない。

## 12. Quarterly Meeting — PROPOSAL

Quarterly ReviewはReport送付だけではなく、経営 / IT責任者とのManagement Review Sessionとして提供する方向を候補とする。

Meetingの目的：
- Report読み上げではない
- KGIへの軌道確認
- 重要CHANGE / Gap / Riskの理解
- 次QuarterのKAIZEN / ACT / Actor Decision

具体的なMeeting時間、参加者必須条件、契約内回数はPricing / Service Scope設計時に確定する。

## 13. 顧客向け短縮表現候補

> **3か月ごとに、1年後の目標へ近づいているかを確認する。**
>
> 毎月のFACTを3か月のTrendとして見直し、実施したKAIZENが本当に効いているかを確認します。このまま続けるのか、改善方法を変えるのか、次に何をDecisionするのかを経営とReviewします。

## 14. FACTACT実装境界

Quarterly Review専用のCore Objectや独自ScoreをBusiness Laneから要求しない。

既存のFact / Evidence / Work / Decision / Action / Change / Relation / Knowledge等から、Query / Aggregation / Difference / Trend / Projection / View / AI assistanceで表現することを優先する。

実現不能が確認された場合のみProduct LaneへGAPとして返す。

## 15. AnnualへのHandoff

Quarterly Reviewで形成された、
- KGI progress
- KPI Trend
- Decision
- ACT
- CHANGE / NEW FACT
- unresolved Gap / Risk / UNKNOWN
をAnnual KGI / CHANGE Reviewへ引き継ぐ。

AnnualではQuarterlyを4回並べるのではなく、Assessment / 前年Baselineと1年後のactual FACTを比較し、経営とDecisionしたCHANGEが本当に実現したかを確認する。

> **Monthlyで運用する。Quarterlyで軌道をDecisionする。Annualで会社のCHANGEを確認する。**
