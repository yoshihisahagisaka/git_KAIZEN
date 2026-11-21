# FACTACT Core V1 Registry × Device Integration Gate — 2026-11-21

## Scope and immutable inputs

This gate integrates existing reviewed candidates without changing either source branch:

- `main`: `fb4c7a0fab28171698de4d25ffeea28d90fa5c58`
- Registry / Authority / G5 candidate (PR #68):
  `e03b6602890a7a60685db822af93e5615ed8f47d`
- Device S0–S2b-1 candidate (PR #72):
  `b89a3f9ccb7a36dc1a13456fcf42062179ee920b`
- Integration branch:
  `integration/factact-core-v1-registry-device-gate-20261121`
- Issue / acceptance contract: #74

The integration preserves FACT FIRST, Work First, Change → Verify → Commit,
Authority First and One Fact / Multiple Views. It introduces no new generic Core
object, no production data and no hosted resource.

## Integration result

Both source histories merged without Git content conflicts. Runtime SQL exposed
three cross-stack integration conflicts:

1. `changes_exactly_one_source_check` made the Person Registry branch impossible
   by requiring `registry_edit_request_id` to be both present and absent.
2. The same check omitted Registry-source absence from the JOIN branch.
3. The Device migration replaced two accumulated Registry assumptions:
   `REVIEW_RETURN` was omitted from the Evidence type union, and the Registry
   preflight still expected 31 FORCE-RLS tables although the integrated Device
   storage adds two protected tables.

The integration-branch copy of the unpublished Device migration now preserves
all three exclusive source paths:

- JOIN: genuine Work + Action; no Registry or Device request source.
- Person Registry: genuine Registry request; no Work, Action or Device source.
- Device: genuine typed Device request; no Work, Action or Registry source.

Mixed JOIN + Registry provenance is rejected with SQLSTATE `23514`.
`REVIEW_RETURN` and `SOURCE_REFERENCE` coexist without widening Runtime access.
The preflight checks all 33 current `factact` tables with RLS enabled and forced.

## Fit / Gap / Conflict / Unknown

| Area | Result | Integrated evidence |
| --- | --- | --- |
| Existing Core, JOIN, SUPPORT and Explore | FIT | Existing Unit, DB Golden and Browser suites pass unchanged in behavior. |
| Organization recipient and scoped authority | FIT | Same-Tenant customer boundary, active/revoked Grant, session and Runtime denial tests pass. |
| Person Registry Propose → Verify → Commit | FIT | Original RPC, exact Grants, two-Actor controls, revision, audit and rollback regressions pass after Device migrations. |
| JOIN Reality Change | FIT | Existing real JOIN command path passes; injected JOIN + Registry source is rejected. |
| Device S1 storage and S2a command contract | FIT | Domain/application contract and immutable storage tests pass. |
| Device S2b-1 typed source / common Change | FIT, schema-only | Typed request and PROPOSED Change persist with exact identity; no Device or FACT is fabricated and generic Runtime cannot access the source ledger. |
| Device S2b-2 real DB command | GAP | No restricted Device executor / SQL adapter performs authoritative transactional Verify/Commit, S1 field events and Audit. |
| S3 Work / Registry / Device integration | GAP | Customer-scoped Device read and operational JOIN safeguards remain the next accepted slice. |
| Hosted G5 | GAP | Local synthetic/non-superuser gates pass; actual hosted IAM, principal, network, Cloud SQL, migration and deployment read-back remain unexecuted. |
| Production migration/data compatibility | UNKNOWN | No Production or hosted database was accessed by this gate. |

## PostgreSQL 17 acceptance

The repository contains 36 ordered migrations: 34 from the Registry/Authority
stack plus two Device migrations. A disposable PostgreSQL 17 fixture applies the
complete ledger using `factact_migrator` with `CREATEROLE`, without SUPERUSER or
BYPASSRLS, and loads the synthetic seed under active FORCE RLS.

The integrated acceptance additionally proves:

- legitimate Registry and JOIN source paths;
- rejection of mixed provenance;
- typed Device proposal without silent Device creation;
- FORCE RLS on every current Core table;
- Runtime denial for Device source rows and `SOURCE_REFERENCE`;
- continued availability of older Evidence types, including `DIAGNOSTIC`,
  `VERIFICATION` and `REVIEW_RETURN`;
- existing tenant/customer isolation, scoped Grant revocation, idempotency,
  revision conflicts, audit and transaction rollback through the full DB suite.

Device S2b-1 remains synthetic schema acceptance. It is not evidence that the
S2b-2 authoritative Device DB command exists.

## Measured validation

- `npm ci`: PASS; 204 packages installed; audit 0 vulnerabilities.
- `npm run typecheck`: PASS.
- `npm test`: PASS — 8 files / 77 tests.
- targeted integrated DB acceptance: PASS — 1 file / 4 tests.
- affected DB regression after conflict fixes: PASS — 7 files / 36 tests.
- `npm run test:db`: PASS — 34 files / 348 tests.
- `npm run test:browser`: PASS — 39 tests (and production build PASS).
- `git diff --check`: PASS.

The runs emitted the existing `pg` deprecation warning for calling
`client.query()` while a query is already executing. It did not fail a test and
is not changed by this integration gate.

## Gate decision

**Integrated local gate: PASS WITH REMAINING GAPS.**

The Registry/Authority and Device S0–S2b-1 candidates are compatible after the
bounded SQL/preflight fixes above. FACTACT Core V1 is not claimed complete:
S2b-2, S3 and Hosted G5 remain required. Production migration and deployment
remain **NO-GO**.
