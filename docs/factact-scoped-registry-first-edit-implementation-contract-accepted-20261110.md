# FACTACT | SCOPED Registry First Edit — Accepted Implementation Contract (2026-11-10)

Status: **ACCEPTED IMPLEMENTATION CONTRACT — Product Owner approval 2026-11-10. Docs-only decision record.** This authorizes bounded development in a separate Draft PR, not main merge, production migration/deployment, real customer data mutation, real Grant issuance/revocation or activation of new privileged access.

## Authority and precedence

- Decision source: Product Owner approved the three specific implementation gates presented in FACTACT development governance on 2026-11-10.
- Preceding candidate: `docs/factact-scoped-registry-first-edit-contract-candidate-20261109.md` (PR #47). Its recommendations below are now approved **only within the explicit boundaries of this contract**; remaining choices remain proposed.
- Required Canonical: `docs/factact-product-operating-principles-v1.md`, `docs/02-domain-model.md`, `docs/adr/0005-change-lifecycle.md`, `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`, `docs/factact-scoped-registry-change-verify-commit-fit-gap-20261109.md`.
- No Core redesign, generic workflow builder or second authorization system. Existing Person/Organization, Actor, Work, Change, Evidence, Audit and scoped Grant semantics remain authoritative.
- Accepted human interaction: **編集 → 「保存」** as a single proposer action; the backend retains separate auditable **Change → Verify → Commit** transitions. A pending proposal must never be represented as saved.

## Gate 1 — first executable Registry edit

**Decision: APPROVED.** The first vertical slice corrects an *existing* Person's `display_name` and nothing else. The Change has `change_type=KNOWLEDGE_STATE_CHANGE` and a narrowly typed `PERSON_DISPLAY_NAME_CORRECTION` effect. It corrects stored knowledge; it does not claim a real-world identity change or establish independent legal-identity verification.

- The authorized actor can view the current text and submit a nonempty, genuinely changed proposed text with a short reason and expected prior value/revision.
- Preserve before/after value, source, author, verification and commit history, with a safe stale-conflict response. Do not overwrite previous evidence/history.
- No Person creation, Organization transfer, email/status changes, duplicate merge, broad JSON PATCH, implicit SUPPORT observation promotion or bulk updates in this **first slice**. This does **not** narrow the already-decided **initial release** requirements for authorized Registry/Procedure/Knowledge editing and customer/external Actor participation.

## Gate 2 — truthful standalone source and one Change lifecycle

**Decision: APPROVED at semantic level.** A real user Registry save request is a typed, durable `REGISTRY_EDIT_REQUEST` source event with authenticated Actor, resolved Tenant/Service/Contract/Recipient, target Person, reason, original/proposed value, expected revision and provenance/evidence state. Do not create fictional SUPPORT/JOIN Work or an execution Action that did not occur. Link a real existing Work only if it genuinely explains the request; the Work never itself grants mutation Authority.

Maintain one canonical **PROPOSED → VERIFIED → COMMITTED** lifecycle (plus explicit REJECTED/return behavior) with unchanged authoritative Person during proposal and verification.

- **Physical design preference, subject to migration safety review:** additive, backward-compatible extension of `factact.changes` for exactly one of (a) existing JOIN Work+Action source or (b) typed standalone Registry request source. Keep existing JOIN checks, foreign keys, unique indexes, Golden tests and person/device history semantics intact. Registry-specific subtype persistence with the *same* conceptual Change lifecycle is acceptable only if review demonstrates that the shared-table extension would weaken enforced JOIN invariants.
- Persist an immutable source and proposed effect. Record proposer, verifier, committer, timestamps and verified evidence; introduce a Person revision/history contract sufficient for optimistic concurrency and retry idempotency.
- Commit must re-evaluate current scope/Grant/active Actor, lock the target and expected revision, then change exactly the authorized Person field and append Change/Audit/history atomically. Failed transitions roll back all effects.
- Do not expose a general Person UPDATE or generic field-mutation endpoint as a shortcut. Any database privileges or narrowly scoped functions introduced for Commit require separate code/DDL security review.

## Gate 3 — initial authorization and human review

**Decision: APPROVED for first slice.** Map `REGISTRY UPDATE` to an authorized **proposal**, `REGISTRY REVIEW` to **Verify**, and `REGISTRY APPROVE` to **Commit**, each checked against the authenticated Actor's *current* exact Service/Contract/ServiceRecipient/Work scope and live effective Grants. Legacy Tenant Roles, organizational affiliation, Caller, employment title or operator-level label are never sufficient.

**Initial approval boundary: two distinct human Actors.** The submitting Actor cannot verify/commit its own correction. A different currently authorized reviewer with both `REGISTRY REVIEW` and `REGISTRY APPROVE` for the *same target* may use one human-visible `確認して確定` action, while backend verification and commit remain distinct and auditable. A reviewer may also return/reject with an appropriate reason.

- The approved management model is **operator level × change category → 不可 / 申請 / 確定** plus a scoped pending-review queue. Operator levels (`新人/一般/責任者`) are human-facing policy templates, not security principals or automatically ordered roles; they do not create or elevate `scoped_actor_grants`.
- `不可`: no proposal or edit; `申請`: only a properly granted Actor may submit pending Change; `確定`: never independently grants immediate commit. The first slice has **no approved self-review/instant-commit exception**. Consequently it must not seed a live `確定` disposition for this category or misrepresent a pending request as immediately confirmed. Future immediate-commit categories require a separate explicit field/evidence/self-review policy decision.
- The example operator-level cell values from the prior discussion are **not approved production defaults**. Operator assignment, policy-version storage, category defaults and escalation-routing configuration must be separately designed under proper administrative authorization/audit before activation; reuse existing Grant issue/revoke governance.
- Reviewers are resolved from **current target-specific Grants**, not job titles. Missing/revoked/out-of-scope reviewer means `確認待ち／担当者割当待ち`, never implicit approval. Pending queues and error responses must not disclose customer B to an Actor scoped only to customer A.

## Required negative and regression acceptance

1. Authorized A proposer: request persists, Person unchanged until verified+committed; reviewer action commits exactly one field with full provenance; identical request retry is idempotent.
2. Human UX: one `保存` returns **確認待ち** (initial two-Actor policy), not **保存済み**; reviewer performs one confirm/return action with before/after, reason, source and evidence state.
3. Grant isolation: UPDATE-only cannot REVIEW/APPROVE; REVIEW-only cannot propose/commit; self-review is denied; legacy Role-only is denied. Revoked/expired Grant, inactive Actor, inactive Contract/Recipient or scope mismatch fails closed.
4. Customer A/B within one Tenant and Service, forged Person/Work/Caller affiliation, direct IDs, list/pending counts and response text reveal no unauthorized customer existence or details.
5. Concurrent proposals, changed Person revision, actor/grant revocation during commit and duplicate request keys cannot overwrite another result or produce partial Audit/history.
6. Standalone request creates no fictitious Work or execution Action; the existing JOIN device-Change Golden, SUPPORT scoped write/correction, Registry read, browser, build and migration rollback suites remain green.
7. Backward-compatibility and rollback review must be independent before any privileged Registry DDL/API mutation, with database authorization and locking order documented.

## Development slices / distinct approval gates

1. **Contract/schema Draft**: typed domain/event/effect/authority contract, isolated additive migration, RLS/grants/constraints, migration rollback and DB denial tests; no API exposure.
2. **Application Draft**: propose/review/commit commands, immutable audit/history, target resolution, actor lock, version/idempotency and negative Golden tests.
3. **HTTP/UI Draft**: scoped routes, single-save/confirm/return interaction and truthful statuses; no internal Role fallback, no unapproved immediate commit.
4. **Policy/queue Draft**: authorized pending queue and audited operator-level/category configuration, only under separately reviewed default/administrative contract; no policy-cell shortcut to Grant.
5. **Integrated acceptance**: independent code/DDL review, synthetic tenant A/B and real browser CI, real authenticated UX review and security/operational checks.

**Boundary:** Product/technical gates 1–3 above are accepted; individual migration/permission security review, code review, merge, production release and real Grant deployment remain separate. Keep the stacked parent Draft PR chain and `main` untouched until explicitly approved.
