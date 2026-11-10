# FACTACT | SCOPED Registry review queue + one-click confirm Gate (2026-11-10)

Status: **Draft, stacked on proposer PR #52. Production, Merge, hosted DB Migration and real Grant are No-Go.**

## Approved behavior and responsibility

- Continue the accepted contract in `factact-scoped-registry-first-edit-implementation-contract-accepted-20261110.md`. The proposer performs one `編集 → 保存`, leaving a real Registry request + `Change(PROPOSED)` without changing the Person. This Gate adds a distinct reviewer's `確認待ち → 確認して確定`.
- The reviewer UI is available independently of a SUPPORT Work/READ Grant; it exposes only actual pending Registry changes covered by this session Actor's effective, target-specific REGISTRY REVIEW Grant. Legacy ADMIN/OPERATOR/REVIEWER roles cannot expand scope. No cross-customer directory, total count or synthetic Work/Action is created.
- Reviewers see the unchanged authoritative name, original name, proposed name, reason, review state and explicit caution that a caller statement is **not independently verified identity evidence**. The reviewer is accountable for the confirmation action; the UI must not imply identity proof that did not happen.
- The confirm button requires both a live REGISTRY REVIEW and REGISTRY APPROVE Grant for the same Service, Contract and Organization recipient. Proposer and reviewer must differ. The existing database functions revalidate the proposer's live UPDATE Grant, Person context and revision at commit time. A verified Change can be committed in this one-click path only by the same verifier; no silent reassignment.

## Backend Change → Verify → Commit and atomicity

1. `GET /api/scoped/registry/review-queue` uses the verified session Tenant/Actor, bounded keyset cursor (limit 1–50) and live grants to project eligible `PROPOSED`/`VERIFIED` changes. Cursor and returned count cannot grant access or expose hidden customers.
2. `POST /api/scoped/registry/review-queue/:changeId/confirm` is protected by the existing verified session, exact Origin and CSRF check. A strict fixed attestation is the only accepted body; forged Tenant, Actor, target or Grant are rejected.
3. One tenant-scoped ACID transaction performs the **existing** `registry_verify_display_name` RPC followed by the **existing** `registry_commit_display_name` RPC. They persist separate verification Evidence/Audit and commit Audit, even though the human uses one button. If either RPC fails, all transaction writes roll back. No new privileged SQL function or schema migration is introduced in this Gate.
4. Unknown/unauthorized IDs share a 404 response. Stale or conflicted changes return 409. A successful confirmation returns `COMMITTED`; a same-Actor retry is idempotent and adds no second audit. After any attempt, the browser refetches its authorized queue; errors remain visible while refreshing.

## Synthetic verification requirements

- HTTP: unauthenticated session, incorrect CSRF, forged identity fields and malformed attestation fail closed.
- Reviewer without live REGISTRY REVIEW/APPROVE cannot confirm; REVIEW-only must not leave half-verified Change/Evidence. Historical role membership never substitutes for grants.
- Same Service, different Organization A and B: an A-only reviewer sees only A; direct B Change ID and unknown ID are indistinguishable.
- Valid separate-Actor confirmation updates only authorized Person's display name/revision, records exactly one proposal audit, one verification evidence + audit and one commit audit; Work and Action remain null.
- Grant revocation after displaying a queue prevents confirmation and removes the stale row on refresh. Browser works even without SUPPORT READ.
- Build/typecheck/unit plus hosted PostgreSQL and browser CI must pass. Local embedded PostgreSQL requires a missing system ICU shared library, so DB and Playwright acceptance are established by CI, not assumed locally.

## Fit/Gap and next decision

**Fit:** Existing DB verify/commit RPCs, target authority locks, RLS, audit and the accepted two-Actor rule can support the one-click reviewer confirmation without additional privileged migration.

**Gap:** Actual **差し戻し** is not an implemented Registry state transition or auditable reviewer command. A separate Gate must specify return/reject reason, immutable evidence, a bounded resubmit path and corresponding migration/preflight/emergency disable updates before any HTTP/UI return action is added. Do not present an inert “差し戻し” button or mutate `Change` without that evidence. Approval of this PR does not approve the next DB migration.

Production deployment, live customer Grants, schema migration, merge and change to other service lanes remain **No-Go**.
