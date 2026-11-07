# FACTACT | Scoped SUPPORT UPDATE transaction boundary (2026-11-07)

Status: **Stacked Draft implementation / internal review only. No HTTP write endpoint, real customer grant, production operation, merge or release.**

## Fit and scope

- Continues the explicit, actor-neutral `SUPPORT` authorization from Draft PR #30–#35; especially PR #35's historical beneficiary-reassignment disclosure gate. This is not a new Tenant/Organization model or a replacement for the legacy internal SUPPORT command authority.
- The existing `SupportCommands.recordSupportResponse` already handles revisions, status transitions, Follow-up, Close guards, append-only history and Audit in a single transaction. Its internal `ADMIN`/`OPERATOR` role and `support.executeRoles` checks must not be silently bypassed or reused as external customer authority.
- This slice adds only the **server-internal transaction foundation** for a future scoped UPDATE command. `PgScopedAccessReader.runSupportWorkUpdate` takes a trusted Actor/Tenant from the server and Work ID, resolves its real Service/Contract/confirmed Organization beneficiary in PostgreSQL, requires an effective `SUPPORT`/`UPDATE` Grant, and invokes a Work-bound mutation callback **inside the same Tenant-RLS transaction**. An unauthorized callback is never invoked.
- The Work update path takes a shared lock on the parent SUPPORT Event (the beneficiary-decision command takes its exclusive lock) and then locks the Work for update. It denies missing, `CLEARED`, and historically cross-Organization reassigned beneficiaries just as the three existing read paths do.
- The callback receives a **narrow Work-local port** (`work`, `progress`, `audit`), not a raw database connection or unrestricted `SupportRepository`. `progress` checks the authorized Work/Service/Contract/Event/Tenant identity. Audit event linkage, Actor ID and time are server-owned. Application commands still own domain transition validation; the low-level port alone is **not** a customer-facing edit operation.
- Authorization is checked again before commit so a Grant revoked or Actor disabled during the callback causes rollback of its Work update and Audit. The runtime role intentionally has read-only access to Grant/Actor tables; it cannot lock those rows using `FOR SHARE` without expanding privileges.

## Explicit safety limits / future work

1. **Not externally callable:** no HTTP route, UI, external `recordSupportResponse`, or broad read endpoint is enabled. Domain-validated response recording (including correction/history handling), non-completion versus Close authorization, and audit of the ultimate operation must be integrated explicitly in the next bounded slice. A plain `UPDATE` Grant is not approval to bypass the existing Close/Review guards.
2. **Revocation race:** a final `READ COMMITTED` check prevents a revocation committed while the callback is running from being silently ignored. There remains a very short interval after this check and before COMMIT. Privileged Grant issuance/revocation commands must coordinate the authority change and Work mutation (with a defined lock protocol) before customer production Go. No additional runtime Grant-table UPDATE privilege is introduced as a shortcut.
3. **External content suitability:** existing historical beneficiary reassignments stay blocked; a single confirmed beneficiary does not automatically classify pre-confirmation free text as safe for publication. Independent content review and initial-release acceptance remain required.
4. **Lifecycle invariant boundary:** the narrow persistence port is an internal building block. Real external mutation must reuse the existing SUPPORT command's record/revision/Follow-up/Close invariants and must preserve append-only history rather than directly manipulating Work status.
5. Grant issuance/revocation Audit, direct customer login acceptance, UI, searchable Registry/Knowledge/Procedure scopes, and real-user E2E remain open. Existing internal Operator UI/routes are unchanged.

## Verification

- Targeted PostgreSQL/Golden: `tests/golden/scoped-support-http-read.test.ts` (29 scenarios; 23 existing read/list/history + 6 UPDATE-boundary cases).
- UPDATE negatives: absence of Grant, `READ`-only Grant, wrong object kind, cross-Recipient/Work, invalid IDs, revoked Grant/inactive Actor, `CLEARED` or historical A→B beneficiary.
- Positive and transactional cases: Work-local authorized mutation and Audit commit together; deliberate error rolls both back; Grant revoked mid-transaction aborts both; forged second-Work identity is rejected at the repository port.
- The read-only HTTP paths and legacy internal command behavior are not changed by this slice.

Local verification (2026-11-07): `npm run typecheck` **PASS**; `npm test -- --reporter=dot` **32 PASS**; `npm run test:db -- --reporter=dot` **192 PASS / 12 files**; `npm run build` **PASS**; `git diff --check` **PASS**.

Deployment gate: **No-Go** until a domain-validated scoped command, revocation coordination, external Actor acceptance, and content-classification evidence are reviewed. This Draft PR must not be merged or deployed as an external write feature.
