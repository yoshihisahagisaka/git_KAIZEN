# FACTACT Device初期情報／Work駆動FACT形成 — Product実装計画・依存Gate（2026-11-17）

Status: **DRAFT IMPLEMENTATION / SYNTHETIC POLICY TEST ONLY — NO HOSTED OR DB ACTIVATION**

Business authority: `docs/90-assessment-initial-fact-import-business-proposals-20261117.md`, `docs/92-assessment-initial-information-work-driven-fact-verification-business-decision-20261117.md`. Existing Product principles: `docs/02-domain-model.md`, `docs/25-factact-multiview-connection-ai-off-principles-v1.md`, `docs/adr/0005-change-lifecycle.md`.

## Existing Git / PR Fit-Gap (pinned for this slice)

Base: `main` at `fb4c7a0fab28171698de4d25ffeea28d90fa5c58` (2026-11-17). New independent branch; existing Draft PRs are unchanged.

| Boundary | Current evidence | FIT / GAP | Treatment |
| --- | --- | --- | --- |
| `Device` and tenant RLS | `supabase/migrations/20260909000100_platform_baseline.sql` (`devices.tenant_id`, `asset_tag`, `serial_number`, `device_status`) | GAP: no Device→Organization, no `UNKNOWN`, no field provenance | Pure Product policy first; SQL separately reviewed |
| JOIN assignment | `packages/application/src/join-commands.ts` requires `AVAILABLE` and unused relation; `join-repository.ts` lists `AVAILABLE` | CONFLICT risk: legacy `AVAILABLE` is not field-verified; same-Tenant different Customer not checked | Do not claim runtime protected by new kernel; integration must enforce Customer and verified gate on **both** start and recheck/commit and list query |
| Work / Observation | `packages/domain/src/support.ts`, `packages/application/src/support-commands.ts` and migrations `20261019000600`, `20261101000800` | FIT: true Work-scoped observations; GAP: no per-field Device Registry promotion | Reuse actual Work/Evidence/Observation, no fictional Work |
| Registry First Edit | Draft stacked PR chain around `feat/factact-scoped-registry-first-edit-*`; `20261110000100_registry_first_edit_source.sql` in PR #68 head `e03b660` | GAP: Person.display_name only, Change's subject FK points at Person | Extend via a separately reviewed typed Device subtype; never generalize Person UI/Command |
| Scoped Authority | `20261106001600_scoped_actor_grants.sql`, `scoped-access-reader.ts` in PR #68 stack | FIT: exact grants with Service/Contract/Recipient/Work; GAP: Device Scoped Read/Command wiring | Resolve live Grants and customer Org from DB; broad Service grant must not leak Customer B in multi-customer Service |
| Hosted release | Draft PRs #61–#68 and G3–G5 pending | BLOCKED | No migration application, GCP, deploy, merge or real customer input |

## Responsibility and sequence

| Phase | Scope | This independent Draft | Dependency / Gate |
| --- | --- | --- | --- |
| S0 | Domain contract: customer Org, row identity, source-backed unverified fields, independent operational status, field verification, role-neutral Scoped Grant, typed Change review/commit, JOIN safety eligibility | **Implemented as pure TypeScript policy/transition kernel; synthetic unit tests** | No DB mutation yet |
| S1 | Physical Device schema: customer Organization FK, uniqueness per customer, `UNKNOWN`, revision, accepted-source projection, per-field history | **Design only** | Security review and safe legacy Device backfill decision; reconcile migrations stacked under #60/#68 |
| S2 | Actual Device Create/Correction/FieldVerification persistence Commands and Request/Evidence/Audit | **Contract only** | Extend existing Change contract without weakening JOIN/Person edit; live scoped grants, row locks, idempotency and bounded DB executor privileges |
| S3 | Scoped Device read in Registry/SUPPORT; Work observation→typed field verification; assignment-safe JOIN | **Pure guard test only** | Reuse #45 onward scoped read, #60 Registry edit, JOIN/SUPPORT migrations; no cross-customer exposure |
| S4 | Assessment Application/Translation mapping/preview→proposed records | Out of FACTACT scope | Assessment Lane owns parsing/UI/AI assistance; only approved, bounded payload may reach FACTACT |
| S5 | Synthetic DB+golden+browser acceptance / GCP rollout | **Unit synthetic ready, DB/browser NOT RUN** | S1–S3 and upstream PR integration; Hosted Go separately required |

## Bounded Device Product contract (S0)

1. Device identity is `(tenantId, organizationId, assetTag)` with conservative trim-only matching. Case and Unicode are **not** silently folded. Empty/colliding/ambiguous rows → `要確認`. Serial is a cross-check, never sole silent merge key. No auto-delete; `差分なし` and `除外` are Assessment UI decisions, not truth statuses. AssetTag identity **correction** is excluded from S0 (needs unique-key collision review).
2. Device has source-backed accepted Registry fields (`assetTag`, `displayName`, optional `serialNumber`) with `verification=null` initially. `operationalStatus=UNKNOWN` with separate verification. Customer-sheet “利用中” does not set AVAILABLE. No Person relation or inferred owner is created.
3. Accepted initial information is not `VERIFIED FACT`. `FIELD_VERIFICATION` is allowed only for an *actually observed* explicit field with source Evidence reference; `CUSTOMER_REGISTER` alone is insufficient. If observation disagrees with an existing field, fail the verification and route to correction. Existing other fields retain their states. `deviceStatus` may become AVAILABLE only on explicit non-sheet evidence and reviewed/committed transition.
4. Registry operations are `READ`, `CREATE`, `UPDATE` (proposal), `REVIEW` and `APPROVE`. A validated Actor requires a live, exact Service/Contract/ServiceRecipient grant and matching Tenant + customer Organization. `SERVICE`-only grant cannot authorize Device read across customer Organizations; a `WORK` grant must match the actual Work. Two distinct human Actors: proposer ≠ reviewer/committer; reviewer and committer may coincide if both operations granted.
5. One Device Change: `PROPOSED → VERIFIED → COMMITTED` with target+expectedRevision, immutable source, before/after and separate actors. The pure functions produce a candidate state **only**; persistence must atomically lock and check target/Grant/Revision, save the Change + Evidence links + immutable history + Audit + projection, then return a stable idempotent response. Retry keys must be unique in `(tenant, Actor, requestKey)` and bind to the original payload; this is **not implemented** by S0.
6. JOIN eligibility must require same Tenant + Organization, verified Device identity, independently verified `AVAILABLE`, and no active Person→Device relation; additionally live JOIN work/contract authority applies. Apply at candidate listing, execution, review/commit recheck. **Existing JOIN code is not yet wired to this predicate.** Existing production/demo `AVAILABLE` values are not automatically upgraded to verified. No backfill based on status text alone.
7. SUPPORT Work `contextDevice` or `REGISTRY_COMPARISON=MATCH` is not proof that every Device field is true. Only explicit observed field + Evidence ID + checked scope + time becomes a `FIELD_VERIFICATION` Change. The Work UI may offer small in-flow field checkboxes; no second asset ledger. For inventories with no SUPPORT Work, use genuine inventory event/Evidence, not fictional JOIN/SUPPORT Work.
8. Source reference is minimal (`kind`, existing Evidence ID, opaque locator, observed time, optional real Work ID). Source-file retention, classification as approved Evidence, deletion, PII and AI-provider rules remain a separate Business/Security decision; no whole-file vault is created by S0.

## S1/S2 safe physical design gate (NOT applied)

- Add a nullable transitional `devices.organization_id` constrained with `(tenant_id, organization_id)` FK; existing unassigned legacy rows remain quarantined for customer Scoped Read and cannot be silently attributed by matching a Person or Service. Once reconciled, establish non-null for in-scope records. Change uniqueness from `(tenant_id, asset_tag)` to `(tenant_id, organization_id, asset_tag)` **only after** duplicate/backfill analysis and explicit migration review.
- Add `UNKNOWN` to `device_status`, retain the operational status column but introduce explicit evidence-backed verification state. Field state/provenance history should be append-only and typed to Device field; existing Evidence/Change/Audit remain authoritative, not a new generic EAV Fact entity.
- Extend the accepted `registry_edit_request`/`changes` source union **without weakening** existing Person/JOIN FK checks, two-person guards, or the negative DB tests. The Person `registry_revision` and Person-specific Command cannot be reused as a generic Device PATCH. A narrow Device request and source relation is permitted only if security review approves the exact FKs and migration order.
- Runtime DB actor must not receive blanket Device UPDATE. Use a narrowly reviewed executor/column grant, live scoped authorization, locks, idempotency, exact revision and audit in one transaction. No direct Assessment/AI DB write.
- Work→Evidence provenance must be verified server-side: a client-provided Work ID, Evidence ID, Observation ID or customer Org ID is not trusted merely because nonempty. A Work target selection or `REGISTRY_COMPARISON` alone is not a field observation.

## S0 synthetic negative acceptance

See `tests/unit/device-information-contract.test.ts`: two customer Organizations under one Tenant and Service, same asset tag in different customers, duplicate/ambiguous serial, no implicit AVAILABLE, two-human separation, exact grant/expiry/revocation, Work-bound provenance, field-only verification, mismatched field review, stale revision, correction preserving other fields, and JOIN eligibility denial until both identity and status are actually verified.

Local full-DB regression attempt: `npm run test:db` cannot initialize the bundled `embedded-postgres` because the host does not provide `libicuuc.so.60` (`initdb` exit 127). The 93 DB/golden tests are **not passed or failed on behavior**; they were skipped due to suite setup failure. Do not workaround with an unverified ABI symlink. A compatible isolated PostgreSQL runner is required before claiming DB acceptance.

**S0 PASS is not a DB/GCP/Hosted acceptance, and is not permission to merge upstream PRs.**

## Remaining approvals / decisions before S1/S2

1. Legacy `devices` customer Org attribution and cutover: whether to quarantine all unknowns and operator-led reconciliation before Scoped Read/assignment (recommended) versus any explicitly evidence-justified subset. Never auto-mark old `AVAILABLE` as field verified.
2. Exact physical history: Device source record, field-level verification and typed Change projection after #60 schema integration; Security approval of migration, RLS/column grants and executor SQL.
3. Assessment raw spreadsheet/Evidence retention and AI-provider input scope (Business/Security).
4. Inventory verification proof threshold: which existing evidence/observation is admissible for a specific field; human acceptance versus source-system trust; no numeric confidence score.
5. Approval of S1–S3 integrated DB/security acceptance after upstream PR stabilizes. GCP Billing quota and Hosted Go remain separate blockers.
