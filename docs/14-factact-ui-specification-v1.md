# FACTACT — UI Specification V1

**Status:** CANONICAL IMPLEMENTATION UX SPECIFICATION  
**Product:** FACTACT  
**Tagline:** From Fact to Action.  
**Core Principle:** FACT FIRST.  
**Scope:** First implementation of the shared FACTACT Web UI, with the initial vertical slices for 情シスKAIZEN and Service Desk.

This document turns the product UX architecture into implementation-ready behavior. It defines screen responsibilities, routes, shared components, commands, authorization boundaries, AI behavior, and acceptance criteria.

It must be read together with:

- `00-product-vision.md`
- `01-core-prd.md`
- `02-domain-model.md`
- `03-operational-context.md`
- `11-josys-kaizen-service-model-v1.md`
- `12-factact-join-ux-golden-flow.md`
- `13-factact-product-ux-architecture.md`
- `99-ai-development-context.md`

If this document conflicts with Core domain invariants, the Core invariants win. UI convenience must never bypass Fact First semantics.

---

# 1. UX North Star

FACTACT is a **Service Operating Workspace**, not a ticket management application.

The operator experience should repeatedly follow:

> **KNOW → DECIDE → ACT → CHANGE → TRUST → LEARN**

Domain flow underneath:

> **Event → Service Context → Requirement Evaluation → Decision / Rule → Work or No Work → Action → Change → Verify → Commit → Registry / Knowledge → Learning / KAIZEN**

The user should not have to understand the full domain graph before being productive. The interface exposes five recurring concepts:

1. **Now** — 今やること
2. **Context** — 判断に必要な情報
3. **Why** — なぜ必要か
4. **Change** — 何が変わる / 変わったか
5. **Learn** — 次の仕事に何を残すか

Primary UX rule:

> **StatusよりNext Actionを先に見せる。**

Secondary UX rule:

> **AIの答えより、AIが何を根拠にそう言っているかを確認できることを優先する。**

---

# 2. V1 Scope

## 2.1 Included

V1 UI shall support:

- Authentication entry / tenant context
- Home operational cockpit
- Work List
- Work Detail
- Person / Organization operational context
- JOIN Event workspace
- Requirement Evaluation
- Action execution guidance
- Change proposal / verify / commit interaction
- SUPPORT active case
- SUPPORT resolution and learning
- Knowledge candidate creation/review entry
- KAIZEN dashboard
- KAIZEN candidate detail
- basic Search / Command entry
- basic notifications / attention states
- audit-friendly Timeline

## 2.2 Not required for the first vertical slice

Do not delay the first usable flow for:

- full CTI/PBX implementation
- call recording
- full CRM synchronization
- full workflow builder
- generic form builder
- full CMDB editor
- full MDM
- infrastructure monitoring UI
- advanced analytics warehouse
- mobile-native UI
- arbitrary customer-configurable dashboards
- universal no-code automation

External integration points may be represented by adapter contracts or manual steps initially.

---

# 3. Global Information Architecture

Recommended primary navigation:

```text
FACTACT

Home
Work
People & Organizations
Assets & Systems
Knowledge
KAIZEN

────────────
Service / Customer context
Search / Command
Notifications
Profile
```

Service-specific shortcuts may appear under the shared navigation, for example:

```text
Services
  JOIN
  LEAVE
  MOVE
  SUPPORT
  DEVICE
  SaaS
  SECURITY
  IT CHANGE
```

These are filtered entry points into shared FACTACT objects, not separate applications.

## 3.1 Route vocabulary

Exact frontend framework routing is implementation-defined, but V1 should preserve a stable conceptual URL model.

Recommended routes:

```text
/
/home
/work
/work/:workId
/people
/people/:personId
/organizations
/organizations/:organizationId
/assets
/assets/:entityId
/knowledge
/knowledge/:knowledgeId
/kaizen
/kaizen/:candidateId
/events/:eventId
/join/:eventId
/support/:workId
/search
```

Route aliases may redirect, but canonical URLs should be stable enough to be shared in Zoho, chat, email, or audit records.

---

# 4. Universal Page Anatomy

Operational pages should use the shared structure:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER / SEARCH / SERVICE CONTEXT                             │
├──────────────┬───────────────────────────────────┬───────────────────┤
│ NAVIGATION   │ MAIN                              │ CONTEXT           │
│              │                                   │                   │
│              │ Now / Next Action                 │ Relevant Facts    │
│              │ Why                               │ Unknown / Stale   │
│              │ Work / Decision / Change          │ Rule / Authority  │
│              │                                   │ Knowledge         │
├──────────────┴───────────────────────────────────┴───────────────────┤
│ TIMELINE / EVIDENCE / HISTORY                                       │
└──────────────────────────────────────────────────────────────────────┘
```

The exact width may vary by screen, but V1 should not create unrelated page structures for JOIN and SUPPORT.

## 4.1 Desktop-first behavior

Target primary working width: desktop browser.

At narrower widths:

- Context may collapse to a drawer.
- Timeline may become a tab/section.
- Next Action must remain visible before secondary metadata.
- No critical state may be communicated by hover only.

---

# 5. Shared Visual Language

FACTACT should use a clean, information-dense but calm SaaS visual system.

Brand direction:

- Deep Navy `#1F3556`
- Warm Orange `#F28C38`
- Emerald Green `#2DBE9D`
- Off White `#F8FAFC`

These are brand tokens, not semantic-state shortcuts. Semantic state must also use labels/icons/text.

## 5.1 Card vocabulary

Shared card families:

- `NextActionCard`
- `WhyCard`
- `ContextFactCard`
- `UnknownCard`
- `ObservationCard`
- `RuleCard`
- `AuthorityCard`
- `DecisionCard`
- `ExceptionCard`
- `KnowledgeCard`
- `ChangeCard`
- `ReviewCard`
- `KaizenCandidateCard`
- `ImpactCard`
- `TimelineItem`

Do not implement each screen with unrelated bespoke cards where the semantics are the same.

## 5.2 Epistemic visual semantics

The interface must visibly distinguish:

| Semantic type | UI treatment |
|---|---|
| FACT / VERIFIED | normal confident value + verified indicator |
| FACT / STALE | value remains visible + recheck warning |
| OBSERVATION | attributed contextual note |
| HYPOTHESIS | explicit hypothesis/investigation label |
| DECISION | decision badge + decider/time |
| RULE | governing rule card |
| UNKNOWN | `?` / 未確認; never synthetic value |
| CONTRADICTION | competing values/sources + resolution required |

Do not rely on color alone.

## 5.3 Trust details

An expandable context item should be able to show, when semantically applicable:

- value/content
- source
- reliability
- verified_at / trusted_at
- effective_from / effective_to
- evidence
- source Work / Change

Collapsed mode should remain human readable.

Example:

```text
Primary Device
PC001                     ✓ Verified
Verified 2026-09-28 from W-1042
```

not raw database field names.

---

# 6. Shared Interaction Components

## 6.1 `NextActionCard`

Required on active Work when a next step is known.

Displays:

- Next Action text
- Next Action Owner
- due / follow-up time
- Waiting For, if applicable
- primary CTA
- escalation/exception marker when applicable

Primary CTA must execute or begin a Domain Command, not merely append a free-text note.

## 6.2 `WhyCard`

Explains why the Work / Action exists using traceable sources:

- source Event
- Requirement result
- Rule
- Contract Profile obligation
- Decision
- Exception

Example:

```text
PC準備 = REQUIRED

Based on:
✓ 雇用形態 = 正社員       VERIFIED
✓ 所属 = 営業部           VERIFIED
→ Rule: 正社員の営業職には標準PCを貸与
```

## 6.3 `ContextPanel`

Default order:

1. Recipient / identity
2. relevant Facts
3. Unknown / Stale / Contradiction
4. Rules / Contract / Authority
5. Knowledge
6. Observations / Exceptions
7. recent Changes / related Work

Modes:

- `Relevant now`
- `All context`

AI may rank context but must not erase the underlying semantic type or source.

## 6.4 `Timeline`

Timeline is human-readable history, not a raw audit-log dump.

It may include:

- Event received
- Requirement evaluated
- Decision requested/made
- Work created
- Action started/completed
- Change proposed
- Change verified/committed
- Evidence attached
- Knowledge candidate created
- Rule candidate created
- KAIZEN candidate created
- escalation / exception

Authoritative audit data may exist separately; Timeline is a projection of that history.

## 6.5 `AI Guidance Panel`

AI appears as contextual guidance, not a chatbot-first product.

AI panel can show:

- situation summary
- known Facts
- important Unknowns
- suggested next question
- suggested next Action
- likely cause / triage hypotheses
- relevant Knowledge
- potential Change effects
- learning / KAIZEN candidate suggestions

Every AI suggestion that depends on facts must allow the user to inspect the basis.

---

# 7. Home — Operational Cockpit

Route: `/home`

Purpose:

> **What needs attention now?**

Home is not primarily a management KPI dashboard.

## 7.1 Primary sections

### A. Needs Attention

Recommended counters:

- Decision Required
- Review Required
- Waiting Follow-up
- Exception
- Blocking Unknown

### B. Service Health

Recommended operational health:

- Ownerless active Work
- SLO Risk
- High Impact Open
- Unknown Blocking

### C. My / Team Next Actions

Columns/cards:

- Priority / Business Impact
- Work title
- Service / Recipient
- Next Action
- Next Action Owner
- Due / follow-up
- waiting state

Default sorting favors risk and actionability, not creation time.

### D. Recent Change / Learning

Show a small digest:

- verified Changes committed
- Knowledge candidates
- Rule candidates ready for review
- KAIZEN candidates needing review

## 7.2 Home commands

Possible commands:

- `StartNewEvent`
- `OpenWork`
- `TakeOwnership`
- `AcknowledgeReview`
- `OpenDecision`
- `FollowUpWaitingWork`

Do not implement `TakeOwnership` as silently replacing the Service Owner.

---

# 8. Work List

Route: `/work`

Purpose:

> **Show actionable service work and what should happen next.**

Recommended views:

- My Next Actions
- Team Work
- Needs Decision
- Needs Review
- Waiting / Follow-up
- SLO Risk
- Exceptions
- All Work

## 8.1 Columns

- Priority / Business Impact
- Work title
- Service
- Recipient
- Work Owner
- Next Action
- Next Action Owner
- Due / SLO state
- Waiting For
- Status
- Exception / Review indicator

Status must not dominate the table.

## 8.2 Filtering

At minimum:

- Service Model
- Work type
- lane
- owner
- next-action owner
- status
- business impact
- due/SLO
- waiting
- exception
- recipient/customer

Saved views may be postponed if needed.

---

# 9. Work Detail

Route: `/work/:workId`

Purpose:

> **Enable the operator to understand why the Work exists, perform the next safe Action, and make resulting Change explicit.**

## 9.1 Above-the-fold order

1. Next Action
2. Owner / responsibility
3. impact / due / SLO
4. Why the Work exists
5. relevant Context
6. guidance / Work Plan

Do not lead with internal IDs or activity logs.

## 9.2 Main sections

- header: title, service, recipient, lifecycle state
- `NextActionCard`
- `WhyCard`
- Work Plan / guided steps
- Decisions / exceptions when present
- Change / verification area
- resolution/outcome

Right side:

- `ContextPanel`

Bottom:

- `Timeline`

## 9.3 Work state vs Next Action

Lifecycle state remains authoritative for domain enforcement.

The UI must not fake a state transition just because a CTA was clicked. A command succeeds only after the Domain/Application layer accepts it.

---

# 10. Person / Organization Operational Context

Routes:

- `/people/:personId`
- `/organizations/:organizationId`

These are **reality views**, not generic CRUD masters.

## 10.1 Person page tabs/sections

Recommended:

- Operational Context
- Profile
- Related Work
- Knowledge
- Change History

Primary view may show:

- current Organization / department / location
- Device relations
- Account / SaaS relations
- manager/member relations
- open Work
- recent Changes
- Observations
- Unknown / To be confirmed

A relation map may visualize the person in the center with connected Entity/Relation objects, but the data model must remain normalized; Person is not the parent key of all related data.

## 10.2 Editing rule

If a change implies a real-world transition, do not expose it as an arbitrary direct field edit.

Example:

- changing Primary Device should originate from an Action/Change flow;
- correcting a metadata typo may use a safe correction command where the domain permits it.

---

# 11. JOIN Workspace

Route: `/join/:eventId` or `/events/:eventId` with JOIN presentation.

Detailed behavior is governed by `12-factact-join-ux-golden-flow.md`.

## 11.1 Header

Show:

- person
- organization
- JOIN date
- owner
- readiness
- blocking decision/unknown

## 11.2 Main flow

```text
Event received
→ Context Review
→ Requirement Evaluation
→ Guided Clarification
→ Work Plan
→ Work execution
→ Action / Change
→ Verify / Commit
→ Readiness
→ Learning
```

## 11.3 Requirement Evaluation UI

Each requirement row/card shall show:

- requirement name
- evaluation result
- basis
- Work created? yes/no
- decision/unknown needed?

Results:

- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

No Work is a valid result and must be visible as an intentional outcome, not as a missing task.

Example:

```text
Adobe License
NOT_APPLICABLE
No Work created
Based on: Role = Sales / Standard software policy v3
```

## 11.4 Readiness over completion percentage

Primary JOIN outcome should show real readiness:

```text
Device     Ready
M365       Ready
CRM        Ready
Adobe      Not Required
VPN        Decision Waiting
```

A `3/4 Works completed` count may be secondary.

---

# 12. Action UX

An Action records what is actually performed.

V1 should support structured contextual Action forms for common operations rather than only free text.

Candidate commands:

- `AssignDevice`
- `AskRecipientQuestion`
- `RecordInvestigationResult`
- `CreateAccountAction`
- `DisableAccountAction`
- `StartRemoteSupport`
- `EscalateWork`
- `RequestDecision`
- `RequestReview`
- `ExecuteConfigurationChange`
- `RecordNoActionRequired`

Command names are conceptual and may differ in code, but the semantics must be explicit.

Each command must return either:

- accepted domain result; or
- rejected result with actionable reason.

The frontend must not directly mutate authoritative registry state.

---

# 13. Change / Verify / Commit UX

Core rule:

> **Work close does not directly update reality.**

UI flow:

```text
Action completed
↓
Expected Change proposed
↓
Operator confirms/corrects
↓
Verify
↓
Commit
↓
Authoritative state changes
```

Example:

```text
田中 一郎
Primary Device
— → PC001

Change type: REALITY_CHANGE
Evidence: asset / serial / setup result
```

## 13.1 Commands

Conceptual commands:

- `ProposeChange`
- `CorrectChangeProposal`
- `AttachEvidence`
- `VerifyChange`
- `CommitChange`
- `RejectChange`

Authority must be checked server-side.

## 13.2 Knowledge State Change

Discovery/verification that changes what is known, without claiming reality changed at that moment, should use `KNOWLEDGE_STATE_CHANGE` semantics.

Example:

> Operator discovered that a device had already been replaced yesterday.

The UI should allow:

- observed/discovered time
- effective real-world time when known
- source/evidence

Do not set discovery time as the reality-change time by default.

---

# 14. SUPPORT — Active Case

Route: `/support/:workId` or shared `/work/:workId` with SUPPORT layout.

Purpose:

> **Get the case onto the correct resolution process quickly using existing Operational Context.**

## 14.1 Layout

MAIN:

- issue title / impact
- conversation / interaction summary
- Next Action
- guided troubleshooting
- investigation results

CONTEXT:

- requester / organization
- devices
- relevant accounts/apps
- recent Changes
- known Exceptions
- relevant Knowledge
- Unknowns that block diagnosis

AI GUIDANCE:

- likely causes as hypotheses
- recommended questions
- troubleshooting sequence
- escalation readiness

TIMELINE:

- contact received
- identity confirmation
- triage
- Actions
- decisions
- Change/evidence
- resolution

## 14.2 Identity from phone

Caller phone number is an **identity hint**, not authentication.

V1 phone-assisted flow:

```text
incoming number
→ normalize Contact Point
→ find candidate Person/Organization
→ operator confirms/corrects
→ load Effective Service Context
```

Do not grant sensitive authority based only on caller ID match.

---

# 15. SUPPORT — Resolution and Learning

Resolution is not the final product step.

Flow:

```text
Resolve
→ verify outcome
→ Fact / Knowledge State update
→ Knowledge candidate
→ Rule candidate if pattern exists
→ KAIZEN candidate if improvement opportunity exists
```

## 15.1 Resolution screen

Show:

- resolution summary
- Actions performed
- verified outcome
- Changes committed
- Evidence
- new/updated Facts
- Knowledge candidate
- Rule candidate, if any
- KAIZEN candidate, if any

AI may propose reusable learning, but human review is required before authoritative Knowledge/Rule promotion when applicable.

## 15.2 No Action Required

If investigation concludes that no Action is needed:

- Work Outcome may become `NO_ACTION_REQUIRED`;
- investigation Evidence and Decision remain preserved;
- this must not be confused with Requirement Evaluation deciding no Work was needed in the first place.

---

# 16. Knowledge UX

Route: `/knowledge`

V1 should distinguish at minimum:

- approved reusable Knowledge
- candidate Knowledge
- superseded/retired Knowledge

Knowledge view should expose:

- purpose / when applicable
- procedure or explanation
- related Service/Work types
- source Evidence / Works
- verification/review status
- updated/reviewed time

Do not merge Knowledge with authoritative Facts or Rules.

---

# 17. KAIZEN Dashboard

Route: `/kaizen`

Purpose:

> **Turn accumulated operational Evidence into explicit improvement opportunities and measurable outcomes.**

KAIZEN must not be a generic AI suggestion feed.

## 17.1 Primary KPI philosophy

The top-level business metric is **創出時間 / Created Time**, not merely hours cut.

Recommended hierarchy:

### Primary

- **Created Time** — company time made available for higher-value work

### Supporting operational evidence

- Work Avoided
- Automated Work
- Human Work reduced
- Repeat Work reduced
- Waiting reduced
- Ownerless time reduced
- information reliability improved
- Transfer Ready / standardization improvement

### Business use / outcome

- reinvestment destination
- DX/AI/security project time
- employee productivity contribution
- Business Impact where evidence exists

Cost reduction may be shown, but it must not become the sole definition of KAIZEN value.

## 17.2 Dashboard sections

Recommended tabs:

- 改善サマリー
- 改善候補
- 効果シミュレーション
- 実行中の改善
- 完了した改善

Recommended content:

- Created Time
- improvement candidates
- realized time creation
- candidate evidence quality
- operational areas with improvement potential
- AI insights grounded in Evidence
- current IT_CHANGE initiatives

Generated or demo numbers must be clearly treated as sample data until real measurement exists.

---

# 18. KAIZEN Classification Model

Do not force every improvement into a single four-slice pie chart if the concepts operate at different levels.

V1 should separate two questions.

## 18.1 Destination — What should happen to the work?

Working LALLIB direction:

- **Let go** — なくす
- **Automate** — 自動化する where mature enough
- **Leave** — 社内に残す
- **atLIB** — atLIBへ任せる

`LALLIB` remains a working 情シスKAIZEN method name, not a universal FACTACT Core type unless separately decided.

## 18.2 Capability Path — How does the operation become safer/easier?

Cross-cutting maturity path:

> **Learn → Standardize → Delegate → Automate**

Standardization is therefore not necessarily a final destination category. It is often a capability step that enables delegation or automation.

This separation resolves the earlier ambiguity between:

- `なくす / 自動化 / 標準化 / 任せる`

and

- `Let go / Automate / Leave / atLIB`.

The UI may visualize both, but should not pretend they are the same taxonomy.

---

# 19. KAIZEN Candidate Detail

Route: `/kaizen/:candidateId`

Purpose:

> **Show why the candidate exists, expected effect, uncertainty, readiness, and the path to an executable IT_CHANGE.**

## 19.1 Required sections

### A. Candidate summary

- title
- affected Service / Work type
- destination hypothesis
- capability maturity
- owner
- status

### B. Why this candidate exists

Evidence such as:

- repeated Works
- repeated inquiries
- repeated manual actions
- waiting/ownerless patterns
- exception rate
- correction/rework rate
- related observations
- knowledge/rule maturity

The UI must link back to source Works/Evidence.

### C. Current operational pattern

Show:

- current flow
- monthly/periodic Work frequency
- observed active effort range
- waiting where relevant
- known exception rate
- reliability/confidence of measurements

Do not fabricate precision when Activity data is incomplete.

### D. Improvement proposal

Show:

- proposed change
- what becomes unnecessary
- what becomes automated
- what remains human
- known exceptions
- authority implications
- operational prerequisites

### E. Effect simulation

At minimum:

- baseline
- expected future state
- Created Time range
- confidence
- assumptions
- evidence window

Cost effect may be secondary.

### F. Readiness

Recommended readiness dimensions:

- process understood?
- Knowledge sufficient?
- Rule sufficiently mature?
- exception pattern known?
- Authority available?
- technical feasibility?
- verification method defined?

### G. Decision / execution

Primary CTA:

- `Start IT_CHANGE`

Before conversion, user must see:

- expected Change
- owner
- risk
- approval/decision requirement
- success criteria
- rollback/exception considerations where applicable

### H. Discussion / review

Allow human rationale, review, and rejected/accepted decisions to remain traceable.

## 19.2 Example

Candidate:

> VPNクライアント自動更新

Evidence:

- repeated support Works caused by outdated client versions
- high similarity among troubleshooting patterns
- standard procedure already exists
- known exceptions are limited and identifiable

Potential path:

```text
Evidence
→ KAIZEN Candidate
→ human review
→ Decision
→ IT_CHANGE
→ Action
→ Change
→ Verify
→ new operational Facts
→ measure impact
```

This is the visible HELIX loop.

---

# 20. AI Boundaries in UI

Core principle:

> **AI Suggests. Human Decides. System Records.**

## 20.1 AI may

- summarize Work/context
- identify missing information
- suggest questions
- propose Requirement interpretation
- propose next Action
- propose likely causes as Hypotheses
- rank relevant Knowledge
- propose Change effects
- draft Knowledge candidates
- identify repeated patterns
- propose Rule candidates
- propose KAIZEN candidates
- estimate ranges with confidence and assumptions

## 20.2 AI may not

without an explicitly permitted Domain Command and authority path:

- create authoritative Fact by inference
- silently fill UNKNOWN
- grant Authority
- approve Rule
- commit real-world Change
- rewrite historical relations
- declare a subjective Observation to be Fact
- bypass Requirement Evaluation
- close Work merely because a model predicts resolution

## 20.3 AI provenance UX

Where AI recommendation matters, show:

- `AI suggestion` label
- supporting Facts/Evidence
- important Unknowns
- confidence/limitations where meaningful
- user action required

Do not present AI text with the same authority styling as verified Fact or approved Rule.

---

# 21. Authorization and Visibility

UI authorization is convenience only; server-side/domain authorization is authoritative.

The UI should separately represent:

- Service Owner
- Work Owner
- Assignee
- Next Action Owner
- Decide Authority
- Review Authority
- Change/Execution Authority

Potential progressive Authority levels:

- A0 Observe
- A1 Supervised
- A2 Delegated
- A3 Rule Governed
- A4 Automated

V1 need not expose these labels everywhere, but actions must reflect them.

Examples:

- user without Decide Authority sees `Request Decision`, not an active approval button;
- user without Change Authority may prepare evidence/proposal but cannot commit;
- AI never changes the effective Authority level.

---

# 22. Exceptions

The UI must always provide an escape hatch when the standard process does not fit.

Examples:

- `標準手順では対応できない`
- `通常と異なる事情がある`

Exception flow:

```text
standard path fails
→ operator raises Exception
→ capture reason/context/evidence
→ route to human Decision/Review
→ preserve outcome
→ repeated pattern may become Rule/KAIZEN candidate
```

Do not force the operator to lie in a standard form merely to continue.

---

# 23. Search / Command

Global search should eventually search across:

- Work
- Person
- Organization
- Device/Asset
- Service Recipient
- Knowledge
- Event
- Change
- KAIZEN candidate

V1 can begin with the highest-value objects.

Search result must identify object type and context. Avoid ambiguous lists of names with no organization/service information.

Command palette can later expose frequent safe commands, but should not bypass current context/authority checks.

---

# 24. External Integration UX

## 24.1 MOT/TEL

Initial integration may use external URL launch with caller number.

FACTACT should expose an incoming-call entry surface that:

1. receives/normalizes phone number;
2. resolves Contact Point candidates;
3. shows candidate Person/Organization;
4. requires operator confirmation/correction;
5. opens SUPPORT context;
6. creates/links Communication Event and Work through domain logic.

Call duration may be stored only if provider integration reliably supplies it. Never fabricate duration.

## 24.2 Zoho CRM

V1 may use manual write-back.

Desired CRM evidence:

- `対応あり`
- date/time if useful
- FACTACT Work URL
- short neutral status if useful

Do not sync detailed Work state into Zoho as a duplicate source of truth.

Future automation should remain adapter-based, idempotent and auditable.

---

# 25. Management vs Operator Views

Operator Home answers:

> What do we need to do now?

Management/KAIZEN answers:

> What has operation taught us, what time have we created, and where should we improve next?

Do not overload operator Home with Created Time, cost saving and executive charts.

Both views must derive from the same underlying Facts/Work/Changes rather than duplicated reporting data where avoidable.

---

# 26. Domain Command Boundary

The frontend may query projections optimized for UX, but authoritative mutation happens through Domain/Application commands.

Conceptual command families:

### Event / Requirement

- `RegisterEvent`
- `EvaluateRequirement`
- `RecordRequirementDecision`
- `CreateRequiredWork`

### Work

- `TakeWorkOwnership`
- `AssignWork`
- `SetNextAction`
- `StartAction`
- `CompleteAction`
- `WaitFor`
- `ResumeWork`
- `EscalateWork`
- `CompleteWork`
- `RecordNoActionRequired`

### Decision / Review

- `RequestDecision`
- `RecordDecision`
- `RequestReview`
- `RecordReviewResult`

### Change / Evidence

- `ProposeChange`
- `AttachEvidence`
- `VerifyChange`
- `CommitChange`
- `RejectChange`

### Context / Learning

- `RecordObservation`
- `VerifyInformation`
- `CreateKnowledgeCandidate`
- `ReviewKnowledgeCandidate`
- `CreateRuleCandidate`
- `ReviewRuleCandidate`
- `CreateKaizenCandidate`
- `ReviewKaizenCandidate`
- `StartITChangeFromKaizen`

These names are a semantic contract for design discussion, not a requirement to implement one REST endpoint per command.

---

# 27. UX Projections / Read Models

V1 may expose read models that join Core objects for efficient UI presentation.

Examples:

- `HomeAttentionProjection`
- `WorkListProjection`
- `WorkDetailProjection`
- `OperationalContextProjection`
- `JoinReadinessProjection`
- `SupportCaseProjection`
- `KaizenSummaryProjection`
- `KaizenCandidateProjection`

A projection may denormalize for reading, but must not become a second authoritative source of truth.

> **One Fact, Multiple Views.**

---

# 28. First Vertical Build

The first implementation should not attempt all screens at once.

Recommended vertical slice:

> **Login → Home → JOIN Event → Requirement Evaluation → Work → Device Action → Change → Verify → Fact → Person View**

The goal is to prove the architecture through one real path.

## 28.1 Minimum screens for first slice

1. Login / tenant context
2. Home
3. JOIN Event workspace
4. Work Detail
5. Change verify/commit dialog or panel
6. Person Operational Context

Work List may be minimal initially if Home links directly to Work.

## 28.2 Golden acceptance scenario

Starting facts:

- Person: Tanaka
- employment type: regular employee, VERIFIED
- department: Sales, VERIFIED
- join date: known
- Primary Device: UNKNOWN

Rule:

- regular Sales employee requires standard company PC

Product Owner clarification (2026-09-09): this is an illustrative UX rule, not a
required schema or rule for the first vertical slice. The initial Golden Flow may
use an explicit/human-confirmed COMPANY_PC requirement or a bounded Contract Profile
rule. See document 15 and ADR 0004; do not introduce JOIN-only department/employment
facts to satisfy this example.

Expected flow:

1. JOIN Event exists.
2. Requirement Evaluation evaluates PC = REQUIRED.
3. Work is created only for the required device work.
4. Work shows Next Action and Why.
5. Operator selects/assigns PC001 through a structured Action.
6. FACTACT proposes Reality Change `Tanaka → USES_PRIMARY_DEVICE → PC001`.
7. Operator verifies Evidence.
8. Commit closes/creates effective Relation as appropriate.
9. Person Operational Context now shows PC001 as Verified.
10. Timeline shows Event → Requirement → Work → Action → Change → Verify → Fact.
11. No separate “PC list update” task exists.

Failure conditions:

- frontend directly updates `person.device_id`;
- Work close mutates Registry without Change verification;
- UI creates all JOIN tasks unconditionally;
- UNKNOWN is replaced by inferred device;
- History is overwritten;
- AI commits state autonomously.

---

# 29. Second Vertical Build

After JOIN slice works:

> **SUPPORT → reuse JOIN-created Facts → AI guided triage → Action → resolution → Knowledge → KAIZEN candidate**

Golden proof:

- SUPPORT for Tanaka automatically sees PC001 from the same operational Fact/relation created during JOIN;
- no copied SUPPORT-specific device field becomes source of truth;
- resolution can create Knowledge/KAIZEN candidates;
- next similar SUPPORT Work can benefit from the learned context.

This proves HELIX operationally.

---

# 30. KAIZEN Golden Flow

After enough sample/real operation exists:

```text
Repeated Works / Evidence
→ Pattern
→ KAIZEN Candidate
→ Human Review / Decision
→ IT_CHANGE
→ Action
→ Change
→ Verify
→ New Fact / Rule / Knowledge
→ Measure Created Time
```

The KAIZEN detail page must always answer:

1. **Why is this candidate here?**
2. **What evidence supports it?**
3. **What remains uncertain?**
4. **What would change?**
5. **What time/value could be created?**
6. **How confident are we?**
7. **Who must decide?**
8. **How does it become an executable Change?**

---

# 31. Implementation Anti-patterns

Do not implement:

- generic ticket CRUD as the Core architecture;
- unconditional Event → task template generation;
- direct master edits for reality-changing operations;
- one universal Fact/EAV table;
- duplicated screen-specific truth;
- AI-written authoritative Facts;
- AI-created Authority;
- status-only operational UX;
- ownerless waiting items;
- hidden exceptions that operators can only express in comments;
- dashboards whose numbers have no evidence path;
- fake precision in effort/time estimates;
- colors as the only semantic-state indicator;
- a chatbot as the primary UI shell;
- separate JOIN/SUPPORT mini-apps with incompatible navigation and semantics.

---

# 32. Definition of Done for UI V1

A V1 screen is not complete merely because it visually matches a mockup.

For each implemented operational screen, verify:

- user can identify Next Action;
- user can identify Owner / next-action responsibility;
- user can inspect Why;
- relevant Operational Context is visible;
- Unknown is explicit;
- semantic type is not misleading;
- domain mutation uses a command, not direct UI state mutation;
- authorization is enforced server-side;
- meaningful outcome is represented in Timeline;
- Change is verified before authoritative reality update where required;
- Evidence remains traceable;
- AI recommendation is distinguishable from Fact/Rule/Decision;
- exceptions have a safe human path;
- history is preserved.

---

# 33. Product-Level Success Condition

FACTACT UI V1 succeeds when a user can experience this without knowing the internal schema:

> **状況を理解する → 必要なことだけ判断する → 次のActionを進める → 現実のChangeを確かめる → Factとして残す → 次の仕事が楽になる。**

And when the system can prove:

> **仕事をするたびに、分からないことが事実に変わる。事実が増えるほど、次の仕事は速く、正確になる。**

The first implementation milestone is not “all screens exist.”

It is:

> **One Fact can safely move through Action and Change, become trusted operational reality, and be reused by the next Service interaction.**
