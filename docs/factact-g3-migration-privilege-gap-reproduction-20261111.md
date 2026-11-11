# FACTACT G3 — Migration Privilege Gap Reproduction and Resolution Decision

Status: **Reproduced / source-chain correction decision required / Hosted
Migration remains No-Go**, 2026-11-11.

This document records isolated PostgreSQL 17 evidence for the G3 STOP gaps in
Draft PR #64. It compares the current superuser test condition with a
`CREATEROLE`, non-`SUPERUSER` Migration principal and evaluates correction
strategies without modifying Draft PRs #60–#64 or any Migration file.

## 1. Frozen inputs

| PR | Head | Base | Evidence used here |
| --- | --- | --- | --- |
| #60 | `607648da81434fa0a71ea2a37f4943856dcada74` | `feat/factact-registry-policy-eligibility-gate-20261110` | 33 Migration files, Registry implementation and tests |
| #61 | `04531d4d746835be1d4f8972c0b35580d2e65410` | `main` | Hosted Platform Canonical and ADR 0009 |
| #62 | `29c876a50cd0e72aa30d3c2cbd150ef228397f11` | PR #61 branch | G1 design |
| #63 | `defc089af77b5b0e67d46aecd902bb3741e317f8` | PR #62 branch | G2 localhost Proxy/IAM design |
| #64 | `b1db09f1137aaf5f9dcb22428391f86164967ac0` | PR #63 branch | G3 compatibility and original STOP findings |

No referenced PR was changed or merged.

## 2. Isolated reproduction environment

- PostgreSQL `17.10`, from the repository's pinned
  `@embedded-postgres/windows-x64` dependency.
- Two independent clusters, loopback-only, trust authentication, disposable
  data directories under `C:\atlib`.
- Supabase CLI `2.117.0`, exactly the version pinned by PR #60.
- Synthetic/empty databases only; no GCP, Cloud SQL, customer data, IAM or
  Secret Manager access.
- The Node `embedded-postgres` wrapper was not used because the previous
  `uv_os_get_passwd ... ENOMEM` occurred before SQL. `initdb.exe` and
  `postgres.exe` were invoked directly instead.

The two principals were:

| Condition | Principal attributes | Purpose |
| --- | --- | --- |
| Current-test equivalent | `SUPERUSER`, `CREATEROLE` | Control matching the existing PostgreSQL fixture behavior |
| Hosted candidate | `NOSUPERUSER`, `CREATEROLE`, `NOCREATEDB`, `NOREPLICATION`, `NOBYPASSRLS`, `NOINHERIT` | Model Cloud SQL's non-superuser role-management boundary |

`current_user` and `session_user` both identified the expected principal in
the ordinary sessions. During the disposable creator experiment, `SET ROLE`
changed `current_user` to the creator while `session_user` remained the
Migration principal, as expected.

## 3. Minimal SQL reproduction

### 3.1 Non-superuser role creation

After the non-superuser Migration principal executed `CREATE ROLE` for a
NOLOGIN executor, `pg_auth_members` contained this relationship immediately:

| Target | Member | Grantor | ADMIN | SET | INHERIT |
| --- | --- | --- | ---: | ---: | ---: |
| executor | migration principal | bootstrap superuser | true | false | false |

An explicit `GRANT executor TO current_user` added a second row:

| Target | Member | Grantor | ADMIN | SET | INHERIT |
| --- | --- | --- | ---: | ---: | ---: |
| executor | migration principal | migration principal | false | true | false |

The Migration principal could then execute `ALTER FUNCTION ... OWNER TO
executor`. A normal `REVOKE executor FROM current_user` removed only its own
explicit grant. The bootstrap-granted `ADMIN=true`, `SET=false`,
`INHERIT=false` row remained. `REVOKE ADMIN OPTION` issued by the Migration
principal also returned success but did not remove or change that bootstrap
grant.

This directly reproduces the first G3 STOP gap: current
`20261110000300_registry_executor_role.sql` cannot reach the preflight's zero
membership condition under a stock PostgreSQL 17 non-superuser creator.

### 3.2 Function replacement after ownership transfer

After ownership changed to the executor and the explicit SET-capable
membership was revoked, the same non-superuser Migration principal executed
`CREATE OR REPLACE FUNCTION`. PostgreSQL returned:

```text
SQLSTATE 42501: must be owner of function
```

The final `pg_proc` owner remained the executor. Under the superuser control,
the same replacement succeeded after membership removal and preserved the
executor owner. This reproduces the second G3 STOP gap and explains why the
existing true-superuser tests pass.

### 3.3 Disposable role-creator experiment

A minimal alternative was tested inside one explicit transaction:

1. Migration principal creates a disposable NOLOGIN `CREATEROLE` creator.
2. It grants itself SET capability on that creator and executes `SET ROLE`.
3. The disposable creator creates the executor and grants the Migration
   principal SET capability on it.
4. The Migration principal owns the schema/function, grants temporary schema
   `CREATE`, transfers ownership, executes `SET ROLE executor`, replaces the
   function, resets role and revokes schema `CREATE`.
5. The disposable creator revokes the Migration principal's executor
   membership.
6. The Migration principal removes its explicit creator membership and drops
   the disposable creator. Dropping it removes the creator's automatic
   executor relationship.
7. Commit.

Observed final state:

- executor owns the function;
- executor is NOLOGIN and retains no schema `CREATE`;
- `pg_auth_members` contains no relationship to the executor or disposable
  creator;
- Migration principal cannot replace the executor-owned function after
  cleanup (`42501`); and
- an intentional `division by zero` before cleanup followed by `ROLLBACK`
  removed both temporary roles and every membership.

This proves that a bounded PostgreSQL 17 mechanism exists. It does **not**
prove that the current 33-file chain can use it unchanged.

## 4. Current 33-Migration execution evidence

### 4.1 Superuser control

Supabase CLI 2.117.0 applied all 33 files in order.

| Check | Result |
| --- | --- |
| Migration history | 33 rows, `20260909000100` through `20261110001000` |
| Executor attributes | NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB, NOINHERIT |
| Executor memberships | zero |
| Executor-owned functions | seven expected Registry functions |
| FACTACT table RLS | 31/31 ENABLE, 31/31 FORCE |
| Runtime direct Person UPDATE | denied, SQLSTATE `42501` |
| Cross-tenant Person read | zero rows for the wrong Tenant |

This confirms the existing green fixture, but does not establish Cloud SQL
compatibility because the principal is a true superuser.

### 4.2 Non-superuser execution

Supabase CLI 2.117.0 applied the same files to a new database as the
`CREATEROLE`, non-superuser Migration principal.

Files through `20261110000600_operator_policy_admin_read.sql` succeeded and
were recorded. The first failure was earlier than the originally highlighted
`00900`:

```text
20261110000700_registry_policy_eligibility_preview.sql
SQLSTATE 42501: permission denied for function
registry_display_name_policy_eligibility
```

`00700` creates the helper as the Migration principal, transfers it to the
executor, revokes explicit membership, and then tries to grant EXECUTE as the
now-non-owner. A true superuser can do that; the hosted candidate cannot.

After the failure:

- Migration history contained 29 rows through `20261110000600`;
- local timestamps `00700`–`01000` were absent remotely;
- the failed eligibility function did not exist, proving the failing file's
  DDL and history write rolled back together;
- the executor and the earlier five transferred Registry functions remained;
- the bootstrap-granted executor `ADMIN=true`, `SET=false`, `INHERIT=false`
  relationship remained;
- 31 FACTACT tables still had ENABLE and FORCE RLS; and
- Runtime direct Person UPDATE was denied with `42501`.

Behavioral cross-tenant testing on the partial non-superuser database is
**UNKNOWN** because FORCE RLS plus policies limited to Runtime prevented the
non-superuser table owner from loading the required Synthetic rows. The
catalog RLS state is verified; the populated behavioral check passed only in
the superuser control. This also identifies a separate future Synthetic-data
loading procedure Gap, outside this correction decision.

If `00700` were repaired, current `00900` would still fail when it replaces
the executor-owned proposal function without SET-capable membership and
temporary schema `CREATE`.

## 5. Root cause and affected files

The root cause is not Cloud SQL syntax. It is the mismatch between:

- PostgreSQL 17's restricted `CREATEROLE` model and grantor-specific role
  membership;
- the current Migration chain's assumption that `GRANT` then `REVOKE` leaves
  no relationship created by the original role creator; and
- later DDL executed after ownership has moved to a NOLOGIN executor.

Directly affected Migration files are at least:

| File | Effect under non-superuser |
| --- | --- |
| `20261110000300_registry_executor_role.sql` | Leaves the automatic ADMIN relationship after explicit membership revocation |
| `20261110000400_registry_review_return.sql` | Ownership transfer succeeds, but depends on the residual role-administration state |
| `20261110000700_registry_policy_eligibility_preview.sql` | First actual CLI failure: grants EXECUTE after transferring ownership and revoking SET membership |
| `20261110000800_operator_policy_activation.sql` | Repeats temporary membership and ownership transfer; final relationship remains |
| `20261110000900_registry_policy_activation_proposal_gate.sql` | Replaces an executor-owned function without reacquiring ownership authority |

The Registry preflight correctly exposes the residual membership as unsafe.
It should not be weakened to accept an ADMIN-only relationship.

## 6. Correction options

### A. Amend the unpublished Migration chain

Two forms were considered.

#### A1. Keep temporary membership across several files

Create the executor through a disposable creator in `00300`, keep the
Migration principal SET-capable through `00900`, then revoke and drop the
creator in `01000` or a new final file.

Advantages:

- relatively close to the existing SQL;
- enables owner transfer and later replacement; and
- can finish with zero membership.

Problems:

- authority persists across multiple committed Migration files;
- failure after `00300` leaves a SET-capable path until explicit cleanup;
- grant/use/revoke is not atomic across the sequence; and
- several already-reviewed files need coordinated edits.

This is not the preferred form.

#### A2. Defer Registry Executor finalization to one atomic final Migration

For a database that has never applied these unpublished Registry files:

1. Let earlier files create function bodies but do not transfer them to the
   executor or expose new Runtime execution before finalization.
2. Move executor creation, exact grants/policies, all seven ownership
   transfers, final EXECUTE ACLs and cleanup into one last reviewed Migration.
3. Inside that file, use the tested disposable role creator, temporary
   memberships and temporary schema `CREATE`; verify and remove all of them
   before commit.
4. Run the existing read-only Registry preflight immediately after commit.

Advantages:

- grant/use/revoke and role cleanup can be one transaction;
- no executor-admin bridge remains between Migration files;
- failure rolls back every new role, membership, owner and ACL; and
- final invariants match the current Canonical without wider privilege.

Impact:

- `00300`, `00400`, `00700`, `00800` and `00900` require at least ownership/
  ACL reordering; a finalization Migration is added or the unpublished
  Registry slice is squashed;
- hashes/content of already reviewed but unmerged Migration files change;
- any local database that already recorded those timestamps cannot safely
  continue by timestamp alone; it must be treated as disposable and rebuilt,
  or receive a separately designed state-aware transition; and
- PR #60 needs renewed SQL/security review and complete regression testing.

This is the recommended technical direction **if** an explicit exception to
unpublished-Migration immutability is approved.

### B. Add only a new tail Forward Migration

Not viable for a fresh non-superuser database. Supabase CLI stops inside
`00700`, and even a repaired `00700` would stop at `00900`; a later file is
never reached. A tail Migration can help only a database that already
completed the chain under superuser authority, not the required Cloud SQL
bootstrap path.

### C. Pre-provision roles or the Migration principal

Not sufficient without source-chain changes:

- precreating `factact_registry_executor` makes current `00300 CREATE ROLE`
  fail;
- creating it with a non-superuser still produces the automatic ADMIN
  relationship;
- Cloud SQL does not expose a normal PostgreSQL `SUPERUSER` principal;
- permanent Migration-to-Executor membership violates the security boundary;
  and
- external pre/post cleanup would not be atomic with Supabase CLI's Migration
  transaction.

A tightly scoped bootstrap can support option A2, but C alone cannot preserve
the current 33 files unchanged.

## 7. Existing-database and history implications

Supabase CLI identifies applied Migration files by timestamp, not file hash.
Changing the contents of an already recorded timestamp does not reapply it and
can silently create divergent schemas.

Therefore:

- a fresh Hosted database can use an approved amended unpublished chain;
- disposable local/test databases must be reset and rebuilt from the exact new
  commit;
- `migration repair` must not be used to declare changed SQL applied;
- any non-disposable database with `00300` or later recorded requires a
  catalog-driven transition plan, not a reset or silent history edit; and
- the observed partial database with history through `00600` must be discarded
  or restored for this experiment, not resumed with hand-applied SQL.

The current evidence indicates no Hosted or Production database has applied
these PR #60 Draft migrations, but that remains a fact to reconfirm before an
immutability exception is approved.

## 8. Regression matrix

| Required condition | Current superuser chain | Current non-superuser chain | Minimal disposable-creator SQL | Full corrected chain |
| --- | --- | --- | --- | --- |
| Empty DB applies all Migrations | PASS, 33/33 | FAIL at `00700`, 29/33 recorded | Not applicable | UNKNOWN — no source change authorized |
| History equals actual state | PASS | PASS through `00600`; failed file rolled back | Not applicable | UNKNOWN |
| Executor function ownership | PASS, seven functions | PARTIAL, five earlier functions | PASS for one test function | UNKNOWN |
| Temporary membership absent | PASS | FAIL, automatic ADMIN row remains | PASS | UNKNOWN |
| Runtime direct UPDATE denied | PASS | PASS | Not tested | UNKNOWN |
| Cross-tenant RLS denied | PASS with Synthetic rows | UNKNOWN behavior; catalog ENABLE/FORCE verified | Not tested | UNKNOWN |
| Change → Verify → Commit / Policy Gate | Existing PR #60 CI PASS under superuser | Not reached | Not tested | UNKNOWN |
| Existing tests do not regress | PR #60 CI PASS | Current chain cannot complete | Not applicable | UNKNOWN |

No UNKNOWN is reported as PASS.

## 9. Required tests after a Go decision

If A2 is approved, the implementation PR must add a non-superuser PostgreSQL
17 fixture and prove at least:

1. Supabase CLI 2.117.0 applies the exact full chain to an empty database.
2. An intentional failure inside finalization leaves no executor, disposable
   creator, membership, owner transfer, ACL or history row.
3. Success leaves no creator role and no `pg_auth_members` row involving the
   executor.
4. Exactly seven reviewed functions are executor-owned; no business table is.
5. Executor has no LOGIN, BYPASSRLS, CREATEROLE, CREATEDB, schema CREATE or
   unexpected grant.
6. Runtime direct UPDATE and private helper execution remain denied.
7. All FACTACT tables retain ENABLE/FORCE RLS and a two-Tenant test denies
   cross-Tenant access.
8. Registry Change → Verify → Commit, review return, eligibility preview and
   activated Policy Gate Golden Tests pass.
9. Supabase history contains exactly the reviewed timestamps and a second
   `db push` is a no-op.
10. A disposable database representing each supported already-applied state
    follows the approved reset or transition path.

Cloud SQL rehearsal with the exact hosted Migration principal is still
required after local PASS; local PostgreSQL evidence cannot itself authorize
Hosted Migration.

## 10. Gate status and recommendation

### Resolved by this investigation

- both original privilege assumptions are reproduced under PostgreSQL 17;
- superuser/non-superuser behavior is distinguished;
- the first real chain failure is identified as `00700`, with `00900` still a
  subsequent blocker;
- Supabase CLI 2.117.0 file/history rollback behavior is evidenced for the
  `00700` failure;
- final privilege/RLS state is evidenced for the superuser control; and
- a disposable role creator can achieve atomic grant/use/revoke and zero final
  membership in minimal SQL.

### Still open

- approval to amend/reorder unmerged Migration files;
- confirmation that no non-disposable database has recorded affected
  timestamps;
- reviewed A2 SQL and non-superuser automated fixture;
- full 33-file corrected-chain and Golden Test PASS;
- approved Synthetic-data load path under FORCE RLS;
- Cloud SQL-specific rehearsal, backup/restore and G2 Proxy/secret evidence.

### Recommendation

Choose **A2: atomic finalization of the unpublished Registry Executor slice**,
subject to an explicit decision allowing the affected unmerged Migration files
to change and requiring disposable local databases to reset. Do not weaken the
zero-membership preflight, use SUPERUSER/BYPASSRLS, retain permanent
membership, broaden Runtime writes or rely on a tail Forward Migration.

Because A2 changes already reviewed Migration content, this investigation
does not implement it. The required next Go decision must name:

- whether unpublished-Migration immutability may be excepted;
- the affected timestamps/files and reset policy;
- whether finalization is a new ordered file or a reviewed squash;
- the non-superuser test and failure-injection acceptance criteria; and
- the PR #60 re-review owner.

## 11. STOP decision

**G3 STOP is not lifted.** The cause and a technically viable security pattern
are proven, but no authorized corrected full chain exists and the required
regression matrix remains UNKNOWN. This is a source-chain decision blocker,
not permission to execute Hosted Migration.

Nothing here authorizes GCP API enablement, Cloud SQL/Cloud Run/VPC creation,
IAM or Secret changes, Hosted Migration, deployment, real customer data,
Production operations, Registry Policy application to a real service, or
merge/modification of Draft PRs #60–#64.

## 12. References

- [PostgreSQL 17 role attributes](https://www.postgresql.org/docs/17/role-attributes.html)
- [PostgreSQL 17 GRANT and role membership options](https://www.postgresql.org/docs/17/sql-grant.html)
- [PostgreSQL 17 CREATE FUNCTION ownership requirements](https://www.postgresql.org/docs/17/sql-createfunction.html)
- [Cloud SQL PostgreSQL users and roles](https://docs.cloud.google.com/sql/docs/postgres/users)
- [Supabase CLI Migration reference](https://supabase.com/docs/reference/cli/supabase-migration-list)
- [Supabase database Migration deployment](https://supabase.com/docs/guides/deployment/database-migrations)
