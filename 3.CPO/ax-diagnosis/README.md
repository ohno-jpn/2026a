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

## 画面構成

| パス | 内容 |
|------|------|
| `/` | LP（ヒーロー・ペイン・ソリューション・料金表） |
| `/dashboard` | ダッシュボード（最新結果サマリー・診断履歴・解説メール送信） |
| `/diagnosis` | 診断画面（Depth選択 → 質問 → 回答） |
| `/diagnosis/result` | 結果画面（総合スコア・ヒートマップ・領域別リング・アドバイス・解説メール送信） |
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

## ディレクトリ構成

```
ax-diagnosis/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # ランディングページ（LP）
│   ├── api/
│   │   └── send-wrong-answers-email/
│   │       └── route.ts                 # 個人Hard不正解問題の解説メール送信API
│   ├── dashboard/
│   │   ├── page.tsx                      # ダッシュボード（履歴・メール送信）
│   │   └── email-button.tsx             # 解説メール送信ボタン（Client Component）
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
│   │   └── diagnoses.ts                  # 診断結果のDB操作（保存・取得）
│   └── supabase/
│       ├── server.ts                     # Supabaseサーバークライアント
│       └── types.ts                      # DBスキーマの型定義
├── supabase/
│   └── schema.sql                        # テーブル定義（Supabase SQL Editorで実行）
├── scripts/
│   └── seed.ts                           # 設問データのシード投入スクリプト
└── middleware.ts                          # Clerk認証ミドルウェア
```

## データベース構成（Supabase）

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
```

> **注意**: `.env.local` は `.gitignore` に含めてください。APIキーをリポジトリにコミットしないよう注意してください。

## ローカル開発手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .env.local を作成して環境変数を設定（上記参照）

# 3. Supabase SQL Editor で supabase/schema.sql を実行してテーブルを作成

# 4. 設問データをシード投入
npx tsx scripts/seed.ts

# 5. 開発サーバー起動（localhost:3000）
npm run dev
```

## Vercelへのデプロイ

1. [vercel.com](https://vercel.com) にGitHubアカウントでログイン
2. 「Add New → Project」からリポジトリをImport
3. Root Directoryに `3.CPO/ax-diagnosis` を指定
4. 環境変数（`.env.local` の内容）をVercelのEnvironment Variablesに設定
5. 「Deploy」ボタンを押す

## ライセンス

© 2026 vast fields inc. All rights reserved.
