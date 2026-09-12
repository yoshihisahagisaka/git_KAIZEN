# IT経営KAIZEN Assessment × FACTACT Reporting Consistency v1

Status: **CANONICAL — CROSS-SERVICE REPORTING PRINCIPLE**

この文書は、IT経営KAIZEN 設計Assessmentのレポートと、FACTACTによる継続運用レポートが同じ原則・意味論で接続され、将来の設計・実装で矛盾しないための共通基準を定める。

## 1. 共通原則

Assessment ReportとFACTACT Reportは別目的のレポートであるが、同じIT経営KAIZENの方法論に従う。

> **事実を優先する。見栄えより根拠。採点より経営判断。**

> **FACT FIRSTはFACTしか書かないことではなく、FACT / UNKNOWN / Observation / Risk・Impact / Hypothesis / Proposal / Decisionを混同しないことである。**

両レポートは、成熟度スコアや総合点を中心に設計しない。

共通の意味論は以下とする。

> **FUTURE → FACT / UNKNOWN → GAP → RISK / IMPACT → ROOT CAUSE → KAIZEN OPTION → DECISION → ACT → CHANGE → NEW FACT → NEXT KAIZEN**

## 2. Assessment Reportの役割

Assessment Reportは、経営者または経営判断につなげる責任者が、現在地と選択肢を理解し、次の一手をDecisionするための資料である。

中心となる問いは、

> **「Futureに対して現在どこにいて、次に何を変えるべきか？」**

である。

Assessment Reportは主に、FUTURE、FACT / UNKNOWN、GAP、RISK / IMPACT、ROOT CAUSE、KAIZEN OPTION、投資情報、DECISION REQUIREDを扱う。

Assessmentの終了条件はレポート納品ではなく、**経営が事実をもとに次の一手をDecisionできる状態が形成されていること**である。

## 3. FACTACT Reportの役割

FACTACT Reportは、Assessment等で形成された現在地とDecisionを継承し、日々の仕事からACT / CHANGE / NEW FACTを蓄積して、経営が「本当に会社が変わったか」を継続確認し、NEXT KAIZENを判断するためのレポートである。

中心となる問いは、

> **「DecisionしたKAIZENを実行した結果、本当に何が変わったか？ 次に何を変えるべきか？」**

である。

FACTACT Reportは単なる監視値、作業件数、チケット件数、稼働率等の月次集計を目的としない。それらはEvidence / FACTとして利用できるが、経営に対してはFuture、Decision、ACT、CHANGE、NEW FACT、Risk / Impact、NEXT KAIZENとの関係を明確にする。

## 4. AssessmentからFACTACTへの連続性

AssessmentとFACTACTの間で、同じ事象の意味を変えない。

Assessmentで形成した以下の情報はFACTACTへ引き継ぐ。

- Future
- Evidence
- FACT / UNKNOWN
- Gap
- Risk / Impact
- Root Cause（確認済みかHypothesisかを保持）
- KAIZEN Option
- Decisionとその根拠
- Expected Change
- Verification対象

その後FACTACTで、ACT、実際のCHANGE、NEW FACT、NEXT KAIZENを同じ文脈へ追加する。

> **Assessmentは現在地と次の一手をDecisionする。FACTACTは、そのDecisionで本当に会社が変わったかを事実で確認する。**

Expected Changeは将来予測でありFACTではない。実施後にEvidenceから確認された状態だけをCHANGE / NEW FACTとして扱う。

## 5. 既存ベンダー・外部委託の扱い

「他社ベンダーに任せている」はCurrent Stateを表す重要なFACTになり得るが、それ自体を良い・悪いと評価しない。

委託業務については、必要に応じて以下をEvidenceから確認する。

- 誰が担っているか
- 契約・委託範囲
- 期待するサービス水準、SLA、役割、Authority
- 実際に提供されている内容・実績
- 費用
- 報告内容と頻度
- 顧客側での利用実態
- 委託によって期待したCHANGEが得られているか

顧客担当者の「ちゃんとやってくれない」「費用が高い」「分かりづらい」等の発言は、そのままFACTへ昇格させない。Respondent Statement / Observationとして保持し、Decisionに重要であれば契約、SLA、対応履歴、費用、成果、月次レポート等のEvidenceを確認する。

> **委託していることを評価するのではなく、委託がFutureに対して機能しているかをFACTで見る。**

既存ベンダー継続（RETAIN）、契約・SLA・報告改善、委託範囲再設計、再選定、自社化、別主体へのDELEGATE等をKAIZEN Optionとして扱える。atLIBへの切替を前提としない。

## 6. 他社月次レポートをEvidenceとして扱う

既存ベンダーの月次レポートはAssessmentにおける有力なEvidenceになり得る。

確認対象は「見やすい／見づらい」という主観だけではなく、例えば以下である。

- 何の技術FACTが報告されているか
- 重要なRisk / Impactが識別されているか
- Futureや経営課題との関係が示されているか
- 経営が判断すべき事項が明確か
- Decision Requiredが存在するか
- 前回Decisionと今回の結果が接続されているか
- ACTによって何がCHANGEしたか確認できるか
- 経営会議等で実際に利用されているか

例えば技術指標が十分記載されていても、経営報告、Risk / Impact、Decision Requiredが存在せず、経営会議でも利用されていないことがEvidenceから確認できれば、

> **技術状態を報告する仕組みは存在するが、その情報を経営Decisionへ変換する仕組みにGapがある。**

と整理できる。

「技術用語ばかりで分かりづらい」という表現だけで他社サービスを否定しない。

## 7. FACTACT Reportの差別化原則

FACTACT Reportの差別化を「デザインが良い」「専門用語を使わない」だけに置かない。

本質的な差別化は、日々の技術・運用情報を経営DecisionとKAIZENの連続した文脈へ変換することにある。

> **技術FACT → 経営上の意味 → Decision → ACT → CHANGE → NEW FACT → NEXT KAIZEN**

一般的な技術月次報告と競合比較を行う場合も、個別競合についてEvidenceなく「技術情報しか出さない」と断定しない。比較対象の実際のレポート・仕様等をEvidenceとして確認する。

FACTACT Reportでは、例えば「アラート12件」「問い合わせ105件」というFACTだけで終わらず、可能な場合は、どのDecision / ACTと関係するか、Expected Changeに対して実際にどう変化したか、次にDecisionが必要かまで接続する。

## 8. 既存ベンダーを残したままFACTACTを使う選択肢

IT経営KAIZENは、既存ベンダーの全面置換を前提としない。

技術サービスや運用サービスを既存ベンダーに継続して任せながら、そのEvidenceや月次報告をFACTACTへ取り込み、経営判断への翻訳、Decision記録、CHANGE / NEW FACT確認をatLIB / FACTACTが担う構成も正当な選択肢とする。

したがって、Assessment後の選択肢には以下があり得る。

- 現行ベンダー・現行報告をRETAINする
- 現行ベンダーをRETAINし、経営報告・管理のみ改善する
- 現行ベンダーとの契約、SLA、報告内容、委託範囲を改善する
- 一部業務だけ別主体へDELEGATEする
- atLIBへ技術・運用・管理の一部または全部を任せる
- 追加Evidenceを確認してからDecisionする

> **既存サービスを置き換えることではなく、既存サービスを含むIT全体を経営DecisionとKAIZENへ接続することを価値とする。**

## 9. レポート間で禁止する矛盾

Assessment ReportとFACTACT Reportの将来設計・実装では、以下を禁止する。

- AssessmentではFACT / UNKNOWNを分離するのに、FACTACT Reportでは推測をFACTとして表示する
- Assessmentではスコア中心を否定するのに、FACTACT Reportでは総合点・成熟度点を中心にする
- Assessmentでは人間がDecisionするのに、FACTACT ReportではAIがDecisionを確定する
- AssessmentではExpected Changeを予測として扱うのに、FACTACT Reportでは期待値を実績として扱う
- Assessmentでは顧客の選択自由を守るのに、FACTACT ReportではatLIBへの発注を唯一の改善案として扱う
- Assessmentでは技術 × 運用 × 管理を一体で見るのに、FACTACT Reportでは技術監視値だけを成果として扱う
- Assessmentで形成したDecision・根拠と、FACTACT上のACT / CHANGE / NEW FACTの文脈が切断される

## 10. 共通設計テスト

Assessment ReportまたはFACTACT Reportへ情報・指標・グラフ・AI要約・提案等を追加する際は、以下を確認する。

1. これはFACTか、UNKNOWNか、評価か、Hypothesisか、Proposalか、Decisionかが明確か。
2. Evidenceへ遡れるか。
3. Futureまたは過去のDecisionとの関係が分かるか。
4. 経営者が「だから何を判断すべきか」を理解できるか。
5. ACTした場合、後からCHANGE / NEW FACTを確認できるか。
6. 顧客の選択自由を損なっていないか。
7. KAIZENのためだけの余計な報告作業を増やしていないか。

> **レポートの目的は、情報を増やすことではない。事実を、より良いDecisionと次のKAIZENにつなげることである。**
