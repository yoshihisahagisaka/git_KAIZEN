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

## Learning loop

WORK → REVIEW → LEARN → DELEGATE → STANDARDIZE → AUTOMATE → KAIZEN

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

## Continuous Operational KAIZEN

Daily work can itself improve the operating model:
- UNKNOWN → KNOWN
- UNVERIFIED → VERIFIED
- STALE → VERIFIED
- missing knowledge → verified knowledge
- unknown authority → defined authority
- unknown exception → known exception

This is distinct from deliberate KAIZEN initiatives that change process, rules, architecture, automation or service design based on accumulated evidence.

## External integration principles

The platform is the System of Work for service operations. External systems remain Systems of Record or specialized execution systems where appropriate. Integrations must be implemented through adapters and must not leak vendor-specific semantics into Core.

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
