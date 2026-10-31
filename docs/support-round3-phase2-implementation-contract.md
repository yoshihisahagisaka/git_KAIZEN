# SUPPORT Human Review Round 3 — Phase 2 Implementation Contract

Status: DRAFT FOR IMPLEMENTATION APPROVAL
Depends on: accepted `support-round3-phase2-decisions.md`, accepted
`support-round3-phase2-core-fit-validation.md`, and
`support-round3-phase2-implementation-design.md`
Baseline: `2eed54cd31b1c6fd12b1da2a90c618c766aa5513`

## 1. Purpose, precedence and non-goals

This contract turns the accepted Product semantics into implementation-boundary
rules. It fixes how existing FACTACT concepts are persisted and operated; it
does not introduce new Product semantics or Core Objects. If it conflicts with
the Product Decisions or the Fact First canonical documents, those documents
win and implementation stops for reconciliation.

Non-goals: Assessment integration, external evidence ingestion, notification
automation, SLA engine, automatic Close/Transfer/Escalation, generic workflow
or work graph UI, and any change outside FACTACT.

Every write is tenant-scoped, subject to existing active Contract and Authority
checks, runs in one transaction with its Audit Event, and preserves history.
RLS is a mandatory database boundary; Application authorization does not
replace it.

## 2. Shared invariants

- Event does not automatically create Work. Action does not prove a Change.
  Work Close does not mutate Registry state.
- UNKNOWN, Observation, Hypothesis, Decision, Rule and Fact remain distinct.
- Actor performing an Action may differ from Work Owner. Waiting never removes
  Owner responsibility.
- Every mutable current value has append-preserving history: actor, time,
  old/new values, reason and applicable source/provenance.
- AI may propose or summarize. It cannot confirm a target, close Work, transfer
  ownership, approve/publish Knowledge, promote a Rule, grant Authority, or
  commit a Change.
- Existing V1/V2 records retain their original meaning. No target backfill,
  inferred completion, or rewrite of historical evidence is allowed.

## 3. Contract 1 — Current Work Target

### Persistence and semantics

The Current Work Target is an additive, time-scoped **Relation** from a Work to
an Entity. It is not `factact.relations`' existing Registry
`Person USES_PRIMARY_DEVICE Device` row and it is not sourced from a Change.
The implementation may use a dedicated additive persistence table to realize
the existing Relation concept because the current table's FK/check constraints
are JOIN-specific. Such a table is not a new Target Core Object.

Each target-relation version records tenant, Work, target entity type and ID
when identified, lifecycle/effective time, confirmation actor/time, source
type/reference, optional Evidence reference, and correction/supersession link.
At most one effective confirmed target exists for a Work. Correction appends a
replacement version and ends/supersedes the prior effective version; it never
overwrites it.

Candidate targets are read-only Registry context or search results. They have
no Work target effect until an authorized Human confirms one. Registry device,
registered user and Work target are displayed separately; mismatch is a fact
difference, never an inferred cause.

Unidentified target is a valid state: record a Work-linked Observation with
known attributes, source and time, while target Entity ID remains null. Never
create a fake Device, asset tag, Change or Registry Relation.

### Commands, authorization and API/UI mapping

`ConfirmCurrentWorkTarget`, `RecordUnidentifiedTargetObservation`, and
`CorrectCurrentWorkTarget` require active SUPPORT Contract execution authority.
Correction also requires a non-empty reason and stale-version protection.
Commands emit target-specific Audit Events atomically. Queries return candidate
context, current/historical target relations, evidence/provenance and UNKNOWN.

The operator workspace MAIN shows the handled device/unknown and next action;
CONTEXT shows registered device, source, confirmation and mismatch. The UI
does not expose database Relation terminology.

## 4. Contract 2 — BYOD, identification and eligibility

Ownership, management state, identification state, support eligibility and
Action Authority are independent facts/evaluations. A target may be personally
owned, management-unknown, confirmed for this Work and eligibility-pending at
the same time. `BYOD` never implies `NOT_ELIGIBLE`.

Ownership/management/identification evidence is stored as Work-target context
using Observation/Evidence and, only once genuinely identified, Entity facts.
Eligibility is an Evaluation/Decision derived from Contract Rule and current
facts, with the applicable Rule/Decision snapshot and actor/time. Missing Rule
produces UNKNOWN and a Human next action, not a negative result. Consequential
Action authorization is separately evaluated from Rule/Authority/Context.

Commands cannot create a Device merely to complete a form. Queries expose
these axes separately. Tests must cover BYOD allowed, BYOD restricted by an
actual Rule, missing Rule as UNKNOWN, unidentified target, provenance and
cross-tenant rejection.

## 5. Contract 3 — Continuation, Waiting, Resume and Close

### Operational record and Action

Operational records document what was observed, attempted and learned; they
are not Knowledge and do not by themselves Close Work. Each actual Action is
append-only, has actor/time/idempotency identity and may link Evidence and
result. A correction preserves its original record and adds a correction
record; it is not another Action execution.

### Lifecycle

Work remains open/in progress until an explicit authorized `CloseWork` command
passes its guard. `SetWaiting` records waiting party/reason, current Owner,
Next Action and optional Follow-up. `ResumeWork` appends the resumption fact;
it does not erase Waiting history. Owner remains non-null while Waiting.

`CloseWork` stores outcome, close reason, deciding actor/time and references to
the Decision/Rule/Evidence supporting responsibility termination. It rejects
unresolved required Next Action, active Waiting, required-but-unverified
verification, unauthorized actor and stale concurrent state. A non-resolved
outcome is allowed only when the recorded Human decision proves that the
remaining responsibility ended or was formally transferred. Time passage,
silence, another Work, a completed Action, or an escalation never auto-close
the Work.

The existing `COMPLETION -> Work COMPLETED` behavior is retired only by an
explicit additive migration and compatibility mapping; historical V1/V2
completion stays historical. Every lifecycle command shares a transaction with
the Work update and Audit Event.

## 6. Contract 4 — Due and Follow-up

Due is a required-by boundary for a Work or a responsibility-bearing Action.
Follow-up is the next Human review/restart time for an open Work. Verification
timing is a separate Change/verification concern. The persisted time record
contains subject (Work or Action), kind, value with timezone, basis/source
(Contract/Rule/Decision/commitment), actor/time, optional clear reason and
append-only replacement/supersession history.

Clearing is explicit; absent Due/Follow-up remains UNKNOWN/unset and must not
be synthesized. Waiting can have an unset Follow-up, but that is an explicit
Needs-follow-up reason. No time record may cause automatic Close, Transfer or
Escalation.

`Overdue` and `Needs-follow-up` are read-time projections, not stored Work
status. Their clock comes from injected/query-time UTC clock; display is
localized only after calculation. Queries return the reason and source facts,
including missing Follow-up, rather than a bare badge.

## 7. Contract 5 — Team, Owner and Authority

Work has exactly one active Human Owner. Operational group/Team participation
is an existing Organization/Person/Relation/Service-context mapping with
effective history; it is not ownership and can include multiple groups or a
vendor participant. Team membership grants neither read scope nor Action
Authority by itself.

Read scope is derived from active tenant, service/contract context and explicit
authorized group mapping. Action authorization is evaluated through applicable
Contract Rule/Authority. An authorized Action Actor may act on another Owner's
Work without changing Owner.

`TransferWorkOwner` is the sole ownership change operation. It checks the
target active operator and transfer authority, records old/new Owner, reason,
actor/time, source and Audit Event atomically, and rejects stale state. Vendor
actions remain attributed to their actor/context while enterprise Owner remains
responsible unless formal transfer records otherwise.

## 8. Contract 6 — Escalation

Escalation is an append-preserving Fact implemented through existing
Decision/Evidence/Relation/Action/Audit concepts, with additive persistence as
needed for their links. It records Work, reason, requested Decision/Authority/
Expertise/Management Attention, target, requesting actor/time, current Owner,
source/context/Evidence, response/result, related Decision/Authority/Evidence/
Recommendation/Action, Follow-up and supersession history.

`RecordEscalation` requires authorized Human action and does not transfer Owner
or change Work status. A response is appended by `RecordEscalationResponse`;
it does not itself close Work. Waiting, Team change, Owner Transfer, Due or
Follow-up exceedance and Related Work creation cannot generate an escalation
automatically. Escalation Attention projects explicit outstanding escalation
facts only.

## 9. Contract 7 — Knowledge Candidate, Review and Approved Knowledge

Work Record != Knowledge; Knowledge Candidate != Approved Knowledge; Approved
Knowledge != Rule.

A Candidate stores tenant scope, source Work and selected source Evidence,
Observation, Action and/or Decision, content, proposed scope/conditions,
proposer/time and AI provenance when AI assisted. Source links preserve the
original record even after correction. Candidate creation is explicit and does
not publish it.

Review is an append-preserving Human Review record with reviewer, required
approval authority, outcome, reason, sensitive-information assessment, scope
and time. Approval creates/version-links Approved Knowledge only after the
configured Human authority check. Rejection, contradiction and supersession
are history, not destructive edits. Tenant scope is default; cross-tenant
reuse requires an explicit future authority contract and is not implied.

Rule promotion is a separate Human Decision/Authority command using Approved
Knowledge as optional evidence. Neither Candidate nor Approved Knowledge may
automatically create or change a Rule. AI cannot approve, publish or promote.

## 10. Projection Contract

| Projection | Source facts and condition | Authority filter | Clock / empty or UNKNOWN |
|---|---|---|---|
| My Work | active Work whose active Owner is viewer | tenant + viewer owner identity | no clock; empty means no matching Work |
| Team Work | active Work in authorized service/group scope | tenant + explicit read scope | no clock; group absent is not tenant-wide scope |
| Needs Follow-up | active Work with follow-up due or Waiting without follow-up/next action | same read scope as Work | injected UTC clock; explain which condition, preserve unset as UNKNOWN |
| Overdue | active Work/Action with Due before clock | same read scope as Work/Action | injected UTC clock; no Due means not overdue, not a fabricated deadline |
| Waiting | active Work with current Waiting fact | same read scope as Work | no clock; show waiting party/reason/Owner/follow-up or unset |
| Escalation attention | explicit unanswered escalation needing response/follow-up | Work scope plus escalation authority | injected UTC clock only for follow-up due; no auto-escalation |
| Knowledge Review Queue | Candidate requiring review or review outcome awaiting authorized approval | tenant + review authority + candidate scope | no clock unless a separately sourced review deadline exists |

Queries return business language and Main/Context data: MAIN is current Work,
next action and decision; CONTEXT is known facts, UNKNOWN, Rule/Authority,
Evidence and History. Raw Core/table names are not operator UI labels.

## 11. Implementation mapping and mandatory tests

### Schema

Use existing `work`, `actions`, `evidence`, `audit_events`, Contract/Operator
tables and RLS model. Add only tables/columns/indexes/FKs needed to persist the
existing Relations, Observations, lifecycle facts, time records, group scope,
escalation links and Knowledge Review/version history. Every new tenant-bearing
row receives tenant RLS and least-privilege grants; cross-tenant composite FKs
are required where linked rows are tenant-scoped. No broad future-table grant
or DELETE privilege is introduced.

### Domain/Application/API/UI

Commands named above are responsibility names, not mandated HTTP paths. Each
API command uses exact Origin/CSRF/session protection, request id/idempotency
where it creates a record, expected revision/current-version conflict handling,
and business error codes for authorization, stale state, unmet close guard and
invalid transitions. Read endpoints apply scope before projection. UI keeps
MAIN/CONTEXT separation and never hides UNKNOWN by substituting a default.

### Tests

Each contract needs positive and negative tests; authority and cross-tenant
tests; provenance/history and correction/supersession tests; concurrent retry
and stale-write tests; and explicit no-auto tests. Required scenarios include
registered/other/BYOD/unidentified targets, unresolved continuation, waiting
without follow-up, due/follow-up boundaries, actor-not-owner, formal transfer,
explicit escalation, Candidate review/approval, AI prohibition and Rule
promotion separation. Existing JOIN GT-01–12 and SUPPORT tests remain passing
regression requirements; safety assertions may not be removed to pass tests.

## 12. Slice order and approval conditions

The validation order remains minimal and unchanged:

1. Current Target / BYOD / Unknown.
2. Continuation / Waiting / explicit Close.
3. Responsibility / Team / management views.
4. Escalation / Knowledge Review.
5. Cross-cutting UX / regression / Human Review.

Slice 3 depends on Slice 2's reliable owner/lifecycle/time facts. Slice 4
depends on the same evidence/history boundary but does not require Assessment
integration. This is a technical dependency only and does not alter accepted
Product semantics.

Implementation Approval is **READY WITH CONDITIONS**: approve this contract's
additive persistence/authority choices before writing migration or application
code. Any requirement that cannot be represented by the listed existing
concepts stops implementation and returns for Product Decision; it must not be
filled by a new Core Object.
