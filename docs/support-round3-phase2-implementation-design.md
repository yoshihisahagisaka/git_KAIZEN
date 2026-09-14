# SUPPORT Human Review Round 3 — Phase 2 Implementation Design

Status: DRAFT FOR CORE FIT VALIDATION  
Branch: `review/factact-support-phase2-design`  
Date: 2026-09-14  
Product decision source: `docs/support-round3-phase2-decisions.md` — Decisions 1–7 ALL ACCEPTED

## 1. Purpose and gate

This document translates accepted Product semantics into an implementation design for migration, Domain/Application, persistence, API/UI projections, authorization, history/audit and tests.

This is **not implementation approval**. No migration or application change is authorized until this design passes Core Fit Validation and Product Owner approval.

The design must preserve:

- FACT FIRST
- Event → Requirement → Evaluation → Work → Action → Change → Verify → Registry/Knowledge
- One Fact, Multiple Views
- Active Work has an explicit Human Owner
- Waiting retains Ownership
- Reality Change != Knowledge State Change
- AI Suggests. Human Decides. System Records.
- Unknown is not silently converted into Fact
- no new Core Object merely because persistence needs a table

## 2. Current implementation baseline

Current schema already has shared `work`, `actions`, `changes`, `relations`, `evidence`, `requirement_evaluations` plus SUPPORT specialization tables. Current limitations relevant to Phase 2 are:

- `relations` is constrained to Person → Device `USES_PRIMARY_DEVICE` and requires a committed Change; it cannot represent Current Work Target.
- SUPPORT `support_decisions` is unique per Work.
- `work` has Owner and Next Action but no persisted Waiting semantics, Follow-up, provenance-bearing Due or explicit Close decision contract.
- `knowledge_candidates` is one per source Work, fixed to `CANDIDATE` / `VPN_GUIDANCE`, and has no approval/scope/review authority model.
- current SUPPORT repository has single-decision and single-candidate access patterns.
- RLS currently provides tenant isolation, but Team/Operational-group and approval/action authority remain Application concerns requiring explicit design.

These are implementation gaps, not evidence for new Core Objects.

## 3. Cross-decision design strategy

Phase 2 should introduce **persistence records for existing semantics**, not new domain nouns. Prefer append-preserving records for facts/decisions/history and mutable current projections only where operationally necessary.

Design split:

1. **Authoritative records** — target confirmations, ownership transfers, time commitments, escalation requests, knowledge reviews, close decisions.
2. **Current operational projection** — current Owner, Next Action, Waiting state, effective target, Due/Follow-up, current knowledge state.
3. **Derived views** — My Work, Team Work, Needs Follow-up, Overdue, Escalation attention, knowledge review queue.
4. **Audit** — technical command/audit events, with human-readable History derived from meaningful domain records.

A table name does not create a Core Object. Tables proposed below are persistence mechanisms for Work/Relation/Decision/Review/Authority semantics.

## 4. Decision 1 — Current Work Target

### 4.1 Persistence

Do **not** widen the existing Registry `relations` table into an ambiguous polymorphic table in this slice. Its current invariant is verified Person → primary Device backed by Change.

Introduce a Work-scoped relation persistence table, provisionally named `work_entity_relations`, representing the existing Relation concept in Work context.

Minimum fields:

- `id`, `tenant_id`, `work_id`
- `relation_type` = `CURRENT_TARGET`
- `entity_type` (`DEVICE` initially; future-compatible with PERSON / ACCOUNT / APPLICATION)
- nullable `entity_id`
- `target_state` = `IDENTIFIED` / `UNIDENTIFIED`
- `source_type`
- nullable `source_evidence_id`
- `confirmed_by_operator_id`, `confirmed_at`
- `effective_from`, nullable `effective_to`
- nullable `supersedes_relation_id`
- `created_at`

For an unidentified target, `entity_id` is null and the known description must be linked to Observation/Evidence rather than fabricated identity.

Only one effective `CURRENT_TARGET` relation per Work at a time. Correction ends the previous relation and appends a new one; it does not overwrite history.

### 4.2 Commands

- `confirmCurrentWorkTarget`
- `correctCurrentWorkTarget`

Both require Human Actor and provenance. Neither changes Registry reliability or creates a Change automatically.

### 4.3 Projection

Work Context returns:

- registered candidate target(s)
- current confirmed target
- confirmation source/time/actor
- factual mismatch projection if registered target differs

No cause inference and no numeric confidence ranking.

## 5. Decision 2 — BYOD / identification / eligibility

Ownership and management state remain Facts/Observations about the current target; support eligibility remains Requirement/Rule/Authority evaluation.

For Phase 2, unidentified target facts should be captured through Work-linked Observation records rather than creating Device rows. Existing `recipient_observations` is too inquiry-recipient-specific and one-per-event; do not overload it for all target facts.

Implementation design should generalize Observation persistence or add a Work-scoped observation persistence representation of the existing Observation Core concept. It must support:

- subject reference when known
- semantic type `OBSERVATION`
- source/provenance
- observed/recorded time
- reliability
- Work context

Eligibility projection must distinguish `ALLOWED`, `RESTRICTED`, and `UNKNOWN/DECISION_REQUIRED` semantics without deriving denial from BYOD alone.

Action authorization remains separate from target confirmation and eligibility.

## 6. Decisions 3–4 — Work responsibility, Close, Waiting, Due and Follow-up

### 6.1 Work current state

Extend the Work operational projection to support:

- explicit Human Owner
- Next Action and Next Action Owner
- Waiting state and Waiting reason
- Work-level Due, nullable
- Work-level Follow-up, nullable
- current Outcome only after explicit Close

Do not encode `OVERDUE`, `NEEDS_FOLLOW_UP`, `STALE`, or `ESCALATED` as Work status values.

### 6.2 Provenance-bearing time records

Because Due and Follow-up changes require provenance/history, do not rely only on mutable timestamp columns. Use an append-preserving Work timing record, provisionally `work_time_commitments`, with:

- `id`, `tenant_id`, `work_id`
- `kind` = `DUE` / `FOLLOW_UP`
- nullable `action_id` for responsibility-bearing Action-level Due
- `value_at`
- `source_type` (`SLA`, `CONTRACT`, `RULE`, `HUMAN_DECISION`, `CUSTOMER_COMMITMENT`, `OTHER`)
- nullable source references / reason
- `recorded_by_operator_id`, `recorded_at`
- effective/supersession semantics

Current Work columns may cache effective Work-level Due/Follow-up for efficient views, but append-preserving timing records are authoritative for why/how the value changed. If caches are used, Application commands update record + projection atomically.

### 6.3 Waiting

Waiting is a Work operational condition, not absence of Owner. Persist current Waiting state and append meaningful transitions to History/Audit.

`setWaiting` requires:

- current Owner remains set
- reason / waiting-for context
- Next Action semantics remain explicit where known
- Follow-up may be null/Unknown

`resumeWork` ends Waiting without changing Owner automatically.

### 6.4 Explicit Close

Introduce an explicit `closeWork` Application command separate from recording an Action/Result.

Persist the close decision append-preservingly, provisionally as `work_close_decisions` or an existing generalized Decision representation if Core Fit Validation identifies one already suitable.

Required semantics:

- Work
- Outcome
- close reason
- Actor
- Time
- Decision / Rule provenance where applicable

Close command validates that no unresolved continuing responsibility, Waiting obligation or required Verification remains unless the selected grounded Outcome itself establishes legitimate end of responsibility.

Initial outcome vocabulary should be validated against the current generic Work model before migration. Product semantics require at least the ability to distinguish resolved/fulfilled from not eligible, withdrawn, transferred and other confirmed end; do not preserve the current SUPPORT-only `COMPLETED` / `NO_ACTION_REQUIRED` constraint if it cannot express this.

No time-based auto-close.

## 7. Decision 5 — Owner, Team / Operational group and Views

### 7.1 Owner

`work_owner_operator_id` remains the explicit Human responsibility projection. Owner transfer is a command, not a side effect of another Human acting.

Persist append-preserving ownership history, provisionally `work_owner_transfers`:

- Work
- previous Owner
- new Owner
- Actor
- Time
- reason/source/provenance

The transfer record represents history of Work responsibility; it is not a new Owner/Transfer Core Object.

### 7.2 Operational group

Do not create `TeamWork`. Before schema work, validate whether existing Organization / Person / Relation / Authority structures can represent operational groups and memberships. If the current implementation has no usable group representation, add the minimum persistence needed for the existing Organization/Relation/Authority semantics rather than inventing a SUPPORT Team domain.

The model must permit:

- zero or more operational groups associated with Work for collaboration/view scope
- one explicit Human Owner for active Work
- authorized non-owner Action without Owner mutation
- group membership not automatically granting privileged Action Authority

### 7.3 Views

Derived projections:

- My Work: current Owner = current Human, plus any separately defined responsibility criteria
- Team Work: Work connected to an operational group visible to current Human
- Needs Follow-up: explainable OR of responsibility gaps/time facts, such as active Work with missing Owner, missing Next Action, Waiting without Follow-up, Follow-up reached, Due exceeded

Every returned reason should be explainable; do not persist a generic `needs_follow_up=true` flag as source of truth.

## 8. Decision 6 — Escalation

Escalation is a grounded request for Decision / Authority / Expertise / Management Attention. It is not a Work lifecycle status.

Persist it using existing Work/Decision/Relation/Authority semantics. If no current generalized record can carry the request contract, use a persistence table provisionally named `work_escalation_requests`; this remains a Work-context record, not approval of a new Core Object.

Minimum record:

- Work
- request kind (`DECISION`, `AUTHORITY`, `EXPERTISE`, `MANAGEMENT_ATTENTION`)
- reason
- target reference (typed reference compatible with Person / operational group / Authority boundary / external party)
- requesting Actor
- requested_at
- Owner snapshot/reference
- source Evidence/Context/provenance references
- current request state sufficient to link response/withdrawal without implying Work Close

Result is represented by existing Decision / Rule / Authority / Evidence / Action records and linked back to the request. Do not create `EscalationResult`.

Owner Transfer remains separate. Due/Follow-up passage does not auto-create escalation.

## 9. Decision 7 — Knowledge approval

### 9.1 Candidate

Generalize the current `knowledge_candidates` implementation. Remove assumptions of one candidate per Work and fixed `VPN_GUIDANCE` topic.

Candidate must support:

- multiple candidates from one Work
- source provenance to Work and one or more Evidence / Observation / Action / Decision references
- candidate content/title
- proposed scope
- proposer type (`HUMAN` / `AI`) and provenance
- created time

### 9.2 Human Review and approved Knowledge

Use the existing Knowledge / Review / Decision / Authority concepts. If the baseline lacks physical tables for generalized Knowledge/Review, Phase 2 may add persistence for those existing Core concepts.

Approval command:

`reviewKnowledgeCandidate(candidate, decision, scope, actor, rationale)`

must verify Human Authority for the requested scope.

Candidate approval must not:

- create or activate a Rule
- widen scope beyond the Human-approved scope
- cross tenant boundary automatically
- erase source provenance

Cross-tenant genericization is outside the first SUPPORT implementation unless a safe sanitized-copy + separate review flow is explicitly approved. Default Phase 2 behavior is tenant isolation.

Supersession/re-review must preserve prior approved Knowledge and review history.

## 10. Authorization and RLS boundary

RLS remains the hard tenant boundary. Every new tenant-owned persistence table must:

- include `tenant_id`
- use composite tenant-aware foreign keys where practical
- enable and force RLS
- use `factact.current_tenant_id()` tenant policy
- avoid runtime DELETE privileges for append-preserving records

Application authorization is responsible for semantic Authority beyond tenant isolation:

- confirm/correct current target
- act on another Owner's Work
- transfer Owner
- close Work
- escalate/request authority
- approve Knowledge for a scope
- privileged target Actions

Do not infer these permissions solely from Team membership.

## 11. Application command boundary

Phase 2 should expose explicit commands rather than generic row updates:

- `confirmCurrentWorkTarget`
- `correctCurrentWorkTarget`
- `recordWorkObservation`
- `recordAction`
- `setWaiting`
- `resumeWork`
- `setWorkDue`
- `setWorkFollowUp`
- `transferWorkOwner`
- `requestEscalation`
- `recordEscalationResponseLink`
- `closeWork`
- `createKnowledgeCandidate`
- `reviewKnowledgeCandidate`

Commands must execute in tenant-scoped transactions, lock the relevant Work/current record where concurrent changes could violate invariants, and be retry-safe/idempotent where requests may be repeated.

AI-facing writes must use the same Domain/Application commands. AI must not write authoritative tables directly.

## 12. API / UI projection contract

### Work workspace

Keep Work mounted while Context/reference panels open. The primary operator surface should expose:

- Owner
- current target + confirmation provenance
- registered candidate Fact and factual mismatch
- current eligibility / Rule uncertainty
- Next Action
- Waiting / waiting-for
- Due
- Follow-up
- escalation request(s) needing attention
- Actions / results
- meaningful History

Saving an Action must not visually imply Work Close.

### Views

Implement as queries/projections over the same Work:

- My Work
- Team Work
- Needs Follow-up

Needs Follow-up rows should return reason codes/explanations rather than a hidden boolean.

### Knowledge review

Separate Candidate from Approved Knowledge. Show source provenance, proposed scope, proposer/AI provenance, reviewer, authority scope and review result.

## 13. Human-readable History vs Technical Audit

Meaningful History entries should include:

- target confirmed/corrected
- Owner transferred
- Waiting set/resumed
- Due/Follow-up changed
- escalation requested/responded/withdrawn
- Work explicitly closed
- Knowledge candidate created and Human review outcome

Technical request IDs, retries, SQL details and low-level adapter events remain under Audit → Technical Detail.

Do not duplicate structured Action/Result/Source into free-text History fields.

## 14. Migration strategy

Do not rewrite existing migrations. Add a new forward migration after `20260911000400_support_operator_records.sql`.

Migration design should be additive first:

1. add generalized Work-context relation/observation/timing/history persistence as validated
2. relax SUPPORT constraints that enforce one Decision / one Knowledge Candidate / narrow outcome vocabularies
3. add indexes for effective target, owner views, follow-up/due projections and review queues
4. apply tenant RLS and minimum grants
5. preserve all existing SUPPORT data
6. avoid destructive backfill that fabricates facts/provenance

If existing rows lack a newly required Fact, represent it as Unknown/not set rather than synthesizing provenance.

## 15. Required test matrix

### Target / Fact

- registered Device is candidate only; no auto target
- Human target confirmation independent from Registry `VERIFIED`
- unidentified target works without fake Device/assetTag
- correction preserves old target and provenance
- mismatch displays difference without cause inference

### BYOD / Rule / Authority

- personally owned does not imply rejection
- managed BYOD and unmanaged company-owned remain representable
- missing Rule = Unknown / Decision Required
- target confirmation does not authorize privileged Action

### Responsibility / time / close

- Waiting retains Owner
- Waiting without Follow-up is valid and can appear in Needs Follow-up
- Due exceeded != status change / auto escalation / auto close
- Follow-up reached != automatic external action
- close rejected with unresolved responsibility/required Verification
- grounded unresolved close reason can end responsibility
- Action save != close

### Owner / Team

- non-owner authorized Human can act without Owner change
- formal transfer preserves previous/new Owner and Actor/time
- Team membership alone cannot perform privileged Action
- My/Team/Needs-follow-up are projections of same Work

### Escalation

- collaboration only != escalation
- Owner Transfer != escalation
- explicit escalation does not transfer Owner
- escalation response does not close Work
- escalation can link Decision/Rule/Evidence/Action result provenance

### Knowledge

- multiple candidates per Work
- AI can propose but cannot approve
- unauthorized Human cannot approve scope
- approval does not create Rule
- tenant isolation prevents cross-tenant source exposure
- supersession/re-review preserves prior Knowledge/history

### Cross-cutting

- all writes tenant isolated by RLS
- command authorization cannot be bypassed through generic repository method
- concurrent/retried commands preserve invariants
- no runtime DELETE on append-preserving history
- History is human-readable while technical Audit remains available

## 16. Proposed implementation slices

After Core Fit Validation, implement in this order:

### Slice P2-1 — Current Target + Work Observation

Decision 1 + identification portion of Decision 2. Establish Work-context facts/provenance first.

### Slice P2-2 — Responsibility Continuity

Decisions 3–4: Waiting, Due, Follow-up, explicit Close and responsibility invariants.

### Slice P2-3 — Ownership + Views

Decision 5: Owner transfer, operational-group mapping, My / Team / Needs-follow-up projections.

### Slice P2-4 — Escalation

Decision 6: explicit request contract and result provenance links.

### Slice P2-5 — Knowledge Learning Loop

Decision 7: multiple candidates, Human Review, scope/Authority, approved Knowledge/supersession.

### Slice P2-6 — UX / History / Cross-cutting validation

Workspace integration, History hierarchy, mojibake cleanup, authorization/RLS/concurrency regression and full Human Review scenarios.

Do not start later slices by duplicating concepts that an earlier slice should generalize.

## 17. Core Fit Validation gates before implementation

The following questions must be answered against the current canonical Core and code before migration is approved:

1. Can Work-scoped Current Target be persisted as the existing Relation concept without weakening Registry Relation semantics?
2. What is the minimum generalized Observation persistence that avoids SUPPORT-specific duplication?
3. Should Due/Follow-up authoritative history be modeled as Decision/Relation/Activity or a Work-context persistence record, while keeping them non-Core concepts?
4. What existing Organization/Relation/Authority representation can model Operational groups and membership?
5. Can Escalation request semantics be expressed by existing Decision/Authority/Relation/Activity records without losing the fact that a request is pending/resolved?
6. What physical Knowledge/Review/Authority persistence already exists, and what is genuinely missing?
7. Which current CHECK constraints and repository methods must be generalized without breaking JOIN behavior?
8. Can every proposed projection be derived explainably without adding lifecycle statuses such as OVERDUE / ESCALATED / NEEDS_FOLLOW_UP?

If any answer reveals a true semantic gap requiring a new Core Object, stop before implementation and return it to Product Owner as `GAP` rather than inventing the object in code.

## 18. Current gate result

**Implementation status: NOT STARTED / NOT AUTHORIZED.**

Next action:

**Run Core Fit Validation against this design and current repository. Return FIT / GAP / CONFLICT / UNKNOWN per section, then request Product Owner Implementation Approval.**
