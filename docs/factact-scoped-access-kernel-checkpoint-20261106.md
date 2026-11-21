# FACTACT｜Actor-neutral Scoped Access Kernel — first implementation checkpoint (2026-11-06)

Status: **DRAFT implementation slice; NOT wired to application routes or authorization persistence.**

## Purpose / authority source

This is the first isolated code slice after `docs/factact-actor-neutral-customer-authority-fit-gap-20261106.md` (Draft PR #24). It translates the established **Actor Neutrality**, **scoped Authority** and **Tenant≠Customer** principles into a small default-deny decision function. It neither redefines the Business Decision nor authorizes external customer rollout.

Canonical sources:

- `docs/99-ai-development-context.md` §§12, 15 — `Tenant → Organization → Service → Contract Profile → Service Recipient`; SONIX end-customer organizations are not one Tenant each.
- `docs/02-domain-model.md` — Authority is scoped, not global; Caller/Service Recipient/Work Owner/Action Actor are distinct.
- `docs/80-it-management-kaizen-execution-actor-choice-and-management-observability-principles-v1.md` and `docs/85-it-management-kaizen-continuous-support-operating-model-v1.md` — Actor Neutrality is DECIDED.
- `docs/support-round3-phase2-implementation-contract.md` §7 — Team membership alone grants neither Read nor Action; permitted read scope comes from explicit authorized mappings and active Service/Contract context.
- `docs/adr/0002-identity-session-authority.md` — existing Read Authority v1 is internal-only, multi-Tenant identity/membership selection requires a later Decision.

## Implemented and verified

`packages/domain/src/scoped-access.ts` exports a pure `isExplicitlyAuthorized()` function and types for:

- Authenticated Actor principal (not Caller, Contact, employee affiliation or vendor membership).
- Tenant, Service and Contract Profile identifiers together (none can be inferred from a generic `customer_id`).
- Explicitly granted Service-wide, Service Recipient or individual Work scope; Work grants cannot fan out to all Work for a recipient.
- Separate operation (`READ`, `CREATE`, `UPDATE`, `REVIEW`, `APPROVE`) and object kind (`SUPPORT`, `REGISTRY`, `PROCEDURE`, `KNOWLEDGE`).
- Current Contract effectiveness as verified by the caller; grant effective period and revocation.

Missing grant, mismatched Actor/Tenant/Service/Contract/Recipient/Work, expired/revoked grant, inactive Contract, wrong operation or object kind **deny by default**. Service-wide access requires an **explicitly Service-wide** grant; Recipient-/Work-scoped grants cannot broaden themselves.

`tests/unit/scoped-access.test.ts` verifies permitted and denied combinations, including **two different recipients within the same Tenant and Service**.

## Security boundary — what this does NOT yet do

This module is **not an entry-point guard** and offers no customer login or UI. Its inputs are trusted resolved facts, never browser-submitted Tenant/Recipient/Grant claims. The future application boundary must load active Actor membership and grants through a restricted backend transaction, resolve actual Service/Contract/Recipient/Work ownership, then evaluate authorization before querying/projection or executing commands.

In particular, **do not mark the initial-release access requirement complete based on these unit tests**:

1. The existing Google OIDC/Session binding still maps one identity to one internal Tenant Operator. External Actor enrollment and multiple Tenant memberships/context selection need a narrow ADR addition and server-side persistence.
2. Current `service_recipients` DDL supports only `PERSON`. SONIX Organization recipients and Caller-versus-beneficiary mapping need a backward-compatible core implementation.
3. The proposed explicit grants have **no DB schema, resolution/assignment flow, effective group mapping or revocation propagation**. The accepted read policy for customer/vendor Actors still needs formal integration with ADR 0002.
4. Existing SUPPORT/Explore/JOIN queries still return broad same-Tenant records under internal Read Authority v1. Each list, detail, search, count, related item, download and command must enforce server-side scope, not client-side post-filtering.
5. Public inquiry form, customer/vendor editing of SUPPORT and Registry, formal Procedure CRUD, and end-to-end Audit remain to be implemented.
6. RLS Tenant isolation remains mandatory; the pure evaluator is **additive** and cannot replace restricted PostgreSQL role tests, foreign-key integrity or cross-Tenant E2E tests.

## Next bounded implementation sequence

1. Review the only unresolved technical Decisions: external Read/Write grant semantics, authenticated membership/context selection, and how recipient Organizations are represented alongside existing Person recipients. Keep them in common Core; no SONIX branches.
2. Implement backward-compatible recipient/beneficiary representation and trusted binding of Actor, Tenant, active Contract and explicit scope grants. Add DB-level negative and revocation tests.
3. Route all query/command paths through authorization at or before repository projection. In particular prevent a customer A user from seeing customer B records in the same Tenant/Service, even via search or direct IDs.
4. Add public inquiry intake and the shared editor/viewer experiences for customer/vendor Actors. Complete E2E negative tests, UI review and a separate production approval Gate.

No migration, public API, external user enrollment, privilege grant, DB write or production deployment was performed in this slice.
