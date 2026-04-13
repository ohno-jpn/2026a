"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
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

function fmtMin(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// ── カスタム Tooltip ──────────────────────────────────────────
function PieCustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: ZoneSummary }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-800">{ZONE_LABELS[d.zone - 1]}</p>
      <p className="text-gray-500">{ZONE_DESC[d.zone - 1]}</p>
      <p className="mt-1 font-semibold">{fmtMin(d.total_seconds)} <span className="text-gray-400">({d.percentage}%)</span></p>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function HrZonesPage() {
  const [summary, setSummary] = useState<ZoneSummary[]>([]);
  const [perActivity, setPerActivity] = useState<PerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    const res = await fetch(`/api/hr-zones?from=${fromStr}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "読み込みエラー");
    } else {
      setSummary(json.zones_summary ?? []);
      setPerActivity((json.per_activity ?? []).filter((a: PerActivity) => a.has_zone_data));
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // 積み上げ棒グラフ用データ（各アクティビティごとの比率）
  const barData = perActivity.map((a) => {
    const entry: Record<string, string | number> = { date: a.date.slice(5) };
    a.zones.forEach((z) => { entry[`z${z.zone}`] = z.percentage; });
    return entry;
  });

  const hasData = summary.some((s) => s.total_seconds > 0);
  const totalMin = summary.reduce((s, z) => s + z.minutes, 0);

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
        {/* 期間フィルター */}
        <div className="flex items-center gap-2 mb-8">
          {[7, 30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === d
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
              }`}
            >
              {d === 7 ? "1週間" : d === 30 ? "1ヶ月" : d === 90 ? "3ヶ月" : "6ヶ月"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : !hasData ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-2">心拍ゾーンデータがありません</p>
            <p className="text-gray-400 text-xs">Claude に「sync_activities で Garmin を同期して」と伝えてください</p>
          </div>
        ) : (
          <>
            {/* 上段: ドーナツ + ゾーン別サマリー */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* ドーナツグラフ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-1">ゾーン別比率</h2>
                <p className="text-xs text-gray-400 mb-4">合計 {totalMin} 分 / {perActivity.length} 回</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={summary.filter((s) => s.total_seconds > 0)}
                      dataKey="total_seconds"
                      nameKey="zone"
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

              {/* ゾーン別詳細 */}
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

            {/* 積み上げ棒グラフ: アクティビティ別ゾーン内訳 */}
            {barData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                <h2 className="font-bold text-gray-900 mb-1">練習ごとの心拍ゾーン内訳 (%)</h2>
                <p className="text-xs text-gray-400 mb-4">各バーが 1 回の練習</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
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
              </div>
            )}

            {/* アクティビティ別一覧 */}
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
                              className="h-full transition-all"
                              style={{
                                width: `${totalSec > 0 ? (z.seconds / totalSec) * 100 : 0}%`,
                                backgroundColor: ZONE_COLORS[z.zone - 1],
                              }}
                            />
                          ) : null
                        )}
                      </div>
                      <div className="flex gap-3 mt-2">
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
