# IT経営KAIZEN Service Desk Work / Reporting Model v1.1

Status: **CANONICAL — BUSINESS / SERVICE DESIGN**

この文書は、IT経営KAIZEN 継続支援におけるService Deskの標準Work、Intake、Reporting、およびFACTACT / AI / Humanの責任分担を記録する。

## 1. Service Deskの商品定義

Service Deskは単なる問い合わせ対応代行ではない。

> **社員からのIT問い合わせをatLIBが受け、対応するだけで終わらず、そのWorkからFACTを形成し、Knowledge、管理、KAIZEN、CHANGE確認へつなげる。**

基本Loop：

> **Intake → Work → FACT形成 → Knowledge → 傾向把握 → KAIZEN → ACT → CHANGE確認 → NEW FACT**

## 2. Intake Channel / Common Intake — CANONICAL

初期Service Desk商品の標準受付Channelは、**FACTACT Webフォーム**とする。

> **利用者 → FACTACT Webフォーム → Common Intake → Work生成**

Slack / Teams等との直接連携は初期標準受付Channelには含めず、将来のConnection / Optionとして検討余地を残す。

電話受付は顧客要件に応じた特別対応とし、atLIBオペレーターが同じFACTACT受付フォームへ代理入力する。

> **利用者 → atLIBオペレーター → FACTACT受付フォームへ代理入力 → Common Intake → Work生成**

ソニックス案件の電話受付は、この特別対応の実例として扱う。

受付Channelが異なっても共通Intake Schemaへ収束させる。

> **Channel → Common Intake → Work → FACT → KAIZEN**

Common Intake候補：Requester / User、Intake Channel、受付日時、Category、対象System / SaaS / Device、申告内容、業務影響、Urgency / Priority判断情報、添付Evidence、オペレーター記録。

利用者申告を自動的に確認済みFACTへ昇格させない。申告・Observation・Evidence・確認済みFACTを混同しない。Intake Channel自体も記録する。電話等の追加Human WorkはPricing Driverで評価する。

## 3. 標準Work Catalog v1

初期標準Scope候補：問い合わせ受付、IT利用相談、一次切り分け、リモート一次対応、Password / Account系問い合わせ対応、PC / 周辺機器問い合わせ対応、対象SaaS問い合わせ対応、Incident一次受付、Vendor Escalation、Ticket / Status / Waiting管理、利用者への回答・完了確認、Knowledge形成・再利用、問い合わせ傾向分析、KAIZEN候補形成、実行したKAIZENのCHANGE確認、Monthly / Quarterly / Annual Reporting。

条件付きまたは別途相談 / 別途見積：電話等の追加受付Channel、Onsite対応、PC修理・交換等の物理作業、高度な専門技術対応、大規模Incident対応、標準対応時間外の有人対応、24時間365日有人対応、標準Work Catalog外の業務。

対応領域の一覧は一般的なReference Catalogとして扱い、顧客ごとのIT環境に応じて対象領域の違いを許容する。全System / SaaS / Device等を網羅的な固定メニューにせず、細かな領域ごとにOptionを積み上げる設計を基本としない。契約時には顧客環境と責任境界から対象Scopeを合意する。

## 4. Reportingの目的

Service Desk Reportは「何件処理したか」を報告するだけのBPO Reportにしない。

> **社員が何に困っているか、Service Deskが正常に機能しているか、何をKAIZENし、その結果として会社のITが実際にどう変わったかをFACTから確認する。**

> **Monthlyで運用を管理する。Quarterlyで傾向と経営DecisionをReviewする。Annualで会社が本当にどう変わったかを確認する。**

## 5. Monthly — Operational / KAIZEN Report

目的：直近1か月のService Desk運営状態を確認し、放置すべきでない問題、当月のKAIZEN / CHANGE、翌月の対応事項を明確にする。

主な利用者：IT責任者 / IT担当者 / Service Desk管理者。

標準項目候補：問い合わせ件数、利用者数 / 利用状況、Category別件数、部門別件数、初回対応時間、解決時間、一次解決率、再問い合わせ率、未完了件数、長期滞留件数、Vendor Waiting、Incident、Knowledge形成 / 再利用、当月KAIZEN、CHANGE / NEW FACT、翌月対応事項、Decision Required。

Monthlyでは単月の増減だけから長期傾向やRoot Causeを断定しない。

## 6. Quarterly — Trend / Management Review

目的：3か月程度のFACTを横断し、Trend、継続問題、KAIZEN成果、Risk / Impactを確認し、次QuarterのDecisionとKAIZENへつなげる。

主な利用者：IT責任者 / 経営。

標準項目候補：主要KPIの3か月Trend、繰り返し問い合わせTop Theme、Category / 部門 / System別Trend、社員待ち時間、業務復旧時間、再問い合わせ / 再発、Incident Trend、Vendor依存、Knowledge効果、KAIZEN Portfolio、Before / After、CHANGE / NEW FACT、未解消Gap / Root Cause Hypothesis、Risk / Impact、次Quarter KAIZEN Option、Management Decision Required。

## 7. Annual — IT Management / CHANGE Review

目的：1年間の運用結果をAssessment時点または前年Baselineと比較し、会社のITが実際にどう変わったかを確認する。次年度のIT経営KAIZEN方針と経営Decisionへ接続する。

主な利用者：経営 / IT責任者。

標準項目候補：Assessment / 前年Baseline比較、社員IT待ち時間、業務復旧時間、繰り返し問い合わせ、Incident / 業務停止影響、属人的Work、Knowledge / Standardization、Vendor依存 / Risk、主要KAIZEN、CHANGE / NEW FACT、Futureに対するGap、重要Decision、重要UNKNOWN / Risk、次年度IT経営KAIZEN Theme。

> **1年前と比べて会社のITがどう変わったか、その変化をFACTで経営へ示す。**

## 8. Employee Impact

Service Deskの価値をIT部門の工数削減だけで評価しない。社員待ち時間、業務復旧時間、再問い合わせ率、繰り返し問い合わせ、自己解決化 / Knowledge再利用、未解決・長期滞留等を候補とする。

> **ITによって社員が待たされる時間をどれだけ減らせたか**

を重要な顧客価値指標候補とする。ただし問い合わせ件数減少だけを改善と判定せず、複数FACTからCHANGEを確認する。

## 9. AI OFFで成立するReporting

基本KPI集計はAIに依存させない。構造化された記録からFACTACTがAI OFFでQuery / Aggregation / Difference / Relationを用いて算出できることを目標とする。

> **FACTACTが事実を集計する。AIがなくても基本Reportは成立する。**

これはBusiness Requirementであり、現行FACTACTですべて実装済みであることを意味しない。

## 10. AIのReporting Role

> **AIは、FACTACTが集計したFACTに基づき、顧客向けReportの所感・注目点・確認事項・KAIZEN候補を作成する。**

> **FACTACT集計 → AI所感生成 → Human Review → 顧客向けReport確定**

Evidenceのない原因の断定、UNKNOWNの推測補完、Human Decisionの代替、相関だけからの因果確定は行わない。

## 11. Human Review

AI生成Reportをそのまま顧客へ自動送付しない。atLIB担当者が数値と元FACT、FACT / UNKNOWN / Hypothesisの区別、因果表現、顧客Context、KAIZEN Option、Decision Required等を確認して確定する。

## 12. 初回対応SLO — CANONICAL DEFINITION

初回対応SLOは、FACTACTによる受付自動応答までの時間ではない。

> **初回対応SLO = FACTACT Webフォームで受付した後、atLIB担当者が問い合わせ内容を人間として確認し、利用者へ最初の返信を行うまでの時間。**

時系列：

> **Webフォーム受付 → FACTACT受付記録 / 自動応答 → atLIB担当者が内容確認 → 人間による初回返信【SLO計測点】 → Triage / 調査 / 対応 / Escalation → Waiting管理 → 解決 → 完了確認**

自動受付・自動返信だけをもって初回対応完了とは扱わない。

人間による初回返信は、単なる自動文面相当の受領通知ではなく、少なくとも担当者が問い合わせ内容を確認した上で行われた返信を指す。

初回対応時間は、利用者から見て「人間が問い合わせを確認し、対応を開始したことが分かるまでの待ち時間」を示すService FACTとして扱う。

具体的なSLO目標値は別途販売仕様で決定する。

## 13. Service Capacity / KAIZEN — CURRENT DESIGN DIRECTION

顧客ごとの対応領域を網羅的な固定メニューで制限するのではなく、一定のService Capacityを持たせる。人月・時間貸しとして顧客へ提示しない。

月間100件程度は現時点では**Standard Capacity検討上の基準値候補**であり、確定販売仕様ではない。実案件のWork量、平均Human Work、原価、FACTACTによる効率化実績を確認して補正する。

Capacity超過は即時の従量課金・自動値上げとしない。FACTを確認し、一時的増加、KAIZEN可能な構造的増加、企業規模・対象Scope等の構造的拡大を区別する。

KAIZEN可能な場合はMonthly Report等でFACTとKAIZEN Optionを顧客へ提示し、人間が実行をDecisionする。実行主体は顧客 / Vendor / atLIB等から選択される。ACT後にCHANGEを確認し、それでも構造的に必要Capacityが大きい場合に契約Scope / Capacity / 価格をReviewする。

> **人を何時間提供するかではなく、企業に必要なIT機能を一定のService Capacityで提供する。**

内部ではHuman Work、Ticket量、Complexity、Escalation等をFACTとして測定し、採算性とKAIZENに利用する。

## 14. 年間Service Cycle

> **Assessmentで現在地をFACT化 → Monthlyで日常運用とKAIZENを管理 → QuarterlyでTrendとDecisionをReview → AnnualでBaselineとのCHANGEを確認 → NEW FACTから次年度KAIZENへ**

> **月次で運用し、四半期で経営Reviewし、年次で会社のCHANGEを確認するサービスである。**

## 15. 継続支援全体への展開

> **Work → FACT → AI OFF集計 → AI所感 / Suggest → Human Review → Report → Decision / KAIZEN → ACT → CHANGE → NEW FACT**

Service DeskだけでなくBusiness Workflow / Infrastructure Operationへの共通Reporting Pattern候補とする。

## 16. 次の設計項目

1. Common Intake Schema詳細
2. KPIごとの定義 / 計算式
3. KPIのReporting Cycle
4. 目標値を持つ指標 / 持たない指標
5. KPI算出に必要なFACTACT Data
6. 標準対応時間
7. 対応Scope / Escalation境界
8. SLO目標値
9. Authority / Customer Approval
10. Service Capacity / Human Work / Pricing Driver
11. Monthly / Quarterly / Annual Report Template
12. Product LaneへのFIT / GAP / CONFLICT / UNKNOWN確認
