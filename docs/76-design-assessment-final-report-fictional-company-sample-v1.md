# IT経営KAIZEN — 設計Assessment 最終報告書 Fictional Company Sample v1

Status: **BUSINESS / CUSTOMER-FACING SAMPLE — PROPOSAL FOR PILOT VALIDATION**
Date: 2026-09-14
Parent Method: `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`
Output Standard: `docs/75-design-assessment-act-option-scenario-roadmap-output-standard-v1.md`

## 0. Sample Boundary

本書は、設計Assessmentの最終成果物がCustomerからどう見えるかを検証するための **架空企業サンプル** である。

実在顧客のFACTではない。価格・工数・効果・Technology選定も実案件の提案ではない。

目的：

> **120万円の設計Assessmentで、経営者が何を受け取り、どうDecisionできるようになるのかを具体化する。**

---

# Fictional Customer — K社

## Company Context — FICTIONAL FACT

- B2Bサービス企業
- 従業員：240名
- 3年後に350名程度まで事業拡大する経営計画
- Microsoft 365を利用
- On-premises Active Directoryを利用
- PC約260台
- IT担当：正社員2名
- 入社者は月平均8名
- 入社時にIT担当がAccount作成、SaaS登録、PC設定を個別実施
- SaaSは各部門契約を含め約45サービス
- SaaS Account台帳はSpreadsheetで管理
- Helpdeskはメール・チャット・口頭で受付
- IT担当者の業務時間計測は未実施
- Security / IT Governanceに関する経営KPIは未定義

## FUTURE — FICTIONAL CUSTOMER DECISION

> **3年後、社員350名規模になってもIT管理人員を大幅に増やさず、社員がIT手続きで待たずに仕事を始められ、経営がIT Riskと投資状況を把握できる会社にする。**

## Management Priority — FICTIONAL CUSTOMER DECISION

1. Growth without proportional IT headcount increase
2. Employee productivity
3. Security / Governance

---

# PAGE 1 — Executive Decision Summary

## 3年後の成長に、今のIT運用をそのまま拡大しない

### FUTURE

**社員350名規模でも、IT管理人員を大幅に増やさず、社員が待たずに働き始められ、経営がIT Risk / Investmentを把握できる状態。**

### Current FACT

現在は、Account・SaaS・PC・問い合わせの複数業務でIT担当者による個別作業とSpreadsheet管理が残っている。

### Material GAP

- 人員増加に伴うIT運用量の増加に耐えられるか確認が必要
- Identity / SaaS / Deviceの情報が分散している
- Employee Requestの受付と処理実績が一元化されていない
- 経営がIT Risk / Investmentを継続的に確認するManagement Mechanismが未定義

### Decision Theme

> **全部を一度に変えるのではなく、3年後のFUTUREへ向けて、どのACTから始めるか。**

---

# PAGE 2 — FACT / UNKNOWN Map

## 分かったことと、まだ分からないことを分ける

### FACT — Sample Evidence Confirmed

| Area | FACT |
|---|---|
| Identity | On-premises ADを利用している |
| Joiner | 月平均8名。Account / SaaS / PC設定をIT担当が個別実施 |
| SaaS | 約45サービス。部門契約を含む |
| SaaS Management | Spreadsheet台帳が存在する |
| Device | PC約260台 |
| Helpdesk | メール・チャット・口頭の複数Channelで受付 |
| Management | Security / IT Governanceの経営KPIは未定義 |

### UNKNOWN

- Joiner 1名あたりの実作業時間
- SaaS Account台帳と実Accountの差分率
- 退職時Account停止の平均Lead Time
- Helpdesk件数 / Category / Resolution Time
- PC設定の標準化率
- 現行AD依存Application / Authentication要件
- Security Incident / Near Missの実態
- Shadow SaaSの全体数

### Decision Rule

> **UNKNOWNを効果額へ変換しない。必要ならBaselineを取得し、ACT後にCHANGEを測る。**

---

# PAGE 3 — Material GAP / ROOT CAUSE

## FUTUREとの距離はどこにあるか

### GAP 1 — Growth × Operation

FUTURE：社員増に対してIT管理人員を比例増させない。

FACT：入社時のAccount / SaaS / PC設定をIT担当が個別実施。

ROOT CAUSE — SAMPLE EVIDENCE-CONFIRMED INTERPRETATION：
Joiner Processが複数System / 手順に分かれ、標準Workflow / Automationへ接続されていない。

### GAP 2 — Employee Productivity

FUTURE：社員がIT手続きで待たずに仕事を開始できる。

FACT：Helpdesk Requestが複数Channelに分散。

ROOT CAUSE HYPOTHESIS：
Request入口、Knowledge、処理Workflowの分離がWaiting / Duplicate Communicationを生んでいる可能性。

Evidence Needed：Request Sample / Interview / Handling Time。

### GAP 3 — Governance

FUTURE：経営がIT Risk / Investmentを把握できる。

FACT：Security / IT Governanceの経営KPIは未定義。

ROOT CAUSE HYPOTHESIS：
Daily IT OperationからManagement Decisionに必要なFACTを形成する仕組みが定義されていない可能性。

---

# PAGE 4 — ACT Option Portfolio

## 会社を良くするための「実行の選択肢」

### ACT 01 — Identity / Joiner Lifecycleを標準化する

**WHY**：Growth / Employee Productivity

**DESIGN**：技術 × 運用 / 標準化する・自動化する・整える

**ACT**：Joiner / Mover / LeaverのAccount Lifecycleを標準Workflow化し、可能な範囲をAutomationへ接続する。

**Expected CHANGE**：Account関連の個別作業・Waiting・漏れが減る可能性。

**UNKNOWN**：現行AD依存要件、Baseline工数。

### ACT 02 — Device LifecycleをCloud中心に再設計する

**WHY**：Growth / Employee Productivity

**DESIGN**：技術 × 運用 / 標準化する・自動化する

**ACT**：Device Enrollment、Policy、Application配布、Update、InventoryのLifecycleを再設計する。

**Expected CHANGE**：PC設定の個別作業と端末状態確認の手作業が減る可能性。

### ACT 03 — SaaS / Account Managementを一元化する

**WHY**：Growth / Governance

**DESIGN**：技術 × 管理 × 運用 / 整える・標準化する・なくす

**ACT**：SaaS Inventory、Owner、契約、Account Lifecycle、利用状況を共通Managementへ接続する。

**Expected CHANGE**：重複管理・未把握Account・更新漏れを減らせる可能性。

### ACT 04 — Employee IT Requestを一つの入口へ整理する

**WHY**：Employee Productivity / IT Operation

**DESIGN**：運用 / 整える・標準化する・自動化する

**ACT**：Request入口、Category、Knowledge、Triage、Statusを標準化する。

**Expected CHANGE**：Requestの見失い、重複確認、Waitingを減らせる可能性。

### ACT 05 — IT Management Reviewをつくる

**WHY**：Governance / Management

**DESIGN**：管理 / 整える・残す・標準化する

**ACT**：Risk、Investment、Major Change、Incident、SaaS / Asset等のManagement FACTを定期Reviewする。

**Expected CHANGE**：経営がITを案件発生時だけでなく継続的にDecisionできる状態へ近づく。

### ACT 06 — 定常OperationのActorを再配置する

**WHY**：Growth without Headcount

**DESIGN**：運用 / 任せる・標準化する・自動化する

**ACT**：標準化後の定常WorkについてCustomer / Existing Vendor / Other Vendor / atLIB / Automationの最適Actorを再評価する。

**Expected CHANGE**：内部IT担当がManagement / Improvementへ使える時間が増える可能性。

---

# PAGE 5 — Management Scenario Comparison

## 何を優先するかで、最初のACTは変わる

### SCENARIO A — Growth without Headcount

**Priority**：社員増に対してIT管理人員を比例増させない。

Priority ACT候補：
**ACT 01 → ACT 02 → ACT 03 → ACT 06**

Investment Characteristic：初期にIdentity / Device / Operation Standardizationへ投資。

Trade-off：Governance Reviewの高度化を後段へ置く可能性。

### SCENARIO B — Employee Productivity First

**Priority**：社員がIT手続きで待つ時間を減らす。

Priority ACT候補：
**ACT 01 → ACT 04 → ACT 02 → ACT 03**

Investment Characteristic：Employee Journeyに近い領域から改善。

Trade-off：Management / Governanceの整備速度が相対的に遅くなる可能性。

### SCENARIO C — Governance First

**Priority**：経営がRisk / Investmentを説明・Decisionできる状態を先に整える。

Priority ACT候補：
**ACT 03 → ACT 05 → ACT 01 → ACT 02**

Investment Characteristic：Management FACT / Asset / SaaS / Responsibility整備を先行。

Trade-off：Employeeの体感改善が初期には限定的となる可能性。

### Consultant Recommendation — SAMPLE HYPOTHESIS

K社が定義したManagement Priorityが `Growth → Employee Productivity → Governance` の順であるため、現時点ではScenario AをBaseとしつつ、ACT 05の最低限設計をYear 1に含める案をRecommendationする。

これはSample Recommendationであり、実案件ではSupporting FACT / UNKNOWN / Customer Decisionを明示する。

---

# PAGE 6 — Multi-year KAIZEN Roadmap

## FUTUREは3年、ACTは段階的に

### YEAR 1 — PRIORITY / DECISION TARGET

**Theme：成長に耐える共通基盤をつくる**

- ACT 01 Identity / Joiner Lifecycle標準化
- ACT 02 Device Lifecycle再設計
- ACT 03 SaaS / Account Management一元化 — Phase 1
- ACT 05 IT Management Review — Minimum Viable Review

Expected Direction：人員増に伴う個別Operation増加を抑える基盤と、経営Reviewの最低限を形成する。

### YEAR 2 — CANDIDATE

**Theme：日常Operationを減らし、社員体験を改善する**

- ACT 04 Employee IT Request統合
- ACT 03 SaaS / Account Management高度化
- ACT 06 Actor再配置
- Year 1 Automation Expansion

Decision Condition：Year 1 ACTのActual CHANGE、Workload Baseline、Employee Request FACTを確認して再Decision。

### YEAR 3+ — DIRECTION

**Theme：IT Managementを継続的KAIZENへ接続する**

- Management KPI高度化
- Cross-functional Automation
- AI-assisted Operation / Decision Support where appropriate
- FACTACTによるDecision → ACT → CHANGE → NEW FACT continuity

Year 3+は現時点の契約 / Commitmentではない。

---

# PAGE 7 — Investment View

## 全部の総額ではなく、今年のDecisionを明確にする

本Sampleでは実価格を捏造しないため、金額欄を以下の意味で表示する。

| Period | Investment Status | Meaning |
|---|---|---|
| Year 1 | QUOTE / RANGE REQUIRED | Decision対象。Vendor / Scope Evidenceから見積を取得 |
| Year 2 | INDICATIVE / UNKNOWN | Candidate。Year 1 NEW FACT後に再設計 |
| Year 3+ | DIRECTIONAL ONLY | 現時点でCommitしない |

### Rule

> **Candidate Investmentを確定金額として足し上げ、「3年間総額○円」とだけ提示しない。**

経営者には、Year 1で何へ投資し、何がCHANGEしたらYear 2へ進むかを示す。

---

# PAGE 8 — Management Decision

## 「やるか」ではなく「どれをやるか」

### FICTIONAL DECISION EXAMPLE

**1. Management Priority**
Growth without Headcountを最優先。Employee Productivityを第二優先とする。

**2. Selected ACT — Year 1**
ACT 01 / ACT 02 / ACT 03 Phase 1 / ACT 05 Minimum Reviewを実行候補として具体見積・実行設計へ進める。

**3. Hold**
ACT 04 / ACT 06はYear 1 FACT形成後に再Decision。

**4. Additional Evidence**
- Joiner実作業時間Baseline
- AD依存Application
- SaaS Account実態
- Helpdesk Request Sample

**5. Actor Allocation**
現時点では未決定。各ACTの実行方式確定後にCustomer / Existing Vendor / Other Vendor / atLIB / CombinationからDecisionする。

**6. Expected CHANGE / Verification**
- Joiner Manual Steps
- Joiner Lead Time
- Account Lifecycle Exception
- Device Setup Manual Work
- SaaS Inventory Accuracy
- Management Review実施 / Decision記録

Baseline未取得のため、数値Targetは現時点ではUNKNOWN。

**7. Next Decision Timing**
Year 1 ACT実行後のVerification結果をもとにYear 2 Candidate ACTをReviewする。具体時期はImplementation Plan確定時にDecisionする。

---

# PAGE 9 — What Happens Next

## Assessmentは報告書で終わらない

```text
Assessment
↓
ACT Decision
↓
Actor Allocation
↓
Implementation / Operation
↓
CHANGE Verification
↓
NEW FACT
↓
Roadmap Review
↓
NEXT ACT Decision
```

ACTのActorは固定しない。

- Customer
- Existing Vendor
- Other Vendor
- atLIB
- Combination

> **atLIBに発注することがゴールではない。会社が良くなることがゴールである。**

---

# 10. Sample Review — What This Demonstrates

本Sampleで検証したCustomer Value：

1. Assessmentが単なる現状調査ではなくDecision Designになっている
2. FUTUREからACTのPriorityを導ける
3. 3 Domains × 6 Lensesを18項目チェックにせずACT設計へ使える
4. 複数ACT Optionsを比較できる
5. Management Priorityを変えたScenarioを提示できる
6. `やる / やらない` ではなく `どれをやるか` のDecisionへ移行できる
7. 一括投資ではなくYear 1を切り出せる
8. Year 2以降をNEW FACTによる再Decisionにできる
9. Expected CHANGEとActual CHANGEを分離できる
10. Actor Neutralityを維持できる

---

# 11. FACT FIRST Boundary

本SampleのK社、FACT、FUTURE、ACT、Scenario、Roadmapはすべて説明用の架空情報である。

したがって以下を実績として営業資料へ転用してはならない。

- 240名 / 350名という企業規模
- 月8名の入社
- 45 SaaS
- ACT Priority順
- Scenario Recommendation
- 効果
- 投資額
- Roadmap期間

実顧客では、Customer Input / Evidence / FACT / UNKNOWN / HYPOTHESIS / Human Decisionを案件ごとに形成する。

---

# 12. Next Validation

次にPilot / Internal Roleplayで確認する。

- 経営者役がPAGE 4のACT差分を理解できるか
- PAGE 5でManagement Priorityを変更したくなるか
- PAGE 6で「全部やる必要はない」と理解できるか
- PAGE 7で投資Decisionがしやすくなるか
- PAGE 8で自分の言葉でACTを選べるか
- 9ページが多すぎる / 少なすぎるか
- Technical DetailをAppendixへ分離すべき範囲
- Assessment ¥1.2mのDecision Valueを説明できるか

結果をFACTとして記録し、Output Standardを更新する。
