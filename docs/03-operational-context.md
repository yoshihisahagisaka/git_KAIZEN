# Operational Context — Draft v0.1

## Definition

Operational Context is the set of information required to correctly understand, decide and execute service Work.

The platform must make visible:

- what is known
- what is unknown
- what is observed but subjective
- what is hypothesized
- what has been verified
- what is stale
- what is controlled by a maintained process
- what authority applies
- what exceptions apply

Operational Context is Fact-first: trusted Facts are reused as the basis for Work, while Observation, Hypothesis, Decision, Rule and Unknown remain explicitly distinguishable.

## Why it matters

Operational Context maturity is the practical form of operational standardization.

Standardization does not mean producing more manuals. It means enabling different operators to reach consistent, safe decisions using the same trusted context.

The platform must avoid creating separate copies of the same real-world Fact merely because different operators, services, screens or reports need to see it.

> One Fact, Multiple Views.

## Context composition

Operational Context may include:

1. Registry Facts
2. Knowledge
3. Rules / Policies
4. Authority
5. Decision History
6. Known Exceptions
7. Recent Changes
8. Recipient Observations
9. Reliability / Provenance
10. Current Unknowns / Information Gaps
11. Contract / Service Context

Each critical item should retain enough semantic and trust metadata for an operator or AI to understand not only the value, but why it should or should not be trusted.

## Fact-first context

A Fact is not just a populated value. It is a semantic claim about reality that can be reused across Work and Views.

For operationally important Facts, the platform should be able to expose or trace as applicable:
- source / provenance
- Evidence
- effective period / validity
- verified_at
- reliability
- source Work / Change

`updated_at` alone is not sufficient evidence of trust.

Fact First is not a requirement to flatten all information into a generic Fact object. Facts may be represented through explicit domain objects and Relations such as Person, Device, Organization or Person USES Device.

## Unknown as a valid starting state

Unknown is not a defect to hide. It can be the first correct statement about current knowledge.

Example:
- VPN gateway = UNKNOWN
- restart authority = UNKNOWN
- network vendor = UNKNOWN

The platform should avoid replacing these with assumptions.

UNKNOWN is not semantically identical to a database NULL. The operating model may need to distinguish:
- not yet investigated
- investigated but unresolved
- contradictory sources
- intentionally not collected / not currently required

These differences should be represented when they affect Work, risk, prioritization or future KAIZEN.

## Information maturity lens

Information maturity is best treated as a derived lens, not a second mutable state machine.

Candidate progression:

0. UNKNOWN UNKNOWN — missing need not yet discovered
1. KNOWN UNKNOWN — required information is known to be missing
2. KNOWN — a value has been obtained
3. VERIFIED — value confirmed against evidence/reality
4. CONTROLLED — value has owner/update trigger/process to stay correct

Raw unknown count is not a quality score. Discovering new unknowns can represent progress.

## Reliability

Candidate reliability statuses:
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

Important distinction:
- VERIFIED = correct now
- CONTROLLED = has a mechanism to remain correct

Updated At is not Trusted At. Last Verified At matters.

An external system or integration source does not automatically make a value authoritative. Operational Context should preserve source and verification state where relevant.

## Work-driven enrichment

Real Work should progressively enrich context:

Work → required context check → Known / Unknown → investigation/confirmation → Evidence → Fact → Verification → Context update → next Work starts from a better baseline.

When Work changes the real environment, context should update through a traceable Change:

Work → Action → Change → Verify → Commit → updated current Fact / Relation.

This creates a service learning curve:

first case: research-heavy
later cases: context reuse and faster diagnosis

The causal direction is important:

Fact / Unknown → Work → Evidence / Change → Verified Fact → Learning → KAIZEN.

Learning is downstream of trusted operational evidence; the platform should not claim certainty or learning where the underlying information remains ambiguous or unverified.

## Context gap prioritization

Not every unknown should create Work.

Unknown → Service Context → Impact → Is this needed now? → Priority.

Principle:

> 分からないから調べるのではなく、分からないことが仕事に影響するなら調べる。

## Continuous Operational KAIZEN

Daily work improves information state:
- UNKNOWN → KNOWN
- UNVERIFIED → VERIFIED
- STALE → VERIFIED
- missing Knowledge → verified Knowledge
- unknown Authority → defined Authority
- unknown Exception → known Exception

These state improvements are continuous operational KAIZEN.

Patterns accumulated from verified Facts, Decisions, Outcomes and Exceptions can later support Knowledge improvement, Rule Candidates, Authority review, standardization and automation. These are consequences of trusted operational evidence, not substitutes for it.

## AI use

AI should not simply answer. It should identify the required context for the current Work, show what is trusted vs missing, and guide the operator toward the highest-value next question or verification step.

AI guidance must preserve provenance and reliability.

Example behavior:

- Fact: VPN product = FortiClient, VERIFIED
- Unknown: VPN gateway
- Observation: customer values rapid responses, source = sales, subjective
- Decision: restart requires customer approval

AI must never merge these categories into one undifferentiated narrative.

AI may suggest a potential Fact based on evidence, but the suggestion is not authoritative until the required human/domain verification and commit path has completed.

> AI Reasons from typed, trusted context. It does not silently create Facts.

## Operational Context output for UI

A Work view should eventually be able to present:

- What we know
- Why we trust it / source where relevant
- What we do not know
- What is needed for this Work
- What can safely be done now
- What requires review/approval
- What information should be obtained if useful
- Which knowledge/rules/decisions were used
- Reliability and source of each critical item
- Whether a Fact is current, stale or only observational/hypothetical
