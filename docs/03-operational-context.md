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

## Why it matters

Operational Context maturity is the practical form of operational standardization.

Standardization does not mean producing more manuals. It means enabling different operators to reach consistent, safe decisions using the same trusted context.

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

## Unknown as a valid starting fact

Unknown is not a defect to hide. It can be the first correct statement about current knowledge.

Example:
- VPN gateway = UNKNOWN
- restart authority = UNKNOWN
- network vendor = UNKNOWN

The platform should avoid replacing these with assumptions.

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

## Work-driven enrichment

Real Work should progressively enrich context:

Work → required context check → Known / Unknown → investigation/confirmation → Fact → Verification → Context update → next Work starts from a better baseline.

This creates a service learning curve:

first case: research-heavy
later cases: context reuse and faster diagnosis

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

## AI use

AI should not simply answer. It should identify the required context for the current Work, show what is trusted vs missing, and guide the operator toward the highest-value next question or verification step.

AI guidance must preserve provenance and reliability.

Example behavior:

- Fact: VPN product = FortiClient, VERIFIED
- Unknown: VPN gateway
- Observation: customer values rapid responses, source = sales, subjective
- Decision: restart requires customer approval

AI must never merge these categories into one undifferentiated narrative.

## Operational Context output for UI

A Work view should eventually be able to present:

- What we know
- What we do not know
- What is needed for this Work
- What can safely be done now
- What requires review/approval
- What information should be obtained if useful
- Which knowledge/rules/decisions were used
- Reliability and source of each critical item
