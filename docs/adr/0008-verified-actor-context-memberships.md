# ADR 0008: Verified Identity / multiple Tenant Context membership (Draft)

Status: **Proposed technical extension of ADR 0002, for review before initial release.** Actor Neutrality, Tenant≠Customer and external-user initial-release requirements are already DECIDED; this ADR only records the incremental authentication contract.

## Context

ADR 0002 establishes Google OIDC Authorization Code + PKCE, explicit issuer/subject identity binding, server sessions and an initial single-Tenant Operator. It explicitly reserves multi-Tenant membership selection and external Read Authority. Draft PR #28 adds scoped Actor grants, but grants do not authenticate the Actor. Existing internal Read Authority v1 must never be inherited by an external Actor simply because authentication succeeds.

## Proposed technical contract

1. **The verified identity is `(issuer, subject)`**, not an email address, Organization/Person/Caller, DNS domain or Tenant. An identity may have explicitly assigned Tenant/Operator memberships. No Just-in-Time enrollment or automatic transfer of membership.
2. **One active login default at most** per issuer+subject. Migrated single-Tenant bindings remain their current explicit default. More memberships are added with `is_login_default=false`; an administrator must explicitly select a new default if needed. No query-first-row choice and no client-supplied Tenant preference at OIDC callback.
3. Each Tenant context maps to a **different Tenant-local Operator**; the Operator has no implicit ADMIN/OPERATOR/REVIEWER Role merely for being linked. Actor-neutral Domain scoped grants remain independently required to read/write a Service/Recipient/Work. Membership is not a Grant.
4. A later context-switch operation must be protected by active authenticated session + exact Origin + CSRF, select only a currently ACTIVE membership from the **server-bound verified identity**, rotate the session token and CSRF token, and recheck Operator/Tenant on every request. It must not accept issuer/subject, Operator ID or role from the browser.
5. Membership revocation must make both new context selection **and existing sessions** cease authorizing the revoked context. That E2E behavior remains a release gate until identity-bound session enforcement is implemented. The original bootstrap session has no verified identity stored and therefore cannot safely switch.
6. The presently configured Google issuer is the only implemented provider. Adding Microsoft or another issuer requires its own configured OIDC protocol verification and explicit identity binding; sharing an email address never links Accounts.

## This implementation slice / deliberate STOP

The stacked Draft PR following #28 adds only the backward-compatible `operator_identities` membership keys/status/default, fail-closed default resolution and a verified-identity-only context enumeration method. It does **not** create a public account enrollment or context-selection endpoint, change bootstrap sessions, enable external users, change the internal query permission model, or issue scoped grants.

These remaining gates and the context-switch design are subject to implementation review and explicit Go/No-Go before production. The existing User/Business Decisions are unchanged.
