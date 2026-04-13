"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

// ── 型 ───────────────────────────────────────────────────────
interface ZoneSummary {
  zone: number;
  total_seconds: number;
  minutes: number;
  percentage: number;
}

interface PerActivity {
  activity_id: string;
  date: string;
  distance_km: number;
  duration_sec: number;
  has_zone_data: boolean;
  zones: { zone: number; seconds: number; percentage: number }[];
}

type RangeType = "activity" | "day" | "week" | "month" | "3month" | "6month" | "year";
type TrendUnit = "activity" | "day" | "week" | "month";

// ── 定数 ─────────────────────────────────────────────────────
const ZONE_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#f59e0b", "#f87171"];
const ZONE_LABELS = ["Z1 回復", "Z2 有酸素", "Z3 有酸素強化", "Z4 閾値", "Z5 最大"];
const ZONE_DESC = [
  "非常に軽い — 〜50%HRmax",
  "軽い — 50〜60%",
  "中程度 — 60〜70%",
  "高強度 — 70〜80%",
  "最大強度 — 80%〜",
];

const RANGE_OPTIONS: { key: RangeType; label: string }[] = [
  { key: "activity", label: "アクティビティ" },
  { key: "day",      label: "日" },
  { key: "week",     label: "週" },
  { key: "month",    label: "月" },
  { key: "3month",   label: "3か月" },
  { key: "6month",   label: "6か月" },
  { key: "year",     label: "1年" },
];

// ── ユーティリティ ─────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMin(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// 基準日 + レンジ → from/to を計算
// すべて「基準日を終点、レンジ分遡った日を始点」
function calcDateRange(base: string, range: RangeType): { from: string; to: string } {
  const d = new Date(base);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);

  switch (range) {
    case "activity": {
      // 直近アクティビティ表示用: 1年前〜基準日
      const from = new Date(d); from.setFullYear(from.getFullYear() - 1);
      return { from: fmt(from), to: base };
    }
    case "day": {
      // 基準日の1日のみ
      return { from: base, to: base };
    }
    case "week": {
      // 基準日から7日前〜基準日
      const from = new Date(d); from.setDate(from.getDate() - 6);
      return { from: fmt(from), to: base };
    }
    case "month": {
      // 基準日から1ヶ月前〜基準日
      const from = new Date(d); from.setMonth(from.getMonth() - 1); from.setDate(from.getDate() + 1);
      return { from: fmt(from), to: base };
    }
    case "3month": {
      const from = new Date(d); from.setMonth(from.getMonth() - 3); from.setDate(from.getDate() + 1);
      return { from: fmt(from), to: base };
    }
    case "6month": {
      const from = new Date(d); from.setMonth(from.getMonth() - 6); from.setDate(from.getDate() + 1);
      return { from: fmt(from), to: base };
    }
    case "year": {
      const from = new Date(d); from.setFullYear(from.getFullYear() - 1); from.setDate(from.getDate() + 1);
      return { from: fmt(from), to: base };
    }
  }
}

// レンジ → トレンドの集計単位
function getTrendUnit(range: RangeType): TrendUnit {
  if (range === "activity" || range === "day") return "activity";
  if (range === "week" || range === "month") return "day";
  if (range === "3month") return "week";
  return "month"; // 6month / year
}

// ISO週ラベル (例: "26週")
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const thu = new Date(d); thu.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const year = thu.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${String(year).slice(2)}/${String(week).padStart(2, "0")}W`;
}

// per_activity データをトレンド単位で集計 → 棒グラフ用データ
function groupByTrendUnit(data: PerActivity[], unit: TrendUnit) {
  if (unit === "activity") {
    return data.map((a) => {
      const entry: Record<string, string | number> = {
        label: a.date.slice(5),
        _date: a.date,
      };
      a.zones.forEach((z) => { entry[`z${z.zone}`] = z.percentage; });
      return entry;
    });
  }

  const groups: Map<string, { label: string; seconds: number[] }> = new Map();

  for (const a of data) {
    let key: string;
    let label: string;
    if (unit === "day") {
      key = a.date; label = a.date.slice(5);
    } else if (unit === "week") {
      key = getWeekLabel(a.date); label = key;
    } else {
      key = a.date.slice(0, 7); label = key;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, seconds: [0, 0, 0, 0, 0] });
    }
    const g = groups.get(key)!;
    a.zones.forEach((z) => { g.seconds[z.zone - 1] += z.seconds; });
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => {
      const total = g.seconds.reduce((s, v) => s + v, 0);
      const entry: Record<string, string | number> = { label: g.label };
      g.seconds.forEach((sec, i) => {
        entry[`z${i + 1}`] = total > 0 ? Math.round((sec / total) * 1000) / 10 : 0;
      });
      return entry;
    });
}

// ── カスタム Tooltip ──────────────────────────────────────────
function PieCustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ZoneSummary }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-800">{ZONE_LABELS[d.zone - 1]}</p>
      <p className="text-gray-500 text-xs">{ZONE_DESC[d.zone - 1]}</p>
      <p className="mt-1 font-semibold">{fmtMin(d.total_seconds)} <span className="text-gray-400">({d.percentage}%)</span></p>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function HrZonesPage() {
  const [summary, setSummary]       = useState<ZoneSummary[]>([]);
  const [perActivity, setPerActivity] = useState<PerActivity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [baseDate, setBaseDate]     = useState(todayStr());
  const [range, setRange]           = useState<RangeType>("month");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = calcDateRange(baseDate, range);
    const res  = await fetch(`/api/hr-zones?from=${from}&to=${to}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "読み込みエラー");
    } else {
      setSummary(json.zones_summary ?? []);
      setPerActivity((json.per_activity ?? []).filter((a: PerActivity) => a.has_zone_data));
    }
    setLoading(false);
  }, [baseDate, range]);

  useEffect(() => { load(); }, [load]);

  const trendUnit = getTrendUnit(range);
  const trendData = useMemo(() => groupByTrendUnit(perActivity, trendUnit), [perActivity, trendUnit]);

  const hasData  = summary.some((s) => s.total_seconds > 0);
  const totalMin = summary.reduce((s, z) => s + z.minutes, 0);
  const { from, to } = calcDateRange(baseDate, range);

  const trendLabel =
    trendUnit === "activity" ? "各バー = 1アクティビティ" :
    trendUnit === "day"      ? "各バー = 1日" :
    trendUnit === "week"     ? "各バー = 1週" :
                               "各バー = 1ヶ月";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-bold text-orange-500 text-lg tracking-tight">RunningCoach</a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 text-sm font-medium">心拍ゾーン分析</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <a href="/activities" className="hover:text-gray-900 transition-colors">一覧</a>
            <a href="/analysis/hr-zones" className="text-gray-900 font-semibold">心拍ゾーン分析</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── コントロールパネル ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-center gap-6">

            {/* 基準日 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600 shrink-0">基準日</span>
              <input
                type="date"
                value={baseDate}
                max={todayStr()}
                onChange={(e) => setBaseDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                onClick={() => setBaseDate(todayStr())}
                className="text-xs text-orange-500 hover:text-orange-700 font-medium"
              >
                今日
              </button>
            </div>

            {/* レンジ */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600 shrink-0">レンジ</span>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeType)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 集計期間表示 */}
          <p className="text-xs text-gray-400 mt-3">
            集計期間: {from} 〜 {to}　／　{perActivity.length} 件のアクティビティ
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : !hasData ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-1">この期間の心拍ゾーンデータがありません</p>
            <p className="text-gray-400 text-xs">基準日やレンジを変更してみてください</p>
          </div>
        ) : (
          <>
            {/* ── ドーナツ + ゾーン別詳細 ── */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-1">ゾーン別比率</h2>
                <p className="text-xs text-gray-400 mb-4">合計 {totalMin} 分 / {perActivity.length} 回</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={summary.filter((s) => s.total_seconds > 0)}
                      dataKey="total_seconds"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {summary.map((_, i) => (
                        <Cell key={i} fill={ZONE_COLORS[i]} />
                      ))}
                    </Pie>
                    <PieTooltip content={<PieCustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">ゾーン別詳細</h2>
                <div className="space-y-3">
                  {summary.map((s, i) => (
                    <div key={s.zone}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{ZONE_LABELS[i]}</span>
                        <span className="text-sm text-gray-500">{fmtMin(s.total_seconds)} ({s.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${s.percentage}%`, backgroundColor: ZONE_COLORS[i] }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{ZONE_DESC[i]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── トレンド: 積み上げ棒グラフ ── */}
            {trendData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h2 className="font-bold text-gray-900 mb-1">心拍ゾーン トレンド (%)</h2>
                <p className="text-xs text-gray-400 mb-5">{trendLabel}</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        `${Number(v).toFixed(1)}%`,
                        ZONE_LABELS[Number(String(name).replace("z", "")) - 1],
                      ]}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    {[1, 2, 3, 4, 5].map((z) => (
                      <Bar key={z} dataKey={`z${z}`} stackId="a" fill={ZONE_COLORS[z - 1]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>

                {/* 凡例 */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {ZONE_LABELS.map((label, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ZONE_COLORS[i] }} />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── アクティビティ別一覧 ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">アクティビティ別ゾーン時間</h2>
              <div className="space-y-3">
                {perActivity.slice().reverse().map((a) => {
                  const totalSec = a.zones.reduce((s, z) => s + z.seconds, 0);
                  return (
                    <div key={a.activity_id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800">{a.date}</span>
                        <span className="text-xs text-gray-400">{a.distance_km?.toFixed(2)} km</span>
                      </div>
                      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                        {a.zones.map((z) =>
                          z.seconds > 0 ? (
                            <div
                              key={z.zone}
                              title={`${ZONE_LABELS[z.zone - 1]}: ${Math.round(z.seconds / 60)}分 (${z.percentage}%)`}
                              style={{
                                width: `${totalSec > 0 ? (z.seconds / totalSec) * 100 : 0}%`,
                                backgroundColor: ZONE_COLORS[z.zone - 1],
                              }}
                            />
                          ) : null
                        )}
                      </div>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {a.zones.filter((z) => z.seconds > 0).map((z) => (
                          <span key={z.zone} className="text-xs text-gray-400">
                            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ZONE_COLORS[z.zone - 1] }} />
                            Z{z.zone}: {Math.round(z.seconds / 60)}分
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
