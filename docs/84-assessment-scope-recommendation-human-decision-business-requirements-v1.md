# IT経営KAIZEN 設計Assessment — Scope Recommendation / Human Decision Business Requirements v1

Status: **CANONICAL — BUSINESS / DEVELOPMENT HANDOFF**
Date: 2026-09-16
Related:
- `docs/26-free-it-management-diagnosis-survey-v2-question-set-v1.md`
- `docs/81-design-assessment-pricing-governance-and-internal-sales-language-v1.md`
- `docs/82-design-assessment-standard-scope-boundary-v1.md`
- `docs/83-assessment-scope-commercial-adjustment-rules-v1.md`

---

## 1. Purpose

本書は、IT経営KAIZEN 設計AssessmentのCOMPACT / STANDARD / REVIEW / EXPANDED判定について、Business側からDevelopment Laneへ渡すApplication / Translation Layer要件を定義する。

営業担当者に内部の確認負荷6軸やFACTACT内部用語の理解・採点を要求しない。

> **システムが既に取得済みの情報を再利用してScope候補・理由・不足情報を整理し、Humanが最終的なScopeと価格をDecisionする。**

---

## 2. Core Business Rule — DECIDED

Scopeは企業規模そのものではなく、

> **経営判断に必要なFACTを確認するために、どの程度の確認作業が必要になるか**

によって判断する。

システム内部では `docs/83` で定義した以下の6軸を判断材料として扱える。

1. 対象範囲
2. 情報の分散
3. 管理主体の分散
4. エビデンス確認難易度
5. ヒアリング負荷
6. 特殊調査要件

ただし、営業担当者や顧客へこの6軸の暗記・採点を要求しない。

---

## 3. Progressive Information Reuse — DECIDED

Scope Recommendationのために、新しい一律の見積専用Surveyを顧客へ要求しない。

原則として以下を再利用する。

- Survey v2
- 60分診断
- Human Review済み情報
- 経営フィードバックまでに確認された情報
- その他、同一顧客について既に確認済みで再利用可能な情報

Scopeを判断するために不足している事項だけを追加確認する。

既に回答・確認済みの事項を、見積工程になったことだけを理由に再度質問しない。

顧客・営業向け原則：

> **すでに確認できた情報はそのまま使い、見積に必要な不足情報だけを追加で確認します。**

---

## 4. Scope Recommendation Output — DECIDED

システムが営業担当者へ提示する中心情報は、内部スコアではなく次の3点とする。

### 4.1 Scope候補

- COMPACT
- STANDARD
- REVIEW
- EXPANDED

### 4.2 候補理由

営業担当者が顧客へ説明可能な日本語で、なぜそのScope候補なのかを示す。

例：

> IT全体を把握している担当者がおり、主要な資料の所在も確認できているため、比較的少ない追加確認で会社全体の状況を確認できる見込みです。

### 4.3 追加で確認すること

Scope Decisionに必要だが、まだ確認できていない事項だけを提示する。

例：

> ネットワーク管理を委託している会社から、現在の構成資料を取得できるか確認してください。

追加確認事項がない場合は、無理に質問を生成しない。

---

## 5. REVIEW as Safety State — DECIDED

REVIEWは価格プランではなく、

> **分からないことを推測して見積を確定しないための内部確認状態**

として扱う。

COMPACT / STANDARD / EXPANDEDを判断するための重要情報が不足している場合、システムは無理にScopeを決めずREVIEWを提示できる。

REVIEW時には、可能な限り次を示す。

1. なぜ現時点で判断できないのか
2. 何を追加確認すれば判断できるのか

例：

> 現時点ではScopeを確定できません。IT管理を複数の会社へ委託していることは確認できていますが、それぞれの管理範囲と社内での管理状況がまだ確認できていません。

営業担当者が推測で80万円 / 120万円を選ぶことを標準運用にしない。

---

## 6. Sales-facing Translation — DECIDED

営業担当者に「情報分散」「管理主体分散」「Evidence Difficulty」等の内部概念を説明・採点させない。

必要な場合は通常の日本語の確認へ翻訳する。

代表的な確認例：

- **御社のIT全体について、一番詳しい方はどなたですか？**
- **PC・アカウント・システム・ネットワークなどの資料は、どなたに確認すれば集められそうですか？**
- **ITを複数の会社へ依頼されていますか？ その場合、誰が何を担当しているか社内で把握されていますか？**
- **部門や拠点によって、使っている仕組みや運用方法は大きく違いますか？**

これらを固定質問票として一律に聞くことは要求しない。既存情報から回答できるものは再質問しない。

---

## 7. COMPACT / STANDARD Sales Interpretation — DECIDED

営業教育では、厳密な内部定義の暗記ではなく、次のような意味の違いを理解できればよい。

### COMPACTになりやすい状態

- 誰に確認すればIT全体が分かるか明確
- 必要な資料・情報の所在が概ね分かる
- IT環境・運用が比較的共通化されている
- 管理主体が比較的集約されている
- 少数の主要関係者への確認で全体像を作れる
- 情報の大規模な突合が必要ない

### STANDARDになりやすい状態

- 複数の情報源から収集が必要
- 複数部門・担当者・ベンダーへ確認が必要
- 部門・拠点等によってIT環境・運用差がある
- 資料・台帳・設定等の整理や突合が必要
- 通常のAssessment確認負荷が見込まれる

ただし、これらを単純なAND条件・点数表にしない。

> **会社の大きさではなく、必要な事実を確認するためにどれくらい確認作業が必要かで判断する。**

---

## 8. Customer-facing Pricing Presentation — DECIDED

COMPACT / STANDARDを顧客が自由に選択する松竹梅型料金プランとして販売しない。

顧客向けの基本提示はSTANDARDを中心とする。

> **IT経営KAIZEN 設計Assessment　標準価格 120万円（税別）**
>
> 調査対象やIT管理状況から、経営判断に必要な確認作業が比較的少ない場合には、COMPACT Scope 80万円（税別）でご提供できる場合があります。通常以上の調査が必要な場合は、追加Scopeをご相談します。

COMPACTは顧客が「安い方を選ぶ」プランではなく、確認負荷からatLIBが適用可能と判断するScopeである。

価格ガバナンスの正式ルールは `docs/83` を参照する。

---

## 9. Human Decision UX Requirement — DECIDED

システムのRecommendationはDecisionではない。

Humanが最終確定する際には、少なくとも次を確認できる状態にする。

- 推奨Scope
- 推奨理由
- 重要な確認済み情報
- Scope判断に関係する残存UNKNOWN
- 追加確認を実施した場合はその結果
- 提案価格
- 値引きがある場合の理由・承認要否

HumanはRecommendationを採用することも、別Scopeへ変更することも、REVIEWへ戻すこともできる。

システムRecommendationと異なるDecisionをした場合、その理由を記録できるようにする。

---

## 10. Decision Record — DECIDED

見積確定時には `docs/83` の要件に従い、少なくとも以下を固定保存する。

- 見積時点で確認済みの状態
- 残存UNKNOWN
- 想定調査範囲
- 想定確認負荷と根拠
- System Recommendationと理由
- Humanが決定したScope
- Humanが決定した価格
- Recommendationと異なる場合の理由
- 値引き理由・承認情報
- Decision日時・決定主体

後から新しいFACTが得られても過去Decisionを上書きしない。

---

## 11. FACT-based Improvement Loop — DECIDED

実案件では、Recommendationの妥当性を将来改善できるようにする。

> **見積時のRecommendation / Human Decision → 実際のAssessment確認負荷 → 差異 → NEW FACT → 次のRecommendation改善**

確認する対象には、少なくとも以下を含む。

- COMPACT / STANDARD / EXPANDEDのRecommendationと最終Decision
- 実際の確認工数
- 当初想定外の確認作業
- Scope変更の有無
- Recommendationが外れた場合の理由
- 分析 / Human判断支援工数
- 成果物生成工数

初期のルールや文言を永久的な自動判定ロジックにしない。

---

## 12. Development Fit / Gap Request

Development Laneは、本書をBusiness Decisionとして現行実装・設計とのFit / Gapを確認する。

特に以下を確認する。

1. 既存のSurvey v2・60分診断・Human Review・経営フィードバック情報からScope判断材料を再利用できるか。
2. 不足情報だけを追加確認するUXをApplication / Translation Layerで実装できるか。
3. COMPACTを既存STANDARD / REVIEW / EXPANDED Scope Recommendationへ追加できるか。
4. Scope候補・理由・不足情報を営業向け日本語で提示できるか。
5. REVIEWを「推測で見積しない安全状態」として扱えるか。
6. HumanがRecommendationを採用・変更・保留できるか。
7. RecommendationとHuman Decision、その理由を固定保存できるか。
8. 後からNEW FACTによってScope変更が発生した際、過去Decisionを上書きせず履歴化できるか。
9. 見積時の想定確認負荷と実際のAssessment負荷を将来比較できるか。
10. これらにFACTACT Core変更が必要か、それともApplication / Translation Layerで実現可能か。

CONFLICT / GAP / UNKNOWNがある場合は、Business Decisionを推測で変更せずBusiness Laneへ返す。

---

## 13. Guardrails

- 営業担当者に内部6軸の暗記・採点を要求しない。
- 顧客にScope判定専用の追加Surveyを一律要求しない。
- 既に確認済みの事項を再質問しない。
- System Recommendationを自動Decisionにしない。
- 数値件数だけでScopeを決めない。
- REVIEW時に推測で価格を確定しない。
- COMPACTを顧客が自由に選ぶ廉価プランとして扱わない。
- STANDARD案件を値引き目的でCOMPACTへ変更しない。
- Recommendationと異なるHuman Decisionを禁止しない。理由を記録する。
- 新しいFACTで過去のDecision Recordを上書きしない。
- 顧客・営業へFACTACT内部用語の理解を要求しない。
