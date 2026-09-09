# FACTACT — AI Development Context

> **Purpose:** This document is the entry point for AI coding agents, VS Code assistants, and new developers working on FACTACT.
>
> Read this document before proposing architecture or implementation changes. Then read the referenced canonical specifications.

---

# 1. Product Identity

**Product:** FACTACT（ファクタクト）  
**Tagline:** **From Fact to Action.**  
**Core Principle:** **FACT FIRST.**  
**Core movement:** **FACT → ACT**  
**Growth model:** **HELIX**  
**Company:** atLIB

NEMESIA is an internal development project code. It is **not** the public product name.

FACTACT is a new **Service Operating Platform**. It is not a ticketing system, CMDB replacement, workflow builder, CRM, or direct Web migration of the existing DDL/GWS prototype, although it overlaps with capabilities found in those categories.

The central idea is:

> **Factを起点に仕事を動かし、仕事によって生じたChangeを新しいFactとして残し、そのFactによって次の仕事をより速く、正確にする。**

Atomic loop:

> **FACT → ACT → CHANGE → NEW FACT → NEXT ACT**

Expanded learning loop:

> **Fact → Work → Change → Verified Fact → Learning → KAIZEN**

Learning is an outcome of handling Facts correctly. Do **not** invert this and redesign the product around generic AI learning first.

---

# 2. Why FACTACT Exists

atLIB provides services such as 情シスKAIZEN and Service Desk. These services look different at the surface but share the same operating structure:

- a Service exists;
- a Contract defines scope/responsibility/authority;
- a Service Recipient receives the service;
- Events occur;
- the system determines whether Work is actually required;
- someone owns the Work;
- people/automation perform Actions;
- Actions may change reality or our knowledge of reality;
- verified Changes update operational information;
- Work creates Evidence and learning;
- repeated operation should improve the next operation.

FACTACT is the common platform for this structure.

> **One Platform / Multiple Service Models.**

Initial Service Models:
- 情シスKAIZEN
- Service Desk

Future Service Models may include infrastructure/MSP and managed security, but V1 must not prematurely build all of them.

---

# 3. The Root Design Philosophy — Fact First

The current architecture did not start with “we want an AI learning system.”

It emerged from insisting that the system handle **Facts correctly**.

This distinction is fundamental.

## 3.1 One Fact, Multiple Views

The same real-world fact must not be copied into separate tables merely because different screens or services need it.

Example:

> `Tanaka → USES_PRIMARY_DEVICE → PC001`

That relationship can support:
- Person View
- Device View
- PC management View
- Service Desk context
- Security context
- reporting

Do not create independent “PC management list”, “Service Desk device field”, etc. as separate sources of truth.

## 3.2 Fact is not a universal table

**Fact is a design principle, not a giant EAV/Fact table.**

Keep proper domain objects such as:
- Person
- Organization
- Device
- Account
- Application
- Work
- Relation
- Decision
- Rule
- Change
- Knowledge

Add provenance, evidence, validity, reliability and verification semantics where they are meaningful.

Do not redesign the domain into a generic knowledge graph or EAV model simply because Fact is central.

## 3.3 Semantic separation is mandatory

The system must distinguish:
- **FACT**
- **OBSERVATION**
- **HYPOTHESIS**
- **DECISION**
- **RULE**
- **UNKNOWN**

An Observation is not a Fact.  
An AI inference is not a Fact.  
A Decision is not proof of reality.  
A Rule describes how to act; it is not the same thing as a real-world Fact.

> **分からないことを、分かったことにしない。**

UNKNOWN is a truthful epistemic state, not an error to be filled with plausible data.

## 3.4 Trust is temporal

Important operational information may need:
- Source
- Evidence
- Validity / effective period
- Reliability
- Verified At

> **updated_at ≠ trusted_at**

External system data is not automatically authoritative merely because it came from an API.

---

# 4. Core Domain Flow — Do Not Bypass

Canonical flow:

> **Event → Service Context → Requirement Evaluation → Decision / Rule → Work or No Work → Action → Change → Verify → Commit → Registry / Knowledge → Learning / KAIZEN**

Several shortcuts are explicitly prohibited.

## 4.1 No direct Event → fixed Work

An Event is a trigger to evaluate whether Work is required.

Example: employee JOIN does not mean “always create 12 onboarding tasks.”

Requirement Evaluation may result in:
- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

No Work may be the correct result.

> **Workを効率化する前に、そもそもWorkを発生させる必要があるか判断する。**

## 4.2 No direct Work Close → Registry mutation

Work completion alone does not prove that reality changed.

Use:

> **Work → Action → Change → Verify → Commit → authoritative state**

Two important Change categories:
- **REALITY_CHANGE**
- **KNOWLEDGE_STATE_CHANGE**

Discovery time is not automatically the time reality changed.

## 4.3 Preserve history

Do not overwrite historical relationships.

Example PC replacement:
- close effective validity of `Tanaka → PC001`;
- create `Tanaka → PC002`;
- preserve both histories.

---

# 5. Work Model

Definition:

> **Work = Serviceを提供するために、Ownerを持って開始され、判断・行動・変更・Evidenceを伴い、明確なOutcomeまで管理される仕事の単位。**

Candidate Work types:
- INCIDENT
- REQUEST
- TASK
- CONSULT
- CHANGE
- REVIEW
- EVENT_TASK

Candidate lanes:
- SUPPORT
- CONSULT
- CHANGE

Separate:
- Service Owner
- Work Owner
- Assignee

Every active Work should have:
- Owner
- status
- Next Action where applicable
- Next Action Owner
- due / target where applicable
- Waiting For when waiting

Waiting never removes Ownership.

Candidate outcomes:
- COMPLETED
- NO_ACTION_REQUIRED
- CANCELLED
- DUPLICATE
- SUPERSEDED

`NO_ACTION_REQUIRED` after investigation is different from Requirement Evaluation deciding that no Work should be created.

---

# 6. Operational Context

FACTACT maintains the context required to perform work safely and consistently.

For a Work, Effective Operational Context may include:
- Registry Facts
- Relations
- Knowledge
- Rules
- Authority
- Decision history
- Exceptions
- recent Changes
- reliability/provenance
- Unknowns / Information Gaps
- Contract / Service context
- Recipient Observations

Key idea:

> **Operational Contextで運用を標準化し、Recipient Contextで対応を個別化する。**

Operational standardization is not merely a written procedure. It means different operators can use the same trusted Facts, Rules, Authority and Exceptions to make safe and consistent decisions.

---

# 7. Recipient Observation

Recipient Observation represents useful human/service context, such as customer expectations or preferences.

Example:

Instead of storing `温度高め`, record something attributable such as:

> `回答速度への期待が高いとの営業Observationあり`

with source, author, date/context and review/validity where appropriate.

Observation must never silently become Fact or Rule.

Possible progression:

> Observation → Evidence / Pattern → Rule Candidate → Human Decision → Rule

This is important for Service Desk: remove inquiry-handling burden from sales without losing customer understanding.

---

# 8. AI Boundary

Canonical rule:

> **AI Suggests. Human Decides. System Records.**

Also:

> **AI Reasons from Facts. It does not create authoritative Facts.**

AI can:
- summarize known context;
- identify Unknowns / contradictions;
- propose questions;
- propose Requirement interpretations;
- suggest triage/routing;
- propose Change candidates;
- propose Knowledge candidates;
- propose Rule candidates;
- identify repeated patterns;
- propose Automation / KAIZEN candidates.

AI must not silently:
- fill UNKNOWN with inference;
- promote Observation/Hypothesis to Fact;
- create authoritative Rule;
- grant Authority;
- commit a reality-changing Change without the configured authorization/verification path.

AI output should expose what is known, unknown, inferred and why.

---

# 9. Progressive Models

## Progressive Onboarding

> **完璧に理解してから始めるのではなく、安全に始められる最低限を定義し、運用しながら理解を深める。**

Do not demand a perfect CMDB before Service Start.

Start with minimum safe Service/Contract Context and minimal Recipient identity. Let real Work reveal high-value Unknowns and grow Operational Context.

## Progressive Authority

> **最初は確認する。できることが分かったら任せる。標準化できたら自動化する。**

Conceptual levels:
- A0 Observe
- A1 Supervised
- A2 Delegated
- A3 Rule Governed
- A4 Automated

A4 is not universally “better.” High-risk decisions may correctly remain human-controlled.

Repeated clean approvals may produce a Promotion Candidate, but Authority is granted by a human/authorized process.

## HELIX

FACTACT should not repeat a flat workflow forever.

Conceptual progression:

> **FACT → ACT → CHANGE → NEW FACT → KNOWLEDGE → RULE → STANDARDIZE → DELEGATE → AUTOMATE → NEXT ACT**

The next Work should begin from a better state when previous Work created reusable trusted knowledge.

---

# 10. 情シスKAIZEN Service Model

Customer-facing service concept:

> **人を増やす前に、仕事を減らす。**

Do not simply outsource existing inefficiency.

V1 representative processes:
- JOIN
- LEAVE
- MOVE
- SUPPORT
- DEVICE
- SAAS
- SECURITY
- IT_CHANGE

These are configurations of FACTACT Core, not eight separate workflow products.

## LALLIB Method

Working KAIZEN classification:

- **Let go** — なくす
- **Automate** — 自動化する
- **Leave** — 社内に残す
- **atLIB** — 任せる

LALLIB is a KAIZEN method, not a Core Work status or universal domain object.

Historical 情シスKAIZEN thinking also included **標準化する**. Do not silently discard it: standardization is currently treated as a cross-cutting maturity step enabling delegation/automation, rather than necessarily a final destination category. Revisit explicitly if implementation requires a categorical model.

Primary value KPI:

> **創出時間** — time made available for IT that improves the company.

Think:

> 削減時間 → 創出時間 → 成長投資時間

Do not reduce the product to ticket-volume metrics.

---

# 11. JOIN — First Vertical Golden Flow

JOIN is the recommended first vertical slice.

Example:

1. create `EMPLOYEE_JOINING` Event with minimum known Facts;
2. show Known Facts and relevant Unknowns;
3. evaluate Requirements;
4. create only justified Work;
5. allow unrelated safe Work while some Requirements remain undecided;
6. execute PC provisioning;
7. Action proposes/records Reality Change;
8. Verify and Commit `Person → USES_PRIMARY_DEVICE → Device`;
9. reuse the same relation in Person, Device, SUPPORT and other Views;
10. propose learning candidate from Work evidence;
11. human may approve Knowledge/Rule;
12. next similar JOIN visibly benefits.

The desired operator realization is:

> **「FACTACTは、入社チェックリストを管理するシステムではなく、分かっているFactから必要な仕事を判断して、仕事をした結果がそのまま次の仕事に使える情報になるシステムだ。」**

---

# 12. Service Desk / Sonics Reference Case

Real service structure:

> **atLIB → Sonics → Sonics end customers**

Sonics has roughly hundreds of end-customer organizations. These are Service Recipients, not hundreds of FACTACT Tenants.

Service Desk goal:
- centralize incoming IT inquiries;
- first-level triage;
- first-level phone/remote support;
- escalate unresolved/on-site-required cases to Sonics with useful context and proposed handling;
- preserve customer insight for sales without making sales perform inquiry handling.

Key principle:

> **「すぐ解決する」ではなく、「すぐ適切な解決プロセスに乗せる」。**

A recipient may begin with minimal information. Operational Context should grow through real Work.

---

# 13. Phone / MOT-TEL Boundary

MOT/TEL handles telephony. FACTACT handles service Work.

V1 intended pattern:

> incoming call → caller number → FACTACT incoming-call page → normalize Contact Point → resolve Person/Organization/Recipient candidate → operator confirm/correct → Operational Context → guided triage → Requirement Evaluation → Work

Phone number is an **identity hint**, not Person ID and not authentication.

One Person may have multiple phone numbers. An Organization may have shared numbers.

First unknown call:
- remain UNKNOWN;
- operator identifies caller;
- link Contact Point when verified.

Subsequent call:
- propose likely same Person/Recipient;
- operator can correct ambiguity.

Caller-ID match must never grant sensitive Authority.

Call duration is desirable if provider capability supports reliable lifecycle/history data. Do not fabricate duration or assume undocumented APIs/webhooks.

---

# 14. Zoho Boundary

For the Sonics case:

> **FACTACT = System of Work**  
> **Zoho = System of Relationship**

Do not build full bidirectional CRM synchronization in V1.

Initial launch may use manual Zoho entry.

Desired minimal future write-back:
- `対応あり`
- FACTACT Work/case URL
- date/time
- short neutral status if useful

Do not sync detailed Work data merely because it is technically possible.

Future adapter should be idempotent and auditable.

---

# 15. Service × Contract × Recipient

Do not collapse these concepts.

Conceptual structure:

> **Tenant → Organization → Service → Contract Profile → Service Recipient**

Tenant is an isolation/security boundary, not automatically “customer.”

Organization is a real-world organization.

Service is what is being delivered.

Contract Profile operationalizes agreed scope, responsibility, Authority, SLA/SLO, escalation, delivery and measurement.

Service Recipient is the target receiving service and may be an Organization, Person, Device, Location, System, etc., according to supported V1 semantics.

Examples:

Sonics:
- atLIB contract with Sonics
- Service = Service Desk
- Recipients = Sonics end-customer organizations

情シスKAIZEN:
- atLIB contract with Customer A
- Service = 情シスKAIZEN
- Recipients may include Customer A employees/persons and relevant operational entities.

Do not use a generic `customer_id` to replace Tenant + Organization + Service + Contract + Recipient semantics.

---

# 16. Contract Profile

Contract Profile is the contract/service specification made operational.

It may define:
- Customer / Organization
- Contract reference/version
- effective dates
- Service Model
- Service Recipients
- enabled services/items
- Ownership
- EODA responsibility
- delegated Authority
- service hours/calendar
- SLA/SLO
- delivery
- escalation
- reporting
- measurement / KAIZEN profile

FACTACT is not initially a contract-authoring/e-sign/billing system.

Use standard model + customer overrides, not bespoke per-customer code.

Contract versioning is important: Work should be traceable to the effective Contract Profile version.

---

# 17. Responsibility and Service Management

EODA model:
- **E** Execute
- **O** Own
- **D** Decide
- **A** Accountable

Do not design the monthly service as named engineer × 160 hours.

The customer buys defined IT functions/responsibility/outcomes, not direct command over an individual worker.

SLA/SLO principle:

> **解決時間より、Owner不在時間をなくす。**

Acknowledgement is not necessarily First Response.

Waiting may pause appropriate service clocks but does not remove Owner follow-up responsibility.

Priority concept:

> Business Impact × Urgency

---

# 18. Registry and Relations

Person is a UX starting point, not the parent key for the whole domain.

V1 Registry candidates:
- Organization
- Person
- Location
- Device
- Account
- Application
- System
- Vendor
- Contract Reference

Relations are first-class and temporal where appropriate.

Relation should be able to preserve:
- status
- effective from/to
- Source Work/Change
- Verified At
- Evidence
- Reliability

Examples:
- Person USES_PRIMARY_DEVICE Device
- Person HAS_ACCOUNT Account
- Account BELONGS_TO Application
- Person ASSIGNED_LICENSE License (if License is modeled in V1)

Do not use `person.phone_number` as the only phone model. Use Contact Point / Identity Resolution semantics.

---

# 19. Integration Architecture

Keep vendor-specific semantics outside Core.

Concepts may include:
- Integration Provider / Connection
- External Reference
- Integration Policy
- Integration Event / Delivery
- Contact Point
- Identity Resolution
- Communication Event
- Sync/Delivery Status
- adapter-specific metadata/payload
- idempotency key / external event ID
- retry/error/audit metadata

Do not turn V1 into a generic no-code iPaaS.

Vendor IDs must not become Core primary keys.

Examples of prohibited coupling:
- Zoho ID as Organization PK
- MOT/TEL call ID as Work PK
- Auth provider ID as Person PK

---

# 20. Platform / Infrastructure Decision

Current V1 decision:

> **Supabase + Shared PostgreSQL + RLS**

But:

> **Use Supabase, but do not make FACTACT Core depend on Supabase.**

Guidelines:
- shared DB/schema with explicit `tenant_id` where applicable;
- RLS as defense-in-depth;
- Application/Domain API owns business authorization and invariants;
- server determines effective Tenant/Service context;
- AI only receives authorized context;
- callbacks resolve Tenant through trusted integration configuration;
- Core should remain portable to ordinary PostgreSQL / Cloud SQL;
- avoid putting essential domain logic exclusively in Supabase-specific triggers/RLS/Edge Functions;
- do not use Supabase Auth ID as Person PK.

Physical isolation / dedicated project can be considered for contractual/compliance/enterprise requirements, not as the default tenant model.

---

# 21. Reusable atLIB Platform Assets

Reference repository previously audited:

`yoshihisahagisaka/atlib-msp-dev`

General conclusion:

> **業務ドメインは完全新規。認証・GCP・DB・Secret・OIDC・AI・監査などの実証済みPlatform Patternは再利用する。既存システムの業務テーブルはコピーしない。**

Strong reuse/adapt candidates from existing systems:
- Node / TypeScript patterns
- Cloud Run deployment patterns
- PostgreSQL migration runner
- Secret Manager
- HTTPS Load Balancer + IAP patterns
- Google staff authentication patterns
- generic Google/Microsoft OIDC + PKCE patterns
- signed state/cookie patterns
- structured audit events
- GCS/object storage patterns
- Cloud Run Job/service-to-service patterns
- Zod validation
- structured AI output validation
- Golden Test philosophy

Do not copy blindly:
- existing customer/business schemas
- DDL/Sheets schema
- SecureSend transfer schema
- SSO spike schema
- manual `minutes_spent`/ops_history as FACTACT effort model
- in-memory rate limiter for distributed production
- local auth bypass patterns
- customer-as-tenant assumptions

---

# 22. Activity / Effort Measurement

Do not use invasive keyboard/mouse/window surveillance.

Candidate Activity Stream fields:
- Actor
- Timestamp
- Work
- Activity Type
- Source
- Duration Estimate
- Confidence
- Context

Separate:
- Elapsed / Lead Time
- Observed Active Effort
- Waiting Time + reason
- Unobserved / Unknown

AI may reconstruct ranges/confidence from evidence, but must not present false precision.

---

# 23. Service Economics and Measurement

Principle:

> **情シスKAIZENの粗利改善を、「担当者をもっと忙しくする」ことで実現しない。**

Improve economics through:
- Work Avoided
- standardization
- trusted Operational Context
- reduced repeated investigation
- safe delegation
- automation when ready
- reduced person dependency

Candidate measures:
- Work Generated
- Work Avoided
- No Action Required
- Human Work
- Automated Work
- repeat inquiry/investigation
- waiting / ownerless time
- Unknown resolved
- verification/correction rate
- escalation rate
- Created Time

Do not create vanity maturity percentages without evidence.

---

# 24. Public DX Indicators

FACTACT / 情シスKAIZEN may accumulate Evidence useful for management and public DX self-assessment frameworks.

Do **not** claim that FACTACT mechanically raises official DX scores or directly convert internal metrics into official scores.

Think in layers:

1. Operational KPI
2. KAIZEN Outcome
3. Public / Business Impact

The platform should support evidence-based management decisions, not manufacture benchmark scores.

---

# 25. UX Philosophy

FACTACT should not feel like a database admin console.

Primary question:

> **What Fact does the operator need now, and what is the next safe Action?**

Core UX principles:
- show reality, not schema vocabulary;
- show Why behind important Requirement/AI recommendations;
- UNKNOWN is visible but not automatically a red error;
- progressive disclosure;
- Outcome/readiness before ticket count;
- Ownership always visible;
- learning capture should be nearly frictionless;
- previous Work should visibly improve later Work.

Suggested common workspace:

- Main: current Work / decision / Change / next Action
- Context: Facts / Unknowns / Rules / Knowledge / Authority / recent Changes
- Timeline: Event → Decision → Work → Action → Change → Learning

The UI may make Action→Change feel natural, but implementation must preserve domain semantics.

---

# 26. Domain Commands over CRUD

Prefer intent-revealing domain commands such as:
- CreateJoinEvent
- EvaluateRequirements
- RecordRequirementDecision
- CreateRequiredWork
- AssignWorkOwner
- RecordAction
- ProposeChange
- MarkChangeExecuted
- VerifyChange
- CommitChange
- RecordKnowledgeStateChange
- ProposeKnowledgeCandidate
- ProposeRuleCandidate
- ApproveRuleCandidate
- RecordKaizenCandidate

Avoid using generic CRUD as the business model.

Example prohibited shortcut:

`PATCH Person.primary_device_id`

as the implementation of a device assignment.

---

# 27. Core Invariants — Treat as Architecture Guardrails

Do not casually break these during implementation:

0. **Fact First / One Fact, Multiple Views.**
1. Active Work generally has an Owner.
2. IN_PROGRESS Work generally has a Next Action.
3. Waiting never removes Ownership.
4. Actors cannot execute/commit beyond Authority.
5. Reality-changing Action must have traceable Change semantics.
6. Change traces its Source Work/Event/Decision as appropriate.
7. Review-required Change cannot commit before required review.
8. AI recommendation never grants Authority or silently creates authoritative Fact/Rule.
9. Closing Work never destroys Evidence, Audit, Decision or Change history.
10. Service Models cannot redefine Core semantics.
11. Event does not directly imply fixed Work; Requirement Evaluation comes first.
12. Historical relations are not overwritten as if previous reality never existed.
13. UNKNOWN must not be replaced by plausible inference.
14. Vendor IDs and auth IDs must not define domain identity.
15. Service/Contract/Recipient semantics must not collapse into a generic customer field.

If an implementation appears to require breaking one of these, stop and surface the conflict before changing the model.

---

# 28. V1 Scope Discipline

V1 should prove the Core, not build every adjacent ITSM feature.

Do not balloon V1 with:
- PBX/IVR/recording implementation
- full CTI platform
- full CRM synchronization
- shift/workforce management
- full MDM
- monitoring platform
- generic iPaaS
- universal EAV/Fact graph
- contract authoring/e-sign/billing
- exhaustive analytics warehouse

Integrate with external systems where appropriate.

---

# 29. Recommended Implementation Order

Primary vertical slices:

1. **JOIN**
   - Event
   - Requirement Evaluation
   - Work / Work Avoided
   - Person/Device/Account relations
   - Action/Change/Verify/Commit
   - One Fact, Multiple Views

2. **SUPPORT + DEVICE**
   - Operational Context reuse
   - inquiry-driven Work
   - Knowledge State Change
   - device replacement/history

3. **MOVE + LEAVE**
   - current-state-driven requirements
   - temporal relations
   - lifecycle safety

4. **SAAS**
   - Application/Account/License relations
   - approvals/Authority

5. **SECURITY + IT_CHANGE**
   - Observation/Hypothesis/Fact separation under risk
   - deliberate organizational/technical change
   - proves FACTACT is not merely Service Desk/ticketing.

First developer Golden Flow should be small and vertical rather than building all generic infrastructure first.

---

# 30. Canonical Documents to Read Next

Read these after this file, in roughly this order:

1. `docs/00-product-vision.md` — product identity and Fact First vision
2. `docs/01-core-prd.md` — Core requirements and boundaries
3. `docs/02-domain-model.md` — domain semantics and invariants
4. `docs/03-operational-context.md` — trusted operational information
5. `docs/04-progressive-onboarding.md` — safe start with incomplete context
6. `docs/11-josys-kaizen-service-model-v1.md` — 情シスKAIZEN Service Model
7. `docs/12-factact-join-ux-golden-flow.md` — first operator UX Golden Flow

Additional implementation/reference docs in this repository may still contain the old project-code name `NEMESIA`. Treat NEMESIA as the internal project code and FACTACT as the product name unless/until those documents are normalized.

If data/integration design docs exist on another branch or repository, reconcile them against the principles above rather than assuming older wording overrides current Product Vision.

---

# 31. Current Open Design Questions

These are intentionally not fully locked:

- exact Work state machine and transition guards;
- Requirement Evaluation persistence/state model;
- exact Change execution/verification/commit schema;
- Authority/Review scope model;
- Service Recipient polymorphism boundaries for V1;
- concrete Registry entity types beyond initial candidates;
- RLS policy matrix;
- stable Work deep-link scheme;
- MOT/TEL capabilities for call duration/lifecycle beyond documented URL/CTI integration;
- exact Activity/Effort inference model;
- exact learning-candidate persistence design;
- LALLIB treatment of `標準化する` as method stage vs classification;
- management dashboard and Created Time measurement details.

Do not silently “resolve” these through incidental implementation choices. If a choice becomes architecturally consequential, document the decision.

---

# 32. How an AI Coding Agent Should Work

When asked to implement FACTACT:

1. Read this file and the relevant canonical docs first.
2. State which Core invariants the implementation touches.
3. Prefer the smallest vertical slice that proves real product behavior.
4. Reuse proven infrastructure/platform patterns, not legacy business schemas.
5. Keep domain logic explicit and testable outside framework/vendor specifics.
6. Add Golden Tests for domain behavior, not only endpoint/component tests.
7. Preserve provenance/history rather than taking CRUD shortcuts.
8. Make AI-assisted behavior explainable and non-authoritative by default.
9. If a request conflicts with a canonical principle, surface the conflict rather than silently implementing it.
10. When a new architectural decision is made, update the relevant docs so future humans and AI agents share the same context.

Recommended first prompt in VS Code:

> **Read `docs/99-ai-development-context.md` first, then the canonical documents referenced in section 30. Treat them as the product and architecture context for FACTACT. Before coding, summarize the invariants relevant to the task and flag any conflict between the requested implementation and those invariants. Do not replace the Fact First domain model with generic ticket/CRUD patterns.**

---

# 33. Definition of Product Success

FACTACT succeeds when daily operation produces compounding organizational capability without hiding uncertainty or sacrificing control.

The desired real-world effect is:

> **一件一件の仕事が、次の仕事を変える資産になる。**

And:

> **仕事をするたびに、分からないことが事実に変わる。事実が増えるほど、次の仕事は速く、正確になる。**

Ultimately:

> **FACTACT — From Fact to Action.**
