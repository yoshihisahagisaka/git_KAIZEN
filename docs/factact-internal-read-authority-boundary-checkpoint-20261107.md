# FACTACT | Internal Read Authority v1 boundary checkpoint (2026-11-07)

Status: **Draft implementation only. No production migration, account enrollment or external data reads.**

## Fit/Gap and inherited Decisions

- [ADR 0002](adr/0002-identity-session-authority.md) explicitly restricts Tenant-wide Read Authority v1 to the existing internal Operator model. External Actor read rights are independent and require explicit Service/Contract/Recipient/Work authorization.
- [ADR 0008](adr/0008-verified-actor-context-memberships.md), stacked Draft PR #29/#30, now binds verified `(issuer,subject)` to ACTIVE Tenant-local Session Context. Membership proves where the Actor can sign in, **not** what data it may read.
- [Scoped Actor grants](factact-scoped-actor-grants-persistence-checkpoint-20261106.md) are already persisted and evaluated separately by `PgScopedAccessReader`, but existing JOIN, SUPPORT and Explore endpoints still implement broad internal v1 Role reads.
- The unresolved gap was a missing, explicit boundary distinguishing the legacy broad Read Authority v1 from Actors intended to use scoped grants. Without it, granting `ADMIN/OPERATOR/REVIEWER` to an Actor could inadvertently authorize same-Tenant information about unrelated customers.

## Implementation

1. Migration `20261107000100_explicit_internal_read_authority.sql` adds `factact.operators.read_authority_mode` with `INTERNAL_V1` and `SCOPED`, defaulting **all newly created Operators to `SCOPED`**, independent of employer, Organization, caller affiliation or Tenant membership.
2. Existing Role-bearing Operators are backfilled with `INTERNAL_V1` to preserve the **previous internal-only** production model, subject to a pre-migration inventory gate. This is a compatibility marking, not a new external permission grant.
3. For the isolated deterministic development fixture, `supabase/seed.sql` explicitly upgrades its known test Operator only when the migration column exists. The same seed remains compatible with baseline-only schema tests.
4. All three existing authoritative Operator loads (`PgIdentityStore`, `PgJoinRepository`, `PgExploreSearchRepository`) project broad `ADMIN/OPERATOR/REVIEWER` Roles **only for `INTERNAL_V1`** Operators. For `SCOPED`, projected Roles are empty even if rows in `operator_roles` exist. Existing JOIN, SUPPORT, Explore read/command `assertRole()` gates therefore fail closed without relying on a browser-supplied category.
5. A downgrade from `INTERNAL_V1` to `SCOPED` takes effect at the next repository/session Role lookup, even when the Actor has a valid existing Session. The restricted runtime DB role cannot update this attribute.
6. `SCOPED` means explicit scoped authorization is required; it does **not** automatically deny or grant `PgScopedAccessReader` decisions. Only previously implemented scope checks can authorize those targets. A future, separate application boundary must route scoped queries/writes through that Reader.

## Golden verification

- Preexisting seeded internal Operator retains Role v1; new Role-bearing Operator defaults to `SCOPED` and receives no broad Roles in the Session.
- A `SCOPED` Actor assigned even all three Roles cannot use JOIN, SUPPORT, or Explore broad list/search/direct-ID routes, and cannot create JOIN/SUPPORT records via valid Origin/CSRF.
- Existing internal Operator immediately loses broad reads after downgrade, without revoking unrelated identity membership.
- Runtime cannot elevate the mode; Tenant Context enumeration does not change the mode.
- Existing JOIN/SUPPORT/Explore, identity/session and scoped-grant suites must remain green.
- The DB test runner uses one non-parallel thread for embedded PostgreSQL
  fixture lifecycle. Its previous default fork runner could report an
  unhandled `57P01` during shutdown even when every assertion passed.

## STOP / next slices

- The migration backfills **all existing Role-bearing Operators**. Before any real migration, an authorized human must inventory existing Operator accounts and verify their eligibility for the old internal v1 permission model. Any exception is an explicit No-Go until resolved. No automatic upgrade of a future Actor to `INTERNAL_V1` is permitted.
- Do not interpret `SCOPED` as “customer” or `INTERNAL_V1` as employee status. This flag marks which authorization **algorithm** applies, not the person's employer or position. The agreed Actor Neutrality/Owner separation is unchanged.
- Existing `SUPPORT`, `JOIN`, `Explore`, detail/history, knowledge and commands are still broad internal-only. They are not safe external endpoints simply because a scoped Actor is denied. Implement scoped projection/filtering, direct-ID enforcement, audit and negative A/B tests before external enablement.
- The Actor-facing selector, external enrollment and public inquiry intake remain separate initial-release completion work. No user accounts, grants, production changes, merge or deploy in this slice.
