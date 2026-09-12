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

## Decision 2 — BYOD identification, Rule and support eligibility

**Status: ACCEPTED — 2026-09-12**

### Decision

BYOD / personally owned status is a Fact about the current target. It is not itself a support eligibility decision.

FACTACT must keep the following concerns separate:

- ownership status
- management state
- target identity / identification state
- support eligibility
- authority to perform a specific Action

A personally owned Device may still be managed, and a company-owned Device may be unmanaged. The implementation must not collapse these dimensions into a single `BYOD=true/false` decision boundary.

When the target is personally owned but not yet identified as a registered Device, FACTACT records only the currently known Observation, such as OS, vendor, model, location or user statement. It must not create a fabricated Device or fake asset tag merely to satisfy the current Device schema.

Identification may progress over time from unknown physical device, to partially identified target, to identified Device, and then to managed / verified Device. Earlier Observation and provenance remain preserved when stronger identification becomes available.

Support eligibility is evaluated from applicable Contract / Rule / Authority and current facts. FACTACT must not automatically reject support merely because the target is BYOD.

If no applicable Rule or authoritative decision exists, support eligibility remains `UNKNOWN` / not yet determined. It must not silently become `NOT ELIGIBLE`. The unresolved evaluation should create or support a concrete Next Action for Human decision where needed.

The fact that a Work Target is confirmed does not by itself authorize all Actions against that target. Consequential Actions such as remote control, software installation, credential changes or security-sensitive configuration remain subject to the applicable Rule / Authority boundary.

### Product consequences

- UI may show `personal device`, `management state unknown`, `current target confirmed`, and `support eligibility pending` at the same time.
- BYOD is not a new Core Object or a new support-work type.
- Rule outcome should explain what is allowed, restricted or undecided rather than returning only a generic yes/no badge.
- Missing policy becomes visible uncertainty and a Human decision point rather than an inferred prohibition.
- Progressive Verification applies to target identification, while security / authority prerequisites for specific Actions may still block execution.

### Architecture constraints

- Do not invent `BYODDevice` or a parallel device registry.
- Do not fabricate `assetTag` or Device identity for unidentified BYOD.
- Do not encode support eligibility directly into the Work target relation.
- Preserve Observation provenance when a later Device identity is established.
- Apply Contract / Rule / Authority checks at the evaluation / Action boundary, not as an automatic consequence of ownership status.

### Required implementation follow-up

- define how unidentified target Observation is linked to the Work before a Device FK exists
- define ownership and management-state Fact representation without creating a new Core Object
- define Rule evaluation projection for allowed / restricted / unknown support actions
- add UI for personally owned / unidentified targets without forcing registry creation
- add tests proving BYOD does not imply automatic rejection and missing Rule remains Unknown

---

## Pending Product Owner decisions

1. Work Close conditions
2. Due / Follow-up semantics
3. Team boundary
4. Escalation recording contract
5. Knowledge approval authority
