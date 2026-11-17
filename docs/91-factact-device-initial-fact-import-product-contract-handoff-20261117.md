# FACTACT Product Lane Handoff — Device Initial FACT Import Contract Design (2026-11-17)

Status: **BUSINESS HANDOFF — READ-ONLY PRODUCT CONTRACT DESIGN REQUEST; NO IMPLEMENTATION GO**
Business source: docs/90-assessment-initial-fact-import-business-proposals-20261117.md (APPROVED)
Related: docs/87, docs/88, docs/89; docs/86 responsibility boundary; docs/66 privacy policy; atlib-it-management-kaizen/docs/03_BUILD.md.

## Goal / acceptance outcome
A consultant can import a customer's existing PC asset Excel/CSV through a simple SaaS-like column mapping and preview, confirm candidates, and submit them through FACTACT's authorized target-specific lifecycle. After verified commit, authorized SUPPORT/Registry operators can locate the Device without a second registration. This is initial operational FACT construction during Assessment, not file management.

## Product Lane tasks (read-only design only)
1. **Authoritative baseline:** cite current FACTACT repo, branches, relevant PRs and SHAs; distinguish design from executable implementation. Do not reuse Person display-name correction as a generic import command.
2. **Device contract:** list existing fields, required fields, permissible initial Create/Update effects, identity/dedup semantics, provenance and unknowns, and how Relation fields (e.g., user) are handled without inventing unsupported relationships.
3. **Change/authority:** propose typed source event, proposed change, verifier/committer roles and grants, tenant isolation, revision/idempotency, audit and safe batch semantics; no fake Work/Action and no implicit self-approval.
4. **Import boundary:** specify a minimal data exchange from Assessment (source column mapping, normalized candidate, evidence reference, row outcome) to FACTACT. Deterministic header aliases first, optional AI suggestion outside Core. Preview and confirmation are not verified FACT.
5. **UX acceptance:** user uploads one sheet, sees suggested column mapping and row outcomes (新規候補/更新候補/差分なし/要確認/除外), corrects and confirms; unauthorized or ambiguous records do not commit; record-level feedback; no second Device table.
6. **Verification cases:** synthetic create/update, unchanged, duplicate, missing key, invalid field, changed target revision, revoked grants, cross-tenant isolation, retry/re-import, partial batch failure, no deletion by omission, Registry/SUPPORT read reuse.
7. **Data governance:** identify missing Assessment raw-source retention/AI processing decisions, distinguish evidence needed for provenance from full-file archival; do not invent retention numbers or default approval policy.
8. **Output:** FIT/GAP/CONFLICT/UNKNOWN by semantics and implementation; precise file/line evidence; minimum additive Product work; explicit open decisions and staged validation plan. Return to Business Lane before implementation.

## Guardrails
- Device is first **validation case**, not permanently exclusive scope or an instruction to inventory all devices.
- No new Core Object without demonstrated semantic gap; no generalized privileged bulk PATCH; no direct AI DB writes.
- No code, migration, DB, GCP, production, existing PR modification or merge under this handoff.
- G3/G4/G5 gates and current Registry First Edit contract remain unchanged.
