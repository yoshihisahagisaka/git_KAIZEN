# Progressive Onboarding — Draft v0.1

## Definition

Progressive Onboarding means starting service with the minimum trusted context required for safe operation, then enriching Operational Context through real Work.

## Why

Traditional onboarding often tries to complete information collection before service start. This can delay launch, burden customers, and spend effort on information that may rarely be used.

The platform instead separates three layers.

## Layer 1 — Contract Context

Defined with the contracting customer before service start:

- service scope
- responsibility model
- authority boundaries
- escalation
- service hours
- SLA/SLO
- known prohibitions
- standard rules

Examples:
- Service Desk: atLIB and Sonix align once on what atLIB can do, escalation, prohibited actions and service rules.
- 情シスKAIZEN: atLIB and the client company align on the operating model, responsibility and authority.

## Layer 2 — Recipient Context

Only enough information to identify and route each recipient is required initially.

Examples:

Service Desk recipient organization:
- organization name
- contract/plan
- optional sales owner
- known recipient-specific exception/observation

情シスKAIZEN recipient person:
- name
- department
- role
- employment status

## Layer 3 — Operational Context

Enriched through real Work:

- devices
- accounts
- networks
- systems
- applications
- vendors
- knowledge
- decisions
- exceptions
- authority detail
- recent changes
- recipient observations

## Core rule

Do not require all Layer 3 information before service start unless safety, contract, compliance or service design makes it mandatory.

## Work as onboarding

A first inquiry can also be part of onboarding.

Example:

VPN incident
→ gateway UNKNOWN
→ gather evidence
→ identify gateway
→ verify
→ record Fact
→ future VPN work starts with better context

Thus onboarding is not a one-time completed phase. It is an ongoing learning process.

## Service start readiness

The platform should support explicit readiness criteria by Service Model.

The key question is not "Is all data complete?" but:

> Is enough trusted context available to start safely, and are unknowns handled explicitly?

## Business value

- shorter onboarding lead time
- lower customer preparation burden
- faster revenue/service start
- learning investment focused on actually used areas
- scalable onboarding for hundreds of recipients
- measurable service maturity after launch

## Progressive chain

Progressive Onboarding
→ Progressive Knowledge
→ Progressive Authority
→ Progressive Automation
→ Continuous KAIZEN

## Anti-patterns

- waiting for perfect data before launch
- importing spreadsheets without connecting them to Work
- treating blank/unknown information as system failure
- requiring the same deep onboarding effort for low-activity and high-activity recipients
- silently guessing missing values
