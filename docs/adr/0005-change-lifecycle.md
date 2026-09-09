# ADR 0005: Change lifecycle and concurrency

Status: Accepted direction for the next JOIN steps, 2026-09-09; Change commands are not bootstrapped yet.

Use document 15's first-slice PROPOSED -> VERIFIED -> COMMITTED lifecycle, with REJECTED available for an invalid proposal. This specializes document 02's candidate lifecycle without removing execution evidence: the Action records actual completion, while the Change records the proposed effect. Starting an Action is not proof it succeeded.

Verify records the reviewed immutable effect, evidence, verifier and time. Commit rechecks tenant, command and Contract Authority, execution/verification, and the expected current state. Stale proposals fail rather than silently changing effect. Corrections require explicit re-proposal and verification.

Commit will lock the relevant Person and Change rows, check expected Relation state, end an intended previous Relation and insert the new verified Relation, mark Change committed and append audit events in one transaction. A partial unique index will enforce one active primary-device Relation per tenant/Person. Retrying the same committed Change returns its existing result; concurrent different proposals cannot silently replace one another.

Effective time describes when reality changed; verification and commit timestamps are distinct. UNKNOWN before assignment must not be rewritten as a historically proven absence. History is ended, never overwritten/deleted. CompleteWork will require its claimed reality-changing outcome to have the required committed Change; it cannot mutate Registry state.

Detailed command schema/guards and GT-05–GT-12 will be implemented after bootstrap review, before any adjacent feature expansion.
