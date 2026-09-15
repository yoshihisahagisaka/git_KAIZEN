# IT経営KAIZEN — UNKNOWNから始める実行支援・運用選択原則 v1

Status: **CANONICAL — BUSINESS / EXECUTION & CONTINUITY PRINCIPLES**
Date: 2026-09-15
Related: `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`, `docs/77-it-management-kaizen-customer-language-and-assessment-deliverable-principles-v1.md`, `docs/78-design-assessment-word-report-and-executive-slides-delivery-standard-v1.md`

## 1. Core Decision

IT経営KAIZENでは、すべてのUNKNOWNを解消してからでなければ改善を開始できない、とは考えない。

> **分からないことを、分かったことにしない。**
>
> **分からないことが残っていても、今あるFACTで判断できるACTは開始する。**
>
> **運用そのものから新しいFACTをつくり、仕組み化・効率化を進め、次のACTをDecisionする。**

UNKNOWNは調査不足を隠すための言葉ではない。現時点で確認できていないことを明示し、いつ・どのようにFACTへ変えるかを管理する対象である。

---

## 2. UNKNOWN Classification

UNKNOWNを一括して「要調査」としない。少なくとも以下の観点で扱う。

### A. 今のDecision前に確認が必要
確認しないとACT選択、安全性、権限、重大Risk等を判断できないもの。

→ ACT前に確認する。

### B. ACTしながらFACT化できる
開始自体を止める必要はなく、日々の運用から確認できるもの。

→ 運用を開始し、仕事の結果からFACTを蓄積する。

### C. 次のDecisionまでに確認すればよい
今回のACTには影響しないが、次の投資・拡張・移行判断で必要になるもの。

→ 次回Decision TimingまでにFACT化する。

### D. 現時点では確認不要
現在のDecisionに影響せず、確認Costに合理性がないもの。

→ 無理に調査しない。必要になった時点で再評価する。

---

## 3. Managed KAIZEN Flow

atLIBが実行支援を担う場合、UNKNOWNが残った状態からでも、安全に開始可能な範囲を定義して運用を開始できる。

```text
現時点で確認できたFACT / UNKNOWN
↓
今あるFACTで実行できるACTをDecision
↓
運用開始
↓
仕事の結果からFACTを蓄積
↓
不要な仕事をなくす
↓
標準化・仕組み化する
↓
任せる / 自動化する
↓
実際に起きたCHANGEを確認
↓
NEW FACT
↓
次のACT / Operating ModelをDecision
```

> **仕事からFACTをつくる。FACTからKAIZENを見つける。KAIZENによって次の仕事を減らす。**

---

## 4. End State Is Not Permanent Outsourcing

atLIBへの継続委託そのものをGoalにしない。

改善によって業務が整理され、標準化・仕組み化され、顧客自身でも運用可能な状態になれば、その時点のFACTと経営判断に基づき次の運用形態を選択できるようにする。

Candidate Operating Models：

- 顧客による内製運用
- SaaSへの移行
- 自動化された運用
- atLIBへの継続委託
- 既存ベンダー / 他社への移管
- 複数Actorの組合せ

SaaS移行が必ず可能になるとは断定しない。適切なSaaSの存在、業務適合性、Cost、Risk、移行条件等をその時点で確認してDecisionする。

> **atLIBに依存してもらうことではなく、会社が自分たちに合った運用方法を選べる状態をつくる。**

これはActor Neutralityと整合する。

---

## 5. Assessment Report Boundary

Assessment Reportには、以下のMethod / Decision Principleを含める。

- UNKNOWNが残ること自体は改善開始不能を意味しない
- UNKNOWNごとに「今確認する / 実行しながら確認する / 次のDecisionまでに確認する / 現時点では確認しない」を整理する
- 今あるFACTで判断できるACTは開始できる
- 将来の運用形態をAssessment時点で固定しない
- 内製、SaaS、自動化、継続委託、他社移管等を将来選択できる

ただしAssessment Reportの中で、これを「atLIBへ運用委託すべき理由」として表現しない。

AssessmentはActor Neutralityを維持し、**何を実行するかを決めるための成果物**である。

---

## 6. Separate Execution Support Material

atLIBがどのように実行支援するかは、Assessment Reportとは別のCustomer-facing Materialで説明する。

Working title：

> **IT経営KAIZEN 実行支援の考え方**

この資料では以下を説明する。

```text
分からない・属人化・手作業が残る状態
↓
分かっているFACTから運用開始
↓
実運用からFACTを蓄積
↓
なくす / 標準化 / 任せる / 自動化 / 整える
↓
人に依存しにくい仕組みへ
↓
将来の運用方法を選択
  ├ 内製
  ├ SaaS
  ├ atLIB継続
  ├ 他社移管
  └ 組合せ
```

この資料はAssessmentの中立的なDecision Supportと、atLIBの実行支援Capabilityを混同しないために分離する。

---

## 7. Actor Transfer Boundary

atLIBがAssessment後の実行Actorに選ばれた場合：

- Assessmentで確認したFACT / UNKNOWN / Decision Contextを引き継ぐ
- 運用中に得られる情報をNEW FACTとして継続蓄積する
- UNKNOWNを無理に推測して埋めない
- 実運用から標準化・自動化・仕組み化のCandidateを発見する

他のActorへ引き継ぐ場合：

- Assessmentで確認したFACT / UNKNOWN / Decision BasisをHandoffできる形で残す
- 追加調査が必要かどうかは、選択されたActor、契約、ACT、Technology等に依存する

「他社に依頼すると必ず再調査が必要」とは現時点でFACTではないため、Customer-facing Claimとして使用しない。

---

## 8. Business Meaning

IT経営KAIZENの継続支援は、顧客の現在の仕事をそのまま永久に代行することを目的としない。

> **一度運用を担う場合でも、その運用からFACTをつくり、仕事そのものを減らし、仕組みに変えていく。**

これにより、将来Customerが運用主体を自由に選択できる状態を目指す。

Corporate Philosophy：

> **ITで、企業に自由を。人々に未来をつくる。**

この「自由」には、特定の人、特定の運用、特定のProviderへ必要以上に依存せず、自社に合ったIT運用を選択できる状態も含み得る。

---

## 9. FACT FIRST Boundary

以下は断定しない。

- UNKNOWNはすべて運用開始後に確認できる
- どの案件でもUNKNOWNのまま安全に開始できる
- 仕組み化すれば必ずSaaSへ移行できる
- 内製化が常に最善である
- 他社はUNKNOWNがあると運用開始できない
- 他社へ移管すると必ず再調査が必要
- atLIBの継続支援が常に最適である

Decisionに必要なUNKNOWNは先に確認する。安全性、Authority、Compliance、重大Risk等を無視して「まず始める」ことはしない。
