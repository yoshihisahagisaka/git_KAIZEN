# FACTACT P0-C — Simple Procedure Pages / SONIX Service-In 2027-01

**Status:** Product Owner direction accepted 2026-11-25. **Implementation input, not an implementation or release acceptance.**  
**Source:** [SONIX P0 #100](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/100), [P0-C #103](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/103), [SUPPORT assist #18](https://github.com/yoshihisahagisaka/git_KAIZEN/issues/18).  
**Reference tree:** Core Draft PR #94 HEAD `11f2e7dc64e13bf5f760a214d6b2a5b9927862a4`, not main or the diverged historical PR #21.

## 1. Final product decision

An **editable FACTACT page**, not a link collection or file-management tool, is the principal procedure interface. The operator uses the SUPPORT right-hand **対応アシスト** to find and view short scripts/procedures/FAQ **without leaving the current Work or losing an unsaved response**. An authorized atLIB administrator can immediately edit the text in FACTACT. An optional HTTPS link is only a reference for a long external document. This is one generic FACTACT service capability, **not a SONIX-specific system, customer master, database, Knowledge model or Work**.

### Explicitly out of scope

- Hierarchical content blocks, rich HTML/WYSIWYG editor, attachments/file upload, page trees, embedded media, in-app Office editing, document import/conversion.
- Formal version releases, review workflow, approval queues, auto Knowledge/Rule promotion, AI search, AI-generated content, RAG/vector indexing, external document sync, auto classification, analytics.
- Customer-specific notes, Personally Identifying Information, verified Registry facts, Service Recipient membership and contract eligibility embedded as procedures; those remain their own existing records.
- A parallel generic CMS or independent permission/session mechanism.

Existing `KnowledgeCandidate.status=CANDIDATE` remains **unapproved**. A procedure page is an operator-facing published instruction, NOT a verified Fact or converted Knowledge Candidate. Document review/approval happens **outside** FACTACT in the SONIX service-in lane; the page publishing operator confirms operational approval before display.

## 2. FIT / GAP in current Core

| Capability | Fit | Minimum addition |
| --- | --- | --- |
| SUPPORT left editor + right assist | `apps/web/src/client/support-wizard.tsx`, `support-context.tsx`, native `ContextDialog` | Add procedure search/open/read in right assist. Preserve mounted Work and draft. |
| Internal/SCOPED identity | Google OIDC Session, `commandBoundary`, `read_authority_mode` | Check actor and specific Service/Work on every request; no broad fallback. |
| Explicit procedure permission | `packages/domain/src/scoped-access.ts`: `objectKind=PROCEDURE`, READ/UPDATE operations, scope SERVICE/RECIPIENT/WORK | Reuse existing Grant evaluation; no new object kind/roles. |
| Service/Contract context | `services`, effective `contract_profiles`, scoped target resolution | Resolve Work → Service + effective Contract server-side; never trust browser actor/tenant/contract IDs. |
| Published content | None. Current right pane only Knowledge Candidates and demo procedure | One minimal page table plus append-only edit history, with tenant RLS. |
| Search | Existing Explore/candidate search is not approved pages; historical PR #21 keyword UI diverged | Simple PostgreSQL title/body matching; do not merge PR #21 wholesale. |
| Admin content edit | Admin Policy interface is for a different domain | Small dedicated editor with existing OIDC/CSRF/role-authority pattern, not a new framework. |

## 3. Data contract — proposed minimum new structures

Use forward-only migration after the current 43 ordered migrations. **Migration filename must be chosen from current repo HEAD at implementation time; do not edit historical migrations.** Apply only to separately approved Hosted migration gate.

`factact.procedure_pages` — current visible projection:
- `id UUID PK`, `tenant_id UUID NOT NULL`.
- `scope_kind TEXT NOT NULL CHECK (scope_kind IN ('COMMON','SERVICE'))`; `service_id UUID NULL`. `SERVICE` requires service_id; `COMMON` requires NULL. COMMON pages are generic technical instructions within the same Tenant, *never cross-Tenant*.
- `category TEXT NOT NULL CHECK (category IN ('SCRIPT','PROCEDURE','FAQ'))`.
- `title TEXT NOT NULL` (trimmed 1–160 chars); `body_text TEXT NOT NULL` (non-empty, at most **12 KiB UTF-8**); `reference_url TEXT NULL` (validated https allowlisted external reference only).
- `status TEXT NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','HIDDEN'))`; new pages default DRAFT. DRAFT/HIDDEN never appear to ordinary operators. Publish is deliberate administrator action, only after SONIX operating approval; editing a published page is a deliberate authorized update, not automatic Fact verification.
- `sort_order INTEGER NOT NULL DEFAULT 0`, `revision INT NOT NULL DEFAULT 1`, `created_at/created_by_operator_id`, `updated_at/updated_by_operator_id`. Initial `published_at` optional if needed to evidence first publication.
- FK (`tenant_id,service_id`) for SERVICE pages to existing `factact.services`; FK actor IDs to existing Operator; `unique(tenant_id,id)`. No `document_id` external canonical or Category hierarchy.
- Index by `(tenant_id,service_id,status,category,sort_order,id)` and common scope; small dataset uses bounded `ILIKE` search and no new search service/extension.

`factact.procedure_page_edits` — **minimal immutable accountability only**, not a user-facing versioning application:
- `id UUID PK`, `tenant_id, page_id, actor_operator_id, occurred_at, request_id UNIQUE per tenant/page`, `kind=CREATED|UPDATED|PUBLISHED|HIDDEN`, `reason` (small string), `previous_title/body_text/reference_url/status` **only where old content exists**, `new_revision`; preserve prior edit text for correction audit.
- Only named internal write path may append; never expose full snapshots in routine reader API. Existing `factact.audit_events` also records page ID/action/actor/time/revision/requestId **without procedure full text**. Do not store document bodies or secret URLs in global Audit metadata.

Both tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`, explicit `tenant_isolation` policies for restricted runtime, no blanket grant, no BYPASSRLS. For edit path, check narrowed grants and execute read-current → revision guard → update/append history/Audit **in one transaction**, so failure rolls back everything. Keep tenancy and change authority enforced in application and SQL, not UI alone.

**Simplicity note:** The tiny append-only internal edit table is a safety/audit requirement, not full revision management: no diff viewer, restore UI, release tags, branch history or approval workflow.

## 4. HTTP, Authority, and client surfaces

**4a. Worker read** (common across INTERNAL_V1 and SCOPED; no new authentication):
- `GET /api/support-work/:workId/procedure-pages?q=<text>&category=...&limit=20&cursor=...`
- `GET /api/support-work/:workId/procedure-pages/:pageId`
- Derive Tenant/Actor from verified OIDC Session, derive Service/Contract/Recipient from the **authorized Work**. For SCOPED, require current, active `PROCEDURE READ` grant permitting the exact WORK or Service target and independent Work access; no new READ inferred from phone, caller, or SUPPORT Role. For internal `INTERNAL_V1`, use current DB-derived Role/authority v1, *never silently classify SCOPED as internal*. Recheck Grant revocation and Contract effectiveness on each call.
- Return only PUBLISHED pages whose `service_id = work.service_id` or COMMON within the Work Tenant. COMMON publication allowed only for truly generic knowledge with no customer-specific text. Never accept caller-provided tenantId/actorId/contractProfileId, nor untrusted serviceId as an alternate route to other documents.
- Search: empty q lists bounded sorted pages; nonempty q normalized NFKC by application, case-insensitive literal contains over title/body. Escape SQL `%`, `_`, backslash so wildcard injection is not accepted as wildcard; SQL parameters only, query max 100 characters, result page <=20, stable `sort_order,id` cursor. No total global count or snippet from unauthorized page. GET read-only/no audit write; `Cache-Control: no-store`.

**4b. Editor** (initially atLIB internal `INTERNAL_V1` ADMIN verified in DB, not simply an email/domain):
- `GET /api/admin/procedure-pages?serviceId=...&status=...&limit=20...` (include DRAFT/HIDDEN for authorized admin).
- `POST /api/admin/procedure-pages` create DRAFT; `PATCH /api/admin/procedure-pages/:pageId` explicit revision check/description change; `POST .../:pageId/publish`, `POST .../:pageId/hide` with `requestId`, `expectedRevision`, and a short reason. No physical DELETE.
- Validate strict Zod object and title/body/URL. Ignore no client-side actor authority; server revalidates current DB Role/status, Service belonging to the Tenant and optional Contract context. Mutations require existing OIDC Session + Origin/CSRF as per `commandBoundary`, existing restricted DB privilege path, actor-keyed concurrency lock/revocation correctness.
- Guard against script injection: **plain text only** displayed via React escaped content with preserved newlines. Reject raw HTML interpretation and Markdown-to-unsafe-HTML. External URL only `https:`, no embedded credentials, no `javascript:` or `data:`, enforce approved host(s) configured server-side, `rel=noopener noreferrer` on new tabs; don't fetch URL server-side.
- Keep JSON payload below app's existing `express.json({limit:'16kb'})`; enforce max body by UTF-8 bytes not only JS string length; no global parser limit increase.
- For updates, `expectedRevision` conflict yields 409 with request to refresh; repeated `requestId` is idempotent; no silently overwriting parallel edits. Before/after source audit must remain intact after corrections.

**4c. UI**:
- Right `対応アシスト` gets **手順書・FAQ** section: category tabs, search, PUBLISHED title, open content in in-place native dialog or non-destructive right panel; distinguish `KnowledgeCandidate` as 未承認. Show no false results when empty or permission denied.
- New simple **手順書管理** for ADMIN: service/Common selection, page list, create/edit textarea, category, optional external HTTPS reference, Draft/Publish/Hide, no structure or large editor dependencies. No customer data entry in docs. Editor can update text without Git/Deploy.
- 13-inch Windows layout and mobile support; current Work response draft and unsaved text must survive search/open/close; no Registry/Fact/Work state mutation from procedure lookup.

## 5. Bounded implementation packages

1. **C1 Persistence / Authority**: forward migration + minimal typed repo / pure validations / session-authorized API read and admin mutate; GOLDEN DB tests including row-level negative and Audit injection rollback.
2. **C2 UI**: reusable right assist dialog and separate mini-editor; browser tests for search, state, unsaved Work draft, service/Common selection. Do not redesign SUPPORT.
3. **C3 End-to-end**: SONIX lane supplies approved sample text; Synthetic two services/two customers/two actors, published vs draft vs hidden, revoked Grant, cross-Tenant/Service, double edit conflicting revision, XSS, body size, fullwidth Japanese search, stale session, audit, DB migration, browser 13-inch.
4. **C4 Config / release**: import approved page text manually via authorized editor (no file-import feature). Production data entry/deploy only after explicit existing Go/No-Go.

**Sequencing:** 2026-12-04 target for an operator to search/read approved page (P0); target **before 2026-12-14 functional acceptance** for the editor as practical priority. When editing cannot be accepted in time, authorize a strictly controlled admin data update as explicit operational fallback but **do not switch back to links as the primary architecture**. The SONIX service-in release must still have a safe way to update materials.

## 6. Acceptance / STOP

- Operator can work from a live SUPPORT case, search/read approved Script/Procedure/FAQ and return with exact draft unchanged; new page edits become visible on next fetch without deployment.
- Administrator can create/update/publish/hide in correct Service (and Common) without Fact/Registry/Knowledge Candidate mutation; all writes are audited/rollback-safe; concurrent edit conflicts produce explicit error.
- No page publication just because a file was received, a caller claims membership, a Candidate exists or an Admin edits a DRAFT; public display requires explicit publish.
- `SCOPED` actor with no current `PROCEDURE READ` never sees content/metadata; Work revocation, Contract expiration, Tenant mismatch, Service mismatch, URL injections, unexpected request fields, session/CSRF failure all deny.
- `npm ci`, Node24 Typecheck/Build/Unit, PostgreSQL17 non-SUPERUSER 43+forward migrations/35+FORCE RLS, browser GOLDEN/E2E, vulnerability gate. Actual pass counts recorded **after execution**, never inferred from prior Core tests.
- All parent PRs Draft/unmerged. No GCP resource change, Hosted Migration, real SONIX document publication or Production Release approved by this spec PR alone.

**Priority:** This replaces the prior Issue #103 link-first plan where the two conflict; preserve the accepted FACT FIRST / Work First / Natural Fact Accumulation / Authority First principles. No new Canonical philosophy or implementation framework.
