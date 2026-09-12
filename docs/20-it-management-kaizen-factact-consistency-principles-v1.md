# IT経営KAIZEN × FACTACT 一貫設計原則 v1.1

Status: **CANONICAL — CROSS-SERVICE DESIGN PRINCIPLES**

この文書は、IT経営KAIZENのサービス設計とFACTACTのプロダクト設計に共通して適用する一貫設計原則を記録する。

## 1. 基本認識

IT経営KAIZENをFACTACTに合わせるのではない。IT経営KAIZENをFACT FIRSTで正しく設計した結果として、FACTACTの設計原則と自然に一致する状態を維持する。

> **MethodとSystemで原則を変えない。**

- IT経営KAIZEN = 企業を継続的に良くする方法とサービス
- FACTACT = その方法を日々の仕事の中で実現・継続・記録するService Operating Platform

## 2. FACT FIRST

> **分からないことを、分かったことにしない。**

アンケート、ヒアリング、営業担当者の解釈、AIの推論をEvidence確認済みのFACTと混同しない。

意味を区別する：FACT / UNKNOWN / OBSERVATION / HYPOTHESIS / DECISION / RULE / EVIDENCE。

UNKNOWNは無理に埋めない。Future・Decision・Workに影響する場合に必要なEvidenceを確認する。

## 3. AI Suggests. Human Decides. System Records.

> **AIは提案する。人が決める。システムが記録する。**

AIは重点テーマ、確認質問、仮説、分類、改善候補、次の行動等を提案できる。AIはEvidenceなしに事実、原因、経営判断を確定しない。人間が確認・判断・承認し、システムはその判断と根拠を記録する。

この原則は無料診断、Assessment、KAIZEN実行、FACTACTの日常運用のすべてに適用する。

## 4. 無料診断からFACTACTまでを一つの原則でつなぐ

> **無料診断：可能性を発見する**
>
> **設計Assessment：EvidenceからFACT / UNKNOWNで現在地を形成する**
>
> **KAIZEN：FACTをもとに人間が何を変えるか決める**
>
> **FACTACT：ACT / CHANGE / NEW FACTを日常業務から蓄積する**
>
> **NEXT KAIZEN：新しいFACTから次の改善を生み出す**

簡略化すると：

> **仮説 → FACT → ACT → CHANGE → NEW FACT → NEXT KAIZEN**

## 5. 無料診断における適用

無料診断では、顧客回答やヒアリング内容からGapやRoot Causeの「可能性」を提示する。AIは確認すべき重点テーマや質問を提案するが、診断結果を自動確定しない。

> **顧客が話す → AIが構造化する → 人間が意味を確認する → システムが状態として記録する → AIが次の確認を提案する → 人間が判断する**

## 6. Assessmentにおける適用

Assessmentでは管理表、台帳、手順書、規程、システム情報等のEvidenceを必要な範囲で確認する。

無料診断から引き継いだObservation / UNKNOWN / Hypothesis / Evidence Candidate等を、確認結果に応じてFACTとして確認、Hypothesisを棄却、UNKNOWN維持、追加Evidence確認へ更新する。

全量調査やUNKNOWNゼロを目的にしない。

## 7. KAIZEN実行とFACTACTにおける適用

Assessment時点のFACTを基準点とし、KAIZEN実行後はFACTACTの日常運用からCHANGE / NEW FACTを蓄積する。

> **実施したことではなく、実際に何が変わったかを見る。**

期待した状態とNEW FACTが異なれば、その差も新しいFACTとして次のKAIZENへつなげる。

### 7.1 FACTACTが実現するKAIZENの二つの作用

FACTACTが実現するKAIZENは、主に二つの作用に分ける。

**A. 日々の運用からFACTが蓄積されることによる効率化**

日々のWorkの結果としてFACT / Evidence / Relation / Change / Knowledge等が形成され、管理・集計・Reporting・次の改善確認に再利用される。仕事の後にKAIZENのためだけの二重入力、別台帳更新、再集計、報告用情報収集を増やさない。

> **仕事からFACTをつくる。管理・報告・改善のための重複Workを減らす。**

これは「KAIZENするために、KAIZENのための仕事を増やさない」のSystem上の実現である。

**B. 蓄積されたFACTから次のKAIZEN Optionを提示する**

FACT / Difference / Trend / Gap等から、AIは確認事項、Risk / Impact候補、Root Cause Hypothesis、KAIZEN Option等を提示できる。

> **FACTから、次に何を変えるべきかの候補を提示する。**

### 7.2 Decision / ACTはHuman Responsibility

FACTACTまたはAIがKAIZEN Optionを提示しても、その実行を自動決定しない。

> **FACTACT / AI：KAIZEN Optionを提示する**
>
> **Human：何を実行するかDecisionする**
>
> **Human / atLIB / Vendor等：決定されたACTを実行する**
>
> **FACTACT：Decision / ACT / CHANGEを記録し、NEW FACTへつなげる**

KAIZENの実行主体はatLIBに限定しない。顧客、既存Vendor、他社、atLIB等から、Decisionに応じて人間が決める。

自動化、Tool導入、RPA、System連携等がKAIZEN Optionとなり、顧客が実行をDecisionし、atLIBがActorとして選ばれた場合には、atLIBがKAIZEN Projectとして実行できる。

> **仕事からFACTをつくる。FACTからKAIZENを見つける。決めて動かすのは、人。**

## 8. 新しいサービス・機能を判断する基準

新しいサービス、機能、AI機能、画面、営業施策を追加する際は、便利そうかだけで判断しない。

最低限、次を確認する。

1. FACTとHypothesisを混同しないか
2. UNKNOWNを無理に埋める設計になっていないか
3. AIが人間のDecisionを奪っていないか
4. 判断の根拠を記録できるか
5. ACTだけでなくCHANGE / NEW FACTまで追えるか
6. KAIZENのためだけの余計な仕事を増やしていないか
7. 技術・運用・管理を分断していないか
8. 6つの改善視点と矛盾しないか

原則に反する場合は、仕様追加より先に矛盾を明示して再検討する。

## 9. 固定する中核原則

1. **事実を起点にする。**
2. **分からないことを、分かったことにしない。**
3. **UNKNOWNを許容し、必要になったときに調べる。**
4. **技術・運用・管理を一体で考える。**
5. **AIは提案する。決めるのは人間。システムが記録する。**
6. **実施したことではなく、実際に何が変わったかを見る。**
7. **KAIZENするために、KAIZENのための仕事を増やさない。**
8. **日々の仕事から事実を生み、螺旋的に会社を良くしていく。**

この原則は、IT経営KAIZENとFACTACTの両方に対する上位の設計判断基準として扱う。
