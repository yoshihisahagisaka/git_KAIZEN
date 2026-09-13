# IT経営KAIZEN Customer Data / AI / Consent / Continuity Business Policy v1

Status: **CANONICAL — BUSINESS POLICY / DECISION**  
Date: 2026-09-13

Scope: 無料IT経営診断を起点とするIT経営KAIZENのCustomer Data / AI / Transcript / Retention / Deletion / Backup / Consent方針。

This document resolves Business Decisions BD-01 through BD-05 for Development implementation and Production Readiness re-evaluation.

> **FACT FIRST.**
>
> **分からないことを、分かったことにしない。**
>
> **AI Suggests. Human Decides. System Records.**

---

# 1. Core Business Principle

Customer Dataは「将来使えるかもしれないから全部残す」のではなく、サービス提供・説明責任・継続KAIZENに必要な目的に限定して扱う。

基本構造：

> **Rawは短く、Decision Evidenceは長く。**

IT経営KAIZENはFUTURE → FACT → DECISION → ACT → CHANGE → NEW FACTを継続的に確認するため、Human Approved Decision / Report / Handoff / Audit等の説明責任データと、一時的なRaw conversation / Transcript / AI I/Oを同一の保持ルールにしない。

---

# 2. BD-03 — AI Input / Output and Transcript Policy

Status: **ACCEPTED WITH BUSINESS SPECIFICATION**

## Decision

AIはIT経営KAIZENの診断・整理・分析を支援するために利用する。

AIへ送信する情報は、そのAI Processの目的達成に必要なContextへ限定する。

AI OutputはAI Suggestion / Proposalであり、それ自体をauthoritative FACT、Customer Decision、Human Approvalとして扱わない。

Human Review / Correction / Approvalを維持する。

## Transcript / Recording

- 録音・Transcriptは無料診断の標準取得項目にしない。
- Web無料診断では原則としてTranscriptを必要としない。
- 営業面談、Management Feedback、Assessment等でTranscript/録音が必要な場合のみ取得する。
- Transcript/録音を取得する場合は、通常のAI利用説明とは分離し、事前に顧客へ明示して同意を得る。
- Transcript全文が不要なAI Processでは、必要なSource / extracted Contextへ縮小する。

## Customer AI Notice

無料診断申込前に、少なくとも以下を顧客へ明示する。

- 回答内容の整理・分析支援にAIを利用する場合があること。
- AIの出力のみで診断結果や経営判断を確定しないこと。
- 必要に応じHumanがReview / Correction / Approvalを行うこと。

AI利用は無料診断の標準提供条件として明示する。

## Human-only

- 無料診断のHuman-only版は標準提供しない。
- AI利用条件に同意できない場合、標準Web無料診断の対象外とし、必要に応じ個別相談とする。
- 有料Assessment等におけるHuman-only対応可否は案件ごとに判断する。

## AI I/O Retention

Raw AI input/outputは長期Decision Recordとして扱わない。

具体的保持期間はBD-01に従う。

Human Approved Result / Report / Handoff / Decision / AuditはRaw AI I/Oとは分離する。

## Customer Promise

> AIは診断・分析を支援するために利用しますが、AIの出力のみで診断結果や経営判断を確定しません。

Legal wordingは別途必要なReviewを経て確定する。このBusiness Policy自体を法的十分性の判断とはしない。

---

# 3. BD-01 — Raw Diagnosis Data Retention

Status: **ACCEPTED WITH BUSINESS SPECIFICATION**

## Decision

### A. Active Case

Case進行中は、サービス提供・Human Review・Correction・Evidence確認に必要なRaw dataを保持する。

### B. General Raw Diagnosis Data

SurveyResponse、SourceRecord、Interview Statement、Operator Note等のRaw diagnosis dataは、原則：

> **Case Close後 1年間**

保持する。

1年経過後、継続目的・法令・契約・紛争対応等の例外がなければ削除または適切に匿名化する。

### C. Transcript / Recording

Transcript / Recordingは高リスクRaw dataとして別扱いとする。

> **取得目的完了後 90日以内を原則保持上限とする。**

より早く不要になった場合は、90日を待たず削除できる。

Human Approved Evidenceとして必要な内容は、必要最小限のSource / Approved Recordへ変換し、Transcript全文をDecision Evidenceの代替として長期保存しない。

### D. Raw AI Input / Output

Raw AI input/outputは品質確認・障害調査・Human Review等に必要な短期データとして扱う。

> **Case Close後 90日以内を原則保持上限とする。**

Provider側保持については利用Providerの契約・設定・Privacy条件をDevelopment/Securityが確認し、Businessのデータ最小化方針に反する設定を採用しない。

### E. Human Approved Decision Evidence

Approved Report、Handoff、Human Decision、必要なEvidence reference、Audit等はRaw dataと分離し、原則：

> **5年間**

保持する。

目的は、過去のDecision、ACT、CHANGE、NEW FACTを継続的に検証し、顧客への説明責任を維持すること。

## Exceptions

以下は別途必要期間を適用できる。
- 法令上の保持義務
- 契約上の保持義務
- 顧客との個別合意
- 紛争 / Claim / Security Incident対応
- Legal Hold

例外適用は理由・承認者・終了条件を記録する。

---

# 4. BD-02 — Customer Deletion / Anonymization

Status: **ACCEPTED WITH BUSINESS SPECIFICATION**

## Decision

顧客からデータ削除要求を受け付ける。

「すべて即時物理削除」または「何も削除しない」の二択にはしない。

データ分類、契約、説明責任、Security、Backup lifecycleに基づき削除・匿名化・制限保存を判断する。

## Data Handling

### Raw Customer Data
原則として削除要求の対象とする。

### Derived Diagnosis Data
個人・顧客を識別する必要がなく、事業改善・統計等に利用可能な場合は適切な匿名化を選択できる。

匿名化後に顧客識別へ容易に戻せる状態を「匿名化済み」と扱わない。

### Approved Report / Handoff / Decision Evidence
顧客成果物、契約、判断履歴、説明責任との整合を確認する。

保持が必要な場合は、必要最小限に限定しアクセス制限した状態で保持できる。

### Audit / Security Records
Security、Access、Deletion Audit等の説明責任に必要な最小限を制限保存できる。

### Backup
Active systemからの削除後も、Backupからの即時個別物理削除は標準約束としない。

Backup内データはBackup lifecycleに従って期限到来時に消去する。

Restoreを実施した場合、既に削除対象となったデータがActive systemへ恒久的に復活しない運用・Technical controlを設計する。

## Human Control

削除要求はHuman承認を必須とする。

最低限記録する：
- Request received
- Scope identification
- Decision
- Approval
- Execution
- Completion
- Exceptions / restricted retention

## Responsibility

Business ownerが削除可否のBusiness判断責任を持ち、Development/Operationsが承認済みDecisionを実行する。

Legal/Security判断が必要なCaseは該当責任者へEscalateする。

---

# 5. BD-04 — Backup Retention / RPO / RTO

Status: **ACCEPTED WITH BUSINESS SPECIFICATION**

## Decision — Controlled Pilot

Controlled Customer PilotではRPO/RTOを外部SLAとして保証しない。

まず内部運用目標として以下を設定する。

> **Internal RPO target: 24 hours**

> **Internal RTO target: 24 hours**

> **Backup retention target: 30 days**

これらは設定値だけでPASSとせず、実Cloud環境でBackup / PITR / Restore rehearsalを実施しEvidenceで確認する。

## Public / General Availability

一般提供前にPilotの実績・System構成・Customer impactをもとに再評価する。

外部SLA化は別Business Decisionとする。

現時点で「24時間以内の復旧を顧客へ保証する」等のSLA表現をしてはならない。

## Incident Customer Notification

顧客データ・診断利用に実質的影響がある障害は、影響範囲・復旧見込み・必要な顧客対応を確認したうえで適切に通知する。

具体的通知時間を一律SLAとして現時点では約束しない。

Security / Privacy Incidentは別途Incident Policy / 法令 / 契約に従う。

---

# 6. BD-05 — Customer Consent / Expectation

Status: **ACCEPTED — NEW BUSINESS DECISION**

## Decision

無料IT経営診断申込前に、顧客がサービスの性質とデータ利用を理解できる情報を提示する。

最低限以下を明示する。

1. 無料IT経営診断で何をするか
2. 無料診断は可能性・次のDecisionを整理する入口であり、Evidenceで現在地を完全確定するAssessmentではないこと
3. 取得情報の利用目的
4. AIを診断・分析支援に利用する場合があること
5. AIのみで診断結果や経営判断を確定しないこと
6. Follow-up連絡を行う場合があること
7. Privacy / Data Handlingへの案内
8. 録音 / Transcriptは標準取得しないこと
9. 録音 / Transcriptを取得する場合は別途事前に説明し同意を得ること

## Consent Boundary

### Standard Diagnosis
AI利用を含む標準診断条件は、申込前に明示し、顧客が確認したうえで申込できるUXとする。

具体的な法的同意方式（checkbox wording、利用規約同意、Privacy Policy構造等）はLegal/Privacy Review対象とする。

### Transcript / Recording
Transcript / Recordingは通常の診断申込に包含した黙示的同意で取得しない。

必要な場合は別途明示し、取得前に同意を得る。

## Follow-up

診断結果の説明、Correction、Management Feedback、Assessment等の次のDecisionに必要なFollow-upを行う場合があることを申込前に明示する。

Marketing communicationを無制限に許諾したものとは扱わない。

## Legal Boundary

本書はBusiness Policyを決定するものであり、Privacy Policy、利用規約、個人情報保護法その他の法的十分性をBusiness Laneだけで認定しない。

顧客向けLegal wordingは必要な専門Reviewを経て確定する。

---

# 7. Development Implementation Contract

Development Laneは本Decisionを実装可能なTechnical Policyへ変換する。

Required:

1. Retention lifecycle / deletion job / anonymization flow
2. Transcript and Raw AI I/O separate retention control
3. Approved Report / Handoff / Decision / Auditの5-year retention classification
4. Customer deletion request workflow and Human approval/audit
5. Backup lifecycleとdeletion/restore整合
6. AI Context minimization
7. AI output provenance and Human Approval preservation
8. Customer-facing notice / consent UX hook
9. Transcript explicit-consent flow when feature is used
10. RPO/RTO/Backup targetsをrehearsal criteriaへ変換

Development LaneはBusiness数値・Consent方式・外部SLAを独自変更しない。

Technical impossibility / material cost / provider constraintがある場合は、実装で回避せずBusiness LaneへFACTとして返す。

---

# 8. Production Readiness Impact

BD-01〜BD-05はBusiness Decisionとして解消した。

ただし、これはProduction / External Pilot GOを意味しない。

Development Laneは以下を含む残GateをEvidence付きで再評価する。

- actual AI provider
- actual Google OAuth
- Cloud Run Worker
- Secret / IAM
- Monitoring
- Cloud SQL backup / restore
- staging E2E
- privacy/legal implementation readiness
- customer notice / consent implementation
- retention / deletion implementation

> **Business Decision completed ≠ Production Ready.**

---

# 9. Effective Timing

本Policyは2026-09-13以降の無料IT経営診断Controlled Pilot準備に適用する。

Public Launch前、および実Pilotで重大なEvidenceが得られた場合は再Reviewする。

---

# 10. Decision Summary

| ID | Decision |
|---|---|
| BD-01 | General Raw: Case Close +1 year / Transcript: purpose completion +90 days max / Raw AI I/O: Case Close +90 days max / Approved Decision Evidence: 5 years |
| BD-02 | Customer deletion request accepted; classified deletion/anonymization/restricted retention; Human approval + Audit; Backup expires by lifecycle |
| BD-03 | Minimum-purpose AI context; AI is Suggestion; Transcript not standard; explicit consent when recorded; no standard Human-only free diagnosis |
| BD-04 | Pilot internal RPO 24h / RTO 24h / Backup 30d; no external SLA yet; restore Evidence required |
| BD-05 | Pre-application service/data/AI/follow-up/privacy explanation; separate explicit consent for Transcript/Recording; Legal wording requires separate review |

Core:

> **Rawは短く、Decision Evidenceは長く。**

> **AIは支援する。決めるのはHuman。**

> **顧客が知らない状態で、録音・Transcript取得をしない。**

> **Business Decision completed ≠ Production Ready.**
