# Management Feedback MF-C Implementation Progress v1

Status: **DEVELOPMENT / IMPLEMENTATION IN VALIDATION — DO NOT MERGE WITHOUT APPROVAL**  
Date: 2026-09-14

## 1. Business Contract

Business Lane `docs/71-management-feedback-business-output-specification-v1.md` をBusiness Contractとして、Management FeedbackのNEXT DECISIONを既存無料IT経営診断システムのDiagnosis Application Layerへ実装する。

Routes:
- A: `DIRECT_ACT`
- B: `FOCUSED_CONFIRMATION`
- C: `DESIGN_ASSESSMENT`
- D: `STOP_HOLD`

Business labelはFACTACT Core Objectへ追加しない。

## 2. Implemented

Implementation repo: `yoshihisahagisaka/atlib-sales-tools`  
Branch: `feat/controlled-pilot-policy-closure`

Current implementation head:
- `387bdcad15f1c74456bf193b9c53491fcf27babf`

Implemented:
- additive migration `015_management_feedback_decision.sql`.
- append-only `management_feedback_decisions` table.
- A/B/C/D route code, material decision, next action, customer restatement source ref, Human actor/time.
- immutable decision-time Context Snapshot + SHA-256 hash.
- supersession/history; silent overwrite禁止。
- DB triggerによるDecision row UPDATE / DELETE禁止。
- Human-only `ManagementFeedbackDecisionRepo`.
- admin endpoint `POST /cases/:id/feedback/decision` and read endpoint.
- Customer Restatementは同一Caseの`FEEDBACK_STATEMENT` refのみ許可。
- raw Survey / Transcript / raw AI outputをDecision Snapshotへ複製しない。
- Assessment proposal gate: latest Human Management Feedback Decisionが`DESIGN_ASSESSMENT`の場合のみ既存Assessment proposal commandを許可。
- Route C decision自体はAssessmentを自動開始しない。
- A/B/DおよびDecision未記録時はAssessment proposalをfail-closed。
- AI actorはDecision commit不可。
- synthetic MF-C Golden Test追加。
- existing Assessment regression fixtureは、Assessment lifecycleそのものを検証する場合に限り明示的Route C Decisionを準備するよう更新。

## 3. Decision-time Snapshot

Minimum persisted snapshot:
- approved/delivered feedback Report id/version/content version/content hash
- Report approval snapshot hash
- Future ref/version/intent status/statement projection
- current Human Approved Insight refs/version/semantic type
- UNKNOWN refs
- GAP candidate refs
- Hypothesis refs
- OPEN Evidence/Assessment confirmation refs
- Customer Restatement source ref where selected

Decision recordは後続Context変更で書き換わらない。

## 4. Assessment Boundary

Canonical behavior:

```text
Management Feedback completed
→ Human NEXT DECISION
→ A / B / C / D
→ only C permits a separate Human Assessment proposal command
```

Important:
- C selection ≠ Assessment proposal.
- C selection ≠ Assessment acceptance.
- no AI auto-routing.
- no automatic atLIB actor allocation.

## 5. Lifecycle Clarification

Implementation uses `FEEDBACK_COMPLETED` as the Decision command precondition.

Reason: Business Journey is Management Feedback → NEXT DECISION. The earlier docs/78 draft text that listed `FEEDBACK_PENDING + Feedback started` as the planned precondition is superseded by this implementation clarification.

This is not a Business Meaning change; it aligns the Application lifecycle to the Business Journey ordering.

## 6. Validation Status

Prior run #81 failed in the Handoff regression test because a new dynamic assertion introduced a TypeScript `unknown` compile error. Production logic and MF-B tests were already passing up to that point.

The Handoff test was corrected to:
- compare the snapshot against the dynamic Human Approved Insight set, and
- compare the snapshot against the dynamic OPEN Assessment Confirmation Item set,
without fixed counts.

Current full CI:
- Workflow: Controlled Pilot Closure
- Run #94
- Run ID: `34840564743`
- Status at this record: **IN PROGRESS**

MF-C is not marked validated until full CI, Real PostgreSQL, and browser regression complete successfully.

## 7. Core / Business Decision Boundary

- FACTACT Core change: **No**.
- New Diagnosis Application object: **Yes**.
- Business Decision Required: **No** for current MF-C implementation.
- Main merge: **not authorized**.
- PR #2 remains Draft.
- Controlled Pilot verdict remains independent; MF-C CI green does not mean Pilot GO.

## 8. Next

After MF-C full CI green:
1. record validated evidence.
2. MF-D: snapshot completeness / re-decision / continuity validation.
3. MF-E: Pilot instrumentation.
4. MF-F: Route C Diagnosis → Assessment → FACTACT continuity contract, subject to Product Lane mapping validation.
