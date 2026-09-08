# Product Vision

## Positioning

This project is a new Service Operating Platform, not a direct Web migration of the existing DDL/GWS implementation.

The existing DDL prototype and existing atLIB applications are reference assets. Their proven ideas and platform capabilities may be reused, but the new system owns a fresh domain model.

## Product idea

The platform connects service, contract, recipient, work, responsibility, decision, operational information, knowledge, authority, change, learning, and KAIZEN.

### Core statement

> 運用するほど、仕事は標準化される。運用するほど、相手への理解は深くなる。

### Learning statement

> 仕事をするたびに、分からないことが事実に変わる。事実が増えるほど、次の仕事は速く、正確になる。

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

Additional architectural rules:

- Event does not automatically create Work. It creates a trigger to evaluate whether Work is required.
- Unknown is not hidden or guessed. Unknown can be the first correct Fact about the current state of knowledge.
- Observation is useful context but must never silently become Fact.
- AI Suggests. Human Decides. The platform Records.
- Standardize operations without losing human/customer context.

## Progressive model

Progressive Onboarding → Progressive Knowledge → Progressive Authority → Progressive Automation → Continuous KAIZEN.
