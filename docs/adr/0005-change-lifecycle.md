# ADR 0005: Change lifecycle and concurrency

Status: Accepted direction for the next JOIN steps, 2026-09-09; Change commands are not bootstrapped yet.

Use document 15's first-slice PROPOSED -> VERIFIED -> COMMITTED lifecycle, with REJECTED available for an invalid proposal. This specializes document 02's candidate lifecycle without removing execution evidence: the Action records actual completion, while the Change records the proposed effect. Starting an Action is not proof it succeeded.

Verify records the reviewed immutable effect, evidence, verifier and time. Commit rechecks tenant, command and Contract Authority, execution/verification, and the expected current state. Stale proposals fail rather than silently changing effect. Corrections require explicit re-proposal and verification.

Commit will lock the relevant Person and Change rows, check expected Relation state, end an intended previous Relation and insert the new verified Relation, mark Change committed and append audit events in one transaction. A partial unique index will enforce one active primary-device Relation per tenant/Person. Retrying the same committed Change returns its existing result; concurrent different proposals cannot silently replace one another.

Effective time describes when reality changed; verification and commit timestamps are distinct. UNKNOWN before assignment must not be rewritten as a historically proven absence. History is ended, never overwritten/deleted. CompleteWork will require its claimed reality-changing outcome to have the required committed Change; it cannot mutate Registry state.

Detailed command schema/guards and GT-05–GT-12 will be implemented after bootstrap review, before any adjacent feature expansion.

JOIN checkpoint implementation, 2026-09-09: the lifecycle above is implemented
and covered by GT-05–GT-12. StartAssignDeviceAction accepts a human attestation
of completed assignment, execution evidence and actual effective time; it records
the completed Action and proposed Change atomically, never a Relation. Verify
and Commit remain separate commands. Locks serialize competing proposals for
the same Person/device; unique active indexes cover both Person and device.
Commit is idempotent and rolls back Relation, Change, Work progress and audit
together on failure. An intended replacement requires the explicit previous
Relation ID, and ends that Relation without deleting history. RejectChange is
the bounded correction path for an invalid or stale proposal: preserve it and
its evidence as REJECTED, then create and verify a fresh proposal. It introduces
no generic workflow. CompleteWork changes only Work and audit after committed
outcomes; JOIN readiness is derived from the verified Relation.
