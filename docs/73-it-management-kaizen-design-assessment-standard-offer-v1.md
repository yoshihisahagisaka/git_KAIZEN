# IT経営KAIZEN — 設計Assessment Standard Offer v2

Status: BUSINESS / STANDARD OFFER — PROPOSAL FOR VALIDATION
Date: 2026-09-14
Price: ¥1,200,000（税別） — DECIDED
Method Canonical: `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`

## 0. Purpose

Route Cの「設計Assessment」を再現可能な標準商品として定義する。Assessmentは無料診断で見つかった可能性を理由にatLIBのサービスを売る工程ではない。

> **可能性を、経営判断できるFACTへ変える。**

さらにFACTから会社を良くする複数のACT Optionsと投資の道筋を設計し、経営者が比較して次のACTをHuman Decisionできる状態をつくる。

> **Customer Arrival：経営者が、FACTをもとに複数のACT Optionsと優先順位を比較し、次に実行するACTをDecisionできる。**

---

## 1. Position in Customer Journey

```text
FUTURE → 無料IT経営診断 → Human Review → Management Feedback → NEXT DECISION
  ├ A Direct ACT
  ├ B Focused Confirmation
  ├ C Design Assessment
  └ D Stop / Hold
```

AssessmentはRoute Cの場合のみ提案する。条件は、Materialな経営Decisionを行うために現在のEvidenceが不足していること。Assessment受注自体をGoalにしない。

---

## 2. What Customer Buys

Customerが購入するのは調査工数や報告書ではない。

> **FUTUREとFACTから会社を良くする選択肢を設計し、経営者が「どのACTを実行するか」を判断できる状態。**

Assessmentは、FUTURE / Management PriorityのDecision基準化、Evidence確認、FACT / UNKNOWN明確化、Material GAP特定、ROOT CAUSEのEvidence確認、3 Domains × 6 LensesによるACT Options設計、Management Priority別Scenario比較、Multi-year KAIZEN Roadmap、Decision Session、ACT / Actor AllocationへのHandoffを提供する。

---

## 3. Boundary

Assessmentは、網羅的IT監査、法定監査、IPO監査意見、ISMS認証審査、脆弱性診断、Penetration Test、製品選定だけの調査、atLIB Managed Service導入診断、IT部門の採点大会ではない。

また、**3 Domains × 6 Lensesの18項目を全て採点するチェックリストでも、全IT改善を一括実行するための販売診断でもない。**

---

## 4. Start Condition

開始前に、Material Decision、FUTURE / FUTURE UNKNOWN、Management Priority / UNKNOWN、Why Assessment、Scope、Decision Owner、Customer Contactを確認する。

FUTURE / Management Priorityが完全に確定していなくても開始可能だが、その場合clarificationをScopeへ含める。

---

## 5. Design Space

3 Domains：**技術・運用・管理**。

6 Lenses：**なくす・自動化する・標準化する・任せる・残す・整える**。

> **3 Domains × 6 Lensesは18項目の網羅チェックではなく、ACT Optionsを設計するDesign Spaceである。**

> **FUTUREが何を優先するかを決め、3 Domains × 6 LensesがどうKAIZENするかを設計する。**

技術にはIdentity / Device / Cloud / SaaS / Network / Security / Data / Infrastructure / Integration等、運用にはJML / Helpdesk / Device Lifecycle / Update / Incident / Vendor / Knowledge / Asset / Recurring Work等、管理にはResponsibility / Authority / Decision / Policy / Investment / Risk / Governance / Evidence / KPI / Continuity等を含み得る。対象はMaterial Decisionに必要な範囲を選ぶ。

---

## 6. Evidence Model

質問票回答だけでFACTを確定しない。System configuration、screenshots、account / device / asset、SaaS / contract / license、policy / procedure、tickets、logs、organization、vendor scope、cost、management materials、interview、workflow observation等からEvidenceを確認する。

Evidenceが確認できなければUNKNOWNとして残す。Evidence availability自体もAssessment Resultとなり得る。

---

## 7. Standard Delivery Process — PROPOSAL FOR PILOT VALIDATION

### Phase 0 — Scope & Decision Setup
FUTURE / Priority / Material Decision / Scope / Evidence Request / Interview対象を確認。Output：Assessment Charter。

### Phase 1 — Evidence Collection
Documents / system / management / operator / approved vendor / workflow Evidenceを確認。Output：Evidence Register / UNKNOWN Register。

### Phase 2 — FACT Structuring
FACT / UNKNOWN / Observation / Contradiction / Missing Evidenceを整理。Output：Current State FACT Map。

### Phase 3 — GAP / ROOT CAUSE Analysis
`FUTURE vs Current FACT → GAP → ROOT CAUSE Hypothesis → Evidence Confirmation`。Output：Material GAP / Root Cause Analysis。

### Phase 4 — ACT Option Design
Material GAP / ROOT CAUSEに対し、3 Domains × 6 Lensesから複数のACT Optionsを設計する。atLIB提供可能範囲に限定しない。Output：ACT Option Portfolio。

### Phase 5 — Scenario & Multi-year Roadmap Design
必要に応じ、Management Priorityを変えた場合のKAIZEN Scenarioを比較する。例として社員工数削減、IPO / Trust / Governance、人を増やさない成長等があるが、固定Scenarioではない。

FUTUREへの道筋としてYear 1 Priority ACTs、Year 2 / 3 Candidate ACTsを配置する。Year 2以降は固定Commitmentではなく、CHANGE / NEW FACTで再Decisionする。Output：Scenario Comparison / Multi-year KAIZEN Roadmap。

### Phase 6 — Management Decision Session
FUTURE、FACT / UNKNOWN、GAP、ROOT CAUSE、ACT Options、Scenario、Priority、Dependency、Risk、Evidenceで支えられる範囲のInvestment / Effort、Roadmapを提示する。

> **HumanがDecisionする主対象は、何を優先し、どのACTを実行するか。**

Stop / Hold / Additional Evidenceも正当なDecision。Output：Management Decision Record / ACT Handoff。

---

## 8. Standard Customer Deliverables — PROPOSAL

1. **Executive Decision Summary** — FUTURE、Priority、重要FACT、Material GAP、Decision Point。
2. **FACT / UNKNOWN Map** — 確認できたこと / 未確認事項。
3. **Evidence Register** — EvidenceとSource / Provenance。
4. **Material GAP & Root Cause Analysis** — FUTUREとのGAPとEvidenceに基づく原因整理。
5. **ACT Option Portfolio & Scenario Comparison** — 3 Domains × 6 Lensesで設計したACT OptionsとPriority別比較。
6. **Multi-year KAIZEN Roadmap** — Year 1 Priority ACTsとYear 2以降Candidate ACTs。NEW FACTで更新する。
7. **Management Decision Record & ACT Handoff** — 選択ACT、残UNKNOWN、Actor候補、Next Action、Verification Requirement。

成果物ページ数をCustomer Valueとして販売しない。

---

## 9. ACT Option Format — PROPOSAL

各Optionは原則、What、Why、Domain、Lens、Supporting FACT、Remaining UNKNOWN、Expected CHANGE、Risk / Dependency、Actor Candidates、Decision Neededを持つ。Evidenceで支えられる場合のみindicative cost / lead time / priorityを加える。

Expected CHANGEは保証成果ではなく、ACT後にVerificationする対象。根拠のないROI / 効果額を生成しない。

---

## 10. Decision & Actor Neutrality

> **「やるか、やらないか」を迫るのではなく、「会社を良くするために、どれをやるか」を一緒に決める。**

必要に応じて、`Management Decision 1：何を優先するか → ACT Options / Scenario Comparison → Management Decision 2：どのACTを実行するか → Actor Allocation` とする。

ActorはCustomer / Existing Vendor / Other Vendor / atLIB / Combinationから選択可能。

> **atLIBに発注することがゴールではない。会社が良くなることがゴールである。**

---

## 11. Commercial Model

DECIDED：**標準価格 ¥1,200,000（税別）**。

価格は工数積算だけで説明しない。Value basisは、Decision Quality、推測によるRisk低減、Evidenceに基づくPriority、複数Option / Scenario比較、段階投資設計、共通認識、FACT / Decision Context継続利用。

標準Scope CeilingはPilot Evidence後にDecisionする。

---

## 12. Duration / Effort — UNKNOWN

標準期間、Interview回数、訪問回数、担当人数、標準Consultant Capacity、Gross Marginは未決定。PilotでPreparation / Evidence Review / Interview / Analysis / Human Review / Option & Roadmap Preparation / Decision Session / Rework / Coordinationを計測する。

---

## 13. Customer Responsibilities — PROPOSAL

Decision Owner参加、Evidence提供、Interview調整、必要なSystem / Vendor情報アクセス調整、Customer Correction、Decision Session参加を原則依頼する。Evidence不足は失敗ではなくUNKNOWNとして残す。

---

## 14. Completion Definition

報告書納品やatLIB後続受注をCompletionとしない。

> **Decision Ownerが、FUTURE / Management Priority、FACT / UNKNOWN、GAP / ROOT CAUSE、ACT Options、Scenario / Roadmapを理解し、次に実行するACTをHuman Decisionできる状態になったこと。**

Completion stateはACT decided、Priority clarification、Additional Evidence、Deferred with reason、Stop / Holdを含む。

---

## 15. Assessment → FACTACT Continuity

```text
Assessment
→ Human Decision：ACT
→ Actor Allocation
→ ACT
→ CHANGE
→ Verification
→ NEW FACT
→ Roadmap Review
→ NEXT KAIZEN / NEXT ACT Decision
```

継続対象はFUTURE、Management Priority、FACT / Evidence、UNKNOWN、GAP、Root Cause、ACT Options、Scenario、Decision、ACT、Expected CHANGE、Verification Requirement、Actual CHANGE / NEW FACT。実装方式はDevelopment / Product Laneで判断する。

---

## 16. Multi-year / Staged Investment Principle

> **FUTUREは数年単位、ACTは段階的に。**

> **一度に全部を売らない。FUTUREへの道筋を示し、NEW FACTを確認しながら次の投資をDecisionする。**

`Year 1 ACT → CHANGE → NEW FACT → Roadmap Review → Year 2 ACT Decision`。

Roadmapは方向とCandidate ACTを示すが、未来のACTをEvidenceなしに固定しない。

---

## 17. S社 Assessment Hypothetical Scope — NOT DECIDED

S社がRoute CをHuman Decisionした場合、FUTURE / IPOを踏まえたIT Management Capability、Responsibility / Authority、IT Operation、Resident Contractor Scope、Knowledge / Continuity、Asset / SaaS / Account、Security / Control Evidence、Vendor / Contract、New Section Manager Role、Recurring Work / Management Work Balance等が候補になり得る。

現時点ではS社Assessment Scopeではない。Management Feedback → NEXT DECISION後に決定する。

---

## 18. Sales Explanation

> **無料診断では、改善の可能性と次に確認すべきことを整理します。設計Assessmentでは、実際のEvidenceから現在地をFACTで確認し、会社のFUTUREに向けた複数のACT Optionsと段階的な投資の道筋を設計します。そのうえで、経営者が「やるか、やらないか」ではなく「どれをやるか」を判断できる状態をつくります。**

Route C transition：

> **ここから先は、可能性のまま投資や体制を決めず、Evidenceを確認して現在地をFACTにする必要があります。そのFACTから選択肢と優先順位を設計し、次に実行するACTをDecisionするための工程が設計Assessmentです。**

---

## 19. Validation Questions for First Pilots

Pilotでは、¥1.2mのDecision Value理解、7成果物、Evidence Request負荷、FUTURE / Priorityの有効性、3 Domains / 6 LensesのDesign Spaceとしての有効性、Scenario Comparison、`どれをやるか` Decision、Multi-year Roadmap / Staged Investment、NEW FACTによるRoadmap更新、Actor Neutrality、Delivery Economics、ACT Handoff、Route Boundaryを検証する。

成約率向上、失注率低下、LTV向上等は現時点でFACTとして扱わない。

---

## 20. Status Summary

### DECIDED / Existing Canonical
- Assessment standard price = ¥1.2m pre-tax
- FUTURE-first / FACT-UNKNOWN separation
- Design = 3 Domains × 6 Lenses → ACT Options
- 3 × 6 is Design Space, not 18-item checklist
- FUTURE / Management Priority determines priority
- Human Decision selects ACT; CHANGE is verified result
- `やるか` ではなく `どれをやるか`
- Actor Neutrality
- Multi-year FUTURE / Roadmap + staged ACT investment
- NEW FACTによる次ACT再Decision
- Assessment → ACT / FACTACT continuity direction

### PROPOSAL FOR PILOT VALIDATION
- 7-phase delivery process（Phase 0–6）
- 7 standard deliverables
- customer responsibilities
- ACT Option format
- Scenario Comparison detail
- Multi-year Roadmap presentation detail
- completion definition detail

### UNKNOWN / TO BE DECIDED AFTER EVIDENCE
- standard calendar duration / interview / onsite count
- consultant capacity / staffing
- exact scope ceiling at ¥1.2m
- gross margin / delivery economics
- Scenario ComparisonのDecision支援効果
- staged investmentのCommercial outcomeへの影響
