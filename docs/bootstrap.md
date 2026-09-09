# FACTACT bootstrap — architecture review handoff

Date: 2026-09-09. Canonical base: origin/main e816e11, updated by fast-forward before implementation. Document 16 is present and was read. Only git_KAIZEN was modified; sibling repositories were read-only references.

## Implemented boundary

This is the requested bootstrap review checkpoint, not the completed JOIN slice.

- npm workspaces: apps/web, packages/domain, packages/application.
- Node 24, strict TypeScript, Express 5, React 19/Vite; one deployable application.
- pg adapter with same-client transaction-local tenant context; Zod configuration validation; redacted Pino logs; Helmet.
- Google OIDC using openid-client, PKCE/state/nonce and explicit JWT signature verification. External issuer/subject maps to an internal Operator UUID.
- Database-backed one-use login transactions, opaque hashed sessions, server expiry/revocation, active Operator/Tenant checks, CSRF-protected logout.
- Login/session shell only. No domain mutation endpoints or mock JOIN completion.
- Five ADRs, SQL migration, deterministic prerequisite seed, bootstrap tests, CI workflow and container recipe.

Database tables are tenants, operators, operator_roles, organizations, people, devices, services, contract_profiles and audit_events. Private infrastructure tables hold identity bindings, login transactions and sessions. Operator external identity mapping is extracted into a binding table rather than making the external subject an Operator/Person primary key; see ADR 0002.

The initial Contract Profile explicitly requires COMPANY_PC. Department/employment type are not modeled. Evaluation snapshots will explain decisions without becoming authoritative Facts. The Product Owner clarification is recorded in documents 14/15 and ADR 0004.

## Reuse provenance

Paths below are relative to the named sibling repository. No sibling files were modified.

| Classification | Source repository/revision/path | FACTACT destination / adaptation |
|---|---|---|
| REUSE | atlib-ppap-file-transfer @ 9c1b002: src/lib/pkce.ts | apps/web/src/server/auth/pkce.ts: verifier, challenge and opaque random helpers; Node import spelling changed. tokenHash is new. |
| ADAPT | atlib-ppap-file-transfer @ 9c1b002: src/lib/oidcProvider.ts; src/routes/ssoAuthRoutes.ts | auth/oidc.ts and auth/routes.ts: preserve code/PKCE/state/nonce flow, delegate protocol validation to openid-client; use issuer/subject mapping. |
| ADAPT | atlib-ppap-file-transfer @ 9c1b002: src/lib/cookies.ts; src/lib/ssoSessionCookie.ts; src/routes/ssoSessionRoutes.ts | auth/routes.ts: secure cookie/session behavior; replace self-contained spike session with expiring/revocable PostgreSQL sessions and CSRF protection. |
| REFERENCE | atlib-ppap-file-transfer @ 9c1b002: src/lib/signedCookie.ts | Inspected; not copied. An opaque cookie avoids carrying state/identity/provisioning payloads. |
| ADAPT | atlib-msp-customer-portal @ 5412430: package.json; tsconfig.json | Root workspaces/build tooling and strict compiler settings, with fresh exact dependency versions. |
| ADAPT | atlib-msp-customer-portal @ 5412430: src/config.ts; src/db/pool.ts; src/server.ts | server/config.ts, persistence/database.ts and app.ts: small pg pool, configuration/composition/logging patterns; add TLS, restricted-role startup check, context transactions and redaction. |
| ADAPT | atlib-msp-customer-portal @ 5412430: Dockerfile | Root Dockerfile: multi-stage build, Node 24, non-root runtime, no reporting dependencies. |
| REFERENCE | atlib-msp-customer-portal @ 5412430: migrations/runner.ts; src/lib/secrets.ts; docs/運用手順書_ポータルデプロイ.md | Ordered transactional SQL, environment-injected secrets and deployment lessons. Supabase CLI owns migrations; no copied runner or Secret Manager SDK. |
| ADAPT | atlib-sales-tools @ bd60802: test/kaizenAssessment.golden.test.ts; test/fixtures/kaizenAssessmentGolden.json | tests/: invariant/negative-path testing approach, new synthetic FACTACT fixtures. No assessment data or AI calls copied. |
| ADAPT | atlib-cashflow @ f76fe40: app/test/cashflowContract.test.ts | tests/: deterministic expected outcomes and boundary tests; no finance models copied. |
| REFERENCE | atlib-cashflow @ f76fe40: app/test/goldenImport.test.ts | Independent expected results; external spreadsheet dependency/skip explicitly excluded. |
| DO NOT REUSE | PPAP src/services/jitProvisioning.ts; src/middleware/iapAuth.ts development bypass; src/middleware/rateLimit.ts | No customer-domain enrollment, dev auth shortcut or per-process production limiter. |
| DO NOT REUSE | portal src/services/opsHistoryRepo.ts; legacy business migrations in all reference repositories | No customer-as-tenant, manual effort model, transfer/assessment/cashflow schemas. |

## Local setup

Requires Node 24. On Windows PowerShell use npm.cmd/npx.cmd when script execution policy blocks npm.ps1. Do not change execution policy just to run npm.

1. `npm ci`
2. Install/start a Docker-compatible runtime, then `npm run db:start`.
3. `npm run db:reset` creates this local disposable schema and deterministic seed. This resets local data; it is not a production migration command.
4. Set a local password for factact_runtime through a PostgreSQL admin connection (for example psql's interactive `\password factact_runtime`). Do not run the application with postgres/service-role credentials.
5. Copy `.env.example` to `.env`; supply the runtime URL and real Google OIDC client configuration. Register the exact callback `http://localhost:5173/auth/callback` for local use.
6. To bind the seeded development Operator, temporarily set ADMIN_DATABASE_URL and OPERATOR_SUBJECT (the verified Google `sub`, not email), then run `npm run db:bind-operator`. The tool accepts only a loopback development DB, refuses to replace an existing real binding, and records an audit event. The default .invalid identity cannot log in. Remove the admin URL from the application environment afterwards.
7. Run `npm run dev` and `npm run dev:ui` in separate terminals. Open http://localhost:5173.

No development authentication bypass exists. Automated HTTP tests inject a fake identity-provider port into an app factory; the production composition root always discovers and validates Google OIDC.

For a built app: `npm run build`, use an origin/callback on the server's port, then `node --env-file=.env dist/server/main.js`. Production must have HTTPS and verified database TLS. Cloud Run secrets should be injected from Secret Manager. The container and deployment are not validated on this workstation because Docker is unavailable.

## Verification and limitations

- `npm run typecheck`: TypeScript boundary checks.
- `npm test`: 16 configuration, identity and HTTP security tests.
- `npm run test:db`: 12 migration/RLS/session tests against a fresh real PostgreSQL 17.10 cluster; no skipped-fixture success path. The test-only embedded-postgres dependency supplies native binaries without a system installation. It does not change the production Supabase decision. Cluster is loopback-only, inside a unique git_KAIZEN temporary directory, stopped and removed after the run.
- `npm run build`: browser assets and server bundle.

The SQL migration and seed have executed successfully on the isolated PostgreSQL test instance. RLS is enabled and forced on all nine business tables. Runtime privileges are explicitly restricted; tests check missing/foreign tenant access, cross-tenant FK rejection, transactional rollback and context cleanup. Auth functions expose no business table reads and deny direct private-table access.

The project-local Supabase CLI is installed. The full Docker-backed Supabase environment is not running here; hosted migrations, deployment, actual Google login and the full browser flow are not claimed verified. Real OIDC credentials and a verified Operator subject must be supplied for interactive login. CI is configured but has not run remotely.

## Next step after architecture review

Follow document 15: domain command interfaces, CreateJoinEvent, EvaluateJoinRequirements, read models/UI, Action/Change proposal, Verify/Commit, Person Context, CompleteWork/readiness, then all GT-01–GT-12 and browser acceptance. Implement tests alongside those commands. Event/Work/Action/Change/Relation tables are deliberately not speculative bootstrap schema.

The PostgreSQL bootstrap checks do not count as GT-11 for unimplemented Work/Change/Relation, nor as GT-07 for an unimplemented CommitChange. tests/golden/README.md explicitly records that gate.

No unresolved Core conflict is identified. The department/employment example has been reconciled through the explicit Product Owner correction. Role/review and concurrency choices remain reviewable in ADRs 0002/0005 before their command implementations. No SUPPORT, AI automation, KAIZEN analytics, MOT/TEL or Zoho code is present.
