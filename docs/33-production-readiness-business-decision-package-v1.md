# Production Readiness Business Decision Package v1.0

Status: **BUSINESS DECISION REQUIRED — HANDOFF TO BUSINESS LANE**

対象：無料 IT経営診断 / IT経営KAIZEN Production Readiness

この文書は `docs/32-free-it-management-diagnosis-production-readiness-gate-v1.md` でNO-GO要因となったBusiness Decisionを、Business Laneで決定するためのDecision Packageである。

この文書の推奨案は **PROPOSAL** であり、Product Ownerが承認するまで **DECISIONではない**。

## 0. Existing principles to preserve

- FACT FIRST.
- AI Suggests. Human Decides. System Records.
- 顧客回答、Operator interpretation、AI hypothesisを自動でFACTへ昇格しない。
- Evidence / Decision / Change / Audit等、説明責任に必要な履歴をCase Closeだけを理由に消さない。
- 顧客をatLIBへ依存させず、顧客が説明・選択できる状態をつくる。
- 無料診断とIT経営KAIZEN 設計Assessmentの境界を変えない。

---

# BD-01 Raw diagnosis data retention

## Decision question

SurveyResponse、SourceRecord、Interview statement、Operator note、Transcript等のRaw診断データを、どの期間・条件で保持するか。

## PROPOSAL

**Raw診断データは「目的別・データ種別別」に保持期間を分ける。すべてを一律永久保存しない。**

推奨方向：

- Caseが進行中：サービス提供・Human Reviewに必要なRaw dataを保持。
- Case Close後：Report/Handoff/Audit等の説明責任データは保持する一方、Raw Transcript等は必要性を再評価し、不要なRaw dataは期限を設けて削除または匿名化する。
- Transcriptは他のSourceRecordより高リスクなRaw dataとして別扱いにする。
- 法令・契約・紛争対応等で保持義務がある場合は例外を明示する。

## Why

FACTACT/IT経営KAIZENは「なぜその判断になったか」の追跡性が重要だが、追跡性のためにすべての会話Raw dataを永久保存する必要はない。Report/Handoff/AuditとRaw Transcriptを分離することで、説明責任とデータ最小化を両立する。

## Business Lane must decide

- Raw Sourceの具体的保持期間。
- Transcriptの具体的保持期間。
- Assessment受注、辞退、Case Closeで期間を変えるか。
- 例外保持条件。

---

# BD-02 Customer deletion / anonymization

## Decision question

顧客からデータ削除要求があった場合、何を削除・匿名化し、何を制限保存するか。

## PROPOSAL

**「全削除」または「何も消さない」の二択にせず、データ分類に基づく削除・匿名化・制限保存を採用する。**

推奨分類：

1. Raw customer data：削除/匿名化対象になり得る。
2. Derived diagnosis data：個人識別情報を除去できる場合は匿名化を優先。
3. Approved Report / Handoff：顧客成果物・判断履歴として契約/説明責任との整合を確認して扱う。
4. Audit / security records：必要最小限をアクセス制限して保持する選択肢を持つ。
5. Backup：即時物理削除ではなく、backup lifecycleに従って期限到来時に消える設計を前提候補とする。

削除要求はHuman承認を必須とし、受付・判断・実行・完了をAuditとして記録する。

## Business Lane must decide

- 顧客に約束する削除権/削除範囲。
- 匿名化で代替可能な条件。
- Report/Handoff/Auditの扱い。
- Backup内データの説明方法。
- 削除承認責任者。

---

# BD-03 AI input/output and Transcript policy

## Decision question

Raw/TranscriptをAIへどこまで送信し、AI input/outputをどこまで保持し、顧客へどう説明するか。

## PROPOSAL

**AI利用は目的限定・最小入力・Human Decisionを原則とし、Transcript全文を常時AIへ送信・永久保存するモデルにはしない。**

推奨方向：

- AIへ渡す情報は各AI processの目的に必要なContextだけに限定する。
- AI-04は従来どおりHuman Approved Contextのみを使用する。
- Transcript全文が不要な工程では、必要なSource/抽出Contextへ縮小する。
- AI outputはauthoritative FACTではなくAI Proposalとして扱う。
- providerへ送信する情報、利用目的、Human Reviewがあることを顧客向け説明に含める。
- AI failure時にRaw provider errorへ顧客情報が残らないようtechnical controlを維持する。

## Business Lane must decide

- 顧客向けAI利用説明を申込/診断時のどこで提示するか。
- Transcript取得・AI利用について明示同意まで必要とするか、利用通知とするか。
- Transcriptを標準取得するか、必要時のみとするか。
- AI input/outputの具体的保持期間。
- 顧客がAI利用を希望しない場合のHuman-only提供範囲。

---

# BD-04 Backup retention / RPO / RTO

## Decision question

IT経営KAIZEN/無料診断の事業継続水準として、backup保持、RPO、RTOをどこまで顧客へ約束し、どこまで内部目標とするか。

## PROPOSAL

**Pilot段階では過剰なSLAを顧客約束せず、まず内部運用目標としてRPO/RTOを定義し、実restore Evidenceを取ってから外部SLA化を判断する。**

推奨方向：

- BackupはCloud SQL等のmanaged backup/PITRを前提に、実restore rehearsalを必須とする。
- RPO/RTOは「設定値」ではなく、restore testで実証可能な値として決める。
- Pilotと一般提供の要求水準を分けてもよい。
- 顧客へのSLA表記と内部運用目標を分離する。

## Business Lane must decide

- Pilot時の内部RPO目標。
- Pilot時の内部RTO目標。
- Backup保持期間。
- 一般提供時にSLAとして外部約束するか。
- 障害時の顧客通知方針。

---

# Recommended decision order

1. BD-03 AI / Transcript policy
2. BD-01 Raw retention
3. BD-02 deletion / anonymization
4. BD-04 backup / RPO / RTO

BD-03を先に決める理由は、何を取得・外部AIへ送るかが決まらなければ、保持/削除対象も確定しないため。

# Development Lane interface

Business Laneで各項目がDECISIONになったら、Development Laneは以下だけを実装する。

- retention/deletion policyをデータモデル・job・runbookへ反映。
- AI Context / Transcript handlingを決定どおり制約。
- customer-facing notice/consentが必要ならBusiness文言をそのまま実装。
- backup/RPO/RTOをPlatform configurationとrehearsal criteriaへ変換。
- Gate H/J/Kを再検証。

Development Laneは保持期間、同意方式、SLAを独断で決めない。

# Decision recording template

Business Laneは各項目を次の形式で返す。

- Decision ID: BD-01 / BD-02 / BD-03 / BD-04
- Status: ACCEPTED / MODIFIED / REJECTED / DEFERRED
- Decision:
- Customer promise:
- Internal operating rule:
- Exceptions:
- Effective timing:
- Development impact:

4件が確定したら、Business Canonicalへ昇格し、docs/32の `BUSINESS_DECISION_REQUIRED` を再評価する。
