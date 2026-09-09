# NEMESIA V1 画面ワイヤーフレーム・操作/API・状態遷移仕様

## 0. この資料の位置づけ

本資料は、NEMESIA V1 の「画面一覧・画面機能要件」を、実装に直接つながる粒度へ落としたもの。

対象は以下。

- 画面ワイヤーフレーム（Low Fidelity）
- 主要ボタン / 操作
- Backend API候補
- Domain Command / Query候補
- 主要State Transition
- エラー / 権限 / Validation
- Golden Flow単位のAcceptance Criteria

V1では **Sonics Service Deskの実運用開始**を最初のVertical Sliceとする。

---

# 1. UI全体構造

```text
┌──────────────────────────────────────────────────────────────────────┐
│ NEMESIA   [Tenant] [Service]                   [Search] [User Menu] │
├───────────────┬──────────────────────────────────────────────────────┤
│ Home          │                                                      │
│ Work          │                 MAIN CONTENT                         │
│ Customers     │                                                      │
│ Knowledge     │                                                      │
│ Review        │                                                      │
│ KAIZEN        │                                                      │
│ Admin         │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

## Global Header

表示:
- Product logo / name
- Current Tenant
- Current Service
- Global Search
- User / Role
- Notification（LATER）

操作:
- Tenant切替
- Service切替
- Global Search
- Logout

### Global Search対象
- Work ID / title
- Organization
- Person
- phone
- Knowledge
- Entity（段階的）

---

# 2. SC-02 Work Dashboard

## Wireframe

```text
┌───────────────────────────────────────────────────────────────────┐
│ Home / Work Dashboard                                             │
├───────────────────────────────────────────────────────────────────┤
│ [My Work 12] [Unowned 3] [Waiting 7] [Review 2] [SLO Risk 1]     │
├───────────────────────────────────────────────────────────────────┤
│ Filter: [Service▼] [Status▼] [Owner▼] [Priority▼] [Search____]   │
├───────────────────────────────────────────────────────────────────┤
│ P1 | #W-1024 | A社 | VPN接続不可                                  │
│     Owner: 山田  Assignee: 佐藤                                   │
│     Next: gateway確認   Due: 13:30   Status: IN_PROGRESS          │
├───────────────────────────────────────────────────────────────────┤
│ P2 | #W-1025 | B社 | Outlook送信不可                              │
│     Owner: 未設定 ← 警告                                          │
│     Status: OPEN                                                  │
├───────────────────────────────────────────────────────────────────┤
│ P2 | #W-1026 | C社 | PC起動不可                                  │
│     Owner: 田中   Waiting: Customer Response                      │
└───────────────────────────────────────────────────────────────────┘
```

## Primary Actions
- `Open Work`
- `Take Ownership`
- `Assign`
- `Filter`
- `Sort`
- `Create Work`

## Query API候補

### GET `/api/v1/work`
Query:
- tenant_id
- service_id
- status[]
- owner_id
- assignee_id
- priority[]
- waiting
- review_required
- slo_risk
- q
- cursor

Response:
- Work summary
- Organization
- Recipient
- Owner
- Assignee
- Next Action
- Due
- Last Activity
- SLO state

### GET `/api/v1/dashboard/summary`
Response:
- my_work_count
- unowned_count
- waiting_count
- review_required_count
- slo_risk_count

## Command API候補

### POST `/api/v1/work/{workId}/take-ownership`
Command:
`TakeWorkOwnership`

Validation:
- user has authority
- work active
- tenant/service scope valid

---

# 3. SC-03 Incoming Call Workspace

## 3.1 Entry

想定:
```text
https://nemesia.../incoming-call?tel=090xxxxxxxx&called=03xxxxxxxx
```

MOT/TEL AdapterまたはExternal URLから起動。

※ URL parameterは入力候補であり、本人認証・Tenant認可には使用しない。

---

## 3.2 Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Incoming Call                                                       │
│ 090-1234-5678  / Called: 03-xxxx-xxxx   [Call Active 00:01:12]*    │
├──────────────────────┬──────────────────────────────────────────────┤
│ CALLER               │ EFFECTIVE SERVICE CONTEXT                    │
│                      │                                              │
│ MATCHED              │ Service: Sonics Service Desk                 │
│ 田中 太郎            │ Contract: Standard Support v3                │
│ A株式会社            │ Scope: Remote first-line support             │
│ Mobile               │ SLA: Ack 10min                               │
│                      │ Restriction: Network config change requires   │
│ [Confirm]            │ Sonics approval                              │
│ [Change Person]      │                                              │
│ [Unknown]            │ Known Exception: None                        │
├──────────────────────┼──────────────────────────────────────────────┤
│ RECENT WORK          │ GUIDED TRIAGE                                │
│ #W-1001 VPN issue    │ AI Suggestion                                │
│ #W-0973 Printer      │                                              │
│                      │ Known: FortiClient used                      │
│ OBSERVATION          │ Unknown: VPN gateway                         │
│ ・回答速度への期待高 │ Next question: error message?                │
│   Source: Sales      │ Route: SUPPORT                               │
│                      │ Suggested Knowledge: KB-201                   │
├──────────────────────┴──────────────────────────────────────────────┤
│ [Link Existing Work] [Evaluate Requirement] [Create Work] [No Work] │
└─────────────────────────────────────────────────────────────────────┘
```

`* duration取得はProvider正式仕様確認後`

---

## 3.3 Caller Resolution State

```text
UNKNOWN
   │ operator identifies
   ▼
CONFIRMED_DURING_WORK
   │ verified/link saved
   ▼
MATCHED

AMBIGUOUS
   │ operator selects
   ▼
MATCHED
```

State:
- UNKNOWN
- AMBIGUOUS
- MATCHED
- CONFIRMED_DURING_WORK

## API候補

### POST `/api/v1/communication-events`
Input:
```json
{
  "provider": "MOTTEL",
  "channel": "PHONE",
  "direction": "INBOUND",
  "external_reference": null,
  "source_contact": "09012345678",
  "destination_contact": "03xxxxxxxx",
  "occurred_at": "..."
}
```

### POST `/api/v1/contact-points/resolve`
Input:
```json
{
  "type": "PHONE",
  "value": "09012345678",
  "service_id": "..."
}
```

Response:
```json
{
  "normalized_value": "+819012345678",
  "resolution_state": "MATCHED",
  "candidates": [...]
}
```

### POST `/api/v1/communication-events/{id}/confirm-recipient`
Command:
`ConfirmCommunicationRecipient`

Input:
- person_id optional
- organization_id optional
- recipient_id optional
- create_contact_point_link boolean

Audit required.

---

# 4. Requirement Evaluation UI

## Wireframe

```text
┌──────────────────────────────────────────────────────┐
│ Requirement Evaluation                               │
├──────────────────────────────────────────────────────┤
│ Event: Incoming Call #CE-1002                        │
│ Service: Sonics Service Desk                         │
│ Recipient: A株式会社                                 │
├──────────────────────────────────────────────────────┤
│ Requirement: First-line support                      │
│                                                      │
│ Condition                                            │
│ ☑ Contract active                                    │
│ ☑ Request in support scope                           │
│ ? Authority / exception check                        │
│                                                      │
│ Result: [REQUIRED ▼]                                 │
│ Reason:  [________________________________________]  │
│                                                      │
│ [Evaluate] [Create Work] [Save No Work Decision]     │
└──────────────────────────────────────────────────────┘
```

## Evaluation State

Result:
- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

## Transition

```text
NOT_EVALUATED
   │
   ▼
EVALUATED
   ├─ REQUIRED ─────────────→ Work may be created
   ├─ CONDITIONAL ──────────→ Decision / conditions
   ├─ DECISION_REQUIRED ────→ Human Decision
   ├─ ALREADY_SATISFIED ────→ No Work
   ├─ NOT_APPLICABLE ───────→ No Work
   ├─ WAIVED ───────────────→ No Work
   └─ CONDITION_NOT_MET ────→ No Work
```

## API

### POST `/api/v1/events/{eventId}/requirement-evaluations`
Command:
`EvaluateRequirement`

Input:
- requirement_definition_id
- result
- reason
- evidence_ids[]
- decision_id optional

Output:
- evaluation_id
- may_create_work
- required_work_template optional

---

# 5. SC-04 Work Detail

## Wireframe

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ #W-1024 VPN接続不可                    P1  IN_PROGRESS                   │
│ A株式会社 / Sonics Service Desk        Owner: 山田  Assignee: 佐藤      │
│ Contract: v3                                                              │
├──────────────────────────────────┬────────────────────────────────────────┤
│ WORK EXECUTION                   │ EFFECTIVE CONTEXT                      │
│                                  │                                        │
│ Current Situation                │ Scope                                  │
│ VPN接続時にerror 720             │ First-line / Remote                    │
│                                  │                                        │
│ Next Action                      │ Authority                              │
│ [Gateway情報を確認___________]   │ Read: Allowed                          │
│ Owner [山田▼]  Due [14:00]       │ Restart: Approval Required             │
│                                  │                                        │
│ [Set Waiting] [Complete Action]  │ Known                                  │
│                                  │ ✓ VPN Product = FortiClient VERIFIED  │
│ Timeline                         │ ? Gateway = UNKNOWN                    │
│ 13:01 Call received              │                                        │
│ 13:03 Caller confirmed           │ Observation                            │
│ 13:05 KB-201 used                │ 回答速度への期待高（Sales / 9-1）      │
│ 13:08 User asked error message   │                                        │
│                                  │ Knowledge                              │
│ [+ Action] [+ Decision]          │ KB-201 VPN first triage                │
│ [+ Evidence] [+ Change]          │                                        │
│                                  │ [Open Context Detail]                  │
├──────────────────────────────────┴────────────────────────────────────────┤
│ [Assign] [Request Review] [Escalate] [Resolve] [Close]                   │
└───────────────────────────────────────────────────────────────────────────┘
```

## Work Domain Fields

Required:
- id
- tenant_id
- service_id
- service_recipient_id
- contract_profile_version_id
- source_event_id
- source_requirement_evaluation_id
- type
- lane
- status
- priority
- service_owner_id
- work_owner_id
- assignee_id
- next_action
- next_action_owner_id
- due_at
- waiting_reason
- waiting_for
- outcome
- resolved_at
- closed_at

---

# 6. Work State Machine

## Proposed V1 States

- OPEN
- IN_PROGRESS
- WAITING
- REVIEW_REQUIRED
- RESOLVED
- CLOSED
- CANCELLED

## Diagram

```text
                ┌─────────────┐
                │    OPEN     │
                └──────┬──────┘
                       │ start
                       ▼
                ┌─────────────┐
      resume ┌─▶│ IN_PROGRESS │◀──────────────┐
             │  └──┬─────┬────┘               │
             │     │     │                    │ correction
             │     │     │ wait               │
             │     │     ▼                    │
             │     │  ┌─────────┐             │
             │     └─▶│ WAITING │─────────────┘
             │        └─────────┘
             │
             │ review needed
             ▼
      ┌─────────────────┐
      │ REVIEW_REQUIRED │
      └───────┬─────────┘
              │ approved
              ▼
        ┌────────────┐
        │  RESOLVED  │
        └──────┬─────┘
               │ close
               ▼
         ┌──────────┐
         │  CLOSED  │
         └──────────┘

OPEN / IN_PROGRESS / WAITING → CANCELLED
```

## Transition Rules

### OPEN → IN_PROGRESS
Required:
- Work Owner exists
- user has execution authority

### IN_PROGRESS → WAITING
Required:
- waiting_reason
- waiting_for
- Owner remains assigned

### WAITING → IN_PROGRESS
Required:
- resume reason or trigger

### IN_PROGRESS → REVIEW_REQUIRED
Required:
- review type
- reviewer or review routing

### REVIEW_REQUIRED → IN_PROGRESS
Cases:
- CORRECTION_REQUIRED
- ESCALATION_REQUIRED

### REVIEW_REQUIRED → RESOLVED
Cases:
- APPROVED
- APPROVED_WITH_FEEDBACK

### IN_PROGRESS → RESOLVED
Allowed only if review not required.

### RESOLVED → CLOSED
Required:
- outcome set
- unresolved required Change/Review does not exist
- required evidence present if policy demands it

### Any Active → CANCELLED
Required:
- cancel reason

---

# 7. Work Command API

### POST `/api/v1/work`
Command:
`CreateWork`

### POST `/api/v1/work/{id}/start`
`StartWork`

### POST `/api/v1/work/{id}/assign`
`AssignWork`

### POST `/api/v1/work/{id}/change-owner`
`ChangeWorkOwner`

### POST `/api/v1/work/{id}/next-action`
`SetNextAction`

### POST `/api/v1/work/{id}/wait`
`SetWorkWaiting`

### POST `/api/v1/work/{id}/resume`
`ResumeWork`

### POST `/api/v1/work/{id}/request-review`
`RequestWorkReview`

### POST `/api/v1/work/{id}/resolve`
`ResolveWork`

### POST `/api/v1/work/{id}/close`
`CloseWork`

### POST `/api/v1/work/{id}/cancel`
`CancelWork`

全Command:
- server-side permission validation
- tenant validation
- state transition validation
- audit event
- optimistic concurrency/version check推奨

---

# 8. Work Detail Query API

### GET `/api/v1/work/{id}`

Response Sections:
```json
{
  "work": {},
  "recipient": {},
  "organization": {},
  "effective_service_context": {},
  "operational_context": {},
  "timeline": [],
  "actions": [],
  "decisions": [],
  "changes": [],
  "reviews": [],
  "evidence": [],
  "related_work": []
}
```

実装上は複数Endpointでもよいが、UIの初期表示Latencyを考慮しAggregator Queryを推奨。

---

# 9. Action UI

```text
┌─────────────────────────────────────────┐
│ Add Action                              │
├─────────────────────────────────────────┤
│ Type     [REMOTE_SUPPORT ▼]             │
│ Summary  [VPN設定確認________________]  │
│ Result   [____________________________] │
│ Duration estimate [15 min] optional     │
│ Evidence [+ Add]                        │
│                                         │
│ Reality changed? [Yes / No]             │
│                                         │
│ [Save Action]                           │
└─────────────────────────────────────────┘
```

If `Reality changed = Yes`
→ Create Change flowへ誘導。

API:
### POST `/api/v1/work/{id}/actions`

---

# 10. Decision UI

```text
┌────────────────────────────────────────────┐
│ Record Decision                            │
├────────────────────────────────────────────┤
│ Question: 再起動してよいか                 │
│ Decision: [Sonics承認後に実施__________]   │
│ Reason:   [契約上Restartは要承認________]  │
│ Authority Used: [Contract v3 / A1]         │
│ Evidence: [Approval mail]                  │
│ Scope: [This Work ▼]                       │
│                                            │
│ [Save Decision]                            │
└────────────────────────────────────────────┘
```

API:
### POST `/api/v1/work/{id}/decisions`

Decision must keep:
- question
- decision
- reason
- decided_by
- authority_reference
- evidence
- scope
- effective_at

---

# 11. SC-11 Change / Verification

## Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Change #CH-220                                               │
│ Type: REALITY_CHANGE                                         │
├──────────────────────────────────────────────────────────────┤
│ Source Work: #W-1024                                         │
│ Source Action: VPN gateway setting changed                   │
│                                                              │
│ Target: Device / Relation                                    │
│ Before: Gateway A                                            │
│ Proposed After: Gateway B                                    │
│                                                              │
│ Risk: Medium                                                 │
│ Authority: A1 Supervised                                     │
│ Verification Required: Yes                                   │
├──────────────────────────────────────────────────────────────┤
│ Status: EXECUTED                                             │
│ Evidence: Screenshot / Test                                  │
│                                                              │
│ [Verify] [Request Review] [Reject]                            │
└──────────────────────────────────────────────────────────────┘
```

## State Machine

```text
PLANNED
  │ execute
  ▼
EXECUTED
  │ verify
  ▼
VERIFIED
  │ commit
  ▼
COMMITTED

PLANNED / EXECUTED → CANCELLED
EXECUTED / VERIFIED → CORRECTION_REQUIRED (via Review)
```

## Rules

- Reality Change is not committed to authoritative Registry before required verification.
- Knowledge State Change may commit a newly verified Fact without implying real-world change timestamp.
- Commit is a Domain operation, not direct table write from UI.

## API

- POST `/api/v1/work/{id}/changes`
- POST `/api/v1/changes/{id}/execute`
- POST `/api/v1/changes/{id}/verify`
- POST `/api/v1/changes/{id}/commit`
- POST `/api/v1/changes/{id}/cancel`

---

# 12. Operational Context Panel

## Wireframe

```text
┌────────────────────────────────────────────────────────────┐
│ Operational Context                                        │
├────────────────────────────────────────────────────────────┤
│ FACTS                                                      │
│ ✓ VPN Product = FortiClient                                │
│   VERIFIED | Source: W-0901 | Verified: 2026-09-01         │
│                                                            │
│ UNKNOWNS                                                   │
│ ? VPN Gateway                                              │
│   Needed for current Work: YES                             │
│   [Investigate]                                            │
│                                                            │
│ OBSERVATIONS                                                │
│ ◇ Response-speed expectation is high                       │
│   Source: Sales | observed: 2026-08-20                     │
│                                                            │
│ RULES                                                      │
│ R-21 Restart requires Sonics approval                      │
│                                                            │
│ AUTHORITY                                                  │
│ Current operator: A1 Supervised for network changes        │
└────────────────────────────────────────────────────────────┘
```

## Query API

### GET `/api/v1/work/{id}/operational-context`

Response:
- facts[]
- unknowns[]
- observations[]
- hypotheses[]
- decisions[]
- rules[]
- authority[]
- exceptions[]
- recent_changes[]
- knowledge[]
- gaps[]

各Item:
- semantic_type
- reliability
- source
- evidence
- verified_at
- updated_at
- scope
- owner optional

---

# 13. Unknown Resolution Flow

```text
UNKNOWN
  │ identify required information
  ▼
INVESTIGATING
  │ value obtained
  ▼
KNOWN / UNVERIFIED
  │ evidence confirms
  ▼
VERIFIED
  │ update trigger/owner/process defined
  ▼
CONTROLLED
```

※ `INVESTIGATING`はWork/Gap側Stateとして実装し、Information Reliabilityに混ぜない。

操作:
- Mark Needed for Current Work
- Start Investigation
- Add Candidate Value
- Add Evidence
- Verify
- Define Control
- Leave as Known Unknown

---

# 14. Review Queue / Review State

## Wireframe

```text
┌───────────────────────────────────────────────────────────┐
│ Review Queue                                              │
├───────────────────────────────────────────────────────────┤
│ #RV-120 | W-1024 | Network Change | Medium Risk          │
│ Requested by: 佐藤   Requested: 13:20                    │
│ Authority: A1 → Review Required                           │
│ [Open]                                                    │
└───────────────────────────────────────────────────────────┘
```

## Review Detail

Actions:
- APPROVE
- APPROVE WITH FEEDBACK
- CORRECTION REQUIRED
- ESCALATION REQUIRED
- PROCEDURE ISSUE
- KNOWLEDGE ISSUE
- AUTHORITY REVIEW

## API

- GET `/api/v1/reviews`
- GET `/api/v1/reviews/{id}`
- POST `/api/v1/reviews/{id}/complete`

Input:
- result
- feedback
- evidence
- authority recommendation optional
- rule candidate optional
- knowledge update optional

---

# 15. Authority Check UX

Authorityはボタン表示 / Enable状態に反映する。

例:

```text
Restart Device
[Request Approval]   ← A1
```

A2の場合:
```text
Restart Device
[Execute]
```

A3:
```text
Restart Device
[Execute under Rule R-42]
```

A4:
```text
Automated by Policy
[View Automation Evidence]
```

## Authority Check API

### POST `/api/v1/authority/evaluate`
Input:
- actor_id
- tenant_id
- service_id
- contract_profile_version_id
- work_type
- action_type
- target_type
- target_id
- risk
- exception_context

Response:
```json
{
  "allowed": false,
  "maturity": "A1",
  "required_review": true,
  "authority_reference": "...",
  "reason": "Network restart requires review"
}
```

---

# 16. Organization Detail

```text
┌────────────────────────────────────────────────────────────┐
│ A株式会社                                                  │
│ Recipient of: Sonics Service Desk                         │
├───────────────────┬────────────────────────────────────────┤
│ CONTACTS          │ ACTIVE WORK                            │
│ 田中 太郎         │ W-1024 VPN                             │
│ 佐藤 花子         │ W-1028 Printer                         │
│                   │                                        │
│ PHONE             │ RECENT KNOWLEDGE                       │
│ 03-xxxx-xxxx REP  │ KB-201 VPN                             │
│ 090-... Tanaka    │                                        │
│                   │ OBSERVATIONS                            │
│ CRM               │ response-speed expectation             │
│ [Open Zoho]       │                                        │
├───────────────────┴────────────────────────────────────────┤
│ [Create Work] [Add Person] [Add Observation]              │
└────────────────────────────────────────────────────────────┘
```

---

# 17. Person Detail

```text
┌───────────────────────────────────────────────────────────┐
│ 田中 太郎 | A株式会社                                     │
├───────────────────────────────────────────────────────────┤
│ CONTACT POINTS                                            │
│ Mobile 090... VERIFIED                                    │
│ Office 03... UNVERIFIED                                   │
│                                                           │
│ SERVICES                                                  │
│ Sonics Service Desk / Recipient role                      │
│                                                           │
│ RECENT WORK                                               │
│ W-1024 VPN                                                │
│                                                           │
│ OBSERVATIONS / FACTS / UNKNOWN                            │
└───────────────────────────────────────────────────────────┘
```

---

# 18. Knowledge Search

## Wireframe

```text
┌────────────────────────────────────────────────────────────┐
│ Knowledge                                                  │
│ Search [VPN FortiClient___________________] [Search]        │
├────────────────────────────────────────────────────────────┤
│ KB-201 VPN First Triage                                    │
│ VERIFIED | Service Desk | Used 18 times                    │
│ Applicable: FortiClient                                    │
│ [Open] [Use in Work]                                       │
├────────────────────────────────────────────────────────────┤
│ KB-330 VPN Gateway Check                                   │
│ STALE | Review required                                    │
└────────────────────────────────────────────────────────────┘
```

API:
- GET `/api/v1/knowledge`
- GET `/api/v1/knowledge/{id}`
- POST `/api/v1/knowledge`
- POST `/api/v1/knowledge/{id}/verify`
- POST `/api/v1/knowledge/{id}/mark-stale`
- POST `/api/v1/work/{workId}/knowledge-links`

---

# 19. Exception / Escalation Modal

```text
┌────────────────────────────────────────────┐
│ Standard procedure cannot be applied       │
├────────────────────────────────────────────┤
│ Reason                                     │
│ [Authority outside scope______________]    │
│                                            │
│ Expected Rule                              │
│ R-21 Restart requires approval             │
│                                            │
│ Evidence [+]                               │
│                                            │
│ [Escalate] [Create Exception Request]      │
└────────────────────────────────────────────┘
```

---

# 20. Stable Deep Link

Required routes:

```text
/work/{workId}
/organizations/{organizationId}
/people/{personId}
/recipients/{recipientId}
/knowledge/{knowledgeId}
/changes/{changeId}
/reviews/{reviewId}
```

Requirements:
- immutable object ID
- tenant authorization checked server-side
- readable slug optional, not identity
- external CRM can store Work URL safely
- old links remain valid after title/owner changes

---

# 21. Error / Validation UX

## Domain Error分類

### 403 Authority
表示:
`この操作を実行する権限がありません。Reviewを依頼してください。`

Action:
- Request Review

### 409 State Conflict
例:
別OperatorがWorkをClose済み。

表示:
`状態が更新されています。最新状態を読み込み直してください。`

Action:
- Reload

### 422 Domain Validation
例:
WAITINGにwaiting_reasonがない。

表示:
field-level validation

### 404 Cross Tenant / Not Found
情報漏洩防止のため、Unauthorized objectを404相当で返す設計も可。

---

# 22. Optimistic Concurrency

Work / Change / Contract Profile等の重要AggregateにはVersionを持つことを推奨。

Request:
```json
{
  "expected_version": 8
}
```

Mismatch:
HTTP 409

理由:
- Service Deskは複数Operatorが同じWorkを見る可能性あり
- Silent overwriteを防止

---

# 23. AI Guided Triage UI

```text
┌───────────────────────────────────────────────────────────┐
│ AI Guided Triage                                          │
├───────────────────────────────────────────────────────────┤
│ KNOWN                                                     │
│ ✓ FortiClient / VERIFIED                                  │
│                                                           │
│ MISSING                                                   │
│ ? Error code detail                                       │
│ ? VPN gateway                                             │
│                                                           │
│ SUGGESTED NEXT QUESTIONS                                  │
│ 1. 表示されているエラー番号を確認してください            │
│ 2. 他の利用者でも再現するか確認してください              │
│                                                           │
│ SUGGESTED ROUTE                                           │
│ SUPPORT / Remote first                                    │
│                                                           │
│ KNOWLEDGE                                                 │
│ KB-201 VPN First Triage                                   │
│                                                           │
│ [Accept] [Edit] [Reject]                                  │
└───────────────────────────────────────────────────────────┘
```

AI output must include:
- suggestion type
- generated_at
- source/evidence references
- confidence
- model/run metadata（internal）
- accepted / edited / rejected
- final human decision

AI must not:
- grant authority
- directly commit Change
- silently create Fact
- silently create Rule

---

# 24. AI API候補

### POST `/api/v1/work/{id}/ai/triage`
Input:
- work version
- current operator
- optional current user input

Server assembles authorized Operational Context.

Output:
- known[]
- missing[]
- suggested_questions[]
- suggested_route
- suggested_knowledge[]
- suggested_next_actions[]
- review_requirements[]
- source references

### POST `/api/v1/ai-suggestions/{id}/decision`
Input:
- ACCEPT
- EDIT
- REJECT
- edited_payload optional

Audit required.

---

# 25. Contract Profile UI

```text
┌─────────────────────────────────────────────────────────────┐
│ Contract Profile: Sonics Service Desk / v3                  │
│ ACTIVE  Effective: 2026-10-01                               │
├─────────────────────────────────────────────────────────────┤
│ Scope                                                       │
│ [Remote First-line Support]                                 │
│                                                             │
│ Service Hours                                               │
│ Weekdays 09:00-18:00                                       │
│                                                             │
│ Authority                                                   │
│ Password reset: A2                                          │
│ Network restart: A1 + Review                                │
│                                                             │
│ Escalation                                                  │
│ Onsite → Sonics担当                                         │
│                                                             │
│ SLA / SLO                                                   │
│ Ack: 10m                                                    │
│                                                             │
│ [Create New Version] [View Diff]                            │
└─────────────────────────────────────────────────────────────┘
```

Contract version states:
- DRAFT
- ACTIVE
- RETIRED

No in-place mutation of ACTIVE semantic configuration where historical Work interpretation changes.
Create new version.

---

# 26. Requirement Definition UI

```text
┌──────────────────────────────────────────────────────────────┐
│ Requirement Definition                                      │
├──────────────────────────────────────────────────────────────┤
│ Name: First-line support required                            │
│ Service Model: Service Desk                                  │
│ Event: Incoming Call                                         │
│                                                              │
│ Conditions                                                   │
│ - Contract active                                            │
│ - Recipient in scope                                         │
│ - Inquiry category supported                                 │
│                                                              │
│ Default Result: REQUIRED                                     │
│ Work Template: SUPPORT / INCIDENT                            │
│                                                              │
│ [Save Draft] [Activate Version]                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 27. Audit Timeline

Operator-friendly:
```text
13:01 Communication Event created
13:02 Caller matched to 田中太郎
13:03 Recipient confirmed by 佐藤
13:04 Requirement = REQUIRED
13:04 Work W-1024 created
13:05 Owner = 山田
13:12 Action added
13:20 Review requested
```

Admin Detail:
- event type
- actor
- aggregate
- aggregate version
- before
- after
- source
- correlation_id
- request_id
- timestamp

---

# 28. Suggested API Layering

```text
UI
 ↓
Application API / BFF
 ↓
Application Command / Query
 ↓
Domain Model
 ↓
Repository
 ↓
PostgreSQL / Supabase

External Provider
 ↓
Adapter
 ↓
Application Command
 ↓
Domain Model
```

Important:
- UIからDB直接更新を行わない
- AIからDB直接更新を行わない
- MOT/TEL / Zoho AdapterからCore tableを直接更新しない
- authoritative transitionはDomain Command経由

---

# 29. API Naming Principle

Resource GET:
- REST-orientedでよい

State change:
- generic PATCHだけに寄せすぎず、Domain Command endpointを許容

良い:
```text
POST /work/{id}/wait
POST /work/{id}/resume
POST /changes/{id}/verify
POST /changes/{id}/commit
```

避けたい:
```text
PATCH /work/{id} { "status": "WAITING" }
```

理由:
Domain validation / Audit / Authorityを明確にするため。

---

# 30. Golden Flow Acceptance — Returning Caller

## Scenario A 初回

Given:
- 電話番号未登録

When:
- Incoming Callを受信

Then:
- Resolution = UNKNOWN
- OperatorがA社田中氏と確認可能
- Person / OrganizationへContact Pointを紐付け可能
- Work作成可能
- Auditに確認者が残る

## Scenario B 2回目

Given:
- 090... が田中氏へLink済み

When:
- 同番号から電話

Then:
- MATCHED candidateとして田中氏を表示
- A社Contextを表示
- Recent Workを表示
- Operatorは別Personへ訂正可能

## Scenario C 代表番号

Given:
- 03... がA社OrganizationのREPRESENTATIVE

Then:
- A社候補のみ表示
- 特定Person本人として扱わない
- OperatorがCaller Personを確認する

---

# 31. Golden Flow Acceptance — Work

Given:
- Requirement REQUIRED

When:
- Work作成

Then:
- Source Event / RequirementがTrace可能
- Contract Profile Version固定
- Owner指定可能
- Status OPEN

When:
- Start

Then:
- IN_PROGRESS
- Owner required

When:
- Customer回答待ち

Then:
- WAITING
- Waiting reason required
- Owner remains

When:
- response received

Then:
- IN_PROGRESSへResume可能

When:
- resolve

Then:
- Outcome required before Close

When:
- close

Then:
- Evidence / Decision / Change / Audit retained

---

# 32. Golden Flow Acceptance — Change

Given:
- Device configuration changed

Then:
- Action exists
- REALITY_CHANGE created
- EXECUTED recorded
- required Verification performed
- VERIFIED
- COMMIT through Domain Command
- Registry Relation / Fact history updated
- prior state retained
- Source Work / Change traceable

---

# 33. Golden Flow Acceptance — AI

Given:
- VPN product VERIFIED
- gateway UNKNOWN

When:
- AI Triage run

Then:
- VPN product shown as known
- gateway shown as unknown
- AI may suggest gateway confirmation
- AI must not fabricate gateway
- operator accepts/edits/rejects suggestion
- final human choice auditable

---

# 34. Initial Backend Endpoints — Minimum Set

## Auth / Context
- GET `/api/v1/me`
- GET `/api/v1/tenants`
- GET `/api/v1/services`

## Work
- GET `/api/v1/work`
- GET `/api/v1/work/{id}`
- POST `/api/v1/work`
- POST `/api/v1/work/{id}/start`
- POST `/api/v1/work/{id}/take-ownership`
- POST `/api/v1/work/{id}/assign`
- POST `/api/v1/work/{id}/next-action`
- POST `/api/v1/work/{id}/wait`
- POST `/api/v1/work/{id}/resume`
- POST `/api/v1/work/{id}/resolve`
- POST `/api/v1/work/{id}/close`

## Caller / Communication
- POST `/api/v1/communication-events`
- POST `/api/v1/contact-points/resolve`
- POST `/api/v1/communication-events/{id}/confirm-recipient`

## Customer Context
- GET `/api/v1/organizations/{id}`
- GET `/api/v1/people/{id}`
- GET `/api/v1/recipients/{id}`
- GET `/api/v1/work/{id}/operational-context`

## Requirements
- POST `/api/v1/events/{id}/requirement-evaluations`

## Timeline
- POST `/api/v1/work/{id}/actions`
- POST `/api/v1/work/{id}/decisions`

## Knowledge
- GET `/api/v1/knowledge`
- GET `/api/v1/knowledge/{id}`

## Review
- GET `/api/v1/reviews`
- POST `/api/v1/work/{id}/request-review`
- POST `/api/v1/reviews/{id}/complete`

## Change
- POST `/api/v1/work/{id}/changes`
- POST `/api/v1/changes/{id}/execute`
- POST `/api/v1/changes/{id}/verify`
- POST `/api/v1/changes/{id}/commit`

## AI
- POST `/api/v1/work/{id}/ai/triage`
- POST `/api/v1/ai-suggestions/{id}/decision`

---

# 35. 最初のVertical Slice

最初の実装では、以下だけでもEnd-to-Endで通す。

```text
Login
→ Incoming Call
→ Phone Resolve
→ Organization / Person Candidate
→ Caller Confirm
→ Effective Service Context
→ Requirement Evaluation
→ Work Create
→ Owner
→ Work Detail
→ Action
→ Waiting / Resume
→ Resolve
→ Close
→ Stable Work URL
```

### このSliceでは後回しでもよい
- Full Authority Admin
- Rule Candidate Automation
- KAIZEN Dashboard
- Advanced Change Registry
- Zoho自動Write-back
- Advanced AI
- Activity analytics

---

# 36. Definition of Done — Vertical Slice 1

実装完了の判定:

1. Tenant分離されている
2. Incoming Call画面をURLから開ける
3. Phone Numberをnormalizeできる
4. Contact Point候補検索できる
5. Unknown Callerに対応できる
6. Caller確認をAuditできる
7. Organization / Personを表示できる
8. Contract Profileを解決できる
9. Requirement Evaluationできる
10. Workを作れる
11. Ownerを必須化できる
12. Work state transitionがDomainで制御される
13. WaitingでもOwnerが残る
14. Actionを追加できる
15. Operational Contextを最低限表示できる
16. Resolve / Closeできる
17. Close後も履歴が残る
18. Work URLが固定
19. Cross-Tenantアクセスを拒否する
20. Golden Flow Testが自動化されている

---

# 37. 開発者向け最終原則

### UIの中心
**チケットを更新することではなく、Operatorが次に正しく行動できること。**

### Domainの中心
**WorkはEventから直接生まれない。Requirementが必要性を決める。**

### Dataの中心
**One Fact, Multiple Views.**

### Contextの中心
**Unknownを隠さない。Reliabilityを隠さない。**

### Changeの中心
**ActionとReality Changeを分け、VerifyしてからCommitする。**

### Authorityの中心
**AIやRole名ではなく、Scope付きAuthorityで実行可否を決める。**

### AIの中心
**AI Suggests. Human Decides. System Records.**

### Productの中心
**Work turns Unknowns into Facts. Facts make the next Work easier.**
