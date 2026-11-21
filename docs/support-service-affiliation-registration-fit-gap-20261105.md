# FACTACT SUPPORT — Service-first intake / 所属・問い合わせ者登録 Fit/Gap（2026-11-05）

Status: **Common intake design corrected 2026-11-06; implementation in separate Draft PR.** This file retains the 2026-11-05 Fit/Gap as historical evidence; the 2026-11-06 clarification below governs any conflicting earlier proposal. Unverified caller statements must never be promoted to verified Registry Facts.

## Final clarification: no per-Service caller flow

**All SUPPORT Services share exactly one caller intake** regardless of their business model. A phone caller can be an employee, member-company representative, external vendor or another third party. **The caller's affiliation is not equivalent to the Service's owner, eligible customer, or beneficiary.** We must not implement `SONIX` conditional branches, contract-specific caller intake flags, member-list gates, vendor-only screens, or a special plan membership schema.

The common interaction is **Service → 所属 (select existing or type new) → お名前 (select existing or type new) → 問合せ内容**. A newly typed affiliation is marked as *unlisted at reception* for that inquiry, and may be reused later. The marker is a UI/provenance fact about the input method, **not** evidence of plan membership, service authorization or identity. Registered Organization/Person data and the caller's unverified report remain separate. Service active Contract and Operator role checks still govern execution; this does not imply that every caller is an eligible beneficiary.

## Confirmed SONIX operating policy (2026-11-06)

The customer explicitly confirmed: an organization missing from the SONIX plan-member list **remains a SONIX customer**. Its inquiry is **accepted and handled normally**, not held for plan-membership verification. **After answering/handling the inquiry**, the operator invites the customer to join the applicable plan. No refusal, no deferral of support, and no requirement to purchase the plan before assistance.

These are independent concepts: (1) Service/customer scope, (2) affiliation/person identity and caller statements, (3) optional plan enrollment. **Member-list omission is not a negative customer-eligibility verdict**. All services use the same intake, with current Tenant/Contract/Role boundaries. Lack of independent caller identity verification does not become a verified Fact merely because the Work proceeds.

**Scope clarification (same day):** no special plan-membership or post-response outreach schema/UI is requested. The actual requirement is that **所属 can be typed anew when absent from the dropdown**, and that it remains visibly marked as *unlisted/newly typed at the time of inquiry* even after being reused in the registry. The existing inquiry response record suffices for noting a post-response plan invitation when relevant. **“Not in the dropdown at reception” does not mean “confirmed not a member.”**

## Product decision already accepted

Use one generic intake flow:

1. Select a **Service** as the higher-level working context (e.g., `A社 情シス運用支援` or `SONIX ONE フレンドリーヘルプデスク`). A single-service operator may have a preset context.
2. Select or enter **所属**: the client's department (`営業部`), member company (`○○株式会社`), an external vendor or another caller affiliation.
3. Select or enter **お名前**: registered and first-time callers both have to be supported.
4. Record the person's inquiry. Registration should be reusable for subsequent inquiries, but the caller's **assertion**, the persisted **identity record**, the **Service eligibility**, and a **verified Fact** are different things.

There must be no SONIX-specific form, Person copy, custom Work engine, or separate service database. The same components and contracts must work for both examples.

## Actual repository Fit/Gap

| Layer | Current implementation (fit) | Gap for the accepted flow |
| --- | --- | --- |
| Core | `docs/02-domain-model.md` already defines `Organization`, `Person`, `Service`, `ContractProfile`, `ServiceRecipient` and dynamically assembled Service Context. In the conceptual Core, a Service Recipient **may** be an Organization, not only a Person. | Physical V1 representation and application contracts are narrower; design must respect original semantics. |
| Organization (`20260909000100_platform_baseline.sql`) | Tenant-scoped `id, name, status`; Person links to `organization_id`. | No parent/department hierarchy, external member identifier, registration source, identity status, deduplication rules or scoped service eligibility. The `name` alone is not a reliable unique key. |
| Person (same baseline) | `id, organization_id, display_name, email?`, `lifecycle_status`; person name can be reused across views. | No Operator create/select-or-new API, no caller source/reliability/verification metadata, no search-and-confirm duplicate flow. JOIN's employee lifecycle status is **not** proof of caller identity. |
| Service / Contract | Service references one `organization_id`; one active SUPPORT-enabled Contract is selected and its execute role enforced. | `service_model_code` initially permitted only `JOSYS_KAIZEN`. This is unrelated to caller affiliation; do not special-case service-specific intake. |
| ServiceRecipient (`20260909000200_join_slice.sql`) | Tenant/Service/Person unique relation; `ensureRecipient` can create it on first SUPPORT Event. | Physical `recipient_type='PERSON'` only. Crucially, creating a ServiceRecipient is not independent evidence of membership or a verified caller. |
| SUPPORT create Event (`support-commands.ts`) | Transactionally checks Operator, live Contract, role, request idempotency and caller statement. Creates an Event with an **UNVERIFIED** Observation. | A hard `person.organizationId === service.organizationId` check incorrectly equated caller and Service owner; vendor callers demonstrate why it must not be an intake gate. Keep the independent service Contract/role controls. |
| SUPPORT list/UI (`support-queries.ts`, `support-ui.tsx`) | Existing Persons and eligible Services in drop-downs. | No Service-first selection, affiliation filter, create-or-select, duplicate confirmation or first-contact registration. |
| SUPPORT Work/Knowledge | Event → human Requirement Evaluation → Work is already enforced; audit is present. | Seeded demo code still hardcodes `VPN` in Work title, next action, Unknowns and Knowledge topic. These must be made service-neutral, without per-service workflow branches; Issue #17 only removed the hardcoded label from a list. |
| Zoho / import | Existing data can be represented by generic Organizations/Persons at the conceptual level. | No member-company import adapter, sync conflict handling or source version; adding a Zoho-specific table would be premature. |

## Proposed minimal shared relation

Keep **one Tenant** as the security boundary and the existing generic objects:

- **Service + effective ContractProfile**: what operation is being provided and under which permissions.
- **Organization (= 所属 in this UI)**: a department or member company **identified within the Tenant**. A future parent Organization or Organization Relation may express its hierarchy if actually required; neither a separate `Department` nor `SONIXCompany` model is needed at this stage.
- **Person**: the individual contact identified with a given affiliation; avoid automatically merging equal names across different Organizations.
- **ServiceRecipient**: the V1 technical join used by SUPPORT Events/Work. For a vendor caller this **must not** be misinterpreted as verification that the vendor receives, owns or is authorized for the Service. A future explicit beneficiary/affected-target separation is a core modeling review, not grounds for per-Service forks.
- **Affiliation** is caller contact context, not Service entitlement. No affiliation/plan eligibility relation is required simply to accept an inquiry. Existing `services.organization_id` remains the Service owner, and should not be imposed on the caller.

This distinction allows `SONIX ONE → 会員企業・外部ベンダー → それぞれの担当者` and `A社 情シス支援 → 部署・取引先 → 各担当者` to use one flow. A caller's ability to be recorded does not imply a contract entitlement to all services.

## Registration and verification boundary

**Recommendation for the first implementation slice:**

1. Service context first; show **所属 → お名前 → 問い合わせ内容** consistently. Affiliation and Person can be selected from current records or entered as new.
2. Search for duplicate candidates **inside the Tenant/affiliation** before create; compare optional email/contact or trusted external identifier when available. Human confirms the correct Person or records a distinct new one; never merge solely by display name.
3. New Organization/Person may become **formal reusable registry entries**, but creation is not an assertion of verified membership, employment, identity or device facts. Persist the source, recording operator/time and an explicit verification state/absence of verification through the chosen existing Fact/Observation/Audit semantics. Do not re-purpose `lifecycle_status` as proof.
4. For **every** Support Service, register callers from any affiliation within the same Tenant. Do not gate on membership or match to the Service owner's Organization. Preserve the active service Contract, current Operator role checks and Event → Evaluation → Work. Any business-specific follow-up belongs in the existing response record, not a new workflow.
5. Existing Person callers continue to use the established Event → Evaluation → Work and RLS path without duplicate records or an extra mandatory step.

## STOP items requiring bounded contract decisions

| ID | Missing decision / contract | Recommended starting point |
| --- | --- | --- |
| SG-01 | Whether caller's affiliation must equal Service owner. | **RESOLVED:** no. Caller may be employee, member, vendor, other. Scope/entitlement is a different decision, not an intake prerequisite. |
| SG-02 | How to handle an Organization absent from the SONIX list? | **DECIDED 2026-11-06:** allow new affiliation entry and standard assistance; retain the *new-at-reception* marker. Operational plan invitation follows resolution, using existing records. No dedicated membership workflow. |
| SG-03 | Registration evidence, duplicate policy and update authority for Organization/Person; cross-service reuse. | Reusable master entries with recorded source, separate verification, Human duplicate choice and audit; no automatic cross-tenant sharing. |
| SG-04 | Generic Work title/next action/Unknowns and SUPPORT topic independent of VPN. | **RESOLVED in implementation:** shared neutral titles/defaults; no per-service workflow fork. |
| SG-05 | Zoho membership import and external identity mapping. | Adapter and durable external identifiers *after* affiliation and scope contract. Manual entry must remain available. |

These items are **not** pretexts to restart previous A1/A2 design. They arise from exact currently hardcoded schema and commands and are required for first-time callers and cross-company scope without weakening authorization.

## Bounded delivery sequence after SG contract acceptance

1. **Common intake projection + UI**: Service first, Tenant-scoped Organizations, Persons filtered by selected affiliation, `新規入力`, duplicate confirmation and reusable registration. No service-specific UI.
2. **Application registration**: explicit commands and source/reliability/audit, permissions and idempotency; transaction-safe Event issuance, no unverified claim converted into Fact.
3. **Database boundary**: smallest required migration for source/provenance and generic service model, Tenant RLS, FKs, replay/backfill for seeded A1/A2 scenarios. No production deployment without migration approval.
4. **Generic SUPPORT defaults**: remove VPN-only title, next action and unknowns, preserving existing Work lifecycle and Golden behavior.
5. **Import adapter** (later): SONIX Zoho list and other service/customer sources via the same data contract; reconcile duplicates and stale memberships.

Regression proof must include: existing A1/A2 caller, A社→営業部→新入社員, SONIX→A/B member companies→first-time caller, **external vendor caller**, unregistered affiliation, same-name collision, repeat contact, retired contract, role enforcement, Tenant RLS, idempotent retries and read-only inspection. Do not add member-list or owner-organization rejection tests. Human Review should verify 13-inch UI and no unwanted extra steps.

The original Draft PR #22 recorded Fit/Gap and STOP only. The separate 2026-11-06 implementation is a Draft change, not a production migration. No production actions are authorized here.
