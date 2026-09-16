# IT経営KAIZEN × FACTACT — Business / Product Lane Responsibility & Handoff Principles v1

Status: **CANONICAL — CROSS-LANE GOVERNANCE**
Date: 2026-09-16

Related:
- `docs/20-it-management-kaizen-factact-consistency-principles-v1.md`
- `docs/23-assessment-factact-reporting-consistency-v1.md`
- `docs/28-service-desk-work-reporting-model-v1.md`
- `docs/29-it-management-kaizen-continuous-support-product-spec-v1.md`
- `docs/85-it-management-kaizen-continuous-support-operating-model-v1.md`

---

## 1. Purpose — DECIDED

IT経営KAIZENのBusiness DesignとFACTACT Product Designが互いの責任範囲へ不用意に入り込み、商品要件とSystem設計が混同されることを防ぐ。

> **Business Laneは「顧客に何を提供するか」を決める。Product Laneは「FACTACTでどう実現するか」を決める。**

Business LaneからFACTACT Coreを安易に再設計しない。一方、Product Laneが顧客価値・商品Scope・価格・顧客Outputを独自に決定しない。

既存FACTACT設計を優先して確認し、Business RequirementとのFitを確認してから追加設計を検討する。

---

## 2. Business Lane Responsibility — DECIDED

Business Laneが主にDecisionする対象：

- IT経営KAIZENの商品定義・顧客価値
- Customer Journey
- 商品Scope / Boundary
- Pricing / Commercial Rules
- ICP / Sales Story
- Assessment / 継続KAIZEN支援等の商品上の役割
- Monthly / Quarterly / Annual等のService Cadence
- 顧客が受け取る標準Outputの目的・内容・意味
- 顧客向け日本語・説明・見せ方
- 顧客がOutputを見た結果、何を理解・確認・Decisionできる必要があるか
- Product Laneへ渡すBusiness Requirement

Business Laneは、顧客Outputを定義する際にも、既存FACTACT Canonical / Design Principlesを確認してから設計する。

---

## 3. FACTACT Product Lane Responsibility — DECIDED

FACTACT Product Laneが主にDecisionする対象：

- Business Requirementと既存FACTACT設計のFIT / GAP / CONFLICT / UNKNOWN確認
- Core Object / State / Relation / Event / Action等のProduct Architecture
- Query / Aggregation / Difference / Projection / View等のSystem設計
- KPI算出・取得・表示に必要なProduct仕様
- AI支援のApplication / Product設計
- Report生成方式
- UI / Dashboard / Export / PDF等の実現方式
- Authority / Audit / Evidence / Verification等のSystem実装
- Application / Translation LayerとCoreの責任境界
- 真のCore GAPが確認された場合のCore変更判断

Product Laneは、Business Requirementを実現するために既存Coreで表現可能かを先に確認する。

---

## 4. Handoff Flow — DECIDED

標準Handoffは以下とする。

> **Business Lane**
> → Customer Value / Service Scope / Business Outputを定義
> → Business Requirementを形成
> → **FACTACT Product LaneへHandoff**
> → 既存FACTACTとのFIT / GAP / CONFLICT / UNKNOWN確認
> → Product / Application Design
> → 必要に応じてBusiness Laneへ確認・Decision Request

Product Laneの確認結果は原則として以下で返す。

### FIT
既存FACTACT Core / Product Principle / View等で表現可能。Business Lane側でCore追加を行わない。

### GAP
Business Requirementは妥当だが、Application / Translation / Product Capability等の追加が必要。Product Laneで設計する。

### CONFLICT
Business Requirementが既存FACTACT原則・Canonicalと矛盾する。Product側で勝手に解消せず、Business Laneへ返してDecisionする。

### UNKNOWN
現時点のEvidence / Requirementだけでは判断できない。必要な確認事項を明示する。

### Core GAP
既存CoreではBusiness Requirementを適切に表現できないことが確認された場合のみ、Product LaneでCore変更を検討する。

---

## 5. Timing of Product Lane Handoff — DECIDED

Business Laneは、議論のたびに細かなProduct質問をProduct Laneへ送らない。

以下のいずれかに達した時点で、適切なまとまりとしてProduct LaneへHandoffする。

1. Business Output / Business Requirementが、Product側でFIT確認できる粒度まで具体化したとき
2. Business Decisionを進めるために、FACTACTで実現可能かの確認が必要になったとき
3. 既存FACTACT設計とのCONFLICTの可能性が生じたとき
4. Core変更が必要に見えるRequirementが生じたとき
5. Product実装へ渡せる一つのBusiness Use Case / Output Specificationがまとまったとき

Business Laneで顧客価値・商品仕様が未整理のままProduct Laneへ丸投げしない。一方、実現方式をBusiness Laneで先回りして固定しない。

---

## 6. Monthly KAIZEN Report Responsibility — DECIDED

月次KAIZENレポートについては、以下の分掌とする。

### Business Lane

- 継続KAIZEN支援における月次Reportの目的
- 顧客が毎月何を確認できる必要があるか
- 顧客向け標準Output構成
- Customer-facing wording / Translation
- Monthly / Quarterly / Annualの役割分担
- 継続KAIZEN支援の標準Scopeに含める内容
- Decision Required等を顧客へどう提示するか

### FACTACT Product Lane

- 必要なFACT / Evidence / Relation / Difference / Trend等の取得・集計方式
- 既存Core / View / Query等とのFIT
- KPI算出ロジックのProduct実現
- AI OFFで成立する基本集計の実現方式
- AI所感 / Suggestの生成方式
- Human Review Flow
- Report / Dashboard / Export等の実現方式
- Application / Translation Layerでの追加要件

月次KAIZENレポートのためにBusiness Laneから専用Core Objectや独自KAIZEN Score等を追加しない。

既存Canonicalの以下を前提とする。

> **FACTACT集計 → AIによる所感・注目点・確認事項・KAIZEN候補の作成支援 → Human Review → 顧客Report**

> **FACTACTが事実を集計する。AIがなくても基本Reportは成立する。**

Business Laneではこの既存原則を顧客商品へTranslationする。

---

## 7. Cross-Lane Guardrails — DECIDED

- Business LaneはFACTACT Coreを商品都合だけで変更しない。
- Product Laneは商品価値・価格・顧客Scopeを独自決定しない。
- Business RequirementをそのままCore Objectへ変換しない。
- Product Capabilityを理由にBusiness価値を不必要に歪めない。
- 既存FACTACT Canonicalを確認せずに新規設計を開始しない。
- Business側で実現方式を決め打ちしない。
- Product側で顧客向けOutputを技術都合だけで決めない。
- CONFLICTは隠して妥協せず、Decision対象として明示する。
- UNKNOWNを推測でFIT扱いしない。
- Cross-Lane Handoffでは、FACT / DECISION / REQUIREMENT / UNKNOWNを区別する。

---

## 8. Operating Rule — DECIDED

Business Laneで商品設計を進める際、Product Laneへの確認・指示が必要になった場合は、Business Lane側で適切なHandoffタイミングを判断し、Product Laneへ渡せる形のBusiness Requirement / Fit Check Requestを作成する。

ユーザーが毎回Product Laneへの移管タイミングを判断することを前提としない。

ただし、Business LaneからProduct Laneへ渡す内容は、Business DecisionとProduct Design Decisionを混同しない。

> **Business decides WHAT / WHY for the customer. Product decides HOW in FACTACT.**
