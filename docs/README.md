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

### Service Model and UX

7. `11-josys-kaizen-service-model-v1.md` — **ACTIVE DRAFT / CURRENT** — 情シスKAIZEN Service Model V1
8. `12-factact-join-ux-golden-flow.md` — **ACTIVE DRAFT / CURRENT** — JOIN operator Golden Flow
9. `13-factact-product-ux-architecture.md` — **CANONICAL UX DIRECTION** — Home / Work / Operational Context / shared product UX

### Legacy implementation handoff documents

The following documents predate the final FACTACT naming and later Fact First / UX decisions:

- `05_NEMESIA_V1_機能要件.md`
- `06_NEMESIA_V1_画面一覧・画面機能要件.md`
- `07_NEMESIA_V1_画面ワイヤーフレーム_API_状態遷移仕様.md`

Status: **LEGACY / REFERENCE — RECONCILIATION REQUIRED**

They may contain useful detailed requirements, API ideas, screen lists and state-transition thinking, but they must not override `00–04`, `11–13`, or `99` where they conflict.

`NEMESIA` in these filenames is an old/internal project code. New product-facing specifications should use **FACTACT**.

Do not mechanically rename these files yet. First extract still-valid implementation detail into current FACTACT specifications, then archive or supersede them explicitly. This avoids giving stale content a new authoritative-looking filename.

## Current repository inventory

At the start of the implementation transition, the repository root contains only:

- `README.md`
- `docs/`

There is no application source tree yet. This is intentional: create implementation directories when the first vertical slice is started rather than committing empty architecture scaffolding.

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
| AI / developer handoff context | `99-ai-development-context.md` |
| Architecture decisions | `docs/adr/` when introduced |
| DB schema | migrations + schema/reference doc when implementation starts |
| API contract | implementation + generated/static API reference when implementation starts |
| Golden Flow behavior | `tests/golden/` + relevant design doc |

## Decision precedence

When documents disagree, do not silently choose whichever is easiest to implement.

Use this precedence:

1. explicit newer Product Owner decision recorded in a canonical doc;
2. `00-product-vision.md` / Core Fact First principles;
3. Core PRD and Domain Model invariants;
4. current UX / Service Model specifications;
5. implementation detail documents;
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

## What must be documented

Create or update documentation when a change affects:

- Core invariants;
- meaning of a domain object/state;
- authority/security/tenancy;
- Requirement Evaluation behavior;
- Action → Change → Verify → Commit semantics;
- AI authority boundary;
- cross-Service Model behavior;
- persistent data ownership/source of truth;
- integration responsibility;
- a major UX mental model;
- an intentionally accepted architectural trade-off.

Small implementation details do not require Product docs. Architecturally consequential decisions should later receive an ADR.

## VS Code / AI handoff

Use this instruction when starting a new AI coding session:

> Read `docs/99-ai-development-context.md` first, then `docs/README.md` and the canonical documents relevant to the task. Treat this repository as the FACTACT Single Source of Truth. Before coding, summarize the Core invariants touched by the task and flag conflicts. Do not replace Fact First semantics with generic ticket/CRUD patterns. After an architecture-significant decision, update the relevant canonical document or ADR in the same change.

## Immediate next documentation task

Before broad implementation, produce **FACTACT UI Specification V1** from the approved UX direction. It should turn the conceptual screens into implementation-ready definitions for:

- Home
- Work List / Work Detail
- Operational Context
- JOIN
- SUPPORT
- resolution / learning
- KAIZEN
- KAIZEN detail

It should define shared components, navigation, screen transitions, Domain Commands, authorization/visibility, Fact/Observation/Unknown presentation, AI boundaries, and the first vertical build acceptance criteria.
