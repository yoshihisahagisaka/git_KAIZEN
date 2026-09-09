# FACTACT — JOIN UX Golden Flow

## 1. Purpose

This document translates the 情シスKAIZEN `JOIN` Service Model into an operator-facing UX flow.

The goal is not to design a conventional onboarding checklist. The goal is to prove the FACTACT experience:

> **FACT FIRST. From Fact to Action.**

An operator should be able to start from incomplete but truthful information, understand what is known and unknown, let FACTACT evaluate what Work is actually required, execute only necessary Work, commit verified Changes into shared operational Facts, and leave the next case better than the previous one.

The primary design question for every screen is:

> **What Fact does the operator need now, and what is the next safe Action?**

---

# 2. Scenario

Customer: Example Co.

New employee:
- Name: 田中 太郎
- Start date: 2026-10-01
- Department: 営業部
- Employment type: 正社員
- Location: 東京

At Event creation time, the following may still be UNKNOWN:
- exact device to assign
- asset number
- M365 account identifier
- CRM account identifier
- Adobe requirement
- VPN requirement

The UX must not force these fields to be filled before the process can start.

---

# 3. Golden UX Principle

A conventional system tends to show:

> 入社チェックリスト 0/12

FACTACT should instead show:

> **この入社に必要なことを確認しています**

and distinguish:

- **Known Facts** — already trusted enough for this decision
- **Unknown / Need to Confirm** — missing information that may matter
- **Required Actions** — Work justified by Fact/Rule/Decision
- **No Action Needed** — evaluated requirements that intentionally created no Work
- **Changes Pending Verification** — reality/knowledge changes not yet committed
- **Learning from this Work** — candidates that may improve future operations

The operator should not need to understand the internal Domain Model vocabulary to use the system.

---

# 4. Entry Paths

JOIN can start from multiple Event Sources:

1. manual entry by 情シス / atLIB operator
2. HR notification / email-derived Event
3. future HRIS integration
4. approved import

All entry paths create or reference an Event. They do not directly create a fixed task checklist.

V1 may start with manual Event creation.

---

# 5. Screen J-01 — New Join Event

## User goal

Register the minimum known Facts needed to begin safely.

## Suggested UI

```text
┌──────────────────────────────────────────────────────────────┐
│ FACTACT                                      情シスKAIZEN    │
├──────────────────────────────────────────────────────────────┤
│ 新しい入社予定                                                │
│                                                              │
│ 氏名              [ 田中 太郎                         ]       │
│ 入社予定日        [ 2026-10-01 ]                             │
│ 所属              [ 営業部 ▼ ]                              │
│ 雇用形態          [ 正社員 ▼ ]                              │
│ 勤務拠点          [ 東京 ▼ ]                                │
│                                                              │
│ まだ分からない項目は、空欄のままで開始できます。             │
│                                                              │
│                          [保存] [必要な対応を確認する →]       │
└──────────────────────────────────────────────────────────────┘
```

## UX rules

- Do not display dozens of optional provisioning fields here.
- Do not require device/account/SaaS values that do not yet exist.
- Empty must not automatically mean UNKNOWN semantically; the application determines whether an Information Requirement exists.
- If a duplicate Person candidate exists, show it before creating a new Person.
- Source and actor are captured automatically where possible.

## Result

Event `EMPLOYEE_JOINING` exists with known context.

No provisioning Work exists yet merely because the Event was saved.

---

# 6. Screen J-02 — FACT / Context Review

## User goal

See what FACTACT currently knows before deciding what work is needed.

## Suggested UI

```text
┌──────────────────────────────────────────────────────────────┐
│ 田中 太郎 — 10/1 入社予定                                    │
├───────────────────────────────┬──────────────────────────────┤
│ 確認できている情報             │ まだ分からないこと           │
│                               │                              │
│ ✓ 所属      営業部            │ ? 利用PC                    │
│ ✓ 雇用形態  正社員            │ ? Adobe利用要否             │
│ ✓ 勤務拠点  東京              │ ? VPN利用要否               │
│ ✓ 入社日    2026/10/01        │                              │
│                               │                              │
│ Source: 人事連絡              │ 今確認が必要なものだけ       │
│ Verified: 2026/09/15          │ 次のステップで確認します     │
├───────────────────────────────┴──────────────────────────────┤
│                     [必要な対応を判定する →]                 │
└──────────────────────────────────────────────────────────────┘
```

## Important behavior

UNKNOWN is visible without creating anxiety or blocking the whole process.

FACTACT should differentiate:
- unknown but irrelevant now
- unknown and required for current Requirement Evaluation
- stale Fact requiring verification
- contradictory information requiring human resolution

The UI should prioritize only the gaps that affect the current decision.

---

# 7. Screen J-03 — Requirement Evaluation

## User goal

Understand what is required and why.

This is one of the defining FACTACT screens.

## Suggested UI

```text
┌────────────────────────────────────────────────────────────────────┐
│ 田中 太郎 / 入社対応                                               │
│ 必要な対応                                                        │
├──────────────────┬──────────────┬─────────────────────────────────┤
│ 項目             │ 判定         │ 理由                            │
├──────────────────┼──────────────┼─────────────────────────────────┤
│ 会社PC           │ ● 必要       │ 正社員 × 営業部 Rule           │
│ M365             │ ● 必要       │ 正社員 Rule                     │
│ CRM              │ ● 必要       │ 営業部 Rule                     │
│ Adobe            │ ? 要確認     │ 適用条件を判断できるFact不足    │
│ VPN              │ ? 要確認     │ 勤務条件/Roleの確認が必要       │
│ 特権アカウント   │ ○ 不要       │ Role条件に該当しない             │
└──────────────────┴──────────────┴─────────────────────────────────┘

 3件のWorkを作成できます
 2件は確認が必要です
 1件は対応不要です

 [確認事項に回答]              [確定したWorkを先に開始 →]
```

## Design principle

The operator must be able to inspect **Why**.

A Requirement result should be explainable from:
- Fact(s)
- Rule(s)
- Contract Profile
- Decision
- Exception
- missing required context

Do not show opaque AI-only conclusions such as `AI recommends PC provisioning` without the basis.

## Progressive execution

The operator does not have to resolve every unknown before starting unrelated safe Work.

Example:
- PC/M365/CRM are already REQUIRED and can begin.
- Adobe/VPN can remain DECISION_REQUIRED.

This is important for progressive onboarding.

---

# 8. Screen J-04 — Guided Clarification

## User goal

Resolve only high-value Unknowns blocking a decision.

FACTACT should ask a question, not ask the operator to fill a database form.

Example:

```text
Adobe利用要否を判断するために確認が必要です。

この方はAdobe Creative Cloudを利用する業務を担当しますか？

[ はい ] [ いいえ ] [ 分からない ] [ 人事/上長に確認する ]

判断に使う情報：
- 所属：営業部
- Role：未登録
- 現在適用できるRule：なし
```

If `分からない`:
- do not invent the answer;
- retain Known Unknown;
- optionally create/follow a clarification Work if the information matters enough.

If `人事/上長に確認する`:
- create an owned next Action or Work according to scope;
- waiting must retain Owner.

---

# 9. Screen J-05 — Work Plan

## User goal

See only the Work that is actually justified.

```text
┌──────────────────────────────────────────────────────────────┐
│ 田中 太郎 — 入社対応                                         │
├──────────────────────────────────────────────────────────────┤
│ REQUIRED                                                     │
│ ● PC準備                Owner: atLIB     期限 9/28           │
│ ● M365アカウント作成     Owner: atLIB     期限 9/28           │
│ ● CRMアカウント作成      Owner: atLIB     期限 9/29           │
│                                                              │
│ DECISION REQUIRED                                            │
│ ? Adobe利用要否         Next: 上長確認                       │
│ ? VPN利用要否           Next: 勤務条件確認                   │
│                                                              │
│ NO WORK                                                      │
│ ○ 特権アカウント        NOT APPLICABLE                      │
└──────────────────────────────────────────────────────────────┘
```

This view should preserve No Work decisions as service evidence without turning them into fake closed tickets.

---

# 10. Screen J-06 — Work Detail: PC Provisioning

## User goal

Execute one owned Work with the relevant Operational Context visible.

```text
┌──────────────────────────────┬───────────────────────────────┐
│ PC準備 #W-1042              │ Operational Context           │
├──────────────────────────────┼───────────────────────────────┤
│ Owner       atLIB / Sato     │ ✓ Person: 田中 太郎          │
│ Status      IN_PROGRESS      │ ✓ Dept: 営業部               │
│ Due         2026/09/28       │ ✓ Location: 東京             │
│ Next Action PC選定           │ ? Primary Device: UNKNOWN    │
│                              │                               │
│ 手順 / Knowledge             │ Applicable Rules              │
│ 1. 標準PC選定                │ Sales standard device policy  │
│ 2. キッティング              │                               │
│ 3. セキュリティ設定          │ Authority                     │
│ 4. 利用者割当                │ A2: device assignment allowed │
│                              │                               │
│ [Actionを記録]               │ [Evidence / History]          │
└──────────────────────────────┴───────────────────────────────┘
```

The operator should not need to navigate to separate spreadsheets to discover current context.

---

# 11. Screen J-07 — Action → Change

## User goal

Record the real effect of an Action without duplicating administrative entry.

Operator selects PC001 and performs assignment.

FACTACT proposes the resulting Change:

```text
実施したAction
  PC001を田中太郎さん向けに準備・割当

このActionによる変更

  Person: 田中 太郎
  Relation: USES_PRIMARY_DEVICE
  Before: none / UNKNOWN
  After:  PC001

  Change Type: REALITY CHANGE

Evidence
  ✓ Device serial confirmed
  ✓ Asset label confirmed
  ✓ Security baseline complete

[変更内容を確認]   [修正]   [実行済みとして記録]
```

Important:
- Action and Change are separate concepts.
- the UI can make them feel like one natural operation;
- the database must not directly update `person.device_id` as a shortcut.

---

# 12. Screen J-08 — Verify & Commit

## User goal

Make authoritative state trustworthy.

Depending on Authority / risk / Service Model configuration, verification may be:
- self-verification
- peer review
- supervisor review
- external system evidence
- automated verification

Example:

```text
変更を確認してください

田中 太郎
  Primary Device
  — → PC001

Verified by: Sato
Evidence: Serial / Asset / baseline check
Effective from: 2026-09-28 15:20

[Commit]
```

After Commit:

> `Tanaka → USES_PRIMARY_DEVICE → PC001`

becomes current authoritative operational information.

The same Fact becomes available immediately to other Views and Service Processes.

---

# 13. Screen J-09 — JOIN Overview after Work

The JOIN Event page should not merely show `4/6 tasks complete`.

It should show the state of the real onboarding outcome.

```text
田中 太郎 — 10/1 入社

準備状況
✓ Primary Device   PC001              VERIFIED
✓ M365 Account     tanaka@...         VERIFIED
✓ CRM Account      T.Tanaka           VERIFIED
○ Adobe            NOT REQUIRED
△ VPN              上長回答待ち       Owner: Sato

対応結果
Required Work        4
Completed            3
Waiting              1
Work Avoided         2

[Operational Contextを見る]
```

The primary mental model is **readiness / reality**, not ticket count.

---

# 14. Screen J-10 — Learning Moment

This is the candidate FACTACT "magic moment".

When Work or the Event reaches an appropriate point, FACTACT asks:

> **この対応によって、次の仕事に活かせることは増えましたか？**

AI may propose:

```text
今回の対応から、次回に活かせそうなことがあります。

[Knowledge Candidate]
営業部の新入社員にはCRM Browser Extensionの設定が必要でした。
Evidence: W-1044

過去3件でも同じ追加対応があります。

[Knowledgeとして残す]
[Rule候補としてレビュー]
[今回は残さない]
```

Important:
- this must not become a mandatory bureaucratic closing form;
- AI should pre-compose candidates from actual Work evidence;
- human confirms/rejects/edits;
- nothing becomes authoritative Rule or Fact silently.

---

# 15. Screen J-11 — Rule Candidate Review

After repeated consistent evidence:

```text
標準化候補

営業部の入社対応 3件で、CRM Browser Extension設定が
追加Actionとして実施されています。

提案
  IF Event = JOIN
  AND Department = Sales
  THEN CRM Browser Extension = REQUIRED

Evidence
  W-0912 / W-0988 / W-1044

Impact estimate
  次回から確認・追加作業の発生を減らせる可能性があります。

[承認してRule化]
[条件を修正]
[Knowledgeのまま残す]
[却下]
```

Rule approval must require appropriate Authority.

---

# 16. Second JOIN — The HELIX Effect

When the next Sales employee joins, FACTACT starts from a better state.

Previous case:
- CRM extension was discovered during Work.

Next case:
- approved Rule evaluates it at Requirement stage.

The product should make this improvement visible without overstating it.

Example:

> **前回までの運用から標準化されたRequirementが1件適用されています。**

This is more meaningful than generic `AI learned from your data` messaging because the operator can inspect the Rule and Evidence.

---

# 17. UX for LALLIB

LALLIB should not interrupt every Work. It belongs primarily in KAIZEN review of recurring Work patterns.

Example KAIZEN screen:

```text
PC初期設定
過去90日: 24件
Observed human effort: 16–24h range
Exceptions: 1/24
Correction required: 0/24
Procedure stability: evidence available

このWorkをどう変えますか？

[ Let go / なくす ]
[ Automate / 自動化する ]
[ Leave / 社内に残す ]
[ atLIB / 任せる ]
```

FACTACT may recommend a candidate with reasons, but the classification is a human/service design decision.

---

# 18. Operator Experience Principles

## P1. Show reality, not database structure

Users see `利用PC`, not `Relation object` unless advanced details are needed.

## P2. Show Why

Every important automated Requirement/AI recommendation should expose the Fact/Rule/Decision basis.

## P3. Unknown is first-class but calm

Do not turn every Unknown into a red error badge.

Use urgency based on whether it blocks current safe Action.

## P4. Progressive disclosure

Default screen shows:
- what matters now
- next Action
- Owner
- risk/approval

Provenance, Evidence, history and semantic detail remain inspectable.

## P5. One Action should not create duplicate clerical work

If the operator performs a device assignment through FACTACT, the resulting verified relation should update all applicable Views.

## P6. AI is a guide, not an oracle

AI output should visually distinguish:
- confirmed Fact
- Observation
- Hypothesis
- suggestion
- Unknown

## P7. Outcome before ticket count

For JOIN, the operator cares whether the person is ready to work on day one, not whether a checklist is 83% complete.

## P8. Ownership never disappears

Waiting shows:
- Owner
- Waiting For
- next follow-up / due

## P9. Learning should be nearly frictionless

FACTACT should extract candidates from Work evidence rather than asking users to write postmortems for every routine case.

## P10. The next case must visibly benefit

The defining experience is not `case closed`.

It is:

> **前のWorkで得たFactが、次のWorkですでに使われている。**

---

# 19. Suggested JOIN Workspace Architecture

Rather than many disconnected pages, V1 can implement a primary JOIN/Event workspace with contextual panels.

Suggested layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ FACTACT / 情シスKAIZEN / JOIN / 田中 太郎                         │
├─────────────────────────────────────────────┬───────────────────────┤
│ MAIN                                        │ CONTEXT               │
│                                             │                       │
│ Current Step / Required Actions             │ Known Facts           │
│ Work / Decision / Change                    │ Unknowns               │
│                                             │ Rules                  │
│                                             │ Knowledge              │
│                                             │ Authority              │
│                                             │ Recent Changes         │
├─────────────────────────────────────────────┴───────────────────────┤
│ Timeline: Event → Decisions → Work → Actions → Changes → Learning  │
└─────────────────────────────────────────────────────────────────────┘
```

This pattern can later be reused for LEAVE, MOVE, SUPPORT, DEVICE and other Service Models.

---

# 20. Domain Commands Suggested by the UX

The UI should call domain commands rather than generic table updates.

Candidate commands:

- `CreateJoinEvent`
- `UpdateEventContext`
- `EvaluateRequirements`
- `RecordRequirementDecision`
- `CreateRequiredWork`
- `AssignWorkOwner`
- `RecordAction`
- `ProposeChange`
- `MarkChangeExecuted`
- `VerifyChange`
- `CommitChange`
- `RecordKnowledgeStateChange`
- `ProposeKnowledgeCandidate`
- `ProposeRuleCandidate`
- `ApproveRuleCandidate`
- `RecordKaizenCandidate`

Do not expose a generic `PATCH Person.primary_device_id` as the implementation of device assignment.

---

# 21. V1 Magic Moment

The first vertical slice should prove one end-to-end moment:

1. Operator creates a JOIN Event with only minimum known Facts.
2. FACTACT explains which Requirements are REQUIRED / DECISION_REQUIRED / NOT APPLICABLE and why.
3. Only REQUIRED Work is created.
4. Operator assigns a real Device through Work.
5. Action produces a Change.
6. Verification commits a Person–Device Fact/Relation.
7. The JOIN view and Person/Device views immediately show the same Fact.
8. A later SUPPORT or DEVICE flow can reuse that Fact without duplicate entry.
9. FACTACT proposes at least one learning candidate from Work evidence.
10. The next similar JOIN can visibly reuse an approved Fact/Knowledge/Rule.

If V1 demonstrates this convincingly, FACTACT is already meaningfully different from a conventional ticket/checklist application.

---

# 22. Golden UX Acceptance Criteria

- JOIN can start with incomplete information.
- Unknown is never silently converted to a guessed value.
- Event creation does not automatically generate a fixed checklist.
- Requirement results expose their basis.
- unrelated safe Work can begin while another Requirement remains undecided.
- No Work outcomes remain traceable without fake tickets.
- every active/waiting Work has clear Ownership and Next Action.
- Action and Change are conceptually distinct even if UX keeps them fluid.
- authoritative Fact changes require the configured verification path.
- the same committed Fact appears across multiple Views.
- history is preserved rather than overwritten.
- AI suggestions are visually and semantically separate from Facts.
- learning capture does not become mandatory clerical overhead.
- an approved learning artifact can change how the next similar Event is evaluated.

---

# 23. Product Test

A first-time operator should be able to describe the product after using JOIN as:

> **「FACTACTは、入社チェックリストを管理するシステムではなく、分かっているFactから必要な仕事を判断して、仕事をした結果がそのまま次の仕事に使える情報になるシステムだ。」**

That is the intended UX expression of:

> **FACTACT — From Fact to Action.**
