# IT経営KAIZEN 継続支援 — Annual KGI / CHANGE Review v1

Status: **WORKING CANONICAL — BUSINESS / REPORTING SERVICE SPEC**

この文書は、IT経営KAIZEN 継続支援におけるAnnual Reviewを、年間実績の集計報告ではなく、Assessment / 前年Annual Reviewで経営とDecisionした1-Year KGIに対して、1年間のDaily Work・Decision・ACTから実際に会社がどうCHANGEしたかをFACTで確認し、そのNEW FACTを次年度BaselineとNEXT KGIへ接続するManagement Reviewとして定義する。

> **Annual Reviewの中心Question：経営と1年前に決めたCHANGEは、本当に実現したか？**

## 1. HELIX上の位置づけ

> **Assessment → Baseline FACT / UNKNOWN → 1-Year KGI → Daily Work → Monthly KAIZEN → Quarterly Review → Decision → ACT → CHANGE → NEW FACT → Annual Review → New Baseline → NEXT KGI → Next Daily Work**

Annual ReviewはCycleの終点ではなく、次の1年の起点である。

> **1年前のFACTと1年後のFACTを比較し、そのCHANGEを次のKAIZENの現在地にする。**

## 2. Annual Reviewが答える問い

1. 1年前に経営とDecisionしたKGIは何だったか。
2. 当時のBaseline FACT / UNKNOWNは何だったか。
3. 1年間でどのDecision / ACT / KAIZENを行ったか。
4. その結果、実際に何がCHANGEしたか。
5. KGIは達成 / 一部達成 / 未達 / 未確認のどの状態か。
6. 社員創出時間等、会社へ生まれた価値をどのFACTで示せるか。
7. 残っているGap / Risk / UNKNOWNは何か。
8. Future自体に変化はあるか。
9. 現在のNEW FACTを起点に、次の1年で何を変えるか。

## 3. Annual Review構成 — PROPOSAL

### Page 1 — One-Year CHANGE Summary

経営者が1年間のIT経営KAIZENの結果を一目で確認するページ。

#### A. Future
- Assessment / 前年Review時に確認したFuture
- Futureに重要な変更があれば、そのDecision / Context

#### B. 1-Year KGI
- KGI
- Baseline
- Target / Expected State
- Target date
- KGI Owner / Decision Authority

#### C. Actual NEW FACT
- 1年後の実績FACT / State
- Evidence
- UNKNOWNが残る場合はUNKNOWN

#### D. CHANGE

> **Baseline → 1-Year KGI → ACT / KAIZEN → Actual NEW FACT → CHANGE**

実施件数ではなく、会社の状態 / 仕事 / Risk / 生産性等がどう変わったかを示す。

#### E. KGI Review State

表示候補：
- Achieved
- Partially Achieved
- Not Achieved
- Verification Pending / UNKNOWN

これは採点Scoreではなく、Evidenceに基づくReview状態である。

未達を隠したり、Annual直前にKGIを都合よく書き換えたりしない。

## 4. Employee Time Created — applicable only

生産性 / 業務効率系KGIで社員創出時間を確認できる場合、年間Management Valueとして表示する。

候補：
- 年間社員創出時間
- IT運用担当者側の創出時間
- 一般社員側の創出時間
- 主な創出要因
- Baseline / After / Volume等の算定根拠
- Estimateを含む場合の明示

> **ITで失われていた時間を、社員が未来をつくる時間へ。**

社員創出時間は万能Scoreではない。Security / Governance / Risk / Business Continuity等は、そのCHANGEを最も適切に示すFACTで評価する。

## 5. Annual CHANGE Categories — PROPOSAL

Annualで経営へ説明するCHANGEを、必要に応じて次のような観点から整理できる。

- Employee Productivity / Time
- Work Efficiency / Human Work
- Standardization / Knowledge
- Automation
- Business Continuity / Recovery
- Security / Risk
- Governance / Authority
- Vendor Dependency / Responsibility
- Current State Visibility / UNKNOWN Reduction
- IT Management Decision Capability

これらは固定Score軸ではなく、顧客のKGI / Futureに応じたManagement View候補である。

6 Lensesを成果採点軸にはしない。6 Lensesは「どう変えたか」のKAIZEN視点として利用する。

## 6. 1年間のKAIZEN Story

Annual ReportではACTを時系列に羅列するだけでなく、重要なCHANGEについて次のChainを追跡できるようにする。

> **FACT → Gap → 6 Lenses → KAIZEN Option → Human Decision → Actor → ACT → CHANGE → NEW FACT**

これにより、どのCHANGEがどのDecision / ACTから生じたのかを説明できる。

因果関係がEvidenceで確認できない場合は、Observation / Hypothesisとして区別する。

## 7. 未達の扱い

KGI未達はReport上の失敗を隠す対象ではない。

未達そのものをNEW FACTとして扱う。

> **KGI未達 → Actual FACT → Difference → Root Cause Hypothesis / UNKNOWN → 6 Lenses → NEXT KAIZEN → Human Decision**

確認する例：
- KAIZEN Optionが適切だったか
- ACTが実施されたか
- Actor / Authority / WaitingにGapがあったか
- 前提FACTが変わったか
- 新しいRisk / Business Priorityが発生したか
- KGI設定自体にEvidence不足があったか

AIがRoot CauseをEvidenceなしに確定しない。

## 8. NEW FACTを次年度Baselineにする

2年目に再度すべてをゼロからAssessmentすることを前提にしない。

1年間のFACTACT運用で形成された、
- FACT
- Evidence
- Current State
- Decision
- ACT
- CHANGE
- Knowledge
- Relation
- unresolved UNKNOWN
を次年度のContextとして再利用する。

> **Annual Review時点のNEW FACT = 次年度のBaseline**

ただし重要領域でEvidenceが古い / 不十分な場合は、必要な範囲だけ再確認する。

> **UNKNOWNをゼロにするための調査はしない。次のDecisionに必要なUNKNOWNだけ確認する。**

## 9. Future Review

AnnualではKGIだけでなく、必要に応じてFuture自体が現在も有効かを経営と確認する。

会社の事業、組織、成長段階、Risk、経営Priority等が変わっている場合、Futureの変更をHuman Decisionとして記録する。

Future変更をAIが推測で確定しない。

## 10. NEXT KGI Decision

Annual Reviewは結果報告で終了しない。

> **Current NEW FACT / UNKNOWN → Future → Gap → 6 Lenses → KAIZEN Option → Human Decision → NEXT 1-Year KGI**

へ進む。

NEXT KGIは、前年KGIを機械的に延長しない。

候補：
- 達成したKGIを維持 / Standardize
- 次段階のCHANGEへ進む
- 未達KGIを継続する
- KAIZEN方法を変更して再設定する
- 新しい重要GapへPriorityを移す
- Future変更に合わせてKGIを変更する

## 11. Annual Management Review Session — PROPOSAL

Annual ReviewはReport送付だけでなく、経営者 / 経営責任者を含むManagement Review Sessionとして提供する方向を候補とする。

Sessionの目的：
- 1年前のDecisionを確認する
- Actual NEW FACTを確認する
- KGI / CHANGEをReviewする
- 未達 / UNKNOWNを正しく理解する
- Futureを必要に応じてReviewする
- NEXT KGIをHumanがDecisionする

具体的な時間、参加者、契約内回数はCommercial / Scope設計で確定する。

## 12. Assessmentとの関係

初年度：
> **Assessment → Baseline形成 → KGI Decision → 継続支援**

2年目以降：
> **Annual Review → NEW FACTをBaseline化 → NEXT KGI Decision → 継続支援**

Annual Reviewが成立する顧客では、毎年同じ有料Assessmentをフルでやり直すことを前提にしない。

ただし大規模な事業変更、M&A、組織再編、新しい重要Scope等により再Assessmentが必要な場合は別途判断する。

## 13. Commercial Neutrality / Actor

NEXT KGIが決まっても、atLIBがすべてのACTを受注することを前提にしない。

> **何を変えるかを先にDecisionする。誰が担うかは、その後に決める。**

ActorはCustomer / Existing Vendor / Other Vendor / atLIB等から選択できる。

atLIBが継続運用Actorとして適切でなくなった場合、FACTACT SaaS / Advisory / Self-Run等の将来Exitも選択可能とする方向を保持する。これらの具体商品仕様は別途設計する。

## 14. AI / Human Review

基本集計 / Baseline比較はAI OFFでも成立させる。

> **FACTACT集計 → AIによるDifference / Trend / Narrative / KAIZEN Option支援 → Human Review → Management Review → Human Decision**

AI支援候補：
- 1年前と現在のDifference抽出
- 年間Trend整理
- 重要CHANGE候補
- 未達要因のHypothesis候補
- unresolved UNKNOWN
- 6 LensesによるNEXT KAIZEN Option
- Management向け説明文

AIは、EvidenceなしにCHANGEの因果、Root Cause、Future、KGI、Decisionを確定しない。

## 15. 顧客向け短縮表現候補

> **1年後、会社が本当に変わったかを事実で確認する。**
>
> Assessmentで決めた1年後の目標と、実際の会社の状態をFACTで比較します。達成したことも、変わらなかったことも、分からないこともそのまま確認し、その事実から次の1年で何を変えるかを経営と決めます。

年間Cycle全体の表現：

> **現在地を事実で知る。1年後を決める。日々の仕事からKAIZENする。本当に変わったかを確認する。そして、次の1年を決める。**

## 16. Monthly / Quarterly / Annualの責任分離

- **Monthly**：今月、仕事は良くなったか？ — KPI / Work FACT / Service Quality / Current KAIZEN / CHANGE / Decision Required
- **Quarterly**：このままで1年後のKGIへ近づいているか？ — Trend / KAIZEN Effect / Gap / Risk / Management Decision
- **Annual**：経営と決めたCHANGEは本当に実現したか？ — Baseline vs NEW FACT / KGI Review / Future Review / NEXT KGI

> **Monthlyで運用する。Quarterlyで軌道をDecisionする。Annualで会社のCHANGEを確認し、次の1年を決める。**

## 17. FACTACT実装境界

Annual Review専用Core Object、KGI達成Score、成熟度Score等をBusiness Laneから要求しない。

既存CoreのFact / Evidence / Work / Decision / Action / Change / Relation / Knowledge / Authority等と、View / Query / Aggregation / Difference / Trend / Projection / Reporting / AI assistanceで表現することを優先する。

実現できないことが確認された場合のみProduct LaneへFIT / GAP / CONFLICT / UNKNOWNとして返す。

## 18. Product Value

ここまでの年間Cycleによって、IT経営KAIZEN 継続支援の商品価値は次のように表現できる。

> **ITの仕事を代行するサービスではない。経営と決めた1年後のCHANGEを、日々のIT Workから実現し、その結果をFACTで確認し続けるサービスである。**

そしてFACTACTは、日々のWorkをその年間Cycleへ接続するService Operating Platformとして位置づける。

> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**
