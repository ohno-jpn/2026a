"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { parseGarminCSV } from "@/lib/garmin";
import { saveWorkoutLog, generateId } from "@/lib/storage";
import type { WorkoutLog, WorkoutTheme, ThemeTag, GarminActivity } from "@/lib/types";

const THEME_TAGS: { value: ThemeTag; label: string }[] = [
  { value: "pace",       label: "ペース制御" },
  { value: "heart_rate", label: "心拍管理" },
  { value: "cadence",    label: "ケイデンス" },
  { value: "form",       label: "フォーム" },
  { value: "balance",    label: "左右バランス" },
  { value: "gct",        label: "接地時間" },
  { value: "vertical",   label: "上下動" },
  { value: "endurance",  label: "持久力" },
  { value: "strength",   label: "筋力・パワー" },
];

const FATIGUE_LABELS = ["", "疲労感強い", "やや疲れ", "普通", "調子良い", "絶好調"];
const SLEEP_LABELS   = ["", "ほぼ眠れず", "浅い眠り", "普通", "よく眠れた", "熟睡"];
const EMOJIS_FATIGUE = ["😫", "😔", "😐", "😊", "💪"];
const EMOJIS_SLEEP   = ["😫", "😔", "😐", "😊", "😴"];

export default function NewLogPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1: テーマ
  const [themeText, setThemeText]       = useState("");
  const [selectedTags, setSelectedTags] = useState<ThemeTag[]>([]);

  // Step 2: 体調
  const [fatigue, setFatigue] = useState<1|2|3|4|5|null>(null);
  const [sleep, setSleep]     = useState<1|2|3|4|5|null>(null);
  const [conditionNote, setConditionNote] = useState("");

  // Step 3: GARMINデータ
  const [activities, setActivities]   = useState<GarminActivity[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [parseError, setParseError]   = useState("");
  const [dragging, setDragging]       = useState(false);

  // Step 4: コメント
  const [selfComment, setSelfComment] = useState("");

  function toggleTag(tag: ThemeTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleFile(file: File) {
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGarminCSV(text).filter(
          (a) => a.activityType.toLowerCase().includes("running") || a.distanceKm > 0
        );
        if (parsed.length === 0) {
          setParseError("ランニングアクティビティが見つかりませんでした。GARMINのCSVか確認してください。");
          return;
        }
        setActivities(parsed);
        setSelectedIdx(0);
      } catch {
        setParseError("CSVの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const activity = selectedIdx !== null ? activities[selectedIdx] : null;

  function handleSave() {
    const today = new Date().toISOString().slice(0, 10);
    const date = activity?.date
      ? new Date(activity.date).toISOString().slice(0, 10)
      : today;

    const theme: WorkoutTheme | undefined =
      themeText.trim() || selectedTags.length > 0
        ? { text: themeText.trim(), tags: selectedTags }
        : undefined;

    const log: WorkoutLog = {
      id: generateId(),
      date,
      theme,
      selfCondition:
        fatigue && sleep
          ? { fatigue, sleep, notes: conditionNote.trim() || undefined }
          : undefined,
      garminActivity: activity ?? undefined,
      selfComment: selfComment.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveWorkoutLog(log);
    router.push(`/log/${date}`);
  }

  const canSave = activity || themeText.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← ダッシュボード</a>
          <span className="font-bold text-gray-900">練習を記録する</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* STEP 1: テーマ */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
            <h2 className="font-bold text-gray-900">今日の練習テーマ <span className="text-gray-400 font-normal text-sm">（任意）</span></h2>
          </div>
          <textarea
            value={themeText}
            onChange={(e) => setThemeText(e.target.value)}
            placeholder="例：LT走で心拍を160台に保つ。後半にペースが落ちないよう上下動を抑えることを意識する。"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {THEME_TAGS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleTag(value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTags.includes(value)
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2: 体調 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</span>
            <h2 className="font-bold text-gray-900">練習前の体調 <span className="text-gray-400 font-normal text-sm">（任意）</span></h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">疲労感</p>
              <div className="flex gap-2">
                {EMOJIS_FATIGUE.map((emoji, i) => {
                  const val = (i + 1) as 1|2|3|4|5;
                  return (
                    <button
                      key={i}
                      onClick={() => setFatigue(val)}
                      title={FATIGUE_LABELS[val]}
                      className={`text-xl w-10 h-10 rounded-lg border-2 transition-all ${
                        fatigue === val ? "border-orange-400 bg-orange-50 scale-110" : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              {fatigue && <p className="text-xs text-orange-500 mt-1">{FATIGUE_LABELS[fatigue]}</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">睡眠の質</p>
              <div className="flex gap-2">
                {EMOJIS_SLEEP.map((emoji, i) => {
                  const val = (i + 1) as 1|2|3|4|5;
                  return (
                    <button
                      key={i}
                      onClick={() => setSleep(val)}
                      title={SLEEP_LABELS[val]}
                      className={`text-xl w-10 h-10 rounded-lg border-2 transition-all ${
                        sleep === val ? "border-orange-400 bg-orange-50 scale-110" : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              {sleep && <p className="text-xs text-orange-500 mt-1">{SLEEP_LABELS[sleep]}</p>}
            </div>
          </div>
          <input
            type="text"
            value={conditionNote}
            onChange={(e) => setConditionNote(e.target.value)}
            placeholder="その他メモ（例：右膝に違和感あり）"
            className="mt-4 w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </section>

        {/* STEP 3: GARMINデータ */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</span>
            <h2 className="font-bold text-gray-900">GARMINデータを取り込む <span className="text-gray-400 font-normal text-sm">（任意）</span></h2>
          </div>

          {activities.length === 0 ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300"
                }`}
              >
                <Upload className="mx-auto mb-3 text-gray-300" size={32} />
                <p className="text-gray-500 text-sm mb-1">CSVをドラッグ＆ドロップ</p>
                <p className="text-gray-400 text-xs">またはクリックしてファイルを選択</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              {parseError && (
                <div className="mt-3 flex items-start gap-2 text-red-500 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                GARMIN Connect → アクティビティ → 右上メニュー → エクスポート → CSV
              </p>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3 text-green-600 text-sm font-medium">
                <CheckCircle size={16} />
                {activities.length}件のアクティビティを読み込みました
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activities.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                      selectedIdx === i
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-100 hover:border-orange-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{a.title || a.activityType}</span>
                      <span className="text-gray-400 text-xs">{a.date}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {a.distanceKm.toFixed(2)}km　{a.time}　{a.avgPacePerKm && `avg ${a.avgPacePerKm}/km`}　{a.avgHR && `♥ ${a.avgHR}bpm`}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setActivities([]); setSelectedIdx(null); }}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                別のファイルを読み込む
              </button>
            </div>
          )}

          {/* 選択中アクティビティのデータプレビュー */}
          {activity && (
            <div className="mt-5 bg-gray-50 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "距離", value: `${activity.distanceKm.toFixed(2)} km` },
                { label: "タイム", value: activity.time },
                { label: "Avg ペース", value: activity.avgPacePerKm ? `${activity.avgPacePerKm}/km` : "—" },
                { label: "Avg 心拍", value: activity.avgHR ? `${activity.avgHR} bpm` : "—" },
                { label: "Max 心拍", value: activity.maxHR ? `${activity.maxHR} bpm` : "—" },
                { label: "ケイデンス", value: activity.avgCadence ? `${activity.avgCadence} spm` : "—" },
                { label: "接地時間", value: activity.avgGroundContactTime ? `${activity.avgGroundContactTime} ms` : "—" },
                { label: "上下動", value: activity.avgVerticalOscillation ? `${activity.avgVerticalOscillation} cm` : "—" },
                { label: "GCTバランス", value: activity.avgGCTBalance || "—" },
                { label: "TSS", value: activity.trainingStressScore ? `${activity.trainingStressScore}` : "—" },
                { label: "消費カロリー", value: activity.calories ? `${activity.calories} kcal` : "—" },
                { label: "上昇高度", value: activity.totalAscent ? `${activity.totalAscent} m` : "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STEP 4: 自己コメント */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">4</span>
            <h2 className="font-bold text-gray-900">振り返りコメント <span className="text-gray-400 font-normal text-sm">（任意）</span></h2>
          </div>
          <textarea
            value={selfComment}
            onChange={(e) => setSelfComment(e.target.value)}
            placeholder="テーマは達成できましたか？走っていて気づいたこと、体の感覚などを自由に記録してください。"
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </section>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
        >
          記録を保存する <ChevronRight size={18} />
        </button>

      </main>
    </div>
  );
}
