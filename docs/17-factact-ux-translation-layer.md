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
- **why this task is assigned to them;**
- **who owns the task and who requested/triggered it;**
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
→ Ownership / Assignment
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
田中さんの入社予定が登録される
→ 必要な準備を確認する
→ PC準備が必要と分かる
→ PC準備という「やること」が発生する
→ 担当チーム／担当者が決まる
→ 「あなたの担当」として届く
→ 利用可能なPCから候補を選ぶ
→ 実際に準備・引き渡す
→ 引き渡した事実を確認する
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
| Work Owner | この対応の担当 / 担当者 | Show clearly on operator task surfaces |
| Service Owner | このサービスの責任者 | Usually secondary/expandable |
| Assignee | 作業担当 | Distinguish from accountable Work Owner when necessary |
| Assignment | 担当を決める / あなたの担当になりました | Explain source where useful |
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

# 4. Ownership Context — Why am I doing this?

`Ownership Always` is not only a backend invariant. It is an operator UX requirement.

A task must not simply appear with an action button. The operator must be able to answer:

```text
WHY THIS WORK?      なぜこの対応が必要？
WHY ME?             なぜ私が担当？
WHO OWNS IT?        誰が責任を持っている？
WHAT NEXT?          次に何をすればいい？
```

Canonical JOIN story:

```text
入社予定
→ COMPANY_PC が対応必要
→ PC準備のWorkが発生
→ Ownership / Assignment
→ Operatorの「自分のやること」に届く
→ PC選定・準備へ進む
```

Assignment may be produced by different mechanisms without changing the operator experience:

1. **Leader assignment** — リーダーが担当者を指定する。
2. **Team rule** — 「PC準備は情シス端末チーム」のようなルールでOwner候補が決まる。
3. **Rotation / duty** — 当番・担当期間によって割り当てられる。
4. **Self-take** — 未担当キューから権限のあるOperatorが引き取る。
5. **Progressive automation** — 十分に統制されたルールにより自動割当される。

The first JOIN demo may use a deterministic seeded/current Operator for implementation convenience, but the UI must not make this look like unexplained assignment.

A Work screen should normally show, near the top:

```text
田中 一郎さんのPC準備

あなたの担当です
担当: 山田 太郎
依頼元: 田中さんの入社対応
担当になった理由: 情シス端末担当として割り当て
期限: 9月30日 17:00

なぜこの対応が必要？
入社日に会社PCが必要と確認されています。

次にやること
利用するPCを選ぶ
```

If the assignment source is not known, show **「担当になった理由: 未確認」** rather than inventing a leader or rule.

A leader/admin surface may expose assignment controls, but a normal operator flow should not require learning `Work Owner`, `Assignee`, EODA, or Authority terminology.

---

# 5. Action Labels Must Describe Consequences

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

# 6. Before-Action Explanation

For consequential actions, the operator should see five things before pressing the button:

```text
CONTEXT 誰の・何の対応？
WHAT    何をする？
WHY     なぜ必要？ / なぜ自分の担当？
CHANGE  何が変わる？
TRUST   何を根拠にしている？
```

Example:

```text
対応
田中 一郎さんの入社PC準備
あなたの担当です

次にやること
田中さんへPC-0073を引き渡す

なぜ？
入社日に会社PCが必要と確認されています。
あなたはこのPC準備の担当者です。

この操作のあと
実際に引き渡したことを確認すると、PC-0073を田中さんの利用PCとして管理情報へ反映できます。

現在わかっていること
PC-0073: 在庫 / 利用可能 / 確認済み
田中さんの現在の利用PC: 未確認
```

The system must not visually suggest that a proposed or selected value is already a confirmed Fact.

---

# 7. Progressive Disclosure

Do not hide strict semantics; layer them.

## Level 1 — Operator language

Shows only the real-world task, ownership and consequence.

```text
あなたの担当
PCを準備する
実際に引き渡したことを確認
利用PCとして反映
```

## Level 2 — Why / Evidence

Expandable explanation:

```text
なぜこの対応が必要？
なぜ自分が担当？
確認根拠
現在わかっている情報
未確認の情報
```

## Level 3 — Domain / Audit details

For expert users:

```text
Requirement Evaluation
Work Owner / Assignee
Assignment source
Change ID
Source Work
Contract Profile version
Verified At
Reliability
Rule version
```

Normal operators should not need Level 3 to work safely.

---

# 8. Progress Must Reflect User Intent, Not Internal State Machine

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
2. 担当を決める
3. PCを用意
4. 引き渡しを確認
5. 管理情報に反映
6. 入社準備完了
```

If assignment has already occurred before the operator opens the Work, the operator view may collapse step 2 into contextual text such as **「あなたの担当です」** rather than forcing an extra workflow step.

The internal state machine remains available for audit and implementation.

---

# 9. Do Not Reward Blind Progression

FACTACT must avoid interactions where the easiest behavior is:

> “意味はよく分からないが、これを押さないと進まないので押す”

Guardrails:

1. consequential buttons use concrete verbs;
2. consequences are shown before the click;
3. UNKNOWN and VERIFIED states are visually distinct;
4. a user can see why the action is needed without opening documentation;
5. a user can see why the task belongs to them;
6. no required confirmation checkbox exists only as ritual friction;
7. confirmation text must describe the reality being attested;
8. after clicking, the UI must clearly show what changed and what did not;
9. automated recommendation and authoritative Fact must never look identical;
10. progression must not depend on guessing unfamiliar terminology.

---

# 10. Inventory / Device Assignment UX

The first demo used deterministic seed Device `PC-0073`. This must not imply that FACTACT arbitrarily assigned a device.

Canonical V1 behavior:

```text
会社PCが必要
→ PC準備WorkのOwner/担当が決まる
→ 担当者に「利用PCを選ぶ」がNext Actionとして届く
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

# 11. AI Guided Operations Language

AI should guide work, not teach architecture first.

Avoid:

```text
Requirement Evaluation completed.
Create Work and proceed to Change verification.
```

Prefer:

```text
田中さんの入社には会社PCの準備が必要です。
このPC準備はあなたの担当です。
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

# 12. State Language

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

# 13. Completion Feedback

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

# 14. UX Acceptance Tests

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

## UX-GT-09
Before acting, the operator can explain why the task is assigned to them or see that the assignment reason is unknown.

## UX-GT-10
The operator can distinguish “this is my responsibility” from “I am merely performing one step” when Work Owner and Assignee differ.

---

# 15. Design Review Questions

For every operator-facing screen, ask:

> **もしこの用語を初めて見る人でも、説明書なしで「今何が起きていて、なぜ自分がこれを担当し、次に何をすればよく、その結果何が変わるか」を理解できるか？**

And:

> **この仕事が自分の画面に現れた理由を説明できるか？**

If not, translation is incomplete.

---

# 16. Product Principle

FACTACT should make correct work easier than ambiguous work.

The ideal experience is not:

```text
Learn FACTACT concepts
→ operate the system
```

It is:

```text
Understand the real-world situation
→ understand why this is my responsibility
→ perform the right action
→ FACTACT preserves the correct semantics underneath
```

Therefore:

> **ユーザーにDomain Modelを理解させるのではなく、Domain Modelがユーザーを正しい仕事へ導く。**

And:

> **Workがある → Ownerがいる → Ownerには「なぜ自分の仕事なのか」と「次に何をするか」が見える。**

This document is the canonical UX translation rule for JOIN and should be reused by SUPPORT, DEVICE, SaaS, SECURITY, IT_CHANGE and future Service Models.

## 17. SUPPORT Human Review: Work / Context / Audit

These principles are confirmed by SUPPORT Human Review and govern the V2
translation. They do not introduce a Core Object, Work type or Bridge concept.

- **Main Work first:** 確認 → 対応 → 結果確認 → 完了前レビュー is the bounded V2
  presentation, not a mandatory workflow for all SUPPORT. Round 3 below defines
  the future flexible execution pattern. Show the job, not the database.
- **Context stays within Work:** Person, current verified relations, prior Work,
  procedure and Knowledge references open in a modal or drawer. Keep the Work
  mounted and its input intact. Closing returns focus and the operator to the
  same Work without navigation or re-entry. Reuse existing tenant-scoped Views.
- **Business history and Audit are distinct Views:** normal history shows when,
  recipient, work, checks, actions and results in ordinary Japanese. Technical
  event names, UUIDs, contract snapshots and raw JSON are available only through
  explicit audit expansion. Keep the original records; never invent activities
  such as account creation when the stored data does not contain them.
- **Structured choices are records:** a selected standard Action, Result and
  Source constitute the operator's reviewed account. Do not demand the same
  statement again as prose. Additional text is optional unless Other, Unknown,
  contradiction, deviation or an exception leaves the meaning incomplete.
- **Evidence remains typed:** a caller-reported connection result stays a caller
  report. A selected successful result is not permanent-resolution proof and
  does not grant VPN eligibility or mutate a Registry Fact.
- **Procedure honesty:** bundled content must say デモ用参考手順 and must not
  imply operational approval. No generic Workflow Builder or Procedure Editor
  is needed for this translation.

Preserve draft/reload/back, stale-save rejection, append-only corrections and
original Evidence/Action, optional Knowledge, tenant isolation, Contract Authority,
Origin/CSRF and provenance. There is no AI or external search in this slice.

## 18. SUPPORT Human Review Round 3 — canonical principles

更新理由（2026-09-11）: Human Reviewで、登録済みFactの今回の対象への自動適用、
一次対応終了とWork Closeの混同、内部イベント中心の履歴が問題と確認された。
この節はProduct原則として確定する。実装済みという意味ではない。
以前の「確認済みPCを聞き直さない」「固定の4ステップ」は、以下の意味に限定する。
Phase 1はドキュメント更新のみ。[適合性分析とPhase 2案](support-round3-core-fit-gap.md)を参照。

### A–F: 現実との接続と柔軟な切り分け

**A. Known Fact != Current Context Fact.**
Known Fact is context, not proof that the same Fact applies to the current event.
確認済みのFACTがあっても、それが今回の事象に当てはまるとは限らない。
田中さんの登録利用PCがPC-0073でも、今回の問い合わせ対象は未確認である。
登録Factを候補・根拠として提示し、今回の対象には初期選択しない。
「既存Factを再入力させない」と「今回その対象かを確認する」は両立する。

**B. FACTACTは現時点で分かっているFACTを扱う。**
登録情報、今回の確認、本人の申告、Unknownの時点・適用範囲・信頼性を分ける。
本人が述べただけの内容を自動的にVERIFIEDへ昇格させない。

**C. FACTACTは不一致を解釈しない。**
登録PC=PC-0073、今回確認した対象=PC-0128、登録利用者=佐藤さんであれば、
その根拠と「登録されているPCと一致しません」を示す。台帳ミス、取り違え、
不正利用、正式貸与変更などの原因は推測しない。Humanが確認した内容を
Observation / Evidence / Decisionとして残す。Registry是正には既存の
Authority → Decision / Change → Verify → Commitを使い、過去Relationを保持する。

**D. FACT ConfirmationとSituation Triageを分ける。**
FACT Confirmation connects the Work to reality.
Situation Triage supports human understanding of the problem.
前者は今回の対象Person / Device / Account / Applicationを確認すること。
後者は発生時期・表示・通信可否・環境・直前変更などから状況を理解すること。

**E. FACT Confirmationは構造化。Situation Triageは柔軟。**
対象Entityへの接続をTriage自由記述に埋め込まない。登録PC、別の貸与PC、
持込みPC、特定できないPCを区別する。別PCは管理番号からDeviceを検索する。
特定不能ならOS・メーカー・機種・外観・場所等をObservationとして残し、
既存Deviceへ推測で紐付けない。持込みPCであることとサポート可否は別判断であり、
Contract / Rule / Humanの根拠なしに対象外にしない。

**F. 問い合わせ対応を固定Workflowにしない。**
Target Identification / Fact Confirmation / Situation Triage / Action / Verifyは
支援Patternであり、順番・回数・全項目必須を定義するWorkflowではない。
Triageは自由記述を中心に、必要な観点だけを参照する。確認・Action・結果を
繰り返せることを前提とし、巨大フォームや全分岐Wizardを作らない。
標準の構造化Action / Result / Sourceを自由記述で重複入力させない原則も維持する。

### G–L: 完了までの責任と運用による確認

**G. 今回の対応終了 != Work Close.** 電話・チャットの終了、未解決、追加調査、
利用者・ベンダー・他部署待ち、後日作業は、それだけではWork完了ではない。
同じ未完了WorkにNext Action / Owner / Due・Follow-up / 待ち・Escalationの文脈を残す。
Workは一つ。完了まで追う。独立した是正作業が必要な場合の関連Workは別であり、
新しいMismatch種別やBridge Workを導入しない。

**H. Waiting != No Owner.** 回答待ちでもOwnerと次回確認責任を消さず、一覧に残す。
例: 利用者待ち / 回答がなければ再連絡 / Owner A / Follow-up 2026-09-13。

**I. 放置はStatusではなくFACTから検出する。** Open + Next Action欠落、Owner欠落、
期限超過、Waiting再確認日超過、長期間Actionなし、回答受領後未再開等を、
Fact / Rule / Timeから説明可能な「フォローが必要」Viewとして導出する。
データが存在しない回答受領や期限を推測で補わない。

**J. Ownerは明確にするが、仕事をOwnerに閉じ込めない。**
権限のあるBがOwner AのWorkにActionを実行してもOwnerはAのまま。
正式引継ぎA→Bは別の明示的操作として履歴を残す。My Work / Team Work /
フォローが必要 / Service Ownerの停滞・負荷Viewは同じWorkから作り、
チーム表示がtenant・Service・Authority境界を拡大しないこと。

**K. Workの経験はHuman Reviewを経てKnowledge化する。**
Triage記録はまず今回のWork Record。有用だとHumanが選んだ内容だけを、
元Work・Evidence・Action・Resultの出典を保つ既存Knowledge Candidateにする。
Candidate != Approved Knowledge。再利用価値、適用条件、顧客固有性、機微情報を
Humanが確認する。AIは候補化・承認・Rule昇格を勝手に実行しない。

**L. BUILD時に完全な台帳を要求しない。**
運用によるProgressive Verificationを可能にするProduct原則としてdocs/18に定義する。
Security / Authority等、開始前に必須の条件までUnknownでよいという意味ではない。

### History / Audit / Technical Detail

通常Historyは意味のある業務変化を表示する（入社予定登録、PC準備中、PC準備完了、
PC引渡し済み等）。「記録を作成」「担当を決定」「反映内容を作成」等の内部通知を
大量表示しない。実際の引継ぎなど業務上必要な変化は、人間に分かる言葉で表示する。
監査は明示的展開、その中のTechnical DetailでUUID・Event code・raw payload・
Contract Profile ID/versionを表示する。元データは削除せずViewだけを分ける。
Work中の参照は画面内で開き、未保存入力と戻り先を保持する。
文字化けしたKnowledge demo dataは次の実装Phaseで出典から検証・修正する対象とする。

FACT FIRST、Human Decides / System Records、One Fact, Multiple Views、
Event → Requirement Evaluation → Work、Action → Change → Verify → Commit、
Ownership、RLS、Origin/CSRF、訂正履歴を維持する。AI・外部検索・Workflow Builderは追加しない。
