import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { getDiagnosisById } from "@/lib/db/diagnoses";
import { ALL_QUESTIONS } from "@/lib/questions";
import { IND_HARD_EXPLANATIONS } from "@/lib/ind-hard-explanations";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface WrongItem {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { diagnosisId } = await req.json();
  if (!diagnosisId) {
    return NextResponse.json({ error: "診断IDが必要です" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "メールアドレスが取得できませんでした" }, { status: 400 });
  }

  const diagnosis = await getDiagnosisById(diagnosisId);
  if (!diagnosis) {
    return NextResponse.json({ error: "診断が見つかりません" }, { status: 404 });
  }

  const indHardQuestions = ALL_QUESTIONS.filter((q) => q.axis === "ind_hard");
  const wrongItems: WrongItem[] = [];

  for (const q of indHardQuestions) {
    const record = diagnosis.answers.find((a) => a.question_id === q.id);
    if (!record) continue;

    let isCorrect = false;
    let userAnswerText = "";
    const correctAnswerText = q.correctIndices
      ? q.correctIndices.map((i) => `${String.fromCharCode(65 + i)}. ${q.choices[i]}`).join(" / ")
      : "";

    if (q.type === "mc" && q.correctIndices) {
      const idx = JSON.parse(record.answer) as number;
      isCorrect = q.correctIndices[0] === idx;
      userAnswerText = `${String.fromCharCode(65 + idx)}. ${q.choices[idx] ?? "（不明）"}`;
    } else if (q.type === "cb" && q.correctIndices) {
      const selected = JSON.parse(record.answer) as number[];
      const sortedSelected = [...selected].sort();
      const sortedCorrect = [...q.correctIndices].sort();
      isCorrect =
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((v, i) => v === sortedCorrect[i]);
      userAnswerText =
        selected.length === 0
          ? "（未選択）"
          : selected.map((i) => `${String.fromCharCode(65 + i)}. ${q.choices[i]}`).join(" / ");
    }

    if (!isCorrect) {
      wrongItems.push({
        questionText: q.text,
        userAnswer: userAnswerText,
        correctAnswer: correctAnswerText,
        explanation: IND_HARD_EXPLANATIONS[q.id] ?? "解説はまだ準備中です。",
      });
    }
  }

  if (wrongItems.length === 0) {
    return NextResponse.json({ allCorrect: true });
  }

  const userName = user?.firstName ?? user?.lastName ?? "ユーザー";
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "AX-Diagnosis <onboarding@resend.dev>",
    to: email,
    subject: `【AX-Diagnosis】個人Hard 不正解 ${wrongItems.length} 問の解説`,
    html: buildEmailHtml(userName, wrongItems),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: wrongItems.length });
}

function buildEmailHtml(userName: string, items: WrongItem[]): string {
  const rows = items
    .map(
      (item, i) => `
      <div style="margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:12px;border-left:4px solid #3b82f6;">
        <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">問題 ${i + 1}</p>
        <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 16px;line-height:1.6;">${escapeHtml(item.questionText)}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 12px;background:#fee2e2;border-radius:6px 0 0 6px;font-size:12px;font-weight:700;color:#991b1b;white-space:nowrap;width:80px;">あなたの回答</td>
            <td style="padding:8px 12px;background:#fef2f2;border-radius:0 6px 6px 0;font-size:13px;color:#7f1d1d;">${escapeHtml(item.userAnswer)}</td>
          </tr>
          <tr style="height:4px;"><td colspan="2"></td></tr>
          <tr>
            <td style="padding:8px 12px;background:#dcfce7;border-radius:6px 0 0 6px;font-size:12px;font-weight:700;color:#166534;white-space:nowrap;">正解</td>
            <td style="padding:8px 12px;background:#f0fdf4;border-radius:0 6px 6px 0;font-size:13px;color:#14532d;">${escapeHtml(item.correctAnswer)}</td>
          </tr>
        </table>

        <div style="background:#eff6ff;border-radius:8px;padding:14px 16px;">
          <p style="font-size:12px;font-weight:700;color:#1d4ed8;margin:0 0 6px;">📖 解説</p>
          <p style="font-size:13px;color:#1e3a5f;margin:0;line-height:1.8;white-space:pre-wrap;">${escapeHtml(item.explanation)}</p>
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- ヘッダー -->
    <div style="background:#1d4ed8;padding:32px 40px;">
      <p style="font-size:13px;color:#93c5fd;font-weight:700;letter-spacing:0.1em;margin:0 0 8px;">AX-DIAGNOSIS</p>
      <h1 style="font-size:22px;font-weight:800;color:#ffffff;margin:0;line-height:1.3;">個人Hard 不正解問題の解説</h1>
    </div>

    <!-- 本文 -->
    <div style="padding:32px 40px;">
      <p style="font-size:15px;color:#374151;margin:0 0 8px;">${escapeHtml(userName)}さん、お疲れ様です。</p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.7;">
        AX-Diagnosisの診断を受けていただきありがとうございます。<br>
        個人Hard（テクニカルスキル）領域で不正解だった <strong style="color:#1d4ed8;">${items.length}問</strong> の解説をお送りします。
      </p>

      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:28px;">
        <p style="font-size:13px;color:#713f12;margin:0;">
          💡 <strong>Level 4・5</strong> は研修プログラムの受講と課題完了によって認定されます。この解説を参考に学習を深めてください。
        </p>
      </div>

      ${rows}

      <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
        <p style="font-size:13px;color:#9ca3af;margin:0;">このメールはAX-Diagnosisから自動送信されています</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
