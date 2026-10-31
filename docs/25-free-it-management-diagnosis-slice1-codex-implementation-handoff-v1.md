# 無料 IT経営診断 Slice 1 Codex Implementation Handoff v1.0

Status: **IMPLEMENTATION HANDOFF — READY FOR CODEX**

この文書は、無料 IT経営診断 MVP の Slice 1（Case / Application / Survey）を Codex で実装するための実行指示書である。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装先は `yoshihisahagisaka/atlib-sales-tools` とする。

> **Reuse First. Canonical First.**
>
> 既存資産を最大限再利用するが、旧スコアリング・レーダーチャート・自動サービス提案・成熟度的評価は新Canonicalへ持ち込まない。

---

## 1. Codexが最初に読むSSOT

実装開始前に必ず以下を読む。

1. `git_KAIZEN/docs/17-it-management-kaizen-business-service-canonical-v1.md`
2. `git_KAIZEN/docs/18-it-management-diagnosis-assessment-boundary-sales-story-v1.md`
3. `git_KAIZEN/docs/19-free-it-management-diagnosis-channel-flows-v1.md`
4. `git_KAIZEN/docs/20-it-management-kaizen-factact-consistency-principles-v1.md`
5. `git_KAIZEN/docs/21-free-it-management-diagnosis-operating-model-v1.md`
6. `git_KAIZEN/docs/22-free-it-management-diagnosis-development-canonical-v1.md`
7. `git_KAIZEN/docs/23-free-it-management-diagnosis-implementation-spec-v1.md`
8. `git_KAIZEN/docs/24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md`
9. 本文書

矛盾がある場合、実装しやすい方を勝手に選ばない。上位Canonicalを優先し、解決不能なら変更せず報告する。

---

## 2. 実装対象Repository

Primary implementation repository:

- `yoshihisahagisaka/atlib-sales-tools`

LP / entry reference:

- `yoshihisahagisaka/atlib-corporate-site`

Slice 1ではLP全体のBusiness messageを書き換えない。

---

## 3. Slice 1 Goal

実顧客またはスタッフ代理入力で、以下をEnd-to-Endで成立させる。

```text
Web / Sales Visit
  -> Diagnosis Case create
  -> Survey start
  -> 9 required questions + optional free comment
  -> progressive save / resume
  -> Complete Survey
  -> Future(SURVEY_STATED) creation
  -> Diagnosis status = SURVEY_COMPLETED
```

Slice 1ではAI処理は実装しない。

---

## 4. Existing Resources to Reuse

### Keep / reuse

- Express / TypeScript application bootstrap in `src/server.ts`
- PostgreSQL pool / migration runner
- repository pattern
- Google Workspace staff authentication
- `/api/admin/*` auth gate
- `/admin/*` static auth protection order
- IP rate limiter
- pino logging
- Mailer / Slack notification pattern
- `public/css/style.css`
- existing public form card/form/button/error/success patterns
- query-param prefill pattern
- dynamic question loading pattern
- admin list/detail/new page navigation pattern

### Reference but do not reuse semantics

- `src/domain/kaizenDiagnostic.ts`
- `src/routes/kaizenDiagnostic.ts`
- `src/routes/adminKaizenDiagnostic.ts`
- `src/services/kaizenDiagnosticRepo.ts`
- `migrations/005_kaizen_diagnostics.sql`

From these, reuse implementation patterns only.

Do **not** reuse these old semantics:

- cost / risk / attrition axes
- score / normalized score
- radar chart
- `scoreSubmission`
- `suggestedServices`
- `actionHint`
- rule-based warning
- rule-based comments
- automatic service recommendation

Do not delete or rewrite the legacy `kaizen_diagnostics` table in Slice 1.

---

## 5. New Persistence

Add a new migration after existing migrations. Do not rewrite old migration files.

Minimum new tables:

### organizations

- `id UUID PK`
- `name TEXT NOT NULL`
- `corporate_number TEXT NULL`
- timestamps

Store company name without `様`.

### diagnosis_cases

- `id UUID PK`
- `organization_id FK NOT NULL`
- `entry_channel` = `WEB | SALES_VISIT`
- `diagnosis_status`
- `assessment_status`
- `owner_user_id NULL`
- `waiting_reason NULL`
- `scheduled_at NULL`
- `started_at NULL`
- `completed_at NULL`
- `survey_version`
- `access_token_hash NULL` for WEB resume token
- `access_token_revoked_at NULL`
- `version INTEGER NOT NULL DEFAULT 1`
- timestamps

Do not make `current_next_action` authoritative persistence if it can be safely derived from state; prefer a read-model derived Next Action. If persisted as cache, it must never be the business source of truth.

### participants

- case FK
- name
- email
- phone nullable
- job_title nullable
- timestamps

### participant_roles

Support multiple roles. Slice 1 needs at least `RESPONDENT`.

### survey_questions

- stable `question_code`
- version
- display_order
- question_text
- answer_type
- options_json nullable
- required / active flags

### survey_responses

Raw response only.

Do not add score, maturity, confidence, fact_status, semantic_type or AI judgement.

### diagnosis_futures

- case FK
- statement
- time_horizon nullable
- `intent_status = SURVEY_STATED | INTERVIEW_RECONFIRMED`
- source ref to SurveyResponse
- current/version/timestamps

Slice 1 creates only `SURVEY_STATED`.

### case_transitions

Record business state transitions.

### diagnosis_audit_logs

Record meaningful commands/decisions, not every trivial CRUD.

---

## 6. Survey Definition

Current Canonical is:

- 9 required questions
- 1 optional free-text question
- Future First
- target answer time 3-5 minutes
- `分からない` is a valid normal response
- no score / maturity result

Use stable codes:

- `Q01_FUTURE`
- `Q02_IT_EXPECTATION`
- `Q03_IT_PLANNING`
- `Q04_IT_VISIBILITY`
- `Q05_DAILY_IT_OPERATION`
- `Q06_SECURITY_RISK`
- `Q07_AUTHORITY_RESPONSIBILITY`
- `Q08_MANAGEMENT_INFORMATION`
- `Q09_IT_ORGANIZATION`
- `Q10_FREE_COMMENT` optional

The exact text/options must follow the latest Canonical or a seed definition created from it. Do not carry the old 12-question scoring form forward simply because it already exists.

Question definitions should remain centralized and versioned. Reuse the old TypeScript/Zod centralized-definition pattern if useful, without old scoring semantics.

---

## 7. API Namespace

Do not silently repurpose the old API during migration.

Add new public namespace:

- `POST /api/it-management-diagnosis/cases`
- `POST /api/it-management-diagnosis/cases/:id/survey/start`
- `GET /api/it-management-diagnosis/cases/:id/survey`
- `PUT /api/it-management-diagnosis/cases/:id/survey/responses/:questionCode`
- `POST /api/it-management-diagnosis/cases/:id/survey/complete`

Add admin namespace:

- `GET /api/admin/it-management-diagnosis/cases`
- `GET /api/admin/it-management-diagnosis/cases/:id/overview`

Use explicit application commands rather than generic PATCH for business transitions.

---

## 8. Required Command Semantics

### CreateDiagnosisCase

One transaction:

- Organization
- DiagnosisCase
- Participant
- ParticipantRole
- CaseTransition
- AuditLog

Initial values:

- status `APPLICATION_STARTED`
- assessment `NOT_PROPOSED`
- entry channel from request

Do not auto-merge organizations based on company-name string in Slice 1.

For WEB, generate a cryptographically strong case access token. Return raw token once; store hash only.

### StartSurvey

- `APPLICATION_STARTED -> SURVEY_IN_PROGRESS`
- repeated call in `SURVEY_IN_PROGRESS` may be idempotent success
- other incompatible states -> 409

### SubmitSurveyResponse

- validate question code/version/type
- upsert raw response for the case/question
- allow valid `分からない` value
- no Fact / Insight / score generation

### CompleteSurvey

One transaction:

1. verify state = `SURVEY_IN_PROGRESS`
2. verify all required answers
3. create/current Future from Q01 with `SURVEY_STATED`
4. transition to `SURVEY_COMPLETED`
5. CaseTransition
6. AuditLog

No AI call in Slice 1.

Missing required questions -> 422 with question codes; keep case in `SURVEY_IN_PROGRESS`.

---

## 9. Customer Access Token

Public resume/edit APIs must validate case id + access token.

Requirements:

- strong random token
- raw token never persisted
- only hash stored
- case-scoped
- revocable
- avoid logging raw token

Do not implement full customer accounts/OTP in Slice 1 unless already trivial and non-disruptive.

---

## 10. Public UI

Reuse the structure of `public/kaizen-diagnostic.html`, but move the new implementation to a clearly new canonical route/page during migration to avoid breaking legacy traffic unexpectedly.

Recommended page name:

- `public/it-management-diagnosis.html`

Customer-facing naming:

- title: `無料 IT経営診断`
- provider: `atLIB株式会社`
- customer company display: `ABC株式会社様`

Do not store `様` in DB.

Required UX:

- application/contact input
- question-by-question or compact progressive flow
- Future First
- progress indicator based on 9 required questions
- `分からない` shown as ordinary answer, no warning
- progressive save
- resume from saved responses
- completion page explains that the 60-minute diagnosis focuses on important themes rather than repeating all questions
- no score, radar, maturity, ranking, immediate diagnosis result

Reuse CSS and existing validation/error/loading UX where practical.

---

## 11. Admin UI

Reuse existing admin UI foundations but create/migrate to new Case semantics.

### Case list

Next Action / state centered. Include at minimum:

- customer organization display name + `様`
- diagnosis status
- Next Action (derived/read model)
- entry channel
- participant/contact
- Future summary if available
- survey status
- assessment status

Do not show cost/risk/attrition scores or old service recommendations as new Case semantics.

### Admin proxy input

Reuse `kaizen-diagnostic-new.html` pattern for SALES_VISIT.

Requirements:

- create case with `entry_channel = SALES_VISIT`
- preserve customer response vs staff actor distinction
- no axis chips / score UI
- staff identity comes from existing auth context where available

Slice 1 only needs to reach Survey completion.

---

## 12. Existing LP

Do not rewrite `atlib-corporate-site/public/joshisu-kaizen/index.html` business messaging in this task.

If necessary for verification, document the exact link/config change needed to point from the existing LP flow to the new form, but do not make a Business Lane messaging rewrite.

Do not break legacy link delivery before the new form works end-to-end.

---

## 13. Notifications

Mailer / Slack may be reused as best-effort operational notifications.

Notification failure must not roll back a successful diagnosis case creation or survey completion.

Customer/provider naming in new notification text must use `atLIB株式会社`.

Do not expose scores or inferred diagnosis results.

---

## 14. Logging / Privacy

Do not log whole request bodies for public form requests.

Avoid logging:

- raw access token
- free-comment content
- email / phone in unnecessary application logs

Keep existing structured access logging, but redact or avoid sensitive content where new code introduces application logs.

---

## 15. Tests Required

Add Slice 1 tests using the repository's current Node/TypeScript test style.

Minimum Golden Tests:

1. self-report `IT環境は完全に把握できている` saves only SurveyResponse; no Fact/score/Insight is generated.
2. `分からない` is accepted as normal response.
3. partial responses can be read back/resumed.
4. Q01 can be changed before completion; Future is not finalized until CompleteSurvey.
5. missing required Q06 (or any required item) -> 422 and state remains `SURVEY_IN_PROGRESS`.
6. successful CompleteSurvey -> Future `SURVEY_STATED` + status `SURVEY_COMPLETED`.
7. organization stored `ABC株式会社`, UI/read model displays `ABC株式会社様`.
8. provider text displays `atLIB株式会社`.
9. repeated StartSurvey while already `SURVEY_IN_PROGRESS` is safe/idempotent.
10. invalid access token cannot read/write public case survey.
11. legacy `kaizen_diagnostics` table/API is not destructively changed.
12. no response path returns score, maturity or radar data for the new diagnosis API.

If DB-dependent test infrastructure is unavailable, add the strongest unit/integration coverage possible and clearly report what could not be executed.

---

## 16. Verification Commands

At minimum run:

```bash
npm install
npm run build
```

Run existing relevant tests and new Slice 1 tests.

Existing project script includes `npm run test:kaizen`; do not regress existing tests.

If migration can safely be run against a disposable/local DB, verify migration up. Do not run destructive migration against production.

---

## 17. Acceptance Criteria

Implementation is complete only when all are true:

1. new Web case can be created
2. company name stored without `様`
3. display adds `様`
4. provider shown as `atLIB株式会社`
5. status begins `APPLICATION_STARTED`
6. survey starts as `SURVEY_IN_PROGRESS`
7. 9 required + optional free comment are supported
8. partial answers save/resume
9. `分からない` is valid
10. customer answers never become Fact automatically
11. required-answer guard works
12. Q01 produces Future only through completion logic, as `SURVEY_STATED`
13. complete state becomes `SURVEY_COMPLETED`
14. CaseTransition is recorded
15. no AI required for Slice 1
16. staff proxy entry works with `SALES_VISIT`
17. new admin list is Case/Next Action centered
18. old scoring semantics are absent from new UI/API
19. legacy old data remains intact
20. build and tests pass, or any environment-only limitation is explicitly reported

---

## 18. Out of Scope

Do not implement in Slice 1:

- AI-01
- Diagnosis Preparation
- 60-minute Workspace
- Evidence analysis
- DiagnosisInsight
- Human Review
- Report generation
- Assessment Handoff
- FACTACT mapping
- radar charts
- maturity scoring
- automatic service recommendation
- CRM deduplication
- broad LP/business-message redesign

Do not add convenience scope merely because it seems useful.

---

## 19. Change Discipline

Before modifying a legacy file, determine whether reuse is actually safer than a new canonical file/route.

Prefer additive migration:

1. new tables
2. new routes/services/repositories
3. new public/admin pages
4. route mounting
5. verify
6. only then consider switching LP link

Do not delete legacy code in the same Slice unless required for correctness.

---

## 20. Codex Completion Report

At completion, report exactly:

### A. Summary
What was implemented.

### B. Files changed
List created/modified files grouped by migration/domain/repository/routes/UI/tests.

### C. Reuse decisions
Which existing assets were reused and which legacy semantics were deliberately not reused.

### D. Tests
Commands run and results.

### E. Manual verification
Public flow, resume, admin list, SALES_VISIT proxy flow.

### F. Remaining issues
Anything blocked by environment/config/deployment.

### G. Canonical deviations
Must be `None` unless explicitly approved. If any deviation was required, do not hide it; identify the exact canonical conflict.

---

## 21. Stop Conditions

Stop implementation and report instead of guessing if any of these occur:

- implementation requires changing the free-diagnosis vs Assessment boundary
- a requirement would make customer answer become authoritative FACT
- a requirement would reintroduce maturity/radar scoring as diagnosis basis
- existing production schema forces destructive migration
- implementation requires Business messaging/price/service-boundary changes
- unclear conflict exists between docs 17-24

Otherwise proceed through Slice 1 end-to-end without asking for approval for routine implementation details that stay within this specification.
