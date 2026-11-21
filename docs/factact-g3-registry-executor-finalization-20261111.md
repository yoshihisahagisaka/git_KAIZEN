# FACTACT G3 Registry Executor Finalization（2026-11-11）

## Status

- Product Owner承認方式: A2（原子的Finalization）
- 実装基準: Draft PR #60 head `607648da81434fa0a71ea2a37f4943856dcada74`
- 検証根拠: Draft PR #65のPostgreSQL 17 / Supabase CLI 2.117.0再現結果
- Hosted Migration / Staging / Production: **No-Goを維持**

この変更は未マージのRegistry Migrationに限るMigration不変方針の承認済み例外である。RLS、Registry Policy、Change → Verify → Commit、Runtimeの業務権限は変更しない。

## Final state

`factact_registry_executor`はNOLOGIN、NOSUPERUSER、NOBYPASSRLS、NOCREATEROLE、NOCREATEDB、NOREPLICATION、NOINHERITであり、Registry対象7関数だけを所有する。

Migration Principalとの恒久的な関係は次の1件だけを許可する。

| role | member | grantor | ADMIN | SET | INHERIT |
|---|---|---|---:|---:|---:|
| `factact_registry_executor` | 実行中のMigration Principal | PostgreSQL bootstrap superuser | true | false | false |

これはPostgreSQL 17が非superuser `CREATEROLE`によるRole作成時に自動生成する管理関係である。RuntimeにはExecutor membershipを付与しない。

保守処理は同一トランザクション内で、Migration Principal自身をgrantorとする一時的な`SET TRUE / INHERIT FALSE`を追加し、処理後に`GRANTED BY current_user`を指定してそのself-grantだけを回収する。恒久ADMIN-only grantを変更しない。

関数の`CREATE OR REPLACE`時だけ、Migration Principalが所有する対象Schemaの`CREATE`をExecutorへ一時付与し、所有関数更新後に回収する。失敗時はRole option、Schema ACL、関数更新を含めトランザクション全体をrollbackする。

## Migration changes

- `20261110000300`: 早期Role作成・権限確定を廃止し、Finalizationへ延期
- `20261110000400`: Return RPC定義を維持し、所有権・Executor ACLを延期
- `20261110000700`: Eligibility関数定義を維持し、所有権・Executor ACLを延期
- `20261110000800`: Activation関数定義を維持し、所有権・Executor ACLを延期
- `20261110000900`: 業務ロジックを維持し、所有権確定を延期
- `20261110001100`: Role、最小ACL、13 RLS Policy、7関数所有権、Runtime RPC ACL、ADMIN-only管理関係、カタログ検証を1トランザクションで確定

Finalization途中の失敗では、Executor Role、self-grant、所有権、ACL、PolicyおよびSupabase Migration履歴は確定しない。

## Exact preflight

Preflightは次をfail-closedで確認する。

- Executor属性と所有関数7件
- Executorをroleとするmembershipが1件だけ
- memberが接続中のMigration Principal
- grantorがsuperuser
- `ADMIN TRUE / SET FALSE / INHERIT FALSE`
- Executor自身が他Roleのmemberでないこと
- RuntimeにExecutor membership、Private Helper実行権限、Person直接UPDATE権限がないこと
- ExecutorのSchema CREATE、業務Table所有、Grant更新権限がないこと
- 13件のExecutor tenant Policy
- FACTACT 31 TableすべてのENABLE/FORCE RLS

## Validation evidence

隔離されたPostgreSQL 17.10で、既存ローカルSupabase DB / Docker Volumeを使用せず検証した。

| Gate | Result |
|---|---|
| 非superuser `CREATEROLE`で空DBから34 Migration適用 | PASS |
| Supabase CLI 2.117.0のlocal/remote履歴一致 | PASS（34/34） |
| 2回目の`db push` | PASS（up to date / No-op） |
| Finalization後の対象7関数所有権 | PASS |
| ADMIN-only関係の厳密一致 | PASS |
| 緊急停止SQL実行・4 Runtime RPC停止 | PASS |
| 将来Migration相当の`CREATE OR REPLACE FUNCTION` | PASS |
| 保守後の一時SET / Schema CREATE残存なし | PASS |
| Runtimeの直接Person UPDATE / Private Helper実行拒否 | PASS |
| Tenant間参照拒否 | PASS |
| 31 Table ENABLE/FORCE RLS | PASS |
| Finalization失敗注入と完全rollback | PASS |
| Registry対象回帰 | PASS（10/10） |
| 通常テスト | PASS（39/39） |
| DB / Golden全体 | PASS（315/315、旧membership期待を新Canonicalへ更新後） |
| TypeScript typecheck / diff check | PASS |

## Existing database impact

Registry Migration未適用のDBは空DBと同じ順序で適用できる。`20261110000300`〜`20261110001000`の旧版を既に適用したDBには、変更済みMigrationの再適用や`migration repair`を行わない。状態別Forward Migrationまたは破棄・再構築の判断が必要であり、個別Goまで操作しない。

既存ローカルDB、Docker Container、Volume、永続データは変更・削除・初期化していない。

## Remaining gates

- GitHub CIの完了
- PR #60に対する人によるSQL・セキュリティ再レビュー（担当者未指定）
- Cloud SQL実機でのG3 rehearsalとG4/G5
- Syntheticデータ投入手順のRLS整合性確認

ローカルG3 STOP解除の技術条件は満たすが、これはHosted MigrationまたはデプロイのGoではない。
