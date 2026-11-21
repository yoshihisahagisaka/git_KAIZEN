# FACTACT | Scoped SUPPORT response text correction slice (2026-11-07)

Status: **Stacked Draft / internal review. No merge, production deployment, real customer Grant, or service release.**

## Fit to existing decisions

- Continues the explicit Actor/Service Recipient/Work Grant boundary in Draft PRs #30–#37. `SUPPORT` + `UPDATE` is evaluated for the DB-resolved Work inside the existing scoped transaction. It does not confer internal Operator Role or Close authority.
- `docs/support-round3-phase2-implementation-contract.md` requires immutable operational records, an appended correction record and provenance; correcting an observation must never replay an Action.
- Extends the existing `SupportRecord` append-only store with `RESPONSE_CORRECTION`, rather than overwriting a `RESPONSE`, changing Registry, or changing its disposition and lifecycle.

## Narrow command / HTTP contract

`POST /api/scoped/support-work/:id/responses/:recordId/corrections`

Strict request: `requestId` (UUID), `expectedRecordRevision` (integer), `responseText` (1–4000 after trimming), `correctionReason` (1–1000 after trimming). The URL `recordId` is the **immediately superseded** original `RESPONSE` or most recent `RESPONSE_CORRECTION`; the new record's notes include `supersedesRecordId` and corrected text. Actor and Tenant come only from the verified session. All client-selected Actor, Recipient, Contract, disposition, Follow-up or Close fields are rejected. Existing Origin/CSRF middleware is mandatory.

- Can correct only a **non-completing** response originally authored by the same external Actor. Corrections themselves must also be authored by the Actor; no escalation to editing someone else's record.
- Enforces the current Work-bound record revision and requires the selected predecessor not to have already been superseded. Repeat of the same `requestId` and payload returns the same correction; mismatched retry fails.
- Validates every predecessor back to the initial `RESPONSE`; a foreign Work source ID cannot be resolved by the Work-bound port.
- Appends one `RESPONSE_CORRECTION` record and `SUPPORT_RESPONSE_CORRECTED` Audit in the same scoped UPDATE transaction. Audit includes new record ID, predecessor ID, revision and reason. No lifecycle, Work state, Follow-up, disposition or Close modification.
- Existing scoped history projects correction text, reason and predecessor link, alongside the immutable original text, but omits Actor identity, raw command payloads, draft and unrelated Work data. Internal Work history also displays a distinct text correction event.
- DB kind/content checks are additive. `support_work_records` remains INSERT/SELECT only for the runtime, with no UPDATE/DELETE permission.

## Remaining gates (unchanged)

- The privileged Grant issuance/revocation transaction must serialize with the scoped mutation's final permission check before production. The current final READ COMMITTED check is not a complete commit-race solution.
- External content classification / historical free-text disclosure review, actual customer identity/grant E2E and user-facing UI remain pending.
- No generic response editing, retrospective disposition/Follow-up or Close correction, other-author correction, bulk operations or broader object types are authorized by this slice.

## Verification

- `npm run typecheck`: PASS.
- `npm test -- --reporter=dot`: 32 PASS / 3 files.
- Targeted scoped HTTP/DB Golden: 43 PASS (5 new correction cases).
- `npm run test:db -- --reporter=dot`: 206 PASS / 12 files.
- `npm run build`: PASS.
- `git diff --check`: PASS.

No external environment or customer data is changed.
