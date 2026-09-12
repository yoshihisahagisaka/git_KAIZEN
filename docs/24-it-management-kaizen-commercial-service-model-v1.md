# IT経営KAIZEN 商用サービスモデル v1

Status: **CANONICAL — BUSINESS / COMMERCIAL SERVICE MODEL**

この文書は、IT経営KAIZENの商品体系、価格、継続支援とAdvisoryの責任境界、およびatLIB自身の標準化原則を記録する。

## 1. 商品体系

IT経営KAIZENは、顧客ごとに多数のプランを作るのではなく、原則として次のサービス体系で設計する。

1. **DISCOVER — 無料IT経営診断**
   - 可能性を発見する。
2. **DESIGN / DECIDE — IT経営KAIZEN 設計Assessment**
   - EvidenceからFACT / UNKNOWNで現在地を形成し、経営がIT経営の次の一手をDecisionできる状態をつくる。
   - 標準価格：**120万円（税別）**。
3. **CHANGE — KAIZEN Project**
   - Decisionされた大きな変化を実装する。
   - 個別見積。
4. **CONTINUOUS KAIZEN — IT経営KAIZEN 継続支援 Core**
   - Assessmentで形成されたFuture / FACT / UNKNOWN / Decisionを引き継ぎ、Decision → ACT → CHANGE → NEW FACT → NEXT KAIZENを継続的に回す。
   - 標準価格：**月額49.8万円（税別）**。
5. **TRANSFER / ADVISORY — IT経営KAIZEN Advisory**
   - 顧客へKAIZEN運営責任を移管した後、atLIBが経営Review・助言を行う。
   - 標準価格：**月額20万円（税別）**。

FACTACTはこれらを分断された商品としてではなく、Evidence / FACT / Decision / ACT / CHANGE / NEW FACTを継続して扱うService Operating Platformとして支える。

## 2. 継続支援 Core の責任

継続支援 Coreは、時間・人月・作業件数を販売するサービスではない。

> **atLIBが、契約した責任範囲についてIT経営KAIZENの継続管理責任を持つサービスである。**

標準Core Responsibilityは次の7領域とする。

1. **FACT Management** — 重要Evidence、FACT、UNKNOWNを継続把握する。
2. **Decision Management** — 経営が判断すべき事項を明確にし、Decisionとその根拠を管理する。
3. **KAIZEN Management** — DecisionされたKAIZENを放置せず、ACTへ接続する。
4. **Vendor / Work Orchestration** — 社内、既存ベンダー、atLIBの仕事とEvidenceを横断して接続する。
5. **Management Reporting** — 技術・運用情報を経営判断できる情報へ変換する。
6. **Change Verification** — 「実施した」ではなく、実際に何が変わったかをEvidenceから確認する。
7. **NEXT KAIZEN** — NEW FACTから次の改善・Decision候補へ接続する。

> **既存ベンダーや社内ITの仕事を不必要に奪わず、今ある仕事・情報・仕組みを活かしながら、切れている接続だけをKAIZENする。**

## 3. 継続支援 Core の標準運営

顧客ごとに異なるサービスを作らず、可能な限り共通Workflowで提供する。

### Monthly

- Evidence / FACT / UNKNOWN更新
- ACT進捗確認
- CHANGE / NEW FACT確認
- Risk / Impact確認
- Decision Required整理
- Management Review
- NEXT KAIZEN候補整理

### Quarterly

- Company Future / Theme FutureとのGap確認
- KAIZEN Portfolio Review
- IT投資・Risk Review
- Management Decision Review

### Annual

- Assessment時点または前年Baselineとの比較
- ACT / CHANGE / NEW FACTのAnnual Review
- 次年度IT経営KAIZEN方針の確認

成果を会議回数・資料数・提案件数で定義しない。新しいDecisionが不要であれば「新たな経営Decisionは不要」という確認も正しい結果である。

## 4. Coreに含めないもの

Coreを「ITのことなら何でも対応する」サービスにしない。

日常のHelpdesk、Account、Device、SaaS運用、監視等のOperational Responsibilityや、継続的なTechnology ResponsibilityをatLIBが担う場合は、Coreのプラン分岐を増やすのではなく、別の責任・実行契約として扱う。

大規模Migration、新規System開発、Network全面更改、大量PC Refresh、M&A IT統合、大規模Security導入等は原則として**KAIZEN Project**として別途扱う。

Coreは必要性の確認、Decision支援、Project Governance、実施後のCHANGE確認を担うことができるが、大規模実装工数そのものを無制限に月額内へ含めない。

## 5. 商品分岐を増やさない

> **顧客ごとの分岐を増やさず、atLIB自身もKAIZENのための仕事を増やさない。**

Lite / Standard / Pro等の細かなプラン分岐を基本設計にしない。

全顧客で可能な限り、同じSemantic、Workflow、FACTACT、AI支援、Human Review、Management Review、Report構造を利用する。

違うのは顧客のFACTとDecisionであり、サービス提供方法そのものを顧客ごとに作り直さない。

標準Scopeを大きく超える企業のみ個別設計・個別見積とする。

この標準化は単なる運用効率化ではなく、常駐支援型の労働集約ビジネスからITコンサルティング事業へ転換するための事業設計原則である。

## 6. 継続支援 CoreからAdvisoryへの責任移管

CoreとAdvisoryは価格差による上位・下位プランではない。

> **Core → Advisoryは価格変更ではなく、KAIZEN運営責任のatLIBから顧客への移管である。**

### Core

atLIBが主体となって、FACT Management、Decision Management、KAIZEN Management、Vendor / Work Orchestration、Management Reporting、Change Verification、NEXT KAIZENを継続管理する。

### Advisory

顧客自身がFACTACTを利用し、FACT / UNKNOWN、Decision、ACT、CHANGE / NEW FACT、Management Reviewを主体的に運営する。

atLIBは主に次を行う。

- 月次Management / KAIZEN Review
- FutureとのGap Review
- 重要FACT / UNKNOWN Review
- Risk / Impact Review
- Decision Requiredへの助言
- KAIZEN Optionへの助言
- CHANGE / NEW FACT Review
- NEXT KAIZENへの助言
- 四半期IT Management Review

Advisoryでは原則として、atLIBはEvidence収集、日々のACT追跡、Vendor追跡、Management Reportのゼロからの作成、FACTACTへの代理入力、日常Operationsを主体的には行わない。

## 7. Advisory移行条件

AdvisoryはCoreの廉価版として誰でも選択できる商品にしない。

顧客が次の状態へ到達し、KAIZEN運営責任を自社へ移管できることを確認してから移行する。

1. **FACT運営** — 顧客自身で必要Evidenceを取得し、FACT / UNKNOWNを混同せず管理できる。
2. **Decision運営** — Decision Requiredを識別し、適切なAuthorityへ接続し、Decisionと理由を記録できる。
3. **ACT運営** — DecisionされたKAIZENを自社・Vendorへ割り当て、進行を追跡できる。
4. **CHANGE確認** — 「実施した」で終わらず、EvidenceからCHANGE / NEW FACTを確認できる。
5. **Management Review** — IT情報を経営判断できる形で自社のManagement Reviewへ接続できる。
6. **Vendor / Work管理** — 既存Vendorや社内担当の責任・Evidence・成果を自社で管理できる。
7. **NEXT KAIZEN** — NEW FACTとFutureとのGapから次のKAIZEN候補を形成し、経営Decisionへ接続できる。

移行判定を単純な成熟度スコアにはしない。各条件をEvidenceから確認し、満たしていない条件はUNKNOWNまたはGapとして扱う。

## 8. 内製化・卒業を成功として扱う

IT経営KAIZENの目的はatLIBへの永続依存ではない。

> **顧客自身がFACT → Decision → ACT → CHANGE → NEW FACT → NEXT KAIZENを継続的に回せる状態は、IT経営KAIZENの成功状態の一つである。**

したがってLifecycleは次を許容する。

> **Assessment → Core → Responsibility Transfer → Advisory → Self-Run / FACTACT利用 / 完全卒業**

顧客が自走可能になった後、atLIBが月額売上を維持するためだけに不要な仕事を残さない。

これは、

> **KAIZENするために、KAIZENのための仕事を増やさない。**

という原則をatLIB自身の商用モデルにも適用したものである。

## 9. Human Work設計

価格を時間売りとして説明しないが、atLIB側の採算・Scaleを管理するためHuman Workは計測する。

現時点の設計目標は以下とする。

- **継続支援 Core：10〜15 Human hours / 月 / 社を目標レンジとして設計・検証する。**
- **Advisory：4〜5 Human hours / 月 / 社を目標レンジとして設計・検証する。**

これらは顧客への契約時間ではなく、atLIB内部のOperating Model上の目標である。実案件でFACTとして計測し、必要に応じて再設計する。

## 10. 現時点の価格

- 無料IT経営診断：**無料**
- IT経営KAIZEN 設計Assessment：**120万円（税別）**
- IT経営KAIZEN 継続支援 Core：**49.8万円 / 月（税別）**
- IT経営KAIZEN Advisory：**20万円 / 月（税別）**
- KAIZEN Project：**個別見積**
- Operational / Technology Responsibility：**別途設計・契約**

価格は責任と顧客価値を表すものであり、単純な人月・作業時間換算を顧客価値の中心にしない。

## 11. 事業設計の判断基準

新しいプラン、オプション、成果物、会議、レポート、管理作業を追加する前に次を問う。

> **これは顧客のFACT → Decision → ACT → CHANGE → NEW FACT → NEXT KAIZENを良くするか？**
>
> **同時に、atLIB自身に不要な分岐・管理・作業を増やしていないか？**

両方を満たさないものは、単に売りやすい、見栄えが良い、顧客ごとに要望されたという理由だけで標準サービスへ追加しない。