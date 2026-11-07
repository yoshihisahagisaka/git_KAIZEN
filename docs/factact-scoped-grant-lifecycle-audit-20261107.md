# FACTACT | Scoped Grant lifecycle Audit backstop (2026-11-07)

Status: **Stacked Draft / internal review. No merge, production migration, actual Grant issuance/revocation, or release.**

## Fit / scope

- Continues `docs/factact-scoped-actor-grants-persistence-checkpoint-20261106.md` and `docs/factact-scoped-support-authority-commit-lock-20261107.md` without changing Actor/Caller/Recipient distinctions or the explicit Grant semantics.
- An ordinary `factact_runtime` session still has `SELECT` only on `factact.scoped_actor_grants`. No new credential, privileged membership, HTTP command, approval decision, or UI is introduced.
- Future Grant management must be independently reviewed for the Human approval authority and the privileged execution boundary. The existing `ADMIN` Role or a successful login is **not** approval and does not grant this management ability.

## Implemented DB guard

Migration: `supabase/migrations/20261107000500_scoped_grant_lifecycle_audit.sql`.

- A database-level `AFTER INSERT OR UPDATE OR DELETE` trigger appends an `audit_events` record with aggregate `SCOPED_ACTOR_GRANT` for every privileged row mutation, in that same transaction.
- Distinct event types: `SCOPED_GRANT_ISSUED`, `SCOPED_GRANT_REVOKED` (the ACTIVE→REVOKED transition), `SCOPED_GRANT_UPDATED` (other changes), and `SCOPED_GRANT_DELETED` (tombstone if privileged direct SQL deletes a row).
- Snapshot metadata includes affected Tenant/Actor, Service/Contract, exact scope, object kind, operations, effective dates and revocation reason. The trigger does **not** include approval evidence or imply that the operation has been approved.
- For issue/revoke, `actor_operator_id` mirrors the existing `issued_by_operator_id` / `revoked_by_operator_id` **row claim**, not an independently verified authenticated SQL executor. For other UPDATE and DELETE, the audit actor is null. `attribution=GRANT_ROW_FIELDS_NOT_AUTHENTICATED_APPROVAL` makes this distinction explicit. A reviewed management workflow must eventually bind the verified human executor and approved decision separately.
- A failed Audit insert aborts the Grant mutation; rollback removes both. The preceding transaction-level advisory lock from the earlier migration still serializes the Grant mutation with scoped Work writes.
- Trigger runs with fixed `pg_catalog` search path and SECURITY DEFINER, with no public EXECUTE grant. Runtime still cannot mutate Grants.

## Limitations / release gates

- This is a **tamper-evident application history**, not an immutable external ledger or a DB-superuser defense. Table-owner/superuser maintenance can disable triggers, TRUNCATE bypasses row triggers, and already-created data is not backfilled. Production operational controls and migration approval remain separate.
- A privileged direct SQL change now leaves Audit but is **not** a supported production issuance/revocation workflow. Future separately authorized commands must check verified Human approval, active Tenant/Actor/Service/Contract/Recipient context, scoped payload, retry/idempotency and Audit before exposing any management action.
- Approval issuer/approver scope (including whether customer-side delegation is allowed), privileged DB role provisioning, management interface, cross-tenant denial and real-user acceptance remain No-Go. No implicit authorization is inferred from `ADMIN`.

## Verification

- `tests/golden/scoped-grant-lifecycle-audit.test.ts`: issue/update/revoke/delete Audit, explicit unverified attribution, Audit failure rollback and runtime DML denial.
- Existing Grant/Actor-status serialization, scoped Work commands and all other regression tests remain the acceptance baseline.
