"use client";

import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { saveGoal, getGoal, generateId } from "@/lib/storage";
import { calcTargetPace } from "@/lib/garmin";
import type { RaceGoal } from "@/lib/types";

const PRESET_DISTANCES = [
  { label: "ウルトラマラソン（100km）", value: "100" },
  { label: "フルマラソン（42.195km）", value: "42.195" },
  { label: "ハーフマラソン（21.0975km）", value: "21.0975" },
  { label: "10km", value: "10" },
  { label: "5km", value: "5" },
  { label: "カスタム", value: "custom" },
];

function parseTargetTime(s: string): number | null {
  const parts = s.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return null;
}

export default function GoalPage() {
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distanceSelect, setDistanceSelect] = useState("42.195");
  const [customDistance, setCustomDistance] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [saved, setSaved] = useState(false);

  // 既存データをロード
  useEffect(() => {
    const existing = getGoal();
    if (existing) {
      setRaceName(existing.raceName);
      setRaceDate(existing.raceDate);
      const preset = PRESET_DISTANCES.find(
        (d) => d.value !== "custom" && parseFloat(d.value) === existing.distanceKm
      );
      if (preset) {
        setDistanceSelect(preset.value);
      } else {
        setDistanceSelect("custom");
        setCustomDistance(String(existing.distanceKm));
      }
      setTargetTime(existing.targetTime);
    }
  }, []);

  const distanceKm = distanceSelect === "custom"
    ? parseFloat(customDistance) || 0
    : parseFloat(distanceSelect);

  const targetPace = (() => {
    const secs = parseTargetTime(targetTime);
    if (!secs || !distanceKm) return null;
    return calcTargetPace(targetTime, distanceKm);
  })();

  const isValid = raceName.trim() && raceDate && distanceKm > 0 && parseTargetTime(targetTime);

  function handleSave() {
    if (!isValid) return;
    const goal: RaceGoal = {
      id: getGoal()?.id ?? generateId(),
      raceName: raceName.trim(),
      raceDate,
      distanceKm,
      targetTime,
      targetPacePerKm: targetPace ?? "",
      createdAt: getGoal()?.createdAt ?? new Date().toISOString(),
    };
    saveGoal(goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← ダッシュボード</a>
          <span className="font-bold text-gray-900">目標・練習計画</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* 目標大会 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">目標大会・目標タイム</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 大会名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">大会名</label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="例：東京マラソン2027"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* 開催日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開催日</label>
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* 距離 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">距離</label>
              <select
                value={distanceSelect}
                onChange={(e) => setDistanceSelect(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {PRESET_DISTANCES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              {distanceSelect === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={customDistance}
                    onChange={(e) => setCustomDistance(e.target.value)}
                    placeholder="距離を入力"
                    min="1"
                    step="0.001"
                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-sm text-gray-500 shrink-0">km</span>
                </div>
              )}
            </div>

            {/* 目標タイム */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目標タイム</label>
              <input
                type="text"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                placeholder="例：03:30:00"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">HH:MM:SS 形式（例：03:30:00）</p>
            </div>
          </div>

          {/* 目安ペース */}
          <div className="mt-6 p-4 bg-orange-50 rounded-xl">
            {targetPace ? (
              <>
                <p className="text-sm text-orange-700 font-bold">目安ペース：{targetPace} / km</p>
                <p className="text-xs text-orange-500 mt-0.5">
                  {raceName || "目標大会"} {distanceKm}km を {targetTime} で完走するペース
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-orange-400 font-medium">目安ペース：— / km</p>
                <p className="text-xs text-orange-300 mt-0.5">大会距離と目標タイムを入力すると自動計算されます</p>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid}
            className="mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2"
          >
            {saved ? (
              <><CheckCircle size={18} /> 保存しました</>
            ) : "保存する"}
          </button>
        </section>

        {/* 週次練習計画（フェーズ1では手入力メモとして実装予定） */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">週次練習計画</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">実装予定</span>
          </div>
          <p className="text-gray-400 text-sm text-center py-8">次のフェーズで実装します</p>
        </section>

      </main>
    </div>
  );
}
