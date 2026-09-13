# Commercial Quote Engine v0 — Functional Spec v1

Status: **BUSINESS / MVP FUNCTIONAL SPEC — DEVELOPMENT INPUT**  
Date: 2026-09-13

## 1. Goal

社員が設計Assessmentの結果から、感覚や属人的Excel操作に依存せず、根拠付きのCommercial Scope / Delivery Economics / Price Scenario / Quote Draftを作成できるv0を定義する。

v0は「AIが価格を決めるシステム」ではない。

> **System calculates. AI suggests. Human decides. System records.**

---

## 2. v0 Success Criteria

社員が1案件について以下を一つのFlowで完了できること。

1. Assessment Referenceを選ぶ
2. Customer / Scale FACTを確認する
3. Work Baselineを確認・補完する
4. 6 Lenses / Actor AllocationをHuman Decisionする
5. atLIB Managed Scopeを確定候補化する
6. Commercial Dimensionsを確認する
7. FACTACT Leverage HYPOTHESISを設定する
8. Required Human Work / Role Mixを計算する
9. Delivery COGSを計算する
10. Price Scenarioを比較する
11. AIから説明案 / Confirmation Itemsを得る
12. HumanがScope / Priceを承認する
13. Quote Snapshotを保存する
14. Customer-facing Quote Draftを生成する

---

## 3. Main Screens / Steps

### Step 1 — Assessment Import

表示：
- Customer
- Assessment ID / Version
- Assessment completion date
- FUTURE
- selected CHANGE / KGI
- confirmed FACT
- UNKNOWN
- Confirmation Items

Action：
- Import
- Refresh from approved Assessment snapshot

Guardrail：
- 未承認Assessment情報をFACTとして取り込まない
- UNKNOWNを空欄/ゼロへ変換しない

### Step 2 — Customer / Scale

Fields：
- Employees
- Users
- Devices
- Accounts
- SaaS count
- Business systems count
- Locations
- Group companies
- Vendor count
- Current IT FTE / contractor structure
- Current annual/monthly IT spend if known
- Current outsourcing/vendor spend if known

各Field：
- Value
- Status: FACT / UNKNOWN / HYPOTHESIS
- Evidence reference
- Note

### Step 3 — Work Baseline

Work rows：
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
- Monthly Reporting
- Security / Audit Evidence
- Other

Per Work：
- Volume / month
- Baseline Human Minutes / Hours
- Touches
- Waiting if known
- Rework if known
- Systems touched
- Duplicate administration count if known
- Current actor
- Required capability
- Evidence
- Status

### Step 4 — KAIZEN / Actor Matrix

Per Work：
- 6 Lens decision
  - なくす
  - 自動化する
  - 標準化する
  - 任せる
  - 残す
  - 整える
- Target Actor
  - Customer
  - Existing Vendor
  - Other Vendor
  - System / Automation
  - Project / Specialist
  - atLIB Managed
- Decision rationale
- Human approver

AI may suggest Lens / Actor, but cannot commit Decision.

### Step 5 — atLIB Managed Scope

System filters Target Actor = atLIB Managed.

Per Scope row：
- Work Type
- Required Capability
- Volume
- Managed Baseline Human Work
- Responsibility
- Service requirement
- Included / Excluded details
- Assumption
- UNKNOWN / Confirmation Item

### Step 6 — Commercial Dimensions

Dimension cards：
1. Scale
2. Complexity
3. Work Mix
4. Human Work Structure
5. Responsibility
6. Service Level
7. Specialist Intensity
8. Onsite Dependency
9. Standardization Potential
10. FACTACT Connectivity / Leverage Potential

v0では総合Scoreを作らない。

各Dimension：
- FACT summary
- HYPOTHESIS summary
- UNKNOWN
- optional internal band: Low / Medium / High
- reason

Band thresholdは固定Canonicalにしない。初期はHuman review用。

### Step 7 — FACTACT Leverage

Per Work：
- Duplicate Entry Elimination % / minutes
- Context Search Reduction
- Standard Procedure Reuse
- Knowledge Reuse
- Automated Execution
- External Evidence Connection
- Management Projection
- Rework Reduction
- Other

System calculates proposed Compression Range.

Fields：
- Compression Low
- Compression Base
- Compression High
- Confidence: Low / Medium / High
- Evidence / analogous case
- Status: HYPOTHESIS / MEASURED FACT

Human selects approved Base assumption.

### Step 8 — Role Mix

Roles candidate：
- Service Desk Operator
- IT Operations Engineer
- Infrastructure / Cloud Engineer
- M365 / Identity Specialist
- Security Specialist
- Network Specialist
- Service Manager
- IT Consultant / Management

Per Work：
- Required Human Work after compression
- Role allocation % / hours

Validation：
- Role allocation total = 100%

Internal Role Cost Master：
- Role
- Full Cost/h
- effective from
- version
- approved by

### Step 9 — Delivery COGS

Auto calculation：

Human Work Cost = Σ(Role Hours × Role Full Cost)

Additional cost：
- Shared Specialist Pool Allocation
- FACTACT / Tool Cost
- Service Management Cost
- Onsite / Logistics
- External Service Cost
- Other Delivery Cost

Output：
- Monthly Delivery COGS
- Annual Delivery COGS
- Human / Non-Human split
- Cost driver breakdown

### Step 10 — Price Scenario

Default scenarios are configurable; 49.8 / 60 / 80万円 may be loaded as historical candidate scenarios but are NOT product decisions.

For each scenario show：
- Price
- Monthly gross profit
- Gross margin %
- Annual revenue
- Annual gross profit
- Cost coverage status
- Service feasibility warning
- Assumption / risk warning

Also allow custom price input.

Target Margin is internal parameter, versioned and Human-approved.

### Step 11 — Customer Value Context

Fields：
- Current Internal IT TCO
- Current Vendor TCO
- Alternative Onsite / Dispatch TCO
- Alternative BPO / MSP reference
- Current IT investment
- Planned IT investment
- Employee waiting / productivity impact if evidenced
- Risk / continuity impact
- Expected CHANGE

No automatic willingness-to-pay inference.

### Step 12 — AI Commercial Review

AI receives structured FACT / HYPOTHESIS / UNKNOWN separately.

AI output candidate：
- Commercial summary
- Key cost drivers
- Key value drivers
- Scope risk
- Missing evidence
- Confirmation Items
- Price scenario interpretation
- Customer-facing rationale draft
- Internal challenge questions

AI must explicitly label HYPOTHESIS.

Forbidden AI behavior：
- converting UNKNOWN to FACT
- choosing final Actor
- choosing final price
- approving discount
- asserting compression as measured when not measured
- inventing market price

### Step 13 — Human Approval

Approval checklist：
- Scope approved
- Exclusions approved
- Actor boundary approved
- Service Level approved
- Compression assumption approved
- Role Mix approved
- Delivery COGS reviewed
- Customer Value context reviewed
- Price approved
- Discount approved if any
- Risks / UNKNOWN acknowledged

Required fields：
- Approver
- Approved Price
- Approval date/time
- Rationale
- Exceptions

### Step 14 — Quote Snapshot

Immutable/versioned snapshot candidate：
- Assessment snapshot reference
- FACT references
- Work model
- Actor decisions
- Managed Scope
- Commercial Dimensions
- Compression assumptions
- Role Cost Master version
- Role Mix
- Delivery COGS
- Price scenarios
- approved price
- approval rationale
- UNKNOWN / Confirmation Items
- generated quote version

Quote revision creates new version; do not silently overwrite approved historical snapshot.

### Step 15 — Customer-facing Quote Draft

Output candidate sections：
1. Customer / Proposal title
2. FUTURE / purpose
3. Proposed Scope
4. Included Capability
5. Service content
6. Responsibility / Actor boundary
7. Service conditions
8. Exclusions
9. Transition / initial setup if applicable
10. Monthly / project price
11. assumptions / prerequisites
12. validity period

Do NOT expose：
- internal Role Cost
- COGS
- margin
- internal compression confidence
- internal risk rating

---

## 4. Calculation Rules v0

### Managed Baseline

Only Work with Actor = atLIB Managed enters recurring Managed Baseline.

### Required Human Work

Per Work:

Required Human Work = Managed Baseline Human Work × (1 - Approved Compression Base)

If Compression UNKNOWN, system must not silently use 0% or default average. Require Human assumption or mark Quote incomplete.

### Human Work Cost

Human Work Cost = Σ(Required Human Work × Role Allocation × Role Full Cost)

### Delivery COGS

Delivery COGS = Human Work Cost + approved Non-Human Delivery Costs

### Gross Margin

Gross Margin = (Price - Delivery COGS) / Price

### Annual values

v0 recurring assumption: monthly × 12, unless contract months differ.

---

## 5. Warning Rules

System should show warning, not auto-reject, when：

- FACT coverage insufficient
- UNKNOWN remains in material Scope
- Compression confidence Low
- Specialist share high
- Onsite dependency high
- exception rate high
- target margin not met
- price below Delivery COGS
- Service Level unsupported by modeled capability
- Customer Value evidence absent
- Assessment snapshot stale
- Role Cost Master outdated

Human can proceed only with rationale for material warnings.

---

## 6. Status Model

Quote candidate lifecycle：

DRAFT → FACT REVIEW → SCOPE DECISION → ECONOMICS REVIEW → COMMERCIAL REVIEW → APPROVED → ISSUED → ACCEPTED / REJECTED / EXPIRED

Revision after APPROVED creates a new version.

---

## 7. Data Provenance

Every material number should identify source type where possible：

- Assessment FACT
- Customer Evidence
- System Evidence
- Manual Observation
- Historical atLIB FACT
- External Market Reference
- HYPOTHESIS
- Human Decision

This enables later Calibration without mixing hypothesis and measured fact.

---

## 8. Existing Estimate AI Connection

Existing estimate AI should be reused as an assistant layer where compatible.

Recommended boundary：

### Deterministic System
- calculations
- scope filtering
- COGS
- margin
- versioning
- required-field validation

### AI
- classification suggestion
- missing evidence detection
- similar case suggestion
- rationale drafting
- customer-facing wording
- variance cause hypotheses

### Human
- Actor Decision
- assumption acceptance
- Scope approval
- Risk acceptance
- Price / discount decision

Do not move deterministic arithmetic into LLM prompts if it can be calculated directly.

---

## 9. MVP Data Masters

Minimum masters：

### Role Cost Master
- Role
- Full Cost/h
- effective period
- version

### Work Type Master
- Work Type
- default Capability mapping
- possible Role mapping
- measurement unit

### Commercial Parameter Master
- target margin reference
- scenario prices
- non-human cost categories
- warning thresholds

### Capability Master
- Capability name
- description
- candidate Work Types
- candidate specialist roles

Initial values that are not verified FACT must be marked HYPOTHESIS / provisional.

---

## 10. Estimate Calibration Data Contract

After delivery starts, v0/future integration should be able to receive：

- Quote Snapshot ID
- Work Type
- estimated volume
- actual volume
- estimated human work
- actual / sampled human work
- estimated role mix
- actual role mix
- estimated COGS
- actual COGS
- expected quality / SLA
- actual quality / SLA
- expected compression
- measured compression where valid
- variance reason decision

This is the minimum bridge to FACTACT feedback.

---

## 11. Example v0 Flow — 300 employee HYPOTHESIS

Illustrative only, not customer FACT.

1. Assessment identifies 220h recurring IT Work.
2. 6 Lenses / Actor Decision allocates 120h to atLIB Managed Scope.
3. FACTACT leverage Base assumption = 50%.
4. Required Human Work = 60h.
5. Role Mix distributes 60h across Operator / Engineer / Specialist / Service Manager.
6. Delivery COGS = illustrative ¥430k.
7. Scenario ¥600k → margin about 28%.
8. Scenario ¥800k → margin about 46%.
9. AI explains cost/value drivers and missing evidence.
10. Human decides whether ¥800k, another price, scope change, or additional evidence is appropriate.

The system does NOT conclude “300 employees = ¥800k”.

---

## 12. What v0 Should NOT Build Yet

- automatic final price optimization
- black-box customer score
- machine-learning pricing model
- automatic discounting
- automatic contract acceptance
- new FACTACT Core Objects solely for quoting
- detailed employee time tracking
- market-price scraping inside quote calculation
- customer-specific willingness-to-pay prediction

These require evidence / governance not yet available.

---

## 13. Acceptance Tests — Business

v0 is acceptable when an employee can demonstrate：

1. UNKNOWN does not become zero/FACT.
2. Non-atLIB Actor Work is excluded from Managed COGS.
3. Changing Compression updates Human Work / COGS deterministically.
4. Changing Role Mix updates COGS deterministically.
5. Changing Role Cost Master version is traceable.
6. 49.8/60/80 scenarios show economics but do not auto-select.
7. AI cannot approve price.
8. Approved Quote stores evidence/assumption/version references.
9. Customer quote hides internal economics.
10. Revision preserves prior approved snapshot.
11. Actual delivery data can reference the originating Quote Snapshot.
12. The same inputs produce the same deterministic calculation result.

---

## 14. Recommended Build Sequence

### Slice 1 — Deterministic Economics
- Customer / Assessment reference
- Work rows
- Actor allocation
- Compression assumption
- Role Mix
- Role Cost Master
- COGS
- Price scenarios

### Slice 2 — Governance
- FACT / UNKNOWN / HYPOTHESIS provenance
- Approval
- snapshot/version
- warning rules

### Slice 3 — AI Assist
- missing evidence
- commercial explanation
- confirmation items
- customer rationale draft

### Slice 4 — Output
- Quote Draft
- Scope Sheet
- internal economics sheet

### Slice 5 — Calibration Bridge
- Estimate vs Actual schema
- FACTACT reference
- variance review

---

## 15. Business Principle

> **見積もりを速くするだけではなく、見積もりを学習可能な経営プロセスにする。**

> **案件を実行するほど、次の見積の精度が上がる。**

> **見積 → 実績 → 差異 → NEW FACT → 次の見積。**

> **System calculates. AI suggests. Human decides. System records.**
