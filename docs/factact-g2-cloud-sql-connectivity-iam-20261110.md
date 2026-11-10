# FACTACT G2 — Cloud SQL Connectivity, IAM and Secrets Design

Status: **Conditional G2 design pass / infrastructure construction remains
No-Go**, 2026-11-10.

This document defines the pre-construction G2 candidate for FACTACT Synthetic
Staging. It reconciles the Hosted Platform Canonical in Draft PR #61, the G1
design in Draft PR #62 and implementation evidence in Draft PR #60. It does
not change those PRs, application code or infrastructure. Every action that
enables an API, creates a resource, grants IAM, writes a secret, runs a
migration or deploys a revision requires a separate Go decision.

## 1. Recommendation

Use the following target for the first Synthetic Staging build, subject to the
gates and unresolved gaps in sections 8 and 9:

1. Give the Cloud SQL instance **private IP only** in a dedicated FACTACT VPC
   in `pj-factact`, in `asia-northeast1`.
2. Give the Cloud Run service **Direct VPC egress** to that VPC. Do not create
   a Serverless VPC Access connector for the initial candidate.
3. Run Cloud SQL Auth Proxy v2 beside the application and select the private
   address with `--private-ip`. The first candidate is a TCP listener bound to
   `localhost` only; a shared Unix socket remains a fallback if lifecycle or
   client behavior requires it.
4. Let the Cloud Run workload service account authorize the proxy with
   `roles/cloudsql.client`. The first candidate is an IAM Condition using the
   documented Cloud SQL instance resource attributes to constrain access to
   the one staging instance; its effective permissions and proxy behavior
   must be proven before construction.
5. Keep PostgreSQL built-in authentication and the existing exact roles:
   `factact_runtime`, `factact_oidc_session_minter` and the migration/admin
   role. Do **not** adopt IAM database authentication in G2.
6. Store each database credential as a separate Secret Manager secret and pin
   an immutable secret version in each Cloud Run revision. Never expose the
   migration credential to the serving revision.
7. Keep the G1 service-level maximum of two Cloud Run instances. Proxy
   connections do not increase the PR #60 pool maxima: runtime 5 and OIDC
   Session Minter 1 per application container.

This selection combines private reachability with the proxy's TLS 1.3,
workload identity authorization and automatic server/client identity
verification. Direct VPC egress has no connector VM charge. The proxy does not
create network reachability; it can use private IP only after Cloud Run has VPC
access.

This is a **design candidate, not build authorization**. In particular, the
current application cannot be deployed unchanged against the proposed local
proxy endpoint; section 7 records that incompatibility rather than silently
changing the implementation.

Production must not gain a generic `DATABASE_SSL=false` escape hatch. A later
implementation must introduce an explicit Proxy connection mode whose local
`localhost` hop is non-TLS only because Auth Proxy v2 provides verified TLS on
the remote database hop. Direct database modes must continue to require
verified TLS.

## 2. Connection option Fit/Gap

| Option | Security and operations | Cost | Fit with PR #60 | Decision |
| --- | --- | --- | --- | --- |
| Private IP + Direct VPC egress + Auth Proxy v2 | No public DB address; IAM-authorized connector; proxy-to-DB TLS 1.3 and identity verification; no client certificate distribution | Normal Cloud Run/VPC network transfer; no connector VM charge | Network target and local-hop TLS handling require a later code/config change | **Recommended candidate** |
| Private IP + Direct VPC egress + direct TCP | Google's general private-IP recommendation; lowest connector latency; client must enforce TLS and manage CA/server verification | No connector VM charge | `rejectUnauthorized: true` alone does not document CA delivery, server name, rotation or Cloud SQL SSL mode | Alternative only after explicit certificate design and verification |
| Public IP + embedded Cloud Run Auth Proxy | No authorized network required; connector supplies IAM authorization and TLS | No VPC connector; likely lowest network complexity | Requires Unix-socket/local-hop configuration changes; retains a public instance endpoint | Fallback if private networking is rejected or cannot pass G2 validation |
| Public IP + direct TCP | Requires authorized networks and client TLS/cert management | No private networking cost | Cloud Run egress addresses are unsuitable without additional fixed-egress design | **No-Go** |
| Private IP + Serverless VPC Access connector | Private path; established serverless option | Connector VMs incur charges while provisioned and scale up but not down | Technically possible | Fallback only if Direct VPC egress fails a verified requirement |

The Cloud SQL Node.js Language Connector now exists in official connection
guidance, but introducing it would add an application dependency and change
connection construction. It is not needed when Auth Proxy v2 provides the
connector boundary outside the application, so it remains an alternative Gap
rather than a G2 implementation change.

## 3. Network and TLS boundary

The proposed path is:

`Cloud Run application -> local proxy listener -> Direct VPC egress ->`
`Cloud SQL private IP:5432`

- The application-to-proxy hop must be local to the Cloud Run instance. It
  must not listen on an externally reachable interface.
- The proxy-to-Cloud SQL hop is encrypted with TLS 1.3. The proxy validates
  both workload authorization and Cloud SQL identity; no downloaded database
  client certificate is required.
- Select Cloud Run second-generation execution and pin an approved Auth Proxy
  v2 image digest. Define startup/readiness ordering, failure behavior and an
  update cadence before deployment.
- Scan that pinned proxy image before construction with the approved artifact
  vulnerability scanner. Any **High or Critical** finding is a STOP unless a
  documented, explicitly approved response exists for that exact finding and
  image digest; record scanner, database timestamp, digest, findings and
  disposition as evidence.
- Private IP requires a VPC range for private services access. Exact subnet,
  allocated range, firewall and organization-policy compatibility are not yet
  verified.
- Use `private-ranges-only` egress unless G2 verification finds a concrete need
  to route all traffic through the VPC. This limits the scope and cost of the
  network path.

If the proxy candidate is rejected and direct TCP is selected, construction
must stop until the server CA mode, Cloud SQL `sslMode`, trusted CA bundle,
server name verification, certificate rotation and Node `pg` behavior are
specified and tested. Encryption without verified server identity is not an
acceptable substitute.

## 4. Principal and service-account design

| Principal | Purpose | Minimum candidate access | Explicitly excluded |
| --- | --- | --- | --- |
| Cloud Run runtime SA | Runs the single FACTACT web service and authorizes its proxy | Cloud SQL Client for the staging instance; Secret Accessor on only runtime and OIDC credential secrets | Migration secret, admin/owner DB role, project Editor, SA keys |
| Deployment SA | Creates an approved Cloud Run revision | Narrow Cloud Run deploy permissions and `iam.serviceAccountUser` on the runtime SA | Database secrets and database login |
| Migration SA/job identity | Runs a separately approved migration/preflight operation | Cloud SQL Client and Secret Accessor only for the migration credential | Serving traffic and runtime/OIDC secrets |
| Human/operator group | Break-glass diagnosis under an approved procedure | Time-bounded, auditable elevation only when needed | Standing database owner access |
| Cloud SQL service agent | Google-managed service operation | Google-defined service-agent role only | Application database credentials |

Use user-managed service accounts and Application Default Credentials. Do not
create or mount service-account keys, and do not set
`GOOGLE_APPLICATION_CREDENTIALS` in Cloud Run.

The existing application contains runtime and OIDC Session Minter pools in one
Cloud Run deployable. Therefore one workload service account must be able to
read both serving credentials even though PostgreSQL roles, URLs, pools and
startup checks remain separate. Full IAM isolation of the two credentials
would require a separate process/service boundary and is **not** authorized by
the current Canonical. Keep the current single service and continue separation
with the exact PostgreSQL Roles and independent credentials. Record the IAM
residual risk; do not split the service without a new decision.

`roles/cloudsql.client` grants connection authorization, not database
privileges. PostgreSQL login and RLS remain a separate control. The first
candidate limits the role to the staging instance with an IAM Condition based
on documented `resource.name` and `resource.type` attributes. If condition
support or all proxy calls cannot be proven, STOP and return for an explicit
scope decision; do not silently broaden the grant to project scope.

## 5. Secret handling and rotation

- Use separate secrets for the runtime URL/credential, OIDC Session Minter
  URL/credential and migration URL/credential. Do not store credentials in
  source, image layers, Terraform state output, labels or logs.
- For the current implementation, a version-pinned environment-secret
  reference is the lowest-change fit because PR #60 reads `DATABASE_URL` and
  `OIDC_SESSION_DATABASE_URL`. A mounted secret volume would need new file
  loading code.
- Never reference `latest` for environment variables. Cloud Run resolves an
  environment secret when an instance starts; pinning the version makes a
  revision reproducible. A new version must be activated through a separately
  approved revision.
- Secret Manager rotation schedules only send a Pub/Sub notification; they do
  not rotate PostgreSQL passwords. A runbook and owner are required.
- PostgreSQL gives each login role one current password, so the present model
  does not provide a demonstrated zero-downtime, dual-credential cutover.
  Before build Go, test a bounded sequence: create secret version, change DB
  password under approved maintenance, deploy the pinned revision, confirm
  both pools/startup checks, drain old instances, disable the old secret
  version and document rollback. The acceptable outage/race window remains a
  decision item.
- Set rotation cadence only after the above rehearsal. Ninety days is a
  candidate, not an accepted value. Emergency rotation must revoke and replace
  all affected versions and revisions.

Secret values, notification addresses and credential material must not appear
in Git, PR text or validation output.

## 6. RLS, audit and connection budget

The proxy and IAM service identity establish reachability and connector
authorization only. They must not broaden PostgreSQL privileges or replace the
existing execution model:

- Preserve `ENABLE/FORCE ROW LEVEL SECURITY`, tenant context, runtime role,
  OIDC Session Minter role, Registry Executor ownership boundary and
  migration/admin separation from ADR 0003 and PR #60.
- Do not enable automatic IAM database authentication in G2. It would change
  login names, token lifecycle, URL construction and the exact-role startup
  assertions, and needs a separate Canonical decision and Golden Test update.
- Preserve application audit fields and `application_name`; Cloud Audit Logs
  for IAM/proxy access supplement but do not replace FACTACT's database and
  application audit evidence. Data Access log enablement, retention and cost
  remain a pre-Go item.
- The G1 envelope remains 2 instances × (runtime 5 + OIDC 1) = 12 application
  pool connections, with revision overlap and migration/admin reserves as
  documented in G1. The local proxy multiplexes network establishment but does
  not reduce PostgreSQL session count.
- The G1 observed 40-session value remains a **validation stop threshold**, not
  a guaranteed or enforced maximum. Proxy startup, revision overlap and
  sampling must be included in the load test.

## 7. Implementation Fit/Gap against Draft PR #60

| Evidence in PR #60 | Fit | Gap before deployment |
| --- | --- | --- |
| Runtime pool max 5 and OIDC pool max 1 | Fits G1 capacity plan | Confirm totals during two-instance and two-revision overlap |
| Distinct `DATABASE_URL` and `OIDC_SESSION_DATABASE_URL` | Fits separate PostgreSQL credentials | One Cloud Run SA can read both because they share a service boundary |
| Production requires `DATABASE_SSL=true`; `pg` receives `rejectUnauthorized: true` | Fits direct verified TLS in principle | Does not fit a local proxy/socket hop, where TLS terminates in the proxy; configuration currently cannot express “local hop without TLS, proxy hop verified” |
| URLs create ordinary `pg.Pool` connections | Fits direct TCP | Private proxy listener/socket address and startup dependency are not represented |
| Exact-role, no-superuser, no-BYPASSRLS and no-owner startup checks | Strong fit | Must be included unchanged in hosted validation |
| Migration preflight uses a separate one-connection pool | Fits principal separation | Migration execution identity/job and secret injection are not hosted-platform code/config yet |
| No Cloud Run/Cloud SQL deployment manifest in PR #60 | Correctly outside Registry feature PR | A separately approved infrastructure/config change will be required after G2 Go |

The two connection-configuration gaps are intentional STOP items. G2 does not
change PR #60 to hide them. The next implementation decision must choose one
of these approaches and update tests accordingly:

1. add an explicit proxy mode, initially using `localhost`, that disables TLS
   only on that local hop while preserving production's “verified encrypted DB
   transport” invariant through the proxy; or
2. reject the proxy candidate and fully specify direct private-IP TLS,
   including CA and server-name verification.

## 8. Validation gates

G2 is ready for construction approval only after evidence for all gates is
recorded:

| Gate | Required evidence |
| --- | --- |
| G2-1 Network | `pj-factact` billing and organization policies; VPC/subnet/private-services-access range; Tokyo support; Direct VPC egress quota and IP allocation; no public DB address |
| G2-2 Proxy/TLS | Pinned Auth Proxy v2 digest; `--private-ip`; `localhost`-only listener; explicit application Proxy mode without a generic production `DATABASE_SSL=false`; second-generation Cloud Run; readiness/restart test; verified TLS evidence; Cloud SQL Admin API usage acknowledged |
| G2-2A Proxy image | Approved vulnerability scan of the pinned image digest, with scanner/database timestamp and disposition; High or Critical findings STOP unless an approved response for that exact finding exists |
| G2-3 IAM | Named user-managed SAs; exact role matrix; no default SA/Editor/key; deployer `actAs` boundary; instance IAM Condition result or accepted project scope |
| G2-4 Secrets | Separate secrets and per-secret access; pinned versions; redacted logs; successful rotation and rollback rehearsal without secret disclosure |
| G2-5 Database | Existing exact roles and ownership; RLS/Golden Tests; migration preflight; audit evidence; observed sessions stay below the G1 40-session stop threshold |
| G2-6 Cost | Confirm Direct VPC egress/network charges, private services access effects, Secret Manager operations and optional audit-log ingestion against the G1 estimate |

No test may use real customer data. The first hosted validation remains one
Synthetic Staging service for Registry Policy.

## 9. Unresolved Fit/Gap and decisions required

1. **Application connection mode:** approve the minimal proxy/socket
   configuration change or select and specify direct TLS. Current PR #60 is
   not deployable unchanged under the recommendation.
2. **Private network feasibility:** billing, organization policies, VPC
   allocation, private services access, Direct VPC egress quota and usable
   authority in the already observed `pj-factact` project remain unverified.
3. **Proxy packaging:** choose a supported Cloud Run multi-container/sidecar
   lifecycle or a verified platform-managed connection that can explicitly
   select private IP and Auth Proxy v2. Do not assume public embedded-proxy
   behavior applies to the private path.
4. **Credential rotation:** accept a bounded maintenance window or approve a
   future dual-credential design; define owner, cadence and rollback.
5. **Service-account scope:** prove the documented resource-attribute IAM
   Condition limits Cloud SQL Client calls to the staging instance. Failure is
   a STOP and requires an explicit scope decision.
6. **Audit logs:** decide which Cloud Audit Logs Data Access categories and
   retention are required, and add their ingestion/storage cost.
7. **OIDC IAM residual risk:** accept one workload SA reading both serving
   credentials, or separately approve an application-boundary change.

## 10. G2 decision

**Conditional design pass; build No-Go.** The preferred connectivity and
principal model is coherent with the Canonical PostgreSQL/RLS boundary, but
the application connection-mode gap and unverified project/network/IAM facts
prevent construction. Resolving those items and obtaining an explicit build
Go are required before any API enablement, resource creation, IAM or Secret
Manager change, migration, or deployment.

Production remains **No-Go**. Nothing in this document authorizes production
resources, production data, Registry Policy application to a real service or
merging Draft PRs #60, #61 or #62.

## 11. Official references

- [Choose how to connect to Cloud SQL](https://docs.cloud.google.com/sql/docs/postgres/connection-options)
- [Connect from Cloud Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Connect using the Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy)
- [About the Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/sql-proxy)
- [Configure private IP](https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip)
- [Private services access overview](https://docs.cloud.google.com/sql/docs/postgres/about-private-services-access)
- [Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Compare Direct VPC egress and VPC connectors](https://docs.cloud.google.com/run/docs/configuring/connecting-vpc)
- [Serverless VPC Access](https://docs.cloud.google.com/vpc/docs/serverless-vpc-access)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity)
- [Cloud SQL roles and permissions](https://docs.cloud.google.com/sql/docs/postgres/roles-and-permissions)
- [Cloud SQL IAM Conditions](https://docs.cloud.google.com/sql/docs/postgres/iam-conditions)
- [Secret Manager access control](https://docs.cloud.google.com/secret-manager/docs/access-control)
- [Configure secrets for Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Secret Manager rotation schedules](https://docs.cloud.google.com/secret-manager/docs/secret-rotation)
- [Cloud SQL IAM database authentication](https://docs.cloud.google.com/sql/docs/postgres/iam-authentication)
- [Authorize with SSL/TLS certificates](https://docs.cloud.google.com/sql/docs/postgres/authorize-ssl)
- [VPC pricing](https://cloud.google.com/vpc/pricing)
