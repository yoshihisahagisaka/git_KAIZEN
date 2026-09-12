# IT経営KAIZEN Service Desk Work / Reporting Model v1

Status: **CANONICAL — BUSINESS / SERVICE DESIGN**

この文書は、IT経営KAIZEN 継続支援におけるService Deskの標準Work、Reporting、およびFACTACT / AI / Humanの責任分担を記録する。

## 1. Service Deskの商品定義

Service Deskは単なる問い合わせ対応代行ではない。

> **社員からのIT問い合わせをatLIBがリモートで受け、対応するだけで終わらず、そのWorkからFACTを形成し、Knowledge、管理、KAIZEN、CHANGE確認へつなげる。**

基本Loop：

> **受付 → 対応 → FACT形成 → Knowledge → 傾向把握 → KAIZEN → ACT → CHANGE確認 → NEW FACT**

## 2. 標準Work Catalog v1

初期標準Scope候補：

- 問い合わせ受付
- IT利用相談
- 一次切り分け
- リモート一次対応
- Password / Account系問い合わせ対応
- PC / 周辺機器問い合わせ対応
- 対象SaaS問い合わせ対応
- Incident一次受付
- Vendor Escalation
- Ticket / Status / Waiting管理
- 利用者への回答・完了確認
- Knowledge形成・再利用
- 問い合わせ傾向分析
- KAIZEN候補形成
- 実行したKAIZENのCHANGE確認
- Monthly / Quarterly / Annual Reporting

条件付きまたは別途相談 / 別途見積：

- Onsite対応
- PC修理・交換等の物理作業
- 高度な専門技術対応
- 大規模Incident対応
- 標準受付時間外の対応
- 24時間365日対応
- 標準Work Catalog外の業務

最終的な標準受付時間、SLA、対象System、Authority、件数上限等は販売仕様策定時に確定する。

## 3. Reportingの目的

Service Desk Reportは「何件処理したか」を報告するだけのBPO Reportにしない。

> **社員が何に困っているか、Service Deskが正常に機能しているか、何をKAIZENし、その結果として会社のITが実際にどう変わったかをFACTから確認する。**

同じKPI Reportを期間だけ変えて繰り返すのではなく、Monthly / Quarterly / Annualで役割を分ける。

> **Monthlyで運用を管理する。Quarterlyで傾向と経営DecisionをReviewする。Annualで会社が本当にどう変わったかを確認する。**

## 4. Monthly — Operational / KAIZEN Report

### 目的

直近1か月のService Desk運営状態を確認し、放置すべきでない問題、当月のKAIZEN / CHANGE、翌月の対応事項を明確にする。

主な利用者：IT責任者 / IT担当者 / Service Desk管理者

### 標準項目候補

- 問い合わせ件数
- 利用者数 / 利用状況
- Category別件数
- 部門別件数
- 初回応答時間
- 解決時間
- 一次解決率
- 再問い合わせ率
- 未完了件数
- 長期滞留件数
- Vendor Waiting件数 / Waiting期間
- Incident件数
- Knowledge形成 / 再利用
- 当月実施したKAIZEN
- 当月確認できたCHANGE / NEW FACT
- 翌月対応事項
- 直近のDecision Required

Monthlyでは、単月の増減だけから長期傾向やRoot Causeを断定しない。

## 5. Quarterly — Trend / Management Review

### 目的

3か月程度のFACTを横断し、単月では判断しにくいTrend、継続問題、KAIZEN成果、Risk / Impactを確認し、次QuarterのDecisionとKAIZENへつなげる。

主な利用者：IT責任者 / 経営

### 標準項目候補

- 主要KPIの3か月Trend
- 繰り返し問い合わせTop Theme
- Category / 部門 / System別Trend
- 社員待ち時間の推移
- 業務復旧時間の推移
- 再問い合わせ / 再発傾向
- Incident Trend
- Vendor Waiting / Vendor依存傾向
- Knowledge形成・再利用による変化
- KAIZEN Portfolio / 進捗
- KAIZEN Before / After比較
- 確認できたCHANGE / NEW FACT
- 未解消Gap / Root Cause Hypothesis
- Risk / Impact
- 次QuarterのKAIZEN Option
- Management Decision Required

QuarterlyではAIが複数月のFACTをもとにTrend、注目点、確認事項、Hypothesis、KAIZEN Optionの説明案を作成できる。ただし因果関係やRoot CauseはEvidenceなしに確定しない。

## 6. Annual — IT Management / CHANGE Review

### 目的

1年間の運用結果をAssessment時点または前年Baselineと比較し、会社のITが実際にどう変わったかを確認する。次年度のIT経営KAIZEN方針と経営Decisionへ接続する。

主な利用者：経営 / IT責任者

### 標準項目候補

- Assessment / 前年Baselineと現在の比較
- 社員のIT待ち時間の変化
- 業務復旧時間の変化
- 繰り返し問い合わせの変化
- Incident / 業務停止影響の変化
- 属人的Workの変化
- Knowledge / Standardizationの進展
- Vendor依存 / Riskの変化
- 実施した主要KAIZEN
- KAIZENによって確認されたCHANGE / NEW FACT
- Futureに対する現在のGap
- 年間で形成された重要Decision
- 未解消の重要UNKNOWN / Risk
- 次年度IT経営KAIZEN Theme

次年度Themeは、必要に応じて6 Lensesを利用する。

- なくす
- 自動化する
- 標準化する
- 任せる
- 残す
- 整える

Annual Reportの中心は年間Ticket処理件数ではない。

> **1年前と比べて会社のITがどう変わったか、その変化をFACTで経営へ示す。**

## 7. Employee Impact

Service Deskの価値をIT部門の工数削減だけで評価しない。

社員のIT利用体験および業務への影響を確認するため、次の指標を候補とする。

- 社員待ち時間
- 業務復旧時間
- 再問い合わせ率
- 繰り返し問い合わせ
- 自己解決化 / Knowledge再利用
- 未解決・長期滞留

特に、

> **ITによって社員が待たされる時間をどれだけ減らせたか**

は重要な顧客価値指標候補とする。

ただし「問い合わせ件数が減った」だけを改善と判定しない。Service Deskが利用されなくなっただけでも件数は減るため、再問い合わせ、復旧時間、滞留、Knowledge利用等の複数FACTからCHANGEを確認する。

## 8. AI OFFで成立するReporting

Service Deskの基本KPI集計はAIに依存させない。

Ticket / Work / Action / Relation / Status / Waiting / Incident / Knowledge / Decision / Change等の構造化された記録から、FACTACTがAI OFFでQuery / Aggregation / Difference / Relationを用いて算出できることを目標とする。

例：

- 問い合わせ件数
- Category別 / 部門別件数
- 初回応答時間
- 解決時間
- 一次解決率
- 未完了 / 長期滞留
- Vendor Waiting
- Incident件数
- Knowledge件数
- KAIZEN進捗
- Before / After比較
- CHANGE / NEW FACTの確認に必要な定量情報
- Monthly / Quarterly / Annualの期間比較

> **FACTACTが事実を集計する。AIがなくても基本Reportは成立する。**

なお、上記はBusiness Requirementであり、現行FACTACTですべて実装済みであることを意味しない。Product Laneでは既存Coreに対してFIT / GAP / CONFLICT / UNKNOWNを確認する。

## 9. AIのReporting Role

Service Desk ReportingにおけるAIの標準役割は、FACTを生成・確定することではない。

> **AIは、FACTACTが集計したFACTに基づき、顧客向けReportの所感・注目点・確認事項・KAIZEN候補を作成する。**

標準Flow：

> **FACTACT集計 → AI所感生成 → Human Review → 顧客向けReport確定**

AIが扱えるもの：

- FACTの要約
- 前月 / 前Quarter / 前年 / Baselineとの差分説明
- 注目すべき傾向の提示
- 確認すべき事項の提示
- Risk / Impact候補
- Root Cause Hypothesis候補
- KAIZEN Option候補
- 経営向け説明文案

AIが行ってはならないもの：

- Evidenceのない原因をFACTとして断定する
- UNKNOWNを推測で埋める
- Human Decisionを代替する
- 相関や時系列一致だけで因果関係を確定する

## 10. Human Review

AI生成Reportをそのまま顧客へ自動送付しない。

atLIB担当者が少なくとも次を確認する。

- 数値と元FACTの整合
- FACT / UNKNOWN / Hypothesisの混同がないか
- AIが因果関係を過剰に断定していないか
- 顧客Contextに対して誤解を招く表現がないか
- KAIZEN Optionが実行可能な候補になっているか
- Decision Requiredが適切か

最終的な顧客向けReportはHuman Review後に確定する。

## 11. 年間Service Cycle

Service DeskのReportingをAssessmentから切り離さない。

> **Assessmentで現在地をFACT化 → Monthlyで日常運用とKAIZENを管理 → QuarterlyでTrendとDecisionをReview → AnnualでBaselineとのCHANGEを確認 → NEW FACTから次年度KAIZENへ**

継続支援は「月次Reportを12回提出するサービス」ではない。

> **月次で運用し、四半期で経営Reviewし、年次で会社のCHANGEを確認するサービスである。**

## 12. 継続支援全体への展開

このReporting ModelはService Desk固有の一時的設計ではなく、Business WorkflowおよびInfrastructure Operationへ共通化できるReporting Pattern候補とする。

共通Pattern：

> **Work → FACT → AI OFF集計 → AI所感 / Suggest → Human Review → Report → Decision / KAIZEN → ACT → CHANGE → NEW FACT**

将来的にFACTACT上で、各Work領域の標準KPI、差分、CHANGEをAI OFFで形成し、そのFACTをAIが経営向けに翻訳する共通Reporting Engineへ発展させることを想定する。

## 13. 次の設計項目

Service Deskを販売可能な仕様へ落とすため、次を順に確定する。

1. KPIごとの定義 / 計算式
2. KPIのReporting Cycle（Monthly / Quarterly / Annual）
3. 目標値を持つ指標 / 持たない指標
4. KPI算出に必要なFACTACT Data
5. 受付Channel
6. 標準受付時間
7. 対応Scope / Escalation境界
8. SLA / SLO
9. Authority / Customer Approval
10. 業務量 / Human Work / Pricing Driver
11. Monthly / Quarterly / Annual Report Template
12. Product LaneへのFIT / GAP / CONFLICT / UNKNOWN確認
