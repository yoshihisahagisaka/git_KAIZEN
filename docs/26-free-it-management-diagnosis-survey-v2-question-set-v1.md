# 無料 IT経営診断 Survey v2 Question Set v1.0

Status: **CANONICAL IMPLEMENTATION REFERENCE**

この文書は、無料 IT経営診断の事前アンケートで使用する **Survey v2** の正式質問定義を記録する。

上位のBusiness / Service Canonicalは `17-it-management-kaizen-business-service-canonical-v1.md` とし、本書はその「現在の質問構成（v2）」を実装可能な粒度へ固定するためのImplementation Referenceである。

本書は質問セットの定義を固定するものであり、顧客回答をFACTとして扱うこと、採点・成熟度評価・自動診断を許可するものではない。

---

## 1. Version / Scope

- `survey_version = 2`
- Q01〜Q09：必須
- Q10：任意自由記述
- 全質問 `is_active = true`
- stable question code、表示順、質問文、answer type、選択肢順を本書で固定する
- 将来文言や選択肢を変更する場合は既存v2を書き換えず、新しいSurvey Versionを追加する

文書ファイル名末尾の `v1` は本Canonical文書自体の版であり、Survey Versionとは別である。

---

## 2. Meaning Boundary

- `SINGLE_SELECT`：選択肢文字列1件
- `MULTI_SELECT`：選択肢文字列の配列
- `TEXT`：自由記述文字列
- 選択肢文字列を保存値として使用する
- `TEXT` の実装上限は4,000文字
- `is_required = true` はSurvey Complete時に回答必須であることを意味する
- 途中保存時は空文字列 / 空配列へ変更してよい
- 「分からない」は通常の有効回答であり、エラー・低評価・不足扱いにしない
- SurveyResponseはRaw Sourceとして保存する
- SurveyResponseから score / maturity / confidence / FACT / semantic judgement を生成しない
- Q01からFutureを生成するのは `CompleteSurvey` 時のみとし、`intent_status = SURVEY_STATED` として元SurveyResponseを参照する

> **顧客の自己回答は、会社の権威あるFACTではない。**

---

## 3. Canonical Question Definition

```json
{
  "survey_version": 2,
  "questions": [
    {
      "question_code": "Q01_FUTURE",
      "version": 2,
      "display_order": 1,
      "question_text": "今後1〜3年で、どのような会社の未来を実現したいですか？",
      "answer_type": "MULTI_SELECT",
      "options_json": [
        "売上・事業を成長させたい",
        "社員が本来の仕事に集中できる会社にしたい",
        "少人数でも無理なく事業を続けられる会社にしたい",
        "新しい事業や働き方に挑戦したい",
        "安心して事業を続けられる会社にしたい",
        "その他",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q02_IT_EXPECTATION",
      "version": 2,
      "display_order": 2,
      "question_text": "その未来のために、ITへどのようなことを期待していますか？",
      "answer_type": "MULTI_SELECT",
      "options_json": [
        "仕事の手間を減らすこと",
        "新しい事業・サービスを支えること",
        "経営判断に必要な情報を届けること",
        "安心して仕事を続けられること",
        "社員が働きやすくなること",
        "その他",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q03_IT_PLANNING",
      "version": 2,
      "display_order": 3,
      "question_text": "現在、ITの計画や改善をどのように進めていますか？",
      "answer_type": "SINGLE_SELECT",
      "options_json": [
        "会社の未来とつなげた計画で進めている",
        "個別の計画や課題に沿って進めている",
        "困りごとが起きたときに対応している",
        "進めたいが着手できていない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q04_IT_VISIBILITY",
      "version": 2,
      "display_order": 4,
      "question_text": "社内のIT環境を、どの程度把握できていますか？",
      "answer_type": "SINGLE_SELECT",
      "options_json": [
        "IT環境は完全に把握できている",
        "おおむね把握できている",
        "一部は把握できている",
        "担当者に確認しないと分からない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q05_DAILY_IT_OPERATION",
      "version": 2,
      "display_order": 5,
      "question_text": "日々のIT業務で、当てはまる状態を教えてください。",
      "answer_type": "MULTI_SELECT",
      "options_json": [
        "手作業や繰り返しの作業が多い",
        "特定の人に確認しないと進められない仕事がある",
        "問い合わせやトラブル対応に時間がかかる",
        "手順と実際の仕事が合っていないことがある",
        "改善に取り組む時間を取りにくい",
        "特に気になることはない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q06_SECURITY_RISK",
      "version": 2,
      "display_order": 6,
      "question_text": "セキュリティやITのリスクを、経営として把握できていますか？",
      "answer_type": "SINGLE_SELECT",
      "options_json": [
        "事業への影響を含めて把握している",
        "報告は受けているが事業への影響までは分からない",
        "担当者に任せている",
        "把握する機会がない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q07_AUTHORITY_RESPONSIBILITY",
      "version": 2,
      "display_order": 7,
      "question_text": "ITについて、誰が判断し責任を持っていますか？",
      "answer_type": "SINGLE_SELECT",
      "options_json": [
        "経営者・役員が判断している",
        "権限を持つ社内担当者が判断している",
        "内容によって判断する人が異なる",
        "外部の支援先と相談して判断している",
        "明確に決まっていない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q08_MANAGEMENT_INFORMATION",
      "version": 2,
      "display_order": 8,
      "question_text": "ITの情報は、経営判断に使える形で届いていますか？",
      "answer_type": "SINGLE_SELECT",
      "options_json": [
        "経営判断に使える形で届いている",
        "報告はあるが判断に使いにくい",
        "必要なときに担当者へ確認している",
        "経営への報告はない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q09_IT_ORGANIZATION",
      "version": 2,
      "display_order": 9,
      "question_text": "現在のIT体制を教えてください。",
      "answer_type": "MULTI_SELECT",
      "options_json": [
        "専任の社内担当者がいる",
        "他の仕事と兼任する社内担当者がいる",
        "経営者が対応している",
        "外部の支援先が対応している",
        "担当者が決まっていない",
        "分からない"
      ],
      "is_required": true,
      "is_active": true
    },
    {
      "question_code": "Q10_FREE_COMMENT",
      "version": 2,
      "display_order": 10,
      "question_text": "ITについて特に気になることがあれば教えてください。（任意）",
      "answer_type": "TEXT",
      "options_json": null,
      "is_required": false,
      "is_active": true
    }
  ]
}
```

---

## 4. Implementation Consistency Rule

Primary implementation repository:

`yoshihisahagisaka/atlib-sales-tools`

The implementation definition in `src/domain/itManagementDiagnosis.ts` must remain equivalent to this Canonical Question Set.

Golden Tests should detect drift in:

- `survey_version`
- stable question codes
- question order
- wording
- answer type
- options and option order
- required / optional flags

If the product owner changes a question or option, update the Canonical first or in the same change cycle and introduce a new Survey Version rather than silently rewriting published v2.
