# FACTACT | Scoped SUPPORT Authority commit serialization (2026-11-07)

Status: **Stacked Draft / internal review. No merge, production migration, real customer Grant or release.**

## Fit to existing scope and STOP

- Continues Draft PR #36's same-transaction, Work-locked scoped `SUPPORT/UPDATE` boundary, used by the non-closing response/correction commands in Draft PRs #37–#38.
- Existing Canonical: external Actor identity comes from verified Session, Work's actual Service/Contract and latest confirmed beneficiary are resolved in DB, and an effective explicit Grant is required. A Role/Caller association is not a Grant.
- `factact_runtime` deliberately has **SELECT only** on `scoped_actor_grants`; it cannot perform privileged issuance/revocation or row-lock those rows. Keep that privilege boundary intact.

## Implemented lock protocol

1. The first DB action inside `runSupportWorkUpdate` acquires a **transaction-scoped exclusive PostgreSQL advisory lock** keyed by `(tenant_id, actor_operator_id)`, before the existing parent SUPPORT Event shared lock, Work exclusive lock and scoped authorization checks.
2. A DB `BEFORE INSERT OR UPDATE OR DELETE` row trigger on `scoped_actor_grants` acquires the **same transaction-scoped actor key**, regardless of whether a future audited privileged command or authorized direct SQL performs the row change. An UPDATE that changes Tenant/Actor locks both old and new keys in a deterministic order.
3. The Actor's `status` UPDATE trigger acquires the same lock when the status actually changes, so Actor deactivation cannot commit in the authorization-to-COMMIT interval either.
4. If the privileged change gets the lock first, the scoped transaction waits, then rechecks the committed revocation and refuses the command before invoking its callback. If the scoped mutation gets the lock first, the privileged change waits and can commit **only after** the authorized Work/Audit transaction has committed or rolled back. No state where a Grant revokes before a scoped Work mutation commits while that mutation was authorized by the old Grant.
5. The existing final `READ COMMITTED` authorization check remains, including time-bound Contract/Grant validation. Advisory locks release automatically at transaction end. The runtime role gains only EXECUTE on the narrowly named lock function; it gains no Grant INSERT/UPDATE/DELETE or unrestricted repository access.

**Lock order for future management commands:** obtain the actor-keyed lock before taking Event/Work or other authority-dependent row locks. The Grant-row trigger is an enforcement backstop, not a substitute for a documented management-command lock order. A future non-superuser management DB role must be granted EXECUTE on the lock function as part of its reviewed provisioning. Privileged bulk table maintenance that bypasses row triggers (for example TRUNCATE, disabling triggers, or replication-mode bypass) is outside this application-level mutation protocol and must never run concurrently with scoped Work writes.

## Acceptance and remaining STOP

- Concurrency Golden tests cover revocation waiting behind an in-progress scoped write and the inverse order (revoke commits first, no callback), plus Actor deactivation in flight and runtime Grant DML privilege denial.
- All existing stale-revision, cross-Work, cross-Recipient, failed Login/Grant and immutable history tests remain applicable.
- **Still No-Go:** separately authorized Grant issuance/revocation commands and their approval/Audit workflow are not implemented. External content-classification, historical disclosure review, customer UI, real-account E2E and production migration approval remain pending. The shared lock here specifically resolves the Grant/Actor-status COMMIT race; it is not a blanket guarantee against all possible concurrent Tenant/Service/Contract or Session identity policy changes.

## Verification

- `npm run typecheck`: PASS.
- `npm test -- --reporter=dot`: 32 PASS / 3 files.
- Scoped targeted PostgreSQL/HTTP Golden: 46 PASS (3 new concurrency/ACL cases; existing race test adjusted to the serialized outcome).
- `npm run test:db -- --reporter=dot`: 209 PASS / 12 files.
- `npm run build`: PASS.
- `git diff --check`: PASS.

No external environment was modified.
