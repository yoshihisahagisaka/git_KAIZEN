# FACTACT Documentation Index

This directory contains the canonical design context for FACTACT and the current business/service design context for IT経営KAIZEN.

The repository, not chat history, is the source of truth. When a material Business, Service, Product, Domain, UX, security, integration, or implementation decision changes, update the appropriate canonical document in the same development cycle.

## Status vocabulary

- **CANONICAL** — current source of truth for the subject.
- **ACTIVE DRAFT** — current design work; may change, but newer than legacy material.
- **LEGACY / REFERENCE** — useful historical detail, but must not override current canonical principles.
- **SUPERSEDED** — retained only for history; do not implement from it without reconciliation.
- **IMPLEMENTATION HANDOFF** — approved task-specific implementation instructions derived from Canonical documents.

## Critical business/service hierarchy

> **IT経営KAIZEN = atLIBのITコンサルティング事業の中核となる事業・サービス**
>
> **FACTACT = IT経営KAIZENを日々の仕事の中で継続・標準化・ストック化するためのService Operating Platform**

**情シスKAIZENをIT経営KAIZENの上位概念・中心事業・起点として扱ってはならない。**

新しい事業・サービス設計では、まず `17-it-management-kaizen-business-service-canonical-v1.md` を確認すること。

## Recommended reading order

### Business / Service design

1. `17-it-management-kaizen-business-service-canonical-v1.md` — **CANONICAL** — IT経営KAIZEN事業・サービス設計、FACTACTとの関係、無料診断、Assessment、実行ルート
2. `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md` — **CANONICAL** — 無料診断と設計Assessmentの価値境界、Evidence、営業ストーリー
3. `19-free-it-management-diagnosis-channel-flows-v1.md` — **CANONICAL** — Web / 営業訪問の診断導線、Same Method / Different Entry
4. `20-it-management-kaizen-factact-consistency-principles-v1.md` — **CANONICAL** — IT経営KAIZENとFACTACTの整合原則、Fact/Hypothesis/Decision責任境界
5. `21-free-it-management-diagnosis-operating-model-v1.md` — **CANONICAL** — 無料診断のHuman / AI / System運用、Evidence境界、Assessment引継ぎ

### Free IT management diagnosis development

6. `22-free-it-management-diagnosis-development-canonical-v1.md` — **CANONICAL DEVELOPMENT / MVP DESIGN** — 画面、データ、状態遷移、AI責任境界、Human Review、Evidence境界、Assessment Handoff、MVPスコープ
7. `23-free-it-management-diagnosis-implementation-spec-v1.md` — **CANONICAL IMPLEMENTATION SPECIFICATION** — ERD、Commands/API、AI Contract、UI、State Guards、Acceptance Tests
8. `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` — **CANONICAL IMPLEMENTATION REFERENCE** — 既存フォーム、管理画面、API、DB、認証、通知資産の再利用方針
9. `25-free-it-management-diagnosis-slice1-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED** — Slice 1 Case / Application / Survey
10. `26-free-it-management-diagnosis-survey-v2-question-set-v1.md` — **CANONICAL IMPLEMENTATION REFERENCE** — Survey v2正式Question Set
11. `27-free-it-management-diagnosis-slice2-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED** — Slice 2 Diagnosis Preparation / AI-01
12. `28-free-it-management-diagnosis-slice3-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED** — Slice 3 60min Diagnosis Workspace / SourceRecord / AI-02
13. `29-free-it-management-diagnosis-slice4-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — READY FOR CODEX** — Slice 4 Post-Diagnosis Structuring / DiagnosisInsight / Human Review

### AI / developer entry point

14. `99-ai-development-context.md` — **CANONICAL ENTRY POINT FOR FACTACT DEVELOPMENT**

### FACTACT Product and Core

15. `00-product-vision.md` — **CANONICAL** — FACTACT identity, Fact First, product direction
16. `01-core-prd.md` — **CANONICAL** — Core product requirements and boundaries
17. `02-domain-model.md` — **CANONICAL** — Core domain semantics and invariants
18. `03-operational-context.md` — **CANONICAL** — trusted operational information and epistemic state
19. `04-progressive-onboarding.md` — **CANONICAL** — safe service start with incomplete context

### UX and implementation handoff

20. `12-factact-join-ux-golden-flow.md` — **ACTIVE DRAFT / CURRENT** — JOIN operator Golden Flow
21. `13-factact-product-ux-architecture.md` — **CANONICAL UX DIRECTION** — Home / Work / Operational Context / shared product UX
22. `14-factact-ui-specification-v1.md` — **CANONICAL IMPLEMENTATION UX SPECIFICATION**
23. `15-first-vertical-slice-contract-v1.md` — **CANONICAL IMPLEMENTATION CONTRACT**
24. `16-existing-resource-reuse-audit.md` — **CANONICAL IMPLEMENTATION REFERENCE**

## Superseded / legacy material

`11-josys-kaizen-service-model-v1.md` is **SUPERSEDED AS BUSINESS HIERARCHY / REFERENCE ONLY**. Useful operational detail may be reused only after reconciliation with `17`; do not reintroduce 情シスKAIZEN as the center of the business architecture.

Legacy NEMESIA documents (`05_NEMESIA_V1_機能要件.md`, `06_NEMESIA_V1_画面一覧・画面機能要件.md`, `07_NEMESIA_V1_画面ワイヤーフレーム_API_状態遷移仕様.md`) are **LEGACY / REFERENCE — RECONCILIATION REQUIRED**. `NEMESIA` is not a current public product name.

## Repository role

`yoshihisahagisaka/git_KAIZEN` is the Single Source of Truth for current IT経営KAIZEN business/service design and FACTACT product/implementation design.

For free IT management diagnosis implementation, the primary implementation/reuse target is `yoshihisahagisaka/atlib-sales-tools`, with `yoshihisahagisaka/atlib-corporate-site` as the current LP/entry asset.

- Slice 1 implementation/completion: `25`
- Survey v2 definition: `26`
- Slice 2 implementation/completion: `27`
- Slice 3 implementation/completion: `28`
- Active Slice 4 implementation handoff: `29`

## Documentation ownership by concern

| Concern | Canonical location |
|---|---|
| IT経営KAIZEN business / service model | `17-it-management-kaizen-business-service-canonical-v1.md` |
| 無料診断 / Assessment boundary and sales story | `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md` |
| 無料診断 channel flows | `19-free-it-management-diagnosis-channel-flows-v1.md` |
| IT経営KAIZEN / FACTACT consistency | `20-it-management-kaizen-factact-consistency-principles-v1.md` |
| 無料診断 Human / AI / System operating model | `21-free-it-management-diagnosis-operating-model-v1.md` |
| 無料診断 Development / MVP design | `22-free-it-management-diagnosis-development-canonical-v1.md` |
| 無料診断 implementation specification | `23-free-it-management-diagnosis-implementation-spec-v1.md` |
| Existing-resource reuse | `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` |
| Slice 1 handoff | `25-free-it-management-diagnosis-slice1-codex-implementation-handoff-v1.md` |
| Survey v2 Question Set | `26-free-it-management-diagnosis-survey-v2-question-set-v1.md` |
| Slice 2 handoff | `27-free-it-management-diagnosis-slice2-codex-implementation-handoff-v1.md` |
| Slice 3 handoff | `28-free-it-management-diagnosis-slice3-codex-implementation-handoff-v1.md` |
| Slice 4 handoff | `29-free-it-management-diagnosis-slice4-codex-implementation-handoff-v1.md` |
| FACTACT product identity | `00-product-vision.md` |
| Core requirements | `01-core-prd.md` |
| Domain objects / invariants | `02-domain-model.md` |
| Operational Context | `03-operational-context.md` |
| Progressive onboarding | `04-progressive-onboarding.md` |
| Architecture decisions | `docs/adr/` when introduced |

## Decision precedence

When documents disagree, do not silently choose whichever is easiest to implement.

1. explicit newer Product Owner decision recorded in a canonical doc;
2. `17` for Business / Service design;
3. `18`–`29` for current free-diagnosis service/development/implementation concern, provided they do not conflict with `17`;
4. `00-product-vision.md` / FACTACT Core Fact First principles;
5. Core PRD and Domain Model invariants;
6. current UX specifications;
7. implementation contracts / implementation detail documents;
8. superseded/legacy/reference documents.

If a real conflict remains, stop and resolve the decision rather than hiding it in code.

## Naming rules

Use in new work:

- **IT経営KAIZEN** — atLIBのITコンサルティング事業の中核となる事業・サービス
- **FACTACT** — Service Operating Platform
- **HELIX** — growth/learning model
- **atLIB** — company

For free IT management diagnosis UI / customer-facing output:

- customer organization display = `会社名 + 様`; DB stores formal name without `様`
- provider company display = **atLIB株式会社**

Do not introduce `NEMESIA` as a public product name. Do not use **情シスKAIZEN** as the current top-level business/service architecture.

## VS Code / AI handoff

For business-sensitive FACTACT development, read `17` first. For free-diagnosis implementation, read `18`–`29`; `25`, `27`, `28` are completed handoffs, `26` is the current Survey v2 definition, and `29` is the active Slice 4 handoff.

Do not replace Fact First semantics with generic ticket/CRUD patterns, and do not infer current business hierarchy from legacy 情シスKAIZEN or NEMESIA documents.

## Immediate direction

Business Lane priority is service productization first: free IT management diagnosis, 60-minute diagnosis, IT経営KAIZEN 設計Assessment, post-Assessment execution routes, and FACTACT requirements that support them.

**Slice 1 — Case / Application / Survey is completed.**

**Slice 2 — Diagnosis Preparation / AI-01 Pre-Diagnosis Organizer is completed at `atlib-sales-tools/main` commit `00500a14311901a9afa47db76bb16ea77a78093d`.**

**Slice 3 — 60min Diagnosis Workspace / SourceRecord / AI-02 Interview Assistant is completed at `atlib-sales-tools/main` commit `4132f6ad6b5f50cf7622dd6cc2cc44af6a9efe37`.**

The active Development Lane implementation target is **Slice 4 — Post-Diagnosis Structuring / DiagnosisInsight / Human Review** according to `29-free-it-management-diagnosis-slice4-codex-implementation-handoff-v1.md`.

FACTACT Product Lane implementation may proceed according to its canonical Product/Core/UX documents, but any business/service assumption that conflicts with `17` must be reconciled explicitly rather than silently implemented.
