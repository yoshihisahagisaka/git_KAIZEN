# FACTACT | Registry migrator preflight and rollback Gate (2026-11-10)

Status: **Draft / production and Merge No-Go**. Stacked on Draft PR #50; does not authorize hosted Supabase/GCP or business data changes.

## Fit/Gap against Canonical

- ADR 0003 requires a separate migration/admin principal from `factact_runtime`, FORCE RLS and no runtime business-table ownership. A synthetic superuser migration PASS is not a hosted-privilege acceptance.
- PR #50 limits the `SECURITY DEFINER` functions to a NOLOGIN, NOBYPASSRLS database executor. Migration owner creation and transfer still depend on the hosted migrator's actual capabilities.
- This Gate adds a **read-only** preflight and a separately authorized **fail-closed disable** operation; it does not invent a new operator/Grant system or silently downgrade RLS.

## Preflight use (read-only)

Before any new Registry Migration is attempted, obtain the designated **migration credential through the existing approved Secret delivery path**. Never copy the credential into a command argument, PR, report or log. Provide it to the process using the task-specific `FACTACT_MIGRATION_DATABASE_URL` environment variable; configure TLS according to the approved connection path (`FACTACT_MIGRATION_DB_SSL=true` when appropriate).

Run from the reviewed commit:

```shell
npm run db:preflight-registry-executor
```

The script executes one SELECT and outputs only role, database name, boolean checks and status. It does not print the URL/password, grant roles or apply migrations.

| Result | Meaning | Allowed next step |
|---|---|---|
| `BEFORE_MIGRATION` + `go=true` | Existing functions/tables are owned by the current migrator; the migrator appears capable of CREATE ROLE and schema changes; executor role is not yet present. | Independent DDL review and staging rehearsal only. |
| `INSTALLED` + `go=true` | Four function owners, role attributes, Tenant FORCE RLS, Grant ACL and absence of leftover membership match the expected installed state. | Audit/rollout gate review, never automatic activation. |
| `INCONSISTENT` or `go=false` | Missing permission, ownership, RLS, role status, function grant or unsafe partial state. | **STOP**. Record exact check names, do not retry a DDL migration or change roles as an expedient workaround. |
| DB connection or SELECT failure | The connection/permission gate is unknown. | **STOP**. Do not infer PASS from an existing CI result. |

Preflight is necessary but not sufficient. Role creation and `ALTER FUNCTION OWNER` may still differ under a hosted operator's policy even when catalog flags appear sufficient. Require staging rehearsal with that *exact* migrator identity before production.

## Transaction and rollback strategy

1. **Migration fails before COMMIT:** treat PostgreSQL DDL as one transaction, verify the migration transaction rolled back and role/function ownership/ACL are unchanged, and STOP for diagnosis. Never retry automatically when the result is unknown.
2. **Migration committed, activation not yet performed:** leave the safe NOLOGIN executor/RLS/immutable source in place. No API route or live Grant is present in this stacked Draft chain. Do not DROP the role or transfer functions back to a superuser to simulate a reverse migration.
3. **Runtime Registry entry must be disabled after activation:** the reviewed `scripts/registry-disable-execution.sql` is a **manual, separately approved** fail-closed operation. It transactionally revokes EXECUTE of the three RPCs from runtime and PUBLIC under the executor owner's authority, restores the original migrator role and revokes the temporary membership. Existing Person/source/Change/Audit data remains intact.
4. **After disable:** independently read back function ACL, executor role membership and behavior, then monitor in-flight operations. A previously started transaction may complete before the revocation lock boundary; an environment-specific quiescence plan remains a production Gate. Re-enabling RPCs needs a fresh explicit approval and repeat of the full security/CI gate.

## Synthetic CI acceptance

- Read-only `INSTALLED` preflight returns PASS on clean migrated fixture and produces no business audit mutation.
- Transient `LOGIN` or missing Registry RLS policy returns `INCONSISTENT` and `go=false`; test transaction rolls back changes.
- The fail-closed SQL disables runtime RPC execution, changes no Person display name and leaves no role membership; caller receives SQLSTATE 42501.
- Existing A/B, concurrent Grant revocation, JOIN and SUPPORT Golden and browser tests remain green.

## Remaining external and release Gates

- Actual hosted migrator name, privileges and schema ownership are **not known** and were not queried.
- Production-like staging rehearsal, backup, explicit migration-version targeting, ongoing SQL review and data-preserving recovery approval are outstanding.
- HTTP/session-bound Registry UI, reviewer return/queue and operator-level administration are separate Draft slices. No Registry mutation is active in production.

**Decision:** Keep PR #47–#50 and this Gate Draft, no Merge/production/real Grant execution.
