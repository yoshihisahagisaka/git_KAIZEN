# Domain Model — Draft v0.1

## Core aggregate direction

The platform is designed around Service × Contract × Recipient rather than around a single customer, person, device or spreadsheet table.

### Primary objects

- Organization
- Person
- Service
- ServiceModel
- ContractProfile
- ServiceRecipient
- Event
- RequirementDefinition
- RequirementEvaluation
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
- ExceptionCase
- Observation
- KaizenCandidate
- Impact
- AuditRecord
- Activity

## Service Recipient

ServiceRecipient is a role within a Service/Contract context, not a replacement for Entity.

Examples:
- Service Desk: an end-customer Organization may be a recipient.
- 情シスKAIZEN: an employee Person may be a recipient.
- Future services may use Location/System/Device as recipient targets if appropriate.

Do not copy standard contract rules onto every recipient. Resolve effective context using inheritance and overrides.

## Effective Service Context

Effective Service Context is assembled dynamically from:

1. ServiceModel defaults
2. ContractProfile
3. Recipient attributes
4. Recipient overrides
5. Known exceptions
6. Current Operational Context

## Requirement before Work

Event is only a trigger for evaluation.

Event → RequirementDefinition → RequirementEvaluation → Work / No Work.

Candidate RequirementEvaluation results:
- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

A Work may later end with NO_ACTION_REQUIRED; this is different from no Work being created.

## Work

Work is the owned unit of service execution.

Candidate properties:
- type
- service lane
- service owner
- work owner
- assignee
- priority
- next action
- next action owner
- due
- waiting reason
- source event
- source requirement evaluation
- contract profile version

Candidate Work types:
- INCIDENT
- REQUEST
- TASK
- CONSULT
- CHANGE
- REVIEW
- EVENT_TASK

Candidate service lanes:
- SUPPORT
- CONSULT
- CHANGE

## Action and Change

Action is something someone does.
Change is a recorded transition in reality or knowledge state.

A reality-changing action should create a Change record.
A Knowledge State Change must not pretend the underlying reality changed at that moment.

Candidate Change categories:
- REALITY_CHANGE
- KNOWLEDGE_STATE_CHANGE

Candidate lifecycle:
PLANNED → EXECUTED → VERIFIED → COMMITTED

## Entity / Relation

The Registry is relational and entity-centric, while views can be person-centric, customer-centric, device-centric, etc.

One Fact, Multiple Views.

Relation should carry lifecycle and provenance, including:
- status
- effective_from
- effective_to
- source_work
- source_change
- verified_at
- evidence
- reliability

## Information semantics

Do not use a single generic note field to mix truth states.

Candidate semantic classes:
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- FACT
- DECISION
- RULE

Candidate reliability classes:
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

Semantic class and reliability are separate axes.

## Exception

Standard Rule does not imply universal applicability.

ExceptionCase should support:
- source event
- requirement
- expected rule
- reason
- decision
- decided by
- authority
- evidence
- scope
- effective period
- review requirement
- resulting work

Known and unknown exceptions must be distinguishable.

## Authority

Progressive Authority maturity:
- A0 Observe
- A1 Supervised
- A2 Delegated
- A3 Rule Governed
- A4 Automated

Authority is scoped, not global.
Candidate dimensions:
Person/Role × Service × Work Type × Action/Object/Relation Type × Risk × Customer/Contract × Exception scope.

AI never grants Authority.

## Observation

Observation captures recipient-specific service context that is useful but subjective.

Required metadata should include:
- source
- observed_at
- context/work reference if available
- current status
- review/expiry policy

Observation must not silently become Fact.

## Activity

Activity is a lightweight operational activity stream used for learning and effort reconstruction, not employee surveillance or payroll.

Candidate fields:
- actor
- timestamp
- work
- activity type
- source
- duration estimate
- confidence
- context

## Invariants

1. Active Work generally has an Owner.
2. Waiting does not remove Ownership.
3. AI output never grants Authority.
4. Reality-changing Action has traceable Change.
5. Registry updates are not coupled directly to Work completion status.
6. Observation cannot silently mutate into Fact.
7. Unknown cannot be silently filled by inference.
8. Service Model cannot redefine Core object semantics.
9. Work must trace why it was created.
10. Closing Work preserves Evidence, Decision, Change and Audit history.
