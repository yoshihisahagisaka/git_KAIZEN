# 設計Assessment 初期FACT取込 — 6つのBusiness判断案（2026-11-17）

Status: **BUSINESS PROPOSAL — NOT YET APPROVED**
Owner: IT経営KAIZEN Business Lane
Sources:
- docs/87-design-assessment-analysis-and-initial-fact-import-business-decisions-20261117.md (DECIDED)
- docs/88-assessment-initial-fact-import-preliminary-fit-gap-20261117.md
- docs/89-factact-initial-fact-import-current-pr-fit-gap-handoff-20261117.md
- docs/66-customer-data-ai-continuity-business-policy-v1.md
- docs/86-business-product-lane-responsibility-and-handoff-principles-v1.md
- atlib-it-management-kaizen/docs/03_BUILD.md
- FACTACT Product Lane read-only Fit/Gap response (2026-11-17), including Draft PR #68 head e03b660.

## Purpose
Carry already approved requirement "Assessment converts customer Excel/CSV into reusable initial operational FACT in FACTACT" toward a bounded implementation contract without conflating source statements, human verification, and authoritative current state. This document proposes new choices, **not an approved decision**.

## Six business proposals for approval
### 1. First subject
Use an existing `Device` asset table as the initial end-to-end validation case because registry and SUPPORT already read Device. This is a validation slice, not an Assessment standard scope reduction or a restriction against Person/Account/Application/Procedure in future. No mandatory full-asset census.

### 2. Row handling
Human-facing categories: 新規登録候補 / 既存更新候補 / 差分なし / 要確認 / 除外. These are importer review outcomes, **not truth or verified-Fact states**. Unmatched means not found in registered state, not verified newly purchased. No automatic delete of records absent from source. Human can select corrections/exclusions.

### 3. Identity and duplicate
Use existing canonical identification rules (asset tag etc.) first; comparison keys and normalization are Product decisions. If absent, ambiguous, colliding or inconsistent, send that row to 要確認; do not fabricate IDs, merge records, infer primary user relation or silently overwrite. A non-unique serial may support human inquiry but is not sufficient for silent commit.

### 4. Human verification / authority
Assessment operator may prepare and submit the batch as candidates but does not gain Commit Authority by doing Assessment. For initial validated case, propose a separately authorized verifier/committer (may be the same distinct reviewing human if Product policy explicitly allows). Exact actor/grant, 2-human rule and batched verification UX are Product Lane decisions. Preserve Change→Verify→Commit, before/after/provenance, tenant isolation, audit and per-row exception status.

### 5. Source/Evidence handling
Source spreadsheets are input Evidence, not a second managed registry. Preserve auditable provenance and the minimum source content necessary for claims and corrections; unnecessary whole-file retention must not be assumed. Existing docs/66 sets raw diagnosis and approved-evidence handling but may not fully specify Assessment file and operational Fact lifecycle; Product/Security/Business must check retention, sensitive data, purpose limitation, access, deletion and AI provider processing. Do **not** mechanically classify all source files as 5-year approved Evidence or all as 1-year diagnosis data.

### 6. Reuse / operational readiness
Verified, committed, authorized initial FACT should be queryable from existing FACTACT Registry/SUPPORT without reimport. Read/use is distinct from operational execution; customer-specific authorization, published Procedure/Rule, connections, responsibility and Go-Live remain governed by BUILD. Never imply imported docs grant operational authority or that unsupported/unverified statements become instructions.

## Preferred first acceptance case — hypothetical
Given a customer PC register with asset number, hostname, serial, user and location:
1. user uploads a CSV/Excel sheet;
2. deterministic header aliases propose columns, optional AI suggests unclear ones;
3. UI shows row previews and existing differences, including duplicate/invalid counts;
4. human adjusts mapping and confirms candidates;
5. FACTACT target-specific typed commands verify and commit only authorized records, preserving evidence and audit;
6. authorized operator locates registered Device from Registry/SUPPORT, with provenance, without additional data entry.
No per-file manual catalog naming, no separate SUPPORT-specific Device table, no direct AI-to-DB write. Multi-file convenience and unstructured Procedure import follow later.

## Product Lane follow-up after approval
- Specify typed Device Create/Update/Relation command contract and permission/version/verification rules, review atomicity and retry semantics.
- Specify explicit allowed import fields, mapping aliases, existing-state comparison and per-row failures.
- Test no false FACT promotion, no fictitious identifiers, no unauthorized update, no cross-tenant read, idempotent reimport, no silent deletion, and SUPPORT reuse.
- Do not expand PR #60 Registry First Edit, merge Draft PRs, touch DB/Production, or implement unapproved migrations. Keep G3-G5 constraints.

## Decision gate
Business Owner approval pending for the six proposals. Product Lane must not treat this document as implementation authorization.
