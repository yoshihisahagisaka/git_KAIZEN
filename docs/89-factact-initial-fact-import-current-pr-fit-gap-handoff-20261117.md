# FACTACT 初期FACT取込 — 現行PR照合結果とProduct Lane確認依頼（2026-11-17）

Status: **READ-ONLY PRODUCT FIT/GAP CHECKPOINT — NO IMPLEMENTATION AUTHORIZATION**
Parent: docs/87 and docs/88

## 1. Evidence inspected
- `git_KAIZEN` main: FACTACT Domain/Application/SUPPORT and historic architecture validation.
- `feat/factact-registry-integrated-acceptance-20261110` branch, tree SHA `b8a7b38d0a904234c80aeeadf497c00265b08c49`.
- `docs/factact-scoped-registry-first-edit-implementation-contract-accepted-20261110.md`, `packages/domain/src/registry-edit.ts`, `packages/application/src/registry-edit-commands.ts` on that branch.
- Draft PR #60 metadata, head SHA `607648da81434fa0a71ea2a37f4943856dcada74`, stacked on Draft PR #59.
- `atlib-it-management-kaizen/docs/03_BUILD.md`; `git_KAIZEN/docs/25-factact-multiview-connection-ai-off-principles-v1.md`.

## 2. Verified conclusions
1. Existing product semantics recognize Person/Device/Account/Application and Evidence/Relation/Rule/Authority, and Excel/Document as Connection; BUILD is explicitly Evidence→operational FACT transformation. **Principle FIT**.
2. Current first Registry-edit slice is narrowly **existing Person display_name correction**, with exact scoped grants and two-human verification. It explicitly excludes Person creation, broad PATCH and **bulk updates** in this slice. Therefore it **cannot be represented as an already implemented generic bulk-import API**. This is a **scope GAP for that slice**, not proof that the whole product lacks import capabilities.
3. Registry Change lifecycle has proposed→verified→committed semantics, but no evidence from inspected branch of a generic import command supporting asset rows, procedures, approvals and relationships. **Product UNKNOWN** pending authoritative latest branch/PR scan.
4. Import cannot bypass source/provenance, human authority, tenant isolation, dual-control policy or current-state difference review. It must not reuse `PERSON_DISPLAY_NAME_CORRECTION` for unrelated fields or generate fake Work/Action.
5. FACTACT operation is deterministic; Assessment AI may suggest mappings externally, not run the Core workflow.

## 3. Bounded Product Lane request
**Goal:** Assessment Excel/CSV import -> human-reviewed FACTACT initial operational FACT -> reuse in BUILD/SUPPORT, using existing Core first.

Return an evidence-backed matrix for:
- target object types and supported fields (Person/Device/Account/Application/Site/Contract/Procedure/Rule/Authority/Relation);
- currently implemented import/connection APIs, any CSV mapping, batch preview, dedup/difference, verify and commit, with exact branch/SHA/file;
- whether a minimal application-level import adapter can reuse existing verified mutation paths, or new typed commands/approval are needed;
- strict separation of Source Observation vs verified Fact; multi-tenant/actor grants; no generic privileged bypass;
- procedural/unstructured documents: scope only after data-model Fit.
Classify FIT / GAP / CONFLICT / UNKNOWN separately for **semantic design** and **executable implementation**. Do not infer Core GAP from missing adapter.

**No-Go:** No new Core Object, generalized bulk UPDATE, migration, API, production action or PoC without separate Product review and authorization.

## 4. Practical first candidate (not approved implementation)
A **single Excel/CSV table** for one existing FACTACT target type, with columns auto-mapped by deterministic aliases first, optional AI suggestion for ambiguous labels, row preview, human correction, verification and existing authorized commit. Batch ingestion must not silently turn imported rows into verified facts. Multiple-file convenience and document interpretation can follow once this narrow contract is validated.
