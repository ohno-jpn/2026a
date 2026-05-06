# AX-Diagnosis

組織・個人のAIトランスフォーメーション（AX）準備状況を診断するWebアプリです。

## 概要

「OH 組織Hard」「OS 組織Soft」「PH 個人Hard」「PS 個人Soft」の4軸でスコアリングし、自社・自身のAX成熟度を可視化します。診断結果に基づき、優先的に取り組むべき改善アクションを提示します。

## 4軸フレームワーク

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

## 診断の深度（Depth）

| 深度 | 名称 | 問数 | 形式 |
|------|------|------|------|
| Depth 1 | Hook | 4問 | 状態選択 / クイズ |
| Depth 2 | Checkup | 16問 | 状態選択 / クイズ |
| Depth 3 | Biopsy | 64問 | リッカート5段階 / クイズ |

## 成熟度レベル

診断アンケートで到達できる上限は **Level 3** です。Level 4・5 は研修プログラムの受講と課題完了によって認定されます。

| スコア | レベル | 認定方法 |
|--------|--------|----------|
| 67〜100 | Level 3 整備中 | 診断アンケートで到達可能 |
| 34〜66 | Level 2 取組中 | 診断アンケートで到達可能 |
| 0〜33 | Level 1 初期 | 診断アンケートで到達可能 |
| — | Level 4 発展 | 研修プログラム修了で認定 |
| — | Level 5 先進 | 研修プログラム修了で認定 |

## 主要機能

### 診断・結果表示
- Hook / Checkup / Biopsy の3段階から診断形式を選択
- 4軸ヒートマップと領域別スコアで結果を可視化
- 各軸のアドバイスを自動生成

### ユーザー認証・診断履歴
- Clerkによる認証（メールアドレス必須）
- 診断結果をSupabaseに蓄積し、ダッシュボードで履歴を確認
- 診断詳細ページで全設問の回答・正誤を確認

### クイズ解説
- 個人Hard（PH軸）のクイズ問題に解説ページを用意（全21問）
- 診断詳細から各問題の解説ページへ遷移可能

### 解説メール送信
- 個人Hard不正解問題を検出し、解説をメールで自動送信（Resend）
- 診断結果ページ・ダッシュボードからワンクリックで送信

### 動的プッシュ診断
- OH / OS / PH / PS の4軸ごとに送信間隔を個別設定
- Checkup + Biopsy の全80問からランダム4問をメールで定期送信
- メール内リンクから認証不要で回答 → 結果がダッシュボードに反映
- 設定画面から「今すぐテスト送信」で動作確認可能

## 画面構成

| パス | 内容 |
|------|------|
| `/` | LP |
| `/dashboard` | 最新診断サマリー・履歴・解説メール送信 |
| `/dashboard/diagnoses/[id]` | 診断詳細（軸別回答・正誤一覧） |
| `/dashboard/diagnoses/[id]/explanation/[questionId]` | クイズ解説ページ |
| `/dashboard/settings` | プッシュ診断設定（軸別・間隔・テスト送信） |
| `/diagnosis` | 診断画面 |
| `/diagnosis/result` | 診断結果 |
| `/push/[token]` | プッシュ診断回答ページ（メールリンク・認証不要） |
| `/level-definitions/hook` | Hook レベル定義一覧 |
| `/level-definitions/checkup` | Checkup レベル定義一覧 |
| `/questions/hook/{oh,os,ph,ps}` | 軸別設問一覧 |

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16.2.2 (App Router, Turbopack) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui、lucide-react |
| 認証 | Clerk（@clerk/nextjs v7） |
| データベース | Supabase（PostgreSQL） |
| メール送信 | Resend |
| ジョブスケジューリング | Vercel Cron Jobs（毎分実行、Pro必須） |

## ローカル開発手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .env.local を作成して環境変数を設定（下記参照）

# 3. Supabase SQL Editor で supabase/schema.sql を実行

# 4. Supabase SQL Editor で supabase/schema-push.sql を実行

# 5. 設問データをシード投入
npx tsx scripts/seed.ts

# 6. 開発サーバー起動（localhost:3000）
npm run dev
```

## 環境変数

`.env.local` に以下を設定してください。

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=AX-Diagnosis <noreply@yourdomain.com>

# プッシュ診断
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-secret
```

## Vercelへのデプロイ

1. [vercel.com](https://vercel.com) でリポジトリをImport
2. Root Directory に `3.CPO/ax-diagnosis` を指定
3. 環境変数を設定
4. Deploy
5. Cron（5分以下の間隔）には **Vercel Pro** が必要

## データベース構成

### schema.sql（既存）

| テーブル | 用途 |
|---------|------|
| `questions` | 診断設問 |
| `question_choices` | 設問の選択肢 |
| `hook_levels` / `hook_level_items` | Hookレベル定義 |
| `checkup_levels` / `checkup_level_items` | Checkupレベル定義 |
| `diagnoses` | 診断結果（スコア・軸別） |
| `diagnosis_answers` | 診断時の各問の回答 |

### schema-push.sql（追加実行）

| テーブル | 用途 |
|---------|------|
| `push_settings` | 軸別プッシュ設定（間隔・次回送信日時） |
| `push_tokens` | 送信ごとのトークン（設問ID・有効期限・回答状況） |

## 詳細仕様

詳細な要件定義は [RFP.md](./RFP.md) を参照してください。

## ライセンス

© 2026 vast fields inc. All rights reserved.
