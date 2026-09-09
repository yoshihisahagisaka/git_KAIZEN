# FACTACT

**From Fact to Action.**

This repository is the **Single Source of Truth (SSOT)** for FACTACT product design, architecture, UX specifications, implementation, tests, and development decisions.

> **FACT FIRST.**

FACTACT is a new atLIB Service Operating Platform. It is intentionally treated as a new system rather than a Web rewrite of the existing DDL / Google Workspace prototype.

## Start here

Humans and AI coding agents should begin with:

1. [`docs/99-ai-development-context.md`](docs/99-ai-development-context.md) — project context and architecture guardrails
2. [`docs/00-product-vision.md`](docs/00-product-vision.md) — Product Vision
3. [`docs/01-core-prd.md`](docs/01-core-prd.md) — Core PRD
4. [`docs/02-domain-model.md`](docs/02-domain-model.md) — Domain Model
5. [`docs/03-operational-context.md`](docs/03-operational-context.md) — Operational Context
6. [`docs/13-factact-product-ux-architecture.md`](docs/13-factact-product-ux-architecture.md) — shared UX architecture
7. [`docs/12-factact-join-ux-golden-flow.md`](docs/12-factact-join-ux-golden-flow.md) — first UX Golden Flow

See [`docs/README.md`](docs/README.md) for documentation status and reading order.

## Product identity

- Product: **FACTACT（ファクタクト）**
- Tagline: **From Fact to Action.**
- Core Principle: **FACT FIRST.**
- Core movement: **FACT → ACT**
- Growth model: **HELIX**
- Company: **atLIB**

`NEMESIA` is an old/internal project code that may remain in legacy filenames or historical documents. It is not the public product name and must not be introduced into new product-facing artifacts.

## Core architecture direction

- Fact First / One Fact, Multiple Views
- Service × Contract × Recipient
- Progressive Onboarding
- Work-driven Operational Context
- Fact / Unknown / Observation / Hypothesis / Decision / Rule separation
- Requirement Evaluation before Work creation
- Work → Action → Change → Verify → Commit
- Progressive Authority
- AI Suggests. Human Decides. System Records.
- Learning Loop / Continuous KAIZEN
- One Platform / Multiple Service Models

Initial Service Models:

1. **情シスKAIZEN**
2. **Service Desk**

## First implementation Golden Flow

Build vertically before building broad generic infrastructure:

> **Login → Home → JOIN Event → Requirement Evaluation → Work → Device Action → Change → Verify → Fact → Person / Device View**

The first implementation must prove that the same committed Fact is reused across views and later Work without duplicate entry.

## Repository operating model

- **GitHub `main` is the canonical integrated state.**
- Important decisions must be written back to this repository; chat history is not a source of truth.
- ChatGPT may be used for Product / Architecture / UX co-design.
- VS Code AI/Codex may be used for implementation.
- Both must read the same canonical documents before changing architecture-sensitive code.
- Prefer small branches / pull requests for implementation changes once coding begins.
- Do not commit secrets, credentials, tokens, local environment files, generated build output, or unnecessary large binaries.

## Target repository structure

The repository is transitioning from a design-doc repository into the FACTACT product repository.

```text
/
├── README.md
├── docs/                    # canonical product/architecture/UX docs
│   ├── README.md
│   └── adr/                 # architecture decision records (as needed)
├── apps/
│   └── web/                 # FACTACT web application
├── packages/
│   ├── domain/              # framework-independent domain model/rules
│   ├── application/         # use cases / domain commands
│   ├── ui/                  # reusable FACTACT UI components
│   └── shared/              # deliberately generic shared utilities
├── supabase/
│   └── migrations/          # PostgreSQL schema migrations / RLS
├── tests/
│   └── golden/              # cross-domain Golden Flow tests
└── .github/                 # CI / repository automation when introduced
```

Directories should be created when the first real implementation needs them rather than as empty scaffolding.

## Platform direction

Current V1 decision:

> **Supabase + Shared PostgreSQL + RLS**

But:

> **Use Supabase, but do not make FACTACT Core depend on Supabase.**

Business invariants belong in the Domain/Application layer. RLS is defense-in-depth, not the sole authorization model.

Existing atLIB systems may be selectively reused for proven platform patterns such as authentication, OIDC, GCP deployment, Secret Manager, PostgreSQL migrations, audit, structured AI validation and object storage. Legacy business schemas should not be copied into FACTACT Core.

## Current phase

The initial implementation bootstrap is available. See [bootstrap setup, reuse
provenance and review boundary](docs/bootstrap.md). It provides the authentication
shell and database baseline; the JOIN Golden Flow is not yet implemented.

**Product/UX architecture → implementation-ready specification → first vertical Golden Flow.**

Before coding a feature, read `docs/99-ai-development-context.md` and the canonical documents relevant to that feature.
