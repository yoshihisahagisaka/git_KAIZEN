# Controlled Customer Pilot #1 — S社 Management Conversation v1

Status: **BUSINESS EXECUTION / PILOT CANDIDATE — NOT CUSTOMER DIAGNOSIS**  
Date: 2026-09-13

Purpose: IT経営KAIZEN Controlled Customer PilotのPrimary CandidateとしてS社との最初のManagement Conversationを設計する。

重要：本書は顧客診断結果ではない。現時点で確認されたFACTとUNKNOWNを分離し、経営者との会話でFUTUREと追加FACTを確認するための事前Briefである。

> **分からないことを、分かったことにしない。**

---

## 1. Current FACT

- S社の従業員規模は200〜300名。
- IPO準備中。
- atLIBから1名が業務委託で常駐している。
- 常駐者の主な業務はPCキッティング、スマートフォンキッティング、請求書管理、問い合わせ対応。
- 先月まで情報システム部長が在籍していたが退職した。
- 新任の課長候補が着任する。
- 情報システム部は情報システム課となる。
- 情報システム課は、人事部等を所掌する取締役本部長の管掌となる。
- atLIBは当該取締役本部長との接点がある。
- 当該取締役本部長はITの専門知見を多く持つ立場ではない。

## 2. Current UNKNOWN

以下は現時点で断定しない。

- IPO目標時期、現在のIPO準備フェーズ。
- IPO準備においてIT・内部統制・セキュリティ等について既に受けている要求・指摘。
- 取締役本部長が考えるS社の1〜3年後のFUTURE。
- 新しい情報システム課に経営が期待する役割。
- 新任課長候補の役割、権限、IT経験、期待成果。
- 旧情報システム部長から引き継がれた施策、停止した施策、未決定事項。
- 現在のIT戦略、IT予算、システム構成、Security/Governanceの現在地。
- 社内情シス要員・外部Vendorを含むIT Capability全体。
- 現在の常駐支援が今後も最適なActor/Delivery Modelか。
- 設計Assessmentが必要か。
- atLIBが将来のACTを担うべきか。

---

## 3. Why S社 is a Primary Pilot Candidate — PROPOSAL

S社をPrimary Candidateとする理由は社員数だけではない。

現在、以下のBusiness Triggerが同時に存在する。

> **IPO準備**
> → **IT部長退職**
> → **情報システム部から情報システム課への体制変更**
> → **IT非専門の取締役本部長が所掌**
> → **新任課長候補の着任**

これは「既存IT業務を誰が引き継ぐか」だけでなく、

> **これからのS社に必要な情報システム機能をどう設計するか**

というManagement Decisionが発生し得るタイミングである。

ただし、顧客がこのDecisionを課題として認識しているかはUNKNOWNであり、Management Conversationで確認する。

---

## 4. Pilot Business Hypothesis

### HYPOTHESIS H1

既にatLIBをIT実務支援者として認識している既存顧客でも、FUTURE起点のManagement Conversationによって、経営とITを接続する相談相手として新しい価値を認識してもらえる可能性がある。

### HYPOTHESIS H2

IPO準備とIT組織変更が重なる企業では、個別IT課題より先に「今後必要なIT Capability」を経営視点で整理する価値がある可能性がある。

### HYPOTHESIS H3

無料IT経営診断が、経営者のFUTUREと現在確認できている情報/UNKNOWNを可視化することで、次に何を確認・Decisionすべきかを明確にできる可能性がある。

これらはPilotで検証する仮説であり、現時点で顧客FACTへ昇格させない。

---

# 5. First 30-minute Management Conversation

## Goal

売ることではない。

> **S社が今後1〜3年で実現したいFUTUREと、新しい情報システム機能に対する経営の期待を確認し、次に確認すべきことがあるかを判断する。**

Assessment受注、Managed Service受注、既存常駐契約の変更をMeeting Goalにしない。

## 0–5 min — Why this conversation

Opening example:

> 「情報システム部長のご退職と新しい体制への移行を伺っています。弊社も現在、実務面では支援させていただいていますが、今回は個々の業務や常駐支援の話とは一度切り離して、今後S社として情報システム機能をどうしていくのが良いのか、経営側のお考えを一度伺えればと思っています。」

> 「ITの専門的な話からではなく、IPOも含めて、これから1〜3年で会社をどうしていきたいかというところから整理したいと考えています。」

### Do not say

- 「IPOにはこのシステムが必要です」
- 「IT統制が弱いと思います」
- 「情シスを弊社に任せてください」
- 「今の常駐をManaged Serviceへ変えましょう」
- 「Assessmentが必要です」

Evidenceなしで結論を先に置かない。

---

## 5–13 min — FUTURE

Primary questions:

1. 「IPOも含めて、今後1〜3年でS社をどのような会社にしていきたいとお考えですか？」
2. 「その中で、社員の働き方や会社のITに期待していることはありますか？」
3. 「新しい情報システム課には、経営としてどんな役割を担ってほしいですか？」
4. 「単に今までの業務を止めずに引き継ぐことと、今後に向けて変えていきたいことは、何か分かれていますか？」

Capture as Customer-stated FUTURE. Operator interpretationを混ぜない。

---

## 13–21 min — Current FACT / UNKNOWN

Conversation prompts:

5. 「部長のご退職に伴って、引き継ぎが必要になっている施策や、いったん止まっている話はありますか？」
6. 「新しく着任される課長には、どこまでを期待されていますか？」
7. 「IPO準備の中で、ITやセキュリティ、内部統制について、すでに確認や対応を求められていることはありますか？」
8. 「現在、経営側から見てITについて“状況がよく分からない”と感じる部分はありますか？」
9. 「逆に、今の体制で十分うまくいっていると感じている部分はありますか？」

重要：問題を作らない。うまくいっているFACTも取得する。

---

## 21–26 min — GAP / Management Decision

Do not diagnose yet. Reflect back only what was heard.

Example:

> 「今日伺った範囲では、S社が目指している方向は○○で、一方で新しい情報システム課については○○がまだ確認できていない、という理解です。ここは合っていますか？」

Then:

10. 「この状態で、新しい体制について経営として次に決めなければならないことは何だと思われますか？」
11. 「その判断をするために、今足りていない情報は何でしょうか？」

Customer correctionを優先する。

---

## 26–30 min — Next Step

If there is meaningful UNKNOWN/GAP:

> 「ここで私たちが推測して“こうすべきです”と決めるより、一度、S社が目指す姿と現在分かっていること・分かっていないことを整理して、次に何を確認すべきかを見える形にした方がよいと思います。」

> 「現在準備しているIT経営KAIZENの無料IT経営診断で、その整理を一度させていただくことは可能です。何かを弊社へ発注いただく前提ではありません。」

If no meaningful GAP is identified:

無料診断へ無理につなげない。

> 「現時点では大きな確認事項はなさそうです。必要なタイミングが出たときに改めて整理しましょう。」

Commercial Neutralityを守る。

---

# 6. Meeting Exit Record

Meeting終了直後に以下を記録する。

## FUTURE
Customerが実際に述べた1〜3年後の会社像。

## FACT / OBSERVATION
Customer statement / existing evidence / known relationship factsを区別して記録。

## UNKNOWN
判断に必要だがまだ確認できていないこと。

## HYPOTHESIS
atLIB側の解釈は必ず仮説として分離。

## NEXT DECISION
顧客が次にDecisionすべきこと。

## NEXT ACTION
- No Action
- Free Diagnosis
- Additional Fact Collection
- Other

---

# 7. Pilot Evidence to Capture

S社で最低限検証する。

1. FUTURE起点の質問に経営者が自然に答えられたか。
2. 既存常駐支援の会話とIT経営KAIZENの会話の違いが伝わったか。
3. FACT / UNKNOWNの整理に経営者が価値を感じたか。
4. IPOを煽らなくても経営×ITのConversationが成立したか。
5. NEXT DECISIONが明確になったか。
6. 無料診断への移行理由を顧客が理解したか。
7. Assessmentを説明する前に、Evidence確認の必要性が顧客側から生じるか。
8. atLIBへの実行発注を前提にしなくても価値が成立したか。
9. 顧客から出た違和感・反論・Correction。
10. atLIBに対する認識変化を示すCustomer statementがあったか。

---

# 8. Pilot Guardrail

Development LaneのControlled Customer Pilot判定がGOまたは許容条件を明示したCONDITIONAL GOになるまで、実顧客を未承認の診断Systemへ投入しない。

Management Conversation自体はSystem Pilotとは分離して準備・実施可能だが、顧客情報のシステム入力は最新Production Readiness Decisionに従う。

---

# 9. Current Business Decision

S社は現時点で：

> **Controlled Customer Pilot #1 — Primary Candidate**

として扱う。

これはAssessment受注、実行支援受注、既存常駐契約変更のDecisionではない。

最初の目的は：

> **FUTUREから経営Conversationを始めることで、S社にとって本当に次のIT経営Decisionが存在するかをFACTで確認すること。**
