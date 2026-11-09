# FACTACT | External Actor scoped SUPPORT read UI checkpoint (2026-11-09)

Status: **Stacked Draft implementation on PR #41 HEAD tree; no merge, production operation or external-account enablement.**

## Inherited design and fit/gap

- Initial release serves authorized atLIB staff, customer staff and external vendors under one Actor-neutral model. This is a bounded read UI slice, **not** the completion of the initial-release contract (`docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`).
- Reuses the existing Google OIDC session, DB-derived `read_authority_mode`, exact verified-Tenant session context list/switch, and the existing authorized `/api/scoped/support-work` list/detail/history endpoints from PR #38–#41 stack.
- A `SCOPED` Actor **never** enters legacy internal JOIN/SUPPORT/Explore UI. The browser does not infer broad authority from assigned legacy Roles, Tenant name, caller affiliation or recipient email. Unknown/missing authority mode does not render a business UI.
- No migration, new Grant, new table, new API authorization logic, search, independent RBAC or SONIX-specific branch.

## Scope of this slice

1. Session projection now carries `readAuthorityMode` directly from the active Operator row. This is **presentation routing only**; every actual data request remains server-authorized.
2. Explicit `SCOPED` mode renders a read-only list of authorized Work, selected Work detail and the safe Work-local history. Both pagination paths use the existing opaque cursors and bounded page size 20; no tenant-wide counts or hidden target data.
3. A list revalidation clears cached Work before refetch. A detail/history failure clears projected details. The UI deliberately has no response/write/correction, review, Close or direct-ID routing in this first slice.
4. Session context picker lists only server-verified memberships. The session-bound UI is **unmounted before** an allowed Tenant switch is submitted; on a failed/denied switch it remains unmounted and demands a new session check. Switching rotates the cookie/CSRF on the server as already implemented.
5. Existing `INTERNAL_V1` UI remains untouched apart from receiving the shared Tenant chooser.

## Acceptance checks

- `npm run build`: PASS (including typecheck).
- `npm test -- --reporter=dot`: **35/35 PASS**.
- `npm run test:db -- --reporter=dot`: **236/236 PASS** (17 files).
- `npx playwright test tests/browser/scoped-support-ui.spec.ts --list`: **3 tests discovered**.
- Added browser scenarios: authorized A only under a Tenant shared with confidential B; authorized detail/history and no internal API calls; Grant revocation removes cached A on refresh; switching to another explicitly authorized Tenant drops all old Work. Browser **execution is pending** because the local sandbox cannot launch Chromium (socket permission EPERM, known environment limitation); run in GitHub CI.
- Added golden assertions that `SCOPED` and `INTERNAL_V1` are projected from the DB, rather than inferred from Roles.

## Remaining gates (NO-GO for initial release)

- External Actor response/correction UI; public inquiry form; authorized Registry and formal Procedure/Knowledge editing; all read/write/search/ID cross-customer negative tests.
- 13-inch Windows human UX review from PR #20 and the new external UI, browser E2E run in trusted CI.
- Parent PR #10–#41 merge gates, legacy Operator inventory/backfill, production migration, real-account provisioning and deployment remain separate and unapproved.
