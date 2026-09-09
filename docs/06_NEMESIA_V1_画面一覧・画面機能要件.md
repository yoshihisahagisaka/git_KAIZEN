# NEMESIA V1 画面一覧・画面機能要件

## 1. 目的

本資料は、NEMESIA V1の機能要件をUI/画面単位に落とし込み、開発者が
- 画面構成
- Navigation
- 各画面の責務
- 必須表示項目
- 必須操作
- 権限・状態遷移
- Backend API / Domainとの接続点

を具体化できる状態にすることを目的とする。

V1の最優先ユースケースは **Sonics向けService Desk**。
ただし、UI構造は将来 **情シスKAIZEN** でも同じCoreを利用できる前提とする。

---

# 2. V1 画面一覧

## Operator向け主要画面

| ID | 画面名 | Priority | 主目的 |
|---|---|---:|---|
| SC-01 | Login / Tenant Select | MUST | 認証・Tenant Context確定 |
| SC-02 | Home / Work Dashboard | MUST | 自分・チームのWorkを把握 |
| SC-03 | Incoming Call Workspace | MUST | 電話着信時のCaller特定・Context表示・案件化 |
| SC-04 | Work Detail | MUST | Workの実行・判断・記録・Close |
| SC-05 | Work Create | MUST | 手動Work作成 |
| SC-06 | Organization Detail | MUST | 顧客OrganizationのContext確認 |
| SC-07 | Person Detail | MUST | Person・Contact Point・履歴確認 |
| SC-08 | Service Recipient Detail | MUST | Service/Contract単位の対象情報確認 |
| SC-09 | Operational Context Panel | MUST | Fact/Unknown/Observation/Rule等のContext表示 |
| SC-10 | Knowledge Search / Detail | MUST | Knowledge検索・参照・更新 |
| SC-11 | Change / Verification | MUST | Changeの実行・Verify・Commit |
| SC-12 | Review Queue | MUST | Review Required案件の確認・承認 |
| SC-13 | Exception / Escalation | SHOULD | 標準対応できない案件の人手判断 |
| SC-14 | KAIZEN Candidate | SHOULD | 運用Evidenceから改善候補確認 |

## 管理画面

| ID | 画面名 | Priority | 主目的 |
|---|---|---:|---|
| AD-01 | Tenant / Organization Admin | MUST | Tenant・Organization管理 |
| AD-02 | Service / Service Model Admin | MUST | 提供Service定義 |
| AD-03 | Contract Profile Admin | MUST | Scope / SLA / Authority等の契約運用設定 |
| AD-04 | Recipient Admin | MUST | Service Recipient設定 |
| AD-05 | Person / Contact Point Admin | MUST | Person・電話番号等管理 |
| AD-06 | Requirement Definition Admin | MUST | Eventに対するRequirement定義 |
| AD-07 | Authority Admin | MUST | 権限Scope設定 |
| AD-08 | Rule / Knowledge Admin | SHOULD | Rule / Knowledge管理 |
| AD-09 | Integration Admin | SHOULD | MOT/TEL / Zoho / External Reference設定 |
| AD-10 | Audit Log | MUST | 重要操作・変更履歴確認 |

---

# 3. Navigation案

## Primary Navigation

- Home
- Work
- Customers
- Knowledge
- Review
- KAIZEN
- Admin

## Service Desk Operatorの基本導線

### 通常
Home
→ Work一覧
→ Work Detail
→ Action / Change / Knowledge / Close

### 電話着信
Incoming Call Workspace
→ Caller Resolution
→ Effective Service Context
→ Guided Triage
→ Requirement Evaluation
→ Work Create / Existing Work Link
→ Work Detail

---

# 4. SC-01 Login / Tenant Select

## 目的
認証ユーザーをNEMESIA内部のPerson / Roleへ対応付け、利用可能Tenant / Service Contextを確定する。

## 必須機能
- Google Workspace等による認証
- 認証IdentityとPersonの分離
- 利用可能Tenant表示
- 利用可能Service表示
- Default Tenant / Service選択
- Cross-Tenant権限を持つatLIB OperatorのみTenant切替可能

## 表示
- Login User
- Tenant
- Role
- Active Service

## 制約
- Supabase Auth IDをPerson PKにしない
- URLパラメータだけでTenant切替しない
- Server側でEffective Tenantを再検証する

---

# 5. SC-02 Home / Work Dashboard

## 目的
Operatorが「今やるべき仕事」を迷わず把握する。

## 必須Widget
- My Work
- Team Work
- Unowned Work
- Waiting Work
- Review Required
- Due Soon
- SLO Risk
- Recently Updated
- Incoming / New

## Workカード表示
- Work ID
- Title / Summary
- Recipient
- Organization
- Service
- Priority
- Status
- Owner
- Assignee
- Next Action
- Due
- Waiting Reason
- Last Activity

## 必須操作
- Workを開く
- Owner引受
- Filter
- Sort
- Search
- Saved View（SHOULD）

## 重要
「件数」より
- Owner不在
- Next Action不明
- Waiting長期化
- Review滞留
を見つけやすくする。

---

# 6. SC-03 Incoming Call Workspace

## 目的
電話着信時に、Callerを特定し、必要なContextを即表示し、安全に案件化する。

## Entry
MOT/TEL External URL等から起動。

## Input
- caller_number
- called_number（取得可能な場合）
- external_call_reference（取得可能な場合）
- started_at（取得可能な場合）

## 画面ブロック

### A. Caller Resolution
表示:
- 入電番号
- normalized phone
- MATCHED / AMBIGUOUS / UNKNOWN
- Person候補
- Organization候補
- Contact Point label

操作:
- 候補確定
- 別Personを検索
- 新規Personとして仮登録
- Organizationだけ確定
- UNKNOWNのまま開始

### B. Recipient Context
表示:
- Organization
- Service
- Contract Profile
- Recipient
- Plan / Scope
- SLA / SLO
- Known Prohibition
- Authority Restriction
- Known Exception

### C. Operational Context
表示:
- Recent Work
- Facts
- Unknowns
- Observations
- Relevant Knowledge
- Recent Decisions
- Recent Changes

### D. Guided Triage
表示:
- AI Summary
- 必要な追加質問
- Missing Context
- Suggested Route
- Relevant Knowledge
- Review Required候補

### E. Action
操作:
- Existing Workへ紐付け
- Requirement Evaluation開始
- New Work作成
- No Workとして終了

## Acceptance
- Unknown Callerでも案件開始可能
- 2回目以降の同一番号でPerson候補を出せる
- Operatorが誤一致を修正できる
- Caller ID一致を本人認証として扱わない
- 電話番号だけでAuthorityを付与しない

---

# 7. SC-04 Work Detail

## 目的
NEMESIAの中心画面。
Workに必要な判断・実行・Context・Change・Knowledge・Reviewを一画面で扱う。

## Header
- Work ID
- Title
- Service
- Recipient
- Organization
- Work Type
- Lane
- Priority
- Status
- Outcome
- Owner
- Assignee
- Contract Profile Version

## Main Left: Work Execution

### Summary
- Source Event
- Source Requirement Evaluation
- Description
- Current Situation

### Next Action
- Next Action
- Next Action Owner
- Due
- Waiting For
- Waiting Reason

### Activity / Action Timeline
- Action
- Decision
- Review
- Change
- Communication
- Evidence
- Knowledge update
- Owner change

## Main Right: Context

### Effective Service Context
- Scope
- SLA/SLO
- Authority
- Rule
- Prohibition
- Escalation
- Exception

### Operational Context
- Facts
- Unknown
- Observation
- Hypothesis
- Knowledge
- Decision
- Recent Change
- Reliability

## Footer / Action Bar
- Add Action
- Add Decision
- Add Knowledge
- Create Change
- Request Review
- Set Waiting
- Assign
- Change Owner
- Escalate
- Resolve
- Close

## Invariants
- Active WorkはOwner必須
- WaitingでもOwner維持
- Close時にEvidence / Decision / Change / Auditを削除しない
- RegistryをClose処理から直接書き換えない

---

# 8. SC-05 Work Create

## 目的
電話以外から手動でWorkを作成する。

## 必須入力
- Service
- Recipient
- Work Type
- Lane
- Summary
- Source
- Owner

## Optional
- Event
- Requirement Evaluation
- Assignee
- Priority
- Due
- Related Work
- Parent Work
- Evidence

## Rule
- 原則はEvent / Requirement Evaluationから作成
- 手動作成時も「なぜWorkが必要か」のReasonを必須にする

---

# 9. SC-06 Organization Detail

## 目的
Service Deskで顧客Organizationを起点に全体Contextを見る。

## 表示
- Organization基本情報
- Active Services
- Contract Profiles
- Service Recipients
- Persons
- Contact Points
- Recent Work
- Open Work
- Known Exceptions
- Observations
- Knowledge
- Systems / Devices / Vendors（将来）
- External References
- Zoho CRM link（存在時）

## 操作
- Work作成
- Person追加
- Contact Point追加
- Observation追加
- Knowledge追加
- Recipient確認

---

# 10. SC-07 Person Detail

## 目的
Callerや情シスKAIZENの社員をPersonとして確認する。

## 表示
- Name
- Organization
- Role / Department
- Contact Points
- Service Recipient roles
- Recent Work
- Observations
- Known Facts
- Unknowns
- Accounts / Devices（情シスKAIZEN時）

## 操作
- Contact Point追加
- 電話番号Verify
- Organization関連変更
- Observation追加
- Work作成

## 制約
- Personを全業務データの親にしない
- 代表番号をPersonへ誤紐付けしない

---

# 11. SC-08 Service Recipient Detail

## 目的
Entityそのものではなく「このService / Contractにおける対象」というContextを見る。

## 表示
- Service
- Contract Profile
- Recipient Entity
- Override
- Known Exception
- Active Work
- Recent Work
- Context Maturity
- Unknown / Gap
- Effective Service Context

## 操作
- Override設定
- Exception確認
- Work作成
- Context Gap追加

---

# 12. SC-09 Operational Context Panel

## 目的
「今このWorkを正しく進めるために必要な情報」をまとめて表示する。

## Section
- What we know
- What we do not know
- What is observed
- What is hypothesized
- What is verified
- What is stale
- What authority applies
- What exception applies
- What should be checked next

## 各項目に表示
- Value
- Semantic Type
- Reliability
- Source
- Evidence
- Verified At
- Owner
- Related Work
- Related Entity

## 表示分類
Semantic:
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- FACT
- DECISION
- RULE

Reliability:
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

## 操作
- Verify
- Mark Stale
- Add Evidence
- Create Unknown
- Resolve Unknown
- Convert Observation → Rule Candidate（Review経由）
- Create KAIZEN Candidate

---

# 13. SC-10 Knowledge Search / Detail

## 目的
過去の対応知識を次のWorkで再利用する。

## Search
- Keyword
- Service
- Organization
- Product / System
- Work Type
- Reliability
- Status

## Detail
- Title
- Content
- Applicable Scope
- Source
- Evidence
- Verified At
- Reliability
- Related Work
- Related Rule
- Revision History

## 操作
- Use in Work
- Edit
- Verify
- Mark Stale
- Create New Version
- Retire

---

# 14. SC-11 Change / Verification

## 目的
Actionによる現実・情報の変化を、安全に確定する。

## Change Type
- REALITY_CHANGE
- KNOWLEDGE_STATE_CHANGE

## 表示
- Source Work
- Source Action
- Target Entity / Relation
- Before
- Proposed After
- Change Type
- Risk
- Required Authority
- Verification Requirement
- Evidence
- Status

## Lifecycle
- PLANNED
- EXECUTED
- VERIFIED
- COMMITTED

## 操作
- Execute
- Add Evidence
- Verify
- Request Review
- Commit
- Reject / Cancel

## 重要
- EXECUTED ≠ COMMITTED
- Knowledge State Changeで現実の変更時刻を偽装しない

---

# 15. SC-12 Review Queue

## 目的
A1 Supervised等のWork / Change / DecisionをReviewする。

## 一覧
- Work
- Requested By
- Service
- Recipient
- Review Type
- Risk
- Requested At
- Due
- Current Owner

## Review Result
- APPROVED
- APPROVED_WITH_FEEDBACK
- CORRECTION_REQUIRED
- ESCALATION_REQUIRED
- PROCEDURE_ISSUE
- KNOWLEDGE_ISSUE
- AUTHORITY_REVIEW

## 操作
- Approve
- Feedback
- Return
- Escalate
- Suggest Authority Promotion
- Suggest Rule Candidate
- Suggest Knowledge Update

---

# 16. SC-13 Exception / Escalation

## 目的
標準Ruleや通常手順で処理できない案件を安全に人へ戻す。

## Trigger UI
- 標準手順では対応できない
- 通常と異なる事情がある
- Authority外
- 情報不足
- Rule conflict

## 表示
- Expected Rule
- Exception Reason
- Source Event / Work
- Required Decision
- Current Authority
- Evidence
- Scope
- Effective Period

## 操作
- Escalate
- Decision記録
- Temporary Exception作成
- Known Exception化
- Rule Candidate作成

---

# 17. SC-14 KAIZEN Candidate

## 目的
日常Workから改善候補を見える化する。

## Candidate Source
- Repeat Inquiry
- Repeat Unknown
- Repeat Approval
- Waiting
- Manual Duplicate Update
- Knowledge Gap
- Rule Candidate
- Automation Candidate
- Exception Pattern

## 表示
- Candidate
- Source Evidence
- Affected Service
- Frequency
- Human Effort Estimate
- Business Impact
- Confidence
- Suggested Action

## 操作
- Accept
- Merge
- Reject
- Promote to KAIZEN Initiative
- Assign Owner

---

# 18. AD-01 Tenant / Organization Admin

## Tenant
- Create / Edit / Disable
- Security Boundary
- Allowed Domains
- Operator Access

## Organization
- Create / Edit
- Parent / Group relation
- External Reference
- Active Service
- Status

## 制約
- OrganizationをTenantとして自動生成しない

---

# 19. AD-02 Service / Service Model Admin

## Service Model
- Service Desk
- 情シスKAIZEN

## Service
- Name
- Model
- Status
- Default Rule
- Default Requirement
- Default SLA/SLO
- Default Work Type

## 制約
Core semanticsを書き換えない。

---

# 20. AD-03 Contract Profile Admin

## 必須設定
- Customer
- Service Model
- Service
- Effective From / To
- Version
- Recipient Scope
- Service Items
- Scope
- Responsibility
- Authority
- Service Hours
- SLA/SLO
- Escalation
- Prohibition
- Reporting
- KAIZEN Profile

## 操作
- Draft
- Activate
- New Version
- Retire
- Diff View

## 重要
過去Workは当時Versionを保持する。

---

# 21. AD-04 Recipient Admin

## 機能
- Recipient追加
- Entity検索
- Service / Contract紐付け
- Override
- Exception
- Status

## 制約
Contract Profileの標準設定をRecipientへコピーしない。

---

# 22. AD-05 Person / Contact Point Admin

## Person
- Name
- Organization
- Department / Role
- Status

## Contact Point
- Type
- Value
- normalized_value
- Label
- Owner Type
- Verified At
- Source
- Valid From / To
- Status

## 操作
- Link
- Unlink
- Verify
- Mark Invalid
- Merge Candidate（LATER）

---

# 23. AD-06 Requirement Definition Admin

## 必須項目
- Name
- Service Model
- Applicable Event Type
- Applicable Context
- Condition
- Default Evaluation
- Required Work Template
- Rule Reference
- Version

## 操作
- Draft
- Activate
- Version
- Disable

## 重要
Event → Work直結を避けるためのCore設定画面。

---

# 24. AD-07 Authority Admin

## Scope
- Person / Role
- Service
- Contract
- Work Type
- Action Type
- Entity / Relation Type
- Risk
- Exception Scope

## Maturity
- A0 Observe
- A1 Supervised
- A2 Delegated
- A3 Rule Governed
- A4 Automated

## 操作
- Grant
- Restrict
- Review
- Expire
- Revoke

## 制約
AIによる自動Grant禁止。

---

# 25. AD-08 Rule / Knowledge Admin

## Rule
- Rule
- Scope
- Version
- Source Decisions
- Evidence
- Status
- Approved By

## Rule Candidate
- Source Work
- Repetition Evidence
- Suggested Rule
- Confidence
- Review

## Knowledge
- Knowledge管理機能はSC-10と共通。

---

# 26. AD-09 Integration Admin

## Provider
- MOT/TEL
- Zoho
- Auth Provider
- future Provider

## 表示
- Connection Status
- Tenant
- Provider
- External Reference
- Last Success
- Last Failure
- Retry Status

## MOT/TEL
- Incoming URL configuration
- Number normalization rule
- Provider metadata mapping

## Zoho
V1:
- Manual operation guidance
- External CRM URL

Later:
- Write-back policy
- Field mapping
- Idempotency
- Retry

## 制約
Secret / Tokenを通常DB Fieldとして保存しない。

---

# 27. AD-10 Audit Log

## Filter
- Actor
- Tenant
- Service
- Work
- Object
- Event Type
- Date

## Audit対象
- Work state
- Owner
- Decision
- Authority
- Rule
- Change Commit
- Recipient Resolution
- Contact Point
- Integration
- AI Suggestion adoption/rejection

## 表示
- Actor
- Timestamp
- Target
- Action
- Before
- After
- Source
- Correlation ID

---

# 28. V1 共通UIルール

## 28.1 Contextを隠さない
重要項目には可能な限り以下を表示できる設計とする。

- Source
- Reliability
- Verified At
- Evidence
- Semantic Type

## 28.2 Unknownを空欄で表現しない
空欄とUNKNOWNを区別する。

悪い例:
VPN Gateway: [空欄]

良い例:
VPN Gateway: UNKNOWN
Reason: 未確認
Needed for current Work: Yes

## 28.3 ObservationはFactと見た目を分ける
Observationは主観情報であることがUI上分かるようにする。

## 28.4 AI提案は確定情報と見た目を分ける
AI Suggestionには必ず
- Suggestion
- Confidence
- Evidence / Source
- Accept
- Edit
- Reject
を用意する。

## 28.5 OwnerとAssigneeを分ける
「担当者」が誰かだけで責任を表現しない。

## 28.6 WaitingでもOwnerを表示する
Waiting理由だけを表示してOwnerを消さない。

## 28.7 Stable URL
最低限以下はDeep Link可能にする。

- Work
- Organization
- Person
- Service Recipient
- Knowledge
- Change
- Review

Zoho等の外部システムからWork URLで戻れること。

---

# 29. V1 Golden Flow — 画面遷移

## Returning Caller

MOT/TEL
↓
SC-03 Incoming Call Workspace
↓
Phone Number Normalize
↓
Person / Organization Match
↓
Effective Service Context
↓
AI Guided Triage
↓
Requirement Evaluation
↓
SC-04 Work Detail
↓
Action / Remote Support / Escalation
↓
Knowledge / Fact Update
↓
Change / Verify / Commit
↓
Resolve / Close
↓
Stable Work URL
↓
必要に応じてZohoへ手入力

---

# 30. 最初に実装する画面

開発順は以下を推奨する。

### Sprint / Slice 1
1. SC-01 Login
2. SC-02 Work Dashboard
3. SC-03 Incoming Call Workspace
4. SC-04 Work Detail
5. SC-06 Organization Detail
6. SC-07 Person Detail
7. SC-09 Operational Context Panel

### Slice 2
8. SC-10 Knowledge
9. SC-11 Change
10. SC-12 Review
11. AD-03 Contract Profile
12. AD-06 Requirement Definition
13. AD-07 Authority

### Slice 3
14. Exception
15. KAIZEN
16. Integration Admin
17. Rule Candidate
18. Advanced Registry

---

# 31. 最初の実装完了条件

以下が実際に動けば、V1 Coreの最初の縦切りは成立。

1. 電話番号を受け取れる
2. Person / Organization候補を検索できる
3. Unknown Callerでも開始できる
4. Effective Service Contextを表示できる
5. Requirement Evaluationできる
6. 必要なWorkだけ作成できる
7. Ownerを設定できる
8. Next Actionを管理できる
9. Actionを記録できる
10. Knowledge / Fact / Unknownを表示できる
11. WorkをWaiting / Resumeできる
12. Escalationできる
13. Resolve / Closeできる
14. Close後もEvidence / Decision / Change / Auditが残る
15. Work URLを外部から開ける

---

# 32. 開発者への重要メッセージ

> NEMESIAは「チケットを記録する画面」を作るプロジェクトではない。

OperatorがWorkを開いたときに、

- 何が分かっているか
- 何が分かっていないか
- 何を確認すべきか
- 何をしてよいか
- 誰が責任を持つか
- 何が変わったか
- 次回どう楽になるか

が分かることが、本システムのUXの中心である。

**Operational Contextを見ながらWorkを進めること自体が、標準化・Knowledge蓄積・KAIZENにつながるUIを目指す。**
