# FACTACT | SCOPED Registry context UI checkpoint (2026-11-09)

Status: **Bounded Draft UI slice stacked on SCOPED Registry read API PR #45. No Registry mutation, release, merge or migration.**

## Existing decisions and scope

- Canonical: `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` (external customer/vendor Actor, distinct SUPPORT/REGISTRY authority, cross-customer deny). Read API checkpoint: `docs/factact-scoped-registry-person-read-checkpoint-20261109.md`.
- Existing SCOPED Actor UI continues to use its permitted SUPPORT Work list and details, with no internal Role or Tenant-wide API fallback. Current Work beneficiary is the latest **confirmed** Organization ServiceRecipient, not the Caller Person's affiliation.
- This slice places a read-only **受益企業の登録情報** section directly in the already-open SUPPORT detail. No additional navigation step; no Registry editing or automatic Person matching.

## Server-side authorization bridge

- Every SUPPORT list/summary/history projection stays scoped to an explicitly permitted Work. In the **same read-only Tenant transaction**, the server separately checks current Organization ServiceRecipient and explicit `REGISTRY READ` for the corresponding beneficiary. Only then does `registryOrganizationId` carry the linked Organization ID; otherwise it is `null`.
- `SUPPORT READ/UPDATE` alone never grants Registry visibility. `REGISTRY READ` alone never grants Work visibility. Legacy ADMIN/OPERATOR/REVIEWER Roles never expand the SCOPED session's access.
- Client invokes only `GET /api/scoped/registry/organizations/:organizationId/people?serviceId=...` with server-authorized context. The directory endpoint still **reauthorizes independently** for every page; client ID is never proof of access.
- Read-only Person projection: authorized Organization name, display name and lifecycle status. No contact email, global count, other Organization, edit path, or private Work details.

## UI behavior

- Section mounts and automatically fetches a first page **only** when the detail summary carries a separately granted Registry link. List/Work changes and Tenant changes unmount the section; its state is keyed by Work and Organization.
- Paged reads use the endpoint's Organization-contained cursor. A failed page or a revoked grant clears already displayed Person data and shows a neutral retry/revalidation message; no stale directory remains after a Work refresh.
- Existing SUPPORT response/correction controls and revision handling remain unchanged.

## Verification and remaining gates

- Golden HTTP tests cover SUPPORT-only no link, Registry-only no Work, separately granted same-beneficiary link across list/detail/history, B/Caller exclusion, and revoked link/endpoint.
- Chromium cases cover no Registry request without a Grant, A-only visible Person with no email/B leakage, and removal of visible Registry context after revocation/revalidation.
- Build, unit, DB and browser CI pass counts are tracked in the Draft PR after execution. Production/merge remain **NO-GO**.
- Further bounded work remains: Registry Change/Verify/Commit UI and authority, Procedure/Knowledge formal workflow, untrusted public inquiry intake, real Google account and 13-inch Windows UX acceptance. None is implemented by this read-only slice.
