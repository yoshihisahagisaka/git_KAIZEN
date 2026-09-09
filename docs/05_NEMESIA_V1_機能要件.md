# NEMESIA V1 機能要件

## 1. 目的

NEMESIAは、atLIBが提供する **Service Desk** と **情シスKAIZEN** を同一Core上で運営するための Service Operating Platform である。

本システムは単なる問い合わせ管理、CRM、台帳、BPO管理ツールではなく、以下を一つにつなぐことを目的とする。

- Service / Contract / Recipient
- Event / Requirement / Work
- Action / Change
- Operational Context
- Knowledge / Rule / Decision / Authority / Exception
- Evidence / Review / KAIZEN

基本フローは以下とする。

**Event → Requirement Evaluation → Decision / Rule → Work or No Work → Action → Change → Registry / Knowledge → Review / Authority → KAIZEN**

V1の最優先ゴールは、**Sonics向けService Deskを実運用できること**、かつ同じCoreを将来 **情シスKAIZEN** に利用できることとする。

---

# 2. V1 機能要件一覧

優先度は以下。

- **MUST**: V1リリースに必須
- **SHOULD**: V1で可能な限り実装
- **LATER**: V1後に拡張

## FR-01 Tenant / Organization 管理
**Priority: MUST**

- Tenantをセキュリティ境界として管理できる。
- OrganizationをTenant配下の業務上の組織として管理できる。
- TenantとOrganizationを同一概念として扱わない。
- Sonics配下の約400エンド顧客を、400 Tenantとして作成しない。

**Acceptance**
- 1 Tenant内に複数Organizationを登録できる。
- Tenantを跨いだデータ参照は原則不可。
- atLIB運用者のCross-Tenant権限は明示的に付与する。

## FR-02 Person 管理
**Priority: MUST**

- PersonをOrganizationとは独立したEntityとして管理する。
- Personは認証アカウントと別IDを持つ。
- 1 Personに複数Contact Pointを紐付けられる。

**Acceptance**
- Personに携帯、直通、代表電話経由等を複数登録できる。
- Supabase Auth IDをPerson PKとして使用しない。

## FR-03 Contact Point 管理
**Priority: MUST**

- 電話番号、メールアドレス等をContact Pointとして管理する。
- V1はPHONEを必須、EMAILは保持可能な設計とする。
- 電話番号をPersonの唯一のIdentityとして扱わない。

**Acceptance**
- normalized_valueを用いて同一番号判定できる。
- owner_typeとしてPERSON / ORGANIZATIONを扱える。
- MOBILE / OFFICE / DIRECT / REPRESENTATIVE / OTHERを識別できる。
- verified_at / source / statusを保持できる。

## FR-04 Service / Service Model 管理
**Priority: MUST**

- ServiceとService Modelを分離する。
- CoreにService Desk固有ロジック、情シスKAIZEN固有ロジックを埋め込まない。
- V1対象Service Modelは Service Desk / 情シスKAIZEN。

**Acceptance**
- 同じWork / Context / Change Coreを両Service Modelで使用できる。
- Service ModelがCore Objectの意味を再定義しない。

## FR-05 Contract Profile 管理
**Priority: MUST**

Contract Profileに以下を保持できる。
- Scope
- Service Item
- Responsibility
- Authority
- Escalation
- SLA / SLO
- Service Hours
- Known Prohibition
- Standard Rule
- Recipient範囲
- Service Model

**Acceptance**
- Workが作成時点のContract Profile Versionを参照できる。
- Contract Profile変更後も過去Workの契約条件を追跡できる。
- 標準設定 + Customer Override方式を採用する。

## FR-06 Service Recipient 管理
**Priority: MUST**

- Service RecipientはService / Contract Context上のサービス対象として管理する。
- Entityそのものと同一視しない。
- Service DeskではEnd Customer Organization、情シスKAIZENではEmployee Personを主なRecipientとする。

**Acceptance**
- Recipientごとに標準契約情報をコピーしない。
- Effective Service Contextを動的に解決できる。

## FR-07 Effective Service Context 解決
**Priority: MUST**

以下を統合して、そのWorkに適用されるContextを生成する。
1. Service Model Default
2. Contract Profile
3. Recipient Attribute
4. Recipient Override
5. Known Exception
6. Current Operational Context

**Acceptance**
- Work画面で現在案件に適用される条件を取得できる。
- Contract / Recipient / Exceptionの優先関係が一貫している。

## FR-08 Event 管理
**Priority: MUST**

- 電話、問い合わせ、HRイベント、定期イベント等をEventとして記録できる。
- EventはWorkそのものではなく、Requirement Evaluationの契機として扱う。

**Acceptance**
- Eventから0件、1件、複数件のRequirement Evaluationを生成できる。
- Eventだけ作成され、Workが生成されないケースを許容する。

## FR-09 Requirement Definition
**Priority: MUST**

- Eventに対して何の仕事が必要かを評価するためのRequirement Definitionを持つ。
- Service / Contract / Recipient Contextに応じて適用可能とする。

**Acceptance**
- Requirementの適用条件と結果を追跡できる。
- Requirementと後続WorkをTraceできる。

## FR-10 Requirement Evaluation
**Priority: MUST**

最低限以下を扱う。
- REQUIRED
- CONDITIONAL
- DECISION_REQUIRED
- ALREADY_SATISFIED
- NOT_APPLICABLE
- WAIVED
- CONDITION_NOT_MET

**Acceptance**
- Evaluation結果と理由を保存できる。
- REQUIRED等の場合のみ必要なWorkを作成する。
- ALREADY_SATISFIED等では不要なWorkを作らない。

## FR-11 Work 管理
**Priority: MUST**

Workは「Ownerを持って開始され、Outcomeまで管理される仕事の単位」とする。

最低限保持する項目:
- Work Type
- Service Lane
- Service Owner
- Work Owner
- Assignee
- Priority
- Next Action
- Next Action Owner
- Due
- Waiting Reason
- Source Event
- Source Requirement Evaluation
- Contract Profile Version
- Service Recipient
- Status
- Outcome

Work Type候補: INCIDENT / REQUEST / TASK / CONSULT / CHANGE / REVIEW / EVENT_TASK

Service Lane候補: SUPPORT / CONSULT / CHANGE

## FR-12 Work Ownership
**Priority: MUST**

- Active Workには原則Ownerを必須とする。
- Waiting状態でもOwnershipを解除しない。
- AssigneeとOwnerを分離できる。

**Acceptance**
- Owner不在のActive Workを検出できる。
- Waiting理由とWaiting先を保持できる。
- 「誰が次に何をするか」を表示できる。

## FR-13 Work State Management
**Priority: MUST**

想定例: OPEN / IN_PROGRESS / WAITING / REVIEW_REQUIRED / RESOLVED / CLOSED

**Acceptance**
- 不正な状態遷移をDomain層で拒否する。
- Close後もEvidence / Decision / Change / Auditを保持する。

## FR-14 Work Outcome
**Priority: MUST**

最低限以下を扱う。
- COMPLETED
- NO_ACTION_REQUIRED
- CANCELLED
- DUPLICATE
- SUPERSEDED

**Acceptance**
- Requirement評価段階でWork不要と、調査した結果NO_ACTION_REQUIREDを区別する。

## FR-15 Action 管理
**Priority: MUST**

- Work中に人またはシステムが行ったActionを記録できる。
- 誰が、いつ、何を行ったかを追跡できる。

**Acceptance**
- Realityを変えるActionはChangeへTrace可能。
- Action履歴をWorkから確認できる。

## FR-16 Change 管理
**Priority: MUST**

以下を区別する。
- REALITY_CHANGE
- KNOWLEDGE_STATE_CHANGE

Change lifecycle候補: PLANNED → EXECUTED → VERIFIED → COMMITTED

**Acceptance**
- Reality ChangeをKnowledge更新だけで代替しない。
- Knowledge State Changeが現実世界の変更時刻と誤認されない。
- Source Work / Actionを追跡できる。

## FR-17 Verify / Commit
**Priority: MUST**

- Changeを実行しただけでRegistryへ確定反映しない。
- Verify後にCommitする構造を持つ。

**Acceptance**
- Review / Verificationが必要なChangeは未確認状態を保持できる。
- Commit前後を区別できる。

## FR-18 Entity / Registry
**Priority: MUST**

V1で最低限以下を扱える設計とする。
- ORGANIZATION
- PERSON
- LOCATION
- DEVICE
- ACCOUNT
- APPLICATION
- SYSTEM
- VENDOR
- CONTRACT_REFERENCE

**Acceptance**
- Person中心の固定Schemaにしない。
- generic EAVのみで全Registryを表現しない。

## FR-19 Relation 管理
**Priority: MUST**

Entity間関係をFirst-class Objectとして保持する。

最低項目:
- status
- effective_from
- effective_to
- source_work
- source_change
- verified_at
- evidence
- reliability

**Acceptance**
- PC交換等で旧Relationを上書きせず履歴化できる。
- One Fact, Multiple Viewsを実現できる。

## FR-20 Operational Information Semantics
**Priority: MUST**

情報の意味を以下に分類できる。
- UNKNOWN
- OBSERVATION
- HYPOTHESIS
- FACT
- DECISION
- RULE

**Acceptance**
- ObservationをFactとして保存しない。
- UnknownをAI推論だけでFactに変換しない。

## FR-21 Information Reliability
**Priority: MUST**

Semantic Typeとは別軸で以下を保持する。
- UNVERIFIED
- VERIFIED
- STALE
- CONTROLLED

**Acceptance**
- updated_atとverified_atを分離する。
- CONTROLLEDは更新維持の仕組みがある状態として扱う。

## FR-22 Unknown / Information Gap
**Priority: MUST**

- Unknownを有効な状態として保持できる。
- 不明事項を自動的に埋めない。
- Unknownが現在Workへ影響する場合のみ調査対象化する。

**Acceptance**
- UNKNOWNを明示表示できる。
- 「分からないため調べる」ではなく「仕事に必要だから調べる」という判定が可能。

## FR-23 Knowledge 管理
**Priority: MUST**

- Workで得たKnowledgeを再利用可能な形で保存する。
- Source / Evidence / Verificationを追跡できる。
- WorkからKnowledgeを参照できる。

**Acceptance**
- 次回Work開始時に関連Knowledgeを表示可能。
- 未検証Knowledgeと検証済Knowledgeを区別できる。

## FR-24 Decision 管理
**Priority: MUST**

- 人が行った判断と理由を記録する。
- Work / Requirement / Rule / Authority / Exceptionと関連付けられる。

**Acceptance**
- 誰が・何を・なぜ決めたかを後から追跡できる。

## FR-25 Rule 管理
**Priority: SHOULD**

- 繰り返し判断される内容をRule Candidateとして扱える。
- Human Reviewを経てApproved Ruleに昇格できる。

**Acceptance**
- AIが自動でAuthoritative Ruleを確定しない。
- RuleのScopeとVersionを保持できる。

## FR-26 Exception 管理
**Priority: SHOULD**

- Standard Ruleでは処理できないケースをExceptionとして管理する。
- Known Exception / Unknown Exceptionを区別する。

**Acceptance**
- Source Event / Requirement / Rule / Reason / Decision / Authority / Evidence / Scope / Period / Review RequirementをTraceできる。
- UIに「標準手順では対応できない」のEscalation Pathを用意する。

## FR-27 Authority 管理
**Priority: MUST**

AuthorityはGlobal RoleだけでなくScope付きで管理する。

成熟度: A0 Observe / A1 Supervised / A2 Delegated / A3 Rule Governed / A4 Automated

**Acceptance**
- Person / Role × Service × Work Type × Action / Object × Risk × Contract等でScope設定できる。
- AIがAuthorityを付与しない。
- Authority超過操作は実行またはCommitできない。

## FR-28 Review 管理
**Priority: MUST**

最低限以下を扱える設計とする。
- APPROVED
- APPROVED_WITH_FEEDBACK
- CORRECTION_REQUIRED
- ESCALATION_REQUIRED
- PROCEDURE_ISSUE
- KNOWLEDGE_ISSUE
- AUTHORITY_REVIEW

**Acceptance**
- Review結果をWork / Change / Authority改善へTraceできる。

## FR-29 Recipient Observation
**Priority: SHOULD**

顧客・利用者への寄り添いに必要な主観的ContextをObservationとして保持する。

例: 回答速度への期待 / 説明方法の好み / 連絡チャネルの好み

**Acceptance**
- source / observed_at / context / status / expiryを保持する。
- ObservationをFactやRuleへ自動昇格しない。

## FR-30 Communication Event
**Priority: MUST**

電話等のCommunication EventをWorkとは別に保持する。

最低項目:
- provider
- channel
- direction
- external_reference
- occurred_at
- ended_at
- duration_seconds
- source_contact_point
- resolved_recipient
- resolution_state
- linked_work

**Acceptance**
- 電話着信だけでWork作成を強制しない。
- Provider固有情報はCore Fieldへ漏らしすぎない。

## FR-31 Caller Identity Resolution
**Priority: MUST**

電話番号をIdentity Hintとして利用する。

Resolution State:
- MATCHED
- AMBIGUOUS
- UNKNOWN
- CONFIRMED_DURING_WORK

**Acceptance**
- 初回UNKNOWN → Operator確認 → Contact Point紐付けができる。
- 2回目以降は同一Person候補を提示できる。
- Operatorが候補を訂正できる。
- Caller ID一致を認証として使用しない。

## FR-32 MOT/TEL Adapter
**Priority: SHOULD**

- MOT/TELをTelephony Event Sourceとして扱う。
- 外部URL / Caller Number連携からIncoming Call Workspaceを開ける構造とする。
- MOT/TEL固有仕様をCoreへ埋め込まない。

**Acceptance**
- Caller NumberからContact Point Resolutionへ進める。
- Provider変更時もCore Objectを変更しない。
- 通話時間は正式に取得可能な場合のみ保存する。

## FR-33 Incoming Call Workspace
**Priority: MUST**

電話受信時にOperatorが以下を確認できる。
- Caller候補
- Organization
- Service / Contract
- Recent Work
- Relevant Knowledge
- Observation
- Known Exception
- Unknown / Missing Context
- Authority / Restriction

**Acceptance**
- Unknown Callerでも案件開始可能。
- Identity確認後にRecipientを訂正できる。

## FR-34 AI Guided Triage
**Priority: SHOULD**

AIは以下を提案する。
- 現在分かっていること
- 分かっていないこと
- このWorkに必要なContext
- 次に確認すべき質問
- Routing候補
- 利用可能なKnowledge / Rule
- Review / Approval要否
- 安全に実行可能なNext Action

**Acceptance**
- AI出力をOperatorが確認して採用/修正できる。
- AIがFact / Rule / Authorityを直接確定しない。
- Reliability / Provenanceを無視して一つのNarrativeに混ぜない。

## FR-35 Zoho CRM連携準備
**Priority: SHOULD**

V1要件:
- 新システム側にStable Work URLを持つ。
- V1開始時はZohoへの手入力を許容する。

手入力内容例:
- 対応あり
- 日付
- Work URL
- 必要に応じて短い中立的なStatus

**Acceptance**
- 詳細WorkをZohoへ二重登録しなくても運用できる。
- Zoho IDをCore PKとして使用しない。

## FR-36 Zoho Adapter
**Priority: LATER**

将来的に以下を自動化できる設計とする。
Work / Service Evidence → Integration Policy → Zoho Adapter → CRM Note / Activity

**Acceptance**
- Idempotency Keyを持つ。
- Retry / Failure / Manual Retryを追跡できる。
- Bidirectional Full Syncを前提にしない。

## FR-37 External Reference
**Priority: MUST**

外部システムIDと内部Entityの対応を管理する。
例: MOT/TEL / Zoho / Auth Provider

**Acceptance**
- Provider IDをInternal PKに使用しない。
- External URL / External Object ID / Last Verified等を保持できる。

## FR-38 Audit
**Priority: MUST**

重要操作・判断・変更をAudit可能にする。

対象例:
- Work State変更
- Owner変更
- Authority変更
- Decision
- Rule変更
- Change Commit
- Recipient Resolution訂正
- Integration Delivery
- AI提案の採否

**Acceptance**
- Actor / Timestamp / Target / Before / After / Sourceを追跡可能。

## FR-39 Activity
**Priority: SHOULD**

運用改善のための軽量Activity Streamを保持する。

候補:
- actor
- timestamp
- work
- activity_type
- source
- duration_estimate
- confidence
- context

制約:
- 従業員監視目的にしない。
- Keyboard / Mouse / Window監視は実装しない。
- Payroll / Timesheetの正確時間として扱わない。

## FR-40 KAIZEN Candidate
**Priority: SHOULD**

運用Evidenceから改善候補を蓄積できる。

Trigger例:
- Repeat Inquiry
- Repeated Unknown
- Repeated Approval
- Manual Duplicate Update
- Waiting
- Knowledge Gap
- Rule Candidate
- Automation Candidate

**Acceptance**
- Source Work / EvidenceへTraceできる。
- 日常Work改善と大規模KAIZEN Initiativeを区別できる。

---

# 3. Sonics Service Desk Golden Flow

V1の最初の縦切り実装は以下を推奨する。

1. MOT/TELから電話着信
2. Caller Number取得
3. Contact Point正規化
4. Person / Organization候補検索
5. MATCHED / AMBIGUOUS / UNKNOWN判定
6. OperatorがCaller確認
7. Effective Service Context表示
8. AI Guided Triage
9. Requirement Evaluation
10. 必要なWork作成
11. Work Owner設定
12. 一次対応 / Remote対応
13. 解決しなければSonicsへEscalation
14. Action記録
15. 必要なFact / Knowledge更新
16. Changeがある場合Verify / Commit
17. Work Outcome確定
18. Close
19. Stable Work URL生成
20. V1では必要に応じてZohoへ「対応あり + Work URL」を手入力

---

# 4. V1で作らないもの

- 独自PBX
- SIP基盤
- IVR
- 通話録音基盤
- 独自Softphone
- Zoho完全双方向同期
- ZohoをWork管理システムとして使用
- 汎用No-code Integration Platform
- Full MDM
- 監視システム置換
- Payroll / Timesheet
- AIによるAuthority自動付与
- AIによるAuthoritative Rule自動確定
- UnknownをAI推論で自動補完
- 全ActivityのRealtime配信
- Personを全データの親とするSchema
- Generic EAVのみのRegistry
- Work Closeをトリガーにした直接Registry書換え

---

# 5. 実装上の必須Invariants

1. **Event → Workへ直接つながない**
2. **Workはなぜ作られたかをTraceできる**
3. **Active WorkにはOwnerを持たせる**
4. **WaitingでもOwnershipは消えない**
5. **Reality-changing ActionはChangeへTraceする**
6. **Work CloseとRegistry Updateを直接結合しない**
7. **ObservationはFactへ自動昇格しない**
8. **UnknownをAI推論で埋めない**
9. **AIはAuthorityを付与しない**
10. **External Provider IDをCore IDにしない**
11. **Tenant / Organization / Service / Contract / Recipientを混同しない**
12. **過去Evidence / Decision / Change / AuditをClose時に削除しない**

---

# 6. 実装開始時に確定する設計項目

- Work State Machine
- Requirement Evaluation State / Decision Model
- Change Verify / Commit Rule
- Authority Scope / Review Lifecycle
- Contract Profile Versioning
- Service Recipient polymorphism
- RLS Policy Matrix
- Stable Work Deep Link Scheme
- MOT/TELから取得可能な正式Call Lifecycle / Duration仕様

---

# 7. 開発優先順位

### Phase 1 — Core Skeleton
- Tenant / Organization / Person
- Service / Contract Profile / Recipient
- Contact Point
- Work
- Ownership
- RLS
- Audit

### Phase 2 — Service Desk Golden Flow
- Communication Event
- Caller Resolution
- Incoming Call Workspace
- Requirement Evaluation
- Work
- Action
- Knowledge
- Close

### Phase 3 — Operational Context
- Fact / Observation / Unknown
- Reliability
- Knowledge
- Decision
- Rule
- Exception
- Authority / Review

### Phase 4 — Change / Registry
- Entity / Relation
- Change
- Verify / Commit
- History

### Phase 5 — AI Guidance
- Context Assembly
- Missing Context Detection
- Triage Recommendation
- Knowledge Recommendation
- Human Confirmation

### Phase 6 — Integration
- MOT/TEL Adapter hardening
- Zoho minimal automation
- Integration Delivery / Retry / Audit

---

# 8. Product Principle

> **仕事を記録するシステムではない。**
>
> **人が正しく仕事を進め、判断し、学習し、改善するためのService Operating Platform。**

> **AI Suggests. Human Decides. System Records.**

> **Work turns Unknowns into Facts. Facts make the next Work easier.**
