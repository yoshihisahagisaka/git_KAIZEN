# FACTACT Hosted Platform Decision — Accepted 2026-11-10

## Approval and scope

Hagisaka approved the hosted-platform direction on 2026-11-10. The approval
covers the Canonical/ADR/Decision Log update only. It does not approve
infrastructure construction, migration, data loading, deployment, Registry
Policy activation or merge to `main`.

## Accepted decision

| Environment | Accepted direction | Current authorization |
| --- | --- | --- |
| Local development | Keep Supabase CLI + PostgreSQL, the existing SQL migration history and current tests. | Continue the existing local workflow. |
| Hosted staging | Target Cloud Run + a FACTACT-dedicated Cloud SQL for PostgreSQL instance; `pj-factact` is the project candidate; use synthetic data only initially. | Documentation and preflight planning only. No resource creation or migration. |
| Production | Cloud Run + Cloud SQL is a candidate, isolated from staging in data, credentials and operational authority. | No-Go until a separate production Go decision. |

The hosted database is not shared with another service. It remains a shared
FACTACT database across Tenants protected by Tenant RLS; dedicated hosting does
not replace the approved tenant model.

## Preserved decisions and confirmed facts

- ADR 0001's September bootstrap application boundary and ordinary-PostgreSQL
  portability remain.
- ADR 0003 requires `ENABLE/FORCE ROW LEVEL SECURITY`, fail-closed policies,
  exact grants, restricted-role tests and separation of Migration/Admin from
  Runtime.
- Existing migrations and tests are managed through the Supabase CLI workflow;
  their Cloud SQL compatibility has not yet been demonstrated.
- The current design includes dedicated Runtime and OIDC Session Minter
  authority. Draft PR #60 separately proposes Registry Executor and per-Service
  Registry Policy behavior with audit and synthetic staging gates.
- Draft PR #60 is unmerged and remains independent. This documentation change
  does not copy its code, execute its migrations, grant live authority or alter
  its branch.
- The existing authentication, audit, authorization and Change -> Verify ->
  Commit principles remain mandatory. Cloud SQL is not a reason to expand
  privileges.

## Required gates before hosted staging action

- **G1:** decide and verify Tokyo-region topology, monthly cost,
  backup/recovery and budget monitoring.
- **G2:** decide and verify IAM, service accounts, Secret Manager and the
  Cloud Run-to-Cloud SQL connection method.
- **G3:** verify Supabase CLI v2 migration compatibility, including database
  role creation, ownership changes, grants and rollback under exact principals.
- **G4:** verify RLS, authentication, audit, Golden Tests and database
  connection counts in the hosted shape.
- **G5:** validate Registry Policy for one Service using synthetic staging.

## Explicit No-Go

No approval has been given to enable GCP APIs, create Cloud SQL/Cloud Run,
change IAM or Secret Manager, run hosted migrations, load real customer data,
deploy production, apply Registry Policy to a real Service or merge to `main`.
Each requires an applicable separate Go decision.

## Remaining decisions and work

1. Complete G1 cost, regional, backup/recovery and budget choices.
2. Select the G2 service-account, connection/network and secret lifecycle
   design without conflating IAM identity with database authority.
3. Select the Cloud SQL PostgreSQL version and exact migration principal, then
   complete a non-production G3 compatibility plan before execution.
4. Define G4 acceptance evidence, including restricted-role, pooled-connection
   and maximum-connection behavior.
5. After the separately governed Registry work is eligible, define the
   synthetic one-Service G5 verification and stop evidence.
6. Obtain separate Go decisions for any state-changing staging action and for
   every production construction, migration or deployment action.

References: `docs/99-ai-development-context.md`, ADR 0001, ADR 0003 and ADR
0009. Draft PR #60 is contextual evidence only and is not a dependency merged
by this decision record.
