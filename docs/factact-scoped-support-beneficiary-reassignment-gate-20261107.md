# FACTACT | Scoped SUPPORT beneficiary reassignment disclosure gate (2026-11-07)

Status: **Stacked Draft implementation / internal review only. No production data operation, release, merge or external Account enablement.**

## Canonical Fit/Gap

- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`: initial release must enforce same-Tenant A/B beneficiary isolation; Caller affiliation, Work Owner and a general Tenant membership do not grant customer-level visibility.
- `docs/factact-support-beneficiary-separation-checkpoint-20261106.md`: SUPPORT Work's legacy `service_recipient_id` represents the Caller Person, while the latest confirmed Organization decision supplies the beneficiary for external scope.
- Draft PR #32/#33 already resolve active Actor/Service/Contract/Recipient and explicit `SUPPORT`/`READ` Grant and provide Work summaries, list with filtering before pagination. Draft PR #34 added the Work-local sanitized history and an additional gate against historical cross-Organization reassignments.
- Remaining Gap from PR #34: the summary and list still projected `title`, `nextAction` and other Work fields after A→B beneficiary reassignment, even when those fields originated while A was the confirmed beneficiary.

## Bounded change

1. A Work is **not eligible for any external scoped read** when its SUPPORT Event's confirmed beneficiary history contains **more than one distinct Service Recipient** (representing different beneficiary Organizations for that Service). This is a conservative content-disclosure gate, independent of whether an Actor has an otherwise valid Work, Recipient or Service-wide Grant.
2. The same condition now applies to `GET /api/scoped/support-work/:id`, the Work-local `GET /api/scoped/support-work/:id/history`, and `GET /api/scoped/support-work`.
3. Direct-ID summary and history use the common `authorizedSupportWork` resolver inside the existing Tenant-RLS-protected read-only transaction; unauthorized, missing and reclassified-pending Work all return indistinguishable 404.
4. The list applies the `NOT EXISTS` historical-conflict predicate **inside SQL before sorting/LIMIT**, together with existing active-grant, latest-beneficiary and Contract checks. Unauthorized historical Work must not consume page slots, alter customer-visible counts, or emerge through pagination.
5. A **CLEARED → CONFIRMED for the same prior Organization** does not trigger the conflict, once a current confirmed beneficiary exists. A→B→A **remains blocked** because old A/B records have not been individually reclassified. A later CONFIRMED B never automatically makes earlier A-authored content safe for B.
6. No existing internal broad SUPPORT routes, pure scoped-access kernel, Grant table, beneficiary-decision write workflow, service role, or underlying data is changed. No automatic reassignment approval, reclassification API, new migration or backfill is introduced.

## Verification and negative acceptance

Extended the authenticated Golden tests with same-Tenant A/B under the **same Caller Person**:

- A→B direct-ID summary is denied even after a new B Recipient Grant; A→B activity history remains denied.
- An explicit Service-wide READ Grant also cannot expose reassigned Work in a list or direct-ID route. Pages of size one traverse only unchanged authorized A/B Work; an excluded Work cannot create a gap or leak its title/count.
- A→B→A remains denied; same-Organization confirmation after temporary CLEARED is allowed again.
- Existing wrong-operation, revoked Grant, expired Contract, unauthorized direct ID, Caller-only linkage, Work-only Grant and normal A/B list/history acceptance tests continue to apply.

Final local checks: targeted DB/Golden `tests/golden/scoped-support-http-read.test.ts`
**23/23 PASS**; `npm test -- --reporter=dot` **32/32 PASS (3 files)**;
`npm run typecheck` **PASS**; `npm run build` **PASS**;
`npm run test:db -- --reporter=dot` **186/186 PASS (12 files), Exit 0 on re-run**.
The first full DB run also passed all 186 assertions but exited 1 on the previously
documented intermittent embedded PostgreSQL teardown error `57P01` from
`tests/database/baseline.test.ts`. The fixture issue is separate and is **not**
claimed resolved by this change. PostgreSQL client deprecation warnings remain.

## Remaining initial-release No-Go

- There is intentionally **no mechanism to make a historically reassigned Work visible again**. A future authorized human record-level content review, audit trail, safe migration/reclassification or redacted copy procedure must be designed and approved before any such Work can be externally shown. A Service-wide Grant alone is not consent to retroactively disclose records.
- A Work **initially confirmed for a single Organization** still relies on the correct human attribution and on the content being suitable for that recipient. A single confirmation is not, on its own, evidence that every pre-confirmation free-text field has been classified. This must be covered by external-actor acceptance and content review before initial release.
- Other scoped Event/Registry/Knowledge/Procedure paths, external Actor write/review, Grant issuance and Audit, UI and real-user E2E acceptance are not complete. Legacy internal Operator inventory / production migration decision remains open.
