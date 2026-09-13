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

---

# 2. Business Decision → Technical Policy Matrix

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

---

# 3. Data Classification Technical Policy

Do not introduce a universal FACT/EAV data store.

Existing entities remain source of truth. Add retention classification as metadata/config/derived policy where practical.

## RC-01 GENERAL_RAW_DIAGNOSIS

Examples:
- SurveyResponse
- SourceRecord: CUSTOMER/INTERVIEW statement
- Operator note
- raw interview material excluding separately classified Transcript/Recording

Expiry:
- `case.closed_at + 1 year`

Exception:
- legal/contract/customer-specific/legal-hold override only with reason, approver and end condition recorded.

## RC-02 TRANSCRIPT_RECORDING

Expiry:
- `purpose_completed_at + 90 days maximum`

Rules:
- standard free diagnosis does not create this class.
- consent must exist before creation/import.
- no fallback to Case Close+1y.
- approved extracted fact/observation/evidence reference may survive under another class; full transcript does not.

## RC-03 RAW_AI_IO

Examples:
- provider raw input
- provider raw output
- failed raw response if stored

Expiry:
- `case.closed_at + 90 days maximum`

Rules:
- Human Approved derived records are not deleted merely because Raw AI I/O expires.
- provider-side retention must be separately validated against provider contract/settings.

## RC-04 APPROVED_DECISION_EVIDENCE

Examples:
- Approved/Delivered Report
- Assessment Handoff
- Human Decision records
- required Evidence references
- Audit / Transition records necessary for accountability

Expiry:
- `record effective/close basis + 5 years` according to implementation-specific lifecycle definition.

Because some audit/security records may have separate policy, exact table-to-retention mapping must be explicitly documented before deletion job enablement.

---

# 4. Retention lifecycle design

Preferred implementation: additive and deterministic.

Minimum technical controls:

1. Resolve a retention class for each targeted record.
2. Compute deterministic `retention_expires_at` or equivalent policy projection.
3. Support `retention_hold` / exception with:
   - reason
   - approved_by
   - started_at
   - expires_at or explicit end condition
4. Periodic deletion/anonymization worker operates only on eligible records.
5. Dry-run/report mode before destructive execution.
6. Human-approved customer deletion requests can override normal waiting period for eligible active data.
7. Every destructive batch writes non-sensitive completion audit.
8. Job is idempotent and retry-safe.

Avoid:
- one global DELETE CASCADE across diagnosis case.
- deleting provenance needed by surviving Human Approved records without replacement reference strategy.
- treating DB NULL as UNKNOWN.

---

# 5. Customer deletion / anonymization technical workflow

No new business meaning is introduced.

Recommended command workflow:

`REQUESTED → SCOPED → APPROVED / REJECTED → EXECUTION_PENDING → COMPLETED / PARTIALLY_RETAINED / FAILED`

This may be implemented using an additive workflow table because a deletion request is an operational compliance workflow, not a FACTACT Core Object.

Required fields:
- request id
- organization/case scope
- requested_at
- requester reference (minimum necessary)
- scoped data classes
- decision
- decision reason
- approved_by
- exception/restricted-retention detail
- executed_at
- completion status
- audit references

Human approval is mandatory before destructive execution.

Anonymization must be irreversible enough for the intended purpose; merely replacing name with another stable reversible customer key is not sufficient to claim anonymized state.

---

# 6. Restore / deletion consistency

Business rule: deleted data must not permanently reappear after restore.

Technical policy:

- active deletion creates a durable deletion/tombstone record retained at least as long as relevant backups can reintroduce the data.
- restore runbook must include a **post-restore deletion reconciliation step**.
- before restored environment is returned to customer traffic, deletion/tombstone set is replayed or verified.
- backup copy itself follows lifecycle; no promise of per-record immediate physical purge.

Whether Cloud SQL/PITR supports all desired retention mechanics must be verified in actual environment; do not assume.

---

# 7. AI context minimization policy

Existing design already separates process contexts; preserve this.

Required evidence per AI process:

### AI-01 Pre-Diagnosis Organizer
Allowlist only available pre-diagnosis context needed for preparation. No unrelated case history.

### AI-02 Diagnosis Assistant
Use diagnosis workspace context needed to suggest questions/follow-up. Transcript full text only when separately consented and necessary.

### AI-03 Post-Diagnosis Structurer
Only permitted Source references / Theme context. Output remains AIProposal. No FACT/DECISION authority.

### AI-04 Report Draft Generator
Continue approved-context-only behavior. No raw Survey/Transcript/non-approved insight injection.

For all processes:
- log process/version/provider/context reference metadata without logging sensitive prompt/body.
- provider raw I/O retention follows RC-03.
- failed response logging must not leak raw customer payload.

---

# 8. Customer Notice / Consent technical contract

Legal wording remains outside Development authority.

Development must provide a UX hook capable of displaying versioned approved wording before application submit.

Minimum technical requirements:

- display service purpose.
- display Assessment boundary.
- display data use purpose.
- display standard AI usage and Human Review.
- display follow-up notice.
- link approved Privacy/Data Handling document.
- state Transcript/Recording is not standard.
- block application submission unless required acknowledgement for the approved policy version is present.
- store only minimum acknowledgement provenance:
  - policy/notice version
  - acknowledged_at
  - application/case ref
  - channel

Do not invent checkbox/legal wording in code before Legal/Privacy-approved copy is supplied.

## Transcript / Recording consent guard

If Transcript/Recording feature is used:
- separate explicit consent record required before upload/capture/processing.
- consent version, scope, timestamp, actor/customer reference recorded.
- absence of consent => operation rejected.
- general diagnosis acknowledgement cannot substitute for Transcript consent.

---

# 9. Backup / RPO / RTO rehearsal criteria

Controlled Pilot internal targets:
- RPO ≤ 24h
- RTO ≤ 24h
- Backup retention target = 30d

PASS requires actual cloud evidence, not configuration intent.

Minimum rehearsal:
1. confirm actual backup/PITR configuration.
2. restore into isolated environment.
3. measure latest recoverable point against RPO.
4. measure service restoration path against RTO.
5. run schema/app consistency checks.
6. run deletion reconciliation/tombstone replay.
7. verify approved Report/Handoff/Audit integrity.
8. document timestamps and result.

These values are internal objectives only; no customer-facing SLA text is generated by Development.

---

# 10. Existing Architecture Fit/Gap

## FIT

- AIProposal separated from Human Approved Insight.
- Human Review/Correction/Approval flow.
- semantic guard against FACT/CONFIRMED_FACT/DECISION in free diagnosis insight.
- versioned Future.
- raw SourceRecord preservation.
- deterministic/versioned Assessment Handoff.
- Report approval immutability/versioning.
- audit and transition structure.
- AI-04 approved-context-only boundary.
- Human-only authoritative lifecycle commands.

## PARTIAL FIT

- AI-01〜03 context is architecturally separated, but explicit privacy/data-minimization evidence must be revalidated.
- AI raw output/proposal provenance exists, but lifecycle expiry is not implemented.
- immutable approved records exist, but 5-year retention lifecycle is not implemented.
- feedback/correction sources exist, but deletion/anonymization impact on provenance needs implementation rules.

## GAP

- retention expiry lifecycle/job.
- Transcript-specific retention clock (`purpose_completed_at`).
- customer deletion request workflow.
- anonymization execution/control.
- restricted retention/legal-hold implementation.
- deletion/restore reconciliation.
- versioned customer notice acknowledgement.
- Transcript explicit-consent guard.
- actual Cloud SQL 30d backup / RPO/RTO rehearsal evidence.
- provider-side AI retention validation.

## UNKNOWN / EXTERNAL

- actual production/staging provider-side retention settings.
- exact Cloud SQL backup/PITR configuration available under target project/account.
- final approved legal/customer wording.
- whether any third-party notification/logging system currently retains sensitive payload outside intended policy; must be verified.

---

# 11. Implementation slices for Controlled Pilot Closure

Do not create a large new architecture. Implement in closure slices.

### Closure Slice A — Policy plumbing + consent hook
- versioned customer notice configuration/rendering.
- acknowledgement provenance.
- transcript consent guard interface.
- tests proving no transcript without explicit consent.
- no final legal wording hardcoded until approved.

### Closure Slice B — Retention + deletion lifecycle
- classification mapping.
- deterministic expiry.
- dry-run cleanup worker.
- Human-approved deletion request workflow.
- anonymization/restricted-retention behavior.
- audit.
- destructive mode gated until migration/test/review pass.

### Closure Slice C — Backup/restore consistency
- deletion tombstone/reconciliation.
- restore runbook update.
- 30d config evidence.
- actual restore rehearsal and RPO/RTO measurement.

### Closure Slice D — AI minimization + external provider evidence
- audit AI-01〜04 input allowlists.
- provider-side retention/privacy configuration evidence.
- real AI calls.
- ensure no sensitive prompt/body logs.

### Closure Slice E — Launch Gate revalidation
- Business Acceptance Cases A〜F.
- real OAuth / Worker / Secret/IAM / Monitoring / staging E2E.
- docs/32 Gates A〜K rerun.
- Controlled Customer Pilot GO / CONDITIONAL GO / NO-GO with evidence.

---

# 12. Critical path

Shortest path to Controlled Customer Pilot:

1. Legal/Privacy-approved customer-facing wording supplied to Development.
2. Closure Slice A implemented and tested.
3. Closure Slice B implemented in dry-run + reviewed; destructive path proven in staging.
4. Closure Slice C actual Cloud SQL restore rehearsal.
5. Closure Slice D actual provider evidence.
6. remaining Production Readiness external gates closed.
7. internal Business Acceptance A〜F.
8. docs/32 rerun and Pilot verdict recorded.

Slices A/B implementation can proceed in parallel with external platform setup; final Gate cannot close until both complete.

---

# 13. Technical impossibility / provider constraint rule

If implementation discovers any of the following, stop local workaround and return FACT to Business Lane:

- provider retention cannot meet BD-01/BD-03.
- storage/backup service cannot satisfy 30-day target or deletion/restore rule without material architecture/cost change.
- explicit Transcript consent cannot technically precede capture in selected tool integration.
- deletion would destroy legally/operationally required immutable audit linkage without acceptable pseudonymous reference strategy.
- RPO/RTO target requires materially different infrastructure or cost.

These are Business impact decisions, not silent Development exceptions.

---

# 14. Current Gate status

Business Decision BD-01〜BD-05: **RESOLVED**

Technical implementation of Business Policy: **OPEN**

External Evidence Closure: **OPEN**

Legal/Privacy wording review: **OPEN**

Controlled Customer Pilot: **NO-GO — IMPLEMENTATION / EVIDENCE CLOSURE REQUIRED**

No new Core Object or Architecture redesign is currently required.
