# Assessment → Commercial Scope Decision Model v1

Status: **BUSINESS MODEL / PROPOSAL — PRICE DECISION NOT YET FIXED**  
Date: 2026-09-13

## 1. Purpose

設計Assessmentで確認したFACTから、改善テーマだけでなく、

- 何を変えるか
- 誰が担うか
- atLIBが担うなら何をScopeにするか
- どのCapabilityが必要か
- FACTACTでどこまでHuman dependencyを圧縮できるか
- atLIBのDelivery COGSはいくらか
- 顧客にとっての代替TCO / IT投資との関係はどうか
- Commercial PriceをどのRangeで検討すべきか

までを一貫して導くためのBusiness Modelを定義する。

このモデルは固定S/M/Lプランを正当化するためのものではない。

> **FACTからCommercial Scopeをつくる。PriceからScopeを逆算しない。**

---

## 2. Canonical Boundary

IT経営KAIZENの順序は変えない。

> FUTURE → FACT / UNKNOWN → GAP → ROOT CAUSE → KAIZEN OPTION → HUMAN DECISION → ACT → CHANGE → NEW FACT → NEXT KAIZEN

Commercial DesignはHuman Decisionの後段で行う。

> **何を変えるかを先にDecisionする。誰が担うかは、その後に決める。**

Actorは以下を含む。

- Customer
- Existing Vendor
- Other Vendor
- atLIB
- System / Automation
- Project / Specialist

AssessmentはatLIBへの発注を結論として作らない。

---

## 3. Commercial Design Flow

```text
FUTURE
  ↓
FACT / UNKNOWN
  ↓
GAP / ROOT CAUSE
  ↓
KAIZEN OPTION
  ↓
HUMAN DECISION
  ↓
Required IT Capability
  ↓
Work / Capability Decomposition
  ↓
6 Lenses
  ↓
Actor Allocation
  ↓
Remaining atLIB Managed Scope
  ↓
Scale / Complexity / Responsibility / Service Level
  ↓
Human Work Structure
  ↓
FACTACT Leverage
  ↓
Required Human Work / Role Mix
  ↓
Delivery COGS
  ↓
Customer Alternative TCO / IT Investment / Business Value
  ↓
Commercial Scope & Price Range
```

---

## 4. Step 1 — Required IT Capability

Assessmentで最初に決めるのは「何時間の作業を外注するか」ではない。

FUTUREとGAPから、企業に必要なIT Capabilityを定義する。

例：

- User Support
- Identity / Access
- Device Management
- SaaS / License Management
- Infrastructure Operation
- Security Operation
- Vendor Management
- IT Governance
- IT Planning / Management
- Change / Project Capability

Capability Coverageを先に定義し、Work Hoursはその後に扱う。

---

## 5. Step 2 — Work / Capability Decomposition

各CapabilityをWork単位へ分解する。

例：

- Joiner
- Leaver
- Account / Authority Change
- Device Provisioning / Replacement
- SaaS / License Change
- User Inquiry
- Incident
- Patch / Update
- Monitoring Event
- Vendor Coordination
- Monthly Management Review
- Security Evidence / Audit Support

各Workについて最低限以下を確認する。

### Volume
- 件数
- 頻度
- Baseline Human Work

### Work Structure
- Routine Execution
- Human Decision
- Communication
- Search
- Verification
- Recording
- Duplicate Administration
- Reporting
- Rework
- Waiting

### Capability / Skill
- Operator
- Engineer
- Specialist
- Service Manager
- Consultant / Management

---

## 6. Step 3 — 6 Lenses

各Workを以下で再設計する。

> **なくす・自動化する・標準化する・任せる・残す・整える**

重要：6 LensesはBPOメニューではない。

例：

```text
現在100hのWork
  ↓
なくす       15h
自動化する   20h
標準化する   10h
顧客に残す   15h
既存Vendor   10h
Project化    10h
atLIB Managed 20h
```

数値は説明用HYPOTHESISであり標準値ではない。

---

## 7. Step 4 — Actor Allocation

Workを「atLIBができるか」で決めない。

以下でActorをDecisionする。

- Business Authority
- Required Skill
- Frequency
- Standardizability
- Risk
- Existing Capability
- Existing Vendor Strength
- Economic Efficiency
- Continuity
- FACT / Evidence accessibility

Actor Allocation結果：

| Actor | 意味 |
|---|---|
| Customer | 顧客がDecision / 実行する方が合理的 |
| Existing Vendor | 現Vendorを維持する方が合理的 |
| Other Vendor | 専門Vendorが適切 |
| System / Automation | Human Work自体をなくす |
| Project / Specialist | 継続運用ではなく変革・専門案件 |
| atLIB Managed | atLIB Shared Capabilityとして継続提供 |

---

## 8. Step 5 — Managed Scope Dimensions

atLIB Managed Scopeに入ったWorkを、単純な時間だけで価格化しない。

### 8.1 Scale
- Employees / Users
- Devices
- Accounts
- SaaS / Systems
- Locations
- Group Companies
- Vendors

### 8.2 Complexity
- Approval Depth
- Authority Patterns
- Exception Rate
- Legacy / On-premise dependency
- Integration count
- Business-specific systems
- Organization complexity

### 8.3 Responsibility
- Security impact
- Business continuity impact
- Audit / Compliance requirement
- Change authority
- Financial impact
- Data sensitivity

### 8.4 Service Level
- Service hours
- Response expectation
- Availability expectation
- Onsite requirement
- Escalation requirement
- Specialist availability
- Management review requirement

### 8.5 Human Work Structure
- Work Volume
- Work Type
- Skill Level
- Decision Level
- Risk Level
- Interaction Level
- Exception Rate

> **Human Work Hours ≠ Human Work Cost ≠ Human Work Complexity ≠ Customer Value**

---

## 9. Step 6 — FACTACT Leverage

FACTACTの価値は、Customer WorkをそのままatLIBへ移すことではない。

確認すべきLeverage：

- WorkからFact / Evidence / Relation / Changeが自然に形成されるか
- 同じ変更を複数管理表へ再入力しなくてよいか
- Context Searchを減らせるか
- Knowledge / Procedureを再利用できるか
- Standard WorkをSystem executionへ移せるか
- Management Projectionを追加入力なしで形成できるか
- ChangeからCurrent Stateを更新できるか
- Repeated Workから次のKAIZENを見つけられるか

### Valid Compression

> **Human Work ↓ × Capability Coverage ≥ Baseline × Quality ≥ Baseline × Risk not materially increased**

単に記録を省略した、確認をやめた、Service Levelを落とした、という削減はCompressionと認めない。

---

## 10. Step 7 — Role Mix / Delivery COGS

Customer Baseline Human WorkとatLIB Human Workを分離する。

```text
Customer Baseline Human Work ≠ atLIB Required Human Work
```

さらにatLIB Human WorkをRole別に分解する。

```text
Human Work Cost
 = Σ(Role Human Hours × Role Full Cost/h)
```

Delivery COGS：

```text
Delivery COGS
 = Human Work Cost
 + Shared Specialist Cost
 + FACTACT / Tool Cost
 + Service Management Cost
 + Onsite / Logistics
 + Other Delivery Cost
```

固定5,000円/hはSensitivity用HYPOTHESISであり、正式原価ではない。

---

## 11. Step 8 — Customer-side Economic Context

Delivery COGSだけでPriceを決めない。

### Alternative TCO

比較対象例：

- Internal IT FTE
- Dispatch / Onsite Staff
- BPO
- MSP
- Multiple Specialist Vendors
- Existing Vendor Structure
- Customer's Current Manual Work

### IT Investment Context

確認候補：

- Annual IT Spend
- SaaS / License Spend
- Device Spend
- Infrastructure / Cloud Spend
- Security Spend
- Vendor Spend
- Internal IT Labor Cost
- Planned IT Investment

IT投資額が大きいほど必ず高価格にする、というルールではない。

IT投資額はCustomer Value / Responsibility / Decision Impactを理解するためのContextである。

### Business Value

- Employee Time Created
- Downtime reduction
- Risk reduction
- Cost optimization
- Faster onboarding / change
- Management visibility
- IT investment decision quality
- Continuous KAIZEN capability

---

## 12. Price Architecture

Priceは単一の時間単価から作らない。

### Cost Floor

> **atLIBがCapability / Qualityを維持して持続的に提供できる最低経済条件**

### Commercial Complexity / Responsibility

> Scale × Complexity × Responsibility × Service Level × Human Work Structure

### Customer Value Context

> Alternative TCO × IT Investment Context × Business Value

### Conceptual Model

```text
Commercial Price Range
 = f(
   Required Capability,
   Scale,
   Complexity,
   Responsibility,
   Service Level,
   Human Work Structure,
   FACTACT Leverage,
   Delivery COGS,
   Customer Alternative TCO,
   IT Investment Context,
   Business Value
 )
```

これは数式価格表ではない。

目的は「なぜこのScope / Priceなのか」をFACTで説明可能にすることである。

---

## 13. Assessment Output — Commercial Decision Sheet

AssessmentのCommercial Handoffでは最低限以下を出す。

### A. FUTURE / CHANGE
- 何を実現するか
- 1-year KGI / expected CHANGE

### B. Required IT Capability
- 必要Capability
- 現在のCoverage / Gap

### C. Work Baseline
- Work Type
- Volume
- Human Work
- Human Work Structure
- Evidence

### D. KAIZEN / Actor Decision
- なくす
- 自動化
- 標準化
- Customer
- Existing Vendor
- Other Vendor
- Project / Specialist
- atLIB Managed

### E. atLIB Managed Scope
- Included Capability
- Included Work
- Excluded Work
- Responsibility Boundary
- Service Level

### F. FACTACT Leverage Hypothesis
- Eliminate
- Standardize
- Automate
- Context reuse
- Management Projection
- Human Work Compression

### G. Delivery Economics
- Required Human Work
- Role Mix
- Non-Human Cost
- Delivery COGS
- Margin sensitivity

### H. Customer Economics
- Current / Alternative TCO
- IT Investment Context
- Expected Business Value

### I. Commercial Proposal
- Scope
- Price Range
- assumptions
- UNKNOWN
- Confirmation Items

---

## 14. Sales-stage vs Assessment-stage

すべてを無料診断・初回商談で測定しない。

### Sales / Free Diagnosis

Proxyとして使う候補：

- Employee count
- Device count
- SaaS / System count
- Locations / Group companies
- IT staffing
- Vendor count
- Major recurring pain
- Duplicate management
- Security / compliance requirement
- Approximate IT investment band if customer can answer

目的：

> **Assessment対象としてLeverageがありそうかを判断する。**

### Paid Assessment

Evidenceを確認し、Actual Scale / Complexity / Work / Actor / Capabilityを確定する。

> **Sales ProxyをFACTに置き換える。**

---

## 15. Initial ICP Hypothesis

### High-potential characteristics

- Generalist一人ではCapability Coverageが不足
- しかし全専門領域をFTEで内製するほどではない
- SaaS / Device / Account / Vendorが一定以上存在
- Workの結果を複数管理表へ転記
- Joiner / Leaver / Authority / Device / License等のRecurring Workがある
- IT投資は行っているが運用が分断
- Security / Governance要求が上がっている
- Standardization / Automation余地がある
- Managementが「人を増やす」だけでなく「仕事を良くする」ことを望む

### Lower-potential characteristics

- ほぼL1 Service Deskのみ
- 強い専任担当者指名要求
- オンサイト物理対応中心
- Standardizationを許容しない
- System / Evidenceへの接続が困難
- Scopeが極小でValue Poolが小さい
- Enterprise固有例外が多すぎShared Modelが効かない

企業規模100〜500名は現時点でLeverage Zoneの**HYPOTHESIS**であり、ICP DECISIONではない。

---

## 16. Price Scenarios 49.8 / 60 / 80万円の扱い

49.8万円、60万円、80万円は引き続き **PRICE SCENARIO**。

禁止：

```text
50名 = 49.8万
100名 = 60万
300名 = 80万
```

のような社員数だけの固定対応。

代わりにAssessment後のCommercial Decision Sheetから成立条件を確認する。

将来的には、営業しやすさのためCustomer-facing package / bandを作る可能性はあるが、先にEconomicsを検証する。

---

## 17. Required Validation

Price Decision前に必要なFACT：

1. 実案件のWork Baseline
2. Human Work Structure
3. Scale / Complexity
4. Actor Allocation
5. FACTACT適用後Human Work
6. Role Mix / Full Cost
7. Non-Human Delivery Cost
8. Capability Coverage
9. Quality / SLA
10. Customer Alternative TCO
11. IT Investment Context
12. Sales / Willingness-to-pay evidence

---

## 18. Strategic Meaning

このモデルの目的は「BPOを複雑な料金表で売る」ことではない。

> **経営が必要とするIT Capabilityを設計し、仕事そのものをKAIZENし、最適なActorへ配置し、その結果atLIBが担うべきCapabilityだけをShared Modelで提供する。**

その経済優位をFACTACTで継続的に高める。

したがってManaged Capabilityは、IT経営KAIZENの中心事業そのものではなく、Human Decisionの結果atLIBがActorとして選ばれた場合のACT / 継続実行手段である。

---

## 19. Next Business Validation

次のBusiness Laneでは、架空の固定社員数プランを増やすのではなく、以下を行う。

1. Commercial Decision Sheetの入力項目をAssessment仕様へ接続
2. Scale / Complexity / Responsibilityの簡易Commercial Classificationを設計
3. 3つのRepresentative CaseでAssessment→Scope→Economicsを通し計算
4. 49.8 / 60 / 80万円がどの条件で成立するか再評価
5. 初期ICP Candidateを絞る
6. 実案件でTime Study / FACTACT Compressionを測定しHYPOTHESISをFACTへ変える

---

## 20. Guardrail

> **Priceから仕事を作らない。FACTからScopeを作る。**

> **Customerの100hを、atLIBの100hとして引き受けない。**

> **Human Workを減らしても、Capability / Quality / Risk Controlを落とさない。**

> **人を売らない。必要なIT Capabilityを提供する。**

> **AI Suggests. Human Decides. System Records.**
