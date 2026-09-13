# IT経営KAIZEN — Launch Offer v1

Status: **WORKING CANONICAL — BUSINESS / LAUNCH OFFER**

この文書は、IT経営KAIZENを実際の営業検証へ出すためのMVP Offerを定義する。

重要：価格を正当化するためにBPOへ「KAIZEN」という名称を載せるものではない。商品価値の中心を、作業量ではなく **経営と決めたCHANGEを実行し、FACTで検証すること** に置く。

---

# 1. Launch Thesis

> **IT経営KAIZENは、IT業務を代行するサービスではない。経営と1年後に実現したいCHANGEを決め、必要なIT Workを実行し、FACTから毎月KAIZENし、本当に会社が変わったかを確認するサービスである。**

Canonical Loop：

> **FUTURE → FACT / UNKNOWN → GAP → KAIZEN OPTION → HUMAN DECISION → KGI → ACT → DAILY WORK → KPI / NEW FACT → MONTHLY KAIZEN → QUARTERLY REVIEW → ANNUAL CHANGE REVIEW → NEXT KGI**

---

# 2. Initial Target Customer — PROPOSAL

Launch時点では対象を広げすぎない。

## Primary Target

> **従業員100〜300名程度で、IT担当者が少人数か兼務であり、日々のIT運用に追われて経営課題・DX・Security・業務改善へ十分な時間を使えていない企業。**

Employee countは資格条件ではなくSales targeting reference。

### Strong Fit Signals

- IT担当者1〜3名程度
- 問い合わせ / Account / Device / SaaS / Vendor対応が集中
- 入退社・異動等の定型IT Workが多い
- 運用が担当者Knowledgeに依存
- 既存Vendorはいるが全体を統括する仕組みが弱い
- IT企画 / DX / Securityを進めたいが日常運用に時間を取られる
- 経営者が「ITをもっと会社の成長に使いたい」と考えている

### Weak Fit / Do Not Force

- 単純な最安Help Deskだけを求める
- 価格比較が1件単価 / 時間単価だけ
- 経営として変えたいことがない
- 24x365大量運用が中心で初期atLIB Capacityに合わない
- 高度専門Infrastructure Operationだけを求める
- 全てを固定常駐者へ直接指示したい

---

# 3. Why This Target

外部FACTとして、日本企業ではDX推進人材不足が継続している。IPA DX動向2025ではDX推進人材の不足回答が8割を超えた。また従業員100名以下でDX未実施の企業では「メリットが分からない」「知識・情報不足」「実行人材不足」が主要理由として確認されている。

ただし、これらの市場FACTだけでIT経営KAIZENのWTPや受注を証明することはできない。Launch Targetの妥当性は実営業で検証する。

---

# 4. Customer Promise

## Main Promise

> **1年後、会社のITをどう変えるかを経営と決める。そのCHANGEに必要なIT Workを実行し、毎月KAIZENし、1年後に本当に変わったかをFACTで確認する。**

## What We Do NOT Promise

- KGI達成保証
- ○%効率化保証
- 人員削減保証
- 問い合わせ無制限
- 全IT業務の包括代行
- 全Vendor置換
- AIによる自動経営判断

---

# 5. Product Structure

顧客向け商品は原則2段階とする。

## 1. IT経営KAIZEN 設計Assessment

Current Canonical Price：**¥1,200,000 pre-tax**

Purpose：
> **経営がFACT / UNKNOWNをもとに現在地を理解し、1年後に何を変えるかをDecisionできる状態をつくる。**

Output：
- FUTURE
- FACT / UNKNOWN Baseline
- GAP / Management Meaning
- KAIZEN Option
- Human Decision
- 1-Year KGI
- KPI / Verification Plan
- Actor
- Initial ACT / Execution Scope

Assessmentの成功条件はatLIB継続契約ではない。

## 2. IT経営KAIZEN 継続実行

Customer-facing definition：
> **Assessmentで経営と決めた1年後のCHANGEに向けて、必要なIT Workを継続実行し、そのWorkからFACTを形成して毎月KAIZENする。3か月ごとに経営と軌道をReviewし、1年後にCHANGEをFACTで確認する。**

---

# 6. Delivery Capabilities — NOT CUSTOMER PLANS

次の3領域は顧客が選ぶProduct Planではなく、CHANGEを実現するためにatLIBが使うDelivery Capabilityとする。

### Service Desk
社員IT問い合わせ、一次対応、Triage、Vendor escalation、Waiting / completion、Knowledge等。

### Business Workflow
入退社、異動、Account、Device、SaaS / License、Standard Request等。

### Infrastructure Operation
Monitoring、Incident、Patch、Backup、Security、Server / Cloud、Network、Vendor Operation等。

顧客ごとにAssessmentで必要なCapabilityを組み合わせる。

> **Service Deskを売るのではない。KGIへ必要なIT Workを実行するためにService Desk Capabilityを使う。**

---

# 7. Flexible Execution, Bounded Capacity

価値を上げるためにScopeを無制限化しない。

## Principle

> **CHANGEに対して柔軟。Service Capacityには境界がある。**

例：
- Month 1：Service Desk / Intake標準化へCapacityを重点配分
- Month 2：Knowledge / repeat inquiry KAIZEN
- Month 3：Business Workflow標準化
- Month 4：Vendor Waiting / escalation改善

同じCustomerでもFACTとDecisionによってCapacity配分は変わり得る。

ただし、Accepted Responsibility、Authority、Service Requirement、Capacityを超えるWorkは自動的に含めない。

---

# 8. Project Boundary

次は継続実行のCapacity内で無制限に実施しない。

- 大規模Automation / RPA build
- Migration
- System implementation
- Identity / Infrastructure redesign
- Network redesign
- major security implementation
- large device refresh
- highly specialized engineering

必要性は日々のFACTから発見してよい。

Flow：
> **FACT → KAIZEN Option → Human Decision → Actor Decision**

atLIBがActorならKAIZEN Projectとして別途Scope / Quote。

既存Vendor / Customer / Other VendorがActorでもよい。

---

# 9. First 90 Days — PROPOSAL

「1年後に変わる」だけではValue realizationが遅すぎるため、初期90日にCustomer-visible progressを作る。

## Day 0 — Assessment / KGI
- FUTURE確認
- Baseline FACT / UNKNOWN
- 1-Year KGI
- Accepted Actor / Responsibility
- Initial Execution Scope

## Day 1–30 — SEE

Goal：
> **日々のIT Workが見える状態をつくる。**

Candidate Outputs：
- Intake standardization
- Open Work visibility
- Waiting Customer / Vendor visibility
- Authority / escalation map
- Initial Work FACT
- repeated Work / UNKNOWN identification

Customer Question：
> **今、ITの仕事で何が起きているか分かるか？**

## Day 31–60 — STABILIZE

Goal：
> **繰り返す仕事を安定して回せる状態へ近づける。**

Candidate Outputs：
- Standard Action
- Knowledge reuse
- Workflow standardization
- Vendor escalation standardization
- Service Quality review
- first KAIZEN ACT

Customer Question：
> **人に依存していた仕事が、Serviceとして回り始めたか？**

## Day 61–90 — IMPROVE

Goal：
> **FACTから最初のCHANGEを確認する。**

Candidate Outputs：
- Before / After FACT
- Human Work / Waiting / repeat difference where measurable
- KAIZEN effect review
- next-quarter KAIZEN Option
- Management Decision

Customer Question：
> **最初の90日で、何が実際に良くなったか？**

90日で必ず数値改善を保証しない。CHANGE未確認 / Verification Pending / UNKNOWNも正しく残す。

---

# 10. 12-Month Customer Experience

### Assessment
> **現在地をFACTで知り、1年後をDecisionする。**

### Monthly
> **今月、仕事は良くなったか？**

### Quarterly
> **このままで1年後のKGIへ近づいているか？**

### Annual
> **経営と決めたCHANGEは、本当に実現したか？**

Canonical：
> **Monthlyで運用する。Quarterlyで軌道をDecisionする。Annualで会社のCHANGEを確認し、次の1年を決める。**

---

# 11. FACTACT Role

FACTACTはCustomerへ売る「多機能管理Tool」をLaunch Offerの中心にしない。

Role：
> **日々のWorkを、FACT / Evidence / Relation / Decision / ACT / CHANGE / Knowledgeへつなぎ、IT経営KAIZENを継続するService Operating Platform。**

Customer Value：
> **仕事をすると、会社のITが整理されていく。**

Business Requirement：
> **FACTACTによる標準化・Knowledge再利用・重複管理削減・Reporting支援が実際にHuman Workを減らさなければ、IT経営KAIZEN 継続実行は労働集約型へ戻る。**

したがってFACTACT leverageは「付加価値」だけでなくScale / Unit Economics上の検証項目。

---

# 12. Commercial Model — PROPOSAL / NOT DECIDED

Current price hypothesisをLaunch Offerでは次のように扱う。

### Customer-facing

> **IT経営KAIZEN 設計Assessment：120万円**
>
> **IT経営KAIZEN 継続実行：個別設計**

月額40万円〜を公開するかは、Launch前のPrice Decisionで確定する。

### Internal Capacity Reference — HYPOTHESIS
- S：¥400k / month
- M：¥600k / month
- L：¥900k / month
- Custom

これらはCustomer Plan名として販売しない。

### Transition
- ¥400k candidate
- NOT DECIDED

---

# 13. Sales Story

営業は「何を代行できますか？」から始めない。

## Step 1 — Management Question

> **IT担当者は今、会社を良くする仕事にどれくらい時間を使えていますか？**

または、

> **1年後、ITによって会社がどう変わっていたら成功ですか？**

## Step 2 — Current Reality

日々の問い合わせ、入退社、Vendor対応、障害、手作業、管理表等がどれだけManagement / Improvement Capacityを消費しているかを見る。

## Step 3 — Diagnosis

> **まず可能性を発見する。分からないことは分からないまま残す。**

## Step 4 — Assessment

> **可能性で会社を変えない。事実を確認してから、何を変えるかを決める。**

## Step 5 — Execution

> **決めたCHANGEを、日々のIT Workから実現する。**

---

# 14. Sales One-liners — PROPOSAL

Primary：
> **運用を売るのではない。会社が変わるまで、ITをKAIZENし続ける。**

Alternative：
> **日々のIT運用を、会社を良くするKAIZENエンジンへ。**

Alternative：
> **1年後、会社のITをどう変えるか。決めて、動かして、事実で確かめる。**

Existing canonical phrase：
> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**

---

# 15. Objection Test

## 「結局、情シス代行ですよね？」

> **日々のIT Workを実行する点は共通します。ただし、IT経営KAIZENではAssessmentで経営と1年後のCHANGEを決め、そのCHANGEに必要なWorkを実行します。対応件数だけではなく、毎月FACTで改善を確認し、Quarterlyで経営と軌道をReviewし、Annualで本当に会社が変わったかを確認します。**

## 「月額なら何でもやってくれる？」

> **いいえ。経営と決めたCHANGEに対して柔軟にCapacityを使いますが、Accepted ResponsibilityとService Capacityには境界があります。大規模なSystem変更等は別ProjectとしてDecisionします。**

## 「成果を保証するの？」

> **KGIの達成保証ではありません。何を変えるかを経営とDecisionし、FACTで進捗を確認しながら実行とKAIZENを継続し、実際に何が変わったかを検証します。**

## 「今のVendorを変える必要がある？」

> **ありません。機能しているVendorは活かします。会社が良くなるために必要な接続とKAIZENだけを加えます。**

---

# 16. Launch Kill Criteria / Warning Signals — PROPOSAL

初期3〜5社のPilotで次を確認する。

### Sales
- Assessmentが有償で受注されるか
- Assessment後にCustomerが継続実行へ価値を感じるか
- Price objectionが「BPO比較」だけになるか
- ManagementがQuarterly Reviewへ参加するか

### Customer Value
- 90日以内にCustomer-visible CHANGEまたは有意なCurrent State improvementが確認できるか
- KGI-linked KPIをDaily Workから形成できるか
- Employee / IT operator time、Waiting、repeat、Risk等のいずれかでEvidenceを示せるか

### Delivery
- Human WorkがCapacity仮説内に収まるか
- FACTACTでduplicate management / reporting / knowledge workを削減できるか
- Scope creepをAuthority / Capacityで管理できるか
- Customer-specific exceptionが増えすぎないか

### Economics
- Full COGSを測定できるか
- Target GMへ近づくか
- Customer増加に対してHuman Workが線形に増え続けないか

もし「Customerが買う理由＝安いBPO」かつ「atLIB原価＝Human Workにほぼ比例」の状態が続くなら、現在の商品仮説はFAILとして見直す。

---

# 17. What Must Be Measured from Day 1

- Work Volume
- Active Human Work
- Elapsed / Waiting
- First Response
- Complexity
- Escalation
- Repeat
- Knowledge reuse
- Standard Action reuse
- Reporting / Review Work
- duplicate management Work
- Before / After FACT
- CHANGE verification
- Customer Decision
- Project escalation
- Full COGS

> **売れたことだけをProduct-Market Fitとしない。Customerが変わり、atLIBがScaleできることの両方を確認する。**

---

# 18. Launch Decision Gate

このOfferを実営業へ出す前にHuman Decisionが必要な項目：

1. Initial Targetを100〜300名・少人数IT体制へ絞るか
2. Customer-facing商品をAssessment + 継続実行の2段階にするか
3. Service Desk / Workflow / InfrastructureをCustomer PlanではなくDelivery Capabilityとするか
4. 90-Day Value Realization Modelを採用するか
5. Customer-facing継続価格を公開するか / 個別設計とするか
6. Transition Feeを設定するか
7. Minimum GM / Capacity Guardrail
8. Pilot 3〜5社の選定条件

これらをHumanがDecisionした後、Sales Sheet / Proposal / LP / Sales Scriptへ展開する。

---

# 19. Core Test

Launch Offerの全要素は次のQuestionで評価する。

> **これによって経営者は、ITの作業を買うのではなく、会社を良くするCHANGEをDecisionし、そのCHANGEを実行・検証するServiceとしてIT経営KAIZENを理解できるか？**

同時に、

> **atLIBは、人を売るビジネスへ戻らずにこのServiceを継続提供・Scaleできるか？**

両方がYESにならなければLaunch Offerは完成ではない。
