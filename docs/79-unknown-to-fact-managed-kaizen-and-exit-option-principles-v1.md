# IT経営KAIZEN — FACTACT既存原則のAssessment・実行支援へのBusiness適用 v1

Status: **CANONICAL — BUSINESS / APPLICATION & INTERPRETATION**
Date: 2026-09-15

## 0. Provenance / Positioning

この文書は、2026-09-15に新しいFACTACT思想を発明・追加するものではない。

FACTACTでは設計当初から、少なくとも以下の原則が定義されている。

Source: `docs/11-josys-kaizen-service-model-v1.md`

- **Unknown is allowed**
- Missing information must remain explicit as UNKNOWN / Information Gap until evidence supports a value
- UNKNOWN can remain explicit and does not block safe unrelated Work
- Work / operationからLearningを生む
- Continuous Operational KAIZENにより `UNKNOWN → known`、`UNVERIFIED → VERIFIED` を進める
- `FACT → ACT → CHANGE → NEW FACT → KNOWLEDGE → RULE → STANDARDIZE → DELEGATE → AUTOMATE → NEXT ACT`
- Work Generatedだけでなく、Work Avoided / Human Work / Automated Work / Created Timeを評価する
- 不要なWorkをなくし、安定したWorkを標準化・自動化する

したがって、

> **UNKNOWNを許容し、運用からFACTを増やし、仕事を減らし、標準化・自動化していく**

という考え方は新規Business Decisionではなく、FACTACTの既存設計原則である。

本書で2026-09-15にBusinessとして整理・確定したのは、その既存原則を **IT経営KAIZENのAssessment → 実行支援 → 将来の運用形態選択** にどう適用し、顧客成果物でどう表現するか、というApplication / Interpretationである。

Related Business Canonical:
- `docs/74-it-management-kaizen-design-decision-investment-method-v1.md`
- `docs/77-it-management-kaizen-customer-language-and-assessment-deliverable-principles-v1.md`
- `docs/78-design-assessment-word-report-and-executive-slides-delivery-standard-v1.md`

---

## 1. Existing FACTACT Principle Applied to IT経営KAIZEN

> **分からないことを、分かったことにしない。**
>
> **分からないことが残っていても、今あるFACTで安全に判断できるACTは止めない。**
>
> **運用そのものから新しいFACTをつくり、KAIZENを進める。**

UNKNOWNは「Assessment失敗」や「調査不足」を意味しない。

ただし、Decision、安全性、Authority、Compliance、重大Risk等の判断に必要なUNKNOWNまで無視してACTすることも意味しない。

---

## 2. Business Application — UNKNOWNの扱い

Assessment成果物ではUNKNOWNを一括して「未確認事項一覧」として提示し、すべて追加調査が必要であるかのように見せない。

Customer-facingには、UNKNOWNごとに少なくとも以下を整理する。

### A. 今のDecision前に確認が必要
これが分からないとACT選択、安全性、権限、重大Risk等を判断できない。

→ ACT前に確認する。

### B. ACT / 運用の中でFACT化できる
開始自体を止める必要はなく、日々の仕事から確認できる。

→ 安全に開始可能なACTを実行し、運用からFACTを蓄積する。

### C. 次のDecisionまでに確認すればよい
今回のACTには影響しないが、次の投資・拡張・移行判断に必要。

→ 次回Decision TimingまでにFACT化する。

### D. 現時点では確認不要
現在のDecisionに影響せず、確認Costに合理性がない。

→ 無理に調査しない。必要になった時点で再評価する。

この分類は、既存FACTACTのUNKNOWN原則をAssessment成果物へ翻訳したBusiness Applicationである。

---

## 3. Assessment Reportへの反映

Assessment Reportでは、従来の単純な「未確認事項一覧」という見せ方を避ける。

推奨Customer-facing heading：

> **現時点で分かっていないことと、その扱い**

説明原則：

> 本Assessmentでは、すべての情報を明らかにすることを目的としていません。経営判断に必要な事実を確認し、現時点で分からないことは、無理に推測せず「まだ分かっていないこと」として残します。
>
> 分からないことの中には、改善を始める前に確認すべきものもあれば、実行しながら確認できるもの、次の投資判断までに確認すればよいものもあります。
>
> **分からないことが残っていること自体は、改善を開始できないことを意味しません。**

推奨表項目：

| 現時点で分かっていないこと | 今の判断への影響 | いつ確認するか | どうFACTにするか |
|---|---|---|---|

AssessmentはActor Neutralityを維持し、この原則を「atLIBへ委託すべき理由」として使用しない。

---

## 4. Existing FACTACT HELIX → Managed KAIZEN

FACTACT既存原則をBusiness Journeyとして表現すると、以下となる。

```text
確認できたFACT / 明示されたUNKNOWN
↓
今あるFACTで安全に実行できるACTをHumanがDecision
↓
運用 / ACT
↓
仕事の結果からFACTを蓄積
↓
不要な仕事をなくす
↓
標準化・仕組み化する
↓
任せる / 自動化する
↓
CHANGEを確認
↓
NEW FACT
↓
NEXT ACTをDecision
```

これは新しいHELIXではなく、既存FACTACT HELIXのCustomer / Business Journeyへの翻訳である。

> **仕事からFACTをつくる。FACTからKAIZENを見つける。KAIZENによって次の仕事を減らす。**

---

## 5. Business Decision — 将来の運用形態を固定しない

今回Businessとして明確化した点は、Assessment後の実行支援のEnd Stateを「atLIBへの永久委託」に置かないことである。

運用を通じて業務が整理され、標準化・仕組み化されれば、その時点のFACTと経営判断に基づき、将来の運用形態を選択できる状態を目指す。

Candidate Operating Models:

- 顧客による内製運用
- SaaSへの移行
- 自動化された運用
- atLIBへの継続委託
- 既存ベンダー / 他社への移管
- 複数Actorの組合せ

> **atLIBに依存してもらうことではなく、会社が自分たちに合った運用方法を選べる状態をつくる。**

SaaS移行が必ず可能になるとは断定しない。適切なSaaSの存在、業務適合性、Cost、Risk、移行条件等を、その時点のFACTとして確認してDecisionする。

---

## 6. Assessmentと実行支援資料のBoundary

### Assessment Reportに入れるもの

- UNKNOWNを無理に埋めない
- UNKNOWNが残ること自体は改善開始不能を意味しない
- UNKNOWNごとに、いつ・どうFACT化するかを整理する
- 今あるFACTで安全に判断できるACTは開始できる
- 将来の運用形態をAssessment時点で固定しない

### Assessment Reportに入れすぎないもの

- atLIBへ委託することを前提とした運用説明
- atLIB固有の継続支援Capabilityの営業説明
- 「他社ではできない」等の未検証比較

### 別Customer-facing Materialで説明するもの

Working title:

> **IT経営KAIZEN 実行支援の考え方**

この資料では、atLIBが実行Actorとして選択された場合に、既存FACTACT原則をどのように運用へ適用するかを説明する。

```text
分からない・属人化・手作業が残る状態
↓
分かっているFACTから安全に開始
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

---

## 7. Actor Transfer Boundary

atLIBがAssessment後の実行Actorに選ばれた場合：

- Assessmentで確認したFACT / UNKNOWN / Decision Contextを引き継ぐ
- 運用中に得られる情報をNEW FACTとして蓄積する
- UNKNOWNを無理に推測して埋めない
- 実運用からWork Avoided、標準化、自動化、仕組み化のCandidateを発見する

他のActorへ引き継ぐ場合：

- Assessmentで確認したFACT / UNKNOWN / Decision BasisをHandoffできる形で残す
- 追加調査が必要かは、選択されたActor、契約、ACT、Technology等に依存する

「他社に依頼すると必ず再調査が必要」とは現時点でFACTではないため、Customer-facing Claimとして使用しない。

---

## 8. Corporate Philosophyとの接続

Corporate Philosophy：

> **ITで、企業に自由を。人々に未来をつくる。**

特定の人、特定の運用、特定のProviderへ必要以上に依存せず、自社に合ったIT運用を選択できる状態をつくることは、この企業理念と整合する。

ただし、この解釈を企業理念そのものの公式文言へ追加・改変しない。

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

本書は、既存FACTACT原則をBusinessへ適用する文書であり、Product Core Principleを再定義する文書ではない。
