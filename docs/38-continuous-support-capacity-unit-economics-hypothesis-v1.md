# IT経営KAIZEN 継続支援 — Capacity / Unit Economics Hypothesis v1

Status: **WORKING HYPOTHESIS — BUSINESS / PRODUCTIZATION**

この文書は、IT経営KAIZEN 継続支援について「何社を何人で継続提供できるか」を初めて数量化するための仮説モデルである。

**重要：以下の数値は実運用FACTではない。初期設計のASSUMPTION / HYPOTHESISであり、販売価格・SLA・人員計画として確定していない。**

実顧客でWorkを開始した後、FACTACTに蓄積されるWork Volume / Human Work / Complexity / Waiting / Escalation / Reporting Load等を使って更新する。

> **価格を先に決めない。Service CapacityとDelivery Costを理解してから価格を決める。**

## 1. 既知 / 未知 / 仮説

### CANONICAL / DIRECTION
- 顧客へ人月・時間を売らない。
- 顧客はAccepted Work Scope + Service Policy + Service Capacity + Management / KAIZEN Valueを買う。
- 3 Work Area：Service Desk / Business Workflow / Infrastructure Operation。
- Remote First。
- FACTACT Web IntakeをStandardとする方向。
- Monthly / Quarterly / Annual KAIZEN Cycle。
- First ResponseはSLOとして開始し、実績FACTでReviewする。
- Capacity超過を即従量課金にせず、原因をFACTで確認してKAIZEN / Scope Reviewする。

### UNKNOWN
- 実顧客の平均問い合わせ件数。
- Work 1件当たりの平均Human Work。
- Business Workflow 1 Event当たりHuman Work。
- Infrastructure recurring Work / IncidentのHuman Work。
- 同時到着 / peak pattern。
- specialist escalation率。
- FACTACT導入前後の効率化率。
- Monthly / Quarterly / Annual Reviewの実工数。
- 1 delivery FTE当たり安全に担当できる顧客数。

### INITIAL ASSUMPTION
以下の試算値はすべて初期仮説。

## 2. Delivery Capacityの考え方

1 FTE = 月160h勤務と仮定しても、160hすべてを顧客Workへ割り当てない。

ASSUMPTION：
- nominal working time：160h / month
- service-delivery planning capacity：120h / month
- remaining 40h：internal meeting、training、absence buffer、cross-customer peak、improvement、administration等

したがって、初期Capacity計算では **120h / FTE / month** をPlanning Capacityとして使用する。

これは確定値ではない。

## 3. Human Workの構造

顧客1社当たり月間Human Workを次で考える。

> **Direct Work + Service Management + KAIZEN / Reporting + Quarterly / Annual allocation + Specialist Escalation + Buffer**

Direct WorkだけでCapacityを計算すると、IT経営KAIZENとして必要なHuman Review / KAIZEN / Management Reviewが抜けるため禁止する。

## 4. Representative Pattern A — Service Desk中心

### Customer Assumption
- employees：100–200
- standard Web Intake
- weekday daytime
- inquiry / request：100件 / month
- mostly standard office IT / SaaS first-line inquiry
- no standard Onsite
- phone excluded

### Direct Work Assumption
平均Human Work：20 min / Work

> 100 × 20 min = **33.3h / month**

20分にはTriage、actual handling、user communication、status / Evidence更新等を含む初期仮説。

### Common Load Assumption
- Monthly report / Human Review / KAIZEN：5h
- Quarterly Review allocation：2h / month equivalent
- Annual Review allocation：1h / month equivalent
- Knowledge / service administration：4h
- specialist / exception buffer：4h

Total：
> **49.3h ≒ 50h / customer / month**

### Initial FTE Capacity
120h ÷ 50h = 2.4 customers

安全運用を考慮すると、初期は：
> **2 customers / delivery FTEを安全側の開始仮説**

FACTACT / Knowledge / Standardizationが進み、Direct Workが改善した場合のTarget Hypothesis：
> **3 customers / FTE**

4–5社/FTEは現時点ではEvidence不足であり、目標として固定しない。

## 5. Pattern B — Service Desk + Business Workflow

### Customer Assumption
- employees：150–250
- Service Desk：100 Works / month
- onboarding / offboarding / transfer / standard IT request等：20 Business Events / month
- standard workflow、remote-first

### Service Desk
100 × 20 min = **33.3h**

### Business Workflow
ASSUMPTION：平均45 min Human Work / Event

20 × 45 min = **15h**

ここでの45分は、各System操作をすべてatLIBが行うケースを保証する値ではなく、intake / Work generation / coordination / Authority / execution or escalation / completion / Evidence等を含む仮説。

### Common Load
Work Area増加により：
- Monthly Review / KAIZEN：6h
- Quarterly allocation：2.5h
- Annual allocation：1h
- Knowledge / admin：5h
- specialist / exception buffer：5h

Total：
> 33.3 + 15 + 19.5 = **67.8h ≒ 68h / customer / month**

### Initial FTE Capacity
120h ÷ 68h = 1.76 customers

初期仮説：
> **1–2 customers / FTE**

ただしWorkflow standardization / automationの効果が最も出やすい領域のため、運用FACTを使ってHuman Work削減を追う。

## 6. Pattern C — 3 Work Area複合

### Customer Assumption
- employees：150–250
- Service Desk：100 Works / month
- Business Workflow：20 Events / month
- Infrastructure：中小企業標準規模の既存環境
- monitoring / patch / backup / network / cloud等のagreed recurring operation
- major build / migrationはProject外出し

### Service Desk
**33.3h**

### Business Workflow
**15h**

### Infrastructure Operation — ASSUMPTION
- recurring operational Work：10h
- Event / Incident handling：6h
- Vendor coordination / evidence：4h

Total Infrastructure：**20h**

### Common Load
- Monthly Review / KAIZEN：7h
- Quarterly allocation：3h
- Annual allocation：1.5h
- Knowledge / admin：5h
- specialist / exception buffer：7h

Common：**23.5h**

Total：
> 33.3 + 15 + 20 + 23.5 = **91.8h ≒ 92h / customer / month**

### Initial FTE Capacity
120h ÷ 92h = 1.30 customers

したがって、3 Work Area複合を1社1担当へ丸ごと持たせる設計ではScaleしにくい。

> **3領域複合顧客を「1人で何社持つか」だけで設計してはいけない。**

Service Desk shared pool、Workflow standard operation、Infrastructure specialist pool等、Capability-based Team Deliveryを前提に検討する必要がある。

## 7. 3 Pattern比較

| Pattern | Monthly Human Work Hypothesis | Simple 120h/FTE Ratio | Initial Safe Hypothesis |
|---|---:|---:|---:|
| A Service Desk | ~50h | 2.4 | 2 customers/FTE |
| B SD + Workflow | ~68h | 1.76 | 1–2 customers/FTE |
| C 3 Areas | ~92h | 1.30 | team delivery required |

この表をPricing Tableとして使用してはならない。

## 8. FACTACTによるLeverage仮説

FACTACTの価値を「AIで○%削減」と先に置かない。

効率化を構造別に検証する。

### A. Intake / Triage
- structured intake
- known context reuse
- authority / relation visibility

### B. Repeated Work
- Knowledge reuse
- standard action
- workflow reuse

### C. Duplicate Management Work
- WorkからFact / Evidence / Relation / Change形成
- 別台帳 / Excel / report用再入力の削減

### D. Reporting
- FACTACT aggregation
- AI narrative draft
- Human Review

### E. KAIZEN
- repeat / waiting / difference / trendの可視化
- 6 LensesによるOption提示

改善効果は、
> **Before Human Work → ACT / FACTACT use → After Human Work → CHANGE**

で測定する。

## 9. Efficiency Scenario — HYPOTHESIS ONLY

Pattern Aを例に、Direct Work 33.3h + common 16h ≒ 50hから開始する。

仮に運用成熟後、
- Direct Work：33.3h → 25h
- common management / reporting：16h → 11h

まで実際に改善できた場合：
> **36h / customer / month**

120h ÷ 36h = 3.33 customers/FTE

この場合、3 customers/FTEが現実的になる可能性がある。

ただしこの削減率は**HYPOTHESISであり、FACTACTの効果として営業資料へ確定値表示してはならない。**

## 10. Delivery Cost Hypothesis

ASSUMPTION：delivery FTE fully loaded cost = **¥800,000 / month**

この¥800kはSalaryではなく、会社負担を含むdelivery capacity costの初期仮説。

120h planning capacityの場合：
> **planned delivery cost ≒ ¥6,667 / capacity hour**

単純Human Workベースのdirect delivery cost：
- Pattern A 50h → 約¥333k
- Pattern B 68h → 約¥453k
- Pattern C 92h → 約¥613k

ここにはSales、company overhead、Product development、FACTACT infrastructure、management profit等を十分含んでいないため、そのままPriceにはしない。

## 11. Gross Margin Design — UNKNOWN

必要Gross MarginはまだDECISIONしていない。

価格設計では少なくとも、
- direct delivery cost
- delivery management
- specialist pool
- FACTACT product / infrastructure cost
- sales / customer success
- corporate overhead
- risk / capacity buffer
- target operating profit
を考慮する。

過去の¥498k等をAnchorにしない。

## 12. Price Sensitivity Illustration — HYPOTHESIS

Pattern A direct delivery cost仮説 ¥333kを例に、単純な売価感度だけを見る。

- ¥450k → direct delivery gross contribution 約¥117k
- ¥500k → 約¥167k
- ¥600k → 約¥267k
- ¥700k → 約¥367k

これはGross Marginの正式計算ではなく、Price Decisionでもない。

Pattern B direct delivery cost仮説 ¥453kの場合、¥500k前後ではProduct / Sales / overheadを吸収する余地が小さい可能性がある。

したがって、全顧客を単一月額へ押し込むより、Service Capacityに応じた価格帯設計が合理的である可能性が高い。

## 13. Employee Countを価格軸にしすぎない

社員数はVolumeのProxyにはなるが、価格を決める直接FACTではない。

同じ200名でも、
- inquiry 40件 / month
- inquiry 150件 / month
- onboarding 2名 / month
- onboarding 20名 / month
- simple SaaS environment
- complex multi-vendor environment
ではHuman Workが異なる。

顧客向けCapacity設計は：
> **Volume + Complexity + Service Requirement**

内部原価設計は：
> **Volume × Complexity × Human Work + Common Load**

を基本とする。

## 14. Recommended Initial Commercial Shape — PROPOSAL

Lite / Standard / Proの機能差Planを作るより、同じIT経営KAIZEN 継続支援をCapacity Bandで販売する方向が整合的。

例示のみ：
- Capacity S
- Capacity M
- Capacity L
- Custom

ただし名称・閾値・価格は未決定。

顧客ごとの差は機能制限ではなく：
- Accepted Work Scope
- expected Volume
- Complexity
- Service Requirement
- managed environment
による。

## 15. Scale Architectureの示唆 — PROPOSAL

1人が顧客を丸ごと担当する構造では、Pattern B/Cで常駐型と同じ労働集約性へ戻るRiskが高い。

将来的Delivery ModelはCapability-based shared teamを検討する。

候補：
- Service Desk Pool
- Business Workflow Operation Pool
- Infrastructure Operation Pool
- Specialist / KAIZEN Pool
- Service Manager / Management Review

FACTACTが共通Work Contextを持つことで、個人固定ではなくTeamとしてService Continuityを提供する。

> **人を顧客へ固定するのではなく、WorkをCapabilityへ流す。**

これはPROPOSALであり、組織設計として未決定。

## 16. 最初に収集すべきDelivery FACT

Pilot / initial customersでは、最低限次を測定する。

- Works / month by Work Area
- Human active time / Work
- elapsed time
- Waiting Customer / Vendor / Approval / Decision time
- first response time
- complexity / exception occurrence
- specialist escalation rate
- repeat / recurrence
- Knowledge reuse
- standard action reuse
- reporting / Human Review time
- Monthly / Quarterly / Annual preparation time
- FACTACT入力 / duplicate management time
- before / after Human Work when KAIZEN applied
- peak / concurrency

Human active timeを顧客請求のタイムチャージに使うのではなく、Capacity / KAIZEN / CostのFACTとして使う。

## 17. Capacity Review Loop

> **ASSUMPTION → Service開始 → FACT収集 → Difference → KAIZEN → Human Decision → ACT → CHANGE → NEW FACT → Capacity Model更新**

初期見積モデル自体をFACT FIRSTでKAIZENする。

## 18. 現時点の結論

確定できること：
- Service Desk 100件/月を20分/件と仮定するとDirect Workだけで約33h。
- Management / KAIZEN / Reportingを含めると、Pattern Aでも初期仮説約50h/customer/month。
- ¥800k/FTE、120h planning capacity仮説ではPattern A direct delivery costは約¥333k/customer/month。
- Pattern B/Cはさらに重く、単一担当者モデルではScaleしにくい。

確定できないこと：
- 実際に20分/件なのか。
- 100件/月が代表的なのか。
- FACTACTでどこまでHuman Workが減るか。
- 適正売価。
- 最終Capacity Band。

したがって、次のPrice設計では単一価格を即決せず、**Capacity Band + representative scope**を作り、粗利感度を比較する。

> **最初の価格は正解ではなく、検証可能な仮説として設計する。**
