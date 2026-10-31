# IT経営KAIZEN 継続支援 — Full Cost / Transition / Price Decision v1

Status: **WORKING HYPOTHESIS — BUSINESS / PRICE DECISION**

この文書は、継続支援の価格Decisionに必要なFull Cost StackとInitial Transition Costを整理する。数値は、既存Canonicalで確定しているものを除きASSUMPTION / HYPOTHESISであり、実運用FACTで更新する。

## 1. Price Decision Principle

> **顧客へHuman Hourを売らない。しかし、atLIBはHuman Workを原価FACTとして把握する。**

Priceは次の順序で検証する。

> **Accepted Scope → Capacity → Direct Delivery Cost → Service-enabling Cost → Shared Delivery Cost → Gross Margin → Sales / G&A / Product Investment → Operating Profit**

外部BenchmarkはReality Checkであり、価格決定Engineにはしない。

## 2. External Benchmark — REFERENCE FACT

公開Benchmarkでは、Managed ServicesのGross Marginは概ね50%前後以上が健全性の目安として示されている。ConnectWise Service Leadershipの2024 Q2データでは平均Managed Service Gross Margin 46.2%。2026年の複数MSP業界解説では、50–65%程度をHealthy Rangeとしている。

ただしGross MarginのCost分類は各社で異なるため、atLIBでは独自にCOGS定義を固定する。

## 3. atLIB COGS Definition — PROPOSAL

継続支援のGross Margin計算では、少なくとも以下をService Delivery Costに含める。

### Direct Customer Delivery
- Service Desk / Workflow / Infrastructure active Human Work
- Customer communication
- Triage / Escalation
- Knowledge / Evidence / Work maintenance

### Service Management
- Monthly KAIZEN Report / Human Review
- Quarterly Management Review allocation
- Annual Review allocation
- Service Manager / QA allocation

### Specialist Pool
- agreed recurring specialist escalation allowance

### Service-enabling Technology
- FACTACT infrastructure / third-party tool costのうちDeliveryに直接必要なCustomer allocation
- telephony等Conditional tool cost where applicable

Sales、general corporate administration、new product R&DはGross Margin後のOperating Expenseとして別管理する方向。

## 4. Initial Transition Work — HYPOTHESIS

Service開始時には通常月と異なるTransition Workが発生する。

Reference Transition Tasks：
- Assessment / Quote handoff：2h
- Accepted Scope finalization：2h
- Environment / target system confirmation：3h
- Authority / Approver mapping：2h
- Vendor / escalation mapping：2h
- Intake / FACTACT setup：3h
- Procedure / Knowledge connection：5h
- existing open Work handoff：3h
- Baseline / KGI / KPI connection：2h
- service readiness review：2h
- customer communication / PM buffer：4h

Total initial hypothesis：**30h / customer**

Complex customerでは40–60h以上になる可能性がある。実績FACTなしに固定しない。

## 5. Transition Direct Cost

Existing cost assumption：
- fully loaded delivery FTE：¥800,000/month
- planning capacity：120h/month
- planning cost：約¥6,667/h

30h Transitionの場合：
> **約¥200,000 direct labor cost**

これにService Manager / Specialist / tool setup等を加える必要がある。

Initial full transition COGS hypothesis：
> **¥250,000–¥350,000 / customer**

## 6. Initial Fee — PROPOSAL

Transitionを無料にして月額で回収すると、早期解約Riskと初年度Margin悪化を隠す。

初期販売候補：
> **導入・Transition費：¥300,000–¥500,000 pre-tax**

Reference candidate：**¥400,000**

ただしAssessmentから継続支援へ直接移行する顧客は既にEnvironment / Authority / Baseline情報の一部を取得済みのため、実際のTransition Workが軽減される可能性がある。

その場合も「Assessmentを買ったから値引く」と先に決めず、実Work FACTで標準化する。

## 7. Monthly Full COGS Model — HYPOTHESIS

既存Band Human Work：
- S：30h
- M：50h
- L：75h

Direct labor @ ¥6,667/h：
- S：約¥200k
- M：約¥333k
- L：約¥500k

ここへService-enabling / shared delivery allocationを仮置きする。

ASSUMPTION：
- S：¥30k/month
- M：¥40k/month
- L：¥60k/month

Full COGS hypothesis：
- S：**¥230k**
- M：**¥373k**
- L：**¥560k**

このallocationは実FACTではない。

## 8. Balanced Price Scenario Re-test

Previous candidate：
- S ¥400k
- M ¥600k
- L ¥900k

Full COGS仮説でのGross Contribution：

| Band | Price | Full COGS Hyp. | Gross Contribution | Gross Margin Hyp. |
|---|---:|---:|---:|---:|
| S | ¥400k | ¥230k | ¥170k | 42.5% |
| M | ¥600k | ¥373k | ¥227k | 37.8% |
| L | ¥900k | ¥560k | ¥340k | 37.8% |

この結果、Balanced ScenarioはDirect Laborだけなら成立して見えたが、Full COGSを含めると50% Gross Marginを下回る仮説となる。

したがって、**40 / 60 / 90万円を正式価格として確定する根拠は不足している。**

## 9. 50% Gross Margin Reference Price

Full COGSを50% Gross Marginで販売する場合の単純Reference：

> Price = COGS / (1 - 0.50)

- S：¥230k → **¥460k**
- M：¥373k → **¥746k**
- L：¥560k → **¥1,120k**

Customer-facing round candidate：
- S：**¥480k**
- M：**¥750k**
- L：**¥1,120k–¥1,150k**

これは市場WTPを考慮していないCost-based Referenceであり、Price Decisionではない。

## 10. Core Business Problem Revealed

ここで重要なのは「価格を上げればよい」ではない。

現行Human Work仮説のまま50%前後のGross Marginを求めると、特にM/Lは中小企業向けCustomer Priceが高くなる可能性がある。

したがってIT経営KAIZENの事業モデルは、次のどちらかではなく両方を必要とする。

1. **Customerが支払う価値を高める** — KGI / Management Review / continuous KAIZEN / risk / productivity value
2. **Delivery Human Workを下げる** — FACTACT / Knowledge / Standardization / shared capability / automation

> **FACTACTのScale Leverageは付加機能ではなく、IT経営KAIZENを労働集約型へ戻さないための事業要件である。**

## 11. Target Efficient Delivery Model — HYPOTHESIS

Previous efficiency hypothesisをPrice Modelへ接続する。

Target internal Human Work：
- S：24h
- M：36h
- L：55h

@ ¥6,667/h：
- S：¥160k
- M：¥240k
- L：¥367k

Service-enabling/shared allocation：
- S：¥30k
- M：¥40k
- L：¥60k

Target Full COGS：
- S：**¥190k**
- M：**¥280k**
- L：**¥427k**

At previous Balanced prices：
- S ¥400k → GM 52.5%
- M ¥600k → GM 53.3%
- L ¥900k → GM 52.6%

つまり、**40 / 60 / 90万円は「現在Human Workのまま売る価格」ではなく、FACTACTと標準化によってTarget Delivery Modelを実現した場合に成立し得る価格仮説**と再定義するのが妥当。

## 12. Launch vs Target Economics

初期顧客からTarget Efficiencyを達成済みと仮定して価格を下げるのは危険。

### Launch Economics
実績がないためHuman Workが高い。Pilot / Early CustomerでFACTを取る。

### Target Economics
FACTACT / Knowledge / shared delivery / standardizationでHuman Workを下げ、40 / 60 / 90万円でも50%程度のService Gross Marginを目指せる可能性。

したがって、Launch時には次の選択肢がある。

A. higher launch price
B. limited Accepted Scope
C. pilot terms with explicit review
D. atLIBが戦略投資として一時的に低Marginを許容

Dを選ぶ場合は「採算が良い」と誤認せず、新規事業投資として明示する。

## 13. Recommended Launch Commercial Model — PROPOSAL

現時点の第一候補：

### Assessment
**¥1,200,000 pre-tax** — current Canonical

### Initial Transition
**¥400,000 pre-tax candidate**

### Continuous Support
Customer-facing：
> **月額40万円〜 / Accepted Scope・Service Capacityに応じて個別設計**

Internal reference：
- S ¥400k
- M ¥600k
- L ¥900k
- Custom

ただしContract / Quote時には、Expected Human WorkがTarget Modelを大きく超える顧客へ機械的にこのBandを適用しない。

> **Scope / Capacity / Full COGS Review → Price or Scope adjustment**

## 14. Early Customer Guardrail — PROPOSAL

初期3–5社程度は、Price validation customerとして次を必ず記録する。

- quoted Capacity assumption
- actual Work Volume
- actual Human active time
- common management / reporting time
- transition time
- FACTACT / duplicate work time
- specialist escalation
- monthly full COGS
- realized gross margin
- customer value / objections
- KAIZENによるHuman Work change

3か月単位でBand ModelをReviewする。

## 15. Gross Margin Guardrail — PROPOSAL

外部Benchmarkを踏まえ、Targetとして：
> **Managed Service Gross Margin 50%前後以上を目指す**

ただしLaunch時の全顧客へ機械的に50%を要求するDECISIONではない。

最低Guardrail候補：
- expected GM < 35%：原則Scope / Price再設計
- 35–45%：Early-stage / strategic caseとして明示Review
- 45–55%：acceptable transition zone
- 55%+：healthy target zone candidate

この閾値はPROPOSALであり、Finance Decision未確定。

## 16. Operating Profit Layer

Gross Marginだけでは事業採算を判断しない。

Gross Profitからさらに：
- Sales / marketing
- company management
- G&A
- FACTACT new development / R&D
- non-customer-specific product investment
等を負担する。

外部BenchmarkでもGross MarginとOperating / EBITDA Marginは別物であり、Gross Marginだけで「儲かる」と判断しない。

atLIBのOperating Margin targetは会社全体の財務計画と接続して別途Decisionする。

## 17. FACTACT Product Cost Boundary

FACTACT Costは2種類に分ける。

A. Customer Deliveryに直接必要なruntime / license / support cost → COGS
B. future product development / generic R&D → Operating Expense / Investment

これを混同するとService Gross Marginが歪む。

実際のCloud / AI / third-party tool costはProduct Lane実装後にFACTで取得する。

## 18. Price Decision Status

### DECIDED
- Assessment standard：¥1.2m pre-tax
- price must derive from Scope / Capacity / economics, not old ¥498k anchor

### PROPOSAL / LAUNCH CANDIDATE
- Transition：¥400k
- Customer-facing continuous support：¥400k/month〜
- Internal reference：S ¥400k / M ¥600k / L ¥900k / Custom
- target service GM：around 50%+

### NOT DECIDED
- Transition final price
- S/M/L final price
- exact Band thresholds
- minimum contract term
- price review timing
- discount policy
- FACTACT runtime allocation
- company operating margin target

## 19. Decision Required Before Public Price Release

Public Sales Sheet / LPへ正式価格を載せる前にHuman Decisionが必要：

1. Launch価格を40 / 60 / 90万円で開始するか
2. Initial Transition ¥400kを設定するか
3. 初期低Marginを新規事業投資として許容する範囲
4. Gross Margin Guardrail
5. Contract / Price Review rule

## 20. Current Recommendation — PROPOSAL

現段階では、40 / 60 / 90万円を捨てる必要はない。ただし意味を変える。

> **40 / 60 / 90万円 = Target Delivery Economicsを実現するためのCommercial Target Price**

そして初期受注では、Quote時にFull COGSを必ず確認し、低Marginになる顧客はScopeを狭めるかPriceを上げる。

この方法なら「市場に合わせて安く売り、人手で赤字を埋める」ことも、「原価だけから高額価格を作り、売れない」ことも避けられる。

次はHuman DecisionとしてLaunch Price / Transition Fee / Margin Guardrailを確定し、そのDecisionをQuote TemplateとCustomer-facing Sales Sheetへ反映する。
