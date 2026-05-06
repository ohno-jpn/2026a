# AX-Diagnosis — 要件定義書（RFP）

**プロジェクト名**: AX-Diagnosis  
**バージョン**: 1.2.0  
**最終更新**: 2026-05-06  
**ステータス**: 開発中

---

## 1. プロジェクト概要

### 1.1 目的

組織・個人のAIトランスフォーメーション（AX）準備状況を診断し、スコアと改善アクションを提示するWebアプリケーション。診断結果を蓄積し、定期的なプッシュ送信によって継続的な学習・成長を支援する。

### 1.2 対象ユーザー

- 企業のCPO・DX推進担当者
- AX推進を担う個人（マネージャー・エンジニア・企画職）
- AI活用の現状把握・改善行動を求める組織・個人

### 1.3 ビジネス背景

- AIツールの急速な普及に対し、組織・個人の「使いこなす力」の差が拡大している
- 単発の診断ではなく、継続的なチェックと学習を促す仕組みが必要
- Level 4・5は研修プログラムと連携し、診断→学習→認定のサイクルを確立する

---

## 2. 4軸フレームワーク

```
              組織                      個人
         ┌──────────────────────┬──────────────────────┐
  Hard   │ OH 組織Hard           │ PH 個人Hard           │
  （上）  │ 戦略・KGI・ガバナンス │ テクニカルスキル      │
         │ データ基盤・プロセス  │ AI知識・リスク管理    │
         ├──────────────────────┼──────────────────────┤
  Soft   │ OS 組織Soft           │ PS 個人Soft           │
  （下）  │ 挑戦文化・機敏性      │ 課題設定力・目的志向  │
         │ HR評価・ナレッジ共有  │ 批判的思考・開放性    │
         └──────────────────────┴──────────────────────┘
```

---

## 3. 診断レベル設計

### 3.1 成熟度レベル

| スコア | レベル | 説明 | 認定方法 |
|--------|--------|------|----------|
| 67〜100 | Level 3 整備中 | 基盤が整いつつある段階 | 診断アンケートで到達可能 |
| 34〜66 | Level 2 取組中 | 基礎的な取り組みを始めている段階 | 診断アンケートで到達可能 |
| 0〜33 | Level 1 初期 | これからAXに取り組む段階 | 診断アンケートで到達可能 |
| — | Level 4 発展 | 基盤が整い、活用が広がっている段階 | 研修プログラム修了で認定 |
| — | Level 5 先進 | AX推進の先進企業・個人 | 研修プログラム修了で認定 |

> **制約**: 診断アンケートで到達できる上限は Level 3。Level 4・5 は研修プログラム受講と課題完了によって認定される。

### 3.2 診断深度

| 深度 | 名称 | 問数 | 形式 | 用途 |
|------|------|------|------|------|
| Depth 1 | Hook | 4問 | 状態選択 / クイズ | 各軸1問・現状の素早い把握 |
| Depth 2 | Checkup | 16問 | 状態選択 / クイズ | 各軸4問・サブ領域診断 |
| Depth 3 | Biopsy | 64問 | リッカート5段階 / クイズ | 各軸16問・詳細診断 |
| Depth 4 | Lab | 16問 | リッカート5段階 / クイズ | Checkup追加検証（将来実装） |

---

## 4. 機能要件

### 4.1 認証・ユーザー管理

| 機能 | 仕様 |
|------|------|
| サインアップ | メールアドレス必須（Clerk） |
| サインイン | メールアドレス + パスワード |
| セッション管理 | Clerk JWT |
| ダッシュボード保護 | Clerk Middleware で `/dashboard/*`, `/diagnosis/*` を保護 |

### 4.2 診断機能

| 機能 | 仕様 |
|------|------|
| 深度選択 | Hook / Checkup / Biopsy の3段階から選択 |
| 設問表示 | 軸ごとに順次表示、単一選択(mc) / 複数選択(cb) / リッカート5段階 |
| スコアリング | 各設問0〜100点、軸別平均 → 総合スコア（4軸平均） |
| 結果表示 | 4軸ヒートマップ・リングチャート・アドバイス文 |
| 結果保存 | Supabase `diagnoses` + `diagnosis_answers` テーブルに保存 |

**スコアリングロジック**:
- 状態選択(mc)：選択肢インデックス × 25（0/25/50/75/100）
- リッカート(mc+isLikert)：同上
- 知識クイズ(mc+correctIndices)：正解=100、不正解=0
- 複数選択(cb)：正答率 − 誤答率（ペナルティ方式）

### 4.3 診断履歴・詳細

| 機能 | 仕様 |
|------|------|
| 履歴一覧 | ダッシュボードに最新20件を日時・深度・スコア付きで表示 |
| 最新結果サマリー | 4軸リングチャートで最新診断を可視化 |
| 診断詳細 | 軸別・全設問の回答内容・正誤を表示 |
| クイズ解説 | 個人Hard全21問の解説ページ（正誤・正答・解説文） |

### 4.4 解説メール送信

| 機能 | 仕様 |
|------|------|
| 対象 | 個人Hard（PH軸）のクイズ問題で不正解だった問題 |
| 送信先 | Clerkに登録されたメールアドレス |
| 内容 | 不正解問題・あなたの回答・正解・解説文 |
| トリガー | 診断結果ページ / ダッシュボード履歴からワンクリック |
| 送信API | Resend |

### 4.5 動的プッシュ診断（実装済み）

#### 設定

| 項目 | 仕様 |
|------|------|
| 設定単位 | OH / OS / PH / PS の4軸それぞれ独立して設定可能 |
| 有効/無効 | 軸ごとのトグルスイッチ |
| 送信間隔 | 分単位〜日単位で指定（下表参照） |
| テスト送信 | 「今すぐテスト送信」ボタンで即時送信・確認可能 |

**送信間隔の選択肢**:

| グループ | 選択肢 |
|----------|--------|
| テスト用 | 5分・15分・30分 |
| 時間 | 1時間・3時間・6時間・12時間 |
| 日数 | 1日・7日・14日・28日 |

#### 送信フロー

```
[Vercel Cron / 毎分実行]
  ↓
push_settings WHERE enabled=true AND next_send_at <= NOW()
  ↓
Clerk API でユーザーメールを取得
  ↓
Checkup(16問) + Biopsy(64問) 計80問から
軸ごとにランダム4問を選択
  ↓
push_tokens にトークン生成（有効期限7日・設問ID保存）
  ↓
Resend でメール送信（回答URL: /push/[token]）
  ↓
push_settings.next_send_at を interval_minutes 後に更新
```

#### 回答フロー

```
ユーザーがメール内リンクをクリック
  ↓
/push/[token] (認証不要・トークン検証)
  ├─ トークン無効 → エラーページ
  ├─ 有効期限切れ → エラーページ
  ├─ 回答済み → 案内ページ
  └─ 有効 → 4問の回答フォーム表示
       ↓
     POST /api/push/submit
       ↓
     スコア計算 → diagnoses + diagnosis_answers に保存
       ↓
     push_tokens.answered_at を更新
       ↓
     ダッシュボード履歴に「プッシュ OH/OS/PH/PS」として反映
```

---

## 5. 非機能要件

| 項目 | 仕様 |
|------|------|
| フレームワーク | Next.js 16.2.2（App Router + Turbopack） |
| 言語 | TypeScript（strict） |
| スタイリング | Tailwind CSS v4（ダーク背景 gray-950） |
| 認証 | Clerk（@clerk/nextjs v7） |
| データベース | Supabase PostgreSQL（サービスロールキーでサーバーサイドアクセス） |
| メール | Resend（v6）、独自ドメイン認証推奨 |
| ホスティング | Vercel（Cron Jobs利用にはPro以上） |
| セキュリティ | Cron Endpoint は `Authorization: Bearer CRON_SECRET` で保護 |

---

## 6. データベース設計

### 6.1 既存テーブル（schema.sql）

#### `diagnoses`
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| clerk_user_id | TEXT | Clerkユーザーid |
| depth | TEXT | hook / checkup / biopsy / push-OH / push-OS / push-PH / push-PS |
| oh_score | INTEGER | OH軸スコア（0〜100） |
| os_score | INTEGER | OS軸スコア |
| ph_score | INTEGER | PH軸スコア |
| ps_score | INTEGER | PS軸スコア |
| total_score | INTEGER | 総合スコア（軸別平均） |
| status | TEXT | completed |
| created_at | TIMESTAMPTZ | 診断日時 |

#### `diagnosis_answers`
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| diagnosis_id | UUID | FK → diagnoses.id |
| question_id | TEXT | 設問ID |
| answer | TEXT | JSON文字列（数値 or 数値配列） |

### 6.2 プッシュ診断テーブル（schema-push.sql）

#### `push_settings`
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| clerk_user_id | TEXT | Clerkユーザーid |
| axis | TEXT | OH / OS / PH / PS |
| interval_minutes | INTEGER | 送信間隔（分）。0=無効 |
| enabled | BOOLEAN | 有効/無効 |
| next_send_at | TIMESTAMPTZ | 次回送信予定日時 |
| created_at / updated_at | TIMESTAMPTZ | 作成・更新日時 |

**ユニーク制約**: `(clerk_user_id, axis)`

#### `push_tokens`
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| clerk_user_id | TEXT | Clerkユーザーid |
| axis | TEXT | OH / OS / PH / PS |
| token | TEXT | ランダムトークン（UNIQUE） |
| question_ids | JSONB | 送信した設問IDの配列 |
| sent_at | TIMESTAMPTZ | 送信日時 |
| expires_at | TIMESTAMPTZ | 有効期限（7日後） |
| answered_at | TIMESTAMPTZ | 回答日時（NULLなら未回答） |
| diagnosis_id | UUID | FK → diagnoses.id（回答後に紐付け） |

---

## 7. API設計

### 7.1 エンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| POST | `/api/send-wrong-answers-email` | Clerk | 個人Hard不正解問題の解説メール送信 |
| GET | `/api/cron/push-diagnoses` | CRON_SECRET | Vercel Cronジョブ（プッシュ送信判定） |
| POST | `/api/push/submit` | トークン | プッシュ診断の回答受付・スコア保存 |

### 7.2 Server Actions（Next.js）

| アクション | ファイル | 処理 |
|-----------|---------|------|
| `saveSetting` | `app/dashboard/settings/page.tsx` | 軸別プッシュ設定の保存 |
| `testSendAction` | `app/dashboard/settings/page.tsx` | テスト送信（即時実行） |
| `saveDiagnosis` | `lib/db/diagnoses.ts` | 診断結果の保存 |

---

## 8. 画面設計

| パス | 説明 | 認証 |
|------|------|------|
| `/` | LP（ヒーロー・ペイン・ソリューション・料金表） | 不要 |
| `/sign-in` | サインイン | 不要 |
| `/sign-up` | サインアップ（メール必須） | 不要 |
| `/diagnosis` | 診断画面（Depth選択 → 質問 → 送信） | 必要 |
| `/diagnosis/result` | 診断結果（ヒートマップ・スコア・アドバイス） | 必要 |
| `/dashboard` | 最新サマリー・診断履歴・解説メール送信 | 必要 |
| `/dashboard/diagnoses/[id]` | 診断詳細（軸別回答・正誤一覧） | 必要 |
| `/dashboard/diagnoses/[id]/explanation/[questionId]` | クイズ解説ページ | 必要 |
| `/dashboard/settings` | プッシュ診断設定（軸別・間隔・テスト送信） | 必要 |
| `/push/[token]` | プッシュ診断回答ページ（メールリンク） | トークン |
| `/level-definitions/hook` | Hook レベル定義一覧 | 不要 |
| `/level-definitions/checkup` | Checkup レベル定義一覧 | 不要 |
| `/questions/hook/[axis]` | 軸別設問一覧 | 不要 |

---

## 9. 環境変数

| 変数名 | 用途 | 備考 |
|--------|------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公開鍵 | |
| `CLERK_SECRET_KEY` | Clerk 秘密鍵 | |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名鍵 | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロール鍵 | サーバーサイドのみ |
| `RESEND_API_KEY` | Resend APIキー | |
| `EMAIL_FROM` | 送信元メールアドレス | 独自ドメイン認証後に設定 |
| `NEXT_PUBLIC_APP_URL` | アプリのベースURL | プッシュメールリンク生成に使用 |
| `CRON_SECRET` | Cronエンドポイント認証シークレット | 任意の文字列 |

---

## 10. ディレクトリ構成

```
ax-diagnosis/
├── app/
│   ├── page.tsx                              # LP
│   ├── layout.tsx
│   ├── api/
│   │   ├── send-wrong-answers-email/route.ts # 解説メール送信API
│   │   ├── cron/push-diagnoses/route.ts      # Vercel Cronジョブ
│   │   └── push/submit/route.ts              # プッシュ回答受付API
│   ├── dashboard/
│   │   ├── page.tsx                          # ダッシュボード
│   │   ├── email-button.tsx                  # 解説メールボタン
│   │   ├── diagnoses/[id]/
│   │   │   ├── page.tsx                      # 診断詳細
│   │   │   └── explanation/[questionId]/page.tsx  # クイズ解説
│   │   └── settings/
│   │       ├── page.tsx                      # プッシュ設定ページ
│   │       └── settings-form.tsx             # 設定フォーム
│   ├── push/[token]/
│   │   ├── page.tsx                          # 回答ページ（認証不要）
│   │   └── answer-form.tsx                   # 回答フォーム
│   ├── diagnosis/
│   │   ├── page.tsx                          # 診断画面
│   │   └── result/page.tsx                   # 結果ページ
│   ├── level-definitions/{hook,checkup}/page.tsx
│   ├── questions/hook/{oh,os,ph,ps}/page.tsx
│   ├── questions/checkup/page.tsx
│   └── sign-in・sign-up/
├── lib/
│   ├── questions.ts                          # 全設問データ・スコアリング
│   ├── question-reference-data.ts            # 参照用設問データ
│   ├── ind-hard-explanations.ts              # 個人Hard解説テキスト（21問）
│   ├── push-sender.ts                        # メール送信共通ロジック
│   ├── db/
│   │   ├── diagnoses.ts                      # 診断結果DB操作
│   │   └── push-settings.ts                  # プッシュ設定・トークンDB操作
│   └── supabase/{server,client,types}.ts
├── supabase/
│   ├── schema.sql                            # メインスキーマ
│   ├── schema-push.sql                       # プッシュ診断テーブル
│   └── migration-push-interval.sql           # interval_minutesリネーム
├── scripts/seed.ts                           # 設問データ投入
├── vercel.json                               # Cron設定（毎分実行）
└── middleware.ts                             # Clerk認証ミドルウェア
```

---

## 11. 実装状況

### 完了済み

- [x] LP（ランディングページ）
- [x] Clerk認証（サインイン・サインアップ、メール必須）
- [x] 診断画面（Hook / Checkup / Biopsy）
- [x] 診断結果（ヒートマップ・スコア・アドバイス・Level 3上限）
- [x] 診断結果のSupabase保存
- [x] ダッシュボード（最新サマリー・履歴一覧）
- [x] 診断詳細ページ（軸別回答・正誤表示）
- [x] クイズ解説ページ（個人Hard全21問）
- [x] 個人Hard不正解問題の解説メール（Resend）
- [x] プッシュ診断DBスキーマ（push_settings, push_tokens）
- [x] プッシュ診断設定画面（軸別・間隔設定・テスト送信ボタン）
- [x] Vercel Cronジョブ（毎分実行・送信判定）
- [x] プッシュ診断回答ページ（/push/[token]、認証不要）
- [x] 回答受付API（スコア計算・DB保存）
- [x] Checkup + Biopsyの設問からランダム4問選択
- [x] 分・時間・日単位の送信間隔設定

### 未実装（次フェーズ）

- [ ] Vercel Pro環境での自動Cron動作確認（5分・15分間隔）
- [ ] プッシュ診断履歴のダッシュボード専用セクション表示
- [ ] 設問ローテーション管理（同じ問題の連続送信を避ける）
- [ ] Level 4・5 研修プログラム連携
- [ ] Resend 独自ドメイン認証（yuuing.co.jp）
- [ ] Depth 4 Lab 設問の実装

---

## 12. セットアップ手順

### 初回セットアップ

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .env.local を作成して環境変数を設定

# 3. Supabase SQL Editor で schema.sql を実行

# 4. Supabase SQL Editor で schema-push.sql を実行

# 5. 設問データを投入
npx tsx scripts/seed.ts

# 6. 開発サーバー起動
npm run dev
```

### Vercelデプロイ

1. Vercel にリポジトリをImport（Root Directory: `3.CPO/ax-diagnosis`）
2. 環境変数を全て設定
3. Deploy
4. Cron の自動実行には **Vercel Pro** が必要

---

## 13. ライセンス

© 2026 vast fields inc. All rights reserved.
