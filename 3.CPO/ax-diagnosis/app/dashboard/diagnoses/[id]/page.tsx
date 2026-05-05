import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, MinusCircle, BookOpen } from "lucide-react";
import { getDiagnosisById } from "@/lib/db/diagnoses";
import { ALL_QUESTIONS, type Axis, type Question } from "@/lib/questions";

// ── 軸メタ ─────────────────────────────────────────────────────────────
const AXIS_ORDER: Axis[] = ["org_hard", "org_soft", "ind_hard", "ind_soft"];

const AXIS_META: Record<Axis, { label: string; desc: string; accent: string; header: string }> = {
  org_hard: { label: "組織Hard", desc: "戦略・基盤",       accent: "text-blue-400",   header: "bg-blue-600"   },
  org_soft: { label: "組織Soft", desc: "文化・風土",       accent: "text-violet-400", header: "bg-violet-600" },
  ind_hard: { label: "個人Hard", desc: "テクニカルスキル", accent: "text-orange-400", header: "bg-orange-500" },
  ind_soft: { label: "個人Soft", desc: "スタンス・特性",   accent: "text-green-400",  header: "bg-green-600"  },
};

const DEPTH_LABEL: Record<string, string> = {
  hook: "Depth 1 · Hook（4問）",
  checkup: "Depth 2 · Checkup（16問）",
  biopsy: "Depth 3 · Biopsy（64問）",
};

const DEPTH_TO_LEVEL: Record<string, 1 | 2 | 3> = { hook: 1, checkup: 2, biopsy: 3 };

// ── スコアバッジ ─────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-500">–</span>;
  const color = score >= 67 ? "text-yellow-400" : score >= 34 ? "text-orange-400" : "text-red-400";
  return <span className={`font-extrabold tabular-nums ${color}`}>{score}</span>;
}

// ── 正誤バッジ ──────────────────────────────────────────────────────────
function ResultBadge({ correct }: { correct: boolean | null }) {
  if (correct === null) return null;
  return correct
    ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} />正解</span>
    : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full"><XCircle size={11} />不正解</span>;
}

// ── 選択肢ラベル変換 ────────────────────────────────────────────────────
function choiceLabel(q: Question, idx: number): string {
  if (q.type === "cb" || q.correctIndices) {
    return String.fromCharCode(65 + idx); // A, B, C, D
  }
  return String(idx + 1); // 1, 2, 3, 4, 5
}

// ── 問題カード ──────────────────────────────────────────────────────────
function QuestionCard({
  q,
  answer,
  qNum,
  axis,
  explanationHref,
}: {
  q: Question;
  answer: number | number[] | null;
  qNum: number;
  axis: Axis;
  explanationHref?: string;
}) {
  const meta = AXIS_META[axis];
  const isQuiz = !!q.correctIndices;
  const isLikert = !!q.isLikert;
  const noAnswer = answer === null;

  // 正誤判定
  let correct: boolean | null = null;
  if (!noAnswer && isQuiz) {
    if (q.type === "cb") {
      const sel = (answer as number[]).sort().join(",");
      const ans = [...(q.correctIndices ?? [])].sort().join(",");
      correct = sel === ans;
    } else {
      correct = q.correctIndices![0] === (answer as number);
    }
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* カードヘッダー */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
        <span className="text-xs font-bold text-gray-500">Q{qNum}</span>
        {q.subsection && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 ${meta.accent}`}>
            {q.subsection}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-600">
          {isLikert ? "リッカート5段階" : isQuiz ? "クイズ" : "状態選択"}
        </span>
        {!noAnswer && <ResultBadge correct={correct} />}
      </div>

      {/* 問題文 */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{q.text}</p>
      </div>

      {/* 未回答 */}
      {noAnswer ? (
        <div className="px-5 pb-4">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <MinusCircle size={12} /> 未回答
          </span>
        </div>
      ) : (
        <div className="px-5 pb-4 space-y-1.5">
          {q.type === "cb" ? (
            // チェックボックス型
            q.choices.map((choice, idx) => {
              const selected = (answer as number[]).includes(idx);
              const isCorrectChoice = q.correctIndices?.includes(idx);
              const showResult = isQuiz;
              let rowStyle = "border-white/10 bg-white/3 text-gray-400";
              if (selected && showResult && isCorrectChoice) rowStyle = "border-green-500/40 bg-green-900/20 text-green-300";
              else if (selected && showResult && !isCorrectChoice) rowStyle = "border-red-500/40 bg-red-900/20 text-red-300";
              else if (selected && !showResult) rowStyle = "border-blue-500/40 bg-blue-900/20 text-blue-300";
              else if (!selected && showResult && isCorrectChoice) rowStyle = "border-green-500/20 bg-green-900/10 text-green-600";
              return (
                <div key={idx} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${rowStyle}`}>
                  <span className="shrink-0 w-5 h-5 rounded border border-current flex items-center justify-center font-bold">
                    {selected ? "✓" : choiceLabel(q, idx)}
                  </span>
                  <span className="leading-relaxed">{choice}</span>
                  {showResult && isCorrectChoice && (
                    <span className="ml-auto shrink-0 text-green-500 font-bold">正答</span>
                  )}
                </div>
              );
            })
          ) : (
            // 単一選択型（状態選択・リッカート・クイズmc）
            q.choices.map((choice, idx) => {
              const selected = (answer as number) === idx;
              const isCorrectChoice = q.correctIndices?.[0] === idx;
              let rowStyle = "border-white/10 bg-transparent text-gray-500";
              if (selected && isQuiz && isCorrectChoice) rowStyle = "border-green-500/40 bg-green-900/20 text-green-300";
              else if (selected && isQuiz && !isCorrectChoice) rowStyle = "border-red-500/40 bg-red-900/20 text-red-300";
              else if (selected && !isQuiz) rowStyle = "border-blue-500/40 bg-blue-900/20 text-blue-300";
              else if (!selected && isQuiz && isCorrectChoice) rowStyle = "border-green-500/20 bg-green-900/10 text-green-700";
              if (!selected && !isQuiz) return null; // 選んでいない選択肢は状態選択・リッカートでは非表示
              return (
                <div key={idx} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${rowStyle}`}>
                  <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-xs">
                    {choiceLabel(q, idx)}
                  </span>
                  <span className="leading-relaxed">{choice}</span>
                  {isQuiz && isCorrectChoice && (
                    <span className="ml-auto shrink-0 text-green-500 font-bold">正答</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 解説リンク */}
      {explanationHref && (
        <div className="px-5 pb-4 pt-1 border-t border-white/10">
          <a
            href={explanationHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <BookOpen size={12} /> 解説を見る →
          </a>
        </div>
      )}
    </div>
  );
}

// ── ページ本体 ──────────────────────────────────────────────────────────
export default async function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const diagnosis = await getDiagnosisById(id);
  if (!diagnosis) redirect("/dashboard");

  const level = DEPTH_TO_LEVEL[diagnosis.depth] ?? 2;
  const questions = ALL_QUESTIONS.filter((q) => q.level === level);

  // 回答マップ: question_id → parsed answer
  const answerMap = new Map<string, number | number[]>();
  for (const a of diagnosis.answers) {
    try {
      answerMap.set(a.question_id, JSON.parse(a.answer));
    } catch { /* ignore */ }
  }

  const completedAt = new Date(diagnosis.created_at).toLocaleString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ナビ */}
      <header className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">← ダッシュボード</a>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-semibold text-white">診断詳細</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">

        {/* ヘッダー */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            {DEPTH_LABEL[diagnosis.depth] ?? diagnosis.depth}
          </p>
          <h1 className="text-2xl font-extrabold text-white mb-1">{completedAt} の診断結果</h1>

          {/* スコアサマリー */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "総合", score: diagnosis.total_score },
              { label: "OH 戦略・基盤", score: diagnosis.oh_score },
              { label: "OS 文化・風土", score: diagnosis.os_score },
              { label: "PH テクニカル", score: diagnosis.ph_score },
              { label: "PS スタンス",   score: diagnosis.ps_score },
            ].map(({ label, score }) => (
              <div key={label} className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-extrabold"><ScoreBadge score={score} /></p>
              </div>
            ))}
          </div>
        </div>

        {/* 軸別 回答一覧 */}
        {AXIS_ORDER.map((axis) => {
          const meta = AXIS_META[axis];
          const axisQuestions = questions.filter((q) => q.axis === axis);
          if (axisQuestions.length === 0) return null;

          let qNum = 0;
          return (
            <section key={axis} className="mb-12">
              {/* 軸ヘッダー */}
              <div className={`${meta.header} rounded-xl px-6 py-4 mb-5`}>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">{axis.toUpperCase()}</p>
                <h2 className="text-lg font-extrabold text-white">
                  {meta.label} — {meta.desc}
                </h2>
              </div>

              {/* 問題カード */}
              <div className="space-y-4">
                {axisQuestions.map((q) => {
                  qNum++;
                  const answer = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
                  const isQuiz = !!q.correctIndices;
                  const explanationHref = isQuiz
                    ? `/dashboard/diagnoses/${id}/explanation/${q.id}`
                    : undefined;
                  return (
                    <QuestionCard key={q.id} q={q} answer={answer} qNum={qNum} axis={axis} explanationHref={explanationHref} />
                  );
                })}
              </div>
            </section>
          );
        })}

      </main>
    </div>
  );
}
