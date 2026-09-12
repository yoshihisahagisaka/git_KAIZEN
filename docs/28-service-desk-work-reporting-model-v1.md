# IT経営KAIZEN Service Desk Work / Reporting Model v1

Status: **CANONICAL — BUSINESS / SERVICE DESIGN**

この文書は、IT経営KAIZEN 継続支援におけるService Deskの標準Work、Intake、Reporting、およびFACTACT / AI / Humanの責任分担を記録する。

## 1. Service Deskの商品定義

Service Deskは単なる問い合わせ対応代行ではない。

> **社員からのIT問い合わせをatLIBが受け、対応するだけで終わらず、そのWorkからFACTを形成し、Knowledge、管理、KAIZEN、CHANGE確認へつなげる。**

基本Loop：

> **Intake → Work → FACT形成 → Knowledge → 傾向把握 → KAIZEN → ACT → CHANGE確認 → NEW FACT**

## 2. Intake Channel / Common Intake — CANONICAL

### 標準Channel

初期Service Desk商品の標準受付Channelは、**FACTACT Webフォーム**とする。

> **利用者 → FACTACT Webフォーム → Common Intake → Work生成**

Slack / Teams等との直接連携は当初検討したが、初期標準受付Channelには含めない。将来のConnection / Optionとして検討余地は残す。

### 電話受付

電話受付は顧客要件に応じた特別対応とする。ただし電話専用の別管理モデルを作らない。

> **利用者 → atLIBオペレーター → 同じFACTACT受付フォームへ代理入力 → Common Intake → Work生成**

ソニックス案件の電話受付は、この特別対応の実例として扱う。

### Common Intake Principle

受付Channelが異なっても、FACTACT上では共通Intake Schemaへ収束させる。

> **Channel → Common Intake → Work → FACT → KAIZEN**

Webでは利用者本人が入力し、電話ではatLIBオペレーターが同等のフォームへ代理入力する。以降のWork / Reporting / KAIZEN Flowは共通化する。

Common Intakeで取得する項目は販売仕様 / Product仕様で確定するが、候補として以下を持つ。

- Requester / User
- Intake Channel
- 受付日時
- Category
- 対象System / SaaS / Device等
- 申告内容
- 業務影響
- Urgency / Priority判断に必要な情報
- 添付Evidence
- オペレーター記録（代理入力時）

### FACT FIRST

Web入力・電話代理入力のどちらでも、利用者の申告内容を自動的に確認済みFACTへ昇格させない。

例：「Update後からPCが遅くなった」という申告があった場合、確認できるのは少なくとも「利用者がその内容を申告したこと」であり、「Updateが性能低下の原因であること」はEvidence確認前にはFACTではない。

> **同じSchemaで同レベルの情報を取得する。ただし、申告・Observation・Evidence・確認済みFACTを混同しない。**

Intake Channel自体も記録し、必要に応じてWeb / Phone等の利用状況を分析可能にする。

電話受付は、電話だから別Systemになるのではなく、**標準FACTACT Intakeへの代理入力を伴う追加受付Channel**として扱う。追加Human WorkはPricing Driverで評価する。

## 3. 標準Work Catalog v1

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

- 電話等の追加受付Channel
- Onsite対応
- PC修理・交換等の物理作業
- 高度な専門技術対応
- 大規模Incident対応
- 標準対応時間外の有人対応
- 24時間365日有人対応
- 標準Work Catalog外の業務

最終的な標準対応時間、SLA / SLO、対象System、Authority、件数上限等は販売仕様策定時に確定する。

## 4. Reportingの目的

Service Desk Reportは「何件処理したか」を報告するだけのBPO Reportにしない。

> **社員が何に困っているか、Service Deskが正常に機能しているか、何をKAIZENし、その結果として会社のITが実際にどう変わったかをFACTから確認する。**

同じKPI Reportを期間だけ変えて繰り返すのではなく、Monthly / Quarterly / Annualで役割を分ける。

> **Monthlyで運用を管理する。Quarterlyで傾向と経営DecisionをReviewする。Annualで会社が本当にどう変わったかを確認する。**

## 5. Monthly — Operational / KAIZEN Report

目的：直近1か月のService Desk運営状態を確認し、放置すべきでない問題、当月のKAIZEN / CHANGE、翌月の対応事項を明確にする。

主な利用者：IT責任者 / IT担当者 / Service Desk管理者

標準項目候補：問い合わせ件数、利用者数 / 利用状況、Category別件数、部門別件数、初回応答時間、解決時間、一次解決率、再問い合わせ率、未完了件数、長期滞留件数、Vendor Waiting、Incident、Knowledge形成 / 再利用、当月KAIZEN、CHANGE / NEW FACT、翌月対応事項、Decision Required。

Monthlyでは、単月の増減だけから長期傾向やRoot Causeを断定しない。

## 6. Quarterly — Trend / Management Review

目的：3か月程度のFACTを横断し、単月では判断しにくいTrend、継続問題、KAIZEN成果、Risk / Impactを確認し、次QuarterのDecisionとKAIZENへつなげる。

主な利用者：IT責任者 / 経営

標準項目候補：主要KPIの3か月Trend、繰り返し問い合わせTop Theme、Category / 部門 / System別Trend、社員待ち時間、業務復旧時間、再問い合わせ / 再発、Incident Trend、Vendor依存、Knowledge効果、KAIZEN Portfolio、Before / After、CHANGE / NEW FACT、未解消Gap / Root Cause Hypothesis、Risk / Impact、次Quarter KAIZEN Option、Management Decision Required。

## 7. Annual — IT Management / CHANGE Review

目的：1年間の運用結果をAssessment時点または前年Baselineと比較し、会社のITが実際にどう変わったかを確認する。次年度のIT経営KAIZEN方針と経営Decisionへ接続する。

主な利用者：経営 / IT責任者

標準項目候補：Assessment / 前年Baseline比較、社員IT待ち時間、業務復旧時間、繰り返し問い合わせ、Incident / 業務停止影響、属人的Work、Knowledge / Standardization、Vendor依存 / Risk、主要KAIZEN、CHANGE / NEW FACT、Futureに対するGap、重要Decision、重要UNKNOWN / Risk、次年度IT経営KAIZEN Theme。

次年度Themeは必要に応じて6 Lenses（なくす・自動化する・標準化する・任せる・残す・整える）を利用する。

> **1年前と比べて会社のITがどう変わったか、その変化をFACTで経営へ示す。**

## 8. Employee Impact

Service Deskの価値をIT部門の工数削減だけで評価しない。社員待ち時間、業務復旧時間、再問い合わせ率、繰り返し問い合わせ、自己解決化 / Knowledge再利用、未解決・長期滞留等を候補とする。

> **ITによって社員が待たされる時間をどれだけ減らせたか**

は重要な顧客価値指標候補とする。

ただし「問い合わせ件数が減った」だけを改善と判定せず、複数FACTからCHANGEを確認する。

## 9. AI OFFで成立するReporting

Service Deskの基本KPI集計はAIに依存させない。Ticket / Work / Action / Relation / Status / Waiting / Incident / Knowledge / Decision / Change等の構造化された記録から、FACTACTがAI OFFでQuery / Aggregation / Difference / Relationを用いて算出できることを目標とする。

> **FACTACTが事実を集計する。AIがなくても基本Reportは成立する。**

これはBusiness Requirementであり、現行FACTACTですべて実装済みであることを意味しない。Product Laneでは既存Coreに対してFIT / GAP / CONFLICT / UNKNOWNを確認する。

## 10. AIのReporting Role

> **AIは、FACTACTが集計したFACTに基づき、顧客向けReportの所感・注目点・確認事項・KAIZEN候補を作成する。**

標準Flow：

> **FACTACT集計 → AI所感生成 → Human Review → 顧客向けReport確定**

AIはFACT要約、期間差分説明、Trend、確認事項、Risk / Impact候補、Root Cause Hypothesis候補、KAIZEN Option候補、経営向け説明文案を扱える。

Evidenceのない原因の断定、UNKNOWNの推測補完、Human Decisionの代替、相関だけからの因果確定は行わない。

## 11. Human Review

AI生成Reportをそのまま顧客へ自動送付しない。atLIB担当者が数値と元FACT、FACT / UNKNOWN / Hypothesisの区別、因果表現、顧客Context、KAIZEN Option、Decision Required等を確認して確定する。

## 12. 年間Service Cycle

> **Assessmentで現在地をFACT化 → Monthlyで日常運用とKAIZENを管理 → QuarterlyでTrendとDecisionをReview → AnnualでBaselineとのCHANGEを確認 → NEW FACTから次年度KAIZENへ**

> **月次で運用し、四半期で経営Reviewし、年次で会社のCHANGEを確認するサービスである。**

## 13. 継続支援全体への展開

共通Pattern：

> **Work → FACT → AI OFF集計 → AI所感 / Suggest → Human Review → Report → Decision / KAIZEN → ACT → CHANGE → NEW FACT**

Service DeskだけでなくBusiness Workflow / Infrastructure Operationへの共通Reporting Pattern候補とする。

## 14. 次の設計項目

1. Common Intake Schema詳細
2. KPIごとの定義 / 計算式
3. KPIのReporting Cycle
4. 目標値を持つ指標 / 持たない指標
5. KPI算出に必要なFACTACT Data
6. 標準対応時間
7. 対応Scope / Escalation境界
8. SLA / SLO
9. Authority / Customer Approval
10. 業務量 / Human Work / Pricing Driver
11. Monthly / Quarterly / Annual Report Template
12. Product LaneへのFIT / GAP / CONFLICT / UNKNOWN確認
