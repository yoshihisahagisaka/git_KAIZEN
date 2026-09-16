# Management Feedback MF-E Validation / MF-F Product Decision Package v1

Status: **DEVELOPMENT / MF-E VALIDATED — PRODUCT DECISION REQUIRED BEFORE MF-F**  
Date: 2026-09-16

## 0. Result

MF-E Pilot Instrumentation is validated as **FIT** with Business Contract / Development guardrails.

Validated implementation:
- Repository: `yoshihisahagisaka/atlib-sales-tools`
- Branch: `feat/controlled-pilot-policy-closure`
- HEAD: `63e5523b5e9d01cc51e82d0de969eded2f736ab5`
- GitHub Actions: Controlled Pilot Closure run #96 / `35037673107` = SUCCESS
- PR #2 remains Draft / Open
- `main` remains unmerged

Production / Controlled Customer Pilot remains **NO-GO**.

## 1. MF-E Validation

### FIT
- staff-only Case read-side projection; no Diagnosis state mutation.
- no migration / duplicate instrumentation event table.
- existing Audit / AIExecution / AIProposal / Report / Transition / Management Feedback Decision records are reused.
- derived values do not require duplicate operator entry.
- non-derivable observations remain coded Human input.
- missing observability is represented as `NOT_OBSERVED`, `NOT_DERIVABLE`, `INCOMPLETE` or null instead of fabricated zero.
- raw SurveyResponse, Transcript, Report body, customer restatement body, contact information and raw AI input/output are not copied into instrumentation.
- latest Human Route and re-decision history are derived from immutable Decision history.
- Route C alone does not mean Assessment proposal; a separate subsequent Human proposal is required.
- actual conversation duration is not inferred from application command timestamps.
- no FACT promotion, FACTACT Core change, AI authority expansion or automatic atLIB Actor selection.

### Validation evidence
- MF-E Golden: 8 PASS.
- application/security: 115 PASS; real-AI opt-in 3 SKIPPED.
- MF-A/B/C/D regression: 14 PASS.
- real PostgreSQL: 9 PASS.
- browser: 32 PASS.
- remote CI exact HEAD: SUCCESS.

MF-E is therefore **APPLICATION COMPLETE / VALIDATED**. This does not close External Evidence or authorize Pilot GO.

## 2. MF-F Boundary

MF-F is the continuity contract from a Human-selected Route C through Design Assessment and, where appropriate, into FACTACT execution semantics.

Business Journey to preserve:

`Management Feedback → Human NEXT DECISION C → separate Human Assessment proposal/acceptance → Assessment → Evidence / decision-grade FACT → GAP / ROOT CAUSE → KAIZEN OPTION → HUMAN DECISION → Actor Allocation → ACT → CHANGE → VERIFY → NEW FACT → NEXT KAIZEN`

Free Diagnosis output must not be silently promoted into Assessment FACT.

MF-F must reuse existing Diagnosis Assessment Handoff and FACTACT concepts where they fit. Do not introduce a new universal Fact table, generic EAV model, 5-page-specific Core, or Business Route Core Object.

## 3. Product Decision Required — PD-MFF-01: Diagnosis → Assessment provenance

Proposed contract for Product validation:

Diagnosis may hand off only immutable references / semantic state, not Evidence-confirmed FACT.

Minimum handoff meaning:
- Diagnosis Case / Organization identity reference
- current Future and its knowledge status
- Human Approved Observation refs
- explicit UNKNOWN refs
- GAP candidate refs
- unresolved Hypothesis refs
- Evidence Candidate / OPEN Assessment Confirmation Item refs
- approved Management Feedback Report id/version/hash
- latest Human Route C Decision id/version/hash
- Decision-time Context snapshot/hash
- Customer Restatement reference if captured

Assessment receives these as **Initial Context / Confirmation Targets**, not authoritative FACT.

Assessment must independently obtain/review Evidence before forming decision-grade FACT.

Product decision requested: approve / amend this provenance boundary.

## 4. Product Decision Required — PD-MFF-02: Assessment → FACTACT semantic mapping

Proposed mapping for validation:

- Assessment Evidence-confirmed current state → FACTACT Fact candidate only after Human verification/commit under FACTACT authority.
- unresolved Assessment item → UNKNOWN, not DB null and not forced Work.
- Root Cause not proven → HYPOTHESIS.
- selected KAIZEN direction / management choice → DECISION where authority and decision record exist.
- execution responsibility → Actor / Authority assignment; atLIB is not default.
- execution request → Work.
- performed operation → Action.
- resulting system/operational modification → Change.
- post-change confirmation → Verify.
- verified new current state → Fact / Context update.

No Assessment result may bypass Human verification and directly commit FACTACT authoritative Fact/Rule/Decision.

Product decision requested: approve / amend the mapping and identify any existing FACTACT object that should be reused instead.

## 5. Product Decision Required — PD-MFF-03: typed temporal semantics

Do not collapse different temporal meanings into one generic Due Date.

Meanings requiring Product validation include at least:
- customer/vendor promised time
- evidence confirmation target time
- Human review target time
- follow-up time
- Work due time
- verification target time

Proposed rule:
- preserve semantic type + source/provenance + timezone/time value;
- only map into existing FACTACT `Due` / `Follow-up` concepts when the meaning is semantically equivalent;
- otherwise keep the meaning in the Application/Translation layer until a Core contract is approved.

Product decision requested: determine which meanings map to existing FACTACT temporal concepts and whether any genuine Core gap remains.

## 6. MF-F implementation can start only after Product response

After PD-MFF-01/02/03 are resolved, Development may implement MF-F as the smallest additive continuity slice.

Expected implementation preference:
1. reuse existing deterministic Diagnosis Assessment Handoff;
2. add provenance/semantic fields only where missing;
3. preserve immutable Route C / Decision-time snapshot refs;
4. never auto-start Assessment;
5. never auto-create FACTACT Fact/Decision/Work from AI or Diagnosis output;
6. add contract/golden tests across Diagnosis → Assessment boundary;
7. FACTACT-side write implementation only where Product confirms an existing Core mapping.

If Product finds a Core gap, Development must stop at Fit/Gap and must not invent the Core contract.

## 7. Business reconciliation remains separate

Business Decision Required remains:
- RTO Canonical 24h vs internal verification target 8h.
- Assessment price latest 120万円（税別） vs historical 80万円（税別） before customer-facing price connection.

Neither blocks MF-E validation. Price and RTO must not be hardcoded/changed by MF-F without Business Canonical reconciliation.

## 8. External Pilot Gate

Still open:
- actual retention/deletion operation
- external deletion manifest storage
- Cloud SQL backup/PITR/restore and deletion reconciliation
- real Anthropic execution/provider evidence
- Google OAuth
- Secret Manager/IAM
- Cloud Run worker behavior
- ingress/proxy/rate limiting
- monitoring/alert delivery
- staging WEB / SALES_VISIT E2E
- Privacy / Legal
- named Pilot owner / incident contact
- Human operation / role-play evidence

Green application CI does not close these gates.

**Current verdict: Production / Controlled Customer Pilot = NO-GO.**
