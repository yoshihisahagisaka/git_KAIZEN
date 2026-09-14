# IT経営KAIZEN — Management Feedback Business Output Specification v1

Status: BUSINESS / OUTPUT SPECIFICATION — PROPOSAL FOR PILOT VALIDATION
Date: 2026-09-14

## 0. Purpose

無料IT経営診断システムの結果をHuman Reviewした後、経営者とのManagement Feedbackで使用するCustomer-facing 5-page OutputのBusiness Meaningを定義する。

これはUI / DB / API / Core Object specificationではない。
Development LaneはこのBusiness Meaningを満たすApplication / Translation Layerを設計する。

Core Flow:

```text
Customer Input
→ Diagnosis / AI Suggestion
→ Human Review / Correction / Approval
→ Management Feedback 5-page Output
→ Customer Correction / Discussion
→ NEXT DECISION
→ A / B / C / D
```

---

# 1. Cross-page Information Classes

Customer-facing Outputで以下の意味を混同しない。

## Customer Input
顧客が回答 / 発言した情報。Customer-originであることは確かだが、外部Evidenceで検証済みとは限らない。

## Observation
人またはSystemが観察した事象。解釈 / 原因とは分離する。

## Evidence-confirmed FACT
必要なEvidenceにより確認され、Human Review上FACTとして扱える情報。

## UNKNOWN
現時点では確認できていない情報。空欄ではなくMeaningを持つ。

## HYPOTHESIS
FACT / Observation / Customer Input等から考えられる説明候補。確定原因ではない。

## AI Suggestion
AIによる整理 / 要約 / 候補提示。Human Approval前はCustomer-facing authoritative resultではない。

## Human Approved Result
HumanがCustomer-facing利用可能と判断したOutput。

## Customer Correction
Management Feedback中にCustomerが訂正 / 補足した情報。Correction後もProvenanceを保持する。

## Human Decision
Customer / authorized Humanが次に何をするか決めた結果。

---

# 2. Common Output Rules

1. AI OutputをそのままCustomer-facing FACTにしない。
2. Customer InputをEvidence-confirmed FACTへ自動昇格させない。
3. UNKNOWNを隠さない。
4. HYPOTHESISを断定文で表示しない。
5. Customer Correctionを受けられる。
6. Customer-facing化前にHuman Review / Correction / Approvalを必須とする。
7. atLIBをActorとして自動選択しない。
8. Assessmentを自動推奨しない。
9. 5ページは説明資料ではなくManagement DecisionのためのContextを形成する。
10. Management Feedback後に、その時点のContextとDecisionを追跡できることをBusiness Requirementとする。

---

# 3. Page 1 — FUTURE

## Purpose

経営者が実現したい会社の将来状態を、以降のGAP / Decisionの比較基準として共有する。

## Fixed Elements

- Page label: FUTURE
- Main question
- FUTURE status
- Business Trigger / Context
- Customer wording / approved summary

## Main Question

> これから1〜3年で、どんな会社にしたいですか？

顧客文脈に応じた補助質問は可。

## Variable Elements

- Customer-defined FUTURE
- Business Trigger
- desired employee / management / business state
- ITへのManagement expectation

## FUTURE UNKNOWN State

FUTUREが未確認の場合、AIが理想像を生成して埋めない。

Customer-facingでは明示的に：

> **FUTURE：まだ確認できていません**

または同等のMeaningを表示する。

その場合Page 1自体がManagement Feedback中の確認画面として機能する。

## Information Sources

- Web diagnosis answer
- Sales proxy input
- Management Conversation
- Customer correction during Feedback

## AI Allowed

- Customer wordingの要約候補
- related statementsのgrouping
- clarification question候補

## AI Not Allowed

- Customerが言っていないFUTUREの確定
- generic best practiceをCustomer FUTUREとして挿入
- IPO / DX / Security等のTriggerを自動的にFUTUREへ変換

## Human Review

- Customer wordingとの整合
- 過剰な抽象化 / 意味変更の有無
- FUTUREとIT施策を混同していないか

## Customer Correction

Feedback中にFUTUREを訂正 / 追加可能。
Customer wordingを優先してApproved Contextへ反映する。

## Handoff

Approved FUTUREまたはFUTURE UNKNOWNをPage 3 GAPおよびNext Decision Contextへ接続する。

---

# 4. Page 2 — FACT / UNKNOWN

## Purpose

経営者が「現時点で把握していること」と「まだ確認が必要なこと」を区別できるようにする。

## Fixed Elements

- Page label: FACT / UNKNOWN
- Known-side area
- Unknown-side area
- source / status meaning
- Customer confirmation prompt

## Important Business Rule

Page title上のFACTはCustomer-facing shorthandとして使用可能だが、内部MeaningではCustomer Input / Observation / Evidence-confirmed FACTを区別する。

Customer InputをすべてEvidence-confirmed FACTと表示してはならない。

## Recommended Customer-facing Projection

### 現時点で把握していること

各項目は必要に応じて：
- お客様から伺っていること
- 確認できている事実
- 観察できていること

のMeaningを保つ。

### まだ確認が必要なこと

- UNKNOWN
- Evidence Needed
- unanswered management question

## Variable Elements

- Customer Input
- Observation
- Evidence-confirmed FACT
- UNKNOWN
- Evidence Needed

## Information Sources

- Diagnosis answers
- source records
- interview / sales input
- evidence references if available
- Human correction
- Customer correction

## AI Allowed

- duplicate consolidation
- grouping
- concise customer-facing summary
- UNKNOWN candidate suggestion

## AI Not Allowed

- source-less FACT creation
- unanswered itemの補完
- Customer InputのEvidence confirmation

## Human Review

- provenance / status integrity
- unsupported claim removal
- UNKNOWN omission check
- duplicate / contradiction check

## Customer Correction

Prompt:

> この理解に誤りや不足はありませんか？

Customer correctionは元情報を消して上書きするのではなく、Correctionが起きたことを追えるMeaningを保持する。

## Handoff

Corrected ContextをPage 3 / Page 4 / Next Decisionへ使用する。

---

# 5. Page 3 — GAP

## Purpose

FUTUREと現在Contextの間で、何を確認 / 改善 / Decisionする必要があるかを整理する。

## Fixed Elements

- Page label: GAP
- FUTURE reference
- GAP status
- theme / area
- why it matters to FUTURE
- confirmation needed if not established

## GAP States

### Confirmed GAP
FUTUREとEvidence-confirmed current stateの差が十分確認されている。

### Candidate GAP
Customer Input / Observation / UNKNOWN等から確認価値があるが、まだGAPとして確定できない。

FUTUREがUNKNOWNの場合、原則としてCustomer-specific Confirmed GAPを確定しない。

## Variable Elements

- GAP theme
- Current Context
- FUTURE relation
- impact / management relevance
- confirmation needed

## AI Allowed

- Candidate GAP suggestion
- grouping by 技術 / 運用 / 管理等
- FUTUREとのrelation候補提示

## AI Not Allowed

- FUTURE未確認状態でCustomer-specific GAPを断定
- generic best practiceとの差を自動的にCustomer GAPとする

## Human Review

- FUTURE relation
- confirmed / candidate boundary
- management relevance
- sales convenienceによるGAP作成がないか

## Customer Correction

Customerが「それは課題ではない」「優先度が違う」等をCorrection可能。

## Handoff

Material GAP / Candidate GAPをWHYおよびNext Decisionへ接続する。

---

# 6. Page 4 — WHY

## Purpose

GAP / Observationがなぜ起きている可能性があるかを、原因断定ではなくEvidence確認可能なHypothesisとして示す。

## Fixed Structure

各WHY itemは原則：

```text
HYPOTHESIS
↓
Supporting Observation / Context
↓
Evidence Needed
```

## Fixed Elements

- Page label: WHY
- HYPOTHESIS label
- Supporting Observation
- Evidence Needed
- confidence / certaintyを誤認させない表現

## Variable Elements

- Hypothesis text
- supporting items
- evidence needed
- relevant GAP

## AI Allowed

- Hypothesis candidate generation
- Observationとのrelation suggestion
- Evidence Needed candidate suggestion

## AI Not Allowed

- HypothesisをROOT CAUSE確定として表示
- EvidenceなしのCustomer-specific accusation / conclusion
- AI confidence scoreだけで原因確定

## Customer-facing Language

NG:
> 原因は○○です。

OK:
> 現時点では○○の可能性があります。判断するには△△の確認が必要です。

## Human Review

- supporting observation exists
- contradiction check
- Evidence Needed is actionable
- harmful / unsupported inference removal
- Hypothesis label retained

## Customer Correction

Customerが背景情報を追加した場合、Hypothesisを更新 / rejectできる。

## Handoff

Unresolved Hypothesis + Evidence NeededをNext Decision / Focused Confirmation / Assessment Scope candidateへ接続する。

---

# 7. Page 5 — NEXT DECISION

## Purpose

Management Feedbackを説明会で終わらせず、経営者が「次に何をDecisionするか」を明確にする。

## Fixed Elements

- Page label: NEXT DECISION
- Material Decision
- why now / relation to FUTURE
- current Known / UNKNOWN
- Evidence Needed
- Route options
- Customer Decision
- Next Action

## Route Options

### A — Direct ACT
情報が十分で、追加AssessmentなしでACTをDecisionできる。

### B — Focused Confirmation
限定的なEvidence確認が必要。

### C — Design Assessment
Materialな経営Decisionに必要なEvidenceが不足している。

### D — Stop / Hold
現時点では進めない。

これらはBusiness Projectionであり、新Core Object要求ではない。

## AI Allowed

- candidate Material Decision
- candidate route suggestion
- Evidence Needed summary
- next action candidate

## AI Not Allowed

- Routeを自動確定
- Assessmentを自動選択
- atLIBをActorとして自動選択
- Customer Decisionを生成

## Human Decision

Route / Next ActionはHuman Decision。

Customer-facing final question candidate：

> 今日の話を踏まえると、次に何を確認・判断する必要があると感じましたか？

## Customer Restatement

顧客自身の言葉でNext Actionを説明してもらう。

Business Requirement：Customer restatementをPilot Evidenceとして取得する。

## Immutable Context Snapshot Requirement

Decision時点で最低限以下のMeaningを後から追えること：

- FUTURE / FUTURE UNKNOWN
- Known Context
- UNKNOWN
- material GAP
- unresolved Hypothesis
- Evidence Needed
- Decision
- selected Route
- rationale if captured
- Next Action

実装方式はDevelopment / Product Laneが判断する。

## Handoff

A → ACT
B → Focused Evidence Confirmation
C → Assessment Proposal
D → Stop / Hold / future revisit

---

# 8. Assessment Transition Boundary

AssessmentはPage 5でRoute CがHuman Decisionされた場合にのみ次工程として扱う。

Transition message：

> ここから先は、可能性のまま投資や体制を決めるのではなく、必要なEvidenceを確認して現在地と次の一手を確定する必要があります。そのための工程がIT経営KAIZENの設計Assessmentです。

5-page Management Feedback OutputではAssessment価格をHero表示しない。

正式提案：

FUTURE
→ Material Decision
→ UNKNOWN / Evidence不足
→ 仮説のまま判断するRisk
→ Assessment Scope
→ Decision Output
→ Schedule
→ Price

Assessment価格DECIDED：¥1,200,000（税別）

---

# 9. Human Review Gate

Customer-facing Output生成前にHuman Review Gateを通す。

## Minimum Checklist

- FUTUREを捏造していない
- Customer InputをEvidence-confirmed FACTへ誤昇格していない
- UNKNOWNを隠していない
- GAPを断定しすぎていない
- WHYがHYPOTHESISとして表示されている
- Supporting Observationがある
- Evidence Neededがある
- unsupported claimを除去した
- NEXT DECISIONがCustomer Decisionになっている
- Assessmentを営業都合で選んでいない
- atLIBをActorとして自動選択していない

Human Approval後のみCustomer-facing Feedbackへ進む。

---

# 10. Customer Correction Loop

Management Feedbackは静的レポート配布ではない。

```text
Human Approved Output
→ Customer Feedback / Correction
→ Context Correction
→ UNKNOWN update
→ Hypothesis update / reject
→ NEXT DECISION
```

Customer Correction自体をNEW FACTとして自動扱いしない。Correctionの内容とProvenanceに応じてMeaningを判断する。

---

# 11. Pilot Evidence Requirements

S社等のControlled Pilotで最低限記録したいBusiness Evidence：

- Human Review time
- Feedback preparation time
- AI Suggestion corrected / rejected count or examples
- Customer corrections
- FUTURE initially known / unknown
- newly identified UNKNOWN
- Feedback actual duration
- selected Route
- Customer restatement
- Next Action
- Follow-up type / timing
- Assessment proposed yes / no
- duplicate entry / manual re-entry
- Customer confusion points
- Customer qualitative feedback

Pilot metricsはBusiness learning用であり、Customer value claimとして外部表示しない。

---

# 12. Fixed vs Variable Summary

## Fixed Business Structure

- 5-page sequence
- Information meaning boundaries
- Human Review requirement
- Customer Correction loop
- NEXT DECISION routing concept
- Commercial / Actor Neutrality

## Variable per Customer

- FUTURE
- Customer Context
- Known / UNKNOWN
- GAP
- HYPOTHESIS
- Evidence Needed
- Material Decision
- Route
- Next Action
- Actor

---

# 13. Development Handoff Contract

Development Laneへの要求は以下。

> このBusiness Meaningを、現行Architectureを優先的に再利用し、Application / Translation Layerで可能な限り実現する。

Developmentは以下を独立して判断する：

- UI layout
- internal data representation
- Projection implementation
- Snapshot implementation
- API design
- workflow implementation
- persistence method

Business Laneは新Core Object / Table / APIを指定しない。

Technical impossibility / material Architecture conflict / material costが判明した場合はFACTとしてBusinessへ返す。

---

# 14. Product Lane Boundary

Typed Temporal Meaningは別途Product Lane Architecture Validation対象。

- Next Decision確認日
- Assessment回答予定日
- Evidence確認日
- ACT期限
- Vendor約束日
- CHANGE Verification日
- Quarterly / Annual Review

これらを単一Due Date意味へ潰さないことのみBusiness Requirementとして固定する。

---

# 15. Status

Existing DECISION reused:
- FUTURE-first
- FACT / UNKNOWN separation
- AI Suggests. Human Decides. System Records.
- Human Review
- 5-block Management Feedback
- Commercial / Actor Neutrality
- Assessment ¥1.2m pre-tax
- Assessment → FACTACT continuity direction

PROPOSAL FOR PILOT VALIDATION:
- detailed 5-page fixed / variable content
- customer-facing projection language
- Customer Correction loop details
- immutable Decision Context Snapshot business requirement
- Pilot Evidence fields

No new FACTACT Core Object is decided by this specification.