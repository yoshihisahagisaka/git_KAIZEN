# Integration Architecture — V1 and Evolution

## Purpose

Define external-system boundaries without allowing vendor-specific models to leak into Core.

Principle:

> External systems provide events, identity hints or specialized execution. The platform owns service Work and its operational evidence.

Initial integrations:
- MOT/TEL — telephony / communication event source
- Zoho CRM — customer relationship system

Neither is a parent object in Core.

---

## 1. Integration boundary

Core must understand generic concepts, not vendor concepts.

Vendor Adapter → Normalized Integration Event / External Reference → Core

Outbound:

Core Event / Work Outcome → Integration Policy → Vendor Adapter → External System

Every automated integration action should eventually support:
- tenant scope
- provider
- external reference
- direction
- occurred/requested timestamp
- processing status
- retry state
- idempotency key
- result/error metadata
- audit trail

V1 does not require a generic integration platform. These concepts are architectural seams for incremental implementation.

---

## 2. Contact Point and Identity Resolution

A Person must not be identified by a phone number primary key.

### Contact Point

Candidate fields:
- id
- tenant_id
- owner_type: PERSON | ORGANIZATION
- owner_id
- type: PHONE | EMAIL | OTHER
- normalized_value
- display_value
- label: MOBILE | OFFICE | DIRECT | REPRESENTATIVE | OTHER
- status
- verified_at
- source
- valid_from
- valid_to

A Person can have zero to many Contact Points. An Organization can also have shared Contact Points such as a representative phone number.

### Identity Resolution

An incoming communication supplies an identity hint such as a phone number.

Resolution states:
- MATCHED — one sufficiently reliable recipient match
- AMBIGUOUS — multiple possible matches
- UNKNOWN — no known match
- CONFIRMED_DURING_WORK — operator confirmed and linked the caller during handling

The first call from a mobile/direct number may be UNKNOWN. The operator can confirm the caller and create/link the Contact Point. A later call from the same normalized number can then resolve the same Person.

Identity Resolution is assistance, not proof of identity. A matched caller number must not automatically grant authority for sensitive actions.

Phone normalization must be consistent and country-aware. Store a normalized form for matching while retaining a display/original form when useful.

---

## 3. MOT/TEL Telephony Adapter

### V1 goal

Use MOT/TEL as a lightweight CTI input, not build telephony into the platform.

Minimum useful flow:

Incoming Call
→ receive caller number
→ normalize number
→ search Contact Points
→ resolve Person/Organization if known
→ open Incoming Communication workspace
→ show Recipient + Effective Service Context
→ operator confirms/corrects identity
→ create or link Work

For an unknown mobile/direct number:

Incoming number
→ UNKNOWN
→ operator identifies caller during conversation
→ link number to Person as Contact Point
→ subsequent calls can resolve that Person

### Call Activity

If MOT/TEL exposes a supported mechanism for call lifecycle/history, capture at least:
- provider = MOTTEL
- external_call_reference if available
- direction: INBOUND | OUTBOUND
- caller number
- called number if available
- started_at if available
- ended_at if available
- duration_seconds if available
- resolved person/organization
- linked work

Call duration is desirable but must not block V1 launch. Do not fabricate start/end/duration when the provider cannot supply them reliably.

### Explicit non-goals

Do not build:
- PBX
- SIP stack
- IVR
- recording system
- softphone
- call routing engine

MOT/TEL remains responsible for telephony.

---

## 4. Communication Event

Telephony should enter Core through a provider-neutral communication/event boundary.

Candidate normalized fields:
- id
- tenant_id
- provider
- channel: PHONE | EMAIL | CHAT | OTHER
- direction
- external_reference
- occurred_at
- ended_at
- duration_seconds
- source_contact_point
- resolved_recipient_id
- resolution_state
- linked_work_id
- raw_provider_metadata_reference

This allows a future provider to replace or supplement MOT/TEL without changing Work semantics.

---

## 5. Zoho CRM Adapter

### Responsibility boundary

New platform:
- inquiry handling
- triage
- Work
- decisions
- actions
- changes
- operational context
- knowledge
- service evidence

Zoho:
- customer relationship
- sales/customer-facing CRM history

The platform must not mirror the full Work record into Zoho.

### Target outbound integration

The desired automated result is intentionally small.

When a qualifying customer interaction/Work occurs, Zoho should receive a customer-history note equivalent to:

- IT support/service interaction occurred
- date/time
- optional short neutral summary/status
- deep link to the Work in the new platform

Example concept:

`ITサポート対応あり / 2026-09-09 / 案件: <platform Work URL>`

The platform remains the source for detailed operational history.

### V1 launch rule

Automated Zoho write-back is NOT required to launch V1.

Initial operation may be:
1. Work is handled and recorded in the new platform.
2. Operator manually records the minimal note + Work URL in Zoho when required.
3. Real operations are observed.
4. Automation policy is defined from actual need.
5. Zoho Adapter is enabled later without changing Core Work/Recipient models.

This is deliberate progressive automation, not technical debt.

### Future automation controls

When automated, define:
- which Work types create a CRM note
- which lifecycle point triggers it
- which Zoho record receives it
- note template
- whether customer-visible/sensitive data is excluded
- retry/error handling
- idempotency
- manual retry
- audit status

Avoid bidirectional synchronization unless a demonstrated business need emerges.

---

## 6. External References

Core objects must use platform-owned IDs. External provider IDs are references.

Candidate External Reference:
- id
- tenant_id
- provider: MOTTEL | ZOHO | ...
- external_object_type
- external_object_id
- internal_object_type
- internal_object_id
- external_url if applicable
- status
- first_seen_at
- last_verified_at

Do not use Zoho record IDs, MOT/TEL IDs or authentication-provider IDs as Core primary keys.

---

## 7. V1 acceptance criteria

### Telephony

V1 architecture is acceptable when:
- a phone number can exist independently as a Contact Point;
- one Person can own multiple phone numbers;
- organization representative numbers are possible;
- an unknown number can be linked to a Person during handling;
- a later call can resolve the previously linked Person;
- number match does not itself authorize sensitive actions;
- a call can be linked to a Work;
- duration can be stored when reliably supplied;
- MOT/TEL-specific details stay behind an adapter boundary.

### Zoho

V1 architecture is acceptable when:
- Work has a stable deep-linkable identifier/URL;
- Zoho IDs are external references, not Core IDs;
- manual Zoho note entry can be used at launch;
- future automated note creation can be added without changing Work semantics;
- full Work detail does not need to be duplicated into Zoho;
- integration attempts can later become auditable/idempotent.

---

## 8. Golden Flow — Returning Mobile Caller

1. A new mobile number calls MOT/TEL.
2. The platform receives/opens context with the phone-number hint.
3. No Contact Point matches; resolution = UNKNOWN.
4. Operator confirms the caller is Person A at Organization A.
5. The phone number is linked to Person A as a Contact Point with source/provenance.
6. Work is created or linked and handled normally.
7. A later call arrives from the same normalized number.
8. Identity Resolution proposes Person A.
9. The incoming-call workspace immediately shows Person A, Organization A and relevant Effective Service Context.
10. Operator may correct the match if circumstances changed.

Success: the second call requires less identification effort without treating caller ID as security authentication.

---

## 9. Golden Flow — Zoho Minimal Write-back

1. Service Work is handled in the new platform.
2. Work receives a stable URL.
3. CRM policy says the interaction should be visible to Sonics sales/customer relationship staff.
4. During V1 launch, operator manually records a minimal Zoho note with `対応あり` and the Work URL.
5. Detailed Work remains only in the platform.
6. After sufficient operational evidence, the same output is automated through the Zoho Adapter.
7. Automated retries must not create duplicate notes.

Success: sales retains customer-contact visibility while service operations remain separated from CRM work management.
