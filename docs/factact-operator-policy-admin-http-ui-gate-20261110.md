# FACTACT | Operator-policy admin HTTP/UI Gate (2026-11-10)

Status: **IMPLEMENTED IN STACKED DRAFT — SYNTHETIC ACCEPTANCE ONLY**. This Gate implements the four Product Owner-approved settings from `factact-operator-policy-administration-contract-accepted-20261110.md` and the private DB Gate in Draft PR #57. No new operator-role hierarchy, Grant shortcut or Registry enforcement is introduced.

## Fit / Gap and bounded outcome

- **FIT — verified single administrator:** all administrator GET/POST endpoints accept only the server-held OIDC Session hash. `factact_private.require_scoped_grant_approver` revalidates the specific approved Google subject, active membership, Tenant, Operator and approval record for **every** list or mutation. No email, issuer, subject, Tenant or approval Actor is accepted from browser fields. Existing command boundary enforces Session + exact Origin/CSRF for writes.
- **FIT — per-Tenant+Service Actor level:** one selected Service, selectable active Actor, explicit `NEWCOMER`/`STANDARD`/`LEAD` or removal, mandatory reason, idempotency request ID and immutable assignment/Audit history. The UI never silently seeds a level; the UI has a bounded 50-Actor search result and an explicit name filter.
- **FIT — first approved category:** full three-cell version snapshot for `PERSON_DISPLAY_NAME_CORRECTION`, strictly `DENY` or `REQUEST`. `COMMIT` is absent in both browser options and the DB/API acceptance contract. Saving a snapshot does not publish it.
- **FIT — explicit publish/disable:** administrator selects an immutable version and can inspect its three dispositions before submitting a mandatory reason. Stopping publication is a separate reasoned action. Both remain append-only with distinct Audit. UI exposes historical assignments, version reasons and publication chronology.
- **GAP — production authority:** currently **not wired** to Registry eligibility, actual reviewer routing, effective Grants or Change→Verify→Commit decisions. An administrator `PUBLISH` event is only a management-policy ledger entry at this Gate. No public-default policy, automatic reviewer, live access change or real customer assignment is enabled.

## Security and information boundaries

1. The `operator_policy_admin_overview` SECURITY DEFINER read is deliberately narrow. It returns current-Tenant **active Service names**, 50 current-Tenant active matching Actor names and their latest level (nullable), up to 50 immutable versions and up to 30 assignment/publication events for **one active selected Service**. Any unapproved, legacy-session, revoked, inactive or cross-Tenant Service request returns `42501` (HTTP 403). It does not return identity issuer/subject, private request receipts, other-Tenant actors, arbitrary Person/Recipient/Work records or broad directory rights.
2. The runtime role has execute-only access to four named policy functions; all four private policy tables remain inaccessible to `factact_runtime`. POST input validation is strict and recognizes no admin-authentication fields. The DB is the final authority for target membership, version ownership and idempotent Audit writes.
3. Unapproved users do not see the admin component. After any permission failure or revoked identity, previously visible admin data is discarded. A permission-hidden button is **not** the security boundary.
4. UI retry IDs are stable for the exact same operation/payload after an uncertain network result; changing parameters generates a new ID. Double-click POSTs are suppressed. A fresh read follows confirmed writes.

## Acceptance and release barriers

- Hosted synthetic DB/HTTP: authorized vs unapproved/revoked identity; Tenant A/B Service refusal; strict CSRF/Origin/schema, `COMMIT` rejection; empty policy; reasoned level/version/publish/disable history; no Grant/Change writes; private table access denied.
- Browser synthetic: administrative navigation absent before approval; per-Service one-screen operation; explicit publication and disable; revocation during an open form fails closed.
- Existing Regression: JOIN/SUPPORT/Registry HTTP+DB/Chromium, typecheck, build.
- **No-Go retained:** `main` merge, hosted/Production DB migration, real OIDC identity provision, actual operator assignment, active policy eligibility, any automatic Registry Commit/Grant, Production rollout and customer impact. Each requires a separately authorized and independently reviewed Gate.
