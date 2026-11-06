# FACTACT | Verified session and Tenant Context switch checkpoint (2026-11-06)

## Scope and Canonical

- Continuation of [ADR 0008](adr/0008-verified-actor-context-memberships.md) and the identity membership Draft PR #29, itself stacked on scoped Actor grants Draft PR #28.
- Existing [ADR 0002](adr/0002-identity-session-authority.md) governs OIDC/PKCE and server session authentication. No new login provider, enrollment, policy interpretation, Actor grant, or business-query authority is added.
- This is a Draft PR integration slice only. It has **not** been merged, migrated, deployed, or run against a real customer/production database.

## Implemented controls

1. `create_verified_session` requires server-verified `(issuer,subject)` and the exact ACTIVE login-default membership to the resolved Tenant-local Operator. The OIDC callback supplies those fields only from `verifyCallback`, never request body/email/headers.
2. All newly created sessions persist private `(issuer,subject)`. On every `read_session`, PostgreSQL rechecks the exact ACTIVE membership, ACTIVE Tenant and ACTIVE Operator. Missing, revoked or inactive is immediately unauthenticated without waiting for the 8-hour expiry.
3. Any session created before the new migration with a `NULL` identity fails closed; users must log in again after migration. The legacy internal/test `create_session` function is compatible only when exactly **one** ACTIVE identity binding exists for the requested Tenant-local Operator. Zero or more than one binding raises `42501`.
4. `GET /api/session/contexts` uses only the identity stored with the valid current session and returns active Tenant-local candidate names/Operator IDs and current/default indicators. It does not return the issuer, subject or role grants.
5. `POST /api/session/context` accepts a strict `{tenantId: UUID}` body. Shared command boundary requires a valid session, exact Origin and matching CSRF. PostgreSQL obtains the target Operator from that session identity's active membership, not from client input.
6. Switching locks and consumes the old token within one database transaction, inserts a fresh opaque token hash and CSRF, preserves the original session expiration and sets the fresh HTTP-only cookie. Concurrent reuse of the old hash fails. Forbidden targets leave the old token active; the response sets no new cookie.
7. Tenant membership **does not grant internal Roles or scoped Actor read authority**. An Operator created in the secondary Tenant without roles stays without roles. No cross-Tenant data access is enabled by listing or switching contexts alone.

## Verification

- TypeScript typecheck and existing unit suite.
- Native PostgreSQL golden E2E suite: OIDC callback identity binding, candidate enumeration, successful switch/rotation, old-cookie rejection, unchanged expiration, denied non-member/other-subject Tenant, immediate revocation of selected/context candidate, inactive Tenant/Operator, expired and pre-migration unbound sessions, concurrent single-use switch.
- Full database regression suite (existing JOIN/SUPPORT/Explore/membership tests) before PR creation.

## Remaining explicit release gates (STOP)

- This Draft PR is not approval to apply the new migration. It invalidates preexisting identity-unbound sessions; plan an operator-facing re-login/maintenance notice and independent production migration approval.
- Review externally facing Account/Tenant selector UI, the initial-release external Actor onboarding/authorization model, and exact Service/Recipient/Work scoped read/write enforcement independently. Existing internal query permissions must not be inherited by a customer/vendor merely because a session is established.
- Verify role/grant tests, synthetic staging with actual Google OIDC, audit visibility, deployment rollback and operational session behavior before any production Go/No-Go.
- No production changes, real tenant creation, external reads, customer enrollment, merge or deployment in this slice.
