# FACTACT Device S1 — customer storage and provenance gate (2026-11-20)

Status: DRAFT / Synthetic DB only / No Hosted or Production mutation.

Business Decisions: #90 and #92. Product S0: Draft PR #69, head 9d606590a678a002c18b3f625b65b0a076aee5c0.
The new S1 branch is stacked on #69. Existing Draft PR #60 and #61–#68 are not modified.

## Exact scope

- Add nullable Organization attribution to Device with same-Tenant composite FK. Legacy devices remain unattributed (NULL); no automatic backfill.
- Add Device registry_revision with legacy default 0. Existing status remains unchanged. Allow operational UNKNOWN without automatically deriving AVAILABLE from a source sheet.
- Add a scoped unique asset key for attributed devices while retaining the old tenant-wide unique constraint. SAME ASSET TAG ACROSS DIFFERENT CUSTOMERS IS STILL BLOCKED. A reviewed cutover after legacy collision analysis is necessary.
- Add one Device-specific append-only field history with SOURCE_ACCEPTED, FIELD_CORRECTED, FIELD_VERIFIED, explicit Evidence reference and original Work reference when present. The raw source state label is deviceStatusClaim, never the operational deviceStatus.
- Enforce FORCE RLS on new history table and grant NO runtime access. Source evidence existence does not prove physical truth; the real customer-file Evidence type and lifecycle are still missing.
- Do not extend Person Registry First Edit, grant authority, create an import API, alter JOIN assignment or create fictitious Work.

## Dependencies and STOPs

1. Original Device table has tenant-wide asset-tag uniqueness. A second, audited migration must reconcile unknown legacy owners and asset collisions before lifting that constraint.
2. Existing JOIN currently treats AVAILABLE and no active relation as assignable. S0's verified status/identity guard has NOT been wired into its list, start, verify and commit pathways. S1 alone must NOT merge or deploy.
3. Existing FACTACT evidence types only express execution/verification. S2 must approve source-document Evidence, retention and privacy; this S1 fixture using synthetic evidence only tests structural FK.
4. Device Field Events have a nullable Change reference for S1; only S2's typed, authorized transactional Command may materialize registry changes. There is no Device update RPC, row lock, idempotent request ledger or atomic Audit yet.
5. Existing S0 policy is pure logic. The customer's Organization, Actor, Service, Recipient, Work and Grant must be resolved live by the server, not from browser-supplied data. Customer-scoped Device Read is an S3 task, not part of this migration.
6. Upstream #66/#68 stack contains G3 security checks assuming 31 tables before S1. S1 adds one later migration; the post-S1 cross-branch table count and regression need explicit reconciliation without editing existing PRs.
7. Source file retention and AI-provider processing remain Business/Security gates. No customer data, file archive, GCP or Production work occurs here.

## Synthetic acceptance

tests/database/device-initial-storage.test.ts is a disposable PostgreSQL-only DB suite.
Checks include legacy quarantine, UNKNOWN, cross-Tenant FK, preserved global uniqueness, RLS/no runtime CRUD, field evidence FK and customer matching, no false VERIFIED, append-only enforcement.

Green CI is local DB acceptance only. Hosted G5, upstream Registry integration, customer Scoped Read, JOIN assignment safeguards and Production remain separate No-Go.

## Next work after S1

S2 typed Device Create/Correction/FieldVerification with exact Grant, verified human, Evidence/Work binding and atomic Change/Audit.
S3 Scoped Device Read, Work-driven field verification and JOIN list/start/recheck/commit safety.
Then synthetic two-customer E2E, security review and explicit release Go.
