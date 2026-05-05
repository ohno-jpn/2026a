-- ── 動的診断設定 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  axis          TEXT NOT NULL CHECK (axis IN ('OH','OS','PH','PS')),
  interval_days INTEGER NOT NULL DEFAULT 0,  -- 0=無効, 7/14/28
  enabled       BOOLEAN NOT NULL DEFAULT false,
  next_send_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, axis)
);

-- ── 送信トークン（メール内一回限りURL用） ────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  axis          TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  question_ids  JSONB NOT NULL DEFAULT '[]',  -- 送信した設問IDの配列
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  answered_at   TIMESTAMPTZ,
  diagnosis_id  UUID REFERENCES diagnoses(id)
);

CREATE INDEX IF NOT EXISTS idx_push_settings_user  ON push_settings(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_push_settings_next  ON push_settings(next_send_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token   ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user    ON push_tokens(clerk_user_id);
