"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function EmailButton({ diagnosisId }: { diagnosisId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "all-correct" | "error">("idle");

  async function handleClick() {
    setStatus("sending");
    try {
      const res = await fetch("/api/send-wrong-answers-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
      } else if (data.allCorrect) {
        setStatus("all-correct");
      } else {
        setStatus("sent");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sending") {
    return <Loader2 size={14} className="animate-spin text-gray-400 mx-auto" />;
  }
  if (status === "sent") {
    return <span title="送信済み"><CheckCircle2 size={14} className="text-green-400 mx-auto" /></span>;
  }
  if (status === "all-correct") {
    return <span title="全問正解"><CheckCircle2 size={14} className="text-blue-400 mx-auto" /></span>;
  }
  if (status === "error") {
    return (
      <button onClick={() => setStatus("idle")} title="再試行">
        <AlertCircle size={14} className="text-red-400 mx-auto" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title="個人Hard不正解問題の解説をメール送信"
      className="text-gray-400 hover:text-blue-400 transition-colors"
    >
      <Mail size={14} />
    </button>
  );
}
