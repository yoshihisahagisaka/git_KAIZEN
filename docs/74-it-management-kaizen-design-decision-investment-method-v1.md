# IT経営KAIZEN — Design / Decision / Staged Investment Method v1

Status: **CANONICAL — BUSINESS / METHOD**
Date: 2026-09-14

## 1. Decision

IT経営KAIZENの「設計」「Human Decision」「CHANGE」「複数年投資」の意味を以下で固定する。

> **FUTUREは、何を優先してKAIZENするかの基準をつくる。**

> **設計とは、確認されたGAP / ROOT CAUSEに対して、「技術・運用・管理」の3領域と6 LensesからACT Optionsをつくることである。**

> **HumanがDecisionする主対象はCHANGEではなく、実行するACTである。**

> **CHANGEは、ACTの結果として実際に何が変わったかをFACTで確認する対象である。**

---

## 2. Canonical Method

```text
FUTURE
↓
FACT / UNKNOWN
↓
GAP
↓
ROOT CAUSE
↓
DESIGN
  = 技術・運用・管理 × 6 Lenses
↓
ACT OPTIONS
↓
Management Priority / Scenario Comparison
↓
HUMAN DECISION
  = どのACTを実行するか
↓
ACT
↓
CHANGE
↓
NEW FACT
↓
NEXT KAIZEN
```

従来表現の `KAIZEN OPTION` は、このMethodでは `DESIGN → ACT OPTIONS` として具体化する。

---

## 3. FUTUREの役割

FUTUREは単なる理想像の記入欄ではない。

FUTUREは、現在のFACTを評価し、GAPの重要性とACTの優先度を判断するManagement Criteriaである。

同じFACT / GAPでも、経営者が何を重視するかによって優先ACTは変わり得る。

例：

- 社員工数を減らしたい
- 人を増やさず成長したい
- IPO / Trust / Governanceを優先したい
- Business Continuityを高めたい
- IT Costを最適化したい
- DX / AI活用を進めたい

これらは一般的な優先順位の固定リストではない。Customer FUTURE / Management Priorityに応じて扱う。

---

## 4. DESIGN = 3 Domains × 6 Lenses

### 3 Domains — どの領域をKAIZENするか

- **技術**
- **運用**
- **管理**

### 6 Lenses — どうKAIZENするか

- **なくす**
- **自動化する**
- **標準化する**
- **任せる**
- **残す**
- **整える**

この組合せをIT経営KAIZENにおける **Design Space** とする。

重要：

> **3 × 6 = 18項目をすべて実施・採点するチェックリストではない。**

FUTURE、FACT、GAP、ROOT CAUSE、Management Priorityから必要な組合せを選び、ACT Optionsを設計する。

目的は網羅性のための作業を増やすことではなく、ACT設計の抜け・偏りを防ぐことである。

---

## 5. ACT OPTIONS

DesignのOutputは「改善すべきです」という抽象的Recommendationではなく、Humanが選択可能なACT Optionsである。

各ACT Optionは可能な限り以下を持つ。

- What — 何を実行するか
- Why — どのFUTURE / GAP / ROOT CAUSEに対応するか
- Domain — 技術 / 運用 / 管理
- Lens — 6 Lensesのどの視点か
- Supporting FACT
- Remaining UNKNOWN
- Expected CHANGE
- Dependency
- Risk
- indicative investment / effort where evidence supports it
- Actor Candidates

Expected CHANGEは「実現すると断定する成果」ではない。ACT後にVerificationする対象である。

---

## 6. Management Priority Scenario

IT経営KAIZENは一つの正解だけをCustomerへ押し付けない。

同じFACT / ACT Optionsに対し、Management Priorityを変えた場合のKAIZEN Scenarioを提示できる。

例：

```text
Scenario：社員工数削減を優先
→ ACT A / ACT C / ACT F の優先度が上がる

Scenario：IPO / Trustを優先
→ ACT B / ACT D / ACT G の優先度が上がる

Scenario：人を増やさず成長を優先
→ ACT A / ACT E / ACT F の優先度が上がる
```

上記ACT番号は説明用例示であり、固定Scenarioではない。

AI / atLIBがCustomer FUTUREを勝手に決めてはならない。

Scenarioの目的は、

> **「もし○○を優先するなら、ACTの優先順位はこう変わる」**

と選択可能な形で示すことである。

---

## 7. Decision Principle — 「やるか」から「どれをやるか」へ

IT経営KAIZENのBusiness / Sales Methodとして以下を採用する。

> **「やるか、やらないか」を迫るのではなく、「会社を良くするために、どれをやるか」を一緒に決める。**

Decisionは必要に応じて二段階になる。

### Management Decision 1

> **何を優先するか。**

### Management Decision 2

> **どのACTを実行するか。**

`何もしない / Hold` も正当なHuman Decisionとして残す。

これはChoice Architectureを営業都合で操作することを意味しない。
FACT / UNKNOWN / Risk / Optionを正しく示し、Humanが選択する。

---

## 8. CHANGEの意味

CHANGEをDecision Objectとして扱わない。

HumanはACTをDecisionする。
ACT実行後、期待していたCHANGEが本当に起きたかをEvidence / FACTで確認する。

```text
Human Decision
→ ACT
→ Expected CHANGE
→ Verification
→ Actual CHANGE / No CHANGE / Unexpected CHANGE
→ NEW FACT
```

したがって、ACT実行 = 成功ではない。

> **実行したことではなく、本当に何が変わったかを確認する。**

これをFACTACTのVERIFY / LEARNへ接続する。

---

## 9. Multi-year KAIZEN Roadmap

ITシステム / 運用 / 管理のKAIZENは、すべてを一度に実行することを標準としない。

FUTUREへの複数年の道筋を設計し、ACTを段階的に配置できる。

```text
FUTURE
↓
Multi-year KAIZEN Roadmap
├ Year 1 — Priority ACTs
├ Year 2 — Candidate ACTs
└ Year 3 — Candidate ACTs
```

ただし、Year 2 / Year 3のACTをYear 1時点で不可逆に確定しない。

```text
Year 1 ACT
→ CHANGE
→ NEW FACT
→ Roadmap Review
→ Year 2 ACT Decision
```

> **長期FUTUREは持つ。Roadmapも持つ。しかしACTはNEW FACTを見ながら段階的にDecisionする。**

---

## 10. Staged Investment Principle

一括で全ACTを提案し、総額だけで `GO / NO-GO` を迫ることを標準営業手法にしない。

IT経営KAIZENでは、FUTUREへの全体像を示しながら投資を段階化する。

> **FUTUREは数年単位、ACTは段階的に。**

> **一度に全部を売らない。FUTUREへの道筋を示し、NEW FACTを確認しながら次の投資をDecisionする。**

各Phase / Yearで以下を再確認する。

- FUTUREに変化はないか
- NEW FACTは何か
- 前回ACTで何がCHANGEしたか
- 未解決GAPは何か
- Priorityは変わったか
- 次に実行すべきACTは何か
- Investmentを継続 / 増加 / 縮小 / Holdするか

---

## 11. Business Value

このMethodが目指すCustomer Experienceは、ITに詳しいことを経営者へ要求することではない。

技術的な選択肢をそのまま経営者へ投げるのではなく、FUTURE / Management PriorityとACTの関係を示し、経営者が経営の言葉でDecisionできる状態をつくる。

> **IT経営KAIZENは、FACTから会社を良くする選択肢を設計し、経営者が選べる状態をつくる。**

---

## 12. Assessment Implication

設計Assessmentの中核は、単なる現状診断ではない。

```text
FUTURE / Management Priority
→ Evidence
→ FACT / UNKNOWN
→ GAP
→ ROOT CAUSE
→ 3 Domains × 6 Lenses
→ ACT OPTIONS
→ Scenario / Priority Comparison
→ HUMAN DECISION
```

したがってAssessmentのDecision Valueは、課題一覧を納品することではなく、

> **経営者が複数のACT Optionsとその優先順位を比較し、次に実行するACTをDecisionできる状態をつくること。**

---

## 13. Actor Neutrality

ACTをDecisionした後にActorを決める。

- Customer
- Existing Vendor
- Other Vendor
- atLIB
- Combination

順序を逆転させない。

```text
ACT Decision
→ Actor Allocation
→ ACT Execution
```

atLIB受注を前提としてACT Options / Scenarioを歪めない。

---

## 14. FACT FIRST Boundary

現時点で以下はFACTとして主張しない。

- 選択肢提示により成約率が上がる
- 段階投資により失注率が下がる
- Multi-year RoadmapによりCustomer LTVが上がる
- 特定Scenarioが特定業種に最適である
- 3 Domains × 6 LensesがすべてのIT課題を網羅する

これらは今後Pilot / Sales Evidenceで検証する。

Business Methodとして採用する理由は、FUTURE First / FACT First / Human Decision / Continuous KAIZENとの整合性である。

---

## 15. Supersession / Interpretation Rule

既存文書に以下の表現がある場合、本Canonicalで読み替える。

### Old / Ambiguous

> 何を変えるかをHumanがDecisionする。

### Canonical Interpretation

> FUTURE / Management Priorityを踏まえ、DesignされたACT Optionsから **どのACTを実行するかをHumanがDecisionする。**

### Old / Ambiguous

> DecisionされたCHANGEに必要なACTを実行する。

### Canonical Interpretation

> **DecisionされたACTを実行し、その結果として期待したCHANGEが実際に起きたかをFACTでVerificationする。**

### Old

> KAIZEN OPTION

### Canonical Detail

> **DESIGN（3 Domains × 6 Lenses）→ ACT OPTIONS → Priority / Scenario Comparison**

本Canonicalと矛盾する旧表現は本Canonicalを優先する。

---

## 16. Design Test

今後のAssessment / Proposal / Roadmap / Sales / FACTACT連携は以下で検証する。

1. FUTUREがPriorityの基準になっているか
2. FACT / UNKNOWNからGAPを形成しているか
3. ROOT CAUSEをEvidenceなしに断定していないか
4. 3 Domains × 6 Lensesを18項目チェックリスト化していないか
5. ACT Optionsが複数の選択肢として設計されているか
6. HumanがDecisionする対象がACTになっているか
7. Expected CHANGEとActual CHANGEを混同していないか
8. Multi-year Roadmapを固定計画化していないか
9. NEW FACTによって次のACTを再Decisionできるか
10. Customerを `買う / 買わない` だけのDecisionへ追い込んでいないか
11. ActorをACTより先に固定していないか

重大な矛盾があれば、営業都合で原則を曲げず再設計する。
