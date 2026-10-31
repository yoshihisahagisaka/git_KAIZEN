# FACTACT Search / Explore / Work Navigation Product Contract V1

Status: **ACCEPTED PRODUCT CONTRACT**

## 1. Purpose and precedence

This document is the Canonical Product Contract for Search, Explore, Work Context, and Work navigation. It specializes the accepted principles in `factact-product-operating-principles-v1.md` without replacing Core semantics, tenant isolation, Authority, provenance, history, or the accepted SUPPORT contracts.

The sequencing decision in section 12 supersedes only the prior `Current Target → Registry → Search` implementation order. The other boundaries and safety requirements in the SUPPORT Phase 2 Core Fit Validation and Implementation Contract remain unchanged. This document does not authorize implementation or finalize the deferred Data Contract.

## 2. Work scope and activity pattern

FACTACTのWork起点は問い合わせに限定しない。代表例は次のとおりである。

- 問い合わせ対応
- 過去問い合わせを調べた結果始まる調査
- 棚卸
- 管理表精査
- Knowledge / FAQ / Procedure整備
- 点検
- Review
- Change
- その他、人が実際に進める仕事

情報を見ただけではWorkを作らない。

実際の仕事は固定Workflowではなく、次のように何度でも行き来する。

> Search ↔ Inspect ↔ Hear ↔ Act ↔ Search ↔ Verify

この表現はHuman activity patternであり、Core state machineやmandatory wizardではない。`Identify → Inspect → Act → Verify`を固定Workflowとして強制しない。

## 3. Product spaces and Active Work Anchor

FACTACT UIは概念上、次を分離する。

- Work Space
- Explore Space
- Management / Registry / Knowledge views

Management / Registry / Knowledge viewsは別の実行エンジンではない。閲覧から実際の作業を開始する場合は、通常のWork semanticsを利用する。

Work中にExploreへ移動しても、現在のWorkを見失わせない。

> Work persists across navigation.

Human向けの原則は「調べる場所と仕事を進める場所は分ける。ただし、仕事は見失わない。」である。Work画面は常に戻れる場所とする。

Active Work Anchor自体は新Core Objectではない。まずApplication / Navigation concernとして扱う。

## 4. Explore First, Persist Deliberately

> Explore First, Persist Deliberately.

- Humanは必要な情報を自由に検索・参照する。
- 検索・閲覧しただけではBusiness Factを作らない。
- 検索・閲覧しただけではWork Contextを作らない。
- Registryを変更しない。
- 実際の仕事で意味を持ったEntity / Context / Action / Observation等だけを明示的に記録する。

> Looked at != Work Context

> Clicked != Selected as Work Context

基本遷移は次のとおりである。

> Search → View → Human judgment → optional Work Context

Search API自身はWorkを変更しない。Search結果をクリックしただけでもWork Contextにしない。

## 5. Search responsibility boundary

> Search is a navigation capability, not a decision engine.

Searchの役割:

- 必要な情報への到達時間を短くする。
- Humanへ候補を提示する。
- Humanが判断材料を探すのを助ける。

Searchがしないこと:

- 原因の自動確定
- 正解の自動決定
- Work Contextの自動確定
- Registry自動更新
- 自動Close
- Authorityを超えた判断

### 5.1 Read Authority v1

Exploreは認証済みの内部Operatorを対象とし、同一Tenant内のOrganization、Person、Device、Service、Work、Knowledge Candidateを横断検索できる。`ADMIN`、`OPERATOR`、`REVIEWER`のいずれか1つ以上の明示Roleを必要とし、Roleなしのactive Operatorは検索できない。

初期版ではService / Contract / Owner / TeamによるRead制限を設けない。ReadをExecute / Reviewと混同せず、Contractの`executeRoles` / `reviewRoles`を検索条件へ転用しない。Person email、Device serial、Work title、Knowledge Candidate本文への検索一致による存在推測は、この内部Tenant共有モデルの範囲で許容する。

Knowledge Candidateは常に未承認候補として扱い、Approved KnowledgeまたはRuleと誤認させない。このRead Authorityを個別機密情報または外部利用者へ自動適用しない。

## 6. Work Context layers

次の3層を分離する。

### 6.1 Work Envelope

Workが既に持つ次の文脈である。

- Tenant
- Service
- Contract
- Service Recipient
- Source Event
- Owner

同じ意味をgeneric Work Context Relationへ二重保存しない。

### 6.2 Working Context

そのWorkで実際に意味を持ったEntityである。Person、Device、Service、および将来のSite / Application / Account等が該当し得る。Human判断で必要な場合のみpersistする。

### 6.3 Exploration

検索・閲覧しただけの情報である。Business Contextとしてpersistしない。

> Work Envelope != Working Context != Exploration

Work開始時に全Contextを特定する必要はない。Unknownを許容し、調査によって意味を持つContextを途中で追加できる。例えばNetwork障害では、Siteだけが判明した状態から調査を始め、後から特定したRouterをSubjectとして追加し得る。

## 7. Relation semantics and cardinality

既存の専用semantic relationがある場合、generic Work Context Linkへ逃がさない。例:

- source Work → Knowledge Candidate
- Event provenance
- Registry Person → Device Relation

generic graphを増やしすぎない。

FACTACT Core invariantとして`1 Work = 1 Target`を採用しない。Workには複数Context Entityが関係し得る。個別Sliceで特定Context Roleのactive entityを1件に制限することは、検証済み業務要件の範囲でのみ許容する。

大量対象の棚卸等では、Context LinkとWork Scopeを区別する余地を保持する。この文書ではその永続化形式を決めない。

## 8. Knowledge / FAQ / Procedure candidates

将来のExplore対象となる情報カテゴリ:

- Registry / 管理情報
- 過去Work
- Procedure / 手順
- Knowledge
- FAQ

現行実装はKnowledge Candidateのみの限定実装であり、FAQ専用Object、Procedure専用Object、Approved Knowledgeは存在しない。この契約によって新Core Objectを作らない。

問い合わせキーワード等からKnowledge候補、FAQ候補、手順候補、過去Work候補を提示できることをUX目標とする。候補は正解ではない。

AIがなくても成立させる。AIは将来、検索語候補、候補順位付け、要約等のoptional assistanceとして追加できる。

> AI Suggests. Human Decides. System Records.

## 9. Search / Explore Minimum V1

現行schemaに合わせた最初のSearch対象:

- Organization
- Person
- Device
- Service
- Work
- Knowledge Candidate

Site / Application / Accountは現行schemaに未実装のためMVP対象外とする。

最小検索候補:

| Type | Candidate fields |
|---|---|
| Organization | `name` |
| Person | `display_name`, `email` |
| Device | `asset_tag`, `serial_number`, `display_name` |
| Service | `name` |
| Work | `title`, exact Work ID |
| Knowledge Candidate | `title`, `content_text`, `topic` |

## 10. Search matching minimum

初期実装の優先順位:

1. exact
2. prefix
3. contains

human-facing textはcase-insensitiveとする。

現時点で実装しない:

- semantic search
- vector DB
- embeddings
- AI必須ranking
- fuzzy matching
- typo correction
- PostgreSQL FTS専用index
- search document table

必要性と性能を実測してから判断する。

## 11. Search Result projection

Search ResultはEntity本体ではなく、薄いProjectionである。

概念上の最小要素:

- resultType
- entityId
- primaryLabel
- secondaryLabel
- minimal metadata

> Search Result != Full Registry Entity

詳細はEntity / Work / Knowledge画面で読む。この概念はfinal API response JSONを確定しない。

## 12. Implementation sequence decision

旧方向:

> Current Target → Registry → Search

新方向:

> Search / Explore → Human identifies meaningful context → Work Context Link → Registry enrichment

実際の業務が`調べる → 対応 → また調べる → 対応 → 記録`という探索型であるため、新方向を採用する。

この順序変更は、検索や閲覧をBusiness Contextとして保存することを意味しない。Humanが実際の仕事で意味を認め、明示的に記録したContextだけをWorking Contextとする。

## 13. Current implementation baseline

This section records current implementation facts, not the target Product Contract.

- global searchは存在しない。
- Personは一覧／UUID参照が中心で、氏名／email検索はない。
- Deviceは一覧／UUID参照が中心で、`asset_tag`検索はない。
- Work検索はUUID、Event関連、Person関連、owner/statusの限定的な一覧に限られる。
- Knowledge Candidate取得はService単位で、keyword検索はない。
- Site / Application / Accountはschema未実装である。
- Device hostname / IP / OS / device type / domain participation / VPN状態は未実装である。
- FAQ / Procedure専用Objectは存在しない。
- 現行UIはdialog内の参照であればWorkをmountedのまま維持できる。
- route離脱時は未保存state、selected Device、wizard step等を保持しない。保存済みdraftは永続化される。

## 14. Decisions deferred

この契約では次をCanonical確定しない。

- Work Context Linkの実table名
- migration SQL
- final Context Role enum
- Site schema
- Application schema
- Account schema
- FAQ schema
- Procedure schema
- Approved Knowledge schema
- Device Registry拡張列
- Search pagination方式
- final API response JSON
- UI visual design
- AI search implementation
