# IT経営KAIZEN KGI / KPI / 社員創出時間 Model v1

Status: **CANONICAL DIRECTION — BUSINESS / CUSTOMER VALUE & REPORTING**

本書は、IT経営KAIZEN 設計Assessmentから継続支援、FACTACTによる日常運用、Monthly / Quarterly / Annual Reviewまでを、KGI / KPI / 6 Lenses / 社員創出時間 / CHANGEで一本につなぐBusiness Laneの設計原則を記録する。

本書は新しいFACTACT Core仕様を定義しない。既存FACTACT Core / Design PrinciplesをBusiness / Service / Reportへ翻訳する。

## 1. 一本のService Cycle

> **FUTURE → FACT / UNKNOWN → GAP → 6 Lenses → KAIZEN Option → Human Decision → 1-Year KGI → ACT → Daily Work → KPI / NEW FACT → Monthly KAIZEN → Quarterly Review → Annual CHANGE Review → NEXT KGI**

Assessmentと継続支援を別々の価値として切断しない。

> **Assessmentで経営者と決めた1年後のCHANGEを、日々のIT Workから実現し、その変化をFACTで確認し、次の1年へつなげる。**

継続支援は単なるBPOではない。Work受託は手段であり、経営Decisionを日常運用と継続的KAIZENへ接続することが中心価値である。

## 2. KGI — 1年後に実現したいCHANGE

IT経営KAIZENにおけるKGIは、Assessmentで確認したFutureと現在のFACT / UNKNOWN / Gapに対して、HumanがDecisionした**1年後に実現したいCHANGE**である。

KGIは、根拠のない未来予測、AIによる成果予測、atLIBによる成果保証ではない。

> **現在のFACT + 採用するKAIZEN + 運用設計 + 継続運用を前提に、1年後に目指すCHANGEをHumanがDecisionする。**

KGIは定量値だけに限定しない。

- 定量CHANGE：時間、Waiting、Human Work、業務停止等をFACTで比較できる状態
- 状態CHANGE：標準Workflow、Authority、Current State、管理可能状態等をEvidence / FACTで確認できる状態

人工的なScoreへ無理に変換しない。

KGI数の具体的上限は現時点では未確定。経営上重要な少数のCHANGEへ絞る方向とし、具体数はProductization Reviewで確定する。

## 3. KPI — KGIへ向かっているかを見るFACT

> **KPI = KGIとしてDecisionしたCHANGEへ向かっているかを、日々のWorkから確認するFACT**

全顧客共通のKAIZEN KPIを固定しない。KPIはKGIから逆算して選ぶ。

候補例：
- Work Time
- Human Work
- Employee Waiting
- Vendor Waiting
- Manual Action
- Repeat / Reoccurrence
- 業務停止時間
- Event完了までの時間
- 未完了 / Waiting Work
- 標準化・自動化後のBefore / After FACT

一般的なHelp Desk KPIはOperational FACT / 補助指標として利用できるが、IT経営KAIZENの価値を一次解決率等だけで定義しない。

> **取れるKPIを並べて経営目標に見せるのではなく、経営が決めたKGIを確認するために必要なFACTをKPIとして見る。**

## 4. 6 Lenses — 仕事をどう変えるか

KGI / KPIとは役割を分ける。

- **KGI**：どこまで変えるか
- **KPI**：変わっているかを何のFACTで確認するか
- **6 Lenses**：仕事をどう変えるか

6 Lenses：
> **なくす・自動化する・標準化する・任せる・残す・整える**

6 LensesをScore化しない。FACTからKAIZEN Optionを考える共通視点としてAssessmentと継続支援の両方で使う。

> **FACT → 6 Lenses → KAIZEN Option → Human Decision → ACT → CHANGE → NEW FACT**

## 5. 社員創出時間 — PRODUCT VALUE CANDIDATE

### 5.1 定義

**社員創出時間**は、IT経営KAIZENによるCHANGEによって、社員がIT対応、待機、重複作業、手作業等から解放され、本来の仕事へ使えるようになった時間を、Before / AfterのFACTから確認する考え方である。

> **社員創出時間 = IT経営KAIZENによって会社へ戻すことができた社員の時間**

対象はIT担当者だけに限定しない。

- IT運用側：問い合わせ対応、入退社作業、転記、集計、手作業、Vendor調整等
- 利用社員側：ITトラブル待機、問い合わせ待ち、利用不能、重複入力、不要なIT手続等

会社全体でどれだけ時間が創出されたかを見ることができる。

### 5.2 FACT FIRST

社員創出時間を推測値だけで成果として断定しない。

基本は、BaselineとKAIZEN後の実績FACTを比較する。

例：
> **Baseline Human Work × Event数 − Current Human Work × Event数 = 確認できた創出時間**

Waiting等についても、取得できるFACTの範囲でBefore / Afterを比較する。

データ不足部分を無理に補完せずUNKNOWNとして残す。推計を利用する場合はFACTと混同せず、Assumption / Estimateとして明示する。

### 5.3 すべての価値を社員創出時間へ換算しない

社員創出時間は、特に生産性・業務効率系KAIZENを経営へ翻訳する代表指標候補である。ただしIT経営KAIZENの全価値を時間だけで評価しない。

- 生産性 / 業務効率：社員創出時間を主要なCHANGE FACT候補とする
- 安定性 / 事業継続：業務停止、影響範囲、復旧、再発等のFACTで確認する
- Security / Risk：Risk状態、Exposure、対応状態等のCHANGEで確認する
- Governance / Management：UNKNOWN解消、Authority、Current State、Decision可能状態等のCHANGEで確認する

> **測れるものを時間に変換するのではなく、そのKAIZENが生んだ価値を最も適切なFACTで示す。**

## 6. Monthly / Quarterly / Annual

### Monthly — Work / KPI / KAIZEN

問い：
> **今月、仕事は良くなったか？**

確認対象：
- Service Quality / SLO FACT
- KGIにつながるKPI
- 今月確認できたCHANGE / NEW FACT
- 社員創出時間（該当する場合）
- 6 Lensesから形成したKAIZEN Option
- Decision Required
- 次月ACT

Monthly Reportは処理件数報告だけにしない。

### Quarterly — KGI Trend / Decision Review

問い：
> **このままで1年後のKGIへ近づいているか？**

3か月のFACTからTrend、継続Gap、KAIZEN効果、未改善、Risk / UNKNOWNを確認する。

KGI未達見込みを理由に機械的にKGIを下げない。FACTを確認し、6 LensesからKAIZEN Optionを再形成し、HumanがDecisionする。

会社のFutureや重要な前提FACTが変化した場合、Human DecisionによってKGIを変更できる。その場合は旧KGIを上書きせず、変更理由とDecision履歴を残す。

### Annual — KGI / CHANGE Review

問い：
> **経営と決めたCHANGEは、本当に実現したか？**

Assessmentまたは前年Baselineと1年後のNEW FACTを比較する。

達成 / 未達を事実どおり確認し、未達を隠さない。未達自体も次のKAIZENにつながるNEW FACTである。

その時点のNEW FACTを新しいBaselineとし、FutureとのGapを再確認し、次の1年のKGIをHumanがDecisionする。

> **Baseline → KGI → Daily Work → KPI → KAIZEN → CHANGE → NEW FACT → NEXT Baseline → NEXT KGI**

これを毎年螺旋的に続ける。

## 7. FACTACTとの関係

KGI / KPI / 社員創出時間のために新しいCore ObjectをBusiness Laneから要求しない。

まず既存のWork / Fact / Evidence / Relation / Decision / Action / Change / Knowledge / Authorityと、View / Query / Aggregation / Difference / Projection等から表現する。

社員創出時間も専用のCore Scoreではなく、Work Time、Waiting、Event Volume等のFACTを顧客向けにAggregation / Projectionした結果として扱う方向とする。

AIの役割：
- FACTのTrend / Difference整理
- 注目点 / 確認事項
- 6 Lensesに基づくKAIZEN Option候補
- 顧客向けReport文章化支援

Humanの役割：
- KGI Decision
- KPI妥当性確認
- KAIZEN採否
- ACT Decision
- KGI変更
- Annual Review / NEXT KGI Decision

> **AI Suggests. Human Decides. System Records.**

## 8. 顧客向け価値表現 — CANDIDATE

> **毎月、仕事が良くなっているかを見る。3か月ごとに、1年後の目標へ近づいているかを見る。1年後、会社が本当に変わったかを見る。その事実から、次の1年を決める。**

社員創出時間を使う場合の価値表現候補：

> **ITのために使っていた時間を、会社の未来をつくる時間へ。**

> **IT経営KAIZENは、会社から無駄なIT Workを減らし、社員が本来の仕事に使える時間を増やす。**

これらはCustomer-facing copy候補であり、最終販売表現は別途Reviewする。

## 9. Productizationで次に確定する事項

1. AssessmentのKGI設定Sheet / Decision UX
2. KGI数・優先順位の運用ルール
3. 定量KGI / 状態KGIのVerification方法
4. KGIからKPIを選ぶ標準手順
5. 社員創出時間のFACT取得・算定ルール
6. Monthly / Quarterly / Annual Report Template
7. KGI変更時のDecision / History表現
8. FACTACT現行仕様でのProjection FIT / GAP確認

新しいCore設計ではなく、まず顧客体験・Service仕様・Reportとして具体化し、既存FACTACT設計で表現できないものだけをProduct LaneへGAPとして返す。
