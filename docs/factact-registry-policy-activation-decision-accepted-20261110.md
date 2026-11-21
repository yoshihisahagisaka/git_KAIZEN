# FACTACT | Registry operator-policy transition decision (2026-11-10)

Status: **PRODUCT DECISION ACCEPTED; IMPLEMENTATION DRAFT / PRODUCTION NO-GO.**
User approval: 2026-11-10, following the isolated eligibility preview Gate in Draft PR #59 and hosted synthetic CI PASS (385 tests).

## Five accepted transition conditions

1. The policy application start is an **explicit, audited per-Service event**; publishing a policy version or assigning a level does not start enforcement automatically.
2. Validate first with one **Synthetic Staging Service**. A production release, existing real Service activation, main merge or live migration needs a separate Go decision.
3. Registry Changes proposed **before** activation retain their Grant-only workflow to completion; they never gain self-review or bypass live target-specific UPDATE/REVIEW/APPROVE Grant checks.
4. **New** proposals after activation require both the effective policy disposition and current exact scoped Grant; allowed display-name changes remain `REQUEST` and two-human Change → Verify → Commit.
5. Stop/rollback is a separate audited administrative operation. It must **not** implicitly expand permission back to the legacy Grant-only proposal path.

## Engineering interpretation for the Draft

- One Tenant+Service activation ledger, append-only ACTIVATE/STOP events, immutable policy version pinned at ACTIVATE. Activation requires that version to be the latest published snapshot. Re-publication/disable after activation fails **closed** for new proposals until a new explicit ACTIVATE; no silent policy revision switch.
- A Service **never activated** uses the existing Grant-only proposal path. A Service with latest operation STOP rejects **new** proposals; it does not silently recover the never-activated state. An authorized, audited ACTIVATE can subsequently resume proposals.
- One source request's original `Change(PROPOSED)` and Audit persist; the proposal entrypoint records which route made the decision. Verified/committed old pending requests keep the existing exact scoped Grant and two-Actor checks, irrespective of later activation/stop.
- The activation admin command reuses only the existing verified, individually designated human approver, live identity/session controls, reason, idempotency key, and append-only Audit; operator level/Role is not authorization.
- The activation capability is not a production feature flag. It will exist only on the Draft branch until an independent Staging rollout and explicit Production Go. No real Tenant, Service or Grant can be bootstrapped as part of this slice.

## Acceptance / STOP

- DB Golden: no event → legacy compatibility; event ACTIVATE → DENY without current level or Grant, REQUEST with both; STOP blocks new requests; old pending can still Verify/Commit; exact customer/Tenant/Service remains isolated; unpublished/version-drift fails closed; duplicate/audit/permission boundaries.
- HTTP/Chromium baseline must remain green. Tested operations use synthetic database fixtures only.
- Missing identity, target-specific Grant, publication, activation version or reviewer always denies; no auto-commit, implicit permission fallback, broad administrative read, live migration, merge or Production deployment.
