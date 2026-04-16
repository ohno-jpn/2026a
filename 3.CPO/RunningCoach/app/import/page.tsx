"use client";

import { useState, useEffect, useRef } from "react";
import { CloudDownload, CheckCircle, AlertCircle, Loader, ArrowLeft } from "lucide-react";

type ImportStatus = "idle" | "connecting" | "running" | "done" | "error";

interface Progress {
  synced: number;
  skipped: number;
  fetched: number;
}

export default function ImportPage() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState<Progress>({ synced: 0, skipped: 0, fetched: 0 });
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  function startImport() {
    if (status === "running" || status === "connecting") return;

    setStatus("connecting");
    setProgress({ synced: 0, skipped: 0, fetched: 0 });
    setError(null);

    const es = new EventSource("/api/sync/full");
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case "connecting":
          setStatus("connecting");
          break;
        case "connected":
          setStatus("running");
          break;
        case "progress":
          setStatus("running");
          setProgress({ synced: data.synced, skipped: data.skipped, fetched: data.fetched });
          break;
        case "done":
          setStatus("done");
          setProgress({ synced: data.synced, skipped: data.skipped, fetched: data.fetched });
          es.close();
          break;
        case "error":
          setStatus("error");
          setError(data.message);
          es.close();
          break;
      }
    };

    es.onerror = () => {
      if (status !== "done") {
        setStatus("error");
        setError("接続エラーが発生しました");
      }
      es.close();
    };
  }

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const isRunning = status === "connecting" || status === "running";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <a href="/activities" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </a>
          <a href="/" className="font-bold text-orange-500 text-lg tracking-tight">RunningCoach</a>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm font-medium">全件インポート</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Garmin 全件インポート</h1>
          <p className="text-sm text-gray-500 mb-8">
            Garmin Connect に保存されたすべてのアクティビティを Supabase に取り込みます。
            すでに取り込み済みのデータはスキップされるため、何度実行しても安全です。
          </p>

          {/* 進捗エリア */}
          {status !== "idle" && (
            <div className="mb-8">
              {/* ステータスラベル */}
              <div className={`flex items-center gap-2 mb-6 text-sm font-semibold ${
                status === "done" ? "text-green-600" :
                status === "error" ? "text-red-600" :
                "text-blue-600"
              }`}>
                {isRunning && <Loader size={15} className="animate-spin" />}
                {status === "done" && <CheckCircle size={15} />}
                {status === "error" && <AlertCircle size={15} />}
                {status === "connecting" && "Garmin に接続中..."}
                {status === "running" && "インポート中..."}
                {status === "done" && "インポート完了"}
                {status === "error" && "エラーが発生しました"}
              </div>

              {/* 件数カード */}
              {(status === "running" || status === "done") && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 tabular-nums">{progress.synced}</div>
                    <div className="text-xs text-green-500 mt-1 font-medium">新規取り込み</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-gray-400 tabular-nums">{progress.skipped}</div>
                    <div className="text-xs text-gray-400 mt-1 font-medium">スキップ済み</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-500 tabular-nums">{progress.fetched}</div>
                    <div className="text-xs text-blue-400 mt-1 font-medium">Garmin 確認済み</div>
                  </div>
                </div>
              )}

              {/* エラーメッセージ */}
              {status === "error" && error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 完了後リンク */}
              {status === "done" && (
                <a
                  href="/activities"
                  className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors"
                >
                  アクティビティ一覧を見る →
                </a>
              )}
            </div>
          )}

          {/* ボタン */}
          {!isRunning ? (
            <button
              onClick={startImport}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              <CloudDownload size={16} />
              {status === "done" ? "もう一度実行" : "全件インポートを開始"}
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 bg-blue-300 text-white font-semibold px-6 py-3 rounded-full cursor-not-allowed"
            >
              <Loader size={16} className="animate-spin" />
              インポート中...
            </button>
          )}

          <p className="text-xs text-gray-400 mt-4">
            データ量によっては数分〜数十分かかります。完了するまでページを閉じないでください。
          </p>
        </div>
      </main>
    </div>
  );
}
