# FACTACT — First Vertical Slice Contract V1

**Status:** CANONICAL IMPLEMENTATION CONTRACT  
**Scope:** First executable FACTACT vertical slice  
**Flow:** Login → Home → JOIN Event → Requirement Evaluation → Work → Device Action → Change → Verify → Fact → Person View

This document defines the minimum persistence model, application commands, read models, API boundary, authorization rules, and Golden Tests required to implement the first real FACTACT flow.

It must be read with `02-domain-model.md`, `03-operational-context.md`, `12-factact-join-ux-golden-flow.md`, `14-factact-ui-specification-v1.md`, and `99-ai-development-context.md`.

If implementation convenience conflicts with Core invariants, Core invariants win.

## Product Owner clarification — 2026-09-09

The department/employment-type rule illustrated in document 14 is a UX example,
not a mandatory first-slice requirement. The first `COMPANY_PC = REQUIRED` may
use a minimal explicit/human-confirmed requirement or a bounded Contract Profile
rule. The bootstrap selects the bounded Contract Profile rule.

Do not add department/employment-type fields as JOIN-only data or authoritative
raw Event JSON. When introduced later, these must be reusable Operational Facts
with provenance, reliability and verification semantics. Evaluation basis/snapshots
serve reproducibility; they do not become the authoritative source of those Facts.

The initial bootstrap stops for architecture review after the application structure,
authentication/Operator mapping, migration/RLS baseline and deterministic prerequisite
seed are established. The seven commands and full Golden/browser flow follow that
review in section 15 order. Bootstrap checks do not establish GT-01–GT-12 completion.

---

# 1. Goal

The first slice proves one architectural claim in running software:

> **A real service Event is evaluated against trusted context, only necessary Work is created, an Action produces a verified Change, and the resulting Fact becomes reusable Operational Context.**

The demonstration scenario is:

1. an authenticated atLIB operator opens FACTACT;
2. a JOIN Event exists for a Person;
3. requirements are evaluated;
4. Company PC is `REQUIRED`;
5. only the necessary PC preparation/assignment Work is created;
6. an operator assigns a Device through a Domain Command;
7. the command proposes a `REALITY_CHANGE`;
8. the Change is verified and committed;
9. the authoritative relation `Person → USES_PRIMARY_DEVICE → Device` becomes effective;
10. Person Operational Context shows the verified Device Fact;
11. Timeline preserves Event → Requirement → Work → Action → Change → Fact provenance.

A direct update such as `person.device_id = ...` does not satisfy this slice.

---

# 2. Explicit Non-Goals

Do not delay this slice for:

- Service Desk telephony;
- MOT/TEL integration;
- Zoho integration;
- AI automation;
- full Knowledge/Rule authoring UI;
- generic workflow builder;
- arbitrary customer configuration;
- full Service Catalog;
- advanced SLA/SLO engine;
- reporting warehouse;
- billing;
- mobile UI;
- full production-grade notification system.

The design must leave room for them without implementing them prematurely.

---

# 3. Architecture Boundary

V1 platform decision:

> **Supabase PostgreSQL + Shared DB + RLS, while Core behavior remains application/domain controlled and portable to ordinary PostgreSQL.**

Layers:

```text
Web UI
  ↓
Application API / Commands
  ↓
Domain rules and invariants
  ↓
Repository / persistence adapters
  ↓
PostgreSQL / Supabase
```

Rules:

- Web UI never performs authoritative domain mutations directly against Supabase tables.
- RLS is defense in depth, not the sole authorization mechanism.
- Supabase Auth identity is not a domain Person/Operator primary key.
- Database triggers must not hide essential Event → Requirement → Work or Action → Change semantics.
- AI never receives privileged direct-write access to authoritative tables.

---

# 4. Minimum Persistent Model

This is the **minimum semantic model**, not permission to create a universal generic schema.

All business tables that belong to a tenant must include `tenant_id` unless tenancy is inherited through a database-enforced parent relationship and the implementation can prove isolation safely. Prefer explicit `tenant_id` in V1.

Use UUID/UUID-compatible identifiers. Exact SQL types, naming style, ORM, and migration tooling may be chosen during implementation.

## 4.1 Tenant

Purpose: top-level data isolation boundary.

Minimum fields:

```text
Tenant
- id
- name
- status
- created_at
- updated_at
```

For the first local/demo environment, one atLIB development tenant is sufficient.

## 4.2 Operator

Purpose: authenticated human allowed to operate FACTACT.

```text
Operator
- id
- tenant_id
- external_auth_subject
- email
- display_name
- status
- created_at
- updated_at
```

`external_auth_subject` maps Google/Supabase/OIDC identity to the FACTACT operator. Do not use the external subject itself as the domain PK.

## 4.3 Organization

```text
Organization
- id
- tenant_id
- name
- status
- created_at
- updated_at
```

## 4.4 Person

```text
Person
- id
- tenant_id
- organization_id
- display_name
- email?                 // identity/contact hint, not necessarily authoritative login identity
- lifecycle_status
- created_at
- updated_at
```

Person is a Registry Entity but is not the parent record for every related object.

## 4.5 Device

```text
Device
- id
- tenant_id
- asset_tag
- serial_number?
- display_name
- device_status
- created_at
- updated_at
```

Do not add `person_id` as the authoritative current owner/primary-user field. Person↔Device reality is represented through Relation.

## 4.6 Service

```text
Service
- id
- tenant_id
- organization_id
- service_model_code     // e.g. JOSYS_KAIZEN
- name
- status
- created_at
- updated_at
```

## 4.7 Contract Profile

The first slice needs a minimal effective service context even if contract authoring is not implemented.

```text
ContractProfile
- id
- tenant_id
- service_id
- version
- effective_from
- effective_to?
- status
- configuration_json     // only for bounded service configuration; do not hide Core domain state here
- created_at
```

JOIN Event and Work must be traceable to the effective Contract Profile version used for service decisions.

## 4.8 Service Recipient

Represents what receives the Service.

```text
ServiceRecipient
- id
- tenant_id
- service_id
- recipient_type         // PERSON for first slice
- recipient_id
- status
- created_at
```

V1 implementation may enforce supported recipient types in application code rather than inventing a fully generic polymorphic framework.

## 4.9 Event

```text
Event
- id
- tenant_id
- service_id
- contract_profile_id
- service_recipient_id
- event_type             // JOIN
- occurred_at
- received_at
- source_type            // MANUAL in first slice
- source_reference?
- status
- payload_json?          // source payload only; not source of authoritative normalized Facts
- created_by_operator_id
- created_at
```

An Event does not directly imply a fixed Work template.

## 4.10 Requirement Evaluation

One row per evaluated requirement for the Event/context.

```text
RequirementEvaluation
- id
- tenant_id
- event_id
- requirement_code       // e.g. COMPANY_PC
- result                 // REQUIRED | CONDITIONAL | DECISION_REQUIRED | ALREADY_SATISFIED | NOT_APPLICABLE | WAIVED | CONDITION_NOT_MET
- basis_summary
- rule_reference?
- decision_id?
- evaluated_by_type      // HUMAN | RULE | AI_SUGGESTED_HUMAN_CONFIRMED
- evaluated_by_operator_id?
- evaluated_at
- created_at
```

The first implementation may support a small explicit requirement catalog in code. Do not build a generic rules engine first.

A requirement evaluation may create zero or one Work in this first scenario. The Core model still permits zero/one/many Works overall.

## 4.11 Work

```text
Work
- id
- tenant_id
- service_id
- contract_profile_id
- service_recipient_id
- source_event_id?
- source_requirement_evaluation_id?
- work_type              // EVENT_TASK for JOIN PC assignment
- lane                   // CHANGE or SUPPORT/CONSULT later
- title
- status
- outcome?
- priority
- business_impact?
- service_owner_operator_id?
- work_owner_operator_id
- assignee_operator_id?
- next_action
- next_action_owner_operator_id?
- due_at?
- waiting_for?
- created_at
- updated_at
- closed_at?
```

First-slice invariants:

- active Work must have a Work Owner;
- IN_PROGRESS Work should have a Next Action unless explicitly waiting/blocked;
- waiting does not clear Work Owner;
- closing Work does not itself mutate Registry relations.

## 4.12 Action

```text
Action
- id
- tenant_id
- work_id
- action_type            // ASSIGN_DEVICE
- actor_operator_id
- status                 // STARTED | COMPLETED | FAILED | CANCELLED
- input_json?            // structured action input, bounded by action type
- result_summary?
- started_at
- completed_at?
- created_at
```

Action is an explicit business operation, not a generic activity log entry.

## 4.13 Change

```text
Change
- id
- tenant_id
- work_id
- action_id
- change_type            // REALITY_CHANGE | KNOWLEDGE_STATE_CHANGE
- change_kind            // PRIMARY_DEVICE_ASSIGNMENT for first slice
- status                 // PROPOSED | VERIFIED | COMMITTED | REJECTED
- subject_type           // PERSON
- subject_id
- proposed_effect_json   // typed/validated by application code
- verification_summary?
- verified_by_operator_id?
- verified_at?
- committed_at?
- created_at
```

For first slice, proposed effect is conceptually:

```text
Person <personId>
USES_PRIMARY_DEVICE
old: <none or previous device>
new: <deviceId>
```

The JSON payload is not the authoritative Fact after commit; it is the proposed Change representation.

## 4.14 Relation

Relation represents effective real-world/operational relationships.

```text
Relation
- id
- tenant_id
- relation_type          // USES_PRIMARY_DEVICE
- from_entity_type       // PERSON
- from_entity_id
- to_entity_type         // DEVICE
- to_entity_id
- status                 // ACTIVE | ENDED
- effective_from
- effective_to?
- source_change_id
- reliability            // VERIFIED for committed first-slice assignment
- verified_at
- created_at
```

Critical rules:

- never overwrite historical primary-device relation;
- replacing a device ends the previous effective relation and creates a new relation;
- `source_change_id` is mandatory for reality-changing relation creation in this flow;
- one active `USES_PRIMARY_DEVICE` relation per Person should be enforced for the first slice through domain validation and, where practical, a database constraint/index.

## 4.15 Evidence

Minimum evidence model:

```text
Evidence
- id
- tenant_id
- evidence_type
- title
- content_text?
- external_uri?
- created_by_operator_id
- created_at
```

Association may use explicit link tables such as `change_evidence` when first needed. Do not build a universal attachment graph before necessary.

## 4.16 Timeline / Audit Event

Persist an append-oriented audit/event record sufficient to reconstruct human-readable Timeline.

```text
AuditEvent
- id
- tenant_id
- aggregate_type
- aggregate_id
- event_type
- actor_operator_id?
- occurred_at
- metadata_json
```

This does not replace domain tables. It records what happened for audit/projection purposes.

---

# 5. Fact Representation in the First Slice

Do **not** create a giant `facts` table.

The verified Fact:

> `Tanaka → USES_PRIMARY_DEVICE → PC001`

is represented by an effective `Relation` with provenance:

- source Change;
- verified_at;
- reliability;
- effective period.

The Person Operational Context read model interprets this Relation as a human-readable Fact.

This proves:

> **Fact is a design principle, not a universal table.**

---

# 6. Minimum Domain/Application Commands

Commands are the authoritative mutation boundary. HTTP endpoint names may differ, but these semantics must exist.

## 6.1 `CreateJoinEvent`

Input:

```text
organizationId
personId or minimal person data
joinDate
serviceId
```

Behavior:

1. authorize operator against tenant/service;
2. resolve effective Contract Profile;
3. create/resolve Service Recipient;
4. create JOIN Event;
5. emit Audit Event;
6. do **not** create fixed Works yet.

Returns:

```text
eventId
recipientId
contractProfileVersion
```

## 6.2 `EvaluateJoinRequirements`

Input:

```text
eventId
```

First-slice requirement catalog may include:

- `COMPANY_PC`
- optional placeholder requirements to prove No Work outcomes.

Behavior:

1. load Event + effective Service/Contract/Recipient context;
2. load relevant verified Facts/Unknowns;
3. evaluate supported requirements;
4. persist RequirementEvaluation results;
5. create Work only for results that require executable Work;
6. preserve explicit No Work results;
7. emit Audit Events.

For the Golden Flow, `COMPANY_PC = REQUIRED` creates a PC assignment Work.

Idempotency requirement: re-running evaluation must not create duplicate Work for the same effective evaluation unless an explicit re-evaluation supersedes the previous result.

## 6.3 `TakeWorkOwnership`

Input:

```text
workId
operatorId? // defaults current operator
```

Behavior:

- set/transfer Work Owner only if authorized;
- preserve Service Owner semantics;
- emit Audit Event.

## 6.4 `StartAssignDeviceAction`

Input:

```text
workId
deviceId
```

Behavior:

1. authorize Action and Authority;
2. validate Device exists in same tenant and is assignable;
3. validate Work is appropriate for this Action;
4. create Action STARTED or complete immediately if implementation uses one-step execution;
5. create a proposed `REALITY_CHANGE` for primary-device assignment;
6. do not mutate Relation yet.

Returns:

```text
actionId
changeId
proposedEffect
```

## 6.5 `VerifyChange`

Input:

```text
changeId
verificationSummary
evidenceIds? 
```

Behavior:

- confirm operator has required review/execute authority;
- validate proposed effect against current authoritative state;
- mark Change VERIFIED;
- record verifier/time/evidence;
- do not silently alter the proposed effect if reality differs; correction requires an explicit correction/re-proposal path.

## 6.6 `CommitChange`

Input:

```text
changeId
```

Behavior in one transaction:

1. require Change VERIFIED;
2. re-check tenant, authority and relevant current state;
3. end any previous active `USES_PRIMARY_DEVICE` relation for the Person if replacement is intended;
4. create new verified Relation with `source_change_id`;
5. mark Change COMMITTED;
6. update Work Next Action/readiness as domain rules require;
7. emit Audit Events.

The transaction must prevent a partial state where Change is COMMITTED but the authoritative Relation was not updated, or vice versa.

## 6.7 `CompleteWork`

Input:

```text
workId
outcome
```

Behavior:

- validate required Change is committed when the Work claims a reality-changing outcome;
- set outcome/status/closed_at;
- emit Audit Event.

`CompleteWork` does not itself create the Person↔Device Relation.

---

# 7. Read Models

The first slice should optimize UI reads through application-level read models/projections rather than forcing the frontend to reconstruct domain semantics from many raw tables.

These may initially be SQL queries/views/application assemblers. Do not prematurely build a separate CQRS infrastructure.

## 7.1 Home Read Model

```text
HomeView
- needsAttention[]
- nextActions[]
- serviceHealth
- recentChanges[]
```

For first slice, only fields needed by the JOIN flow need real data.

## 7.2 Join Workspace Read Model

```text
JoinWorkspaceView
- event
- personSummary
- readiness[]
- requirementEvaluations[]
- works[]
- blockingUnknowns[]
- recentTimeline[]
```

Requirement row must expose intentional No Work outcome.

## 7.3 Work Detail Read Model

```text
WorkDetailView
- work
- nextAction
- why
- recipient
- relevantFacts[]
- unknowns[]
- rules[]
- authority
- actions[]
- changes[]
- timeline[]
```

`why` should trace to Event/Requirement/Rule/Decision where applicable.

## 7.4 Person Operational Context Read Model

```text
PersonContextView
- person
- organization
- currentRelations[]
- verifiedFacts[]
- unknowns[]
- openWork[]
- recentChanges[]
- timeline[]
```

For the Golden Flow, after `CommitChange`, it must show:

```text
Primary Device: PC001
Semantic Type: FACT
Reliability: VERIFIED
Source Change: <changeId>
Verified At: <timestamp>
```

The UI may collapse provenance until expanded.

---

# 8. API Contract — First Slice

Exact REST/RPC style is implementation-defined. Recommended resource/command shape:

```text
GET  /api/home

POST /api/join-events
GET  /api/join-events/:eventId
POST /api/join-events/:eventId/evaluate-requirements

GET  /api/work
GET  /api/work/:workId
POST /api/work/:workId/take-ownership
POST /api/work/:workId/actions/assign-device
POST /api/work/:workId/complete

POST /api/changes/:changeId/verify
POST /api/changes/:changeId/commit

GET  /api/people/:personId/context
GET  /api/devices?status=assignable
```

Mutation response envelope:

```json
{
  "ok": true,
  "data": {},
  "warnings": [],
  "correlationId": "..."
}
```

Rejected command:

```json
{
  "ok": false,
  "error": {
    "code": "CHANGE_NOT_VERIFIED",
    "message": "このChangeは検証されていないためCommitできません。",
    "details": {}
  },
  "correlationId": "..."
}
```

Do not return database errors directly to the UI as domain messages.

---

# 9. Authorization and Tenancy

First slice roles may remain intentionally small:

```text
ADMIN
OPERATOR
REVIEWER
```

Conceptual permissions:

- `ADMIN`: tenant/service setup + all operational commands in development scope;
- `OPERATOR`: create Event, own Work, perform allowed Actions;
- `REVIEWER`: verify/commit Changes where review is required.

One person may hold multiple roles.

Authorization must check:

1. authenticated external identity resolves to active Operator;
2. Operator belongs to the tenant;
3. requested object belongs to the same tenant;
4. Operator has command permission;
5. Service/Contract/Authority permits the Action when applicable.

RLS must prevent cross-tenant reads/writes even if an application query is incorrect.

Never trust `tenant_id` supplied by the browser as authorization proof. Derive tenant context from authenticated session/operator context.

---

# 10. Transaction and Concurrency Rules

Minimum guarantees:

- `EvaluateJoinRequirements` is idempotent for an Event/evaluation version;
- `CommitChange` is transactional;
- only one active primary-device relation may result for a Person;
- concurrent Commit attempts must not produce two active primary devices;
- command handlers should use optimistic versioning or equivalent checks where concurrent state matters;
- Audit Event is recorded consistently with accepted command effects.

If exact implementation differs, Golden Tests must prove these outcomes.

---

# 11. Timeline Events Required for Golden Flow

At minimum, human-readable Timeline should be derivable from:

```text
JOIN_EVENT_CREATED
REQUIREMENT_EVALUATED
WORK_CREATED
WORK_OWNERSHIP_SET
ACTION_STARTED
ACTION_COMPLETED
CHANGE_PROPOSED
CHANGE_VERIFIED
CHANGE_COMMITTED
RELATION_EFFECTIVE
WORK_COMPLETED
```

Not every audit event needs a bespoke UI component. The Timeline projection should translate these into human-readable Japanese.

---

# 12. Seed / Demo Scenario

Create deterministic development seed data sufficient for the Golden Flow:

```text
Tenant: atLIB Development
Organization: Example株式会社
Person: 田中 一郎
Service: 情シスKAIZEN
Contract Profile: v1 / effective
Device: PC-0073 / AVAILABLE
Operator: current development operator
```

Seed only data required to demonstrate behavior. Do not encode Golden Flow outcomes in seed data; the Relation must be produced by executing the commands.

---

# 13. Golden Tests

The first implementation is not complete until these behaviors are automated.

## GT-01 Event does not automatically create fixed Work

Given a JOIN Event is created, before Requirement Evaluation there is no PC Work merely because event type is JOIN.

## GT-02 Required requirement creates Work

Given `COMPANY_PC = REQUIRED`, Requirement Evaluation creates exactly one relevant Work and records why.

## GT-03 No-Work result stays explicit

Given a requirement evaluates `NOT_APPLICABLE` or `ALREADY_SATISFIED`, no Work is created and the evaluation remains visible.

## GT-04 Re-evaluation does not duplicate Work

Running the same effective Requirement Evaluation twice does not create duplicate active Work.

## GT-05 Action does not directly mutate Registry

After `StartAssignDeviceAction`, a proposed Change exists but Person has no new primary-device Relation yet.

## GT-06 Unverified Change cannot Commit

`CommitChange` rejects a PROPOSED Change.

## GT-07 Verified Change commits atomically

After Verify + Commit, the new Relation exists and Change is COMMITTED in one consistent result.

## GT-08 Work completion alone cannot fake reality

Attempting to complete reality-changing Work without required committed Change is rejected.

## GT-09 Person Context shows verified Fact

After Commit, Person Context displays PC-0073 as verified Primary Device with source Change and verification time.

## GT-10 History is preserved on replacement

When a later Device replacement is committed, the previous Relation is ended, not overwritten/deleted, and the new Relation becomes active.

## GT-11 Cross-tenant access is denied

An Operator from another tenant cannot read or mutate the Person, Work, Change, or Relation.

## GT-12 Timeline proves provenance

The UI/read model can trace the final Device Fact back through Change → Action → Work → Requirement Evaluation → JOIN Event.

---

# 14. First Browser Acceptance Flow

A human tester should be able to perform:

```text
1. Login
2. Home opens
3. Create/open JOIN Event for 田中 一郎
4. See Event before fixed Works exist
5. Run Requirement Evaluation
6. See COMPANY_PC = REQUIRED
7. See one PC Work created
8. Open Work
9. See Next Action and Why
10. Select PC-0073 and start Assign Device Action
11. See proposed Change; Person Context still does not claim PC-0073 as Fact
12. Verify Change
13. Commit Change
14. See Person Operational Context update to Primary Device = PC-0073 / VERIFIED
15. Complete Work
16. See JOIN readiness reflect Device Ready
17. Inspect Timeline and trace the full provenance
```

This is the first definition of “FACTACT is running.”

---

# 15. Suggested Implementation Order

1. repository/app bootstrap;
2. authentication/operator mapping;
3. PostgreSQL/Supabase migration baseline + tenant RLS;
4. seed Tenant/Organization/Person/Service/Contract/Device;
5. domain types and command interfaces;
6. `CreateJoinEvent`;
7. `EvaluateJoinRequirements`;
8. Home/JOIN/Work read models;
9. JOIN and Work UI skeleton using the shared `MAIN + CONTEXT + TIMELINE` layout;
10. `StartAssignDeviceAction`;
11. Change proposal UI;
12. `VerifyChange` / `CommitChange` transaction;
13. Person Operational Context projection;
14. `CompleteWork` + readiness;
15. Golden Tests;
16. UX polish only after semantics pass.

Do not start with KAIZEN dashboards, AI prompts, or Service Desk telephony before this flow works.

---

# 16. Implementation Freedom

The coding agent/developer may choose:

- Web framework;
- component library;
- ORM/query builder;
- validation library;
- test runner;
- local development tooling;
- exact REST/RPC conventions;

provided the choices do not violate:

- Fact First semantics;
- tenant isolation;
- command boundary;
- Event → Requirement Evaluation → Work;
- Action → Change → Verify → Commit;
- provenance/history;
- AI authority boundaries;
- the Golden Tests above.

Prefer boring, understandable technology over architecture for architecture's sake.

---

# 17. Definition of Done for Architecture Handoff

The project is ready to move from design-first work into VS Code implementation when:

- this contract is accepted as the first vertical slice;
- `docs/README.md` points to it;
- the coding agent reads `99-ai-development-context.md` + this document before coding;
- no unresolved Core semantic question blocks the Golden Flow.

Open implementation choices should be decided in code/ADR as they become consequential, rather than expanding Product documentation indefinitely.
