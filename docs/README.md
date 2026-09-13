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

1. `17-it-management-kaizen-business-service-canonical-v1.md` — **CANONICAL**
2. `18-it-management-diagnosis-assessment-boundary-sales-story-v1.md` — **CANONICAL**
3. `19-free-it-management-diagnosis-channel-flows-v1.md` — **CANONICAL**
4. `20-it-management-kaizen-factact-consistency-principles-v1.md` — **CANONICAL**
5. `21-free-it-management-diagnosis-operating-model-v1.md` — **CANONICAL**

### Free IT management diagnosis development

6. `22-free-it-management-diagnosis-development-canonical-v1.md` — **CANONICAL DEVELOPMENT / MVP DESIGN**
7. `23-free-it-management-diagnosis-implementation-spec-v1.md` — **CANONICAL IMPLEMENTATION SPECIFICATION**
8. `24-free-it-management-diagnosis-existing-resource-reuse-map-v1.md` — **CANONICAL IMPLEMENTATION REFERENCE**
9. `25-free-it-management-diagnosis-slice1-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**
10. `26-free-it-management-diagnosis-survey-v2-question-set-v1.md` — **CANONICAL IMPLEMENTATION REFERENCE**
11. `27-free-it-management-diagnosis-slice2-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**
12. `28-free-it-management-diagnosis-slice3-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**
13. `29-free-it-management-diagnosis-slice4-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**
14. `30-free-it-management-diagnosis-slice5-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**
15. `31-free-it-management-diagnosis-slice6-codex-implementation-handoff-v1.md` — **IMPLEMENTATION HANDOFF — COMPLETED**

### AI / developer entry point

16. `99-ai-development-context.md` — **CANONICAL ENTRY POINT FOR FACTACT DEVELOPMENT**

### FACTACT Product and Core

17. `00-product-vision.md` — **CANONICAL**
18. `01-core-prd.md` — **CANONICAL**
19. `02-domain-model.md` — **CANONICAL**
20. `03-operational-context.md` — **CANONICAL**
21. `04-progressive-onboarding.md` — **CANONICAL**

### UX and implementation handoff

22. `12-factact-join-ux-golden-flow.md` — **ACTIVE DRAFT / CURRENT**
23. `13-factact-product-ux-architecture.md` — **CANONICAL UX DIRECTION**
24. `14-factact-ui-specification-v1.md` — **CANONICAL IMPLEMENTATION UX SPECIFICATION**
25. `15-first-vertical-slice-contract-v1.md` — **CANONICAL IMPLEMENTATION CONTRACT**
26. `16-existing-resource-reuse-audit.md` — **CANONICAL IMPLEMENTATION REFERENCE**

## Superseded / legacy material

`11-josys-kaizen-service-model-v1.md` is **SUPERSEDED AS BUSINESS HIERARCHY / REFERENCE ONLY**. Useful operational detail may be reused only after reconciliation with `17`; do not reintroduce 情シスKAIZEN as the center of the business architecture.

Legacy NEMESIA documents are **LEGACY / REFERENCE — RECONCILIATION REQUIRED**. `NEMESIA` is not a current public product name.

## Repository role

`yoshihisahagisaka/git_KAIZEN` is the Single Source of Truth for current IT経営KAIZEN business/service design and FACTACT product/implementation design.

For free IT management diagnosis implementation, the primary implementation/reuse target is `yoshihisahagisaka/atlib-sales-tools`, with `yoshihisahagisaka/atlib-corporate-site` as the current LP/entry asset.

- Slice 1 implementation/completion: `25`
- Survey v2 definition: `26`
- Slice 2 implementation/completion: `27`
- Slice 3 implementation/completion: `28`
- Slice 4 implementation/completion: `29`
- Slice 5 implementation/completion: `30`
- Slice 6 implementation/completion: `31`

## Decision precedence

When documents disagree, do not silently choose whichever is easiest to implement.

1. explicit newer Product Owner decision recorded in a canonical doc;
2. `17` for Business / Service design;
3. `18`–`31` for current free-diagnosis service/development/implementation concern, provided they do not conflict with `17`;
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

## Free diagnosis MVP milestone

**無料 IT経営診断 MVP Vertical Slices 1–6 are completed end-to-end.**

- Slice 2 completed at `atlib-sales-tools/main` `00500a14311901a9afa47db76bb16ea77a78093d`
- Slice 3 completed at `4132f6ad6b5f50cf7622dd6cc2cc44af6a9efe37`
- Slice 4 completed at `632e9cd49f8208ec831a0299f650d444d120dd03`
- Slice 5 completed at `a30f100a913781d0c2e4a2816b6f7364523bc2fd`
- Slice 6 completed at `2c81a0b1ad354ced710884a36998c32497dd9237`

The active Development Lane target is now **Production Readiness / Pilot Readiness**, not another feature Slice.

Priority validation areas:

1. production migration / rollback rehearsal;
2. production environment and secrets/config validation;
3. real Anthropic AI connectivity for AI-01 through AI-04 and failure behavior;
4. real Google Workspace authentication / authorization;
5. PostgreSQL multi-connection and AI worker lease/concurrency behavior;
6. security/privacy and customer-data handling review;
7. observability, alerts, audit inspection, backup/restore and operational runbook;
8. realistic pilot-customer E2E from WEB/SALES entry through Assessment handoff / close;
9. explicit go/no-go criteria before general customer use.

FACTACT Product Lane implementation may proceed according to its canonical Product/Core/UX documents, but any business/service assumption that conflicts with `17` must be reconciled explicitly rather than silently implemented.
