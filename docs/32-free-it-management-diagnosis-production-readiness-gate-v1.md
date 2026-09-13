# 無料 IT経営診断 Production Readiness Gate v1.0

Status: **IMPLEMENTATION / VALIDATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP Vertical Slice 1〜6 完成後に、一般顧客へ提供可能かを判定するための **Production Readiness / Pilot Readiness Gate** である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、検証・必要最小限の修正先は `yoshihisahagisaka/atlib-sales-tools` とする。

基準実装：`atlib-sales-tools/main` commit `2c81a0b1ad354ced710884a36998c32497dd9237`

本Gateは新しい機能Sliceではない。目的は「機能を増やすこと」ではなく、**現在のMVPを実環境で安全に運用できることをEvidence付きで証明し、Go / Conditional Go / No-Goを判定できる状態にすること** である。

> **FACT FIRST.**
>
> **AI Suggests. Human Decides. System Records.**
>
> **分からないことを、分かったことにしない。**
>
> **Production Readinessも、推測ではなくEvidenceで判定する。**

---

## 1. 最初に読むSSOT

最低限 `docs/17`〜`docs/32` の無料診断関連Canonical / completed handoffを確認する。

実装側では少なくとも `.env.example`, `Dockerfile`, `package.json`, `migrations/runner.ts`, `src/config.ts`, `src/db/pool.ts`, `src/server.ts`, AI-01〜AI-04 Worker / Provider, Google Workspace認証, staff auth middleware, diagnosis logging / rate limit, Slice 1〜6 tests を確認する。

矛盾・不足がある場合は、コードで勝手にBusiness仕様を変えない。

---

## 2. 作業branch

実装先：`yoshihisahagisaka/atlib-sales-tools`

base：`main` @ `2c81a0b1ad354ced710884a36998c32497dd9237`

branch：`feat/it-management-diagnosis-production-readiness`

mainへはmergeせずレビュー待ちにする。

---

## 3. Required Deliverables

1. `docs/it-management-diagnosis-production-readiness.md`
   - Gate matrix
   - Evidence
   - PASS / FAIL / BLOCKED_EXTERNAL / BUSINESS_DECISION_REQUIRED
   - Open findings
   - Go / Conditional Go / No-Go recommendation
2. 必要なsmoke / concurrency / production-hardening tests
3. 必要最小限のproduction-hardening修正
4. deployment / migration / rollback / incident runbook
5. WEB / SALES_VISIT pilot E2E結果
6. 全Slice回帰結果
7. 最終commit SHA

Readinessと無関係な新機能、Business仕様変更、Secret commitは禁止する。

---

## 4. Gate A — Build / Runtime Artifact

確認：clean checkoutから `npm ci`, build, Docker build, runtime起動, `/healthz` 200, static/admin asset, Node 20, production image dependency, Secret非露出。

### 必須論点

現状のruntime imageは `npm ci --omit=dev` で `dist` と `public` のみをcopyする。一方、migration commandは `ts-node` と `migrations/*.sql` を利用する。

したがって、本番migrationをruntime service container内で実行できる前提にしてはならない。既存運用を調査し、deploy前専用migration job / CI step / migration artifact等、安全で再現可能な方式を明確にする。service startup時の自動migrationへ安易に変更しない。

---

## 5. Gate B — Migration / Database Safety

実PostgreSQLで最低限：

- 空DBから全migration適用
- existing DB / production clone相当へadditive migration適用
- `schema_migrations` 整合
- transaction rollback
- runner再実行
- legacy table/API保持
- app起動とSlice smoke

Rollbackは無理にdown migrationを作らず、deploy前backup/snapshot、restore、app revision rollback、schema/app互換条件をrunbook化する。

Cloud SQL backup/PITR等repo外設定を確認できなければ `BLOCKED_EXTERNAL`。

---

## 6. Gate C — Environment / Secrets

`.env.example` / `src/config.ts` からproduction config inventoryを作る。

最低限 NODE_ENV, PORT, GCP_PROJECT_ID, DB/Cloud SQL socket, SMTP, PORTAL_BASE_URL, Google OAuth client, STAFF_JWT_SECRET, notification, Slack optional, ANTHROPIC_API_KEY。

確認：SecretがGitにない、Secret Manager/secret injection、必須Secret fail-fast、AI key未設定時の非AI機能、production URL/OAuth redirect。

Secret値そのものを記録しない。

---

## 7. Gate D — Real Anthropic AI-01〜AI-04

安全なstaging test dataで実API疎通を行う。

- AI-01 Pre-Diagnosis Organizer
- AI-02 Interview Assistant
- AI-03 Post-Diagnosis Structurer
- AI-04 Report Draft Generator

各1回以上成功させ、structured output、ref validation、Human Gate、timeout/failure、invalid output、late result、logのSecret/Raw data露出を確認する。

production customer dataでlive testしない。

---

## 8. Gate E — Google Workspace Auth / Authorization

実OAuthで：

- `/admin/*`, `/api/admin/*` 未認証拒否
- atlib.jp正常ログイン
- 非許可account拒否
- OAuth state / redirect URI
- logout/session expiration
- Secure/HttpOnly/SameSite cookie
- customer tokenでadmin API不可
- mutation command header / cross-site guard

を確認する。

---

## 9. Gate F — Cloud Run / Worker Execution Model

現在AI-01〜AI-04 WorkerはWeb process内で約5秒pollする。

必ず以下を確認する：

- request終了後のCPU allocation
- min instances / scale-to-zero時queue latency
- multi-instance重複claim
- deploy/shutdown中のRUNNING lease recovery

Cloud Run設定がrepo外なら `BLOCKED_EXTERNAL` とし、必要な設定/確認コマンドを書く。

必要なproduction-hardeningは最小限にし、AI責任境界を変えない。

---

## 10. Gate G — PostgreSQL Concurrency / Worker Lease

PGLiteだけでなく実PostgreSQL・複数connection/worker相当で：

- one execution one claim
- SKIP LOCKED
- process type isolation
- stale lease recovery
- late result guard
- optimistic version conflict
- concurrent Human command
- rollback
- report/handoff immutable trigger

を再現可能なtestで固定する。

---

## 11. Gate H — Security / Privacy

最低限：rate limit, admin auth order, mutation guard, SQL parameterization, untrusted AI input, XSS, customer access token hash/scope/revoke, PII/raw statement/transcript logging, secret logging, Raw Source access, snapshot/audit tamper resistance。

### Business Decision Required

Retention/deletion期間、顧客データ削除要求、Transcript/SourceRecord retention等がCanonical未決定ならCodexが勝手に期間を決めない。`BUSINESS_DECISION_REQUIRED` として判断事項と選択肢を報告する。

---

## 12. Gate I — Observability / Operations

運用者が service up/down, DB failure, AI worker failure, PENDING/RUNNING滞留, AI FAILED reason, notification failure, auth anomaly, migration version を把握できること。

必要なら秘密情報を含まないstructured log/read-only query/runbookを追加する。Cloud Monitoring等repo外は `BLOCKED_EXTERNAL`。

---

## 13. Gate J — Backup / Restore / Incident Runbook

runbookに deployment, migration, rollback, Cloud SQL restore, app revision rollback, stuck AIExecution recovery, AI outage時Human-only, Google OAuth障害, SMTP/Slack failure, incorrect report/handoffのversioning対応, security incident escalation を含める。

---

## 14. Gate K — Pilot E2E

本番相当staging・テスト会社データで2経路を完走する。

### WEB
Application → Survey → AI-01 → Preparation → Workspace → AI-02 → AI-03 → Human Review → AI-04/Report → Deliver → Feedback → Assessment → Handoff → Transfer → Close

### SALES_VISIT
Sales proxy input → 同じData Model / Method → 以降同一フロー → Close

確認：Web First. Same Method. Different Entry、会社名+様、atLIB株式会社、Fact/Hypothesis/UNKNOWN、Audit continuity、権限境界、notification、Report、Handoff semantics。

---

## 15. Performance / Practical Limits

長いTranscript/SourceRecord、AI context、連続Case、同時admin操作、report print、DB pool max=5とCloud Run concurrency/instance数の組み合わせを確認する。大規模load testは必須ではないがpilotで破綻する設定は解消する。

---

## 16. Go / No-Go

### GO
Critical GateすべてPASS、external config Evidence確認済み、重大security/privacy blockerなし、WEB/SALES E2E PASS、rollback/runbook準備済み。

### CONDITIONAL GO — Pilot only
非Critical残課題のみで、workaround/owner/due dateが明確かつpilot範囲を限定できる。

### NO-GO
migration/restore不能、重大auth defect、Secret/PII漏洩、Worker実行保証なし、AIがHuman Gate越境、concurrencyによる状態破壊、approved Report/Handoff immutability破壊、E2E未完走、Critical Business Decision未解決のいずれか。

severityを下げてPASSに見せない。

---

## 17. Initial Repository Audit Facts

Codexは再確認すること。現時点repoから読み取れる初期Fact：

- Cloud Run / Cloud SQL Unix socket前提の実装がある。
- production SecretはSecret Manager / secret injection前提。
- runtime Docker imageはdevDependenciesを除外する。
- migration runnerはTypeScript + ts-nodeとSQL filesを利用しtransaction単位で適用する。
- DB Pool maxは1 processあたり5。
- AI-01〜AI-04 WorkerはWeb process内pollerとして起動する。
- `/healthz` が存在する。

これらを「本番設定済み」と推測しない。repo外GCP設定はEvidenceがなければ `BLOCKED_EXTERNAL`。

---

## 18. Completion Report Format

1. Executive verdict — GO / CONDITIONAL GO / NO-GO
2. Latest commit SHA
3. Files changed
4. Gate matrix A〜K + Result + Evidence
5. Critical findings fixed
6. Open findings — severity / owner / action
7. External blockers
8. Business Decision Required
9. Migration rehearsal
10. Rollback / restore rehearsal
11. Real AI-01〜04
12. Google OAuth
13. PostgreSQL concurrency
14. Security/privacy
15. Observability/runbook
16. WEB E2E
17. SALES_VISIT E2E
18. Full regression
19. Canonical deviations
20. Recommended next action

実環境権限/Secretがなく実行不能な項目を成功扱いにせず `BLOCKED_EXTERNAL` と明記する。

---

## 19. Definition of Done

> **Product OwnerがEvidence付きGate matrixを見て Pilot / Production投入のGo/No-Goを判断できること。**

そこまで到達したら `feat/it-management-diagnosis-production-readiness` へcommit・pushし、mainにはmergeせずレビュー待ちにする。
