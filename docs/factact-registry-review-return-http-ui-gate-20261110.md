# FACTACT | REGISTRY review return HTTP/UI Gate (2026-11-10)

Status: **Draft, stacked on the DB return Gate PR #54; all actual migration/release remains No-Go.**

## Fit and single human action

- The existing reviewer queue remains the only entry to Registry approval/return. Each visible row was already filtered by a live target-specific `REGISTRY REVIEW` Grant. The `差し戻し` button opens a required reason field, then a single `差し戻す` submit invokes the committed DB `PROPOSED/VERIFIED → REJECTED` transition. REVIEW-only reviewers may return; only reviewers also granted APPROVE can confirm.
- The new `POST /api/scoped/registry/review-queue/:changeId/return` accepts **only** `{reason}`. Existing session/CSRF/exact-Origin boundaries apply; Tenant, Actor, Service and Grant never come from the body. The application and privileged DB function revalidate live scope, target and independent reviewer before writing. Unknown IDs, customer B and missing Grant share 404; stale/immutable conflict is 409.
- Successful return responds `{changeId,status:'REJECTED'}`. Reason/Actor/time and append-only Evidence/Audit were already defined by PR #54. The UI refetches the authorized queue after any outcome, prevents double submission, preserves a visible error after a failed request, and does not show a returned Change as pending.
- The original proposer receives a bounded read model attached to the **current target-specific authorized Registry directory**. For each displayed Person the read includes only the authenticated Actor's most recent request for the same Service and Organization recipient: current proposal status, proposed display name and, if rejected, the reviewer's rejection reason. No global request counts, other Actor's requests, or customer B details.
- `登録情報を更新` reauthorizes the Registry directory and fetches current status. On REJECTED, the proposer sees a truthful `差し戻し` indication with reason and may press the existing `編集 → 保存` to create a **new** immutable Registry request. No in-place effect rewrite, automatic resubmission, fictitious Work/Action or premature Person update.

## Synthetic acceptance

1. HTTP: session/CSRF/Origin, strict one-field reason, no forged Tenant/Actor, same-customer and cross-customer ID non-disclosure; REVIEW-only return and idempotent retry without duplicate Audit; revoked Grant fails closed.
2. Browser: REVIEW-only reviewer opens reason, submits one `差し戻す`, sees success, and Person still shows the original name. Confirm-only authority never arises from a legacy Role.
3. Browser: proposer sees only own rejected request and real reason under authorized Person; submitting a new correction leaves old REJECTED request intact and new Change PROPOSED. Customer B remains inaccessible.
4. All 39 unit, database Golden, previous JOIN/SUPPORT and browser regression suites green in hosted synthetic CI.

No live connection, hosted database migration, real Grant provisioning, production release or main merge is authorized by this Draft.
