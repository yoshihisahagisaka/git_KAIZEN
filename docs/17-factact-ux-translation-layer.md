# FACTACT UX Translation Layer

**Status:** CANONICAL UX PRINCIPLE  
**Purpose:** Translate strict FACTACT domain semantics into language and interactions that operators can understand without learning the internal model first.

---

# 1. Why this exists

The first real-browser JOIN validation exposed an important UX failure mode:

> The operator did not fully understand several terms, but continued because pressing the visible buttons was the only apparent way forward.

This is a common failure pattern in business software. Users often infer that “this probably means X,” then continue because the system presents progression rather than understanding as the immediate goal.

FACTACT must not rely on that behavior.

A workflow is not successful merely because the user reached the end. It is successful when the user understands:

- what is happening;
- why the action is needed;
- what will change if they continue;
- what has already been confirmed;
- what is still unknown;
- when the system is making a suggestion versus recording reality.

Therefore:

> **Internal semantics must remain strict. User language must remain intuitive.**

or, in Japanese:

> **内部は厳密に。画面は直感的に。**

This is the UX Translation Layer.

---

# 2. Domain Language != UI Language

FACTACT's internal domain model is intentionally precise:

```text
Event
→ Requirement Evaluation
→ Work
→ Action
→ Change
→ Verify
→ Commit
→ Relation
→ Fact
```

Operators should not be required to learn these terms before they can use the product safely.

The UI should express the operator's real-world task instead:

```text
入社予定がある
→ 何を準備する必要がある？
→ PCが必要
→ どのPCを用意する？
→ 実際に準備・引き渡した？
→ 内容を確認する
→ 利用PCとして管理情報に反映する
→ 完了
```

The internal chain remains unchanged. Only the user-facing language and interaction are translated.

---

# 3. Canonical Translation Table

| Domain / Internal concept | Default user-facing expression | Notes |
|---|---|---|
| Event | きっかけ / 入社予定 / 問い合わせ | Prefer concrete event name over the word Event |
| JOIN Event | 入社対応 | Do not expose `JOIN Event` as the main label |
| Requirement | 必要な対応 / 必要な準備 | Context-dependent |
| Requirement Evaluation | 必要な準備を確認 | Explain result, not the evaluation engine |
| REQUIRED | 対応が必要 | |
| NOT_APPLICABLE | 対応不要 | |
| ALREADY_SATISFIED | 準備済み | |
| DECISION_REQUIRED | 判断が必要 | |
| Work | やること / 対応 | Use Work only in advanced/admin surfaces if needed |
| Next Action | 次にやること | Primary operator anchor |
| Action | 実施内容 / 作業 | Prefer specific verb: PCを準備する, アカウントを作成する |
| Change Proposal | 反映する内容を確認 | Avoid teaching “proposal” unless useful |
| Verify Change | 実際に完了したことを確認 | Verification must refer to reality, not database state |
| Commit | 管理情報に反映 | Never use “Commit” as the primary operator button |
| Relation | Do not normally expose | Show human relationship, e.g. 利用PC |
| Operational Context | 現在のIT利用状況 / 現在の状況 | Section name may remain only for advanced/admin mode |
| Fact | 確認済みの情報 | FACT may appear as secondary semantic badge |
| VERIFIED | 確認済み | |
| UNKNOWN | 未確認 | Never phrase as “なし” unless absence is verified |
| Evidence | 確認根拠 | |
| Rule | 適用ルール / 判断ルール | Usually shown only in “なぜ？” explanation |
| Authority | 実行できる範囲 / 承認が必要 | Do not force EODA terminology into daily operator UX |
| Timeline | 対応履歴 / 変更履歴 | Choose by screen context |

Advanced users, administrators, auditors and developers may access exact internal semantics through expandable details, but internal terms must not be required for normal task completion.

---

# 4. Action Labels Must Describe Consequences

Buttons must answer:

> **押すと、現実または管理情報に何が起きるのか？**

Bad:

```text
Verify
Commit
Execute
Update
Continue
Next
```

Better:

```text
実際にPCを引き渡したことを確認
PC-0073を田中さんの利用PCとして反映
必要な準備を確認
このPCを準備対象にする
入社対応を完了
```

Generic “次へ” may be used only where the next step is already unambiguous and no consequential state change occurs.

---

# 5. Before-Action Explanation

For consequential actions, the operator should see four things before pressing the button:

```text
WHAT   何をする？
WHY    なぜ必要？
CHANGE 何が変わる？
TRUST  何を根拠にしている？
```

Example:

```text
次にやること
田中さんへPC-0073を引き渡す

なぜ？
入社日に会社PCが必要と確認されています。

この操作のあと
実際に引き渡したことを確認すると、PC-0073を田中さんの利用PCとして管理情報へ反映できます。

現在わかっていること
PC-0073: 在庫 / 利用可能 / 確認済み
田中さんの現在の利用PC: 未確認
```

The system must not visually suggest that a proposed or selected value is already a confirmed Fact.

---

# 6. Progressive Disclosure

Do not hide strict semantics; layer them.

## Level 1 — Operator language

Shows only the real-world task and consequence.

```text
PCを準備する
実際に引き渡したことを確認
利用PCとして反映
```

## Level 2 — Why / Evidence

Expandable explanation:

```text
なぜこの対応が必要？
確認根拠
現在わかっている情報
未確認の情報
```

## Level 3 — Domain / Audit details

For expert users:

```text
Requirement Evaluation
Change ID
Source Work
Contract Profile version
Verified At
Reliability
Rule version
```

Normal operators should not need Level 3 to work safely.

---

# 7. Progress Must Reflect User Intent, Not Internal State Machine

Bad progress indicator:

```text
Requirement Evaluation
→ Work
→ Change
→ Verify
→ Commit
```

Preferred JOIN progress:

```text
1. 必要な準備を確認
2. PCを用意
3. 引き渡しを確認
4. 管理情報に反映
5. 入社準備完了
```

The internal state machine remains available for audit and implementation.

---

# 8. Do Not Reward Blind Progression

FACTACT must avoid interactions where the easiest behavior is:

> “意味はよく分からないが、これを押さないと進まないので押す”

Guardrails:

1. consequential buttons use concrete verbs;
2. consequences are shown before the click;
3. UNKNOWN and VERIFIED states are visually distinct;
4. a user can see why the action is needed without opening documentation;
5. no required confirmation checkbox exists only as ritual friction;
6. confirmation text must describe the reality being attested;
7. after clicking, the UI must clearly show what changed and what did not;
8. automated recommendation and authoritative Fact must never look identical.

---

# 9. Inventory / Device Assignment UX

The first demo used deterministic seed Device `PC-0073`. This must not imply that FACTACT arbitrarily assigned a device.

Canonical V1 behavior:

```text
会社PCが必要
→ 利用可能なPCを表示
→ operator selects a candidate
→ operator performs preparation/assignment
→ operator verifies reality
→ system records the verified relationship
```

Future progressive behavior may be:

```text
A0 Observe
候補だけ表示

A1 Supervised
ルールに基づく推奨候補を表示

A2 Delegated
標準条件なら自動選定し、人が承認

A3 Rule Governed
承認済みルールで割当判断

A4 Automated
十分に成熟した条件のみ自動化
```

Automation is earned. Availability alone is not sufficient authority for automatic assignment.

Candidate presentation should explain why a device is suggested:

```text
おすすめ: PC-0073
理由:
- 在庫あり
- 利用可能
- 標準構成確認済み
- 対象者の必要条件を満たす
```

If required selection facts are UNKNOWN, FACTACT must expose that uncertainty instead of pretending to optimize.

---

# 10. AI Guided Operations Language

AI should guide work, not teach architecture first.

Avoid:

```text
Requirement Evaluation completed.
Create Work and proceed to Change verification.
```

Prefer:

```text
田中さんの入社には会社PCの準備が必要です。
利用可能なPCが3台あります。条件を確認して候補を選びますか？
```

Then:

```text
PC-0073は利用可能で、標準構成の確認済みです。
このPCを準備対象にできます。
```

And after execution:

```text
PC-0073を引き渡したことが確認できました。
田中さんの利用PCとして管理情報へ反映しますか？
```

AI must preserve the core rule:

> **AI Suggests. Human Decides. System Records.**

---

# 11. State Language

The epistemic model must remain visible without forcing technical vocabulary.

Recommended visual language:

```text
確認済み     VERIFIED
未確認       UNKNOWN
推定         HYPOTHESIS
参考情報     OBSERVATION
判断済み     DECISION
適用ルール   RULE
```

Primary text is Japanese/plain language. Internal semantic type may appear as a smaller badge/tool-tip for advanced use.

Important:

> **未確認 ≠ なし**

Example:

Bad:
```text
利用PC: なし
```

when no verified information exists.

Correct:
```text
利用PC: 未確認
```

---

# 12. Completion Feedback

After a consequential action, show:

```text
何を確認したか
何を反映したか
何がまだ未確認か
次に何をするか
```

Example after Commit:

```text
利用PCを反映しました

田中 一郎
利用PC: PC-0073
状態: 確認済み
確認日時: 2026-09-10 09:20

まだ未確認
- VPN利用要否

次にやること
入社準備の残り項目を確認
```

Do not merely show “Success” or a green toast.

---

# 13. UX Acceptance Tests

In addition to domain Golden Tests, every core operator flow should pass these human-comprehension checks.

## UX-GT-01
A first-time operator can explain what the primary button will do before clicking it.

## UX-GT-02
The operator can distinguish a selected/recommended value from a confirmed Fact.

## UX-GT-03
The operator can distinguish UNKNOWN from verified absence.

## UX-GT-04
The operator can explain why the current task exists without knowing the term Requirement Evaluation.

## UX-GT-05
The operator can explain what changes at Verify versus what changes at Commit without needing those words.

## UX-GT-06
The UI does not require understanding Event, Work, Change, Relation, Commit, or Operational Context to complete normal JOIN work.

## UX-GT-07
After completion, the operator can tell what was recorded as confirmed reality and what remains unknown.

## UX-GT-08
A recommended device is not presented as automatically or authoritatively assigned before the human/authority boundary allows it.

---

# 14. Design Review Question

For every operator-facing screen, ask:

> **もしこの用語を初めて見る人でも、説明書なしで「今何が起きていて、次に何をすればよく、その結果何が変わるか」を理解できるか？**

If not, translation is incomplete.

---

# 15. Product Principle

FACTACT should make correct work easier than ambiguous work.

The ideal experience is not:

```text
Learn FACTACT concepts
→ operate the system
```

It is:

```text
Understand the real-world situation
→ perform the right action
→ FACTACT preserves the correct semantics underneath
```

Therefore:

> **ユーザーにDomain Modelを理解させるのではなく、Domain Modelがユーザーを正しい仕事へ導く。**

This document is the canonical UX translation rule for JOIN and should be reused by SUPPORT, DEVICE, SaaS, SECURITY, IT_CHANGE and future Service Models.
