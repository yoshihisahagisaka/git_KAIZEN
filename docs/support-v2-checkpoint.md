# SUPPORT Human-usable V2 checkpoint

## Round 3 Phase 1 notice — design update only

更新理由（2026-09-11）: Human Review Round 3により、登録Factと今回対象の区別、
FACT Confirmation / Situation Triageの分離、未解決Workの継続・Ownership、
My/Team/Follow-up Views、Human Knowledge Reviewを正本へ反映した。
[docs/17のRound 3原則](17-factact-ux-translation-layer.md)と
[docs/18のProduct原則](18-operator-work-context-v1.md)を以後の設計の基準とする。
[21項目のCore Fit/Gap・Phase 2案](support-round3-core-fit-gap.md)を追加した。

以下に記録されたV2の4段階操作・テスト結果は過去checkpointの実装記録であり、
Round 3の実装完了を意味しない。今回のPhase 1でUI/API/Domainコード/schemaは変更しない。
特に現行V2は登録PCを表示するだけで今回対象を構造化確認できず、未解決結果でも
completion操作がWorkを閉じる。これを次Phaseで修正する計画とし、既存データを
対象確認済みに自動backfillしたり、過去の完了を推測で再解釈したりしない。

Knowledge demo dataの文字化けはHuman Review指摘として次Phaseの調査・修正対象に登録。
Historyに内部作成/担当決定イベントを並べる現在の表示も、業務変化→Audit→Technical
の3層へ見直す。元データは保持する。新Core Objectは追加せず、migrationも実行しない。
Phase 2はProduct Owner承認後のみ開始する。

The operator follows 確認 → 対応 → 結果確認 → 完了前レビュー. Confirmed PC context
comes from JOIN; there is no PC input. Start and standard guidance need no typed
reason. Exceptions do. Results retain caller/direct-observation/unknown source;
there are no Workaround/Root Cause classification inputs or mandatory Knowledge.

Drafts persist in PostgreSQL, survive reload, and can be revised. Back preserves
input. Stale saves are rejected with instructions to retain input and reload;
they never overwrite another operator's revision. Unsaved reload/link navigation
warns the operator. This is not offline storage or automatic save on every key.

Completion stores the reviewed account atomically. Corrections preserve original
Evidence, Action and completion notes, record author/time/reason, and appear in
later related Work. They do not reopen Work or change its completion category.
See ADR 0007 for the boundary and V1 compatibility.

## Local startup and Human Review

Keep the existing ignored `.env` and real Google Operator binding. Do not reset
the current demo or enter new credentials. With local Supabase running:

1. Run `npm.cmd run db:migrate` (includes
   `20260911000400_support_operator_records.sql`).
2. For an older unscoped JOIN demo, run `npm.cmd run db:prepare-support`.
3. Start/restart `npm.cmd run dev` and `npm.cmd run dev:ui` in separate terminals.
4. Open `http://localhost:5173`, sign in through Google, and open 「問い合わせ」.
5. Select 田中 一郎 and the scoped service. Enter the synthetic report
   「会社PCでVPNにつながりません」. PC-0073 should already be 確認済み from JOIN.
6. Click 「対応を開始」. Record only what was checked, including unknowns and
   their sources. Save a draft and reload to confirm restoration.
7. Continue, select 「PC再起動を案内」 and describe the actual guidance/caller
   response. No device command is executed by this demo.
8. Select 「接続できた」 only for the synthetic scenario's stated result, choose
   「本人からの申告」, and record what the caller reported. Never claim a real
   connection was restored merely because the demo was completed.
9. Review, go back to amend a detail, then complete. Leave Knowledge as 特になし.
10. Inspect 「対応の記録」 and 「対応履歴」. Add a correction with a reason and
    verify that the original remains available under audit details.
11. Create another inquiry for the same Person/service. 「過去の関連する対応」
    shows the previous dated report → guidance → result, including corrections.

For a clean disposable demo use `docs/local-join.md`, including explicit reset,
runtime password configuration and real identity binding; complete JOIN first.
Migration alone preserves current Facts and does not silently authorize SUPPORT.

## Verification

- `npm test`: **16 passed** (bootstrap).
- `npm run test:db`: **59 passed**: 12 bootstrap DB, 19 JOIN, 25 SUPPORT
  (16 V1 plus 9 V2), and 3 local setup tests.
- `npm run test:browser`: **5 passed**: 3 unchanged JOIN scenarios and 2 SUPPORT
  scenarios covering the Golden Human Review, drafts/reload/back, corrections,
  related history, optional Knowledge provenance, exceptions and Unknowns.
- `npm run build`, including `npm run typecheck`: passed.

The new migration runs with all earlier migrations and seed in the real PostgreSQL
test fixture. Runtime writes remain behind shared Origin/CSRF and Contract checks;
tests verify tenant isolation, append-only grants, retry/stale-save rejection,
atomic rollback, and editing a V1 account without rewriting its original evidence.

Local verification: the additive V2 migration was also applied to the existing
Supabase demo without reset, and the real server passed startup checks and listened
on 8080. Interactive UI startup currently encounters a Windows environment blocker:
port 5173 lies in the OS TCP excluded range 5146–5245 (IPv4 and IPv6). Vite returns
`EACCES` on both `::1:5173` and `127.0.0.1:5173`. This is separate from the passing
browser suite, which uses isolated available ports. No OS exclusions, OAuth redirect
or credentials were changed. Before interactive Google Human Review, make the
configured localhost port available through an approved Windows configuration
change; inspect it with `netsh interface ipv4 show excludedportrange protocol=tcp`.
Then restart `dev:ui` and use the existing localhost OAuth origin.

Automated browser acceptance uses a test-only IdP through real HTTP session
routes; Product Owner Google/browser Human Review remains a separate step.

No AI, external search, CMS, workflow editor, Work Graph UI or adjacent service
features are included. Stop for architecture/UX review after this checkpoint.

## Human Review amendment: keep Work visible and avoid duplicate recording

This amendment supersedes the earlier instruction to repeat standard guidance and
known result/source selections in free text. It adds no Domain Object, Work type,
schema migration or Bridge. Canonical principles are recorded in docs 17 and 18.

Main Work stays in the main column; caller report and verified PC are summarized
in the reference column. Person Context, JOIN confirmation source, previous SUPPORT
history and Knowledge open in native modal dialogs. Close/Escape restores focus
and leaves the Work input mounted. The bundled reference is explicitly labeled
デモ用参考手順 and is not an approved production Procedure.

Business history shows Japanese activities, recipient, checks, actions, results
and record authors. Audit details separately retain technical event names,
IDs, snapshots, original Evidence/Action and raw payloads. Existing Person/Work
queries and records are reused; the UI does not manufacture missing work history.

Standard action + known result + known source may be completed without repeating
them as prose. Application validation still requires checks, actual content for
Other guidance, a situation for Unknown results, exception reasons and correction
reasons. Structured values remain in the append-only Record; the initial Action
summary and Evidence incorporate their labels/source in the same transaction.
No caller report or Unknown is promoted to Fact.

### Human Review A–F

1. Start a synthetic SUPPORT inquiry for 田中 一郎. While typing checks, open
   「対象者の現在の利用状況」. Confirm the Work URL is unchanged, JOIN PC-0073 is
   reused, and closing restores both input and focus. Repeat with Escape and the
   demo reference dialog. Save/reload/back must still retain the input.
2. Open 「過去の関連する対応」. Read the dated caller report → action → result.
   Open its detailed history, then explicitly expand 「監査用の詳細」 to see raw
   provenance. Close to return to the current Work; do not use browser Back.
3. Select 「PC再起動を案内」 and leave 「対応の補足（任意）」 empty. Proceed.
4. Select 「接続できた」 + 「本人からの申告」 and leave result supplement empty.
   Review and complete. The choices themselves must appear in the record.
5. With Other, blank action detail must block advancing; with an unconfirmed
   result, record its situation. Exceptions and corrections still need reasons.
6. Inspect readable completion history; technical JSON must be collapsed under
   the separate Audit view. Correct the account and confirm original Action,
   Evidence and completion record remain available in Audit and later history.

Human review should assess the information hierarchy at the operator's normal
viewport, keyboard/focus behavior and whether terminology is understandable.
Automated tests cannot establish first-time operator comprehension.

Amendment verification: `npm test` **16 passed**; `npm run test:db` **61 passed**
(12 bootstrap DB, 19 JOIN, 27 SUPPORT, 3 local setup); `npm run test:browser`
**5 passed** (3 JOIN, 2 SUPPORT); typecheck/build passed. Browser assertions cover
same-URL Person/PC/procedure/history dialogs, close/Escape/focus restoration,
unsaved input preservation, hidden raw JSON with opt-in Audit, empty standard
supplements, required Other/Unknown text, draft reload, back, corrections and
optional Knowledge provenance. PostgreSQL checks prove empty standard supplements
still produce linked Evidence/Action/Record and preserve originals on correction.
