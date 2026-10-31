# FACTACT Product Operating Principles V1

Status: **ACCEPTED PRODUCT PRINCIPLES**

This document is the Canonical checkpoint for product-wide Product, UX, and Implementation principles agreed by the Product Owner. It consolidates principles that are already represented across the existing Canonical documents and records the accepted direction for SUPPORT Phase 2 Slice 1.

These principles guide product and implementation decisions. They do not replace the strict Core semantics defined by the domain Canonical, authorize implementation by themselves, or finalize the pending Slice 1 Data Contract.

## 1. Work First

人はFACTACTを管理するために仕事をするのではない。

人は問い合わせ対応、確認、判断、作業、引継ぎ、完了確認など、本来の仕事を進める。

FACTACTは、その仕事の過程から必要なFact、Observation、Evidence、Decision、Unknown、Change、Knowledge等を内部で構造化して蓄積する。

**業務中は、その業務を進めるために必要なことだけをHumanへ求める。**

管理・標準化・改善のための追加入力を日々の業務へ不必要に持ち込まない。

## 2. Natural Fact Accumulation

人が仕事を進めた結果としてFactが自然に蓄積される。

そのFactは後から、

- 管理View
- Registry確認
- Knowledge Review
- 手順見直し
- Assessment
- KAIZEN

等の別業務で再利用する。

一度得た情報を、管理表や手順書のために再入力させることを標準としない。

## 3. Internal Complexity Hidden

内部ではFact、Relation、Observation、Evidence、Decision、Rule、Authority、Knowledge等を厳密に分離する。

しかしHumanにその内部構造を操作させない。

Humanには仕事の言葉と仕事の操作を提供する。

既存原則:

> Internal semantics must remain strict. User language must remain intuitive.

および

> Show the job, not the database.

を維持する。

## 4. AI-less by Default

FACTACTはAIがなくても通常業務が成立することを基本とする。

Core Logicと通常の状態遷移はdeterministic / Human-drivenで成立させる。

AIはoptional assistanceとして、

- 要約
- 候補提示
- 関連情報提示
- Knowledge Candidate作成
- 手順との差分候補
- 改善候補

等を支援できる。

AIが停止してもWorkそのものを止めない。

既存原則:

> AI Suggests. Human Decides. System Records.

を維持する。

## 5. Human Fallibility / Reversibility

人は間違えることを前提とする。

重要なHuman input、確認、判断、関連付けは、Authorityの範囲内で訂正・差し戻し・再判断可能とする。

訂正で過去の記録を破壊しない。

旧状態、Actor、Time、Reason、Source / Provenanceを追跡可能にする。

## 6. Unknown is Normal

Unknownは異常状態、入力漏れ、No、ゼロではない。

分からない情報をシステム都合で埋めない。

すべてのUnknownを調査するのではなく、現在の仕事に必要なUnknownだけを確認する。

既存原則:

> Unknown → Service Context → Impact → Is this needed now? → Priority

を維持する。

## 7. Authority First

閲覧、判断、Action、変更、承認、公開等のAuthorityを混同しない。

HumanもAIもAuthorityを越えて操作しない。

画面上操作可能に見えることをAuthorityの根拠にしない。

Application authorizationとRLSの既存境界を維持する。

### 7.1 Read Authority v1

Read Authority v1は、認証済みの内部OperatorによるFACTACT内の閲覧に適用する。

- 同一Tenant内では横断閲覧を許可する。
- `ADMIN`、`OPERATOR`、`REVIEWER`のいずれか1つ以上の明示Roleを必要とする。Roleを持たないOperatorは閲覧できない。
- Tenant境界を越える閲覧は許可しない。
- 初期版ではService、Contract、Owner、TeamによるRead制限を設けない。
- Read AuthorityとExecute / Review Authorityを分離し、Contractの`executeRoles` / `reviewRoles`をRead条件へ転用しない。
- Knowledge Candidateは未承認情報であり、Approved KnowledgeまたはRuleとして表示・利用しない。
- Person email、Device serial、Work title、およびKnowledge Candidate本文への検索一致から存在を推測できることは、内部Operatorによる同一Tenant共有モデルの範囲で許容する。
- このDecisionを将来の個別機密情報や外部利用者へ自動適用しない。それらには別のRead Authority Decisionを必要とする。

Application Queryはsession上のRoleだけを根拠にせず、tenant-scoped transaction内でactive Operatorと現在のRoleを再取得して判定する。RLSは引き続きTenant isolationを担い、画面の表示・非表示だけをAuthorityとして扱わない。

## 8. Core Independent from Integrations

FACTACT Coreへ外部システム固有の取り込み機能を直接持たせることを標準としない。

メール、Teams、SaaS、Vendor、監視ツール等との接続が必要な場合は、Coreの外側にConnector / Integration機能を設ける。

FACTACT Coreは外部Vendor固有schemaを持たず、必要なContext / Evidence / Decision / provenance等を既存Core semanticsへ接続する。

## 9. Do Not Over-Automate

システムがHumanの仕事を必要以上に自動判断しない。

機能検討時は、

1. 本当に自動化が必要か
2. 必要な情報へのアクセス改善で十分ではないか
3. 単純なRuleで十分ではないか
4. Humanが判断した方が自然ではないか

を先に検討する。

自動化のために複雑なWorkflowや状態機械を増やすことを避ける。

## 10. Access First

FACTACTは、Humanが判断に必要な情報へ素早く到達できることを重視する。

ベテランの仕事が速い大きな理由の一つは、必要な情報の所在と到達経路を知っていることである。

FACTACTはそのアクセス速度をUI/UXとして提供する。

特にWorkを進めながら、

- Customer
- Person
- Device
- Site
- Account
- Application / Service
- Contract
- 過去Work
- Change
- Evidence
- Knowledge
- Rule / Authority

等の必要なContextへ短い操作で到達できるようにする。

システムが答えを推測することより、Humanが判断材料へ早く到達できることを優先する。

## 11. Common Work Interaction

問い合わせ内容ごとに別の操作体系を作ることを避ける。

PC、アカウント、SaaS、ネットワーク、複合機、セキュリティ等で対象や必要Contextは異なっても、Humanが行う基本的な仕事の型は可能な限り共通化する。

概念的な基本形:

> Identify → Inspect Context → Hear / Confirm → Act → Verify / Continue

ただし、これを固定Workflowやmandatory wizardとしてCoreへ実装してはならない。

これは業務理解のための共通パターンであり、Workごとに不要なStepを強制しない。

## 12. Identify Before Guessing

問い合わせ対応では、業務上自然な識別情報から、必要なContextを早期に特定する。

例:

PC問い合わせ:

- hostname
- 管理番号
- serial
- 利用者

複合機:

- Customer
- Site
- 型番
- IP address
- 管理番号

Account / SaaS:

- Person
- email
- service
- account identifier

対象を特定した後、そのEntityについて既に保持しているFactへアクセスし、OS、機器種別、VPN対象、Domain参加、契約、保守、権限等を推測せず確認して仕事を進める。

特定できない場合はUnknownのままWorkを継続できる。

## 13. Work Context Is Not Registry Maintenance

問い合わせ中に確認した対象やContextを理由に、Registryを自動変更しない。

例:

Registry上のprimary PCと今回問い合わせ対象のPCが異なっても、問い合わせ対応中はWork Contextとして保持する。

Registryの誤りや古さが疑われる場合、必要であれば後で別の管理・確認Workとして扱う。

日々の問い合わせ対応中にRegistry maintenanceを強制しない。

## 14. Multiple Context Entities

1つのWorkは、必要に応じて複数のContext Entityと関係し得る。

例:

PC support:

> Customer / Person / Device

SONIX型複合機 support:

> Customer / Site / Device

SaaS:

> Customer / Person / Application / Account

Network:

> Customer / Site / Device / Service

したがって、

> 1 Work = 1 Target

をFACTACT全体のCore invariantにはしない。

ただし個別Sliceで、特定のContext RoleについてActive entityを1件に限定することは、業務要件が確認された場合に限り許容する。

SUPPORT Phase 2 Implementation Contractにおける単一のeffective confirmed targetは、この個別Sliceの対象Context Roleに限定された制約として扱い、FACTACT全体のCore invariantへ一般化しない。

## 15. Work Is Not Inquiry-Specific

FACTACTのWorkは問い合わせ対応に限定しない。調査、棚卸、管理表精査、Knowledge / FAQ / Procedure整備、点検、Review、Change等、人が実際に進める仕事を同じWork semanticsで扱う。

情報を検索・閲覧しただけではWorkを作らない。Management / Registry / Knowledge viewは別の実行エンジンではなく、そこで実際の作業を開始する場合は通常のWork semanticsを利用する。

## 16. Non-Linear Work and Active Work Anchor

仕事は固定された一本道ではない。

> Search ↔ Inspect ↔ Hear ↔ Act ↔ Search ↔ Verify

はHuman activity patternであり、Core state machineやmandatory wizardではない。

Work SpaceとExplore Spaceは概念上分離するが、Exploreへ移動しても現在のWorkを見失わせない。

> Work persists across navigation.

Human向けには「調べる場所と仕事を進める場所は分ける。ただし、仕事は見失わない。」を原則とする。Active Work Anchorは新Core Objectではなく、まずApplication / Navigation concernとして扱う。

## 17. Explore First, Persist Deliberately

> Explore First, Persist Deliberately.

Humanは必要な情報を自由に検索・参照できる。検索・閲覧しただけではBusiness Fact、Work Context、Registry変更を作らない。実際の仕事で意味を持ったEntity / Context / Action / Observation等だけを明示的に記録する。

> Looked at != Work Context

> Clicked != Selected as Work Context

## 18. Search Is Navigation, Not Decision

> Search is a navigation capability, not a decision engine.

Searchは必要な情報への到達時間を短くし、Humanへ候補と判断材料を提示する。原因、正解、Work Contextを自動確定せず、Registry更新、自動Close、Authorityを越えた判断を行わない。

詳細なSearch / Explore / Work Navigation契約は`factact-search-explore-product-contract-v1.md`を参照する。

## SUPPORT Phase 2 Slice 1 Direction

Status: **DIRECTION CONFIRMED — DETAILED DATA CONTRACT PENDING**

SUPPORT Phase 2 Slice 1を、PC専用の`Current Target`機能として固定しない。

Productとしては、**Work Context Identification**の最初のVertical Sliceとして扱う。

目的:

> 問い合わせ対応で「誰の、どの環境の、何についての問い合わせか」を業務上自然な識別情報から特定し、既存Factへ素早くアクセスできるようにする。

最初の実装ケースはDevice / PCを中心に検証するが、将来Customer、Person、Site、Application、Account等のContext Entityへ拡張可能な意味境界を維持する。

この時点では以下をCanonical確定しない:

- table name
- column name
- Relation vocabulary
- Entity vocabularyの最終形
- API path
- UI component
- UI wording
- mandatory workflow
- automatic classification
- eligibility engine

これらは業務ケースValidation後のData Contractで決定する。
