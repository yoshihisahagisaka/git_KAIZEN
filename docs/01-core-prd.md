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

## V1 target service models

1. Service Desk
2. 情シスKAIZEN

## Not V1

- full timesheet/payroll/accounting
- CTI/PBX/IVR
- generic no-code platform
- full MDM/monitoring replacement
- automatic authority grants
- AI-generated authoritative rules without human approval
- hidden normalization of Unknown into guessed values
