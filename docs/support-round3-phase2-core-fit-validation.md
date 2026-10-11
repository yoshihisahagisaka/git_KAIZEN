# SUPPORT Human Review Round 3 — Phase 2 Core Fit Validation

Status: ACCEPTED VALIDATION RESULT — IMPLEMENTATION APPROVAL INPUT  
Date: 2026-10-09  
Baseline commit: `2eed54cd31b1c6fd12b1da2a90c618c766aa5513`  
Validation worktree: `validation/factact-support-phase2-core-fit`

## 1. Purpose and boundary

This records the read-only Core Fit Validation of the accepted Phase 2 Product
Decisions against the FACTACT implementation at the baseline commit. It does
not change Product semantics, authorize implementation, or change schema,
Application, API, UI, tests, demo data, deployment, or Production.

Decision source: `support-round3-phase2-decisions.md` (Decisions 1–7 all
accepted). Design under validation:
`support-round3-phase2-implementation-design.md`.

## 2. Baseline inspected

- Canonical: `99-ai-development-context.md`, `15-first-vertical-slice-contract-v1.md`,
  `support-round3-phase2-decisions.md`, `support-round3-core-fit-gap.md`,
  `support-round3-phase2-implementation-design.md`, and
  `assessment-connection-architecture-validation.md`.
- Schema: the platform, JOIN, SUPPORT, and SUPPORT operator-record migrations.
- Runtime baseline: SUPPORT Domain/Application ports and commands, PostgreSQL
  repositories, SUPPORT routes and UI, and golden/browser/database tests.
- The worktree was clean at validation start. No test or migration was run,
  because this validation must not change a database.

## 3. Decision 1–7 Core Fit Matrix

| Decision | Result | Existing concepts that fit | Implementation gaps |
|---|---|---|---|
| 1. Current Work Target | FIT | Work, Entity, Relation, Evidence, Observation, Audit | Work-to-Entity confirmation relation, source/evidence, correction/supersession, unidentified target, candidate search and target projection are absent. Current Person-to-Device Relation remains Registry context only. |
| 2. BYOD / identification / eligibility | FIT | Observation, Entity/Device when identified, Rule, Decision, Authority, Evidence | Separate ownership, management, identification, eligibility and Action authority records/evaluation are absent. Existing SUPPORT observation is bounded to the intake event. |
| 3. Work Close | FIT | Work, Action, Outcome, Decision, Rule, Evidence, Authority, Audit | Current `COMPLETION` atomically records an Action and closes Work. Waiting, unresolved responsibility, close rationale/provenance and explicit close guard are absent. |
| 4. Due / Follow-up | FIT | Work/Action responsibility, Rule/Decision, Evidence, Audit and clock-based projection | Due, Follow-up, basis, history, clear/unset semantics and projection inputs are absent. |
| 5. Team boundary | FIT | Owner, Operator, Service/Contract context, Relation, Authority and Audit | Operational-group mapping, service/team read scope, SUPPORT transfer command/history and multiple-group representation are absent. |
| 6. Escalation | FIT | Work, Decision, Evidence, Relation, Action, Authority and Audit | Explicit escalation request/response/follow-up history and its projections are absent. No `ESCALATED` Work status is justified. |
| 7. Knowledge approval | FIT | Work, Evidence, Observation, Action, Decision, Knowledge, Review and Authority | Current storage is one VPN-guidance Candidate per Work. Review, Approved Knowledge, scope, approval authority, supersession and separate Rule promotion are absent. |

All seven requirements have **implementation gaps**, not Semantic/Core Gaps.
No Canonical conflict was found.

## 4. View / Projection Fit

| View | Result | Required source facts / current gap |
|---|---|---|
| My Work | FIT | Work Owner and open lifecycle facts; dedicated query/UI absent. |
| Team Work | FIT | Work plus authorized operational-group scope; scope mapping/query absent. |
| Needs Follow-up | FIT | Open Work, Owner, Waiting, Next Action, Follow-up and missing-input reasons; source inputs absent. |
| Overdue | FIT | Work/Action Due and clock; due basis and projection absent. |
| Waiting | FIT | Current Work lifecycle, waiting reason/party, Owner, Next Action and Follow-up; absent. |
| Escalation attention | FIT | Explicit escalation facts, pending response and Follow-up; absent. |
| Knowledge Review Queue | FIT | Candidate, Review state, Approval authority and scope; Review/Approved state absent. |

These are projections of existing Facts. They do not justify a separate Work
type, Core Object, or mutable status such as `OVERDUE` or `ESCALATED`.

## 5. Core change decision

**Core Change Required: NO**

Phase 2 requires additive persistence, Application invariants, authorization,
queries, UI and tests for existing concepts. It must not introduce `Target`,
`BYODDevice`, `FollowUp`, `StaleWork`, `TeamWork`, `Escalation`, `Knowledge
Type`, `Support Session`, `Bridge Work`, or `Workflow Definition` as a Core
Object merely for storage or display convenience.

The Assessment boundary remains deferred. SUPPORT must retain reusable
provenance for Evidence, Observation, UNKNOWN, Decision, Relation and
Knowledge-state changes; it must not implement Assessment inheritance in this
phase.

## 6. Implementation Approval readiness

**READY WITH CONDITIONS**

Before implementation, the Phase 2 Implementation Contract must fix the
existing-concept persistence and authority contracts for: Current Target/BYOD;
continuation and close; Due/Follow-up; Team/Owner; Escalation; and Knowledge
Review. These are implementation-contract choices, not re-opening accepted
Product Decisions.

## 7. Approved minimum implementation slices

1. **Current Target / BYOD / Unknown** — target confirmation, provenance,
   correction and unidentified Observation without fake Device creation.
2. **Continuation / Waiting / explicit Close** — repeatable operational
   records, Waiting/Resume, Next Action and close guards.
3. **Responsibility / Team / management views** — Owner transfer, authorized
   scope and My/Team/Follow-up/Overdue projections.
4. **Escalation / Knowledge Review** — explicit escalation history and
   Candidate-to-Human-Review-to-Approved Knowledge boundaries.
5. **Cross-cutting UX / regression / Human Review** — History/Audit/Technical
   hierarchy, concurrency, encoding, regression and scenario A–F review.

Every slice must include positive, negative, authority, cross-tenant,
history/provenance, concurrency and no-auto-behavior tests appropriate to its
commands and projections.
