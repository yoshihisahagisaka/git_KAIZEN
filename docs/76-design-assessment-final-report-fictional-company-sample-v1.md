# IT経営KAIZEN — 設計Assessment 最終報告書 Fictional Company Sample v1

Status: **SUPERSEDED PROTOTYPE — DO NOT USE AS STANDARD CUSTOMER DELIVERABLE**
Date: 2026-09-14
Superseded by principles in: `docs/77-it-management-kaizen-customer-language-and-assessment-deliverable-principles-v1.md`
Parent Method: `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`

## 0. Why this prototype was superseded

本Sampleは、設計AssessmentのCustomer Outputを具体化する初期Prototypeとして作成したが、Business Reviewにより以下の問題が確認された。

1. **120万円の成果物としては総評的で薄い。**
   - 判断の裏にあるEvidence / FACTが十分に見えない。
   - FACT → GAP → ROOT CAUSE → ACTのTraceabilityが弱い。

2. **改善プランとRoadmapの対応関係が不明確。**
   - 複数Scenarioを提示した後にRoadmapが一本だけで、どのScenarioを選んだRoadmapなのか分からない。
   - 今後は改善プランごとにRoadmap / Investment / Expected Change / Riskを持つ。

3. **顧客向け資料として英語・専門用語が多い。**
   - FUTURE / FACT / UNKNOWN / GAP / ROOT CAUSE / ACT / CHANGE / Management Scenario等は内部Conceptとして有効だが、そのまま顧客向け見出しに多用しない。
   - 顧客向けは経営者が判断できる自然な日本語を第一とする。

4. **経営判断編と調査・分析編の二層構造が不足。**
   - 今後は「経営者が分かる本編」と「なぜそう言えるかを証明する調査・分析編」を分ける。

## 1. Historical purpose only

このPrototypeが検証しようとした要素自体は保持する。

- 実現したい会社の姿から考える
- 確認できた事実 / 未確認事項を分ける
- 原因を確認する
- 複数の改善案をつくる
- 経営の優先事項によって選択肢を変える
- 複数年で段階投資する
- 実行後の変化を確認して次を決める

ただし、Customer-facing Standardとして本書の9ページ構成・英語中心表現・単一Roadmap構造を再利用してはならない。

## 2. Replacement direction

次版の設計Assessment Sampleは以下の二層で再設計する。

### A. 経営判断編
- 実現したい会社の姿
- 重要な事実 / 未確認事項
- 目指す姿とのギャップ
- なぜ起きているのか
- 事実から改善案へ至るつながり
- 改善の選択肢
- 改善プラン比較
- **改善プランA → 複数年改善計画A → 投資A → 期待する変化A / 注意点A**
- **改善プランB → 複数年改善計画B → 投資B → 期待する変化B / 注意点B**
- 必要なら改善プランCも同様
- atLIBとしての提案と根拠
- 経営者が決めること
- 選択した改善計画
- 実行後の確認方法

### B. 調査・分析編
- 確認資料一覧 / 出所
- System / Account / Device / SaaS / Network / Security
- 業務Flow / Workload / Cost
- Organization / Responsibility / Governance
- Interview findings
- FACT / UNKNOWN / Hypothesis
- 各改善案を支えるEvidence

## 3. Language rule

Customer-facing Sampleでは、内部Canonical用語を必要以上に表へ出さない。

例：

- FUTURE → 実現したい会社の姿
- FACT → 確認できた事実
- UNKNOWN → まだ確認できていないこと
- GAP → 目指す姿とのギャップ
- ROOT CAUSE → なぜ起きているのか
- ACT Options → 改善の選択肢
- Management Scenario → 改善プラン
- Roadmap → 改善計画
- Expected CHANGE → 期待する変化
- Human Decision → 経営者の判断
- Evidence → 判断の根拠 / 確認資料

詳細はdoc77を正とする。

## 4. FACT FIRST

本書は失敗として削除しない。

> **Prototypeで分かったことをFACTとして残し、次の設計へ反映する。**

この文書はHistorical Prototype / Learning Recordとして保持する。
