# IT経営KAIZEN — System / AI Assisted Service Delivery & Sales Guide v1

Status: **CANONICAL — BUSINESS / SERVICE DELIVERY & SALES ENABLEMENT**  
Date: 2026-09-17

## 1. Decision

IT経営KAIZENは、営業担当者やコンサルタントの経験だけに依存して提供するサービスとして説明しない。

経営者との対話、IT経営KAIZEN 無料診断、設計Assessment等から得られた情報について、**システム / AIが複雑な整理・分析・提案を支援し、人が確認・承認し、重要な実行内容は経営者が最終決定する**構造を、営業教育・サービス説明で明確に伝える。

> **システム / AI：整理・分析・提案を支援**  
> **人：確認・承認**  
> **経営者：最終決定**

これは「AI Suggests. Human Decides.」のBusiness / Sales Translationである。

## 2. Sales Enablement Intent

IT経営KAIZENの説明を受けた役員・営業メンバーが、

- 仕事が増えるのではないか
- 誰が分析するのか
- 自分にそんな難しいことができるのか
- コンサル経験がないと営業できないのではないか

という不安を持つことを前提にする。

営業担当者に求める中心行動は、その場で正解を作ることではない。

- 経営者が実現したい会社の姿を聞く
- 確認できたことを正しく残す
- まだ分かっていないことを分かったことにしない
- 自分の仮説と顧客の事実を混ぜない
- 次の確認・分析につなげる

複雑な整理・分析・提案はシステム / AIが支援する。

## 3. IT経営KAIZEN 無料診断 — Improvement Analysis

経営者へ返す「ITで良くできそうなこと」は、確認できた事実をもとに、以下で整理して提示する。

### 3 Perspectives

- 技術
- 運用
- 管理

### 6 Lenses

- なくす
- 自動化する
- 標準化する
- 任せる
- 残す
- 整える

> **技術 × 運用 × 管理**  
> ↓  
> **なくす / 自動化する / 標準化する / 任せる / 残す / 整える**  
> ↓  
> **改善の選択肢**

## 4. 設計Assessment — Sales Explanation Scope

営業実践ガイドでは、Launch初期であっても設計Assessmentの先が見えるよう、最低限以下を説明する。

1. なぜAssessmentが必要なのか
2. 何を調べるのか
3. 誰がどのように整理・分析するのか
4. Assessment範囲をどう決めるのか
5. 何を成果物として返すのか
6. 費用の基本設定
7. Assessment後にどう進むのか

Delivery Manualレベルの実施手順までは営業ガイドへ持ち込まない。

## 5. Assessment Scope Recommendation

無料診断までに取得した情報をもとに、システムは以下を整理・分析し、Assessment範囲を理由とともに提案する。

- 何が分かっているか
- 何が足りないか
- 経営判断のためにどこまで確認する必要があるか
- 推奨するAssessment範囲
- 推奨理由
- 追加確認が必要な情報

提案対象：

- COMPACT
- STANDARD
- EXPANDED

情報が不足し安全に提案できない場合は、無理にプランを確定せず **REVIEW / 要確認** とし、追加確認する。

システム提案後、コンサルタントが内容・根拠を確認し、必要に応じて追加確認を行ったうえで、Human Scope Decisionにより正式なAssessment範囲・見積を決定する。

営業担当者が、その場の感覚だけでAssessment範囲・価格を決定することを標準としない。

## 6. Assessment Pricing — Sales Guide Display

営業実践ガイドでは、価格の全運用ルールではなく基本価格を簡潔に示す。

| Scope | 基本価格（税別） | 説明 |
|---|---:|---|
| COMPACT | 800,000円 | 対象を絞って調査・分析 |
| STANDARD | 1,200,000円 | 標準的な範囲を調査・分析 |
| EXPANDED | 1,200,000円 + 追加見積 | STANDARDを超える追加範囲が必要 |

営業裁量価格、承認ライン等の詳細価格運用は別Canonical / 見積運用ルールに従い、営業実践ガイドへ過度に持ち込まない。

## 7. Assessment Outputs

設計Assessmentの主要成果物：

1. IT経営KAIZEN 改善計画書
2. 経営判断用の要約資料
3. 調査・分析資料

分析は、会社の未来 → 確認した事実 → 未確認事項 → GAP → ROOT CAUSE → 技術・運用・管理 × 6 Lenses → 改善の選択肢 → 優先順位 / Scenario → Human Decision へつなぐ。

## 8. After Assessment

AssessmentのゴールはatLIBへの発注ではない。

> **経営者が「会社を良くするために、次に何を改善するか」を決められること。**

実行者は顧客自身、既存ベンダー、他社、atLIB、または組み合わせから選択できる。

実行後はCHANGEを確認し、新しく得られたFACTを次のKAIZENへつなげる。

## 9. Product Lane Boundary

本DecisionはBusiness Requirement / Sales Explanationを定義する。

具体的なAIモデル、Object、State、UI、分析ロジック、Scope Recommendationロジック、Human Approval、Audit、FACTACT Coreとの実装境界はProduct Laneで決定する。

未実装機能を顧客へ実装済みとして説明してはならない。Launch時点の実装状況に応じ、顧客向け表現は事実に合わせる。
