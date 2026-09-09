# Product Vision

## Positioning

This project is a new Service Operating Platform, not a direct Web migration of the existing DDL/GWS implementation.

The existing DDL prototype and existing atLIB applications are reference assets. Their proven ideas and platform capabilities may be reused, but the new system owns a fresh domain model.

## Product idea

The platform connects service, contract, recipient, work, responsibility, decision, operational information, knowledge, authority, change, learning, and KAIZEN.

### Core statement

> 運用するほど、仕事は標準化される。運用するほど、相手への理解は深くなる。

### Fact-first statement

> Factを仕事につなぎ、仕事から新しいFactを生み出す。Factが増えるほど、次の仕事は速く、正確になる。

NEMESIA's root principle is Fact First.

The platform does not treat every recorded value as a Fact. It distinguishes Facts from Observation, Hypothesis, Decision, Rule and Unknown, and preserves provenance, evidence, validity and reliability where needed.

A Fact should be held once as authoritative operational information and reused through multiple views and workflows rather than duplicated per screen, spreadsheet or service process.

> One Fact, Multiple Views.

### Learning statement

> 仕事をするたびに、分からないことが事実に変わる。事実が増えるほど、次の仕事は速く、正確になる。

Learning is a consequence of accumulating and reusing trusted Facts through real Work.

Fact → Work → Change → Verified Fact → Learning → KAIZEN.

### Onboarding statement

> 完璧に理解してから始めるのではなく、安全に始められる最低限を定義し、運用しながら理解を深める。

## Core architecture idea

Service × Contract × Recipient

- Service/Contract defines standard scope, responsibility, authority, escalation, service level, prohibitions and rules.
- Recipient holds minimum identification/context and only recipient-specific overrides, observations and exceptions.
- Operational Context grows through real Work.

Effective Service Context = Service Model + Contract Profile + Recipient Attributes + Recipient Overrides + Known Exceptions + Current Operational Context.

## Initial Service Models

- Service Desk
- 情シスKAIZEN

## Product principles

0. Fact First
1. Service First
2. Ownership Always
3. Decision by Design
4. Work Updates Reality
5. Change Propagates
6. Information Stays Trusted
7. Knowledge Stays
8. Authority Must Be Earned
9. Every Service Must Improve
10. Automate Only What Is Ready

### Principle #0 — Fact First

- Do not duplicate the same real-world fact across service-specific tables, screens or management lists.
- Reuse one authoritative fact through multiple views and workflows.
- Preserve provenance, evidence, validity and reliability for critical operational facts.
- Do not silently treat Observation, Hypothesis, Decision, Rule or Unknown as Fact.
- Unknown is a truthful state of knowledge and must not be filled by assumption.
- When Work changes reality, authoritative operational information is updated through traceable Change and Verification rather than by closing Work alone.
- Fact First is a domain and architecture principle, not a requirement to create one universal Fact table.

Additional architectural rules:

- Event does not automatically create Work. It creates a trigger to evaluate whether Work is required.
- Unknown is not hidden or guessed. Unknown can be the first correct Fact about the current state of knowledge.
- Observation is useful context but must never silently become Fact.
- AI Suggests. Human Decides. The platform Records.
- AI may reason from Facts and other explicitly typed information, but it must not silently create authoritative Facts.
- Standardize operations without losing human/customer context.

## Progressive model

Progressive Onboarding → Progressive Knowledge → Progressive Authority → Progressive Automation → Continuous KAIZEN.
