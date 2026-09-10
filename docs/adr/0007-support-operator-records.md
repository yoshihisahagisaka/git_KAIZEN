# ADR 0007: SUPPORT operator drafts, completion and corrections

Status: Implemented for review, 2026-09-10.

The SUPPORT Human-usable V2 request supersedes mandatory normal-path free-text
reasons in the V1 UX, while retaining V1 domain commands and semantics.

The normal start button remains an explicit human REQUIRED evaluation. Its basis
records the standard intake choice, actor, contract version and timestamp. It is
not automatic Work creation on Event intake. NOT_APPLICABLE still requires a
reason. Standard guidance records the operator's acceptance of the bounded demo
procedure; additional-response-not-needed and other guidance require an explanation.

The fixed wizard captures checks, performed guidance and a connection result with
its source. CONNECTED is an observation/attestation within this Work, not proof of
permanent resolution or a new Registry Fact. UNKNOWN never defaults to absence.
Restart guidance records advice and what the operator says happened; it executes
no device command and commits no configuration or Registry change.

Use append-only `support_work_records` for draft snapshots, reviewed completion
notes and correction attestations. Each record carries tenant, Work, revision,
request ID, author and time. Completion atomically records the existing V1
Evidence/Action/Decision, the structured notes, Work completion and audit. Drafts
create no execution or confirmed information. Knowledge remains optional.

An existing V1 resolution can receive edited completion notes without replacing
its original Evidence/Action. Completed records accept explicit corrections with
a reason. Corrections neither execute another Action nor alter Registry or the
original completion category. The read model identifies the latest corrected
account and retains originals for audit. Reclassification/reopening of a closed
Work remains a separate decision; text and connection-result corrections work now.

Serialize edits on the Work lock, reject stale revisions, and return the original
result on an identical request retry. All writes share active Operator/Contract
Authority and the existing exact Origin/session CSRF boundary. New storage has
forced tenant RLS, composite tenant keys and SELECT/INSERT-only runtime grants.
No production dependency on embedded PostgreSQL is introduced.

Related history is bounded to completed Work for the same Person AND Service.
It shows dated reports, actions and results with links to the source inquiry,
including corrections. It makes no AI recommendation or claim that the same PC
was used historically. Current PC context still resolves the live JOIN Relation.

The wizard is a fixed SUPPORT Service Model procedure, not a builder. No new
Event-to-Work uniqueness or cardinality constraint is introduced. Existing V1
single-requirement queries remain bounded projections; future many-to-many
WorkRelation and multiple requirement/Work execution remain possible.

Human Review amendment: existing `SupportNotes` action/result/source choices are
the formal operator account; standard action/result supplementary text may be
empty. Other actions require actual-content text, Unknown results require context,
and exception/correction reasons remain required. The Application still validates
these semantics and atomically persists Evidence/Action plus structured Record.
Existing record columns, provenance, grants and original records are unchanged.
Reference dialogs and business/audit projections are Views only, not new objects.

Round 3 Phase 1 design note (2026-09-11): Human Review requires a confirmed Work
target distinct from the registered Person–Device Relation, repeatable execution
and unresolved continuation. The single completion path documented above is a V2
implementation boundary, not a universal SUPPORT lifecycle. Correction must not
be reused to pretend a new Action occurred. Candidate-only storage is not an
implemented Knowledge approval flow. See [Core Fit/Gap](../support-round3-core-fit-gap.md)
for source constraints and required decisions. No ADR lifecycle, code, migration
or new Core Object is implemented by this documentation amendment; Phase 2 needs
approval of the data/Authority/confirmation contracts first.
