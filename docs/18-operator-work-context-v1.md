# FACTACT Operator Work Context V1

**Status:** CANONICAL UX / APPLICATION SPEC  
**Scope:** Human-usable JOIN V1 and reusable operator pattern for future Service Models  
**Depends on:** `17-factact-ux-translation-layer.md`

---

# 1. Purpose

FACTACT must not merely tell an operator **what task exists**. It must give enough context for the operator to perform the task correctly without hunting through separate spreadsheets, chat messages, folders or tribal knowledge.

For normal operator work, the screen should answer:

```text
1. 誰の・何の対応か
2. なぜこの対応が必要か
3. なぜ自分の担当か
4. 次に何をすればよいか
5. どうやればよいか
6. この人／対象だけの違いは何か
7. 何が確認済みで、何が未確認か
8. 実行すると何が変わるか
9. 完了後、何がFactとして残るか
```

This is the **Operator Work Context**.

> **仕事だけを渡さない。正しく仕事をするための文脈まで渡す。**

---

# 2. Human-usable JOIN story

Canonical story:

```text
田中 一郎さんの入社予定が登録される
→ 必要な準備を確認する
→ 会社PCが必要と判断される
→ PC準備Workが生成される
→ 担当チーム／担当者が決まる
→ Operatorの「自分のやること」に届く
→ Workを開く
→ 必要設定・対象者条件・標準手順・未確認事項を見る
→ 利用可能なPC候補を見る
→ 候補を選ぶ
→ 実際の設定・キッティングを行う
→ 引き渡しを確認する
→ 利用PCとして管理情報に反映する
→ 完了
```

The operator should not need to understand the internal sequence:

```text
Requirement Evaluation → Work → Action → Change → Verify → Commit → Relation
```

Those semantics remain strict underneath.

---

# 3. Work screen information architecture

A human-usable Work screen should use the following structure.

## A. Header — What is this?

```text
田中 一郎さんのPC準備
あなたの担当です
期限: 2026/09/30 17:00
```

Secondary details:

```text
依頼元: 田中さんの入社対応
担当になった理由: 情シス端末担当として割り当て
```

If source is unknown, show `未確認`. Never invent it.

## B. Next Action — What should I do now?

Primary anchor:

```text
次にやること
利用するPCを選ぶ
```

The primary action should be concrete and consequence-based.

## C. Required Configuration — What must this target have?

Example:

```text
必要な設定
- Windows標準設定
- Microsoft 365
- ESET
- LanScope
- VPN: 要否未確認
```

This is not a free-form checklist only. Each requirement should, where possible, trace to its source:

- Contract Profile / Service rule
- person/organization operational fact
- approved procedure
- explicit decision

## D. Recipient / Target Context — What is different this time?

Example:

```text
対象者の状況
所属: 営業部            確認済み
勤務形態: 本社＋リモート  確認済み
現在の利用PC: 未確認
VPN利用要否: 未確認
```

Unknown must remain visible as `未確認`; it must not be silently treated as negative or default.

## E. Procedure — How do I do it?

Primary procedure card:

```text
標準PCキッティング手順 v3.2
対象: Windows 11 標準端末
最終確認: 2026/09/01
[手順を見る]
```

Procedure may be displayed inline, in a side panel, drawer, or dedicated page. A normal operator should reach it in one action from the Work screen.

The procedure should support ordered steps, notes, required evidence, warnings, and completion criteria.

## F. Knowledge — What should I know?

Contextual knowledge is supplemental to procedure.

Examples:

```text
関連ナレッジ
- 営業部PCでよくある初回サインインエラー
- ESET登録失敗時の確認事項
- リモート勤務者のVPN設定
```

Knowledge should be ranked by current Work / target context rather than presented as a generic document repository.

## G. Exceptions / Differences — What is special here?

Example:

```text
今回の追加対応
営業部のためSalesforce設定が必要

まだ未確認
VPN利用要否
[確認する]
```

FACTACT should make the difference from the standard procedure obvious.

> **標準を見せ、差分を目立たせる。**

## H. Candidate / Resource selection — What can I use?

For device assignment:

```text
利用可能なPC

PC-0073   おすすめ
在庫あり / 利用可能 / 標準構成確認済み
おすすめ理由: 今回の必要条件を満たしています
[このPCを準備対象にする]

PC-0081
在庫あり / 利用可能 / 初期設定未確認
[詳細を見る]
```

A recommendation is not a Fact and not an assignment until the proper authority/action boundary is crossed.

## I. Current trust state — What do we actually know?

At all times, the operator should be able to distinguish:

```text
確認済み
未確認
推定
参考情報
判断済み
適用ルール
```

Do not overload the primary UI with internal English terms. Advanced details may show FACT / UNKNOWN / HYPOTHESIS / OBSERVATION / DECISION / RULE.

## J. Consequence preview — What happens if I click?

Before consequential actions, show the result in plain language.

Example:

```text
この操作のあと
PC-0073を準備対象として選択します。
まだ田中さんの利用PCとしては登録されません。
```

Later:

```text
この操作のあと
実際にPC-0073を田中さんへ引き渡したことを確認します。
管理情報への正式反映は次の操作で行います。
```

And Commit-equivalent:

```text
この操作のあと
PC-0073を田中さんの現在の利用PCとして正式に記録します。
```

---

# 4. Procedure is not Knowledge

FACTACT should distinguish these concepts.

## Procedure

> **この仕事を、どう実行するか。**

Examples:
- PCキッティング手順
- Microsoft 365アカウント発行手順
- 退職者アカウント停止手順

Properties may include:
- version
- effective date
- owner
- applicable conditions
- ordered steps
- required evidence
- completion criteria
- warnings
- last verified at

## Knowledge

> **判断やトラブル解決に役立つ知識。**

Examples:
- よくあるエラー
- ベンダー固有の注意事項
- 過去の解決方法
- FAQ

Procedure is normative. Knowledge is supportive.

Both may evolve from Work evidence, but neither becomes authoritative silently through AI.

---

# 5. Required Configuration is contextual

A list such as:

```text
Microsoft 365
ESET
LanScope
VPN
Salesforce
```

must not become a static JOIN-only form.

The effective required configuration should eventually derive from reusable context such as:

```text
Contract Profile
+ Service Model
+ Recipient / Person Facts
+ Organization / Role Facts
+ Device / Security standards
+ approved Rules
+ explicit Decisions / Exceptions
```

For Human-usable JOIN V1, the implementation may use bounded seeded/demo configuration, but the UX and interfaces should not imply that this is the permanent domain model.

---

# 6. Missing information should generate useful work, not fake defaults

If VPN need is unknown:

Bad:

```text
VPN: 不要
```

when no evidence exists.

Correct:

```text
VPN: 未確認
[利用要否を確認する]
```

Where appropriate, FACTACT may create or propose a Next Action such as:

```text
人事担当に勤務形態を確認する
本人にVPN利用要否を確認する
```

Unknowns should become visible decisions or investigation tasks when they block correct execution.

---

# 7. Work execution should update operational information through evidence

FACTACT must avoid duplicate administration.

Bad operating model:

```text
PCを設定する
→ 引き渡す
→ Workを完了する
→ 別の資産台帳を開く
→ 同じ内容を再入力する
```

Canonical FACTACT model:

```text
Work
→ Action
→ evidence / observed result
→ Change
→ Verify
→ Commit
→ Person–Device Relation / Registry updated
```

> **一度行った仕事を、もう一度「記録する仕事」にしない。**

The UI may simplify this language, but must preserve the semantics.

---

# 8. Human-usable JOIN V1 implementation boundary

The next UI iteration should focus on making the existing JOIN slice understandable and executable. It should not redesign the Core domain model.

Required for the next iteration:

1. Ownership context visible on Work.
2. User-facing terminology from doc 17.
3. Next Action prominent.
4. Required Configuration section.
5. Recipient/Person context with explicit unknowns.
6. Procedure card/link or inline procedure.
7. Contextual Knowledge section.
8. Candidate device list with reason for recommendation/eligibility.
9. Consequence preview before selection, verification and final reflection.
10. Clear post-action feedback: what changed / what did not / what remains unknown.

For V1, Procedure and Knowledge content may be deterministic seeded demo content if necessary. If so, label/provenance must make it clear that the content is demo/seeded rather than learned from production evidence.

Do not add a generic CMS, workflow builder, EAV schema, or large knowledge subsystem merely to satisfy this iteration.

---

# 9. Human acceptance scenario

A first-time operator should be able to describe the flow in ordinary Japanese roughly as follows:

> 「田中さんの入社PC準備が自分に割り当てられている。入社日に会社PCが必要で、必要な設定と標準手順がここで確認できる。候補のPC-0073は在庫があって標準構成確認済みなので選べる。ただし選んだだけでは田中さんの利用PCにはならない。実際に設定・引き渡しをして確認したあと、管理情報に反映すると正式な利用PCとして記録される。」

If the operator cannot explain this without internal terminology, the Human-usable JOIN iteration is not complete.

---

# 10. Additional UX Golden Tests

## UX-GT-11
The operator can find the applicable procedure from the Work screen in one action.

## UX-GT-12
The operator can identify the required configuration for the current target without opening unrelated systems.

## UX-GT-13
The operator can distinguish standard procedure from target-specific exceptions.

## UX-GT-14
The operator can identify blocking UNKNOWN information and the next action needed to resolve it.

## UX-GT-15
The operator can explain why a device is eligible/recommended before selecting it.

## UX-GT-16
Selecting a candidate device does not visually imply that the real-world assignment has already occurred.

## UX-GT-17
After execution, the operator does not need to re-enter the same confirmed information into a separate registry flow.

---

# 11. Reusable principle for future Service Models

This pattern must generalize beyond JOIN.

SUPPORT:

```text
問い合わせ内容
+ 顧客/利用者Context
+ 過去の関連対応
+ 標準切り分け手順
+ Knowledge
+ Authority
+ Next Action
```

SECURITY:

```text
検知内容
+ 対象Asset/User Context
+ Response Procedure
+ Known exceptions
+ Authority
+ Evidence
+ Next Action
```

SaaS / DEVICE / IT CHANGE should follow the same principle.

Therefore:

> **Operational Context tells FACTACT what is true. Procedure tells the operator how to act. Knowledge helps the operator decide. Work ties them together for this specific situation.**

And the operator experience should remain:

> **何をするかだけでなく、なぜ・どうやって・何を根拠に・何が変わるかまで、一つの仕事の中で分かる。**

## 12. Confirmed SUPPORT Human Review translation

Operational Context is a supporting View, not a reason to leave the active Work.
The SUPPORT screen keeps its Main Work mounted while native modal dialogs display
the existing Person Context, JOIN evidence source, previous SUPPORT history and
Knowledge. Modal close/Escape restores focus and preserves unsaved Work inputs.

The right-hand reference area summarizes caller Observation and verified PC Fact.
Unknowns and longer references are available on demand. The current PC is always
resolved from the existing Relation; no copied SUPPORT device field is introduced.
The same underlying Event/Evidence/Record supports both readable history and
separately expandable Audit. Raw technical provenance does not replace the story
of who received which service, what was checked/done, and what happened.

For standard guidance, structured action/result/source values are sufficient
without duplicate narrative. Only meaningfully missing information requires
supplementary text. See section 17 of `17-factact-ux-translation-layer.md` and the
Human Review amendment in `support-v2-checkpoint.md`.
