# IT経営KAIZEN 継続支援 — Monthly KAIZEN Report v1

Status: **WORKING CANONICAL — BUSINESS / REPORTING SERVICE SPEC**

この文書は、IT経営KAIZEN 継続支援におけるMonthly Reportを、一般的なBPO実績報告ではなく、Assessmentで経営とDecisionした1-Year KGIに対して、日々のWorkから形成されたFACTを使ってKAIZENを継続するための顧客向けService Specificationとして定義する。

> **Monthly Reportの目的は、何件処理したかを報告することではない。今月、仕事と会社のITが本当に良くなったかをFACTで確認し、次のKAIZENへつなげることである。**

## 1. Annual Cycle上の位置づけ

> **Assessment → 1-Year KGI → Daily Work → FACT → Monthly KPI Review → 6 Lenses → KAIZEN Option → Human Decision → ACT → CHANGE → NEW FACT → Quarterly Review → Annual KGI Review → NEXT KGI**

MonthlyはこのCycleの最小Management Review単位とする。

MonthlyでKGIを毎月再設定するのではなく、KGIへ向かうFACT / KPI / CHANGEを確認し、必要なKAIZENをDecisionへ接続する。

## 2. Monthly Reportが答える問い

顧客向け中心Question：

> **今月、仕事は良くなったか？**

そのために次を確認する。

1. AssessmentでDecisionした1-Year KGIは何か。
2. KGIにつながるKPI / FACTは今月どう動いたか。
3. Service自体は正常に機能したか。
4. 今月実施したACTから何がCHANGEしたか。
5. 日々のWorkからどんなKAIZEN候補が見つかったか。
6. 顧客 / 経営にDecisionが必要なことはあるか。

## 3. Report構成 — PROPOSAL

顧客が最初に見る1ページ目をManagement / KAIZEN Summaryとし、その後に必要なEvidence / Service Detailを置く。

### Page 1 — Management / KAIZEN Summary

原則として次を1ページで確認できる構成を目指す。

#### A. 1-Year KGI
- Assessment / Annual ReviewでDecisionしたKGI
- KGIのTarget date
- 必要に応じてKGI変更履歴への参照

#### B. 今月のKPI / FACT
- Baseline
- 前月
- 今月
- KGI TargetまたはExpected Direction（設定されている場合）
- Source / Evidence参照

数値が存在しないState KGIでは、状態を確認するFACT / Evidenceを表示する。

#### C. 社員創出時間 — applicable only

生産性 / 業務効率系KGIでEvidenceが存在する場合のみ表示する。

- 今月確認できた社員創出時間
- 累計社員創出時間
- 主な創出要因
- Baseline / After / 件数等の算定根拠

> **ITで失われていた時間を、社員が未来をつくる時間へ。**

社員創出時間を取得できない顧客やKGIに無理に表示しない。Estimateの場合はEstimateと明示する。

#### D. 今月確認できたCHANGE / NEW FACT

実施したことではなく、実施した結果として何が変わったかを記載する。

例：
- Waitingが減少した
- Human Workが減少した
- Manual Stepが減少した
- Standard Workflowが形成された
- Authorityが明確になった
- Risk状態が変化した
- UNKNOWNがEvidenceによって解消された

CHANGEがまだ確認できない場合は「未確認 / UNKNOWN」とする。

#### E. Next KAIZEN

日々のFACTから見つかったKAIZEN Optionを、必要に応じて6 Lensesで整理する。

> **なくす・自動化する・標準化する・任せる・残す・整える**

6 Lensesすべてを毎月埋める必要はない。FACTに関係するLensだけを使う。

#### F. Decision Required

顧客 / IT責任者 / 経営者等によるDecisionが必要な事項を明示する。

- Decision内容
- 根拠FACT / Evidence
- Risk / Impact
- KAIZEN Option
- Decision Authority
- 希望Decision時期

Decision Requiredがなければ無理に作らない。

## 4. Page 2以降 — Evidence / Service Detail

Page 1の結論を支えるFACTを、必要な範囲で掲載する。

### A. Service Quality

初動SLO等、atLIB Service自体が正常に提供されたかを確認する。

現時点の仮初動SLO：
- 質問・相談：2営業時間以内
- 業務停止・即時性の高いRequest：1営業時間以内
- 重大Incident：30分以内

自動受付ではなくHuman initial actionを計測する。

表示候補：
- SLO対象件数
- 達成 / 未達
- 未達理由の確認済みFACT
- 必要なService KAIZEN

SLOは現時点ではPROVISIONALであり、運用FACTから妥当性をReviewする。

### B. Work FACT

Accepted Work Scopeに応じて必要なFACTを表示する。

Service Desk例：
- Inquiry / Request / Incident volume
- Waiting
- long-stagnant Work
- Vendor Waiting
- repeat / recurrence
- Category / Department / System等の必要なView

Business Workflow例：
- Business Event volume
- Work completion
- Human Work
- Waiting
- Manual Action
- exception / rework

Infrastructure Operation例：
- Alert / Incident
- Operational Work
- Waiting / Vendor dependency
- recovery / business impact
- recurring Event / Risk

これらは固定の全顧客共通KPIではなく、Accepted Work ScopeとKGI / KPIに応じたProjectionとする。

### C. Knowledge / Standardization

日常Workから形成・再利用されたKnowledgeやStandardizationの状態を、顧客価値につながる場合に表示する。

Knowledge件数そのものを成果にしない。再利用によってHuman Work / Waiting / Repeat等がどう変わったかを優先する。

### D. ACT / CHANGE Log

当月の重要ACTについて、

> **Before FACT → Decision → ACT → After FACT / CHANGE → NEW FACT**

を追跡可能にする。

実施済みだがCHANGE未確認の場合は、ACT完了とCHANGE確認を分離する。

## 5. AIの役割

基本FACT集計はAI OFFでも成立させる。

> **FACTACT集計 → AI所感生成 → Human Review → 顧客向けReport確定**

AIは次を支援できる。
- FACTからの注目点抽出
- 前月 / Baselineとの差分説明
- Trend候補
- 確認すべきUNKNOWN
- 6 LensesによるKAIZEN Option候補
- Management向け文章化

AIは禁止事項：
- Evidenceのない因果関係を確定する
- UNKNOWNを推測で埋める
- Observation / HypothesisをFACTへ昇格する
- KGI達成を予測保証する
- Human Decisionを代替する

## 6. Human Review

AI生成Reportを自動で顧客送信しない。

atLIB Reviewerは最低限、
- Source FACT / Evidence
- semantic classification
- 前月 / Baseline比較の妥当性
- 因果関係表現
- 顧客Context
- KAIZEN Optionの実行可能性
- Decision Requiredの妥当性
を確認する。

> **AI Suggests. Human Decides. System Records.**

## 7. 一般的Help Desk KPIとの関係

問い合わせ件数、初動時間、解決時間等は必要なOperational FACTとして利用できる。

ただしMonthly KAIZEN Reportの中心を、FCRやTicket Count等の一般的Help Desk KPIへ固定しない。

特に一次解決率は、適切なActorへ速やかにTriage / EscalationするFACTACTのWork設計と行動誘因が衝突する可能性があるため、主要な顧客向けKAIZEN KPIとして固定しない。必要時は補助Observationとして扱う。

> **一般的なKPIに仕事を合わせるのではなく、経営とDecisionしたKGIに必要なFACTを見る。**

## 8. MonthlyでKGIを都合よく変更しない

KPIが悪化 / 未達だからという理由だけでKGIを下方修正しない。

原則：
> **FACT確認 → Gap / Difference → 6 Lenses → KAIZEN Option → Human Decision → ACT**

Future / Business Priority / 重大Risk / 前提条件等に新しいFACTがありKGI変更が必要な場合は、変更理由とEvidenceを残し、Human Decisionとして変更する。

## 9. 顧客向けReportのTone

「良かった / 悪かった」という採点Reportにしない。

- FACT
- UNKNOWN
- Observation
- Risk / Impact
- Hypothesis
- Proposal / KAIZEN Option
- Decision
を混同しない。

> **事実を優先する。見栄えより根拠。採点より経営判断。**

グラフや図解は理解を助けるために使うが、Radar Chartや独自Score等をReportの中心にしない。

## 10. Monthly Reportの顧客向け短縮表現候補

> **毎月、仕事が良くなったかを事実で確認する。**
>
> Assessmentで決めた1年後の目標に対して、日々のIT業務から進捗を確認します。改善したこと、まだ変わっていないこと、次に変えるべきことをFACTで整理し、必要なDecisionへつなげます。

生産性系KGIがある場合：

> **今月、会社に何時間を取り戻せたか。**

これは社員創出時間を利用できる場合の補助表現であり、すべての顧客 / KGIへ強制しない。

## 11. FACTACT実装境界

Monthly Reportのために専用Core Objectや専用KAIZEN ScoreをBusiness Laneから要求しない。

まず、既存Coreから、
- View
- Projection
- Query
- Aggregation
- Difference
- Rule
- Timer / Alert
- Reporting
- AI assistance
で表現する。

実現できないことが確認された場合のみ、Product LaneへFIT / GAP / CONFLICT / UNKNOWNとして返す。

## 12. 次の設計対象

本仕様を基準に次を設計する。

1. Quarterly Management / KAIZEN Review
2. Annual KGI / CHANGE Review
3. Monthly / Quarterly / Annualの共通Data / Report semantics
4. Customer-facing Report Template
5. FACTACT Product LaneとのFIT / GAP確認

Reportの見栄えから先に設計せず、まず顧客が何をDecisionできるようになるべきかを基準とする。
