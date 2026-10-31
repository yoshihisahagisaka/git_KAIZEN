# FACTACT Work Compression Time Study Protocol v1

Status: **VALIDATION PROTOCOL / BUSINESS + PRODUCT EVIDENCE DESIGN**
Date: 2026-09-13
Related: docs/47, docs/48, docs/49

## 1. Purpose

FACTACT / IT経営KAIZENのHuman Work Compressionを机上仮説から実測FACTへ移すためのTime Study Protocolを定義する。

目的は「何%削減できるか」を先に証明することではない。

> **Current Workを事実として測り、KAIZEN / FACTACT適用後に同じ定義で再測定し、何が減り、何が残り、Capability / Qualityがどう変化したかを確認する。**

---

## 2. FACT FIRST Rules

計測時は以下を厳守する。

### FACT
実際に観測・記録できたもの。

例：
- Work開始・終了時刻
- Human Touch回数
- 管理表更新回数
- System操作回数
- Waiting時間
- Rework
- Error
- SLA / Response

### UNKNOWN
計測できなかったもの。推測で埋めない。

### OBSERVATION
担当者・観測者が見た事象。FACTと解釈を分ける。

### HYPOTHESIS
「このWorkは自動化できる」「この確認は不要かもしれない」等。

### DECISION
実際にKAIZENとして採用するかはHumanが決める。

---

## 3. Unit of Measurement

Time Studyの最小単位を **Work Instance** とする。

例：
- Aさんの入社対応1件
- BさんのM365権限変更1件
- PC交換1台
- 問い合わせ1件
- Monitoring Alert 1件
- 月次Report 1回

Work Instanceごとに一意のIDを付ける。

---

## 4. Measure Human Time Correctly

Elapsed TimeとHuman Work Timeを分離する。

例：

09:00 Request受領
09:05 Human確認終了
09:05〜11:00 承認待ち
11:00〜11:10 Human作業

- Elapsed Time = 130min
- Human Work = 15min
- Waiting = 115min

原価計算には主にHuman Workを使用する。
Customer Experience / SLAにはElapsed / Waitingも使用する。

---

## 5. Work Step Classification

各Human Stepを次の分類で記録する。

| Code | Class | Meaning |
|---|---|---|
| DECIDE | Human Decision | 判断・承認・例外処理 |
| COMM | Communication | User / Vendor / Internalとの対話 |
| ACT | Value Execution | 実際の設定・復旧・物理作業 |
| SEARCH | Context Search | 情報・過去履歴・対象探索 |
| VERIFY | Verification | 状態・結果・適用確認 |
| RECORD | Record | Ticket / 管理表 / Evidence記録 |
| DUP | Duplicate Entry | 同一Factの再入力 |
| REPORT | Reporting | 集計・資料作成 |
| WAIT | Waiting | Human非稼働待ち時間 |
| REWORK | Rework | 誤り・不足による再作業 |

この分類により「必要Human Work」と「削減候補Work」を分離する。

---

## 6. Six Lenses Tag

各Stepに対してKAIZEN候補を以下でTagする。

- なくす
- 自動化する
- 標準化する
- 任せる
- 残す
- 整える

重要：Tagは改善案であり、削減FACTではない。

---

## 7. Required Baseline Fields

Work Instanceごとに最低限記録する。

### Identity
- Work ID
- Work Type
- Trigger Type
- Date
- Actor Role

### Volume / Time
- Start
- End
- Human Work Minutes
- Waiting Minutes
- Number of Human Touches

### Step
- Step No
- Step Class
- Human Minutes
- System / Tool
- Input
- Output

### Management Burden
- Management Table Update Count
- Duplicate Entry Count
- Context Search Minutes
- Evidence Creation Minutes
- Reporting Minutes

### Quality
- First Time Right / Rework
- Error
- SLA / Response
- Escalation
- User Waiting

### Evidence
- Source System
- Ticket / Work Record
- External Evidence Reference

---

## 8. Priority Validation Work

### P1 — Joiner / Leaver

Why:
- 一つのBusiness Eventから複数System / 管理情報Changeが生じる
- 「一つのWork → 複数管理更新」の検証に適する
- Account / License / Device / Authority / Evidenceを横断する

Measure:
- 1件あたりHuman Time
- System数
- Manual Updates
- Duplicate Entry
- Context Search
- Waiting
- Rework

### P2 — Account / SaaS / License Change

Why:
- Digital Work中心
- API / Workflow / Relation形成余地を検証しやすい

Measure:
- Human Touch
- Approval Work
- Manual Updates
- Duplicate Entry
- Change Evidence

### P3 — Monthly Reporting

Why:
- FACTACTの「KAIZENのための仕事を増やさない」を直接検証できる

Measure:
- Data Collection Time
- Aggregation Time
- Excel Processing
- Report Creation
- Verification
- Management Interpretation

Goal is not zero Human Work. Human should remain on interpretation / Decision.

### P4 — Monitoring / Patch

Why:
- Event / Schedule Trigger
- External EvidenceとのConnection
- Standardization / Exception Handlingの検証

### P5 — Service Desk

Why:
- Human Interactionが残るため、FACTACTの限界も測れる

Measure two effects separately:
1. Handling Time Compression
2. Inquiry Volume Reduction over time

---

## 9. Before / After Design

### Phase A — BEFORE

現行業務を変えずに観測する。

最低目標：
- Repetitive Work: 20〜30 Instances
- Low-frequency Work: 可能な範囲で全件
- Monthly Work: 2〜3 cycles where practical

これら件数はPROPOSALであり、統計保証値ではない。

### Phase B — KAIZEN DESIGN

Baseline FACTから：
- Waste候補
- Duplicate Work
- Automation Candidate
- Standardization Candidate
- FACTACT Connection Candidate
- Human Decision Boundary

を作る。

### Phase C — AFTER

変更後、同一Field / Definitionで再計測する。

BeforeとAfterで定義を変えない。

---

## 10. Core Metrics

### Human Work Compression Rate

`(Baseline Human Minutes - After Human Minutes) / Baseline Human Minutes`

### Management Work Compression

対象：RECORD + DUP + REPORT

### Context Search Compression

対象：SEARCH

### Human Touch Compression

`(Baseline Touches - After Touches) / Baseline Touches`

### Waiting Reduction

Elapsed / WaitingをCustomer Experience指標として測定。

### Rework Reduction

Error / Missing Context / Wrong Assignment等による再作業。

---

## 11. Valid Compression Gate

Compressionを成功FACTと呼ぶ条件：

1. Human Workが減少
2. Capability CoverageがBaseline以上
3. QualityがBaseline以上
4. 重大Riskが増えていない
5. 削減が単なる未実施・記録漏れではない

例：

100h → 70hでも、管理表更新をやめただけでCurrent Stateが不明になった場合は失敗。

100h → 70hで、管理表手動更新をなくしWorkからCurrent State Projectionが形成されるならValid Compression候補。

---

## 12. FACTACT Evidence Requirements

将来、可能な範囲でFACTACT自身から以下をEvidence化する。

- Work Created
- Work Started
- Human Action
- Human Decision
- External Action
- Waiting State
- Completed
- Reopened / Rework
- Related Entity
- Evidence Attached
- Change Formed
- Knowledge Reused
- Automation Executed

重要：これらが現行実装済みとは断定しない。Product LaneでFit / Gapを確認する。

---

## 13. Example — Joiner Time Study

HYPOTHETICAL BEFORE:

| Step | Class | Human min |
|---|---|---:|
| HR情報確認 | VERIFY | 5 |
| 不足情報確認 | COMM | 5 |
| Account作成 | ACT | 8 |
| SaaS登録 | ACT | 10 |
| License割当 | ACT | 5 |
| PC Setup | ACT | 30 |
| Device台帳 | RECORD | 5 |
| Account台帳 | RECORD | 5 |
| SaaS台帳 | RECORD | 5 |
| License台帳 | RECORD | 5 |
| Ticket / Checklist | RECORD | 5 |
| 完了連絡 | COMM | 2 |
| **Total** | | **90** |

HYPOTHETICAL AFTER:

| Step | Class | Human min |
|---|---|---:|
| Context / Exception確認 | VERIFY | 5 |
| Human Approval / Decision | DECIDE | 3 |
| Automated Provisioning確認 | VERIFY | 5 |
| PC Physical Setup | ACT | 30 |
| Completion確認 | VERIFY | 5 |
| User Communication | COMM | 2 |
| **Total** | | **50** |

90 → 50min = 44% Compression HYPOTHESIS。

削減の中心は「作業者を速く働かせる」ことではなく、複数台帳更新 / 重複入力 / Standard ProvisioningのHuman Workをなくすこと。

---

## 14. Provider Economics Connection

Time Study FACTを以下へ接続する。

`Required Human Hours × Role Full Cost/h`

Roleを一律単価にしない。

例：
- Service Desk
- Operator
- Engineer
- Specialist
- Service Manager / Consultant

Shared Capabilityでは、常時専任配置ではなく必要Capabilityを必要時に利用するため、Role Mixも計測する。

その上で：

`Delivery COGS = Human Role Cost + FACTACT + Shared Specialist + Service Management + Other Delivery Cost`

を算出する。

---

## 15. Price Decision Gate

49.8万 / 60万 / 80万円を決定する前に最低限必要なFACT：

- Work Mix
- Baseline Hours
- After Hours
- Role Mix
- Compression by Category
- Capability Coverage
- Quality
- Delivery Full Cost
- Customer Alternative Cost / TCO

これらがない段階で「安い / 高い」を決めない。

---

## 16. Strategic Meaning

このTime Studyは単なる原価調査ではない。

検証したいのはFACTACTの根本思想である。

> **管理表更新作業をなくす。**
>
> **仕事をすると、必要なFACTが自然に残る。**
>
> **FACTが蓄積するとKAIZENが見つかる。**
>
> **KAIZENすると、次のHuman Workが減る。**

この循環が実測できれば、IT経営KAIZENのManaged Capabilityは「安価なBPO」ではなく、従来の人月型IT Functionとは異なるEconomic Modelを持てる可能性がある。

---

## 17. Next Action

1. Product LaneでSection 12のEvidence取得可否をFit / Gap確認
2. 実案件を1つ選定
3. P1〜P3のBaseline Time Study開始
4. Before FACTを固定
5. KAIZEN / FACTACT適用
6. Afterを同一定義で測定
7. Compression / Quality / COGSを算出
8. docs/38〜44の価格モデルを実測FACTで再構築
