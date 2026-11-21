# FACTACT | Operator-level policy administration — Accepted contract and DB Gate (2026-11-10)

Status: **ACCEPTED PRODUCT CONTRACT (2026-11-10); DB/authorization/audit implementation is a separate stacked Draft.** Approval authorizes implementation/review only, **not** deployment, Production migration, main merge, active-policy enforcement, actual Grant issuance, live operator assignment, real-customer changes or automatic Commit.

## Decision source and precedence

The Product Owner explicitly approved all four administrative-contract choices after the integrated Registry Draft PR #56 achieved **365 PASS / 0 FAIL** in hosted synthetic CI. The approved proposal was recorded in `factact-registry-integrated-acceptance-and-policy-gate-candidate-20261110.md` and summarized at the approval boundary. This record supersedes that candidate's *unapproved* status for the four choices only; the accepted Registry first-edit contract, Actor Neutrality and the separate live authorization model remain unchanged.

1. **Only initial administrator:** the existing individually verified Google subject approved for Scoped Grant management (萩坂さん) is also the sole initial **operator-policy administrator**. That is a separately authorized *management action*, audited on every policy/level change. An email string, Tenant ADMIN role, job title, policy level or Scoped Grant never authorizes it. Reuse the existing verified-session/active-membership/approved-subject DB lock and server Origin/CSRF boundary. This designation does not issue any Grant.
2. **Service-scoped management labels:** assign an active Actor to one human-readable level for a specific Tenant + Service, not globally or as an automatically ordered role. Start with `NEWCOMER` (新人), `STANDARD` (一般), `LEAD` (責任者). Record each assignment/removal as an immutable event, including reason, approver and time. Different Services do not inherit an assignment.
3. **Versioned category matrix, no active defaults:** an administrator prepares immutable, numbered policy snapshots scoped to Tenant + Service. The first category is `PERSON_DISPLAY_NAME_CORRECTION`; each level has exactly one `DENY` (不可) or `REQUEST` (申請) cell. **`COMMIT` (確定) is never valid for this first two-Actor category**. Additional categories and immediate-commit exceptions need separate field/evidence/self-review decisions. Migrations seed no level assignment, version, publication, or effective customer permission. Unknown/unassigned/unpublished policy must never authorize a change.
4. **Explicit publication and reviewer routing:** record publication/disabling as separate, reasoned, auditable events; maintain revision history without overwriting old snapshots. Reviewer resolution continues through current target-specific `REGISTRY REVIEW/APPROVE` Grants; a label cannot assign a reviewer, approve a Change or alter pending proposals retroactively. Missing reviewers remain genuinely pending, never auto-approved.

## This Draft: narrowly scoped persistence and DB authority

- Add private, append-only `operator_policy_assignment_events`, `operator_policy_versions`, `operator_policy_publication_events`, and `operator_policy_admin_requests`. No runtime direct SELECT/INSERT/UPDATE/DELETE. All writes require narrow `SECURITY DEFINER` commands using the existing `factact_private.require_scoped_grant_approver` verified-identity guard, live Tenant/Service/Actor state and per-Service serialization.
- Every successful assignment, snapshot creation or publication/disable writes the operation, private idempotency receipt and public domain Audit **in one transaction**. The same request+payload is idempotent; different payload or operation with the same request ID fails closed. The private receipt records the verified issuer/subject without disclosing it to browser or logs.
- One first-category snapshot only in this Gate; `DENY/REQUEST` are management-policy values, never substitutes for `REGISTRY UPDATE/REVIEW/APPROVE` and no new operator-role or broad Registry UPDATE rights are introduced.
- A publication ledger event is **not effective Registry enforcement in this Draft**. No application command or user-facing HTTP route consumes policy tables yet; the separate policy-eligibility/UI Gate requires an independent implementation/authorization review. Do not infer a policy `PUBLISH` record can cause immediate Commit.

## Synthetic acceptance and security review Gate

1. Migrate with **zero** assignments, versions and publications. Runtime cannot directly query/mutate private policy data; only the named functions are executable.
2. Reject unapproved OIDC subject, legacy compatibility Session, revoked approver/membership, inactive actor/service and mismatched Service/Tenant. A legacy ADMIN role gives no privilege.
3. Verify per-Service level assignment/removal history, independent numbered immutable versions and explicit publication/disable history; default is never implicit `REQUEST` or `COMMIT`.
4. Deny missing cells, extra levels, unapproved `COMMIT`, incompatible retries; prevent duplicate Audit on idempotent retries. Parallel version creation must serialize.
5. On forced Audit failure, roll back all assignment/receipt/audit writes. Policy management never creates, expands or revokes a Scoped Grant.
6. Full existing JOIN/SUPPORT/Registry Golden, browser, typecheck/build regression remains green in hosted synthetic CI. Local embedded PostgreSQL may be unavailable due to ICU shared-library mismatch.

## Release and separate administrative UI Gate

No real administrator UI or policy/Actor listing is exposed by this Draft. A later reviewed HTTP/UI slice must use trusted server session hash, exact Origin/CSRF and stringent input validation, then an explicit eligibility/enforcement Gate must test absent assignment, missing published cell, current Grant revocation and A/B non-disclosure. Real verified-human acceptance and Production rollout need separate Go decisions. Keep the stacked PR lineage and `main` intact.
