# IT経営KAIZEN 継続支援 — Work Catalog / Commercial Boundary v1

Status: **WORKING CANONICAL — BUSINESS / PRODUCTIZATION**

この文書は、IT経営KAIZEN 継続支援の3 Work Areaを、営業・Scope Design・見積で利用できるReference Work Catalogへ整理し、Standard / Conditional / KAIZEN Project / Out-of-Scopeの境界を定義する。

本Catalogは顧客環境を固定メニューへ押し込むためのものではない。顧客ごとのAccepted Work Scopeを短時間で設計し、人月・工数貸しへ戻らずServiceとして販売するための共通言語である。

> **Catalogは説明とScope Designのために使う。契約対象は顧客ごとに合意したAccepted Work Scopeである。**

## 1. Commercial Boundaryの4区分

### A. Standard Work

継続支援のAccepted Scopeとして反復的・標準的に運用可能なWork。

原則：
- agreed Service Hours内
- remote-first
- 定型または標準化可能
- Authority / Escalation boundaryを事前定義可能
- FACTACTでWork / Evidence / State / Changeを追跡可能
- 継続運用からKAIZEN可能

### B. Conditional Service

継続支援に含めることは可能だが、顧客条件によってHuman Work / Responsibility / Risk / Capacityが大きく変わるため、Scope Design時に個別確認するWork / Service条件。

例：電話、Onsite、特殊時間帯、物理物流、特殊System、Customer-specific workflow等。

Conditionalを細かな有料Optionの乱立と同義にしない。必要な条件をまとめてScope / Capacity / Priceへ反映する。

### C. KAIZEN Project / Specialist Work

日常継続運用ではなく、明確なChangeを作るための設計・構築・移行・自動化・高度技術作業。

原則として継続支援の月額Capacityへ無制限に内包せず、Decision後にProject Scope / Quoteを形成する。

### D. Out-of-Scope

atLIBが責任を持って提供できない、契約上引き受けない、または別専門家 / Vendorが担うべきWork。

Out-of-ScopeでもFACTACT上でActor / Waiting / Evidence / Decision等を管理し、顧客のIT経営Contextから消さないことは可能。

## 2. Service Desk — Reference Work Catalog

### Standard候補

#### Intake / Triage
- FACTACT WebフォームによるInquiry / Request受付
- Report内容確認
- Category / Target / Impact等のTriage
- Priority候補確認
- Standard Action / Approval Required / Decision RequiredのAuthority確認
- Work status / Waiting管理

#### First-line Response
- IT利用に関する一般問い合わせ
- Password / Account関連の一次対応
- PC / peripheralの一般的な一次切り分け
- agreed SaaS / standard applicationの一次問い合わせ
- standard procedureに基づくRemote対応
- Known Knowledgeの案内 / 再利用

#### Incident / Escalation
- Incident first intake
- impact確認
- standard initial action
- appropriate Actor / VendorへのEscalation
- Waiting Vendor / Waiting Customer管理
- recovery / completion確認

#### Completion / Knowledge / KAIZEN
- userへの回答
- completion確認
- Evidence / outcome記録
- Knowledge形成 / 再利用
- repeat / recurrence / waiting等のFACT形成
- KAIZEN候補形成
- CHANGE確認

### Conditional候補
- telephone intake / outbound phone
- customer-specific chat / collaboration channel integration
- customer-specific reception process
- special language / communication requirement
- physical PC / peripheral handling
- Onsite first-line support
- expanded service hours
- 24x365 human response
- high-volume campaign / event support

### KAIZEN Project / Specialist Work候補
- RPA / automation implementation
- self-service portal redesign
- complex application remediation
- device / network / security redesign triggered by repeated inquiry
- large Knowledge migration / service transition
- major Incident recovery project

### Out-of-Scope候補
- unsupported product manufacturer warranty work itself
- physical repair requiring licensed / manufacturer service where atLIB is not provider
- customer business-process decision that requires customer authority
- illegal / unsafe / unauthorized technical actions

## 3. Business Workflow — Reference Work Catalog

### Standard候補

#### Onboarding
- planned joiner information intake
- required IT Work generation
- standard Account / Device / SaaS / License request coordination
- Authority / approval tracking
- completion / Evidence確認
- join-date readiness確認
- Current State connection

#### Offboarding
- leaving event intake
- Account disable / removal coordination
- License reclaim coordination
- Device return coordination
- permission removal確認
- handover / data-related required Work tracking
- completion / Current State更新

#### Transfer / Change
- department / role change intake
- permission / Account / SaaS / Device related Work generation
- approval / Authority tracking
- completion確認

#### Lifecycle / Standard Request
- Device lifecycle related recurring Work
- Account lifecycle related recurring Work
- SaaS / License lifecycle related recurring Work
- standard access / application request
- periodic review Work where agreed

### Conditional候補
- customer-specific HR trigger / data format
- complex approval chain
- physical shipping / storage / inventory handling
- large number of SaaS / business applications
- customer-specific lifecycle rules
- international / multi-office logistics
- non-standard device types

### KAIZEN Project / Specialist Work候補
- HR / IdP / SaaS provisioning integration
- onboarding / offboarding automation
- RPA
- identity / access redesign
- MDM / endpoint management implementation
- SaaS / License management redesign
- large-scale device refresh / migration
- workflow redesign / system integration

### Out-of-Scope候補
- Human Resources employment decision
- business authority decisions not delegated to atLIB
- procurement contract execution where atLIB lacks authority
- physical logistics not agreed in Scope

## 4. Infrastructure Operation — Reference Work Catalog

### Standard候補

#### Monitoring / Event
- existing monitoring alert intake
- scheduled operational check
- Event / Alert review
- initial triage
- Work generation / status management

#### Incident Operation
- impact確認
- standard initial action
- agreed restart / recovery action under Authority
- Vendor escalation
- Waiting / recovery status management
- completion / Evidence確認

#### Recurring Operation
- patch operation under agreed procedure
- backup status check
- standard security operation
- server / cloud recurring operation
- network recurring operation
- periodic maintenance
- certificate / expiry / lifecycle related recurring check where agreed

#### Management / KAIZEN
- recurring Event / Incident FACT formation
- recovery / business impact FACT
- Vendor dependency / Waiting
- Current State / Evidence connection
- Risk / Difference observation
- KAIZEN candidate formation
- CHANGE verification

### Conditional候補
- customer-specific monitoring tools
- customer-specific security tools
- Onsite infrastructure work
- data-center / office physical work
- expanded / overnight maintenance windows
- 24x365 human operation
- highly regulated environment
- complex multi-vendor environment
- large-scale environment / high event volume

### KAIZEN Project / Specialist Work候補
- infrastructure redesign / build
- cloud migration
- network redesign
- security architecture implementation
- backup redesign
- monitoring redesign / implementation
- EDR / MDM / IAM implementation
- major version upgrade
- major Incident / disaster recovery project

### Out-of-Scope候補
- unauthorized configuration change
- work requiring certifications / licenses not held by atLIB
- manufacturer / carrier work itself where atLIB is only coordinator
- unapproved high-risk change

## 5. Cross-Area Standard Service

Accepted Work Areaに加えて、IT経営KAIZEN 継続支援として共通提供するManagement / KAIZEN機能候補：

- FACTACT Work operation
- Evidence / FACT / Relation / Change形成
- Service Quality management
- KGI-linked KPI / Verification
- Monthly KAIZEN Report
- Quarterly Management / KAIZEN Review
- Annual KGI / CHANGE Review
- 6 LensesによるKAIZEN Option
- Human Decision tracking
- ACT / Actor tracking
- CHANGE / NEW FACT verification
- NEXT KGI handoff

これらを「別売りの管理オプション」とせず、継続支援の差別化Valueとして設計する方向を維持する。

## 6. Scope Sheetで顧客ごとに決めること — PROPOSAL

営業 / Assessment後のScope Designでは、Workを1件ずつ価格表へ当てはめるのではなく、最低限次を合意する。

### Customer Environment
- employees / users
- locations
- main devices
- main identity / collaboration environment
- target SaaS / business applications
- major infrastructure / cloud / network
- existing vendors / systems

### Accepted Work Scope
- selected Work Areas
- typical accepted Work
- explicit exclusions / responsibility boundary
- Actor / escalation boundary

### Service Policy
- Service Hours
- Intake Channel
- First Response SLO
- Urgent criteria
- Authority model
- approval / Decision route

### Capacity Assumptions
- expected inquiry / request volume
- expected Business Event volume
- managed environment scale
- event / incident volume
- workflow complexity
- exceptional peak assumptions

### Reporting / Review
- Monthly
- Quarterly
- Annual
- KGI / KPI / employee time created applicability

## 7. Catalog外Workの扱い

Catalogに書かれていないという理由だけで自動的にOut-of-Scopeとしない。

新しいWorkが発生した場合：

> **Work確認 → Responsibility / Risk / Frequency / Complexity / Authority / Capacity確認 → Standard類似 / Conditional / Project / Out-of-Scope判定**

を行う。

反復的で標準化可能なら、運用FACTを見ながら将来Catalogへ取り込むことができる。

> **Catalog自体もFACTからKAIZENする。**

## 8. 人月化を防ぐCommercial Rule

顧客向け見積では「担当者0.3人月」「月50時間」等を主商品単位にしない。

顧客向け単位：
- Accepted Work Scope
- Service Policy
- Service Capacity
- Management / KAIZEN Value

内部管理単位：
- Human Work
- Complexity
- Skill level
- volume
- escalation
- review / reporting load
- utilization / concurrency

> **Human Workは原価を測るFACTであり、顧客へ売る商品そのものではない。**

## 9. Capacity超過とKAIZEN

Capacity超過を即座に追加従量課金へ変換しない。

まず、
1. Temporary Spike
2. structurally improvable Work
3. Business Growth / Scope Expansion
4. service design mismatch
をFACTで確認する。

構造的な反復Workなら、6 LensesからKAIZEN Optionを提示する。

例：
- なくす
- 自動化する
- 標準化する
- 任せる
- 整える

HumanがDecisionし、ActorがACTする。CHANGE後にCapacityを再確認する。

それでも継続的にCapacityが不足する場合、Scope / Capacity / Price Reviewへ進む。

## 10. 初期Commercial Boundary — DIRECTION

初期販売では、以下を分かりやすい基本境界とする方向を候補とする。

### 継続支援の基本
- remote-first
- weekday daytime Service
- FACTACT Web Intakeを標準
- agreed Accepted Work Scope
- standard Authority / escalation
- Monthly / Quarterly / Annual KAIZEN Cycle

### 個別条件へ回す
- phone
- Onsite
- extended / 24x365 hours
- physical logistics
- high-volume / high-complexity environment
- exceptional responsibility

### Projectへ回す
- build / migration / redesign / automation / RPA / major change

具体的なService Hoursや数値は次のService Policy / Capacity設計で確定する。

## 11. 見積ロジックへのHandoff

価格はCatalogのWork数で単純加算しない。

次の順序で設計する。

> **Accepted Work Scope → Service Policy → Capacity Drivers → Human Work / Skill / Common Management Load → Scalability → Cost → Customer Price**

主なCapacity Driver：
- Service Desk：Request Volume × Complexity × Service Requirement
- Business Workflow：Event Volume × Workflow Complexity
- Infrastructure Operation：Managed Environment × Operational Work × Event / Incident Volume

Cross-area common load：
- FACTACT operation
- Human Review
- Monthly reporting
- Quarterly review
- Annual review
- KAIZEN management

## 12. 次の設計対象

本Catalogを基準に、次はStandard Service Policyを確定する。

1. standard Service Hours
2. Intake Channel
3. First Response SLO
4. Urgent / Critical criteria
5. Authority / Approval / Decision model
6. Waiting / Completion semantics
7. Service Availability / continuity
8. escalation

その後、代表Customer Patternを使ってCapacity / Human Work / Unit Economics / Priceを試算する。

> **価格からサービスを逆算しない。サービスを定義してから価格を決める。**
