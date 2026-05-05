import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getDiagnosisById } from "@/lib/db/diagnoses";
import { ALL_QUESTIONS, type Question } from "@/lib/questions";
import { IND_HARD_EXPLANATIONS } from "@/lib/ind-hard-explanations";

function choiceLabel(q: Question, idx: number): string {
  return q.type === "cb" || q.correctIndices ? String.fromCharCode(65 + idx) : String(idx + 1);
}

export default async function ExplanationPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id, questionId } = await params;
  const diagnosis = await getDiagnosisById(id);
  if (!diagnosis) redirect("/dashboard");

  const question = ALL_QUESTIONS.find((q) => q.id === questionId);
  if (!question || !question.correctIndices) redirect(`/dashboard/diagnoses/${id}`);

  // ユーザーの回答を取得
  const record = diagnosis.answers.find((a) => a.question_id === questionId);
  const userAnswer: number | number[] | null = record ? JSON.parse(record.answer) : null;

  // 正誤判定
  let correct: boolean | null = null;
  if (userAnswer !== null) {
    if (question.type === "cb") {
      const sel = (userAnswer as number[]).sort().join(",");
      const ans = [...(question.correctIndices ?? [])].sort().join(",");
      correct = sel === ans;
    } else {
      correct = question.correctIndices![0] === (userAnswer as number);
    }
  }

  const explanation = IND_HARD_EXPLANATIONS[questionId] ?? "解説はまだ準備中です。";

  // 同じ診断の前後クイズ問題のナビゲーション
  const allQuizQs = ALL_QUESTIONS.filter(
    (q) => q.level === question.level && !!q.correctIndices
  );
  const currentIdx = allQuizQs.findIndex((q) => q.id === questionId);
  const prevQ = currentIdx > 0 ? allQuizQs[currentIdx - 1] : null;
  const nextQ = currentIdx < allQuizQs.length - 1 ? allQuizQs[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ナビ */}
      <header className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <a href={`/dashboard/diagnoses/${id}`} className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1">
            <ChevronLeft size={16} /> 診断詳細に戻る
          </a>
          <span className="text-gray-700">/</span>
          <span className="text-sm font-semibold text-white">解説</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">

        {/* 問題文 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-3 py-1 rounded-full">
              個人Hard · クイズ
            </span>
            {correct !== null && (
              correct
                ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1 rounded-full"><CheckCircle2 size={12} />正解</span>
                : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/30 px-3 py-1 rounded-full"><XCircle size={12} />不正解</span>
            )}
          </div>
          <h1 className="text-lg font-bold text-white leading-relaxed">{question.text}</h1>
        </div>

        {/* 選択肢 */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">回答・選択肢</p>
          <div className="space-y-2">
            {question.choices.map((choice, idx) => {
              const isCorrectChoice = question.correctIndices?.includes(idx);
              const isSelected = question.type === "cb"
                ? userAnswer !== null && (userAnswer as number[]).includes(idx)
                : userAnswer === idx;

              let style = "border-white/10 bg-white/3 text-gray-500";
              if (isSelected && isCorrectChoice)  style = "border-green-500/50 bg-green-900/25 text-green-300";
              else if (isSelected && !isCorrectChoice) style = "border-red-500/50 bg-red-900/25 text-red-300";
              else if (!isSelected && isCorrectChoice) style = "border-green-500/25 bg-green-900/10 text-green-600";

              return (
                <div key={idx} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style}`}>
                  <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-extrabold">
                    {choiceLabel(question, idx)}
                  </span>
                  <span className="leading-relaxed flex-1">{choice}</span>
                  <span className="shrink-0 text-xs font-bold">
                    {isSelected && isCorrectChoice && <span className="text-green-400">✓ あなたの回答・正答</span>}
                    {isSelected && !isCorrectChoice && <span className="text-red-400">✗ あなたの回答</span>}
                    {!isSelected && isCorrectChoice && <span className="text-green-600">正答</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {userAnswer === null && (
            <p className="text-sm text-gray-500 mt-3">この問題は未回答です。</p>
          )}
        </div>

        {/* 解説 */}
        <div className="bg-blue-950/40 rounded-2xl border border-blue-500/20 p-6 mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
            📖 解説
          </p>
          <pre className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap font-sans">
            {explanation}
          </pre>
        </div>

        {/* 前後ナビゲーション */}
        <div className="flex items-center justify-between gap-4">
          {prevQ ? (
            <a
              href={`/dashboard/diagnoses/${id}/explanation/${prevQ.id}`}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} /> 前の問題
            </a>
          ) : <div />}
          <a
            href={`/dashboard/diagnoses/${id}`}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            一覧に戻る
          </a>
          {nextQ ? (
            <a
              href={`/dashboard/diagnoses/${id}/explanation/${nextQ.id}`}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              次の問題 <ChevronRight size={16} />
            </a>
          ) : <div />}
        </div>

      </main>
    </div>
  );
}
