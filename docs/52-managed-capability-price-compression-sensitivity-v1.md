# Managed Capability Price × Compression Sensitivity v1

Status: **BUSINESS ANALYSIS / HYPOTHESIS — NOT PRICE DECISION**
Date: 2026-09-13
Related: docs/38-44, docs/47-51

## 1. Purpose

49.8万円 / 60万円 / 80万円の月額候補について、価格そのものを先に決めるのではなく、

> **どのWork Mix・Compression率・Human Full Cost・Non-Human Delivery Costなら成立するか**

をSensitivityで確認する。

本書の数値は、Assessment ¥1.2m以外すべてHYPOTHESIS / scenarioである。

---

## 2. Core Equation

月額Managed CapabilityのDelivery COGSを以下で見る。

`Delivery COGS = Human Work Cost + Non-Human Delivery Cost`

`Human Work Cost = Required Human Hours × Blended Full Cost/h`

`Required Human Hours = Customer Baseline Human Hours × (1 - Valid Compression Rate)`

Gross Margin相当の検証式：

`Margin Rate = (Price - Delivery COGS) / Price`

ここで重要なのは、Customer Baseline HoursをそのままProvider Hoursへ置かないことである。

---

## 3. Price Band別 Allowable Delivery COGS

売価ごとに、Margin Target別で許容できるDelivery COGS上限を計算する。

| Monthly Price | 30% Margin | 40% Margin | 50% Margin | 60% Margin |
|---:|---:|---:|---:|---:|
| ¥498,000 | ¥348,600 | ¥298,800 | ¥249,000 | ¥199,200 |
| ¥600,000 | ¥420,000 | ¥360,000 | ¥300,000 | ¥240,000 |
| ¥800,000 | ¥560,000 | ¥480,000 | ¥400,000 | ¥320,000 |

これは「目標粗利を50%にする」というDecisionではない。
Margin Targetごとの成立条件を見るためのSensitivityである。

---

## 4. Example — 50% Margin Target Scenario

以下はScenarioのみ。

Non-Human Delivery Costを仮に月10万円と置いた場合、Human Workへ使えるCost Budgetは：

| Monthly Price | Delivery COGS上限 | Non-Human仮定 | Human Cost Budget |
|---:|---:|---:|---:|
| ¥498,000 | ¥249,000 | ¥100,000 | ¥149,000 |
| ¥600,000 | ¥300,000 | ¥100,000 | ¥200,000 |
| ¥800,000 | ¥400,000 | ¥100,000 | ¥300,000 |

Blended Full Cost/h別の許容Human Hours：

| Price | ¥4,000/h | ¥5,000/h | ¥6,000/h |
|---:|---:|---:|---:|
| ¥498,000 | 37.3h | 29.8h | 24.8h |
| ¥600,000 | 50.0h | 40.0h | 33.3h |
| ¥800,000 | 75.0h | 60.0h | 50.0h |

注意：Non-Human ¥100k / Full Cost ¥4k〜¥6k / 50% MarginはいずれもHYPOTHESIS。

---

## 5. Compression Sensitivity — Baseline 100h

Customer Baseline Workが100hの場合：

| Valid Compression | Required Human Work |
|---:|---:|
| 0% | 100h |
| 20% | 80h |
| 30% | 70h |
| 40% | 60h |
| 50% | 50h |
| 60% | 40h |
| 70% | 30h |

この表だけでは価格成立性は判断できない。
Role Mix / Full Cost / Non-Human Costが必要。

---

## 6. What Each Price Band Would Require — Example Only

Section 4の50% Margin / Non-Human ¥100k / Full Cost ¥5k/h scenarioを使うと：

### ¥498k

Allowable Human Work ≈ 30h

Baseline 100hに対して約70% Compressionが必要。

したがって、100hの仕事を対象に49.8万円を成立させるには、かなり高いCompressionが必要となるScenario。

一方、Customer Baselineが50hなら30hへのCompressionは40%。

つまり49.8万円が成立するかはBaseline Hoursだけでなく、Scope sizeとCompression Potentialに依存する。

### ¥600k

Allowable Human Work ≈ 40h

Baseline 100hなら約60% Compression。
Baseline 70hなら約43% Compression。
Baseline 60hなら約33% Compression。

### ¥800k

Allowable Human Work ≈ 60h

Baseline 100hなら約40% Compression。
Baseline 150hなら60% Compression。
Baseline 80hなら25% Compression。

重要：これは特定前提下のSensitivityであり、価格Decisionではない。

---

## 7. Why Work Mix Matters More Than Employee Count Alone

同じ100hでも圧縮可能性が異なる。

### Scenario A — Service Desk Heavy

Hypothesis:
- Baseline 100h
- Valid Compression 20%
- Required Human Work 80h

対人Communicationが中心でHuman Workが残りやすい。

### Scenario B — Balanced

Hypothesis:
- Baseline 100h
- Valid Compression 30〜35%
- Required Human Work 65〜70h

### Scenario C — Operation / Management Heavy

Hypothesis:
- Baseline 100h
- Valid Compression 40〜55%
- Required Human Work 45〜60h

同じ200名企業でも、Work Mixによって成立価格が変わる。

したがって価格表を「社員数だけ」で切ると危険。

---

## 8. Price Should Be Derived from Required Capability, Not Sold Hours

避けるべき販売形態：

> 49.8万円 = 40時間
> 60万円 = 60時間
> 80万円 = 80時間

この設計では、FACTACTでHuman Workを減らしてもCustomer Valueへ還元されにくく、Hours Sellingへ戻る。

検証したい設計：

> **Price = Required IT Capability / Scope / Service Level / Complexity / Work Mixに対する月額**

内部ではHuman Work / Compression / Costを管理するが、Customerには「人の時間」を商品として売らない。

---

## 9. Candidate Commercial Segmentation — PROPOSAL

価格Bandの違いをHoursではなく、以下で判定する案。

### Scope
- 対象Business Unit / employees
- Devices
- SaaS / Accounts
- Locations
- Infra Components

### Work Mix
- Service Desk ratio
- Operational Work ratio
- Management / Reporting ratio
- Project / Change ratio

### Complexity
- Standard vs exception-heavy
- Legacy / On-prem
- Number of vendors
- Approval complexity
- Security / compliance requirement

### Service Requirement
- Business hours only
- Response target
- Onsite requirement
- Specialist access
- Management review frequency

### Compression Potential
- Manual registry burden
- Duplicate input
- API availability
- Standardization potential
- Automation potential

この結果として49.8 / 60 / 80万円等のBandへMappingする可能性を検証する。

---

## 10. Strategic Finding

以前の「49.8万円 / 60万円は粗利が厳しい」という結論は、Customer WorkとProvider Human Workが近い前提では妥当だった。

しかしHuman Work Compressionが実測で成立する場合、その結論は再評価が必要。

逆に、FACTACTを使ってもHuman Workがほとんど減らないService Desk Heavy Scopeなら、49.8 / 60万円が成立しない可能性は残る。

したがって価格の正解は1つではなく：

> **Scope × Work Mix × Compression × Required Capability × Delivery Cost**

の関数として考える。

---

## 11. 3-Person Onsite Comparison

User-provided business contextとして、常駐3人月で同等IT Functionを提供すると月200万円超となる可能性がある。
これは現時点で外部検証済みFACTではないためScenario assumptionとして扱う。

仮にCustomer Alternative Costが¥2.0m〜で、Managed Capabilityが¥0.5m〜¥0.8mで同等以上のCapabilityを提供できるなら、Customer Value Gapは大きい。

しかし価格妥当性は単純なDiscount率ではなく、以下で証明する必要がある。

- Capability Coverage
- Quality / SLA
- Specialist Access
- Knowledge Continuity
- Risk Reduction
- Management Visibility
- Continuous KAIZEN
- Customer-side TCO

---

## 12. Price Decision Gates

価格を確定する前に最低限必要なFACT：

1. Category別Baseline Work Hours
2. Category別Valid Compression Rate
3. Role Mix
4. Role別Full Cost
5. FACTACT / Tool cost
6. Service Management cost
7. Specialist Pool cost
8. Onsite / logistics cost
9. Capability Coverage
10. Quality / SLA
11. Customer Alternative TCO
12. Customer willingness-to-pay / sales evidence

これらが揃ってから49.8 / 60 / 80万円をDecisionする。

---

## 13. Initial Interpretation — HYPOTHESIS

現時点の最も重要な見方：

- Service Desk Heavy ScopeはHuman Workが残るため高価格側になりやすい。
- Operation / Management Heavy ScopeはFACTACT leverageにより低い価格でも成立する可能性がある。
- 同じ顧客でもScopeを組み替えると成立性が変わる。
- 49.8万円が「安すぎる」とも、80万円が「適正」ともまだ決められない。
- FACTACTのCompression実績が価格設計の中心Evidenceになる。

---

## 14. Next Analysis

次は価格そのものではなく、代表顧客3 Patternを作る。

1. **Service Desk Heavy**
2. **Balanced IT Function**
3. **Operation / Management Heavy**

各Patternについて：

- Baseline Work
- Work Mix
- Expected Compression Range
- Required Human Work
- Role Mix
- Delivery COGS
- Customer Alternative TCO
- 49.8 / 60 / 80万円でのMargin Sensitivity

を並べる。

その後、最初に狙うべきICPを「売上規模」ではなく**FACTACT leverageが最も効く顧客特性**から決める。
