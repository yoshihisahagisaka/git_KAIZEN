# FACTACT Connection / Multi-View / AI OFF Principles v1

Status: **CANONICAL — BUSINESS / PRODUCT DESIGN INPUT**

この文書は、IT経営KAIZEN Business Laneで確認した、FACTACTの日常運用・外部情報接続・Multi-View・AI利用境界に関する設計原則を記録する。

本書は現行FACTACT Core Architectureの変更や新Core Object追加を決定するものではない。Product Laneでは既存Coreを優先し、必要に応じて FIT / GAP / CONFLICT / UNKNOWN を確認する。

## 1. 基本原則

日常のIT運用は、Device、Account、License、SaaS、Vendor、棚卸、Incident等の業務名で見ると複雑に見えるが、FACTACTでは可能な限り共通構造として扱う。

> **複雑な現実を、業務ごとの複雑なCore構造として再現しない。FACT主義で構造化する。**

FACTACTの基本思想を優先し、新しい業務要求が出た場合も、まず既存のFact / Evidence / Relation / Work / Decision / Change / Connection / Projection等で表現できないかを確認する。

## 2. 日常WorkだけでFACT形成を待たない

日常WorkからFACT / NEW FACTが蓄積されることは重要である。一方、日常Workだけでは既存環境の全体像形成に長期間を要する場合がある。

そのため、年次棚卸、System情報、Vendor Report、Document、Humanによる確認等も、現在状態へ情報を接続する機会として扱う。

AssessmentまたはBaseline形成に相当する確認イベントは初回限りとは限らない。Core運用中にも、棚卸、外部情報取込、組織変更、環境変更等を契機として繰り返し発生し得る。

## 3. 棚卸もSystem取込もConnectionとして扱う

人が行う棚卸と、LanScope等のSystemから取得する情報は、情報源や確認方法は異なるが、FACTACTから見た基本構造は同じConnectionとして扱える。

例：

- Human棚卸 → Connection → FACTACT
- LanScope → Connection → FACTACT
- Excel / Document → Connection → FACTACT
- Vendor Report → Connection → FACTACT
- 日常Work → FACTACT上の状態更新

Sourceごとに専用Coreを作ることを基本方針としない。

## 4. Difference → Human Review

外部Connectionから取り込んだ情報と、FACTACTが現在認識している状態が一致しない場合、Systemは差分を提示する。

基本Loop：

> **Connection → Current Stateとの比較 → Difference → Human Review → FACT / UNKNOWN / 必要なACTの更新**

Systemは、単に情報が取り込まれたことを理由に、どちらが正しいかを自動確定しない。

人間が確認し、必要に応じてFACTACT側を更新する、外部情報側を修正する、追加確認する、UNKNOWNとして残す等を判断する。

棚卸を実施したこと自体を「100%正しいFACTが形成された」とはみなさない。ただし、このために複雑な信頼度スコアや業務別精度モデルを標準設計へ追加しない。

## 5. UXは業務別、Coreは共通 — Multi-View

運用者のUXとして、以下のような業務別入口を提供することは許容する。

- 資産管理
- SaaS管理
- Account管理
- License管理
- Vendor管理

ただし、これらを原則として個別の専用Coreや重複台帳として実装しない。

> **UXは業務に合わせて具体化する。Coreは抽象度を維持する。**

同じFACTACT Coreを、目的に応じたMulti-View / Projectionとして表示する。

同一のFact / Relation / Work / Change等を複数Viewから参照できるようにし、Viewごとに同じ情報を重複保持・重複更新する仕事を増やさない。

## 6. Management View / Preset Query

管理者が頻繁に調べる問いについては、あらかじめボタンやViewとして提供できる。

例：

- 更新期限が近い対象
- 未使用License候補
- 退職者に紐づくActive Account
- 長期間更新されていない対象
- 未解決UNKNOWN
- 停滞しているACT
- Decision Required
- Vendor依存に関する確認

これらは個別の管理Systemを増やすのではなく、既存FACTACT Coreに対する決められたFilter / Query / Relation / Cross Aggregation / Projectionとして実現することを基本とする。

Presetの結果から根拠となるFact / Evidenceへ追跡できることを重視する。

## 7. AI OFFでも基本業務を成立させる

FACTACTの基本業務は、原則としてAI OFFでも成立するよう設計する。

AI OFFでも成立させる対象の例：

- 記録
- Connection / Import
- Relation
- Difference検出
- Filter / Query
- Cross Aggregation
- Preset Query
- Multi-View / Projection
- Workflow
- Human Review
- Decision記録
- ACT管理
- CHANGE / NEW FACT記録

> **AIが停止すると基本業務が成立しないSystemを前提としない。**

定型的に判定・集計できるものは、可能な限り決定論的なSystem処理として扱う。

## 8. AIの主な役割

AIはFACTを勝手に生成・確定する主体ではなく、FACTACTに存在する情報をもとに人間の分析・探索・判断を支援する。

主な役割は次の2つとする。

### 8.1 Query Assistant

Presetに存在しない問いをHumanが自然言語で入力した場合、AIが問いを解釈し、FACTACTのQueryへ変換する。

> **Human Question → AI Interpretation → System Query → FACT Result → AI Explanation → Human**

AIが検索結果そのものを想像して生成するのではなく、Systemが返した結果を基礎とする。

### 8.2 KAIZEN Advisor

Preset Queryや自由Queryで取得されたFACTをContextとして、AIが次をSuggestする。

- Risk / Impact候補
- 確認すべき事項
- Hypothesis
- Root Cause候補
- KAIZEN Option
- 次に確認すべきFACT / UNKNOWN
- Management向け説明案

FACT / UNKNOWNとAIによるHypothesis / Proposalを混同しない。

既存原則：

> **AI Suggests. Human Decides. System Records.**

を維持する。

## 9. PresetはKnowledgeとしてKAIZENする

最初から全ての分析機能を作り込まない。

実際のAssessment / Core運用で頻繁に使われる問いをPreset Query / Viewとして標準化し、使われないものは見直す。

> **よく使う問いはPresetにする。Presetにない問いはAIで探索する。繰り返し使われる問いはPreset化を検討する。**

これにより、atLIBのIT経営KAIZEN KnowledgeをFACTACTのUXへ徐々に反映する。

## 10. Product Laneへの影響

現時点では、本Business整理を理由としてFACTACT Product Laneの現行開発を停止・再設計する要求はない。

また、次の専用Core Object追加を要求しない。

- Device管理専用Core Object
- SaaS管理専用Core Object
- License管理専用Core Object
- 棚卸専用Core Object
- AI Confidence専用Core Object

Product Laneで確認価値がある論点は以下である。

1. 異なるSourceからのConnectionを既存Coreで表現できるか。
2. External StateとCurrent ContextのDifferenceを提示しHuman Reviewへ接続できるか。
3. 業務別UXをMulti-View / Projectionとして実現できるか。
4. Preset Query / Filter / Cross Aggregationを既存Core上に構築できるか。
5. AIがCoreのFACTをQueryし、その結果をContextとしてSuggestする境界を維持できるか。

Product Laneでは新Core Object追加を前提とせず、既存Core firstで FIT / GAP / CONFLICT / UNKNOWN を確認する。

## 11. Service Designへの意味

IT経営KAIZEN Coreは、Device管理、License管理、SaaS管理等を個別商品として無制限に追加することを意味しない。

日常Workや外部Connectionから必要な情報をFACTACTへ接続し、現在状態、Difference、Decision、ACT、CHANGE、NEW FACTへつなげる管理LoopはCoreのFACT Management / Decision Management / KAIZEN Managementと整合する。

一方、PCキッティング、現物棚卸の実施、管理Console操作、Network設定等の実ExecutionをatLIBが継続的に担う場合の責任・契約境界は、商用サービスモデルに従い別途扱う。

## 12. 判断基準

新しい日常運用要件や管理要件が出た場合、まず次を問う。

> **これはFACTACTの既存FACT主義とCore構造を、Multi-View / Query / Connectionとして使えば表現できないか？**

> **業務別機能を追加することで、同じFactを複数箇所に持ち、管理のための仕事を増やしていないか？**

> **AI OFFでも基本業務は成立するか？**

> **AIはFACTを作っているのではなく、FACTからSuggestしているか？**

これらを満たす範囲では、FACTACTの基本思想から外れずにUXと利用範囲を拡張する。