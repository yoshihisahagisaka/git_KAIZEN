# FACTACT Device S2b-1 — typed Source/Change persistence and security gate (2026-11-20)

Status: DRAFT / disposable PostgreSQL-only / No runtime Device write or actual import.

## Canonical and dependency

Business Decisions #90 and #92; docs/02-domain-model.md; docs/adr/0005-change-lifecycle.md.
This is an independent child of S2a Draft PR #71 at head 35de20ad968a7a356133b590e477e292a3a5c9d7.
S1 #70 and S0 #69 are inherited, unmodified. Registry/G3 PR #60 and #66–#68 are still separate, unmerged and unchanged.

## Fit/Gap

| Component | Existing | S2b-1 | Completion |
| --- | --- | --- | --- |
| Source request | Person First Edit source in Draft #60; JOIN requires genuine Work/Action | New immutable typed Device request/source table; real Evidence ID and actor/Tenant/Service/Contract/Recipient/Organization references, expected Device revision and request-key uniqueness | DB schema / not callable API |
| Common Change | JOIN REALITY_CHANGE, Person display-name KNOWLEDGE_STATE_CHANGE only in upstream #60 | Device KNOWNLEDGE_STATE_CHANGE kinds added to common changes, with independent device subject & typed request FK | DB schema only |
| Source exclusivity | JOIN Work+Action; upstream Person Registry request | Exact-one-source CHECK preserves JOIN; preserves Person branch when upstream Registry request table exists; Device must have no invented Work/Action | DB CHECK |
| Evidence | EXECUTION_ATTESTATION and VERIFICATION | Adds SOURCE_REFERENCE for minimal source/hash metadata; no document archive, no retention assumption | DB type / governed source capture not implemented |
| Human approval | S0/S2a pure policy; no DB command | DB two-human guard for verified and committed Device Change; new runtime Device direct write/read blocked by restrictive RLS | SQL constraints, NOT transactional command |
| Field provenance | S1 device_field_events with FORCE RLS and no runtime grants | No new generic Fact table. S1 stays append-only; S2b-1 does not yet write events/Device/Audit atomically | S2b-2 GAP |
| Organization | S1 nullable Device org FK; upstream Org Recipient pending | Source request requires tenant-consistent Organization, source Evidence, Service and Recipient FK. Exact Recipient Organization equality and live grants still require real DB command | S2b-2 GAP |
| JOIN/SUPPORT | Separate Registry and Work contexts | Unchanged | S3 GAP |

## Important fail-closed boundaries

1. Existing tenant-level asset_tag uniqueness remains. Organization collisions require an explicit legacy attribution / index cutover.
2. Device subject id in a PROPOSED initial Change is a planned future UUID, so no Device FK before Commit; source request FK validates its identity and proposer. A successful database Commit must create the Device, history and Audit atomically. This Draft DOES NOT implement those DB writes.
3. S2b-1 adds a Device-only request table with FORCE RLS and no runtime privileges/policies. It also prevents the pre-existing factact_runtime generic Change read/insert/update from being used for Device Changes. The eventual approved scoped projection/executor is NOT provided.
4. Source reference Evidence existence is not proof that a file is valid, that a Work was performed or that the recorded field is true. The actual Event/Work/Evidence/Actor/recipient linkage must be proved by a server-resolved, transactional S2b-2 Command.
5. The branch based on #71 does not contain #60's Organization ServiceRecipient or Registry executor migrations. Test fixtures on current main use a Person recipient only to verify structural FKs; **these tests do not certify real Organization-scoped Create/Update authority**. No Runtime Device write is possible from this branch.
6. The additive Migration conditionally retains the Person First Edit source branch only when registry_edit_requests exists; the full stacked #60/#66/#68 migration must be re-run in a separate synthetic integration gate to prove exact ACL/RLS/DDL compatibility. No existing migration has been edited.
7. Do not conflate adoption/approval of an initial source record with verification of actual Device attributes or make source text 利用中 into AVAILABLE.
8. No AI direct DB update, implicit Device relation, broad bulk PATCH, new generic Core object, new data-retention regime, Customer data, GCP or Production changes.

## Synthetic DB checks

tests/database/device-typed-source-change.test.ts covers:
- SOURCE_REFERENCE existence with minimal digest reference (not whole file);
- typed request–Change key/actor/target identity;
- no Device created at Proposal;
- runtime cannot read/write the new ledger and cannot read/edit Device Changes;
- append-only request and duplicate request key rejection;
- wrong Device/Actor FK, JOIN+Device hybrid, PERSON+Device hybrid rejection;
- source register cannot claim FIELD_VERIFICATION;
- dual control and tenant-consistent Evidence/Organization FKs;
- FORCE RLS.

Tests are structural and privileged fixture writes, NOT functional DB RPC acceptance. The existing DB/Golden/browser suites must continue passing.

## Next S2b-2 security and integration Gate

1. Reconcile source table and SQL Change variant against corrected Registry executor finalization in #66/#68 with PostgreSQL17 non-superuser principal and FORCE RLS; do not bypass current grants or disable RLS.
2. Add a limited executor / transaction adapter with real current grants, Organization Recipient equality, authentic Source/Evidence checks, request idempotency, Change→Verify→Commit, version-locked Device projection, S1 field events and Audit in one transaction. No blanket Runtime writes.
3. Test genuine two-customer same-Tenant denial, revocation during concurrent commit, rollback, duplicate source, existing JOIN & Person Registry regression.
4. S3 separately exposes authenticated customer Scoped Device Read and Work-driven verification, and protects JOIN list/start/verify/commit.
5. Assessment PR #48 remains offline preview until Product publishes an approved authenticated contract.

Local/CI success is not Hosted Migration, GCP/Production Go, or approval to merge stacked PRs.
