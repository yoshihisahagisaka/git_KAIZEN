# FACTACT G5 — Current Core Synthetic Hosted Preflight (2026-11-22)

Status: **READ-ONLY PREPARATION — HOSTED AND PRODUCTION NO-GO**.
Owner: FACTACT Core architecture lane. Scope: [Issue #93](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/93). No GCP action performed by this document.

## 1. Do not reuse stale acceptance numbers

| Evidence baseline | Ordered migrations | FORCE RLS tables |
| --- | ---: | ---: |
| Historical [G5 2026-11-14](factact-g5-hosted-synthetic-staging-runbook-20261114.md), Registry-only | 34 | 31 |
| [Core S3c-1B PR #90](https://github.com/yoshihisahagisaka/git_KAIZEN/pull/90) HEAD `c8dc4c7ee196000ab345cbe7aa5cba8c6a7839fb` | 43 | 35 |
| [Core I1 PR #92](https://github.com/yoshihisahagisaka/git_KAIZEN/pull/92) HEAD `c7c9607e44491bc7777869422090fe80be5fb196` | 43 | 35 |

CI evidence: [PR #90 #45031056298](https://github.com/yoshihisahagisaka/git_KAIZEN/actions/runs/45031056298): Unit 77 / DB 391 / Browser 39 PASS. [PR #92 #45031359100](https://github.com/yoshihisahagisaka/git_KAIZEN/actions/runs/45031359100): Unit 77 / DB 392 / Browser 39 PASS. Both include non-SUPERUSER PostgreSQL17 migration and 35 FORCE RLS verification.

**The old 34/31 acceptance is historical, not a target for applying current Core migrations.** Do not overwrite the historical runbook or turn this delta checkpoint into a second migration runner. Before applying any real Hosted migration, count and pin the exact candidate Git migration directory, review the ordered ledger, and reverify the expected counts. Unknown or drift is STOP, not permission to repair or weaken policies.

## 2. Confirmed state versus unknowns

- [Issue #73](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/73) records `pj-factact` Billing link ENABLED on **2026-11-20**. The 5→8 quota approval is separate UNKNOWN and not required for the completed Billing linkage.
- The last recorded Cloud Shell read-back in Issue #73 did **not confirm** the six target APIs or user-managed Service Accounts. This is dated evidence, not a current live state assertion.
- G2 private networking / Auth Proxy v2 local mode and G3 nonlogin Executor, Runtime and OIDC minter separation are accepted designs. They are not evidence that Cloud SQL, IAM or network are already configured.
- Hosted Cloud SQL instance, database, authorized Synthetic Actor identities, deployed images, IAM Conditions, VPC and Secrets: **UNKNOWN / NO-GO** until explicitly approved and read back.

## 3. Cloud Shell read-only preflight (no enable, create, deploy or secret access)

Run manually only in an authorized Cloud Shell session. No changes to GCP are made by these commands. Do not copy credentials or Secret values into issues or logs.

```bash
set -Eeuo pipefail
PROJECT='pj-factact'
REGION='asia-northeast1'

echo '=== Authorized project ==='
gcloud projects describe "$PROJECT" --format='yaml(projectId,projectNumber,lifecycleState)'
echo '=== Billing link (redact account number in shared evidence) ==='
gcloud billing projects describe "$PROJECT" --format='yaml(projectId,billingEnabled,billingAccountName)'
echo '=== Read-only API availability ==='
ENABLED="$(gcloud services list --project="$PROJECT" --enabled --format='value(config.name)')"
REQUIRED=(
  run.googleapis.com sqladmin.googleapis.com compute.googleapis.com
  secretmanager.googleapis.com artifactregistry.googleapis.com iam.googleapis.com
)
for api in "${REQUIRED[@]}"; do
  if printf '%s\n' "$ENABLED" | grep -Fxq "$api"; then
    printf 'API=%s STATE=ENABLED\n' "$api"
  else
    printf 'API=%s STATE=NOT_CONFIRMED_ENABLED STOP\n' "$api"
  fi
done
echo '=== Existing service accounts (metadata only) ==='
gcloud iam service-accounts list --project="$PROJECT" --format='table(email,disabled)'
if printf '%s\n' "$ENABLED" | grep -Fxq sqladmin.googleapis.com; then
  echo '=== Existing Cloud SQL instances (metadata only) ==='
  gcloud sql instances list --project="$PROJECT" --format='table(name,region,state,databaseVersion)'
else
  echo 'SQLADMIN API not confirmed; skip instance inventory (NO-GO)'
fi
if printf '%s\n' "$ENABLED" | grep -Fxq run.googleapis.com; then
  echo '=== Existing Cloud Run services (metadata only) ==='
  gcloud run services list --project="$PROJECT" --region="$REGION" --format='table(metadata.name,status.url)'
else
  echo 'RUN API not confirmed; skip service inventory (NO-GO)'
fi
echo 'READ-ONLY PRECHECK FINISHED; THIS DOES NOT AUTHORIZE HOSTED CHANGES'
```

Any permission error or missing evidence remains UNKNOWN/STOP. Do not auto-enable APIs or use permission broadening as a workaround.

## 4. Preconditions for separate G5 mutation Go

1. Explicit operator-approved Project, region, budget guard, and Synthetic-only resource names. Confirm present Billing state with live read-back; no re-investigation of the already-resolved 2026-11-20 root cause.
2. Six required APIs confirmed enabled or independently approved for enablement. The read-only check itself must **not** enable them.
3. G2 Private IP / Direct VPC egress / instance-scoped IAM and pinned digest of Cloud SQL Auth Proxy v2 validated. No public database route, no credential fallback, no migration password in serving revision.
4. Approved empty Synthetic staging DB and PostgreSQL 17. Zero migration history and zero business objects **before** applying any migration. A DB with existing rows or unknown migration history is STOP; no `migration repair`.
5. Verified non-SUPERUSER CREATEROLE migration principal; `factact_runtime` and `factact_oidc_session_minter` separated, with nonlogin/no-bypass-RLS Registry **and Device** executor roles. Never disable FORCE RLS.
6. Exact current candidate commit plus ordered SQL ledger. Expected current reference **43 migrations / 35 FORCE RLS** is not a substitute for actual counts and ownership/ACL/procedure read-back after execution.
7. Independently approved Synthetic identities/Grants for proposer, separate reviewer, unauthorized Actor and foreign Tenant. No real-customer data or unapproved account binding.
8. Historical G4 temporary Tenant-specific seed policy lifecycle is reused only after migration Go. Seed and policy removal must be one connection and one transaction; rollback on any failure, with no temporary policies left.

## 5. STOP and next decision

Current position: **Local Core I1 PASS / Hosted execution NO-GO**. This issue authorizes documentary/read-only reconciliation only. No GCP API, Cloud SQL, IAM, VPC, Secret, Migration, seed, Cloud Run deploy, Traffic, Production or PR Merge is authorized. Before any paid or state-changing Hosted operation, obtain a separate specific Go, observe each boundary, and retain nonsecret read-back evidence. Do not add a new layer of generic orchestration or a separate ledger.
