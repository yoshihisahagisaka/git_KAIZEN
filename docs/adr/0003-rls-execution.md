# ADR 0003: RLS execution model

Status: Accepted for bootstrap, 2026-09-09.

Tenant business tables live in factact, outside the Supabase exposed public schema. They have explicit tenant IDs (Tenant uses its own ID), ENABLE and FORCE ROW LEVEL SECURITY, and fail-closed policies. Composite foreign keys prevent cross-tenant links. Runtime grants are explicit per table and operation, not schema-wide defaults. Audit permits SELECT/INSERT only. Contract versions are append-oriented at the application permission boundary.

factact_runtime is LOGIN, NOSUPERUSER, NOBYPASSRLS and owns no tables. Migration/admin credentials are separate. The server refuses startup with a superuser, bypass-RLS or business-table-owning database role. Its database user must be factact_runtime.

After resolving an opaque session, an application transaction sets factact.tenant_id with transaction-local set_config on the same checked-out pg client. Context is never taken from browser tenant IDs. All business reads/writes run inside this boundary; commit/rollback releases local context before returning the client. RLS defends against missing tenant predicates, not a compromised trusted server capable of changing its context.

Private auth tables have no runtime direct grants. Fixed-search-path SECURITY DEFINER functions allow one-use login transactions, hashed session creation/lookup/revocation and explicit identity lookup. Identity resolution returns only IDs; the application must subsequently check active Operator/Tenant with RLS. Function EXECUTE is revoked from PUBLIC and granted only to factact_runtime.

No browser Supabase key grants business-table access. Missing tenant context returns no rows and rejects writes. Tests must run as the actual restricted role and exercise missing context, cross-tenant reads/writes, forged links, rollback and pooled-connection reuse. Passing unit tests alone cannot establish RLS correctness.

JOIN checkpoint implementation, 2026-09-09: the second migration applies the same
model to nine JOIN tables, with column-specific lifecycle UPDATE grants and no
DELETE grants. Workspace reads use a repeatable-read, read-only transaction to
assemble a consistent context. Audit sequence orders lifecycle events independently
of tied timestamps. Both migrations pass real PostgreSQL tests under the restricted
role. Hosted Supabase role creation, ownership and migration privileges remain a
deployment verification gate; no hosted incompatibility has been observed because
hosted execution has not yet been attempted. Do not silently weaken the role model
if this gate fails; record the exact incompatibility for review.
