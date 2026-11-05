# FACTACT SUPPORT — Service-first intake / 所属・問い合わせ者登録 Fit/Gap（2026-11-05）

Status: **Implementation STOP pending bounded Data/Authority Contract**. This is an evidence-backed Fit/Gap and implementation proposal for GitHub Issue #19, **not** an authorization to change schema or promote unverified caller information to verified Registry Facts.

## Product decision already accepted

Use one generic intake flow:

1. Select a **Service** as the higher-level working context (e.g., `A社 情シス運用支援` or `SONIX ONE フレンドリーヘルプデスク`). A single-service operator may have a preset context.
2. Select or enter **所属**: the client's department (e.g., `営業部`) or a member company (e.g., `○○株式会社`).
3. Select or enter **お名前**: registered and first-time callers both have to be supported.
4. Record the person's inquiry. Registration should be reusable for subsequent inquiries, but the caller's **assertion**, the persisted **identity record**, the **Service eligibility**, and a **verified Fact** are different things.

There must be no SONIX-specific form, Person copy, custom Work engine, or separate service database. The same components and contracts must work for both examples.

## Actual repository Fit/Gap

| Layer | Current implementation (fit) | Gap for the accepted flow |
| --- | --- | --- |
| Core | `docs/02-domain-model.md` already defines `Organization`, `Person`, `Service`, `ContractProfile`, `ServiceRecipient` and dynamically assembled Service Context. In the conceptual Core, a Service Recipient **may** be an Organization, not only a Person. | Physical V1 representation and application contracts are narrower; design must respect original semantics. |
| Organization (`20260909000100_platform_baseline.sql`) | Tenant-scoped `id, name, status`; Person links to `organization_id`. | No parent/department hierarchy, external member identifier, registration source, identity status, deduplication rules or scoped service eligibility. The `name` alone is not a reliable unique key. |
| Person (same baseline) | `id, organization_id, display_name, email?`, `lifecycle_status`; person name can be reused across views. | No Operator create/select-or-new API, no caller source/reliability/verification metadata, no search-and-confirm duplicate flow. JOIN's employee lifecycle status is **not** proof of caller identity. |
| Service / Contract | Service references one `organization_id`; one active SUPPORT-enabled Contract is selected and its execute role enforced. | `service_model_code` permits only `JOSYS_KAIZEN`. An actual SONIX member-company Service requires generic multi-affiliation eligibility while keeping the Service/Contract envelope. |
| ServiceRecipient (`20260909000200_join_slice.sql`) | Tenant/Service/Person unique relation; `ensureRecipient` can create it on first SUPPORT Event. | Physical `recipient_type='PERSON'` only. Crucially, creating a ServiceRecipient is not independent evidence of membership or a verified caller. |
| SUPPORT create Event (`support-commands.ts`) | Transactionally checks Operator, live Contract, role, request idempotency and caller statement. Creates an Event with an **UNVERIFIED** Observation. | Hard requirement `person.organizationId === service.organizationId` rejects a SONIX member company or a separately represented department; accepts only an already-persisted Person. Blindly deleting this check would allow unrelated Tenant Persons to enter a Service. |
| SUPPORT list/UI (`support-queries.ts`, `support-ui.tsx`) | Existing Persons and eligible Services in drop-downs. | No Service-first selection, affiliation filter, create-or-select, duplicate confirmation or first-contact registration. |
| SUPPORT Work/Knowledge | Event → human Requirement Evaluation → Work is already enforced; audit is present. | Seeded demo code still hardcodes `VPN` in Work title, next action, Unknowns and Knowledge topic. These must be made contract/configuration-driven for service-neutral operation; Issue #17 only removed the hardcoded label from a list. |
| Zoho / import | Existing data can be represented by generic Organizations/Persons at the conceptual level. | No member-company import adapter, sync conflict handling or source version; adding a Zoho-specific table would be premature. |

## Proposed minimal shared relation

Keep **one Tenant** as the security boundary and the existing generic objects:

- **Service + effective ContractProfile**: what operation is being provided and under which permissions.
- **Organization (= 所属 in this UI)**: a department or member company **identified within the Tenant**. A future parent Organization or Organization Relation may express its hierarchy if actually required; neither a separate `Department` nor `SONIXCompany` model is needed at this stage.
- **Person**: the individual contact identified with a given affiliation; avoid automatically merging equal names across different Organizations.
- **ServiceRecipient**: the Person's service-recipient role in this Service. It is not proof of the affiliation's membership.
- **Explicit Service ↔ eligible affiliation relation/lookup**: a needed bounded entitlement layer, with source and eligibility status. The physical representation (existing Relation vs minimal association table, FK, effective dates, owner, review state) is **STOP** until the Data/Authority Contract is reviewed. Existing `services.organization_id` remains the service owner; it must not be overloaded as the only eligible affiliation.

This distinction allows `SONIX ONE → 複数会員企業 → それぞれの担当者` and `A社 情シス支援 → 複数部署 → 各社員` to use one flow. A contract is not implicitly valid for *every* Person in the same Tenant.

## Registration and verification boundary

**Recommendation for the first implementation slice:**

1. Service context first; show **所属 → お名前 → 本人からの申告** consistently. Affiliation and Person can be selected from current records or entered as new.
2. Search for duplicate candidates **inside the chosen Service/affiliation** before create; compare optional email/contact or trusted external identifier when available. Human confirms the correct Person or records a distinct new one; never merge solely by display name.
3. New Organization/Person may become **formal reusable registry entries**, but creation is not an assertion of verified membership, employment, identity or device facts. Persist the source, recording operator/time and an explicit verification state/absence of verification through the chosen existing Fact/Observation/Audit semantics. Do not re-purpose `lifecycle_status` as proof.
4. Check Service affiliation eligibility independently of caller identity before enabling operational actions. **Recommended unknown-eligibility policy:** accept and retain the incoming inquiry, mark eligibility as requiring confirmation, and do not automatically infer authorized service coverage. The existing **受付のみ** path can be reused, but a genuine pending-eligibility state and its effect on Requirement Evaluation must be specified before code.
5. Existing Person callers with valid Service eligibility must continue to use the established Event → Evaluation → Work and RLS path without duplicate records or an extra mandatory step.

## STOP items requiring bounded contract decisions

| ID | Missing decision / contract | Recommended starting point |
| --- | --- | --- |
| SG-01 | Definition of a Service-eligible **所属**, its effective dates, import source and review authority. | Use existing Organization/Service/Contract concepts; explicit scoped relation with provenance. No implicit same-Tenant or same-name eligibility. |
| SG-02 | What happens to a first inquiry when affiliation is **not yet verified** or the SONIX member list is stale? | Preserve reception and caller statement; keep coverage unverified and require Human check before operational authorization. |
| SG-03 | Registration evidence, duplicate policy and update authority for Organization/Person; cross-service reuse. | Reusable master entries with recorded source, separate verification, Human duplicate choice and audit; no automatic cross-tenant sharing. |
| SG-04 | Generic configured Work title/next action/Unknowns and SUPPORT topic independent of VPN. | Contract/ServiceModel-driven labels or scoped default; no per-service workflow fork. |
| SG-05 | Zoho membership import and external identity mapping. | Adapter and durable external identifiers *after* affiliation and scope contract. Manual entry must remain available. |

These items are **not** pretexts to restart previous A1/A2 design. They arise from exact currently hardcoded schema and commands and are required for first-time callers and cross-company scope without weakening authorization.

## Bounded delivery sequence after SG contract acceptance

1. **Common intake projection + UI**: Service first, filtered Organizations and Persons, `新規入力`, duplicate confirmation and reusable registration. No service-specific UI.
2. **Application registration/eligibility**: explicit commands and source/reliability/audit, permissions and idempotency; transaction-safe Event issuance, no unverified claim converted into Fact.
3. **Database boundary**: smallest required migration for scoped affiliation and provenance, Tenant RLS, FKs, replay/backfill for seeded A1/A2 scenarios. No production deployment without migration approval.
4. **Generic SUPPORT defaults**: remove VPN-only title, next action and unknowns, preserving existing Work lifecycle and Golden behavior.
5. **Import adapter** (later): SONIX Zoho list and other service/customer sources via the same data contract; reconcile duplicates and stale memberships.

Regression proof must include: existing A1/A2 caller, A社→営業部→新入社員, SONIX→A/B member companies→first-time caller, unregistered affiliation, same-name collision, repeat contact, wrong-service rejection, revoked membership, retired contract, role enforcement, Tenant RLS, idempotent retries and read-only inspection. Human Review should verify 13-inch UI and no unwanted extra steps.

**This PR records Fit/Gap and STOP only.** No new Registry writes, Service eligibility changes, migrations or production actions are made here.
