# FACTACT — Product UX Architecture

## 1. Purpose

This document defines the shared UX skeleton for FACTACT across Service Models.

It unifies:
- Home
- Work
- Operational Context
- Entity / Recipient views
- Event / Service Process workspaces
- Change / Decision / Learning interactions

The goal is to prevent JOIN, SUPPORT, DEVICE and future Service Models from becoming separate mini-applications with unrelated UI patterns.

The UX must express the product principle:

> **FACT FIRST. From Fact to Action.**

The primary UX question is:

> **What does the user need to know now, and what is the next safe Action?**

FACTACT is not primarily a ticket list. It is a **Service Operating Workspace**.

---

# 2. Product Mental Model

The user should gradually understand FACTACT through five concepts, without needing to learn the internal domain model first:

1. **Now — 今やること**
2. **Context — 判断に必要な情報**
3. **Why — なぜこの対応が必要か**
4. **Change — この仕事で何が変わるか / 変わったか**
5. **Learn — 次の仕事に何を残すか**

Internal domain semantics remain richer:

> Event → Requirement → Work → Action → Change → Verify → Fact → Learn → KAIZEN

But the operator should not be forced to navigate that graph manually.

---

# 3. Global Information Architecture

Recommended V1 primary navigation:

```text
FACTACT

Home
Work
People & Organizations
Assets & Systems
Knowledge
KAIZEN

────────────
Service / Customer switcher
Search / Command
Notifications
Profile
```

Notes:

- `Home` is the operational cockpit.
- `Work` is all actionable owned service work.
- `People & Organizations` is a human-friendly entry into Registry/Recipient context.
- `Assets & Systems` exposes Devices, Accounts, Applications, Systems and related operational entities.
- `Knowledge` includes reusable operational knowledge, not authoritative Facts only.
- `KAIZEN` surfaces learning/pattern/improvement candidates and outcomes.
- Service Model-specific shortcuts may appear contextually, but should not become separate navigation universes.

V1 may simplify the left navigation while preserving this conceptual architecture.

---

# 4. Universal Page Anatomy

FACTACT should use one recurring page structure:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Global Header / Search / Service Context                             │
├──────────────┬───────────────────────────────────┬───────────────────┤
│ Navigation   │ MAIN                              │ CONTEXT           │
│              │                                   │                   │
│              │ What is happening now?            │ What do we know?  │
│              │ What is the next Action?          │ Why?              │
│              │ Decision / Work / Change          │ What is unknown?  │
│              │                                   │ Rules / Authority │
│              │                                   │ Recent Changes    │
├──────────────┴───────────────────────────────────┴───────────────────┤
│ TIMELINE / ACTIVITY / EVIDENCE                                      │
└──────────────────────────────────────────────────────────────────────┘
```

This is the common skeleton for:
- Work Detail
- JOIN workspace
- SUPPORT case
- DEVICE replacement
- SECURITY investigation
- IT_CHANGE

The proportions may vary by screen, but the mental model should remain stable.

---

# 5. HOME — Operational Cockpit

## 5.1 Home is not a dashboard of vanity metrics

The first question after login is:

> **What needs my attention now?**

The Home page should prioritize decisions/actions over charts.

## 5.2 Proposed Home structure

```text
┌─────────────────────────────────────────────────────────────────────┐
│ おはようございます                                  [＋ New Event]  │
│ 今日、あなた/チームが前に進めるべきこと                           │
├─────────────────────────────────────┬───────────────────────────────┤
│ NEEDS ATTENTION                     │ SERVICE HEALTH                │
│                                     │                               │
│ 3  Decision Required               │ Ownerless Work        0       │
│ 2  Review Required                 │ SLO Risk              2       │
│ 4  Waiting Follow-up               │ High Impact Open      1       │
│ 1  Exception                       │ Unknown Blocking      3       │
├─────────────────────────────────────┴───────────────────────────────┤
│ MY / TEAM NEXT ACTIONS                                             │
│                                                                    │
│ [P1] Sonics / A社 VPN障害     次: 接続ログ確認      Due 10:30     │
│ [P2] 田中さん入社             次: PC001割当         Due 9/28      │
│ [P2] PC交換 #1048             待: 利用者返答         Follow 14:00  │
├────────────────────────────────────────────────────────────────────┤
│ RECENT CHANGE / LEARNING                                           │
│ ✓ 3 verified Changes committed                                    │
│ ✦ 2 Knowledge candidates                                           │
│ ↗ 1 Rule candidate ready for review                               │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.3 Home priority model

Default ordering should favor:

1. safety / high business impact
2. decisions blocking Work
3. reviews required for Change/Authority
4. overdue or near-due Next Actions
5. waiting items requiring follow-up
6. exceptions
7. normal assigned Work
8. learning/KAIZEN review

Do not sort everything only by ticket creation time.

## 5.4 Home KPI philosophy

Operational health metrics may include:
- Ownerless active Work
- SLO risk
- High-impact open Work
- Blocking Unknowns
- Decision Required
- Review Required
- Waiting follow-up

Management outcomes such as Created Time belong in a separate management/KAIZEN view rather than dominating the operator Home.

---

# 6. WORK — The Primary Operating Unit

## 6.1 Work list

Work list should answer:

> **What is the next meaningful Action, not merely which tickets are open?**

Recommended columns/cards:
- Priority / Business Impact
- Work title
- Service / Recipient
- Owner
- Next Action
- Next Action Owner
- Due / SLO state
- Waiting For
- Status
- Exception / Review indicator

Avoid making `Assignee` the only ownership concept.

Suggested views:
- My Next Actions
- Team Work
- Needs Decision
- Needs Review
- Waiting / Follow-up
- SLO Risk
- Exceptions
- All Work

## 6.2 Work detail — default layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ← Work   W-1042  PC準備                          IN PROGRESS        │
│ Example Co. / 情シスKAIZEN / 田中 太郎                           │
├──────────────────────────────────────────┬──────────────────────────┤
│ MAIN                                     │ CONTEXT                  │
│                                          │                          │
│ NEXT ACTION                              │ PERSON                   │
│ PCを選定して割り当てる                   │ 田中 太郎                │
│ Owner: Sato          Due: 9/28           │ 営業部 / 東京 / 正社員   │
│ [Actionを開始]                           │                          │
│                                          │ FACTS                    │
│ WHY THIS WORK EXISTS                     │ ✓ 入社 10/1              │
│ JOIN Requirement: Company PC = REQUIRED │ ? Primary Device         │
│ Rule: 正社員 × 営業部                    │                          │
│                                          │ RULE / AUTHORITY         │
│ WORK PLAN / GUIDANCE                     │ Sales device standard    │
│ 1. 標準PC選定                            │ A2 assignment allowed    │
│ 2. Setup                                 │                          │
│ 3. Security baseline                     │ RECENT CHANGE            │
│ 4. Assign                                │ —                        │
├──────────────────────────────────────────┴──────────────────────────┤
│ TIMELINE  Event → Requirement → Work → Actions → Changes           │
└─────────────────────────────────────────────────────────────────────┘
```

## 6.3 Work screen hierarchy

Above the fold, always favor:

1. Next Action
2. Owner / responsibility
3. risk / due / SLO
4. Why the Work exists
5. context needed for the Action

Do not lead with:
- internal database IDs
- long activity logs
- every metadata field
- AI summary paragraphs

---

# 7. NEXT ACTION — The UX Anchor

The most important field in daily operation is not `status` but **Next Action**.

Every active Work should make clear:
- what should happen next;
- who owns that next step;
- when it matters;
- what it is waiting for, if anything.

Examples:

```text
Next Action: 利用者へVPNエラー画面の送付を依頼
Owner: Sato
Waiting For: User
Follow-up: 14:00
```

or:

```text
Next Action: PC001を田中さんへ割当
Owner: Sato
Due: 9/28
```

Status remains useful for lifecycle/state-machine enforcement, but it should not carry the entire operator mental model.

---

# 8. WHY — Explainability as Product UX

FACTACT should make `Why` inspectable throughout the product.

A Work can explain:
- source Event;
- Requirement result;
- applicable Rule;
- human Decision;
- Contract Profile obligation;
- Exception;
- security/compliance condition.

Example:

```text
なぜこのWorkが必要？

PC準備 = REQUIRED

Based on:
✓ 雇用形態 = 正社員          VERIFIED
✓ 所属 = 営業部              VERIFIED
→ Rule: 正社員の営業職には標準PCを貸与

[Evidenceを見る] [Ruleを見る]
```

This is also the foundation for trustworthy AI.

---

# 9. OPERATIONAL CONTEXT — Not a Side Database

Operational Context is not a separate form users maintain for its own sake.

It is a **context projection assembled for the current service decision/action**.

## 9.1 Context panel layers

Recommended order:

### A. Identity / Recipient
Who/what are we serving?

### B. Relevant Facts
Only Facts relevant to current Work by default.

### C. Unknown / Stale / Contradiction
Only gaps that matter now should be prominent.

### D. Rules / Contract / Authority
What governs the safe Action?

### E. Knowledge
What do we know about how to perform the Work?

### F. Observations / Exceptions
What recipient-specific nuance matters?

### G. Recent Changes / Related Work
What recently changed that may affect this Work?

## 9.2 Context card semantics

Every important context item should be able to expose, when expanded:
- semantic type: Fact / Observation / Hypothesis / Decision / Rule / Unknown
- value/content
- source
- reliability
- verified at
- effective period if relevant
- evidence
- related Work/Change

But the collapsed operator view should remain human-readable.

Example:

```text
Primary Device
PC001                         ✓ Verified
Verified 9/28 from W-1042
```

not:

```text
relation_type=USES_PRIMARY_DEVICE
reliability=VERIFIED
source_change_id=...
```

---

# 10. Visual Semantics for Epistemic State

The UI must make epistemic differences recognizable without turning the product into a scientific database tool.

Recommended conceptual treatments:

- **Fact / Verified**: normal confident presentation + verification indicator
- **Fact / Stale**: value visible + subtle recheck warning
- **Observation**: attributed note / quote-like context treatment
- **Hypothesis**: explicitly labeled suggestion/investigation lead
- **Decision**: decision badge with decider/time
- **Rule**: governing logic card
- **Unknown**: `?` / `未確認`, never a fake default value
- **Contradiction**: requires resolution and shows competing sources

Do not rely on color alone; use label/icon/text.

Do not make UNKNOWN visually equivalent to an application error.

---

# 11. Context Relevance Model

FACTACT will eventually contain far more context than should appear on one screen.

The UI therefore needs relevance ranking.

Suggested ranking factors:
- current Work type / Requirement
- Service Model
- Recipient
- recent related Changes
- applicable Rules
- Authority needs
- current Unknown blocking the next Action
- known Exception
- reliability/staleness

AI may help rank/summarize context, but it must not hide the underlying source or semantic state.

The user should be able to switch from:

`Relevant now`

to:

`All context`

when investigation requires broader exploration.

---

# 12. ENTITY / RECIPIENT VIEW — Reality View

Entity pages are not CRUD master screens. They are views of current and historical operational reality.

Example Person page:

```text
田中 太郎
Example Co. / 営業部

CURRENT
Primary Device      PC001             Verified
M365 Account        tanaka@...        Verified
CRM Account         T.Tanaka          Verified
Location            Tokyo             Verified

OPEN WORK
VPN access confirmation               Waiting

RECENT CHANGES
9/28 PC001 assigned
9/27 M365 account activated

OBSERVATIONS
回答はTeamsを希望 — Source: Service Desk / 9/29

HISTORY
Previous departments / devices / access...
```

The same Entity page may expose Views for:
- current state
- relations
- history
- related Work
- Evidence
- observations

But editing authoritative reality should still use domain Actions/Changes, not arbitrary field edits where a real-world Change is implied.

---

# 13. EVENT / PROCESS WORKSPACE — Outcome View

For JOIN, LEAVE, MOVE and similar Event-driven processes, the top-level page should show the **real outcome/readiness**, not just child Work completion percentage.

JOIN example:

```text
田中 太郎 — 10/1 入社

READY STATE
✓ Device      PC001
✓ M365        Ready
✓ CRM         Ready
○ Adobe       Not Required
△ VPN         Decision Waiting

Work: 3 completed / 1 waiting
Work Avoided: 2
```

LEAVE should similarly show whether access/assets are actually transitioned/recovered, not `8/10 tasks complete` as the primary truth.

---

# 14. ACTION UX

An Action is what an actor actually does.

The UI should make common Actions fast and contextual:
- assign device
- ask recipient a question
- create/disable account
- remote support
- escalate
- request approval
- record investigation result
- execute configuration change

Action forms should be generated/configured from domain intent, not generic free-form activity logging alone.

A user may still add notes/evidence, but the product should capture structured effect when possible.

---

# 15. CHANGE UX

FACTACT should make the effect of work explicit without creating clerical duplication.

Pattern:

```text
Action completed
↓
FACTACT proposes expected Change
↓
Operator confirms/corrects
↓
Execute / Verify
↓
Commit authoritative state
```

Example:

```text
このActionで何が変わりましたか？

田中 太郎
Primary Device
— → PC001

Reality Change
Evidence: serial / asset / baseline

[Confirm] [Correct]
```

For low-risk/high-authority mature operations, some stages may be streamlined or automated, but the underlying semantics and Audit trace remain.

---

# 16. DECISION UX

Decision Required should be a first-class queue, not buried inside comments.

Decision card should show:
- question
- why decision is needed
- relevant Facts
- Unknowns
- applicable Rule/policy
- recommended option if AI/human guidance exists
- who has Decide Authority
- impact of waiting

Example:

```text
DECISION REQUIRED
Adobe license is required?

Known:
✓ Department: Sales
? Role details: Unknown

No approved Rule currently determines this case.

Decider: Customer IT Manager
Due: 9/25

[Required] [Not Required] [Need More Information]
```

The Decision result becomes traceable Decision history and may later support a Rule Candidate.

---

# 17. EXCEPTION UX

Operators always need an escape hatch:

> **標準手順では対応できない**

or:

> **通常と異なる事情がある**

Selecting it should not merely open a blank comment box.

Capture:
- what is different;
- impact;
- whether Work can continue safely;
- required escalation/review;
- evidence/context;
- whether this appears to be known or new Exception.

Exceptions should feed learning, not be hidden as messy comments.

---

# 18. AI GUIDED OPERATIONS

AI should appear as a contextual guide, not a separate chatbot that forces the user out of the Work.

Useful AI surfaces:

### Context Summary
`この対応に関係するFactを要約`

### Missing Information
`次の判断に必要なのは勤務形態です`

### Next Question
`利用者にこの1点を確認すると切り分けが進みます`

### Triage / Routing Suggestion
with basis and confidence.

### Change Candidate
based on recorded Action/evidence.

### Learning Candidate
after Work evidence accumulates.

Every AI surface must clearly separate:
- source Facts
- Unknowns
- inference/suggestion
- authoritative state

AI should not become a floating universal answer box that obscures workflow responsibility.

---

# 19. TIMELINE — Audit That Humans Can Understand

The timeline should be a readable narrative of service delivery, not raw audit logs.

Example:

```text
09:02 Event received — 入社予定
09:03 Requirements evaluated
      PC REQUIRED / M365 REQUIRED / Adobe DECISION REQUIRED
09:10 Work W-1042 created — PC準備
13:22 Action — PC001 setup completed
13:25 Change executed — Primary Device → PC001
13:31 Verified by Sato
13:31 Change committed
13:32 Knowledge candidate proposed
```

Raw technical audit events can exist separately for security/compliance.

---

# 20. SEARCH / COMMAND UX

FACTACT should support a global search that searches by operational meaning:
- Person
- Organization
- phone/contact point
- Device/asset number
- Account/email
- Work
- Service
- Application/System

Search result should identify semantic type and current context.

Future command actions may include:
- `田中さんの現在のPC`
- `Sonics A社の未解決Work`
- `今日Decision待ち`

AI natural-language search may be added, but exact/structured search remains necessary and authoritative results must be traceable.

---

# 21. Notifications — Only for Actionable Change

Avoid notification overload.

High-value notification classes:
- Work assigned / ownership changed
- Decision required
- Review required
- high-impact/SLO risk
- waiting follow-up due
- Exception escalation
- significant integration failure

Do not notify users for every timeline/audit event.

---

# 22. KAIZEN Workspace

KAIZEN should answer:

> **Which recurring Work should change, and what evidence supports changing it?**

Candidate sections:
- Repeated Work
- Repeated Unknown / Investigation
- Rule Candidates
- Knowledge Candidates
- Exception Patterns
- Authority Promotion Candidates
- Automation Candidates
- Work Avoided
- Created Time

Example:

```text
PC初期設定
24 cases / 90 days
Observed effort: 16–24h range
Exceptions: 1
Correction required: 0

Candidate: AUTOMATE
Why: stable procedure + low exception + sufficient evidence

[LALLIBで評価]
```

LALLIB choices:
- Let go
- Automate
- Leave
- atLIB

Standardization remains a maturity/capability step that can enable delegation and automation.

---

# 23. Management View — Separate from Operator Home

Management needs a different projection of the same Facts.

Potential management view:
- Created Time
- where Created Time was reinvested
- Work Generated / Avoided
- Human / Automated Work
- repeat inquiry reduction
- Information Reliability
- Transfer Ready
- Automation/Standardization progress
- high-risk operational gaps
- strategic IT initiatives / IT_CHANGE progress

Do not force operators to work inside an executive dashboard.

> **One Fact, Multiple Views** also applies to roles and UX.

---

# 24. Role-Based Views without Role-Based Data Duplication

Examples:

### Operator
Next Action, Context, Work, Exceptions.

### Service Owner / Leader
Team load, Decisions, Reviews, SLO, Exceptions, learning.

### Customer IT Manager
service state, approvals/Decisions, risks, current operational context.

### Executive
Created Time, business impact, IT capability and major risks.

These are projections over shared Facts/Work/Changes, not separate reporting databases as the source of truth.

---

# 25. Cross-Service UX Consistency

The following should look/behave consistently in JOIN, SUPPORT, DEVICE, SECURITY and future Service Models:
- Owner
- Next Action
- Waiting For
- Priority/Impact
- Decision Required
- Review Required
- Context panel
- Why
- Unknown
- Action
- Change
- Evidence
- Timeline
- Exception
- Learning Candidate

Service Models can add domain-specific Actions and context cards, but should not redefine these semantics.

---

# 26. UI Component Vocabulary

Recommended reusable product components:

- `NextActionCard`
- `OwnershipCard`
- `WhyCard`
- `FactCard`
- `UnknownCard`
- `ObservationCard`
- `RuleCard`
- `AuthorityCard`
- `DecisionCard`
- `ExceptionCard`
- `WorkCard`
- `ChangePreview`
- `VerificationCard`
- `EvidenceDrawer`
- `ContextPanel`
- `ServiceTimeline`
- `LearningCandidateCard`
- `SloRiskBadge`
- `ReliabilityIndicator`
- `RecipientHeader`

Component names are implementation suggestions, not required domain class names.

---

# 27. State Presentation

Do not expose internal state machines as the only human wording.

Example internal → UI:

- `DECISION_REQUIRED` → `確認・判断が必要`
- `ALREADY_SATISFIED` → `対応済み / 追加対応不要`
- `NOT_APPLICABLE` → `対象外`
- `KNOWLEDGE_STATE_CHANGE` → `確認結果を情報に反映`
- `RETRY_REQUIRED` → `連携の再実行が必要`

Keep machine enums stable while allowing clear Japanese labels.

---

# 28. Desktop-First, Responsive Later

Initial FACTACT operators are expected to perform information-dense operational work. V1 should optimize for desktop browser use.

Recommended:
- persistent left navigation
- wide Main + Context split
- keyboard-friendly search/actions
- drawers for evidence/history
- responsive support for narrower screens where practical

Do not compromise desktop operational density merely to achieve a mobile-first layout in V1.

---

# 29. UX Anti-Patterns

Avoid:

1. **Ticket-list-first product** — every reality reduced to ticket rows.
2. **Checklist-first JOIN** — Event automatically creates all possible tasks.
3. **Form-first Context** — users maintain huge master forms independent of real Work.
4. **CRUD-first Registry** — arbitrary field edits bypass Change semantics.
5. **AI-chat-first UX** — chatbot becomes the product and hides source/authority.
6. **Red-everywhere Unknowns** — truthful uncertainty treated as system failure.
7. **Comments as domain model** — Decisions/Exceptions/Changes buried in free text.
8. **Assignee = Owner** — responsibility becomes ambiguous when waiting/escalating.
9. **Status-only operation** — users cannot see the actual Next Action.
10. **Dashboard vanity** — operator Home dominated by charts rather than attention.
11. **Duplicate Service Model UI** — JOIN/SUPPORT/DEVICE each invent new concepts.
12. **Opaque automation** — system acts without showing Rule/Authority/Evidence basis.

---

# 30. V1 UX Skeleton — Minimum Screens

A coherent first product can be built with the following minimum screen families:

### Global
1. Login / Tenant-Service context selection
2. Home
3. Global Search

### Work
4. Work List
5. Work Detail Workspace
6. Decision / Review interaction
7. Change Verify / Commit interaction

### Context / Registry
8. Person / Recipient Detail
9. Organization Detail
10. Device Detail
11. Account/Application detail as needed by first Golden Flow

### Service Model
12. JOIN Event Workspace
13. SUPPORT Intake/Work Workspace

### Learning
14. Learning / KAIZEN Candidate List
15. Candidate Review

The same reusable components should compose these screens.

---

# 31. First UX Build Order

Recommended implementation order:

## Phase UX-1 — Shell + Work
- global shell/navigation
- Home attention queue
- Work List
- Work Detail
- ContextPanel
- Timeline

## Phase UX-2 — JOIN Golden Flow
- Create JOIN Event
- Requirement Evaluation
- Decision Required
- Work creation
- Device assignment Action
- Change preview
- Verify/Commit
- JOIN readiness view

## Phase UX-3 — Reality Views
- Person
- Device
- Organization
- cross-view Fact reuse

## Phase UX-4 — SUPPORT
- incoming/manual intake
- Recipient resolution
- Context reuse
- guided triage
- escalation

## Phase UX-5 — Learning
- Knowledge/Rule/KAIZEN candidates
- human review
- show next-case reuse

This order tests the common UX before expanding Service Model breadth.

---

# 32. UX Golden Tests

The product UX is coherent if these tests pass:

1. An operator can open Home and identify the next important Action without opening every Work.
2. A Work always makes Owner and Next Action obvious.
3. The operator can answer `Why does this Work exist?` from the Work screen.
4. The operator can see relevant Facts and important Unknowns without opening a separate master database.
5. A Fact's source/reliability/evidence can be inspected when needed.
6. An Observation or AI suggestion cannot be mistaken for a verified Fact.
7. A Waiting Work still visibly has an Owner and follow-up.
8. A real-world Action can create a Change without duplicate data-entry screens.
9. Committed Change appears in Person/Device/Service views as the same Fact.
10. JOIN shows readiness/outcome, not merely task completion percentage.
11. SUPPORT can reuse Facts created by JOIN/DEVICE.
12. Decision Required and Review Required are actionable queues.
13. Exceptions can be escalated and learned from without hiding them in comments.
14. Learning candidates are reviewable but not silently authoritative.
15. The next similar Work can visibly benefit from approved learning.

---

# 33. Product UX North Star

A user should not experience FACTACT as:

> `チケットを開く → コメントを書く → ステータスを変える → 閉じる`

The intended experience is:

> **状況を理解する → 必要なことだけ判断する → 次のActionを進める → 現実のChangeを確かめる → Factとして残す → 次の仕事が楽になる**

In compact form:

> **KNOW → DECIDE → ACT → CHANGE → TRUST → LEARN**

This is the UX expression of:

> **FACTACT — From Fact to Action.**
