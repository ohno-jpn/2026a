"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Tag } from "lucide-react";
import { getWorkoutLogByDate } from "@/lib/storage";
import type { WorkoutLog } from "@/lib/types";

const TAG_LABELS: Record<string, string> = {
  pace: "ペース制御", heart_rate: "心拍管理", cadence: "ケイデンス",
  form: "フォーム", balance: "左右バランス", gct: "接地時間",
  vertical: "上下動", endurance: "持久力", strength: "筋力・パワー",
};

const FATIGUE_LABELS = ["", "疲労感強い", "やや疲れ", "普通", "調子良い", "絶好調"];
const SLEEP_LABELS   = ["", "ほぼ眠れず", "浅い眠り", "普通", "よく眠れた", "熟睡"];
const EMOJIS_FATIGUE = ["😫", "😔", "😐", "😊", "💪"];
const EMOJIS_SLEEP   = ["😫", "😔", "😐", "😊", "😴"];

function DataItem({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

export default function LogDetailPage() {
  const { date } = useParams<{ date: string }>();
  const [log, setLog] = useState<WorkoutLog | null | undefined>(undefined);

  useEffect(() => {
    const found = getWorkoutLogByDate(date);
    setLog(found ?? null);
  }, [date]);

  if (log === undefined) return null;

  if (log === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{date} の練習記録が見つかりません</p>
        <a href="/log/new" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-600 transition-colors">
          記録を追加する
        </a>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← ダッシュボード</a>
      </div>
    );
  }

  const { theme, selfCondition, garminActivity: a, selfComment } = log;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} /> ダッシュボード
          </a>
          <span className="font-bold text-gray-900">{date} の練習</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* テーマ */}
        {theme && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-3">今日の練習テーマ</h2>
            {theme.text && <p className="text-gray-700 text-sm leading-relaxed mb-3">{theme.text}</p>}
            {theme.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {theme.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
                    <Tag size={11} /> {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 体調 */}
        {selfCondition && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">練習前の体調</h2>
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-400 mb-1">疲労感</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{EMOJIS_FATIGUE[selfCondition.fatigue - 1]}</span>
                  <span className="text-sm text-gray-700">{FATIGUE_LABELS[selfCondition.fatigue]}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">睡眠</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{EMOJIS_SLEEP[selfCondition.sleep - 1]}</span>
                  <span className="text-sm text-gray-700">{SLEEP_LABELS[selfCondition.sleep]}</span>
                </div>
              </div>
            </div>
            {selfCondition.notes && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">{selfCondition.notes}</p>
            )}
          </section>
        )}

        {/* GARMINデータ */}
        {a && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">{a.title || "ランニング"}</h2>
            <p className="text-xs text-gray-400 mb-4">{a.activityType} · {a.date}</p>

            {/* メイン指標 */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center bg-orange-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-orange-500">{a.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">km</p>
              </div>
              <div className="text-center bg-blue-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-blue-500">{a.time}</p>
                <p className="text-xs text-gray-500 mt-0.5">タイム</p>
              </div>
              <div className="text-center bg-green-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-green-600">{a.avgPacePerKm ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">avg ペース/km</p>
              </div>
            </div>

            {/* 詳細指標 */}
            <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DataItem label="Avg 心拍" value={a.avgHR ? `${a.avgHR} bpm` : "—"} />
              <DataItem label="Max 心拍" value={a.maxHR ? `${a.maxHR} bpm` : "—"} />
              <DataItem label="Aerobic TE" value={a.aerobicTE ? `${a.aerobicTE}` : "—"} />
              <DataItem label="Avg ケイデンス" value={a.avgCadence ? `${a.avgCadence} spm` : "—"} />
              <DataItem label="Avg 接地時間" value={a.avgGroundContactTime ? `${a.avgGroundContactTime} ms` : "—"} />
              <DataItem label="GCTバランス" value={a.avgGCTBalance || "—"} />
              <DataItem label="上下動" value={a.avgVerticalOscillation ? `${a.avgVerticalOscillation} cm` : "—"} />
              <DataItem label="垂直比" value={a.avgVerticalRatio ? `${a.avgVerticalRatio}%` : "—"} />
              <DataItem label="ストライド" value={a.avgStrideLength ? `${a.avgStrideLength} m` : "—"} />
              <DataItem label="Avg GAP" value={a.avgGAP ? `${a.avgGAP}/km` : "—"} />
              <DataItem label="TSS" value={a.trainingStressScore ? `${a.trainingStressScore}` : "—"} />
              <DataItem label="Normalized Power" value={a.normalizedPower ? `${a.normalizedPower} W` : "—"} />
              <DataItem label="上昇高度" value={a.totalAscent ? `${a.totalAscent} m` : "—"} />
              <DataItem label="消費カロリー" value={a.calories ? `${a.calories} kcal` : "—"} />
              <DataItem label="Body Battery消費" value={a.bodyBatteryDrain ? `${a.bodyBatteryDrain}` : "—"} />
            </div>
          </section>
        )}

        {/* 自己コメント */}
        {selfComment && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-3">振り返りコメント</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selfComment}</p>
          </section>
        )}

        {/* AI評価（未実装） */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-3">AI評価</h2>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-gray-400 text-sm">AI評価機能は次フェーズで実装します</p>
          </div>
        </section>

        <div className="flex gap-4">
          <a href="/log/new" className="flex-1 text-center border-2 border-orange-500 text-orange-500 font-bold py-3 rounded-full hover:bg-orange-50 transition-colors text-sm">
            + 別の練習を記録する
          </a>
          <a href="/advice" className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-full transition-colors text-sm">
            明日の練習提案を見る →
          </a>
        </div>

      </main>
    </div>
  );
}
