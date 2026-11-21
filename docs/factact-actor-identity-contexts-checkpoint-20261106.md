# FACTACT｜OIDC Identity → 複数Tenant Context候補の実装チェックポイント（2026-11-06）

Status: **Draft persistence and read-only membership enumeration; not released or externally enabled.**

## 引継ぎ・Fit

- `docs/adr/0002-identity-session-authority.md` のGoogle OIDC／PKCEと明示的な`issuer,subject` binding、8時間Session、Origin／CSRF、Active Operator/Tenant検証を維持。
- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` のAC-01／AUTH-G2。Actor Neutralityは確定。TenantとSONIX会員企業は別概念で、会員企業ごとにTenantは作らない。
- `docs/factact-scoped-actor-grants-persistence-checkpoint-20261106.md` の権限判定は別。MembershipだけではSUPPORT／JOIN／ExploreやRegistry／文書の許可は与えない。
- 技術判断の留保は`docs/adr/0008-verified-actor-context-memberships.md`（**Proposed**）に限定記録。既定のBusiness Decisionを変更しない。

## 実装

1. `supabase/migrations/20261106001700_actor_identity_contexts.sql`：private `operator_identities`の一意性をIdentity+Tenantに拡張し、Active/Revoked、明示的login default、失効日時／理由を追加。旧単一Tenant bindingはdefaultを保持し、複数のActive defaultはunique indexで拒否する。
2. 従来の`resolve_identity`は**Activeな既定Contextの1件のみ**返す。無効なIdentity、defaultなし、revoked、inactive Operator／Tenantではnull。ログイン時に複数候補の先頭行を選ばない。
3. `resolve_identity_contexts`（private SECURITY DEFINER）と`PgIdentityStore.verifiedIdentityContexts`は、OIDC callbackで確認されたissuer/subjectを入力としてActive候補のみ返す。runtimeのprivate table直接SELECT／Mutationを許さない。HTTP routeには未接続。
4. `supabase/seed.sql`と既存ローカル`scripts/bind-operator.ts`を互換更新。Seedの`.invalid` issuerはログイン不可のまま。メール・所属・Roleの自動結合なし。

## 重要な未実装Gate

- **Contextを切り替えるSessionはまだない。** 既存のsessionは単一`tenant_id,operator_id`で、Identityを保持しない。Context候補をclientへ渡すAPIも未作成。Session tokenとCSRFのローテーション、候補再照合、未許可Tenant拒否を実装する必要がある。
- **Membership失効後の既存session無効化は未実装。** 現時点の`authenticateSession`はOperator/TenantのActiveを検証するが、Identity membership失効を照合しない。初期リリースの失効E2E Gateとして残す。
- 顧客／外部Actorの安全な登録・admin監査付き失効、Provider選択、Grant管理、各APIのScoped Query/Command/Exploreフィルタ、外部UI／Public受付、顧客A/B隔離とレビューは未完了。
- 本番Migration、外部ユーザー登録、権限発行、Session切替、外部公開、マージ、デプロイは実施しない。

## Verification

`tests/golden/actor-identity-contexts.test.ts`：単一Tenant後方互換、同一Identityの2 Tenant membership、既定Context一意、inactive/revoked排除、issuer/subject完全一致、Tenant複合FK、private table直接アクセス拒否の7テスト。

- `npm run typecheck`：**PASS**
- `npm test`：**29 PASS / 3 files**
- `npm run test:db`：**149 PASS / 9 files（Exit 0）**
