"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import {
  getQuestionsByLevel,
  computeAxisScores,
  AXIS_LABELS,
  type Question,
  type Axis,
} from "@/lib/questions";

type Level = 1 | 2 | 3;
type Step = "intro" | "question";

const LEVEL_META: Record<Level, { label: string; questions: string; time: string; desc: string }> = {
  1: { label: "Hook", questions: "4問", time: "約2分", desc: "4領域それぞれの代表質問で現状を素早く把握します。" },
  2: { label: "Checkup", questions: "16問", time: "約8分", desc: "各領域4問ずつ、シナリオ選択と知識問題で詳細を診断します。" },
  3: { label: "Biopsy", questions: "64問", time: "約20分", desc: "全64問の詳細診断で組織・個人の強みと弱点を完全把握します。" },
};


export default function DiagnosisPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [level, setLevel] = useState<Level>(2);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [cbSelections, setCbSelections] = useState<number[]>([]);

  const questions = useMemo(() => getQuestionsByLevel(level), [level]);
  const totalQ = questions.length;
  const currentQ: Question | undefined = questions[currentIndex];

  function startDiagnosis() {
    setAnswers({});
    setCbSelections([]);
    setCurrentIndex(0);
    setStep("question");
  }

  function handleMcSelect(idx: number) {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.id]: idx };
    setAnswers(next);
    setTimeout(() => advance(next), 300);
  }

  function handleCbToggle(idx: number) {
    setCbSelections((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  function submitCb() {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.id]: cbSelections };
    setAnswers(next);
    setCbSelections([]);
    advance(next);
  }

  function advance(ans: Record<string, number | number[]>) {
    if (currentIndex + 1 >= totalQ) {
      const scores = computeAxisScores(questions, ans);
      const vals = Object.values(scores);
      const total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      localStorage.setItem(
        "ax_diagnosis_result",
        JSON.stringify({ totalScore: total, axisScores: scores, level, completedAt: new Date().toISOString() })
      );
      router.push("/diagnosis/result");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goBack() {
    if (currentIndex === 0) {
      setStep("intro");
    } else {
      setCurrentIndex((i) => i - 1);
      if (currentQ?.type === "cb") setCbSelections([]);
    }
  }

  function reset() {
    setAnswers({});
    setCbSelections([]);
    setCurrentIndex(0);
    setStep("intro");
  }

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6 py-16">
        <a href="/" className="text-blue-600 text-sm font-semibold mb-10 hover:underline">
          ← トップに戻る
        </a>
        <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">
          AX診断スタート
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 text-center mb-4">
          診断の深度を選択してください
        </h1>
        <p className="text-gray-500 text-center mb-10 max-w-lg">
          組織のAXトランスフォーメーション準備状況を、4領域（組織×Hard・Soft、個人×Hard・Soft）でスコアリングします。
        </p>

        <div className="grid md:grid-cols-3 gap-6 w-full max-w-3xl mb-10">
          {([1, 2, 3] as Level[]).map((lv) => {
            const meta = LEVEL_META[lv];
            const selected = level === lv;
            return (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`rounded-2xl border-2 p-6 text-left transition-all ${
                  selected
                    ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-100"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${selected ? "text-blue-600" : "text-gray-400"}`}>
                    Depth {lv}
                  </span>
                  {selected && <CheckCircle size={18} className="text-blue-600" />}
                </div>
                <p className="text-xl font-extrabold text-gray-900 mb-1">{meta.label}</p>
                <p className="text-sm text-gray-500 mb-3">{meta.questions}・{meta.time}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{meta.desc}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={startDiagnosis}
          className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-12 py-4 rounded-full shadow-lg shadow-orange-200 transition-all hover:scale-105"
        >
          診断を始める →
        </button>
        <p className="mt-4 text-sm text-gray-400">所要時間: {LEVEL_META[level].time}</p>
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────
  if (!currentQ) return null;

  const progress = ((currentIndex) / totalQ) * 100;
  const isAnswered = answers[currentQ.id] !== undefined;
  const currentAnswer = answers[currentQ.id];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 z-50">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top nav */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-40">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={18} /> 戻る
          </button>
          <span className="text-sm font-semibold text-gray-500">
            {currentIndex + 1} / {totalQ}
          </span>
          <span className="text-sm font-bold text-blue-600">{AXIS_LABELS[currentQ.axis]}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Subsection badge */}
          {currentQ.subsection && (
            <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full mb-4">
              {currentQ.subsection}
            </span>
          )}

          {/* Question text */}
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-8 leading-relaxed whitespace-pre-line">
            {currentQ.text}
          </h2>

          {/* Choices */}
          {currentQ.type === "mc" ? (
            <div className="space-y-3">
              {currentQ.choices.map((choice, idx) => {
                const selected = currentAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleMcSelect(idx)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm leading-relaxed font-medium ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    <span className="font-bold mr-2 text-gray-400">{idx + 1}.</span>
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : (
            /* cb: checkbox multi-select */
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-2">当てはまるものをすべて選択してください</p>
              {currentQ.choices.map((choice, idx) => {
                const checked = cbSelections.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleCbToggle(idx)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm leading-relaxed font-medium flex items-start gap-3 ${
                      checked
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
                    }`}>
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {choice}
                  </button>
                );
              })}
              <button
                onClick={submitCb}
                disabled={cbSelections.length === 0}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                次へ <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
