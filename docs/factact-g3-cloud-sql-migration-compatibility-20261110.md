# FACTACT G3 — Cloud SQL PostgreSQL 17 Migration Compatibility

Status: **Conditional G3 design pass / Hosted Migration remains No-Go**,
2026-11-10.

This document evaluates the Migration chain at Draft PR #60 commit
`607648da81434fa0a71ea2a37f4943856dcada74` against the Hosted Platform
Canonical in Draft PR #61, corrected G1 in Draft PR #62 and G2 in Draft PR
#63. It is a construction-preparation record only. No Cloud SQL instance was
created, no hosted database was connected to and no Migration was executed.

## 1. Decision summary

The 33 ordered SQL files use PostgreSQL features available in PostgreSQL 17,
and the current isolated test fixture is itself PostgreSQL 17.10. No Supabase
hosted-only schema, extension or API dependency was found in the Migration
chain. Most of the schema is therefore syntactically and architecturally
portable in principle to Cloud SQL PostgreSQL 17.

Static review found one material hosted-privilege blocker:
`20261110000300_registry_executor_role.sql` transfers the Registry proposal
function to `factact_registry_executor` and revokes the migrator's temporary
membership, but `20261110000900_registry_policy_activation_proposal_gate.sql`
later runs `CREATE OR REPLACE FUNCTION` on that executor-owned function without
reacquiring membership. PostgreSQL permits replacement by the owner or a true
superuser. The local fixture runs as a true `postgres` superuser, while Cloud
SQL's `postgres` is explicitly not `SUPERUSER`. Therefore the current green
test does not prove that file can run under the Cloud SQL principal.

The same file has an earlier PostgreSQL 17 role-administration Gap. PostgreSQL
17 automatically gives a non-superuser `CREATEROLE` principal `ADMIN OPTION`
on a role it creates, recorded as a role-membership relationship. Core
documentation states that this bootstrap-superuser grant cannot be removed or
changed by that `CREATEROLE` principal. The Migration executes `CREATE ROLE
factact_registry_executor`, temporarily grants it to `current_user`, then
expects `REVOKE ... FROM current_user` to leave zero rows in
`pg_auth_members`. That expectation is proven only with the fixture's true
superuser. It is not yet shown achievable by Cloud SQL's non-superuser admin,
and the existing Registry preflight deliberately fails if any membership
remains.

G3 is only a **conditional design pass**. Migration execution is No-Go until
the Registry proposal ownership Gap is resolved in the source Migration chain
and independently reviewed, and the exact Cloud SQL migration principal,
Supabase CLI 2.117.0 transaction behavior, connection/secret path,
empty-target history behavior and backup/restore process pass a Synthetic
Staging rehearsal.

## 2. Evidence scope

### Verified from Git and existing automation

- PR #60 pins `supabase` `2.117.0` and `embedded-postgres`
  `17.10.0-beta.17`.
- Exactly 33 `.sql` files exist under `supabase/migrations`; lexical filename
  order is their dependency order.
- The test fixture sorts those files and applies each in a transaction to a
  fresh PostgreSQL 17.10 database before tests.
- PR #60's current GitHub `bootstrap` checks pass at commit `607648da`.
- The Registry preflight is one read-only catalog query, uses a pool maximum of
  one and redacts the connection URL and credentials.
- Static review found no `CREATE EXTENSION`, Supabase `auth`/`storage` schema
  reference, Vault dependency or Supabase API call in the Migration SQL.
- `gen_random_uuid()` is used, but PostgreSQL 17 provides it as a core
  function; no `pgcrypto` extension statement is required by this chain.
- Tenant tables reviewed by the Registry preflight retain both `ENABLE ROW
  LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.

### Not verified in this investigation

- No SQL was run against Cloud SQL PostgreSQL 17.
- The actual Cloud SQL migration user, database owner, schema owner and
  effective grants do not exist and were not queried.
- Supabase CLI 2.117.0 was not pointed at a Cloud SQL/Auth Proxy target.
- The exact per-file transaction and history-write behavior of CLI 2.117.0 on
  an intentional mid-file failure has not been rehearsed.
- Backup restore and post-restore Migration history consistency have not been
  tested.
- A local PostgreSQL rerun attempted in this environment did not reach SQL:
  `embedded-postgres` failed during initialization with
  `uv_os_get_passwd ... ENOMEM`; all 15 selected tests were skipped. This is
  recorded as an environment limitation, not a Migration failure or PASS.

## 3. Ordered dependency model

Supabase records applied timestamps in
`supabase_migrations.schema_migrations` and compares those timestamps with the
local filenames. The files must remain immutable and be applied in ascending
filename order.

| Phase | Ordered files | Dependency and result |
| --- | --- | --- |
| Foundation | `20260909000100`–`20260911000400` | Creates `factact_runtime`, both schemas, core tables, private session functions, RLS, JOIN, SUPPORT and audit lineage |
| SUPPORT evolution | `20261019000600`–`20261102001200` | Extends existing SUPPORT tables, constraints, triggers and lifecycle; every file assumes prior phase objects |
| Service/Actor authority | `20261106001300`–`20261106001800` | Generalizes Service recipients, creates scoped Grants and identity/session context; assumes SUPPORT and core identity objects |
| Enforcement/audit | `20261107000100`–`20261108000200` | Adds explicit read authority, commit locking, Grant audit and approved Grant management; creates the OIDC Session Minter login role |
| Registry/Policy | `20261110000100`–`20261110001000` | Adds Registry source/commands, Registry Executor, review return and operator policy administration/activation; depends on all earlier tenant, session, service, Grant and audit objects |

The numeric gap before `20261107000300` does not affect ordering; timestamps
need only be unique and ascending. Do not rename, squash or edit an already
reviewed file for Hosted deployment. A correction must be a new forward
Migration.

### Critical internal ordering

1. `20260909000100` creates `factact_runtime`, schemas, base tables and the
   first tenant policies before later grants and foreign keys reference them.
2. `20261108000200` creates `factact_oidc_session_minter` only after the
   verified-session functions and private tables exist.
3. `20261110000100` creates Registry persistence; `...00200` creates the four
   bounded functions under the migrator; `...00300` then creates
   `factact_registry_executor`, grants exact privileges and transfers function
   ownership.
4. `...00400`, `...00700` and `...00800` temporarily grant the executor role
   to the migrator to transfer each later `SECURITY DEFINER` function, then
   revoke membership.
5. `...00900` attempts to replace only the proposal function after the
   eligibility and activation functions exist. At that point the Executor owns
   it and the migrator's membership has been revoked. The file does not
   reacquire membership, `SET ROLE`, or transfer ownership. This works in the
   existing true-superuser fixture but is expected to fail for Cloud SQL's
   non-superuser admin. This is a source-chain STOP Gap, not merely a rehearsal
   check.

## 4. PostgreSQL 17 and Cloud SQL Fit/Gap

| Area | Fit | Gap / required proof |
| --- | --- | --- |
| SQL language | Tables, constraints, PL/pgSQL, identity columns, JSONB, advisory locks, RLS and policies are supported by PostgreSQL 17 | Run every file on the selected Cloud SQL 17 maintenance version |
| Extensions | No extension is created or referenced by schema name | Confirm `gen_random_uuid()` and all catalog functions on the actual instance before write execution |
| Admin model | Cloud SQL's default `postgres` has `CREATEROLE`, `CREATEDB`, `LOGIN` through limited `cloudsqlsuperuser`, but is not PostgreSQL `SUPERUSER` | `...00300` assumes it can remove every executor membership after role creation, and `...00900` relies on true-superuser behavior when replacing an executor-owned function; resolve both before rehearsal |
| Runtime roles | Migrations explicitly create LOGIN, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOBYPASSRLS` roles | Password provisioning is deliberately outside SQL and needs a separately approved Secret procedure |
| RLS | SQL applies `ENABLE` and `FORCE`; PostgreSQL 17 documents that superusers/BYPASSRLS always bypass and owners normally bypass unless forced | Verify runtime owns no business tables and has neither membership nor BYPASSRLS after every Migration |
| `SECURITY DEFINER` | Functions set `search_path=pg_catalog` and remove broad `PUBLIC` execution | Verify every function owner and ACL; owner changes must not leave temporary memberships or schema `CREATE` |
| Supabase CLI history | CLI v2 supports self-hosted database URLs and timestamp history | Exact Auth Proxy connection, secret injection, dry-run output and failure atomicity are unproven |
| Replay | History prevents normally applied files from running again | Most DDL is not idempotent; direct/manual replay fails or can corrupt the intended state |

## 5. Required database privileges

### Bootstrap/migration principal capabilities

The first clean deployment needs a dedicated non-runtime login that can:

- `CONNECT` to the target database;
- `CREATE` schemas in the target database, or own the empty target database;
- create and own tables, sequences, functions, triggers and policies in
  `factact` and `factact_private`;
- `CREATEROLE` for `factact_runtime`, `factact_oidc_session_minter` and
  `factact_registry_executor`;
- grant/revoke object privileges and role membership;
- become a member of the newly created NOLOGIN executor long enough to execute
  `ALTER FUNCTION ... OWNER TO factact_registry_executor`;
- retain ownership of the business tables while the executor owns functions
  only; and
- create and update `supabase_migrations.schema_migrations` through the CLI.

It does **not** require application traffic, `BYPASSRLS`, replication,
Production data, Cloud SQL Admin API mutation rights at runtime, or permanent
membership in the executor. It should not be the Cloud Run runtime or OIDC
service identity.

PostgreSQL `CREATEROLE` is intrinsically broad. G3 cannot yet prove a useful
principal that has enough authority for all three role creations and ownership
transfers but no authority beyond the FACTACT database. The initial candidate
is a dedicated, temporary Migration principal whose secret is exposed only to
the separately approved Migration job, disabled after verification and never
mounted in Cloud Run. Its exact Cloud SQL creation mechanism and grants remain
a G3 decision Gap.

PostgreSQL 17 also automatically grants a non-superuser creator `ADMIN OPTION`
on each role it creates. This affects Runtime and OIDC role administration as
well as the Executor, although the Executor is uniquely blocked by the strict
zero-membership preflight. Disabling the Migration login after deployment does
not erase catalog membership or role-administration authority. Hosted design
must account for these grants explicitly rather than assuming `REVOKE role
FROM current_user` reproduces true-superuser fixture behavior.

### Registry Executor invariants

After `20261110000300` and all later files:

- the executor is `NOLOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`,
  `NOCREATEROLE`, `NOINHERIT`;
- it owns no table and has no role membership;
- it owns only the reviewed Registry execution functions;
- it has no persistent `CREATE` on either schema;
- its table/column grants and 13 tenant policies are the reviewed bounded set;
- Runtime can execute public Registry RPCs but cannot execute private helpers,
  insert a source directly or update authoritative Person name fields; and
- the Migration principal is no longer a member of the executor.

Any mismatch is `INCONSISTENT`, not a reason to grant broader privileges.

The ownership Gap must not be solved by granting `SUPERUSER` or leaving the
migrator permanently in `factact_registry_executor`. The Registry
implementation PR must separately review a bounded correction that obtains
only the temporary ownership authority required for the replacement, performs
the replacement, verifies the owner/ACL, and removes the authority in the same
proven transaction. G3 does not modify PR #60 or select that correction.
The PostgreSQL 17 automatic `ADMIN OPTION` relationship must also be reconciled
with the zero-membership invariant using a Cloud SQL-supported mechanism; G3
does not assume such a mechanism exists.

## 6. Supabase CLI v2 compatibility and target selection

The repository pins CLI `2.117.0`; do not use an unpinned global CLI. Version
2 documentation supports `db push --db-url` and `migration list --db-url` for
self-hosted PostgreSQL. Cloud SQL is treated as that external PostgreSQL
target, not as a Supabase project.

G3 recommends retaining CLI v2 for this first rehearsal because changing CLI
major version and database platform simultaneously would add an unrelated
variable. The current Supabase documentation says v2 remains available for
security and broken-behavior fixes, while v3 changes remote-target flags.

The G2 first candidate is Auth Proxy v2 on `localhost`. The CLI connection URL
must therefore target that loopback listener and disable TLS only for the
local hop; Auth Proxy supplies verified TLS to Cloud SQL. This is not a generic
permission to disable hosted database TLS. The exact CLI v2 URL form and a
secret delivery method that does not expose the password in process listings,
shell history, CI output or PR logs remain unresolved.

Do not use these options during the first rehearsal without separate review:

- `--include-all`, because it can override the normal remote-history guard;
- `--include-seed`, because Hosted staging must control Synthetic data as a
  distinct step;
- `--include-roles`, because FACTACT roles are already ordered SQL Migrations;
- `migration repair`, because it changes history without applying/reverting
  SQL; or
- any linked Supabase project target.

## 7. Recommended Migration procedure

Every mutating step below requires a future explicit Migration Go. G3 only
records the sequence.

### A. Freeze and identify

1. Record Git commit, the 33 filenames and SHA-256 of every Migration.
2. Pin Node, Supabase CLI 2.117.0 and Auth Proxy v2 image digest; attach the G2
   vulnerability-scan PASS.
3. Record project, instance connection name, database name, PostgreSQL exact
   version, empty/Synthetic-only status and all principal names without secret
   values.
4. Confirm no concurrent migration runner and acquire an operational change
   lock outside the database.

### B. Protect and inspect

1. Confirm the G1 backup/PITR settings and create the separately approved
   pre-Migration recovery point; record its identifier and completion.
2. Run read-only inventory: database/schema owners, role attributes,
   extensions, existing objects and Migration history.
3. On an empty target, require no FACTACT schemas/roles and either no history
   table or a documented empty history. Any partial object is STOP.
4. Validate connectivity through the exact G2 localhost Proxy path and exact
   Migration principal without printing the URL or password.

Do not proceed beyond this stage until a reviewed PR #60-compatible resolution
for the `...00900` executor-owned function replacement is present in the exact
commit under rehearsal.

### C. Preflight and plan

1. Run the CLI's read-only Migration list and `db push --dry-run` equivalent
   supported by pinned v2.117.0; capture a redacted plan.
2. Confirm the plan contains exactly the 33 reviewed timestamps in order and
   excludes seed, roles.sql, Vault and any unknown statement source.
3. Record current catalog/ACL checks. For a clean database, use a dedicated
   bootstrap preflight; PR #60's Registry preflight applies only after the
   prerequisite objects exist and must not be misused as an empty-DB check.

### D. Synthetic rehearsal

1. Apply once to a disposable PostgreSQL 17 environment using the same CLI,
   Proxy mode and Migration principal intended for Synthetic Staging.
2. Stop on the first nonzero exit; do not automatically retry.
3. Compare the history table with all 33 filenames and compare catalog
   ownership, grants, RLS/policies and functions against the reviewed commit.
4. Run the Registry read-only preflight. Require `RETURN_INSTALLED`, `go=true`
   and every expected check true.
5. Run all database and Golden Tests with Synthetic data. Record PostgreSQL
   version, test command, counts, duration and results.
6. Exercise an approved intentional failure on a disposable clone to prove
   per-file DDL rollback and history behavior, including
   `20261102001200_support_hr2_ui_minimal.sql`, which contains its own explicit
   `BEGIN`/`COMMIT` unlike the other files.
7. Restore the pre-Migration recovery point to a disposable target and prove
   the restored catalog and history agree before declaring recovery ready.

### E. Approval boundary

Present all evidence for review. Do not proceed from a rehearsal PASS to the
real Synthetic Staging database automatically. Hosted Migration requires a
new explicit Go naming the reviewed commit, target and recovery point.

## 8. Failure, stop and recovery rules

### Immediate STOP conditions

- plan contains an unknown, missing, reordered or changed Migration hash;
- target contains unexpected FACTACT objects, roles, data or history;
- exact database/Proxy/principal cannot be proven without exposing a secret;
- Migration principal lacks a required capability;
- any request arises to grant `SUPERUSER`, `BYPASSRLS`, table ownership to
  Runtime/Executor, or schema-wide privileges as a workaround;
- the `...00900` proposal function replacement still relies on a true
  superuser or permanent Executor membership;
- creation of the Executor by a non-superuser leaves an automatic
  `pg_auth_members`/`ADMIN OPTION` relationship or its cleanup is unproven;
- CLI transaction/history behavior is ambiguous after a failure;
- a temporary role membership or schema `CREATE` privilege remains;
- any table loses `ENABLE` or `FORCE ROW LEVEL SECURITY`;
- Registry preflight is not `RETURN_INSTALLED` with `go=true`;
- backup/recovery point or restore evidence is unavailable; or
- target contains real customer data.

### Failure classification

1. **Failure before a file is recorded:** stop, preserve logs, and prove with
   catalog plus history whether all DDL from that file rolled back. Do not
   assume transactionality.
2. **DDL committed but history absent:** stop as inconsistent. Do not rerun or
   use `migration repair` until an independent catalog diff determines the
   exact state and a recovery action is approved.
3. **History recorded but catalog incomplete:** stop as inconsistent; restore
   the disposable database or approved recovery point. Merely marking the
   timestamp reverted does not undo SQL.
4. **All SQL committed but post-check fails:** disable application access;
   retain evidence; prefer restore or a reviewed forward correction. Do not
   manually broaden roles or edit an applied Migration.
5. **Registry execution must fail closed after install:** the existing
   `scripts/registry-disable-execution.sql` is a separate, manual and
   separately approved operation. It is not an automatic Migration rollback.

### Re-execution safety

The chain is **history-idempotent only**, not SQL-idempotent. `CREATE ROLE`,
`CREATE TABLE`, named policies, constraints and grants assume their expected
predecessor state. Re-execution is safe only when the CLI history proves a
timestamp already applied and therefore skips it. Manual replay, history
repair or partial-file retry is No-Go without an approved state-specific plan.

## 9. Evidence requirements

Retain the following without credentials or Synthetic row contents:

- Git/PR/commit and Migration filename/SHA-256 manifest;
- exact Node, Supabase CLI, Auth Proxy and PostgreSQL versions/digests;
- target identifiers, connection mode and redacted principal names;
- backup/recovery point and restore-test identifiers;
- read-only before/after Migration history;
- dry-run plan and mutating command exit status with secrets redacted;
- per-file start/end timestamp and first failing SQLSTATE, if any;
- before/after role attributes, memberships, owners, ACLs, policies and RLS
  flags;
- Registry preflight JSON, database/Golden Test summary and connection counts;
- approver, Go scope, STOP decisions and any approved exception; and
- confirmation that no real customer data was used.

Never retain database URLs, passwords, Secret Manager values, tokens or
notification addresses in Git, PR text or logs.

## 10. Remaining G3 Fit/Gap

1. **Registry role administration:** PostgreSQL 17's automatic `ADMIN OPTION`
   for the non-superuser role creator conflicts with the zero-membership
   preflight unless a Cloud SQL-supported cleanup/provisioning path is proven.
2. **Registry proposal ownership:** `...00900` cannot be accepted for a
   non-superuser Cloud SQL migrator until its temporary authority and cleanup
   are explicitly designed, implemented in the Registry chain and reviewed.
3. **Cloud SQL rehearsal:** syntax and remaining privilege behavior are not
   proven on an actual PostgreSQL 17 Cloud SQL instance.
4. **Migration principal:** exact creation, database ownership, CREATEROLE
   scope, lifecycle and disablement are undecided.
5. **CLI atomicity:** pinned v2.117.0 failure behavior and the one explicitly
   transactional file need an intentional-failure rehearsal.
6. **Secret delivery:** v2 self-hosted URL handling must fit G2's localhost
   Proxy without leaking credentials.
7. **Initial preflight:** PR #60's Registry preflight is strong for its phase
   but is not an empty-database/bootstrap preflight.
8. **Recovery:** backup creation, restore time and catalog/history consistency
   have not been demonstrated.
9. **Local rerun:** this environment's PostgreSQL test initialization failed
   before SQL, so current evidence relies on static review and the green PR #60
   GitHub checks rather than a new local database PASS.

## 11. G3 decision

**Conditional design pass; Migration execution No-Go.** PostgreSQL 17 syntax
and most object dependencies are portable, but the executor-owned proposal
function replacement and PostgreSQL 17 role-creator membership behavior are
known Cloud SQL privilege blockers in the current chain. The unverified hosted
principal, transaction behavior, secret path and recovery rehearsal are
additional material blockers. None may be treated as an administrative detail
or bypassed with broader privileges.

Production remains **No-Go**. This document does not authorize GCP API
enablement, Cloud SQL/Cloud Run creation, IAM or Secret changes, Hosted
Migration, deployment, real customer data, Production operations or merge of
Draft PRs #60–#63.

## 12. References

- [Cloud SQL PostgreSQL users and roles](https://docs.cloud.google.com/sql/docs/postgres/users)
- [Cloud SQL PostgreSQL extensions](https://docs.cloud.google.com/sql/docs/postgres/extensions)
- [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [PostgreSQL 17 role attributes](https://www.postgresql.org/docs/17/role-attributes.html)
- [PostgreSQL 17 role grants and membership options](https://www.postgresql.org/docs/17/sql-grant.html)
- [PostgreSQL CREATE FUNCTION ownership requirements](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [PostgreSQL object ownership](https://www.postgresql.org/docs/17/ddl-priv.html)
- [Supabase CLI migration reference](https://supabase.com/docs/reference/cli/supabase-migration-list)
- [Supabase database Migration deployment](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI v3 migration guide and v2 support](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3)
- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
