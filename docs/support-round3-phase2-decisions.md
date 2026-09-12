# SUPPORT Human Review Round 3 — Phase 2 Product Decisions

Status: IN PROGRESS  
Branch: `review/factact-join-slice`  
Started: 2026-09-12  
Depends on: `support-round3-core-fit-gap.md`, `17-factact-ux-translation-layer.md`, `18-operator-work-context-v1.md`

## Purpose

This document records Product Owner decisions that resolve the open Product / Architecture gates identified in SUPPORT Human Review Round 3 Phase 1.

These decisions refine existing FACTACT Core concepts. They do not authorize a new Core Object unless explicitly stated. Implementation follows only after the relevant decision is accepted and translated into migration / Application / UI / test changes.

---

## Decision 1 — Current Work Target confirmation and evidence boundary

**Status: ACCEPTED — 2026-09-12**

### Decision

Current Work Target is not a copy of an existing Registry Fact. It is a time-scoped relation between the current Work and the Entity being handled in that Work.

A Known Fact may be presented as a candidate, but it must not be automatically applied as the Current Work Target. A Human must explicitly confirm that the Entity applies to the current Work before the target relation becomes effective.

For the first SUPPORT implementation, Device is the primary target Entity. The design must remain compatible with other target Entity types such as Person, Account and Application without introducing a new Target Core Object.

The minimum record for an effective Current Work Target is:

- target Entity
- confirming Actor
- confirmation time
- Source / provenance

Evidence may additionally be linked when available or required by Rule / Authority.

Human confirmation that an Entity is the current Work target is distinct from Registry-level `VERIFIED` state. User self-report or operator confirmation may be sufficient to establish the current operational target without promoting the underlying Registry Fact to `VERIFIED`.

The initial SUPPORT target choices remain:

- registered PC
- another company-issued PC
- BYOD / personally owned PC
- unidentified PC

Unidentified is a valid current fact. FACTACT must preserve the known Observation and must not fabricate a Device or fake asset tag merely to satisfy a foreign key.

A later correction of the target must preserve the earlier target confirmation and its provenance. The current effective target may change, but previous target facts are not overwritten or deleted.

A mismatch between registered Device and Current Work Target is displayed as a fact difference only. FACTACT must not infer the cause of the mismatch.

### Product consequences

- Registered `USES_PRIMARY_DEVICE` and Current Work Target are semantically different relations even when they reference the same Device.
- Registered Device is shown as context/candidate and is not preselected as the current target.
- Target confirmation and Situation Triage remain separate UX responsibilities.
- Strong verification is not a universal prerequisite for SUPPORT target confirmation; the required evidence strength may be raised by Rule / Authority for a specific service or action.
- Do not introduce a numeric confidence score merely to rank evidence. Preserve Source, Actor, Time, Context and linked Evidence instead.

### Architecture constraints

- Do not reuse the existing Person → Device `USES_PRIMARY_DEVICE` row as a Work target.
- Do not create a fake Change only to satisfy the existing Relation implementation.
- Do not introduce a new `Target` Core Object.
- The Phase 2 data design must provide lifecycle/history semantics for the Work → Entity relation and keep correction append-preserving.

### Required implementation follow-up

- decide persisted relation/table representation for Work → Entity target association
- define source/provenance vocabulary and Evidence links
- define correction / supersession semantics
- add Device candidate/search and explicit Human confirm UI
- add mismatch projection without cause inference
- add tests for no-auto-application, unknown target, correction history and provenance retention

---

## Pending Product Owner decisions

1. BYOD identification / Rule / support eligibility
2. Work Close conditions
3. Due / Follow-up semantics
4. Team boundary
5. Escalation recording contract
6. Knowledge approval authority
