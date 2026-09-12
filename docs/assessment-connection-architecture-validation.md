# Assessment / FACT Connection Architecture Validation

Status: VALIDATED — CONTINUE BUSINESS VALIDATION  
Date: 2026-09-12  
Branch: `review/factact-join-slice`

## Overall Fit

**PARTIAL FIT**

The Business Lane connection model is directionally aligned with the current FACTACT Canonical / Core Architecture. No evidence currently justifies introducing `TRIGGER`, `RESULT`, `MANAGEMENT`, or `Connection` as new Core Objects.

Existing concepts can express most of the model:

- Trigger → Event
- Work → Work / Action
- Result → Action result / Evidence / Observation / Change depending on semantic meaning
- Evidence → Evidence
- Review → Review
- Knowledge → Knowledge
- Management → projection/context composed from Review / Impact / Decision / Authority / Knowledge rather than a new object
- Decision → Decision
- Act → Work / Action
- Change → Change
- New Fact → Change → Verify → Commit → Entity / Relation / Knowledge state
- External Connection → Integration adapter + Evidence/provenance + external reference

## Validated Principles

1. FACTACT does not require existing vendors, SaaS, channels or operating systems of work to be replaced merely for adoption.
2. External Work / Result / Evidence may remain outside FACTACT while relevant Evidence and Context are connected into FACTACT with provenance preserved.
3. External information is not authoritative merely because it came from an integration.
4. Management Connection is a projection / continuity model, not a mandatory fixed workflow.
5. Business terms such as `TRIGGER`, `RESULT`, `MANAGEMENT`, and `Connection` remain Business Method language unless a future genuine Core gap is demonstrated.
6. Vendor continuity is compatible with FACTACT: provider-specific execution can change while enterprise-side Fact / Evidence / Decision / Knowledge / Change context remains.
7. Assessment information should be reusable as operational context rather than manually re-entered, subject to semantic/reliability boundaries.

## Genuine Product Gaps / Open Boundaries

### 1. FUTURE semantic boundary

`FUTURE` does not yet have a confirmed one-to-one Core mapping. It may represent desired state, goal, strategy, target outcome, KAIZEN target state, or another existing concept. Do not introduce a new object until the Business meaning is fixed.

### 2. Assessment → Operational Context inheritance contract

Most Assessment content maps to existing concepts, but the lifecycle/application contract for carrying Assessment Evidence / Fact / Unknown / Hypothesis / Decision / Expected Change / Verification into ongoing operations is not yet canonicalized.

### 3. Generic External Evidence ingestion

The architecture supports adapters and provenance, but a reusable application boundary for vendor reports, PDFs, SaaS evidence, Backlog, Teams and similar external evidence is not yet fully specified or implemented.

### 4. Management Connection gap projection

No new Core Object is required, but Product design is still needed for projections such as: Evidence exists → operational review exists → management connection missing → Decision remains Unknown.

## Canonical Conflict

No material conflict identified.

Potential conflict to avoid: implementing the Management Connection as a mandatory fixed workflow through which all Evidence must pass. The Business connection model is analytical / directional, not a universal workflow definition.

## Implementation Impact

- SUPPORT Phase 2: continue; no stop/rewrite required.
- Current Target / BYOD decisions: no change required.
- SUPPORT Evidence / Observation / Action design: keep reusable provenance; do not trap evidence in service-specific local records.
- Assessment Context inheritance: consider in architecture now, implementation can be a later slice.
- Generic external evidence ingestion: future implementation slice.
- Management Connection projection: future Product slice.
- FUTURE: Business/Product definition required before Core change.
- New Core Object: not justified at this time.

## FACT Connection Sheet v0.3 validation gate

FACT Connection Sheet v0.3 validation may continue.

For each connection item, classify in this order:

1. FIT — naturally expressible with existing Core concepts.
2. GAP — a real business requirement cannot be represented without awkward or false semantics.
3. CONFLICT — the proposed model violates Canonical invariants.
4. UNKNOWN — current evidence is insufficient.

Do not promote Business vocabulary directly into Core. Preserve Fact First, explicit Unknown, provenance, Human Decision, Action → Change → Verify, vendor independence, and One Fact / Multiple Views.

If a genuine requirement cannot be explained using existing Event / Work / Action / Evidence / Observation / Review / Impact / Decision / Change / Relation / Knowledge / Authority concepts, stop and report the gap before adding a new object.
