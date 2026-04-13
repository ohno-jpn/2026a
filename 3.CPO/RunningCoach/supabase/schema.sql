-- ============================================================
-- RunningCoach — Supabase スキーマ
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ── activities ──────────────────────────────────────────────
create table if not exists activities (
  id                        text primary key,          -- Garmin Activity ID
  date                      date not null,             -- 実施日
  title                     text,
  activity_type             text,
  distance_km               numeric(8,3),
  duration_sec              int,
  calories                  int,

  -- 心拍
  avg_hr                    int,
  max_hr                    int,
  aerobic_te                numeric(4,1),

  -- ペース (秒/km)
  avg_pace_sec_per_km       int,

  -- ランニングダイナミクス
  avg_cadence               int,
  max_cadence               int,
  avg_stride_length         numeric(5,3),
  avg_vertical_oscillation  numeric(5,2),
  avg_ground_contact_time   int,
  avg_vertical_ratio        numeric(5,2),
  avg_gct_balance           text,

  -- パワー
  normalized_power          int,
  avg_power                 int,
  max_power                 int,
  training_stress_score     numeric(7,2),

  -- コース
  total_ascent              numeric(7,1),
  total_descent             numeric(7,1),

  -- 環境
  min_temp                  numeric(5,1),
  max_temp                  numeric(5,1),

  -- メタ
  steps                     int,
  raw_json                  jsonb,
  synced_at                 timestamptz default now()
);

-- ── hr_zones ────────────────────────────────────────────────
-- Garmin の 5 ゾーン定義に対応
create table if not exists hr_zones (
  id          bigserial primary key,
  activity_id text not null references activities(id) on delete cascade,
  zone        int  not null check (zone between 1 and 5),
  seconds     int  not null default 0,
  percentage  numeric(5,2),
  unique (activity_id, zone)
);

-- ── インデックス ─────────────────────────────────────────────
create index if not exists idx_activities_date on activities(date desc);
create index if not exists idx_hr_zones_activity_id on hr_zones(activity_id);
