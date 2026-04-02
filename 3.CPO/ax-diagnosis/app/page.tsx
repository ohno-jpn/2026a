import { CheckCircle, AlertCircle, BarChart3, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── ナビゲーション ── */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600 tracking-tight">AX-Diagnosis</span>
          <div className="flex items-center gap-3">
            <a
              href="/diagnosis/result"
              className="text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors"
            >
              診断結果を見る
            </a>
            <a
              href="/diagnosis"
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors"
            >
              診断を試す
            </a>
            <a
              href="#pricing"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
            >
              無料で始める
            </a>
          </div>
        </div>
      </header>

      {/* ── 1. ヒーローセクション ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 bg-gradient-to-b from-blue-50 to-white">
        <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase">
          AI時代の組織診断ツール
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          AXへの準備状況を<br />
          <span className="text-blue-600">診断する</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          あなたの組織は、AIトランスフォーメーションに対応できていますか？<br />
          組織・個人の4領域診断で、現状の課題と次のアクションが明確になります。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a
            href="/diagnosis"
            className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg shadow-orange-200 transition-all hover:scale-105"
          >
            無料で診断する →
          </a>
          <a
            href="#solution"
            className="text-blue-600 font-semibold text-base hover:underline"
          >
            詳しく見る
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-400">クレジットカード不要・2〜20分で完了</p>

        {/* スコアイメージ */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-10 py-8 inline-flex gap-12 items-center">
          {[
            { label: "組織Hard領域", score: 72 },
            { label: "組織Soft領域", score: 58 },
            { label: "個人Hard領域", score: 84 },
            { label: "個人Soft領域", score: 45 },
          ].map(({ label, score }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={score >= 70 ? "#2563eb" : score >= 50 ? "#f97316" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${(score / 100) * 87.96} 87.96`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                  {score}
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. ペインセクション ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            こんなことで<span className="text-blue-600">困っていませんか？</span>
          </h2>
          <p className="text-gray-500 text-lg">多くの経営者・DX担当者が同じ壁にぶつかっています。</p>
        </div>
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-5">
          {[
            "AXへの取り組みを始めたいが、何から手をつければよいかわからない",
            "現状のAI活用レベルが業界標準と比べてどうなのかが見えない",
            "経営層にDX投資の必要性を数値で説明できない",
            "社内のAIリテラシーや人材スキルの実態が把握できていない",
            "施策を打っているのに変革が進んでいる実感がわかない",
            "どの部門から優先的にAX化すべきか判断できない",
          ].map((pain) => (
            <div
              key={pain}
              className="flex items-start gap-3 bg-white rounded-xl border border-red-100 px-5 py-4 shadow-sm"
            >
              <AlertCircle className="text-red-400 mt-0.5 shrink-0" size={20} />
              <p className="text-gray-700 text-sm leading-relaxed">{pain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. ソリューションセクション ── */}
      <section id="solution" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              AX-Diagnosisが<span className="text-orange-500">解決します</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              独自の4領域診断フレームワークで、組織のAX準備状況を可視化し、具体的なアクションへつなげます。
            </p>
          </div>

          {/* 4軸フレームワーク */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {[
              {
                axis: "組織Hard領域",
                sub: "戦略・基盤",
                color: "blue",
                desc: "全社AI戦略・KGI、ガバナンス・倫理規定、データ基盤・IT環境、業務プロセスの標準化度を診断します。",
                items: ["AI活用戦略・KGIの明確さ", "ガイドライン・倫理規定の整備", "RAG・データ基盤の構築度", "業務SOPへの組み込み"],
              },
              {
                axis: "組織Soft領域",
                sub: "文化・風土",
                color: "violet",
                desc: "挑戦文化・心理的安全性、意思決定の機敏性、AI人材の評価制度、ナレッジ共有の仕組みを診断します。",
                items: ["失敗を許容する挑戦文化", "現場への権限移譲・機敏性", "AI活用を評価する人事制度", "成功事例の組織的共有"],
              },
              {
                axis: "個人Hard領域",
                sub: "テクニカルスキル",
                color: "orange",
                desc: "AI基礎知識、セキュリティ・リスク理解、プロンプトエンジニアリング、RAG・ワークフロー活用力を診断します。",
                items: ["LLM・マルチモーダルの理解", "情報漏洩・著作権リスク管理", "Few-shot・CoTなど精度向上手法", "RAG・API・ワークフロー設計"],
              },
              {
                axis: "個人Soft領域",
                sub: "スタンス・特性",
                color: "green",
                desc: "業務課題の設定力、成果逆算の目的志向、AIへの批判的思考、新技術への開放性を診断します。",
                items: ["AIで解くべき問いの設定力", "業務成果からの逆算思考", "出力の批判的検証習慣", "新ツールへの探索・学習姿勢"],
              },
            ].map(({ axis, sub, color, desc, items }) => {
              const colorMap: Record<string, string> = {
                blue: "border-blue-200 bg-blue-50",
                violet: "border-violet-200 bg-violet-50",
                orange: "border-orange-200 bg-orange-50",
                green: "border-green-200 bg-green-50",
              };
              const textMap: Record<string, string> = {
                blue: "text-blue-600",
                violet: "text-violet-600",
                orange: "text-orange-600",
                green: "text-green-600",
              };
              const dotMap: Record<string, string> = {
                blue: "bg-blue-400",
                violet: "bg-violet-400",
                orange: "bg-orange-400",
                green: "bg-green-400",
              };
              return (
                <div key={axis} className={`rounded-2xl border-2 p-7 ${colorMap[color]}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${textMap[color]}`}>{sub}</p>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-3">{axis}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{desc}</p>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotMap[color]}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 size={32} className="text-blue-600" />,
                title: "現状を数値で可視化",
                desc: "組織Hard・Soft、個人Hard・Softの4領域でスコアリング。自社のAX成熟度が一目でわかります。",
              },
              {
                icon: <Users size={32} className="text-blue-600" />,
                title: "業界ベンチマーク比較",
                desc: "同業他社のデータと照らし合わせ、自社の立ち位置と優先課題を客観的に把握できます。",
              },
              {
                icon: <Zap size={32} className="text-orange-500" />,
                title: "アクションプランを自動生成",
                desc: "診断結果をもとに、次の90日で取り組むべき具体的な改善ロードマップを提案します。",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-100 p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-center mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 料金表 ── */}
      <section id="pricing" className="py-24 px-6 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              シンプルな<span className="text-blue-600">料金プラン</span>
            </h2>
            <p className="text-gray-500 text-lg">まずは無料で試して、必要になったらアップグレード。</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Free</p>
              <p className="text-5xl font-extrabold text-gray-900 mb-1">¥0</p>
              <p className="text-gray-400 text-sm mb-8">ずっと無料</p>
              <ul className="space-y-3 mb-8">
                {[
                  "基本診断（4軸スコア）",
                  "月1回の診断実施",
                  "簡易レポートPDF出力",
                  "5名まで利用可能",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-700 text-sm">
                    <CheckCircle size={16} className="text-blue-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/diagnosis"
                className="block text-center border-2 border-blue-600 text-blue-600 font-bold py-3 rounded-full hover:bg-blue-50 transition-colors"
              >
                無料で診断する
              </a>
            </div>

            {/* Pro */}
            <div className="bg-blue-600 rounded-2xl p-8 shadow-xl shadow-blue-200 relative">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                おすすめ
              </span>
              <p className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-2">Pro</p>
              <p className="text-5xl font-extrabold text-white mb-1">¥29,800</p>
              <p className="text-blue-300 text-sm mb-8">/ 月（税抜）</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Freeプランのすべて",
                  "無制限の診断実施",
                  "詳細レポート＋アクションプラン",
                  "業界ベンチマーク比較",
                  "無制限メンバー追加",
                  "専任サポート（チャット）",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-blue-100 text-sm">
                    <CheckCircle size={16} className="text-orange-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/diagnosis"
                className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-full transition-colors shadow-lg shadow-orange-300"
              >
                Proプランで始める
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer className="py-10 px-6 bg-gray-900 text-center">
        <p className="text-blue-400 font-bold text-lg mb-2">AX-Diagnosis</p>
        <p className="text-gray-500 text-sm">© 2026 vast fields inc. All rights reserved.</p>
      </footer>

    </div>
  );
}
