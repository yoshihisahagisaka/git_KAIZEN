# 無料IT経営診断 — Business Launch Gate × Current System Fit/Gap v1

Status: **DEVELOPMENT VALIDATION / CONTROLLED PILOT CLOSURE HANDOFF**  
Date: 2026-09-13
Branch: `dev/controlled-pilot-closure`

## 1. Purpose

`docs/65-free-it-management-diagnosis-business-launch-gate-v1.md` を最新Business Launch Gateとして、現行Canonicalおよび `atlib-sales-tools/main` に対するFit/Gapを記録する。

原則：
- FACT FIRST.
- 分からないことを、分かったことにしない。
- AI Suggests. Human Decides. System Records.
- doc65に合わせるためだけにCore Object / Architectureを追加しない。
- UNKNOWNは推測で埋めない。
- Business Decision RequiredをDevelopment LaneでDECISIONへ昇格しない。

## 2. Executive conclusion

現時点で **Architecture再設計は不要**。

Business Launch Gateと現行ArchitectureにCriticalな思想衝突は確認されない。

Controlled Customer Pilot判定は現時点 **NO-GO**。

理由はArchitecture Gapではなく、以下が未完了のため：
1. Business / Legal Decision Required。
2. Customer Consent / Expectationの確定。
3. Business Feedback translationの小規模Gap。
4. Pilot Evidence Captureの小規模Gap。
5. 実環境External Validationの未完了。

過去のNO-GOをそのまま継承した判定ではなく、現行コード・現行Business Gate・確認済みEvidenceからの再判定である。

## 3. Business Launch Gate × Current System Fit/Gap Matrix

| # | Requirement | Result | Current System / Gap |
|---|---|---|---|
| 1 | FUTURE first-class context | FIT | Futureは独立・versioned context。Survey stated / Interview reconfirmedを保持しReport/Handoffへ引き継ぐ。 |
| 2 | FACT / UNKNOWN / AI inference separation | PARTIAL FIT | UNKNOWN/HYPOTHESIS/OBSERVATION等は厳格に分離。無料診断ではEvidence-confirmed FACTを形成しないため、Business表現のFACTは「現在分かっていること」としてtranslationが必要。 |
| 3 | Human Review / Correction / Approval | FIT | AI候補はauthorityを持たず、Human approve/edit/convert UNKNOWN/reject/manual/supersede。Report approvalもHuman command。 |
| 4 | 5-block Feedback | PARTIAL FIT | 現行5 sectionsは存在。Business表現 `FUTURE / FACT・UNKNOWN / GAP / WHY / NEXT DECISION` へのtranslationを小規模修正として扱う。 |
| 5 | Assessment handoff without re-entry | FIT | deterministic, versioned, hashed Handoff snapshotが存在。Human Approved contextを再入力せず引き継げる。 |
| 6 | Provenance | FIT | SurveyResponse/SourceRecord、AIExecution/AIProposal、HumanReview、InsightSource、Auditを分離。 |
| 7 | atLIB Actor not auto-selected | FIT | AIがatLIB executionを決定しない。Assessment lifecycle / HandoffはHuman command。 |
| 8 | Pilot evidence capture | PARTIAL FIT | Feedback raw SourceRecord、Human correction、Auditは存在。B10のpilot learning項目を体系的に取得するread/write modelは不足。 |
| 9 | Privacy / Consent | GAP / BUSINESS-LEGAL DECISION | docs/33 BD-01〜04に加え、doc65 B8のCustomer Consent / ExpectationをBusiness/Legalで確定する必要。 |
| 10 | Latest readiness | NO-GO | Critical Business/Privacy GateとExternal Technical Evidenceが未完了。 |

## 4. FACT semantics decision boundary

Business Gateの `FACT / UNKNOWN` を理由に、無料診断へ新規FACT Core Objectを追加しない。

現行無料診断のHuman Review semantic types：
- OBSERVATION
- UNKNOWN
- HYPOTHESIS
- GAP_CANDIDATE
- ROOT_CAUSE_HYPOTHESIS
- KAIZEN_DIRECTION
- EVIDENCE_CANDIDATE

`FACT / CONFIRMED_FACT / DECISION` はAI/Human Approved Insightのsemantic typeにしない。

これは無料診断がEvidenceで現在地を確定するAssessmentではないというBusiness boundaryと整合する。

Business-facing Feedbackでは `OBSERVATION` 等を必要に応じて「現在分かっていること」と表示できるが、内部authorityをFACTへ昇格しない。

## 5. Five-block Feedback translation

### Current
1. FUTURE
2. CURRENT_AND_UNKNOWN
3. GAP
4. ROOT_CAUSE_AND_KAIZEN
5. NEXT_CONFIRMATION

### Business Launch Gate
1. FUTURE
2. FACT / UNKNOWN
3. GAP
4. WHY
5. NEXT DECISION

### Development interpretation
Architecture changeではなくTranslation Layerの変更として扱う。

Target behavior:
- FUTURE：現行Futureを維持。
- FACT / UNKNOWN：内部semantic authorityを変えず、「現在分かっていること / 現時点で分からないこと」として明示。
- GAP：GAP_CANDIDATEのcandidate性を維持。
- WHY：ROOT_CAUSE_HYPOTHESIS等を仮説として表示。断定しない。
- NEXT DECISION：AssessmentConfirmationItem、Evidence確認、Humanが判断すべき次アクションを経営者向けにtranslation。AIがDecisionを確定しない。

`KAIZEN_DIRECTION` はWHYと混同せず、必要な場合も候補として扱う。

## 6. Pilot Evidence Capture gap

既存のSourceRecord / HumanReview / Auditを再利用する。新しいCore Objectは原則追加しない。

Controlled Pilotで最低限取得するEvidence：
- customer segment / account
- entry trigger
- FUTURE theme
- completion / abandonment
- confusing question
- UNKNOWN pattern
- operator correction point
- AI misclassification
- management feedback reaction
- Assessment need understood?
- next action
- customer feedback

Implementationでは既存Entityへのadditive metadata、既存SourceRecord、Audit、read model等で満たせるかを先に検証する。新Objectは既存構造で表現不能な場合のみArchitecture Reviewへ戻す。

## 7. Business / Legal Decision Required

### Existing
- BD-01 Raw diagnosis data retention
- BD-02 Customer deletion / anonymization
- BD-03 AI input/output and Transcript policy
- BD-04 Backup retention / RPO / RTO

Source: `docs/33-production-readiness-business-decision-package-v1.md`

### Proposed additional decision request — NOT DECISION

**BD-05 Customer Consent / Expectation**

Business / Legal must decide:
- 無料診断が何をするサービスかのcustomer-facing explanation。
- Assessmentとの違い。
- 取得情報の利用目的。
- AI利用の説明。
- Transcript取得/利用の説明。
- follow-upの説明。
- Privacy/Data Handlingへの案内。
- explicit consentが必要な範囲と、noticeで足りる範囲。
- Human-only pathを顧客へ提供するか。

Development LaneはLegal wordingを独自決定しない。

## 8. Classification

### Existing implementation can satisfy
- FUTURE first-class context
- Human Review / Correction / Approval
- provenance
- deterministic Assessment Handoff
- atLIB Actor neutrality

### Small modification
- 5-block Business Feedback translation
- Pilot Evidence Capture
- Business Acceptance Test A〜Fの自動/手動test fixture整備

### Architecture review required
**None confirmed at this time.**

新Core Objectを追加する根拠は現時点でない。

### External validation required
- real Anthropic AI-01〜04
- real Google Workspace OAuth / redirect / non-allowed account
- Cloud Run Worker request-outside CPU / scale / multi-instance / deploy-shutdown lease recovery
- Secret Manager / IAM / real injection
- ingress trust proxy / XFF / rate limit
- Monitoring alert delivery
- Cloud SQL backup / PITR / restore
- staging WEB / SALES_VISIT E2E with real AI/OAuth/notifications

### Business / Legal decision required
- BD-01〜04
- proposed BD-05
- named operational ownership required by B9 where not yet assigned

## 9. Controlled Customer Pilot shortest Critical Path

1. **Parallel A — Business/Legal:** BD-01〜04およびBD-05を決定・Canonicalize。
2. **Parallel B — Development small gaps:** Feedback translation、Pilot Evidence Capture、Business Acceptance Test A〜Fをbranchで実装・検証。
3. **Parallel C — Platform external evidence:** authenticated staging、real Secret/IAM、AI、OAuth、Worker、Monitoring、Cloud SQL restoreを検証。
4. B9 operational roles / failure / correction / duplicate handlingを実運用Runbookへ割当。
5. Internal Stage 0 representative cases A〜Fを実施。
6. Critical Business Gates + Technical/Security/Privacy Gateを再評価。
7. Critical FAILが0件の場合のみ Controlled Customer Pilotを `GO` または限定条件付き `CONDITIONAL GO` として記録。

## 10. Development implementation guardrails

- mainへ直接mergeしない。
- implementation repoでもfeature branchを使用する。
- Business Decision未確定部分はconfig/placeholderで先走って確定しない。
- AI outputからFACT/DECISION/Actorを生成しない。
- Human approval前にcustomer-facing conclusionを確定しない。
- Raw customer inputを書き換えない。
- provenanceを失わない。
- Assessment Handoffのdeterministic性を壊さない。
- Evidence存在確認とEvidenceが何を証明するかを混同しない。

## 11. Current decision

Stage: **Controlled Customer Pilot preparation**

Decision: **NO-GO — CLOSURE IN PROGRESS**

Reason:
- Architecture blocker: none confirmed.
- Business/Legal blocker: open.
- External validation blocker: open.
- Small implementation gaps: open.

次回Gate再判定は、上記Critical PathのEvidenceが揃った時点で実施する。
