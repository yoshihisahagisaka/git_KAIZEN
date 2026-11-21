# FACTACT｜Organization Service Recipient：後方互換実装チェックポイント（2026-11-06）

Status: **Draft code + migration / DB test verified. No runtime caller-to-beneficiary conversion or external release.**

## Existing Canonical (not redesigned)

- `docs/99-ai-development-context.md` §§12,15 defines `Tenant → Organization → Service → Contract Profile → Service Recipient`. SONIX end-customer companies are Service Recipients, not one Tenant per customer.
- `docs/02-domain-model.md` distinguishes real-world Organization/Person from the Service Recipient role. Caller, receiving company, Work Owner and authorized Actor are not interchangeable.
- Draft PR #24 identified `PERSON`-only physical recipient representation and `Caller Person=SUPPORT technical Service Recipient` as a confirmed mismatch. Draft PR #25 added a pure explicit-scope decision kernel, **not** backend access control.

## Change in this slice

Migration: `supabase/migrations/20261106001400_organization_service_recipient.sql`

- Extends the existing `factact.service_recipients` table with `recipient_type='ORGANIZATION'` and a separate `recipient_organization_id` foreign key. It does not introduce `customer_id` or one Tenant per customer.
- Retains `recipient_id` as the **Person FK** for legacy JOIN and SUPPORT. Existing data remains `recipient_type='PERSON'`, so existing historical Work links remain valid. The new column is null on these rows.
- Enforces exactly one typed beneficiary reference via database CHECK; an Organization reference uses a composite `(tenant_id,recipient_organization_id)` FK, and one Organization recipient per Service via a partial unique index.
- Preserves current FORCE Tenant RLS, existing Service FKs and limited runtime privileges.

Port / persistence:

- Adds `ensureOrganizationRecipient` and `recipientOrganization` to the existing `JoinRepository` abstraction and PostgreSQL adapter.
- `ensureRecipient` and `recipientPerson` keep their current Person semantics; the latter now checks the recipient type explicitly.
- Organization registration requires an existing active Organization in the current Tenant. **It does not verify that a caller is enrolled, that a company has a valid Contract, or that an Actor may read its records.** These must be established by an authorized, server-side business flow.

## Verification

- `npm run typecheck`: PASS.
- `npx vitest run --config vitest.db.config.ts tests/golden/organization-recipient.test.ts`: **8 PASS** against an isolated embedded PostgreSQL and the restricted runtime role.
- `npm run test:db`: **124 PASS / 6 files** on repeat. One earlier run had 124 passing assertions but an intermittent unhandled PostgreSQL connection-termination event in test teardown; no failing assertion was observed. Keep this as a test-fixture stability watch item, not a production/DB Gate pass by itself.
- No deployment and no existing database migration was executed; DB tests only created isolated temporary PostgreSQL instances.

## Remaining first-release integration gaps

1. **Caller versus actual receiving company**: SUPPORT currently links a Caller Person as the technical recipient. The next implementation must identify the confirmed company recipient independently, and must not silently recast an unverified caller Organization as the beneficiary. Before identification, keep it unknown or pending confirmation.
2. **Work and projections**: SUPPORT `managementRows`, `list`, `detail`, related histories and JOIN queries still expect Person recipients. They cannot yet be pointed at Organization recipients without adding caller/beneficiary separation and safe projections.
3. **Authority**: No Actor/Tenant/Service/Recipient/Work grant schema, identity membership selection, query filtering or role changes are part of this migration. Draft PR #25's policy kernel remains disconnected from persisted grants and actual API Query/Command boundaries.
4. **Completeness**: Inquiry form, customer/vendor response entry and shared Registry/Procedure editing are not implemented by this slice. Same-Tenant cross-customer read isolation remains a release-blocking end-to-end requirement.

Only after those associations and explicit grants are resolved from trusted persisted data may customer-facing results or edits become available. A Service Recipient record alone is **not** read or execution Authority.
