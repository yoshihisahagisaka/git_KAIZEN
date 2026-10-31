# 無料 IT経営診断 Production Readiness Gate v1.0

Status: **VALIDATION COMPLETED — NO-GO / REMEDIATION REQUIRED**

この文書は、無料 IT経営診断 MVP Vertical Slice 1〜6 完成後の **Production Readiness / Pilot Readiness Gate** の実施結果を記録する。

設計SSOTは `yoshihisahagisaka/git_KAIZEN`、実装・検証先は `yoshihisahagisaka/atlib-sales-tools`。

## Gate Completion Record

- Gate branch: `feat/it-management-diagnosis-production-readiness`
- Final reviewed commit: `e59583720a7b84259a28ec12bbcf0c6d28f4e507`
- Merged to `atlib-sales-tools/main`: 2026-09-13
- Gate execution/review quality: **PASS**
- Production deployment verdict: **NO-GO**
- External Pilot verdict: **NO-GO**
- Canonical deviations: **None**

重要：mainへの反映は、readiness hardening・migration artifact・test・runbookを今後の基準実装へ取り込むためであり、**Production/Pilot GOを意味しない**。

> **FACT FIRST.**
>
> **分からないことを、分かったことにしない。**
>
> **Production Readinessも、推測ではなくEvidenceで判定する。**

## Gate Matrix — reviewed result

| Gate | Result | Current conclusion |
|---|---|---|
| A Build / Runtime | **FAIL** | local artifact/buildは成功。Node 20 EOL対応が未完了。 |
| B Migration / DB | **BLOCKED_EXTERNAL** | local実PostgreSQLで001〜012、additive更新、rollback/rerun/restoreを確認。実Cloud SQL / production clone相当Evidence未完了。 |
| C Environment / Secrets | **BLOCKED_EXTERNAL** | fail-fast等は確認。実Secret Manager/IAM/production injection未確認。 |
| D Real Anthropic AI-01〜04 | **BLOCKED_EXTERNAL** | 実API成功0回。fake/invalid/timeout/Human Gateのみlocal確認。 |
| E Google Workspace OAuth | **BLOCKED_EXTERNAL** | local contract PASS。実Google OAuth未確認。 |
| F Cloud Run Worker | **BLOCKED_EXTERNAL** | DB lease/claimは確認。request外CPU、min instances、scale-to-zero、deploy中断等の実設定Evidenceなし。 |
| G PostgreSQL concurrency | **PASS** | 実PostgreSQL・複数connectionでclaim/lock/lease/conflict/immutabilityを確認。 |
| H Security / Privacy | **FAIL + BUSINESS_DECISION_REQUIRED** | auth/log hardening済み。ただし依存、proxy/rate limit、DB権限等の残課題とprivacy未決定あり。 |
| I Observability | **BLOCKED_EXTERNAL** | safe structured events/read-only query/runbookあり。外部alert/受信確認なし。 |
| J Backup / Runbook | **BLOCKED_EXTERNAL** | local restore/runtime接続成功。Cloud SQL restore/traffic rollback未実証。 |
| K Pilot E2E | **BLOCKED_EXTERNAL** | local WEB/SALES_VISIT完走。実staging + real AI/OAuth/notificationは未完走。 |

## Hardening accepted into main

今回のGateで以下のreadiness改善を基準実装へ取り込んだ。

- Runtime containerと専用Migration artifactを分離。service startup時にmigrationを自動実行しない。
- Migration runnerにPostgreSQL advisory lockを導入し、SQLとmigration ledgerをtransactionで扱う。
- OAuth state JWTとstaff session JWTの用途を分離し、payload/algorithmを検証。
- returnTo制限、Google Workspace server-side確認、Cookie/OAuth headerのログ露出対策。
- malformed/oversized request時にRaw body/errorをログへ出さない安全なerror handling。
- production config fail-fastとSecret品質の最低限検証。
- Slack timeout/secret-safe error handling。
- production readiness security/PostgreSQL tests、read-only monitoring SQL、運用runbook。
- high severity dependency findingの一部解消。残存findingは未解消として保持。

## Open Technical / External Blockers

以下はGO判定前にEvidenceを揃える。

1. Node 20 EOL対応とsupported LTSでのruntime/依存/接続再検証。
2. 残るmoderate dependency findingの到達性・更新方針確認。
3. Cloud Run ingressにおけるtrust proxy / X-Forwarded-For実検証とrate-limit方式確定。
4. Production DB権限最小化、migration role / runtime role / audit保護の確認。
5. 実Secret Manager / IAM / production URL / secret injection。
6. 実Anthropic AI-01〜AI-04成功Evidence。
7. 実Google Workspace OAuth / redirect / 非許可account拒否Evidence。
8. Cloud Run Workerのrequest外CPU、scale-to-zero、multi-instance、deploy/shutdown時lease recovery。
9. Cloud Monitoring等のalertと実受信確認。
10. Cloud SQL backup/PITR/restoreとapp revision/traffic rollback。
11. stagingでWEB / SALES_VISIT双方をreal AI/OAuth/notification込みで完走。
12. pilot owner / monitoring / incident contactの確定。

## Business Decision Required — Product Owner

以下は実装者が独断で数値・ポリシーを設定してはならない。

### BD-01 Raw diagnosis data retention

対象：SurveyResponse、SourceRecord、Interview statement、Operator note、Transcript等。

決めること：
- Raw dataを何年間保持するか。
- Transcriptだけ短くするか、Raw dataを共通期間にするか。
- Assessment受注/辞退/Case Close後で期間を変えるか。

### BD-02 Customer deletion / anonymization

決めること：
- 顧客から削除依頼を受けた場合の削除・匿名化・制限保存の条件。
- immutable Report/Handoff/Auditとの整合。
- backupに残るデータの扱い。
- 受付者、承認者、実行者、完了記録。

### BD-03 AI input/output and Transcript policy

決めること：
- AIへ送信するRaw/Transcriptの範囲。
- AI input/output/failed raw responseをどこまで保持するか。
- 顧客へのAI利用説明・同意/通知方針。
- Transcriptを標準保存するか、必要時のみ保存するか。

### BD-04 Backup retention / RPO / RTO

決めること：
- backup保持期間。
- 許容データ損失（RPO）。
- 許容復旧時間（RTO）。
- pilotと一般提供で同じ基準にするか。

これらのBusiness DecisionがCanonicalへ記録されるまでは、Gate HをPASSへ変更しない。

## Next Development Lane Target

Active targetは新機能開発ではなく **Production Readiness Remediation / External Evidence Closure**。

進行順序：

1. Product OwnerがBD-01〜BD-04を決定しCanonical化する。
2. Platform/Security/Maintainerがtechnical findingsのowner/due dateを確定する。
3. 認証済みstagingを準備する。
4. 実AI / OAuth / notification / Worker / Cloud SQL restore / Monitoringを検証する。
5. WEB / SALES_VISIT E2Eをstagingで再実施する。
6. Gate A〜KをEvidence付きで再判定する。
7. **GOまたは限定条件を明示したCONDITIONAL GOになるまで顧客投入しない。**

## Historical Gate Contract

Gateの詳細要求、Definition of Done、Completion Report Formatはこの文書のGit history上のREADY FOR CODEX版および実装repoの `docs/it-management-diagnosis-production-readiness.md` / runbookに保持される。

今回のNO-GO記録は、CanonicalのBusiness境界、FACT FIRST、Human Decision、無料診断とAssessmentの境界を変更しない。
