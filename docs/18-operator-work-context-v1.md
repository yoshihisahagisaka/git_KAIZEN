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
Unknowns and longer references are available on demand. The registered current PC
is resolved from the existing Relation; it is not proof of this Work's target PC.
Round 3 below requires a separate explicit target confirmation, not a copied assignment.
The same underlying Event/Evidence/Record supports both readable history and
separately expandable Audit. Raw technical provenance does not replace the story
of who received which service, what was checked/done, and what happened.

For standard guidance, structured action/result/source values are sufficient
without duplicate narrative. Only meaningfully missing information requires
supplementary text. See section 17 of `17-factact-ux-translation-layer.md` and the
Human Review amendment in `support-v2-checkpoint.md`.

## 13. Round 3: applicability, continuity and Progressive Verification

更新理由（2026-09-11）: 既存の確認済み情報を今回のWorkへ無条件に適用しないこと、
未解決Workを責任付きで継続することをHuman Reviewで確定した。
この節は次実装のProduct設計であり、現在のV2に実装済みという宣言ではない。
詳細な[21項目のFit/Gap](support-round3-core-fit-gap.md)を合わせて参照する。

**Known Fact is context, not proof that the same Fact applies to the current event.**
確認済みのFACTがあっても、それが今回の事象に当てはまるとは限らない。
登録Person USES Deviceと、確認したCurrent Work target Deviceは異なる関係である。
前者のPC番号をコピーせず候補表示し、後者は対象ID・確認者・時点・根拠・信頼性を持つ
既存Relation / Evidenceの考え方で接続する。対象確認は貸与変更を意味しない。
未確認の候補は対象Factではない。後日の登録変更でも過去の対象確認は書き換えない。

Target候補は「登録PC」「別の貸与PC」「持込みPC」「特定できない」。初期選択なし。
別PCならDevice検索と登録利用者の参照を提供する。不一致は表示し、原因を解釈しない。
BYODはサポート範囲判定とは別。識別できない場合はObservationに留め、架空のDeviceを
生成しない。Registry修正が必要なら既存Authority / Change / Verify / Commitを経る。
別の是正Workが必要なら既存Work間Relationの方向性を利用する。実装にWorkRelation
テーブルが既にあるとは限らないため、現在の制約はFit/Gapで区別する。

FACT ConfirmationはWorkと対象Entityを構造化して接続する。Situation Triageは
自由記述と任意の確認観点でHumanの理解を助ける。全項目必須・固定順序・固定回数なし。
標準選択は記録として再利用し、補足のためだけに同じ事実を再入力させない。
Pattern / Knowledgeは適用範囲・承認状態・出典を表示する。デモ手順はデモと明示する。

Workの継続ではAction ActorとWork Ownerを分ける。今回の対応終了だけでCloseしない。
未解決ならNext Action、Owner、Due / Follow-up、待ち先・理由やEscalation文脈を保持する。
Waitingは責任の消失ではなく、Ownerを保持する継続の状態である。正式引継ぎのみ
明示的なOwner変更を行い、前後の担当者・変更者・日時・理由を監査可能にする。

My Work / Team Work / フォローが必要 / Service Owner Viewは同じWorkのProjection。
フォロー理由は期限・再確認日・最後の有意味なAction・回答受領などから決定論的に導出する。
単なる下書き保存で「進展あり」と見なして長期停止を隠さない。
存在しないDueや回答受領を生成せず、欠落と期限超過を区別する。放置Statusは作らない。

Triage→Action→Resultの経験をHumanが明示選択して既存Knowledge Candidateへ送る。
元の記録への参照を保持し、承認前はKnowledgeとして適用しない。Human Reviewでは
適用条件・顧客固有性・機微情報を確認する。承認後も元Workを破壊しない。

### BUILDのProduct実装原則

**BUILDでFACTを完成させるのではない。運用によってFACTを確認・更新できる状態をBUILDする。**
Excel / MDM / SaaS等からの取り込みは、古い・未確認・不完全・矛盾した情報を含み得る。
取り込み元、観測時点、Reliability、Evidence source、Unknownを保持して開始できるようにする。
取り込んだだけでVERIFIEDとしない。完全台帳の強制でも、最低限のSecurity / Authority /
tenant・Service対象範囲の確認を省くことでもない。

Imported / Registry information → Current Work Observation → Difference →
Human Confirmation → Decision / Change → verified new FactというProgressive
Verificationを支える。Knowledge Stateの確認と現実の変更を混同せず、古いRelationは
有効期間を終了して保持する。この原則のためにBusiness Laneの仕様や外部連携を拡張しない。

Historyは業務の意味、Auditは明示的な監査閲覧、Technical Detailはその内部の技術情報。
同じデータを再利用し、入力中Workから離脱しない。新しいTriage / Follow-up / Stale /
Mismatch / Team / Session / Bridge / Workflow Definition Objectは導入しない。
