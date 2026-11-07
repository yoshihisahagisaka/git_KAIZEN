# FACTACT | Scoped SUPPORT Work detail/activity checkpoint (2026-11-07)

Status: **Stacked Draft only. No migration, production access, external Actor enablement, merge or deploy.**

## Existing Canonical / Fit-Gap

- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`: external customer and vendor Actors require scoped read/write at initial release; same-Tenant different beneficiaries must never gain each other's Work information. Caller affiliation is not authority.
- Draft PR #30/#31: verified Session Actor/Tenant binding and explicit gating of legacy internal Read Authority. Draft PR #32/#33: a minimal scoped Work summary and an authorization-filtered list, both using the latest **CONFIRMED** beneficiary plus effective `SUPPORT`/`READ` Grant.
- The internal `SupportQueries.detail()` contains Caller-linked previous Work, other beneficiary Organizations, Registry/Knowledge and raw operator notes; it **cannot** be reused for a scoped external response. This slice extends only the existing scoped reader without redesigning the Business Domain.

## Implemented boundary

1. Added `GET /api/scoped/support-work/:id/history` with `limit` (default 20; range 1–50) and optional opaque `cursor`. The authenticated Session supplies Actor/Tenant. Work ID is only a lookup key; user-supplied Organization, Recipient, Service, Contract or Grant never supplies authority.
2. `PgScopedAccessReader` resolves the single Work and its latest confirmed Organization beneficiary, verifies active Actor/Tenant/Service/Contract/Recipient and a matching non-expired `SUPPORT`/`READ` Grant through the same scoped-access kernel used for direct-ID summaries. It then fetches the selected Work history **inside the same Tenant-RLS-protected, REPEATABLE READ READ ONLY transaction**.
3. The projection includes `{work, entries, nextCursor}`. `work` is the existing minimal summary; `entries` is a bounded descending `(occurred_at, id)` timeline of **recorded `RESPONSE`** text/disposition and metadata-only lifecycle transitions (excluding duplicate `RESPONSE_RECORDED` markers). Each entry contains only `id`, `revision`, `kind`, `occurredAt`, `responseText`, `disposition`. A `RESPONSE` means an operator **recorded** that response; it does not prove dispatch to the customer.
4. `DRAFT`, legacy operator procedure records, raw `command_payload`, internal waiting reasons, close reason, caller input/identity, operator identities, Registry, other Work and Service-wide Knowledge are **not projected**. There are no cross-Work joins, shared Caller history, count or unauthorized-candidate metadata.
5. History of Work whose beneficiary was ever **CONFIRMED for a different Organization** than the latest one returns the same `404 NOT_FOUND` as unauthorized/missing Work. Reassignment does not retroactively approve prior response text for the new Organization. This rule is confined to the new history endpoint: the inherited summary/list still use the latest beneficiary and must receive a separate content/reclassification review before initial release.
6. `cursor` only positions already-authorized Work-local entries; it is not an access token. No `hasMore`/total count is returned, and a page may return an opaque continuation that leads to an empty next page.

## Verification

Authenticated golden tests in `tests/golden/scoped-support-http-read.test.ts` cover:

- Default-deny despite internal Roles; missing/forbidden IDs return indistinguishable 404; unauthenticated requests fail.
- Same-Tenant A/B with the **same Caller Person**, A-recipient/Work grants, Service grant, wrong operation and object kind.
- A's recorded response and minimal lifecycle transition with no B content, drafts, internal waiting reason or raw payload; pagination across mixed response/state-change entries.
- Immediate revocation, cleared beneficiary, expired Contract and A-to-B beneficiary reassignment denying historical content without human reclassification.
- Invalid cursor, limit and caller-supplied recipient fields return 400.

Final local checks: targeted DB test **20/20 PASS**; full DB/Golden
`npm run test:db -- --reporter=dot` **183/183 PASS (12 files), Exit 0**;
`npm test -- --reporter=dot` **32/32 PASS (3 files)**;
`npm run typecheck` **PASS**; `npm run build` **PASS**.
The DB run emitted existing `pg` client-query deprecation warnings without failed tests.

## Still open (initial-release gates)

- The remaining scoped event/Caller/Registry, device/evidence/knowledge detail projections need explicit content classification and independent authorized-target checks. The complete activity view is **not** exposed by this API.
- Historical Work beneficiary changes can cause sensitive summary/title/nextAction data to cross Organizations in the inherited latest-beneficiary direct/list projections. Define and test an explicit reclassification/redaction policy **before external activation**; no implicit automatic approval of prior text.
- Scoped create/update/review, approved Grant issuance+revocation with Audit, multi-customer UI, human review, real account and load/performance acceptance remain incomplete.
- The legacy Operator inventory and production migration Go/No-Go of Draft PR #31 remain open. Production changes require separate approval.
