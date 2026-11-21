# FACTACT | SCOPED Registry first-edit technical contract candidate (2026-11-09)

Status: **Implementation-contract candidate / decision gate — NOT authorized for DDL, code, Grant issuance, UI release or production.** Continues Draft PR #47's verified Fit/Gap; does not replace Canonical or ADR 0005.

## 1. Accepted constraints (do not redecide)

- Authorized customer/vendor Actor must be able to edit permitted Registry information in the initial release; Actor/Caller/beneficiary remain distinct. Same-Tenant ServiceRecipients A and B must be isolated even for ID probing, pending queues and error text.
- Human interaction is **edit → 「保存」**. In the backend, a proposal cannot mutate the authoritative Registry before Verify and Commit; recording, verification and Commit must be auditable and transactionally consistent. Pending ≠ saved.
- A small operations template is accepted: **change category × operator level → `不可 / 申請 / 確定`**, plus an authorized review queue. Operator levels (`新人 / 一般 / 責任者`) are management labels, never implicit grants. The example cell values from the discussion are **not** live permission defaults.
- A routine Registry correction does not require the user to create a fictitious Work. Link an existing Work only when it genuinely explains the change. Preserve Fact vs. Statement and previous value/provenance.
- Exact `REGISTRY UPDATE / REVIEW / APPROVE` Grants, active Contract/Recipient, actor status, scope and revocation checks remain authoritative. No automatic self-approval, fallback approver or cross-customer read is presumed.

## 2. Gate 1 — narrow first subject (RECOMMENDED; approval pending)

First vertical slice: **an existing Person's `display_name` correction** with `change_type=KNOWLEDGE_STATE_CHANGE`; do not treat this correction as evidence of a physical-world change or as independent legal-identity verification.

Included: read authorized current name, submit a replacement text and a short reason, record expected prior value/revision, propose, review and commit, display actual result, history and safe stale/denial responses. No empty/unchanged name commits.

Excluded from this slice: Person creation, Organization reassignment, `lifecycle_status`, email, duplicate merge, identity proof, contract changes, bulk updates and implicit updates from SUPPORT observations. These remain separate initial-release capability gaps where already required; this first vertical slice **must not be used to silently narrow** the approved initial-release scope.

## 3. Gate 2 — honest standalone source (RECOMMENDED additive approach; approval pending)

### Current physical blocker, verified

`factact.changes` requires both `work_id` and `action_id` (`NOT NULL`, action/work FK); its check constraints admit only `REALITY_CHANGE` / `PRIMARY_DEVICE_ASSIGNMENT`. `factact.actions` admits `ASSIGN_DEVICE` or `INVESTIGATE_GUIDE` and also requires Work. These are **JOIN/SUPPORT-specific physical contracts**, not a general Registry change implementation. `factact.people` has only `updated_at` runtime UPDATE privilege for locking.

### Candidate mapping

1. The **real user save/request** is the source event: a narrowly typed `REGISTRY_EDIT_REQUEST`, with authenticated Actor, resolved Tenant/Service/Contract/Recipient, target Person, reason, original/desired value, expected revision and optional trustworthy evidence reference. It is **not** an invented execution Action or fabricated SUPPORT Work.
2. Reuse **one Canonical Change lifecycle**. Prefer a backward-compatible additive extension to `factact.changes` allowing a **real Registry source request in place of mandatory JOIN Work/Action**. Enforce exactly one provenance path: existing JOIN `(work_id, action_id)` **or** standalone Registry request source. Existing JOIN FK, unique indexes, Action semantics and Golden tests remain intact. A real Work may be referenced as supporting context when present; never infer authority from it.
3. Permit only the separately reviewed Registry `KNOWLEDGE_STATE_CHANGE` / `PERSON_DISPLAY_NAME_CORRECTION` shape in the new path; do not open arbitrary JSON field updates. Record immutable before/after, revision and source; add authenticated proposer, verifier and committer/time provenance where existing Change columns do not suffice.
4. An authorized, version-matching Commit updates exactly one `people.display_name` and its revision/history, marks Change COMMITTED and appends Audit **in one transaction**. Rejected/stale proposals remain traceable; no in-place rewriting of immutable proposed effects. Retry of the same committed request is idempotent.

**Alternative to evaluate at migration review:** a Registry-specific persistence subtype implementing the same conceptual Change lifecycle, if extending the JOIN table would weaken enforced invariants. A separate ungoverned mutation path that merely updates `people` and logs after the fact is **not** acceptable. Decide physical shape only after DDL/rollback and negative-test review.

## 4. Gate 3 — operator level / Grant / reviewer mapping (DECISION REQUIRED)

| Human setting | Minimum backend meaning | Non-negotiable boundary |
| --- | --- | --- |
| `不可` | No edit/proposal permitted by that policy | A display level never overrides missing exact Grant; user must not reach a write path. |
| `申請` | Eligible Actor may submit a PROPOSED Change | Requires target-specific `REGISTRY UPDATE`; no authoritative name update yet. |
| `確定` | User may request immediate completion in one UI action | Must also satisfy an **approved** Review/Approve and evidence policy with actual `REGISTRY REVIEW/APPROVE` Grants. The label is not an auto-approval permission. |
| Pending review | Show to a genuinely authorized reviewer; confirm or return | Reviewer/approver must be authorized for the **same target** when acting, not just at queue creation. No qualifying reviewer → pending/assignment-needed, never automatic success. |

**Smallest conservative initial authority candidate:** `UPDATE` proposer; a distinct authorized reviewer may exercise `REVIEW` and `APPROVE` in one visible 「確認して確定」 action after independently verifying evidence. This yields **two human actors**, not three user clicks, while respecting explicit internal Verify → Commit. Whether immediate same-Actor verification/approval is permitted for a low-risk category is a **separate policy decision** and is **not** granted by this candidate. If no such exception is approved, even an operator-level `確定` display must **not** bypass dual control.

Exact defaults for categories, assignment of operator levels, delegation/scope, the policy storage/version, selection of reviewer and self-review exception are **not yet decided**. Reuse existing scoped Grant issuance/revocation/authorization; do not make a second implicit role-based authorization engine. The management UI template may be staged behind a separate gate, but a hard-coded role-to-Grant mapping cannot substitute for it.

## 5. Backend boundary and fail-closed checks

1. Server resolves authenticated Actor, current Person/Organization, active Service/Contract/Recipient and exact Grant **without trusting IDs/affiliation submitted by the browser**.
2. A Registry write adopts the existing actor-keyed authority lock protocol for concurrent Grant revocation, then target/revision locks in a documented order. Recheck before every final transition. A reviewer revocation before Commit blocks Commit.
3. Return `保存済み` only after COMMITTED. Return `確認待ち` for a recorded proposal. Use non-revealing denial for unauthorized Person, stale conflict for authorized concurrent modification, and no cross-recipient counts/details in pending queues.
4. Immutable source, before/after, verifier and committer, rule version and audited decision make the result explainable. No unverified Caller Statement becomes a Fact solely because it was submitted.

## 6. Acceptance cases before privileged write implementation

| Case | Expected assertion |
| --- | --- |
| Authorized Person correction | Proposal does not alter `people`; Verify leaves it unchanged; Commit updates exactly the intended row with traceable original and new values. |
| One-action human UX | `保存` returns pending or committed truthfully; reviewer confirms with one human action, but backend Verify and Commit are both proven. |
| No fake Work | Standalone correction has a genuine source request and valid Change lineage without making a SUPPORT/JOIN Work; real optional Work is linked only if true. |
| Exact Grant | `UPDATE` only cannot self-review/commit; `REVIEW` only cannot propose/approve; revoked/expired/target-mismatch Grants fail closed. |
| Tenant/Recipient separation | Same-Tenant A/B, same Service, forged ID, inactive recipient/contract, Caller mismatch, cross-Tenant and legacy role-only all deny reads/writes/existence of B. |
| Concurrency | Version mismatch, two competing proposals, revocation race and repeated request cannot produce lost updates or inconsistent Audit. |
| Policy/queue | `不可`, `申請`, `確定` never exceed exact Grant; reviewer without target scope does not see pending item, absent reviewer remains safely pending. |
| Regression | JOIN golden Change/Action flow, existing SUPPORT scoped writes, Registry read and Chromium cases remain passing. |

## 7. Next bounded actions and STOP

1. Review and decide **only** the three gates above, using current Canonical and a migration/rollback-focused DDL review. The recommended first subject and source mapping are engineering proposals; the operational principles in §1 are already accepted.
2. After that decision, open a **separate implementation Draft PR** stacked on the verified Registry read baseline, beginning with typed domain contracts, source/change persistence and denial/regression tests. Follow with authorized API and one-action UI; add level/category management and review queue without inventing an extra security system.
3. Do not issue production Grants, deploy, merge or write to actual customer Registry before independent security/acceptance gates pass.

**Current verdict:** **Implementation-contract candidate ready for review; DDL/API/privileged Registry mutation NO-GO pending the three bounded decisions.**
