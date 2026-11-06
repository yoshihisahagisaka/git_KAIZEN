# FACTACT｜Scoped Actor Grant 永続化・参照のチェックポイント（2026-11-06）

Status: **Draft implementation; isolated database verification. No API/route enforcement, external Actor enrollment or production migration.**

## Canonical / 既存DecisionとのFit

- `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md`、`docs/factact-scoped-access-kernel-checkpoint-20261106.md`、`docs/02-domain-model.md` を引き継ぐ。Actor、Caller、Service Recipient、Work Ownerは別の概念。Role、所属、Work Ownerで権限を自動付与しない。
- `docs/99-ai-development-context.md` に従い Tenant ≠ 顧客Organization。SONIXの各会員企業をTenantとして生成せず、同一Tenant／Service内でRecipientごとに隔離する。
- `docs/adr/0002-identity-session-authority.md` の現行Google OIDC→Tenant Operator認証、内部専用Read Authority v1を変更しない。外部ActorのIdentity/Enrollment、複数Tenantの選択は独立の技術Decision待ち。
- `docs/factact-support-beneficiary-separation-checkpoint-20261106.md` の確認履歴を利用する。「確認済み支援先」は認可権限そのものではなく、Workの実際の帰属を検証するための情報。

## 今回実装した範囲

1. `supabase/migrations/20261106001600_scoped_actor_grants.sql` に `factact.scoped_actor_grants` を追加。Actor（現段階ではTenant Operator ID）、Tenant、Service、Contract Profile、Scope（SERVICE／SERVICE_RECIPIENT／WORK）、Object Kind、Operation、期間、失効状態、付与者、失効者、失効理由を記録する。
2. Contract Profile、Service Recipient、Workへの複合FKで、Grant自体が別Tenant／Service／Contractの実体を指せないようにする。Scopeの整合、操作種別、空・NULL操作、失効監査フィールドはDB CHECKで拒否。FORCE RLS／Tenant Policy、runtime roleにSELECTのみ許可。付与・失効操作は監査付きの別途レビュー対象で、現段階ではruntimeから実行不可。
3. `PgScopedAccessReader` はread-onlyのTenant Transactionで、Active Actor／Tenant／Service／Contractと有効日付、RecipientのActive状態、Workの実際のService／Contract／Recipient帰属をDBから照合し、永続化Grantを既存の純粋な `isExplicitlyAuthorized` に渡す。呼び出しごとに失効を再確認し、キャッシュしない。無効UUIDは拒否扱い。
4. SUPPORT Workだけは既存 `work.service_recipient_id` がCaller Personを指すため、別途そのEventの**最新**Beneficiary Decisionを照会する。未確認・CLEARED・異なるRecipientの場合はWork対象の参照を拒否する。Caller所属は代用しない。JOIN／CHANGEのWorkでは既存Recipient FKを照合する。

## Verify / 否定系

`tests/golden/scoped-actor-grants.test.ts` で以下を検証する。

- ADMINでもGrantが無ければ拒否／Caller Personや別Actorへの権限転用拒否。
- 同一Tenant／同一Service内の顧客AとBの相互隔離／操作・Object Kind・Scopeの一致。
- Service全体Grantは明示的に設定された場合のみ許可／Work限定GrantはRecipient全体に広がらない。
- Actor／Service／Contract／Recipient／Organization失効、Contract期限切れ、Grant期限切れ・即時失効で拒否。
- SUPPORT Workの未確認、支援先変更・解除後の拒否。Work/Contract/Serviceの実体不一致の拒否。
- DB FK、Scope/Operation CHECK、他Tenant RLS、runtime roleのINSERT／UPDATE／DELETE禁止。
- TypeScript typecheck、Domain unit、Golden DB回帰。

検証結果：`npm run typecheck` **PASS**、`npm test` **29 PASS / 3 files**、`npm run test:db` **142 PASS / 8 files**（再実行時Exit 0）。最初の全DB回帰は142件すべてPASSしたが、既知のembedded PostgreSQL teardown接続終了 `57P01` によりunhandled error / Exit 1。再実行は全件PASS / Exit 0。テストfixtureの終了時不安定性は別件で監視する。

## Initial-releaseの未完了Gate（今回の実装で完了扱いにしない）

1. **認証境界**：外部顧客・委託先ActorのIdentity登録／Account linking、複数TenantのMembership／選択方法はADR承認と実装が必要。いまは既存の内部Operator IDだけをActor参照とする。
2. **Grant管理**：監査・承認と同一Transactionの付与／失効Command、管理UI、初期Grant発行／委託先のScopeの定義は未実装。テストではprivileged fixtureが直接Insertするが、本番運用機能ではない。
3. **全エンドポイントの認可**：本Readerは意図的にHTTP公開しておらず、既存SUPPORT／JOIN／Explore／検索／件数／詳細／CSV／コマンド／Knowledgeをまだフィルタしない。内部Read Authority v1を外部に流用せず、SessionからActor/Tenantを、DBの実体からTargetを解決してから呼び出す。Client BodyのActor／Tenant／Grant／Recipientを信頼しない。
4. **顧客向けUI・Public受付**：外部Actor向けの編集・閲覧、RegistryとProcedureの権限付き編集、Public問い合わせ、顧客A/BのE2E拒否テストと本番Go/No-Goが未完了。SONIXに間に合わせる初期リリースに含め、別途進行する。

本番DBへのMigration、既存ユーザー権限変更、外部ログインの有効化、PR Merge、デプロイは実施しない。
