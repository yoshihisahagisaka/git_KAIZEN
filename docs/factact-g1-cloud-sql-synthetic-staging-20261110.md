# FACTACT G1 — Cloud SQL Synthetic Staging Design and Estimate

Status: **Conditional G1 design pass / infrastructure construction remains
No-Go**, 2026-11-10.

This document resolves the pre-construction G1 design to the extent possible
without enabling APIs, creating resources, changing IAM/Secret Manager, running
migrations or deploying. It is based on Hosted Platform ADR 0009 and the
accepted decision dated 2026-11-10. Draft PR #60 is implementation evidence;
Draft PR #61 is the Canonical parent. Neither PR is changed or merged here.

## 1. Recommendation

Use the following as the first Synthetic Staging candidate, subject to the
pre-Go checks in section 8.

| Item | Recommendation |
| --- | --- |
| GCP project | `pj-factact`; existence was confirmed by an earlier read-only investigation, while billing attachment, organization policy and usable authority remain unverified |
| Region | `asia-northeast1` (Tokyo) |
| Database | Cloud SQL for PostgreSQL 17, Cloud SQL Enterprise edition |
| Machine | `db-g1-small`, shared core, 1.7 GiB RAM |
| Availability | Single zone; no HA; no replica; shared-core has no Cloud SQL SLA |
| Storage | SSD 10 GiB; automatic increase on with a configured 20 GiB increase limit, subject to Cloud SQL critical-maintenance exceptions |
| Data | Synthetic data only; no real customer data |
| Backup | Standard backup, daily, seven retained automated backups; explicit `asia-northeast1` single-region location candidate |
| PITR | Enable initially with three days of transaction logs; keep seven backups |
| Cloud Run | Tokyo, request-based billing, 1 vCPU / 512 MiB, minimum 0, **service-level maximum 2**, concurrency 20 candidate |
| DB pools from PR #60 | Runtime maximum 5 plus OIDC Session Minter maximum 1 per container |
| Cost control | Project-scoped monthly budget alerts; 50%, 80%, 100% actual and 100% forecast; service metrics and storage alerts |

The explicit storage limit is required because the Cloud SQL default is
unlimited automatic growth. The configured 20 GiB limit bounds ordinary
automatic growth while leaving room for migration, WAL and synthetic test
growth; it is not an absolute hard cap because Cloud SQL may override the
automatic-increase settings for critical database maintenance. Reaching the
configured limit can reject writes or take the database offline, so alert
before 70%, 80% and 90% consumption, keep at least 20% free for maintenance and
monitor provisioned bytes and cost rather than assuming 20 GiB can never be
exceeded.

`db-f1-micro` is not recommended. Its 0.6 GiB memory and default 25 PostgreSQL
connections leave too little memory and connection headroom for the two pools,
revision overlap, migration and administration. `db-g1-small` has 1.7 GiB and a
default 50 connections. Both are shared-core and outside the Cloud SQL SLA, so
neither is a future production recommendation.

## 2. Availability and compatibility evidence

Google's region matrix lists Tokyo as supporting Cloud SQL Enterprise general
purpose shared-core machines. The machine-series documentation lists
`db-f1-micro` at about 0.6 GiB and `db-g1-small` at 1.7 GiB, with SSD support.
Cloud SQL supports PostgreSQL 17, and Enterprise edition supports PostgreSQL 17
even though Enterprise Plus is the default edition for PostgreSQL 16 and later.
Therefore the requested PostgreSQL 17 + Enterprise + `db-g1-small` combination
is documented as available, but the edition must be selected explicitly during
a separately approved build.

Sources:

- [Cloud SQL PostgreSQL region availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview)
- [Cloud SQL PostgreSQL machine series](https://docs.cloud.google.com/sql/docs/postgres/machine-series-overview)
- [Cloud SQL editions](https://docs.cloud.google.com/sql/docs/postgres/editions-intro)
- [Cloud SQL PostgreSQL versions](https://docs.cloud.google.com/sql/docs/postgres/db-versions)
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing)

## 3. Alternative comparison

| Dimension | `db-g1-small` (recommended) | `db-f1-micro` (cost alternative) |
| --- | ---: | ---: |
| Shared CPU | Approximately 0.5 vCPU allocation | Approximately 0.2 vCPU allocation |
| Memory | 1.7 GiB | 0.6 GiB |
| PostgreSQL default `max_connections` | 50 | 25 |
| Tokyo provisional compute rate | USD 0.046/hour | USD 0.014/hour |
| 720-hour compute | USD 33.12 | USD 10.08 |
| Cloud SQL SLA | Not covered | Not covered |
| Connection result | Fits the bounded plan in section 6 | Does not fit rollout envelope without reducing pools or max instances to 1 |
| Workload risk | Still shared-core; acceptable only for synthetic staging | High memory/CPU pressure and weak connection margin |

The Tokyo compute rates above are **provisional, not a contractual quote**.
Google's official pricing page confirms regional pricing and provides the
region selector, but its text endpoint exposed the Iowa default rather than the
selected Tokyo values during this investigation. The Tokyo values were
cross-checked on 2026-11-10 against catalog-derived displays that state they
were updated from Google Cloud Billing Catalog data. Before a construction Go,
an authorized operator must record a dated official Pricing Calculator export
or Cloud Billing Catalog quote for the intended billing account.

Cross-checks, not substitutes for the required official quote:

- [Tokyo Cloud SQL catalog-derived comparison](https://instances.usage.ai/gcp/sql/region/asia-northeast1)
- [Tokyo managed database price comparison](https://pickx.kr/en/servers/database?region=tokyo)

## 4. Tokyo estimate

### 4.1 Assumptions

- Calculation date: 2026-11-10.
- Currency: USD, excluding tax, support plans, discounts and currency
  conversion.
- Month: 30 days / 720 hours.
- Cloud SQL compute: provisional Tokyo catalog rates above.
- Tokyo SSD: USD 0.221/GiB-month provisional catalog-derived rate.
- Tokyo standard backup used storage: USD 0.104/GiB-month provisional
  catalog-derived rate.
- Provisioned SSD: 10 GiB. Backup billing is based on used backup bytes, not
  seven times provisioned storage. The estimate uses a conservative 10 GiB
  used-backup footprint; incremental backups can be smaller.
- Cloud Run: Tokyo request-based billing, 1 vCPU, 0.5 GiB, 50,000 requests per
  month, 0.5 seconds of billable active time per request, no minimum instance.
- Cloud Run gross calculation ignores free-tier credit so the estimate remains
  useful if the billing-account free tier is already consumed.
- Secret Manager: two active secret versions and 10,000 access operations.
- Logs: under 1 GiB/month and 30-day retention. Network: Cloud Run and Cloud
  SQL in the same region, no internet egress, no Serverless VPC Access
  connector included. The final G2 connection design can change this.

### 4.2 Thirty-day calculation

| Component | Formula | Estimated USD |
| --- | --- | ---: |
| `db-g1-small` compute | 0.046 x 720 hours | 33.12 |
| SSD | 0.221 x 10 GiB | 2.21 |
| Standard backup | 0.104 x 10 GiB used | 1.04 |
| Cloud Run CPU | 25,000 vCPU-seconds x 0.000024 | 0.60 |
| Cloud Run memory | 12,500 GiB-seconds x 0.0000025 | 0.0313 |
| Cloud Run requests | 0.05 million x 0.40/million | 0.02 |
| Secret Manager versions | Two versions; within six-version free allowance | 0.00 |
| Secret accesses | 10,000 x 0.03/10,000, before any applicable free allowance | 0.03 |
| Logging / standard Google metrics | Below documented free allotments | 0.00 |
| Same-region data transfer | Assumed no charge | 0.00 |
| **Total, before tax** | | **37.05** |

If the Cloud Run free tier is available, the stated usage is within its CPU,
memory and request allowances and the expected Cloud Run line becomes USD 0,
reducing the total to about **USD 36.40**. Free-tier availability is billing
account-wide and must not be assumed for budget authorization.

Backup sensitivity at the provisional USD 0.104/GiB-month rate:

| Used backup footprint | Monthly backup estimate |
| ---: | ---: |
| 1 GiB | USD 0.10 |
| 10 GiB base case | USD 1.04 |
| 70 GiB full-equivalent worst-case for seven copies | USD 7.28 |

Cloud SQL backups are incremental after the first backup, so 70 GiB is a
bounding case, not the expected result.

### 4.3 PITR cost difference

For new Cloud SQL Enterprise instances, PITR write-ahead logs are stored in
Cloud Storage in the same region and Google documents no additional per-instance
charge for those logs. The modeled direct price difference is therefore **USD
0.00**. PITR and backups still add some performance and storage use; actual disk
and workload metrics must be observed. Enterprise transaction-log retention is
1–7 days. Three days is selected because this is synthetic staging and seven
automated backups already provide the daily recovery baseline.

Sources:

- [PITR restore and log storage](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/restore)
- [Backup options and retention](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options)
- [Cloud SQL instance settings](https://docs.cloud.google.com/sql/docs/postgres/instance-settings)

### 4.4 Time-boxed validation alternatives

Storage remains billable while a Cloud SQL instance is stopped. Compute is
billed while its activation policy is `ALWAYS`; `NEVER` keeps the instance off.
For a ten-calendar-day validation window:

| Operation model | Compute | SSD for 10 days | Backup base case for 10 days | Cloud Run + secrets upper case | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Continuous 240 hours | 11.04 | 0.74 | 0.35 | 0.68 | **12.80** |
| Eight hours/day, 80 running hours | 3.68 | 0.74 | 0.35 | 0.68 | **5.44** |

Stopping requires an explicit operating procedure and makes the service
unavailable; it must not be automated until a separate Go defines ownership and
failure handling. After validation, choose one of these actions in review:

1. Keep stopped for a short, dated review window: no compute, but storage and
   backups continue to accrue.
2. Delete the instance without retained/final backups after evidence export:
   no residual Cloud SQL storage cost, but no Cloud SQL restore path.
3. Delete and retain one final backup for a defined period: backup storage cost
   continues until retention expiry. At 10 GiB, the provisional cost is about
   USD 1.04/month; verify the actual used bytes and location price.

Deletion is never automatic. The owner must first confirm that all required G1
through G5 evidence is stored outside the instance and that no retained backup
contains prohibited data.

Sources:

- [Start and stop Cloud SQL PostgreSQL](https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance)
- [Cloud SQL PostgreSQL FAQ](https://docs.cloud.google.com/sql/docs/postgres/faq)

## 5. Backup and restore design

### Backup policy

- Use Cloud SQL standard backups, not enhanced Backup and DR, for this bounded
  synthetic stage.
- Take one automated backup daily in a low-use JST window and retain seven.
- Set the location explicitly rather than accepting an implicit nearest
  multi-region. The initial candidate is `asia-northeast1`, whose single-region
  backup is replicated across zones. This protects against a zonal failure but
  is not regional disaster recovery.
- Enable PITR with three days of logs. Seven retained backups exceed the log
  window and avoid the documented edge case where equal backup/log retention
  can provide less than the nominal log interval.
- Do not take indefinite on-demand backups. Any pre-test on-demand backup must
  have a named owner and deletion date.
- Enable deletion protection while the validation is active. Final deletion
  remains a separately approved operation.

An `asia` multi-region backup is the resilience alternative. Select it only if
organization policy, data-location policy and the official backup quote are
confirmed. Synthetic-only data reduces confidentiality impact but does not
remove cost and retention governance.

### Restore test procedure

The restore test is a future state-changing action and is not executed by this
document.

1. Record source instance ID, PostgreSQL major/minor version, backup ID,
   timestamp, used bytes and current migration version without credentials.
2. Select the newest successful automated backup and restore it to a temporary,
   isolated Tokyo instance/database with no Cloud Run traffic and synthetic
   data only.
3. Use the separately approved Migration/Admin principal to verify migration
   history and schema objects. Never use Runtime as owner or migrator.
4. Connect with the exact restricted Runtime and OIDC Session Minter roles and
   run startup-role checks, RLS negative tests, authentication/audit checks and
   a synthetic read/write smoke test. Do not submit real forms or use real data.
5. Compare expected row counts/checksums for a predeclared synthetic fixture,
   verify `ENABLE/FORCE ROW LEVEL SECURITY`, exact grants and function owners,
   and confirm no secret appears in logs.
6. Measure recovery time from restore start until the restricted smoke test
   passes. Record RTO evidence; record the selected backup timestamp as RPO
   evidence.
7. Obtain deletion approval for the temporary restore target. Confirm retained
   backup policy before deletion.

Pass requires: successful restore with the same PostgreSQL major version, 100%
fixture checksum/row-count match, all migration versions present, all restricted
role/RLS/auth/audit checks passing, no privilege broadening, no real data or
secret exposure, and measured RTO/RPO evidence within the limits approved
before the test. RTO and RPO numeric targets are still an owner decision; until
set, the restore Gate cannot pass.

## 6. Connection capacity

### Evidence from Draft PR #60

`apps/web/src/server/persistence/database.ts` creates two independent Node `pg`
pools:

- Runtime pool: `max: 5`.
- OIDC Session Minter pool: `max: 1`.
- Both use a 5-second connection timeout and 30-second idle timeout.

The Registry paths in the current PR #60 server use the Runtime pool. The
Registry Executor is a restricted database/function ownership boundary, not a
third application pool in the inspected code. The Registry migration preflight
uses one separate connection. No Cloud Run maximum-instance configuration is
present in PR #60; G1 must supply the deployment cap.

### Recommended envelope for `db-g1-small`

| Consumer | Calculation | Connections |
| --- | ---: | ---: |
| Normal Cloud Run maximum | 2 containers x (5 Runtime + 1 OIDC) | 12 |
| Revision replacement envelope | 4 containers x 6 | 24 |
| Exceptional replacement/spike planning envelope | 6 containers x 6 | 36 |
| Migration | one exclusive connection; no deployment traffic | 1 |
| Administration/restore operator | maximum two concurrent | 2 |
| Monitoring/tool reserve | one | 1 |
| **Conservative application total** | 36 + 1 + 2 + 1 | **40** |
| `db-g1-small` default | | **50** |
| Remaining headroom | | **10** |

The 40-connection figure is an evidence-driven validation stop threshold, not
a guaranteed maximum connection count or a Cloud Run/Cloud SQL enforcement
limit.
Google documents that maximum instances can be temporarily exceeded during
traffic spikes, maintenance and revision changes. Use a **service-level max of
2**, min 0, controlled synthetic load and no traffic split during migration.
Migration must run with application traffic quiesced and must not coincide with
a revision rollout or restore test. Alert at 35 active client connections and
stop the test when observed connections reach 40; an overshoot remains possible
between observations. Confirm the live `SHOW max_connections` value, sampling
interval and Cloud SQL reserved connections before any workload.

This makes `db-g1-small` conditionally viable for synthetic staging. It does
not establish performance suitability: shared CPU, 1.7 GiB memory, pool wait
time, connection churn and actual Golden Test latency must be measured in G4.
If Cloud Run must exceed two instances, first reduce application pool limits or
move to a dedicated-core tier; do not raise `max_connections` without memory
evidence.

`db-f1-micro` defaults to 25 connections. Even a four-container revision
overlap uses 24 application connections before migration/admin reserve, so it
fails this plan.

Sources:

- [Cloud SQL PostgreSQL flags and default connection values](https://docs.cloud.google.com/sql/docs/postgres/flags)
- [Connect from Cloud Run and connection limits](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Cloud Run maximum-instance behavior](https://docs.cloud.google.com/run/docs/configuring/max-instances-limits)

## 7. Monitoring and cost controls

No alert or budget is created by this design. A separately approved build
should configure:

- monthly project budget using the official approved quote plus contingency;
  alert at 50%, 80% and 100% actual and 100% forecast;
- acknowledgement that an alerts-only budget does not cap spend;
- Cloud SQL alerts for CPU, memory, disk utilization, connections, failed
  connections, instance availability and backup failure/age;
- thresholds: connections warning 35 / stop 40, disk warning 70% / critical
  80% / stop new test data at 90%, and no successful backup within 26 hours;
- Cloud Run instance count, 429/5xx, request latency and billable instance time;
- log exclusions/sampling review before exceeding the first 50 GiB/project/month
  free Logging allotment; retain ordinary logs for 30 days; and
- weekly cost review during the bounded validation and an explicit end-date
  review owner.

The estimate assumes ordinary Google Cloud service metrics and less than 1 GiB
of logs, so Monitoring/Logging are USD 0 in the model. Custom metrics,
Prometheus, VPC Flow Logs, extended retention, connector compute or high-volume
application logs are not included.

Sources:

- [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Google Cloud Observability pricing](https://cloud.google.com/products/observability/pricing)
- [Secret Manager pricing](https://cloud.google.com/security/products/secret-manager)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)

## 8. Fit/Gap and G1 decision

| G1 item | Result | Remaining condition |
| --- | --- | --- |
| Tokyo / PostgreSQL 17 / Enterprise / shared core | Fit | Explicitly select Enterprise; do not accept the PostgreSQL 17 Enterprise Plus default |
| `db-g1-small`, single-zone, 10 GiB SSD | Fit for synthetic staging candidate | No SLA; validate performance in G4 |
| `db-f1-micro` alternative | Gap | Connection and memory envelope is insufficient |
| Monthly estimate | Conditional fit | Capture official Tokyo Calculator/Billing Catalog quote; current Tokyo rates are provisional |
| Daily backup / seven retained | Fit | Confirm explicit backup location and organization policy |
| PITR | Fit; recommend three days | Verify settings and actual storage/performance after creation |
| Restore readiness | Design complete, execution gap | Approve RTO/RPO and execute a synthetic restore under a separate Go |
| Storage growth | Fit with a configured 20 GiB increase limit | Cloud SQL can override it for critical maintenance; alerting and an operational owner are required |
| Connection budget | Conditional fit at Cloud Run max 2 | Treat 40 as a measured stop threshold, not a guaranteed maximum; verify live `max_connections`, sampling, reserved connections and rollout behavior |
| End-of-test cost | Design complete | Named owner, evidence location and deletion/retention Go required |

**G1 decision: Conditional Go for G2/G3 planning; No-Go for infrastructure
construction.** The candidate architecture is technically available and the
bounded cost/connection model is viable. Before any construction Go, all of the
following must be attached to the approval record:

1. an official dated Tokyo quote for compute, SSD and backup storage in the
   intended billing account and currency;
2. confirmation that the previously observed `pj-factact` project has the
   required billing attachment, organization policies and usable authority for
   the selected region, edition and backup location;
3. approved monthly budget amount, alert recipients, cost owner and validation
   end date;
4. approved RTO/RPO targets and restore-test owner;
5. confirmation of Cloud Run service-level max 2 and the connection stop
   thresholds; and
6. a separate Go for every state-changing GCP, restore or deletion action.

## 9. Handoff to G2 and later gates

- G2 must choose public-IP Cloud SQL Auth Proxy/connector versus private IP and
  Direct VPC egress. This document prices no VPC connector and authorizes
  neither path.
- G2 must define exact service accounts, Secret Manager versions/access rate,
  CA mode, credential rotation and the mapping from IAM identity to the
  separate Runtime and OIDC database roles.
- G3 must prove PostgreSQL 17 compatibility for all Supabase CLI v2 migrations,
  extensions, role creation, ownership transfer, grants and rollback using the
  exact Migration/Admin principal.
- G4 must validate shared-core CPU/memory, pool saturation, `max_connections`,
  Golden Tests, RLS, authentication, audit and actual cost metrics.
- G5 remains the separately governed one-Service Synthetic Registry Policy
  validation from ADR 0009. Draft PR #60 is not activated by G1.
- Production remains No-Go. Shared-core, single-zone Synthetic Staging evidence
  is not a production sizing or availability decision.

## 10. Explicitly not performed

No GCP API was enabled. No project, Cloud SQL, Cloud Run, database, backup,
budget, alert, IAM binding, service account, secret or network was created or
changed. No migration, restore, form submission, real-data load, Registry
Policy activation, deployment or production operation occurred. Draft PR #60
and #61 were not changed or merged.
