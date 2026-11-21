# FACTACT Device S2a — typed Command transaction boundary (2026-11-20)

Status: **Draft application-only execution contract and synthetic acceptance. No SQL Device RPC, no HTTP endpoint and no real customer data.**

## Existing decisions and exact Git boundary

- Business Decisions #90 / #92: initially accepted source claim is not automatically verified real-world FACT. Daily Work observations verify only explicitly checked fields.
- Main / Canonical: docs/02-domain-model.md, docs/25-factact-multiview-connection-ai-off-principles-v1.md, docs/adr/0005-change-lifecycle.md.
- Parent: S1 Draft PR #70 at f54a2671f5d45e66c86bcdb27785e9e7618f37a7, itself stacked on S0 Draft PR #69 at 9d606590a678a002c18b3f625b65b0a076aee5c0.
- Existing Registry Person First Edit and Hosted PR #60–#68 stay unmodified / unmerged.
- The S1 migration and S0 Product policy are reused; nothing here duplicates their field verification rules.

## S2a implementation

- packages/application/src/device-information-write-commands.ts: request-scoped propose initial / propose correction / propose field verification and a reviewer-only confirm that internally runs Verify then Commit.
- Verified Session Actor/Tenant are supplied by an eventual authenticated server adapter. A browser may send target hints only. Transaction adapter must resolve valid Organization ServiceRecipient, current Contract, live Actor, exact REGISTRY grants and actual Work scope from the database.
- Evidence admissibility must be established using real source row/Work/Evidence/Device/field/value links, not merely by presence of an evidenceId string.
- Request key is attached to an immutable canonical input fingerprint; identical retries reuse the proposal, changed payloads stop.
- Before commit the adapter rechecks grants, evidence, same-customer Device lookup, current expected revision and duplicate asset identity; for newly imported Device, current state remains UNKNOWN and every field remains UNVERIFIED.
- The same authorized reviewer holding REVIEW and APPROVE may use one UI confirmation; the proposer is always a distinct person. Backend preserves separate Verify / Commit events.
- All side effects (source links, Device projection, proposal state, audit) must be atomic within one DB transaction. The synthetic adapter tests rollback semantics and denial behavior, but no real SQL application adapter is supplied by this PR.
- The pure S0 Device policy is authoritative for field-level meaning; this application orchestration does not change JOIN or SUPPORT APIs.

## Unimplemented / explicit STOP

1. **DB persistence, typed Change linkage and exact DB executor ACL**: current main changes require a Work+Action and Person subject. Draft Person Registry migration #60 introduces a distinct Person request. Device-specific source and Change CHECK/FK must be independently integrated with the corrected #66 finalizer, without expanding or changing existing Person First Edit.
2. **S1 evidence source**: source Evidence type and retention were not approved. For initial CUSTOMER_REGISTER, field-level file claim and source row must be linked through an authorized immutable Evidence record, not artificially reused VERIFICATION evidence.
3. **S1 colliding asset tags**: original tenant-wide uniqueness remains. Asset number collisions among different customer organizations are a valid business case but require a separate quarantined legacy attribution and safely reviewed unique constraint cutover; do not merge S1/S2a into Production.
4. **No direct runtime/AI DB writes**. The Device field history table has no Runtime CRUD privileges; the Application commands shown here are a contract for a future narrow restricted executor.
5. **S3 not yet done**: customer-scoped Registry/SUPPORT Device read, Work observation to field verification, actual JOIN assignableDevices listing and start/verify/commit eligibility guards.
6. **Tests**: the synthetic in-memory transaction fixture verifies all-or-nothing semantics but is not evidence of SQL RLS, real row locks, concurrent retry behavior or authenticated HTTP boundary. Local PostgreSQL / Golden / browser CI from parent remains a regression gate, not an S2 integration acceptance.
7. **Hosted/Production**: GCP Billing quota pending; no Hosted Migration, GCP edits, customer records, existing PR edits or merges.

## Recommended next approval-free development slice

- S2b: integrate exact Device Change Source / Evidence / status and append-only history with corrected Registry executor SQL as a new, independently reviewed Draft branch; run a fresh disposable PostgreSQL 17 synthetic fixture with real RLS, direct update denial, idempotency, cross-customer and rollback tests.
- Once S2b passes, S3 adds customer-scoped Device Read and Work-driven field verification, then JOIN safety gating at all entry points.
- Production/Hosted Go and source-file retention decisions remain separate.
