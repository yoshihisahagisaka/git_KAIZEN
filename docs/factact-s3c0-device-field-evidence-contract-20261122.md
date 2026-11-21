# FACTACT S3c-0 — Work-driven Device field Evidence Fit/Gap and contract

Status: **FIT/GAP ACCEPTANCE ARTIFACT — DEVICE WRITE REMAINS NO-GO**
Baseline: `8ee89fe4147c1215af97f0a5920e817c6da1c8be`
Scope: Issue #82 only. No hosted/Production activation and no Device mutation HTTP endpoint.

## 1. Fixed semantics

- A selected Device, Work Context, caller statement, generic note, hash string, or
  uploaded-file label is not a verified Device fact.
- A Device field becomes verified only through the existing typed Device Change,
  an independent authorized reviewer, and atomic `Change -> Verify -> Commit`.
- Only the explicitly observed field/value is in scope. Other fields remain at
  their existing verification state.
- Browser input never supplies trusted Tenant, Actor, customer Organization, or
  source custody. Those values must be resolved and locked in the transaction.
- Caller statements and external references remain claims. They never become a
  `FIELD_VERIFIED` event merely because an operator recorded them.

## 2. Code-grounded Fit / Gap / Unknown

| Boundary | Result | Current fact |
| --- | --- | --- |
| Existing Work and selected Device | **FIT (partial)** | `support_work_device_contexts` records an explicit Work target separately from Registry. It does not attest a Device field/value. |
| Caller statement | **FIT as UNVERIFIED claim** | `recordTargetObservation` stores `CALLER_STATEMENT/UNKNOWN` with caller source and snapshot. Its legal values cannot express a verified Device field. |
| Exact field/value provenance after Device proposal | **FIT** | `device_change_request_sources` stores field, value, Evidence, source kind, locator, observation time and optional Work; it is append-only. |
| Device review/commit | **FIT** | `device_confirm_change` rechecks live proposer/reviewer grants, requires separate actors, locks current Device revision, writes field event and Audit atomically. |
| Generic Evidence originality/custody | **GAP** | `evidence` contains type/title/text/creator/time. `SOURCE_REFERENCE` existence and creator are checked, but source originality, retained artifact, uploader identity, immutable digest binding and adapter identity are not proven. |
| Operator direct field observation | **GAP** | No current append-only record binds actual SUPPORT Work + selected Device + exact field/value + observation time + authenticated observer. Free-form SUPPORT records and existing target observations cannot represent that tuple. |
| Existing SUPPORT Work as Device `SUPPORT_WORK` source | **CONFLICT** | SUPPORT Work uses a Person ServiceRecipient. The Device executor requires an Organization ServiceRecipient and requires the Work to have that same recipient, so a genuine SUPPORT Work fails closed. A fabricated Organization Work is prohibited. |
| Customer sheet/PDF | **UNKNOWN / NO-GO** | No approved custody/retention API or policy proves that a digest/locator refers to an authentic customer artifact. |
| Trusted system source | **UNKNOWN / NO-GO** | No approved adapter identity, response version, signed/retained response, or field mapping contract exists. A free-form `TRUSTED_SYSTEM` label is insufficient. |
| Device write HTTP | **GAP / NO-GO** | The bounded DB executor exists, but no authenticated Application/HTTP route binds an accepted Work observation to a Device proposal. This is intentionally not added by S3c-0. |

## 3. Executable characterization

`tests/golden/device-work-evidence-contract.test.ts` fixes the current boundary:

1. A genuine SUPPORT Work cannot be presented as the current Device
   `SUPPORT_WORK` source because Person and Organization recipient semantics do
   not match. The DB command rejects it.
2. A generic `SOURCE_REFERENCE` labelled `PHYSICAL_INVENTORY` can currently be
   proposed and committed even when its free-form value/locator has no bound
   Work observation. This proves that existence/type/creator checks are not a
   custody or observation proof. The test is a GAP characterization, not an
   authorization of that route.
3. Caller statements remain UNVERIFIED and cannot be converted into a Device
   field verification by the existing SUPPORT observation contract.

Until the bounded binding below is accepted and implemented, S3c Device
FIELD_VERIFICATION remains **NO-GO** outside synthetic tests.

## 4. Minimum bounded implementation contract for S3c

The current tables cannot represent the required tuple without overloading
free-form JSON. The minimum permitted addition is one dedicated immutable
Work-to-Device-field observation binding. It is not a generic Fact/EAV object,
not a second Device registry, and not another Work system.

### 4.1 Required immutable tuple

`tenant_id, service_id, contract_profile_id, organization_id,
service_recipient_id, work_id, target_context_id, device_id, field_key,
observed_value, observation_time, source_kind, observed_by_operator_id,
evidence_id, source_locator, request_id, revision, supersedes_id, recorded_at`

Allowed `field_key` is exactly `assetTag | displayName | serialNumber |
deviceStatus`.

### 4.2 Trust states and eligible routes

| Source | Captured state | Eligible for Device proposal |
| --- | --- | --- |
| `OPERATOR_DIRECT_OBSERVATION` | authenticated operator explicitly attests the current field/value during the active Work | **Yes**, after exact tuple/customer checks; still requires a different live REVIEW+APPROVE actor |
| `CALLER_STATEMENT` | caller claim, UNVERIFIED | **No** |
| `EXTERNAL_REFERENCE` | source-backed claim only | **No**, until custody/retention policy and API are approved |
| `TRUSTED_SYSTEM` | unsupported pending an approved authenticated adapter contract | **No** |

The observation must be append-only. Correction creates a new revision with
`supersedes_id`; it never updates the origin. A Device proposal may use only the
latest non-superseded observation for the same Work, target context, Device and
field. A later correction or ended target invalidates the earlier source.

### 4.3 Transaction and authority gate

The future internal Application command must, in one tenant transaction:

1. derive Tenant and Actor from the authenticated session;
2. lock the Work, selected target context, Device, observation, and both actors'
   scoped authority rows;
3. require active Work, exact Service/Contract, and resolve the Work's Person
   recipient to the same active customer Organization as the Device;
4. require the proposer to hold live exact `REGISTRY UPDATE` for that customer;
5. require the observation Actor to equal the authenticated recorder and the
   source Evidence to be bound to the same immutable observation;
6. reject caller/external/trusted-system source kinds for FIELD_VERIFICATION;
7. invoke the existing S2b-2 Device proposal/confirmation contract; do not add a
   second FSM;
8. at confirmation, re-lock and recheck observation revision, Device revision,
   grants, target context and Evidence; then require a different actor with live
   `REGISTRY REVIEW` and `APPROVE`;
9. write Change, field history and Audit atomically, rolling everything back on
   any failure.

No browser endpoint may call `device_propose_change` directly. S3c must expose
only a bounded Application operation after this contract is reviewed.

## 5. Required future schema/API work (not implemented in S3c-0)

- Add the dedicated immutable observation binding with tenant-aware composite
  FKs to Work, target context, Device, Operator and Evidence; ENABLE/FORCE RLS.
- Add a narrow executor-owned record command. Runtime receives EXECUTE only,
  never table UPDATE/DELETE or generic Device mutation rights.
- Extend source admissibility so `SUPPORT_WORK` resolves only through the bound
  observation, not by free-form Evidence/locator/Work IDs.
- Resolve the SUPPORT Person recipient to customer Organization without changing
  the Work's authoritative recipient or fabricating another Work.
- Add an authenticated internal route only after the above DB/Application gate
  is accepted. Caller/external/trusted routes remain unavailable.

## 6. Required acceptance negatives

S3c implementation must reject forged Work/Device/customer, stale or superseded
observation, ended target context, altered field/value/Evidence/locator/time,
spoofed Actor/uploader, revoked or wrong-scope Grant, self review, stale Device
revision, duplicate request with changed payload, unrelated-field verification,
direct Runtime table mutation, and Audit failure. It must prove idempotent retry,
row-lock concurrency and all-or-nothing rollback on PostgreSQL 17 with a
non-SUPERUSER migration principal.

## 7. Decisions still required

- External artifact custody, retention, deletion, privacy classification and
  whether the original file/response must be retained.
- Trusted-system adapter authentication, response retention/versioning and
  mapping ownership.

These decisions do not block the bounded operator-direct-observation contract,
but those source routes must fail closed until separately accepted.

## 8. Code evidence anchors

- Generic Evidence shape and Runtime grants:
  `supabase/migrations/20260909000200_join_slice.sql:97-103,136-143`.
- Existing target observation columns and legal combinations:
  `supabase/migrations/20261101000800_support_unknown_target_observations.sql:11-27`
  and `supabase/migrations/20261102001200_support_hr2_ui_minimal.sql:37-59`.
- Current caller/comparison validation and server-built snapshot:
  `packages/application/src/support-commands.ts:199-216`.
- Device source tuple and immutable request-source table:
  `supabase/migrations/20261121000100_device_authoritative_commands.sql:13-45`.
- Organization-recipient/Work/grant authorization predicate:
  `supabase/migrations/20261121000100_device_authoritative_commands.sql:49-76`.
- Current source admissibility checks (existence/type/creator, not custody):
  `supabase/migrations/20261121000100_device_authoritative_commands.sql:97-181,241-259`.
- Atomic Device commit, field event and Audit:
  `supabase/migrations/20261121000100_device_authoritative_commands.sql:260-311`.
- Existing narrow DB executor only:
  `apps/web/src/server/persistence/device-information-executor.ts:1-28`.
- Existing two-actor Application contract:
  `packages/application/src/device-information-write-commands.ts:167-244`.
