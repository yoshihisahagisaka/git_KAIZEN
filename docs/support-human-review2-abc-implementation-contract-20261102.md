# FACTACT SUPPORT Human Review 2 — Minimal Delta Implementation Contract v2

Status: **DRAFT FOR TECHNICAL REVIEW — NOT IMPLEMENTATION APPROVAL**  
Date: 2026-11-02  
Supersedes: this file's initial broad A/B/C design draft (retained in Git history). The scope is now **minimum modification of existing SUPPORT**, not rebuilding FACTACT.

## 0. Existing source and baseline

- main `f9d1dc9f1cba24560b8fd0488b18dbe37311d7b2`
- Human Review Runner Draft PR #9 `c985c5b0313907a72c8cd2543c8a52ccc5817cdc`
- UX Draft PR #10 `14a8a375caa552e03dcedfc37ecfb4db1ee3fdb0`
- Human Review 2 Product Decisions Draft PR #11 `f3d7cc48f7136e7b802f72bb67510350ed2db43a`
- Existing Canonical, ADR 0005/0007, Phase 2 Decisions/Implementation Contract remain authoritative.

No Core Object, generic workflow, new Role, new Registry, new Work engine or deployment is approved. Do not merge, migrate or touch the active Human Review environment from this draft.

## 1. Scope assessment — existing functions first

| Requirement | Already present | Minimum delta |
|---|---|---|
| A-1 Registered PC vs current inquiry target | `SupportQueries.detail.deviceFact/currentDeviceContext/currentContextDevice`; PR #10 checklist & context | Derive explicit comparison rows/status in Query, show side-by-side and human-first guide in existing UI. **No schema required for display**. |
| A-2 Record caller confirmation/difference | `support_work_target_observations`, supersession, source, actor/time, audit, `recordTargetObservation` | Extend allowed observation kind/value for `REGISTRY_COMPARISON` and `CALLER_STATEMENT`; capture actual text and minimal as-of Registry reference. **No new table**. |
| B Daily response/status/check | `support_work_records`, `support_work_lifecycle_events`, `support_work_follow_ups`, one `SupportUnitOfWork`, Work lock, PR #10 history | Add `RESPONSE` record kind stored as kind-discriminated `notes` JSON; one atomic application method; minimal lifecycle/check updates. **No response table or broad new columns**. |
| C Close/reopen | `closeWork`, guard, `support_work_close_decisions`, Work status/revision, audit, Follow-up | Add `REOPENED` event and `reopenWork`. Drop one-Close-per-Work uniqueness and sequence Close decisions. **No new reopen table**. |

The previously proposed `support_work_target_review_events` new table, response text/disposition SQL columns and separate Reopen table are withdrawn as unnecessary at this stage. Exact scope is the existing files and one additive/constraint-adjustment migration.

## 2. A — Reuse the existing target Observation stream

### Query/UI change without persistence change

- Work Target Device and the verified Registry primary Device are displayed together.
- Computed comparison: `MATCH` when both Device IDs are known and equal; `DIFFERENT` when both are known and unequal; otherwise `UNCONFIRMED`. This is a **value comparison**, not a verified human judgment or a Registry-error conclusion.
- Show Registry Relation/Change provenance and Work target source/time as currently available.
- Only Device identity is comparable with today's Registry. Do not fabricate VPN requirement, ownership or management Registry values.
- A mismatch displays a deterministic caller-first confirmation question based on actual known values. Viewing the question never records a Fact or changes Registry.

### Small type/DB extension only when Human records a decision/answer

Reuse `factact.support_work_target_observations` with append-only revision, requestId, source, actor/time and supersession:

- Add `kind='REGISTRY_COMPARISON'` with `value='MATCH'|'DIFFERENT'|'UNKNOWN'`.
- Add `kind='CALLER_STATEMENT'` with `value='UNKNOWN'`, `source_type='CALLER'` and nonempty `detail`; it records a statement, not Verification.
- Add an optional `registry_relation_id` source reference and minimum as-of snapshot in `detail`/a bounded JSON payload **only if needed to prevent later Registry changes from rewriting the historical comparison**. Before choosing a column, verify existing `detail` and `supersedes_observation_id` can preserve the required source fully. Do not add a new table.
- Preserve current target-context FK and same-Work trigger. If the target is unidentified, reuse the existing `UNIDENTIFIED` context (no fake Device). Do not silently record an unidentified context merely from visiting the comparison screen.
- Reuse `recordTargetObservation` internal validation/insert flow; either extend that command with a typed discriminant or add a thin specialized method sharing its private implementation. One actor/Contract authority boundary and one audit.

Existing `OWNERSHIP` and `MANAGEMENT_STATE` Observation types and their meaning remain unchanged.

## 3. B — Extend existing Record + lifecycle; one atomic command

### Normal UI

Use PR #10's Work workspace and history. Replace *normal daily entry* with `対応内容` (one textarea), `対応後の状態` (four choices), `次回確認予定` (required for three ongoing states), and `対応を記録`. Extra Human confirmation appears only on `対応完了`. Existing legacy Notes/history/correction remain readable. New input starts blank; stored Draft may be resumed.

### Application contract

```ts
type ResponseDisposition =
  | 'CUSTOMER_WAIT' | 'INVESTIGATING' | 'MONITORING' | 'COMPLETED';

interface RecordSupportResponseInput {
  requestId: string;
  expectedLifecycleRevision: number;
  expectedRecordRevision: number;
  responseText: string;               // nonempty, bounded
  disposition: ResponseDisposition;
  followUpAt: string | null;           // required except COMPLETED
  close?: {
    outcome: SupportCloseOutcome;
    reason: string;
    provenanceType: SupportCloseDecision['provenanceType'];
    provenanceReference: string;
    confirmsOutstandingResponsibilityEnded: true;
  };
}
```

`SupportCommands.recordSupportResponse`: within **one** existing tenant UoW and Work lock:
1. Find exact same request retry and compare full payload/actor first.
2. Verify active Operator, current Contract Execute Roles, v2 Work status, lifecycle and record revisions.
3. Validate text, disposition, date and (only if completed) explicit Close confirmation.
4. Insert `support_work_records(kind='RESPONSE',notes={responseText,disposition})` using existing JSONB column. Do **not** create fake Action/Evidence/SupportDecision per text entry.
5. Insert `support_work_lifecycle_events(kind='RESPONSE_RECORDED',command_payload=full validated input)`, and `support_work_follow_ups(kind='SET')` for an ongoing choice, all sharing the request identity across their own tables.
6. Update the existing Work projection, increment `lifecycle_revision`, insert Audit, commit atomically.
7. On COMPLETED, record explicit Human acknowledgement of prior waiting/open next-action in this same RESPONSE lifecycle event; do not fabricate a separate second lifecycle event with the same requestId (the current unique constraint forbids it). Use the **same required-Verification/unfinished-responsibility guard** as standalone `closeWork`; append the Close Decision and end current Follow-up only when legitimate. Any failed guard rolls the entire response back.

New ongoing dispositions do not modify the Core status enum:
- CUSTOMER_WAIT: Waiting=true, Owner retained.
- INVESTIGATING / MONITORING: Waiting=false, Owner retained.
- All three have user-selected Follow-up and a deterministic next-check work instruction, not a fictitious customer claim.
- Do not infer `waiting_party` or `waiting_reason` from free text. The new response path may leave them null; change the existing Work CHECK minimally, preserving old `setWaiting` validation and legacy records.
- Legacy Waiting without Follow-up remains valid; only the new normal form requires it. Due stays separate.

DB change for B:
- Extend existing `support_work_records.kind` CHECK with `RESPONSE`; existing `notes jsonb` remains as-is. Use a TypeScript discriminated union because legacy Notes and new RESPONSE JSON shapes differ.
- Extend `support_work_lifecycle_events.kind` CHECK with `RESPONSE_RECORDED`, store disposition in existing `command_payload`. No additional lifecycle table.
- Relax the existing Work waiting-party/reason CHECK to permit both null on the new simple response path; do not retroactively alter data or relax old Command validation.
- Use the existing Follow-up table, current Work columns and audit insertion.

`SupportQueries.detail` / PR #10 `businessHistory` must render RESPONSE text and disposition by kind, avoiding assumptions that every `record.notes` has legacy `action/result`. Use latest effective lifecycle event for the three ongoing UI labels, and fall back to actual legacy Work state after a later legacy command. One response should appear as one human action rather than duplicating its technical Follow-up event in the business history.

## 4. C — One Reopen command; repeated Close history

### Command

```ts
interface ReopenSupportWorkInput {
  requestId: string;
  expectedLifecycleRevision: number;
  expectedCloseDecisionId?: string | null;  // null for legacy V1
  reason: string;                            // required
  disposition: Exclude<ResponseDisposition,'COMPLETED'>;
  followUpAt: string;                       // required
}
```

`SupportCommands.reopenSupportWork` reuses SUPPORT Contract Execute Authority, Work lock, UoW, history and Audit:
- Check same-request retry before stale checks; reject another actor/payload.
- Require currently COMPLETED; validate expected revision and latest close ID if present.
- Append `support_work_lifecycle_events(kind='REOPENED',command_payload={prior outcome/closedAt/close reference,reason,disposition,followUpAt})`.
- Append Follow-up SET, update Work projection to `IN_PROGRESS` with outcome/closedAt null, waiting/next check based on explicit choice, increment lifecycle revision; audit in one transaction.
- Preserve Owner, original records, Close Decision(s) and their meaning.
- Support legacy V1 Close by preserving old Completion evidence and switching only the *current* Work lifecycle to v2 on explicit reopen. No inferred historical V2 Close or global backfill.

### Minimum Close DB/repository changes

Current `support_work_close_decisions` unique `(tenant_id,work_id)` **must** change to allow re-Close:
- Add `close_sequence`, existing rows use 1, enforce unique `(tenant_id,work_id,close_sequence)`; retain request uniqueness.
- Remove just the old Work-unique constraint by its **verified catalog name**, not a guessed name.
- Query all Close decisions and latest by sequence; lookup by request ID for retry.
- `closeWork` first resolves same-request retry, then validates current status, revision and unchanged Close guard, and appends the next sequence under Work lock. Increment `lifecycle_revision` on Close, presently omitted.
- Add only `REOPENED` to the existing lifecycle event kind CHECK; no new table.
- Business history shows every Close and Reopen, including v1 legacy completion without pretending it has a v2 Close Decision.

## 5. Exact existing files to touch (no new application modules required)

| Existing file | Local change |
|---|---|
| `packages/domain/src/support.ts` | Discriminated RESPONSE record type, new target observation kinds, REOPENED / RESPONSE_RECORDED lifecycle kinds, Close sequence. |
| `packages/application/src/support-commands.ts` | Extend target observation command; add `recordSupportResponse`, `reopenSupportWork`; extract private shared Close guard; fix retry/sequence/revision. |
| `packages/application/src/support-ports.ts` | Add close history/latest/by-request repository operations; otherwise reuse existing ports. |
| `packages/application/src/support-queries.ts` | Derived comparison, response/reopen history and current situation projection. |
| `apps/web/src/server/persistence/support-repository.ts` | Extend existing SQL queries/mapping and Work progress; no new repository implementation. |
| `apps/web/src/server/support-routes.ts` | Add strict schemas/endpoints for response/reopen; extend observation validation; existing CSRF/Origin unchanged. |
| `apps/web/src/client/support-wizard.tsx` (PR #10) | Replace normal daily input, show optional Close confirmation/reopen action, preserve legacy display. |
| `apps/web/src/client/support-context.tsx` (PR #10) | Side-by-side comparison and caller-first guide. |
| `supabase/migrations/20261102xxxx_support_hr2_minimal_delta.sql` | Target/lifecycle/record kind CHECK extensions, Work Waiting CHECK, Close sequence/unique change. Determine next migration ID against actual implementation branch. |
| Existing `tests/golden/support.test.ts`, `tests/browser/support.spec.ts`, `tests/database/baseline.test.ts` | Add targeted cases; retain and run all existing regression. |

Approximate impact: **8 existing application files + 1 migration + extensions to existing tests**. There is no new service, Core object, UI framework, persistence engine or broad schema rebuild. Exact LOC/effort must be measured from the implementation patch, not fabricated here.

## 6. Mandatory test / technical gates

1. A: same/different/unknown Device, caller reply unverified, correction/supersession, Registry unaffected, source snapshot, cross-tenant and stale retry.
2. B: four dispositions, date required only for new ongoing entries, old Waiting null remains valid, full payload retry, concurrent edits, one transaction/audit failure rollback, no fabricated Action/Change, successful normal blank/draft UI, old Notes render.
3. C: Close→Reopen→Close twice, historic V1 Close, latest-by-sequence, duplicate/stale request, same Work lock race, old Close retained, Owner unchanged, mandatory Verification guard, RLS/Authority, failure rollback.
4. Regression: existing SUPPORT Slice 1–3A, JOIN Change→Verify→Commit, Read Authority, Explore/Active Work Anchor, typecheck, Unit, DB Golden and Browser.
5. Verify actual constraint names using a disposable DB before writing the migration; avoid guessed `work` CHECK name.
6. Verify PR #10 HEAD and any drift immediately before Work applies code; never delete/restart the Human Review runner/DB by assumption.
7. Work receives explicit code-level patch/test contract **after** 統括レビュー. No independent redesign, production migration, main merge or deployment.

**No-Go** for implementation until the remaining technical points in this minimal delta are verified and the code-level patch is approved separately. This Draft PR is documentation-only.


## 7. UI-first patch order — PR #10 baseline

The implementation should start by replacing the **human interaction in existing PR #10 files**, then add the smallest Application/Persistence support. No new UX shell, page, form engine or ticket list.

### 7.1 Current `SupportDetail` layout to retain

Retain: heading, Work status bar, full-width main Workspace / Context 75:25 layout, responsive dialog, Active Work Anchor, Explore navigation, current Registry/Work context, human-readable History, audit disclosure, legacy record corrections. Keep the same Work and same source records. A Context visit or computed match never persists anything.

### 7.2 Normal entry — change `Wizard`, not the entire page

Replace the current three-column `checks/action/result` + separate `nextActionOpen/nextAction` normal flow with:
- One initially blank `対応内容` text area (required).
- One initially unselected `対応後の状態` choice: `顧客対応・回答待ち`, `要調査`, `様子見`, `対応完了`.
- `次回確認予定` shown and required for the first three states; never prefill a guessed date.
- One `対応を記録` action, disabled while invalid/busy/unauthorized.
- Do not normally request waiting party, separate next-action narrative or legacy structured Action/result/source fields.

For `対応完了`, the same button opens a **single explicit confirmation** with the human-selected Close outcome and the existing close reason/provenance. The response text may be offered as an editable close-reason *suggestion*, and the resulting saved Response ID is a grounded provenance reference. The user confirms that the displayed remaining responsibility has ended. The server must still reject open required Verification. No Close occurs merely by selecting the option. Existing exceptional Close outcomes remain available in the confirmation, not forced to RESOLVED.

A stable request ID is generated for one submission and retained across network retry until success or an intentional changed payload. After success, clear the form; only an explicitly saved DRAFT is restored. Never pull the latest completed/continuation record into a new entry.

### 7.3 Current status and history — reuse PR #10

- Status bar: display the latest effective `顧客対応・回答待ち/要調査/様子見/対応終了` where grounded in the new Response/Reopen event; fall back to the existing status wording for legacy Work.
- Follow-up: the existing Work projection; Do Not infer Due.
- The right Context and left confirmation checklist currently duplicate PC data. Use **one** clear comparison row in Context: Registered Device / Inquiry Device / `一致・異なる・未確認` with provenance. The left editor can link/focus it, avoiding duplicate Registry descriptions.
- A mismatch opens a deterministic caller-first question. Record an answer only after the operator enters it explicitly; source is CALLER and unverified.
- Extend PR #10 `SupportBusinessHistory` for RESPONSE and REOPENED while preserving old Notes, correction, Waiting, Follow-up, target and Close history. A single response transaction is presented as one human activity, with expandable technical audit.
- Move current `LifecyclePanel`'s multiple routine buttons behind exceptional/legacy operations (if still needed). Do not make operators complete those commands separately for the new normal flow.
- On a completed Work, show `対応中に戻す` next to the completed summary. Require reason, one of the three active situations and next check, with one explicit action. Do not call the old `ResumeWork` (which only exits Waiting and does not reopen completed Work).

### 7.4 Patch sequence and review checkpoints

1. **UI query-only change**: PR #10 comparison display and deterministic caller-first guide using existing Query data. No Migration. Human Review of display/unknown/provenance.
2. **Atomic response bridge**: introduce RESPONSE kind/one Application Command and small schema CHECK changes, then replace daily entry UI. Validate 4 states, one-action history, retry, rollback and legacy compatibility.
3. **Reopen/re-Close**: close sequence constraint and REOPENED event; add completed Work button, history and tests.
4. **Target statement persistence**: extend existing target Observation kind only if needed to retain explicit caller answers and human comparison decisions; no new table. Add test for source and correction.
5. Run full regression and the combined PR #9 Runner + PR #10 UI Human Review. Stop on UX/authority drift. Work does not make new Product decisions.

Do not bundle optional Knowledge versioning, Team comments, multi-Work handoff, escalation workflow or Registry Change UI into A/B/C. These remain later accepted-but-unimplemented items and are separate slices.
