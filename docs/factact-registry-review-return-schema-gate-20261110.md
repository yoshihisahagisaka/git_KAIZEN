# FACTACT | REGISTRY review return: DB and authority Gate (2026-11-10)

Status: **Draft, stacked on PR #53. Hosted DB migration, release, Merge and live Grants: No-Go.**

## Fit to accepted decisions

- Accepted Registry first-edit contract Gate 3 permits a distinct reviewer to **return/reject with a reason**; ADR 0005 `RejectChange` preserves the rejected Change and requires **a fresh proposal** for corrections. No in-place amendment to the immutable source, no generic workflow, no Person mutation and no simulated Work/Action.
- New bounded transition: `Change(PROPOSED | VERIFIED) → REJECTED`, implemented as `factact.registry_return_display_name` under the existing NOLOGIN executor. A currently active, scoped `REGISTRY REVIEW` Grant is required; `APPROVE` is **not** required to reject. Reviewer and proposer must be different Actors. Legacy Roles do not convey authority.
- The reason is mandatory (trimmed 1–1000 characters). Store `rejection_reason`, `rejected_by_operator_id`, `rejected_at`, immutable `REVIEW_RETURN` Evidence, `change_evidence` and `CHANGE_REJECTED` Audit. Preserve any earlier verification evidence, original request and proposed effect.
- Same Actor, same reason, same rejected Change retry returns the original ID **without a second Evidence/Audit**. A changed reason/reviewer or already COMMITTED Change fails; Person remains unchanged. The eligible target's Service/Contract/Organization Recipient, active reviewer and live scoped Grant are locked/rechecked in the transaction. If a Grant is revoked or customer scope changes, no partial rejection is written.
- Migration `20261110000400_registry_review_return.sql` extends only existing tables and creates one narrowly typed function. No additional Person/Grant writing rights, no tables, no broad Registry endpoints. Runtime does not receive direct Change update rights. Function ownership transfers to the existing executor without residual membership or schema CREATE.

## Preflight and fail-closed operational gate

- `registry-migration-preflight.ts` recognizes both previously installed **three-RPC** state and the new **four-RPC `RETURN_INSTALLED`** state, checking exact function owner/execute rights and the 13 forced-RLS tables. A partial or unsafe state is `INCONSISTENT`.
- `registry-disable-execution.sql` is a transaction-safe, authorization-gated emergency entry-point disable that revokes all **installed** Registry RPCs, including the new return RPC when present. It leaves source, Change, Evidence, Person and Audit intact. It is **not an automatic rollback**.
- An actual hosted migration remains No-Go until independent DDL/security review, preflight, backup/rollback plan, maintenance window and separately approved execution. Synthetic CI executes only an isolated ephemeral PostgreSQL database.

## Synthetic Golden acceptance

1. Scoped REVIEW-only second Actor can reject, records one Evidence plus Audit with reason/Actor/time; no Person revision, Work or Action mutation. A fresh proposal is allowed; source history survives.
2. Previously VERIFIED but uncommitted Change can be returned without erasing verification Evidence/Audit; rejected Change can no longer Commit.
3. Idempotent same-reason retry and immutable different-reason conflict; already COMMITTED Change cannot reject.
4. Self-review, legacy-Role-only Actor, cross-customer B direct ID and revoked Grant fail closed. Runtime direct UPDATE cannot bypass the typed RPC.
5. Preflight reports the four-RPC state; emergency disable revokes all four entry points and retains data and no persistent executor membership.

## Next stacked HTTP/UI Gate

Add `差し戻し` control to the reviewer queue with a required reason, verified session/CSRF/Origin, and a single real return command. Show truthful `差し戻し` status and reviewer reason to the original proposer through their currently scoped target, enabling a **new** `編集 → 保存` request. Keep the existing one-click `確認して確定` behavior and no cross-customer data access.

This DB Gate does **not** expose a return HTTP path, apply a migration or authorize production release.
