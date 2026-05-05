# AX-Diagnosis

組織のAIトランスフォーメーション（AX）準備状況を診断するWebアプリです。

## 概要

「OH 組織Hard」「OS 組織Soft」「PH 個人Hard」「PS 個人Soft」の4軸でスコアリングし、自社・自身のAX成熟度を可視化します。診断結果に基づき、優先的に取り組むべき改善アクションを提示します。

## 診断の深度（Depth）

| 深度 | 名称 | 問数 | 形式 | 内容 |
|------|------|------|------|------|
| Depth 1 | Hook | 4問 | 状態選択 / クイズ | 各軸1問で現状を素早く把握 |
| Depth 2 | Checkup | 16問 | 状態選択 / クイズ | 各軸4問でサブ領域を診断 |
| Depth 3 | Biopsy | 64問 | リッカート5段階 / クイズ | 各軸16問で詳細診断 |
| Depth 4 | Lab | 16問 | リッカート5段階 / クイズ | Checkup各項目の追加検証問題 |

## 4軸フレームワーク

横軸：組織（左）/ 個人（右）、縦軸：Hard（上）/ Soft（下）の4象限構造です。

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

## 成熟度レベル（Level 1〜5）

診断アンケート（最大64問）で到達できる上限は **Level 3** です。Level 4・5 は研修プログラムの受講と課題完了によって認定されます。

| スコア | レベル | 説明 | 取得方法 |
|--------|--------|------|----------|
| 67〜100 | Level 3 整備中 | 基盤が整いつつある段階 | 診断アンケートで到達可能 |
| 34〜66 | Level 2 取組中 | 基礎的な取り組みを始めている段階 | 診断アンケートで到達可能 |
| 0〜33 | Level 1 初期 | これからAXに取り組む段階 | 診断アンケートで到達可能 |
| — | Level 4 発展 | 基盤が整い、活用が広がっている段階 | 研修プログラム修了で認定 |
| — | Level 5 先進 | AX推進の先進企業・個人 | 研修プログラム修了で認定 |

## 主要機能

### 診断・結果表示
- 3段階の深度（Hook / Checkup / Biopsy）から診断形式を選択
- 4軸ヒートマップと領域別スコアリングで結果を可視化
- 各軸のアドバイスを自動生成

### ユーザー認証・診断履歴
- Clerkによる認証（メールアドレス必須）
- 診断結果をSupabaseに蓄積し、ダッシュボードで履歴を確認可能
- 診断履歴テーブルで過去のスコア推移を一覧表示

### 解説メール送信
- 個人Hard（テクニカルスキル）領域の不正解問題を検出
- Resendを利用して、登録メールアドレスに解説メールを自動送信
- 診断結果ページ・ダッシュボード履歴の両方からワンクリックで送信可能

### 診断詳細・解説ページ
- ダッシュボードの各診断結果から回答内容を詳細表示
- クイズ問題ごとに正誤・正答・解説をページで確認可能
- 個人Hard全21問の解説テキストを収録（`lib/ind-hard-explanations.ts`）

### 動的プッシュ診断（実装予定）
- ダッシュボード設定画面でOH/OS/PH/PSの各軸ごとに送信間隔（7/14/28日）を設定
- 設定した間隔でCheckup4問を含むメールをユーザーに自動配信
- メール内のリンクから回答 → 結果をSupabaseに保存 → ダッシュボードの履歴に反映
- Vercel Cron Jobsで毎日判定・送信処理を実行

## 画面構成

| パス | 内容 |
|------|------|
| `/` | LP（ヒーロー・ペイン・ソリューション・料金表） |
| `/dashboard` | ダッシュボード（最新結果サマリー・診断履歴・解説メール送信） |
| `/dashboard/diagnoses/[id]` | 診断詳細（軸別回答一覧・正誤表示） |
| `/dashboard/diagnoses/[id]/explanation/[questionId]` | クイズ解説ページ |
| `/dashboard/settings` | プッシュ診断設定（軸別・間隔設定）【実装予定】 |
| `/diagnosis` | 診断画面（Depth選択 → 質問 → 回答） |
| `/diagnosis/result` | 結果画面（総合スコア・ヒートマップ・領域別リング・アドバイス・解説メール送信） |
| `/push/[token]` | プッシュ診断回答ページ（メールリンクから遷移）【実装予定】 |
| `/level-definitions/hook` | Hook レベル定義一覧（H-01〜H-04、Level 5→1） |
| `/level-definitions/checkup` | Checkup レベル定義一覧（C-01〜C-16、軸別グループ、Level 5→1） |
| `/questions/hook/oh` | OH設問一覧（Depth 1〜4: Hook / Checkup / Biopsy / Lab） |
| `/questions/hook/os` | OS設問一覧（Depth 1〜4: Hook / Checkup / Biopsy / Lab） |
| `/questions/hook/ph` | PH設問一覧（Depth 1〜4: Hook / Checkup / Biopsy / Lab） |
| `/questions/hook/ps` | PS設問一覧（Depth 1〜4: Hook / Checkup / Biopsy / Lab） |
| `/questions/checkup` | Checkup設問一覧（全16問・軸別グループ） |
| `/sign-in` | サインイン画面 |
| `/sign-up` | サインアップ画面（メールアドレス必須） |

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router, Turbopack) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui、lucide-react |
| 認証 | Clerk（@clerk/nextjs） |
| データベース | Supabase（PostgreSQL） |
| メール送信 | Resend |
| ジョブスケジューリング | Vercel Cron Jobs（実装予定） |

## ディレクトリ構成

```
ax-diagnosis/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # ランディングページ（LP）
│   ├── api/
│   │   ├── send-wrong-answers-email/
│   │   │   └── route.ts                 # 個人Hard不正解問題の解説メール送信API
│   │   ├── cron/
│   │   │   └── push-diagnoses/
│   │   │       └── route.ts             # Vercel Cronジョブ（プッシュ送信）【実装予定】
│   │   └── push/
│   │       └── submit/
│   │           └── route.ts             # プッシュ診断の回答受付API【実装予定】
│   ├── dashboard/
│   │   ├── page.tsx                      # ダッシュボード（履歴・メール送信）
│   │   ├── email-button.tsx             # 解説メール送信ボタン（Client Component）
│   │   ├── diagnoses/
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # 診断詳細（軸別回答一覧）
│   │   │       └── explanation/
│   │   │           └── [questionId]/
│   │   │               └── page.tsx     # クイズ解説ページ
│   │   └── settings/
│   │       ├── page.tsx                 # プッシュ診断設定ページ【実装予定】
│   │       └── settings-form.tsx        # 設定フォーム（Client Component）【実装予定】
│   ├── push/
│   │   └── [token]/
│   │       ├── page.tsx                 # プッシュ診断回答ページ【実装予定】
│   │       └── answer-form.tsx          # 回答フォーム（Client Component）【実装予定】
│   ├── diagnosis/
│   │   ├── page.tsx                      # 診断画面
│   │   └── result/page.tsx               # 診断結果ページ
│   ├── level-definitions/
│   │   ├── hook/page.tsx                 # Hook レベル定義
│   │   └── checkup/page.tsx              # Checkup レベル定義
│   ├── questions/
│   │   ├── checkup/page.tsx              # Checkup 設問一覧（全16問）
│   │   └── hook/
│   │       ├── oh/page.tsx               # OH 設問一覧（Depth 1〜4）
│   │       ├── os/page.tsx               # OS 設問一覧（Depth 1〜4）
│   │       ├── ph/page.tsx               # PH 設問一覧（Depth 1〜4）
│   │       └── ps/page.tsx               # PS 設問一覧（Depth 1〜4）
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── lib/
│   ├── question-reference-data.ts        # 全設問データ（Hook/Checkup/Biopsy/Lab）
│   ├── questions.ts                      # 診断データ・スコアリングロジック
│   ├── ind-hard-explanations.ts          # 個人Hard全21問の解説テキスト
│   ├── db/
│   │   ├── diagnoses.ts                  # 診断結果のDB操作（保存・取得）
│   │   └── push-settings.ts             # プッシュ設定・トークンのDB操作【実装予定】
│   └── supabase/
│       ├── server.ts                     # Supabaseサーバークライアント
│       └── types.ts                      # DBスキーマの型定義
├── supabase/
│   ├── schema.sql                        # メインテーブル定義
│   └── schema-push.sql                   # プッシュ診断用テーブル定義（追加で実行）
├── scripts/
│   └── seed.ts                           # 設問データのシード投入スクリプト
├── vercel.json                           # Vercel Cron設定【実装予定】
└── middleware.ts                          # Clerk認証ミドルウェア
```

## データベース構成（Supabase）

### 既存テーブル（schema.sql）

| テーブル | 用途 |
|---------|------|
| `questions` | 診断設問（軸・深度・形式） |
| `question_choices` | 設問の選択肢 |
| `hook_levels` | Hookレベル定義（H-01〜H-04） |
| `hook_level_items` | Hookレベルの各段階説明（Level 1〜5） |
| `checkup_levels` | Checkupレベル定義（C-01〜C-16） |
| `checkup_level_items` | Checkupレベルの各段階説明（Level 1〜5） |
| `diagnoses` | ユーザーごとの診断結果（スコア・軸別） |
| `diagnosis_answers` | 診断時の各問の回答 |

### プッシュ診断用テーブル（schema-push.sql）【要追加実行】

| テーブル | 用途 |
|---------|------|
| `push_settings` | ユーザーの軸別プッシュ設定（有効/無効・間隔・次回送信日時） |
| `push_tokens` | メール送信ごとの一回限りトークン（設問ID配列・有効期限・回答状況） |

## 環境変数

`.env.local` に以下を設定してください。

```env
# Clerk（https://dashboard.clerk.com）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Supabase（https://supabase.com → Settings > API）
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Resend（https://resend.com → API Keys）
RESEND_API_KEY=re_...
# 本番環境では Resend で独自ドメインを認証してから設定
EMAIL_FROM=AX-Diagnosis <noreply@yourdomain.com>

# アプリURL（プッシュメールのリンク生成に使用）【プッシュ機能実装時に追加】
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Vercel Cron認証シークレット（任意の文字列を設定）【プッシュ機能実装時に追加】
CRON_SECRET=your-random-secret-here
```

> **注意**: `.env.local` は `.gitignore` に含めてください。APIキーをリポジトリにコミットしないよう注意してください。

## ローカル開発手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .env.local を作成して環境変数を設定（上記参照）

# 3. Supabase SQL Editor で supabase/schema.sql を実行してメインテーブルを作成

# 4. 設問データをシード投入
npx tsx scripts/seed.ts

# 5. 開発サーバー起動（localhost:3000）
npm run dev
```

### プッシュ診断機能を追加する場合

```bash
# Supabase SQL Editor で schema-push.sql を追加実行してプッシュ用テーブルを作成
# .env.local に NEXT_PUBLIC_APP_URL と CRON_SECRET を追加
```

## Vercelへのデプロイ

1. [vercel.com](https://vercel.com) にGitHubアカウントでログイン
2. 「Add New → Project」からリポジトリをImport
3. Root Directoryに `3.CPO/ax-diagnosis` を指定
4. 環境変数（`.env.local` の内容）をVercelのEnvironment Variablesに設定
5. 「Deploy」ボタンを押す

## 開発状況

### 実装済み
- [x] LP（ランディングページ）
- [x] Clerk認証（サインイン・サインアップ）
- [x] 診断画面（Hook / Checkup / Biopsy、3深度）
- [x] 診断結果ページ（ヒートマップ・スコア・アドバイス）
- [x] 診断結果のSupabase保存
- [x] ダッシュボード（最新結果サマリー・診断履歴）
- [x] 診断詳細ページ（軸別回答・正誤表示）
- [x] クイズ解説ページ（個人Hard全21問）
- [x] 個人Hard不正解問題の解説メール送信（Resend）
- [x] レベル上限をLevel 3に制限（Level 4・5は研修認定）
- [x] プッシュ診断用DBスキーマ（schema-push.sql）

### 実装予定（次フェーズ）
- [ ] `lib/db/push-settings.ts`：プッシュ設定・トークンのDB操作
- [ ] `app/dashboard/settings/page.tsx`：プッシュ診断設定画面
- [ ] `app/dashboard/settings/settings-form.tsx`：軸別トグル・間隔セレクター
- [ ] `app/api/cron/push-diagnoses/route.ts`：Vercel Cronジョブ（毎日判定・メール送信）
- [ ] `app/push/[token]/page.tsx`：メールリンクからの回答ページ
- [ ] `app/push/[token]/answer-form.tsx`：回答フォーム（Client Component）
- [ ] `app/api/push/submit/route.ts`：回答受付・DB保存API
- [ ] `vercel.json`：Cron実行スケジュール設定
- [ ] ダッシュボードへの「設定」リンク追加・プッシュ診断履歴の表示

### プッシュ診断の仕様メモ

```
[設定] ユーザーがOH/OS/PH/PSの各軸で以下を設定
  - 有効/無効トグル
  - 送信間隔：7日 / 14日 / 28日

[送信フロー]
  Vercel Cron（毎日0時UTC）
    → push_settingsで enabled=true かつ next_send_at <= NOW() の行を取得
    → 対象ユーザーのClerkメールアドレスを取得
    → 該当軸のLevel 2（Checkup）設問4問を選択
    → push_tokensにトークン生成（有効期限7日、question_ids配列を保存）
    → Resendでメール送信（回答URL: /push/[token]）
    → push_settings.next_send_at を interval_days 後に更新

[回答フロー]
  ユーザーがメールリンクをクリック → /push/[token]
    → トークン検証（期限切れ・回答済みチェック）
    → 4問の設問を表示（answer-form.tsx）
    → 送信 → POST /api/push/submit
    → diagnosesテーブルに保存（depth="push_[OH/OS/PH/PS]"）
    → diagnosis_answersに回答保存
    → push_tokens.answered_at を更新
    → ダッシュボード履歴に反映
```

## ライセンス

© 2026 vast fields inc. All rights reserved.
