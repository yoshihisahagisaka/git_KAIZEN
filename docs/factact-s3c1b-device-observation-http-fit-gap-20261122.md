# FACTACT S3c-1B — Session-bound Device Observation HTTP Gate

Status: **DRAFT / SYNTHETIC ACCEPTANCE PENDING**. Scope: [Issue #89](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/89); parent PR #88 at `7978a6bd8313b2d011388494a33e7ea31b7ec575`. No Hosted/Production/Assessment changes.

## Fit / Gap

| Area | Current implementation | Gate |
| --- | --- | --- |
| Session identity | Existing OIDC-bound session, exact Origin/CSRF and `read_session` rechecked by each SQL wrapper | PostgreSQL 17 HTTP E2E |
| Work -> Observation | Existing Person SUPPORT Work and explicit target, unique active Organization recipient derived in DB | No caller-provided Recipient |
| Observation -> Change | Reuse immutable S3c-1A Evidence/Change, DB-generated Change ID and persisted request-key replay | No generic HTTP RPC |
| Reviewer queue | Exact current Customer/Work/Recipient grants, independent reviewer, ordered cursor; no global totals | Live Grant revocation check |
| Human confirmation | One reviewed operation delegates to existing Verify -> Commit with Actor/Authority/Evidence replay checks | Atomic audit, rollback |
| AI/Assessment/UI | Not implemented in this slice | Explicit No-Go |
| Hosted G5 | Not executed | Separate environment decision |
| Production | Not executed | No-Go |

## Operational interaction

Recorder: confirm one observed field/value in the active SUPPORT Work; propose Change. Reviewer: inspect bounded pending queue and confirm with one human attestation. Only the Commit writes the authoritative Device value and its FIELD_VERIFIED event. Searching or displaying a Device does not create Work or update Registry.

## Acceptance / unresolved

Required: Node 24 `npm ci`, `npm run typecheck`, `npm test`, `npm run test:db`, `npm run test:browser`, `npm run build`, PostgreSQL 17 non-SUPERUSER Migration, all FORCE RLS 35 tables, restricted function ACL, real authenticated Session/CSRF and two-Actor E2E. Compare exact process exits and CI. This document is **not** a PASS assertion. Do not activate Hosted G5 or deploy Production from this PR. Document any unverified race/rollback cases rather than silently accepting them.
