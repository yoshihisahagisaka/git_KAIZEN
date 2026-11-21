# FACTACT | Registry least-privilege executor / RLS Gate (2026-11-10)

Status: **Draft technical implementation / synthetic CI required. Production and main merge No-Go.**

Scope: the accepted first Registry display-name correction, stacked on Draft PR #49. No new end-user role, operator level, approved policy default, external API or production credential.

## Why this Gate exists

The original Registry Propose/Verify/Commit functions were `SECURITY DEFINER` under the migration-owner identity. Disposable CI used a PostgreSQL superuser. That is not an acceptable production privilege contract, especially with `FORCE ROW LEVEL SECURITY` enabled on FACTACT tables. Function success under a superuser does not demonstrate the correct production boundary.

## Proposed execution contract

1. A dedicated `factact_registry_executor` DB role is `NOLOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`. It owns **only the Registry execution functions**, not business tables. This is a database capability, not an Actor/Grant.
2. Add Tenant-scoped RLS policies **TO that role only**; retain every existing `factact_runtime` policy and its FORCE RLS setting unchanged. Keep exact column/table privileges for Registry source, Change, Evidence and Audit. Person business-field UPDATE is only `display_name` and `registry_revision`; no UPDATE to email, Organization, lifecycle or Grant rows.
3. Privileged function ownership transfers in one migration transaction. PostgreSQL requires temporary role membership and `CREATE` on the target schema to alter a function owner; the migration revokes both before committing. A migration that cannot satisfy these prerequisites fails transactionally.
4. Maintain direct runtime denial for source INSERT, Registry Change transitions and Person name UPDATE. Runtime gets EXECUTE on the three narrow RPCs, with current Tenant and Actor sourced exclusively from a future verified server session. Helper functions remain private.
5. `SELECT ... FOR SHARE` requires UPDATE privilege on at least one column of the locked table in PostgreSQL. For Tenant, Organization, Service, Contract and ServiceRecipient the executor receives that privilege **only on bookkeeping timestamps**; the RPCs do not execute these updates. It does not receive privilege to change ownership/activation/Grant/business fields.
6. The executor remains fail-closed under live Grant revocation, stale Person revision and independent Customer A/B recipients. No automatic self-review or early Commit.

## Verification contract

- Run PostgreSQL migrations from a clean disposable database and all JOIN/SUPPORT regression tests, not just the new Registry tests.
- Assert actual owner from `pg_proc`, no LOGIN/BYPASSRLS, no role memberships left after migration, no persistent schema CREATE and no business-field/Grant writes beyond contract.
- `SET LOCAL ROLE factact_registry_executor` in synthetic tests: Tenant A rows visible only under A's RLS context, invisible under B; `organization_id` UPDATE denied.
- Exercise actual RPCs with the restricted function owner, including same-Service Customer A/B, Reviewer with REVIEW+APPROVE, Grant revocation and stale Person revision.
- Continue browser regression and TypeScript build.

## Remaining No-Go / release decisions

- **Production migrator capability**: confirm it can create a NOLOGIN role, temporarily manage role membership and transfer function ownership without granting ongoing access. A production-like restricted migrator preflight is required; do not assume `postgres` superuser.
- **Deployment/rollback**: transaction rollback is automatic for a failed DDL migration, but rollback **after a committed migration** requires a separately reviewed, forward-only restoration plan that maintains a safe owner and denies unsafe runtime mutation. Do not delete the role or transfer functions back to an arbitrary superuser as an automatic fallback.
- **Authentication**: DB RPC input Actor/Tenant remains a trusted server-internal contract, not a browser input. The HTTP/session anti-impersonation and CSRF Gate is separate, and API/UI cannot be activated by this migration.
- **Independent review**: a passing synthetic CI suite and owner/RLS assertions do not replace DDL/Grant security review, staging integration, real operator login or production approval.

**Status remains Draft / Production No-Go.**
