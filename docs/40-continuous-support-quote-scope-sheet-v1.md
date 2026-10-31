# IT経営KAIZEN 継続支援 — Quote / Scope Sheet v1

Status: **WORKING CANONICAL — BUSINESS / SALES ENABLEMENT**

この文書は、IT経営KAIZEN 設計Assessmentで形成されたDecisionを、IT経営KAIZEN 継続支援のAccepted Work Scope / Service Policy / Capacity / Commercial条件へ引き継ぐための標準Quote / Scope Sheetを定義する。

目的は「作業一覧に単価を付ける」ことではない。

> **AssessmentでDecisionしたCHANGEを実現するために、atLIBが何を継続して担い、どこまで責任を持ち、どのService Capacityで提供するかを、顧客と同じ一枚で確認できる状態をつくる。**

## 1. Quote / Scope Sheetの位置づけ

> **Assessment → Management Decision → Actor Selection → Scope Design → Quote / Scope Sheet → Service Start → Daily Work → FACT → KAIZEN → CHANGE**

Assessmentの結論からatLIB受注を自動生成しない。

まず「何を変えるか」をDecisionし、その後「誰が担うか」を決める。

atLIBがActorとして選択されたWorkだけをQuote / Scope Sheetへ載せる。

## 2. 一枚目 — Customer / Management Summary

顧客向けQuoteの1ページ目では、作業明細より先に次を示す。

### A. Customer
- Customer name
- Scope対象組織 / company
- expected users / employees
- major locations
- service start target

### B. Future / 1-Year KGI
AssessmentでDecisionしたFuture / KGIを短く記載する。

> **この継続支援は何を良くするために存在するのか。**

例：
- IT問い合わせによるEmployee Waitingを減らす
- 入社IT Workを標準化しHuman Workを削減する
- Infrastructure IncidentのCurrent State / responsibilityを可視化する

KGIが複数ある場合は重要なものに絞って表示する。

### C. atLIB Accepted Role

顧客に対して、atLIBが担うRoleを一文で記載する。

例：
> **社員IT問い合わせと入退社IT Workを継続運用し、そのWorkからFACTを形成してMonthly KAIZENへつなげる。**

### D. Selected Work Areas
- [ ] Service Desk
- [ ] Business Workflow
- [ ] Infrastructure Operation

すべて選択必須ではない。

### E. Capacity Band

初期候補：
- S
- M
- L
- Custom

ただしBandはHuman Hoursの商品化ではない。

顧客向け説明：
> **Accepted Work Scope、想定Volume、Complexity、Service RequirementからService Capacityを設計しています。**

### F. Monthly Fee / Initial Fee
- Monthly fee
- initial transition / setup fee if applicable
- tax treatment

価格はPrice Decision後に入力する。現在の45 / 65 / 100万円等はHYPOTHESISであり、このTemplateでは固定しない。

## 3. Accepted Work Scope

### 3.1 Service Desk

記載例：
| Scope Item | Accepted | Responsibility / Note |
|---|---|---|
| FACTACT Web Intake | Yes/No | Standard channel |
| IT usage inquiry | Yes/No | target applications defined below |
| Account / password first-line | Yes/No | Authority dependent |
| PC / peripheral first-line | Yes/No | remote-first |
| Incident first intake | Yes/No | impact-based triage |
| Vendor escalation | Yes/No | vendor responsibility remains vendor |
| completion / waiting management | Yes/No | standard |
| Knowledge / KAIZEN | Yes/No | common service value |

### 3.2 Business Workflow

| Scope Item | Accepted | Responsibility / Note |
|---|---|---|
| Onboarding | Yes/No | workflow defined during transition |
| Offboarding | Yes/No | authority / evidence required |
| Transfer | Yes/No | target changes defined |
| Account lifecycle | Yes/No | execution / coordination boundary |
| Device lifecycle | Yes/No | physical handling separately identified |
| SaaS / License lifecycle | Yes/No | target services defined |
| Standard IT request | Yes/No | request catalog defined |

### 3.3 Infrastructure Operation

| Scope Item | Accepted | Responsibility / Note |
|---|---|---|
| Monitoring event intake | Yes/No | existing monitoring may be Connection |
| Incident operation | Yes/No | standard action / escalation boundary |
| Patch operation | Yes/No | agreed procedure |
| Backup check | Yes/No | target systems |
| Security operation | Yes/No | target tools / boundary |
| Server / cloud recurring operation | Yes/No | environment list |
| Network recurring operation | Yes/No | environment list |
| Vendor coordination | Yes/No | actor responsibility retained |

この表はReference Catalogであり、顧客ごとに必要な行だけを使用する。

## 4. Target Environment / Systems

Accepted Work Scopeの対象Contextを記載する。

候補：
- Identity / directory
- Microsoft 365 / Google Workspace等
- endpoint / device management
- security tools
- target SaaS
- server / cloud
- network
- monitoring
- backup
- existing vendors

System名が書かれているだけで「全作業をatLIBが実施する」意味にはしない。Responsibility Boundaryを必ず併記する。

## 5. Responsibility Boundary

各重要Workについて、誰が何を担うかを明確にする。

Actor候補：
- Customer
- atLIB
- Existing Vendor
- Other Vendor
- Manufacturer / Carrier

表現例：
| Work / Decision | Customer | atLIB | Vendor |
|---|---|---|---|
| Request / Impact report | R | Service Intake | - |
| Triage | Context input | R | - |
| Standard Action | - | R | as agreed |
| Approval | R | Request / record | - |
| Management Decision | R | Option / Evidence | input as needed |
| Vendor technical work | informed | coordination | R |
| Status / Waiting management | input | R | response |

RACIを形式的に全Workへ適用する必要はない。重要な責任境界を顧客が理解できることを優先する。

## 6. Authority

Service開始前に最低限次を決める。

### Standard Action
atLIBが事前委任範囲で実行可能。

### Approval Required
Customer Approverの承認後に実行。

### Decision Required
IT責任者 / Management Decisionが必要。

Quote / Scope Sheetには、主要ActionのAuthorityとApprover / Decision Ownerを記載する。

> **Authorityが不明なWorkを、暗黙の了解で運用開始しない。**

## 7. Service Policy

### Standard candidate
- Delivery：Remote First
- Intake：FACTACT Webフォーム
- Human Service Hours：weekday daytime（最終時刻はPrice / Capacity検証後確定）
- Automatic acknowledgement：System receipt only
- Human First Response：SLO

Provisional SLO candidate：
- Normal：2 business hours
- high-immediacy / business-stop：1 business hour
- Critical：30 min

これらは契約SLAとして確定するまでSLOと明記する。

## 8. Urgent / Critical

顧客には技術PriorityではなくBusiness ImpactをReportしてもらう。

確認項目候補：
- affected users / scope
- business continuity
- workaround
- possible security impact

> **User reports impact. System suggests priority. Human confirms priority.**

最終PriorityはHumanが確認する。

## 9. Capacity Assumptions

顧客向けにはHuman Hoursではなく、見積時のService Capacity assumptionsを記載する。

### Service Desk
- expected request range / month
- typical complexity
- expected peak / seasonality

### Business Workflow
- expected event range / month
- workflow types
- complexity / approval pattern

### Infrastructure Operation
- managed environment scale
- recurring operation
- expected event / incident pattern

数値は「この件数までしか対応しない」という単純Hard Capではなく、Capacity Designの前提として扱う。

## 10. Capacity Review Rule

実運用がAssumptionを継続的に超えた場合：

> **FACT確認 → Temporary Spike / structurally improvable Work / Business Growth / Scope Expansion / Service Design mismatch → KAIZEN → Human Decision → ACT → CHANGE → Capacity再評価**

101件目から追加請求等の単純従量課金にはしない。

構造的にService Capacityが変わった場合のみScope / Band / Price Reviewを行う。

Review条件の具体数値はPilot FACTから確定する。

## 11. Conditional Service

Standard Scope外だが、条件により継続Serviceへ組み込めるものをまとめて記載する。

候補：
- telephone
- Onsite
- extended hours / holidays
- 24x365
- physical logistics
- customer-specific channel
- complex workflow
- regulated / exceptional responsibility

細かなSystemごとのOption課金表へしない。

Conditionalがある場合：
- condition
- expected Volume
- responsibility
- price impact
を明記する。

## 12. KAIZEN Project / Specialist Work

継続支援月額に含めないChange Workを明示する。

候補：
- automation / RPA
- system implementation
- migration
- infrastructure redesign
- network redesign
- security implementation
- major version upgrade
- large Incident / recovery
- large device refresh

継続支援中にKAIZEN Optionとして発見された場合：

> **FACT → KAIZEN Option → Human Decision → Actor Selection → Project Quote → ACT → CHANGE → NEW FACT**

atLIB受注は自動ではない。

## 13. Explicit Exclusions

顧客と認識差が生じやすいものは、対象外として明記する。

例：
- 24x365 unless agreed
- unlimited Onsite
- unlimited phone
- manufacturer repair itself
- Customer Management Decision
- unauthorized high-risk changes
- Project work not separately agreed
- work outside Accepted Environment / Responsibility Boundary

Out-of-ScopeでもFACTACT上でWaiting / Actor / Evidence / Decision等を管理できる場合がある。

## 14. Management / KAIZEN Deliverables

継続支援の差別化Valueとして、Accepted Scopeに応じて次を提供する。

- FACTACT Work operation
- FACT / Evidence / Current State formation
- Service Quality management
- KGI-linked KPI / Verification
- Monthly KAIZEN Report
- Quarterly Management / KAIZEN Review
- Annual KGI / CHANGE Review
- KAIZEN Option
- Decision / ACT / CHANGE tracking

Reportを「件数報告」にしない。

> **実施したことではなく、本当に何が変わったかを見る。**

## 15. Service Start / Transition

契約開始直後から通常運用Capacityで開始できるとは限らない。

Initial Transition候補：
1. Scope confirmation
2. target environment confirmation
3. Authority / approver confirmation
4. existing vendor / escalation mapping
5. intake setup
6. standard procedure / Knowledge connection
7. current open Work handoff
8. initial Baseline / KGI connection
9. service start readiness review

Transitionの工数 / 初期費用はまだUNKNOWN。実案件で検証する。

## 16. Quote / Scope Sheet — One-page Sales View候補

営業時には詳細契約書とは別に、次の1枚を顧客と確認する。

### WHY
**1-Year KGI / このServiceで何を変えるか**

### WHAT
**atLIBが引き受けるAccepted Work Scope**
- Service Desk
- Business Workflow
- Infrastructure Operation

### HOW
**Service Policy**
- Remote First
- FACTACT Intake
- SLO
- Authority
- Escalation

### CAPACITY
**想定Volume / Complexity / Service Requirement**

### KAIZEN
**Monthly / Quarterly / Annual**

### BOUNDARY
**Conditional / Project / Exclusion / Other Actor**

### COMMERCIAL
**Capacity Band / Monthly Fee / Initial Fee**

## 17. Quote生成の内部Flow — PROPOSAL

将来的にAssessment / 見積AIから次のFlowを支援できる。

> **Assessment FACT / Decision → Work候補 → Accepted Scope候補 → Capacity Driver → Band候補 → Conditional / Project候補 → Human Review → Quote / Scope Sheet**

AIはScopeやPriceを自動確定しない。

営業 / Service OwnerがEvidenceを確認し、顧客と合意する。

## 18. FACT FIRST

Quote / Scope設計時も、分からないことを埋めない。

例：
- request volume不明 → UNKNOWN
- incident historyなし → UNKNOWN
- current vendor responsibility不明 → UNKNOWN
- workflow complexity未確認 → UNKNOWN

必要なら、Assumptionとして明示して見積し、Service開始後にFACTでReviewする。

> **UNKNOWNを隠して固定価格へ押し込まない。Assumptionとして見える化し、FACTで更新する。**

## 19. Commercial Neutrality

Quote / Scope SheetはatLIBの受注最大化表ではない。

Assessmentで、
- Customerが担う
- Existing Vendorを継続する
- Other Vendorが適切
- atLIBが担う
というActor Decisionを尊重する。

> **atLIBに発注することがゴールではない。会社が良くなることがゴールである。**

## 20. 次の設計対象

Quote / Scope Sheetの構造まで定義したため、次は営業開始に必要なCustomer-facing Service Sheetを作る。

目的：
- IT経営KAIZEN 継続支援とは何か
- 通常の情シス代行 / 常駐 / Help Deskとの違い
- Assessmentからどう始まるか
- 何を継続運用するか
- FACTACTで何が変わるか
- Monthly / Quarterly / Annualで何を受け取るか
- 価格をどう説明するか

を1ページで理解できる状態にする。

その後、Quote / Scope Sheetの実テンプレート化、Pilot Customer Patternへの当て込み、Price Decisionへ進む。
