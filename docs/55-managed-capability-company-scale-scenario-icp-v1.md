# Managed Capability — Company Scale Scenario / ICP v1

Status: BUSINESS HYPOTHESIS / SENSITIVITY MODEL — NOT PRICE DECISION
Date: 2026-09-13

## 1. Purpose

This document tests how the same nominal Human Work hours can have different economic meaning depending on company scale, IT complexity, responsibility, Work composition, and customer IT economics.

It extends docs/52–54. It does not replace FACT with invented precision.

Core principle:

> 50名企業の100hと300名企業の100hは、同じ100hではない。

Therefore:

> Human Work Hours ≠ Human Work Cost ≠ Human Work Complexity ≠ Customer Value.

## 2. Evidence boundary

### FACT / external market observations

Public Japanese IT outsourcing offers use multiple pricing bases: employee count, supported-device count, included support hours, service scope, and support level. Public examples also show broader/higher-level support priced differently from simple L1 operation.

Examples observed 2026-09-13:
- Abatous: employee-count based examples: 30 employees ¥105k/month up to 20h; 50 employees ¥175k up to 30h; 100 employees ¥350k up to 60h.
- ANETS: entry plan ¥40k/month, 8h, up to 50 devices; its page explicitly frames the example for companies below 100 employees.
- Online Josys: ¥50–80k for 8–13h, ¥150–180k for 25–30h, ¥300k+ for 50h+ and improvement/security scope.
- OPTiM Biz Josys Daiko publishes a 100-employee model with 55h/month total work, of which 40h is externalized and 15h remains customer-side.
- IT顧問 情シス君 differentiates L1 existing-operation execution from L2 operation improvement/BPR and changes hourly pricing by support level.

These observations demonstrate that the market does not treat all hours as identical. They do NOT prove atLIB's appropriate price.

### USER-PROVIDED SCENARIO

A comparable IT function delivered by three onsite person-months may cost more than ¥2m/month. This is a business scenario supplied by the user, not independently established as a universal market FACT.

### UNKNOWN

- Actual atLIB role-specific Full Cost
- Actual FACTACT compression by Work category and company scale
- Actual customer Work Mix by scale
- Actual IT investment by scale for atLIB target customers
- Actual willingness-to-pay
- Actual non-human Delivery COGS

All numeric company profiles below are HYPOTHESIS unless explicitly identified as external observation.

## 3. Why company scale matters without becoming employee-count pricing

Company size can influence:
- users / identities
- devices
- SaaS and systems
- locations / group companies
- approval routes
- role / authority patterns
- vendors
- security and audit requirements
- incident blast radius
- number of exceptions
- business impact of downtime or access error
- IT investment scale

But:

> Company Size ≠ Complexity.

Employee count is a useful commercial proxy before Assessment. Assessment must replace the proxy with actual FACT.

## 4. Human Work Structure

Do not price or cost a customer only from total hours.

Each Human Work population should be decomposed by at least:

1. Volume — hours / events / requests
2. Work Type — Service Desk / Operational / Management-Reporting / Change-Project
3. Skill — Operator / Engineer / Specialist / Service Manager / Consultant
4. Decision Level — deterministic execution / operational judgment / specialist judgment / management decision
5. Risk — impact if wrong or delayed
6. Interaction — employee / department / vendor / management / external party
7. Exception Rate — share that cannot follow the standard path

Provider Human COGS should eventually be:

`Human COGS = Σ(Role Human Work × Role Full Cost)`

not:

`Total Hours × one universal hourly cost`.

## 5. FACTACT leverage has two dimensions

### 5.1 Quantity Compression

Reduce total Human Work while maintaining Capability and Quality.

### 5.2 Work Structure Transformation

Reduce low-value or repeated Human dependency and reduce unnecessary high-skill dependency through:
- one Work → reusable Fact / Evidence / Relation / Change
- no duplicate management-table updates
- contextual information available in Work
- procedure / knowledge reuse
- standardized execution
- automation where appropriate
- shared specialist capability instead of permanent dedicated specialist capacity

Target state:

> Humanを減らすのではなく、Humanにしかできない仕事へHumanを使う。

## 6. Four company-scale scenarios

These are deliberately illustrative profiles, not target-customer FACT.

| Dimension | 50 employees | 100 employees | 300 employees | 500 employees |
|---|---:|---:|---:|---:|
| Scale | Small | Small–Medium | Medium | Medium–Large |
| IT estate | Relatively limited | Growing | Multi-system likely | Broad / heterogeneous likely |
| Approval complexity | Low–Medium | Medium | Medium–High | High potential |
| Governance need | Low–Medium | Medium | High potential | High potential |
| Specialist dependency | Limited | Emerging | Meaningful | Meaningful–High |
| Business impact per IT failure | Lower absolute exposure | Growing | Larger potential exposure | Larger potential exposure |
| IT investment capacity | Lower potential | Growing | Material potential | Material potential |

Every qualitative value above is HYPOTHESIS and must be replaced by Assessment FACT.

## 7. Same 100h — four different structures

For comparability only, assume each company currently has 100h/month of relevant Human Work. This does NOT imply real workloads are equal by company size.

### Scenario A — 50 employees / 100h

Illustrative composition:
- 55h routine/user-facing execution
- 25h operational administration
- 10h specialist/engineering
- 10h management/vendor/decision support

Potential characteristics:
- fewer systems and approval branches
- more Generalist work
- lower absolute IT spend
- lower commercial ceiling despite meaningful efficiency opportunity

### Scenario B — 100 employees / 100h

Illustrative composition:
- 40h routine/user-facing execution
- 30h operational administration
- 15h specialist/engineering
- 15h management/vendor/decision support

Potential characteristics:
- SaaS/account/device administration becomes material
- one-person IT bottleneck may emerge
- standardization and management-table elimination may create FACTACT leverage

### Scenario C — 300 employees / 100h

Illustrative composition:
- 25h routine/user-facing execution
- 30h operational administration
- 25h specialist/engineering/security
- 20h management/vendor/governance

Potential characteristics:
- same 100h contains more judgment, responsibility, vendor coordination and specialist capability
- error/delay may affect more users/assets
- customer alternative TCO may include multiple internal roles/vendors

### Scenario D — 500 employees / 100h

Illustrative composition:
- 20h routine/user-facing execution
- 25h operational administration
- 30h specialist/engineering/security
- 25h management/vendor/governance

Potential characteristics:
- larger number of systems, approval patterns, security controls, audit evidence and exceptions may exist
- specialist and management capability can dominate value even if total hours are unchanged

All hour distributions are HYPOTHESIS for structural illustration only.

## 8. Why the price should differ even if atLIB compresses all four to the same hours

Suppose, only as a thought experiment, FACTACT and KAIZEN reduce each 100h population to 50h of atLIB Human Work while preserving Capability and Quality.

It does NOT follow that all four customers should receive the same price.

The remaining 50h may differ in:
- role cost
- specialist mix
- decision burden
- security responsibility
- SLA / availability
- exception handling
- vendor coordination
- management reporting
- customer economic impact

Therefore:

> Equal Remaining Human Hours ≠ Equal Delivery COGS.

And even if Delivery COGS happened to be equal:

> Equal Delivery COGS ≠ Equal Customer Value.

## 9. Commercial model

### 9.1 Internal Cost Floor

`Delivery COGS = Σ(Role Work × Role Full Cost) + FACTACT + Shared Specialist + Service Management + Onsite/Logistics + Other Delivery Cost`

### 9.2 Commercial Complexity / Responsibility

Candidate dimensions:
- users / identities
- managed devices
- systems / SaaS
- sites / group entities
- vendors
- approval / authority patterns
- security / compliance
- service availability
- exception rate
- specialist capability
- management/governance requirement

### 9.3 Customer Value Context

Candidate dimensions:
- alternative internal staffing TCO
- current outsourcing/vendor TCO
- total IT operating cost / IT investment
- employee waiting/productivity impact
- risk exposure
- license/SaaS/vendor optimization opportunity
- ability to execute business change faster

### 9.4 Commercial Price

Candidate model:

`Price = f(Scale, Complexity, Responsibility, Human Work Structure, Service Level, FACTACT Leverage, Customer IT Economics)`

This is a design principle, not a final pricing formula.

## 10. External market sanity check

Public evidence supports the direction, not the exact atLIB price.

- Abatous scales monthly examples with employee count and included hours.
- ANETS combines time and device count.
- Online Josys increases price as hours and scope rise, with the higher tier adding security and improvement.
- IT顧問 情シス君 explicitly distinguishes L1 operation from L2 BPR/improvement rather than treating hours as one commodity.
- OPTiM's 100-employee model explicitly separates externalized work from work retained by the customer, reinforcing Actor Allocation rather than assuming all current work moves to the provider.

Therefore a market-consistent design can use Scale as an initial proxy while still making final pricing Assessment-based.

## 11. Price scenarios 498 / 600 / 800

DECISION:

> ¥498k / ¥600k / ¥800k are not fixed S/M/L prices at this stage.

They remain price scenarios for viability testing.

Do not map mechanically:
- 50 employees → ¥498k
- 100 employees → ¥600k
- 300 employees → ¥800k

Instead, test whether a given price is viable after actual Scope, Complexity, Work Structure, Role Mix, Service Level and Customer Value are known.

## 12. Candidate ICP by leverage, not headcount alone

### Higher FACTACT leverage candidate

A company where several of the following are true:
- recurring account/device/SaaS/license work is material
- multiple management tables exist
- the same change is entered in multiple systems/tables
- information search consumes meaningful time
- joiner/leaver/change workflows repeat
- management reporting is manually reconstructed
- multiple vendors/systems need coordination
- standardization/API/automation is feasible
- management wants the IT function improved, not merely cheap labor
- enough economic scale exists to value shared specialist and management capability

### Lower leverage candidate

- overwhelmingly synchronous L1 helpdesk
- high physical onsite dependency
- highly bespoke work with little repetition
- customer demands named dedicated people rather than service capability
- little permission to redesign the operating model
- very small IT economic base relative to required service scope

## 13. Emerging ICP hypothesis

HYPOTHESIS:

The strongest initial ICP may not be the smallest companies and may not be the largest companies.

A promising zone is likely companies large enough to have:
- material IT complexity and spend,
- recurring operational and management work,
- multiple systems/vendors,
- a meaningful cost of poor IT operations,

but not large enough to economically maintain every required specialist capability internally.

This is a hypothesis. Employee-count boundary is UNKNOWN.

## 14. Assessment implication

Assessment should eventually collect enough FACT to replace scale proxies with actual commercial drivers.

Candidate commercial input set:

### Scale
- employees/users
- devices
- accounts
- systems/SaaS
- sites/group companies
- vendors

### Complexity
- approval routes
- authority patterns
- exception patterns
- legacy/on-prem dependency
- integration level
- security/compliance requirements

### Work Structure
- Work type
- volume
- Human time
- role/skill
- decision level
- interaction
- rework/wait/search/duplicate administration

### Economics
- internal IT staffing structure
- material vendor/outsourcing cost
- material software/cloud/device cost where available
- alternative delivery model

Do not require perfect financial data to perform Assessment; UNKNOWN remains UNKNOWN.

## 15. Strategic conclusion

The commercial question is not:

> 何時間働くか？

Nor simply:

> 何人の会社か？

The question is:

> その会社が必要とするIT Capabilityを、どの複雑性・責任・品質で提供し、そのためにどのHuman Capabilityが必要で、FACTACTによってどこまでHuman dependencyを圧縮・変換できるか？

This produces the intended economic alignment:

> Customer IT Capability ↑ / Customer Work ↓ / atLIB Human Dependency ↓ / Sustainable Margin ↑

without turning IT経営KAIZEN into hourly BPO.

## 16. Next validation

Before deciding initial pricing or ICP headcount:
1. Use real/pilot customers to measure Work Structure.
2. Capture Scale and Complexity FACT.
3. Measure category-level FACTACT compression.
4. Establish role-specific Full Cost.
5. Compare equivalent customer alternative TCO.
6. Test willingness-to-pay by customer scale/complexity.
7. Derive commercial bands only after these observations.

Until then, company-size bands and prices remain hypotheses.