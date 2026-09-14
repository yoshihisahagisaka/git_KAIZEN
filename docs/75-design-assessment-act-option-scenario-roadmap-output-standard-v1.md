# IT経営KAIZEN — ACT Option / Scenario / Roadmap Output Standard v1

Status: **BUSINESS / CUSTOMER OUTPUT STANDARD — PROPOSAL FOR PILOT VALIDATION**
Date: 2026-09-14
Parent Method: `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`
Parent Offer: `docs/73-it-management-kaizen-design-assessment-standard-offer-v1.md`

## 0. Purpose

設計Assessmentで経営者へ提示する以下3つのCustomer Outputを標準化する。

1. **ACT Option Portfolio** — 何を実行できるか
2. **Management Scenario Comparison** — 何を優先すると選択がどう変わるか
3. **Multi-year KAIZEN Roadmap** — どの順番で段階的に投資・実行するか

目的は報告書を増やすことではない。

> **経営者が「やるか、やらないか」ではなく、「何を優先し、どのACTを、いつ実行するか」をDecisionできる状態をつくる。**

---

# 1. Core Output Flow

```text
FUTURE / Management Priority
↓
FACT / UNKNOWN
↓
GAP / ROOT CAUSE
↓
DESIGN
  技術・運用・管理 × 6 Lenses
↓
ACT OPTION PORTFOLIO
↓
MANAGEMENT SCENARIO COMPARISON
↓
MULTI-YEAR KAIZEN ROADMAP
↓
HUMAN DECISION
↓
ACT
↓
CHANGE / NEW FACT
↓
ROADMAP REVIEW
```

3 Outputは別々の分析物ではなく、一つのDecision Storyとしてつなぐ。

---

# 2. Output A — ACT Option Portfolio

## 2.1 Purpose

FACT / GAP / ROOT CAUSEから導かれる実行可能な選択肢を、経営者が比較できる粒度へ翻訳する。

技術製品名だけをOption名にしない。

Bad example：
- Entra ID導入
- Intune導入

Better structure：
- 入退社時のAccount作成・停止を標準化 / 自動化する
- Device管理をCloud中心へ再設計する

具体TechnologyはACTを実現する手段として示す。

## 2.2 Standard ACT Option Card

各Optionを以下のCard形式で表現する。

```text
ACT OPTION [ID]

Title：経営者が理解できるACT名

WHY
- 対応するFUTURE / Management Priority
- 対応するGAP / ROOT CAUSE

FACT BASIS
- Supporting FACT
- Remaining UNKNOWN

DESIGN
- Domain：技術 / 運用 / 管理
- Lens：なくす / 自動化する / 標準化する / 任せる / 残す / 整える

ACT
- 実行内容

EXPECTED CHANGE
- ACT後に期待する変化
- Verification方法 / 指標候補

DECISION INFORMATION
- Priority candidate
- Dependency
- Risk
- Indicative investment where supportable
- Indicative lead time where supportable
- Actor Candidates
```

## 2.3 Expected CHANGE Rule

Expected CHANGEは成果保証として書かない。

Bad：
> 工数を30%削減できます。

Evidenceがない場合：
> 入退社対応に必要な手作業工程が減る可能性がある。現状工数をBaseline化し、ACT後に実測する。

Evidenceがある場合のみ定量Target候補を提示する。

---

# 3. ACT Option Portfolio — Customer-facing Layout

推奨する1ページ構造：

```text
┌─────────────────────────────────────────────┐
│ FUTURE / 今回のManagement Priority           │
├─────────────────────────────────────────────┤
│ ACT 01 │ ACT 02 │ ACT 03 │ ACT 04           │
│ Why    │ Why    │ Why    │ Why              │
│ Change │ Change │ Change │ Change           │
│ 投資   │ 投資   │ 投資   │ 投資             │
│ 時期   │ 時期   │ 時期   │ 時期             │
├─────────────────────────────────────────────┤
│ FACT BASIS / UNKNOWN                         │
└─────────────────────────────────────────────┘
```

一度に表示する主要ACTは経営者が比較できる数へ絞る。最大数はPilotで検証し、現時点では固定しない。

詳細OptionはAppendixへ置ける。

---

# 4. Output B — Management Scenario Comparison

## 4.1 Purpose

経営者のPriorityによって、同じACT Optionsでも優先順位が変わることを示す。

AI / atLIBがFUTUREを決めるのではない。

> **「もし○○を優先するなら、このACT群の優先度が上がります」**

というDecision Supportを行う。

## 4.2 Standard Scenario Structure

```text
Scenario A：Management Priority A
経営上の意味：...
Priority ACT：ACT 01 / ACT 03 / ACT 05
Expected Direction：...
Investment Characteristic：...
Trade-off / Risk：...

Scenario B：Management Priority B
...

Scenario C：Management Priority C
...
```

Scenario数は固定しない。無理に3案作らない。

CustomerのFUTURE / FACTから意味のある比較ができる場合のみ複数Scenarioを提示する。

## 4.3 Example — PROPOSAL ONLY

説明用例：

| Scenario | Priority | ACT傾向 |
|---|---|---|
| 社員時間創出 | 社員 / 情シスの手作業削減 | なくす・自動化する・標準化するACTの優先度が上がり得る |
| Trust / Governance | 説明可能性・統制・継続性 | 整える・標準化する・残すACTの優先度が上がり得る |
| Growth without Headcount | 人員増を抑えながら事業拡大 | 自動化・標準化・任せるACTの優先度が上がり得る |

これは固定ロジックではない。Customer Evidenceなしに自動適用しない。

---

# 5. Scenario Comparison — Customer-facing Layout

推奨1ページ：

```text
                    FUTURE
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   SCENARIO A     SCENARIO B     SCENARIO C
   Priority       Priority       Priority
      │              │              │
   ACT 01          ACT 02          ACT 01
   ACT 03          ACT 04          ACT 05
   ACT 05          ACT 06          ACT 06
      │              │              │
 投資特性         投資特性         投資特性
 Trade-off       Trade-off       Trade-off
```

Customerへ「おすすめ1案」を先に押し付けず、FACT / Priorityとの関係を示す。

Consultant Recommendationを提示する場合は、

- **Recommendation**
- **Supporting FACT**
- **Assumption / UNKNOWN**

を明確に分ける。

---

# 6. Output C — Multi-year KAIZEN Roadmap

## 6.1 Purpose

FUTUREへの全体像を示しながら、一括投資ではなく段階的にACTをDecisionできるようにする。

> **FUTUREは数年単位、ACTは段階的に。**

Roadmapは未来の契約を確定するものではない。

## 6.2 Roadmap Time Semantics

```text
NOW
│
├ Year 1 — PRIORITY ACT
│   現在のFACTから実行をDecisionする対象
│
├ Year 2 — CANDIDATE ACT
│   Year 1のCHANGE / NEW FACTを確認して再Decision
│
└ Year 3+ — DIRECTION / CANDIDATE ACT
    FUTUREへの方向性。現時点でCommitしない
```

Year 1 / 2 / 3は標準的な説明単位であり、案件によってQuarter / Half-year等を使うことを妨げない。

## 6.3 Roadmap Item

各Roadmap ACTには可能な範囲で以下を表示する。

- ACT ID / Name
- FUTURE linkage
- Domain
- Expected CHANGE
- Dependency
- Decision Timing
- Indicative investment range where supportable
- Actor candidate where relevant
- Verification timing

---

# 7. Roadmap — Customer-facing Layout

推奨1ページ：

```text
FUTURE ─────────────────────────────────────────→

        YEAR 1             YEAR 2             YEAR 3+
     ┌──────────┐       ┌──────────┐       ┌──────────┐
     │ ACT 01   │       │ ACT 04   │       │ ACT 07   │
     │ ACT 02   │       │ ACT 05   │       │ ACT 08   │
     │ ACT 03   │       │          │       │          │
     └──────────┘       └──────────┘       └──────────┘
        PRIORITY           CANDIDATE          DIRECTION
            │
            ↓
      CHANGE / NEW FACT
            │
            └────────→ ROADMAP REVIEW → Year 2 Decision
```

視覚上もYear 1とYear 2以降の確度を区別する。

- Year 1：Decision対象
- Year 2：Candidate
- Year 3+：Direction

すべてを同じ確定色 / 表現にしない。

---

# 8. Investment Presentation Standard

投資額がEvidenceにより提示可能な場合でも、単純な全期間総額だけを中心表示しない。

推奨：

```text
Year 1 Investment：...
Year 2 Candidate Investment：...
Year 3+ Directional Investment：...
```

必要に応じてTotal Directional Investmentを参考表示できるが、Candidate / UNKNOWNを確定金額として合算しない。

投資提示には以下を区別する。

- Confirmed / Quoted
- Indicative Range
- UNKNOWN / Requires Vendor Quote

根拠のない精密な金額を作らない。

---

# 9. Management Decision Page

3 Outputの最後に、Decision専用ページ / Sectionを設ける。

```text
今回のDecision

1. 何を優先するか
   [Management Priority]

2. どのACTを実行するか
   [Selected ACT IDs]

3. 今回は実行しない / HoldするACT
   [IDs + Reason]

4. 追加Evidenceが必要なもの
   [UNKNOWN + Evidence Needed]

5. Actor Allocation
   [Customer / Existing Vendor / Other Vendor / atLIB / Combination]

6. Expected CHANGE / Verification
   [何が変われば前進したと言えるか]

7. Next Decision Timing
   [いつNEW FACTを見て次をDecisionするか]
```

Decision Recordは「atLIB発注書」の代替ではない。

---

# 10. Recommended Customer Story

Assessment最終報告は次の順番を標準Storyとする。

```text
1. どんな会社を目指すか — FUTURE
2. 今どこにいるか — FACT / UNKNOWN
3. 何が離れているか — GAP
4. なぜ起きているか — ROOT CAUSE
5. 何ができるか — ACT OPTIONS
6. 何を優先すると選択が変わるか — SCENARIOS
7. どの順番なら進められるか — ROADMAP
8. 何を選ぶか — HUMAN DECISION
9. 誰が担うか — ACTOR ALLOCATION
10. 本当に変わったか何で確認するか — VERIFICATION
```

---

# 11. FACT FIRST Presentation Rules

Customer-facing Outputでは必ず以下を守る。

- FACTとUNKNOWNを視覚的に区別する
- HYPOTHESISを原因として断定しない
- ACT OptionとRecommendationを混同しない
- Expected CHANGEをActual CHANGEとして書かない
- Indicative InvestmentをQuoteとして書かない
- Year 2 / Year 3 CandidateをCommitmentとして書かない
- Customer PriorityをAI / atLIBが勝手に確定しない
- ActorをACT Decisionより先に固定しない
- atLIBが提供できないACTも必要ならOptionに残す

---

# 12. Pilot Validation Metrics

初回Pilotで以下を記録する。

- Decision OwnerがACT Optionsの違いを自分の言葉で説明できたか
- `やる / やらない` だけでなく `どれをやるか` の会話になったか
- Management PriorityをCustomer自身が選択 / 修正したか
- Scenario ComparisonがDecisionに利用されたか
- RoadmapによりYear 1 ACTを切り出せたか
- Year 2以降がCandidateであることを理解できたか
- CustomerがInvestmentの段階性を理解したか
- Hold / Additional Evidenceも選択肢として機能したか
- Actor Neutralityが維持されたか
- Decision Session準備工数
- Option / Scenario / Roadmap作成工数

成約率・LTV・失注率への効果は現時点ではUNKNOWNであり、別途Sales Evidenceとして計測する。

---

# 13. Status / Boundary

DECIDED / Canonical Methodから継承：
- FUTURE First
- FACT / UNKNOWN
- 3 Domains × 6 Lenses = Design Space
- ACT Options
- Management Priority
- Human Decision selects ACT
- CHANGE is verified result
- Actor Neutrality
- staged investment
- NEW FACT → next ACT Decision

PROPOSAL FOR PILOT VALIDATION：
- ACT Option Cardの具体フォーマット
- Scenario Comparisonの具体フォーマット
- Roadmapの具体フォーマット
- 7項目Decision Page
- Customer Story順序

UNKNOWN：
- 最適なACT Option表示数
- 最適なScenario数
- 最適なRoadmap期間 / 粒度
- Customerが最も理解しやすい投資表示方式
- 各Output作成に必要な標準工数

Pilot Evidenceから更新する。
