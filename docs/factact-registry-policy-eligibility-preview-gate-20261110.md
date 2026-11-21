# FACTACT | Registry operator-policy eligibility preview Gate (2026-11-10)

Status: **IMPLEMENTATION DRAFT — ISOLATED PREVIEW ONLY / ACTIVATION NO-GO**.
Parent: operator-policy HTTP/UI Draft PR #58. No production migration/deployment, merge, actual Grant issuance, policy activation or real customer change is authorized.

## Canonical continuity

- Read with `factact-operator-policy-administration-contract-accepted-20261110.md`, `factact-scoped-registry-first-edit-implementation-contract-accepted-20261110.md`, the current Registry Change/Verify/Commit ADR, and the integrated acceptance Gate.
- The verified policy administrator can assign `NEWCOMER / STANDARD / LEAD`, create immutable category/level snapshots and publish/disable a snapshot. These operations are append-only and independently audited; publication itself is **not** activation of Registry enforcement.
- Existing Registry first-edit API/UI remains **Grant-only** pending an explicit transition decision. Existing approved flow is preserved, including two distinct humans and target-specific `REGISTRY REVIEW/APPROVE` Grants.

## What this Draft adds

`factact_private.registry_display_name_policy_eligibility(tenant,actor,service,contract,recipient)` is an **internal, non-mutating evaluation helper**, not a new public endpoint or production authorization switch.

1. Missing/wrong Tenant context, Actor, Contract, Recipient, Service, current `REGISTRY UPDATE` Grant or inactive target → `DENY`.
2. Missing/unassigned Actor level (per Tenant + Service + Actor), unpublished/disabled latest policy version, absent category or `DENY` cell → `DENY`.
3. Only a current, explicitly assigned level with a published `PERSON_DISPLAY_NAME_CORRECTION` cell of `REQUEST` **and** the current exact scoped Grant can return `REQUEST`. It cannot return `COMMIT` or issue an effective permission alone.
4. Reads use the restricted, non-login `factact_registry_executor` as `SECURITY DEFINER` owner, with only the necessary columns from private policy ledgers. `factact_runtime` cannot call the helper or directly read private ledgers. The evaluator writes no Person, Change, Grant, Evidence, Audit or policy record.
5. The caller must supply a target context already resolved for the actual Person. This preview **does not** resolve/lock the Person itself, so it must not be exposed as a public authority endpoint or used as an authorization replacement.

Golden synthetic DB tests prove missing/unpublished/disabled/reassigned scenarios; per-Recipient isolation; expired/revoked/wrong-operation Grant; inactive Actor; Tenant mismatch; runtime privilege boundary; no evaluator side effects. Existing Registry HTTP/Chromium flows should remain unchanged.

## STOP conditions / transition decision still required

Policy publication is **not** a production Go decision. To wire the helper into the Registry propose transaction, approve and record each of the following before an activation migration or behavior change:

1. **Effective scope and time**: explicit per-Service activation event and its effective time, rather than implicit activation on publish or first assignment. Recommended: start with one synthetic/Staging Service, then a separately approved production target.
2. **Preconditions**: designated Actors have verified active levels; the intended immutable policy version is published; all current Scoped Grants and reviewers are independently inspected. Unassigned under activated scope is `DENY`, not a legacy-role fallback.
3. **Existing pending Changes**: decide whether proposals created before activation retain their original approval path through Commit, while new proposals use the policy Gate. Preserve two-Actor and live Grant checks in either case; never silently auto-commit or strand pending work.
4. **Rollback**: a separate, audited Service-level deactivation path, including how pending work is treated, rather than automatically interpreting `DISABLE` of a published snapshot as permission to use the old path.
5. **Live cutover implementation**: inside the DB Registry proposal transaction, lock and resolve the actual Person/Tenant/Service/Contract/Recipient, check exact Grant and current policy atomically, and reject on `DENY`; add integrated HTTP/Chromium tests for activated vs non-activated Services, concurrency, legacy pending and revocation before enabling.

**Current decision**: none of those activation/transition choices is approved. Accordingly this Draft must not change any `factact.registry_*` command, HTTP route or existing UI eligibility rule.
