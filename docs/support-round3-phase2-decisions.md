# SUPPORT Human Review Round 3 — Phase 2 Product Decisions

Status: PRODUCT DECISIONS COMPLETE — IMPLEMENTATION DESIGN PENDING  
Branch: `review/factact-join-slice`  
Started: 2026-09-12  
Product decisions completed: 2026-09-14  
Depends on: `support-round3-core-fit-gap.md`, `17-factact-ux-translation-layer.md`, `18-operator-work-context-v1.md`

## Purpose

This document records Product Owner decisions that resolve the open Product / Architecture gates identified in SUPPORT Human Review Round 3 Phase 1.

These decisions refine existing FACTACT Core concepts. They do not authorize a new Core Object unless explicitly stated. Implementation follows only after the relevant decision is accepted and translated into migration / Application / UI / test changes.

---

## Decision 1 — Current Work Target confirmation and evidence boundary

**Status: ACCEPTED — 2026-09-12**

### Decision

Current Work Target is not a copy of an existing Registry Fact. It is a time-scoped relation between the current Work and the Entity being handled in that Work.

A Known Fact may be presented as a candidate, but it must not be automatically applied as the Current Work Target. A Human must explicitly confirm that the Entity applies to the current Work before the target relation becomes effective.

For the first SUPPORT implementation, Device is the primary target Entity. The design must remain compatible with other target Entity types such as Person, Account and Application without introducing a new Target Core Object.

The minimum record for an effective Current Work Target is:

- target Entity
- confirming Actor
- confirmation time
- Source / provenance

Evidence may additionally be linked when available or required by Rule / Authority.

Human confirmation that an Entity is the current Work target is distinct from Registry-level `VERIFIED` state. User self-report or operator confirmation may be sufficient to establish the current operational target without promoting the underlying Registry Fact to `VERIFIED`.

The initial SUPPORT target choices remain:

- registered PC
- another company-issued PC
- BYOD / personally owned PC
- unidentified PC

Unidentified is a valid current fact. FACTACT must preserve the known Observation and must not fabricate a Device or fake asset tag merely to satisfy a foreign key.

A later correction of the target must preserve the earlier target confirmation and its provenance. The current effective target may change, but previous target facts are not overwritten or deleted.

A mismatch between registered Device and Current Work Target is displayed as a fact difference only. FACTACT must not infer the cause of the mismatch.

### Product consequences

- Registered `USES_PRIMARY_DEVICE` and Current Work Target are semantically different relations even when they reference the same Device.
- Registered Device is shown as context/candidate and is not preselected as the current target.
- Target confirmation and Situation Triage remain separate UX responsibilities.
- Strong verification is not a universal prerequisite for SUPPORT target confirmation; the required evidence strength may be raised by Rule / Authority for a specific service or action.
- Do not introduce a numeric confidence score merely to rank evidence. Preserve Source, Actor, Time, Context and linked Evidence instead.

### Architecture constraints

- Do not reuse the existing Person → Device `USES_PRIMARY_DEVICE` row as a Work target.
- Do not create a fake Change only to satisfy the existing Relation implementation.
- Do not introduce a new `Target` Core Object.
- The Phase 2 data design must provide lifecycle/history semantics for the Work → Entity relation and keep correction append-preserving.

### Required implementation follow-up

- decide persisted relation/table representation for Work → Entity target association
- define source/provenance vocabulary and Evidence links
- define correction / supersession semantics
- add Device candidate/search and explicit Human confirm UI
- add mismatch projection without cause inference
- add tests for no-auto-application, unknown target, correction history and provenance retention

---

## Decision 2 — BYOD identification, Rule and support eligibility

**Status: ACCEPTED — 2026-09-12**

### Decision

BYOD / personally owned status is a Fact about the current target. It is not itself a support eligibility decision.

FACTACT must keep the following concerns separate:

- ownership status
- management state
- target identity / identification state
- support eligibility
- authority to perform a specific Action

A personally owned Device may still be managed, and a company-owned Device may be unmanaged. The implementation must not collapse these dimensions into a single `BYOD=true/false` decision boundary.

When the target is personally owned but not yet identified as a registered Device, FACTACT records only the currently known Observation, such as OS, vendor, model, location or user statement. It must not create a fabricated Device or fake asset tag merely to satisfy the current Device schema.

Identification may progress over time from unknown physical device, to partially identified target, to identified Device, and then to managed / verified Device. Earlier Observation and provenance remain preserved when stronger identification becomes available.

Support eligibility is evaluated from applicable Contract / Rule / Authority and current facts. FACTACT must not automatically reject support merely because the target is BYOD.

If no applicable Rule or authoritative decision exists, support eligibility remains `UNKNOWN` / not yet determined. It must not silently become `NOT ELIGIBLE`. The unresolved evaluation should create or support a concrete Next Action for Human decision where needed.

The fact that a Work Target is confirmed does not by itself authorize all Actions against that target. Consequential Actions such as remote control, software installation, credential changes or security-sensitive configuration remain subject to the applicable Rule / Authority boundary.

### Product consequences

- UI may show `personal device`, `management state unknown`, `current target confirmed`, and `support eligibility pending` at the same time.
- BYOD is not a new Core Object or a new support-work type.
- Rule outcome should explain what is allowed, restricted or undecided rather than returning only a generic yes/no badge.
- Missing policy becomes visible uncertainty and a Human decision point rather than an inferred prohibition.
- Progressive Verification applies to target identification, while security / authority prerequisites for specific Actions may still block execution.

### Architecture constraints

- Do not invent `BYODDevice` or a parallel device registry.
- Do not fabricate `assetTag` or Device identity for unidentified BYOD.
- Do not encode support eligibility directly into the Work target relation.
- Preserve Observation provenance when a later Device identity is established.
- Apply Contract / Rule / Authority checks at the evaluation / Action boundary, not as an automatic consequence of ownership status.

### Required implementation follow-up

- define how unidentified target Observation is linked to the Work before a Device FK exists
- define ownership and management-state Fact representation without creating a new Core Object
- define Rule evaluation projection for allowed / restricted / unknown support actions
- add UI for personally owned / unidentified targets without forcing registry creation
- add tests proving BYOD does not imply automatic rejection and missing Rule remains Unknown

---

## Decision 3 — Work Close conditions

**Status: ACCEPTED — 2026-09-12**

### Decision

**Work Closeは、現在の対話やActionの終了ではなく、Workが担うOutcomeに対する継続責任の終了を意味する。**

対応記録とWork Closeは別操作とする。未解決のNext Action、Waiting、必須Verification、未完の責任があるWorkはCloseしない。

CloseはResolvedを意味しない。対象外、撤回、正式な責任移管など、未解決でも責任が終了したことをHumanが根拠付きで判断できればClose可能とする。これは残った責任を黙って捨てる例外ではない。継続義務が終了・移管した根拠を明示し、未完の責任を残さない。

Close時には以下を保持する:

- Outcome
- 終了理由
- 決定したActor
- 決定時刻
- 必要なDecision / Rule provenance

時間経過や返信なしだけを理由に自動Closeしない。Ruleに基づく場合でも根拠を明示する。別Workの生成は元Workの自動Closeを意味しない。FACTACTはClose条件の充足を検査するが、Humanの明示決定なしにWorkをCloseしない。

### Product consequences

- 対応記録を保存してもWorkは継続できる。Actionの完了とWorkの責任終了を別に表示する。
- 解決したか、責任が終了したかを別々に説明する。Closeから技術的な解決Factを推論しない。
- 単なる別Work作成や担当者変更は、正式な責任移管の成立を自動的に証明しない。
- Ruleによる評価・期限経過の検出はHumanの判断を支援する。Close自体を自動実行しない。

### Architecture constraints

- 既存Work / Outcome / Decision / Rule / Evidence / Authority / Auditで表現し、新Core Objectを追加しない。
- CloseはRegistry変更や必須Verificationの省略を許可しない。Change / Verify / Commit境界を保持する。
- 元の対応・根拠・所有履歴を保持し、Close理由や移管根拠で過去の記録を上書きしない。
- Decision 4–7の日時・Team・Escalation・Knowledge承認仕様は、このDecisionから推測して確定しない。

### Required implementation follow-up — not implemented yet

- 対応記録と明示Close commandを分離し、Close時点の未完義務とAuthorityを検査する。
- Outcome、終了理由、Actor、Time、Decision / Ruleの参照と必要なsnapshotの保存形を設計する。
- 同時Action追加・Waiting変更・Closeの競合でも、未完義務を見落とさない整合性を設計する。
- 未完Next Action / Waiting / 必須VerificationがあるCloseの拒否、根拠付きの未解決Close、時間経過・返信なし・別Work作成で自動Closeしないこと、Human決定・出典・retry安全性をテストする。

---

## Decision 4 — Due / Follow-up semantics

**Status: ACCEPTED — 2026-09-14**

### Decision

DueとFollow-upは異なる時間概念として扱う。

**Due**は、Workまたは責任あるActionについて、約束・Rule・業務上の必要性等から「いつまでに満たすべきか」を示す時間境界である。

**Follow-up**は、継続中のWorkについてHumanが次に確認・判断・再開すべき時点であり、相手方の期限を意味しない。Follow-upは、Waiting中も継続するこちら側の責任を時間軸で管理するために使う。

WaitingでもOwnerと継続責任は維持される。Waiting時にFollow-upが`UNKNOWN` / not setであることは許容するが、その状態はNeeds-follow-up Projectionの根拠になり得る。

Due、Follow-up、Verification timingを同一概念として扱わない。Work全体のDueと、責任あるActionのDueが同時に存在し得るBusiness semanticsを認める。ただし具体的な保存形はPhase 2 Implementation Designで既存CoreとのFitを確認し、新Core Objectを前提としない。

Overdue / Needs-follow-up / Stale等を新しいWork StatusまたはCore Objectとして保存しない。現在のFactから説明可能なView / Projectionとして導出する。

Due / Follow-upの根拠が存在しない場合、FACTACTは期限を捏造しない。SLA、Contract、Rule、Human Decision、顧客との約束等のSource / provenanceを保持可能にする。

DueまたはFollow-upを超過しても、自動Close、自動Transfer、自動Escalationその他のReality Changeを行わない。FACTACTは超過や要確認状態を提示し、Human Decisionを支援する。

Due / Follow-upの変更は、Actor、Time、変更前後の値、および必要なSource / provenanceを追跡可能にする。Human-readable HistoryとTechnical Auditの階層は既存UX原則に従う。

これらのsemanticsはSUPPORT専用ではなく、Assessment後のACT、Vendor Work、Management Decision後の実行、Change Verification等でも再利用可能な共通意味として扱う。

### Product consequences

- `Due`と`Follow-up`を単一の「期限」フィールドとしてUX上も意味上も混同しない。
- Waitingは責任停止ではなく、Owner / Next Action / Follow-upを使って継続責任を見える化する。
- Follow-up未設定のWaitingを禁止して事実を捏造するのではなく、必要に応じてNeeds-follow-up Viewへ出す。
- Due超過とFollow-up到来を区別して表示する。どちらもWork lifecycle statusそのものではない。
- Follow-up到来だけで催促・Close・Transfer・Escalation等を自動実行しない。
- Verification date / targetはFollow-upとは別責任・別意味として扱う。

### Architecture constraints

- `Overdue`, `NeedsFollowUp`, `StaleWork`, `FollowUp`等を新Core Objectとして追加しない。
- Needs-follow-upはOpen、Owner、Next Action、Waiting、Due、Follow-up等の現在Factから導出するProjectionとする。
- 時刻の経過から導出できる状態をHumanに再入力させない。
- Due / Follow-upのSourceと変更履歴を失わない。
- Work-level DueとAction/responsibility-level Dueのpersisted representationはImplementation Designで既存Work / Action / Relation / Decision / Rule等とのFitを確認して決める。

### Required implementation follow-up — not implemented yet

- Work-level Due / Follow-upとAction/responsibility-level Dueの保存境界を設計する。
- Waiting / Owner / Next Action / Due / Follow-upのApplication invariantと更新commandを設計する。
- Needs-follow-up / Overdue projectionの説明可能な導出条件を定義する。
- SLA / Contract / Rule / Human Decision / customer commitment等のprovenance参照方法を設計する。
- Follow-up変更履歴とHuman-readable History / Technical Auditの表示境界を設計する。
- Due超過、Follow-up到来、Waiting + no follow-up、Dueなし、Ruleなし、変更履歴、no-auto-actionをテストする。

---

## Decision 5 — Team boundary

**Status: ACCEPTED — 2026-09-14**

### Decision

Active Workの継続責任は、明示されたHuman Ownerが持つ。TeamまたはOperational groupはOwnerの代替ではない。

Teamは、Workへの参照・協働・Action・引継ぎ等に関係するOperational / Authority boundaryとして扱う。ただしTeam membershipだけで特定ActionのAuthorityを与えない。具体的Actionの可否は、引き続きRule / Authority / Context / Current Factsに基づいて評価する。

Authorized Humanは、他者がOwnerであるWorkにActionできる。そのActionだけを理由にOwnerを変更しない。**Action Actor != Work Owner**を維持する。

Ownerの正式なTransferは明示操作として記録し、少なくとも以下を保持する。

- previous Owner
- new Owner
- transferを実行・承認したActor
- Time
- 必要なreason / Source / provenance

Owner履歴は上書きして消さない。

Teamが設定されていても、Active WorkのOwner不在を通常状態として扱わない。Owner不在は責任上のGapとしてView / Projectionで検出可能にする。Work生成直後等に技術的な遷移状態が必要かはImplementation Designで扱い、Product semanticsとしての明示Owner原則を弱めない。

My Work / Team Work / Needs-follow-up等は、別Workや別Core Objectではなく、同じWorkに対するView / Projectionとする。One Fact, Multiple Viewsを維持する。

TeamをHR上の部署と同一概念に固定しない。Service Desk、Security Operations、Infrastructure、IT Management等のBusiness上のOperational groupとHR組織が一致する場合も一致しない場合もある。既存Organization / Person / Relation / Authority / Service ContextとのMappingおよび保存形はImplementation Designで確認する。

一つのWorkに複数のTeam / Operational groupが関与し得る。ただし複数groupの関与によってHuman Ownerの継続責任を曖昧にしてはならない。

Team間の協力、Team変更、他TeamによるAction、Owner Transferを自動的にEscalationとはみなさない。Escalation semanticsはDecision 6で別途定義する。

### Product consequences

- `Team = Owner`または「Teamの誰かが対応する」という責任モデルにしない。
- Team ViewからAuthorized Humanが他OwnerのWorkを支援できるが、支援ActionでOwnerは自動変更されない。
- 正式な責任移管と単なるHelp / CollaborationをUX上も区別する。
- Team WorkはWork種別ではなくProjectionであり、同一WorkがMy / Team / Needs-follow-up等の複数Viewへ同時に現れ得る。
- 外部VendorがActionを実施する場合でも、企業側のWork Ownerが自動的に消えるわけではない。

### Architecture constraints

- `TeamWork`等の新Core Objectを追加しない。
- TeamをHR department専用概念として固定しない。
- Team membershipから高権限ActionのAuthorityを自動推論しない。
- Owner Transferはappend-preservingな履歴とprovenanceを保持する。
- 複数Team / Operational groupの具体的なpersisted representationは、既存Organization / Person / Relation / Authority / Service ContextとのFitをImplementation Designで確認して決める。
- Team scope / collaboration relationとEscalation recordを同一概念にしない。

### Required implementation follow-up — not implemented yet

- Team / Operational groupを既存Coreで表現するMappingとtenant / service boundaryを設計する。
- My / Team Viewのprojection条件とRLS / Application authorizationの責任分界を設計する。
- 他Owner Workへのauthorized ActionとOwner Transfer commandを分離する。
- Owner Transferの履歴、reason / provenance、競合時の整合性を設計する。
- 複数Team関与時の表示と責任の見せ方を設計する。
- Owner不在、他OwnerへのAction、formal transfer、unauthorized action、複数Team、Team membershipだけではprivileged Action不可、One Fact Multiple Viewsをテストする。

---

## Decision 6 — Escalation recording contract

**Status: ACCEPTED — 2026-09-14**

### Decision

Escalationとは、通常のWork進行だけでは必要なDecision、Authority、ExpertiseまたはManagement Attentionを得られないため、それを明示的に要求したというFactである。

EscalationはWaiting、Collaboration、Team変更、Owner Transfer、Due超過、Follow-up超過、Related Work作成とは別概念とする。誰に渡したかだけではEscalationを意味せず、通常境界を越えた判断・権限・専門性・Attentionを明示的に要求したかを意味の中心とする。

EscalationしてもWork Ownerの継続責任は自動的に移転しない。責任移管が必要な場合はDecision 5のOwner Transferを別途明示する。

Escalationでは、少なくとも以下を追跡可能にする。

- reason
- requested Decision / Authority / Expertise / Management Attention
- escalation target
- Actor
- Time
- Current Owner
- 必要なEvidence / Context / Source / provenance

Escalation targetをHumanだけに固定しない。Person、Operational group、Authority boundary、Management、external party等をBusiness上表現可能にする。ただし新しい`EscalationTarget` Core Objectを前提とせず、既存CoreとのMappingをImplementation Designで確認する。

固定的なL1 → L2 → L3 workflowをFACTACT Coreに持たせない。Serviceや企業ごとの運用差を、Coreの固定階層へ変換しない。

Escalationから得られたDecision、Rule clarification、Authority grant / denial、Evidence、Recommendation、Action等を既存Core conceptsとして関連付け、元のEscalation要求とのprovenanceを保持する。`Escalation Result`という新Core Objectを前提としない。

Escalationの完了・回答取得はWork Closeを意味しない。Escalationの結果として後続Action / Change / Verificationが残る場合、Workの継続責任はDecision 3に従って維持する。

Due / Follow-up超過だけを理由にEscalationを自動実行しない。RuleにEscalation条件が存在する場合も根拠を明示し、現PhaseではHumanの明示操作を基本とする。将来Automationを許可する場合はAuthority / Rule境界を別途設計する。

`ESCALATED`をWork lifecycle Statusまたは新Core Objectとして保存しない。「Escalation中」等の表示が必要な場合は、現在のFact / ContextからView / Projectionとして導出する。

このsemanticsはSUPPORTだけでなく、Assessment、KAIZEN ACT、Vendor Work、Security / Authority Decision、Management Connectionにも利用可能な共通意味とする。

### Product consequences

- EscalationとHelp / Collaboration / Transfer / WaitingをUX上も混同しない。
- 「上に投げた」だけでOwner責任が消えない。
- Escalation時には「何を求めているか」をHumanが理解できる形で表示する。
- Escalation先の回答を、そのままWork resolvedやCloseと推論しない。
- Operational ContextからManagement Decisionが必要になった場合にも同じsemanticsを再利用できる。

### Architecture constraints

- `Escalation`, `EscalationTarget`, `EscalationResult`を新Core Objectとして追加することをこのDecisionでは認めない。
- Escalationのpersisted representationは既存Decision / Evidence / Relation / Activity / Authority / Work等とのFitをImplementation Designで検証する。
- Escalation provenanceと結果側のDecision / Rule / Authority / Evidence / Actionの接続を失わない。
- Team / Owner / Escalationの意味を分離し、Team変更やOwner TransferからEscalationを自動推論しない。
- Due / Follow-up / Escalationをそれぞれ独立したsemanticsとして維持する。

### Required implementation follow-up — not implemented yet

- Escalation要求を既存Coreで永続化する最小表現を設計する。
- escalation targetのPerson / group / Authority / external party mappingを設計する。
- requested Decision / Authority / Expertise / Attentionの表現境界を設計する。
- Escalation要求と結果のDecision / Rule / Evidence / Actionとのprovenance relationを設計する。
- Human-readable HistoryとTechnical Auditでの表示境界を設計する。
- collaboration only、formal transfer、waiting、due overdue、explicit escalation、escalation result without Work Close、no-auto-escalationをテストする。

---

## Decision 7 — Knowledge approval authority

**Status: ACCEPTED — 2026-09-14**

### Decision

Workから得られた情報は、そのままKnowledgeとして扱わない。Evidence、Observation、Action、Decision等としてWork Recordに保持し、再利用価値がある内容をHuman Reviewの対象としてKnowledge Candidateにする。

**Work Record != Knowledge. Knowledge Candidate != Approved Knowledge. Approved Knowledge != Rule.**

Knowledge Candidateは、少なくとも以下を追跡可能にする。

- source Work
- source Evidence / Observation / Action / Decision等
- candidate content
- proposed scope
- proposing ActorまたはAI provenance
- Time

Candidateの出典は必ず追跡可能にし、どのWork / Evidence / Decision等から生まれたかを失わない。

AIはKnowledge Candidateの提案、要約、類似Knowledgeとの比較、scope候補提示、古いKnowledgeの再確認提案、contradicting Evidenceの検出、更新候補提示等を支援できる。ただしAI自身がKnowledgeをApprove / Publishしたり、適用scopeを拡大したり、Ruleへ昇格したりしてはならない。

Knowledgeの承認は、そのKnowledgeのscopeに対してAuthorityを持つHumanが行う。Team membershipだけをKnowledge approval Authorityとはみなさない。適用範囲が広くなるほど、そのscopeに対応するAuthority評価を必要とする。

承認時には、source provenance、適用scope、および必要なreliability / review contextを追跡可能にする。FACTACTはHuman確認なしにKnowledge scopeを一般化しない。

Customer / Tenant固有Knowledgeをcross-tenant generic Knowledgeへ自動昇格しない。tenant boundaryを越える再利用には、明示的なHuman Review / Authorityと情報分離が必要であり、必要に応じて顧客固有情報を除去した別Candidateとして扱う。

Approved KnowledgeとRuleは別概念とする。KnowledgeからRuleへの昇格には、Rule scopeに対応する別のHuman Decision / Authorityを必要とする。AIまたはKnowledge approvalだけを根拠にRuleを自動生成・自動有効化しない。

新しいEvidenceによってKnowledgeが古くなった、矛盾した、またはより良いKnowledgeに置き換わった場合でも、過去Knowledgeを上書き・削除してprovenanceを失わない。review / supersession historyを追跡可能にする。具体的なstatus enumはImplementation Designで既存Knowledge modelとのFitを確認して決める。

このsemanticsはSUPPORTのFAQ / 手順だけでなく、Assessment、KAIZEN ACT、Management Decision、Change Verificationから得られるLearningにも適用する。Decision → Action → Change → Verificationで得られた経験を、Human Reviewを通じて組織Knowledgeへ接続できるようにする。

### Product consequences

- SUPPORT対応記録を保存しただけでKnowledge Baseへ自動公開しない。
- HumanはCandidateのsource、適用scope、根拠を確認してApproveできる。
- AI提案であることとHuman承認済みであることをUX上区別する。
- Customer-specific Knowledgeとgeneric Knowledgeを混同しない。
- Knowledge承認とRule制定を同じボタン・同じAuthorityとして扱わない。
- 古いKnowledgeを単純削除せず、現在有効なKnowledgeと過去の根拠を追跡可能にする。

### Architecture constraints

- `Knowledge Type`等の新Core ObjectをこのDecisionから追加しない。
- Candidate / Approved / superseded等のpersisted representationは既存Knowledge / Evidence / Review / Decision / Authority / provenance modelとのFitをImplementation Designで検証する。
- Knowledge approval AuthorityはApplication authorizationとRLS / tenant boundaryの双方で保護する。
- cross-tenant再利用で元TenantのEvidenceや機密情報を漏洩させない。
- AIはauthoritative Knowledge stateを直接変更せず、Domain APIとHuman Decision / Authority境界を通す。
- KnowledgeからRuleへの昇格は別Decision / Authorityとして扱い、Knowledge approvalから自動推論しない。

### Required implementation follow-up — not implemented yet

- Knowledge Candidateの最小persisted representationとsource provenanceを設計する。
- Candidate → Human Review → Approved KnowledgeのApplication command / invariantを設計する。
- approval Authorityとscope評価を設計する。
- tenant / customer-specific / generic scope境界とcross-tenant sanitization / review flowを設計する。
- supersession / re-review / contradictionの履歴モデルを設計する。
- AI proposal provenanceとHuman approval historyを分離して表示する。
- Knowledge → Ruleの別Decision / Authority boundaryを設計する。
- no-auto-publish、unauthorized approval拒否、scope escalation、cross-tenant isolation、supersession history、AI cannot approve、Knowledge approval does not create Ruleをテストする。

This acceptance records Product semantics only. Phase 2 migration / Application / API / UI implementation remains unstarted. Decisions 1–7 are now complete; the next step is cross-decision Phase 2 Implementation Design and architecture fit validation before implementation approval.

---

## Product Owner decision gate status

**Decisions 1–7: ALL ACCEPTED.**

Phase 1 Product Owner decision gates are closed. No migration / Application / API / UI implementation is authorized by this document alone.

Next gate:

**Phase 2 Implementation Design → Core Fit Validation → Implementation Approval**
