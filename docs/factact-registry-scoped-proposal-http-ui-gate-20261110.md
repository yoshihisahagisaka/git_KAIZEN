# FACTACT | SCOPED Registry proposer HTTP/UI Gate (2026-11-10)

Status: **Draft, stacked on PR #51. Production, Merge, hosted DB Migration and real Grant are No-Go.**

## Approved contract and first-slice boundary

- Implements only the **proposer** half of `docs/factact-scoped-registry-first-edit-implementation-contract-accepted-20261110.md`: an existing Person's `display_name` correction, one human `編集 → 保存` action, backend standalone `REGISTRY_EDIT_REQUEST → Change(PROPOSED)` and accurate **確認待ち** status.
- The UI never writes to Person directly. The old authoritative `display_name` stays on screen until a separate authorized reviewer Verify + Commit; this slice does not claim a completed correction, identity verification, fictitious SUPPORT Work or Action.
- REVIEW/APPROVE/confirm-and-commit, return/reject, queue and operator-level policy configuration are **not** in this HTTP/UI slice. The previous DB commands remain unexposed through HTTP until their own reviewer Gate is reviewed.

## Session, scope and error contract

1. `GET /api/scoped/registry/organizations/:organizationId/people?serviceId=...` keeps the already approved REGISTRY READ requirement. Its bounded Person projection adds `registryRevision` and a boolean `canPropose`, which additionally requires a live REGISTRY UPDATE Grant for the same verified recipient/contract. No email, broad list, source count or unrelated customer information is returned.
2. `POST /api/scoped/registry/people/:personId/display-name-proposals` requires the existing verified browser session, exact Origin and CSRF header. A strict body accepts only `serviceId`, idempotent `requestId/requestKey`, proposed display name, short real reason and expected Registry revision; Tenant/Actor/Organization/Contract/Recipient/Work are not accepted as caller authority.
3. The Application command and dedicated SECURITY DEFINER database function resolve the actual target's organization/recipient/contract, current Actor, REGISTRY UPDATE Grant, person revision and audit within one tenant transaction, independently of the read/UI authorization hint.
4. Successful submission responds **202** with `{changeId,status:'PENDING_REVIEW'}`; access denied/unknown Person both respond **404**, stale revision or conflicting request key **409**. No SQL text, Grant details or other customer identity are emitted. Unknown database errors remain generic 500 with correlation ID.
5. The form retains one request key for an unchanged retry after a recoverable failure, preventing duplicate Change/Audit on a re-send. A definitive access rejection clears the previously visible directory. No automatic retries or inferred customer affiliation.

## Integration acceptance (synthetic data only)

- HTTP: no session, invalid CSRF/Origin, extra Actor/Tenant fields, unauthorized READ-only, revoked Grant and stale revision fail closed.
- Same Tenant/Service, different Organization A/B and unknown Person are indistinguishable to A-only Actor.
- Accepted submit creates one immutable source and Change(PROPOSED), one Audit event, **no Work/Action**, and does not mutate Person. Same key/payload retry returns the same Change; conflicting reuse returns 409.
- Browser: READ-only User sees no Edit; with REGISTRY READ+UPDATE, `編集 → 保存` shows **確認待ち** while Person still displays its old value; revocation after form opened removes the directory on save denial.
- Existing JOIN/SUPPORT/Registry read, other Golden and browser suites must remain green. Hosted browser/DB CI is required because local embedded PostgreSQL cannot start in this sandbox.

## Remaining Gate and explicit No-Go

- Design/implement a target-specific reviewer queue and `確認して確定` with strict REVIEW/APPROVE Grants; backend Verify and Commit stay distinct. Implement real return/reject persistence separately, and fail closed if a reviewer is unavailable.
- Operator level × change category administration and escalation policies remain a separate approved-default/audit contract, never a second authority system.
- Actual hosted migrator capability, production-like staging rehearsal, backup/restore and release review from PR #51 remain **No-Go**. No production paths, real Grants or migrations were run.
