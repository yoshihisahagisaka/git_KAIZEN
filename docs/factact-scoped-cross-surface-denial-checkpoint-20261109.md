# FACTACT | External Actor cross-surface denial regression (2026-11-09)

Status: **Stacked Draft test-only slice on PR #43; no implementation authority change, schema change, production operation, real Grant or merge.**

## Canonical / As-Is reconciliation

- Inherits the initial-release customer/external Actor and same-Tenant customer isolation acceptance from `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` AC-03–07 and §4.2, and explicit scoped READ/UPDATE session routing from PR #42–#43.
- The older `docs/factact-actor-identity-contexts-checkpoint-20261106.md` lists session Membership revocation as a Gate, but **the current Git already closes it**: migration `20261106001800_identity_bound_session_contexts.sql` revalidates membership in `read_session` on every request, and `tests/golden/session-context-switch.test.ts` covers revocation. No duplicate implementation was made.
- Existing scoped SUPPORT tests cover same-Tenant A/B Work isolation, explicit Grants, revocation, idempotent response/correction and constrained UI. The remaining gap addressed here was **full production-like internal API mounting** in the negative test harness: prior focused scoped fixtures deliberately omitted JOIN, Explore and Grant management routes. A `404` from an absent route cannot prove that a real mounted route refuses a scoped Actor.

## This slice

1. Mount real JOIN (`/api/home`, `/api/work`, Person/Device and JOIN commands), SUPPORT, Explore and Scoped Grant management routes alongside scoped SUPPORT in the existing Golden HTTP and Playwright fixtures.
2. Keep the test Actor in `SCOPED` authority mode **even while its database row carries legacy `ADMIN`, `OPERATOR`, `REVIEWER` Roles**. Assert internal list, direct-ID, search and response/intake routes all refuse access. No internal result, hidden customer name, count or response record may escape.
3. Explicitly attempt privileged Grant issuance with that Actor's valid session/CSRF. Require `403`, no new Grant and no second-customer authorization. A separate explicit `SUPPORT READ+UPDATE` Grant must still permit only the approved customer A Work through scoped endpoints.
4. Browser verifies the same existing signed-in session cannot access mounted internal APIs, while the scoped customer A Work view remains functional. Other customer B stays invisible.

## Verification and NO-GO

- No changes to authorization policies, schema, application mutations, production configuration or business UX.
- Local targeted DB test: **48/48 PASS**. Full build/unit/DB/Playwright CI results are recorded in the PR comments after execution.
- This proves the selected mounted routes under synthetic Actor scenarios. It is **not** proof of the future public intake, Registry/Procedure/Knowledge endpoints, all future export channels or full external customer production enrollment.
- Full first-release acceptance still requires remaining functional slices, all new routes' same-Tenant A/B negative tests, historical free-text classification review, real-account QA and 13-inch Windows human UX review. Production and merge remain NO-GO.
