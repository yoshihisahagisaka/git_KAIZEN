# IT経営KAIZEN — 継続KAIZEN支援 Operating Model v1

Status: **CANONICAL — BUSINESS / CONTINUOUS SUPPORT**
Date: 2026-09-16

Related:
- `docs/11-josys-kaizen-service-model-v1.md`
- `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`
- `docs/79-unknown-to-fact-managed-kaizen-and-exit-option-principles-v1.md`
- `docs/80-it-management-kaizen-execution-actor-choice-and-management-observability-principles-v1.md`
- `docs/81-design-assessment-pricing-governance-and-internal-sales-language-v1.md`
- `docs/83-assessment-scope-commercial-adjustment-rules-v1.md`
- `docs/84-assessment-scope-recommendation-human-decision-business-requirements-v1.md`

---

## 0. FACTACT Provenance — DECIDED

継続KAIZEN支援の商品設計にあたり、FACTACT Coreを新規に再設計することを前提としない。

FACTACTは初期設計から、Fact-first、One Fact / Multiple Views、Work → Action → Change → Verify → Commit → New Fact → Learn → KAIZEN、Continuous Operational KAIZEN、HELIX等の考え方を持っている。

したがって、月次・四半期・年次の継続KAIZEN支援は、これらの既存FACTACT思想・構造をIT経営KAIZENのBusiness Application / Management Outputとして利用するものと位置付ける。

Business Laneでは、FACTACT Coreへ安易に新しいCore Object / Core Flowを追加しない。商品要件について既存FACTACT設計とのFitを必要に応じてCanonicalで確認し、既存設計で表現できないBusiness Requirementが確認された場合のみ、Product / Development LaneへGAP / CONFLICTとして渡す。

---

## 1. Positioning — DECIDED

IT経営KAIZENの実行商品は、契約上は分けるが顧客体験は一つにつなぐ。

- スポットPJ：決めた改善を実現する
- 継続KAIZEN支援：次の改善を決め続ける
- 運用支援：必要なIT業務を継続して回す

> **契約は分ける。ただし顧客体験は一つにつなぐ。**

継続KAIZEN支援は、運用支援をatLIBへ委託することを前提としない。顧客自身・既存ベンダー・他ベンダーが運用している場合でも成立する。

### Service Name — DECIDED

正式名称：

> **IT経営KAIZEN 継続KAIZEN支援**

通常呼称：

> **継続KAIZEN支援**

意味上は「IT経営KAIZENというサービス体系における継続KAIZEN支援サービス」として扱う。

旧検討名の `IT経営KAIZEN Advisory` を別商品として並立させない。これまでAdvisoryとして想定していた、運用Actorが顧客社員等へ移った後も経営視点でKAIZENを継続する役割は、継続KAIZEN支援へ包含する。

---

## 2. Continuous KAIZEN Support Definition — DECIDED

> **会社の未来に向けて、ITの変化と新しく分かった事実を継続的に確認し、次に何を改善するかを経営者が判断できる状態を維持するサービス。**

Assessmentとの役割分担：

- Assessment：最初の改善計画をつくり、次に実行することを決める。
- 継続KAIZEN支援：実行後に何が変わったかを確認し、新しく分かったことから改善計画を更新して、次に実行することを決め続ける。

継続KAIZEN支援は「月○時間のITコンサル」を販売するサービスではない。

### Actor Neutrality and Continuity — DECIDED

継続KAIZEN支援の価値は、運用作業そのものではなく、会社のITを継続的に観測し、経営に必要な形へ整理し、次の改善判断へつなぐ機能にある。

したがって、運用Actorが以下のいずれであっても継続KAIZEN支援は成立する。

- atLIB
- 顧客社員
- 既存ベンダー
- 他ベンダー
- 複数Actorの組み合わせ

atLIBから顧客社員等へ運用を移管した場合も、継続KAIZEN支援は別商品へ切り替えるのではなく、同一の商品として継続可能とする。

運用Actorの変更のみを理由として、継続KAIZEN支援の基本的な商品価値・標準Scope・価格体系を変更しない。実際の価格は、継続KAIZEN支援自体のScopeおよび今後定義するCommercial Rulesに基づいて決定する。

> **運用する人が変わっても、会社を良くし続ける機能は残る。**

---

## 3. Observation and Decision Cadence — DECIDED

経営者の時間を必要以上に使わず、IT経営KAIZENの観測・改善サイクルは止めない。

基本頻度：

| 頻度 | 提供内容 | 主な対象 |
|---|---|---|
| 毎月 | 月次運用・KAIZENレポート | 情シス責任者・担当者等 |
| 随時 | 次回Reviewまで待てない重要事項のDecision支援 | 必要な決裁者 |
| Q1 / Q2 / Q3 | 四半期 経営Review | 経営者・役員 |
| 年1回 | 年次 IT経営Review（Q4相当を統合） | 経営者・役員 |

したがって、標準的な経営Reviewは年間4回とする。

> **月次 = 観測**
>
> **四半期 = Decision**
>
> **年次 = FUTUREとRoadmapの再確認・更新**

これは標準Operating Modelであり、顧客状況・進行中ACT・重大リスク等により必要なDecision頻度が変わることは許容する。

---

## 4. Monthly Observation — DECIDED

月次では経営者との会議開催を目的にしない。

月次レポートは、少なくとも次の観点から必要な情報を継続記録・共有する。

- 前回決めた改善の進捗
- 実際に何が変わったか
- 今月新しく分かったこと
- 運用・システム等で起きた重要な変化
- 現在進行中の改善
- 次に検討すべき改善候補
- 経営判断が必要な事項

重要な変化がない場合、無理に改善案を作らない。「重要な変化が確認されなかった」ことも確認結果として扱う。

月次の目的は、FACT / CHANGE / NEW FACTを止めずに蓄積し、次の経営判断に必要な材料を作ることである。

月次レポートを、atLIB担当者が毎月ゼロからWord / PowerPoint等で手作業作成することを商品設計上の前提としない。既存FACTACTに蓄積されたDecision、ACT進捗、CHANGE、NEW FACT等をManagement Outputへ組み立て、Humanが内容を確認・承認して発行する方向を目標とする。

これは新しいFACTACT Core原則ではなく、既存のFact-first / One Fact Multiple Views / Continuous Operational KAIZEN等を継続KAIZEN支援へ適用するBusiness / Delivery Designである。具体的な生成方式・自動化範囲・UI等は本Business Canonicalでは確定しない。

---

## 5. Quarterly Management Review — DECIDED

Q1 / Q2 / Q3に経営Reviewを行う。

単なるIT運用報告会にはしない。3か月分の情報を経営判断できる形へ翻訳する。

基本構造：

1. 会社が目指す姿・現在の経営上の優先事項を確認
2. この四半期に実際に何が変わったか
3. 新しく分かった重要なこと
4. 改善計画・進行中ACTの状況
5. 次に考えられる改善の選択肢
6. 次の期間で何を実行するか経営者がDecision

件数・障害数・作業数等の運用情報を、そのまま経営者へ渡すことを標準としない。必要に応じて会社の未来・事業影響・投資判断へ翻訳する。

---

## 6. Annual IT Management Review — DECIDED

年次ReviewはQ4の報告だけではなく、会社のFUTUREと改善Roadmapを再確認・更新する場とする。

基本確認内容：

- 1年間に何を改善したか
- 実際に会社・IT・業務がどう変わったか
- 何がまだ変わっていないか
- 新しく何が分かったか
- 会社が目指す姿に変化があるか
- 事業計画・組織・人員・拠点・投資方針等に重要な変化があるか
- 来年度に何を優先するか
- 数年先を見据えた改善の道筋をどう更新するか

FUTUREは固定された前提として扱わず、会社の変化に応じてHumanが再確認する。

---

## 7. Exception Escalation — DECIDED

次の四半期Reviewまで待つことが不適切な重要事項は、随時Decisionへエスカレーションする。

例：

- 重大なセキュリティ・事業継続リスク
- 大きな投資判断
- 事業に重大な影響を与える障害・変更
- 権限・安全・Compliance上、実行前のDecisionが必要な事項
- 進行中ACTの継続・変更・停止について早期判断が必要な事項

定例Review頻度を、重要Decisionを遅らせる理由にしてはならない。

---

## 8. Boundary with Spot Project — DECIDED

継続KAIZEN支援の中心は以下とする。

> **確認する・分析する・改善の選択肢をつくる・経営判断を支援する・改善計画を更新する。**

一方、原則として次はスポットPJ等の別実行契約として扱う。

- システム構築
- 大規模・計画的な設定変更
- 移行
- 開発
- データ移行
- 大量の実作業
- 個別ACTの実行Project Management等

軽微な助言・確認と実行作業の具体的契約境界は、今後の商品・契約設計で定義する。

---

## 9. Connection with Operations Support — DECIDED

atLIBが運用支援も担当する場合、運用は単なる作業処理だけではなく、新しいFACTを作る重要な情報源となる。

顧客体験としては、

> 運用支援
> → 実態・件数・例外・障害等を確認
> → 継続KAIZEN支援で経営視点へ整理
> → Humanが次のACTをDecision
> → 必要に応じてスポットPJ等で実行
> → CHANGEを確認
> → 新しい運用・NEW FACTへ
> → 次のKAIZEN

とつなぐ。

ただし、atLIBが運用支援を担当していない顧客でも、利用可能な情報を基に継続KAIZEN支援は成立する。

運用支援から顧客社員等へ運用Actorを移管した後も、継続KAIZEN支援は同一商品として継続できる。運用支援の終了を、継続KAIZEN支援の終了条件としない。

---

## 10. Customer-facing Language — DECIDED

内部ではFACT / UNKNOWN / ACT / CHANGE / NEW FACT / FUTURE等を厳密に管理してよい。

営業・顧客には内部用語の暗記を要求せず、例えば次のように翻訳する。

> **毎月、ITや業務で実際に何が起き、何が変わったかを確認します。その情報を四半期ごとに経営判断できる形へ整理し、次に何を改善するかを一緒に決めます。年に一度、会社が目指す姿と今後の改善計画そのものを見直します。**

---

## 11. Guardrails

- 経営Reviewを毎月開催することを標準価値にしない。
- 会議回数やコンサルタント時間を商品価値の中心にしない。
- 月次レポートのために無理に改善案・課題を生成しない。
- IT運用情報を経営者へ単純転送するだけの報告会にしない。
- 四半期まで待てない重大Decisionを定例まで保留しない。
- 年次Reviewを年間実績報告だけで終わらせない。
- FUTUREをatLIBやAIが勝手に変更しない。
- 継続KAIZEN支援を運用支援契約の付属物にしない。
- atLIBを実行Actorとして固定しない。
- 運用Actorの変更だけを理由に別商品へ切り替えない。
- 大きな実行ACTを月額内へ無制限に包含しない。
- FACTACT Coreの既存原則で表現可能なBusiness Requirementについて、Business LaneからCore変更を前提にしない。

---

## 12. Next Business Design

次のBusiness Decision対象は、継続KAIZEN支援について以下を商品化することである。

1. 標準Scope
2. 月次レポートの標準Output
3. 四半期 / 年次Reviewの標準Output
4. 月額内の軽微支援と別契約ACTの境界
5. 標準月額価格
6. 拡張Scope / 追加価格
7. 運用支援とのセット時の商流・価格関係

価格はHuman Hoursや会議回数から逆算せず、継続して提供する経営IT改善機能とDelivery Economicsの両面から検証する。
