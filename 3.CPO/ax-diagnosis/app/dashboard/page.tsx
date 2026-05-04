import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getDiagnoses } from "@/lib/db/diagnoses";
import { EmailButton } from "./email-button";

const DEPTH_LABEL: Record<string, string> = {
  hook: "Hook（4問）",
  checkup: "Checkup（16問）",
  biopsy: "Biopsy（64問）",
};

const SCORE_LEVEL = (score: number | null) => {
  if (score === null) return { label: "–", color: "text-gray-400" };
  if (score >= 67) return { label: `${score}`, color: "text-yellow-400" };
  if (score >= 34) return { label: `${score}`, color: "text-orange-400" };
  return { label: `${score}`, color: "text-red-400" };
};

function ScoreBadge({ score }: { score: number | null }) {
  const { label, color } = SCORE_LEVEL(score);
  return <span className={`font-bold tabular-nums ${color}`}>{label}</span>;
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const diagnoses = await getDiagnoses();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ナビ */}
      <header className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-white tracking-tight">AX-Diagnosis</a>
          <div className="flex items-center gap-4">
            <a href="/questions/hook/oh" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">設問</a>
            <a href="/level-definitions/hook" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">レベル定義</a>
            <a href="/diagnosis" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors">診断を開始</a>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-20">

        {/* ウェルカム */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Dashboard</p>
          <h1 className="text-3xl font-extrabold text-white">
            こんにちは、{user?.firstName ?? "ユーザー"}さん
          </h1>
          <p className="text-gray-400 text-sm mt-1">過去の診断結果を確認できます。</p>
        </div>

        {/* サマリーカード */}
        {diagnoses.length > 0 && (() => {
          const latest = diagnoses[0];
          return (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-7 mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">最新の診断結果</p>
              <div className="flex flex-wrap gap-8 items-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">総合スコア</p>
                  <p className="text-5xl font-extrabold text-white">{latest.total_score ?? "–"}</p>
                </div>
                {[
                  { label: "OH 戦略・基盤", score: latest.oh_score, color: "#3b82f6" },
                  { label: "OS 文化・風土", score: latest.os_score, color: "#8b5cf6" },
                  { label: "PH テクニカル", score: latest.ph_score, color: "#f97316" },
                  { label: "PS スタンス",   score: latest.ps_score, color: "#22c55e" },
                ].map(({ label, score, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
                          strokeDasharray={`${((score ?? 0) / 100) * 87.96} 87.96`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{score ?? "–"}</span>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
                  </div>
                ))}
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">{DEPTH_LABEL[latest.depth] ?? latest.depth}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{new Date(latest.created_at).toLocaleDateString("ja-JP")}</p>
                  <a href="/diagnosis" className="inline-block mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors">
                    再診断する
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 診断履歴 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-white">診断履歴</h2>
            <a href="/diagnosis" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              新しく診断する →
            </a>
          </div>

          {diagnoses.length === 0 ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
              <p className="text-gray-400 text-sm mb-4">まだ診断履歴がありません。</p>
              <a href="/diagnosis" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors">
                最初の診断を始める
              </a>
            </div>
          ) : (
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-bold uppercase tracking-widest text-gray-500 px-6 py-3">日時</th>
                    <th className="text-left text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">深度</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">OH</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">OS</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">PH</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">PS</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">総合</th>
                    <th className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 px-4 py-3">解説メール</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((d, i) => (
                    <tr key={d.id} className={`border-b border-white/5 last:border-0 ${i === 0 ? "bg-white/5" : ""}`}>
                      <td className="px-6 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{DEPTH_LABEL[d.depth] ?? d.depth}</td>
                      <td className="px-4 py-3 text-center text-sm"><ScoreBadge score={d.oh_score} /></td>
                      <td className="px-4 py-3 text-center text-sm"><ScoreBadge score={d.os_score} /></td>
                      <td className="px-4 py-3 text-center text-sm"><ScoreBadge score={d.ph_score} /></td>
                      <td className="px-4 py-3 text-center text-sm"><ScoreBadge score={d.ps_score} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-extrabold text-white">{d.total_score ?? "–"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <EmailButton diagnosisId={d.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
