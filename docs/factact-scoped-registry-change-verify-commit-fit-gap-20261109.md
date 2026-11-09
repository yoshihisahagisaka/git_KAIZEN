# FACTACT | External Actor Registry Change → Verify → Commit Fit/Gap (2026-11-09)

Status: **Read-only technical Fit/Gap and implementation gate. No new Business Decision, database migration, API, UI, production change, or Grant issued.**

## Baseline and accepted invariants

- Parent: Draft PR #46 (`feat/factact-scoped-registry-context-ui-20261109`, remote HEAD `2c4f6aa7b10d5820c06a63b5468260f3a37e864d`; 35 Unit / 244 DB / 31 Chromium PASS). It gives a SCOPED Actor authorized, **read-only** Organization Person context. API PR #45 remains its dependency.
- Existing Canonical: `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` (initial-release authorized external editing, same-Tenant customer isolation), `docs/02-domain-model.md` (Action vs. Change, Fact First / One Fact Multiple Views), `docs/adr/0005-change-lifecycle.md`, `docs/15-first-vertical-slice-contract-v1.md`, and `docs/factact-scoped-support-authority-commit-lock-20261107.md`.
- Carry forward, **without redecision**: Caller ≠ Actor ≠ beneficiary; Tenant ≠ customer; Service/Contract/Recipient and explicit object/operation Grant are separately checked; Registry has no direct UPDATE from a Work status or unverified observation. A proposal alone never changes authoritative state. Evidence, before/after, verifier, committed state and Audit must remain explainable. No unauthorized B data, including existence, on read, direct-ID, update or error.
- The initial release must include permitted customer/vendor Actor **Registry editing**, not merely a read-only customer portal. This is an implementation-completion scope, not authorization to release.

## Exact current Git/DDL Fit/Gap

| Target | Fit verified in code | Gap before external Registry mutation |
| --- | --- | --- |
| Actor and Grant | `scoped-access.ts` already models independent `REGISTRY` and operations `READ/CREATE/UPDATE/REVIEW/APPROVE`, with scope/expiry/current-object validation. `scoped_actor_grants` persisted, RLS and runtime SELECT-only. | Permission vocabulary is **not** a Registry mutation command, and approval roles/operation mapping are not yet bound to a Change lifecycle. No existing route accepts this external mutation. |
| Organization/Person ownership | `PgScopedAccessReader.registryPeople` checks active Organization ServiceRecipient and explicit `REGISTRY READ` in one tenant read snapshot. UI resolves current SUPPORT Work beneficiary separately from Caller. | Mutating a particular Person must independently resolve its Organization and current Service/Contract/Recipient, and recheck scope **inside the same write transaction**. Browser-supplied Person/Organization/Work association cannot be trusted. |
| Existing Change domain | `JoinCommands.startAssignDeviceAction → verifyChange → commitChange`, `RejectChange`, old Relation preservation, evidence and Audit are Golden-tested. | `packages/domain/src/join.ts` types Change Effect as **Person→Device**; JOIN commands use internal Role and `contract.deviceAssignment` rules. They cannot be reused as a generic Person/Organization edit command by merely adding a route. |
| Existing Change DDL | `20260909000200_join_slice.sql` has durable `actions`, `changes`, `evidence`, `change_evidence`; verified/committed transitions and foreign keys. | `actions.action_type` only `ASSIGN_DEVICE`; `changes.change_type` only `REALITY_CHANGE`, `change_kind` only `PRIMARY_DEVICE_ASSIGNMENT`, `subject_type` only `PERSON`; current `proposed_effect_json` assumes a device relation. An ordinary Person name/status/Organization edit cannot currently be inserted as a valid Change. |
| Registry storage/permissions | `people` has `organization_id`, `display_name`, optional `email`, `lifecycle_status`, `updated_at`; `organizations` has name/status. Tenant RLS and explicit grants protect tables. | Runtime has no column UPDATE privilege for Person name/status/organization or Organization name/status (only `people.updated_at` is update-granted for row locking). No dedicated immutable Registry field-history/revision contract for Commit and stale detection. |
| Caller onboarding | Service-first SUPPORT intake can create Caller Organization/Person with separate UNVERIFIED source observation. | Creation of an unverified Caller record is not proof of an authenticated Actor's authority to **modify existing verified Registry fields**; it cannot be reused as a privileged update shortcut. |
| Grant revocation serialization | Scoped SUPPORT writes and Grant/status changes serialize with actor-keyed advisory lock (migration `20261107000400_scoped_authority_commit_lock.sql`). | Any new Registry write must use the same authority lock protocol before target locks and before final authorization/Commit, plus stale version and audit checks. Existing SUPPORT-only write helper must not be reused without examining its Work-specific semantics. |

## Smallest proposed next implementation slice — NOT YET APPROVED

Suggested initial vertical case: **correct an existing Person's `display_name` as a `KNOWLEDGE_STATE_CHANGE`**, with no Organization transfer, lifecycle/status change, email, self-service identity proof, or auto-merge. This minimizes business impact while exercising the complete verified Registry mutation contract. Other fields and standalone management-table editing remain initial-release gaps until individually supported.

Any implementation must meet these acceptance boundaries:

1. **Source and target**: link proposal to a real Source Work/Action (or an explicitly approved equivalent allowed by Core); resolve target Person's current Organization to a verified ServiceRecipient. If the Person and Source Work's beneficiary are different, never infer permission from Caller affiliation. No synthetic Action that falsely attests real-world execution.
2. **Propose**: only explicit current `REGISTRY UPDATE` actor for target may propose. Record immutable before/proposed-after, knowledge-vs-reality meaning, source, evidence reference, expected revision and actor in a tenant write transaction. Do not touch `people.display_name` here.
3. **Verify and Commit**: check independent explicit `REGISTRY REVIEW` / `REGISTRY APPROVE` as applicable under the **approved contract**, effective Service/Contract and reviewer restrictions (including self-review policy). Recheck the same target and current version after locking before Commit. Reject stale proposals rather than silently rebasing.
4. **Atomic Commit**: update the authoritative Registry row only after verified Change; append before/after provenance, Change status, verifier, Commit actor/time and Audit together; all rollback together on failure. Preserve earlier state and audit; a retry of the same committed proposal is idempotent.
5. **Revocation/concurrency**: verify actor lock, scope and target at the final write boundary; a revoked Grant or disabled Actor must stop proposal/verify/commit. A competing correction must produce a deterministic stale conflict, not last-write-wins.
6. **External isolation**: SCOPED Actor with legacy ADMIN/OPERATOR/REVIEWER but no exact Grant must never mutate; A/B in same Tenant + Service must not leak reads/errors/updates. Existing `/api/changes` internal endpoints must remain forbidden.
7. **UX**: show exact current value, proposed value, pending review, verified and committed status. Hide unavailable actions, show existing Work/Change reason and safe conflict/reload text. This will be specified at code/wording level before Work implementation. Do not add a second generic Registry screen merely for the sake of navigation.

## Targeted implementation gates requiring explicit contract (not an invitation to redesign Core)

1. **First edit target and meaning**: Is `Person.display_name` correction the initial concrete Registry Edit target? Other `Person.lifecycle_status`, `organization_id` and Organization fields require distinct reality/knowledge and customer-impact handling. Existing Canonical names the general capability but does not select a first field.
2. **Source Work contract**: May the initial correction be restricted to an actual, authorized Work, with a later dedicated management-table edit Work path? The present SUPPORT Work can have a Caller from A and beneficiary B, so an arbitrary Person cannot be implicitly attached. There is no complete standalone SCOPED Registry Change Work creation contract in Git.
3. **Review/Commit Authority**: The generic grant operations exist, but no agreed field-level mapping from `REGISTRY UPDATE / REVIEW / APPROVE` to proposer, verifier and committer or self-review/dual-control exceptions has been found. `deviceAssignment.reviewRoles` and `allowSelfReview` are device-specific and not safe defaults for Registry edits.

These are **narrow missing implementation contracts**; the existing Actor Neutrality, Change semantics, customer separation and initial-release target remain decided. Do not migrate DDL or expose an externally writable route until resolved. Changes to generic Change DDL require an isolated migration and migration rollback/negative-test review.

## First acceptance-test matrix after the gates close

| Flow | Required proof |
| --- | --- |
| A authorized full path | Proposed Change leaves Person unchanged → Verify leaves unchanged → Commit updates exactly one Person and audits before/after; immutable evidence and source link. |
| A UPDATE only | Can propose under granted scope; cannot self-grant REVIEW/APPROVE or commit through alternate endpoints. |
| B / forged target | B person ID, mismatched Work beneficiary, revoked recipient, inactive contract, Caller-submitted organization, cross-Tenant and Role-only actor all fail closed without revealing a target. |
| Stale/revoked | Concurrent proposals on same Person, changed row between Verify and Commit, revoke before Commit, revoked Actor, repeat idempotency, and audit/Registry rollback on failed transaction. |
| Existing features | JOIN device assignment Change/Verify/Commit Golden, SUPPORT scoped response/correction, REGISTRY read and full Chromium regression remain PASS. |

**Checkpoint decision:** Fit/Gap only. Existing PC-assignment Change flow cannot simply be presented as a ready-made general Registry Edit engine. Next implementation remains gated by the three bounded contracts above. **Production / merge / new privileged Grant No-Go.**
