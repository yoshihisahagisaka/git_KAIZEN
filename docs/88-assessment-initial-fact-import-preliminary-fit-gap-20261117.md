# 設計Assessment初期FACT取込 — Canonical Fit/Gap予備調査（2026-11-17）

Status: **READ-ONLY PRELIMINARY FIT/GAP — FACTACT Product Lane verification required**
Business Decision: docs/87-design-assessment-analysis-and-initial-fact-import-business-decisions-20261117.md

## 調査対象・限界
- Business Canonical: git_KAIZEN/docs/20, docs/25-factact-multiview-connection-ai-off-principles-v1.md, docs/factact-product-operating-principles-v1.md, docs/86, docs/87
- BUILD Canonical: atlib-it-management-kaizen/docs/03_BUILD.md, docs/07_FACTACT_BUSINESS_MODEL.md
- atlib-sales-tools main git tree (SHA 850e1f0bc9c6a2d269b0d5f71d239c1c98df05ae), 461 entries, full tree; names for FACTACT import / Registry / Procedure / Authority implementation not found.
- This does **not** establish FACTACT implementation absence: actual FACTACT repository, non-main branch, and latest Product Lane Canonical have not been fully identified or reviewed. Search misses are UNKNOWN, not GAP.

## Preliminary findings
| Requirement | Status | Evidence / boundary |
|---|---|---|
| Existing Excel/Document → FACTACT Connection | **PRINCIPLE FIT** | docs/25 explicitly models Excel/Document as Connection, not source-specific Core |
| Import → Difference → Human Review | **PRINCIPLE FIT** | docs/25 section 4; AI OFF for Connection/Import and difference detection |
| FACT/UNKNOWN/Relation/Rule/Authority/Operational Context migration | **BUSINESS FIT** | docs/03_BUILD.md defines Evidence→Entity/Relation/Rule/Context→FACT/UNKNOWN→Verify→Operational Context |
| Assessment pre-build reusable initial FACT | **BUSINESS FIT** | docs/03 BUILD price rationale: Assessment completes Evidence/FACT/Work discovery; BUILD does not redo research. docs/87 moves useful structured registration earlier |
| FACTACT AI-less operation / optional external AI assist | **PRINCIPLE FIT** | FACTACT product operating principles §§4,8 and docs/25 §7; deterministic Core |
| Human-controlled Change→Verify→Commit | **PRINCIPLE FIT** | docs/20, docs/87; verify exact import registration contract in Product Lane |
| Simple SaaS-style Excel/CSV column mapping | **PRODUCT UNKNOWN** | requirement fixed in docs/87; no verified existing importer API/UI |
| Batch upload / mapping suggestion / duplicate handling | **PRODUCT UNKNOWN** | implementation and APIs not yet inspected in authoritative FACTACT repo |
| Procedure/Rule/Authority import from unstructured documents | **PRODUCT UNKNOWN** | target semantics recognized; mapping and verification contract unknown |
| Support can immediately use registered initial FACT | **CONDITIONAL FIT** | product principles support access to Person/Device/Account/Knowledge/Rule etc.; actual operation requires appropriate authorization, verified data and BUILD Go-Live |
| Need for new Core Objects | **NOT ESTABLISHED** | docs/25 and docs/86 mandate existing Core first |

## Boundary / important nuance
- Product principles say **AI-less by default**, not prohibition of optional AI in every product surface. For this Assessment use case, AI is outside FACTACT Core and used for mapping suggestions; normal FACTACT Work remains deterministic. No product change implied.
- Do not equate successful import with verified FACT: original source, provenance, current-state difference and UNKNOWN remain.
- Do not treat the prior GitHub main tree as authoritative for FACTACT Core.

## Next Product Lane verification request (bounded)
1. Identify authoritative FACTACT repo/ref and latest Canonical; report their commit SHAs.
2. Locate existing Connection/Import contracts, target object types (Person, Device, Account, Application, Procedure/Knowledge, Rule, Authority), verified registration entry points.
3. Determine for each whether Excel/CSV column mapping, batch import, preview, dedup/difference, human verification, and commit are FIT/GAP/CONFLICT/UNKNOWN with file/line evidence.
4. Identify minimal Application/Translation Layer additions without changing Core.
5. Return evidence-backed Fit/Gap; no code, DB, migration or deployment changes.

Business Lane must not infer Core GAP or implement importer before Product Lane verification.
