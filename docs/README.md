# FACTACT Documentation Index

This directory contains the canonical design context for FACTACT.

The repository, not chat history, is the source of truth. When a material Product, Domain, UX, security, integration, or implementation decision changes, update the appropriate canonical document in the same development cycle.

## Status vocabulary

- **CANONICAL** — current source of truth for the subject.
- **ACTIVE DRAFT** — current design work; may change, but newer than legacy material.
- **LEGACY / REFERENCE** — useful historical detail, but must not override current canonical principles.
- **SUPERSEDED** — retained only for history; do not implement from it without reconciliation.

## Recommended reading order

### AI / developer entry point

1. `99-ai-development-context.md` — **CANONICAL ENTRY POINT**

### Product and Core

2. `00-product-vision.md` — **CANONICAL** — FACTACT identity, Fact First, product direction
3. `01-core-prd.md` — **CANONICAL** — Core product requirements and boundaries
4. `02-domain-model.md` — **CANONICAL** — Core domain semantics and invariants
5. `03-operational-context.md` — **CANONICAL** — trusted operational information and epistemic state
6. `04-progressive-onboarding.md` — **CANONICAL** — safe service start with incomplete context

### Service Model, UX and implementation handoff

7. `11-josys-kaizen-service-model-v1.md` — **ACTIVE DRAFT / CURRENT** — 情シスKAIZEN Service Model V1
8. `12-factact-join-ux-golden-flow.md` — **ACTIVE DRAFT / CURRENT** — JOIN operator Golden Flow
9. `13-factact-product-ux-architecture.md` — **CANONICAL UX DIRECTION** — Home / Work / Operational Context / shared product UX
10. `14-factact-ui-specification-v1.md` — **CANONICAL IMPLEMENTATION UX SPECIFICATION** — screen responsibilities, shared components, commands, authority/AI boundaries, transitions and UI acceptance criteria
11. `15-first-vertical-slice-contract-v1.md` — **CANONICAL IMPLEMENTATION CONTRACT** — minimum persistence model, Domain/Application Commands, read models, API boundary, tenancy/authorization, transactions and Golden Tests for the first executable JOIN flow
12. `16-existing-resource-reuse-audit.md` — **CANONICAL IMPLEMENTATION REFERENCE** — current split-repository reuse map and VS Code/Codex inspection instructions

### Legacy implementation handoff documents

The following documents predate the final FACTACT naming and later Fact First / UX decisions:

- `05_NEMESIA_V1_機能要件.md`
- `06_NEMESIA_V1_画面一覧・画面機能要件.md`
- `07_NEMESIA_V1_画面ワイヤーフレーム_API_状態遷移仕様.md`

Status: **LEGACY / REFERENCE — RECONCILIATION REQUIRED**

They may contain useful detailed requirements, API ideas, screen lists and state-transition thinking, but they must not override `00–04`, `11–16`, or `99` where they conflict.

`NEMESIA` in these filenames is an old/internal project code. New product-facing specifications should use **FACTACT**.

Do not mechanically rename these files yet. First extract still-valid implementation detail into current FACTACT specifications, then archive or supersede them explicitly.

## Repository role

Bootstrap implementation and verification instructions: [`bootstrap.md`](bootstrap.md).
Architecture decisions: [`adr/0001-application-boundary.md`](adr/0001-application-boundary.md),
[`adr/0002-identity-session-authority.md`](adr/0002-identity-session-authority.md),
[`adr/0003-rls-execution.md`](adr/0003-rls-execution.md),
[`adr/0004-evaluation-reproducibility.md`](adr/0004-evaluation-reproducibility.md),
[`adr/0005-change-lifecycle.md`](adr/0005-change-lifecycle.md).

`yoshihisahagisaka/git_KAIZEN` is the FACTACT Single Source of Truth and implementation target.

Existing atLIB systems have been split out of the former `atlib-msp-dev` repository. `atlib-msp-dev` is now an archive/index. Use the current split repositories listed in `16-existing-resource-reuse-audit.md` as reuse/reference sources.

## Target structure

```text
/
├── README.md
├── docs/
│   ├── README.md
│   ├── 00-product-vision.md
│   ├── ...
│   ├── 99-ai-development-context.md
│   └── adr/
├── apps/
│   └── web/
├── packages/
│   ├── domain/
│   ├── application/
│   ├── ui/
│   └── shared/
├── supabase/
│   └── migrations/
├── tests/
│   └── golden/
└── .github/
```

The structure is a direction, not permission to create abstractions before they are needed.

## Documentation ownership by concern

| Concern | Canonical location |
|---|---|
| Product identity / philosophy | `00-product-vision.md` |
| Core requirements / scope | `01-core-prd.md` |
| Domain objects / invariants | `02-domain-model.md` |
| Operational Context / Fact trust | `03-operational-context.md` |
| Progressive onboarding | `04-progressive-onboarding.md` |
| 情シスKAIZEN Service Model | `11-josys-kaizen-service-model-v1.md` |
| JOIN UX Golden Flow | `12-factact-join-ux-golden-flow.md` |
| Shared product UX | `13-factact-product-ux-architecture.md` |
| Implementation-ready UI behavior | `14-factact-ui-specification-v1.md` |
| First executable slice: persistence/commands/API/tests | `15-first-vertical-slice-contract-v1.md` |
| Existing-code reuse decisions | `16-existing-resource-reuse-audit.md` |
| AI / developer handoff context | `99-ai-development-context.md` |
| Architecture decisions | `docs/adr/` when introduced |
| DB schema | migrations + `15-first-vertical-slice-contract-v1.md` until a dedicated schema reference becomes necessary |
| API contract | implementation + `15-first-vertical-slice-contract-v1.md` for the first slice |
| Golden Flow behavior | `tests/golden/` + relevant design doc |

## Decision precedence

When documents disagree, do not silently choose whichever is easiest to implement.

1. explicit newer Product Owner decision recorded in a canonical doc;
2. `00-product-vision.md` / Core Fact First principles;
3. Core PRD and Domain Model invariants;
4. current UX / Service Model specifications;
5. implementation contracts / implementation detail documents;
6. legacy/reference documents.

If a real conflict remains, stop and record/resolve the decision rather than hiding it in code.

## Naming rules

Use in new work:

- **FACTACT** — product/system
- **情シスKAIZEN** — Service Model / service
- **HELIX** — growth/learning model
- **LALLIB** — working KAIZEN method name; not yet a universal Core concept
- **atLIB** — company

Do not introduce `NEMESIA` as a public product name.

## VS Code / AI handoff

For the first implementation session, use:

> Read `docs/99-ai-development-context.md`, `docs/README.md`, `docs/15-first-vertical-slice-contract-v1.md`, and `docs/16-existing-resource-reuse-audit.md` first. Treat this repository as the FACTACT Single Source of Truth. Before coding, summarize the Core invariants touched by the first vertical slice and inspect the current split reference repositories according to `16`. Classify reusable candidates as REUSE, ADAPT, REFERENCE, or DO NOT REUSE. Do not replace Fact First semantics with generic ticket/CRUD patterns. Then propose the minimum implementation stack and bootstrap plan. Do not write application code until the invariants and reuse decisions are summarized.

The longer copy/paste-ready prompt is maintained in section 12 of `16-existing-resource-reuse-audit.md`.

## Immediate next task

The design-to-implementation handoff is complete enough to begin the first executable JOIN vertical slice.

Next in VS Code:

1. clone/open `git_KAIZEN`;
2. read `99`, this index, `15`, and `16`;
3. inspect only the high-priority reusable platform code identified in `16`;
4. choose the minimum Web/TypeScript/PostgreSQL stack;
5. record consequential stack decisions as ADRs;
6. bootstrap application + Supabase migration baseline;
7. implement the Golden Flow in `15` before broader Service Desk, KAIZEN analytics, or AI automation.

Do not continue producing broad speculative architecture documents instead of beginning the executable vertical slice.
