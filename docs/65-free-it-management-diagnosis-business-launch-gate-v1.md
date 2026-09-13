# 無料IT経営診断 — Business Launch Gate v1

Status: **BUSINESS / LAUNCH GATE — DEVELOPMENT HANDOFF INPUT**  
Date: 2026-09-13

## 1. Purpose

無料IT経営診断システムを実顧客へ提供開始してよいBusiness条件を定義する。

本書はProduction Readinessの技術判定を代替しない。Development Laneが技術・Security・Privacy・Operationsを検証し、Business Laneは顧客価値・営業運用・FACT境界・Assessment handoffのLaunch条件を定義する。

> **Business GOだけでもLaunchしない。Technical GOだけでもLaunchしない。**

---

## 2. Launch Role

無料IT経営診断の役割は：

> **経営が目指すFUTUREと、現在わかっているFACT / UNKNOWNを整理し、ITで会社を良くできる可能性と次に確認すべきDecisionを見つけること。**

無料診断は以下ではない：
- 現在地をEvidenceで完全確定するAssessment
- maturity scoring product
- AIによる経営判断
- atLIB executionへの自動lead qualification
- Vendor replacement recommendation engine

---

## 3. Business Launch Gate Summary

実顧客Launchには以下すべてが必要。

| Gate | Area | Required |
|---|---|---|
| B1 | FUTURE-first UX | PASS |
| B2 | FACT / UNKNOWN integrity | PASS |
| B3 | Diagnosis output boundary | PASS |
| B4 | Human review / correction | PASS |
| B5 | Management Feedback usability | PASS |
| B6 | Assessment handoff | PASS |
| B7 | Sales / commercial neutrality | PASS |
| B8 | Customer consent / expectation | PASS |
| B9 | Operational ownership | PASS |
| B10 | Pilot evidence capture | PASS |
| T | Technical / Security / Privacy readiness | Development GO required |

Any Critical FAIL => NO-GO.

---

## 4. B1 — FUTURE-first UX

### PASS condition

Customer flow starts from desired company FUTURE / management priority rather than only IT pain points.

Minimum:
- 1–3 year future / desired change can be captured
- IT expectation can be captured
- current issue questions come after / in context of FUTURE
- output preserves customer wording sufficiently for review

### FAIL examples
- diagnosis starts as generic IT checklist only
- score becomes the hero
- product recommendation appears before Future is understood

---

## 5. B2 — FACT / UNKNOWN Integrity

### Critical PASS condition

System must not convert missing / uncertain input into confirmed FACT.

Required behavior:
- FACT distinguishable from UNKNOWN
- AI inference distinguishable from customer-provided FACT
- unanswered item remains UNKNOWN / not confirmed
- historical or preexisting information is not automatically assumed applicable to current diagnosis without confirmation
- user can correct mistaken interpretation

### Critical FAIL

> **分からないことを、分かったことにする。**

Any material instance is Launch blocker until corrected.

---

## 6. B3 — Diagnosis Output Boundary

Output should support the canonical 5-block management feedback:

1. FUTURE
2. FACT / UNKNOWN
3. GAP
4. WHY — hypothesis / confirmation required
5. NEXT DECISION

### PASS
- GAP is traceable to Future + known current information
- WHY can remain HYPOTHESIS
- recommendations do not silently become Decisions
- no unsupported guaranteed improvement percentage
- no unsupported maturity score
- no automatic vendor replacement conclusion
- no automatic atLIB Actor conclusion

---

## 7. B4 — Human Review / Correction

Before management feedback is treated as customer-facing conclusion, an atLIB operator must be able to review the diagnosis.

Required:
- inspect key customer inputs
- inspect AI interpretation
- identify FACT / UNKNOWN / HYPOTHESIS
- correct wording/classification
- approve feedback version
- retain enough provenance to know what was customer input vs AI suggestion vs Human-approved output

Principle:
> **AI Suggests. Human Decides. System Records.**

---

## 8. B5 — Management Feedback Usability

A sales/consulting employee must be able to use diagnosis results in a 30–45 minute management feedback meeting without reconstructing the analysis manually.

Minimum output usability:
- Future visible first
- confirmed vs unknown visible
- main gaps limited to understandable management themes
- hypothesis clearly marked
- next decisions understandable to non-IT executive
- evidence/confirmation needs available for operator drill-down

### Pilot test
At least internal role-play using representative cases before external Launch.

---

## 9. B6 — Assessment Handoff

When deeper evidence is needed, diagnosis must support a natural transition into Assessment.

Required handoff data:
- FUTURE
- customer-confirmed FACT
- UNKNOWN
- GAP
- HYPOTHESIS / possible root cause
- Evidence Needed
- Next Decision

Do not require retyping all diagnosis information into Assessment workflow if avoidable.

### Customer explanation

> **無料診断で見えたのは改善可能性です。ここから先は、可能性のまま投資判断せず、Evidenceを確認して現在地と次の一手を確定します。**

---

## 10. B7 — Sales / Commercial Neutrality

### PASS
- diagnosis can end without Assessment proposal
- direct focused project may be valid if enough FACT exists
- existing vendor continuation may be valid
- customer execution may be valid
- other vendor may be valid
- atLIB execution is not preselected

### FAIL
- output structurally funnels every customer into atLIB Managed Capability
- AI labels atLIB as best actor without Human Decision / evidence

---

## 11. B8 — Customer Consent / Expectation

Before customer submission, customer must understand at minimum:
- what the free diagnosis does
- what information is being requested
- that output is an initial diagnosis / possibility discovery, not a full evidence-based Assessment
- how follow-up may occur
- applicable privacy / data handling information

Privacy/legal wording itself is subject to the separate Privacy/Legal decision and Technical readiness gate.

Business Lane must not invent or approve legal wording without appropriate review.

---

## 12. B9 — Operational Ownership

Before Launch, named internal roles must exist for:
- diagnosis owner
- customer follow-up owner
- human review owner
- management feedback owner
- technical incident escalation
- privacy/security escalation

The same person may hold multiple roles initially, but responsibility cannot be UNKNOWN at Launch.

Also required:
- expected response time after submission
- what happens if diagnosis generation fails
- how customer correction is handled
- how duplicate/test submissions are handled

Exact SLA is not decided here.

---

## 13. B10 — Pilot Evidence Capture

Launch must create evidence for improvement.

For each pilot/customer capture:
- account / customer segment
- trigger
- FUTURE theme
- completion / abandonment
- confusing questions
- unanswered / UNKNOWN pattern
- operator correction points
- AI misclassification if any
- management feedback reaction
- Assessment need understood?
- next action
- customer feedback

Do not collect unnecessary personal data merely for validation.

---

## 14. Launch Stages

### Stage 0 — Internal Validation

Users:
- atLIB internal employees
- fictional / sanitized representative cases

Goal:
- flow correctness
- FACT / UNKNOWN integrity
- feedback usability
- operator review

### Stage 1 — Controlled Customer Pilot

Users:
- selected existing customers / trusted contacts

Conditions:
- all Critical Business Gates PASS
- Development Technical/Security/Privacy gate permits controlled pilot
- named operator reviews every output
- customer feedback captured

### Stage 2 — Limited Launch

Users:
- broader existing/customer outreach

Conditions:
- pilot shows no unresolved material integrity issue
- operational workload is manageable
- feedback flow works
- privacy/security readiness approved

### Stage 3 — Public Launch

Users:
- website / marketing traffic

Conditions:
- production readiness GO
- support/incident process operational
- privacy/legal decisions complete
- diagnosis output stable enough for self-service entry
- monitoring and evidence capture operational

---

## 15. Business Critical Gates

The following are **Critical** and cannot be waived merely to launch faster:

1. FACT / UNKNOWN integrity
2. No unsupported customer-facing conclusion
3. Human review capability for controlled pilot
4. Privacy / customer expectation readiness
5. Technical/Security GO from Development Lane

Other UX issues may be accepted as known limitations for controlled pilot if Human approves and customer harm/misrepresentation risk is low.

---

## 16. GO / NO-GO Decision Record

Before each Launch Stage, record:
- stage
- date
- Business Gate status B1–B10
- Technical Gate reference / status
- known limitations
- unresolved UNKNOWN
- risk owner
- Business approver
- Technical approver
- decision: GO / CONDITIONAL GO / NO-GO

CONDITIONAL GO is allowed only when no Critical Gate fails.

---

## 17. Current Known Development Context — NOT REVALIDATED HERE

Business Lane has received prior Development reporting indicating Production Readiness was previously **NO-GO**, with external validation and privacy/business decisions among unresolved gates.

This document does **not** claim those items are still current or resolved.

Development Lane must provide the latest Technical Gate result when Business Launch decision is requested.

---

## 18. Handoff to Development Lane

Development Lane should verify whether the current system supports B1–B10, especially:

1. Can FUTURE be preserved as first-class diagnosis context?
2. Can FACT / UNKNOWN / AI inference be distinguished?
3. Can Human review/correction occur before customer-facing feedback?
4. Can the 5-block feedback be produced without unsupported claims?
5. Can diagnosis data hand off to Assessment without re-entry?
6. Can provenance identify customer input / AI suggestion / Human approval?
7. Can atLIB Actor remain unselected until Human Decision?
8. Can pilot/customer feedback and correction events be captured?
9. What privacy/consent decisions remain Business/Legal decisions?
10. What is the latest Production Readiness GO/NO-GO status?

Do not add unnecessary architecture solely for Business reporting; perform Fit/Gap first.

---

## 19. Business Acceptance Test

Before controlled customer pilot, execute representative cases including:

### Case A — Many known facts
Expected: clear FACT-rich feedback; no unnecessary UNKNOWN invention.

### Case B — Many unanswered questions
Expected: UNKNOWN remains visible; system does not fill gaps with AI assumptions.

### Case C — Customer has existing vendor
Expected: no vendor replacement bias.

### Case D — Simple direct project
Expected: system does not force Assessment when decision/evidence is already sufficient.

### Case E — Complex management issue
Expected: diagnosis stops at possibility / next evidence and naturally recommends deeper Assessment if Human decides it is required.

### Case F — AI interpretation is wrong
Expected: operator can correct before approved feedback.

---

## 20. Launch Principle

> **無料だから、曖昧でよいわけではない。**

> **無料診断は答えを決める場所ではなく、正しく次のDecisionへ進む場所。**

> **分からないことを、分かったことにしない。**

> **Business GOだけでもLaunchしない。Technical GOだけでもLaunchしない。**
