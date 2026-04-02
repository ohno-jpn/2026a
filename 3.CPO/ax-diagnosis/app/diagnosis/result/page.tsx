"use client";

import { useEffect, useState } from "react";
import { BarChart3, RotateCcw } from "lucide-react";
import { AXIS_LABELS, AXIS_DESC, type Axis } from "@/lib/questions";

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

const SCORE_LEVELS = [
  { min: 80, label: "Level 5", sublabel: "先進",   color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200"  },
  { min: 60, label: "Level 4", sublabel: "発展",   color: "text-lime-700",   bg: "bg-lime-50",   border: "border-lime-200"   },
  { min: 40, label: "Level 3", sublabel: "整備中", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  { min: 20, label: "Level 2", sublabel: "取組中", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { min:  0, label: "Level 1", sublabel: "初期",   color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200"    },
];

function getScoreLevel(score: number) {
  return SCORE_LEVELS.find((l) => score >= l.min) ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

function heatStyle(score: number) {
  if (score >= 80) return { bg: "#bbf7d0", border: "#86efac", text: "#14532d" };
  if (score >= 60) return { bg: "#d9f99d", border: "#bef264", text: "#365314" };
  if (score >= 40) return { bg: "#fef08a", border: "#fde047", text: "#713f12" };
  if (score >= 20) return { bg: "#fed7aa", border: "#fdba74", text: "#7c2d12" };
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
  org_hard: (s) => s >= 60
    ? "戦略・基盤の整備が進んでいます。さらなる高度化（API連携・継続改善ループ）を目指しましょう。"
    : "全社AI戦略のKGI設定・ガバナンス整備・データ基盤構築を優先的に進めることを推奨します。",
  org_soft: (s) => s >= 60
    ? "学習する組織文化が醸成されています。ナレッジ共有の仕組みと評価制度のさらなる連動を検討しましょう。"
    : "挑戦文化の醸成と、失敗を許容する心理的安全性の向上が急務です。まずは経営層の率先垂範から始めましょう。",
  ind_hard: (s) => s >= 60
    ? "AI技術の理解度が高い状態です。RAG・ワークフロー設計など応用・実装スキルの深化を図りましょう。"
    : "AIの基礎知識・セキュリティリスク・プロンプト技術の習得が必要です。体系的なリスキリングプログラムを設計しましょう。",
  ind_soft: (s) => s >= 60
    ? "AI活用の姿勢・思考習慣が身についています。周囲への横展開・メンタリングで組織全体を牽引しましょう。"
    : "業務課題の設定力・批判的思考・開放的なスタンスを育てる研修や1on1フォローを実施しましょう。",
};

export default function DiagnosisResultPage() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("ax_diagnosis_result");
    if (raw) {
      try { setResult(JSON.parse(raw)); } catch { /* ignore */ }
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
              { label: "Level 1 初期",   bg: "#fecaca", border: "#fca5a5" },
              { label: "Level 2 取組中", bg: "#fed7aa", border: "#fdba74" },
              { label: "Level 3 整備中", bg: "#fef08a", border: "#fde047" },
              { label: "Level 4 発展",   bg: "#d9f99d", border: "#bef264" },
              { label: "Level 5 先進",   bg: "#bbf7d0", border: "#86efac" },
            ].map(({ label, bg, border }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: bg, borderColor: border }} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
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
