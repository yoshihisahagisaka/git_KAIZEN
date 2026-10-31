# IT経営KAIZEN 継続支援 — Standard Service Policy v1

Status: **WORKING CANONICAL — BUSINESS / PRODUCTIZATION**

この文書は、IT経営KAIZEN 継続支援を人月・常駐ではなくManaged Serviceとして提供するためのStandard Service Policyを定義する。

既存Canonicalで決定済みの原則をService Policyへ翻訳し、未確定の数値・契約条件はPROPOSAL / UNKNOWNとして区別する。

## 1. Service Model

> **顧客が購入するのは個人の稼働時間ではなく、Accepted Work Scopeに対して継続提供されるIT Service Capabilityである。**

顧客は個々のatLIB担当者へ直接作業指示するのではなく、定義されたIntake / Approval / Decision interfaceを通じてService Requestを行う。

atLIBはAccepted Scope内で、Triage、assignment、work method、execution management、escalation、status managementを管理する。

## 2. Standard Service Hours — PROPOSAL

初期標準候補：

> **平日 9:00–18:00（日本時間）**

対象外：土日祝日、年末年始等のatLIB指定休業日。

この時間はHuman Service Availabilityの標準候補であり、FACTACT Webフォーム等のSystem Intake Availabilityとは分ける。

- System Intake：Service Hours外でも受付可能な設計候補
- Human Response / Human Work：Standard Service Hours内

Expanded Hours / 24x365 Human ServiceはConditional Serviceとして個別設計する。

最終営業時間はDelivery Capacity / Staffing / Contract設計で確定する。

## 3. Standard Intake Channel

Standard：
> **FACTACT Webフォーム**

基本Flow：
> **User → FACTACT Web Form → receipt record / automatic acknowledgement → Common Intake → Work → Human Review / Triage**

電話、顧客固有Chat、Teams / Slack直接受付等は初期標準に含めず、Conditional Service / future Connection候補とする。

電話対応を行う場合も、operatorがCommon Intakeへ代理入力し、同一Work Flowへ接続する。

> **Channel → Common Intake → Work → FACT → KAIZEN**

## 4. Automatic AcknowledgementとHuman First Response

自動受付 / 自動応答とHuman First Responseを明確に分離する。

Automatic acknowledgement：
- 受付済みであることをSystemが通知
- Humanが内容を確認したことを意味しない
- First Response SLO達成とはみなさない

Human First Response：
> **atLIB担当者がRequest内容を実際に確認し、利用者へ最初の返信または必要な初動を行った時点**

定型文だけを送信し内容未確認の場合はHuman First Responseとみなさない。

## 5. First Response SLO — PROVISIONAL

現時点の運用開始候補：

| Classification | Human First Response SLO |
|---|---:|
| 質問・相談 / Normal Request | 2営業時間以内 |
| 業務停止・即時性の高いRequest | 1営業時間以内 |
| Critical Incident | 30分以内 |

これは**SLO（Service Level Objective）**であり、現時点で契約上のSLA保証とはしない。

Critical Incidentの30分は解決時間ではなく、Humanによる状況確認と必要なInitial Action / Escalation開始までの目標。

運用FACTを蓄積し、達成率、Volume、Concurrency、Human Work、Escalation等から妥当性をReviewする。

## 6. Priority / Urgent Classification

初期Urgent定義：

> **IT事象によって業務継続に重大な影響が発生しており、通常順序より優先してHumanが確認する必要がある状態。**

Intakeでは、利用者に技術的Priority判定を要求せず、観測可能なImpactを確認する。

候補質問：
- 何人 / どの範囲が影響しているか
- 業務を継続できるか
- 代替手段があるか
- Securityに関係する可能性があるか

基本原則：
> **User reports impact. System suggests priority. Human confirms priority.**

例：
- 全社 / 複数部門が主要業務を実行不能 → Urgent / Critical候補
- 重要System / Networkが利用不能 → Urgent / Critical候補
- Security Incident疑いで拡大可能性 → Urgent候補
- 1名だが重要業務が完全停止し代替なし → Urgent候補
- 1名の問題で代替あり → Normal候補
- 通常のPassword reset / usage consultation → Normal候補

Security疑いはConfirmed IncidentではなくReport / Observationとして扱うが、containment観点でUrgentに分類できる。

## 7. Authority Model

顧客ごとのAuthorityをService開始前に確認する。

標準3 Level：

### A. Standard Action
事前委任された範囲でatLIBが自ら判断して実行可能。

例候補：既定手順での案内、事前承認済みstandard operation等。

### B. Approval Required
顧客Approverの承認後にatLIBが実行する。

### C. Decision Required
IT責任者 / 経営者等のDecisionが必要。atLIB / AIはOptionを提示できるがDecisionしない。

> **AI Suggests. Human Decides. System Records.**

Authorityは「誰が / 何を / どこまで / どの条件ならDecisionできるか」を明確にする。

Assessmentが存在する場合、Assessment FACTをAuthority設計へ利用する。

## 8. Work Status / Waiting Semantics — DIRECTION

Service completionを「全TicketがResolvedしていること」と定義しない。

Accepted Workは少なくとも、実態を表現できるStatus / Contextを持つ必要がある。

Business UX候補：
- New / Received
- In Review / Triage
- In Progress
- Waiting Customer
- Waiting Vendor
- Approval Required
- Decision Required
- Scheduled / Planned
- Completed
- Continued / Handoff

これらは新しいFACTACT Core Object / fixed enumをBusiness Laneから要求するものではない。Product Laneの既存Work semanticsからProjectionする。

重要なのは、WaitingやDecision Requiredを「未処理」と混同しないこと。

## 9. Completion Principle

WorkのCompletionは、単に作業を行ったことではなく、Accepted Scopeに応じて必要なOutcome / Evidence / handoffが確認された状態とする。

例：
- User inquiry：回答 / completion confirmation
- Vendor escalation：Vendorへ送っただけでは最終解決ではないが、atLIB側WorkはWaiting Vendorとして適切に管理され得る
- Account operation：request sentではなく、必要なcompletion Evidenceを確認
- Incident：recovery / current impact / next required actionを確認

> **ACT完了とCHANGE確認を分離する。**

KAIZEN施策を実行しただけではCHANGE Confirmedにしない。

## 10. Escalation Policy — DIRECTION

Escalation先をService開始時に整理する。

候補：
- Customer IT Owner
- Customer Approver / Management
- Existing Vendor
- Manufacturer / Carrier
- Other Specialist
- atLIB Specialist / KAIZEN Project

Escalation時もWork ownership / Waiting / Evidence / next actionを失わない。

> **Vendorへ渡したら終わりではない。誰を待っているか、次に何を確認するかを管理する。**

ただしVendor自身の作業責任をatLIB責任へ自動的に取り込まない。

## 11. Service Continuity

Serviceを特定個人へ依存させない。

顧客が購入するのは「担当Aが対応すること」ではなくService Capabilityである。

FACTACT上のWork / Context / Evidence / Knowledge / Authorityを利用し、担当変更時にもWork Contextを引き継げる状態を目指す。

> **人を固定するのではなく、仕事のContextをServiceに残す。**

これは常駐支援型からManaged Serviceへ転換する重要なProduct Requirementである。

## 12. Service Availability

System AvailabilityとHuman Service Availabilityを区別する。

- FACTACT System Availability：Product / infrastructure側のAvailability
- Human Service Availability：Standard Service Hours内にService Capabilityを提供できる状態

Human Service Availabilityを特定個人の出勤率で表現しない。

初期販売で契約SLA値を設定するかはUNKNOWN。まずSLO / operational FACTから開始する。

## 13. Service Quality FACT

Customer KGI / KAIZEN Outcomeとは別に、atLIB Service自体のQualityを確認する。

候補：
- First Response SLO attainment
- Work continuity / unattended Work
- Waiting status quality
- escalation timeliness
- completion / Evidence quality
- Service availability
- recurring service issue

一般的Help Desk KPIを無条件に主KPIへしない。

Service Qualityが悪い場合はatLIB自身のKAIZEN対象とする。

## 14. Capacity Protection

SLOを設定しても無制限Volumeを保証しない。

SLOはagreed Service Capacityを前提とする。

Capacityを継続的に超える場合：
> **FACT確認 → Temporary Spike / structurally improvable Work / Business Growth / Scope Expansion / Service Design mismatch → KAIZEN / Capacity Review**

大量Requestによる一時的なSLO影響等はFACTとしてMonthly Reportで確認する。

具体的なCapacity threshold / review windowは次のCapacity設計で決める。

## 15. Customer RequestとDirect Instructionの境界

顧客は、
- Service Request
- Business Impact
- required outcome
- Approval
- Decision
をService interfaceを通じて伝える。

atLIBはAccepted Scope内で、誰がどの順序 / 方法で実施するかを管理する。

顧客がatLIB個人へ日常的に直接作業方法・勤務・配置を指示する運用はStandard Service Modelとしない。

最終的な契約類型 / 労働法上の整理は、Service仕様確定後に専門家Reviewを行う。

## 16. Reporting / Management Cycle

Standard Serviceには次のCycleを組み込む方向を維持する。

- Monthly KAIZEN Report
- Quarterly Management / KAIZEN Review
- Annual KGI / CHANGE Review

> **Monthlyで運用する。Quarterlyで軌道をDecisionする。Annualで会社のCHANGEを確認し、次の1年を決める。**

具体的Meeting duration / participants / delivery timingはCapacity / Pricingと合わせて確定する。

## 17. Standard Service Policy — Customer-facing Summary候補

- Remote First
- Standard Intake：FACTACT Webフォーム
- Standard Human Service：平日日中（時刻は最終確定前）
- Human First Response SLO
- Impact-based Priority
- Authorityに基づくAction / Approval / Decision
- Vendorを含むEscalation / Waiting管理
- IndividualではなくService Capabilityとして継続提供
- Monthly / Quarterly / AnnualでFACTからKAIZEN

顧客向け表現候補：

> **人を一人つけるのではなく、必要なIT機能をチームと仕組みで提供する。**

> **問い合わせを処理するだけではなく、仕事からFACTを残し、同じ問題を減らし、会社のITを継続的に良くする。**

## 18. 初期標準と個別条件の境界

### Standard候補
- remote-first
- FACTACT Web Intake
- weekday daytime Human Service
- provisional First Response SLO
- Authority / escalation model
- agreed Accepted Work Scope
- Monthly / Quarterly / Annual KAIZEN Cycle

### Conditional
- telephone
- Onsite
- extended hours / holidays
- 24x365
- physical logistics
- customer-specific channel / complex workflow
- exceptional responsibility / regulated environment

### Project
- build / migration / redesign / automation / RPA / major change / advanced specialist work

## 19. UNKNOWN / 次に確定する数値

以下はまだFACTとして確定しない。

- Standard Service Hoursの最終時刻
- 年末年始等のCalendar policy
- SLOの最終値 / SLA化条件
- Capacity threshold
- concurrent workload assumptions
- Service Availabilityの数値定義
- Quarterly / Annual Meeting標準時間
- exceptional overage rule

これらは価格から逆算せず、代表Customer PatternのCapacity / Human Work試算から検証する。

## 20. 次の設計対象

次はRepresentative Customer Patternを置き、Service Capacity / Human Work / Unit Economicsを試算する。

最低限、
1. Service Desk中心
2. Service Desk + Business Workflow
3. 3 Work Area複合
を比較する。

その際、
- request / event volume
- complexity
- first response concurrency
- Human Work
- review / reporting load
- FACTACTによる効率化余地
- specialist escalation
をFACT / ASSUMPTIONに分離して試算する。

> **サービスを定義した。次に、何社を何人で継続提供できるかを検証する。**
