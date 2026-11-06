# FACTACT｜顧客・社内・外部運用Actorの認証／権限 Fit/Gap（2026-11-06）

Status: **Read-only Fit/Gap / Implementation decision pending.** 本書は既定のBusiness Decisionを再設計せず、現行Git（SUPPORT共通受付 Draft PR #23 相当）との具体的差分を記録する。外部ユーザーへの権限付与、Migration、デプロイは本書の対象外。

## 1. 既に確定している前提（再決定しない）

1. **Actor Neutrality**：運用・改善の実行者はatLIBに限定しない。顧客社員、既存ベンダー、他ベンダー、複数者による実行が可能で、実行Actorの交代のみで継続KAIZEN支援の商品性を変えない。根拠：`docs/80-it-management-kaizen-execution-actor-choice-and-management-observability-principles-v1.md` §2、`docs/85-it-management-kaizen-continuous-support-operating-model-v1.md` §2「Actor Neutrality and Continuity — DECIDED」。
2. **問い合わせ者と運用者は別**：問い合わせは電話・フォーム等から入る。受付の「所属／名前」は会員・社員に限定しない。ベンダー等からの入電や所属の新規入力も共通フローで受ける。フォーム送信者を認証済み運用Operatorと同一視しない。根拠：`docs/support-service-affiliation-registration-fit-gap-20261105.md`（2026-11-06 clarification）。
3. **対応の実施・閲覧・記録は権限で決まる**：atLIB運用者だけでなく、権限ある顧客情シス担当者や外部実施者も担える。管理表・手順書等も、権限ある利用者による閲覧・入力・修正が必要。利用者の雇用先だけで一律の機能制限を決めない。
4. **顧客間分離**：顧客に開く画面・データ・検索・参照・書き込みは、許可された自社情報（および明示的に権限付与された範囲）のみに制限する。他社の存在・内容を検索結果等からも漏らさない。
5. **サービス別の特別設計はしない**：SONIX固有のロール、会員フラグでの受付拒否、サービスごとに異なるWork/権限エンジンは作らない。サービス／契約は共通の権限制御のContextであり、利用者の認証とは別概念。

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
| AC-09 | Caller／情報対象の分離 | `callerInputSnapshot`、未検証Observationなどで申告を保存 | `ServiceRecipient`はV1ではCaller Personの技術的リンク。Caller所属を「データ対象顧客」「Service適格者」「閲覧対象」の代用にできない。外部ベンダー申告のWork対象が確実に識別されるか要確認 | **GAP** |
| AC-10 | Workと責任の分離 | Domain／implementation contractはOwnerとAction Actorの非同一性を規定。SUPPORTにはWork、recordedBy、Audit履歴あり | 現行の`workOwnerOperatorId`等はTenant内Operatorを前提とし、顧客／外部Actorへの委任・引継ぎ・個別Action権限のE2E証跡は見つからない | **PARTIAL** |
| AC-11 | 管理表・手順書・知識 | Registry／Knowledge Candidate等の基盤概念とSupport Knowledge Candidateの保存処理は存在 | 今回照合したSUPPORT／Explore／JOINスライスに、顧客が共有管理表・手順書を権限内で編集するE2E画面／APIの証跡なし。全Repository未実装との断定ではなく、対象機能の棚卸しが必要 | **UNVERIFIED / GAP候補** |
| AC-12 | 回帰・監査 | 既存テストにはTenant横断拒否、Roleなし拒否、SUPPORT操作Audit等がある | 顧客Aが顧客Bを見られないこと、同TenantにA/B、外部ベンダー参加、複数Tenantに関わるatLIB担当者、検索／直接ID指定の拒否の結合テスト不足 | **GAP** |

**重大な境界**：現行の「内部Operator向けTenant内横断閲覧」へ顧客アカウントを登録するだけの実装は、同一Tenantの他社データ漏えいにつながり得る。外部アクセス公開前に、UIだけでなくQuery／Command／検索／Repositoryでfail-closedの許可判定が必要。

## 4. 継承済みDecisionと、実装前に解決する限定論点

以下は**Actor Neutrality／サービス共通化の再設計ではない**。既存Core・現在のデータモデルに対し具体的なAuthority Contextを接続するための契約Fit/Gapである。

| ID | 確認が必要な具体事項 | 確認理由／既定の制約 |
| --- | --- | --- |
| AUTH-G1 | `Customer Workspace`、`Tenant`、`Organization`、`Service`、対象Workのデータ帰属をどう対応付けるか | 1 Tenantに複数所属（例：顧客企業・会員企業・ベンダー）が存在するため、Callerの`organization_id`で顧客の所有範囲を決めない。既存Concept/Decisionとの整合だけを確認する |
| AUTH-G2 | atLIB担当者／顧客担当者／委託先の、所属先と委任先Contextの解決・選択方法 | 現行の1 Operator＝1 Tenantログインを跨ぐ必要がある場合がある。認証（誰か）と許可（どの顧客・サービス・機能か）を区別する |
| AUTH-G3 | 「閲覧／受付／対応記録／更新／レビュー／管理表・手順書修正」ごとの対象範囲 | Roleだけでなく、サービス・契約・Work／文書への許可範囲を明示する。`executeRoles`をRead権限に流用しない |
| AUTH-G4 | 電話代理入力と外部問い合わせフォームの識別・Audit | CallerをログインOperatorに昇格させない。無認証の問い合わせ入口が内部データ参照権限を持たないようにする |
| AUTH-G5 | 管理表・手順書・Knowledgeの現行Object/UI/API実装状況 | 新規Core Objectを先に設計せず、利用可能なRegistry／Evidence／Knowledge等と既存ドキュメントを棚卸しする |

必要となる判断は、上記を既存Canonical・ADR・Decision Logの記録と照合して**実装可能な契約へ明文化すること**に限る。既存のものがあればそのまま採用し、未確定部分だけDecisionとして起票する。

## 5. 次の技術作業と受け入れ条件（提案、未実施）

1. AUTH-G1〜G5をGit/Canonical/ADRと突き合わせ、既存の定義で足りる項目をCloseする。残項目のみ具体的なReview／Decisionにする。
2. 既存認証・Tenant RLSを維持しつつ、許可された顧客ContextでだけQuery／Command／検索／文書更新が可能な層を、既存Coreを用いて実装する。SONIXなどのService固有権限分岐を作らない。
3. 少なくとも次を自動検証する：`Customer A`と`Customer B`の完全分離（**別Tenantと同Tenant別Organizationの双方**）、顧客Aの直接ID指定によるB閲覧・更新拒否、横断検索・KnowledgeでBが露出しないこと、顧客Aの許可Action実行、外部ベンダーの**明示的委任の有無**、atLIBの複数顧客Context切替、受付CallerとOperatorの区別、Role失効・委任失効・監査。
4. 既存の内部Operator向けSUPPORT／JOINのGolden動作とAuditを維持する。テストがない機能・管理表は先に現状を棚卸しする。外部顧客への公開／本番移行は別の承認Gateとする。

## 6. 今回の変更範囲

**Fit/Gap記録のみ。** 既存Canonicalの変更、新しい商品区分／サービス特別設計、権限付与、Database Migration、コード修正、API公開、本番デプロイ、実顧客アカウント作成は行っていない。
