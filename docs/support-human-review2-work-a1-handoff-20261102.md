# FACTACT SUPPORT Human Review 2 — Work投入指示 A1

Status: **実装着手を承認された第一Slice／A1のみ**  
Date: 2026-11-02  
Repository: yoshihisahagisaka/git_KAIZEN  
Source PR: #10 https://github.com/yoshihisahagisaka/git_KAIZEN/pull/10  
統括設計: #12 https://github.com/yoshihisahagisaka/git_KAIZEN/pull/12  
実装契約: docs/support-human-review2-work-code-patch-20261102.md §§0, 1, 2.1, 3.5の既存UI保全、7, 8

## Workの依頼

PR #10の既存SUPPORT UIに、Registryの「登録情報」と今回Workの「問合せ対象」を一目で比較できる表示を追加する。**A1はread-only**。対象確認・回答・Close・Follow-upの新しい保存処理は実装しない。

開始前にリポジトリのmain/Canonical/ADR/PR #9〜#12と次の基準SHAを検証する。

- main: f9d1dc9f1cba24560b8fd0488b18dbe37311d7b2
- PR #10 HEAD: 14a8a375caa552e03dcedfc37ecfb4db1ee3fdb0
- PR #11 Product Decision: f3d7cc48f7136e7b802f72bb67510350ed2db43a
- PR #12 Work code contract: 1d7e63c31b28c6793b489ed6154a738a10fc9c67

Workブランチ: `feat/factact-support-hr2-ui-minimal`、このブランチのbaseはPR #10 HEAD。新しいDraft PRは `feature/factact-support-ux01-ux02` をbaseとする。既存PR #9〜#12のHEADを直接編集しない。

### 変更可能な箇所（必要な最小範囲）

1. `packages/application/src/support-queries.ts` の `SupportQueries.detail`。既存 `deviceFact`/`currentDeviceContext`/`currentContextDevice` から派生する `deviceComparison` DTOを追加。
2. `apps/web/src/client/support-context.tsx` の `SupportContextContent`。登録PCと対象PC、比較結果を一つの対照行に集約、確認元と日時を既存値から表示。DIFFERENT時のみ本人への確認ガイドを表示。
3. `apps/web/src/client/support-wizard.tsx` の `Wizard`。左側チェックリストの登録PC/今回対象という重複した2行を簡素化し、右側の対照表示を参照する案内へ変更。本人の申告、対象情報の明示記録、Unknown、Legacy操作は保持。
4. `apps/web/src/client/style.css`。既存クラス・75:25レイアウト・モバイルDialogを維持した最小CSS。
5. `tests/golden/support.test.ts` と `tests/browser/support.spec.ts` のA1テスト追加と、重複チェックリストに依存する旧表示assertionのみ更新。既存テスト削除は禁止。

### 正確な比較ロジック

~~~ts
type DeviceComparisonResult = 'MATCH' | 'DIFFERENT' | 'UNCONFIRMED';
const registryId = deviceFact?.device.id ?? null;
const targetId = currentContextDevice?.id ?? null;
const result: DeviceComparisonResult =
  registryId && targetId
    ? registryId === targetId ? 'MATCH' : 'DIFFERENT'
    : 'UNCONFIRMED';
~~~

- 登録PC: Registryのcurrent relation・Device・verifiedAt/sourceChangeをそのまま使用。なければ「未確認」であり「登録なし確定」とは表示しない。
- 問合せ対象: Workのcurrent ContextがCONFIRMED/CORRECTEDなら端末、UNIDENTIFIEDなら「未特定として記録」、Contextなしなら「未確認（未記録）」。TARGETのsource/recordedAtを表示。
- 両IDの一致は値の照合だけで、Registryの誤り/修正必要性/本人の断定/障害原因/サポート適用可否を判定しない。
- 不一致のガイド文は「登録情報では【assetTag】ですが、今回の対象は【assetTag】です。会社から貸与されているPCでお間違いないですか。最近交換・一時借用などはありましたか？」。両方の端末が特定できない場合はこの断定的な差異メッセージを出さず、未確認を表示する。
- 所有状態、管理状況、VPN利用要否はRegistryの根拠がなければ「比較済み」としない。既存のWork-scoped target observationsは表示を保持。
- 参照画面を開く、比較結果を導出する、ガイドを読む、どれもDB記録やRegistry変更を行わない。

### UIの保存条件

- 既存SUPPORT Work Workspace/Active Work Anchor/Explore/Context Dialog/History/Authority/read-onlyは破壊しない。
- 現行`ContextDevicePanel`のConfirm/Correct/Unidentified/End/Observationはそのまま。現時点では新しい「一致・異なる」Human decisionの保存ボタンを増やさない（A2で既存Observationへ接続する）。
- ステータス選択4択/シンプル回答フォーム/新規Response Route/Reopenは**このPRの対象外**（B/C）。
- デスクトップではRight Contextの対照、モバイルでは既存「参照情報」Dialog内に同じ対照が出ること。Dialogの開閉/focus/Escapeが退行しないこと。

### A1受入テスト

1. RegistryとTargetの同一Device IDはMATCH（「一致」）。別IDはDIFFERENT（「異なる」）＋Caller-firstガイド。
2. Registry不在、Target不在、UNIDENTIFIED、Context ENDの全てでUNCONFIRMED（「未確認」）。表示されない値を補完しない。
3. 比較結果にRelation/Target provenanceが表示され、閲覧でwork/relations/device context/target observation/auditイベントの件数が増えない。
4. 既存Registry current relationの切替で現在の比較表示だけが正しく変わる。旧Work Contextは自動修正されない。
5. Desktop 75:25、mobile Dialog、Active Work Anchor、Explore往復中の未保存入力、業務履歴、権限なしread-onlyの既存テストを通す。
6. typecheck、Unit、DB Golden、Browser、build、diff checkが全てPASS。

### STOP条件と返却形式

- PR #10 HEADのドリフト、従来Contractとの不一致、CoreやDBスキーマ変更の必要性、A2〜Cの保存APIの独自先行実装、既存Human Review Runner/DBの破壊的操作が必要になった場合はSTOPして統括へ返す。
- Workは1件のDraft PRでA1を完結し、変更ファイル、差分概要、開始/終了SHA、テストログ、MATCH/DIFFERENT/UNCONFIRMEDの画面証跡、残Gapを報告。
- **main merge、Migration実行、Deploy、Production操作禁止。** 統括がA1をレビューしてからBを指示する。

以上をそのままWorkの実装範囲とする。Work側で新しいProduct DecisionやUI構成の再設計をしない。
