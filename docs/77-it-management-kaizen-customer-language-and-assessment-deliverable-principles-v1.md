# IT経営KAIZEN — 顧客向け言語・Assessment成果物原則 v1

Status: **CANONICAL — BUSINESS / CUSTOMER COMMUNICATION & DELIVERABLE PRINCIPLES**
Date: 2026-09-14
Related: `docs/73-it-management-kaizen-design-assessment-standard-offer-v1.md`, `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`, `docs/75-design-assessment-act-option-scenario-roadmap-output-standard-v1.md`

## 1. Decision

IT経営KAIZENは、専門用語や英語を多用して専門性を演出しない。

> **専門用語で賢く見せない。事実と選択肢を、経営者が自分で判断できる言葉に翻訳する。**

内部Canonicalでは概念の厳密性のため英語Key Termを保持してよいが、顧客向け資料では日本語を第一言語とする。

Microsoft 365、SaaS、AI等、固有製品名または一般化した技術用語まで不自然に日本語化する必要はない。

---

## 2. Internal → Customer Translation

| Internal / Canonical | Customer-facing Japanese |
|---|---|
| FUTURE | 実現したい会社の姿 / 目指す姿 |
| FACT | 確認できた事実 |
| UNKNOWN | まだ確認できていないこと |
| GAP | 目指す姿とのギャップ |
| ROOT CAUSE | なぜ起きているのか / 根本原因 |
| ACT Option | 改善の選択肢 / 実行案 |
| Management Priority | 経営として何を優先するか |
| Scenario | 改善プラン / 進め方の選択肢 |
| Roadmap | 改善計画 / 実行計画 |
| Expected CHANGE | 期待する変化 |
| Actual CHANGE | 実際に起きた変化 |
| NEW FACT | 改善後に確認できた事実 |
| Human Decision | 経営者の判断 / 人が決める |
| Actor | 誰が実行するか / 実行担当 |
| Evidence | 判断の根拠 / 確認資料 |
| Verification | 効果確認 / 実際に変わったかの確認 |
| Decision Owner | 最終判断者 |
| Hold | 今回は見送る / 保留する |

翻訳は機械的な一対一置換ではなく、読み手にとって最も自然な日本語を使う。

---

## 3. Assessment Deliverable Value

120万円の設計Assessment成果物を、総評中心の短いレポートとして設計しない。

Customer Valueは、

> **判断の根拠となる事実を確認し、その事実から原因と改善案を追跡でき、複数の進め方と投資計画を比較して経営者が選べる状態をつくること。**

成果物は原則二層構造とする。

### A. 経営判断編
経営者が理解・比較・判断するための本編。

### B. 調査・分析編
なぜその判断材料が成立するのかを示す事実・確認資料・分析の裏付け。

> **表側は、経営者が分かる。裏側は、なぜそう言えるのかを証明できる。**

---

## 4. 経営判断編 — Standard Story

顧客向け見出しは原則日本語とし、以下の順序を基本とする。

1. 実現したい会社の姿
2. 今回確認した範囲と判断テーマ
3. 確認できた重要な事実
4. まだ確認できていないこと
5. 目指す姿とのギャップ
6. なぜ起きているのか
7. 事実から改善案へ至るつながり
8. 改善の選択肢
9. 経営として選べる改善プラン
10. 改善プランごとの複数年計画
11. 改善プランごとの投資の考え方
12. 改善プランごとの期待する変化・注意点
13. atLIBとしての提案と、その根拠
14. 経営者が決めること
15. 選択した改善計画
16. 実行後に何を確認するか

ページ数は固定しない。経営判断に必要な内容量から決める。

---

## 5. 調査・分析編 — Evidence Book

案件Scopeに応じて以下を保持する。

- 確認資料一覧と出所
- Interview / Hearing findings
- System構成
- Identity / Account状況
- Device / Asset状況
- SaaS / License / Contract状況
- Network / Infrastructure状況
- Security状況
- 業務Flow / 手順
- 問い合わせ / Request実態
- Workload / 工数Baseline（確認できる場合）
- IT Cost / Vendor Cost（確認できる場合）
- 組織 / Responsibility / Authority
- Policy / Rule / Governance
- Risk / Control / Auditability
- 確認できた事実
- まだ確認できていないこと
- 仮説と追加確認事項
- 各改善案を支える事実

資料が存在しないこと自体も重要な事実または未確認事項となり得る。

---

## 6. Traceability Principle

主要な改善案は、少なくとも以下を追跡可能にする。

```text
判断の根拠 / 確認資料
↓
確認できた事実
↓
目指す姿とのギャップ
↓
なぜ起きているのか
↓
改善案の設計
↓
改善の選択肢
↓
期待する変化
↓
実行後の確認方法
```

「良さそうだからこの製品を導入する」という飛躍を許容しない。

---

## 7. Scenario-to-Roadmap Principle

改善プランを複数提示する場合、Roadmapを一本だけ提示しない。

> **改善プランごとに、そのプランを選んだ場合の複数年改善計画を持つ。**

```text
改善プラン A
→ 改善計画 A
→ 年度別投資 A
→ 期待する変化 A
→ 注意点 / Risk A

改善プラン B
→ 改善計画 B
→ 年度別投資 B
→ 期待する変化 B
→ 注意点 / Risk B

改善プラン C
→ 改善計画 C
→ 年度別投資 C
→ 期待する変化 C
→ 注意点 / Risk C
```

改善プラン数は固定しない。意味のない3案比較を作らない。

各改善計画は、施策の優先順位だけでなく、実行順序、年度別投資、依存関係、期待する変化、Risk、各年の到達状態が変わり得る。

---

## 8. Multi-year Decision Principle

複数年改善計画は未来のACTを固定する契約計画ではない。

顧客向けには以下の意味を明確にする。

- 1年目：現在の事実をもとに具体的に判断する範囲
- 2年目：1年目の結果を確認して再判断する候補
- 3年目以降：実現したい会社の姿へ向かう方向性

> **長期の目指す姿は持つ。改善計画も持つ。ただし次の投資は、実際に何が変わったかを確認して決める。**

---

## 9. Customer-facing Language Test

顧客向け資料を出す前に以下を確認する。

1. 英語を日本語にすると意味が弱くなる明確な理由があるか
2. ITに詳しくない経営者が見出しだけで意味を理解できるか
3. 専門用語を説明せずに使っていないか
4. 英語の方が格好良いという理由だけで使っていないか
5. 「何が分かったか」「なぜそう言えるか」「何を選べるか」が日本語で説明できるか
6. 製品名が改善目的より前に出ていないか
7. 抽象語で事実不足を隠していないか

一つでも説明できない場合は顧客向け表現を再設計する。

---

## 10. FACT FIRST Boundary

日本語化は単純化や曖昧化を意味しない。

- 事実と推測を混ぜない
- 未確認事項を消さない
- 原因仮説を事実として書かない
- 期待する変化を実績として書かない
- 概算投資を確定金額として書かない
- 2年目以降の候補を確定計画として書かない

> **分かりやすくするために、正確さを捨てない。正確さを保ったまま、経営者の言葉へ翻訳する。**

---

## 11. Supersession Rule

既存の顧客向けSample / Output Standardに `FUTURE / FACT / UNKNOWN / GAP / ROOT CAUSE / ACT Options / Management Scenario / Roadmap / Human Decision` 等の英語中心表現がある場合、内部Conceptとしては維持するが、Customer-facing表現は本Canonicalの日本語原則を優先する。

また、改善プラン比較の後に単一Roadmapを提示する旧構造はCustomer-facing Standardとして採用しない。

改善プランごとのRoadmapを基本とする。
