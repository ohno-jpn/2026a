"use client";

import { useEffect, useState, useRef } from "react";
import { BarChart3, RotateCcw, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { AXIS_LABELS, AXIS_DESC, type Axis } from "@/lib/questions";
import { saveDiagnosis } from "@/lib/db/diagnoses";

type Level = 1 | 2 | 3;

interface DiagnosisResult {
  totalScore: number;
  axisScores: Record<Axis, number>;
  level: Level;
  completedAt: string;
}

const DEPTH_META: Record<Level, string> = {
  1: "Hook（4問）",
  2: "Checkup（16問）",
  3: "Biopsy（64問）",
};

const AXIS_ORDER: Axis[] = ["org_hard", "org_soft", "ind_hard", "ind_soft"];

const AXIS_COLOR: Record<Axis, string> = {
  org_hard: "#2563eb",
  org_soft: "#7c3aed",
  ind_hard: "#ea580c",
  ind_soft: "#16a34a",
};

// 診断アンケートで到達できるのは最大 Level 3。Level 4・5 は研修課題の完了で解放。
const SCORE_LEVELS = [
  { min: 67, label: "Level 3", sublabel: "整備中", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  { min: 34, label: "Level 2", sublabel: "取組中", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { min:  0, label: "Level 1", sublabel: "初期",   color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    },
];

function getScoreLevel(score: number) {
  return SCORE_LEVELS.find((l) => score >= l.min) ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

function heatStyle(score: number) {
  if (score >= 67) return { bg: "#fef08a", border: "#fde047", text: "#713f12" };
  if (score >= 34) return { bg: "#fed7aa", border: "#fdba74", text: "#7c2d12" };
  return              { bg: "#fecaca", border: "#fca5a5", text: "#7f1d1d" };
}

function ScoreRing({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

const AXIS_ADVICE: Record<Axis, (score: number) => string> = {
  org_hard: (s) => s >= 67
    ? "診断上の最高レベル（Level 3）に到達しています。Level 4・5 は研修プログラムの受講・課題完了で解放されます。"
    : "全社AI戦略のKGI設定・ガバナンス整備・データ基盤構築を優先的に進めることを推奨します。",
  org_soft: (s) => s >= 67
    ? "診断上の最高レベル（Level 3）に到達しています。Level 4・5 は研修プログラムの受講・課題完了で解放されます。"
    : "挑戦文化の醸成と、失敗を許容する心理的安全性の向上が急務です。まずは経営層の率先垂範から始めましょう。",
  ind_hard: (s) => s >= 67
    ? "診断上の最高レベル（Level 3）に到達しています。Level 4・5 は研修プログラムの受講・課題完了で解放されます。"
    : "AIの基礎知識・セキュリティリスク・プロンプト技術の習得が必要です。体系的なリスキリングプログラムを設計しましょう。",
  ind_soft: (s) => s >= 67
    ? "診断上の最高レベル（Level 3）に到達しています。Level 4・5 は研修プログラムの受講・課題完了で解放されます。"
    : "業務課題の設定力・批判的思考・開放的なスタンスを育てる研修や1on1フォローを実施しましょう。",
};

export default function DiagnosisResultPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error" | "all-correct">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const saved = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("ax_diagnosis_result");
    if (raw) {
      try {
        const parsed: DiagnosisResult = JSON.parse(raw);
        setResult(parsed);

        if (!saved.current) {
          saved.current = true;
          const depthMap: Record<Level, "hook" | "checkup" | "biopsy"> = { 1: "hook", 2: "checkup", 3: "biopsy" };
          const rawAnswers = localStorage.getItem("ax_diagnosis_answers");
          const answers: Record<string, string> = rawAnswers ? JSON.parse(rawAnswers) : {};
          saveDiagnosis({
            depth: depthMap[parsed.level],
            scores: {
              org_hard: parsed.axisScores.org_hard,
              org_soft: parsed.axisScores.org_soft,
              ind_hard: parsed.axisScores.ind_hard,
              ind_soft: parsed.axisScores.ind_soft,
            },
            answers,
          }).then((res) => {
            if ("id" in res) setDiagnosisId(res.id);
          }).catch(() => {/* 未ログイン時は無視 */});
        }
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
        <p className="text-gray-500 text-lg">まだ診断結果がありません。</p>
        <a
          href="/diagnosis"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-full shadow-lg shadow-orange-200 transition-all hover:scale-105"
        >
          診断を受ける →
        </a>
        <a href="/" className="text-blue-600 text-sm hover:underline">← トップに戻る</a>
      </div>
    );
  }

  async function sendEmail() {
    if (!diagnosisId) return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/send-wrong-answers-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus("error");
        setEmailMessage(data.error ?? "送信に失敗しました");
      } else if (data.allCorrect) {
        setEmailStatus("all-correct");
        setEmailMessage("個人Hard領域は全問正解です！");
      } else {
        setEmailStatus("sent");
        setEmailMessage(`不正解 ${data.sent} 問の解説をメール送信しました`);
      }
    } catch {
      setEmailStatus("error");
      setEmailMessage("ネットワークエラーが発生しました");
    }
  }

  const { totalScore, axisScores, level, completedAt } = result;
  const totalLevel = getScoreLevel(totalScore);
  const completedDate = new Date(completedAt).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ヒートマップ用マトリックス（行0=Hard, 行1=Soft / 列0=組織, 列1=個人）
  const matrix: Axis[][] = [
    ["org_hard", "ind_hard"],
    ["org_soft", "ind_soft"],
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-3xl mx-auto">

        {/* Back nav */}
        <a href="/" className="text-blue-600 text-sm font-semibold mb-8 inline-block hover:underline">
          ← トップに戻る
        </a>

        {/* 診断レベル上限の説明バナー */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-bold mb-1">📋 診断で到達できるのは最大 Level 3 です</p>
          <p className="text-amber-700 leading-relaxed">
            このアンケート診断（最大64問）では成熟度の現状把握を行います。<br />
            <strong>Level 4・5</strong> は研修プログラムの受講と課題完了によって初めて認定されます。
          </p>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <span className={`inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-3 tracking-widest uppercase ${totalLevel.bg} ${totalLevel.color}`}>
            診断結果
          </span>
          <p className="text-xs text-gray-400 mb-3">
            Depth {level}（{DEPTH_META[level]}）・{completedDate}
          </p>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            総合スコア&nbsp;
            <span className="text-blue-600">{totalScore}</span>
            <span className="text-2xl text-gray-400">/100</span>
          </h1>
          <p className={`inline-block font-bold text-lg px-5 py-1.5 rounded-full border ${totalLevel.bg} ${totalLevel.color} ${totalLevel.border}`}>
            成熟度 {totalLevel.label}（{totalLevel.sublabel}）
          </p>
        </div>

        {/* ── ヒートマップマトリックス ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> 4領域ヒートマップ
          </h2>
          <p className="text-xs text-gray-400 mb-5">緑＝Level 5（高）　赤＝Level 1（低）</p>

          <div style={{ display: "grid", gridTemplateColumns: "2rem 1fr 1fr", gap: "0.5rem" }}>
            {/* ヘッダー行 */}
            <div />
            <div className="text-center text-xs font-bold text-gray-500 pb-1">組織</div>
            <div className="text-center text-xs font-bold text-gray-500 pb-1">個人</div>

            {/* Hard行 */}
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Hard
              </span>
            </div>
            {matrix[0].map((axis) => {
              const score = axisScores[axis];
              const lv = getScoreLevel(score);
              const s = heatStyle(score);
              return (
                <div key={axis} className="rounded-xl p-4 border-2 text-center"
                  style={{ backgroundColor: s.bg, borderColor: s.border }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: s.text }}>{AXIS_LABELS[axis]}</p>
                  <p className="text-xs mb-2" style={{ color: s.text, opacity: 0.7 }}>{AXIS_DESC[axis]}</p>
                  <p className="text-3xl font-extrabold" style={{ color: s.text }}>{score}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: s.text }}>{lv.label}</p>
                </div>
              );
            })}

            {/* Soft行 */}
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Soft
              </span>
            </div>
            {matrix[1].map((axis) => {
              const score = axisScores[axis];
              const lv = getScoreLevel(score);
              const s = heatStyle(score);
              return (
                <div key={axis} className="rounded-xl p-4 border-2 text-center"
                  style={{ backgroundColor: s.bg, borderColor: s.border }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: s.text }}>{AXIS_LABELS[axis]}</p>
                  <p className="text-xs mb-2" style={{ color: s.text, opacity: 0.7 }}>{AXIS_DESC[axis]}</p>
                  <p className="text-3xl font-extrabold" style={{ color: s.text }}>{score}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: s.text }}>{lv.label}</p>
                </div>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: "Level 1 初期",   bg: "#fecaca", border: "#fca5a5", locked: false },
              { label: "Level 2 取組中", bg: "#fed7aa", border: "#fdba74", locked: false },
              { label: "Level 3 整備中", bg: "#fef08a", border: "#fde047", locked: false },
              { label: "Level 4 発展",   bg: "#e5e7eb", border: "#d1d5db", locked: true  },
              { label: "Level 5 先進",   bg: "#e5e7eb", border: "#d1d5db", locked: true  },
            ].map(({ label, bg, border, locked }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: bg, borderColor: border }} />
                <span className={`text-xs ${locked ? "text-gray-400" : "text-gray-500"}`}>
                  {label}{locked ? " 🔒" : ""}
                </span>
              </div>
            ))}
          </div>
          {/* Level上限の注記 */}
          <p className="mt-3 text-center text-xs text-gray-400">
            🔒 Level 4・5 は研修プログラムの課題完了によって解放されます
          </p>
        </div>

        {/* ── 領域別スコア（リング） ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">領域別スコア</h2>
          <div className="grid grid-cols-2 gap-6">
            {AXIS_ORDER.map((axis) => {
              const score = axisScores[axis];
              const lv = getScoreLevel(score);
              const color = AXIS_COLOR[axis];
              return (
                <div key={axis} className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <ScoreRing score={score} color={color} size={72} />
                    <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>
                      {score}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{AXIS_LABELS[axis]}</p>
                    <p className="text-xs text-gray-400">{AXIS_DESC[axis]}</p>
                    <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>
                      {lv.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 領域別アドバイス ── */}
        <div className="space-y-3 mb-8">
          {AXIS_ORDER.map((axis) => (
            <div key={axis} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="font-bold text-gray-900 text-sm mb-1">
                <span style={{ color: AXIS_COLOR[axis] }}>■</span>{" "}
                {AXIS_LABELS[axis]}（{AXIS_DESC[axis]}）
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{AXIS_ADVICE[axis](axisScores[axis])}</p>
            </div>
          ))}
        </div>

        {/* ── 個人Hard 解説メール ── */}
        {diagnosisId && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail size={18} className="text-blue-600" /> 個人Hard 不正解問題の解説をメールで受け取る
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              個人Hard（テクニカルスキル）領域で間違えた問題の解説を、登録メールアドレスに送信します。
            </p>
            {emailStatus === "idle" && (
              <button
                onClick={sendEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2"
              >
                <Mail size={14} /> 解説メールを送信する
              </button>
            )}
            {emailStatus === "sending" && (
              <p className="text-sm text-gray-500 animate-pulse">送信中...</p>
            )}
            {emailStatus === "sent" && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 size={16} /> {emailMessage}
              </p>
            )}
            {emailStatus === "all-correct" && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 size={16} /> {emailMessage}
              </p>
            )}
            {emailStatus === "error" && (
              <div>
                <p className="text-sm text-red-500 flex items-center gap-2 mb-2">
                  <AlertCircle size={16} /> {emailMessage}
                </p>
                <button onClick={() => setEmailStatus("idle")} className="text-xs text-blue-600 underline">
                  再試行
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white shadow-xl shadow-blue-200">
          <p className="text-xl font-extrabold mb-2">次のステップ</p>
          <p className="text-blue-200 text-sm mb-6">
            詳細な課題分析・改善ロードマップの作成はProプランで。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/#pricing"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg shadow-orange-300"
            >
              Proプランで詳細レポートを見る
            </a>
            <a
              href="/diagnosis"
              className="flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold py-3 px-8 rounded-full hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={16} /> もう一度診断する
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
