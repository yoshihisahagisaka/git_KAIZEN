# Managed Capability — Scale / Complexity / Human Work Structure / Value Pricing Model v1

**Status:** BUSINESS HYPOTHESIS / COMMERCIAL DESIGN MODEL — NOT PRICE DECISION  
**Date:** 2026-09-13  
**Depends on:** docs/47, docs/48, docs/49, docs/50, docs/51, docs/52, docs/53

---

## 1. Why this document exists

Previous sensitivity models correctly separated Customer Baseline Work from atLIB Human Work, but remained too close to an assumption that equal Human Work hours have equal economic meaning.

That is not sufficient.

> **50名企業の100hと300名企業の100hは、同じ100hではない。**

Company scale may change:
- number of systems / SaaS;
- users / accounts / devices;
- sites / group companies;
- approval routes;
- authority patterns;
- exceptions;
- vendors;
- security / compliance requirements;
- required specialist capability;
- business impact of failure;
- customer IT investment scale.

Therefore price must not be derived from Human Work Hours alone.

---

## 2. FACT / MARKET EVIDENCE

Public market examples confirm that IT outsourcing pricing is not universally hour-only.

- A Japanese IT outsourcing provider publicly offers a per-employee model from ¥3,500/user/month, with examples of ¥175k/month for 50 employees and ¥350k/month for 100 employees, while also setting different included work-hour ceilings.
- Other providers use device-count pricing.
- Other services sell explicit monthly hour bundles.
- Market guides commonly distinguish price ranges by employee scale and scope/capability level.

This does **not** prove the correct atLIB price model. It does establish that employee scale, device scale, scope and hours are all used as commercial pricing dimensions in the market.

External market evidence must remain separate from atLIB FACT.

---

## 3. Core Correction

Do not model:

`Price = Human Hours × Hourly Rate`

Do not model:

`Price = Employee Count × Fixed Unit Price`

Instead model:

> **Commercial Price = f(Scale, Complexity, Responsibility, Human Work Structure, Service Level, FACTACT Leverage, Customer IT Economics)**

Human Work is one input, not the product.

---

## 4. Seven Commercial Dimensions

### D1 — Scale

Examples:
- employees / users;
- accounts;
- managed devices;
- servers / network devices;
- SaaS / systems;
- sites;
- group companies.

Scale is a useful early proxy, but is not equal to Complexity.

### D2 — Complexity

Examples:
- approval depth;
- role / authority patterns;
- exception rate;
- number of system dependencies per Work;
- heterogeneous devices / OS / applications;
- legacy systems;
- vendor fragmentation;
- organization-specific rules.

### D3 — Workload

Examples:
- inquiries;
- joiners / leavers;
- account changes;
- device replacements;
- incidents;
- patches / updates;
- monthly operational events.

### D4 — Human Work Structure

Equal hours may contain different work.

Classify Human Work by:
- Work Type: Service Desk / Operation / Management / Project;
- Skill: L1 / L2 / L3 / Specialist / Consultant;
- Decision Level: deterministic execution / operational judgment / management decision;
- Risk Level;
- Interaction: user / department / vendor / management;
- Exception Rate.

Internal Human COGS should therefore be:

`Σ(Role-specific Human Work × Role-specific Full Cost)`

not one blended rate in the final model.

### D5 — Responsibility / Service Level

Examples:
- service hours;
- response expectation;
- escalation responsibility;
- auditability;
- security responsibility;
- availability requirement;
- required evidence;
- continuity / backup capability.

### D6 — FACTACT Leverage

Examples:
- duplicate administration eliminated;
- context search reduced;
- standard procedure reused;
- knowledge reused;
- system execution / automation;
- external evidence connected;
- management projection generated without re-entry;
- specialist dependency reduced through standardization while preserving authority boundaries.

### D7 — Customer IT Economics / Value

Examples:
- current IT labor TCO;
- outsourced vendor TCO;
- IT investment scale;
- SaaS / license spend;
- infrastructure / cloud spend;
- employee waiting cost;
- risk exposure;
- business value of better IT decisions.

---

## 5. Human Work Structure Transformation

FACTACT leverage should not be measured only as:

`100h → 70h`

The more important question may be whether the **composition** of Human Work changes.

Illustrative example only:

Before:
- Specialist 30h
- Operator 70h
- Total 100h

After:
- Specialist 8h
- Operator 42h
- Total 50h

This is both:
- Quantity Compression; and
- Skill / Capability Leverage.

A different case:
- Specialist 30h
- Operator 40h
- Total 70h

has 30% hour compression but no reduction in specialist dependency.

Therefore Human Work Compression and Human Work Structure Transformation must be measured separately.

> **Humanを減らすのではなく、Humanにしかできない仕事へHumanを使う。**

---

## 6. Company Scale changes the meaning of Human Work

A 30-minute account change at a smaller organization may involve one system and one approver.

The same 30-minute measured Human Work at a larger organization may include:
- request verification;
- authority verification;
- separation-of-duties check;
- cross-system impact confirmation;
- execution;
- evidence verification;
- audit-ready commit.

Equal time therefore does not imply equal:
- skill;
- responsibility;
- risk;
- capability;
- customer value.

---

## 7. Scale is a Proxy, not a Price Rule

Do not conclude:

`50 employees = X`  
`300 employees = Y`

A 300-person standardized cloud environment may be easier to operate than a 150-person multi-company legacy environment.

Correct model:

### Before Assessment

Use easy-to-obtain proxies to create a preliminary commercial range:
- employees;
- devices;
- systems / SaaS;
- sites / companies;
- broad service scope.

### After Assessment

Replace proxies with observed FACT:
- actual Workload;
- actual Complexity;
- actual Human Work Structure;
- actual actor allocation;
- actual service requirements;
- measured / validated FACTACT leverage.

This preserves FACT FIRST.

---

## 8. Price Floor and Value Range

### Provider-side Price Floor

`Delivery COGS = Σ(Role Human Work × Role Full Cost) + FACTACT + Shared Specialist + Service Management + Other Delivery Cost`

This defines whether atLIB can sustainably deliver the scope.

### Customer-side Value Range

Do not calculate a mechanical ceiling. Evaluate:
- alternative internal FTE cost;
- onsite / dispatch / BPO alternatives;
- multiple specialist vendor cost;
- IT investment scale;
- avoided duplicate work;
- reduced employee waiting;
- risk / governance improvement;
- IT cost optimization opportunity;
- management decision value.

Commercial price must make sense between provider sustainability and customer value.

---

## 9. Public Market Anchors — Reference only

Examples observed in public Japanese market material:

- per-user managed IT operation pricing exists;
- device-count pricing exists;
- explicit hour-bundle pricing exists;
- some market guides show larger employee bands associated with broader scopes and higher monthly ranges;
- broad IT strategy / CIO support is priced separately or at higher bands than basic helpdesk work.

These references are useful to reject a single universal hourly-price assumption, but they are not evidence for an atLIB list price.

---

## 10. Candidate Commercial Architecture — PROPOSAL

### Stage A — Preliminary Range

Before paid Assessment, use a small number of observable dimensions:

`Scale Proxy × Broad Complexity Proxy × Required Capability`

Output: indicative range only.

### Stage B — Assessment Commercial Design

Assessment determines:

`FUTURE`
`→ Required IT Function`
`→ Scale / Complexity / Workload`
`→ Human Work Structure`
`→ 6 Lenses`
`→ Actor Allocation`
`→ atLIB Managed Scope`
`→ FACTACT Leverage`
`→ Required Service Level / Responsibility`
`→ Delivery COGS`
`→ Customer Alternative TCO / IT Economics`
`→ Commercial Scope & Price`

This makes Assessment part of service architecture and commercial architecture without making its conclusion an atLIB sales conclusion.

Actor Neutrality remains mandatory.

---

## 11. Reclassification of ¥498k / ¥600k / ¥800k

Current status:

> **HYPOTHESIS / PRICE SCENARIOS — NOT DECISION**

Do not currently treat these as S/M/L fixed plans.

They may later become:
- indicative entry bands;
- commercial anchors;
- minimum managed-capability bands;
- or be discarded entirely.

Decision requires measured customer data.

---

## 12. Next Validation Model

Build representative company scenarios, but clearly label all company data as HYPOTHESIS:

- 50 employees;
- 100 employees;
- 300 employees;
- 500 employees.

For each scenario compare:
1. Scale;
2. IT environment complexity;
3. Workload;
4. Human Work Structure / Role Mix;
5. Required capability / responsibility;
6. Current alternative IT Function TCO;
7. Actor allocation;
8. FACTACT leverage;
9. remaining atLIB Human Work;
10. Delivery COGS;
11. public market reference range;
12. customer value range;
13. commercial price scenario.

Do not claim any resulting price as market FACT until supported by evidence.

---

## 13. Current Business Conclusion

The commercial unit is not:

> **one hour of outsourced IT labor**

The intended unit is closer to:

> **a required IT Capability delivered for a company of a given Scale, Complexity and Responsibility, using the minimum necessary Human Work.**

Therefore FACTACT leverage can create economic value even when two customers consume equal Human hours, because the Capability, Skill Mix, Responsibility and customer economic context can differ materially.

This model supersedes any interpretation of docs/52–53 that equal Human Work hours should imply equal customer price.
