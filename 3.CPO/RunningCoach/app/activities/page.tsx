"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

interface Activity {
  id: string;
  date: string;
  title: string;
  activity_type: string;
  distance_km: number;
  duration_sec: number;
  avg_hr: number | null;
  max_hr: number | null;
  avg_pace_sec_per_km: number | null;
  training_stress_score: number | null;
  aerobic_te: number | null;
  avg_cadence: number | null;
  total_ascent: number | null;
  calories: number | null;
}

function fmtPace(sec: number | null) {
  if (!sec) return "—";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function fmtDuration(sec: number | null) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const ZONE_COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#f59e0b", "#f87171"];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    const res = await fetch(`/api/activities?from=${fromStr}&limit=200`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "読み込みエラー");
    } else {
      setActivities(json.activities ?? []);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-bold text-orange-500 text-lg tracking-tight">RunningCoach</a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 text-sm font-medium">アクティビティ一覧</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <a href="/activities" className="text-gray-900 font-semibold">一覧</a>
            <a href="/analysis/hr-zones" className="hover:text-gray-900 transition-colors">心拍ゾーン分析</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* フィルター */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  days === d
                    ? "bg-orange-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
                }`}
              >
                {d === 365 ? "1年" : `${d}日`}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            更新
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
            <p className="mt-1 text-red-500">Supabase の設定や MCP サーバーの同期状況を確認してください。</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-2">データがありません</p>
            <p className="text-gray-400 text-xs">Claude に「sync_activities ツールで Garmin を同期して」と伝えてください</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">{activities.length} 件</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* ヘッダー */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-400 border-b border-gray-100">
                <span className="w-20">日付</span>
                <span>タイトル</span>
                <span className="w-16 text-right">距離</span>
                <span className="w-16 text-right">時間</span>
                <span className="w-16 text-right">ペース</span>
                <span className="w-14 text-right">HR</span>
                <span className="w-14 text-right">TSS</span>
              </div>

              <div className="divide-y divide-gray-50">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group"
                  >
                    <span className="w-20 text-sm font-semibold text-gray-700">{a.date.slice(5)}</span>
                    <span className="text-sm text-gray-800 truncate">{a.title || a.activity_type}</span>
                    <span className="w-16 text-right text-sm font-semibold text-gray-900">
                      {a.distance_km ? `${a.distance_km.toFixed(2)}km` : "—"}
                    </span>
                    <span className="w-16 text-right text-sm text-gray-500">{fmtDuration(a.duration_sec)}</span>
                    <span className="w-16 text-right text-sm text-gray-500">{fmtPace(a.avg_pace_sec_per_km)}/km</span>
                    <span className="w-14 text-right text-sm text-gray-500">
                      {a.avg_hr ? (
                        <span className="text-red-500 font-medium">{a.avg_hr}</span>
                      ) : "—"}
                    </span>
                    <span className="w-14 text-right text-sm text-gray-500">
                      {a.training_stress_score ? Math.round(a.training_stress_score) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
