# FACTACT Human Work Compression / Unit Economics v1

Status: **BUSINESS HYPOTHESIS / VALIDATION MODEL**
Date: 2026-09-13
Related: docs/47 IT経営KAIZEN FUTURE First Business Model

## 1. Purpose

IT経営KAIZENのManaged Capability / Managed Serviceについて、従来の「顧客Work時間 ≒ atLIB Human Work時間」という作業移管型BPO前提を外し、FACTACTの思想に基づくHuman Work Compressionを事業性検証の中心に置く。

本書は価格Decisionではない。

49.8万円 / 60万円 / 80万円等の既存価格候補は、Compressionの実測FACTがない現時点では再評価対象とする。

---

## 2. Core Hypothesis

> **顧客が100時間かけている業務を、atLIBが同じ100時間かけて代行する必要はない。**

FACTACT + KAIZENによって、同等以上のService Capability / Qualityを維持しながらHuman Workを圧縮できる可能性がある。

例：

- Customer Baseline Work = 100h
- atLIB Human Work = 70h
- Human Work Compression = 30h / 30%

この30%は現時点ではHYPOTHESISであり、実運用で検証する。

---

## 3. Compressionの定義

単純な作業時間削減をCompressionとは呼ばない。

> **Valid Human Work Compression = Human Workが減少し、Service CapabilityとQualityが維持または向上している状態**

必須3条件：

1. Human Work ↓
2. Capability Coverage ≥ Baseline
3. Quality ≥ Baseline

品質を落として時間だけ減らすことは禁止する。

---

## 4. FACTACTが狙う構造

従来型Work Transfer：

> Customer 100h → Provider 100h

FACTACT型：

> Customer Baseline 100h
> → WorkをFACT化
> → 6 Lensesで再設計
> → 不要Workをなくす
> → 二重管理・転記をなくす
> → Automation
> → Standardization / Knowledge
> → Context探索を減らす
> → Humanが必要なWorkだけ残す
> → atLIB Human Work 70h / 50h / ...

さらに運用FACTから次のKAIZENを行い、Human Workを継続的に減らす。

> **仕事を外へ移すだけではなく、仕事そのものを減らす。**

---

## 5. Work Category別 Compression Hypothesis

### A. Service Desk / Human Interaction

Compression Potential: **LOW〜MEDIUM HYPOTHESIS**

Human Touchが残りやすい。

圧縮候補：
- Context自動提示
- Known Fact / Similar Case提示
- Knowledge
- Classification / Routing
- Self Service
- Recurring Root CauseのKAIZEN
- 問い合わせ件数そのものの削減

短期の1件あたり圧縮より、中長期の問い合わせ発生量削減が重要。

### B. Operational Work

Compression Potential: **MEDIUM〜HIGH HYPOTHESIS**

対象例：
- Account Lifecycle
- License Change
- Device / SaaS Relation更新
- 定期確認
- Monitoring
- Patch / Update
- Backup確認
- 定例処理
- 台帳更新
- Report Data形成

圧縮候補：
- API / Integration
- Trigger
- Workflow Automation
- Evidence自動取得
- WorkからFACT / Relation / Changeを形成
- 複数管理表への手動転記削減

### C. Management / Reporting Work

Compression Potential: **MEDIUM〜HIGH HYPOTHESIS**

圧縮候補：
- Ticket集計
- 台帳集計
- KPI集計
- Incident集計
- Monthly Report作成
- Management View作成

目標：

> **Daily Work → FACT → Projection → Management View**

「報告するためだけの仕事」を減らす。

---

## 6. One Work → Multiple Management Updates

FACTACTの重要な設計思想：

> **一つのWorkから生じたChangeを、人が複数の管理表へ繰り返し転記しない。**

例：Account Provisioning Workの結果から、必要に応じて以下を形成・接続する。

- Person / User Fact
- Account Fact
- SaaS Relation
- License Relation
- Device Relation
- Authority / Approval Evidence
- Change History
- Work Completion Evidence
- Management Projection

注意：現行FACTACTですべてが実装済みという意味ではない。Product LaneでCore Object追加を先に決めず、既存Core / External Connection / Projectionで実現可能性を検証する。

---

## 7. Unit Economics Model

価格判断ではCustomer Baseline WorkとatLIB Human Workを分離する。

### Customer-side

- Baseline Work Hours
- Baseline FTE / Cost
- Capability Coverage
- Quality / SLA
- Waiting Time
- Risk / Incident
- Management Work

### Provider-side

- atLIB Human Work Hours
- Human Full Cost / h
- Shared Specialist Cost
- FACTACT Cost
- Service Management Cost
- Other Delivery Cost
- Contribution Margin

基本式：

> **Delivery COGS = atLIB Human Work × Full Cost/h + Shared Specialist + FACTACT + Service Management + Other Delivery Cost**

> **Contribution Margin = Price − Delivery COGS**

Customer 100hをProvider 100hとして原価計算しない。

---

## 8. Price Re-evaluation

従来候補：

- 49.8万円/月
- 60万円/月
- 80万円/月

は、現時点ではDECISIONではない。

以前の原価モデルはCustomer WorkとProvider Human Workが近い作業移管型前提を強く含んでいたため、Human Work Compressionが検証された場合は再計算する。

例（数値はHYPOTHESIS）：

- Baseline 100h
- atLIB 70h → Compression 30%
- atLIB 50h → Compression 50%

Compressionが大きいScopeでは49.8万 / 60万円でも成立する可能性がある。

Service Desk比率が高くHuman Touchが多いScopeでは80万円以上が必要になる可能性もある。

価格は社員数や単純時間枠だけでなく、次で判断する方向を検証する。

> **Work Mix × Baseline Work × Compression Potential × Required Capability × Quality Requirement**

---

## 9. Key Validation Metrics

実案件で最低限計測する候補：

1. Customer Baseline Human Work Hours
2. atLIB Required Human Work Hours
3. Human Work Compression Rate
4. Work Eliminated
5. Work Automated
6. Work Standardized
7. Duplicate Management Work Eliminated
8. Context Search / Confirmation Time
9. Service Capability Coverage
10. Service Quality / SLA
11. Employee Waiting
12. Monthly Management / Reporting Work
13. atLIB Delivery COGS
14. Contribution Margin

### Compression Rate

> **Compression Rate = (Baseline Human Work − Required Human Work) / Baseline Human Work**

ただしCapability / Quality条件を満たさない場合はValid Compressionとして扱わない。

---

## 10. Economic Alignment

目指す構造：

> **Customer Value ↑ = atLIB Human Work ↓ = Margin ↑**

時間課金型では、仕事が減るとProvider Revenueも減る可能性がある。

IT経営KAIZEN Managed Capabilityでは、顧客はHuman HoursではなくService Capability / Outcomeを購入する方向を検証する。

その場合、atLIBには以下を行うEconomic Incentiveが生まれる。

- 問い合わせを減らす
- 手作業を減らす
- 管理表更新を減らす
- Automationする
- Standardizeする
- Root Causeを改善する

> **仕事を減らすほど、顧客価値とProvider Economicsの両方が改善する。**

---

## 11. Relationship to FUTURE First

Human Work CompressionはIT経営KAIZENの目的ではない。

目的は経営FUTUREの実現である。

> FUTURE → FACT → GAP → DECISION → ACT → CHANGE

の結果、Workを再設計する際に6 LensesとFACTACTを使い、不要Human Workを減らす。

したがって「安いBPOを作る」ためにCompressionするのではない。

> **より良いIT Functionを、より少ない無駄なHuman Workで実現する。**

---

## 12. Validation Model — Next Step

代表的な200名企業モデルで以下を比較する。

### Baseline
- 常駐3名相当のIT Function
- Service Desk
- Operational Work
- Management / Reporting
- Improvement / Governance

### FACTACT Model
各Workについて：

1. Current Trigger
2. Current Human Steps
3. Current Management Updates
4. Duplicate Entry
5. Context Search
6. Evidence Creation
7. 6 Lenses適用
8. FACTACT Connection
9. Remaining Human Steps
10. Expected Compression
11. Capability / Quality Guard

代表Work候補：
- 入社
- 退社
- Account / Authority変更
- PC交換
- SaaS / License変更
- User Inquiry
- Incident
- Patch / Update
- Monitoring Event
- Monthly Reporting

まずHYPOTHESISとしてモデル化し、その後、実案件のTime Study / FACTACT operational dataでFACTへ更新する。

---

## 13. Decision Gate

月額Managed Capabilityの価格・商品化を確定する前に、次を確認する。

> **100hのBaseline Workを、Capability / Qualityを落とさず70h以下で提供できるか？**

これは最初のValidation Threshold候補であり、30%を正式な商品保証値とはしない。

さらにWork CategoryごとのCompression実績を取得し、49.8万 / 60万 / 80万のどの価格帯がどの顧客Scopeで成立するかを決定する。
