"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, RefreshCw, CloudDownload, CheckCircle, AlertCircle, Loader, Search, X } from "lucide-react";

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

function toDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
  { label: "180日", days: 180 },
  { label: "1年", days: 365 },
  { label: "全期間", days: null },
] as const;

type SyncStatus = "idle" | "loading" | "ok" | "error";
type AutoSyncStatus = "syncing" | "done" | "uptodate" | "error";

export default function ActivitiesPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 期間フィルター
  const [fromDate, setFromDate] = useState(() => toDateStr(90));
  const [toDate, setToDate] = useState(today);
  const [activePreset, setActivePreset] = useState<number | null>(90);

  // キーワード検索
  const [keyword, setKeyword] = useState("");

  // 同期
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDays, setSyncDays] = useState(30);
  const [autoSync, setAutoSync] = useState<{ status: AutoSyncStatus; synced?: number; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/activities?from=${fromDate}&to=${toDate}&limit=2000`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "読み込みエラー");
    } else {
      setActivities(json.activities ?? []);
    }
    setLoading(false);
  }, [fromDate, toDate]);

  // ページ起動時に差分自動同期
  useEffect(() => {
    async function autoSyncOnMount() {
      setAutoSync({ status: "syncing" });
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days: 30, mode: "diff" }),
        });
        const json = await res.json();
        if (!res.ok) {
          setAutoSync({ status: "error", error: json.error ?? "同期エラー" });
        } else if (json.synced === 0) {
          setAutoSync({ status: "uptodate" });
        } else {
          setAutoSync({ status: "done", synced: json.synced });
        }
      } catch {
        setAutoSync({ status: "error", error: "ネットワークエラー" });
      }
      load();
    }
    autoSyncOnMount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncStatus("loading");
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: syncDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncError(json.error ?? "同期エラー");
        setSyncStatus("error");
      } else {
        setSyncResult({ synced: json.synced });
        setSyncStatus("ok");
        load();
        setTimeout(() => setSyncStatus("idle"), 5000);
      }
    } catch {
      setSyncError("ネットワークエラー");
      setSyncStatus("error");
    }
  }

  function applyPreset(days: number | null) {
    setActivePreset(days);
    setToDate(today);
    setFromDate(days === null ? "2000-01-01" : toDateStr(days));
  }

  function handleFromDate(val: string) {
    setFromDate(val);
    setActivePreset(null);
  }

  function handleToDate(val: string) {
    setToDate(val);
    setActivePreset(null);
  }

  // クライアントサイドのキーワードフィルター
  const filteredActivities = keyword.trim()
    ? activities.filter((a) => {
        const q = keyword.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.activity_type.toLowerCase().includes(q)
        );
      })
    : activities;

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
            <a href="/import" className="hover:text-gray-900 transition-colors">全件インポート</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* フィルターエリア */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-5 space-y-3">

          {/* 行1: 期間プリセット ＋ カスタム日付 ＋ 同期 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* プリセット ＋ カスタム日付 */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => applyPreset(days)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activePreset === days
                      ? "bg-orange-500 text-white"
                      : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-gray-300 text-sm mx-1">|</span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => handleFromDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <span className="text-gray-400 text-sm">〜</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) => handleToDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            {/* 更新 ＋ Garmin 同期 */}
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                更新
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={syncDays}
                  onChange={(e) => setSyncDays(Number(e.target.value))}
                  disabled={syncStatus === "loading"}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40"
                >
                  {[7, 14, 30, 90].map((d) => (
                    <option key={d} value={d}>直近{d}日</option>
                  ))}
                </select>
                <button
                  onClick={handleSync}
                  disabled={syncStatus === "loading"}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  {syncStatus === "loading" ? (
                    <Loader size={13} className="animate-spin" />
                  ) : syncStatus === "ok" ? (
                    <CheckCircle size={13} />
                  ) : (
                    <CloudDownload size={13} />
                  )}
                  {syncStatus === "loading" ? "同期中..." : "Garmin から同期"}
                </button>
              </div>
            </div>
          </div>

          {/* 行2: キーワード検索 */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="タイトル・アクティビティタイプで絞り込む"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 自動同期バナー */}
        {autoSync && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm border ${
            autoSync.status === "syncing"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : autoSync.status === "done"
              ? "bg-green-50 border-green-200 text-green-700"
              : autoSync.status === "uptodate"
              ? "bg-gray-50 border-gray-200 text-gray-500"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {autoSync.status === "syncing" && <Loader size={14} className="animate-spin shrink-0" />}
            {(autoSync.status === "done" || autoSync.status === "uptodate") && <CheckCircle size={14} className="shrink-0" />}
            {autoSync.status === "error" && <AlertCircle size={14} className="shrink-0" />}
            {autoSync.status === "syncing" && "Garmin に接続して新しいデータを確認中..."}
            {autoSync.status === "done" && `${autoSync.synced} 件の新しいアクティビティを取り込みました`}
            {autoSync.status === "uptodate" && "最新です（新しいデータなし）"}
            {autoSync.status === "error" && `自動同期エラー: ${autoSync.error}`}
          </div>
        )}

        {/* 手動同期結果 */}
        {syncStatus === "ok" && syncResult && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">
            <CheckCircle size={15} />
            {syncResult.synced} 件を Garmin から同期しました
          </div>
        )}
        {syncStatus === "error" && syncError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle size={15} />
            {syncError}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
            <p className="mt-1 text-red-500">Supabase の設定や MCP サーバーの同期状況を確認してください。</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-2">
              {keyword ? `「${keyword}」に一致するアクティビティがありません` : "データがありません"}
            </p>
            {keyword && (
              <button onClick={() => setKeyword("")} className="text-orange-500 text-sm hover:underline">
                検索をクリア
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">
              {filteredActivities.length} 件
              {keyword && activities.length !== filteredActivities.length && (
                <span className="ml-1 text-gray-300">（全 {activities.length} 件中）</span>
              )}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* ヘッダー */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-400 border-b border-gray-100">
                <span className="w-24">日付</span>
                <span>タイトル</span>
                <span className="w-16 text-right">距離</span>
                <span className="w-16 text-right">時間</span>
                <span className="w-16 text-right">ペース</span>
                <span className="w-14 text-right">HR</span>
                <span className="w-14 text-right">TSS</span>
                <span className="w-4" />
              </div>

              <div className="divide-y divide-gray-50">
                {filteredActivities.map((a) => (
                  <a
                    key={a.id}
                    href={`/activities/${a.id}`}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group"
                  >
                    <span className="w-24 text-sm font-semibold text-gray-700">{a.date.replace(/-/g, "/")}</span>
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
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
