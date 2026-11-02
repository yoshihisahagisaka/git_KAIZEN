# FACTACT SUPPORT Human Review 2 — Product Decisions (2026-11-02)

Status: **PRODUCT DECISIONS ACCEPTED / IMPLEMENTATION DESIGN PENDING**
Authority: Product Owner approval in IT経営KAIZEN統括レーン, 2026-11-02
Scope: SUPPORT Human Review 2, daily operation, Registry mismatch, escalation and Work relation
Baseline at record creation: main `f9d1dc9f1cba24560b8fd0488b18dbe37311d7b2`; UX Draft PR #10 `14a8a375caa552e03dcedfc37ecfb4db1ee3fdb0`; Runner Draft PR #9 `c985c5b0313907a72c8cd2543c8a52ccc5817cdc`.

**This is a decision record, not a migration, API, data-contract or release approval.** Preserve existing Canonical, ADR, Authority, Provenance, append-only history and Change → Verify → Commit. Do not reinterpret the prior decisions or treat unimplemented UI as existing functionality.

## D-01 — Registered information versus current inquiry target

Distinguish:
- **登録情報**: the Registry's authoritative recorded information;
- **問合せ対象**: what is actually being handled in this specific Work, including unverified claims.

Display corresponding values side-by-side, for example registered PC `PC-0008` vs target PC `PC-0012`, VPN necessity, ownership and management status where grounded. Human may indicate **一致 / 異なる / 未確認**; when different, record the actual value, source, actor/time and uncertainty without fabricating a Device or promoting the Registry value. Device lookup or unidentified/unregistered device observations must respect the existing SUPPORT Context contract. Comparison alone does not change Registry or prove either side is wrong.

## D-02 — Mismatch handling is human confirmation first

The **first** operational guidance for a mismatch is to ask the person involved, not to classify a Registry change immediately. Example:

> こちらの登録情報と一致しておりませんが、田中さんが会社から貸与されているPCでお間違いないですか？最近交換などされましたか？

Record the answer as a caller statement, not verified Registry Fact. Guide subsequent checks appropriate to the answer (replacement history, temporary borrowing, management records or knowledgeable staff). If not verifiable, preserve UNKNOWN. Only after sufficient corroboration assess whether Registry maintenance is warranted. Do not force a Registry change as a prerequisite for resolving an otherwise completed inquiry.

## D-03 — Registry change, Authority and escalation

When a verified mismatch requires a Registry change:
1. Apply **existing** Action / Change / Verify / Commit Authority; do not invent replacement role mappings.
2. An authorized person proceeds through the established formal change pathway and verification.
3. An operator without the necessary authority **escalates to an authorized superior/role**, who reviews and decides under the existing Authority.
4. Escalation transfers references to existing mismatch details, caller observations, verification sources and response history; the operator must **not re-enter or retype known information**. The request's purpose / requested decision may be added where needed.
5. Escalation itself never updates Registry, creates a verified Fact or implies approval. Record the actor, time, reason, recipient/responsible authority and subsequent result, subject to the eventual technical contract.
6. Inquiry Work and Registry-change Work remain distinct but related. Their lifecycle responsibilities are independently managed; an inquiry can end without silently dropping a pending change obligation.

Routing, persistence, recipient authority mapping and transaction boundaries are **implementation Fit/Gap topics**, not newly decided by this document.

## D-04 — Simplified daily response entry

Replace multiple mandatory daily narrative fields and an additional lifecycle-management task with one natural interaction:

- a single **対応内容** free-text field for what was confirmed/done/learned;
- **対応後の状態**: `顧客対応・回答待ち`, `要調査`, `様子見`, `対応完了`;
- **次回確認予定** required for the three non-complete choices, not for `対応完了`;
- one **対応を記録** action.

Do not ordinarily require separate `待っている相手` or duplicate `次にやること` input. A saved entry is visible in the human-readable append-only response history; new entries start blank, while saved drafts may be restored. Preserve the distinction between **Follow-up (the operator's next check)** and **Due (an actual deadline/obligation)** in Domain, Projection and display. The new mandatory *normal UI completion pattern* does not retroactively reclassify pre-existing Waiting records with no Follow-up as invalid or authorize guessed dates.

The four options are **operator-facing outcomes of the response**, not approval to overwrite the existing Work status enum or silently Close. The exact Commands, invariants, persistence and Authority require separate design.

## D-05 — Explicit completion and human reversibility

Selecting `対応完了` invokes explicit Human completion confirmation and retains the existing Close guard, outcome, reason and provenance. A response record alone is not automatic Close.

Humans can make mistakes. A completed Work should support a separately authorized **対応中に戻す** action, with reason, actor/time, post-reopen situation and next check date. Earlier Close decision and records remain append-preserving, never erased or silently changed. The actual reopen Command, conflicting changes, Authority, idempotency and relevant lifecycle invariants remain design gates; do not pretend this is already supported by current code.

## D-06 — Similar inquiries and cross-Work relation

Offer prior work as **candidates**, not automatically confirmed duplicates. Human may identify `同じ対応の続き`, `関連する別件`, `関係なし`, or leave undecided. Both identities and relationship decisions can later be corrected append-preservingly.

Where a new Work B is accepted as continuation of Work A, an explicit, confirmed, atomic operation should:
- associate A and B with reason, actor/time and provenance;
- if A is completed, reopen A into the Human-selected non-complete situation with required next check date; if already open, avoid redundant reopen;
- keep Work B and its intake/response history intact and end B explicitly with documented transfer of responsibility to A;
- preserve references across both Works; never destructively merge, silently delete, or automatically identify equivalent incidents.

If an A inquiry turns out to be a different case, allow creation/linking to B and Human decisions on ongoing obligations without moving old facts destructively. All-or-nothing transaction, concurrency, Authority and reversal semantics are **implementation design gates**. Prior candidates shown by Explore are read-only until Human confirmation.

## D-07 — Supporting knowledge and histories

Response histories and team comments support human retrospective understanding and collaboration; they must not become a second management report to fill out. A response may optionally reference the **manual/procedure and exact version actually used**. Approved procedures and their revision/discontinuation state remain distinct from unapproved Knowledge Candidates. A superseded procedure should stop appearing as a normal current guide, while past response records retain the exact historic version and may point to the successor version. No automatic Rule/Registry/Work updates from reading or revising material. Comments, approvals, version records and notification mechanisms require a separate persistence/Authority contract.

## Relationship with existing canonical decisions

- `docs/factact-product-operating-principles-v1.md`: Work First; Natural Fact Accumulation; Human Fallibility; Unknown; Authority First; Work Context is not Registry.
- `docs/support-round3-phase2-decisions.md`: Decision 1 target ≠ Registry, Decision 3 Close responsibility, Decision 4 Due ≠ Follow-up, Decision 5 Actor ≠ Owner; escalation and other boundaries remain authoritative.
- Existing SUPPORT UX PR #10 implements a previous step of the interface only. These newer decisions require Fit/Gap and code-level implementation contracts before code changes.

## Next stage — design gates, not yet approved implementation

1. Read current main, PR #9/#10, Canonical, ADR, Decision Log and code; identify exact reuse versus necessary Application/Domain/Migration deltas.
2. Specify atomic record+business-situation+Follow-up interaction without conflating Due, while respecting the existing explicit Close guard.
3. Model mismatch confirmation and source semantics, including no false promotion to verified Registry.
4. Reuse existing Authority and formal Change pathway; define escalation source references and recipient resolution with no duplicate narrative.
5. Define reopen and cross-Work relation commands, append-only provenance, idempotency, concurrency, ownership and transaction tests.
6. Produce exact code patches, DB migration (only if proved necessary), tests and rollback/review contracts for approval **before** asking Work to implement.

No application code, migration, Deployment, main merge or Production operation is authorized by this Decision.
