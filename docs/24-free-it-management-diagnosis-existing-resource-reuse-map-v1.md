# 無料 IT経営診断 Existing Resource Reuse Map v1.0

Status: **CANONICAL IMPLEMENTATION REFERENCE**

この文書は、無料 IT経営診断のMVP実装において、既存の atLIB 実装資産をどこまで再利用し、どこを新Canonicalに合わせて置換するかを定義する。

設計SSOTは `yoshihisahagisaka/git_KAIZEN` の `17`〜`23` とする。実装資産の主な再利用元は `yoshihisahagisaka/atlib-sales-tools`、LP導線は `yoshihisahagisaka/atlib-corporate-site` とする。

> **Reuse First. Canonical First.**
>
> 既存コードを最大限再利用する。ただし、現行Canonicalと衝突する旧スコアリング・成熟度的評価・自動サービス提案は引き継がない。

---

## 1. 結論

無料IT経営診断をゼロから別システムとして作り直さない。

`atlib-sales-tools` に存在する以下の基盤を再利用する。

- Express / TypeScript のアプリケーション基盤
- PostgreSQL / migration runner
- `public/` の静的HTML配信
- `public/admin/` の管理画面配信
- Google Workspaceベースのスタッフ認証
- 管理APIの認証Gate
- IP Rate Limit
- LPからのCORS付きリード受付
- Mailer
- Slack notification
- PostgreSQL repository pattern
- 既存CSS / UI component style
- 公開フォーム → 管理一覧 → 詳細 → スタッフ代理入力、という画面骨格

ただし、旧 `kaizen_diagnostics` の回答・スコア中心モデルを新DiagnosisCaseの正本にはしない。

新Canonical用のDiagnosis Domainテーブル/APIを追加し、旧機能とは並行稼働させながら移行する。

---

## 2. Repository Role

### `git_KAIZEN`

役割：設計・実装Canonical / SSOT。

参照必須：

- `17-it-management-kaizen-business-service-canonical-v1.md`
- `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
- `19-free-it-management-diagnosis-channel-flows-v1.md`
- `20-it-management-kaizen-factact-consistency-principles-v1.md`
- `21-free-it-management-diagnosis-operating-model-v1.md`
- `22-free-it-management-diagnosis-development-canonical-v1.md`
- `23-free-it-management-diagnosis-implementation-spec-v1.md`
- 本文書

### `atlib-sales-tools`

役割：実装先・既存稼働資産の主な再利用元。

現状すでに以下を持つ。

- `/kaizen-diagnostic.html`
- `/admin/kaizen-diagnostic.html`
- `/admin/kaizen-diagnostic-detail.html`
- `/admin/kaizen-diagnostic-new.html`
- `/api/kaizen-diagnostic/*`
- `/api/admin/kaizen-diagnostic/*`
- PostgreSQL migration / repository / auth / mail / Slack

### `atlib-corporate-site`

役割：LP / 流入入口。

`public/joshisu-kaizen/index.html` が既存LP。既存 `atlib-sales-tools` の `request-link` APIとの接続資産を再利用可能。

---

## 3. Reuse Classification

### A. KEEP / REUSE AS-IS OR WITH MINIMAL CHANGE

以下は原則再利用する。

#### Application / infrastructure

- `src/server.ts` のExpress bootstrap
- PostgreSQL pool / migration runner
- `requireStaffAuth` / `StaffAuthService`
- `/admin` static配信の認証保護
- IP rate limiter
- pino structured logging
- Mailer infrastructure
- Slack notifier
- Cloud Runを前提とした `trust proxy`

#### UI foundation

- `public/css/style.css`
- 既存card / form-row / button / table等のスタイル
- 公開フォームの会社名・担当者・メール・電話入力
- Query parameterからの会社名・氏名・メール事前入力
- 質問をAPIから取得して動的描画する仕組み
- 送信中disable / error表示 / success表示
- 管理一覧 → 詳細のnavigation
- スタッフ代理入力画面の骨格

#### Operational integration

- Google Workspace認証済みstaff admin運用
- 新規回答時のSlack通知という運用パターン
- LPから診断リンクをメール送信するパターン

---

## 4. MODIFY AND REUSE

### `public/kaizen-diagnostic.html`

骨格を再利用し、以下を変更する。

旧：

- 情シスKAIZEN診断
- 8領域棚卸し
- 3軸レーダーチャート前提
- 全質問一括submit

新：

- 無料 IT経営診断
- 提供会社：`atLIB株式会社`
- Future First
- 9問＋任意自由記述
- 「分からない」を正式回答
- Case作成 → Survey開始 → 回答逐次保存 → Complete
- 顧客会社名表示は `〇〇株式会社様`
- スコア・成熟度・即時診断結果を表示しない

既存のcontact form、dynamic question render、prefill、error/success UXは再利用する。

### `public/admin/kaizen-diagnostic.html`

一覧画面のtable/filter骨格は再利用する。

旧中心項目：

- cost / risk / attrition score
- urgent / visibility flag
- suggested service
- review_status

新中心項目：

- Diagnosis Case status
- Next Action
- 顧客会社名（表示時 `様`）
- Entry Channel
- 担当者
- Future概要
- Survey status
- 診断予定
- Assessment status

旧スコア列は新診断一覧から除外する。

### `public/admin/kaizen-diagnostic-new.html`

スタッフ代理入力の画面骨格は再利用する。

旧：回答送信直後にスコア/結果シートへ遷移。

新：

- `entry_channel = SALES_VISIT`
- 顧客発言としてのSurveyResponseを代理入力
- `entered_by_user_id / staff` を記録
- AI/FACTへの自動変換なし
- Slice 1ではSurvey完了まで

axis chip等は削除する。

### `public/admin/kaizen-diagnostic-detail.html`

detail/reportのレイアウト、顧客情報、staff-only管理領域、印刷/PDF/PPTX導線の骨格は将来再利用可能。

ただし以下は削除・置換対象：

- radar chart
- cost/risk/attrition normalized score
- rule-based warning
- suggested services
- rule-based comments
- 「特筆すべき弱点はない」等の自動断定

新detailはCase Overview / Preparation / Review / Reportへ役割分割する。

---

## 5. DO NOT REUSE AS CANONICAL SEMANTICS

### `src/domain/kaizenDiagnostic.ts`

旧質問・配点・軸・サービス推薦ロジックは新診断の意味論として再利用しない。

特に以下は廃止対象：

- `AxisId = cost | risk | attrition`
- option `score`
- `suggestedServices`
- `actionHint`
- `securityUrgent`
- `scoreSubmission`
- `buildSheetComments`
- score-based flags

ただし、TypeScript + zodで質問定義/validationを一元化する実装パターン自体は再利用してよい。

### `kaizen_diagnostics` table

旧tableは削除・破壊変更しない。既存回答の保存・参照のためlegacyとして維持する。

旧tableの以下は新Canonicalの正本にしない。

- answers JSONB一括snapshotのみ
- scores JSONB
- suggested_services JSONB
- `review_status = new/contacted/closed`
- converted_to_assessment booleanをCase lifecycleの代替にする設計

新Canonicalは別テーブルとしてDiagnosisCase / SurveyResponse / Future等を追加する。

---

## 6. New Canonical Persistence to Add

`atlib-sales-tools` 内に新しいmigrationを追加する。

Slice 1で最低限追加：

- `organizations`
- `diagnosis_cases`
- `participants`
- `participant_roles`
- `survey_questions`
- `survey_responses`
- `diagnosis_futures`
- `case_transitions`
- `diagnosis_audit_logs`

既存 `kaizen_diagnostics` からの即時data migrationはSlice 1では行わない。

旧レコードと新Caseを同一テーブルへ無理に統合しない。

---

## 7. New API Strategy

既存 `/api/kaizen-diagnostic` endpointを全面的に意味変更すると既存LP/運用を壊す恐れがある。

したがってMVP移行中は、新Canonical用API namespaceを追加することを推奨する。

推奨：

- `POST /api/it-management-diagnosis/cases`
- `POST /api/it-management-diagnosis/cases/:id/survey/start`
- `GET /api/it-management-diagnosis/cases/:id/survey`
- `PUT /api/it-management-diagnosis/cases/:id/survey/responses/:questionCode`
- `POST /api/it-management-diagnosis/cases/:id/survey/complete`

Admin：

- `GET /api/admin/it-management-diagnosis/cases`
- `GET /api/admin/it-management-diagnosis/cases/:id/overview`

旧APIは移行完了までlegacyとして残す。

---

## 8. LP / Entry Reuse

`atlib-corporate-site/public/joshisu-kaizen/index.html` は現行の流入資産として存在する。

Slice 1の実装では、LP全体を先に作り直す必要はない。

既存のCTA / リードフォーム / 診断リンク送信導線を活かし、リンク先のみ新診断フォームへ段階的に切り替えられる構造を採用する。

LPの事業メッセージをIT経営KAIZENへ変更する必要がある場合はBusiness Laneで扱う。本Development Laneでは勝手にBusiness messageを変更しない。

---

## 9. Authentication / Security Reuse

### Staff

既存Google Workspace staff authを再利用する。

- `/api/admin/*` は `requireStaffAuth`
- `/admin/*` static HTMLも認証Gateより後で配信

この順序は維持する。

### Customer

既存公開フォームは無認証 + Rate Limitである。

新Slice 1では途中保存・再開が必要なため、Case単位のunguessable access tokenを追加する。

- raw tokenは顧客へ渡す
- DBはtoken hashのみ保存
- Case単位
- revoke可能

これは既存staff authとは分離する。

---

## 10. Notification Reuse

既存Slack / mail infrastructureを再利用できる。

ただしSlice 1で必須なのは診断本体の成立であり、通知失敗でCase作成/Survey完了をrollbackしない。

通知はbest effortまたはout-of-transactionとする。

通知文の提供会社表記は `atLIB株式会社` を使用する。

---

## 11. Migration Safety

移行は破壊的置換にしない。

1. 新Canonicalテーブル/API追加
2. 新フォームを新APIへ接続
3. 新Admin一覧/overviewを新APIへ接続
4. LPリンク先を新フォームへ切替
5. 実顧客でEnd-to-End確認
6. 旧 `/kaizen-diagnostic*` をlegacy/read-only化するか判断

旧データは保持する。

新Canonicalのために旧migrationをrewriteしない。

---

## 12. Slice 1 File-Level Reuse Map

| Existing resource | Decision | Slice 1 action |
|---|---|---|
| `atlib-sales-tools/src/server.ts` | REUSE | 新public/admin routerを追加してmount |
| `src/routes/kaizenDiagnostic.ts` | REFERENCE / LEGACY | CORS, rate-limit, mail/Slack patternを再利用。score logicは使わない |
| `src/routes/adminKaizenDiagnostic.ts` | REFERENCE / LEGACY | staff auth下のlist/detail patternを再利用 |
| `src/domain/kaizenDiagnostic.ts` | DO NOT REUSE SEMANTICS | zod/definition patternのみ参考。axis/score/service logicは廃止 |
| `src/services/kaizenDiagnosticRepo.ts` | REFERENCE | pg repository patternを再利用。新Diagnosis repoを作成 |
| `migrations/005_kaizen_diagnostics.sql` | KEEP LEGACY | 変更しない。新migrationを追加 |
| `public/kaizen-diagnostic.html` | MODIFY / REUSE | 新無料IT経営診断フォームへ転用 |
| `public/admin/kaizen-diagnostic.html` | MODIFY / REUSE | Next Action中心のCase listへ転用 |
| `public/admin/kaizen-diagnostic-new.html` | MODIFY / REUSE | SALES_VISIT proxy inputへ転用 |
| `public/admin/kaizen-diagnostic-detail.html` | PARTIAL REUSE | detail骨格のみ。score/radar/service proposal削除 |
| `public/css/style.css` | REUSE | 基本UI style継続 |
| Staff Google auth | REUSE | admin保護継続 |
| Rate limiter | REUSE | public create/saveへ適用 |
| Mailer / Slack | REUSE | best effort通知 |
| `atlib-corporate-site/public/joshisu-kaizen/index.html` | REUSE ENTRY | CTA/LP資産を段階移行 |

---

## 13. Slice 1 Codex Handoff Preconditions

Codexへ実装を依頼する前に以下が揃っていること。

- `17`〜`24`をSSOTとして指定
- 実装repository = `yoshihisahagisaka/atlib-sales-tools`
- existing resource reuseを優先
- legacy `kaizen_diagnostics` を破壊しない
- 新migrationを追加
- 新API namespaceを追加
- UIは既存HTML/CSSを再利用
- score/radar/service suggestionを新診断へ持ち込まない
- 既存staff auth / rate limit / mail / Slack patternを再利用
- testsを追加
- Slice 1 Acceptance Criteriaを満たす

---

## 14. Non-Goals

Slice 1では以下をしない。

- 旧診断データ全件migration
- 旧diagnostic endpointの削除
- AI-01以降
- Human Review
- Report
- FACTACT integration
- Business LP messageの全面改訂
- score/radarの新Canonicalへの移植

---

## 15. Principle Check

本Reuse方針は以下を満たす。

- **FACT FIRST** — 旧scoreをFactとして持ち込まない
- **AI Suggests. Human Decides. System Records.** — 後続AI責任境界を壊さない
- **Web First. Same Method. Different Entry.** — 公開フォームとstaff proxy inputを共通Case modelへ載せる
- **KAIZENするために、KAIZENのための仕事を増やさない。** — 稼働済み基盤を再利用する
- 無料診断を簡易Assessment化しない

