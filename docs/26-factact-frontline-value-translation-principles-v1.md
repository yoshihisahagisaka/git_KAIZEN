# FACTACT 現場価値翻訳原則 v1

Status: **CANONICAL — BUSINESS / FRONTLINE VALUE TRANSLATION**

この文書は、IT経営KAIZEN / FACTACTの確定した思想・Core構造を、現場担当者が理解できる具体的な機能・価値・メリットへ翻訳するためのBusiness Lane原則を記録する。

## 1. Business Laneの次の役割

IT経営KAIZEN / FACTACTの思想を内部概念のまま説明しない。

> **Coreは抽象度を維持する。顧客へのUX・商品説明は、現場が日常的に使う業務の言葉まで具体化する。**

FACTACT内部ではWork / Evidence / Fact / Relation / Decision / Change / Projection等で表現されていても、現場には「何ができるか」が分かる言葉で提示する。

例：

- 問い合わせ管理
- チケット・タスク管理
- IT資産・台帳管理
- Account管理
- SaaS・License管理
- 入退社IT管理
- Vendor管理
- 契約・更新管理
- 障害・Incident管理
- 棚卸・差分管理
- Knowledge管理
- 改善・課題管理
- 経営Decision管理
- IT経営Report

これらは現時点で全てを実装済みと断定する機能一覧ではない。Business Laneでの**顧客価値・UX翻訳候補**であり、標準提供機能として約束する前にProduct Laneの実装・FIT/GAPを確認する。

## 2. FACTACTの現場価値の中心

FACTACTの価値は「多くの管理機能を一つのSaaSに集めること」だけではない。

従来は、一つの仕事の後に複数の管理作業が発生しやすい。

> **仕事をする → 記録する → 台帳を更新する → 別の管理表を更新する → 集計する → 報告する**

FACTACTが目指す状態は異なる。

> **仕事をする → その仕事の結果として関連するFACT / Relation / Changeが更新される → 必要なViewへ反映される**

したがって中心価値は、

> **一つの仕事をすると、関連するデータがつながって変わる。管理のために同じ情報を何度も更新する仕事を増やさない。**

である。

これは、

> **KAIZENするために、KAIZENのための仕事を増やさない。**

というIT経営KAIZEN / FACTACTの原則を現場UXへ翻訳したものである。

## 3. Multi-Viewとしての業務機能

問い合わせView、Ticket View、Device View、Account View、License View、SaaS View、Vendor View、Management View等を、原則として別々の重複台帳・独立Coreとして作らない。

> **同じ仕事・同じFactを、それぞれの業務に必要な角度から見る。**

内部では同じCoreのFact / Relation / Work / Evidence / Change等を利用し、業務別の具体的UXはMulti-View / Projectionとして表現する。

> **UXは業務に合わせて具体化する。Coreは抽象度を維持する。**

## 4. 「一元管理」ではなく「仕事と情報をつなぐ」

FACTACTを単純な「IT情報の一元管理SaaS」として位置づけない。

既存のLanScope、Microsoft 365、SaaS、Excel / CSV、Vendor Report等に有効な情報が存在する場合、それらを不必要に置き換えない。

> **既存System + Vendor + Human Work → Connection → FACTACT Current State**

を基本とする。

> **情報を一箇所に集めることが目的ではない。仕事と情報をつなぎ、同じ情報を何度も管理しなくてよい状態をつくる。**

これは「置き換えます」ではなく「つなぎます」という既存のVendor Independence / Connection思想と一貫する。

## 5. 現場の仕事が経営改善のFACTになる

現場の日常Workを経営改善とは別の活動にしない。

例えば問い合わせ対応から、問い合わせ履歴、Incident、Device Fact、Evidence、Knowledge、KAIZEN候補等が形成され得る。

その蓄積から、

> **日常Work → FACT / NEW FACT → Gap / Risk → KAIZEN Option → Decision → ACT → CHANGE → NEW FACT**

へ接続する。

したがって現場向けの価値表現候補は、

> **日々のIT業務を、そのまま会社を良くするFACTに変える。**

とする。

また、より直感的なProduct表現候補として、

> **仕事をすると、会社のITが整理されていく。**

を保持する。

## 6. 経営価値と現場価値を同じFACTでつなぐ

### 現場価値

- 探す
- 覚えておく
- 追いかける
- 同じ情報を複数台帳へ転記する
- 集計する
- 報告資料を作り直す

といった「管理のための仕事」を減らす。

### FACTACT

日々のWork / ConnectionからFACT / UNKNOWN / CHANGE / Evidence / Relationを形成する。

### Core / atLIB

FACTをDecision / ACT / CHANGE / NEXT KAIZENへ接続し、IT経営KAIZENを継続管理する。

### 経営価値

ITの現在地、何が変わったか、何を決める必要があるかを事実から判断できる。

> **現場の仕事を楽にすることと、経営のIT判断を良くすることを別々の仕組みにしない。同じFACTでつなぐ。**

## 7. SaaS機能とCoreサービス価値を分けて説明する

Coreを販売する際は、次の二層で説明する。

### Layer A — FACTACTで現場ができること

問い合わせ管理、チケット管理、台帳管理、入退社管理、Vendor管理、契約更新管理、Incident管理、Knowledge管理、改善管理、Report等、現場が理解できる具体的な業務機能として提示する。

### Layer B — atLIBが担うIT経営KAIZEN

FACT Management、Decision Management、KAIZEN Management、Vendor / Work Orchestration、Management Reporting、Change Verification、NEXT KAIZENを継続管理する。

> **ツールを提供して終わりではない。FACTACT上の事実を使って、atLIBがIT経営KAIZENを回す。**

この二層によって「何ができるのか」と「なぜCoreに継続価値があるのか」を同時に説明する。

## 8. Product Laneとの境界

Business Laneは顧客価値・機能表現・Service Promiseを具体化するが、Product Laneの未実装機能を実装済みとして扱わない。

各具体機能について今後、少なくとも以下へ分類する。

- Core標準機能として提供可能
- 現行FACTACT Coreで表現可能
- Connection / Import前提
- Product Gapあり
- 将来機能候補
- Core対象外

新しい業務機能を提案するときは、既存CoreのMulti-View / Query / Connection / Relation / Projectionで表現できないかを先に確認する。

## 9. 判断基準

現場向け機能・UX・商品説明を追加する前に次を問う。

> **現場担当者が「自分の仕事で何ができるか」を具体的に理解できるか？**
>
> **その機能によって、同じ情報を別の場所へ二重入力する仕事を増やしていないか？**
>
> **一つのWorkの結果が、関連するFACT / Relation / Changeへつながる設計になっているか？**
>
> **既存SystemやVendorの有効な情報を不必要に置き換えていないか？**
>
> **現場で生まれたFACTが、最終的にDecision / KAIZEN / CHANGEへつながるか？**

この条件を満たす形で、思想を現場の具体的価値へ翻訳することをBusiness Laneの次の主要設計課題とする。