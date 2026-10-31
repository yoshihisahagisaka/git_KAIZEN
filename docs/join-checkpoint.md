# First JOIN slice — architecture review checkpoint

Date: 2026-09-09. Builds on the reviewed bootstrap without replacing its commits
or architecture. Only git_KAIZEN was modified; sibling repositories remain read-only.

## Implemented scope

Document 15's CreateJoinEvent, EvaluateJoinRequirements, JOIN workspace, owned
Work and its context, StartAssignDeviceAction with execution evidence, Change
proposal, VerifyChange, CommitChange, Person Operational Context, CompleteWork
and JOIN readiness are implemented. The client provides the minimal acceptance
flow, including Why, Next Action, provenance and Timeline. Rejected proposals
can be corrected through a new proposal without rewriting their history.

Event creation produces no Work. Evaluation stores its versioned Contract basis
before creating REQUIRED Work. UNKNOWN persists until a verified Change is
committed. Verify alone does not publish a Fact. Commit atomically publishes a
Relation and preserves ended history; closing Work never changes Registry state.
COMPANY_PC uses the explicit bounded Contract Profile rule. Department and
employment type remain unmodeled, as directed by the Product Owner.

## Implementation locations

- `packages/domain/src/join.ts`: bounded requirement and Change invariants.
- `packages/application/src/join-{commands,ports,queries}.ts`: commands, tenant
  unit of work port, reproducible evaluation and operational read models.
- `apps/web/src/server/persistence/join-repository.ts`: PostgreSQL adapter.
- `apps/web/src/server/auth/command-boundary.ts`: shared session/Origin/CSRF guard
  for every unsafe HTTP method, mounted before all routes.
- `apps/web/src/server/join-routes.ts`: validated command and read endpoints.
- `apps/web/src/client/join-ui.tsx`: minimal JOIN, Work and Person workspaces.
- `supabase/migrations/20260909000200_join_slice.sql`: nine JOIN tables,
  immutable links/effects, explicit grants, forced RLS and audit ordering.
- `tests/golden/join.test.ts`, `tests/fixtures/database.ts`,
  `tests/browser/join.spec.ts`, `playwright.config.ts`: executable acceptance.

The bootstrap stack remains Node 24, strict TypeScript, Express 5, React 19/Vite,
pg and Supabase/PostgreSQL. One same-origin app keeps the security boundary
explicit; vendor-free Domain/Application keep Core portable. No additional
production infrastructure was introduced. Playwright and embedded-postgres are
development dependencies imported only by tests.

Existing REUSE/ADAPT decisions and exact sibling paths remain in
[bootstrap provenance](bootstrap.md#reuse-provenance). JOIN business logic is new.
Golden testing adapts `atlib-sales-tools/test/kaizenAssessment.golden.test.ts`
and `test/fixtures/kaizenAssessmentGolden.json`, and
`atlib-cashflow/app/test/cashflowContract.test.ts`: deterministic expected outcomes
and negative guards, with entirely new FACTACT fixtures. No legacy domain schemas
or external spreadsheet skip behavior were reused.

## Verification

- `npm test`: 16 bootstrap configuration, identity and HTTP security tests pass.
- `npm run test:db`: 31 tests pass: 12 bootstrap database checks and 19 JOIN tests,
  including all GT-01–GT-12 plus concurrency, authority, UNKNOWN/decision,
  correction and shared unsafe-method security guards. No skipped tests.
- `npm run test:browser`: one Chromium acceptance flow passes against the built
  client, real HTTP/session/Operator mapping and a fresh real PostgreSQL database.
  It verifies pre-Commit UNKNOWN, post-Commit provenance, completion, readiness,
  Timeline and persisted Person Fact after reload.
- `npm run build` (included in browser command): TypeScript, client and server
  build pass. Both SQL migrations and deterministic seed execute successfully.

The browser test injects a test identity-provider port; production always uses
Google OIDC with signature validation. Live Google authentication, container
deployment and hosted Supabase execution are not claimed verified. Hosted role
creation/migration privileges must be checked before deployment and any actual
incompatibility recorded; the RLS architecture is unchanged. CI now runs the
same suites, but remote CI results require a subsequent run.

## Review boundary

The five existing ADRs retain their bootstrap decisions and now record the JOIN
implementation consequences. No unresolved conflict with canonical Core documents
was identified. Evaluation revision 1 is replay-safe; creating new revisions is
not exposed in this slice. Document 14's illustrative department/employment rule
does not introduce a new source of truth. No SUPPORT, AI, KAIZEN analytics, MOT/TEL,
Zoho or generic workflow features were added. Stop here for architecture review
before substantial UI polish or adjacent features.
