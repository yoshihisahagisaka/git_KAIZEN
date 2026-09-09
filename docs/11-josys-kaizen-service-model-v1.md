# FACTACT — 情シスKAIZEN Service Model V1

## 1. Purpose

This document defines the initial 情シスKAIZEN Service Model running on FACTACT.

The purpose is not to create eight independent workflow applications. The purpose is to configure common FACTACT Core semantics so that different 情シス operations follow the same Fact-first operating model.

> **FACT FIRST. From Fact to Action.**

Common Core flow:

> **Event → Context → Requirement Evaluation → Decision / Rule → Work or No Work → Action → Change → Verify → Commit → New Fact → Learn → KAIZEN**

The Service Model must preserve these Core invariants and must not bypass them for convenience.

---

## 2. V1 Service Processes

V1 validates the model across eight representative 情シス processes.

| Code | Process | Typical Event / Trigger | Primary objects |
|---|---|---|---|
| JOIN | 入社 | employee joining / planned start | Person, Organization, Account, Device, Application, License |
| LEAVE | 退社 | termination / contract end | Person, Account, Device, Access, License |
| MOVE | 異動・役割変更 | department / role / location change | Person, Organization, Account, Access, Device |
| SUPPORT | 問い合わせ・障害 | inquiry / incident / request | Person, Device, Account, Application, System, Knowledge |
| DEVICE | PC交換・故障 | replacement / failure / lifecycle event | Device, Person, Account, Application |
| SAAS | SaaS追加・変更・削除 | application/access request or lifecycle event | Application, Account, License, Person, Organization |
| SECURITY | セキュリティ対応 | alert / vulnerability / incident / review | Device, Account, Application, System, Risk Context |
| IT_CHANGE | IT施策・環境変更 | planned initiative / architecture or configuration change | System, Application, Network, Vendor, Contract Reference |

These are Service Model configurations over FACTACT Core. They must not introduce process-specific copies of Person, Device, Account, Application or other Facts.

---

## 3. Service Model Principles

### 3.1 Fact before task generation

An Event does not automatically imply a fixed checklist of Work.

Example: `JOIN` does not automatically mean every employee needs every device, account, license and application.

The platform first evaluates requirements from trusted context, rules and explicit decisions.

> **Do not create Work merely because an Event occurred. Create only Work that is actually required.**

### 3.2 Unknown is allowed

Missing information must remain explicit as UNKNOWN or Information Gap until evidence supports a value.

A Service Model must not force operators or AI to fabricate values merely to continue a workflow.

### 3.3 Work changes reality through Change

Closing Work must not directly mutate authoritative Registry state.

> **Work → Action → Change → Verify → Commit → authoritative Fact**

### 3.4 One Fact, Multiple Views

A Person-to-Device relation created through JOIN or DEVICE is the same Fact consumed by SUPPORT, SECURITY and management views.

No process owns a duplicate copy of that real-world relationship.

### 3.5 Learning is a consequence of Work

After Work, FACTACT should be able to capture learning candidates without silently promoting them to authoritative state.

Possible learning artifacts:
- Fact / Relation candidate
- Knowledge candidate
- Rule candidate
- Authority gap / promotion candidate
- Exception
- Information Gap
- Automation candidate
- KAIZEN candidate

> **AI Suggests. Human Decides. System Records.**

---

## 4. Shared Service Context

Each process resolves an Effective Service Context from:

1. Service Model defaults
2. Contract Profile and version
3. Service Recipient attributes
4. Recipient overrides
5. Known exceptions
6. Current Operational Context
7. applicable Rules / Policies
8. applicable Authority
9. relevant Decision history
10. reliability, provenance and current Unknowns

The same Event may therefore produce different Requirement Evaluation results for different customers, employees or contracts without changing Core semantics.

---

# 5. Golden Flow 1 — JOIN

## 5.1 Event

Example:

- Event type: `EMPLOYEE_JOINING`
- Person: Tanaka
- planned start date: 2026-10-01
- department: Sales
- employment type: Employee
- work location: Tokyo

Unknown values remain UNKNOWN.

## 5.2 Candidate Requirement Definitions

Candidate JOIN requirements:

- Company device required?
- M365 / primary identity account required?
- standard collaboration accounts required?
- department-specific SaaS required?
- license required?
- VPN / remote access required?
- security configuration required?
- special approval required?

Each Requirement Evaluation must produce an explicit result such as:

- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

Only applicable requirements create Work.

## 5.3 Example

Facts / context:
- department = Sales
- employment type = Employee
- location = Tokyo

Rules:
- Employee + Sales → company PC required
- Employee → M365 required
- Sales → CRM account required

Adobe requirement is unknown / not established.

Result:
- PC provisioning = REQUIRED → Work
- M365 provisioning = REQUIRED → Work
- CRM provisioning = REQUIRED → Work
- Adobe = DECISION_REQUIRED or NOT_APPLICABLE according to evidence/decision

The system must not generate Adobe Work merely because Adobe appears on a generic onboarding checklist.

## 5.4 Device allocation Change

Work: prepare PC001 for Tanaka.

Action:
- configure and allocate PC001

Reality Change candidate:
- relation `USES_PRIMARY_DEVICE`
- subject = Tanaka
- before = no active primary device relation
- after = PC001

Lifecycle:

> PLANNED → EXECUTED → VERIFIED → COMMITTED

After Commit:

> `Tanaka → USES_PRIMARY_DEVICE → PC001`

This single relation can support:
- Person View
- Device View
- PC management View
- Service Desk Operational Context
- Security Context
- management reporting

No second manual PC-management-list update is required.

## 5.5 JOIN learning example

During several Sales JOIN cases, operators repeatedly discover that a CRM browser extension is required.

FACTACT may create a Rule Candidate:

> `JOIN + department=Sales → CRM browser extension required`

The candidate remains non-authoritative until approved by an authorized human.

Once approved, later JOIN Requirement Evaluations can use it automatically.

---

# 6. Golden Flow 2 — LEAVE

## Goal

Safely remove or transition access and assets based on actual current Facts rather than a static checklist.

Typical Event:
- `EMPLOYEE_LEAVING`

Relevant Context:
- active accounts
- assigned devices
- application access
- licenses
- privileged roles
- ownership of shared resources
- current exceptions
- legal/contractual retention rules

Candidate requirements:
- disable primary identity account?
- revoke SaaS access?
- recover device?
- transfer file/mail/resource ownership?
- revoke privileged access?
- retain data?
- recover licenses?

Critical rule:

> **LEAVE must derive work from current relationships and rules, not assume that every person has the same resources.**

Example Change:
- Account status ACTIVE → DISABLED
- Person `USES_PRIMARY_DEVICE` Device relation closes at effective time
- License assignment relation closes

Historical Facts must remain traceable; do not erase the prior relationship as if it never existed.

---

# 7. Golden Flow 3 — MOVE

## Goal

Translate a real organizational change into only the IT changes actually required.

Typical Event:
- `PERSON_ROLE_OR_ORG_CHANGED`

Example Fact Change:
- Person department: Sales → Management Planning

Requirement Evaluation asks:
- Does M365 license change?
- Does group membership change?
- Does SaaS access change?
- Does privileged access change?
- Does device policy change?
- Does location/network access change?

If an existing entitlement remains valid, result can be `ALREADY_SATISFIED` or `NOT_APPLICABLE`; no Work is created.

This is a primary test of **Work Avoided**.

---

# 8. Golden Flow 4 — SUPPORT

## Goal

Use existing Facts and Operational Context to reduce repeated questioning and improve safe resolution.

Typical Event sources:
- phone inquiry
- email / chat inquiry
- manually created request
- monitoring/integration event where applicable

Example flow:

> Inquiry → Recipient Resolution → Operational Context → Guided Triage → Requirement Evaluation → SUPPORT Work → Action → Outcome / Change → Learning

Context may include:
- requester identity
- Organization
- current Device
- Accounts
- Applications
- recent Changes
- known incidents
- Knowledge
- Authority
- Exceptions
- Unknowns

A SUPPORT case may end with `NO_ACTION_REQUIRED`; this is distinct from deciding before Work that no Work was required.

Support must be able to create Knowledge State Changes when investigation converts UNKNOWN into verified information without pretending the real environment changed at that moment.

---

# 9. Golden Flow 5 — DEVICE

## Goal

Manage device lifecycle as real Entity/Relation changes rather than spreadsheet updates.

Typical Events:
- failure
- replacement request
- lifecycle/EoL event
- loss
- reassignment

Example replacement:

> Request → Requirement Evaluation → Work → Action → Reality Change → Verify → Commit

Before:
- Tanaka → USES_PRIMARY_DEVICE → PC001

After:
- prior relation effective period closed
- Tanaka → USES_PRIMARY_DEVICE → PC002

Do not overwrite history.

Downstream impact evaluation may identify:
- MDM enrollment
- security controls
- software assignment
- account/session cleanup
- old-device recovery/disposal

---

# 10. Golden Flow 6 — SAAS

## Goal

Manage application, account, access and license relationships from business requirements.

Typical Events:
- new access request
- role change
- application introduction
- license shortage
- contract change
- decommission

Requirement Evaluation may consider:
- recipient role
- business need
- existing account
- available license
- approval requirement
- security classification
- segregation-of-duties rule
- Contract Profile / Authority

Possible Facts / Relations:
- Person HAS_ACCOUNT Account
- Account BELONGS_TO Application
- Person ASSIGNED_LICENSE License
- Person HAS_ROLE ApplicationRole

A SaaS request must not automatically imply account creation if an account already exists.

---

# 11. Golden Flow 7 — SECURITY

## Goal

Turn alerts, vulnerabilities and security observations into controlled decisions and actions using trusted context.

Typical Events:
- vulnerability notice
- endpoint alert
- suspicious account activity
- configuration review finding
- security policy review

Important distinction:

> **An alert is an Event or Observation, not automatically a confirmed security Fact.**

Requirement Evaluation determines whether investigation, containment, remediation, approval or no Work is required.

Security Work must respect Authority and risk boundaries.

Examples:
- alert received → HYPOTHESIS / OBSERVATION
- investigation evidence → verified FACT
- containment decision → DECISION
- approved recurring handling → RULE candidate / RULE
- configuration remediation → REALITY_CHANGE

AI must not silently promote an alert or inference into a confirmed incident Fact.

---

# 12. Golden Flow 8 — IT_CHANGE

## Goal

Support deliberate IT initiatives and environment changes while preserving decision, authority, impact and Fact history.

Typical Events:
- migration initiative
- architecture change
- network change
- SaaS replacement
- security improvement
- policy change
- automation initiative

Typical flow:

> Need / Initiative Event → Current Facts → Gap → Decision → planned Work → Action → Change → Verification → Commit → Impact → Learning

IT_CHANGE is important because 情シスKAIZEN must not become only a support/operations system. It must support the work that changes the operating model itself.

---

# 13. LALLIB KAIZEN Classification

情シスKAIZEN should evaluate recurring Work before merely outsourcing or optimizing it.

Working method name: **LALLIB Method**.

For each recurring Work or process, evaluate:

1. **Let go — なくす**
   - Is this Work necessary at all?
   - Can the triggering condition, duplicate entry, approval or process be removed?

2. **Automate — 自動化する**
   - Is the Work sufficiently known, stable and controlled to automate safely?

3. **Leave — 社内に残す**
   - Is this a capability, decision or responsibility the customer should intentionally retain?

4. **atLIB — 任せる**
   - Can atLIB own/execute this function under an agreed Service, Contract Profile and Authority boundary?

This classification is a KAIZEN method, not a Work status and not a Core object type.

Do not automate merely because automation is technically possible.

> **Automate Only What Is Ready.**

---

# 14. HELIX — Learning and Improvement

The Service Model should make the following progression possible:

> **FACT → ACT → CHANGE → NEW FACT → KNOWLEDGE → RULE → STANDARDIZE → DELEGATE → AUTOMATE → NEXT ACT**

The platform should distinguish at least two improvement modes:

### Continuous Operational KAIZEN
Generated naturally by daily Work:
- UNKNOWN → known
- UNVERIFIED → VERIFIED
- stale → verified
- missing relation → verified relation
- missing Knowledge → Knowledge candidate
- unknown Exception → known Exception

### Deliberate KAIZEN
Intentional change to the operating model:
- eliminate unnecessary Work
- redesign Requirement rules
- standardize procedures
- change Authority
- automate stable Work
- redesign system/process architecture

---

# 15. Learning Artifact Lifecycle

V1 should avoid automatic promotion of AI suggestions.

Candidate lifecycle:

> DETECTED → SUGGESTED → HUMAN_REVIEW → APPROVED / REJECTED / DEFERRED → APPLIED → OBSERVED

Candidate types:
- FACT_CANDIDATE
- RELATION_CANDIDATE
- KNOWLEDGE_CANDIDATE
- RULE_CANDIDATE
- AUTHORITY_GAP
- AUTHORITY_PROMOTION_CANDIDATE
- EXCEPTION_CANDIDATE
- INFORMATION_GAP
- AUTOMATION_CANDIDATE
- KAIZEN_CANDIDATE

Not every type needs a dedicated database table in V1. This is a behavioral model first; implementation should reuse existing Core objects where appropriate.

Evidence used for promotion must remain traceable.

---

# 16. Measurement

The Service Model should measure whether Work is becoming better, not merely how many tickets are closed.

Candidate operational measures:
- Work Generated
- Work Avoided
- No Action Required
- Human Work
- Automated Work
- repeat investigation
- Unknowns encountered / resolved
- verification / correction rate
- escalation rate
- waiting / ownerless time
- observed active effort range and confidence

Candidate outcome measures:
- Created Time（創出時間）
- reduction in repeated human effort
- increased trusted Operational Context
- increased transferable / standardized Work
- safe Authority progression
- automation readiness / realized automation

Do not invent a universal maturity percentage without measurable evidence.

Created Time should ultimately answer:

> **このKAIZENによって、会社を良くするITに使える時間をどれだけ生み出したか。**

---

# 17. Cross-Process Golden Tests

The implementation should prove that Facts created in one process improve another process.

Required examples:

1. JOIN assigns Device → later SUPPORT sees the same current Device without duplicate entry.
2. DEVICE replacement changes primary Device → SUPPORT immediately sees new Device and historical Device remains traceable.
3. MOVE changes department → only genuinely affected access creates Work.
4. LEAVE reads current Account/Device/License relations → only existing resources create revocation/recovery Work.
5. SUPPORT discovers previously UNKNOWN environment information → verified Knowledge State Change enriches future SUPPORT and SECURITY context.
6. repeated human decisions → Rule Candidate, but no authoritative Rule until human approval.
7. stable repeated Work → Automation Candidate, but no automatic Authority increase.
8. SECURITY alert remains Observation/Hypothesis until evidence supports Fact.

---

# 18. V1 Acceptance Criteria

The 情シスKAIZEN Service Model V1 is conceptually valid when:

- all eight processes can be represented without creating process-specific duplicate Fact stores;
- Event does not directly create fixed Work checklists without Requirement Evaluation;
- UNKNOWN can remain explicit and does not block safe unrelated Work;
- Requirement Evaluation can result in No Work;
- Work traces why it exists;
- reality-changing Action creates traceable Change;
- authoritative Registry updates happen only after the required verification/commit path;
- historical relations remain reconstructable;
- Operational Context reuses Facts across processes;
- Observation/Hypothesis are not silently promoted to Fact;
- AI cannot create authoritative Facts, Rules or Authority by itself;
- learning candidates can be reviewed by humans;
- recurring Work can be evaluated through LALLIB rather than simply outsourced;
- measures can distinguish Work Generated, Work Avoided, Human Work and Automated Work;
- at least one cross-process Golden Test demonstrates that previous Work improves the next Work.

---

# 19. Recommended Implementation Order

Do not implement all eight processes at once.

Recommended vertical slices:

### Slice 1 — JOIN
Proves:
- Event
- Requirement Evaluation
- Work generation / Work Avoided
- Person / Device / Account relationships
- Change / Verify / Commit
- One Fact, Multiple Views

### Slice 2 — SUPPORT + DEVICE
Proves:
- Operational Context reuse
- Work from direct inquiry
- Knowledge State Change
- device replacement/history
- previous Facts improve next Work

### Slice 3 — MOVE + LEAVE
Proves:
- current-state-driven requirement evaluation
- temporal relation changes
- Work Avoided
- lifecycle safety

### Slice 4 — SAAS
Proves:
- Account/Application/License relationships
- approval/authority conditions

### Slice 5 — SECURITY + IT_CHANGE
Proves:
- Observation/Hypothesis/Fact separation under risk
- deliberate change and impact
- FACTACT is more than a Service Desk/ticket system

---

# 20. Definition of Success

The Service Model is successful when the following statement is true in real operation:

> **一件一件の仕事が、次の仕事を変える資産になる。**

And when FACTACT can demonstrate the progression:

> **正しいFactから必要なActionだけを生み、ActionによるChangeを新しいFactとして残し、そのFactによって次の仕事をより速く、正確に、少ない人手で進められる。**

That is the practical meaning of:

> **FACTACT — From Fact to Action.**
