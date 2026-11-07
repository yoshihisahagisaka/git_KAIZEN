# FACTACT | Scoped SUPPORT Work direct-ID read checkpoint (2026-11-07)

Status: **Stacked Draft implementation only. No release, external account enablement, merge or production operation.**

## Fit / existing decisions

- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` requires customer/vendor Actor neutrality, same-Tenant cross-customer isolation and scope-specific operations for the initial release. The implementation is common Core, not SONIX-specific.
- `docs/factact-scoped-access-kernel-checkpoint-20261106.md` and `docs/factact-scoped-actor-grants-persistence-checkpoint-20261106.md` already supply explicit operation/object/scope authorization and effective Grant persistence.
- Draft PR #30 authenticates the selected Tenant-local Actor Context; Draft PR #31 explicitly prevents new scoped Actors from inheriting internal broad Read Authority v1. This slice uses those boundaries without redefining them.
- SUPPORT's legacy `work.service_recipient_id` is the inquiry Caller Person. The **latest confirmed** beneficiary decision links the actual recipient Organization; affiliation at intake does not grant read access.

## Bounded implementation

1. Added the authenticated **`GET /api/scoped/support-work/:id`** endpoint. Its Actor/Tenant are taken exclusively from the server-verified active Session; only Work ID comes from the URL.
2. `PgScopedAccessReader.supportWorkSummary()` loads one SUPPORT Work, its latest beneficiary, active Service/Contract, and explicit `SUPPORT` / `READ` Grant inside the **same Tenant RLS-protected, REPEATABLE READ, READ ONLY transaction**. The request may not supply authorization target, Service, Contract, Recipient or Grant claims. No authorization decision is cached.
3. Missing Work, missing/unconfirmed beneficiary, wrong recipient, missing/expired/revoked Grant, inactive Actor/Service/Contract/Recipient, or wrong operation/object kind all return **the same `NOT_FOUND`**, including when the Work exists in another customer scope.
4. The response is deliberately restricted to the authorized Work's identifier, Service/Contract/Recipient identifiers, title, status, next action, waiting, follow-up and updated time. No Caller identity, unverified observation, unrelated Work history, full Registry, organization list or Knowledge is returned.
5. Existing internal-wide `GET /api/support`, `GET /api/support/:id`, and Explore remain separate and unavailable to SCOPED Actors. This endpoint does not add a broad list, search or write permission.

## Verification

`tests/golden/scoped-support-http-read.test.ts` tests through an actual authenticated Session, including a scoped Actor holding all three legacy Roles:

- Default deny/no Session, same-Tenant customer A/B isolation and indistinguishable missing/forbidden IDs.
- A's Caller for both records; only **confirmed beneficiary** and explicit recipient Grant decide which Work can be read. Client-supplied affiliation query parameters do not override it.
- Work-only scope not widening; explicit Service-wide grant may read the other beneficiary; operation and object kind do not cross-authorize.
- Revocation affects the next request of an existing Session; beneficiary clearance or reassignment, inactive recipient or expired Contract deny.
- Existing broad SUPPORT reads still return 403 to a scoped Actor, even with legacy Role rows.

Local verification: `npm test -- --reporter=dot` **32/32 PASS**;
`npm run test:db -- --reporter=dot` **170/170 PASS (12 files)**;
`npm run build` **PASS**. No GCP/database deployment.

## Remaining initial-release gates (not moved to later release)

- Scoped SUPPORT list/search/detail/history and write/review routes; JOIN, Explore, Registry, Knowledge, Procedure and management table read/write; correct per-object projections and all direct-ID/related-data checks.
- External Actor-facing UX, explicit grant issuance/revocation with approval and audit, public inquiry form, E2E acceptance and production approval.
- Real Operator inventory before PR #31's backfill migration. Do **not** grant `INTERNAL_V1` to new customer/vendor Actors or infer grants from employment or caller affiliation.

No production migration, GCP change, real user enrollment, PR merge or external data exposure was performed.
