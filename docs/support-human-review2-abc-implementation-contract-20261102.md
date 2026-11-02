# FACTACT SUPPORT Human Review 2 — A/B/C Implementation Contract (Draft)

Status: **DRAFT FOR ARCHITECTURE / CODE-LEVEL REVIEW — NOT IMPLEMENTATION APPROVAL**  
Date: 2026-11-02  
Repository: \`yoshihisahagisaka/git_KAIZEN\`

## 0. Source of authority and exact baseline

- main: \`f9d1dc9f1cba24560b8fd0488b18dbe37311d7b2\`
- Runner PR #9: \`c985c5b0313907a72c8cd2543c8a52ccc5817cdc\` (Draft, separate)
- UX PR #10: \`14a8a375caa552e03dcedfc37ecfb4db1ee3fdb0\` (Draft, planned UI baseline)
- Product Decision PR #11: \`f3d7cc48f7136e7b802f72bb67510350ed2db43a\` (Draft, decision source)
- Product Decision: \`docs/support-human-review2-product-decisions-20261102.md\` on PR #11.
- Canonical: \`docs/factact-product-operating-principles-v1.md\`, \`docs/support-round3-phase2-decisions.md\`, \`docs/support-round3-phase2-implementation-contract.md\`, ADR 0005/0007.

This document is a proposed **SUPPORT Application/Persistence implementation specialization**. It does not authorize a Core redefinition, migration execution, main merge, production release, or deletion/restart of the Human Review runner/DB. Where it conflicts with accepted Product Decision, the design must stop and be reconciled. PR #10 is not Human Review 2's new simple response implementation.

## 1. Confirmed baseline Fit/Gap

| A/B/C | Existing fit | Confirmed technical gap |
|---|---|---|
| A: Registry vs inquiry target; caller confirmation | \`currentRelation(Person)\`, \`support_work_device_contexts\`, \`support_work_target_observations\`, source/actor/history, PR #10 parallel context | No typed, append-only comparison decision or independent caller reply sequence; no as-of comparison snapshot. The Registry only grounds a primary device, not authoritative VPN need/ownership/management fields. |
| B: response + disposition + next check | \`support_work_records\`, lifecycle events, Follow-up, one tenant transaction/Work lock, PR #10 business history | Existing \`recordContinuation\`, \`setWaiting\`, \`setFollowUp\`, \`closeWork\` are separate commands; \`SupportNotes\` has seven structured input fields; no atomic one-text response contract. |
| C: explicit Close + Reopen | \`closeWork\`, verification guard, Authority, append-only close record, Work lock/retry | No Reopen. \`support_work_close_decisions\` has unique \`(tenant_id,work_id)\`; repository reads a single Close. Current Close does not increment \`lifecycle_revision\`. A second close cycle cannot be saved. |

Semantics: target is Work Context, not Registry; caller statements are unverified; no new Core Object or Role. Four response dispositions are SUPPORT UI/Application semantics, **not** additions to \`factact.work.status\`.

## 2. A — Registry / inquiry target comparison and caller answer

### 2.1 Read projection

Extend \`SupportQueries.detail\` with \`targetComparison\` containing, at minimum:

- \`registeredDevice\`: verified Person \`USES_PRIMARY_DEVICE\` Relation ID, Device ID, asset tag, source Change ID and verification timestamp; null if no Registry Fact.
- \`inquiryDevice\`: effective Work target context ID, Device ID/asset tag where identified, confirmation source/time and the latest unidentified detail where applicable.
- \`valueComparison\`: \`MATCH\` / \`DIFFERENT\` / \`UNCONFIRMED\` computed **only** for displayed values; this is not a Human confirmation or a Registry-error judgment.
- \`latestHumanReview\` and chronological \`targetReviewHistory\` as distinct data from the computed comparison.
- Source and effective/as-of references. An old review tied to superseded Registry/Work context must be marked historical, not treated as a review of the new values.

First slice supports the **device identity row only**. VPN requirement, ownership and management must show Registry-side \`未確認\` or be omitted until backed by an actual Registry Fact. Work observations are not promoted into Registry fields.

### 2.2 Additive, append-only target review record

Add \`factact.support_work_target_review_events\` as persistence of existing Observation/Human Decision semantics, **not** a new Core Object:

- \`id\`, \`tenant_id\`, \`work_id\`, \`request_id\`, \`revision\`, \`kind\`: \`COMPARISON\` | \`CALLER_STATEMENT\`.
- \`field_code\`: initially \`DEVICE\`.
- Optional \`target_context_id\` and \`registry_relation_id\` (source snapshot references, never a write to those rows).
- Optional \`registered_value_snapshot\` and \`inquiry_value_snapshot\` (displayed value as of review; not new Registry Facts).
- \`comparison_result\`: \`MATCH\` | \`DIFFERENT\` | \`UNCONFIRMED\` for COMPARISON; null for CALLER_STATEMENT.
- \`statement_text\`: nonempty for CALLER_STATEMENT, optional explanation/basis for COMPARISON.
- \`source_type\`: \`CALLER\` | \`OPERATOR\` | \`OTHER\`; \`recorded_by_operator_id\`, \`recorded_at\`.
- \`supersedes_review_id\` for explicit correction. A correction appends; it never edits/deletes the original.
- Unique \`(tenant_id,work_id,revision)\` and \`(tenant_id,work_id,request_id)\`; composite tenant FKs and same-Work checks for target and supersession. Forced tenant RLS, SELECT/INSERT runtime grants only.

\`CALLER_STATEMENT\` means the **speaker is the caller**, while \`recorded_by_operator_id\` identifies the internal recorder. It is never Verified Fact. A review may be saved while the target is unidentified, hence target context may be null. New target/Registry versions do not automatically rewrite earlier decisions.

### 2.3 Command and UI contract

\`RecordSupportTargetReview(actor,workId,{requestId,expectedReviewRevision,kind,fieldCode:'DEVICE',targetContextId?,registryRelationId?,comparisonResult?,statementText,sourceType,supersedesReviewId?})\`:

1. One tenant-scoped UoW; refresh active Operator and Contract Execute Authority, lock Work, verify not closed.
2. For a retry, compare all canonical input fields, actor and original request ID before normal stale checks.
3. Verify referenced Relation and target context belong to the same tenant, expected Person/Work and presented snapshot; reject stale context, never auto-rebase a decision.
4. Append review, Audit, preserve original context/Registry unchanged.

PR #10 context UI receives a side-by-side device comparison, a deterministic human-first confirmation guide using only grounded names/values, and optional caller-reply capture. Display computed equality separately from human judgment. Never auto-trigger Change, Escalation or Work relation from a difference.

## 3. B — One natural response interaction

### 3.1 Contract

\`RecordSupportResponse(actor,workId,input)\`:

\`\`\`ts
type SupportResponseDisposition =
  | 'CUSTOMER_WAIT' | 'INVESTIGATING' | 'MONITORING' | 'COMPLETED';
interface RecordSupportResponseInput {
  requestId: string;
  expectedLifecycleRevision: number;
  expectedRecordRevision: number;
  responseText: string;       // nonempty, max 4000
  disposition: SupportResponseDisposition;
  followUpAt: string | null;  // valid timestamp REQUIRED for non-COMPLETED
  close?: {
    outcome: SupportCloseOutcome;
    reason: string;
    provenanceType: SupportCloseDecision['provenanceType'];
    provenanceReference: string;
    confirmsOutstandingResponsibilityEnded: true;
  };
}
\`\`\`

Non-COMPLETED rejects \`close\` and requires an explicit Follow-up. COMPLETED rejects \`followUpAt\` and requires a separately visible Human Close confirmation (outcome, reason/provenance and acknowledgement of unresolved visible obligations). Date is a **next check**, not Due; do not impose a guessed future date or retroactively invalidate historic Waiting records lacking Follow-up.

The four values are not Work status enum values. For new normal responses:

| Disposition | Work projection | Follow-up |
|---|---|---|
| CUSTOMER_WAIT | Open/In-progress, Waiting true; party/reason may remain unknown; Owner unchanged | Human-selected SET |
| INVESTIGATING | Open/In-progress, Waiting false | Human-selected SET |
| MONITORING | Open/In-progress, Waiting false | Human-selected SET |
| COMPLETED | Explicit Close only after guard; current Follow-up is ended with append-only history | None |

Do **not** infer a waiting party/reason from the response narrative. Relax the current \`factact.work\` waiting-party/reason check only for the new explicitly sourced SUPPORT v2 response path; retain existing \`SetWaiting\` validation and historic meaning. The next check itself is the remaining responsibility. A deterministic next-check prompt in \`work.next_action\` is a system-generated work instruction derived from disposition/Follow-up, not a claimant Fact. \`next_action_open\` must reflect that responsibility for the three noncomplete choices.

### 3.2 Atomic persistence

Extend \`support_work_records\` with \`kind='RESPONSE'\`, nullable \`response_text\` and \`response_disposition\`; retain existing \`DRAFT\`/\`COMPLETION\`/\`CORRECTION\`/\`CONTINUATION\` semantics and their original \`notes\`. New RESPONSE records must not masquerade as a legacy \`SupportNotes\` entry. Use a discriminated TypeScript union and a DB kind-specific check. No rewriting or backfill of old notes.

Extend \`support_work_lifecycle_events\` with \`RESPONSE_RECORDED\` and later \`REOPENED\`, and a typed nullable \`response_disposition\` for these kinds; keep \`command_payload\` for the exact retry contract. Response, lifecycle event, Follow-up SET/CLEARED, Work current projection and Audit **commit in one existing \`SupportUnitOfWork.run\` transaction** under Work row lock. No nested public commands or HTTP chaining.

Order:
1. Resolve the exact original retry by \`requestId\`; compare actor and full canonical payload; return the original result or \`RETRY_CONFLICT\`.
2. Check active Operator, Contract Execute Authority, Work lifecycle v2/open, both expected revisions.
3. Validate text, status, Follow-up/Close payload and human provenance.
4. Append one RESPONSE, one lifecycle event and the corresponding Follow-up event when applicable.
5. Update Work current projection, increment lifecycle revision; append Audit.
6. For COMPLETED, record explicit acknowledgement of the existing pending Next Action/Waiting, apply the **same verification and outstanding-obligation guard** used by standalone \`closeWork\`, then append Close Decision and update Work in this same transaction. No hidden bypass. A required Verification or non-acknowledged obligation blocks the whole transaction.

Do **not** create a fake \`Action\`/Evidence/verified Fact solely because a human typed response text. Existing \`support_decisions\` is one per Work; repeated response records must not overwrite or reuse the one-time diagnostic Action as though it represented every later response. A separately executed reality-changing Action remains subject to its actual evidence and Change/Verify/Commit flow.

The current \`support_work_follow_ups\` remains append-only with supersession and source \`HUMAN_DECISION\`. On explicit Close, if a current next check exists, append CLEARED with Close provenance while preserving the previous SET. Legacy missing Follow-up remains a normal legacy state.

### 3.3 PR #10 UI/read model

Replace **daily normal** structured input in \`support-wizard.tsx\` with:
1. one \`対応内容\` textarea,
2. \`対応後の状態\` (four choices),
3. \`次回確認予定\` mandatory only for three ongoing choices,
4. one \`対応を記録\` action; extra confirmation only for \`対応完了\`.

New form starts blank; only saved DRAFT may be restored. Existing historical Notes and correction view still render by kind. Extend PR #10 \`businessHistory\` with the actual Response text/status and linked Follow-up; avoid showing duplicate entries as if multiple human actions occurred. \`Current disposition\` comes from the newest effective response/reopen lifecycle event, but later legacy lifecycle commands must invalidate stale situation labels and fall back to their actual present Work status. Do not infer that an Explore click changed Work Context.

## 4. C — Reopen and repeated Close cycles

### 4.1 Command

\`ReopenSupportWork(actor,workId,{requestId,expectedLifecycleRevision,expectedCloseDecisionId?,reason,disposition,followUpAt})\`, with disposition limited to the three noncomplete choices.

- Execute Authority: reuse the current SUPPORT active Contract Execute boundary (\`ADMIN\`/\`OPERATOR\` plus contract \`executeRoles\`); no new Role. Actor need not silently become Owner.
- Lock Work; retry lookup before stale/closed-state checks. Require explicit \`COMPLETED\`, nonempty reason, and a next check. Check latest Close Decision identity where one exists.
- Append \`REOPENED\` lifecycle event with previous status/outcome/closedAt and Close Decision reference where present; Work status returns to \`IN_PROGRESS\`, current outcome/closedAt become null, lifecycle revision increments, waiting/next-check projection reflects chosen situation.
- Append Follow-up SET and Audit atomically. No deletion of previous Close Decision, response, audit or record.
- For historic V1 closed Work lacking explicit \`support_work_close_decisions\`, preserve its legacy completion evidence/record and snapshot it in Reopen provenance; upgrade only that Work's **current** lifecycle projection to v2, with no global historical backfill. Test this compatibility before enabling it.

### 4.2 Migration and repository changes

Current \`support_work_close_decisions\` unique \`(tenant_id,work_id)\` prohibits second Close. Replace that uniqueness with:

- \`close_sequence\` per Work (existing sole rows become sequence 1); unique \`(tenant_id,work_id,close_sequence)\`.
- Retain unique \`(tenant_id,work_id,request_id)\` for request idempotency.
- A new Close after Reopen uses \`max(close_sequence)+1\`, serialized by Work lock.
- Add a close/read method by \`requestId\`, list/history method and latest-by-sequence method. \`closeDecision(workId)\` must cease to mean the only Close ever.
- Standalone \`closeWork\` must check same-request retry, then check current status and current cycle; it must not return an old-cycle decision for a different request. Increment \`lifecycle_revision\` on Close (currently omitted) to fence stale updates.
- Extend lifecycle events for REOPENED; typed previous-Close reference (same Work/tenant FK/guard), with legacy V1 null permitted.

Keep the shared Work status enum \`OPEN/IN_PROGRESS/COMPLETED\`. The DB's existing \`(status='COMPLETED')=(outcome and closed_at present)\` invariant remains satisfied for the **current projection**. Append-only Close history is the historical source. The original V1 \`COMPLETION\` record never becomes a fabricated v2 Close Decision.

## 5. Exact code targets / patches to prepare

| File | Required code delta |
|---|---|
| \`packages/domain/src/support.ts\` | Add typed response disposition/record and target-review event; extend lifecycle kinds and close sequence while retaining legacy unions. |
| \`packages/application/src/support-ports.ts\` | Target-review history/insert, close list/by-request/latest, typed response history; no separate Work engine. |
| \`packages/application/src/support-commands.ts\` | New \`recordTargetReview\`, \`recordSupportResponse\`, \`reopenSupportWork\`; refactor Close guard into shared internal method; one UoW and Work lock for aggregate operations; fix close revision/retry per cycle. |
| \`packages/application/src/support-queries.ts\` | Value comparison with source snapshots; caller review history, current disposition and full close/reopen business history; distinguish read from execute. |
| \`apps/web/src/server/persistence/support-repository.ts\` | Add methods/query ordering and typed snapshots; close sequence and same-Work guard; existing \`progress\` used for projection updates. |
| \`apps/web/src/server/support-routes.ts\` | Strict schemas: POST \`/support-work/:id/target-reviews\`, \`/response\`, \`/reopen\`; exact Origin/CSRF boundary unchanged. |
| \`apps/web/src/client/support-wizard.tsx\` (PR #10 baseline) | Simple daily form, conditional Close confirmation, current state/reopen action; legacy record rendering and draft behavior. |
| \`apps/web/src/client/support-context.tsx\` (PR #10 baseline) | Side-by-side comparison, human-first question, caller statement capture and clear provenance. |
| \`supabase/migrations/20261102xxxx_support_hr2_abc.sql\` | Additive target review table; response columns/constraints; lifecycle/Close sequence extension; Work waiting constraint adjustment; RLS/SQL guards/indexes/grants. Use next available migration number, verified against the target branch. |
| \`tests/golden/support.test.ts\`, \`tests/browser/support.spec.ts\`, \`tests/database/baseline.test.ts\` | Extend fixtures and positive/negative concurrency/tenancy/audit/history/migration regression. |

PR #10's \`businessHistory\` is a UI/query projection, not another persisted timeline. The implementation branch must account for PR #10 being unmerged. PR #9 runner is separate; never reset or clean its temporary DB by assumption.

## 6. Mandatory tests, gates and rollback

**A tests**: Registry PC matches/differs/unset; Work target missing/unidentified; actual values and as-of IDs retained; caller answer remains unverified; correction appended; subsequent Registry relation change does not rewrite previous review; source and authority; cross-tenant and cross-Work rejection; idempotency/stale revision; no Registry Change or fake Device.

**B tests**: all four dispositions; required next check only for new noncomplete normal responses; old Waiting without Follow-up remains valid; exact Response text; Close confirmation; closed verification guard; no fake Action; retry with same/different payload; concurrent Operator edit; audit insertion failure rolls **everything** back; required roles/Contract/RLS; no auto-Close/Change; human history projection; saved draft/new blank input.

**C tests**: v2 Close→Reopen→Close→Reopen, sequences and original provenance; stale/duplicate requests; two simultaneous reopen/close commands; old V1 closed Work compatibility; prior Close remains readable; current Owner unchanged; closed Work cannot be edited except through approved path; Guard rejects verification still open; mandatory next check on reopen; cross-tenant/unauthorized; failure atomicity.

**Existing regression**: full typecheck/build, unit, DB Golden, browser; JOIN Change→Verify→Commit, SUPPORT Slice 1/2/3A, Read Authority, Explore/Active Work Anchor, history/corrections. PR #9 runner + PR #10 UX temporary integration must be reviewed without touching its active local state.

**Pre-implementation technical gates**:
1. Confirm exact PostgreSQL constraint/index names and migration order in a disposable test DB; do not guess \`work\` CHECK names or drop unrelated constraints.
2. Verify the response/Close transaction has a single no-duplicate idempotency source across RESPONSE, lifecycle, Follow-up and Close; test audit failpoint and parallel requests.
3. Verify the Close guard's supported Verification basis and that a Human acknowledgement cannot bypass a required verification.
4. Review actual PR #10 HEAD and any intervening changes before applying a patch; stop on drift.
5. Sign off the code-level diff and test fixtures in the **統括** lane. Work applies only the approved patch, checks and reports technical Gap.

**No-Go** until implementation contract approval, code review PASS, CI and Human Review PASS, separate migration and release approvals. This Draft PR changes documentation only; it does not perform a migration, deploy, merge or production action.
