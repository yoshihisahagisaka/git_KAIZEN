# IT経営KAIZEN 継続支援 — Representative Customer Sales Simulation v1

Status: **WORKING HYPOTHESIS — BUSINESS / SALES VALIDATION**

この文書は、実在しないRepresentative Customerを用い、設計Assessmentから継続支援のScope / Capacity / Quote / Unit Economicsまでを一気通貫でシミュレーションする。

**以下の顧客情報・Volume・Human Work・価格はすべてSIMULATION / ASSUMPTIONであり、実顧客FACTではない。**

目的は価格を正当化することではなく、現在の商品設計が実際に販売・Delivery可能かを検証し、UNKNOWN / GAPを発見することである。

---

# 1. Representative Customer

## Company A — ASSUMPTION

- employees：200
- office：2 locations
- dedicated IT：1 person
- Microsoft 365
- Windows PC：約220台
- endpoint / asset management toolあり
- several business SaaS
- network / cloud / securityは複数Vendorを利用
- weekday office work中心
- 24x365 operation不要

### Current Situation — SIMULATION

- IT問い合わせ：100件 / month程度
- inquiry channel：Teams / phone / direct contactが混在
- simple inquiryがIT担当者へ集中
- onboarding / offboarding / transfer：20 Events / month程度
- Account / SaaS / Device WorkがHuman dependent
- Vendorへ依頼した案件のWaiting / ownershipが見えにくい
- Infrastructureは既存Vendor / monitoring serviceが存在
- IT担当者がdaily operationに追われ、improvement / strategyへ十分な時間を使えていない

これらはSales Simulationのための仮定。

---

# 2. Free Diagnosis — SIMULATION

無料IT経営診断では、Customer statementをConfirmed FACTへ昇格させず、次の可能性を発見する。

### Observation / Customer Statement
- IT担当者が問い合わせに追われている
- onboardingに複数System操作が必要
- Vendor依頼後の状態確認に手間がかかる
- improvementに時間を使いたい

### UNKNOWN
- 実際の問い合わせ件数 / category / Human Work
- onboarding 1件当たりのHuman Work
- Waiting Vendor時間
- Account / Device / SaaS Current State accuracy
- recurring inquiry原因
- Infrastructure responsibility boundary

### Diagnosis Output

> **日々のIT WorkにHuman Work / Waiting / duplicate managementが存在し、IT担当者が改善・戦略へ使える時間を圧迫している可能性がある。Evidenceを確認し、現在地と1年後のCHANGEを設計する価値がある。**

Assessmentを提案する。

---

# 3. Assessment — SIMULATION

設計Assessment：現行Canonical standard price **¥1,200,000 pre-tax**。

## Evidence Example — ASSUMPTION

Assessmentで仮に次がEvidenceから確認されたとする。

- Service Desk equivalent inquiries：平均100件 / month
- IT担当者Human Work：平均20 min / inquiry
- inquiry related Human Work：約33h / month
- onboarding / offboarding / transfer：20 Events / month
- IT Human Work：平均60 min / Event
- workflow Human Work：約20h / month
- Vendor status confirmation / coordination：約8h / month
- separate Excel / reporting / duplicate update：約8h / month

Current recurring Human Work：
> **約69h / month**

ここでの69hはSimulation FACTであり、実顧客への一般化は禁止する。

## Future

Management intent：
> **IT担当者が日々の問い合わせ・定型運用だけに追われず、Security / DX / IT企画等、会社を良くする仕事へ時間を使える状態にする。**

## Gap

Current：Recurring operation約69h / month + individual dependency

Future：Routine Workを安定運用し、IT担当者がManagement / Improvementへ時間を移せる

## 6 Lenses

- なくす：不要なduplicate update / unnecessary contact route
- 自動化する：standard workflow / repetitive provisioning候補
- 標準化する：intake / onboarding / escalation
- 任せる：Service Desk / standard Business WorkflowをatLIBへ
- 残す：Customer Management Decision / internal business context
- 整える：Authority / Vendor responsibility / Current State

---

# 4. 1-Year KGI — SIMULATION

HumanがAssessmentで次をDecisionしたと仮定する。

## KGI 1 — Quantitative CHANGE

> **IT担当者のRoutine IT Human Workを月69hから月35h以下へ減らし、月34h以上をImprovement / Strategyへ移せる状態を目指す。**

Baseline / calculation methodをEvidenceとして保持する。

これはatLIBによる結果保証ではなくHuman-decided target。

## KGI 2 — State CHANGE

> **入退社・異動のIT Workが標準Workflowで運用され、Authority / completion / Current Stateを確認できる状態にする。**

## KGI 3 — State CHANGE

> **Vendorへ依頼したWorkについて、Actor / Waiting / next action / resultを確認できる状態にする。**

KGI数3は既存PROPOSAL guidelineに沿ったSimulationであり固定上限ではない。

---

# 5. Actor Decision — SIMULATION

Management Decision：

### Customer retains
- IT strategy
- business priority
- management decision
- sensitive / exceptional approval
- internal stakeholder alignment

### Existing Vendors retain
- manufacturer / carrier work
- specialist infrastructure work
- existing managed security / monitoring work where functioning

### atLIB Accepted Role
> **社員IT問い合わせとstandard onboarding / offboarding / transfer Workを継続運用し、Vendor escalation / Waitingを管理し、そのWorkからFACTを形成してMonthly KAIZENへつなげる。**

Infrastructure Operation全体はこのSimulationではatLIB Accepted Scopeにしない。

これはCommercial Neutralityに従う。

---

# 6. Accepted Work Scope — SIMULATION

## Service Desk — ACCEPTED
- FACTACT Web Intake
- IT usage inquiry
- Account / password first-line
- PC / peripheral first-line remote support
- agreed Microsoft 365 / standard SaaS first-line
- Incident first intake
- Vendor escalation
- Waiting / completion management
- Knowledge formation / reuse
- Monthly trend / KAIZEN candidate

## Business Workflow — ACCEPTED
- onboarding
- offboarding
- transfer
- standard Account lifecycle coordination
- standard SaaS / License lifecycle coordination
- Device-related coordination
- approval / Authority tracking
- completion Evidence

## Infrastructure Operation — NOT ACCEPTED AS STANDARD SCOPE
- existing Vendor continues infrastructure technical operation
- atLIB manages related escalation / Waiting only where originated from Accepted Work

## Conditional
- phone：not included initially
- Onsite：not included initially
- physical device shipping / storage：separate consultation
- extended hours：not included

## Project candidates
- provisioning automation
- identity redesign
- MDM redesign
- SaaS lifecycle automation

ProjectはAssessment時点で自動受注しない。

---

# 7. Service Policy — SIMULATION

- Remote First
- FACTACT Web Intake
- weekday daytime Human Service
- provisional Human First Response SLO：Normal 2 business hours / high-immediacy 1 business hour / Critical 30 min
- Standard Action / Approval Required / Decision Required
- Monthly / Quarterly / Annual KAIZEN Cycle

Service Hours final clock timeはCanonical上まだUNKNOWNのため、Simulation Quoteでも確定表記しない。

---

# 8. Capacity Estimation — ASSUMPTION

## Service Desk
100 Works × 20 min = **33.3h / month**

## Business Workflow
20 Events × 45 min atLIB Human Work = **15h / month**

Assessment BaselineのCustomer Human Work 60 min/EventとatLIB delivery assumption 45 min/Eventは別概念。atLIBが標準運用することで45分と仮置きしているだけで、改善FACTではない。

## Common Service Load
- Monthly Report / Human Review / KAIZEN：6h
- Quarterly allocation：2.5h
- Annual allocation：1h
- Knowledge / administration：5h
- specialist / exception buffer：5h

Common：**19.5h**

## Total
> **33.3 + 15 + 19.5 = 67.8h ≒ 68h / month**

Pattern Bと整合。

---

# 9. Capacity Band Fit

Current pricing hypothesis：
- S：約30h internal capacity
- M：約50h
- L：約75h
- Custom：75h超 / high complexity

Company A estimated 68h/month。

したがって：
> **L Capacity candidate**

ここで重要なのは、employee 200名だからLではなく、Accepted Scope / Volume / Complexity / Service Requirementから68h相当のDelivery Loadが推定されたためL候補となること。

---

# 10. Quote Simulation

## Initial
- IT経営KAIZEN 設計Assessment：**¥1,200,000 pre-tax** — current Canonical

## Continuous
Pricing Hypothesis v1のReferenceを適用した場合：
- L Capacity：**¥1,000,000 / month candidate**

Annual recurring revenue：
> **¥12,000,000 / year**

First-year Assessment + recurring：
> **¥13,200,000 pre-tax**

**¥1,000,000/monthはPrice DecisionではなくSales Simulation用HYPOTHESIS。**

Initial transition / setup feeはUNKNOWNのため含めない。

---

# 11. Unit Economics — SIMULATION

Assumption：
- fully loaded delivery FTE cost：¥800,000 / month
- planning capacity：120h / FTE / month
- planned delivery cost：約¥6,667 / h

Company A：68h × ¥6,667 ≒ **¥453,000 direct delivery cost / month**

At ¥1,000,000/month：
- revenue：¥1,000,000
- direct delivery cost hypothesis：¥453,000
- direct contribution：**約¥547,000**
- direct contribution ratio：**約54.7%**

これは正式Gross Marginではない。

未控除：
- FACTACT product / infrastructure
- sales
- management
- corporate overhead
- product development
- specialist pool fixed cost
- risk
- transition cost

したがって「粗利54.7%確定」と表現してはならない。

---

# 12. Customer Value / Price Test

月100万円を「Help Desk 100件」に対する価格として説明すると高く見える可能性がある。

しかし購入対象は：
- Service Desk
- Business Workflow
- Vendor Waiting management
- FACT / Current State formation
- Knowledge
- Monthly KAIZEN
- Quarterly Management Review
- Annual KGI / CHANGE Review
- Service Continuity

である。

それでも、Customer Valueとして月100万円が成立するかはUNKNOWN。

## Value comparison candidate

Baseline：Customer IT recurring Human Work 69h/month。

単純にCustomer labor hourを削減するだけでは月100万円のValueを説明できない可能性がある。

IT経営KAIZENのValueは、
1. Routine Work移管
2. Employee Waiting reduction
3. Standardization
4. Management visibility
5. Risk / missed Work reduction
6. Improvement / strategy capacity creation
7. continuous KAIZEN
を含む。

ただしこれらのEconomic ValueをEvidenceなしで金額換算してはいけない。

> **価格妥当性は「Customerの人件費削減額」だけで判断しない。しかし、Valueが抽象的だから高価格でよいとも判断しない。**

---

# 13. Sales Objection Simulation

## Objection 1
「Help Deskに月100万円は高い」

Response direction：
> **Help Deskだけの契約ではありません。Assessmentで決めた1年後のCHANGEに向けて、社員ITサポートと入退社等のIT Workを継続運用し、そこからFACTを形成して毎月KAIZENし、経営Reviewまで行うServiceです。**

ただし顧客がService Deskだけを必要とする場合はAccepted Scope / Capacityを再設計する。

## Objection 2
「今のVendorを変えたくない」

> **変える必要はありません。既存Vendorが適切に機能しているWorkは継続し、atLIBは必要なWorkと接続点だけを担います。**

## Objection 3
「月100万円なら社員を1人採用できる」

Response direction：
> **比較対象は1人の稼働ではなく、Service Desk、Workflow、Knowledge、FACTACT、KAIZEN、Management Reviewをチームと仕組みで継続提供するService Capabilityです。**

ただしこの反論だけで価格妥当性が証明されるわけではない。顧客価値と競争力の検証が必要。

---

# 14. Important Finding — Pricing GAP

このSimulationから、現行L = ¥1,000,000/month仮説はDelivery Economics上は余地がある一方、200名規模の中小企業に対するCustomer-facing priceとしてSales frictionが高い可能性がある。

これはFACTではなく**HYPOTHESIS / GAP**。

考えられる次の検証：

### Option A — Priceを下げる
同じScopeをより低価格で販売可能かUnit Economicsを再計算する。

### Option B — Scopeを分ける
Customerが最初に必要とするWorkだけで開始し、Capacity S / Mから入る。

### Option C — FACTACT leverageを高める
Human Work 68hを標準化 / Knowledge / Automationで削減し、低価格でもMarginを成立させる。

### Option D — Target Customerを変える
月100万円のValueが成立しやすい企業規模 / ComplexityへLを位置づける。

現時点でどれが正しいかはUNKNOWN。

---

# 15. More Realistic Entry Scenario — HYPOTHESIS

Company Aが最初からService Desk + Business Workflow全体を任せないケースも考える。

## Entry Scope
- Service Desk 100 Works/month
- Vendor escalation / Waiting
- Knowledge / Monthly KAIZEN
- Business WorkflowはCustomer継続

Human Work：Pattern A相当 約50h/month。

Capacity：M candidate。

Pricing Hypothesis：
> **¥650,000 / month candidate**

CustomerはAssessment後、まず社員ITサポートを外部化し、FACTを蓄積する。

その後Business Workflowを追加するかはQuarterly / AnnualのFACTからDecisionする。

このEntryは「安いPlan」ではなく、Accepted Work Scopeが異なる同一Service。

---

# 16. M Entry Unit Economics — SIMULATION

50h × ¥6,667 ≒ **¥333,000 direct delivery cost**

At ¥650,000/month：
- direct contribution：約¥317,000
- direct contribution ratio：約48.7%

正式Gross Marginではない。

この水準でもProduct / Sales / overheadを含めた採算は未検証。

---

# 17. Sales Flow Candidate

Company Aに対しては次のFlowが自然な可能性がある。

> **無料診断 → Assessment ¥1.2m → Management Decision → Service Desk中心のM Scope ¥650k/month candidate → FACT蓄積 / Monthly KAIZEN → QuarterlyでBusiness Workflow追加をDecision → 必要ならLへCapacity Review**

重要：
- Up-sellを目的にScopeを小さくするのではない。
- Assessmentで必要なActor / ScopeをDecisionする。
- Customerが自らWorkflowを継続する方が適切なら追加しない。

---

# 18. What We Learned

## FIT
- Assessment → KGI → Actor → Scope → Capacity → QuoteのFlowは成立する。
- Work CatalogからAccepted Scopeを作れる。
- Infrastructure既存Vendorを維持しながらServiceを設計できる。
- Capacity Bandはemployee countではなくWorkから選択できる。
- M / LのUnit Economics比較が可能。

## GAP
- L ¥1m/monthのCustomer Value / sales acceptanceは未検証。
- M ¥650k/monthも正式Gross Margin未検証。
- initial transition costが未設計。
- actual common reporting / review loadがUNKNOWN。
- FACTACT leverageの実績がない。
- Capacity Band thresholdがHuman Work仮説に依存している。

## CONFLICT
- 現時点でCanonical原則との明確なConflictは確認していない。

## UNKNOWN
- 実市場でのWTP（Willingness to Pay）
- competitor alternative cost
- actual delivery FTE cost
- actual request / workflow Human Work
- Product infrastructure cost
- required company-level gross margin

---

# 19. Recommended Next Decision Work

価格を今ここで固定するのではなく、次は**Price Decision Model**を作る。

最低3つの価格Scenarioを比較する。

1. **Market Entry Scenario** — Sales frictionを抑える
2. **Balanced Scenario** — Delivery EconomicsとCustomer Valueを両立
3. **Premium Managed KAIZEN Scenario** — Management / KAIZEN Valueを強く含める

各Scenarioで、
- S / M / L price
- direct contribution
- customers / FTE
- required FACTACT efficiency
- target customer
- sales risk
- delivery risk
を比較する。

必要ならMarket / competitor researchは別途FACTとして追加する。競合価格を憶測で入れない。

> **このSimulationの目的は100万円を正当化することではない。100万円で本当に売るべきかを疑える材料を作ることである。**
