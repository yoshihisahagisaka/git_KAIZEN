# SUPPORT V1 — architecture / UX checkpoint

Date: 2026-09-10. Contract: `19-factact-support-golden-flow-v1.md` from commit
4f83951. Existing JOIN and Human-usable JOIN behavior is retained.

## Implemented

The smallest VPN inquiry flow is now available through the Japanese
「問い合わせ」navigation entry. Home and personal tasks also surface owned SUPPORT
work. It supports explicit Person/service intake, caller Observation, human
triage, owned INCIDENT Work, shared current device context, demo troubleshooting
guidance, diagnostic Evidence, explicit Decision and completed guidance Action,
knowledge candidate creation, and completion.

The Golden path is guidance-only COMPLETED. An investigated NO_ACTION_REQUIRED
path is also supported and remains different from NOT_APPLICABLE triage that
creates no Work. Completion does not declare a technical fault fixed or update
Registry state. This slice has no reality-changing SUPPORT command.

One Fact, Multiple Views is demonstrated by creating and committing the Person–
Device Relation through JOIN, then resolving the exact same Relation ID and source
Change in SUPPORT. A later verified JOIN replacement updates the context of both
existing and new inquiries. No SUPPORT-specific device value is stored.

The caller's words are an UNVERIFIED OBSERVATION with source, time, recorder and
review policy. Diagnostic text is Evidence; the operator's rationale is a scoped
Decision. VPN eligibility, timing, error details and reproduction are not inferred
from device ownership. Structured facts for these gaps are not introduced in V1:
case-specific findings remain in Evidence/Decision, with their limitations visible.

Knowledge candidates retain Work/Evidence/Decision provenance and appear on later
inquiries in the same Service. They are clearly unapproved reference material,
never automatically Rules. Demo procedure and knowledge content is labeled as
such. There is no generic content management or workflow subsystem.

## Files and architecture

- `packages/domain/src/support.ts`: bounded SUPPORT record types.
- `packages/application/src/support-{ports,commands,queries}.ts`: typed
  transactional commands, retry rules, authorization and context assembly.
- `apps/web/src/server/persistence/support-repository.ts`: PostgreSQL adapter,
  reusing existing Registry access in the same tenant transaction.
- `apps/web/src/server/support-routes.ts`: strict validated HTTP commands behind
  the existing globally mounted session/Origin/CSRF middleware.
- `apps/web/src/client/support-ui.tsx`: operator inquiry, investigation and learning
  flow. `api.ts` extracts the unchanged client request helper shared with JOIN.
- `supabase/migrations/20260910000300_support_slice.sql`: four new tables and
  additive specialization of shared Evaluation, Work, Action and Evidence.
- `tests/golden/support.test.ts`, `tests/browser/support.spec.ts`: regression and
  cross-flow acceptance. Existing JOIN tests remain intact.
- ADR 0006 records the bounded specialization and reuse decision.

Shared Work keeps its meaning. The migration retains JOIN constraints while
adding mutually exclusive SUPPORT sources and composite foreign keys. New tables
have ENABLE/FORCE RLS and explicit runtime grants. Inquiry row locking uses a
column-level UPDATE privilege; application code never rewrites its identity.
Observation, Decision and candidate records expose no update/delete command.

## Exact verification results

- `npm test`: **16 passed**, two bootstrap test files.
- `npm run test:db`: **47 passed**, three test files: 12 bootstrap database tests,
  19 unchanged JOIN Golden/guard tests, and 16 SUPPORT tests.
- SUPPORT-GT-01–GT-12 all pass. Additional checks cover missing Contract scope,
  shared HTTP security, complete rollback on audit failure, and a forged
  cross-tenant Observation link rejected by the database.
- SUPPORT-GT-07 proves that SUPPORT rejects reality-change execution and cannot
  enter JOIN completion, while unverified JOIN Change still cannot Commit. It
  does not claim a newly implemented reality-changing SUPPORT path.
- `npm run test:browser`: **4 passed**: three existing Human-usable JOIN tests plus
  the JOIN → SUPPORT → subsequent inquiry cross-flow covering SUPPORT-UX-01–08.
- `npm run build`, including `npm run typecheck`: pass. All three migrations and
  the deterministic seed execute against fresh real PostgreSQL.

The browser test creates the prerequisite Fact through real JOIN commands, runs
SUPPORT through the real HTTP application and restricted database role, verifies
no copied PC input or manufactured Change, and checks that the later inquiry
surfaces the candidate with source provenance. Google identity-provider behavior
is injected only in the test. No production authentication bypass is added.
First-time operator comprehension remains a human UX review task; automated
assertions establish visible explanations and behavior, not human understanding.

## Local review and deployment limits

### Human Review startup blocker correction

The running local server recorded authenticated `GET /api/support` requests as
HTTP 500. Inspection through `factact_runtime` found the SUPPORT tables absent;
the underlying query failed with SQLSTATE `42P01` (`support_events` missing).
Migration `20260910000300_support_slice.sql` had not been applied to the existing
local database. Its existing Contract Profile also lacked SUPPORT scope: applying
the migration alone would not authorize the review flow. This was a local setup
gap, not an RLS defect or an unwired SUPPORT route.

The additive migration was applied and `db:prepare-support` created the explicit
dedicated demo service. The original JOIN contracts, pending entries, completed
Work, active Person–Device Relation and verified Google binding were retained.
The server restarted with the schema guard and SUPPORT services. Runtime access
remains `factact_runtime`; SUPPORT RLS remains enabled and forced.

Fix verification: `npm test` **16 passed**; `npm run test:db` **50 passed**
(12 bootstrap, 19 JOIN, 16 SUPPORT, 3 local setup); `npm run test:browser`
**4 passed** (3 JOIN, 1 cross-flow); typecheck/build passed. The added setup tests
cover fresh migrations/seed, idempotent preparation of an existing unscoped demo
without changing its original contract/bindings, and rejection of missing schema.

In the actual local database, application commands using the already bound
Operator completed a clearly labeled synthetic SUPPORT inquiry against the
existing JOIN-confirmed PC-0073 Relation, retained four Unknowns and created only
a Knowledge candidate. No new PC Fact or Change was fabricated. Automated browser
coverage uses the real HTTP application with a test-only identity provider;
confirmation in the Product Owner's signed-in Google/Chrome session remains a
separate Human Review step. No session or authentication bypass was introduced.

The existing local database is not reset or silently authorized by this checkpoint.
`npm run db:migrate` applies the additive schema, but existing Contract Profiles
without `support.enabled` and `support.executeRoles` continue to deny SUPPORT.
Do not rewrite a historical Contract Profile in place to enable the new scope.

Human Review setup correction: on an existing local demo run `db:migrate`, then
the explicit `db:prepare-support` administration command, then restart the app/UI.
This preserves original contracts and JOIN data by creating a dedicated authorized
SUPPORT service when needed. See `local-join.md` for the complete non-reset path.
The application now checks required schema objects before listening.

For a disposable demo, follow the explicit reset/password/real Google binding
procedure in `local-join.md`. The fresh seed contains the bounded SUPPORT scope.
Then complete JOIN PC preparation to generate the verified Fact before running
the inquiry flow; no Relation or knowledge outcome is pre-seeded. Reset deletes
local data and bindings and must remain an explicit operator choice.

Hosted Supabase role creation/migration privileges and live cloud deployment remain
verification gates. No hosted compatibility claim is made. Secrets and verified
local identity files remain ignored; sibling repositories were not modified.

No unresolved canonical Core conflict was found within this bounded scope. No
MOT/TEL, Zoho, AI, generic Knowledge CMS, workflow builder, SLA engine, customer
portal or KAIZEN dashboard was added. Stop here for architecture/UX review.
