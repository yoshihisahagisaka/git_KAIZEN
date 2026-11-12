# FACTACT G4 Local Validation / G5 Readiness（2026-11-12）

## Status and scope

- G3 local STOP: Product Owner解除済み
- G4 local: **PASS**
- G5 Hosted Staging execution: **No-Go継続**
- Base: Draft PR #66 head `b1fe1f305a0ea23264afe919fd2fd72877f1430f`

G3のRegistry Executor、Migration Principal、RuntimeのRole設計は再設計しない。本検証はGCP、Hosted DB、既存ローカルDBおよび既存PRを変更していない。

## G4 evidence matrix

既存テストで証明済みの項目は再実装せず、その証跡を再利用した。G4で新たに必要だった検証はSynthetic seedのRLS適合性だけである。

| Gate | Evidence | Result |
|---|---|---|
| Tenant間のデータ分離 | `baseline.test.ts`、`actor-identity-contexts.test.ts`、Registry / Scoped HTTP Golden Test | PASS |
| Runtimeと管理権限の分離 | PR #66 Finalization、`registry-executor-finalization.test.ts`、`registry-executor-role.test.ts` | PASS |
| Registry Change → Verify → Commit | `registry-edit-commands.test.ts`、`registry-integrated-http.test.ts`、Policy activation test | PASS |
| 権限不足時の拒否 | Registry Grant失効、別Tenant、別Recipient、Runtime直接UPDATE、Private Helper拒否テスト | PASS |
| Auditの完全性 | Registry propose / verify / commit / return、Policy activation、失敗時Audit rollbackテスト | PASS |
| エラー時rollbackと整合性 | DB baseline、Registry command、PR #66 Finalization失敗注入 | PASS |
| Synthetic seedのRLS適合性 | 新規`g4-synthetic-staging-readiness.test.ts` | PASS |

G4追加検証はPostgreSQL 17.10の非superuser `CREATEROLE` Migration Principalで実施した。既存のsuperuser fixtureだけを根拠にしていない。

2026-11-12の実行結果:

- G4 Synthetic Staging readiness: 5/5 PASS
- 通常テスト: 39/39 PASS
- G4重点回帰: 23件PASS、既存G3緊急停止1件は並列負荷で15秒timeout
- timeoutしたG3 Finalization suiteの単独再実行: 4/4 PASS
- TypeScript typecheck / `git diff --check`: PASS

timeoutはSQLエラー、権限エラーまたはデータ不整合ではなく、同時に複数のembedded PostgreSQLを起動した際のテスト時間上限である。単独再実行で実退行なしを確認した。

## Synthetic seed result

`supabase/seed.sql`は1 Tenantの決定的な前提データだけを持ち、Event、Work、Change、Relation、Audit outcomeを作らない。

Migration Principalは対象Table所有者だが、31 Tableの`FORCE ROW LEVEL SECURITY`により、恒久Policyを持たない通常状態ではseed INSERTが拒否された。これは期待するfail-closed動作であり、RLSを無効化して回避してはならない。

最小の投入手順として、同一トランザクション内で次を検証した。

1. Migration Principalで開始し、`row_security=on`を維持する。
2. 対象Tenant contextをtransaction-localに設定する。
3. seedが書く8 TableだけにMigration Principal用のTenant限定Policyを作成する。
4. seedを実行する。
5. 8 Policyを削除する。
6. 一時Policyがゼロであることを確認してcommitする。

対象は`tenants`、`operators`、`operator_roles`、`organizations`、`people`、`devices`、`services`、`contract_profiles`だけである。新Role、BYPASSRLS、RLS無効化、Runtime権限追加はない。

検証結果:

- 非superuser投入: PASS
- 31/31 ENABLE/FORCE RLS: PASS
- 投入後の一時Policy残存ゼロ: PASS
- Runtimeによるseed相当INSERT: SQLSTATE `42501`で拒否
- 別Tenant行の投入: SQLSTATE `42501`で拒否
- 失敗注入: seed行と一時Policyをともに完全rollback
- transaction終了後のTenant context残存なし

これはローカル検証用fixtureであり、Hosted DBへ実行する承認ではない。G5実行時は同じ手順をレビュー済みrunbookまたは専用コマンドとして固定し、対象DBの空状態を直前確認する。

## G5 prerequisites

| Condition | State | Required evidence / decision |
|---|---|---|
| PR #60 SQL / security review | UNKNOWN | GitHub review 0件。独立した人の承認が必要 |
| PR #66 SQL / security review | UNKNOWN | GitHub review 0件。独立した人の承認が必要 |
| Cloud SQL実Principal | UNKNOWN | 非superuser、`CREATEROLE`、DB/Schema owner能力、Executor自動ADMIN-only grantを実機read-back |
| G2接続方式 | CONDITIONAL | Private IP + Direct VPC egress + Auth Proxy v2候補。明示Proxy mode、IAM Condition、実効権限を確定 |
| Auth Proxy security gate | UNKNOWN | 使用version固定、脆弱性scan High以上なし、localhost bindを証跡化 |
| Migration前DB状態 | UNKNOWN | 新規Synthetic専用DB、Migration履歴0、業務Table0、想定外Role/extensionなしをread-only確認 |
| Supabase CLI適用 | LOCAL PASS | 2.117.0、34/34、2回目No-op。Cloud SQL rehearsalは未実施 |
| Synthetic seed runbook | LOCAL PASS / HOSTED UNKNOWN | 上記の一時Tenant Policy方式をSQLレビューし、空DB限定・失敗rollback・read-backを手順化 |
| Secrets / Runtime分離 | UNKNOWN | serving revisionにMigration credentialを渡さず、Runtime/OIDC secretだけをversion pin |
| E2E actors and data | PARTIAL | Synthetic proposer、別reviewer、権限なしactor、別Tenant fixtureを準備 |

## G5 minimum E2E procedure

1. Cloud SQL / Auth Proxy / IAM / secretsのG2 read-backを取得する。
2. DB空状態、Principal属性、接続先Project / Region / instanceを確認する。
3. Supabase CLI 2.117.0で34 Migrationを適用し、履歴とPreflightをread-backする。
4. レビュー済みSynthetic seed手順を1回実行し、一時Policyゼロを確認する。
5. RuntimeとOIDC poolのRoleをread-backし、Migration credentialがserving revisionにないことを確認する。
6. proposer → reviewer return → re-propose → verify → commitを実施する。
7. Grant失効、別Tenant、直接UPDATE、Policy STOP / driftを拒否する。
8. Change、Evidence、Audit、Person revision、Policy pinをread-backする。
9. エラー注入では部分Change、ACL、一時Policy、Migration履歴が残らないことを確認する。

フォームや実顧客データは使用しない。SyntheticデータであってもRLSを無効化しない。

## Decision

- G4 local: **PASS**
- G4 implementation regression: **PASS**
- G5 readiness: **CONDITIONAL / UNKNOWN項目あり**
- Hosted Migration / deploy: **No-Go**

G5開始前の最短クリティカルパスは、PR #60/#66の独立レビュー、G2の接続・IAM確定、Cloud SQL実Principalのread-back、空DB確認、Synthetic seed runbook承認である。
