# FACTACT SUPPORT Golden Flow V1

**Status:** IMPLEMENTATION INPUT / PRODUCT REVIEW REQUIRED  
**Purpose:** Prove that Facts created by one service flow can be reused as Operational Context in another flow, and that service execution can produce reusable learning without weakening Fact First semantics.

---

# 1. Why SUPPORT is next

JOIN proved the first vertical slice:

```text
Event → Requirement Evaluation → Work → Action → Change → Verify → Commit → Relation / confirmed information
```

The next proof is not merely that FACTACT can store support tickets.

SUPPORT must prove:

> **One Fact, Multiple Views.**

and the beginning of the HELIX:

```text
JOINで確認されたFact
→ SUPPORTのOperational Contextとして再利用
→ より正確な対応
→ Evidence / Knowledgeが蓄積
→ 次の対応に再利用
```

FACTACT must not become a generic ticket CRUD system.

---

# 2. Golden Story

Use the same seeded Person from the Human-usable JOIN flow after their device relation has been committed.

Example operator story:

```text
田中 一郎さん
利用PC: PC-0073（確認済み）

田中さんから問い合わせ
「会社PCでVPNにつながりません」
```

The support operator opens the inquiry and immediately sees current verified context rather than asking for already-known information again.

The screen should explain:

```text
問い合わせ
田中 一郎さん
「会社PCでVPNにつながりません」

現在わかっていること
利用PC: PC-0073 — 確認済み
確認元: JOINで確認された利用PC情報

まだ分からないこと
VPN利用要否: 未確認
発生時刻: 未確認
表示されたエラー: 未確認
他ネットワークで再現するか: 未確認

次にやること
VPN利用要否と症状を確認する
```

The operator must be able to distinguish:

- reused confirmed Fact;
- new user-reported Observation;
- explicit Unknown;
- operator Decision;
- Action performed;
- resulting Change, if reality actually changes;
- reusable Knowledge created from the work.

---

# 3. Core semantic flow

SUPPORT V1 should follow:

```text
Support Event
→ Service Context
→ Requirement Evaluation
→ Work (INCIDENT or REQUEST)
→ Ownership
→ Operational Context assembly
→ Observation / Unknown capture
→ Diagnosis / Decision
→ Action
→ Outcome
→ Evidence
→ Knowledge candidate / reusable Knowledge
→ Complete Work
```

A support Event does not automatically imply every possible Work. Preserve the Core rule:

> Event triggers evaluation; it does not itself equal Work.

For the bounded Golden Flow, one support requirement may evaluate REQUIRED and create one Work.

If an Action changes reality, use the existing Action → Change → Verify → Commit boundary. Do not force a Change when the operator only investigates, explains, or discovers information.

---

# 4. Golden resolution scenario

For V1, use a deterministic, understandable resolution that does not require a real VPN integration.

Suggested bounded scenario:

1. Inquiry arrives: `会社PCでVPNにつながりません`.
2. FACTACT identifies/links the seeded Person explicitly for the demo.
3. Current Operational Context reuses the committed `Person USES PC-0073` relation from JOIN.
4. VPN利用要否 remains UNKNOWN; the system must not infer it from device ownership.
5. Operator records the caller's symptom as an OBSERVATION, not a Fact.
6. Operator follows a bounded demo troubleshooting procedure.
7. Operator records diagnostic result/evidence.
8. Operator makes an explicit Decision such as `VPN利用対象であることを確認したうえで、既知の接続設定手順を案内する` only when the bounded demo evidence supports it.
9. If no authoritative device/system state is changed, do not manufacture a Change.
10. Work may end `COMPLETED` or `NO ACTION REQUIRED` depending on the scenario; the Golden Flow should choose one and make the outcome clear.
11. A reusable Knowledge item/candidate records what helped resolve the issue, with provenance back to the Work/Evidence. It is not automatically an authoritative Rule.

V1 may use seeded/demo procedure and Knowledge content, clearly labeled as demo guidance just as JOIN does.

---

# 5. Operator-facing screen

Follow `docs/17-factact-ux-translation-layer.md` and `docs/18-operator-work-context-v1.md`.

Primary UI language should be task language, not architecture language.

Suggested SUPPORT Work layout:

```text
田中 一郎さんからの問い合わせ
VPNにつながらない

あなたの担当です
問い合わせ元: 田中 一郎さん
受付: 2026-09-10 10:00

次にやること
VPN利用要否と症状を確認する

なぜ？
利用PCは確認済みですが、VPNを利用する人かどうかはまだ確認できていません。

現在わかっていること
✓ 利用PC: PC-0073        確認済み
○ 症状: VPNにつながらない  本人からの申告
? VPN利用要否             未確認
? エラー内容              未確認

確認手順
[VPN接続トラブルの一次切り分けを見る]

関連する知識
- VPN接続時によくある確認ポイント
- PC-0073の現在の管理情報
```

Internal labels such as Event, Observation, Decision and Evidence may appear only in advanced/audit detail unless needed for safe work.

---

# 6. Recipient Observation

A caller/user statement is not automatically an authoritative Fact.

Example:

```text
田中さん: 「昨日からVPNにつながりません」
```

Record as a Recipient Observation with source, time and context where the model supports it.

Do not convert this directly to:

```text
FACT: VPN is broken since yesterday
```

The platform may later use Observations as Evidence or pattern input, but promotion to Rule or authoritative information requires the appropriate human/authority boundary.

---

# 7. Knowledge and learning boundary

SUPPORT V1 should demonstrate learning without pretending the system has already learned a universal rule.

Desired chain:

```text
Work
→ Evidence
→ resolution / Decision
→ reusable Knowledge
→ future Work can surface that Knowledge
```

Future chain:

```text
Repeated Evidence / pattern
→ Rule Candidate
→ Human Review
→ Approved Rule
```

Do not implement automatic Rule promotion in this slice.

AI is also out of scope for the first SUPPORT Golden Flow. The architecture must remain compatible with:

> AI Suggests. Human Decides. System Records.

---

# 8. One Fact, Multiple Views proof

This is the most important acceptance condition.

The device relation created and verified through JOIN must be read by SUPPORT as current Operational Context.

Do not copy `PC-0073` into a SUPPORT-specific person/device field merely to make the screen work.

Expected proof:

```text
JOIN commit
→ Person USES Device relation exists
→ SUPPORT query resolves the same relation
→ SUPPORT screen displays PC-0073 as confirmed context
```

If the relation is replaced later, SUPPORT should resolve the current relation rather than a stale copied value.

---

# 9. Work outcomes

Preserve the distinction between:

```text
No Work created
```

and:

```text
Work created → investigation performed → NO ACTION REQUIRED
```

For SUPPORT, this distinction matters operationally and analytically.

Candidate V1 outcomes:

- COMPLETED
- NO ACTION REQUIRED
- CANCELLED
- DUPLICATE
- SUPERSEDED

Do not overload `COMPLETED` to mean that an underlying technical problem was proven fixed unless Evidence supports that claim.

---

# 10. Golden Tests

## SUPPORT-GT-01 — Event is not Work
Creating a support Event alone does not create Work before requirement evaluation.

## SUPPORT-GT-02 — Required support creates owned Work
A REQUIRED evaluation creates exactly the expected Work with an Owner and Next Action.

## SUPPORT-GT-03 — JOIN Fact is reused
The SUPPORT read model obtains the current Person–Device relation created by JOIN; it does not use a duplicated SUPPORT field.

## SUPPORT-GT-04 — Observation is not Fact
The caller's statement is represented as Observation/evidence context and is not exposed as verified Fact.

## SUPPORT-GT-05 — Unknown remains unknown
VPN eligibility, error details or other missing data are not silently converted to false/none/default.

## SUPPORT-GT-06 — Investigation does not require fake Change
A diagnostic or guidance-only resolution can complete without manufacturing a reality Change.

## SUPPORT-GT-07 — Reality change uses Change boundary
If the chosen test path performs a real state change, it cannot become authoritative Registry state without Verify/Commit.

## SUPPORT-GT-08 — Knowledge keeps provenance
Reusable Knowledge/candidate produced from support work traces back to its source Work/Evidence and is not silently promoted to Rule.

## SUPPORT-GT-09 — Current relation wins
After a verified device replacement, new SUPPORT work resolves the current device relation, while history remains traceable.

## SUPPORT-GT-10 — Tenant isolation
SUPPORT Event, Work, Observation, Evidence, Knowledge and context reads remain tenant isolated under the existing RLS/application boundary.

## SUPPORT-GT-11 — Idempotency / retry safety
Retrying supported commands does not duplicate Work, Evidence or authoritative outcomes.

## SUPPORT-GT-12 — Outcome semantics
`NO ACTION REQUIRED` is distinguishable from no Work having been created.

---

# 11. Human UX tests

## SUPPORT-UX-01
A first-time operator can explain why the inquiry is assigned to them.

## SUPPORT-UX-02
The operator can identify which information was already known before the inquiry.

## SUPPORT-UX-03
The operator can distinguish `確認済み`, `本人からの申告`, and `未確認` without learning Fact/Observation/Unknown terminology.

## SUPPORT-UX-04
The operator can explain the next action and why it is necessary before clicking.

## SUPPORT-UX-05
The operator is not asked again for the user's current PC when a current verified relation already exists.

## SUPPORT-UX-06
The operator can open the relevant troubleshooting procedure/knowledge from the Work screen.

## SUPPORT-UX-07
After resolution, the operator can tell what was learned, what was changed, and what remains unknown.

## SUPPORT-UX-08
The UI does not imply that a user-reported symptom is a verified technical Fact.

---

# 12. Out of scope for this slice

Do not add these yet:

- MOT/TEL integration
- Zoho synchronization
- email/chat ingestion
- AI diagnosis
- automatic Rule creation
- generic Knowledge CMS
- generic workflow builder
- SLA engine
- customer portal
- external end-customer identity resolution
- production VPN/device integrations
- KAIZEN dashboard

The goal is the smallest slice that proves cross-flow Fact reuse and learning semantics.

---

# 13. Stop condition

Stop for architecture/UX review when the implementation can demonstrate:

```text
JOIN confirmed device Fact
→ SUPPORT inquiry
→ owned Work
→ reused Operational Context
→ Observation + Unknown handling
→ procedure-guided response
→ explicit outcome/evidence
→ reusable Knowledge with provenance
```

All existing JOIN Golden Tests and security boundaries must continue to pass.

Do not proceed to MOT/TEL, Zoho, AI, generic Knowledge management or KAIZEN automation before this checkpoint is reviewed.
