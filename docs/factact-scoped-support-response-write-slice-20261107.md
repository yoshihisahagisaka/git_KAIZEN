# FACTACT | Scoped SUPPORT non-closing response write slice (2026-11-07)

Status: **Stacked Draft / internal review. No production deployment, merge, real customer Grant or release.**

## Reconciled basis

- Continue Draft PR #30–#36 and the existing Business Canonical for Actor-neutral execution, Service Recipient isolation, Work-local explicit Grants and human-authorized audit. No new Tenant or SONIX-specific authorization model.
- `docs/factact-scoped-support-update-transaction-boundary-20261107.md` already established the same-transaction Work/Grant check, immutable event beneficiary lock, target-bound mutation port, and revocation final check. This slice consumes that port; it does not replace the unresolved privileged Grant revocation coordination gate.
- `SupportCommands.recordSupportResponse` is already the canonical operation for response text, disposition, lifecycle/record revisions, Follow-up, Close and append-only Audit. Copying this logic into an external-only command would permit behavior drift.

## Implemented slice

1. Refactor the existing internal response operation to call a **shared application command body**. Existing internal Role/`support.executeRoles` checks remain unchanged. A separate `recordScopedSupportResponse` entrypoint operates only after DB-resolved `SUPPORT`/`UPDATE` authorization inside `runSupportWorkUpdate`; it verifies the same active SUPPORT Contract but does not grant a customer the internal Operator Role.
2. Extend the scoped transaction's application port with **response-only, Work-bound** methods: Work/Event/Contract/Service reads; the Work's records, lifecycle and Follow-up; corresponding append operations and Audit. Every requested Work, Event, Service and Contract must match the DB-resolved target. Recorded Actor/Tenant identities are checked; Audit linkage and Actor are server-controlled. No unrestricted repository is passed to the scoped command.
3. For the initial external write, only **non-completing response recording** is authorized: `CUSTOMER_WAIT`, `INVESTIGATING`, `MONITORING`, with a human-specified Follow-up date. `COMPLETED`, Close Decision writes, Verification close guard bypass, Reopen and Review/Approve are not permitted through the scoped boundary. `UPDATE` is not equivalent to Close approval.
4. Add `POST /api/scoped/support-work/:id/responses` with strict Zod input (request/revision IDs, text, non-completing disposition, Follow-up date). Client Actor/Recipient/Service/Contract/Grant parameters and Close payloads are rejected. Actor/Tenant come from the verified session. Existing centralized Origin/CSRF requirements apply before writing.
5. Keep the three scoped GET endpoints, internal SUPPORT routes, and ordinary Work lifecycle/record/Audit persistence unchanged. No broad list/search/export/migration or feature-specific client UI is introduced.

## Acceptance and stop gates

- Positive: explicit Work/Recipient `SUPPORT`/`UPDATE` grant records a response exactly once with record/lifecycle/follow-up revision and Audit; it succeeds for an external Actor **without** internal ADMIN/OPERATOR Roles. A separate `READ` Grant is still needed to view history.
- Negative: no UPDATE, wrong Recipient/Work, revoked Grant or Actor, cleared/reassigned beneficiary, forged client Actor/Recipient, stale revision, forged cross-Work repository call, missing session, bad Origin/CSRF, and Close attempts. Missing/unauthorized Work return the same 404 shape.
- Reuse the same command body in existing internal flows so the legacy SUPPORT Golden suite remains unchanged.
- **No-Go**: privileged Grant issuance/revocation still needs serialization against the small window between the final DB permission check and COMMIT. External display content classification (including pre-confirmation free text), external correction/edit command, formal document/Registry access, user-facing UI, and real-account E2E are incomplete. This Draft must not be deployed as a customer feature before those gates are closed.

## Local verification (2026-11-07)

- `npm run typecheck`: **PASS**
- `npm test -- --reporter=dot`: **32 PASS**
- `npm run test:db -- --reporter=dot`: **201 PASS / 12 files**; targeted `tests/golden/scoped-support-http-read.test.ts`: **38 PASS**
- `npm run build`: **PASS**
- `git diff --check`: **PASS**
