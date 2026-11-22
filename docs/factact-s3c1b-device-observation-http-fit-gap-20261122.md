# FACTACT S3c-1B — Session-bound Device Observation HTTP Gate

Status: **SYNTHETIC DB / HTTP SESSION ACCEPTED — DRAFT / UNMERGED; HOSTED AND PRODUCTION NO-GO**.
Scope: [Issue #89](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/89); parent PR #88 remains at `7978a6bd8313b2d011388494a33e7ea31b7ec575`.

## Fit / Gap

| Area | Accepted implementation | Boundary |
| --- | --- | --- |
| Session identity | Existing OIDC-bound Session, exact Origin/CSRF, and DB-side `read_session` revalidation | Browser cannot assert Tenant, Actor, authority or source custody |
| Work → Observation | Real Person-recipient SUPPORT Work and active target resolve one Organization recipient | No fabricated Work / customer / Recipient |
| Observation → Change | Immutable S3c-1A Evidence, DB-generated Change ID, persisted request-key replay | Observation never silently mutates Device |
| Reviewer queue | Exact current customer/Work/Recipient Grants; independent reviewer; stable cursor and no global totals | Queue is evidence for human choice, not auto-approval |
| Human confirmation | Single human action reuses two-Actor Verify → Commit with live Authority and Evidence check | One transaction; no duplicate Audit or field events on retry |
| Failure behavior | SQL error responses hide internal details; failed Record / Propose / Confirm roll back domain state and Audit | Privileged direct SQL routes still unexposed to HTTP |
| AI / Assessment / UI | None in this Slice | No-Go |
| Hosted G5 / Production | Neither executed | Explicit separate authorization and environment gates |

## Operational interaction

Recorder confirms a single actually observed field/value in an active SUPPORT Work, then proposes a Change. Another authorized reviewer inspects the scoped pending queue and confirms with one human attestation. **Only successful Commit changes the authoritative Device Fact.** Display/search alone creates no Work, Evidence or Registry mutation.

## Measured synthetic acceptance

- Latest verified code before this documentation update: `6d4896f9072879134d2a091effc414b4d4633ce1`.
- [GitHub Actions #45030698047](https://github.com/yoshihisahagisaka/git_KAIZEN/actions/runs/45030698047): SUCCESS (Node 24), `npm ci`, `npm run typecheck`, Unit **77 PASS**, PostgreSQL 17 DB/Golden **391 PASS**, Browser **39 PASS** (includes `npm run build`).
- Complete **43 ordered migrations** exercised with `factact_migrator` non-SUPERUSER, including `20261122000300`. **35 protected tables FORCE RLS** maintained.
- Actual independent OIDC Sessions, wrong Origin/CSRF, unknown or forged input, cross-customer hiding, self-review rejection, live Grant and Session revocation, session-token rotation, Record/Propose/Confirm idempotency, and absence of Device mutation before Commit verified.
- Failure-injection tests separately show atomic rollback of Record+Evidence+Audit, Proposal+Change+Source+Audit, and Commit+Device+FIELD_VERIFIED+Audit. PostgreSQL authority-lock test serializes Grant revocation **ahead of** Confirm and verifies fail-closed status without partial state. Parallel Record accepts only one revision.
- Static comparison of added diff lines found no trailing whitespace. CLI `git diff --check` is **not independently executed**, so it must not be claimed PASS.

## Separate gates

S3c-1B synthetic acceptance is not proof of Hosted G5, real Cloud SQL principals, IAM/Private IP, production data compatibility or end-user UI acceptance. External file/source custody and Trusted System adapters are also out of scope. Full Core integration and release readiness are separate decisions. Keep this PR and parent Draft/unmerged; no GCP, Assessment, Hosted or Production changes from this slice.
