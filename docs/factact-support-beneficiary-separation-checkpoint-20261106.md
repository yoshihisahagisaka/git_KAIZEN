# FACTACT SUPPORT｜Caller / Beneficiary 分離実装チェックポイント（2026-11-06）

Status: **Draft implementation and isolated DB verification; no production migration, deployment, external Actor grants, or release approval.**

## Canonical 継承

- `docs/99-ai-development-context.md` §§12,15、`docs/02-domain-model.md` の Tenant / Organization / Service / Contract / Service Recipient を継承する。SONIXの会員企業ごとにTenantを作らない。
- `docs/support-service-affiliation-registration-fit-gap-20261105.md` の共通受付を維持。Callerの所属は本人の申告・受付情報であり、実際の受益企業や契約適格性、Read Authorityではない。
- 先行 Draft PR #25 の `isExplicitlyAuthorized` は独立の認可Kernelで、永続化GrantやAPIへ未接続。先行 Draft PR #26 の Organization Service Recipient は企業単位の役割表現のみ。

## このスライスで実装

- `supabase/migrations/20261106001500_support_beneficiary_decisions.sql`: SUPPORT Eventごとに `CONFIRMED` / `CLEARED` をappend-onlyで記録。確認前・解除後は「未確認」。理由、担当者、時刻、requestId、revisionを保存。FORCE RLS、insert-only、Tenant+Service+型付きRecipientの複合外部キーで他Tenant・他Service・Personの誤結合を拒否。
- `SupportCommands.recordBeneficiary`: 既存active Service/ContractとSupport Execute Roleを再検証。Event行をlockし、revisionを比較して冪等性を判定。確認時に既存 Organization Service Recipient を作成／再利用し、監査イベントを同一Transactionで記録。申告された所属から自動付与しない。
- `POST /api/support/:id/beneficiary`: strict Schema、session／Origin／CSRF既存境界を継承。`CONFIRMED` は Organization UUID と確認根拠、`CLEARED` は解除理由を必須化。
- `SupportQueries.detail` と内部SUPPORT詳細画面: Caller所属をそのまま表示しつつ、**今回の支援対象企業**を別表示。オペレーターが明示的に確認・訂正・解除でき、対応履歴へ記録する。既存 `support_events.service_recipient_id` / `work.service_recipient_id` の Person参照、JOIN・SUPPORT一覧／履歴／WorkのFKは変更しない。

## 守る境界・未実装Gate

- 本スライスの「確認済み」は**担当者による支援対象の同定記録**であり、サービス加入・契約・代理権・同一企業からのアクセスの保証ではない。
- 単独のOrganization Service Recipientや本確認履歴を、閲覧／編集／検索／Work更新の認可Grantへ変換しない。
- 外部顧客／委託先Actorは引き続き禁止。次の依存作業は、Identity→明示的Grant→Tenant/Service/Recipient/Work単位のfail-closed Query/Command/Exploreフィルタと、複数Tenant Context選択の限定技術Decision。
- 外部フォーム、共有手順書・管理表の権限付き編集と顧客A/BのE2E隔離は初期リリースの未完了範囲。SONIX開始予定を理由に後続リリースへ先送りしない。

## 検証とGate

- `tests/golden/support-beneficiary.test.ts`: Caller ≠ Beneficiary、訂正／解除履歴、冪等／stale／入力不備、他Tenant拒否、型・Service FK、監査失敗rollback、RLSとinsert-only、API session／Origin／CSRF／strict schema。
- `npm run typecheck`: PASS。`npm test`: 29 PASS / 3 files。`npm run test:db`: 131 PASS / 7 files（再実行時）。最初の全DB回帰では131件のアサーションが通過した一方、既知のembedded PostgreSQL test teardownで接続終了 `57P01` が1件発生しコマンドExit 1となった。再実行はExit 0。fixtureの終了時不安定性は別途監視する。
- 本番DB Migration、実環境権限付与、PR Merge、デプロイは実行しない。実DBの適用と外部公開は別途Go/No-Goを取得する。
