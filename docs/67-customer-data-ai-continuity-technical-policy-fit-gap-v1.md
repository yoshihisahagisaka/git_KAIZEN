# IT経営KAIZEN Customer Data / AI / Consent / Continuity — Technical Policy Fit/Gap v1

Status: **DEVELOPMENT TECHNICAL POLICY / FIT-GAP — IMPLEMENTATION HANDOFF**  
Date: 2026-09-13

Source Business Canonical:
- `docs/66-customer-data-ai-continuity-business-policy-v1.md`
- Business commit: `62cf59108d1557a3620a3b0a9f915eae6ed295c4`

Important:
- Business Decision completed ≠ Production Ready.
- FACT FIRST.
- 分からないことを、分かったことにしない。
- AI Suggests. Human Decides. System Records.
- Business Decisionを満たすためだけに不要なCore Objectを追加しない。

---

## 1. Executive conclusion

BD-01〜BD-05はDevelopment実装可能なPolicyへ変換できる。

現時点の結論：

- **Architecture replacement: 不要**
- **New Core Object: 原則不要**
- **Additive lifecycle / workflow / metadata / job / audit implementation: 必要**
- **External validation: 必要**
- **Legal/Privacy wording validation: 未完了**
- **Controlled Customer Pilot: 現時点 NO-GO**

NO-GOの理由はBusiness Decision未確定ではなく、Business DecisionをTechnical Controlへ実装しExternal Evidenceで検証する工程が未完了だからである。

## 2. Business Decision → Technical Policy Matrix

| Business Decision | Technical Policy | Current Fit | Required change |
|---|---|---|---|
| BD-01 General Raw: Case Close+1y | Raw customer/source dataへretention class + expiry calculation | GAP | additive retention metadata/job |
| BD-01 Transcript: purpose complete+90d | Transcript/Recordingを別classification、purpose completed timestampを基準にexpiry | GAP | separate retention class + deletion path |
| BD-01 Raw AI I/O: Case Close+90d | AIExecution/AIProposal等のRaw provider I/Oをshort-lived classification | PARTIAL FIT | provenance structureはFIT、expiry/deletionはGAP |
| BD-01 Approved Report/Handoff/Decision/Audit: 5y | authoritative human-approved recordをlong-lived class | PARTIAL FIT | immutable/version/auditはFIT、5y lifecycle controlはGAP |
| BD-02 Customer deletion request | Human-approved deletion workflow + audit + restricted retention exception | GAP | workflow / command / audit / execution job |
| BD-02 anonymization | irreversible-enough anonymization methodを対象別に定義 | GAP | implementation policy + tests |
| BD-02 backup lifecycle | active deletion後、restore時にdeleted dataを恒久復活させない | GAP / EXTERNAL | restore reconciliation / tombstone strategy + rehearsal |
| BD-03 AI context minimization | AI processごとのexplicit context allowlistを維持 | PARTIAL/FIT | AI-04はFIT、AI-01〜03再監査必要 |
| BD-03 AI output = Suggestion | AIProposalとHuman approvalを分離 | FIT | maintain guardrails |
| BD-03 Transcript not standard | default flowでTranscript不要 | FIT/PARTIAL | standard acquisition pathがないことを確認、将来機能にconsent guard |
| BD-03 no standard Human-only | standard Web flowはAI利用条件 | FIT at architecture level | customer-facing notice UX required |
| BD-04 RPO/RTO 24h internal | restore rehearsal acceptance criteriaへ変換 | GAP / EXTERNAL | Cloud SQL backup/PITR/restore evidence |
| BD-04 backup 30d | platform backup retention config + evidence | GAP / EXTERNAL | actual Cloud SQL setting/evidence |
| BD-05 pre-submit notice | application before-submit notice + acknowledgement hook | GAP | UI + stored policy/version acknowledgement |
| BD-05 transcript explicit consent | Transcript/Recording creation before consent impossible by guard | GAP | explicit consent record/guard when feature used |
| BD-05 no external SLA promise | customer-facing text must not expose 24h as guarantee | FIT by policy, UNKNOWN in all surfaces | content scan + regression test |

## 3. Data Classification Technical Policy

Do not introduce a universal FACT/EAV data store. Existing entities remain source of truth. Add retention classification as metadata/config/derived policy where practical.

### RC-01 GENERAL_RAW_DIAGNOSIS
Examples: SurveyResponse, SourceRecord, Interview Statement, Operator Note.  
Expiry: `case.closed_at + 1 year`.

### RC-02 TRANSCRIPT_RECORDING
Expiry: `purpose_completed_at + 90 days maximum`.  
Standard free diagnosis does not create this class. Explicit consent required before capture/import/processing.

### RC-03 RAW_AI_IO
Examples: provider raw input/output/failed raw response if stored.  
Expiry: `case.closed_at + 90 days maximum`.

### RC-04 APPROVED_DECISION_EVIDENCE
Examples: Approved/Delivered Report, Assessment Handoff, Human Decision, required Evidence reference, accountability Audit.  
Expiry: 5 years according to implementation-specific lifecycle basis.

## 4. Retention lifecycle design

Minimum technical controls:
1. retention class resolution.
2. deterministic expiry projection.
3. hold/exception with reason, approver, start/end condition.
4. idempotent periodic deletion/anonymization worker.
5. destructive execution preceded by dry-run/report mode.
6. Human-approved customer deletion may accelerate eligible active data deletion.
7. destructive batch writes non-sensitive audit.
8. surviving Approved records must not lose necessary provenance linkage.

## 5. Customer deletion / anonymization workflow

Recommended operational states:
`REQUESTED → SCOPED → APPROVED / REJECTED → EXECUTION_PENDING → COMPLETED / PARTIALLY_RETAINED / FAILED`

This is an operational compliance workflow, not a new FACTACT Core Object.

Required fields: request id, scope, request timestamp, minimum requester reference, selected data classes, decision/reason, approver, restricted-retention exception, execution/completion state, audit refs.

Human approval is mandatory before destructive execution.

## 6. Restore / deletion consistency

- deletion produces durable tombstone/reconciliation information retained long enough to cover backups that can reintroduce deleted data.
- restore runbook includes post-restore deletion reconciliation before traffic returns.
- backup follows lifecycle; no per-record immediate physical purge promise.
- actual Cloud SQL/PITR capability remains External Evidence Required.

## 7. AI context minimization

- AI-01: only available pre-diagnosis context needed for preparation.
- AI-02: only diagnosis workspace context needed to suggest next confirmation; full Transcript only when separately consented and necessary.
- AI-03: permitted source/theme context; output remains AIProposal.
- AI-04: approved-context-only; no raw Survey/Transcript/non-approved Insight injection.

All processes: no sensitive body/prompt logging, raw I/O follows RC-03, provider-side retention must be verified.

## 8. Customer Notice / Consent technical contract

Legal wording remains outside Development authority.

Development must provide a versioned pre-submit notice hook that can display approved wording and record only minimum acknowledgement provenance: policy version, acknowledged_at, application/case ref, channel.

Application submit is blocked unless the approved policy acknowledgement requirement is satisfied.

Transcript/Recording requires a separate explicit consent record before capture/import/processing. General diagnosis acknowledgement cannot substitute.

## 9. Backup / RPO / RTO rehearsal criteria

Controlled Pilot internal targets:
- RPO ≤ 24h
- RTO ≤ 24h
- Backup retention target 30d

PASS requires actual cloud evidence: backup/PITR config, isolated restore, measured RPO/RTO, schema/app checks, deletion reconciliation, Approved Report/Handoff/Audit integrity verification.

No customer-facing SLA is generated by Development.

## 10. Existing Architecture Fit/Gap

### FIT
- AIProposal separated from Human Approved Insight.
- Human Review/Correction/Approval.
- FACT/CONFIRMED_FACT/DECISION guard in free diagnosis semantic output.
- versioned Future and raw SourceRecord.
- deterministic/versioned Handoff.
- Report immutability/versioning.
- audit/transition structure.
- AI-04 approved-context-only boundary.

### PARTIAL FIT
- AI-01〜03 are separated but must be revalidated for data minimization.
- AI provenance exists but expiry lifecycle does not.
- immutable approved records exist but 5-year retention lifecycle does not.

### GAP
- retention lifecycle/job.
- Transcript purpose-completion clock.
- deletion request workflow.
- anonymization/restricted-retention controls.
- restore reconciliation/tombstone behavior.
- versioned notice acknowledgement.
- Transcript explicit consent guard.
- actual Cloud SQL backup/RPO/RTO evidence.
- provider-side AI retention evidence.

### UNKNOWN / EXTERNAL
- target environment provider retention settings.
- actual Cloud SQL/PITR configuration.
- final Legal/Privacy-approved customer wording.
- third-party notification/logging retention of sensitive payload.

## 11. Controlled Pilot Closure slices

### Slice A — Policy plumbing + consent hook
Versioned notice, acknowledgement provenance, Transcript consent guard, tests.

### Slice B — Retention + deletion lifecycle
Classification, expiry, dry-run cleanup, Human deletion workflow, anonymization/restricted retention, audit. Destructive mode gated until review/staging proof.

### Slice C — Backup/restore consistency
Tombstone/reconciliation, runbook, actual 30d backup evidence, restore rehearsal, RPO/RTO measurement.

### Slice D — AI minimization + provider evidence
AI-01〜04 input allowlist audit, provider retention evidence, real calls, no sensitive logs.

### Slice E — Launch Gate revalidation
Business Acceptance A〜F, real OAuth/Worker/Secret/IAM/Monitoring/staging E2E, docs/32 A〜K rerun, Controlled Pilot verdict.

## 12. Technical impossibility / provider constraint rule

Return FACT to Business Lane rather than silently working around if:
- provider retention cannot meet policy.
- backup/storage cannot meet 30d or restore/deletion rule without material architecture/cost change.
- explicit Transcript consent cannot precede capture in selected integration.
- deletion destroys required immutable audit linkage without acceptable alternative.
- RPO/RTO requires materially different infrastructure/cost.

## 13. Current Gate status

- BD-01〜BD-05: **RESOLVED**
- Technical implementation: **OPEN**
- External Evidence Closure: **OPEN**
- Legal/Privacy wording review: **OPEN**
- Controlled Customer Pilot: **NO-GO — IMPLEMENTATION / EVIDENCE CLOSURE REQUIRED**
- New Core Object / Architecture redesign: **NOT REQUIRED AT THIS TIME**
