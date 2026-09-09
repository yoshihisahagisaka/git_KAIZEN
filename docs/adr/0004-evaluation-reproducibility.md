# ADR 0004: Evaluation reproducibility

Status: Accepted direction for the next JOIN step, 2026-09-09; evaluator is not bootstrapped yet.

Product Owner correction: document 14's department/employment-type rule is illustrative, not mandatory. The first COMPANY_PC requirement uses an explicit bounded Contract Profile rule requiring a company PC. No department/employment-type fields, JOIN-only shadow facts or authoritative raw Event JSON are introduced.

The seed Contract Profile v1 contains only the supported requirement configuration and device-assignment authority scope. Runtime validation will reject unsupported configuration. Future department/employment-type data must be reusable Operational Facts with provenance, reliability and verification semantics.

An evaluation will retain the immutable Contract Profile ID/version, requirement catalog version, referenced Facts/Decisions and the basis snapshot used. A snapshot explains an evaluation; it is never the authoritative source of those Facts. Repeating an effective Event/evaluation version must reuse its result/Work. Explicit re-evaluation creates a new revision linked to its predecessor. Database uniqueness and transaction locking will enforce idempotency when the evaluator is implemented.

UNKNOWN remains unknown; lack of a Relation alone does not prove absence in reality. A bounded requirement can justify preparation/confirmation Work without inventing a current primary device. No Work results remain stored evaluations, not fake closed Work.

JOIN checkpoint implementation, 2026-09-09: version 1 is implemented with strict
bounded configuration, immutable basis snapshots, Event locking and unique
Event/requirement/version results. Repeated evaluation returns the stored result
and Work. New revision creation remains a future explicit command; this slice
does not expose re-evaluation or overwrite an earlier basis. The bounded rule
supports REQUIRED, NOT_APPLICABLE and DECISION_REQUIRED; a verified active
Relation can satisfy the requirement without new Work.
