# FACTACT | SCOPED Registry Person read checkpoint (2026-11-09)

Status: **Bounded Draft API slice, stacked on external Actor PR #44. No Registry update/commit, public intake, release or migration.**

## Fit/Gap to accepted initial-release scope

- Source: `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`, AC-03–05, AC-11–12 and AUTH-G3/G5. Authorized customer and vendor Actors must be able to inspect their permitted Registry information, but same-Tenant other-customer data must remain hidden. JOIN retains authoritative Registry and Change/Verify/Commit semantics.
- Reused: `factact.organizations`, `factact.people`, `factact.service_recipients` (`ORGANIZATION`), active Service/Contract, explicit `REGISTRY READ` grant from migration `20261106001600_scoped_actor_grants.sql`, existing `PgScopedAccessReader` and Tenant RLS. No new Core Object, Role or table.
- Gap selected for this slice: only internal JOIN Person/Organization queries existed; granting a SCOPED Actor an old internal Role is forbidden. The `REGISTRY` grant kind previously lacked a read surface.

## Implemented boundary

- `GET /api/scoped/registry/organizations/:organizationId/people?serviceId=...&limit=...&cursor=...` resolves tenant and Actor exclusively from the verified session. A caller-provided Organization ID is a target, **never proof of authority**.
- The same read-only repeatable-read Tenant transaction resolves the active Organization ServiceRecipient, effective Service/Contract, and a matching current explicit `REGISTRY READ` grant. Unauthorized, missing, retired and revoked objects all return 404; no `SUPPORT READ` or legacy ADMIN/OPERATOR/REVIEWER Role fallback.
- The output contains only the authorized Organization name, Person display name, Person ID and lifecycle status. No email, raw verification/Caller claims, global counts, internal Records, or unfiltered cross-customer results. Cursor pagination (1–50) operates **inside that Organization**.
- API read only. There is no Registry field update and no alternate path around `Action → Change → Verify → Commit`. No external publication, account enrollment or real Grant issuance.

## Verification and remaining gates

- Targeted embedded-PostgreSQL Golden tests: no Grant despite legacy Roles/SUPPORT access; A read / B concealment in the same Tenant and Service; service-wide Grant only when explicit; revocation; inactive Contract; server-side pagination; malformed cursor; non-authenticated 401.
- Full build, Unit, DB Golden and Chromium browser counts must be recorded in the Draft PR/CI before acceptance. This is an API-only slice and must not be misrepresented as complete Registry UI/editing.
- Still required for initial release: customer-facing Registry UI and approved Change/Verify/Commit editing, Procedure and Knowledge formal lifecycle and authority, public form with untrusted Caller identity separation, cross-surface negative cases and real-account/13-inch Windows UX acceptance. **Production/merge NO-GO.**
