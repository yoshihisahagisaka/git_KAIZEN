# Controlled Customer Pilot — External Evidence Execution Ready v1

Status: **DEVELOPMENT READY FOR AUTHENTICATED EXTERNAL EVIDENCE EXECUTION**  
Date: 2026-09-14

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- Draft PR: #2
- validated head: `4e9d7c504b88e76db319c7ae5cb6c47bfd122253`
- CI run: `34796652282` — **SUCCESS**
- External Evidence tracking: Issue #3 `Controlled Pilot External Evidence Execution`

## 1. Current conclusion

Application/CI-side closure is sufficiently advanced to begin authenticated external Evidence execution.

This does **not** mean Controlled Customer Pilot GO.

Current gate remains:

**Controlled Customer Pilot = NO-GO — EXTERNAL / OPERATIONAL EVIDENCE CLOSURE REMAINS**

## 2. Newly validated execution tooling

The implementation branch now includes:

- `npm run readiness:external-preflight`
  - read-only GCP current-state collector.
  - checks Cloud SQL backup/PITR metadata, Cloud Run configuration, GCS deletion-manifest bucket configuration and expected Secret names.
  - excludes Secret values, raw environment variables and customer Raw data from output.
  - always reports actual execution gates such as restore rehearsal / real AI / OAuth / alert delivery / staging E2E as false until separately evidenced.

- `npm run retention:export-manifest`
  - exports current deletion reconciliation tombstones into the external GCS integrity bundle.
  - immutable upload + readback verification.
  - does not print Raw customer content.

- local restore rehearsal helper updated for current Node 22 runtime and current migration ledger count rather than stale Node20/fixed migration assumptions.

## 3. Latest CI evidence

GitHub Actions run `34796652282` on head `4e9d7c504b88e76db319c7ae5cb6c47bfd122253`: **SUCCESS**.

Validated:
- npm ci / build
- external-preflight syntax check
- local restore rehearsal helper syntax check
- Diagnosis / Preparation / Workspace / Review / Report / Handoff regression
- Security / Policy Closure
- Restore / AI closure
- Retention / Deletion
- Pilot Evidence Capture
- External Manifest integrity
- PostgreSQL 17 readiness
- desktop/mobile browser tests

This is code and CI Evidence only; it is not real GCP environment Evidence.

## 4. External Evidence execution order

Execution is tracked in implementation Issue #3 and must proceed using an authenticated operator environment.

1. Run sanitized read-only External Preflight.
2. Confirm actual Cloud SQL backups/PITR and successful backup history.
3. Confirm GCS deletion-manifest bucket and least-necessary IAM.
4. Execute real deletion-manifest export + immutable upload + verified readback.
5. Perform isolated Cloud SQL restore/PITR rehearsal.
6. Run deletion reconciliation before traffic and verify idempotence + preservation of Approved Report/Handoff/Decision/Audit.
7. Measure internal Pilot RPO/RTO and verify 30-day backup retention.
8. Execute real Anthropic AI-01〜04 and provider-policy validation.
9. Execute real Google OAuth allow/deny cases.
10. Verify Secret Manager/IAM actual access.
11. Verify Cloud Run request-outside CPU, min-instance/multi-instance, claim/lease recovery and deploy/shutdown behavior.
12. Verify ingress/proxy/rate-limit and Monitoring alert delivery.
13. Complete Legal/Privacy customer copy/link and B9 named operational ownership.
14. Execute Human Business Acceptance A〜F.
15. Execute WEB / SALES_VISIT staging E2E with real AI/OAuth/notification.
16. Review dependency findings.
17. Rerun `docs/32` Production Readiness Gate against current code/environment/Evidence.

## 5. Guardrails

- Do not paste Secret values, OAuth tokens, Raw customer data, Transcript contents or DB dumps into GitHub Evidence.
- Business internal RPO/RTO 24h objectives are not an external SLA.
- Technical/provider impossibility, constraint or material cost must be returned as FACT to Business Lane; Development must not silently alter Business Decision.
- AI Suggests. Human Decides. System Records.
- No new FACT Core Object for free diagnosis.
- No automatic atLIB Actor selection.
- Business Decision completed ≠ Production Ready.
- External preflight PASS ≠ restore PASS, real AI PASS, OAuth PASS, Monitoring PASS or Pilot GO.
- main merge remains unauthorized until gate closure and explicit approval.

## 6. Next Development action

Development does not have authenticated GCP control-plane access in the current chat environment. Therefore the next blocker is no longer code generation but execution of the authenticated External Evidence Pack by an authorized operator/Codex environment.

Once that Evidence is returned, Development will update the gate matrix and rerun `docs/32` to produce an Evidence-backed Controlled Customer Pilot GO / CONDITIONAL GO / NO-GO decision.
