# IT経営KAIZEN 継続支援 — Capacity Band / Pricing Hypothesis v1

Status: **WORKING HYPOTHESIS — BUSINESS / COMMERCIAL PRODUCTIZATION**

この文書は、doc38のCapacity / Unit Economics仮説を、初期販売で検証可能なCapacity Bandと価格仮説へ変換する。

**重要：本書のBand、Human Work、価格、粗利率はDECISIONではない。ASSUMPTION / HYPOTHESISである。**

旧¥498k/月等をAnchorとして復活させない。実顧客FACTを取得後に更新する。

## 1. Pricing Principle

> **同じIT経営KAIZEN 継続支援を、顧客ごとのAccepted Work Scope / Volume / Complexity / Service Requirementに応じたService Capacityで販売する。**

機能を削ってLite / Standard / Proへ分けることを基本にしない。

全Bandに共通する価値：
- Accepted IT Workの継続運用
- FACTACT Operation
- Continuous KAIZEN
- Monthly KAIZEN Report
- Quarterly Management / KAIZEN Review
- Annual KGI / CHANGE Review

顧客ごとの差は主にCapacityで表現する。

## 2. Internal Cost Basis — ASSUMPTION

Doc38を継承：
- fully loaded delivery FTE cost：¥800,000 / month
- planning capacity：120h / month
- internal planned capacity cost：約¥6,667 / h

この「hour」は顧客へ販売する時間単価ではない。

> **Human Workは原価を測るFACTであり、商品単位ではない。**

## 3. Capacity Bandの初期構造 — PROPOSAL

名称は仮称。

### Capacity S
小規模 / 低Volume / 限定Scope向け。

Internal Human Work planning envelope：**約30h / month**

Direct delivery cost hypothesis：
> 約¥200k / month

想定例：
- Service Desk低Volume
- 限定的なBusiness Workflow
- 既存IT担当者が存在し、atLIBのAccepted Scopeが明確

### Capacity M
中小企業の標準的な継続支援を想定する中心Band候補。

Internal Human Work planning envelope：**約50h / month**

Direct delivery cost hypothesis：
> 約¥333k / month

想定例：
- Service Desk 100 Works / month前後という初期仮説
- または低Volume Service Desk + limited Workflow
- standard remote-first

### Capacity L
Work Area / Volume / Complexityが大きい顧客向け。

Internal Human Work planning envelope：**約75h / month**

Direct delivery cost hypothesis：
> 約¥500k / month

想定例：
- Service Desk + Business Workflow
- higher request / event volume
- more complex environment / vendor coordination

### Custom
75hを継続的に超える想定、3 Work Area複合、大規模 / 高Complexity / 特殊Service Requirement等。

単一担当者モデルではなくTeam Delivery前提でScope / Capacity / Priceを個別設計する。

## 4. なぜ30 / 50 / 75hなのか

これは顧客へ時間を販売するための区切りではない。

初期Unit Economicsを比較するための**内部Planning Envelope**である。

- 30h：120h/FTEで理論4社
- 50h：理論2.4社
- 75h：理論1.6社

実際にはCross-customer peak / specialist / leave / service continuityがあるため、単純除算をStaffing Promiseにしない。

## 5. Price Sensitivity — HYPOTHESIS

Direct delivery costだけを基準にした感度。Product、Sales、Corporate Overhead等は別途必要。

### Capacity S — cost 約¥200k

| Monthly Price | Direct Contribution | Direct Cost Ratio |
|---|---:|---:|
| ¥350k | ¥150k | 57% |
| ¥400k | ¥200k | 50% |
| ¥450k | ¥250k | 44% |
| ¥500k | ¥300k | 40% |

### Capacity M — cost 約¥333k

| Monthly Price | Direct Contribution | Direct Cost Ratio |
|---|---:|---:|
| ¥500k | ¥167k | 67% |
| ¥550k | ¥217k | 61% |
| ¥600k | ¥267k | 56% |
| ¥650k | ¥317k | 51% |
| ¥700k | ¥367k | 48% |

### Capacity L — cost 約¥500k

| Monthly Price | Direct Contribution | Direct Cost Ratio |
|---|---:|---:|
| ¥750k | ¥250k | 67% |
| ¥850k | ¥350k | 59% |
| ¥900k | ¥400k | 56% |
| ¥1,000k | ¥500k | 50% |
| ¥1,100k | ¥600k | 45% |

Direct Contributionは正式なGross Profitではない。

## 6. 初期Price Corridor — PROPOSAL

上記から、Pilot / initial commercial validation用の価格検討帯として：

- **Capacity S：¥400k–¥500k / month**
- **Capacity M：¥600k–¥700k / month**
- **Capacity L：¥900k–¥1.1m / month**
- **Custom：individual quote**

をPROPOSALとする。

これは価格決定ではない。

この水準なら、doc38のHuman Work仮説に対しDirect Deliveryだけで一定の余白を持たせ、FACTACT / management / sales / company overheadを吸収できるか検証する余地がある。

## 7. 中心販売価格の候補 — PROPOSAL

初期営業で複雑なRangeを見せるより、各BandにReference Priceを置く場合の候補：

- Capacity S：**¥450k / month**
- Capacity M：**¥650k / month**
- Capacity L：**¥1.0m / month**
- Custom：individual quote

ただし、これをDECISIONとして公開しない。

特にCapacity M ¥650kは、過去の¥498kを起点にした値ではなく、50h × planned cost ¥6,667 ≒ ¥333kという現在のCost Hypothesisから検討した値である。

## 8. AssessmentとのCommercial関係

現在のCanonical：
- 無料IT経営診断
- IT経営KAIZEN 設計Assessment：standard ¥1.2m pre-tax
- KAIZEN Project：individual quote
- IT経営KAIZEN 継続支援：Capacity-based monthly service

AssessmentでAccepted Scope / 1-Year KGI / Actor / required Workを確認してから、継続支援のCapacity Bandを決める。

> **Assessmentで会社の次の一手をDecisionし、そのDecisionを継続運用するために必要なCapacityを見積もる。**

継続支援受注ありきでAssessment結論を作らない。

## 9. Band判定に使うCustomer-facing FACT

Human Work hourを顧客へ主表示せず、次を使う。

### Volume
- inquiry / request volume
- onboarding / offboarding / transfer volume
- standard workflow event volume
- infrastructure event / incident volume

### Complexity
- number / variety of target systems
- approval / authority complexity
- vendor dependencies
- exception frequency
- environment complexity

### Service Requirement
- Service Hours
- channel
- response requirement
- Onsite / physical work
- regulated / exceptional responsibility

### Managed Environment
- users / locations
- devices
- SaaS / identity
- infrastructure / cloud / network

社員数は補助的Proxyであり、Bandを社員数だけで決めない。

## 10. BandはHard Capではない

例えばCapacity Mで101件目から追加料金、という単純従量制にはしない。

Bandは通常状態のService Capacity expectationを表す。

短期的なSpikeはServiceとして吸収可能な範囲を持たせる。

継続超過時：
> **FACT確認 → cause classification → KAIZEN Option → Human Decision → ACT → CHANGE → Capacity re-evaluation**

構造的なBusiness Growth / Scope Expansionの場合のみBand変更 / Contract Reviewを検討する。

> **問い合わせ件数が減るほど売上が減る料金体系にはしない。**

## 11. KAIZENによる効率化と価格

FACTACT / standardization / automationによってHuman Workが減った場合、即座に月額を下げる設計にはしない。

顧客が購入しているのはHuman HourではなくService CapabilityとKAIZEN Valueである。

Human Work削減によって生まれたDelivery Leverageは：
- Service continuity向上
- SLO安定
- deeper KAIZEN
- capacity buffer
- scale / profitability
へ再投資できる。

一方、顧客側Scopeが大幅縮小した場合はCapacity Review対象になり得る。

## 12. PriceとKAIZEN Projectの境界

継続支援月額に、すべてのCHANGE実装を含めない。

Standard recurring KAIZEN：
- Knowledge改善
- standard procedure改善
- minor workflow改善
- service operation改善
- reporting / management改善
等、Accepted Work内で通常運用として実施可能なもの。

Separate KAIZEN Project候補：
- RPA / automation build
- system implementation
- migration
- infrastructure redesign
- major security implementation
- major workflow / integration build
等。

> **KAIZEN Optionを見つけることは継続支援のValue。大きなCHANGEを構築することは別Projectになり得る。**

## 13. Onsite / Phone / Expanded Hours

これらは価格未決定。

初期原則：
- StandardはRemote First / Web Intake / weekday daytime
- phone、Onsite、expanded hours、24x365等はConditional

細かなOption priceを今決めず、Human Work / staffing / risk FACTを取得して設計する。

## 14. Pilot Pricing Strategy — PROPOSAL

初期顧客では「安く売って後で上げる」より、Reference Priceを持ちながらAssumptionを明示してScopeを限定する方が望ましい。

Pilotで検証するもの：
- Volume
- Human Work
- Complexity
- peak / concurrency
- specialist escalation
- report / review load
- FACTACT leverage
- customer-perceived value
- KGI / CHANGE contribution

Pilot Discountを使う場合でも、標準価格と検証目的を分離する。

## 15. Pricing Decisionに必要な追加FACT

最終Price Decision前に少なくとも確認したい：

1. delivery FTE fully loaded costの実数
2. 実際に顧客Deliveryへ使えるplanning capacity
3. Service Desk average Human Work / Work
4. Workflow average Human Work / Event
5. Infrastructure monthly Human Work
6. common reporting / review load
7. specialist pool cost / usage
8. FACTACT infrastructure / AI variable cost
9. sales / onboarding / customer success cost
10. target contribution / gross margin / operating margin

これらがない段階で「¥650kが正解」とは言わない。

## 16. 初期見積フロー — PROPOSAL

> **Assessment / Customer FACT → Accepted Work Scope → Service Policy → Volume / Complexity / Service Requirement → Capacity Band候補 → Internal Human Work model → Cost / Margin check → Human Review → Quote**

AIはBand候補 / Workload estimateをSuggestできるが、最終QuoteはHumanがDecisionする。

## 17. Quote表示の方向

顧客見積では内部Human Workを前面に出さず、例として：

**IT経営KAIZEN 継続支援 — Capacity M**
- Accepted Work Scope：別紙Scope Sheet
- Service Policy：Standard + agreed conditions
- FACTACT Operation
- Monthly KAIZEN
- Quarterly Management Review
- Annual KGI / CHANGE Review
- Monthly Fee：¥xxx,xxx

とする方向。

必要に応じてConditional Service / KAIZEN Projectを別行にする。

## 18. 現時点のCommercial Hypothesis

販売開始に向けた仮説として最もシンプルなのは：

> **Assessment ¥1.2m → 継続支援 Capacity S / M / L / Custom**

Reference Price候補：
> **S ¥450k / M ¥650k / L ¥1.0m / Custom**

ただし、これはまだDECISIONではない。

価格Decisionは、少なくともatLIBの実Fully Loaded Cost / required marginを確認したうえで行う。

## 19. 次の設計対象

次は価格そのものをさらに推測するのではなく、**Quote / Scope Sheet**を作る。

目的：
- SalesがAssessment結果から継続支援を見積できる
- Accepted Work Scopeを明確にできる
- Capacity Bandの根拠を残せる
- Conditional / Project / Out-of-Scopeを混同しない
- 人月見積へ戻らない
- AI見積支援へ将来接続できる

その後、実社内原価FACTを入力してReference PriceをDecisionする。
