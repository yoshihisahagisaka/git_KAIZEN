# IT経営KAIZEN 設計Assessment — 見積変動条件・Scope判定ルール v1

Status: **CANONICAL — BUSINESS / COMMERCIAL SCOPE RULES**
Date: 2026-09-16
Related:
- `docs/26-free-it-management-diagnosis-survey-v2-question-set-v1.md`
- `docs/81-design-assessment-pricing-governance-and-internal-sales-language-v1.md`
- `docs/82-design-assessment-standard-scope-boundary-v1.md`

> Note: Development Laneから `docs/84-assessment-confirmation-load-fit-gap-v1.md` にFit/Gapを記録したとの報告を受けているが、Business Laneで本改訂時点には当該ファイルをGitHub main上で取得できなかった。そのため本書は、Development LaneからBusiness Laneへ提示されたFit/Gap回答本文と、取得確認済みのSurvey v2 Canonicalを根拠として改訂する。

---

## 1. Business Principle — Confirmation Load

AssessmentのScope・価格区分は、企業規模そのものではなく、

> **経営判断に必要なFACTを確認するために、どの程度の調査が必要になるか**

を基準とする。

従業員数、法人数、拠点数、システム数、SaaS数、ベンダー数、ヒアリング人数等は、確認負荷を予測する材料にはなるが、それ自体を価格決定条件にはしない。

同じ企業規模・同じシステム数であっても、情報や管理主体が一元化されている企業と、複数部門・担当者・ベンダーへ分散している企業では、FACTを確認するための負荷が異なる。

また、「管理されていない」「資料が存在しない」ことが確認でき、その状態自体をFACTとして経営判断に利用できる場合、存在しない資料を探し続けることをAssessmentの標準作業とはしない。

一方、「資料は存在するが分散している」「複数の管理主体がそれぞれ情報を持っている」「内容が重複・不一致で突合が必要」といった場合は、情報収集・確認・突合・追加ヒアリング等により確認負荷が高くなり得る。

---

## 2. Survey v2 / 無料診断との接続 — DECIDED

現在の無料IT経営診断 Survey v2は、`docs/26-free-it-management-diagnosis-survey-v2-question-set-v1.md` の「3. Canonical Question Definition」を正式定義とする。

- Q01〜Q09：必須
- Q10：任意自由記述

Business側は、Assessment Scope判定のためにSurvey v2を一律拡張することを要求しない。

またSurvey v2単体でScope・価格を決定しない。

Scope判断には、原則として次の情報を継続利用する。

1. Survey v2
2. 60分診断
3. Human Review済み情報
4. 経営フィードバックまでに確認された情報

Design Assessmentを提案する段階で、見積判断に必要だがまだ確認できていない情報だけを追加確認する。

顧客・営業向け原則：

> **無料診断で確認できた情報はそのまま引き継ぎ、見積に必要な不足情報だけを追加で確認する。**

同じ事項を工程ごとに聞き直すことを標準運用にしない。

---

## 3. Confirmation Load の主要6軸 — DECIDED

確認負荷は、単純な件数ではなく、少なくとも次の6軸を総合して判断する。

### 3.1 対象範囲

経営判断のために、どの法人、拠点、部門、IT環境、業務・運用を確認する必要があるか。

対象が多くても、環境・運用・管理が共通化され、代表的な確認で判断できる場合は負荷が低い可能性がある。

### 3.2 情報の分散

必要な情報が一元化されているか、複数の台帳、部門、保管場所、システム、担当者等へ分散しているか。

情報が分散している場合、収集・整理・突合の負荷が高くなり得る。

### 3.3 管理主体の分散

IT全体を把握・管理する主体が存在するか、複数の社内部門・担当者・外部ベンダー等へ管理が分散しているか。

「外部委託が多い」こと自体を高負荷とはしない。複数ベンダーが存在しても、社内で責任分界・契約・情報・報告が一元的に管理されていれば確認負荷は低い可能性がある。

逆に、各ベンダーが個別に管理し、社内に全体像を把握する主体がいない場合は確認負荷が高くなり得る。

### 3.4 エビデンス確認難易度

必要な資料・記録・設定等について、存在の有無だけではなく、所在、取得可能性、最新性、整合性、重複・矛盾、突合の必要性を考慮する。

「資料なし」と「資料はあるが分散・不整合」は同じ負荷として扱わない。

### 3.5 ヒアリング負荷

必要なFACTを確認するために、誰へ、どの程度の追加ヒアリングが必要かを見る。

人数だけでなく、少人数で全体像を把握できるか、複数部門・担当者・ベンダーへ個別確認しなければならないかを考慮する。

### 3.6 特殊調査要件

海外法人・海外拠点、複雑な基幹システム、通常以上のIPO / ISMS関連証跡確認、その他の特殊要件により、通常のAssessmentを超える詳細確認が必要かを見る。

IPO準備中、ISMS取得予定等であることだけを理由に追加料金とはしない。今回の経営判断に必要な実際の確認内容で判断する。

---

## 4. Commercial Baseline — DECIDED

設計AssessmentのStandard標準価格は **1,200,000円（税別）**。

Standard 120万円には、

> **経営者が「次に何を改善するか」を判断するために必要なFACTを、通常の資料・記録・設定確認および関係者ヒアリングによって確認できる範囲**

を含む。

標準範囲内の多少の確認量増減を理由に、細かな追加料金を積み上げない。

追加Scopeは、経営判断に必要なFACTを確認するために、通常範囲を超えて個別の情報収集・突合・詳細分析・多数の関係者確認等が必要になる場合に設定する。

追加Scopeは顧客と事前に合意する。

---

## 5. Scope候補 — COMPACT / STANDARD / REVIEW / EXPANDED

### 5.1 COMPACT — PRODUCT DESIGN IN PROGRESS

Compactは、Standardより品質や方法論を落とす簡易診断として設計しない。

> **同じIT経営KAIZEN 設計Assessmentの方法論・到達点を維持しながら、経営判断に必要なFACTを比較的少ない確認負荷で作れる案件向けのScope**

として設計する。

企業規模が小さいことだけをCompact条件にしない。

Compactの正式価格および具体的な商用境界は別Decisionとする。ただし、営業が120万円しか提案できず躊躇する状態を避けるため、Compactの商品準備は初期案件の実績待ちにはせず、Business Laneで並行して設計する。

### 5.2 STANDARD — DECIDED

通常の確認負荷で、経営者が次に何を改善するか判断するために必要な調査・分析を完了できる案件。

→ **標準価格 1,200,000円（税別）**

### 5.3 REVIEW — DECIDED

確認負荷をまだ判断できない、またはStandard / Compact / Expandedの境界にある案件。

→ **自動で値上げ・値下げせず、不足情報を追加確認してHumanがScopeを決める。**

REVIEWは顧客向け商品名ではなく、内部の確認状態として扱う。

### 5.4 EXPANDED — DECIDED

経営判断に必要なFACTを作るために、Standardを明確に超える確認負荷・追加調査範囲が必要な案件。

→ **Standard 120万円＋追加Scopeの個別見積**

追加金額・価格テーブルは現時点では未決定。

---

## 6. 数値情報の扱い — DECIDED

以下のような数量は、Scope・価格の自動判定条件にしない。

- 従業員数
- 法人数
- 拠点数
- システム / SaaS数
- ベンダー数
- ヒアリング人数
- 業務数
- 資料・台帳数

数量は「確認負荷が高くなる可能性があるため追加確認した方がよい」というHuman向けの判断材料として利用できる。

従来本書に記載していた、法人2以上、拠点4以上、ヒアリング7名以上、詳細確認システム20超、個別分析業務10超等の数値目安は、**Business Canonical上のScope境界としては撤回する。**

将来、実案件のFACTから有効な目安が確認できた場合は改めてDecisionする。

---

## 7. Human Decision — DECIDED

システムは、確認済み情報からScope候補とその判断根拠を整理・提示してよい。

ただし、点数化だけでScopeを決めたり、自動的に価格を確定したり、自動的にEXPANDED等へ分類したりしない。

> **System / AI Suggests. Human Decides. System Records.**

最終的な調査Scope・価格はHumanが確認し、決定する。

顧客・営業画面では、内部用語を覚えなければ利用できない設計にしない。

---

## 8. 見積判断の固定保存と変更履歴 — DECIDED

Humanが見積・Scopeを決定した時点で、少なくとも以下を固定保存することをBusiness要件とする。

1. その時点で確認できていた会社の状態
2. まだ確認できていなかった事項
3. 想定した調査範囲
4. 想定した確認負荷とその根拠
5. システムが提示したScope候補と理由（提示した場合）
6. Humanが決定したScope
7. Humanが決定した価格
8. Decision日時および決定主体

Assessment開始後または見積後に新しいFACTが確認されても、過去の見積判断を上書きしない。

Scope変更が必要な場合は、

> **新しく確認されたFACT → Scope変更の必要性 → Human Decision → 変更後Scope / 価格**

として履歴を残す。

これにより、後から「当時どの情報を根拠にその見積を決めたか」を確認できるようにする。

---

## 9. 見積精度をFACTで改善する — DECIDED

将来、次の比較ができるようにする。

- 見積時に想定した確認負荷
- 実際のAssessmentで発生した確認作業
- 当初想定になかった追加確認
- Scope変更の有無と理由
- Compact / Standard / Expandedの実績
- 価格と実際のDelivery負荷

これらを案件横断で確認し、Compact / Standard / Expandedの境界、価格、営業判断基準を改善するためのFACTとする。

現時点の仮説を永久的な価格ルールにしない。

---

## 10. Development Implementation Handoff Requirements — BUSINESS DECISION

Development Laneへ渡すBusiness要件は次の通り。

1. Survey v2をAssessment見積目的で一律拡張しない。
2. Survey v2、60分診断、Human Review済み情報、経営フィードバックまでの取得情報をScope判断へ再利用する。
3. Design Assessment提案後、見積に必要だが未確認の情報だけを追加確認できるようにする。
4. 確認負荷を、少なくとも「対象範囲・情報の分散・管理主体の分散・エビデンス確認難易度・ヒアリング負荷・特殊調査要件」の6軸から整理できるようにする。
5. 数値件数のみでScope・価格を自動判定しない。
6. Scope候補と判断根拠をHumanへ提示できるようにする。
7. 最終Scope・価格はHumanがDecisionする。
8. 見積時点の確認済み情報、未確認事項、調査範囲、確認負荷、判断根拠、Human Decisionを固定保存する。
9. 後からScope・価格を変更する場合、過去を上書きせず、NEW FACTと変更Decisionの履歴を残す。
10. 見積時の想定確認負荷と、実際のAssessment負荷を将来比較できるようにする。
11. 顧客・営業画面では内部用語を前提とせず、通常の日本語へ翻訳する。
12. 既存の無料診断情報をAssessment開始後にも継続利用できるようにする。

Development側の実装方法はDevelopment Laneで設計する。Business LaneからFACTACT Core変更を前提要求しない。

---

## 11. Guardrails

- 新しい見積専用Surveyを前提にしない。
- Survey v2をScope判定目的だけで一律増加させない。
- Survey v2単体でScope・価格を決めない。
- 同じ確認事項を工程ごとに聞き直さない。
- 企業規模だけで価格を決めない。
- 数値閾値を自動価格判定にしない。
- 「資料がない」と「資料が分散している」を同じ確認負荷として扱わない。
- 「外部ベンダーが多い」ことだけで高負荷と判断しない。
- AI / Systemだけで最終見積を確定しない。
- 情報不足を推測で埋めない。
- 過去の見積Decisionを新しい情報で上書きしない。
- 追加Scopeは顧客と事前合意する。
- CompactをStandardの単純値引きとして扱わない。
