# IT経営KAIZEN 継続支援 Product Spec v1

Status: **WORKING CANONICAL — BUSINESS / PRODUCTIZATION**

この文書は、初期販売対象である「IT経営KAIZEN 継続支援」を、Service Desk / Business Workflow / Infrastructure Operation の3 Work領域として統合し、販売可能な商品仕様へ収束させるためのBusiness Lane記録である。

本書では、既に決定された原則と、実運用で検証・調整する初期基準、未確定の価格仮説を混同しない。

## 1. 商品定義

> **ITの仕事を引き受けるだけではない。仕事からFACTをつくり、そのFACTから会社のITを継続的に良くする。**

IT経営KAIZEN 継続支援は、顧客と合意したIT WorkをatLIBが継続運用し、そのWorkをFACTACTで運用することで、FACT / Evidence / Relation / Current Stateを形成し、管理、Reporting、KAIZEN、CHANGE確認、NEW FACTへつなげるサービスである。

> **受託Work → FACTACTで運用 → FACT / Current State形成 → 管理 → KAIZEN Option → Human Decision → ACT → CHANGE確認 → NEW FACT**

## 2. 3つのWork領域

### A. Service Desk
主なTrigger：User。

問い合わせ受付、IT利用相談、一次切り分け、Remote First Response、Account / PC / SaaS等の問い合わせ、Incident一次受付、Vendor Escalation、Waiting管理、Knowledge形成・再利用、Reporting、KAIZEN候補形成、CHANGE確認を扱う。

### B. Business Workflow
主なTrigger：Business Event。

入社、退社、異動、Device Lifecycle、Account Lifecycle、SaaS / License Lifecycle、顧客固有の定型IT Request等を扱う。

基本Loop：
> **Business Event → Work生成 → Authority確認 → ACT → Evidence / 完了確認 → FACT / Relation / Change更新 → Current State → KAIZEN**

対象Workflow一覧は固定メニューではなくReference Catalogとし、顧客ごとにAccepted Work Scopeを合意する。

### C. Infrastructure Operation
主なTrigger：System / Schedule / Event。

Monitoring、Alert Triage、Incident、Patch、Backup、Security、Server / Cloud、Network、Maintenance、Vendor Operation等を扱う。

基本Loop：
> **Monitor / Schedule / Event → Work → ACT → Evidence → Current State → Risk / Difference → KAIZEN → Decision → ACT → CHANGE → NEW FACT**

Zabbix等の既存Systemを無理にFACTACTへ置換せず、Connectionを通じてWork / Evidence / Current Stateへ接続することを基本とする。

## 3. 共通商品構造

3領域を別々の固定Planとして販売することを基本としない。上位商品は「IT経営KAIZEN 継続支援」であり、Assessment等で形成されたFACTとDecisionに基づき、顧客ごとのAccepted Work Scopeを決める。

例：Service Deskのみ、Service Desk + 入退社Workflow、Business Workflow中心、Service Desk + Business Workflow + 一部Infrastructure Operation等。

> **何を変えるかを先にDecisionする。誰が担うかは、その後に決める。**

atLIBが継続運用Actorとして適切でないScopeを無理に受注しない。

## 4. Scope / Responsibility — INITIAL DIRECTION

責任境界は次の4観点で整理する。

- Receive：受付し、放置しない。
- Resolve：標準Scope / Authority内で解決まで進める。
- Coordinate：Vendor等へのEscalation後もWaiting / Statusを管理する。
- Execute：権限・専門性・契約を超える変更は勝手に実行せず、Approval / Decision / KAIZEN Projectへ接続する。

この4分類の詳細な契約表現は後続Reviewで確定する。

## 5. Authority — DECIDED DIRECTION

Authorityは原則として次の3段階で扱う。

1. **Standard Action**：事前委任された範囲でatLIBが実行可能。
2. **Approval Required**：顧客承認後に実行。
3. **Decision Required**：IT責任者 / 経営等によるDecisionが必要。

顧客Onboardingでは、
> **誰が / 何を / どこまで / どの条件ならDecisionできるか**
を効率的に形成する仕組みを設計する。

将来Business Requirement：
> **Assessment FACT → 標準Authority Template → 差分確認 → Human Decision → FACTACT Authority → Service開始**

顧客ごとにゼロからAuthorityを設計するのではなく、標準Templateと差分確認を基本とする。具体的なTemplate / UI / 実装は未確定。

## 6. Service Capacity — DECIDED PRINCIPLE / PROVISIONAL SIZING

人月・時間貸しとして顧客へ販売しない。

> **人を何時間提供するかではなく、企業に必要なIT機能を一定のService Capacityで提供する。**

領域ごとのSizing軸は異なる。

- Service Desk：Inquiry Volume × Complexity × Service Requirement
- Business Workflow：Event Volume × Workflow Complexity × Service Requirement
- Infrastructure Operation：Managed Environment × Operational Work × Event / Incident Volume × Service Requirement

Human Workは内部原価FACTとして測定するが、顧客への人月販売単位にはしない。

Service Deskの月100件程度はStandard Capacity検討上の基準値候補であり、固定販売仕様ではない。

Capacity超過時は即従量課金・自動値上げとせず、FACT確認 → KAIZEN Option → Human Decision → ACT → CHANGE確認を先に行う。構造的に必要Capacityが大きい場合にScope / Capacity / PriceをReviewする。

## 7. Urgent / Priority — INITIAL OPERATING STANDARD

Urgentは利用者が単に「急ぎ」と申告したことだけで決定しない。業務影響を主な判断材料とする。

初期基準：
- 全社 / 複数部門の業務停止：Urgent
- 複数社員が主要業務を実行不能：Urgent
- 重要System / Network等が利用不能：Urgent
- Security Incidentの疑いがあり影響拡大のおそれ：Urgent
- 1名だが重要業務が完全停止し代替手段なし：Urgent候補
- 代替手段のある個別不具合、通常問い合わせ、通常Request：原則Normal

利用者からはPriorityそのものではなく、影響人数、業務継続可否、代替手段、Security関連可能性等を取得する。

> **User reports impact. System suggests priority. Human confirms priority.**

Security疑いの申告を確認済みSecurity Incident FACTへ自動昇格させない。

このUrgent基準は固定不変の契約原則ではなく、**初期運用基準 v1** とする。運用FACT（Urgent件数、業務影響、誤判定、初回対応時間、解決時間、Incident化等）をReviewし、必要に応じて基準自体をKAIZENする。

> **基準を決める → 運用する → FACTを蓄積する → 妥当性をReviewする → 基準をKAIZENする**

SLO / Capacity等の運用基準にも同じ考え方を適用する。

## 8. Reporting / KAIZEN

Service DeskではMonthly / Quarterly / Annualを分ける。

> **Monthlyで運用を管理する。Quarterlyで傾向と経営DecisionをReviewする。Annualで会社が本当にどう変わったかを確認する。**

共通Pattern候補：
> **Work → FACT → AI OFF集計 → AI所感 / Suggest → Human Review → Report → Decision / KAIZEN → ACT → CHANGE → NEW FACT**

AIはKAIZEN Optionを提示できるが、実行DecisionはHumanが行う。KAIZEN Actorは顧客 / 既存Vendor / 他社 / atLIB等から選択される。

## 9. 標準外Workの扱い — INITIAL DIRECTION

細かなOptionを大量に作らない。標準月額外は大きく次の3種類で整理する方向とする。

- Additional Service：電話受付、対応時間拡張等の継続的追加Human Work
- Onsite Work：現地対応、物理作業等
- KAIZEN Project / Specialist Work：RPA、自動化、System設定・構築、高度専門技術対応等

Remote Firstを基本とする。高度技術作業や自動化開発を月額Serviceへ無制限に内包しない。

## 10. Pricing Principle — DECIDED DIRECTION / PRICE HYPOTHESIS

顧客向けPricingと内部原価管理を分離する。

顧客向け主要Driver候補：利用規模、Service Capacity、Scope / Complexity、Service Level。

内部ではTicket / Event / Managed Environment、Human Work、Complexity、Escalation、Waiting、Urgent、Knowledge、Reporting、Review、KAIZEN等をFACTとして測定する。

> **問い合わせ件数が減るほど売上が減る料金体系にはしない。**

問い合わせ増加等を即課金理由にせず、まず構造的原因とKAIZEN可能性を見る。

### 現時点の価格仮説 — NOT DECIDED

以下は販売価格の確定値ではない。

- Scale 1：35万円/月程度、Service Desk 50件/月程度のSizing候補
- Scale 2：50万円/月程度、Service Desk 100件/月程度のSizing候補
- Scale 3：80万円/月程度、Service Desk 200件/月程度のSizing候補

対象社員数は初期Sizing参考値とし、社員数だけで価格を決めない。ScaleはLite / Standard / Proの機能差ではなく、同じServiceのCapacity差として検討する。

旧¥498k/月を固定商品価格として復活させたものではない。価格はWork Catalog、Scope、Capacity、Human Work、共通負荷、採算性、Scale性を確認して確定する。

## 11. 労働集約型への回帰を防ぐDesign Test

継続支援は、従来の常駐支援をRemote化しただけの商品にしてはならない。

Review時には最低限、次を確認する。

1. 人月 / 時間を販売単位にしていないか。
2. Workの結果からFACT / Current State / Knowledgeが形成され、二重管理を減らせるか。
3. 顧客数増加に対してHuman Workが単純比例する構造になっていないか。
4. FACTACT / Standardization / Knowledge / ConnectionによるLeverageが存在するか。
5. atLIBがWorkを抱え続けることではなく、会社のCHANGEを価値としているか。
6. atLIBへの発注をAssessment / KAIZENの成功条件にしていないか。

## 12. Productization Reviewで未確定の事項

- Service Desk標準有人対応時間
- SLO具体値
- Urgent詳細判定 / 例外
- Capacity Review期間 / Threshold
- Scale / 月額価格
- Business Workflowの標準Capacity / Pricing Driver詳細
- Infrastructure Operationの標準Capacity / Pricing Driver詳細
- Additional Service / Onsiteの価格
- Receive / Resolve / Coordinate / Executeの契約表現
- Authority Onboarding Template
- 3領域共通Reporting仕様
- FACTACT現行実装とのFIT / GAP / CONFLICT / UNKNOWN

これらは、実績FACTがないものを確定値として扱わず、必要に応じてHYPOTHESIS / PROPOSALとして検証する。

## 13. 商品説明の中心候補

経営向け：
> **日々のIT運用を、経営判断とKAIZENにつなげる。**

現場向け：
> **仕事をすると、会社のITが整理されていく。**

共通：
> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**
