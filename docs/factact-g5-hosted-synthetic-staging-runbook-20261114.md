# FACTACT G5 Hosted Synthetic Staging Runbook（Local Preparation）

Status: **LOCAL PREPARATION PASS / HOSTED EXECUTION NO-GO**, 2026-11-14.

このRunbookはBilling quota待機中に、Hosted Synthetic Staging実行前の手順とGateを固定する。GCP、Billing、API、Cloud SQL、Cloud Run、IAM、Secret、Hosted DBにはまだ適用しない。Production承認には使用しない。

## 1. Canonical and Git Fit/Gap

参照するDraft PRは#60、#61、#62、#63、#66、#67、#68である。G3のExecutor Finalization、G4のRLS seed検証、G5の明示的`local-proxy` modeを変更しない。

2026-11-14の確認結果:

- GitHub PR #68 HEAD: `44ac24c06dc4a86694e3f2df583da7e2ab977b72`
- GitHub branch: `feat/factact-g5-local-proxy-mode-20261113`
- PR #68 CI: PASS（push / pull_request）
- このworktreeの開始HEAD: GitHubと同じ`44ac24c06dc4a86694e3f2df583da7e2ab977b72`
- PR #68 base側には、G4の単一connection修正`a5a2ef3`が含まれる
- 提示されたlocal HEAD `6fcf93c76a8bf146ccf83b4c4ebc7de99cad1a9a`は、このPCの全worktree、Git object database、GitHub repositoryのいずれにも存在しない

したがって`6fcf93c`との差分内容と理由はUNKNOWNである。別実行環境だけにある未Push commitの可能性を残す。強制Push、履歴書換え、推測による再現は行わず、GitHub PR #68 HEADから継続する。

## 2. Hard stop before any Hosted action

次の全条件がPASSになるまで、Migration、seed、deployを開始しない。

1. Billing linkが`billingEnabled: true`で、承認済みBilling Accountと一致する。
2. 指定5 APIが有効である。
3. PR #60、#66、#68のSQL / security reviewが完了する。
4. G2のPrivate IP、Direct VPC egress、Auth Proxy、IAM Condition、Secret境界がread-back可能である。
5. Cloud SQL instance、database、Principal、image digest、接続名が承認済み値と一致する。
6. 対象がSynthetic Staging専用で、実顧客データを含まない。
7. 操作ごとのGo判断が記録される。

現在は1と2が未完了なので、Hosted executionはNo-Goである。

## 3. Target and Principal preflight

すべての値をoperatorが記録し、期待値との文字列一致を確認する。credential、token、passwordは出力しない。

| Item | Required value / property |
|---|---|
| GCP project | `pj-factact` |
| Region | `asia-northeast1` |
| Cloud SQL instance | 別途承認されたSynthetic Staging専用instance |
| Database | 別途承認されたFACTACT Synthetic DB |
| Migration Principal | `LOGIN`, `CREATEROLE`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOREPLICATION`, `NOINHERIT` |
| Runtime | `factact_runtime` |
| OIDC minter | `factact_oidc_session_minter` |
| Executor | `factact_registry_executor` |

接続後、Migration Principalで次をread-only確認する。

```sql
select current_database(), current_user, current_setting('server_version_num')::integer;
select rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb,
       rolreplication, rolbypassrls, rolinherit
from pg_roles where rolname=current_user;
select current_setting('row_security');
```

STOP:

- 接続先Project / instance / databaseを一意に証明できない
- PostgreSQL 17でない
- Principal属性が上記と異なる
- `row_security`が`on`でない
- Migration credentialがServing revisionから参照可能

## 4. Empty database and Migration history gates

### 4.1 Before Migration

新規DBで次をread-only確認する。

- `supabase_migrations.schema_migrations`が存在しない、または0件
- `factact` / `factact_private`に想定外objectがない
- 想定外Role、extension、Policyがない
- 他用途のschemaやデータが見つからない

1件でも既存Migrationまたは業務objectがあればSTOPする。`migration repair`は使用しない。

### 4.2 After Migration, before seed

別途Goの後にSupabase CLI 2.117.0で34 Migrationを適用した場合だけ、次を確認する。

- local / remote Migration履歴が34/34一致
- 2回目の適用がNo-op
- FACTACT Tableが31件で、31/31 `ENABLE/FORCE ROW LEVEL SECURITY`
- 全31業務Tableが0件
- G3 Registry Preflightが`go: true`
- Executor所有関数7件
- Migration Principalとの関係が`ADMIN TRUE / SET FALSE / INHERIT FALSE`の1件だけ
- RuntimeとOIDC minterに管理membershipがない

このGateは「Migration履歴0」の初期DB Gateと、「Migration後34件・業務データ0」のseed直前Gateを混同しない。

## 5. Synthetic seed transaction

実装根拠は`tests/fixtures/database.ts`の`loadSyntheticSeedWithRls`と`tests/golden/g4-synthetic-staging-readiness.test.ts`である。同じDB session、同じtransactionで完結させる。

### 5.1 Preconditions

- Migration Principalの単一connectionを確保する
- `supabase/seed.sql`のSHA256を記録する
- seedが1 Tenantの決定的な前提データだけであることをレビューする
- Event、Work、Change、Relation、Audit outcomeがseedに含まれないことを確認する
- 8対象Tableが空であることを再確認する

### 5.2 Transaction sequence

1. `BEGIN`
2. transaction-localに対象Tenant IDを設定
3. `tenants`へ`id = factact.current_tenant_id()`の一時Policyを作成
4. 残り7 Tableへ`tenant_id = factact.current_tenant_id()`の一時Policyを作成
5. `supabase/seed.sql`を同一connectionで実行
6. 8個の一時Policyを同一transaction内でDROP
7. Policy残存ゼロ、投入件数、outcomeゼロを確認
8. `COMMIT`

対象Tableは次の8件だけである。

- `factact.tenants`
- `factact.operators`
- `factact.operator_roles`
- `factact.organizations`
- `factact.people`
- `factact.devices`
- `factact.services`
- `factact.contract_profiles`

Policy名は検証済みの`g4_synthetic_seed_migration_principal`を使用する。PolicyはMigration Principalだけを対象にし、Runtimeを含めない。

禁止:

- `DISABLE ROW LEVEL SECURITY`
- `NO FORCE ROW LEVEL SECURITY`
- `BYPASSRLS`
- superuser前提
- connection pool越しの複数session実行
- transaction外のPolicy作成、seed、Policy削除
- 対象8 Table以外への汎用Policy

### 5.3 Read-back before COMMIT

```sql
select count(*) from pg_policies
where policyname='g4_synthetic_seed_migration_principal'; -- must be 0

select count(*) from factact.join_events;  -- 0
select count(*) from factact.work;         -- 0
select count(*) from factact.changes;      -- 0
select count(*) from factact.relations;    -- 0
select count(*) from factact.audit_events; -- 0
```

期待するseed件数はTenant 1、Operator 1、Operator Role 3、Organization 1、Person 1、Device 1、Service 1、Contract 1である。`factact_private.operator_identities`もSynthetic identity 1件である。

### 5.4 Failure handling

任意のSQL、件数、Policy、RLS、Principal検証が失敗したら`ROLLBACK`し、再試行しない。別のread-only connectionから次を確認する。

- 8対象Tableが0件
- 一時Policyが0件
- Migration履歴は34件のまま
- Role、ACL、RLS状態がMigration直後と一致

結果がUNKNOWNならSTOPする。`migration repair`や手動DELETEで見かけ上の整合を作らない。

## 6. Synthetic E2E actor readiness

### 6.1 Locally proven

| Actor / boundary | Existing evidence | State |
|---|---|---|
| proposer | `registry-integrated-http.test.ts` | PASS |
| distinct reviewer | 同testの別Operator / verified session | PASS |
| unauthorized actor | Grantなし、失効Grant、別RecipientのRegistry tests | PASS |
| other Tenant actor | baseline、identity context、cross-Tenant Registry tests | PASS |
| Reviewer Return | propose → return → re-propose → confirm | PASS |
| Change → Verify → Commit | integrated HTTP / command Golden Tests | PASS |
| Audit | proposal 1、return 1、verify / commitをread-back | PASS |
| Policy STOP / drift | `registry-policy-activation-integration.test.ts` | PASS |
| error rollback | Grant失効、Audit failure、Finalization failure tests | PASS |

### 6.2 Hosted prerequisites still missing

`supabase/seed.sql`だけでは4 Actorを作らない。Hosted E2Eには次が別途必要である。

- proposerとreviewerに使用する、承認済みSynthetic Google identity 2件
- 権限なしActor用のSynthetic identity 1件
- 別Tenant actor用のSynthetic identity 1件
- identityごとのissuer / subjectとOperator / Tenant mapping
- proposerの`READ, UPDATE` Grant
- reviewerの`REVIEW, APPROVE` Grant
- unauthorized actorに対象Grantがないことのread-back
- 別TenantのService / Contract / Person fixture

実Google identityと通知先はローカルで確定できないためUNKNOWNである。値を推測してseedやGitへ書かない。Actor fixtureの投入方法はSQL／セキュリティレビューと別途Goが必要である。

## 7. Auth Proxy fixed conditions

G2の候補を次のとおり固定する。

```text
Cloud Run application
  -> 127.0.0.1:<explicit-port>
  -> Cloud SQL Auth Proxy v2 sidecar
  -> --private-ip
  -> Direct VPC egress
  -> approved pj-factact / asia-northeast1 Cloud SQL instance
```

Application configuration:

- `NODE_ENV=production`
- `DATABASE_CONNECTION_MODE=local-proxy`
- `DATABASE_SSL=false`（localhost hopだけ）
- Runtime / OIDC URLは両方`127.0.0.1`と明示portを使用
- Runtime usernameは`factact_runtime`
- OIDC usernameは`factact_oidc_session_minter`
- passwordを分離する
- Migration credentialをCloud Run revisionへ渡さない
- URI query / fragment、`sslmode`、`sslcert`、`sslkey`、`sslrootcert`を禁止

Proxy conditions:

- Cloud SQL Auth Proxy v2の承認済みimageをtagではなくdigestで固定
- `--private-ip`
- listenerを`127.0.0.1`だけにbind
- portをapplication URLと一致させる
- instance connection nameを`pj-factact:asia-northeast1:<approved-instance>`と完全一致させる
- IAM DB authenticationは使用しない（PostgreSQL built-in credentialを維持）
- serving Service Accountには対象instance限定のCloud SQL Client条件だけを付与
- High以上の脆弱性に承認済み対応がなければSTOP

ApplicationはHTTP listen前にRuntime Role、OIDC minter Role、schema readinessを実DB接続で検証する。Proxy未起動、接続先誤り、credential誤り、Role誤り、Migration不足ではstartupが失敗し、trafficを受けない。

## 8. Local versus GCP evidence

| Condition | State |
|---|---|
| explicit local Proxy mode | PASS |
| production direct mode verified TLS維持 | PASS |
| remote endpoint / missing port / URI TLS override拒否 | PASS |
| Runtime / OIDC pool分離 | PASS |
| startup DB Role / schema fail-closed | PASS（code / existing tests） |
| Private IP / Direct VPC egress | UNKNOWN（GCP required） |
| instance-limited IAM Condition | UNKNOWN（GCP required） |
| Proxy image digest / vulnerability scan | UNKNOWN |
| sidecar startup / health / Cloud Run container dependency | UNKNOWN（GCP required） |
| connection name / instance identity read-back | UNKNOWN（GCP required） |
| Migration credential absent from revision | UNKNOWN（GCP required） |

## 9. Execution evidence to retain

G5実行時は秘密情報を除外して次を保存する。

- Project、region、instance connection name、database名
- Principal属性とRole membership read-back
- Proxy image digest、scan結果、引数、listener address
- Migration CLI version、34/34履歴、2回目No-op
- seed SHA256、開始・終了時刻、投入件数、一時Policy 0件
- 31/31 ENABLE/FORCE RLS
- Runtime / OIDC current_user read-back
- E2EのChange / Evidence / Audit IDと期待status
- STOP / drift / unauthorized / cross-Tenant拒否結果
- rollback時の残存件数0と履歴整合

credential、Secret value、token、実メールアドレスは証跡へ出力しない。

## 10. Current decision

- Git Fit/Gap: GitHub HEADとこのworktreeは一致。`6fcf93c`はUNKNOWN
- Synthetic seed Runbook: COMPLETE locally
- Synthetic E2E logic: PASS locally
- Hosted E2E actor provisioning: UNKNOWN
- Auth Proxy application mode: PASS locally
- Auth Proxy / network / IAM runtime: UNKNOWN
- Billing link / required APIs: BLOCKED by external Billing quota
- Hosted Migration / Deploy: **No-Go**

Billing quota解除だけでHosted実行Goにはならない。レビュー、G2 read-back、実Principal、空DB、Proxy digest、Synthetic identities、個別Goをすべて満たしてから開始する。
