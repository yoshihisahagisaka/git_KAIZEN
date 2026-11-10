# FACTACT | Registry first-edit Application security review (2026-11-10)

Status: **Draft review evidence — Production / Merge No-Go**. Applies to stacked Draft PR #49 on PR #48 and the accepted contract on PR #47. Do not treat a passing synthetic CI suite as privileged-DDL production acceptance.

## Reviewed boundary

- First editable fact: existing `Person.display_name` only; `KNOWLEDGE_STATE_CHANGE / PERSON_DISPLAY_NAME_CORRECTION`.
- Truthful source: immutable `REGISTRY_EDIT_REQUEST` and one canonical Change; no fabricated SUPPORT/JOIN Work or execution Action.
- Application exposes trusted-session Actor/Tenant only; persistence adapter has no HTTP route in this slice.
- SQL transition RPCs resolve Person/Recipient/effective Contract from database, not an untrusted Caller affiliation. `UPDATE` → Propose, `REVIEW` → Verify, `APPROVE` → Commit, with distinct proposer and reviewer. The authorized reviewer may also Commit.
- Actor-key transaction advisory locks match Grant issue/revoke and Actor deactivation triggers; changes, target Person revision, evidence and Audit commit atomically.
- Runtime cannot directly insert the Registry source, update a Registry Change or update Person name/revision. Dedicated SECURITY DEFINER functions are the only proposed runtime write boundary.

## Fit/Gap and changes from review

| Area | Finding / evidence | Disposition |
|---|---|---|
| Service vs customer identity | Initial Propose mistakenly required the Service owner Organization to equal the edited Person Organization; this would deny another customer of the **same Service**. | **Fixed in Draft**: resolve Person's actual Organization ServiceRecipient, enforce current exact Recipient Grant; new synthetic A/B test. |
| Revocation and target state | Actor grants/deactivation are serialized by their existing advisory lock. Target Org/Service/Contract/Recipient must also remain active during transitions. | **Hardened in Draft**: share-lock active context rows through transaction and recheck before Review/Commit; tests for recipient deactivation and in-flight Grant revoke. |
| Unauthorized existence leakage | Early Review/Commit error strings could distinguish an unknown Change from an existing out-of-scope Change. | **Hardened in Draft**: common `42501 / Registry change unavailable` for missing/self/out-of-scope paths; comparison test. Route-level error normalization remains a future HTTP Gate. |
| Duplicate proposal / stale revision | Same request key must be idempotent only for same payload; stale Person revision must never overwrite. | Fit: compare immutable source and expected revision, reject stale; CI synthetic tests. |
| Dual control / evidence | Proposer cannot verify/commit; same reviewer with both rights may Verify then Commit. Verification evidence and Audit must exist before Person mutation. | Fit: negative and positive synthetic tests. No live Grant issuance. |
| JOIN / SUPPORT compatibility | Existing Work+Action Change and unrelated scoped writes must continue to function. | CI regression required and tracked. |

## Open security Gates (not yet approved)

1. **SECURITY DEFINER deployment owner and FORCE RLS**: CI creates functions under a privileged disposable PostgreSQL migration owner. Production must explicitly establish the least-privileged function owner, required table/function permissions, applicable RLS behavior, execute ACL and revocation guarantees. Do **not** depend on incidental `postgres` superuser ownership in production.
2. **Independent DDL and rollback review**: analyze staged migrations and effects on existing JOIN/Person history; verify explicit rollback, direct SQL misuse and concurrent deactivation/reassignment on a production-like non-superuser PostgreSQL role.
3. **Authenticated HTTP boundary**: only a server-verified Actor/Tenant session may call Application commands; browser-supplied actor/tenant/contract/recipient IDs are never authority. Normalize errors, protect CSRF, return truthful `確認待ち`, restrict queue projections to current exact Grants.
4. **Review return and operator-level policy**: implement a deliberate Return/Reject transition and scoped queue in later Draft. No assumed operator level, no implicit Grant, no production `確定` default and no same-Actor exception.
5. **Integrated environment**: synthetic A/B, concurrent revocation, real authenticated browser journey and production release checks are separate from this Application slice.

**Decision:** Keep stacked Draft PRs unmerged, do not deploy/issue real Grants/activate Registry mutation. Next development Gate is an isolated scoped HTTP/UI Draft only after the privileged-function security boundary is reviewed; this note does not waive that Gate.
