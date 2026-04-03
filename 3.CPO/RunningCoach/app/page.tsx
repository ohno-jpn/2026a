"use client";

import { useEffect, useState } from "react";
import { Target, Calendar, TrendingUp, Zap, Plus, ChevronRight } from "lucide-react";
import { getGoal, getWorkoutLogs, getLatestAdvice } from "@/lib/storage";
import { daysUntil } from "@/lib/garmin";
import type { RaceGoal, WorkoutLog } from "@/lib/types";

function weeklyKm(logs: WorkoutLog[]): number {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return logs
    .filter((l) => l.garminActivity && new Date(l.date) >= monday)
    .reduce((sum, l) => sum + (l.garminActivity?.distanceKm ?? 0), 0);
}

function monthlyKm(logs: WorkoutLog[]): number {
  const firstDay = new Date();
  firstDay.setDate(1);
  firstDay.setHours(0, 0, 0, 0);
  return logs
    .filter((l) => l.garminActivity && new Date(l.date) >= firstDay)
    .reduce((sum, l) => sum + (l.garminActivity?.distanceKm ?? 0), 0);
}

function weeklyTSS(logs: WorkoutLog[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return logs
    .filter((l) => l.garminActivity?.trainingStressScore && new Date(l.date) >= sevenDaysAgo)
    .reduce((sum, l) => sum + (l.garminActivity?.trainingStressScore ?? 0), 0);
}

const TAG_LABELS: Record<string, string> = {
  pace: "ペース制御", heart_rate: "心拍管理", cadence: "ケイデンス",
  form: "フォーム", balance: "左右バランス", gct: "接地時間",
  vertical: "上下動", endurance: "持久力", strength: "筋力・パワー",
};

export default function DashboardPage() {
  const [goal, setGoal] = useState<RaceGoal | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGoal(getGoal() ?? null);
    setLogs(getWorkoutLogs());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const days = goal ? daysUntil(goal.raceDate) : null;
  const wKm  = weeklyKm(logs);
  const mKm  = monthlyKm(logs);
  const tss  = weeklyTSS(logs);
  const recentLogs = logs.slice(0, 5);
  const latestAdvice = getLatestAdvice();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-orange-500 text-lg tracking-tight">RunningCoach</span>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <a href="/goal" className="hover:text-gray-900 transition-colors">目標・計画</a>
            <a href="/log/new" className="hover:text-gray-900 transition-colors">記録</a>
            <a href="/history" className="hover:text-gray-900 transition-colors">履歴</a>
            <a href="/advice" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full transition-colors">
              今日の提案
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Hero: 目標大会 */}
        {goal ? (
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 text-white mb-8 shadow-lg shadow-orange-100">
            <p className="text-orange-100 text-sm font-semibold mb-1">次の目標</p>
            <h1 className="text-2xl font-extrabold mb-1">{goal.raceName}</h1>
            <p className="text-orange-100 text-sm mb-1">
              {goal.raceDate}　{goal.distanceKm}km　目標タイム {goal.targetTime}
            </p>
            {goal.targetPacePerKm && (
              <p className="text-orange-200 text-sm mb-4">目安ペース {goal.targetPacePerKm}/km</p>
            )}
            <a
              href="/goal"
              className="inline-block bg-white text-orange-500 font-bold px-6 py-2.5 rounded-full text-sm hover:bg-orange-50 transition-colors"
            >
              目標を編集する
            </a>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 text-white mb-8 shadow-lg shadow-orange-100">
            <p className="text-orange-100 text-sm font-semibold mb-1">まず目標を設定しましょう</p>
            <h1 className="text-2xl font-extrabold mb-1">目標大会を登録する</h1>
            <p className="text-orange-100 text-sm mb-4">目標タイムと大会日を登録すると、練習提案が始まります。</p>
            <a href="/goal" className="inline-block bg-white text-orange-500 font-bold px-6 py-2.5 rounded-full text-sm hover:bg-orange-50 transition-colors">
              目標を設定する →
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Target size={20} />, label: "大会まで", value: days !== null ? (days > 0 ? `${days} 日` : "本番当日！") : "—", color: "text-orange-500" },
            { icon: <Calendar size={20} />, label: "今週の走行", value: wKm > 0 ? `${wKm.toFixed(1)} km` : "0 km", color: "text-blue-500" },
            { icon: <TrendingUp size={20} />, label: "今月の走行", value: mKm > 0 ? `${mKm.toFixed(1)} km` : "0 km", color: "text-green-500" },
            { icon: <Zap size={20} />, label: "TSS（7日）", value: tss > 0 ? `${Math.round(tss)}` : "—", color: "text-violet-500" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className={`mb-2 ${color}`}>{icon}</div>
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">直近の練習</h2>
            <a href="/history" className="text-sm text-blue-500 hover:underline">すべて見る</a>
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-4">練習記録がまだありません</p>
              <a href="/log/new" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">
                <Plus size={16} /> 練習を記録する
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLogs.map((log) => {
                const a = log.garminActivity;
                return (
                  <a key={log.id} href={`/log/${log.date}`} className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-12 shrink-0">
                        <p className="text-lg font-extrabold text-gray-900 leading-none">{log.date.slice(8)}</p>
                        <p className="text-xs text-gray-400">{log.date.slice(5, 7)}月</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {a ? `${a.distanceKm.toFixed(2)}km` : "記録のみ"}
                          {a?.avgPacePerKm && <span className="text-gray-400 font-normal ml-2">{a.avgPacePerKm}/km</span>}
                        </p>
                        {log.theme?.text && (
                          <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{log.theme.text}</p>
                        )}
                        {log.theme?.tags && log.theme.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {log.theme.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{TAG_LABELS[tag] ?? tag}</span>
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
          )}
        </div>

        {/* Latest Advice */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">最新の練習提案</h2>
            <a href="/advice" className="text-sm text-orange-500 hover:underline">詳細を見る</a>
          </div>
          {latestAdvice ? (
            <div className="bg-orange-50 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-2">{latestAdvice.forDate} 向け</p>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{latestAdvice.advice}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">
              練習記録を追加すると、AIがメニューを提案します
            </p>
          )}
        </div>

      </main>
    </div>
  );
}
