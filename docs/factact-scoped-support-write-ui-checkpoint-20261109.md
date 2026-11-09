# FACTACT | External Actor scoped SUPPORT response/correction UI checkpoint (2026-11-09)

Status: **Stacked Draft implementation on PR #42; no merge, production DB, real Grant, account enablement or deployment.**

## Inherited contract and fit/gap

- Parent: `docs/factact-scoped-support-read-ui-checkpoint-20261109.md` and its explicit `SCOPED` / `INTERNAL_V1` session routing. The parent PR #42 is still Draft.
- Reuses existing non-closing scoped response HTTP route and append-only text correction HTTP route, including application validation, actor-keyed revoke/commit lock, transaction-scoped UPDATE authorization, optimistic revision checks, idempotent request IDs and Audit.
- Adds only the read metadata required to submit those commands: `lifecycleRevision`, `recordRevision`, server-derived `canUpdate` and per-history-record `canCorrect` (own, non-closing, not already superseded). Actor IDs, Grant objects, raw command payloads and other Work records remain excluded.
- No new permission model, schema migration, Close/reopen, disposition/follow-up correction, broad internal JOIN/SUPPORT UI, registration flow, or company-wide search.

## User flow and safety decisions

1. `READ` alone: list/detail/history, **no** response/correction controls. `READ+UPDATE` on the same Work: show response form with required text, non-closing disposition and mandatory follow-up. Do not expose a Close option.
2. Correction is a separate append-only form reachable only from an actor-correctable history entry; it requires new text and a reason, leaving original text, disposition and follow-up intact.
3. Both POSTs use session CSRF, client-generated request IDs, current server read revisions and independent transaction-scoped UPDATE checks. The UI eligibility flags are hints, **not authorization**. Retry after a failed POST keeps its request ID until the form changes or the action succeeds; the server remains authoritative.
4. On error the UI does not silently overwrite or auto-retry a stale revision. Explicit revalidation clears old Work visibility if authorization was revoked. Tenant context switching still unmounts the whole scoped UI before switching.
5. History sanitization remains within the selected Work. The correction-eligibility boolean discloses neither author identities nor other Work content.

## Acceptance evidence

- `npm run build` (including typecheck): **PASS**.
- `npm run test`: **35/35 PASS**.
- `npm run test:db`: **237/237 PASS** (17 files). New DB case covers READ-only vs UPDATE projection, revisions after response and correction, own-record correction eligibility, downgrade back to READ, and cross-customer B hiding.
- `npx playwright test --list`: **27 browser tests discovered** across four files; six of those exercise scoped UI, including three new response/correction/read-only/revocation scenarios.
- Browser execution locally: **NOT EXECUTED**. The Playwright-provided binary is absent; system Chromium also fails before page startup with `socket() failed: Operation not permitted (1)`. This is an execution-environment gate, **not a tested PASS**. GitHub CI browser run required.

## Remaining gates / explicitly not claimed

- GitHub CI results, external Actor human UX review (13-inch Windows), and parent PR review remain required before any merge. This slice does not complete the full Actor-neutral initial-release contract.
- Public inquiry intake, authorized Registry and Procedure/Knowledge editing and wider cross-customer negative regression coverage remain separate planned slices.
- No production migrations, grants, secret changes, account provisioning, release or operational activation are approved or performed by this PR.
