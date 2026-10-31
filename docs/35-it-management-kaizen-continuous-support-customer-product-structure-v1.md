# IT経営KAIZEN 継続支援 — Customer Product Structure v1

Status: **WORKING CANONICAL — BUSINESS / SELLABLE PRODUCT STRUCTURE**

この文書は、これまで定義したAssessment、1-Year KGI / KPI、Monthly / Quarterly / Annual Review、Service Desk / Business Workflow / Infrastructure Operation、FACTACTの関係を、顧客が「何を買うサービスなのか」を理解できる商品構造へ収束させる。

新しいFACTACT Core仕様や新しいKAIZEN思想を追加する文書ではない。既存Canonicalを顧客向けServiceとして翻訳する。

## 1. 商品定義

> **IT経営KAIZEN 継続支援は、Assessmentで経営と決めた1年後のCHANGEに向けて、必要なIT Workを継続運用し、そのWorkからFACTを形成し、毎月KAIZENし、Quarterlyで軌道をReviewし、1年後に本当に会社が変わったかをFACTで確認するサービスである。**

単なるBPO / Help Desk / 運用代行ではない。

Workを引き受けることは手段であり、中心価値は、

> **経営Decision → Daily Work → FACT → KAIZEN → ACT → CHANGE → NEW FACT**

を継続的につなぐことにある。

## 2. 顧客が買うもの

顧客が購入するのは「atLIB担当者の人月 / 時間」ではない。

顧客が購入するものを、次の4要素で説明する。

### A. Accepted IT Work

Assessment / Scope Designで合意したIT WorkをatLIBが継続運用する。

標準Work Area：
1. Service Desk
2. Business Workflow
3. Infrastructure Operation

顧客ごとに必要なWork Area / Work Scopeを組み合わせる。

### B. FACTACT Operation

Accepted WorkをFACTACT上で運用し、Workの結果からFact / Evidence / Relation / Change / Knowledge / Current State等を形成・接続する。

> **仕事をすると、会社のITの現在状態が整理されていく。**

### C. Continuous KAIZEN

Daily Workから形成されたFACTを使い、KGI / KPI / Service Quality / Difference / Waiting / Human Work / Risk等を確認し、6 LensesからKAIZEN Optionを形成する。

> **なくす・自動化する・標準化する・任せる・残す・整える**

AIはSuggestし、HumanがDecisionする。

### D. Management Review

- Monthly：今月、仕事は良くなったか？
- Quarterly：このままで1年後のKGIへ近づいているか？
- Annual：経営と決めたCHANGEは本当に実現したか？

Annual ReviewのNEW FACTを次年度Baselineとし、NEXT KGIへつなげる。

## 3. 顧客への一枚説明構造 — PROPOSAL

### START — Assessment

> **現在地を事実で確認し、1年後に何を変えるかを経営と決める。**

成果：
- Future
- FACT / UNKNOWN
- Gap / Risk / Impact
- KAIZEN Option
- Human Decision
- 1-Year KGI
- KPI / Verification Plan
- ACT / Actor

### OPERATE — Daily Work

> **決めたCHANGEに必要なIT Workを日々運用する。**

対象例：
- 社員からの問い合わせ
- 入退社 / 異動等のBusiness Workflow
- Device / Account / SaaS等に関する運用
- Monitoring / Incident / Patch / Backup等のInfrastructure Operation

### KAIZEN — FACTACT

> **仕事からFACTをつくり、そのFACTから次のKAIZENを見つける。**

Daily Work → FACT / Current State → Difference → 6 Lenses → KAIZEN Option → Human Decision → ACT → CHANGE

### REVIEW — Monthly / Quarterly / Annual

> **実施したことではなく、本当に何が変わったかを見る。**

- Monthly：KPI / Current CHANGE / Next KAIZEN
- Quarterly：Trend / KGI trajectory / Management Decision
- Annual：Baseline vs NEW FACT / KGI Review / NEXT KGI

## 4. Standard Work Areas

### 4.1 Service Desk

目的：
> **社員からのIT問い合わせを受け、対応するだけで終わらず、そのWorkからFACTを形成し、Knowledge・管理・KAIZEN・CHANGE確認へつなげる。**

標準Work候補：
- inquiry / request intake
- IT usage consultation
- first triage
- remote first-line response
- Account / Password inquiry
- PC / peripheral inquiry
- target SaaS inquiry
- Incident first intake
- Vendor Escalation
- Ticket / Waiting / Status management
- user response / completion confirmation
- Knowledge formation / reuse
- inquiry trend / KAIZEN candidate formation

標準IntakeはFACTACT Webフォーム。電話等はCustomer-specific additional Service候補。

### 4.2 Business Workflow

目的：
> **会社で発生するBusiness Eventを起点に必要なIT Workを確実に実行し、その結果をCurrent Stateへつなげる。**

対象候補：
- onboarding
- offboarding
- transfer
- Device Lifecycle
- Account Lifecycle
- SaaS / License Lifecycle
- standard IT requests

顧客ごとのWorkflowをReference CatalogからScope Designする。細かな業務ごとにOptionを乱立させない。

### 4.3 Infrastructure Operation

目的：
> **IT基盤を継続的に運用し、その状態と変化をFACTとして蓄積し、障害対応だけでなくRisk・KAIZEN・経営Decisionへつなげる。**

対象候補：
- monitoring
- alert response
- Incident operation
- patch operation
- backup checks
- security operation
- server / cloud operation
- network operation
- periodic maintenance
- Vendor operation

既存Monitoring / Security / Management Systemを不要に置き換えず、Connectionとして活用する。

## 5. Scopeの考え方

全顧客へ3 Work Areaすべてを提供する必要はない。

例：
- Service Deskのみ
- Service Desk + onboarding / offboarding
- Business Workflow中心
- Infrastructure Operation中心
- 3領域の組み合わせ

契約境界は、無数の対象System / SaaS / WorkをOption化するのではなく、Customer Environment、Accepted Work Scope、Responsibility Boundary、Service Capacityから定義する。

> **Catalogは説明とScope Designのために使う。現実の顧客環境をCatalogへ無理に押し込まない。**

## 6. Standard Service Deliverables

Accepted Scopeにかかわらず、継続支援の共通Service Valueとして次を基本候補とする。

1. Accepted Workの継続運用
2. FACTACTによるWork / FACT / Evidence / Current Stateの管理
3. Service Quality管理
4. KGI-linked KPI / Verification
5. Monthly KAIZEN Report
6. Quarterly Management / KAIZEN Review
7. Annual KGI / CHANGE Review
8. KAIZEN Option提示
9. Decision / ACT / CHANGE追跡
10. NEXT KGIへのHandoff

ただし具体的なMeeting回数、Report形式、Human Review工数等はCapacity / Pricing設計で確定する。

## 7. 社員創出時間

生産性 / 業務効率系の顧客では、社員創出時間をManagement Valueの代表指標候補として扱う。

> **社員創出時間 = IT経営KAIZENによるCHANGEによって、IT対応・待機・重複作業・手作業等から解放され、本来の仕事へ使えるようになった社員時間**

IT担当者だけでなく一般社員側も対象になり得る。

ただし全顧客共通Scoreにはしない。Security / Governance / Risk等は適切なFACTでCHANGEを確認する。

## 8. Customer Journey

> **無料IT経営診断 → IT経営KAIZEN 設計Assessment → Human Decision → KAIZEN Project / 継続支援 / Customer / Existing Vendor等によるACT → Monthly → Quarterly → Annual → NEXT KGI**

Assessmentの成功条件はatLIB継続支援の受注ではない。

AssessmentでCustomer / Existing Vendor / Other Vendorが適切なActorとDecisionされたScopeについて、atLIB継続支援を無理に販売しない。

## 9. Commercial Neutrality

> **何を変えるかを先にDecisionする。誰が担うかは、その後に決める。**

KAIZEN Actor候補：
- Customer
- Existing Vendor
- Other Vendor
- atLIB
- 実施せず追加Evidenceを取得

atLIBがActorとして選択され、RPA / Automation / System Change / Migration / advanced technical work等が必要な場合、KAIZEN Projectとして別途提供可能。

> **atLIBに発注することがゴールではない。会社が良くなることがゴールである。**

## 10. Service Capacity

継続支援を無制限対応や人月提供にしない。

> **人を何時間提供するかではなく、企業に必要なIT機能を一定のService Capacityで提供する。**

CapacityはWork Areaごとに異なるDriverを持つ。

- Service Desk：Request / Inquiry Volume × Complexity × Service Requirement
- Business Workflow：Event Volume × Workflow Complexity
- Infrastructure Operation：Managed Environment × Operational Work × Event / Incident Volume

Human Workは内部原価 / Capacity設計に使用できるが、顧客への主表示を人月・工数貸しにしない。

Capacity超過が見えた場合、即従量課金とはせず、まずFACTを確認する。

> **Temporary Spike / KAIZEN可能な構造Work / Business Growth・Scope Expansion**

構造WorkならMonthly / QuarterlyでKAIZEN Optionを提示し、Human Decision → ACT → CHANGEを確認する。それでもCapacityが構造的に不足する場合にScope / Capacity / PriceをReviewする。

## 11. Standard / Conditional / Projectの境界 — DIRECTION

### Standard
- Accepted Work Catalog内
- agreed Service Hours / Channel
- remote-first standard operation
- standard Reporting / Review
- FACTACT operation / KAIZEN

### Conditional / Separate Consultation
- telephone / special channel
- Onsite
- expanded service hours
- 24x365 human response
- exceptional customer-specific operation
- physical logistics / repair等

### KAIZEN Project / Specialist Work
- automation / RPA
- migration
- system implementation / redesign
- major infrastructure change
- advanced specialist work
- large Incident / recovery project等

具体的な線引きは次のWork Catalog / Pricing設計で確定する。

## 12. 顧客向け価値表現候補

Main：
> **ITの仕事を代行するだけではない。仕事からFACTをつくり、会社のITを継続的に良くする。**

Management：
> **Assessmentで決めた1年後のCHANGEを、日々のIT運用から実現する。**

Frontline：
> **仕事をすると、会社のITが整理されていく。**

KAIZEN：
> **仕事をするたびにFACTがたまる。FACTがたまるほど仕事が良くなる。良くなったこともFACTで示す。**

Common：
> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**

Employee Value：
> **ITで失われていた時間を、社員が未来をつくる時間へ。**

## 13. 何ではないか

継続支援を次のように売らない。

- 人を月○時間提供するサービス
- Remote常駐
- 問い合わせを何件でも処理するHelp Desk
- FACTACTだけを提供する月額管理サービス
- KPI Scoreを上げるコンサル
- atLIB製品への置換を前提とするManaged Service

## 14. 初期販売時の商品構造

顧客に見せる初期商品Lineupはシンプルに保つ。

1. **無料IT経営診断** — 可能性を発見する
2. **IT経営KAIZEN 設計Assessment** — FACTで現在地をつくり、1年後のCHANGEをDecisionする
3. **KAIZEN Project** — Decisionした個別CHANGEを実行する
4. **IT経営KAIZEN 継続支援** — Accepted IT Workを継続運用し、FACTからKAIZEN / CHANGEを回し続ける

その他は別途相談 / 見積。

将来的なFACTACT SaaS / IT経営KAIZEN AdvisoryはExit Productとして保持するが、初期Releaseの販売Lineupへ無理に載せない。

## 15. 次に確定すべき商品化項目

思想 / Annual Cycleをこれ以上増やすのではなく、販売可能性を高めるため次を優先する。

1. 3 Work AreaのReference Work Catalogを営業 / 見積可能な粒度へ統合
2. Standard / Conditional / Project / Out-of-Scope判定
3. Service Hours / Intake / SLO / Authority等の標準Service Policy
4. Capacity Driverと標準想定Volume
5. Human Work / Delivery Cost / Scalability仮説
6. Customer Pricing
7. Quote / Scope Sheet
8. Customer-facing one-page service explanation

> **価格からサービスを逆算しない。サービスを定義してから価格を決める。**
