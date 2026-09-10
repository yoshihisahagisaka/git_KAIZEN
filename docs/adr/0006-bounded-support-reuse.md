# ADR 0006: Bounded SUPPORT and cross-flow Fact reuse

Status: Implemented for architecture review, 2026-09-10.

Document 19 requires the smallest guidance-only SUPPORT flow, reusing the JOIN
Fact and retaining distinct information semantics. It does not require a general
ticket engine or new Registry mutation capability.

Use the existing `requirement_evaluations`, `work`, `actions` and `evidence` tables.
Add `support_events` as the concrete inquiry source. A shared evaluation/Work has
exactly one source kind: existing JOIN or SUPPORT. Composite foreign keys retain
tenant, source evaluation, service, contract and recipient continuity. JOIN
repository entry points filter the CHANGE lane so SUPPORT Work cannot accidentally
enter JOIN commands or JOIN-specific projections.

An optional bounded `support` Contract Profile configuration explicitly enables
the slice and supplies execution roles. Absence denies commands; ADMIN is not an
override. Active Operator/Tenant and active effective Service/Contract are checked
on each command. The new scope is included in fresh demo seeds only; the migration
does not rewrite existing versioned Contract Profiles.

Human triage records REQUIRED or NOT_APPLICABLE with reason, actor and a pinned
Contract/version snapshot. Event creation records a caller Observation but no
Work. REQUIRED creates one owned INCIDENT Work in the SUPPORT lane. Unknowns
remain distinct from caller reports, diagnostic evidence and scoped Decisions.

The bounded execution command atomically records diagnostic Evidence, the human
Decision, and completed investigation/guidance Action plus audit. It grants no
Registry-write operation. A request to record a reality-changing mode is rejected.
Reality changes continue to require the existing verified Change boundary; that
capability is not added to SUPPORT here. Guidance completion means the service
response was performed, not that a technical fault was proven fixed.

Knowledge is an immutable candidate linked to source Work, Decision and Evidence.
Later inquiries in the same tenant/service surface it as unapproved reference
material. There is no Rule promotion, CMS, learning automation or AI.

SUPPORT context reads the existing current Person–Device Relation, Device and
source Change in a repeatable-read tenant transaction. No SUPPORT device field,
copied device value or separate authoritative Fact store is introduced. Existing
and new inquiries see a later committed replacement; Relation history is retained.

Request-key locking protects intake retries. Event/Work row locks and uniqueness
protect triage, resolution, candidate creation and completion. Conflicting retry
payloads are rejected rather than silently rewriting evidence. Transactions include
audit; failure rolls back the entire command. New tables use forced RLS, explicit
grants and composite tenant keys, retaining the shared session/Origin/CSRF boundary.
