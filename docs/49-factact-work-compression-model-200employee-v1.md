# FACTACT Work Compression Model — 200 Employee Company v1

Status: **HYPOTHESIS / VALIDATION MODEL — NOT PRICE DECISION**
Date: 2026-09-13
Related: docs/47, docs/48

## 1. Purpose

200名規模企業を仮想モデルとして、従来のIT運用WorkをそのままatLIBへ移管するのではなく、6 Lenses + FACTACTによってどのWorkをなくす・自動化する・標準化する・任せる・残す・整えることができるかを分解する。

本書の時間・件数・Compression RateはすべてHYPOTHESISであり、実顧客FACTではない。

目的は「30%削減できる」と主張することではなく、何を計測すれば事業性を判断できるかを明らかにすることである。

---

## 2. Baseline Model — HYPOTHESIS

Company Size: 200 employees

Monthly IT Human Workを仮に次の3 Categoryへ分ける。

| Category | Baseline h | Character |
|---|---:|---|
| Service Desk / Human Interaction | 70h | Userとの対話・個別対応が中心 |
| Operational Work | 90h | Account / Device / SaaS / Infra / 定例処理等 |
| Management / Reporting | 40h | 台帳・集計・報告・Vendor管理・管理Work |
| **Total** | **200h** | HYPOTHESIS |

この200hは実顧客FACTではない。

---

## 3. Work Compression Hypothesis Summary

初期仮説としてCategoryごとに異なるCompression Potentialを置く。

| Category | Baseline | Remaining Human Work | Compression | Status |
|---|---:|---:|---:|---|
| Service Desk | 70h | 55h | 21% | HYPOTHESIS |
| Operational Work | 90h | 50h | 44% | HYPOTHESIS |
| Management / Reporting | 40h | 18h | 55% | HYPOTHESIS |
| **Total** | **200h** | **123h** | **38.5%** | HYPOTHESIS |

これは価格計算に使用するFACTではない。

このモデルが示すのは、Work MixによってProvider Human Workが大きく変わる可能性である。

---

## 4. Representative Work Breakdown

### 4.1 入社

#### Current Pattern — HYPOTHESIS

Trigger: HRから入社連絡

Human Steps:
1. 入社情報確認
2. 不足情報をHRへ確認
3. Account作成
4. M365 / SaaS登録
5. License割当
6. Authority確認
7. PC選定 / Setup
8. Device台帳更新
9. Account台帳更新
10. SaaS台帳更新
11. License台帳更新
12. Checklist更新
13. Ticket / Backlog更新
14. 完了連絡

Problem:
- 同一Factの再入力
- 管理表ごとの更新
- Context確認
- Evidence分散

#### FACTACT Direction

Business Event: Joiner

> Work → Approval / ACT → Fact / Relation / Change / Evidence → Management Projection

Humanが行うべきこと：
- 例外判断
- Authority Decision
- Physical Setupで必要な作業
- 最終確認

削減候補：
- HR入力の再利用
- Standard Roleから必要Account / License候補提示
- API / WorkflowによるProvisioning
- Work結果からAccount / License / Device Relation形成
- 複数台帳への手動転記削減
- Completion Evidence自動形成

Compression Potential: **HIGH HYPOTHESIS**

---

### 4.2 退社

Current:
- 退社情報確認
- Account一覧探索
- SaaS Owner確認
- Disable / Delete
- License回収
- Device回収
- 各管理表更新
- Evidence保存

FACTACT Direction:
- Person → Account / SaaS / Device / Authority RelationをContextとして提示
- Humanが適用確認
- Standard Offboarding Work生成
- ACT結果からRelation / Change更新

重要：Known Factが今回のEventに適用されるかはHumanが確認する。

Compression Potential: **HIGH HYPOTHESIS**

---

### 4.3 Account / Authority Change

Current:
- 依頼確認
- 承認確認
- 対象System探索
- 権限変更
- Account台帳更新
- SaaS台帳更新
- Ticket更新
- Evidence保存

FACTACT Direction:
- Request / Approval / Current Relationを一つのWork Contextへ接続
- ACT結果からChange / Evidence形成
- Projectionで管理Viewを更新

Compression Potential: **MEDIUM-HIGH HYPOTHESIS**

---

### 4.4 PC交換

Current:
- Device確認
- User確認
- Lease / Warranty確認
- New Device準備
- Setup
- Data / App対応
- Device台帳更新
- Inventory更新
- User-Device Relation更新
- Ticket更新

FACTACT Direction:
- User / Device / Lease等をContext表示
- Standard Work
- Device Management Systemと接続
- Work完了からRelation / Change形成

Physical Workは残る。

Compression Potential: **MEDIUM HYPOTHESIS**

---

### 4.5 SaaS / License Change

Current:
- Request確認
- Approval
- License在庫確認
- SaaS管理画面変更
- License台帳更新
- Account台帳更新
- Cost管理更新
- Ticket更新

FACTACT Direction:
- SaaS / Account / License / ApprovalをWork Contextへ接続
- API可能なACTはAutomation候補
- Work結果からRelation / Change形成
- Management / Cost Projectionへ反映

Compression Potential: **HIGH HYPOTHESIS**

---

### 4.6 User Inquiry / Service Desk

Current:
- Inquiry受領
- User / Device / Account Context確認
- 聞き取り
- 過去事例探索
- 対応
- Escalation
- Ticket記録
- User連絡

FACTACT Direction:
- Known Facts / Current Context提示
- Similar Work / Knowledge提示
- Classification / Triage支援
- Human Decision / Human Communication
- ResultからKnowledge候補形成
- Repeated CauseからKAIZEN Option形成

Human Interactionは残りやすい。

Compressionは二段階で見る：
1. Handling Time Compression
2. Inquiry Volume Reduction

Compression Potential: **LOW-MEDIUM HYPOTHESIS**

---

### 4.7 Incident

Current:
- Alert / User report
- Scope確認
- Infra / Device / Account調査
- Vendor連絡
- Timeline記録
- 復旧
- Report作成
- Recurrence Prevention検討

FACTACT Direction:
- Evidence / Timeline / Entity RelationをWorkへ接続
- Known Contextを提示
- ACT / Decision / Changeを記録
- Post Incident FactからKAIZEN Option

Incident対応そのものを無理に自動化しない。
Context探索・記録・報告Workを減らす。

Compression Potential: **MEDIUM HYPOTHESIS**

---

### 4.8 Patch / Update

Current:
- 対象確認
- Version確認
- Schedule
- Approval
- Update
- Result確認
- Asset / Version台帳更新
- Evidence保存
- Report更新

FACTACT Direction:
- External Management ToolからEvidence接続
- Schedule / Standard Work
- ExceptionのみHuman Review
- ResultからChange / Projection更新

Compression Potential: **HIGH HYPOTHESIS**

---

### 4.9 Monitoring Event

Current:
- Alert受領
- Severity判断
- Device / Service Context探索
- Investigation
- Escalation
- Ticket更新
- Report集計

FACTACT Direction:
- Alert → Work Trigger
- Entity / Known Facts / History接続
- Triage支援
- ResultからEvidence / Change形成
- Recurring AlertをKAIZEN対象化

Compression Potential: **MEDIUM-HIGH HYPOTHESIS**

---

### 4.10 Monthly Reporting

Current:
- Ticket集計
- Incident集計
- Asset情報確認
- SaaS / License確認
- Patch / Monitoring結果集計
- Excel加工
- PowerPoint / Report作成
- Management説明

FACTACT Direction:

> Daily Work → FACT / Evidence / Change → Projection → Monthly Management View

Humanは以下へ集中する：
- Differenceの意味判断
- Risk判断
- KAIZEN Option
- Management Discussion

Compression Potential: **HIGH HYPOTHESIS**

---

## 5. Why Operational Work May Compress More Than Service Desk

Service DeskはHuman CommunicationそのものがValueの一部である。

一方Operational Workには、以下のNon-Value Human Workが混在しやすい。

- 管理表更新
- 二重入力
- Context探索
- Status確認
- Evidence作成
- Report用再集計
- 同一情報の複数System更新

FACTACTはこの部分を主なCompression Targetとする。

したがって、同じ100hのBaselineでもWork MixによってatLIB Human Workは異なる。

例：

### Service Desk Heavy
- Baseline 100h
- Remaining 80h
- Compression 20%

### Balanced
- Baseline 100h
- Remaining 65〜70h
- Compression 30〜35%

### Operation / Management Heavy
- Baseline 100h
- Remaining 45〜60h
- Compression 40〜55%

すべてHYPOTHESIS。

---

## 6. Price Implication — NOT DECISION

価格はBaseline Hoursだけでは決めない。

同じ100hでも：

- Service Desk Heavy → Human Workが残りやすい
- Operation Heavy → Automation / FACT formation余地が大きい
- Management Heavy → ProjectionでReporting Workを減らせる可能性

したがって、価格判断の候補式：

> **Price Band = Work Mix × Baseline Work × Compression Potential × Required Capability × Quality / Availability Requirement**

49.8万 / 60万 / 80万円のどれが成立するかは、実測CompressionとFull Costで判断する。

---

## 7. 100h → 70h Validation Protocol

最初の検証では、対象Scopeについて以下をBaseline取得する。

### Before
- Work件数
- Human Time
- Human Touch Count
- Manual Management Updates
- Duplicate Entry Count
- Context Search Time
- Evidence Creation Time
- Reporting Time
- Quality / SLA

### After FACTACT / KAIZEN
同じ指標を計測する。

Valid 30% Compression条件：

> Baseline 100h → Human Work ≤70h

かつ

- Capability Coverage ≥ Baseline
- Quality ≥ Baseline
-重大なRisk増加なし

---

## 8. FACTACT Product Validation Feedback

Business LaneからProduct Laneへ渡す検証Question：

1. 一つのWork結果から複数Management Projectionを形成できるか
2. 同じFactを複数画面・管理表へHumanが再入力しない設計になっているか
3. External SystemのFact / EvidenceをWork Contextへ接続できるか
4. ChangeからCurrent State Projectionを更新できるか
5. Reportingのための別入力を要求しないか
6. Known Factを自動的に今回へ適用せずHuman確認を保持できるか
7. Work HistoryからRepeated Cause / KAIZEN Candidateを形成できるか
8. Human Work Compressionを測定するためのEvent / Time / Touch Evidenceを取得可能か

これらはCore Object追加要求ではない。まず現行CoreとのFit / Gapを確認する。

---

## 9. Commercial Guardrail

顧客への販売表現として、実測前に以下を約束してはならない。

- 3人分を1人でできます
- 30%削減保証
- 50%削減保証
- 100hを70hにできます
- 常駐3名と必ず同等以上

実績FACT取得後にClaim範囲を決める。

現時点の正しい表現：

> **IT経営KAIZENでは、今ある仕事をそのまま外へ移すのではなく、FACTACTと6つのKAIZEN Lensを使い、不要な管理・転記・確認・報告Workを減らしたうえで、必要なIT Functionを提供する。**

---

## 10. Next Validation

次に必要なのは机上のCompression率精緻化ではなく、実案件Time Studyである。

優先候補：
1. Joiner / Leaver
2. Account / SaaS / License
3. Monthly Reporting
4. Monitoring / Patch
5. Service Desk

各WorkについてBefore / Afterを測定し、Category別Compression FACTを形成する。

そのFACTをdocs/38〜44のUnit Economicsへ反映し、49.8万 / 60万 / 80万円の価格Decisionを再実施する。
