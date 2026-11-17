# IT経営KAIZEN × FACTACT — 初期登録情報から日常WorkによるFACT形成のBusiness Decision（2026-11-17）

Status: **BUSINESS DECISION — ACCEPTED; PRODUCT CONTRACT FIT/GAP REQUIRED**
Owner: IT経営KAIZEN Business Lane
Related: docs/20-it-management-kaizen-factact-consistency-principles-v1.md, docs/25-factact-multiview-connection-ai-off-principles-v1.md, docs/factact-product-operating-principles-v1.md, docs/87, docs/90, docs/91; FACTACT Device import Product Contract review (2026-11-17).

## 1. Decision — Initial information is not automatically verified reality
Assessmentで顧客の資産管理表等から取り込む情報は、**出所が明確な初期登録情報**としてFACTACTに構造化する。取り込んだ時点で現物や現況までVERIFIEDとみなさない。全項目・全機器の実査が完了するまで初期登録を止めることも要求しない。

初期登録のためのHuman Review / authorized Commitと、記載内容の現実との一致を確認するFACT verificationは**別の意味**である。前者は「この出所の情報を正規の登録情報として採用する」判断であり、後者は「確認された範囲・時点・根拠で実態と一致する」判断である。

## 2. Work-driven verification — DECIDED
FACTACTは日々の仕事でFACTが形成・更新されるシステムとする。

例：
1. Assessmentで顧客管理表からDevice識別情報等を出所付きで初期登録（未検証）。
2. 問い合わせ時に対象機器を特定し、当該Workで必要な情報を確認。
3. 登録情報と実際に確認した内容を照合。
4. 一致した**項目のみ**、確認元・Actor・日時・範囲を伴うVERIFIED FACTへ移行。不一致なら訂正提案またはUNKNOWN／追加確認へ。
5. 棚卸・実査・信頼できる管理システム照合も同様のFACT確認機会とする。

問い合わせで管理番号・利用者を確認しても、未確認のOS・購入日・他のRelationまで検証済みにしない。単なる問い合わせ受付、対象選択、登録値の閲覧だけで自動検証しない。Work ContextとRegistry FACTの区別を維持し、確認の記録・正規の検証／変更権限を守る。

## 3. No extra work / no false certainty — DECIDED
- 全件棚卸を初期登録・問い合わせ開始の前提にしない。
- 業務中に確認した内容を、別台帳や別画面へ二重入力させない。既存Work/Evidence/Observationを再利用し、必要な確認・承認だけ求める。
- 初期情報の未確認は「無い」「誤り」「ゼロ」と同一視しない。必要な仕事に影響するUNKNOWNを優先して確認する。
- 取込元の「利用中」「稼働中」を、JOINで割当可能性を表す`AVAILABLE`へ機械的に変換しない。
- Deviceの業務状態と情報の検証状態を分離する。未検証Deviceを安全に保持できる表現が必要だが、具体的なDB列・状態値・ProjectionはProduct Laneで設計する。
- Device帰属は顧客Organizationの境界で扱い、Tenantだけで顧客同一性を推定しない。Relation（主利用者など）は独立に確認する。
- 「初期情報として参照可能」と「運用上の実行・割当・変更判断に使用可能」を分け、未検証値が権限や実行条件を誤らせない。

## 4. Product Lane request — bounded design
1. 既存Device schemaの必須状態値と初期未検証情報を矛盾なく保持する方法（必要なら既存Coreの最小限の拡張案）をFit/Gapで比較する。
2. Source claim / accepted registry information / verified FACT の区別、項目単位のprovenance・verification scopeを既存Fact/Evidence/Observation/Changeで表現する。
3. 問い合わせ・棚卸で得た確認結果から、余計な人手操作を増やさず、正規の権限とChange→Verify→Commitを経て必要な情報のみを更新する契約を提案する。
4. 既存JOIN/SUPPORT/Registryの利用条件と、未検証情報が割当可否・実行判断へ混入しない安全性を検証する。
5. Deviceの顧客Organization帰属、重複キー、二人検証、Audit/tenant scopeとの整合を維持する。
6. FIT/GAP/CONFLICT/UNKNOWN、最小変更案、受入テスト、残るBusiness Decisionを返す。既存PRの変更、実装、Migration、DB、GCP、Productionは別Goまで行わない。

## 5. Scope and precedence
This decision clarifies docs/87 and docs/90 without undoing their approved six directions. The 2026-11-17 Device Product Contract review is a candidate, not an authorized implementation contract. Product Lane owns HOW; Business Lane owns WHAT/WHY. No new generic Core Object or verification score is mandated.
