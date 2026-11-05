# FACTACT SUPPORT — Human Review 2 UI consolidation (2026-11-05)

Status: **Draft implementation; human review and merge decision pending**.

This change is a focused follow-up to the existing A1/A2 SUPPORT vertical slice. It does not replace the domain, Registry, Service Context, or Knowledge contracts. See GitHub Issues #17 (this UI pass), #18 (knowledge-search Fit/Gap), and #19 (service-first intake / affiliation / new caller Fit/Gap).

## Accepted screen responsibilities

| Area | Responsibility |
| --- | --- |
| Left work area | Show the caller's original inquiry, record the operator's response and current state, and review the response history. |
| Right assist area | Provide the relevant checks and Registry/current-case comparison, contextual references, knowledge candidates, past cases, and navigation to search. |
| Top status strip | Keep the current owner, next action and follow-up visible during work without requiring a separate start screen after the normal intake. |

The former large, repeated five-cell confirmation checklist is removed from the left work area. The caller's original words remain visible on the left as a **caller statement, not verified reality**. The right area is grouped as **確認事項・登録情報**, **手順・ナレッジ**, and **過去の対応**; the duplicated “関連情報を探す” link above the workspace is removed. The right pane can be widened or narrowed by dragging the divider or using its keyboard controls. At narrow widths, the assist area uses a dialog.

Normal intake offers **受付して対応を開始** as the primary action, with **受付のみ** still available when the operator intentionally wants to record and hold. The primary action calls the existing Event creation and separate Requirement Evaluation command sequentially; it does **not** invent a direct Work creation path. A failed evaluation must not erase an already recorded Event. No Registry/Work data changes merely by opening the assist area.

Text is enlarged for desktop readability, including the formerly 14px right-side body. Information density is improved by removing duplicate boxes rather than hiding verification provenance.

## Explicit boundaries and follow-ups

- **Issue #18:** The current search and “参考知識” operate within their existing implementation contract. Knowledge candidates are unapproved; this pass does not fabricate approved manuals, procedures, FAQ, or automated guidance. Search infrastructure and content ingestion need a separate Fit/Gap review.
- **Issue #19:** Choosing a service/contract context *before* selecting an affiliation and caller, accepting new affiliation/person names and later registering them, and tenant-specific data imports are still a separate contract and migration Fit/Gap. The existing selectors are retained until that implementation is approved.
- A Registry fact and the current Work's reported target remain separate. A comparison is read-only; a new confirmation is recorded through an explicit operation with source information. An unknown remains unknown.
- No production deployment, migration, merge, new knowledge approval workflow, or service-specific branching is included.

## Verification criteria

1. Primary intake produces a single Event and a separate Requirement Evaluation and Work without a second “対応を開始” click; “受付のみ” preserves the optional path.
2. The left keeps the operator's editable draft and history, while the right groups references and controls without a second confirmation checklist.
3. Drag/keyboard resizing does not discard unsaved text. At narrow widths, the right content is in a dialog.
4. The original caller statement remains explicitly unverified; Registry comparisons and Knowledge Candidates preserve their limitations.
5. Typecheck, build, unit tests and DB regression tests succeed; browser checks and a 13-inch Windows human review are required prior to merge.

Local sandbox limitation: Chromium needs Unix sockets that are prohibited by this execution sandbox. Playwright tests may be authored and compiled here but must be **executed** in the established Windows or CI browser runner; lack of execution is not a PASS.
