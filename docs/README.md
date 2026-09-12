# FACTACT Documentation Index

This directory contains the canonical design context for FACTACT and the current business/service design context for IT経営KAIZEN.

The repository, not chat history, is the source of truth. When a material Business, Service, Product, Domain, UX, security, integration, or implementation decision changes, update the appropriate canonical document in the same development cycle.

## Status vocabulary

- **CANONICAL** — current source of truth for the subject.
- **ACTIVE DRAFT** — current design work; may change, but newer than legacy material.
- **LEGACY / REFERENCE** — useful historical detail, but must not override current canonical principles.
- **SUPERSEDED** — retained only for history; do not implement from it without reconciliation.

## Critical business/service hierarchy

The current hierarchy is:

> **IT経営KAIZEN = atLIBのITコンサルティング事業の中核となる事業・サービス**
>
> **FACTACT = IT経営KAIZENを日々の仕事の中で継続・標準化・ストック化するためのService Operating Platform**

**情シスKAIZENをIT経営KAIZENの上位概念・中心事業・起点として扱ってはならない。**

情シスKAIZENという名称・旧Service Modelは、過去の検討内容や特定の支援モデルとして参照される場合があるが、現在のBusiness Canonicalを上書きしない。

新しい事業・サービス設計では、まず `17-it-management-kaizen-business-service-canonical-v1.md` を確認すること。

## Recommended reading order

### Business / Service design

1. `17-it-management-kaizen-business-service-canonical-v1.md` — **CANONICAL** — IT経営KAIZEN事業・サービス設計、FACTACTとの関係、無料診断、Assessment、実行ルート
2. `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md` — **CANONICAL** — 無料診断と設計Assessmentの価値境界、Evidence、営業ストーリー
3. `19-free-it-management-diagnosis-channel-flows-v1.md` — **CANONICAL** — Web / 営業訪問の診断導線、Same Method / Different Entry
4. `20-it-management-kaizen-factact-consistency-principles-v1.md` — **CANONICAL** — IT経営KAIZENとFACTACTの整合原則、Fact/Hypothesis/Decision責任境界
5. `21-free-it-management-diagnosis-operating-model-v1.md` — **CANONICAL** — 無料診断のHuman / AI / System運用、Evidence境界、Assessment引継ぎ

### Free IT management diagnosis development

6. `22-free-it-management-diagnosis-development-canonical-v1.md` — **CANONICAL DEVELOPMENT / MVP DESIGN** — 画面、データ、状態遷移、AI責任境界、Human Review、Evidence境界、Assessment Handoff、MVPスコープ、技術不変条件、実装順序
7. `23-free-it-management-diagnosis-implementation-spec-v1.md` — **CANONICAL IMPLEMENTATION SPECIFICATION** — ERD / Data Model、Application Commands / API、AI JSON Schema / Context Builder、UI Wireframe / Interaction、State Guards、表示ルール、Acceptance Tests
8. `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` — **CANONICAL IMPLEMENTATION REFERENCE** — `atlib-sales-tools` / `atlib-corporate-site` の既存フォーム、管理画面、API、DB、認証、通知資産の再利用方針と移行境界

### AI / developer entry point

9. `99-ai-development-context.md` — **CANONICAL ENTRY POINT FOR FACTACT DEVELOPMENT**

### FACTACT Product and Core

10. `00-product-vision.md` — **CANONICAL** — FACTACT identity, Fact First, product direction
11. `01-core-prd.md` — **CANONICAL** — Core product requirements and boundaries
12. `02-domain-model.md` — **CANONICAL** — Core domain semantics and invariants
13. `03-operational-context.md` — **CANONICAL** — trusted operational information and epistemic state
14. `04-progressive-onboarding.md` — **CANONICAL** — safe service start with incomplete context

### UX and implementation handoff

15. `12-factact-join-ux-golden-flow.md` — **ACTIVE DRAFT / CURRENT** — JOIN operator Golden Flow
16. `13-factact-product-ux-architecture.md` — **CANONICAL UX DIRECTION** — Home / Work / Operational Context / shared product UX
17. `14-factact-ui-specification-v1.md` — **CANONICAL IMPLEMENTATION UX SPECIFICATION** — screen responsibilities, shared components, commands, authority/AI boundaries, transitions and UI acceptance criteria
18. `15-first-vertical-slice-contract-v1.md` — **CANONICAL IMPLEMENTATION CONTRACT** — minimum persistence model, Domain/Application Commands, read models, API boundary, tenancy/authorization, transactions and Golden Tests for the first executable JOIN flow
19. `16-existing-resource-reuse-audit.md` — **CANONICAL IMPLEMENTATION REFERENCE** — current split-repository reuse map and VS Code/Codex inspection instructions

## Superseded / legacy service-model material

### `11-josys-kaizen-service-model-v1.md`

Status: **SUPERSEDED AS BUSINESS HIERARCHY / REFERENCE ONLY**

This document may contain useful operational requirements and detailed service ideas. However, its former positioning of 情シスKAIZEN as a primary/central Service Model must not be used to infer the current atLIB business hierarchy.

When reusing detail from this document:

1. reconcile it with `17-it-management-kaizen-business-service-canonical-v1.md`;
2. preserve only still-valid operational/product detail;
3. do not reintroduce 情シスKAIZEN as the center of the business architecture;
4. record any newly accepted detail in the current canonical document appropriate to that concern.

### Legacy NEMESIA documents

The following documents predate the final FACTACT naming and later Fact First / UX decisions:

- `05_NEMESIA_V1_機能要件.md`
- `06_NEMESIA_V1_画面一覧・画面機能要件.md`
- `07_NEMESIA_V1_画面ワイヤーフレーム_API_状態遷移仕様.md`

Status: **LEGACY / REFERENCE — RECONCILIATION REQUIRED**

They may contain useful detailed requirements, API ideas, screen lists and state-transition thinking, but they must not override current canonical Business, Product, Core, UX, or implementation principles.

`NEMESIA` is an old/internal project code. New product-facing specifications must use **FACTACT**.

Do not mechanically copy or rename legacy concepts. Extract only still-valid detail after reconciliation.

## Repository role

`yoshihisahagisaka/git_KAIZEN` is the Single Source of Truth for the current IT経営KAIZEN business/service design recorded here and for FACTACT product/implementation design.

Existing atLIB systems have been split out of the former `atlib-msp-dev` repository. `atlib-msp-dev` is now an archive/index. Use the current split repositories listed in `16-existing-resource-reuse-audit.md` as reuse/reference sources.

For the free IT management diagnosis implementation, use `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` in addition to `22` and `23`; the primary implementation/reuse target is `yoshihisahagisaka/atlib-sales-tools`, with `yoshihisahagisaka/atlib-corporate-site` as the current LP/entry asset.

## Documentation ownership by concern

| Concern | Canonical location |
|---|---|
| IT経営KAIZEN business / service model | `17-it-management-kaizen-business-service-canonical-v1.md` |
| 無料診断 / Assessment value boundary and sales story | `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md` |
| 無料診断 channel flows | `19-free-it-management-diagnosis-channel-flows-v1.md` |
| IT経営KAIZEN / FACTACT consistency principles | `20-it-management-kaizen-factact-consistency-principles-v1.md` |
| 無料診断 Human / AI / System operating model | `21-free-it-management-diagnosis-operating-model-v1.md` |
| 無料診断 Development / MVP design | `22-free-it-management-diagnosis-development-canonical-v1.md` |
| 無料診断 implementation specification | `23-free-it-management-diagnosis-implementation-spec-v1.md` |
| 無料診断 existing-resource reuse map | `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` |
| FACTACT product identity / philosophy | `00-product-vision.md` |
| Core requirements / scope | `01-core-prd.md` |
| Domain objects / invariants | `02-domain-model.md` |
| Operational Context / Fact trust | `03-operational-context.md` |
| Progressive onboarding | `04-progressive-onboarding.md` |
| Legacy 情シスKAIZEN service detail | `11-josys-kaizen-service-model-v1.md` — reference only; reconcile before reuse |
| JOIN UX Golden Flow | `12-factact-join-ux-golden-flow.md` |
| Shared product UX | `13-factact-product-ux-architecture.md` |
| Implementation-ready UI behavior | `14-factact-ui-specification-v1.md` |
| First executable slice: persistence/commands/API/tests | `15-first-vertical-slice-contract-v1.md` |
| Existing-code reuse decisions | `16-existing-resource-reuse-audit.md` |
| AI / developer handoff context | `99-ai-development-context.md` |
| Architecture decisions | `docs/adr/` when introduced |

## Decision precedence

When documents disagree, do not silently choose whichever is easiest to implement.

1. explicit newer Product Owner decision recorded in a canonical doc;
2. `17-it-management-kaizen-business-service-canonical-v1.md` for Business / Service design;
3. `18`–`24` for the current free-diagnosis service/development concern, provided they do not conflict with `17`;
4. `00-product-vision.md` / FACTACT Core Fact First principles for Product/Core design;
5. Core PRD and Domain Model invariants;
6. current UX specifications;
7. implementation contracts / implementation detail documents;
8. superseded/legacy/reference documents.

If a real conflict remains, stop and record/resolve the decision rather than hiding it in code.

## Naming rules

Use in new work:

- **IT経営KAIZEN** — atLIBのITコンサルティング事業の中核となる事業・サービス
- **FACTACT** — Service Operating Platform
- **HELIX** — growth/learning model
- **atLIB** — company

For the free IT management diagnosis UI / customer-facing output:

- display customer organization names as `会社名 + 様` while storing the legal/formal name without `様`;
- display the provider company as **atLIB株式会社**.

Do not introduce `NEMESIA` as a public product name.

Do not use **情シスKAIZEN** as the current top-level business/service architecture. If the name remains in historical documents or a future subordinate support model, its role must be explicitly scoped and must not conflict with the IT経営KAIZEN canonical hierarchy.

## VS Code / AI handoff

For business-sensitive FACTACT development, read `17` before interpreting service-model assumptions. For free-diagnosis implementation, read `18`–`24`. For FACTACT implementation work, also read `99`, `15`, `16`, and the relevant Core/UX documents.

Do not replace Fact First semantics with generic ticket/CRUD patterns, and do not infer current business hierarchy from legacy 情シスKAIZEN or NEMESIA documents.

## Immediate direction

Business Lane priority is service productization first: free IT management diagnosis, 60-minute diagnosis, IT経営KAIZEN 設計Assessment, post-Assessment execution routes, and the FACTACT requirements that support them.

The free IT management diagnosis Development Lane should implement from `22-free-it-management-diagnosis-development-canonical-v1.md`, `23-free-it-management-diagnosis-implementation-spec-v1.md`, and `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md`, creating ADRs only where concrete technology choices are required.

FACTACT Product Lane implementation may proceed according to its canonical Product/Core/UX documents, but any business/service assumption that conflicts with `17` must be reconciled explicitly rather than silently implemented.