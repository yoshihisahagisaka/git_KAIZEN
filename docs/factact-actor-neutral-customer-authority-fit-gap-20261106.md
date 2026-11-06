# FACTACT｜顧客・社内・外部運用Actorの認証／権限 Fit/Gap（2026-11-06）

Status: **Read-only Fit/Gap / Initial-release scope clarified; Canonical and code reconciled.** 本書は既定のBusiness Decisionを再設計せず、現行Git（SUPPORT共通受付 Draft PR #23 相当）との具体的差分を記録する。権限付与、Migration、デプロイは本書の対象外。

## 1. 既に確定している前提（再決定しない）

1. **Actor Neutrality**：運用・改善の実行者はatLIBに限定しない。顧客社員、既存ベンダー、他ベンダー、複数者による実行が可能で、実行Actorの交代のみで継続KAIZEN支援の商品性を変えない。根拠：`docs/80-it-management-kaizen-execution-actor-choice-and-management-observability-principles-v1.md` §2、`docs/85-it-management-kaizen-continuous-support-operating-model-v1.md` §2「Actor Neutrality and Continuity — DECIDED」。
2. **問い合わせ者と運用者は別**：問い合わせは電話・フォーム等から入る。受付の「所属／名前」は会員・社員に限定しない。ベンダー等からの入電や所属の新規入力も共通フローで受ける。フォーム送信者を認証済み運用Operatorと同一視しない。根拠：`docs/support-service-affiliation-registration-fit-gap-20261105.md`（2026-11-06 clarification）。
3. **対応の実施・閲覧・記録は権限で決まる**：atLIB運用者だけでなく、権限ある顧客情シス担当者や外部実施者も担える。管理表・手順書等も、権限ある利用者による閲覧・入力・修正が必要。利用者の雇用先だけで一律の機能制限を決めない。
4. **顧客間分離**：顧客に開く画面・データ・検索・参照・書き込みは、許可された自社情報（および明示的に権限付与された範囲）のみに制限する。他社の存在・内容を検索結果等からも漏らさない。
5. **サービス別の特別設計はしない**：SONIX固有のロール、会員フラグでの受付拒否、サービスごとに異なるWork/権限エンジンは作らない。サービス／契約は共通の権限制御のContextであり、利用者の認証とは別概念。
6. **Tenantと顧客企業は同義ではない**：`docs/99-ai-development-context.md` §§12, 15は、Tenantをセキュリティ分離境界、SONIX配下の数百の会員企業をService Recipientと定義する。顧客・会員企業の数だけTenantを作る設計は既定ではない。`Tenant → Organization → Service → Contract Profile → Service Recipient`を維持し、汎用の`customer_id`への置換は行わない。

### 初期リリースの完成範囲（2026-11-06 最新確認）

**DECIDED — 初期リリースで作り切る。** SONIX案件の開始は2026年12月以降の見込みであり、残り期間を利用して、**atLIB社員だけでなく権限を持つ顧客担当者・外部委託先も利用できる共通の認証／認可・閲覧／入力／編集機能を初期リリースの完成条件とする**。同時に、顧客が他社情報へアクセスできないことも受け入れ条件とする。

**SONIX現場の利用者配置は別の話**：SONIXの運用開始時に実際の問い合わせ対応をまずatLIB社員が担うという運用方針は維持できるが、**「atLIB社員しか利用できないシステムを先にリリースし、外部利用は後日開発する」という工程分割は行わない**。完成した外部利用機能を、どの顧客・誰にいつ有効化するかは個別の運用開始・権限付与判断であり、開発完了条件の後倒しとは区別する。

**初期リリースで必須の共通機能**：①電話と並ぶ問い合わせフォーム入口、②atLIB／許可された顧客・外部Actorの対応内容閲覧／記録／編集、③許可された管理表・手順書等の確認／更新、④顧客・サービス・機能・操作対象ごとの権限判定、⑤顧客間分離（一覧・検索・直接ID参照・更新を含む）、⑥監査と権限失効の検証。既存Object・UI・契約の実装範囲を確認して不足部分だけを補う。SONIX専用のモデルや分岐は作らない。

この変更は**リリースScope／優先順位のDecision**であって、既定のActor Neutrality・Core semanticsを変えない。現行の内部Operator向けRead Authority v1は外部利用に使えないため、**AC-01〜AC-12とAUTH-G1〜G5のうち初期リリースに関係するGapを、開発と受け入れテストの対象**とする。12月以降は開始見込みであり、具体的な本番日・承認Gateの完了を本書では確約しない。

既存Coreは`Service Owner`、`Work Owner`、`Assignee`、`Next Action Owner`を区別し、`Authority is scoped, not global`とする（`docs/02-domain-model.md`）。`docs/support-round3-phase2-implementation-contract.md` §7は、チーム参加やベンダー所属それ自体では閲覧・Action権限を与えず、明示的な対象範囲／Contract Authorityにより判定する方針を記載済み。これらは新規の権限思想ではない。

## 2. 運用上の役割とシステム権限を混同しない

| 概念 | 意味 | 認証／権限に対する帰結 |
| --- | --- | --- |
| 問い合わせ者（Caller） | 社員、会員企業、顧客、ベンダー、その他。電話・フォームで申告する人 | 受付時の所属・登録状態から、内部システム閲覧権限を推定しない |
| 実施Actor（Operator / Action Actor） | 対応・更新・確認を実行するatLIB、顧客社員、委託先等 | 認証された主体に、対象Contextと操作ごとの許可を確認する |
| Service／Contract | 提供する共通業務の種類と有効な約束・実施条件 | Service選択は操作Contextであり、ログイン認証・データ許可の代用ではない |
| Work Owner／Assignee | 責任を持つ人／実作業の担当。実施Actorと一致しない場合がある | 他者のWorkにActionしても自動で責任Ownerを変更しない |
| データの対象顧客・許可範囲 | 情報がどの顧客業務に属し、誰に開示できるか | 問い合わせ者の所属、`ServiceRecipient`、Service Ownerと自動的に同一と決めない |

SONIXの会員リストにない所属からの問い合わせを受け付けられることは**受付フローの性質**であり、その所属の社員がFACTACTへログインして他社データを読めることを意味しない。外部ベンダーが問い合わせた場合も、対象顧客と申告者の所属は異なり得る。

## 3. 現行実装とのFit/Gap

調査基準：`yoshihisahagisaka/git_KAIZEN`、SUPPORT共通受付 Draft PR #23 の `4871452fcd3f6e7488c10db3582b8ed45f329195` と同一treeのローカル基準。Draft PR #20〜#23は現時点で本番提供済みを意味しない。既存のBusiness Canonical／ADR／support implementation contractは参照資料であり、完成実装という意味ではない。

| ID | 領域 | 確認できたFit（As-Is） | Gap／注意点 | 状態 |
| --- | --- | --- | --- | --- |
| AC-01 | ログイン・主体識別 | Google OIDC／PKCE、明示的identity binding、期限付きsession。メールやドメインによる自動認可なし（`docs/adr/0002-identity-session-authority.md`、`apps/web/src/server/auth/routes.ts`） | `OperatorRef`とsessionは1人1 Tenant。顧客・外部Actorが持つ各Workspace／Service権限や、atLIB担当者の複数顧客Context切替は実装確認できない | **GAP** |
| AC-02 | 既存Role | Tenant内の `ADMIN/OPERATOR/REVIEWER` を保存し、Query時にactive Operatorと現在のRoleを再検証（`apps/web/src/server/persistence/identity-store.ts`） | 役割はTenant単位で、顧客／Service／Workごとの許可集合を表現しない。外部顧客に既存Roleをそのまま付与してはならない | **GAP** |
| AC-03 | Tenant分離 | Postgres RLSはcurrent tenantで絞り、複合FK等でクロスTenant参照を防ぐ（`docs/adr/0003-rls-execution.md`、platform migrations） | 同一Tenantに複数の顧客Organizationsがある場合、Tenant RLS **だけ**では顧客ごとの参照禁止を満たせない | **PARTIAL** |
| AC-04 | 閲覧Authority | `Read Authority v1`は**内部Operatorのみ**、同一Tenant内横断閲覧を明示的に許す（`docs/factact-product-operating-principles-v1.md` §7.1、ADR 0002） | このDecisionは外部利用者へ自動適用しないと明記済み。顧客本人の閲覧境界／委託先の委任権限を実装した証跡はない | **GAP（既存Decisionが留保）** |
| AC-05 | SUPPORT一覧・詳細 | active Operator RoleとTenantを毎回確認（`packages/application/src/support-queries.ts`） | `list()`は同一Tenantの全Person・Organization・SUPPORT Eventを返し、`detail()`はイベントID＋Tenantで関連Work・履歴・Knowledgeを取得。対象顧客／Service許可の判定なし | **GAP / 外部公開STOP** |
| AC-06 | 横断検索 | Exploreはactive Role確認後にOrganization、Person、Device、Service、Work、Knowledge Candidateを同Tenant内検索（`packages/application/src/explore-queries.ts`） | 顧客・外部Actor向けの結果件数、本文、存在推測を含む対象範囲フィルタがない。詳細画面だけを制限しても不足 | **GAP / 外部公開STOP** |
| AC-07 | SUPPORT更新 | active ADMIN/OPERATOR、active Service/Contract、`support.executeRoles`、Audit等が存在（`packages/application/src/support-commands.ts`） | `executeRoles`は契約に記載したRole条件であり、当該顧客・Service・Workへの本人の委任や他顧客アクセス防止は別途必要 | **PARTIAL** |
| AC-08 | Caller登録／入口 | 共通のService→所属（既存・新規）→Person（既存・新規）→問い合わせ、ベンダーを含む受付とUNVERIFIED記録がDraft PR #23で実装 | 現行UIの受付はOperator経由。顧客向けのWeb問い合わせフォーム入口や、外部送信者をOperator扱いしない入口は**このスライスでは未実装** | **PARTIAL** |
| AC-09 | Caller／情報対象の分離 | `callerInputSnapshot`、未検証Observationなどで申告を保存 | `ServiceRecipient`は現行DDLで`recipient_type='PERSON'`のみ、`ensureRecipient`はCaller Personの技術的リンク。既定のSONIX会員企業（Organization）というサービス提供対象を、そのまま表現できない。Caller所属／Caller Recipientを「実際の対象企業」「契約対象」「閲覧許可範囲」の代用にできない | **確認済みGAP／基盤依存** |
| AC-10 | Workと責任の分離 | Domain／implementation contractはOwnerとAction Actorの非同一性を規定。SUPPORTにはWork、recordedBy、Audit履歴あり | 現行の`workOwnerOperatorId`等はTenant内Operatorを前提とし、顧客／外部Actorへの委任・引継ぎ・個別Action権限のE2E証跡は見つからない | **PARTIAL** |
| AC-11 | 管理表・手順書・知識 | Registry／Knowledge Candidate等の基盤概念とSupport Knowledge Candidateの保存処理は存在 | 現行`apps/web/src/client/support-context.tsx`のProcedureは静的デモであり、正式な手順書／FAQ検索は将来拡張と明記されている。現行のSUPPORT／Explore／JOIN UI/APIには、権限を持つ顧客・外部Actorが共有手順書を閲覧／編集するE2E機能がない。Registry／Knowledgeの既存資産を再利用し、操作対象と公開範囲を実装する必要がある | **確認済みGAP** |
| AC-12 | 回帰・監査 | 既存テストにはTenant横断拒否、Roleなし拒否、SUPPORT操作Audit等がある | 顧客Aが顧客Bを見られないこと、同TenantにA/B、外部ベンダー参加、複数Tenantに関わるatLIB担当者、検索／直接ID指定の拒否の結合テスト不足 | **GAP** |

**重大な境界**：現行の「内部Operator向けTenant内横断閲覧」へ顧客アカウントを登録するだけの実装は、同一Tenantの他社データ漏えいにつながり得る。外部アクセス公開前に、UIだけでなくQuery／Command／検索／Repositoryでfail-closedの許可判定が必要。

## 4. 継承済みDecisionと、実装前に解決する限定論点

以下は**Actor Neutrality／サービス共通化の再設計ではない**。既存Core・現在のデータモデルに対し具体的なAuthority Contextを接続するための契約Fit/Gapである。

| ID | 確認が必要な具体事項 | 確認理由／既定の制約 |
| --- | --- | --- |
| AUTH-G1 | `Tenant`／`Organization`／`Service`／`Contract Profile`／`Service Recipient`／Workの帰属を、既定のCoreに沿って物理表現する | **概念上の対応はCanonicalで解決済み**。`docs/99` §§12,15によりTenant≠顧客、SONIX会員企業はService Recipient。残GapはV1の`PERSON`専用DDL、Caller Personとの同一化、受益企業・対象Work・閲覧範囲を正しく結ぶ物理実装。サービス固有の別モデルは作らない |
| AUTH-G2 | atLIB担当者／顧客担当者／委託先の、所属先と委任先Contextの解決・選択方法 | 現行の1 Operator＝1 Tenantログインを跨ぐ必要がある場合がある。認証（誰か）と許可（どの顧客・サービス・機能か）を区別する |
| AUTH-G3 | 「閲覧／受付／対応記録／更新／レビュー／管理表・手順書修正」ごとの対象範囲 | Roleだけでなく、サービス・契約・Work／文書への許可範囲を明示する。`executeRoles`をRead権限に流用しない |
| AUTH-G4 | 電話代理入力と外部問い合わせフォームの識別・Audit | CallerをログインOperatorに昇格させない。無認証の問い合わせ入口が内部データ参照権限を持たないようにする |
| AUTH-G5 | 管理表・手順書・Knowledgeの現行Object/UI/API実装状況 | 新規Core Objectを先に設計せず、利用可能なRegistry／Evidence／Knowledge等と既存ドキュメントを棚卸しする |

必要となる判断は、上記を既存Canonical・ADR・Decision Logの記録と照合して**実装可能な契約へ明文化すること**に限る。既存のものがあればそのまま採用し、未確定部分だけDecisionとして起票する。

### 4.1 照合によってCloseした内容と、未決定の実装契約

| 内容 | 照合結果 | 実装上の意味 |
| --- | --- | --- |
| Tenantを顧客企業数で分割するか | **既存Canonicalで解決**：Tenantは顧客企業と同義ではなく、SONIX会員企業はService Recipient | 同一Tenant・同一Service配下でも会員企業間を分離。Tenant RLSだけでは足りない |
| Callerが情報対象・権限付与先か | **既存Canonicalで解決**：Caller、Service Recipient、Operator、Work Owner、Action Actorは別概念 | 外部ベンダーの電話・フォーム送信でも、その所属にデータ権限を推定付与しない |
| ActorがatLIBに限られるか | **既存Business Decisionで解決**：Actor Neutrality | 顧客情シス・既存ベンダー・他社委託先が権限に応じ実施／閲覧／更新できることを初期リリースで検証 |
| 外部ActorのRead Authority | **未決定の実装契約**：ADR 0002のRead Authority v1は内部Operatorのみ、明示的に外部を未決定とする。`support-round3-phase2-implementation-contract.md` §7はService/Contractおよび明示的に認可されたグループ範囲を要求 | 「自社のみ」の対象範囲と、サービス全体／個別Work／文書を明示的に委任する範囲の表現・失効・契約有効性検証を確定。既存Roleを外部へ流用しない |
| 複数Tenantを扱う同一実施者 | **未決定の技術契約**：ADR 0002は初期Operator＝単一Tenantとし、複数Tenant所属／選択を後続Decisionに留保 | Google OIDCの厳格なIdentity bindingを維持しながら、明示的に付与されたTenant／ServiceのContext選択を設計・検証する |
| サービス提供対象の組織表現 | **確認済み物理GAP**：`20260909000200_join_slice.sql`はService Recipientを`PERSON`に限定。SUPPORTもCaller Personを結ぶ | 企業単位の情報境界と実際の提供対象を、既存CoreのService Recipient意味に沿って表現可能にする。既存JOIN/SUPPORTのPerson結合は後方互換を守る |
| 管理表／手順書編集 | **確認済み機能GAP**：静的デモProcedureとKnowledge Candidateはあるが、権限付きの正式文書／管理表E2Eではない | 既存Registry／Knowledgeの使える部分を確認し、Read/UpdateとAuditを完成させる |

**依存関係上のSTOP**：上記二つの「未決定の実装契約」を、内部Operator向けRoleから推測してコードに固定しない。これは初期リリースの開発を延期する判断ではなく、誤った権限を作らず先行して実装・テストを進めるためのGateである。現行の内部向けQueryを顧客アカウントへ開放することは禁止する。

### 4.2 初期リリースの具体的な負例（先にテスト契約化）

1. **同一Tenant・同一Serviceの会員企業A/B**：A担当者によるBの一覧、検索、件数、直接ID取得、Work履歴、Knowledge／文書、変更をすべて拒否する。AのCallerがB所属ベンダーでも、Caller所属を根拠にBへの権限を与えない。
2. **権限を持つサービス提供会社の担当者**：明示的な委任によりService全体を扱える場合と、会員企業・Work単位で委任される場合を分ける。権限未付与の同一Tenant内Serviceにはアクセスできない。
3. **複数顧客を扱うatLIB／外部委託先**：認証済み本人が許可されたContextだけを選択でき、未許可Tenant／ServiceへContextを書き換えても通らない。1人のActorが複数者のWorkを実施してもOwnerは変更されない。
4. **申告者と受益者が異なる問い合わせ**：電話代理入力とフォーム送信を区別し、申告の所属・メールアドレス・会員名簿照合のみでは内部システムへのアクセスを一切付与しない。
5. **権限の変更・失効**：Role、委任、契約失効、所属変更の後、既存Sessionによる再読込／直接ID／更新が拒否され、許可範囲外の存在も推測できない。
6. **文書・管理表と監査**：許可された担当者のみ共有範囲内の更新ができ、無許可者の読み／書きは拒否される。実施Actor、委任Context、更新前後の履歴、時刻を追跡できる。

## 5. 次の技術作業と受け入れ条件（提案、未実施）

1. **物理対象／帰属の解決（先行）**：既存Canonicalの`Tenant → Organization → Service → Contract Profile → Service Recipient`を実装Contractへ落とし、Person専用RecipientとCallerの結合を解消できる後方互換変更範囲を確定。SONIX会員企業をTenant数で表現しない。
2. **認証と明示的Context／Read Scope**：ADR 0002の留保二点（外部Read Authority、複数Tenant所属／選択）を狭い技術Decisionとして解決し、Google OIDC／Sessionの既存安全境界を保ったまま、各Actorの許可されたTenant／Service／対象範囲／操作の評価を実装する。
3. **Query／Command／横断検索を閉じる**：既存のTenant RLSを維持し、対象組織／Service Recipient／Work／文書への許可をQuery結果・件数・個別ID・関連データ・Commandの全経路で評価する。内部Operator v1のTenant内横断閲覧を外部利用者へ流用せず、サービス固有分岐は作らない。
4. **フォームと共同運用機能**：電話代理入力と分離した問い合わせフォーム、顧客／外部ActorのSUPPORT閲覧・記録・修正、管理表・正式手順書の権限内参照・更新、AuditをE2Eで実装する。未検証のCaller申告は認証・契約適格性の根拠にしない。
5. **初期リリースのE2E受け入れ**：§4.2の負例、別Tenantの拒否、atLIB社員の受付→対応記録、既存JOIN/SUPPORTのGolden動作・Auditを検証する。**必要機能の実装・負例検証を初期リリース完了条件とし、本番デプロイ・実顧客への権限付与は別途承認Gate**とする。

## 6. 今回の変更範囲

**Fit/Gap記録のみ。** 既存Canonicalの変更、新しい商品区分／サービス特別設計、権限付与、Database Migration、コード修正、API公開、本番デプロイ、実顧客アカウント作成は行っていない。
