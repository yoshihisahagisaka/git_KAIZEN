# IT経営KAIZEN 顧客適合性チェック（Pre-Sales Qualification）Business Decision v1

Status: **CANONICAL — BUSINESS DECISION RECORD**
Date: 2026-09-18

Related:
- `docs/17-it-management-kaizen-business-service-canonical-v1.md`
- `docs/18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
- `docs/21-free-it-management-diagnosis-operating-model-v1.md`
- `docs/86-business-product-lane-responsibility-and-handoff-principles-v1.md`

---

## 1. Purpose — DECIDED

営業担当者が「IT経営KAIZENを提案すべき顧客かどうか」を感覚だけで判断せず、FACT / UNKNOWN / 営業仮説（HYPOTHESIS）を分離して確認し、最終的に人（Human Decision）が判断できるようにするための、軽量な事前確認の仕組みを導入する。

これは新しい事業・製品ではなく、`17-it-management-kaizen-business-service-canonical-v1.md` が定めるIT経営KAIZENの事業方針・FACT FIRST原則を、**営業が無料診断を提案する前**の場面に適用したBusiness Decisionである。

---

## 2. 位置づけ — DECIDED

`21-free-it-management-diagnosis-operating-model-v1.md` §1の工程表（申込 → 事前アンケート → AI事前整理 → 診断準備 → 60分診断 → 診断後整理 → レポート → 経営フィードバック → Assessment提案）は、顧客が無料診断に申し込んだ後の運用モデルである。

顧客適合性チェックは、この工程表の**「申込」よりさらに上流**、営業担当者が顧客へ無料診断を提案するかどうかを判断する場面に位置する。既存の工程表・運用モデルを変更するものではなく、新しい前段ステージを追加するBusiness Decisionである。

```
[営業担当] 顧客適合性チェック（今回のスコープ）
   ↓ Human Decision = A（提案する）の場合のみ
[顧客] 申込 → 事前アンケート → … → Assessment提案（21の既存運用モデル、変更なし）
```

---

## 3. 確認する情報の分離 — DECIDED

`21` §2が無料診断の事前アンケート回答について定める区分（Respondent Statement / Observation / UNKNOWN / Hypothesis / Evidence Candidate / Decision）と同じ思想を、営業の一次確認段階に適用する。

顧客適合性チェックでは、少なくとも次を区別して記録する。

- 確認できたFACT
- UNKNOWN（わからないまま記録してよい。UNKNOWNをAIやロジックでYES/NOへ推測変換しない）
- 営業仮説（FACTと混ぜない）
- Human Decision（A：提案する／B：要確認／C：提案しない／D：atLIBの別サービスを検討する）とその判断理由

7つの適合性確認項目（改善対象・FUTURE・IT活用余地・Human Decision・FACT協力・依頼目的・改善可能性）それぞれについて、YES／NO／UNKNOWNの回答とFACT／UNKNOWN／営業仮説を個別に記録する。

> **C＝提案しない、はatLIBと取引しないという意味ではない。** 単純なIT導入・作業案件など、目的が明確な個別支援で価値を出せる場合はD（別サービス）を検討する。会社規模だけで機械的にC判定しない。

---

## 4. 自動判定を行わない — DECIDED

Human Decision（A/B/C/D）は、いかなる自動採点・スコアリング・AIロジックによっても確定しない。営業担当者が7項目の回答・記録したFACT・UNKNOWNを踏まえて選択した値を、そのまま保存する。

`17` §2の原則を踏襲する。

> **分からないことを、分かったことにしない。**

本Version（V1）ではAI Suggests部分（AIによる提案・下書き作成等）は実装しない。Human DecisionとRecordの成立のみをスコープとする。

---

## 5. 実装 — DECIDED

実装リポジトリは `yoshihisahagisaka/atlib-sales-tools` とする。`atlib-sales-tools` は無料IT経営診断（`21`〜`32`）の実装・再利用対象として`docs/README.md`が定める通りの実装先であり、顧客適合性チェックもBusiness Lane側の軽量な営業ツールとして同リポジトリに追加する。

`86` §1の原則に従い、本Decisionおよびその実装はBusiness Lane側の意思決定であり、FACTACT Core（Product Lane）への変更を伴わない。認証は`atlib-sales-tools`の既存Google Workspace OAuth（スタッフ全員ログイン可、ロール区分なし）をそのまま利用し、新規の認証基盤は追加しない。既存の`organizations`等のテーブルとは連携させず、独立した新規テーブル（`customer_fit_checks` / `customer_fit_check_items`）として疎結合に実装する。

---

## 6. 将来構想（現時点では開発しない）— NOT IN SCOPE

顧客適合性チェックで蓄積されるFACT / UNKNOWN / 営業仮説（HYPOTHESIS） / Human Decisionは、将来的に次の方向へ発展させる可能性を持つ。

- 顧客情報・FACT・UNKNOWN・営業仮説・Opportunity・次に確認すること・IT経営KAIZEN適合性・他サービス適合性・Next Actionを整理し、営業戦略の検討を支援する軽量ツールへの発展。
- Human Decisionが「A：提案する」となった顧客が実際にIT経営KAIZENへ進んだ場合、蓄積したFACT / UNKNOWN / 営業仮説を無料診断 → 設計Assessment → 継続支援（`21`〜`85`の既存運用モデル）へ引き継げること。

これらはBusiness Requirementとして記録するのみであり、**現時点ではその機能を開発しない**。過剰実装を避けるため、V1のデータ構造は上記6項目（FACT / UNKNOWN / 営業仮説 / Human Decision / 情報源・確認日時 / 次に確認すること）を列レベルで分離して保持するに留め、引継ぎAPI・自動連携・新規CRM・営業戦略支援システムは実装しない。

`assessment-connection-architecture-validation.md`が検証している「Evidence / Fact / Unknown / Hypothesis / Decisionの引継ぎ契約」が将来確定した場合、顧客適合性チェックのデータ構造はその語彙とおおむね対応させられるように設計してある。ただし当該契約自体の実装は本Decisionのスコープ外である。

---

## 7. スコープ外 — DECIDED

以下は本Decisionの対象外であり、実装しない。

- A/B/C/Dの自動判定・自動採点
- UNKNOWNのAI/ロジックによるYES/NOへの推測変換
- AIによる自動提案（AI Suggests）
- 無料診断・設計Assessment・FACTACTへの自動連携／API連携
- 新規CRM・営業戦略支援システムの新規構築
- ロールベースの権限管理
- 新規リポジトリ・新規GCP基盤
