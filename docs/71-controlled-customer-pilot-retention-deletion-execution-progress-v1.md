# Controlled Customer Pilot — Retention / Deletion Execution Progress v1

Status: **DEVELOPMENT IMPLEMENTATION / CI VALIDATED — NOT PILOT GO**  
Date: 2026-09-14

Implementation repo:
- `yoshihisahagisaka/atlib-sales-tools`
- branch: `feat/controlled-pilot-policy-closure`
- code head validated by full CI: `1d8158da6636ebcfca4487e91822bdfebc362eff`
- implementation status-doc update after validation: `624241289c000037e1857332c25240f15e8820ec`
- Draft PR: #2
- CI: `34766054643` — SUCCESS

Source Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- `docs/67-customer-data-ai-continuity-technical-policy-fit-gap-v1.md`
- `docs/68-controlled-customer-pilot-closure-implementation-handoff-v1.md`
- `docs/69-controlled-customer-pilot-closure-slice-a-b-progress-v1.md`
- `docs/70-controlled-customer-pilot-closure-slice-c-d-progress-v1.md`

## 1. Purpose

BD-01 / BD-02のうち、Human-approved deletion/anonymization executionを既存Architecture上で実装し、Controlled Pilot Closureを前進させる。

原則：
- FACT FIRST.
- Humanが承認していない削除をWorkerが独自実行しない。
- Customer Data classificationを推測で広げない。
- Approved Decision EvidenceをRawと同じ扱いで削除しない。
- Restoreによる削除済みRawの恒久復活を防ぐ。
- 新しいFACT Core Objectは追加しない。

## 2. Implemented — Human-approved RetentionDeletionWorker

新規 `RetentionDeletionWorker` は、既存 `diagnosis_deletion_requests` がHumanにより `APPROVED` になっている場合のみ実行する。

Worker自身はRequest作成、Scope拡張、Approvalを行わない。

Execution is transactional, audited, and idempotent.

### Current exact destructive mapping

#### GENERAL_RAW_DIAGNOSIS
- `survey_responses.raw_value_json` → JSON null。Row ID / relationは維持。
- non-Transcript `source_records` → raw contentを `[REDACTED]`、speaker / external raw referenceを解除。
- `participants` → identityをアプリケーションレベルでpseudonymous replacement。Relational IDは維持。

#### TRANSCRIPT_RECORDING
- Transcript `source_records` raw contentを `[REDACTED]`。
- Transcript classはGeneral Rawとは別に処理。

#### RAW_AI_IO
- `ai_executions.input_snapshot_json` → `{}`。
- `raw_output_json` → NULL。
- provider / model / status / execution metadata等のaccountability metadataは維持。

#### APPROVED_DECISION_EVIDENCE
- 本Workerではdestructive変更しない。
- 5-year accountability purposeを持つため、fail-safe `RESTRICT_RETAIN` とする。
- Approved Report / Handoff / Decision / Auditの5年到来後処理は、別途exact table semanticsをReviewしてから実装する。

## 3. Hold / Restricted Retention

Active Retention Holdは対象Data Classのdestructive executionより優先する。

Human scope時にrestricted retentionとされたData Classもdestructive executionから除外する。

一部Classを制限保存した場合、Requestは `PARTIALLY_RETAINED` で完了し、その事実をAudit / tombstone provenanceへ記録する。

## 4. Retention Clock

Policy expiry previewをfixed day換算ではなくPostgreSQL calendar intervalへ変更した。

- General Raw: Case Close + `1 year`.
- Raw AI I/O: Case Close + `90 days`.
- Approved Decision Evidence: Case Close + `5 years`.
- Transcript: `purpose_completed_at + 90 days`.

このPreviewは自動Approvalではない。

Controlled Pilotではdestructive executionをHuman-controlledのまま維持する。

## 5. Explicit operator execution

明示的なoperator CLIを追加した。

Executionには最低限以下が必要：
- Case ID
- Human-approved deletion request ID
- executing staff actor ID
- literal confirmation `EXECUTE_APPROVED_DELETION`

Operational commandはcustomer raw content / stack traceを標準出力しない。

## 6. Restore reconciliation integration

各ANONYMIZE targetはdeletion tombstoneを作る。

既存Restore reconciliationはANONYMIZE tombstoneを外部manifestからidempotent replayできる。

今回、`RESTRICT_RETAIN` tombstoneを「物理消去を再適用するTarget」ではなく「制限保存Decision provenance」として扱うよう修正した。

これにより、manifest VERIFY/APPLYはRESTRICT_RETAINのclass-level recordだけを理由にFAILしない。

Physical row `DELETE` は引き続きfail-closed。

現時点ではdependencyを完全確認せずrelational rowを物理削除するより、tested field anonymization + ID/provenance維持を採用している。

## 7. CI Evidence

Full GitHub Actions:
- run: `34766054643`
- code head: `1d8158da6636ebcfca4487e91822bdfebc362eff`
- result: **SUCCESS**

Passed:
- npm ci
- TypeScript build
- diagnosis
- preparation
- workspace
- review
- report
- handoff
- readiness security
- policy closure
- restore / AI closure
- **retention-deletion Golden suite**
- real PostgreSQL 17 readiness suite
- Chromium desktop/mobile browser suite

New Golden evidence includes:
- non-approved request rejection.
- approved request-only execution.
- General Raw / Transcript anonymization.
- Approved Decision Evidence restricted-retention.
- active Hold precedence.
- execution Audit.
- idempotent completed-request replay.
- calendar retention intervals.
- restore VERIFY success with RESTRICT_RETAIN provenance present.

Real AI checks remain unexecuted and do not count as External Provider Evidence.

## 8. Known Fit / Gap after this slice

### Closed / materially advanced
- Human-approved deletion execution semantics.
- idempotent worker execution.
- General Raw / Transcript / Raw AI I/O destructive mapping for currently clear fields.
- Hold precedence.
- calendar retention clock preview.
- restore reconciliation compatibility with restricted-retention provenance.

### Still OPEN — do not guess

Customer/application identifiers or derived records whose classification between Raw and Approved Decision Evidence is not explicit are not automatically widened into a destructive class.

Also open:
- Approved Report / Handoff / Decision / Audit 5-year expiry execution exact table semantics.
- external durable manifest export/storage.
- real Cloud SQL restore rehearsal.
- real provider/cloud evidence.

If Business/Legal classification is required for an ambiguous field, Development must return it as FACT / Decision Required rather than silently choosing deletion or retention.

## 9. Updated Critical Path

1. Close remaining data-classification boundary and 5-year Approved Decision Evidence expiry semantics.
2. Implement / verify external durable reconciliation-manifest export/storage.
3. Execute real Cloud SQL backup / PITR / isolated restore / reconciliation / smoke and measure internal RPO/RTO <=24h; verify backup retention 30d.
4. Close real Anthropic / provider retention, Google OAuth, Secret/IAM, Cloud Run worker/scale/lease, proxy/rate-limit, Monitoring and dependency evidence.
5. Close Legal/Privacy copy, five-block Management Feedback, Pilot Evidence Capture, docs/65 A〜F, real WEB/SALES_VISIT staging E2E.
6. Re-run `docs/32` Production Readiness Gate and return Controlled Customer Pilot GO / CONDITIONAL GO / NO-GO with Evidence.

## 10. Current Gate

Controlled Customer Pilot: **NO-GO — EXTERNAL / OPERATIONAL CLOSURE REMAINS**.

Business Decision completed ≠ Production Ready.

No main merge is authorized by this record.
