# Commercial Quote Engine & Calibration Loop v1

Status: **BUSINESS MODEL / PROPOSAL — SYSTEMIZATION INPUT**  
Date: 2026-09-13

## 1. Purpose

設計Assessmentで確認したFACTとHuman Decisionから、Commercial Scope・Delivery Economics・Price Range・見積条件を再現可能に生成し、受注後のFACTACT実績で見積ロジック自体を改善する仕組みを定義する。

これは単なる「見積AI」ではない。

> **Assessment FACT → Scope → Economics → Quote → Actual Delivery FACT → Variance → Calibration**

を一つの閉ループにする。

---

## 2. Core Principle

> **Priceから仕事を作らない。FACTからScopeを作る。**

> **Customerの100hをatLIBの100hとして引き受けない。**

> **人を売らない。必要なIT Capabilityを提供する。**

Quote EngineはHuman Decisionを置き換えない。

> **System calculates. AI suggests. Human decides. System records.**

AIは説明・仮説・確認項目・類似Case候補を提示できるが、FACT化、Actor Decision、Commercial Approvalを自動確定しない。

---

## 3. End-to-End Flow

```text
Free Diagnosis / Sales Proxy
        ↓
Paid Assessment
        ↓
FACT / UNKNOWN / Evidence
        ↓
FUTURE / GAP / KAIZEN OPTION
        ↓
Human Decision
        ↓
Actor Allocation
        ↓
atLIB Managed Scope
        ↓
Commercial Classification
        ↓
Work / Capability Model
        ↓
FACTACT Leverage Hypothesis
        ↓
Required Human Work by Role
        ↓
Delivery COGS
        ↓
Price Range / Commercial Conditions
        ↓
AI Explanation / Confirmation Items
        ↓
Human Commercial Approval
        ↓
Quote / Scope Sheet / Contract Handoff
        ↓
FACTACT Delivery
        ↓
Actual Work / Quality / Cost / Change FACT
        ↓
Estimate vs Actual Variance
        ↓
Calibration Dataset
        ↓
Next Estimate
```

---

## 4. Quote Engine Input Layers

### 4.1 Customer / Scale FACT

- Employees / Users
- Devices
- Accounts
- SaaS / Systems
- Locations
- Group Companies
- Vendors
- Current IT staffing

社員数はPriceそのものではなくScale Proxy / FACTの一つ。

### 4.2 Complexity FACT

- Approval depth
- Authority patterns
- Exception patterns
- Legacy / On-prem dependency
- Integration count
- Business-specific systems
- Vendor fragmentation
- Group governance complexity

### 4.3 Work Demand FACT

Work Typeごとに：

- monthly / annual volume
- frequency
- seasonality
- baseline human work
- touches
- waiting
- rework
- systems touched
- duplicate administration
- reporting work

### 4.4 Human Work Structure

- Work Type
- Skill Level
- Decision Level
- Risk Level
- Interaction Level
- Exception Rate
- Specialist dependency

### 4.5 Responsibility / Service Requirement

- Security impact
- Business continuity impact
- Audit / compliance
- Service hours
- response expectation
- onsite requirement
- escalation
- management review

### 4.6 Customer Economics

- current internal IT labor cost
- current outsourcing / vendor cost
- current IT spend
- planned IT investment
- alternative sourcing TCO
- business impact / risk context

UNKNOWNはUNKNOWNのまま保持する。

---

## 5. Commercial Classification

Commercial Classificationは一つの総合点へ潰さない。

以下を独立Dimensionとして表示する。

1. **Scale**
2. **Complexity**
3. **Work Mix**
4. **Human Work Structure**
5. **Responsibility**
6. **Service Level**
7. **Specialist Intensity**
8. **Onsite Dependency**
9. **Standardization Potential**
10. **FACTACT Connectivity / Leverage Potential**

目的は「72点だから80万円」ではない。

> **どのDimensionがDelivery Cost / Customer Value / Riskを押し上げているかを説明できること。**

DimensionごとのBand表現（Low / Medium / High等）は将来候補だが、Thresholdは実績FACTなしに固定しない。

---

## 6. Work / Actor Decision Matrix

各Workについて以下を持つ。

| Field | Meaning |
|---|---|
| Work Type | Joiner, Inquiry, Incident等 |
| Baseline Volume | 現状件数 |
| Baseline Human Work | 現状Human Work |
| Required Capability | 必要Capability |
| 6 Lens Decision | なくす/自動化/標準化/任せる/残す/整える |
| Actor | Customer/Vendor/System/Project/atLIB |
| Evidence | 判断根拠 |
| UNKNOWN | 未確認事項 |
| Confirmation Item | 見積前確認事項 |

atLIB Managed ScopeはこのMatrixの結果として形成する。

---

## 7. FACTACT Leverage Model

各atLIB Managed Workについて、以下のHuman Work reduction sourceを分離する。

- Duplicate Entry Elimination
- Context Search Reduction
- Standard Procedure Reuse
- Knowledge Reuse
- Automated Execution
- External Evidence Connection
- Management Projection Generation
- Exception Reduction
- Rework Reduction
- Actor Reallocation

CompressionはWork Type別に持つ。

```text
Required Human Work_work
 = Managed Baseline Work_work
 × (1 - Valid Compression Rate_work)
```

ただしValid Compressionは：

> **Human Work ↓ × Capability Coverage ≥ Baseline × Quality ≥ Baseline × Risk not materially increased**

でなければならない。

初期はCompression RateをHYPOTHESISとして持ち、実績で更新する。

---

## 8. Role Mix Engine

Required Human WorkをRoleへ配賦する。

Candidate Roles：

- Service Desk Operator
- IT Operations Engineer
- Infrastructure / Cloud Engineer
- M365 / Identity Specialist
- Security Specialist
- Network Specialist
- Service Manager
- IT Consultant / Management

```text
Human Work Cost
 = Σ(Role Hours × Role Full Cost)
```

Role Full Costは社内管理値でありCustomer-facing時間単価ではない。

Shared Specialistは「常時専任」ではなく必要時にCapabilityを呼び出す構造を前提とする。

---

## 9. Delivery COGS Engine

```text
Delivery COGS
 = Human Work Cost
 + Shared Specialist Pool Allocation
 + FACTACT / Tool Cost
 + Service Management Cost
 + Onsite / Logistics
 + External Service Cost
 + Risk / Coverage Cost where applicable
```

COGSは見積のCost Floorを形成するが、Priceそのものではない。

---

## 10. Commercial Price Range

Quote Engineは一つの価格を自動確定せず、少なくとも以下を出す。

### Cost Floor

持続可能なDelivery最低条件。

### Target Economics Range

目標Margin条件を満たす価格Range。

### Customer Value Context

- Alternative TCO
- Internal FTE / onsite / dispatch comparison
- Existing vendor cost
- IT investment context
- business impact
- risk / continuity
- expected CHANGE

### Price Scenario Check

49.8 / 60 / 80万円等のScenarioを当て、各価格で：

- Gross Margin
- Capability Coverage
- Service Level feasibility
- Risk
- Customer Value gap

を表示する。

> **Scenarioを選ぶのではなく、Scenarioが成立する条件を確認する。**

---

## 11. Quote Output

Human Approval前のQuote Draftは以下を含む。

1. Customer / Assessment Reference
2. FUTURE / selected CHANGE
3. Required IT Capability
4. atLIB Managed Scope
5. Excluded Scope
6. Actor Boundary
7. Service Level
8. Assumptions
9. UNKNOWN / Confirmation Items
10. FACTACT Leverage assumptions
11. Commercial Classification dimensions
12. Delivery COGS summary — internal only
13. Price Range — internal
14. Proposed Price — Human Decision required
15. Customer-facing value rationale
16. Contract / Transition considerations

Customer-facing見積に内部COGS・Marginを表示しない。

---

## 12. Human Approval Gate

System / AIは以下を自動確定しない。

- Final Scope
- Final Actor Allocation
- Final Service Level
- Final Compression assumption acceptance
- Final Price
- Discount
- Contract exception
- Risk acceptance

Commercial Approverが確認する。

Approval時にSnapshotを保存する。

### Snapshot Candidate

- Assessment version
- Fact references
- Work model version
- Compression assumptions
- Role cost version
- COGS calculation
- Price proposal
- Approved price
- approver
- approval timestamp
- exceptions / rationale

後から「当時何を根拠にこの見積を出したか」を再現できることが重要。

---

## 13. Delivery Handoff

受注後、Quote SnapshotからFACTACTへ以下を引き継ぐ。

- Managed Scope
- Work Catalog
- Actor Boundary
- Required Capability
- Service Level
- Assumptions
- UNKNOWN / Confirmation Items
- Baseline Work
- Expected Compression
- Expected Role Mix
- Expected KGI / KPI

営業資料を運用担当が読み直して手入力する構造を避ける。

---

## 14. Actual Delivery Evidence

FACTACTからCalibrationに必要な実績を形成する。

### Work FACT
- Work Type
- Volume
- lifecycle events
- actor
- related entity
- evidence
- completion / rework

### Human Work Evidence
- Human Action / Decision events
- sampled or measured duration where valid
- role
- touches
- waiting / rework where representable

FACTACTをTime Tracking Systemにはしない。

Human durationはSystem event / inference / sampling / validation measurementを優先する。

### Quality / Capability
- first-time-right
- rework
- SLA / response
- escalation
- incident outcome
- coverage gaps

### Change
- Change formed
- Current State updated
- NEW FACT
- KGI / KPI movement

---

## 15. Estimate vs Actual Variance

最低限以下を比較する。

| Estimate | Actual |
|---|---|
| Work Volume | Actual Volume |
| Baseline / Managed Work | Actual Scope Demand |
| Compression | Actual Human Work Reduction |
| Role Mix | Actual Role Mix |
| Human Hours | Actual Human Work |
| Non-Human Cost | Actual Non-Human Cost |
| Service Level | Actual Service Performance |
| Rework / Exception | Actual Rework / Exception |
| COGS | Actual Delivery COGS |
| Expected CHANGE | Actual NEW FACT / CHANGE |

Variance自体をFACTとして残す。

---

## 16. Calibration Loop

```text
Estimate
  ↓
Human Approval
  ↓
Delivery
  ↓
Actual FACT
  ↓
Variance
  ↓
Cause Analysis
  ↓
Calibration Candidate
  ↓
Human Review
  ↓
Updated Estimation Parameter / Rule
  ↓
Next Estimate
```

AIはVarianceから原因候補を提案できる。

例：

- Joiner volumeを過小評価
- Exception Rateが想定より高い
- SaaS connectionによりDuplicate Entry削減が想定以上
- Service Desk synchronous interactionが多く圧縮不足
- Specialist escalationが想定以上

しかし、原因を自動FACT化しない。

---

## 17. Calibration Dataset

案件が増えるほど以下の匿名化・集約可能なBusiness Evidenceを蓄積する構想。

- Company Scale
- IT Estate Scale
- Complexity characteristics
- Work Mix
- Work Volume
- Human Work Structure
- Actor Allocation
- FACTACT Connectivity
- Expected Compression
- Actual Compression
- Expected Role Mix
- Actual Role Mix
- Expected COGS
- Actual COGS
- Price
- Margin
- Service Quality
- Customer outcome / CHANGE

これにより将来的に：

> **「このタイプの企業では、どのCapabilityがどのHuman Work / COGSで提供できるか」**

の精度を上げる。

顧客固有情報・契約情報・機密情報の扱いは別途Data Governanceが必要。

---

## 18. Parameter Governance

見積ロジックのParameterをAIが勝手に書き換えない。

Candidate Parameters：

- Work Type baseline model
- Compression range
- Role allocation
- Role full cost
- Shared cost allocation
- Service management factor
- Onsite cost
- target margin
- risk / service requirement treatment

Parameter updateは：

> **Evidence → Proposal → Human Approval → Versioned Rule**

とする。

旧見積の再現性を守るためVersion管理する。

---

## 19. Development Boundary

この文書はBusiness Model / Systemization Inputであり、FACTACT Core Object追加を決定しない。

Product / Development Laneで確認すべき事項：

1. Assessment SnapshotをどのContextとして保持するか
2. Work / Actor / Capability / Evidenceの既存Core Fit
3. Quote SnapshotをFACTACT Coreに置くか外部Sales Systemに置くか
4. Actual Work Evidenceをどこまで自然取得できるか
5. Human Work durationをCoreに持たずAnalytics / Validationで扱えるか
6. Estimate vs Actual Projectionをどこに形成するか
7. Parameter / Rule versioningをどこで管理するか
8. Customer-facing quote document生成との境界

> **見積都合でFACTACT Coreを汚さない。**

---

## 20. Initial MVP Proposal

最初から完全自動化しない。

### Phase A — Spreadsheet / Existing Estimate Tool

- Assessment FACT入力
- Commercial Dimensions表示
- Work / Actor Matrix
- Compression HYPOTHESIS
- Role Mix
- COGS
- Price Scenario sensitivity
- Human Approval

### Phase B — Assessment System Integration

- AssessmentからFACT / Decisionを自動引継ぎ
- UNKNOWN / Confirmation Item継承
- Quote Draft生成
- Snapshot保存

### Phase C — FACTACT Delivery Feedback

- Actual Work / Quality / Change Evidence連携
- Estimate vs Actual
- Calibration Candidate

### Phase D — Data-driven Estimation

十分な実績FACTが蓄積した後に、類似Case・Range・AnomalyをAIが提案する。

最初からAIに価格決定をさせない。

---

## 21. Business Value to atLIB

この仕組みは見積時間削減だけが価値ではない。

### Sales Productivity
- 営業ごとの見積ばらつき低減
- Assessment→Quoteの再入力削減
- 根拠説明の標準化

### Delivery Quality
- 営業Scopeと運用Scopeのズレ低減
- UNKNOWN / assumptionの引継ぎ
- 過小見積・過大見積の検証

### Unit Economics
- Work Mix別実原価
- Compression実績
- Role Mix実績
- Margin Driverの可視化

### Strategic Asset

> **案件を実行するほど、atLIB自身の「IT Functionの設計・提供・価格化」の精度が上がる。**

これはFACTACT / IT経営KAIZENのHELIXをatLIB自身の事業運営へ適用することでもある。

---

## 22. Guardrails

- Company Size = Price にしない
- Hours = Price にしない
- IT Investment = Willingness-to-Pay にしない
- AI Recommendation = Decision にしない
- Compression Hypothesis = FACT にしない
- Missing Evidence = Zero にしない
- Customer Work = Provider Work にしない
- Low COGS = Low Price と自動判断しない
- High Value = Price Gouging と混同しないが、Value根拠なしに価格を上げない
- Quote Engineのために顧客に余計な管理入力を増やさない

---

## 23. Canonical Phrase

> **見積もりも、FACTからつくる。**

> **見積 → 実績 → 差異 → NEW FACT → 次の見積。**

> **System calculates. AI suggests. Human decides. System records.**
