# IT経営KAIZEN — Controlled Pilot Business Operations Pack v1

Status: BUSINESS / PILOT OPERATIONS — PROPOSAL FOR VALIDATION
Date: 2026-09-14

## 0. Purpose

Controlled Customer PilotのTechnical GO / CONDITIONAL GOが出た時点で、Business側が実顧客対応を開始できるよう、Management Feedback運用に必要なHuman Review Sheet、当日進行、Decision Record、Pilot Observationを定義する。

本書はS社を最初の実顧客候補として利用可能な形にするが、S社への実データ投入や実施承認を意味しない。

> Controlled Customer Pilot GO / explicit CONDITIONAL GO before real customer data.

---

# 1. Operating Roles — Pilot Minimum

Pilot開始前に実名Ownerを割り当てる。以下はRole定義であり、人名は未決定。

## Diagnosis Owner
- 診断Case全体のBusiness Owner
- Customer Journeyが途中で途切れないことを管理

## Human Reviewer
- AI SuggestionをCustomer-facing化する前にReview / Correction / Approval
- FACT / UNKNOWN / HYPOTHESIS boundaryを守る

## Management Feedback Facilitator
- 経営者とのFeedbackを進行
- Customer Correction / Decision / Restatementを確認

## Customer Follow-up Owner
- Feedback後の約束 / 追加確認 / Assessment提案等を管理

## Technical Incident Escalation
- Development / Operations側で指定

## Privacy / Security Escalation
- Business Policy doc66およびTechnical / Legal policyに従い指定

Guardrail:
一人が複数Roleを兼務することは可能。ただし責任の所在は曖昧にしない。

---

# 2. Human Review Sheet

Customer-facing 5-page Outputを出す前に必ず確認する。

## A. Case Boundary
- [ ] Customer / Caseが正しい
- [ ] Current diagnosis version / sourceが正しい
- [ ] Customer-facing利用が許可された情報のみ
- [ ] Transcript / Recordingがある場合、必要な同意条件を満たす

## B. FUTURE
- [ ] Customerが述べたFUTUREか
- [ ] FUTUREが未確認ならUNKNOWNとして表示している
- [ ] TriggerをFUTUREへ勝手に変換していない
- [ ] IT施策をFUTUREと混同していない

## C. FACT / UNKNOWN
- [ ] Customer InputとEvidence-confirmed FACTを混同していない
- [ ] Observationと解釈を分離している
- [ ] UNKNOWNを隠していない
- [ ] source / provenanceが追える
- [ ] 矛盾する情報があれば解消せず明示 / 確認対象にしている

## D. GAP
- [ ] FUTUREとのRelationがある
- [ ] Confirmed GAP / Candidate GAPを区別している
- [ ] FUTURE UNKNOWN時にCustomer-specific GAPを断定していない
- [ ] 一般論 / best practiceをS社固有課題として扱っていない

## E. WHY
- [ ] HYPOTHESIS labelがある
- [ ] Supporting Observation / Contextがある
- [ ] Evidence Neededがある
- [ ] 原因断定になっていない
- [ ] unsupported / harmful inferenceを除去した

## F. NEXT DECISION
- [ ] Material DecisionがFUTURE / GAPと接続している
- [ ] A/B/C/D RouteをAIが確定していない
- [ ] Assessmentを営業都合で自動推奨していない
- [ ] atLIBをActorとして自動選択していない
- [ ] Next Action候補が明確

## G. Customer-facing Quality
- [ ] 経営者が読める日本語
- [ ] 内部Product terminologyに依存していない
- [ ] 不要な英語 / technical jargonを避けた
- [ ] 効果保証 / unsupported numeric claimがない
- [ ] Human ReviewerがCustomer-facing利用を承認

### Review Result
- APPROVED
- APPROVED WITH CORRECTION
- RETURN FOR REWORK
- HOLD

Reviewer:
Review Date:
Material Corrections:
Open UNKNOWN:

---

# 3. Pre-Feedback Brief — 10 minutes internal

Management Feedback直前にFacilitatorとReviewerが確認する。

1. Customer FUTURE status: KNOWN / PARTIAL / UNKNOWN
2. Top 3 Known Context
3. Top 3 UNKNOWN
4. Candidate GAPs — confirmed / candidate
5. Material Hypotheses
6. Evidence Needed
7. Most important management question
8. Routeは未決定であること
9. Customer Correctionを歓迎すること
10. FeedbackのゴールはAssessment受注ではなくNEXT DECISIONであること

---

# 4. Management Feedback Facilitation Sheet — 45 min candidate

## 0–5 min — Boundary

> 本日は問題点を断定する場ではありません。今後どんな会社にしたいか、そのFUTUREに対して現時点で分かっていることと、まだ確認できていないことを分け、次に何を判断する必要があるかを一緒に整理します。

Facilitator check:
- [ ] Customer understood purpose
- [ ] Sales pitch modeに入っていない

## 5–13 min — FUTURE

Main question:
> これから1〜3年で、どんな会社にしたいですか？

S社 contextual candidate:
> IPOを一つの節目としたとき、1〜3年後、ITの面でもどんな会社になっていたいですか？

Capture verbatim phrases where material.

## 13–21 min — FACT / UNKNOWN

> この理解に誤りや不足はありませんか？

Capture:
- Confirmed / corrected Customer Input
- New information
- New UNKNOWN
- Contradictions

Do not silently rewrite source history.

## 21–28 min — GAP

> FUTUREに対して見ると、ここは課題と決めつけるより、まず確認すべき点だと考えています。

Capture:
- Customer agrees / disagrees
- priority
- management relevance

## 28–34 min — WHY

> 現時点では原因を確定していません。考えられる可能性と、確認に必要なEvidenceを分けて見ています。

Capture:
- Hypothesis accepted as plausible / rejected / modified
- new Observation
- Evidence available / unavailable

## 34–42 min — NEXT DECISION

Question:
> FUTUREを実現するために、まず何を明らかにしてから次の投資・体制・施策を決めるべきでしょうか？

Discuss route without forcing:
- A Direct ACT
- B Focused Confirmation
- C Design Assessment
- D Stop / Hold

## 42–45 min — Customer Restatement

> 今日の話を踏まえると、次に何を確認・判断する必要があると感じましたか？

Capture Customer's own words.

---

# 5. Management Feedback Decision Record

## Decision Context
- Customer:
- Case:
- Feedback Date:
- Participants:
- FUTURE status:
- Approved FUTURE / Customer wording:
- Material Known Context:
- Material UNKNOWN:
- Material GAP:
- Unresolved HYPOTHESIS:
- Evidence Needed:

## Human Decision
- Selected Route: A / B / C / D
- Decision statement:
- Decision maker:
- Rationale if stated:
- Next Action:
- Actor: Customer / Existing Vendor / Other Vendor / atLIB / Undecided

## Customer Restatement
Verbatim / faithful summary:

## Follow-up
- Follow-up type:
- Timing meaning:
- Date if agreed:
- Owner:

Note: date semantics must not be collapsed into a generic Due Date in Business meaning.

## Snapshot Requirement
The Decision must remain traceable to the Context known at the time. Implementation method is not specified by Business Lane.

---

# 6. Route-specific Business Handoff

## Route A — Direct ACT
Required:
- Decision
- ACT definition
- Actor
- acceptance / completion meaning
- Verification plan

Do not require Assessment solely because it is the commercial next product.

## Route B — Focused Confirmation
Required:
- specific UNKNOWN / question
- Evidence Needed
- who will obtain it
- confirmation timing meaning
- Decision to revisit after confirmation

Do not turn B into a mini-Assessment product without Human Decision.

## Route C — Design Assessment
Required before proposal:
- Material Decision requiring Evidence
- UNKNOWN / Evidence Gap
- why assumptions are risky
- candidate Assessment Scope

Proposal sequence:
FUTURE → Material Decision → UNKNOWN / Evidence Gap → Risk → Scope → Decision Outputs → Schedule → Price.

Price DECIDED: ¥1,200,000 pre-tax.

## Route D — Stop / Hold
Required:
- reason if Customer states one
- whether revisit is desired
- trigger / timing if agreed

Stop / Hold is a valid Decision, not a failed funnel state.

---

# 7. Pilot Observation Sheet

## Funnel / Journey Facts
- Diagnosis started / completed
- Human Review completed
- Management Feedback completed
- selected Route
- Assessment proposed yes/no
- Assessment accepted / declined / pending if applicable

## Time Evidence
- Human Review minutes
- Feedback preparation minutes
- Feedback actual minutes
- manual re-entry minutes

## AI / Human Evidence
- AI suggestions materially corrected
- AI suggestions rejected
- unsupported claims caught before customer-facing
- Human additions

For Pilot, examples matter more than optimizing a vanity count.

## Customer Evidence
- Customer corrections
- new UNKNOWN identified
- Customer questions
- confusing wording / screen
- strongest engagement topic
- objection / concern
- Customer restatement quality
- qualitative feedback

## Continuity Evidence
- information re-entered manually
- Context lost between stages
- provenance difficult to understand
- Follow-up difficult to represent
- Assessment handoff gaps

## Commercial Neutrality Check
- Assessment pushed despite insufficient reason? yes/no
- atLIB Actor assumed before Decision? yes/no
- Direct ACT / other vendor / Stop route treated as valid? yes/no

---

# 8. S社 Pre-Pilot Brief — Current FACT Boundary

## Customer Input
- 200〜300名規模
- IPO準備中
- IT部長退職
- 情報システム部 → 情報システム課
- 新任課長候補が着任
- 取締役本部長の所掌
- 取締役本部長はIT専門知見を多く持つ立場ではない
- 業務委託1名常駐
- PC / スマホキッティング
- 請求書管理
- 問い合わせ対応

## UNKNOWN
- S社FUTURE
- IPO準備の具体Phase / IT要求
- IT responsibility / authority
- 新任課長のCapability / responsibility
- IT landscape
- governance / security / evidence status
- Human Work
- former IT manager knowledge / decision / vendor dependency
- priority IT decisions

## HYPOTHESIS
- Continuity Gapの可能性
- IT Management Capability Gapの可能性
- 定常運用とManagement / Improvementの競合可能性
- IPO / Trustに必要なIT Evidence Gapの可能性

Do not promote these hypotheses to FACT before customer / evidence confirmation.

---

# 9. Pilot Exit Review — Internal 30 min candidate

Pilot終了後、以下をFACT / OBSERVATION / UNKNOWN / HYPOTHESIS / PROPOSALに分ける。

1. Customer Journeyは理解されたか
2. FUTURE-firstは経営者に機能したか
3. FACT / UNKNOWN表示は理解されたか
4. HYPOTHESIS boundaryは理解されたか
5. Customer Correctionは自然に起きたか
6. NEXT DECISIONは明確になったか
7. A/B/C/D Routeは実務上有効だったか
8. Assessment transitionは自然だったか
9. Human Review負荷はどの程度だったか
10. 二重入力 / manual workはどこに残ったか
11. System / Application Gapは何か
12. Business MethodのGapは何か
13. Customer valueを示すEvidenceは何が得られたか

One pilot anecdote alone does not change Canonical. Material evidence may create a Proposal for Human Decision.

---

# 10. Controlled Pilot Business Readiness Checklist

Business side ready when:

- [ ] Candidate customer selected
- [ ] Customer contact owner assigned
- [ ] Diagnosis Owner assigned
- [ ] Human Reviewer assigned
- [ ] Feedback Facilitator assigned
- [ ] Follow-up Owner assigned
- [ ] Management Feedback 5-page template available
- [ ] Human Review Sheet available
- [ ] Decision Record available
- [ ] Pilot Observation Sheet available
- [ ] Customer notice / expectation wording implemented and approved for pilot
- [ ] AI / Transcript consent handling matches doc66
- [ ] privacy / security escalation route known
- [ ] technical incident route known
- [ ] Development Controlled Pilot GO / explicit CONDITIONAL GO received

Only after all material gates are satisfied should real customer data enter the pilot system.

---

# 11. Status

Reused DECISION:
- FUTURE-first
- FACT / UNKNOWN separation
- AI Suggests. Human Decides. System Records.
- Human Review
- Commercial / Actor Neutrality
- Assessment ¥1.2m pre-tax
- Business Decision completed ≠ Production Ready

PROPOSAL FOR PILOT VALIDATION:
- Role model
- Human Review checklist
- 45-minute facilitation sheet
- Decision Record format
- Pilot Observation fields
- Pilot Exit Review

S社 participation, Pilot date, named owners, and Assessment necessity are NOT DECIDED by this document.