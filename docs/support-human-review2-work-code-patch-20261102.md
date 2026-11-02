# FACTACT SUPPORT Human Review 2 — Work向けコードレベル差分契約

Status: **統括による実装指示案 / Draft PR #12 文書のみ**  
Date: 2026-11-02  
Authority: PR #11 Product Decisions D-01/D-02/D-04/D-05; existing Canonical / ADR / Phase 2 Contracts  
Scope: A Registry対照とCaller確認、B 応答・状態・Follow-upの一括保存、C 明示的Close/Reopen。D-03の本格Escalation、D-06 Cross-Work、D-07 Knowledge Versioning/Commentは別Slice。

## 0. 固定ベースと変更禁止

- main f9d1dc9f1cba24560b8fd0488b18dbe37311d7b2
- Human Review Runner PR #9 c985c5b0313907a72c8cd2543c8a52ccc5817cdc
- UI実装基準 PR #10 14a8a375caa552e03dcedfc37ecfb4db1ee3fdb0
- Product Decision PR #11 f3d7cc48f7136e7b802f72bb67510350ed2db43a
- 統括最小差分 PR #12 1ff21562e109347400f2304fb42aa1baf3661b52（本書を追加する前のSHA）

WorkはPR #10 HEADから新規作業ブランチ `feat/factact-support-hr2-ui-minimal` を作り、PRのbaseを `feature/factact-support-ux01-ux02` とすること。PR #9/#10/#11/#12自身を直接編集しない。作業開始直前にSHAと差分を再確認し、漂流していたら作業停止・統括へ返す。

**Core/Registry/Join/Change→Verify→Commit/既存Role/Authority/Work engineの改造は禁止**。新しいサービス・テーブル・ワークフロー抽象・画面Shellは禁止。本番Migration/Deploy/PR Merge/Human Review DBの初期化は禁止。

本書の具体コード契約がPR #12の概説§2〜7と食い違う場合は、本書をWork実装判断の優先基準とする。UI文言の大幅な再設計はWorkで行わない。

## 1. ファイル・関数別の差分

| 既存ファイル | 変更する正確な場所 |
|---|---|
| `packages/domain/src/support.ts` | `ResponseDisposition`、`SupportResponseNotes`、`SupportResponseDraftNotes`、`SupportRecord` 判別可能Union、LifecycleEvent.kind、CloseDecision.closeSequence、TargetObservation.sourceSnapshot |
| `packages/application/src/support-ports.ts` | `closeDecisions(workId)`を追加。既存`closeDecision(workId)`は最新1件取得に改める |
| `packages/application/src/support-commands.ts` | 新規`recordSupportResponse`/`reopenSupportWork`。`closeWork`のretry/sequence/revision修正。`recordWork`は新式DRAFTを許容。既存`verificationGuard`を共有 |
| `packages/application/src/support-queries.ts` | `deviceComparison`、`responseSituation`、BusinessHistoryの型分岐とClose全履歴 |
| `apps/web/src/server/persistence/support-repository.ts` | Close全履歴・最新読取、既存append insert/progressを再利用 |
| `apps/web/src/server/support-routes.ts` | `/responses`、`/reopen`を追加。既存`/records`で新式DRAFTを受理。対象Observationを後述の契約だけ拡張 |
| `apps/web/src/client/support-wizard.tsx` | `Wizard`の通常フォーム、`LifecyclePanel`の配置、`Correction`の型ガード、ステータスバーを修正 |
| `apps/web/src/client/support-context.tsx` | 既存`SupportContextContent`内に1つの対照表。`PreviousSupport`のNotes型ガード |
| `apps/web/src/client/support-ui.tsx` | `ResponsibilityRows`のnullable待機表示を修正 |
| `apps/web/src/client/style.css` | 既存`support-*`クラスを最小追加。75:25、Dialog、Anchorなど維持 |
| `supabase/migrations/20261102001200_support_hr2_ui_minimal.sql` | 本書§5のCHECK/Close sequence/既存Observation snapshotのみ |
| 既存Golden/DB/Browserテスト | 本書§7のケース追加。既存テストは新UIの期待値だけ更新 |

概説の「約8ファイル」は初期見積もりである。PR #10の `PreviousSupport` と `ResponsibilityRows` もUnion/nullableの影響を受けるため上表に含める。

## 2. A — 比較表示は読取だけ。判断と発言は明示保存のみ

### 2.1 Query DTO / 比較ロジック

`SupportQueries.detail` の既存 `deviceFact` / `currentDeviceContext` / `currentContextDevice` を再利用し、返却DTOに次を追加する。

~~~ts
type DeviceComparison = {
  result: 'MATCH' | 'DIFFERENT' | 'UNCONFIRMED';
  registry: { deviceId: string; assetTag: string; relationId: string; verifiedAt: string } | null;
  target: { deviceId: string; assetTag: string; contextId: string; source: 'OPERATOR'|'CALLER'|'OTHER'; recordedAt: string } | null;
  targetUnidentified: boolean;
};
const result =
  registry && target
    ? registry.deviceId === target.deviceId ? 'MATCH' : 'DIFFERENT'
    : 'UNCONFIRMED';
~~~

`registry`は`deviceFact.relation`由来、`target`は現在の未終了Context由来。どちらか欠損、またはUNIDENTIFIEDなら必ずUNCONFIRMED。一致/不一致は**ID値の比較**であり、Human VerificationやRegistry誤記認定ではない。相違があってもRegistry/Change/Evidence/Work targetを自動変更しない。

`SupportContextContent`は以下を同じ箇所に1回だけ表示する。

| 登録情報 | 今回の問合せ対象 | 比較 |
|---|---|---|
| assetTag又は未確認 ＋Registryの確認元日時 | assetTag又は未特定/未確認 ＋申告元日時 | 一致 / 異なる / 未確認 |

`Wizard`左側の旧「登録されている利用PC」「今回の対応対象」重複表示は簡略化し、右の対照表示への導線に置換する。他の確認リスト（本人申告、所有・管理状態、Unknown）と既存ContextDevicePanelの明示記録操作は維持。

DIFFERENT時に表示する**決定論的ガイド文**：
「登録情報では【登録assetTag】ですが、今回の対象は【対象assetTag】です。会社から貸与されているPCでお間違いないですか。最近交換・一時借用などはありましたか？」
両IDが揃わないときこの文は出さず、各値の確認を促す。表示のみでは一切保存しない。「登録が誤り」「変更必須」「対象外」と決めつけない。VPN必要性・所有・管理状況をRegistryにないのに対照済みとして描画しない。

### 2.2 明示記録（後段Slice）

`SupportTargetObservation`に以下を加える。新テーブルは作らない。

~~~ts
kind: 'IDENTIFICATION'|'OWNERSHIP'|'MANAGEMENT_STATE'|'REGISTRY_COMPARISON'|'CALLER_STATEMENT';
value: ExistingTargetValue | 'MATCH' | 'DIFFERENT'; // UNKNOWN は既存値
sourceSnapshot: Record<string, unknown>; // DBの既存行は {}
~~~

合法な組合せは:
- REGISTRY_COMPARISON : MATCH/DIFFERENT/UNKNOWN、sourceType=OPERATOR、比較した時点の両ID/assetTagとrelationId、contextId、confirmedAt（記録時刻）をsourceSnapshotに固定。
- CALLER_STATEMENT : UNKNOWNのみ、sourceType=CALLER、detail必須（本人の実際の言葉）、sourceSnapshotにはその時点のcontextIdと、存在する場合だけ参照したrelationId。
- 旧3種類は従来のvalue集合・sourceType意味を**変えない**。旧記録のsnapshotは空オブジェクト。

保存経路は既存 `POST /support-work/:id/context-target/observations` → `recordTargetObservation`。入力にsourceSnapshotを丸ごと信用して受け取らず、サーバーがその時点で読んだRegistry/Contextから生成する。Humanが選ぶのはkind/value/detailのみ。リクエストには従来のrequestId/expectedRevision/sourceTypeを必須とする。現在のTarget Contextがない場合は既存の明示`UNIDENTIFIED`記録を先に案内するが、自動作成は禁止。履歴は既存supersessionとactor/timeで不変、Registry更新なし。

`recordUnidentifiedTarget`が既存のIDENTIFICATION Observationを作る箇所にはsourceSnapshot={}を明示追加する。`SupportQueries.detail`の`observationKind`/`observationValue`分岐と`ContextDevicePanel`のラベルにも新kind/valueを追加し、型の網羅漏れを残さない。

対象Observation拡張は表示Sliceとは切り離してレビューする。A-1読取表示を先に受け入れる。

## 3. B — 単一応答入力と1トランザクション

### 3.1 Domain型（旧記録のshapeを変更しない）

~~~ts
type ResponseDisposition = 'CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING'|'COMPLETED';
type SupportResponseNotes = { responseText: string; disposition: ResponseDisposition };
type SupportResponseDraftNotes = {
  form: 'SIMPLE_RESPONSE'; responseText: string;
  disposition: ResponseDisposition | null; followUpAt: string | null;
};
type SupportRecord =
  | (SupportRecordBase & { kind: 'COMPLETION'|'CORRECTION'|'CONTINUATION'; notes: SupportNotes })
  | (SupportRecordBase & { kind: 'DRAFT'; notes: SupportNotes | SupportResponseDraftNotes })
  | (SupportRecordBase & { kind: 'RESPONSE'; notes: SupportResponseNotes });
~~~

SupportRecordBaseは既存id/tenantId/workId/requestId/revision/correctionReason/recordedByOperatorId/recordedAtとする。RESPONSEのcorrectionReasonは空文字。既存SupportNotes、SupportActionLabels、旧COMPLETION/CORRECTION/CONTINUATIONのバリデーションは不変。

### 3.2 Route（厳密schema）

新規 `POST /api/support-work/:id/responses`：

~~~ts
type RecordSupportResponseInput = {
  requestId: string;                  // UUID
  expectedLifecycleRevision: number; // >=0
  expectedRecordRevision: number;    // >=0
  responseText: string;               // trim後 1..4000
  disposition: ResponseDisposition;
  followUpAt: string | null;          // ongoingではtimezone付きISO日時必須
  close?: {
    outcome: SupportCloseOutcome;
    closeReason: string;               // trim後 1..1000
    confirmsOutstandingResponsibilityEnded: true;
  };
};
~~~

- COMPLETED iff close必須、followUpAt=null。
- それ以外 iff closeを送らず、followUpAt必須。過去日付も入力エラーにはせず、期限到達として既存Managementで扱う。架空の「明日」を補完しない。
- 完了時のprovenanceTypeはHUMAN_DECISION、provenanceReferenceは**同一トランザクションで生成されたResponse record.id**。UIは別の「根拠」欄を重複入力させない。Evidenceに由来する例外Closeは既存の詳細/legacy `/close`を使用。
- Zod `strictObject`、UUID、nonnegative revision、`datetime`、CSRF/Origin/Sessionは既存共通middlewareのまま。認可は`SupportCommands.run`＋`context`の現行Contract executeRolesで再評価。

新式下書きは既存 `POST .../records` のDRAFTとしてnotes.form=SIMPLE_RESPONSEを受け付ける（新エンドポイント・新テーブルなし）。サーバーでform/文字長/状態/dateの型を検証し、未選択値や日付なしでもDRAFTだけは許可。 `recordWork` のDRAFT以外は既存SupportNotesを厳密要求し、Responseをその既存メソッドへ流さない。再送比較は既存`stable`の順序正規化を使う。

### 3.3 Application: recordSupportResponse

`SupportCommands.recordSupportResponse(actor,workId,input)`、一回の`this.run`、冒頭`r.work(workId,true)`、既存`this.context`。以下の順序を厳守。

1. Records/LifecycleEvents/FollowUps/CloseDecisionsを読取り、同requestIdの保存済みRESPONSEを検出。旧レコード・Lifecycle event・必要なFollow-up/Closeが揃う場合にのみ、actorと正規化input完全一致で**同じ結果**を返す。異なるpayload/actor/他コマンドのrequestId再利用はRETRY_CONFLICT。必ずrevision/state確認より先に行う。
2. v2かつ未Close、expectedLifecycleRevision===work.lifecycleRevision、expectedRecordRevision===latest record revisionを検証。responseText/disposition/followUpAt/close確認をサーバーで検証。追加のRoleを作らない。
3. kind=RESPONSEのSupportRecordをappend。`notes={responseText,disposition}`。新しいAction/Evidence/SupportDecision/Registry Factは生成しない。
4. kind=RESPONSE_RECORDEDのSupportLifecycleEventをappend。revision=work.lifecycleRevision+1、commandPayloadに正規化された全入力、nextActionには§3.4固定文、waitingParty/waitingReasonは空文字。Responseと同requestIdを使う。
5. ongoingならFollowUp SETをappend（sourceType=HUMAN_DECISION、basisText=「担当者が次回確認予定を指定」、reason=「今回の対応状況に基づく次回確認」、supersedes=latest ID）。Workへ§3.4の状態・次回確認・nextAction・revisionを投影。
6. COMPLETEDならHumanがチェックした「残るWaiting/次の対応責任をここで終了する」確認をguardSnapshotに、**変更前のwaiting/nextActionOpen/previousFollowUpAtとともに**保存。既存`verificationGuard`のrequiredVerificationOpen/verificationRequirementUnknownがいずれもfalseであることを確認。Closeと同時にWorkのwaiting=false、waitingParty/reason=null、nextActionOpen=false、followUpAt=nullへ投影し、必要ならFollowUp CLEAREDを同requestIdでappend。新しいCloseDecisionをcloseSequence=latest+1でappend（outcome/closeReason、provenanceType=HUMAN_DECISION、provenanceReference=今回作成したrecord.id）。WorkをCOMPLETED/closedAtにする。
7. Work projectionを一回更新し、Auditを一回appendしてcommit。失敗ならResponse/Lifecycle/FollowUp/Close/Work/Auditを**すべてrollback**。人間の一操作を二つの独立HTTPコマンドに分離しない。

完了時の「既存Close guard維持」は、今回の明示確認によってWaiting/未完次対応を同一原子操作内で終了した**後のWork状態**を評価することを意味する。Verification guardは省略不可。テキストやdispositionからの自動推定は不可。明示確認がなければclose不可。旧`closeWork`は従来のwaiting=false/nextActionOpen=falseという前提を維持する。

### 3.4 状態の投影（Core enum追加なし）

| disposition | Work.status | waiting | waitingParty/reason | nextActionOpen / nextAction | followUpAt |
|---|---|---|---|---|---|
| CUSTOMER_WAIT | IN_PROGRESS | true | null / null | true / 「顧客からの連絡・回答を確認する」 | 指定値 |
| INVESTIGATING | IN_PROGRESS | false | null / null | true / 「調査結果を確認し次の対応を判断する」 | 指定値 |
| MONITORING | IN_PROGRESS | false | null / null | true / 「状況を確認し継続要否を判断する」 | 指定値 |
| COMPLETED | COMPLETED | false | null / null | false / 「問い合わせ対応はClose済み」 | null |

担当者WorkOwnerは保持。Dueには触れない。CUSTOMER_WAITのnullable waitingParty/reasonは、単純な状況分類で誰が何を待つかを勝手に生成しないための例外。旧`setWaiting`コマンドのparty/reason必須検証は緩めない。legacy Waiting/FollowUpなしも引き続き有効。

### 3.5 UI state / UI分岐

`Wizard`のv2通常画面は以下のみ：対応内容（textarea maxLength=4000、初期空欄）、対応後の状態（4択、初期未選択）、次回確認予定（最初の3択時だけ必須`datetime-local`）、`下書き保存`、`対応を記録`。

COMPLETEDを選択してボタン押下 → **保存前の確認Dialog**。outcome 5候補（初期RESOLVEDでもHumanに表示）、closeReasonは対応内容を編集可能な提案として初期表示可、残存責任の明示チェック（初期未チェック）、キャンセルを用意。OKするまでサーバー呼出しなし。成功後だけフォーム初期化。閉じたWorkには通常入力を表示しない。

新規エントリは常に空欄。`records.at(-1)`がDRAFTかつnotes.form=SIMPLE_RESPONSEの時のみ明示保存済み下書きを復元。legacy DRAFTは既存詳細操作で編集可能だが単純フォームへ無理に型変換しない。Active Work Anchor、unsaved guard、Context Dialog、Explore、Historyは保持。

送信requestIdを`useRef`で固定し、同一payloadの通信再試行に再利用。ユーザーが値を意図的に変えた場合のみ新ID生成。busy中の二重送信を無効化。revisionは画面の実際のWork/recordsから送り、409時は「再読み込みして最新の対応を確認」を表示。リロード前に入力を勝手に消さない。

`LifecyclePanel`の既存Waiting/Resume/Follow-up/NextAction/standalone Closeは「詳細・旧形式の操作」に移す。削除しない。対応状況バーは最後の有効なResponse/Reopen状況を表示し、後続の旧Waiting/Resumeがあれば実際のWork状態へfallback。履歴で技術的FollowUpをResponseと別のHuman操作として重複表示しない。`ResponsibilityRows`ではnullable waitingParty/reasonを文字列`null`として出さない。

`SupportBusinessHistory`のRESPONSEは本文と4択、時刻、Operator、次回確認/完了を**一件の操作**として表示。COMPLETEDは当該Close outcome/reasonを同じ履歴行に含める。既存独立Closeは別行を維持。`SupportContextContent`の過去対応表示と`Correction`は`record.kind`で分岐し、RESPONSE.notesを旧SupportNotesとして読まない。旧COMPLETION/CORRECTION/CONTINUATIONの訂正UIは保持。新RESPONSEの原文は上書きせず、誤記は追記・Reopen後の新たな記録で訂正する（専用訂正UIは別Slice、暗黙の上書きは禁止）。

## 4. C — 再開と再Close

新規 `POST /api/support-work/:id/reopen`：

~~~ts
type ReopenSupportWorkInput = {
  requestId: string;
  expectedLifecycleRevision: number;
  expectedCloseDecisionId: string | null; // V1完了だけnull
  reason: string; // trim 1..1000
  disposition: 'CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING';
  followUpAt: string; // timezone付きISO
};
~~~

`reopenSupportWork`は`r.work(id,true)`、`context`、requestIdによる既存REOPENEDのactor+payload一致retryを最優先。現在COMPLETED、expected lifecycle revisionと**最新**closeDecision ID一致（旧V1完了でDecisionなしならnull）を検証。REOPENED lifecycle eventに直前のoutcome/closedAt/closeDecisionId、reason、disposition、followUpAtを固定し、FollowUp SET・Work projection・Auditを一トランザクション。WorkをIN_PROGRESSにし、outcome/closedAt=null、lifecycleVersion=2、lifecycleRevision+1、status/nextAction/waiting/followUpは§3.4のongoing mapping。WorkOwner/旧Close/旧Response/Action/Evidence/Registryは変更しない。旧V1のCompleted Recordは消さない。

`closeWork`の修正点：
- `r.closeDecisions(workId)` から**同requestId**を探してretry比較。その後だけ現行state/revisionを検証する。過去Closeがあるだけで再Closeを拒否しない。
- closeSequenceはWork lock下でlatest+1。`lifecycleRevision += 1`（現行実装ではClose時に増加していない）。
- standalone Closeの既存waiting/nextAction/verification guardとprovenanceType/Reference/evidenceチェックは維持。残っているFollowUpがあればCLEAREDを同トランザクションでappendし、Work.followUpAt=null。one audit。
- `r.closeDecision(workId)` は順序をcloseSequence DESCに修正、`r.closeDecisions(workId)` はASC履歴。再開前の複数Closeは全履歴としてQueryへ渡す。旧V1完了ではClose Decisionなしを正しく表す。

完了画面には既存Close summaryの横に`対応中に戻す`を表示。reason、3択、次回確認予定を必須とし、確認して1回だけ保存する。旧`resumeWork`はWaiting解除のみなので**呼ばない**。Reopenしたあとは通常Wizardに戻る。再Close履歴は全件残す。

## 5. DB Migration — 既存テーブルのみ

1ファイル `supabase/migrations/20261102001200_support_hr2_ui_minimal.sql`。実装時に既存Migration一覧を読んで012が未使用であることを先に検証し、使用済みなら統括へSTOP。既存行の改変、DROP TABLE、DELETE、UPDATE履歴は禁止。

1. `support_work_records.kind` CHECKにRESPONSEを追加（既存DRAFT/COMPLETION/CORRECTION/CONTINUATION保持）。notesは現行jsonb object CHECKのまま。
2. `support_work_lifecycle_events.kind` CHECKにRESPONSE_RECORDED/REOPENED追加。command_payloadは既存jsonb列を再利用。
3. `work`のWaiting CHECKを、(a)waiting=falseならparty/reasonともnull、(b)waiting=trueなら**両方null、又は両方nonempty**のみに置換。半端な片方nullはrejectする。実装式は明示的IS NULL/IS NOT NULLを使い、SQL CHECKでUNKNOWNが通過する式を避ける。旧command検証は変えない。
4. `support_work_close_decisions`に`close_sequence integer not null default 1 check(close_sequence>0)`追加。既存行はすべて1。旧UNIQUE(tenant_id,work_id)だけDROPし、UNIQUE(tenant_id,work_id,close_sequence)追加。旧UNIQUE(tenant_id,work_id,request_id)、RLS/append-only権限は維持。新Insertには明示的sequenceを送る。
5. 後段A2で`support_work_target_observations`のkind/value/combination CHECKにREGISTRY_COMPARISON/CALLER_STATEMENTと対応valueを追加し、`source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object')`を同表に追加。旧3 kindの意味と既存データは変えない。

**Constraintの同定方法（任意判断禁止）**：実装前に
~~~sql
select conrelid::regclass, conname, contype, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
 'factact.work'::regclass,
 'factact.support_work_records'::regclass,
 'factact.support_work_lifecycle_events'::regclass,
 'factact.support_work_target_observations'::regclass,
 'factact.support_work_close_decisions'::regclass
)
order by conrelid::regclass::text, conname;
~~~
を使い、対象を列の正確な組合せとCHECK定義で一意識別する（特にworkの無名CHECKとCloseの旧2列UNIQUE）。Migration内のDOで一致するconstraintが**ちょうど一個**以外なら例外停止。推測した`work_check2`などの名前を直書きしない。BEGIN/transactional migration、後にcatalogとRLS/grants/全既存行の整合を検証する。

## 6. Query / 履歴の正確な投影ルール

- `SupportQueries.detail` は `closeDecisions` 全件と互換用`closeDecision`最新件を返す。
- actorNameは新RESPONSE/REOPENED/全Closeの全actorIdを含める。
- `records.filter(!DRAFT)`のloopでkind=RESPONSEは`notes.responseText`で描画し、legacyの`notes.action`を参照しない。
- `lifecycleEvents`のloopでRESPONSE_RECORDEDは個別History行を作らない（Record由来の一件へ集約）。REOPENEDは一件。`followUps`はResponse/Reopen/Closeと同requestIdなら単独History行を作らない。
- `closeDecisions`は各Closeを表示する。Response内のCOMPLETEDとrequestIdが同じCloseはResponse行に合成して重複させない。Standalone Closeは独立行。
- `previousWork`の最後のrecordがRESPONSEでも`Notes`に渡さず本文と状態を表示。DRAFTは既存通り除外。旧レコード表示は退行させない。
- current situation: Work.status=COMPLETEDを最優先。未Closeで最新の**状況変更**Lifecycle eventがRESPONSE_RECORDED/REOPENEDならそのdispositionの日本語ラベル。WAITING_SET/RESUMED/NEXT_ACTION_CLEAREDの方が後ならWork.waitingによる旧ラベル。FollowUp日時の単独変更は状況ラベルを変更しない。
- SOURCE: RESPONSEは「担当者の記録」であり、文面中の引用を検証済み本人Factとして扱わない。CALLER_STATEMENTのみ明示的に「本人からの申告（未検証）」を表示。比較結果の歴史はsourceSnapshot固定。

## 7. テストの変更と受け入れ条件

既存 `tests/golden/support.test.ts`、`tests/browser/support.spec.ts`、`tests/database/baseline.test.ts` に限定して追加・更新。既存テストを削除して通すことは禁止。

- A/UI: 登録=対象でMATCH、異なる場合DIFFERENTとCaller-firstガイド、片方ない場合UNCONFIRMED。参照表示だけでINSERT数0、Registry変更0、UNKNOWN維持。mobile Dialog/75:25/Explore Anchorの回帰。
- A/保存: CALLER StatementはUNVERIFIED、sourceSnapshot固定、source/actor/timeとsame Target supersession、異Context・異tenant拒否、入力値でRegistry idを捏造できない。
- B: 4択、ongoing3択で日時必須、COMPLETEDで日時禁止+確認必須、取消時0 write。Response 1件＋Lifecycle 1件＋FollowUp/Close必要分＋Audit 1件。旧Work/Action/Evidence/Registry件数不変。下書きのみ復元・成功後空白・通信retryの同ID。
- B/idempotency: まったく同一retryは同じIDs、actor/payload変更はRETRY_CONFLICT、古いrevisionはSTALE_REVISION。Promise.allの同Work競合ではWork lock順序で1件だけ確定。Audit失敗注入で全テーブル/Work projectionロールバック。
- B/legacy: 旧SupportNotes、COMPLETION、CORRECTION、CONTINUATION、旧Waiting（FollowUp null含む）を読める。Responsibilityにnull文字表示なし。Due不変。旧setWaitingはparty/reason省略reject。
- C: Close→Reopen→Closeでsequence=1,2、旧Close2件とも不変。2度目のClose再送。旧V1 Completed（CloseDecisionなし）→Reopen可能で旧記録保持。別actorのretry拒否、stale expectedCloseDecisionId拒否、Owner維持、必須Verification open/unknownならcombined Closeも拒否、FollowUp解消、transaction rollback。
- Authority/RLS: inactive Contract/非executeRoles/REVIEWER/他tenant/CSRF/Originの全新Endpoint negative。既存JOIN Change→Verify→Commit、Support slice回帰を通す。
- 実行順: typecheck → Unit → DB Golden → Browser（mobile含む）→ build → diff check → PR #9 RunnerとPR #10 UIの統合Human Review。CI偶発的DB接続終了ならログを特定し、成功と混同せず失敗jobのみ再実行。

## 8. Workの実施順・STOP条件・報告形式

1. **A1 read-only UI+Query** のコミット。Migrationなし。証拠スクリーンショット（一致/相違/未確認）を先にレビュー。
2. **B response+draft+atomic status/FollowUp/Close**。必要な既存CHECK変更のみをMigrationに加える。UI/Query/テストも同コミット範囲で完成させる。
3. **C Reopen/re-Close**。Close sequence、Query全履歴、legacy互換、テスト。
4. **A2 Human comparison/Caller Statement永続化**。最後に追加、Registry非変更/Source Snapshot負試験。
5. 全回帰後、Workは **変更ファイル、関数/Constraint差分、テスト結果、未解決Gap、PR/SHA、Runner統合結果** を統括へ報告。デプロイ・main mergeはしない。

STOP: 契約/Authority解釈の揺れ、Migration同定不能、Core改修が必要に見える、事前SHA差分、既存Data lossの可能性、UIで新たなBusiness Decisionが必要、Human Review Runner/DBへの破壊的操作が必要、いずれも独断で迂回しない。

これがWorkに許可する実装範囲の全体。該当しない変更は新規提案として統括へ差し戻す。
