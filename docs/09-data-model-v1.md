# Data Model V1 — Domain Boundaries

## Status

Design draft. This document defines relational boundaries before SQL migrations are written.

Target platform decision:
- Supabase PostgreSQL
- Shared Database + RLS by default
- Dedicated Project by exception
- platform/domain design should remain portable to standard PostgreSQL

---

## 1. Tenancy and service structure

Do not equate Customer with Tenant and do not equate Service Recipient with Tenant.

Core hierarchy/context:

Tenant
→ Organization
→ Service
→ Contract Profile
→ Service Recipient

Examples:

### Sonics Service Desk
- Contract customer: Sonics
- Service: Service Desk
- Service recipients: many Sonics end-customer Organizations

### 情シスKAIZEN
- Contract customer: Customer A
- Service: 情シスKAIZEN
- Service recipients: primarily Persons and relevant managed entities inside Customer A

`tenant_id` is the primary logical security boundary. Organization, Service, Contract and Recipient express business/service context inside that boundary.

---

## 2. Identity vs service recipient

A Person is a domain entity, not an authentication account.

Authentication identity, Person, Contact Point and Service Recipient are separate concepts.

Conceptual relationships:

Auth Identity ↔ Person
Person → many Contact Points
Person/Organization/etc. ↔ Service Recipient

This avoids coupling the domain to Supabase Auth IDs and supports people who receive service but never log in.

---

## 3. Contact Point

Purpose: represent ways an Organization or Person can be contacted or recognized.

Candidate columns:
- id UUID PK
- tenant_id UUID NOT NULL
- owner_type
- owner_id
- type
- normalized_value
- display_value
- label
- status
- source_type
- source_reference
- verified_at
- valid_from
- valid_to
- created_at
- updated_at

V1 type values:
- PHONE
- EMAIL

V1 phone labels:
- MOBILE
- OFFICE
- DIRECT
- REPRESENTATIVE
- OTHER

Constraints/notes:
- do not assume global uniqueness of a raw phone string without tenant/context consideration;
- normalize phone values before matching;
- preserve provenance;
- one Person may have multiple numbers;
- one Organization may own a representative/shared number;
- a number match is an identity hint, not security authentication.

---

## 4. Communication Event

Purpose: normalized record that a communication occurred or was initiated by an external communication system.

Candidate columns:
- id UUID PK
- tenant_id UUID NOT NULL
- provider
- channel
- direction
- external_reference nullable
- occurred_at
- ended_at nullable
- duration_seconds nullable
- source_address_normalized nullable
- destination_address_normalized nullable
- resolved_recipient_id nullable
- resolution_state
- linked_work_id nullable
- provider_metadata JSONB limited to non-Core adapter metadata or reference
- created_at

V1 providers/channels:
- provider: MOTTEL | MANUAL | OTHER
- channel: PHONE | OTHER

Resolution states:
- MATCHED
- AMBIGUOUS
- UNKNOWN
- CONFIRMED_DURING_WORK

Do not make Work dependent on having a Communication Event. Work may originate from many Event Sources.

---

## 5. Event / Requirement / Work

Main invariant:

Event does not directly imply Work.

Event
→ Service Context
→ Requirement Evaluation
→ Decision/Rule
→ Work or No Work

Requirement Evaluation outcomes:
- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

Work outcomes:
- COMPLETED
- NO_ACTION_REQUIRED
- CANCELLED
- DUPLICATE
- SUPERSEDED

Work candidate fields include:
- id
- tenant_id
- service_id
- contract_profile_version_id
- recipient_id nullable
- source_event_id nullable
- work_type
- lane
- status
- priority
- service_owner_id
- work_owner_id
- assignee_id nullable
- next_action
- next_action_owner_id nullable
- due_at nullable
- waiting_for nullable
- outcome nullable
- created_at
- started_at nullable
- completed_at nullable

Active Work should normally have an Owner. Waiting does not remove Ownership.

---

## 6. Action and Change

Do not update Registry merely because Work was marked complete.

Work
→ Action
→ Change
→ Verify
→ Commit
→ Entity / Relation / Knowledge State

Change categories:
- REALITY_CHANGE
- KNOWLEDGE_STATE_CHANGE

A real-world change must preserve its source Work/Action and evidence/provenance. A discovery made today about a pre-existing state is a Knowledge State Change; do not pretend the real-world state changed today.

---

## 7. Registry

Registry facts are normalized and independent from UI views.

Candidate Entity types for V1:
- ORGANIZATION
- PERSON
- LOCATION
- DEVICE
- ACCOUNT
- APPLICATION
- SYSTEM
- VENDOR
- CONTRACT_REFERENCE

Relation is first-class and temporal.

Candidate Relation fields:
- id
- tenant_id
- relation_type
- source_entity_id
- target_entity_id
- status
- effective_from
- effective_to nullable
- source_work_id nullable
- source_change_id nullable
- verified_at nullable
- reliability
- evidence_reference nullable

History should close/replace relations rather than overwrite the past.

---

## 8. Operational Information

Keep epistemic meaning separate from reliability.

Meaning/type:
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- FACT
- DECISION
- RULE

Reliability:
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

`UNKNOWN` is a truthful state and must not be auto-filled by AI inference.

`VERIFIED` means currently checked. `CONTROLLED` means a mechanism exists to keep it correct.

Updated At and Verified At are different.

---

## 9. External Reference

External provider IDs must not become Core primary keys.

Candidate columns:
- id UUID PK
- tenant_id UUID NOT NULL
- provider
- external_object_type
- external_object_id
- internal_object_type
- internal_object_id
- external_url nullable
- status
- first_seen_at
- last_verified_at nullable

Initial providers:
- MOTTEL
- ZOHO
- AUTH_PROVIDER

---

## 10. Integration Delivery

Not necessarily required as a full V1 table, but reserve the model for reliable outbound/inbound automation.

Candidate fields:
- id
- tenant_id
- provider
- direction
- integration_action
- source_object_type
- source_object_id
- idempotency_key
- status: PENDING | SUCCEEDED | FAILED | RETRY_REQUIRED | MANUAL
- requested_at
- completed_at nullable
- attempt_count
- last_error_code nullable
- last_error_summary nullable

Do not store provider secrets/tokens here.

This model will support future Zoho note write-back without adding Zoho state fields to Work.

---

## 11. RLS / tenant rules

V1 principle:

> Shared DB + RLS by default; Dedicated Project by exception.

Requirements:
- every tenant-owned Core row has an unambiguous tenant boundary;
- application/domain authorization and DB RLS are both enforced;
- server determines effective tenant/service context; do not trust client-supplied tenant scope alone;
- cross-tenant atLIB roles require explicit scoped grants;
- AI tools receive only authorized tenant/service context;
- external integration callbacks/events must resolve their tenant through trusted integration configuration, not arbitrary request parameters;
- future extraction of one tenant to a Dedicated Project must not require redefining domain IDs.

---

## 12. V1 database anti-patterns

Do not implement:
- `person.phone_number` as the only phone model
- phone number as Person primary identity
- Supabase Auth user ID as Person PK
- Zoho record ID as Organization PK
- MOT/TEL call ID as Work PK
- `customer_id` as a substitute for Tenant + Organization + Service + Contract + Recipient
- direct Event → Work without Requirement Evaluation
- direct Work completion → Registry mutation
- generic EAV/key-value Registry as the default domain model
- customer-specific duplicated tables
- vendor-specific fields scattered across Core tables
- full Zoho synchronization tables before a proven need exists

---

## 13. Next schema work

Before SQL migrations, specify:
1. Work state machine
2. Requirement Evaluation state/decision model
3. Change commit/verification model
4. Authority and Review scope
5. Service/Contract/Profile versioning
6. Service Recipient polymorphism strategy
7. Registry Entity/Relation concrete V1 types
8. RLS policy matrix
9. stable Work deep-link scheme for CRM integration
10. MOT/TEL adapter capability check for call duration/lifecycle data
