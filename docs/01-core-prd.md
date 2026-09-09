# Core PRD — Initial Draft

## Purpose

Build a shared atLIB Service Operating Platform that can operate multiple service models without hardcoding Service Desk or 情シスKAIZEN semantics into Core.

## Core value

- Start service quickly with minimum trusted context.
- Turn Unknown into explicit Known Unknown rather than hidden assumptions.
- Accumulate verified Facts through real Work.
- Separate Fact, Observation, Hypothesis, Decision, Rule, Authority and Exception.
- Reduce repeated investigation and human effort over time.
- Standardize operations while preserving recipient-specific context.
- Produce continuous KAIZEN from operational evidence.

## Core Principle #0 — Fact First

The platform is Fact-first.

> Factを仕事につなぎ、仕事から新しいFactを生み出す。Factが増えるほど、次の仕事は速く、正確になる。

### Required behavior

- The same real-world fact must not be independently maintained in multiple service-specific tables, screens, spreadsheets or workflows.
- Authoritative operational information should be stored once in an appropriate domain object or relation and reused through multiple views.
- Critical Facts must be traceable to provenance such as source, Evidence, effective period, verification time and reliability where applicable.
- Fact, Observation, Hypothesis, Decision, Rule and Unknown must remain semantically distinct.
- Unknown must remain explicit when the platform does not know a value; the system must not normalize uncertainty into guessed values.
- Closing Work alone must never mutate authoritative Registry state.
- Reality-changing work must flow through Action → Change → Verify → Commit before authoritative state is changed.
- Knowledge State Change must record that the platform's understanding changed without pretending that underlying reality changed at the same time.
- AI may suggest interpretations, questions, decisions, rule candidates and potential Facts, but it must not silently create authoritative Facts.

### Architecture guardrail

Fact First is a domain and architecture principle, not a universal `facts` table or generic EAV model.

Person remains Person. Device remains Device. Work remains Work. Relation remains Relation. Decision remains Decision. Rule remains Rule.

The principle governs how truth, provenance, validity, reliability and reuse are handled across those domain objects.

> One Fact, Multiple Views.

## Core domain candidates

- Organization
- Person
- Service
- Service Model
- Contract Profile
- Service Recipient
- Event
- Requirement Definition
- Requirement Evaluation
- Work
- Action
- Change
- Entity
- Relation
- Knowledge
- Evidence
- Decision
- Rule
- Authority
- Review
- Exception
- Observation
- KAIZEN
- Impact
- Audit
- Activity

## Main flow

Event → Requirement Evaluation → Decision/Rule → Work or No Work → Action → Change → Registry/Knowledge → Review/Authority → KAIZEN → Impact

A Fact-first interpretation of the operational loop is:

Fact / Unknown → Context → Requirement / Decision → Work → Action → Change → Verification → Updated Fact → Learning → KAIZEN

## Learning loop

WORK → REVIEW → LEARN → DELEGATE → STANDARDIZE → AUTOMATE → KAIZEN

Learning is downstream of trusted operational evidence. The platform should not claim learning where the underlying information is unverified, ambiguous or contradictory.

## Onboarding model

### Level 1 — Contract Context
Defined before service start:
- Scope
- Responsibility
- Authority
- Escalation
- SLA/SLO
- Known prohibitions
- Standard rules

### Level 2 — Recipient Context
Minimum information needed to identify and route service recipients.
Examples:
- Service Desk: organization, plan, sales owner if relevant
- 情シスKAIZEN: person, department, role, employment status

### Level 3 — Operational Context
Built progressively from real work:
- devices
- accounts
- networks
- vendors
- applications
- knowledge
- decisions
- exceptions
- recent changes
- information reliability

## Information model

Unknown is a valid representation of current knowledge state.

Information meaning/type and information reliability are separate concerns.

Candidate meaning types:
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- FACT
- DECISION
- RULE

Candidate reliability states:
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

Do not invent facts to fill Unknowns.

For critical operational information, the platform should preserve or resolve:
- source / provenance
- Evidence
- effective_from / effective_to where temporal
- verified_at
- reliability
- source Work / Change where applicable

Updated At is not equivalent to Trusted At.

## Operational Context

Operational Context is the information required to correctly understand, decide and execute Work.

It can include:
- Registry facts
- Knowledge
- Rules
- Authority
- Decision history
- Known exceptions
- Recent changes
- Recipient observations
- Reliability/provenance
- Current unknowns/gaps
- Contract/service context

Operational Context maturity is a proxy for operational standardization: the goal is not more documents, but repeatable decisions and execution independent of a specific individual.

Operational Context must preserve semantic distinctions instead of flattening all context into one narrative or note field.

## Recipient Observation

Observation captures useful service context that is subjective or experiential and must not be treated as Fact.

Examples:
- response-speed sensitivity
- preferred explanation style
- preferred communication channel

Observation must record source and time and should be reviewable/expirable. Avoid stigmatizing labels.

## Change model

Distinguish:

1. Reality Change — the real environment changed.
2. Knowledge State Change — the platform's understanding changed.

Examples:
- PC replacement = Reality Change
- VPN gateway UNKNOWN → verified value = Knowledge State Change

Both can produce downstream impact.

Authoritative Registry information must not be mutated merely because a Work changed status. Reality-changing actions must remain traceable through Change and verification before commit.

## Continuous Operational KAIZEN

Daily work can itself improve the operating model:
- UNKNOWN → KNOWN
- UNVERIFIED → VERIFIED
- STALE → VERIFIED
- missing knowledge → verified knowledge
- unknown authority → defined authority
- unknown exception → known exception

This is distinct from deliberate KAIZEN initiatives that change process, rules, architecture, automation or service design based on accumulated evidence.

The causal direction is:

Fact / Unknown → Work → Evidence / Change → Verified Fact → Knowledge / Rule Candidate → Capability improvement → KAIZEN

## External integration principles

The platform is the System of Work for service operations. External systems remain Systems of Record or specialized execution systems where appropriate. Integrations must be implemented through adapters and must not leak vendor-specific semantics into Core.

External data must not be treated as authoritative merely because it came from an integration. Provider source, synchronization status, verification state and effective ownership of truth must be explicit when relevant.

### Telephony / CTI

Telephony is an Event Source, not a Core telephony subsystem.

Initial target adapter: MOT/TEL.

Conceptual flow:

MOT/TEL incoming call → Communication Event → Recipient Resolution → Effective Service Context → Guided Triage → Requirement Evaluation → Work

V1 may use MOT/TEL external URL/phone-number linkage to open the appropriate incoming-call workspace. PBX, SIP, IVR, recording and softphone functionality remain outside Core. The adapter boundary must allow MOT/TEL to be replaced or supplemented by another telephony provider later.

### CRM

CRM and the Service Operating Platform have different responsibilities.

For the Sonics Service Desk:
- the new platform is the System of Work for inquiries, triage, Work, decisions, actions, changes, knowledge and service evidence;
- Zoho remains the customer relationship / sales CRM;
- service operations must not require duplicate manual entry into Zoho as the permanent target state;
- information valuable to customer relationship management should be able to flow from the platform to Zoho through an integration adapter;
- CRM-specific IDs and schemas must not become Core domain identifiers.

Target integration direction:

Work / Service Evidence → Integration Policy → Zoho Adapter → CRM activity / note / selected customer-facing service information

The exact outbound dataset, trigger timing, conflict policy and field mapping are Service Model / Contract Profile concerns and will be defined after real operational learning.

During initial operations, manual transfer to Zoho is explicitly acceptable. V1 must preserve enough structured data and stable external references so automation can be added later without redesigning Work, Recipient or Organization.

## V1 target service models

1. Service Desk
2. 情シスKAIZEN

## V1 integration scope

- MOT/TEL: design adapter boundary and support the minimum CTI flow needed for Service Desk operation; start with external URL / caller-number based context opening where practical.
- Zoho CRM: architecture-ready but automation is optional for V1. Manual CRM update is an accepted launch procedure.
- Integration actions should be observable/auditable and eventually idempotent when automated.

## Not V1

- building our own CTI/PBX/SIP/IVR/recording platform
- full bidirectional Zoho CRM synchronization
- making Zoho the operational Work system
- generic no-code integration platform
- full timesheet/payroll/accounting
- full MDM/monitoring replacement
- automatic authority grants
- AI-generated authoritative rules without human approval
- hidden normalization of Unknown into guessed values
- introducing a universal Fact/EAV table that replaces explicit domain objects
