# ADR 0009: Hosted Cloud SQL platform

Status: Accepted as platform direction, 2026-11-10. Resource creation and
deployment are not authorized by this ADR.

## Context and decision history

ADR 0001 accepted Supabase PostgreSQL and Supabase CLI migrations for the
September 2026 bootstrap while requiring ordinary-PostgreSQL portability. ADR
0003 established the shared-database Tenant RLS and restricted-role execution
model. Those decisions remain valid for local development, migration history
and security boundaries.

The hosted target now needs an explicit GCP direction without treating the
historical Supabase choice as a reason to bind FACTACT Core to a vendor. This
ADR changes only the hosted-platform selection.

## Decision

- Local development retains the current Supabase CLI plus PostgreSQL workflow,
  existing SQL migrations, migration history and test environment.
- Hosted staging targets GCP Cloud Run plus a FACTACT-dedicated Cloud SQL for
  PostgreSQL instance. `pj-factact` is the project candidate. The instance must
  not be shared with another service, and the first staging dataset is
  synthetic only.
- Production may use Cloud Run plus Cloud SQL, but must be isolated from
  staging in data, credentials and operational authority. Production
  construction, migration and deployment each require a separate Go decision.

The dedicated instance is a FACTACT service/environment boundary. Within an
environment, the approved shared-database plus Tenant RLS model remains.

## Reasons

- It aligns hosted compute and database operations on GCP while retaining the
  existing Cloud Run-compatible application boundary.
- A dedicated FACTACT database avoids accidental authority and lifecycle
  coupling with other services.
- PostgreSQL portability lets the existing migration and test assets be
  evaluated without redesigning FACTACT Core.
- Synthetic-first staging permits compatibility and security verification
  without real customer data.

## Authority and connection boundaries

Cloud SQL adoption must not expand authority. Hosted staging must preserve:

- `ENABLE/FORCE ROW LEVEL SECURITY` and fail-closed Tenant policies;
- dedicated Runtime, OIDC Session Minter and Registry Executor database roles;
- separate Migration/Admin and Runtime authority;
- exact table, column and function grants, restricted function ownership and
  fixed `search_path` for `SECURITY DEFINER` functions;
- the existing authentication, audit and authorization model; and
- Change -> Verify -> Commit as the delivery sequence.

Cloud Run service accounts, IAM and database roles are distinct boundaries.
The selected connection method must bind only the intended service account,
store credentials or connection material in Secret Manager, avoid unrestricted
public database exposure and map to the exact restricted database role. The
final connector/network path, IAM bindings and secret lifecycle are Gate G2
decisions, not assumptions in this ADR.

## Migration policy

Supabase CLI remains the owner of the existing SQL migration history; no second
divergent migration history is introduced. Before execution, Supabase CLI v2
migrations must be checked against the selected Cloud SQL PostgreSQL version
and exact migration principal. The check includes extensions, role creation,
role attributes, ownership transfer, grants, transaction behavior, rollback
and the removal of temporary privileges.

An incompatibility must be recorded and reviewed. It must not be resolved by
granting Runtime ownership, superuser, `BYPASSRLS`, broad schema privileges or
another authority expansion.

## Required verification gates

- **G1 — Regional operations and cost:** confirm the Tokyo-region topology,
  monthly cost, backup/recovery policy and budget monitoring.
- **G2 — Identity and connectivity:** confirm IAM, service accounts, Secret
  Manager and the Cloud Run-to-Cloud SQL connection method.
- **G3 — Migration and roles:** prove compatibility for migrations, database
  role creation and ownership changes under the exact hosted principals.
- **G4 — security and runtime behavior:** pass RLS, authentication, audit,
  Golden Test and database-connection-count verification.
- **G5 — synthetic Registry validation:** in synthetic staging, validate
  Registry Policy for one Service before any broader consideration.

All five gates are review gates. Recording them does not authorize their
state-changing portions.

## No-Go conditions

This decision and its documentation PR do not authorize:

- enabling GCP APIs;
- creating Cloud SQL or Cloud Run resources;
- changing IAM or Secret Manager;
- executing hosted migrations;
- loading real customer data;
- deploying to production;
- applying Registry Policy to a real Service; or
- merging this documentation PR to `main`.

Each action requires its own applicable Go decision. A failed compatibility or
security gate is a stop condition; the existing role, RLS, authentication or
audit model must not be weakened to continue.

## Consequences

Staging design work can now evaluate a concrete hosted target, but region,
PostgreSQL version/tier, high availability, backup objectives, budget, network
path, IAM bindings, secret lifecycle, migration principal and connection pool
limits remain unresolved until G1-G4. Registry Policy remains independently
governed and must satisfy G5; this ADR does not merge or activate Draft PR #60.
