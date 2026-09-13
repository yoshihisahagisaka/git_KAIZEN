# Managed Capability ICP / Work-Mix Economics v1

Status: **HYPOTHESIS / SENSITIVITY ANALYSIS — NOT PRICE DECISION**
Date: 2026-09-13
Related: docs/47, docs/48, docs/49, docs/50, docs/51, docs/52

## 1. Purpose

FACTACTによるHuman Work Compressionが、どのWork Mixの顧客でManaged Capabilityの事業性につながりやすいかを比較する。

本書はICP・価格のDecisionではない。

数値はすべてSensitivity用HYPOTHESISであり、実顧客FACTではない。

---

## 2. Common Scenario Assumptions — HYPOTHESIS

Sensitivity比較のため、以下を仮置きする。

- Customer Baseline Work: 200h / month
- Blended Human Full Cost: 5,000円 / h
- Non-Human Delivery Cost: 100,000円 / month
  - FACTACT
  - Service Management
  - Shared Specialist reserve
  - Other delivery cost
- Candidate Price: 498,000 / 600,000 / 800,000円

これらは価格Decision / 実原価ではない。

---

## 3. Three ICP Work-Mix Archetypes

### A. Service Desk Heavy

Baseline:
- Service Desk 120h
- Operational Work 50h
- Management / Reporting 30h
- Total 200h

Compression HYPOTHESIS:
- Service Desk: 20%
- Operation: 40%
- Management: 50%

After:
- Service Desk 96h
- Operation 30h
- Management 15h
- Total **141h**

Overall Compression: **29.5%**

### B. Balanced IT Function

Baseline:
- Service Desk 70h
- Operational Work 90h
- Management / Reporting 40h
- Total 200h

After HYPOTHESIS (doc49):
- Service Desk 55h
- Operation 50h
- Management 18h
- Total **123h**

Overall Compression: **38.5%**

### C. Operation / Management Heavy

Baseline:
- Service Desk 40h
- Operational Work 110h
- Management / Reporting 50h
- Total 200h

Compression HYPOTHESIS:
- Service Desk: 20%
- Operation: 50%
- Management: 60%

After:
- Service Desk 32h
- Operation 55h
- Management 20h
- Total **107h**

Overall Compression: **46.5%**

---

## 4. Provider COGS under Common Assumptions

Formula:

`Delivery COGS = Required Human Work × 5,000 + 100,000`

| Archetype | After Human Work | Delivery COGS |
|---|---:|---:|
| Service Desk Heavy | 141h | 805,000円 |
| Balanced | 123h | 715,000円 |
| Operation / Management Heavy | 107h | 635,000円 |

### Finding

この仮定では、30〜46.5%のCompressionだけでは498k / 600k / 800kのManaged Capabilityを十分なMarginで成立させられない。

800kの場合：
- Service Desk Heavy: 約 -0.6% margin
- Balanced: 約 10.6%
- Operation / Management Heavy: 約 20.6%

これは重要な反証候補である。

> **「30%程度圧縮できれば60万円が成立する」とは限らない。**

---

## 5. Required Human Work Ceiling by Price

同じAssumptionでGross Margin 50%を目標にした場合：

Formula:

`Max Human Cost = Price × (1 - GM) - Non-Human Cost`

`Max Human Hours = Max Human Cost / Full Cost per Hour`

| Price | Max Total COGS @50% GM | Human Cost Budget | Max Human Hours |
|---:|---:|---:|---:|
| 498,000 | 249,000 | 149,000 | 29.8h |
| 600,000 | 300,000 | 200,000 | 40.0h |
| 800,000 | 400,000 | 300,000 | 60.0h |

Gross Margin 40%なら：

| Price | Max Human Hours |
|---:|---:|
| 498,000 | 39.8h |
| 600,000 | 52.0h |
| 800,000 | 76.0h |

### Implication

Baseline 200hを丸ごとManaged Scopeとして受ける場合、50% GMでは必要Compressionは概ね：

- 498k: 200h → 29.8h = 85.1%
- 600k: 200h → 40h = 80.0%
- 800k: 200h → 60h = 70.0%

となる。

この水準は現在のHYPOTHESISよりかなり高い。

---

## 6. Important Interpretation

ここから「月額サービスは成立しない」と結論してはいけない。

なぜなら、以下がまだUNKNOWNだからである。

1. Customer Baseline Work 200hが妥当か
2. atLIBがBaseline Scopeを100%引き取る必要があるか
3. Full Cost 5,000円/hが妥当か
4. Non-Human Delivery 100,000円が妥当か
5. Shared CapabilityでRole Mix / utilizationをどう最適化できるか
6. FACTACTで50%以上のCompressionが可能なWorkがどの程度あるか
7. Customer / Existing Vendor / Automationへ残すWorkがどれだけあるか
8. 月額価格にProject / Specialist / Change Workを含めるか別料金にするか

---

## 7. Critical Business Model Insight

Managed Capabilityは「顧客の全Workを丸ごと引き取る」必要はない。

IT経営KAIZENのActor Neutralityに従えば、Assessment後に：

- なくす
- 自動化する
- 顧客に残す
- Existing Vendorへ残す
- Specialist Projectへ切り出す
- atLIB Managed Capabilityへ任せる

を先に設計できる。

したがって経済性を見るべき対象は：

> **Customer Baseline Total Work**

ではなく、

> **KAIZEN後にatLIBが継続Actorとして担うRemaining Managed Work**

である。

---

## 8. Example of Scope Transformation — HYPOTHESIS

Customer Baseline 200h:

- 40h: eliminate / automate
- 25h: customer retains because business decision / local action
- 25h: existing vendor retains
- 20h: project / specialist work separated
- 90h: recurring managed candidate

さらにFACTACTで90hを50%圧縮：

> atLIB Human Work = 45h

この場合：

Delivery COGS = 45h × 5,000 + 100,000 = 325,000円

Margin:
- 498k → 34.7%
- 600k → 45.8%
- 800k → 59.4%

この例はHYPOTHESISだが、重要な構造を示す。

> **事業性は「全200hの圧縮率」だけでなく、「Actor再配置後にatLIBへ残るManaged Scope × そのScopeのCompression率」で決まる。**

---

## 9. Revised Economic Formula

旧イメージ：

`Customer Baseline Hours → Compression → atLIB Hours`

より正確なモデル：

`Customer Baseline Work`

→ 6 Lenses

→ Actor Allocation

- eliminate
- automate
- customer
- existing vendor
- project/specialist
- atLIB managed

→ FACTACT Compression on atLIB-managed recurring scope

→ `Required atLIB Human Work`

→ COGS / Price / Margin

Formula:

`Managed Human Work = Managed Scope Baseline Hours × (1 - Compression Rate)`

`Delivery COGS = Managed Human Work × Blended Full Cost + Non-Human Delivery Cost`

---

## 10. ICP Implication

### Weak ICP — Service Desk dominated, little redesign freedom

Characteristics:
- high live human interaction
- immediate response expectation
- many onsite physical requests
- customer expects dedicated person
- little standardization / automation permission

Risk:
- Compression limited
- resembles traditional BPO
- margin depends on labor utilization

### Better ICP — Repeatable Operational Work + fragmented management

Characteristics:
- repeated account / device / SaaS / license work
- multiple spreadsheets / registers
- duplicate entry
- manual reporting
- existing SaaS / MDM / IdP tools but disconnected operations
- frequent context search
- vendor coordination overhead

Value:
- management-update elimination
- integration / evidence reuse
- procedure standardization
- automation
- reporting projection

### Strongest Initial Hypothesis — Operation / Management Heavy + Change willingness

Characteristics:
- IT work exists but is operationally inefficient
- company wants improvement, not merely staffing
- accepts process redesign
- existing tools can stay but connections may be improved
- management wants IT visibility

This matches FUTURE-first / Actor Neutrality better than pure Helpdesk outsourcing.

---

## 11. Pricing Implication

Do not create price plans based only on employee count or included hours.

Potential internal pricing variables:

1. Managed Scope Baseline Work
2. Work Mix
3. Expected Compression Potential
4. Human Interaction Ratio
5. Onsite / physical ratio
6. Availability / SLA requirement
7. Specialist requirement
8. Integration complexity
9. Standardization maturity
10. Expected atLIB Human Work after transition

Customer-facing offer may remain simple, but internal qualification must use these variables.

---

## 12. What 49.8 / 60 / 80 May Mean — HYPOTHESIS

### 498k
Potential fit:
- narrow / well-standardized managed scope
- approximately <=30–40h monthly Human Work depending target margin
- high automation / low physical work

### 600k
Potential fit:
- moderate managed scope
- approximately <=40–52h Human Work
- balanced operations with manageable interaction

### 800k
Potential fit:
- broader managed capability
- approximately <=60–76h Human Work
- more Service Desk / specialist / management involvement

These are internal economics guides, not customer-visible time entitlements.

---

## 13. Key Decision Change from Previous Analysis

Previous working assumption:

> Compression Rate alone may explain price viability.

Revised finding:

> **Compression Rate alone is insufficient.**

Business viability depends on:

> **Baseline Work × Actor Allocation × Managed Scope × Compression × Role Cost × Non-Human COGS**

This is a stronger model and should replace simplistic `Customer 100h → atLIB 70h` economics when evaluating final pricing.

The 100h→70h example remains useful to explain Compression, but not sufficient for Unit Economics.

---

## 14. Next Validation

Next business analysis should build an Assessment-to-Commercial Scope Decision Model:

For each identified Work:

1. Baseline volume / time
2. Work class
3. 6 Lens decision
4. Required Actor
5. Managed / Project / Customer / Vendor allocation
6. Compression potential
7. Remaining atLIB Human Work
8. Required Role
9. COGS
10. Candidate commercial treatment

This becomes the bridge from Assessment output to quotation / price band.
