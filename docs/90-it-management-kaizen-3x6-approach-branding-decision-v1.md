# IT経営KAIZEN — 3×6 Approach 対外ブランド決定 v1

Status: **DECIDED — BUSINESS / BRANDING**
Date: 2026-09-28
Scope: IT経営KAIZENの方法論における対外名称、LP・提案書・診断資料での表現。

## 1. Decision

- 対外ブランド表記：**atLIB 3×6 Approach**
- 中核名称：**3×6 Approach**
- 日本語呼称：**サブロク・アプローチ**
- 説明表記：**3 Domains × 6 Lenses**
- サービス名は従来どおり **IT経営KAIZEN**。3×6 Approachは別サービス名ではなく、その改善設計方法論の対外ブランド。
- 「atLIB IT経営KAIZEN Method」「3×6 Method」「18 Approach」等は検討候補であり、今回の採用名称ではない。

## 2. Canonicalとの対応

既存の `docs/74-it-management-kaizen-design-decision-investment-method-v1.md` の `DESIGN = 3 Domains × 6 Lenses` / `Design Space` を対外的に伝える名称として3×6 Approachを使用する。既存のCanonical Method全体やDesign Spaceの内部定義を置換・変更しない。

- 3 Domains（どこを変えるか）：**技術・運用・管理**
- 6 Lenses（どう変えるか）：**なくす・自動化する・標準化する・任せる・残す・整える**
- FUTURE、FACT / UNKNOWN、GAP、ROOT CAUSE、Management Priorityに基づき必要な組合せを選び、ACT Optionsを設計する。
- **3×6＝18項目をすべて実施・採点するチェックリストではない。** 18の交点は検討可能な設計の切り口であり、18施策の実施・18項目の網羅・成熟度スコアを約束しない。
- Humanが実行するACTを決め、実行後のCHANGEはFACTで確認する。atLIBによる実装・運用を自動的に含むものではない。

## 3. 対外説明の基準文

> **3つの改善領域と6つの改善視点を掛け合わせ、会社の未来に必要な改善の選択肢を設計する。**

補足：技術だけでなく運用・管理まで見渡し、事実と経営上の優先順位に応じて必要な改善を考える。経営者が次に実行するACTを選べる状態をつくる。

「18の切り口」は説明・ビジュアル上の表現として使用可。ただし18項目の全実施・全採点と誤認させない。

## 4. LP反映方針

- 既存の「3領域×6視点」セクションに **3×6 Approach / サブロク・アプローチ** を表示する。
- `3 Domains × 6 Lenses` と「どこを変えるか × どう変えるか」を図示する。
- 3×6の網羅的な診断・採点表ではなく、改善の選択肢を設計する方法論として説明する。
- FUTURE → FACT / UNKNOWN → GAP → DESIGN → ACT OPTIONS → HUMAN DECISION の既存ストーリーと接続する。
- 内部の詳細な判断基準・優先順位ロジック・プロンプト・プレイブックはLPに公開しない。
- LPデザインへの実装は本決定の次作業。現時点ではブランド名称の記録をもってLP改修完了とはしない。

## 5. Naming / rights caveat

一般Web上の名称調査と、正式な商標調査・使用可能性判断は別。正式公開前に必要な確認を行う。

## References

- `docs/74-it-management-kaizen-design-decision-investment-method-v1.md` — Canonical Method / Design Space
- `docs/17-it-management-kaizen-business-service-canonical-v1.md` — 3 Domains / 6 Lenses / non-scoring
