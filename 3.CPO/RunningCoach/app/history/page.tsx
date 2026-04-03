"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getWorkoutLogs } from "@/lib/storage";
import type { WorkoutLog } from "@/lib/types";

const TAG_LABELS: Record<string, string> = {
  pace: "ペース制御", heart_rate: "心拍管理", cadence: "ケイデンス",
  form: "フォーム", balance: "左右バランス", gct: "接地時間",
  vertical: "上下動", endurance: "持久力", strength: "筋力・パワー",
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    setLogs(getWorkoutLogs());
  }, []);

  // 月ごとにグループ化
  const byMonth: Record<string, WorkoutLog[]> = {};
  for (const log of logs) {
    const month = log.date.slice(0, 7); // "YYYY-MM"
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(log);
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const totalKm = logs.reduce((s, l) => s + (l.garminActivity?.distanceKm ?? 0), 0);
  const totalRuns = logs.filter((l) => l.garminActivity).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← ダッシュボード</a>
          <span className="font-bold text-gray-900">練習履歴</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* サマリー */}
        {logs.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-orange-500">{totalKm.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">累計走行距離 (km)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-blue-500">{totalRuns}</p>
              <p className="text-xs text-gray-400 mt-1">ランニング回数</p>
            </div>
          </div>
        )}

        {/* ログ一覧 */}
        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 mb-4">練習記録がまだありません</p>
            <a href="/log/new" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full transition-colors text-sm">
              最初の練習を記録する
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {months.map((month) => {
              const monthLogs = byMonth[month];
              const monthKm = monthLogs.reduce((s, l) => s + (l.garminActivity?.distanceKm ?? 0), 0);
              return (
                <div key={month}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="font-bold text-gray-700 text-sm">{month.replace("-", "年")}月</h2>
                    <span className="text-xs text-gray-400">{monthKm.toFixed(1)} km</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {monthLogs.map((log) => {
                      const a = log.garminActivity;
                      return (
                        <a key={log.id} href={`/log/${log.date}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="text-center w-10 shrink-0">
                              <p className="text-xl font-extrabold text-gray-900 leading-none">{log.date.slice(8)}</p>
                              <p className="text-xs text-gray-400">日</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                {a ? (
                                  <>
                                    <span className="text-sm font-bold text-gray-900">{a.distanceKm.toFixed(2)} km</span>
                                    {a.avgPacePerKm && <span className="text-sm text-gray-400">{a.avgPacePerKm}/km</span>}
                                    {a.avgHR && <span className="text-sm text-gray-400">♥ {a.avgHR}</span>}
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500">テーマ記録のみ</span>
                                )}
                              </div>
                              {log.theme?.text && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{log.theme.text}</p>
                              )}
                              {log.theme?.tags && log.theme.tags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {log.theme.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                      {TAG_LABELS[tag] ?? tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
