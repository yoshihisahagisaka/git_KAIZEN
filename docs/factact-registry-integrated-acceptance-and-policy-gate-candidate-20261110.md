# FACTACT | Registry integrated acceptance and operator-policy Gate candidate (2026-11-10)

Status: **INTEGRATION DRAFT + UNAPPROVED POLICY ADMIN CONTRACT CANDIDATE.** Stacked on Registry Return HTTP/UI Draft PR #55. No production migration/deployment, `main` merge, actual Grant, active operator-level assignment or active policy/default is authorized.

## Existing accepted contract — no redesign

- Canonical: `factact-scoped-registry-first-edit-implementation-contract-accepted-20261110.md`, `factact-product-operating-principles-v1.md`, `02-domain-model.md`, `adr/0005-change-lifecycle.md` and `factact-scoped-registry-change-verify-commit-fit-gap-20261109.md`.
- The human proposer uses **編集 → 保存**; the backend records a standalone Registry request and `Change(PROPOSED)` without modifying Person. A separate human reviewer, holding **current target-specific** REGISTRY REVIEW and APPROVE Grants, uses **確認して確定**; REVIEW-only may **差し戻し** with immutable reason. A return is followed by a new proposal, never modification of the old Change.
- Actor/Tenant/Service/Contract/Recipient, live Grants and revision are checked at write time. Operator level, title, legacy Role and Caller do not convey authority. First Person display-name slice requires two human Actors and has no self-review or immediate-commit exception.

## Integrated acceptance added in this Draft

`tests/golden/registry-integrated-http.test.ts` runs real Express/session/CSRF routes against synthetic PostgreSQL, independently of the already passing isolated command/route/browser tests:

1. Two verified synthetic sessions and target-specific Grants: proposer reads and submits (`202 PENDING_REVIEW`), reviewer sees only allowed pending, returns with reason, proposer sees only their own rejection and resubmits, reviewer confirms, same confirmation retry remains idempotent. Before Commit, the authoritative Person is unchanged; after Commit, exactly its display name/revision changes. Rejected source and both Changes/Evidence/Audit histories remain distinct. No fictional Work/Action.
2. Same Tenant and Service, two independent Organization recipients: A-only proposer/reviewer cannot discover or mutate B by directory URL, direct Person ID, direct Change ID, queue content or count. Unknown and out-of-scope write errors match.
3. Revocation of the proposer's UPDATE Grant **after** the reviewer has read the queue: confirmation is denied, the tentative Verify rolls back with the Commit and Person/Audit/Evidence stay unchanged.

Hosted synthetic CI is the DB/browser evidence source because the local embedded PostgreSQL binary requires `libicuuc.so.60`, unavailable in the current executor. Do not infer DB success from local unit/typecheck alone. The PR should record the exact hosted results before marking integrated acceptance PASS.

## Policy/management Fit/Gap after Registry implementation

| Capability | Verified implementation baseline | Unapproved/configuration Gap |
| --- | --- | --- |
| Scoped proposal/confirm/return | Typed Registry RPCs, audited Change lifecycle, two-Actor checks, protected HTTP/UI | No additional field categories or automatic self-approval |
| Pending-review queue | Only live target-specific REVIEW Grants and same-customer scoped records; APPROVE separately needed to confirm | No position-based reviewer assignment or escalation routing rules |
| Grant governance | Existing one-human verified Google approver and independently audited scoped Grant issuance/revocation | That approval **does not automatically authorize** operator-level or policy administration |
| Operator-level × category configuration | **Product model accepted**: `不可 / 申請 / 確定`; level is a human-facing template | No approved assignment authority, version/activation model, category defaults or live effective policy |

## Next Gate: separately review these four contract choices

These are **candidates**, not active decisions and not an instruction to seed data or create privileges:

1. **Administrator identity.** Candidate: the already verified, individually designated Scoped Grant approver is also the only initial *policy/level administrator*, under a separately authorized and audited action. No automatic entitlement from being that person or a Tenant ADMIN. Policy changes must use the existing strict server-session/Origin/CSRF + DB verified identity boundary and must never issue or revoke Grants implicitly. Confirm this administrative delegation separately.
2. **Scope and version.** Candidate: operator level assignment is per **Tenant + Service + Actor**, while the configuration table is per **Tenant + Service + change category + level**. Immutable, versioned policy revisions and append-only administrative Audit; published version is explicitly selected by an authorized human. No global role hierarchy, inherited service entitlement, historical overwrite or customer-specific Grant inference. Exact migration and DB privilege boundary receive an independent DDL/security review.
3. **Initial categories and defaults.** First category candidate `PERSON_DISPLAY_NAME_CORRECTION`, which must stay **two-Actor / 申請** for any level allowed to propose. New installations seed **no active policy or assignments**; missing/unpublished/ambiguous cells deny policy-controlled edits rather than becoming `確定`. Sample values (`新人/一般/責任者` matrix in the Fit/Gap) are illustrations **only**. Whether to use `不可` for unassigned Actors and when policy enforcement begins require an explicit activation/transition decision; until then, the current approved Grant-only Registry path remains unchanged. Additional categories are separately approved per field/evidence requirement.
4. **Review routing and activation.** Candidate: use the **existing target-specific REVIEW/APPROVE Grant filtered queue**, showing an unassigned pending state where nobody qualifies. A level label must never create a reviewer, approve a Change or retroactively commit pending work. An activation is a deliberate audited administrative event with a rollback/disable path; do not backfill policy settings or apply to Production without a separate Go decision.

## Boundary before policy code/DDL

- Request explicit Product Owner approval for choices 1–4 and the first activation rule; record as accepted Canonical/Decision before a schema or privileged administrative route is built.
- After approval, implement **configuration schema/authority/Audit** as its own stacked Draft, then an **admin UI/eligibility integration** Draft, then synthetic A/B and real-identity validation. Keep Gate 1 (`PERSON_DISPLAY_NAME_CORRECTION`) dual control even if a future policy cell says `確定`.
- No extra roles/implicit Grants, generic workflow, automatic self-review, live policy-cell seed, real customer data, Production DB operation, or merge is included here.
