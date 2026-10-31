# IT経営KAIZEN 販売サービスモデル v1

Status: **CANONICAL — BUSINESS / SELLABLE SERVICE MODEL**

この文書は、Business Laneで確定した「まず売れる形までサービスを単純化する」ための現行販売サービスモデルを記録する。

既存 `docs/24-it-management-kaizen-commercial-service-model-v1.md` のうち、固定商品としての `Core 49.8万円/月`、`Advisory 20万円/月`、およびActor Neutralな継続管理商品を前提とした部分は、**現行の初期販売サービス設計としてはSUPERSEDED** とする。49.8万円等の検討値は、過去の機能・Human Work・価格設計上の参考値としてのみ保持し、初期リリースの販売商品や標準価格として扱わない。

ただし、継続支援後の出口として **FACTACT SaaS利用** および **Advisory** を将来的に正式商品として追加する方針は維持する。初期リリースでは販売体系・営業訴求へ載せることを必須とせず、まず継続支援までを売れる形にすることを優先する。

## 1. 現行の販売サービス体系

まず初期販売開始に必要な体系を次の4段階へ単純化する。

1. **無料IT経営診断**
   - IT経営上の可能性・論点を発見する。
2. **IT経営KAIZEN 設計Assessment**
   - EvidenceからFACT / UNKNOWNで現在地を形成し、経営が次の一手をDecisionできる状態をつくる。
   - 現行標準価格：120万円（税別）。
3. **KAIZEN Project**
   - Decisionされた一度きり、または大きな変更・実装を行う。
   - 個別見積。
4. **IT経営KAIZEN 継続支援**
   - atLIBが合意したIT業務を継続的に運用し、その運用をFACTACT上で行うことで、日常業務からFACTを形成し、管理・KAIZEN・CHANGE確認へつなげる。
   - Scopeと価格はWork Catalog・業務量・責任範囲をもとに設計する。

上記以外の支援は、原則として **別途相談 / 別途見積** とする。

## 2. 継続支援の基本原則

継続支援は「FACTACTだけを販売する月額サービス」ではない。

> **atLIBが対象業務を実際に継続運用し、その仕事をFACTACTで運用することで、管理とKAIZENまで提供するサービスである。**

FACTACTは継続支援のService Operating Platformとして利用する。

継続支援でatLIBが受託していない業務について、顧客自身または他Vendorが運用することは可能である。しかし、それを理由に「管理だけを行う固定月額サービス」を現時点の標準販売商品として設けない。

Assessmentの結果、顧客自身または既存/他Vendorが継続運用するDecisionが最適であれば、そのDecisionを尊重し、atLIBの継続支援を無理に販売しない。

> **Assessmentの成功条件はatLIBの継続契約獲得ではない。会社にとって適切なDecisionが形成されることである。**

## 3. 継続支援で扱う標準Work領域

継続支援の受託Work Scopeは、まず次の3領域を標準設計対象とする。

### A. Service Desk

人・利用者から発生するIT業務。

例：
- 問い合わせ受付
- 依頼受付
- 一次対応
- 切り分け
- Ticket管理
- Incident受付
- Vendor Escalation
- Knowledge形成・再利用

### B. Business Workflow

Event起点で発生する定型IT業務。

例：
- 入社
- 退職
- 異動
- Device Lifecycle
- Account Lifecycle
- SaaS / License関連業務
- 定型申請・定型作業

### C. Infrastructure Operation

System / Technology起点で発生する継続的な技術運用。

例：
- 監視
- Alert対応
- Patch運用
- Backup確認
- Security運用
- Server運用
- Network運用
- Cloud運用
- 定期Maintenance

Service Desk、Business Workflow、Infrastructure Operationは仕事の性質・必要Capability・原価構造が異なるため、一つの曖昧な `IT Operations BPO` 商品へ統合しない。

## 4. 顧客ごとの違いは受託Work Scope

顧客向けに多数のLite / Standard / Pro等の固定プランを先に作らない。

Assessmentおよび商談で、atLIBが継続的に担うWork Scopeを合意する。

例：
- Service Deskのみ
- Service Desk + 入退社Workflow
- Business Workflowの一部
- Infrastructure Operationの一部
- 複数領域の組み合わせ

ただし、標準Work Catalogの外にある仕事を無制限に月額へ含めない。

> **標準範囲外は別途相談 / 別途見積。**

## 5. FACTACTによる付加価値

atLIBが受託したWorkをFACTACTで運用することで、単なる作業代行で終わらせない。

基本構造：

> **受託Work → FACTACTで運用 → 関連FACT / Current State形成 → 管理 → KAIZEN → ACT → CHANGE確認 → NEW FACT**

例えばService Deskを運用することで、Ticket、Incident、対応履歴、Knowledge、関連するUser / Device / Vendor等の情報が蓄積される。

Business Workflowを運用することで、Device、Account、SaaS、License等のCurrent Stateを最新化するためのFACT / Evidence / Changeが形成される。

Infrastructure Operationを運用することで、Alert、Incident、Evidence、System状態、対応結果等が形成される。

この結果、台帳・管理・Report・KAIZENのために同じ情報を別途作り直す仕事を減らす。

## 6. 継続支援の商品価値

継続支援の価値は、単純なBPO件数処理ではない。

> **仕事を引き受けるだけではなく、引き受けた仕事を継続的に良くしていく。**

日常業務をFACTACTで運用することにより、繰り返し問い合わせ、手作業、停滞、Incident傾向、Vendor依存、管理上のGap等をFACTから確認し、必要なKAIZENへつなげる。

したがって、作業件数を処理するだけのBPOと、KAIZENのためだけに別途調査・集計・Report作成を行うコンサルを分断しない。

## 7. 価格設計

49.8万円/月は、過去に継続管理機能・Human Work等から検討した**価格設計上の参考値**であり、現時点では固定商品 `Core` の標準販売価格として扱わない。

価格は次の順序で決定する。

1. 標準Work Catalogを確定する。
2. 各Workの標準Scopeと責任境界を確定する。
3. 業務量・件数・対応時間・必要Skill等の価格Driverを定義する。
4. FACTACT運用、管理、KAIZEN、Human Review等の共通負荷を算定する。
5. 採算・Scaleを検証する。
6. 顧客向け料金体系を決定する。

> **価格からサービスを逆算しない。サービスを定義してから価格を決める。**

## 8. 将来の商品出口 — SaaS / Advisory

初期リリースでは、継続支援後の出口商品を顧客向け販売体系に必須表示しない。ただし、事業・Productの将来設計として次の2つを正式な商品化候補として保持する。

### A. FACTACT SaaS

顧客自身がFACTACTを利用し、日常WorkからFACT / Decision / ACT / CHANGE / NEW FACT / NEXT KAIZENを継続的に運営するためのSaaS提供。

継続支援を通じて顧客側の運用が標準化・定着し、atLIBによるBPOを必要としなくなった場合の出口の一つとする。

### B. IT経営KAIZEN Advisory

顧客自身が日常運用およびFACTACT運営を主体的に行い、atLIBは経営Review、KAIZEN Review、重要Decisionへの助言等を提供する商品。

継続支援から責任移管が可能になった顧客に対する出口の一つとする。

想定Lifecycle：

> **Assessment → KAIZEN Project / 継続支援 → FACTACT SaaS / Advisory / Self-Run**

すべての顧客をSaaSまたはAdvisoryへ移行させることを目的とはしない。継続支援を長期利用することも、顧客自身で自走することも正しい状態になり得る。

SaaS / Advisoryの具体的な機能、責任境界、移行条件、価格、販売条件は初期リリースの販売開始を遅らせないよう、継続支援の商品化後に別途設計する。

## 9. 当面のBusiness Lane優先順位

新しい思想・商品分岐を増やすより、まず販売可能なサービス仕様を完成させる。

次の順序で進める。

1. Service Desk Work Catalog
2. Business Workflow Work Catalog
3. Infrastructure Operation Work Catalog
4. 各Workの標準提供範囲 / 条件付き範囲 / 対象外を確定
5. FACTACTで形成される管理情報・KAIZEN価値を対応付け
6. 標準業務量・Human Work・価格Driverを定義
7. 料金設計
8. 顧客向けサービス説明 / 営業資料 / 見積体系へ落とす

その他の個別要望・標準外業務は、まず **別途相談 / 別途見積** として扱い、販売開始を遅らせる複雑な商品設計を行わない。
