# IT経営KAIZEN 設計Assessment — 分析・初期FACT構築のBusiness Decision（2026-11-17）

Status: **BUSINESS DECISION — Product Fit/Gap pending**
Date: 2026-11-17
Owner: IT経営KAIZEN Business Lane
Related: docs/73, docs/75, docs/78, docs/82, docs/83, docs/84, docs/86; 2026-09-10 Business Lane Decision Record.

## 1. 設計Assessmentの二つの役割 — DECIDED
1. 無料診断で把握した経営者の最重要FUTUREを起点に、現場・技術・運用・管理の実態を調査・分析し、実現条件・制約・複数の現実的な戦略／シナリオ／段階的Roadmapを経営判断の材料として示す。
2. 後続BUILDを前倒しする。調査で受領した管理表・手順書等をFACTACTの既存の運用データ構造へ変換し、検証・登録した初期FACTをBUILDおよびOPERATE & KAIZENで再利用する。**ファイル管理や文書検索が目的ではない。**

## 2. 判断の主体 — DECIDED
- 重要性の根拠は「FUTUREとの関連」「セキュリティ・事業継続・管理等の普遍的重要性」「確認された現場の実態・影響」を整理する。
- 重要度、重大度、優先順位、実施順序、採用シナリオは人が対話と調査を通じて判断する。システムは自動採点・自動決定せず、根拠・選択肢・依存関係・制約・人の判断理由を整理・記録する。
- レポートは唯一の正解を装わない。投資余力・体制・事業計画に応じ、短期集中／段階整備／既存活用等の意味ある選択肢を比較する。必ず複数案を捏造するわけではない。人による根拠ある推奨は可能。
- 現場の発言・資料の記載・確認済みFACT・原因仮説・予測を区別する。業務整理／管理体制／人員不足／技術的制約などを先入観なく分析し、現場の強みも維持対象として扱う。

## 3. AIとFACTACTの境界 — DECIDED
- **FACTACT CoreはAIなしで運用できる決定論的システム**。問い合わせ対応・手順参照・権限判断・エスカレーション・監査にAIを前提としない。
- Assessment側のAIは、資料の内容確認・既存項目へのマッピング候補提示・登録可能なデータへの構造化を支援する。人の確認とFACTACTの正規の Change → Verify → Commit を経て初期FACTへ登録する。AIはDBへ直接書き込まない。
- Assessmentの経営分析対話AIは別のAssessment支援機能であり、FACTACT CoreへAIを組み込まない。
- 文書は出所・Evidenceとして保持し得るが、主成果はFACTACTで運用可能な構造化データ。単に「○○管理表」と命名してファイルを管理するだけでは要件を満たさない。

## 4. 取り込みの操作思想 — DECIDED
- **一般的な名刺管理・会計SaaSのCSVインポートと同程度のシンプルさ**を目指す。Excel/CSV等をまとめて受け付け、元列とFACTACT既存項目の対応を予測・提示し、人が修正・確認して登録する。
- 明確な列名や既知の別名は通常のルールで処理し、曖昧な項目の候補提示に必要な場合だけAIを利用する。AIを使うための複雑な独自文書解析基盤は作らない。
- 複数ファイルを一括投入できても、誤マッピング・重複・必須項目不足・型不整合は登録前に確認できるようにする。確認済み情報をBUILDで再入力・再ヒアリングしない。
- 手順書など非表形式資料は同じ列マッピングでは扱えない場合がある。初期対応の範囲・方法は既存FACTACTとのFit/Gap後に決める。高度な自由文解析を既決要件として扱わない。

## 5. AssessmentからBUILDへの引継ぎ — DECIDED
- 資産・利用者・利用システム・アカウント・業務手順・承認／権限・管理ルール・ベンダー・例外等のうち、既存FACTACTで扱える情報を初期FACT化する。個別のデータモデル・登録契約はProduct Laneで確認する。
- AssessmentはBUILDを完了させる工程ではない。BUILDでは未確認事項・変更・不足情報、運用標準化、権限／接続設定、運用検証、Go Liveを担う。
- 既存の3成果物（改善計画書、経営者向け要約、Evidence Book）は維持。初期FACTの蓄積はそれらと並行する内部／後工程向けの成果。

## 6. 未決事項・次のFit/Gap
- FACTACT既存Canonical・実装のインポート契約、登録可能な運用オブジェクト、初期FACTの検証・承認・重複・更新処理を調査する。
- Excel/CSVの複数ファイル一括投入と列マッピングの既存機能の有無、Application/Translation Layerの不足を確認する。
- 手順書など非表形式データをどの範囲で初期FACT化できるか、既存Procedure/AuthorityモデルとのFitを確認する。
- このBusiness Decisionをそのまま新しいCore Object・AIエージェント・自動優先順位付けの実装指示にしない。Product LaneがFIT / GAP / CONFLICT / UNKNOWNを返す。実装・PoCは別判断。

## 7. 既存Canonicalとの優先関係
本書は今回のBusiness Decisionを記録するものであり、既存Canonicalの価格・Scope・責任分担を上書きしない。過去の2026-09-10価格・分類案より後日確定の商用Canonical（docs/83等）を優先する。
