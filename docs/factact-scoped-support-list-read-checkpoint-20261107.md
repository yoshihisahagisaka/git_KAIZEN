# FACTACT | Scoped SUPPORT Work list/read pagination checkpoint (2026-11-07)

Status: **Stacked Draft implementation; no production migration, release or external account enablement.**

## Inherited decisions and Fit/Gap

- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`: initial release requires customer/vendor Actor neutrality, same-Tenant A/B isolation for all list/search/count/direct-ID access, not Tenant-per-customer or SONIX-specific Roles.
- Existing approved scoped-access kernel, stored `scoped_actor_grants` and Session Context binding: Actor/Tenant must come from a verified Session, with Service/Contract/Recipient/Work target and `SUPPORT`/`READ` authorization derived from persisted facts.
- Draft PR #31: broad internal Read Authority v1 is explicitly gated. Draft PR #32: a single scoped Work direct-ID projection already enforces the latest confirmed beneficiary and explicit Grant in a read-only transaction.
- This slice closes **only the scoped SUPPORT Work list** part of the Gap. It neither reuses the broad `GET /api/support` nor changes Caller-versus-beneficiary semantics.

## Implementation

1. Added authenticated `GET /api/scoped/support-work` with bounded `limit` (default 20, maximum 50) and an optional opaque pagination `cursor`.
2. The verified Session supplies Actor and Tenant; cursor is **untrusted positioning input only**. Unknown query fields, invalid limits and invalid cursors return `INVALID_INPUT`. No browser-supplied Service/Recipient/Organization/Grant can authorize an item.
3. Within one Tenant RLS-protected, `REPEATABLE READ READ ONLY` transaction, the repository selects only SUPPORT Work whose **latest beneficiary decision is CONFIRMED**, corresponding Organization Recipient is active, Actor/Tenant/Service/Contract are active/effective, and an explicit non-expired non-revoked Grant matches `SUPPORT` + `READ` + the actual Service/Recipient/Work scope. This selection happens **before ordering and LIMIT**.
4. Each candidate is then rechecked through the existing pure scoped-access policy and trusted DB target resolver in that same transaction before returning the already restricted Work summary from PR #32. Internal-v1 Role rows, the inquiry Caller's Organization, Work Owner, and membership alone do not authorize inclusion.
5. Response is `{items, nextCursor}`. No Tenant-wide count, number of hidden candidates, company list, `hasMore` claim, unrelated Work or Caller details. A cursor is returned only after a full authorized page; a subsequent page may legitimately be empty. Ordering is stable `(updated_at DESC, id DESC)`.

## Verification and negative acceptance

Extended `tests/golden/scoped-support-http-read.test.ts` with authenticated end-to-end cases:

- Without explicit Grant, list is empty even for a SCOPED Actor carrying all three legacy Role rows; old internal broad SUPPORT remains 403.
- A recipient Grant returns only A Work; B has the same Caller Person, but B Work and existence/count do not appear.
- After filtering A/B, pages of size 1 traverse only authorized A Work without skipping or exposing B. No total count.
- A Work-only Grant does not expose B; an explicit Service-wide Grant does. Wrong operation/object kind remains unauthorized.
- Grant revocation, beneficiary clearance, expired Contract, unauthenticated request, malformed cursor/limit and browser-provided recipient fields are rejected or return empty results.

Local checks: `npm run typecheck` **PASS**; `npm test -- --reporter=dot`
**32/32 PASS**; `npm run build` **PASS**; `npm run test:db -- --reporter=dot`
**176/176 PASS (12 files), Exit 0 on re-run**. The first full DB run also
passed 176 assertions but exited 1 due to an already documented intermittent
embedded PostgreSQL teardown `57P01` after the tests. It is a separate test
fixture reliability issue, not an authorization assertion failure; do not
represent it as resolved by this slice.

## Remaining initial-release gates

- Full scoped SUPPORT Event detail/history/records and write/review functions; JOIN, Explore, Registry, Knowledge, Procedure, management tables and safe search. Future list performance/index checks at representative multi-customer volume.
- External Actor UI, grant issuance/revocation with approval+Audit, public inquiry form and full E2E acceptance remain required **before initial release**, not deferred to a later release.
- The legacy Operator inventory and migration Go/No-Go of Draft PR #31 remain open.

No PR merge, deployment, real account permission or GCP/database operation was performed.
