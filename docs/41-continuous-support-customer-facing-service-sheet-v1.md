# IT経営KAIZEN 継続支援 — Customer-facing Service Sheet v1

Status: **WORKING CANONICAL — BUSINESS / SALES ENABLEMENT**

この文書は、IT経営KAIZEN 継続支援を経営者・IT責任者へ1ページで説明するためのCustomer-facing Service Sheetの内容構造を定義する。

内部設計用語を並べることではなく、顧客が次を理解できることを目的とする。

1. 何のためのServiceか
2. 一般的な情シス代行 / Help Desk / 常駐支援と何が違うか
3. 何を任せられるか
4. どう会社が良くなるのか
5. 何を毎月 / 3か月 / 1年で受け取るのか
6. どう始めるのか

---

# 1. Hero

## Main Copy — PROPOSAL

> **ITの仕事を任せる。会社のITは、もっと良くなる。**

## Sub Copy

> **IT経営KAIZEN 継続支援**
>
> 日々のIT業務をatLIBが継続運用。対応して終わりではなく、仕事から事実を蓄積し、改善し、本当に会社が変わったかまで確認します。

## Supporting Message

> **人を一人つけるのではなく、必要なIT機能をチームと仕組みで提供します。**

Customer-facingではFACTACTを最初から主役にしない。まず顧客価値を説明し、その実現基盤としてFACTACTを後段で説明する。

---

# 2. Problem / Conventional Model

## Heading — PROPOSAL

> **IT業務を外注した。でも、会社のITは良くなっていますか？**

一般的な運用代行では、

> **問い合わせる → 対応する → 完了する**

で仕事が終わりやすい。

その結果、
- 同じ問い合わせが繰り返される
- 誰が何を知っているか分からない
- 台帳や報告のために別作業が増える
- ベンダーへ依頼した後の状態が見えない
- 日々忙しいのに、経営がITの現在地を判断できない
- 改善活動が「別の仕事」になる

という状態が残り得る。

これは全ての既存サービスに当てはまると断定しない。Customer-facingでは「起こり得る課題」として表現する。

---

# 3. IT経営KAIZENの違い

## Core Copy

> **仕事をするたびに、会社を良くする事実がたまる。**

IT経営KAIZEN 継続支援では、日々のIT WorkをFACTACTで運用する。

> **IT Work → FACT → KAIZEN → Human Decision → ACT → CHANGE → NEW FACT**

仕事の結果から、問い合わせ、待ち時間、繰り返し作業、障害、運用状態、変更結果等を確認し、次の改善へつなげる。

> **KAIZENするために、KAIZENのための仕事を増やさない。**

---

# 4. What We Operate

## Heading

> **必要なIT業務を、会社に合わせて組み合わせます。**

### A. 社員ITサポート — Service Desk

社員からのIT問い合わせ、利用相談、一次切り分け、Vendor連携、状態管理、Knowledge化等を継続運用する。

Customer Value：
> **社員がITで止まる時間を減らす。**

### B. 入退社・アカウント等のIT業務 — Business Workflow

入社、退社、異動、Account、Device、SaaS / License等、会社のBusiness Eventに伴うIT Workを継続運用する。

Customer Value：
> **人に依存していたIT業務を、抜け漏れなく回る仕事へ変える。**

### C. IT基盤運用 — Infrastructure Operation

Monitoring、Incident、Patch、Backup、Security、Server / Cloud、Network、Vendor連携等、合意したIT基盤Workを継続運用する。

Customer Value：
> **障害へ対応するだけでなく、IT基盤の状態と変化を経営判断につなげる。**

3領域すべてを契約する必要はない。Assessment結果と顧客環境から必要なAccepted Work Scopeを設計する。

---

# 5. FACTACT

## Heading — PROPOSAL

> **仕事をすると、会社のITが整理されていく。**

FACTACTは、IT経営KAIZENを日々の仕事の中で継続するService Operating Platform。

同じ情報を、問い合わせ対応、台帳、管理表、報告資料へ何度も転記することを目的にしない。

> **一つの仕事をすると、その結果が関連する事実・状態・変更へつながる。**

これにより、日々のWorkから、
- 現在何が起きているか
- 誰 / 何を待っているか
- 同じ問題が繰り返されていないか
- どこに人手がかかっているか
- 実施した改善で何が変わったか

を確認しやすくする。

FACTACTの具体的なProduct FeatureはProduct Laneで実装確認された範囲だけを営業資料へ掲載する。Business Laneから未実装機能を確定Featureとして約束しない。

---

# 6. Continuous KAIZEN

## Heading

> **対応件数ではなく、「会社が良くなったか」を見ます。**

改善を見る6つの視点：

> **なくす・自動化する・標準化する・任せる・残す・整える**

日々のFACTから改善候補を見つける。

AIは改善候補や注目点をSuggestできるが、何を変えるかを決めるのはHuman。

> **AIは提案する。決めるのは人。システムが記録する。**

---

# 7. Management Cycle

## Heading

> **毎月改善する。3か月ごとに軌道を見る。1年後、本当に変わったか確認する。**

### Monthly
> **今月、仕事は良くなったか？**

- KGIにつながるFACT / KPI
- Service Quality
- 確認できたCHANGE
- 次のKAIZEN候補
- 必要なDecision

### Quarterly
> **このままで1年後の目標へ近づいているか？**

- 3か月のTrend
- 実施したKAIZENの効果
- 新しいGap / Risk
- 続ける / 変える / 追加するDecision

### Annual
> **経営と決めたCHANGEは、本当に実現したか？**

- 1年前のFACTとの比較
- KGI Review
- 実際に生まれたCHANGE / NEW FACT
- 次の1年のKGI

Canonical：
> **Monthlyで運用する。Quarterlyで軌道をDecisionする。Annualで会社のCHANGEを確認し、次の1年を決める。**

---

# 8. Employee Value

生産性 / 業務効率の改善では、必要に応じて「社員創出時間」を確認する。

## Copy

> **ITで失われていた時間を、社員が未来をつくる時間へ。**

社員創出時間：
> IT対応、待機、重複作業、手作業等から解放され、本来の仕事に使えるようになった社員時間。

IT担当者側と一般社員側の双方を対象にできる。

ただし全顧客を一つのScoreで評価しない。Security、Risk、Governance、Business Continuity等は、それぞれのCHANGEに適したFACTで確認する。

---

# 9. How It Starts

## Heading

> **まず、会社の現在地と1年後を決めます。**

Flow：

> **無料IT経営診断 → IT経営KAIZEN 設計Assessment → 1-Year KGI / Decision → 継続支援 → Monthly KAIZEN → Quarterly Review → Annual CHANGE Review**

### 無料IT経営診断
可能性を発見する。

### 設計Assessment
EvidenceからFACT / UNKNOWNを確認し、経営と1年後に何を変えるかをDecisionする。

### 継続支援
DecisionしたCHANGEに必要なIT Workを継続運用し、日々のFACTからKAIZENする。

Assessmentの結果、Customer / Existing Vendor / Other Vendorが適切なActorなら、そのDecisionを尊重する。

> **atLIBに発注することがゴールではない。会社が良くなることがゴールです。**

---

# 10. Service Model

## Heading

> **人月ではなく、必要なIT機能を提供します。**

Standard direction：
- Remote First
- FACTACT Web Intake
- weekday daytime Human Service
- Human First Response SLO
- Authority / Approval / Decision boundary
- Vendorを含むEscalation / Waiting管理
- Monthly / Quarterly / Annual KAIZEN

顧客ごとの違いは「担当者を何時間買うか」ではなく、
- Accepted Work Scope
- Volume
- Complexity
- Service Requirement
- Managed Environment
からService Capacityを設計する。

> **Human WorkはatLIBがServiceを改善するために測るFACTであり、顧客へ売る商品そのものではない。**

---

# 11. Commercial Boundary

### 継続支援
反復的に継続運用するAccepted IT Work。

### 個別条件
Phone、Onsite、時間拡張、特殊Channel、物理物流等。

### KAIZEN Project
Automation / RPA、System Implementation、Migration、Infrastructure Redesign等の明確なCHANGE Work。

> **日々の運用から改善を見つける。大きなCHANGEが必要なら、誰が実行するかをDecisionする。**

atLIBがActorに選択された場合、別Projectとして提供できる。

---

# 12. Pricing Communication — CURRENT HYPOTHESIS

顧客向け価格はまだDECISIONしていない。

現在はService Capacityに応じてS / M / L / Custom等のBandを設ける方向を検証している。

内部Reference Hypothesis：
- S：45万円 / month candidate
- M：65万円 / month candidate
- L：100万円 / month candidate
- Custom：individual quote

**この数値はCustomer-facing final priceではなく、Unit Economics検証用HYPOTHESIS。正式Sales Sheetへ掲載する前にPrice Decisionが必要。**

Assessment standard price：¥1.2m pre-taxは現行Canonical。

---

# 13. One-page Layout — PROPOSAL

実際の16:9 / A4 Sales Sheetでは次の順序を推奨する。

1. Hero：ITの仕事を任せる。会社のITは、もっと良くなる。
2. Conventional vs IT経営KAIZEN
3. 3 Work Areas
4. FACTACT：仕事をすると会社のITが整理される
5. Monthly → Quarterly → Annual
6. Employee / Management Value
7. Start：Diagnosis → Assessment → Continuous Support
8. Service Model / Commercial Boundary
9. CTA：無料IT経営診断

価格はDecision前はSheetへ載せない。

---

# 14. Do Not Say

営業資料では次の表現を避ける。

- 「情シスKAIZENの進化版」
- 「人材をリモートで提供」
- 「月○時間対応」
- 「問い合わせ無制限」
- 「AIが自動で経営判断」
- 「FACTACTで必ず○%効率化」
- 「既存Vendorを置き換える」
- 「全てのITを一元管理できる」
- 未実装のFACTACT Feature
- Evidenceのない改善率 / maturity score

---

# 15. Customer-facing Short Explanation

> **IT経営KAIZEN 継続支援は、日々のIT業務を代行するだけのサービスではありません。**
>
> Assessmentで経営と「1年後に会社のITをどう変えるか」を決め、そのCHANGEに必要なIT業務をatLIBが継続運用します。
>
> 日々の仕事から事実を蓄積し、毎月改善。3か月ごとに軌道を確認し、1年後に本当に会社が変わったかを事実で確認します。
>
> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**

---

# 16. Next Step

このCustomer-facing構造を基準に、次は実在しないRepresentative CustomerへQuote / Scope Sheetを当て込み、販売シミュレーションを行う。

検証すること：
1. Assessment結果からScopeを自然に決められるか
2. CustomerがWork Scope / Responsibilityを理解できるか
3. Capacity Bandが説明可能か
4. Human Work / Costが想定内か
5. Customer Valueに対して価格仮説が成立するか
6. どのUNKNOWNが受注前に必要か

その結果からPrice DecisionとSales Sheet最終化へ進む。
