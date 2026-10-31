# SUPPORT Human Review Round 3 — Phase 1 Core Fit / Gap

Status: Phase 1 documentation complete; Phase 2 requires Product Owner approval.
Date: 2026-09-11. Baseline inspected: `71b519d5d2356c4c6f7bac846fe522a0f48e2735`,
branch `review/factact-join-slice`.

更新理由: Human Reviewで確定した対象確認、柔軟な切り分け、未解決Workの継続、
チームでの責任維持を、現在の実装と混同せずに正本へ反映するため。
この文書のAPI・データ・migrationは提案のみ。コード、schema、UI、APIは変更しない。

## 1. 判断と根拠

**新しいCore Objectは不要と判断する。ただし現行実装のままでは全要件を満たせない。**
Work / Action / Evidence / Observation / Decision / Rule / Authority / Relation /
Knowledge / Ownership / Viewで意味を表現できる。Target関連付け、繰り返し実施、
継続状態、Knowledge承認のデータ制約・Application contractは拡張と設計レビューが必要。
これは新しいTriageやMismatch概念の発明ではない。未決の関係ライフサイクルを
「Core gapなしだから実装済み」と読み替えない。

検査した正本・実装（パスはこのrepo内）:

- S1: [Core domain](02-domain-model.md): Workのdue / waiting reason、ActionとChangeの区別、Relationの有効期間・出典、情報の信頼性、Ownership。
- S2: [Core PRD](01-core-prd.md)のContract Context / Escalation、[機能要件](05_NEMESIA_V1_機能要件.md) FR-12/13、[UX architecture](13-factact-product-ux-architecture.md)のMy / Team / Follow-up。候補設計であって実装の証明ではない。
- S3: [JOIN migration](../supabase/migrations/20260909000200_join_slice.sql): `work`、`actions`、`relations`の現実の制約。
- S4: [SUPPORT migration](../supabase/migrations/20260910000300_support_slice.sql): Decision / KnowledgeのWork単位unique、Candidate限定。
- S5: [V2 records migration](../supabase/migrations/20260911000400_support_operator_records.sql): DRAFT / COMPLETION / CORRECTION、revision、request ID、追記専用RLS。
- S6: [SUPPORT commands](../packages/application/src/support-commands.ts)、[ports](../packages/application/src/support-ports.ts)、[repository](../apps/web/src/server/persistence/support-repository.ts)、[types](../packages/domain/src/support.ts): 1つの実施記録と完了、既存原本を残す訂正。
- S7: [SUPPORT queries](../packages/application/src/support-queries.ts)、[JOIN queries](../packages/application/src/join-queries.ts)、[JOIN repository](../apps/web/src/server/persistence/join-repository.ts): Personの登録PC、Person+Serviceの完了済みSUPPORT履歴、JOIN限定Person Work。
- S8: [JOIN commands](../packages/application/src/join-commands.ts)、[Operator](../packages/domain/src/operator.ts)、[platform migration](../supabase/migrations/20260909000100_platform_baseline.sql): JOINの明示的引継ぎ、Actor分離、roles、Deviceの必須管理番号。Team membership実装はない。
- S9: [SUPPORT wizard](../apps/web/src/client/support-wizard.tsx)、[context views](../apps/web/src/client/support-context.tsx): 固定4段階、登録PC表示、業務履歴と監査の既存分離。

### 確認できた実装上の境界

- `relations`は`USES_PRIMARY_DEVICE`、PERSON→DEVICEのみ。Person/Device FK、
  VERIFIED、source Change必須、主利用者のuniqueがある。Work targetをここへ
  無理に挿入したり、架空Changeを作って通してはいけない。
- `work`はOPEN / IN_PROGRESS / COMPLETED、OwnerとNext Action OwnerがNOT NULL。
  due、follow-up、waiting先/理由、外部回答受領、Team membershipは保存していない。
- Actionsは複数行を持てるが、SUPPORT Decisionが`unique(tenant_id,work_id)`。
  QueriesもDecision/Action単数。V2 completionは接続結果にかかわらずWorkを完了させる。
  追記のCORRECTIONは誤記訂正であり、新たな実行サイクルの代用にしてはいけない。
- KnowledgeはCANDIDATE・VPN_GUIDANCE限定、Workごと1件。Decision/EvidenceへのFKはあるが
  Review / Approved Knowledgeの実装はない。自由記述だけの早期候補化も現在の前提と異なる。
- WorkRelationは方向性としてADR 0007に記載されるが、テーブル/APIやRELATED_TO /
  TRIGGERED_BY型は実装されていない。新Objectを作らず既存Relationの考え方を実体化する
  余地はあるが、関係型や方向を「既存コード」として再利用できるわけではない。
- SUPPORT commandはOwner本人限定ではなく、active Operator / Contract executeRolesを検査する。
  他Actorの実施は意味上適合する。JOINの引継ぎcommandはJOIN限定なのでSUPPORTへそのまま呼べない。

## 2. Core Fit / Gap — 21項目

「Core gap」は新しい意味的Objectが必要かを示す。「なし」はschema変更不要を意味しない。
「要決定」は既存概念内での型・権限・ライフサイクルの決定が必要という意味である。

| # / 対象 | Existing concept reused | Additional View / Query needed | Application-level state / record needed | Core gap / 実装不足 |
|---|---|---|---|---|
| 1 Current Work target Device | Work / Device / Relation / Evidence | 登録PC候補と今回対象を別表示、Device検索 | 確認済み関連付け、対象ID、確認者・時点・根拠・信頼性、訂正履歴 | 新Object不要・関係型/確認境界は要決定。S3はPerson専用で保存不可 |
| 2 Registry vs Context mismatch | 既存Relationと対象確認、Observation / Decision | 対象ID比較、対象Deviceの登録利用者、時点付き差分 | Human確認結果、必要なら既存Changeまたは関連Workへ | なし。差分の原因推測禁止。逆引きQuery/対象記録が未実装 |
| 3 BYOD target | Deviceまたは未識別Observation、Rule / Evaluation | 持込み申告と対応範囲を別表示 | 対象特定の根拠、Rule適用snapshot、Human判断 | 新Object不要・識別/登録方針とBYOD Ruleは要決定。assetTag必須のS8へ偽番号を入れない |
| 4 unidentified Device | Observation / Unknown / Work Record | 未特定・分かる属性・確認元を表示 | OS/メーカー等の申告、再確認追記。Device FKは捏造しない | なし。S4の1受付1Observationでは継続確認の表現が不足 |
| 5 Situation Triage | 既存Work Record / Evidence / Observation | 任意観点と自由記述、対象確認と分離 | 対応中に繰り返す記録、出典・時刻・Actor | なし。S5のchecksを再利用可能だが単発完了UIを変更する |
| 6 Knowledge provenance | Candidate / Evidence / Decision / Review / Knowledge | 元記録選択、候補レビュー、承認状態 | 元Work/記録/Action/Result参照、審査者・条件・機微情報確認 | 新種類不要。S4の1件/Work・Decision必須・Candidate限定が実装gap |
| 7 repeated Confirm/Action/Result | 既存Action / Evidence / Decision / Record | 同じWorkに時系列で複数実施 | 再実行を訂正と区別、個々の実施への冪等キーと参照 | なし。S4/S6の単一Decision制約・単数APIを変更する必要 |
| 8 unresolved continuation | Work / Outcome / Ownership | 「今回の対応を記録」と「Work完了」を分ける | 未完了のまま保存/再開、完了条件、待機文脈 | なし。現在のCOMPLETIONによる無条件Closeとの明確なgap |
| 9 Next Action | Work.nextAction / nextActionOwner | 継続時の次の具体的行動 | 明示更新、空文字防止、継続状態との原子的保存 | なし。列はあるがSUPPORTは固定文字列更新中心 |
| 10 Owner | Work Owner / Operator / Authority | 常時表示、待機でも表示 | Active Owner検証、履歴付き変更 | なし。既存NOT NULL保持。削除/無効化時の運用は要決定 |
| 11 Follow-up / Due | Workの既存candidate due属性 | 再確認日と期限を区別 | 日時/タイムゾーン、変更者、変更履歴 | 新Object不要。実装列なし。期限と再確認日時の意味・必須条件を要決定 |
| 12 Waiting | Work state / waiting reason / Ownership | 待ち先・理由・Next Action・再確認日 | Waiting/Resume、Owner維持、遷移記録 | なし。S1/S2に概念あり、S3状態制約とデータが不足 |
| 13 Escalation | 既存Escalation文脈 / Work / Decision / Authority | 依頼先・依頼内容・回答/追跡状態 | 依頼/回答の人手記録、担当責任と次確認 | 新Object不要・詳細contract未決。通知連携や外部回答自動取得は未実装 |
| 14 My Work | Work / Operator / View | 未完了・Waiting含む本人Work | 追加Objectなし。継続データを参照 | なし。既存SupportTasksを拡張する候補 |
| 15 Team Work | Work / Authority / View | 許可範囲内の他OwnerのWork | team/serviceの参照可能範囲を既存Authorityで明示 | 新Object不要・Team境界要決定。tenant全体=Teamと仮定しない |
| 16 フォローが必要 | Work / Rule / Time / Projection | 理由付きの決定論的抽出 | 時刻基準・しきい値・欠落情報の扱い | なし。先に継続日時/回答等の入力根拠が必要 |
| 17 stale / overdue | Action時刻 / Work Due / Waiting / Observation | 経過と期限超過を別理由で表示 | 最後の有意味なAction、受領/再開時刻等 | なし。updatedAtだけでは不十分。全検出条件を今すぐ計算できない |
| 18 Actor != Owner | Action.actorOperatorId / Work Owner | 今回実施者と継続責任者を別表示 | 許可Actorによる実施、Owner自動変更なし | なし。基本分離はS6/S8に存在、継続cycleにも適用する |
| 19 formal transfer | Ownership / Audit / Authority | 明示引継ぎ・履歴 | 旧/新Owner、変更者・理由・時刻、stale拒否 | なし。JOINのpatternをADAPT、SUPPORT command不足 |
| 20 Operator History | 同じEvent / Action / RecordのProjection | 業務変化へ集約、内部作成通知は通常非表示 | 新データ不要。事実があるもののみ表示 | なし。S9は受付評価/下書き等をまだ前面表示する |
| 21 Audit / Technical Detail | Audit / provenance / View | 業務→Audit→Technicalの段階開示 | 元payloadと出典は保持。閲覧権限維持 | なし。現UIはAudit内にraw JSONを直接展開するため追加階層が必要 |

追加しないObject: Triage、Follow-up、Stale Work、Mismatch、Team Work、Knowledge Type、
Support Session、Bridge Work、Workflow Definition。Entity / Relationの既存概念を
具体的に保存するためのテーブル追加と、新しいCore Objectの導入は区別する。
それでも既存概念で説明できない要件が出た場合は、Phase 2でも実装せず停止・報告する。

## 3. UI / Data / API変更候補とmigration

以下のcommand名は責務の仮称でありAPI仕様確定ではない。全て既存の認証、exact Origin /
CSRF、tenant RLS、active Contract / Authorityを通す。UIの便宜で制約を緩めない。

| 実装候補 | UI | Data / API候補 | Migration |
|---|---|---|---|
| 対象確認 | 初期選択なしの4候補、Device検索、登録利用者、差分表示 | 確認関連付け/訂正command、Device逆引き、出典snapshot。Work→DeviceとPerson→Deviceを分離 | 必要見込み。関係の保存設計を先にレビュー |
| Triage / 複数実施 | 任意観点と自由記述、繰り返すAction/結果、Contextモーダル維持 | 既存Record/Evidence/Actionの追記、複数Decision参照、独立した実施キー | 必要。単一Decision制約・Record種別/参照を見直す |
| 継続 / Close | 今回記録、待機、再開、引継ぎ、明示Close | Work状態、Next Action/Owner、Due/Follow-up、待ち先、依頼/回答記録 | 必要。継続の属性・状態制約、監査と整合性 |
| My / Team / Follow-up | 権限内の一覧、再確認理由、代行と引継ぎの区別 | scope付きQueries、決定論的Projection、所有変更command | Viewだけなら不要。継続データは上記に依存 |
| Knowledge候補/承認 | 元記録から候補化、条件・機微情報の審査 | 出典参照、Review/承認command、履歴付き承認状態 | 必要見込み。Candidate-only制約と出典FKの扱いを決定 |
| History / Audit / demo文字化け | 業務履歴、監査、技術詳細の3層 | 同じ記録を射影。文字化けは発生層を検証して修正 | View/配信の問題なら不要。保存済み破損なら履歴を残す修正計画が必要 |

Phase 1のmigrationは**なし**。Phase 2全体は**migrationが必要**。JOINの主利用Relationの
unique、Change検証、歴史保持を維持し、制約の単純削除で汎用化しない。
既存V1/V2 completionを未解決と推測して再開したり、登録PCを過去のWork targetへ
自動backfillしたりしない。旧記録は当時の意味で保存し、target未確認を明示する。

## 4. Phase 2実装単位案（承認後のみ）

1. **契約決定と対象確認**: 下記未決事項のうち対象の確認境界、BYOD、権限を決定し、
   additive data設計をレビュー。登録PCと今回対象を分離、検索・照合・Unknown記録。
   Scenario A/B/Cを先に検証。正式な貸与変更はこの操作から自動実行しない。
2. **同じWorkでの継続実施**: 単発completionから、追記Action/結果と明示Closeを分離。
   任意Triage、追加調査、Waiting/Resume、Next Action/Owner/再確認日時、引継ぎ。
   V1原本・訂正・retry/stale・監査原子性を移行設計で保持。Scenario Dを検証。
3. **責任とフォローのViews**: 決定したService/Team scope内でMy/Team/フォロー。
   代行ActorはOwnerを変更しない。ルールと時刻から理由を表示。Scenario Eを検証。
4. **候補からHuman Reviewへ**: Triage/Action/Resultから既存Candidateへ明示選択し、
   適用条件と機微情報を審査してKnowledgeへ。汎用CMS・新Knowledge種類を作らない。
   Scenario Fは承認までの能力が未実装なので、この単位を省略して達成済みにしない。
5. **横断UX仕上げとcheckpoint**: History/Audit/Technical、文字化けの出典検証、
   モーダル入力保持を各単位に適用して全回帰検証。A–FのHuman Review後に停止。

Mismatchから別Workが必要な場合は、既存のRequirement Evaluation→Workの責務で
生成し、WorkRelationを表す既存Relation方向の実装範囲を別途レビューする。
元SUPPORT Workは完了まで残る。新しいMismatch種別やBridge、1 Event=永久に1 Work
というCore制約は作らない。汎用Work Graph UIや外部連携は実装計画に含めない。

## 5. Proposed tests / Human acceptance

| Scenario | Application / DB | Browser / Human Review |
|---|---|---|
| A 登録PCと対象一致 | 明示確認までtargetなし、確認者/出典記録。登録Relationを再利用 | PC-0073は候補のみ、初期選択なし。選択確認で進めるが番号再入力不要 |
| B 別PC・別利用者 | Work target PC-0128、佐藤の登録Relationは不変。複数tenant検索拒否 | 登録PC/今回PC/登録利用者と差分のみ表示。原因推測なし。Context内で確認 |
| C BYOD | 持込みObservationと資格評価を別記録、Rule snapshot。Rule不在は対象外にしない | 根拠のある適用Rule確認後のみNO ACTION REQUIRED。特定不能も偽Deviceなし |
| D 未解決継続 | 複数Action/Decision、Waiting/Resume、明示Close guard、同一Work ID維持 | 電話終了後もOpen、Next Action/Owner/Follow-upが見えHomeに残る |
| E 期限超過と代行 | 固定clock境界、Team scope、BのActionでもOwner A。正式引継ぎは別audit | Team/フォローに理由表示。Bが対応してもOwnerは自動変更しない |
| F Knowledge化 | 候補化は明示操作、元記録FK、Human review権限、承認の冪等性 | CandidateとApprovedを区別し、適用条件/機微情報の審査を確認 |

横断: 同時編集、同時Close/追記/引継ぎ、stale target、古い登録情報との時点差、
一時貸与と正式貸与の混同防止、Unknown/BYODのfalse化防止、audit失敗時rollback、
RLSとcross-tenant FK、Origin/CSRF、失効Contract/Operator、権限外Team参照、
Knowledge出典の訂正後も原本追跡、履歴/監査の表示境界、modal close/Escape/draft復元、
UTF-8のDB→API→UI表示を追加候補とする。

全bootstrap、JOIN GT-01–12、既存SUPPORT/V2 testsを基準に維持する。
旧「未解決でもcompletionでClose」や「登録PCが今回対象」という前提があるテストは、
新しい正本の期待値へ明示更新する。安全性のassertionを消して通してはいけない。
Phase 1ではコード不変のためアプリテストは再実行せず、docs差分・参照先を検証する。

## 6. Risks / Product Owner decisions needed

1. **Target confirmationの強度**: callerによる確認と直接照合をどう区別し、どの証拠で
   Work targetをconfirmedにするか。暫定targetを許すか。知識状態の確認に必要な
   Decision / Verify境界とRelation保存形はレビュー対象。貸与変更用Changeを偽造しない。
2. **BYOD identityとRule**: 既知BYODをDevice化する条件、管理番号なしの識別方針、
   サポート許可/不許可のContract Ruleと例外Authority。未識別とBYODを同一視しない。
3. **継続/Closeと日時**: Waiting/Resolved/Closedの必要最小状態、Closeできる条件、
   DueとFollow-upの区別、必須範囲、タイムゾーン、超過境界。SLA engineは作らない。
4. **Team scope / 引継ぎ権限**: 同一Service内で足りるか、他の境界が必要か。
   Tenant内全員をTeamとみなさない。休みのOwnerの責任と引継ぎ先の確認方法。
5. **Escalation / 回答の記録**: 手動記録で足りる範囲、待ち先の参照と結果の確認元。
   未記録の受信を検出できると約束しない。外部通知/収集は本計画に含めない。
6. **Knowledge Review**: 承認者、自己承認可否、顧客間再利用範囲、機微情報の除去、
   candidate複数化と原本への参照。自動承認やAIによる権限生成は禁止。
7. **文字化け**: Human Review報告として記録済み。Phase 1では該当レコードの特定・
   DB更新はしていない。元の正しい文言/encodingを確認し、原本を推測上書きしない。

新Core Objectが必要と判明した場合の停止条件を維持する。上記の未決事項を確定せず、
「Viewのみで全部可能」としてPhase 2を開始しない。Phase 1で停止する。
