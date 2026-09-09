# FACTACT — Existing Resource Reuse Audit

**Status:** CANONICAL IMPLEMENTATION REFERENCE  
**Reviewed:** 2026-09-09  
**Purpose:** Tell implementation agents exactly which existing atLIB repositories/patterns may be reused or adapted for FACTACT, and which must not shape the new domain model.

FACTACT remains a **new system**. Existing repositories are reference/reuse sources, not architectural parents.

> **Reuse proven platform patterns. Do not copy legacy business-domain schemas into FACTACT.**

---

# 1. Repository organization after cleanup

The former integrated repository `yoshihisahagisaka/atlib-msp-dev` has been split by system while preserving history with `git subtree split`.

`atlib-msp-dev` is now an archive/index only. Its README maps the old directories to the new repositories.

Current relevant repositories:

- `yoshihisahagisaka/git_KAIZEN` — **FACTACT canonical repository / implementation target**
- `yoshihisahagisaka/atlib-msp-customer-portal` — strongest general backend/platform reference
- `yoshihisahagisaka/atlib-ppap-file-transfer` — strongest OIDC/SSO/security/integration reference
- `yoshihisahagisaka/atlib-sales-tools` — AI structured-output and Golden Test reference
- `yoshihisahagisaka/atlib-cashflow` — test/import/export and deployment reference only
- `yoshihisahagisaka/atlib-msp-frontend-server` — infrastructure/network/DR operational reference only
- `yoshihisahagisaka/atlib-corporate-site` — corporate website; not a FACTACT application architecture source
- `yoshihisahagisaka/atlib-zabbix-server` — Zabbix-specific infrastructure reference
- `yoshihisahagisaka/atlib-sensor-edge` — edge/sensor-specific reference
- `yoshihisahagisaka/atlib-internal-docs` — business/internal documentation reference

The split repositories are the preferred references now. Do not tell developers to inspect old subdirectories in `atlib-msp-dev` unless historical archaeology is specifically needed.

---

# 2. Reuse classification

Use four classifications:

- **REUSE** — implementation pattern/component is close enough to copy selectively after dependency/security review.
- **ADAPT** — proven concept/pattern should be reused, but code must be reshaped for FACTACT boundaries.
- **REFERENCE** — learn from it; do not copy directly.
- **DO NOT REUSE** — conflicts with FACTACT architecture or is service-specific/legacy.

No classification overrides FACTACT canonical domain documents.

---

# 3. `atlib-msp-customer-portal`

## 3.1 What exists

The repository is a Node.js >=20 / TypeScript application with Express and PostgreSQL (`pg`). Its dependencies include Google Secret Manager, Cloud Storage, `google-auth-library`, JWT, `pino`, `pino-http`, and `zod`. It has a migration runner, Dockerfile, scripts, batch code, and structured `src` areas including `db`, `domain`, `lib`, `middleware`, `routes`, and `services`.

## 3.2 REUSE / strong ADAPT

Inspect and selectively reuse:

- Node/TypeScript strict project conventions;
- Docker / Cloud Run compatible packaging pattern;
- environment/config validation approach;
- PostgreSQL connection/repository patterns where portable;
- migration-runner philosophy;
- `pino` structured logging conventions;
- Google authentication verification patterns for atLIB staff access;
- Secret Manager access pattern;
- Cloud Storage integration pattern when Evidence/file storage becomes necessary;
- service-to-service / batch / Cloud Run Job patterns when later needed;
- Zod validation style at external/application boundaries.

## 3.3 ADAPT, do not copy blindly

- customer/tenant resolution;
- staff role/group membership logic;
- onboarding scripts;
- notification/email patterns;
- customer JWT/session behavior.

FACTACT tenancy is `Tenant → Organization → Service → Contract Profile → Recipient`, not the customer model of this portal.

## 3.4 DO NOT REUSE

- portal business tables as FACTACT Core tables;
- customer-specific domain schema;
- `ops_history` or manual time/minutes concepts as FACTACT Activity/Effort;
- any in-memory rate limiter as a production distributed control;
- direct assumptions that `customer == tenant`.

---

# 4. `atlib-ppap-file-transfer`

## 4.1 Why it matters

This repository contains the strongest existing atLIB authentication/security primitives. Its `src/lib` includes explicit OIDC/PKCE/session utilities such as:

- `oidcProvider.ts`
- `pkce.ts`
- `signedCookie.ts`
- `ssoSessionCookie.ts`
- `cookies.ts`
- `secrets.ts`

It also contains Docker/Cloud Build deployment artifacts and separate service entry points.

## 4.2 REUSE / strong ADAPT

Inspect these first when implementing authentication:

- generic OIDC provider discovery pattern;
- Authorization Code + PKCE mechanics;
- state/nonce handling;
- token/ID-token verification approach;
- signed self-contained cookie pattern where appropriate;
- secure cookie flags/lifetime patterns;
- Google/Microsoft provider abstraction concepts;
- Secret Manager integration;
- Cloud Run deployment conventions;
- IAP/LB verification patterns if FACTACT deployment chooses that boundary.

## 4.3 Important FACTACT adaptation

For FACTACT V1:

- external authentication identity resolves to a FACTACT `Operator`;
- external subject/auth ID is **not** the Operator domain primary key;
- tenant/role/authority is resolved by FACTACT application/domain rules;
- authentication proves identity, not Domain Authority to execute/verify/commit a Change.

## 4.4 DO NOT REUSE

- PPAP transfer business schema;
- file-transfer domain objects as Core abstractions;
- old SSO spike schema as FACTACT identity schema;
- JIT/customer/domain mapping without redesign for FACTACT tenancy;
- any auth shortcut/local bypass in production.

---

# 5. `atlib-sales-tools`

## 5.1 What exists

Node.js >=20 / TypeScript / Express / PostgreSQL with Google auth, Secret Manager, Pino, Zod and an AI SDK. It also contains `test/kaizenAssessment.golden.test.ts` and fixtures.

## 5.2 ADAPT

Use as reference for:

- structured AI request/response handling;
- validating AI output before application use;
- deterministic fallback/error behavior around AI;
- fixture-based Golden Test philosophy;
- Node built-in test style if it fits the chosen FACTACT stack.

## 5.3 FACTACT AI boundary

Even if code is adapted:

> **AI Suggests. Human Decides. System Records.**

AI may produce suggestions/hypotheses/rankings. It must not directly write authoritative Facts, Rules, Authority grants, verified Changes, or committed Registry state.

## 5.4 DO NOT REUSE

- sales/quotation/assessment business tables as FACTACT Core;
- existing prompts as universal FACTACT prompts;
- AI-generated classifications as authoritative Facts without confirmation/evidence.

---

# 6. `atlib-cashflow`

## 6.1 Useful material

The repository has a substantial automated test suite, including `goldenImport.test.ts`, auth/config/contract tests, and import-related tests. It also contains Docker/deployment material.

## 6.2 REFERENCE / ADAPT

Learn from:

- Golden Test structure;
- deterministic fixtures;
- import/export validation;
- DB-as-source-of-truth behavior;
- regression testing around transformation pipelines;
- Docker/Cloud Run operational lessons where relevant.

This is particularly useful when implementing the 12 FACTACT Golden Tests in `15-first-vertical-slice-contract-v1.md`.

## 6.3 DO NOT REUSE

- SQLite/Litestream architecture for FACTACT;
- cashflow domain schema;
- custom auth/JWT/local bypass patterns as the FACTACT auth architecture;
- finance-specific import models.

FACTACT V1 database remains Supabase PostgreSQL / PostgreSQL semantics.

---

# 7. `atlib-msp-frontend-server`

This repository is primarily an infrastructure/operations reference and contains network/front-end-server design plus password/PSK rotation and backup/DR procedures.

Classification: **REFERENCE ONLY** for:

- GCP/network deployment thinking;
- operational runbooks;
- backup/DR posture;
- secret rotation practices.

Do not use it as the FACTACT frontend application architecture or UI source.

---

# 8. Other split repositories

## `atlib-corporate-site`

REFERENCE for brand assets/corporate presentation only when useful. Do not derive FACTACT application architecture from a corporate website.

## `atlib-zabbix-server`

REFERENCE for future InfraVision/MSP integration/service model work. Not needed for the first JOIN slice.

## `atlib-sensor-edge`

REFERENCE for future device/edge integrations. Not needed for first slice.

## `atlib-internal-docs`

REFERENCE for business/service knowledge. It is not executable architecture.

---

# 9. FACTACT bootstrap recommendation

For the first vertical slice, do **not** copy an existing repository wholesale.

Recommended approach:

1. bootstrap a clean FACTACT application inside `git_KAIZEN`;
2. use Node.js/TypeScript as the default compatibility direction unless the coding session identifies a compelling reason otherwise;
3. use Supabase PostgreSQL with explicit migrations and RLS;
4. implement FACTACT Domain/Application boundaries from `15-first-vertical-slice-contract-v1.md` fresh;
5. selectively port/adapt proven platform code only after inspecting the current split repository;
6. record copied/adapted source paths in the implementation PR/commit for traceability.

The existing codebase should reduce platform risk, not import domain coupling.

---

# 10. Priority reuse order for the first slice

Before writing equivalent code from scratch, the VS Code agent should inspect in this order:

1. **Authentication / session / security**
   - `atlib-ppap-file-transfer/src/lib/oidcProvider.ts`
   - `atlib-ppap-file-transfer/src/lib/pkce.ts`
   - `atlib-ppap-file-transfer/src/lib/signedCookie.ts`
   - `atlib-ppap-file-transfer/src/lib/ssoSessionCookie.ts`
   - relevant auth middleware/routes

2. **Backend/platform baseline**
   - `atlib-msp-customer-portal/package.json`
   - `src/config.ts`
   - `src/db/`
   - `src/middleware/`
   - migration runner
   - Dockerfile
   - logging/Secret Manager patterns

3. **Testing style**
   - `atlib-sales-tools/test/kaizenAssessment.golden.test.ts`
   - `atlib-cashflow/app/test/goldenImport.test.ts`
   - nearby fixture/test utilities

4. **Deployment/operations only when needed**
   - `atlib-msp-frontend-server` runbooks/design
   - existing Docker/Cloud Run material

Do not spend the first implementation session auditing Zabbix, Sensor Edge, corporate-site, or unrelated business code.

---

# 11. Reuse decision checklist

Before copying/adapting existing code, answer:

1. Is this **platform/infrastructure** logic or **old business-domain** logic?
2. Does it preserve FACTACT tenant boundaries?
3. Does it preserve `Event → Requirement Evaluation → Work`?
4. Does it preserve `Action → Change → Verify → Commit`?
5. Does it avoid direct authoritative table writes from the browser/AI?
6. Does it preserve provenance/history?
7. Does it rely on old customer-as-tenant assumptions?
8. Is its security behavior still appropriate for the new deployment?
9. Can it be used with Supabase/PostgreSQL without coupling Core to Supabase-specific behavior?
10. Is adapting it actually simpler/safer than implementing the small requirement cleanly?

If answers 2–6 are not clearly yes, do not copy it into FACTACT.

---

# 12. Instruction for VS Code / Codex

Use this after cloning/opening `yoshihisahagisaka/git_KAIZEN`:

> Read `docs/99-ai-development-context.md`, `docs/README.md`, `docs/15-first-vertical-slice-contract-v1.md`, and `docs/16-existing-resource-reuse-audit.md` first. Treat `git_KAIZEN` as the FACTACT Single Source of Truth. FACTACT is a new system: do not copy legacy domain schemas or turn it into generic ticket CRUD. Before bootstrapping code, inspect the current split reference repositories listed in `16`, especially `atlib-ppap-file-transfer` for OIDC/PKCE/session patterns, `atlib-msp-customer-portal` for Node/TypeScript/PostgreSQL/config/logging/deployment patterns, and `atlib-sales-tools` / `atlib-cashflow` for Golden Test patterns. Classify each candidate as REUSE, ADAPT, REFERENCE, or DO NOT REUSE. Then propose the minimum stack and file structure for the first JOIN vertical slice. Preserve Event → Requirement Evaluation → Work and Action → Change → Verify → Commit. Do not write application code until you have summarized the invariants and reuse decisions. When adapting code, cite the source repository/path in your implementation notes or commit/PR description.

This is the preferred handoff prompt for the first VS Code session.
