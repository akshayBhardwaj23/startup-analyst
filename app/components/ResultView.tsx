"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ChatDrawer = dynamic(() => import("./ChatDrawer"), { ssr: false });

type Brief = Record<string, any>;

function Gauge({
  label,
  score,
  emphasis = false,
  scale = 1,
}: {
  label: string;
  score: number | null | undefined;
  emphasis?: boolean;
  scale?: number;
}) {
  const safe =
    typeof score === "number" ? Math.min(100, Math.max(0, score)) : null;
  const baseW = emphasis ? 160 : 120;
  const baseH = emphasis ? 90 : 68;
  const baseR = emphasis ? 60 : 50;
  const width = Math.round(baseW * scale);
  const height = Math.round(baseH * scale);
  const cx = width / 2;
  const cy = height - 6;
  const r = Math.round(baseR * scale);
  const startX = cx - r;
  const startY = cy;
  const fullEndX = cx + r;
  const fullEndY = cy;
  const color =
    safe == null
      ? "#1b62c7ff"
      : safe < 40
      ? "#ef4444"
      : safe < 70
      ? "#f59e0b"
      : "#22c55e";
  const strokeW = emphasis ? 8 : 6;
  const fontSize = Math.round(r * (emphasis ? 0.68 : 0.58));
  const numberY = cy - r * 0.2;
  const capComp = 0.8;
  const dashLen = safe != null ? Math.max(0, Math.min(100, safe - capComp)) : 0;
  const dashGap = 100 - dashLen;
  const dashOffset = -capComp / 2;
  return (
    <div className="rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.02] p-2 text-slate-800 dark:text-slate-200">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block"
        aria-label={`${label} ${safe == null ? "N/A" : Math.round(safe)}`}
      >
        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${fullEndX} ${fullEndY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="butt"
          className="opacity-20"
        />
        {safe != null && safe > 0 && (
          <path
            d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${fullEndX} ${fullEndY}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${dashLen} ${dashGap}`}
            strokeDashoffset={dashOffset}
          />
        )}
        {safe != null ? (
          <text
            x={cx}
            y={numberY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current"
            fontSize={fontSize}
            fontWeight={700}
          >
            {Math.round(safe)}
          </text>
        ) : (
          <text
            x={cx}
            y={numberY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current opacity-60"
            fontSize={Math.max(10, fontSize - 2)}
          >
            N/A
          </text>
        )}
      </svg>
      <div className="mt-0.5 text-center text-[10px] uppercase tracking-wider font-semibold opacity-60">
        {label}
      </div>
    </div>
  );
}

export default function ResultView({
  brief: initialBrief,
  companyName,
  createdAt,
}: {
  brief: Brief;
  companyName: string;
  createdAt: string;
}) {
  const [brief, setBrief] = useState<Brief | null>(initialBrief || null);
  const [chatOpen, setChatOpen] = useState(false);
  const [webSearch, setWebSearch] = useState<any | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setWebLoading(true);
        const res = await fetch("/api/web-search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyName }),
        });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) throw new Error(await res.text());
        const payload = ct.includes("application/json") ? await res.json() : {};
        setWebSearch(payload?.web ?? {});
      } catch (e: any) {
        setWebSearch({});
      } finally {
        setWebLoading(false);
      }
    };
    if (companyName) run();
  }, [companyName]);

  const onDownloadPDF = useCallback(async () => {
    if (!brief) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(companyName || "Startup", 40, 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(new Date(createdAt).toLocaleString(), 40, 56);
      let y = 80;
      const write = (title: string, text: string) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(title.toUpperCase(), 40, y);
        y += 14;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(text, 515);
        lines.forEach((ln: string) => {
          if (y > 800) {
            pdf.addPage();
            y = 40;
          }
          pdf.text(ln, 40, y);
          y += 13;
        });
        y += 6;
      };
      const toText = (v: any) =>
        Array.isArray(v)
          ? v
              .map((x) =>
                typeof x === "object" ? x.text ?? JSON.stringify(x) : String(x)
              )
              .join("\n")
          : v && typeof v === "object"
          ? v.text ?? JSON.stringify(v, null, 2)
          : v
          ? String(v)
          : "";
      const sections: Array<[string, any]> = [
        ["One-liner", (brief as any).one_liner],
        ["Problem", (brief as any).problem],
        ["Solution", (brief as any).solution],
        ["ICP & GTM", (brief as any).icp_gtm],
        ["Traction", (brief as any).traction_bullets],
        ["Business Model", (brief as any).business_model],
        ["TAM", (brief as any).tam],
        ["Team", (brief as any).team],
        ["Moat", (brief as any).moat_bullets],
        ["Risks", (brief as any).risks_bullets],
        ["Why Now", (brief as any).why_now],
        ["Hypotheses", (brief as any).hypotheses],
        ["Founder Questions", (brief as any).founder_questions],
      ];
      for (const [title, val] of sections) {
        const text = toText(val);
        if (text && text.trim()) write(title, text.trim());
      }
      pdf.save(`${companyName ? companyName + "-" : ""}vc-summary.pdf`);
    } catch (e) {
      setError("Failed to generate PDF");
    }
  }, [brief, companyName, createdAt]);

  const ratings: any = (brief as any)?.ratings || {};
  const order = [
    "overall",
    "team_strength",
    "market_quality",
    "product_maturity",
    "moat",
    "traction",
    "risk_profile",
    "data_confidence",
  ];
  const items = order
    .map((k) => ({
      key: k,
      label:
        k === "overall"
          ? "Overall"
          : k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      score: ratings?.[k]?.score as number | undefined,
    }))
    .filter(
      (e) => typeof e.score === "number" && (e.score as number) > 0
    ) as Array<{ key: string; label: string; score: number }>;
  const hasOverall = items.some((e) => e.key === "overall");
  const overall = hasOverall ? items.find((e) => e.key === "overall")! : null;
  const rest = hasOverall ? items.filter((e) => e.key !== "overall") : items;

  return (
    <div className="max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/40 mb-4">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#10b981" }}
              ></span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Analysis Complete
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
              {companyName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generated{" "}
              {new Date(createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all hover:shadow-md"
              title="Download PDF"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-base hover:shadow-lg transition-all"
              title="Ask the Startup"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span>Ask Questions</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
        </div>
      )}

      {/* One-liner highlight */}
      {brief?.one_liner && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-blue-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow shadow-blue-500/30">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                One-Liner
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-relaxed">
                {typeof (brief as any).one_liner === "object"
                  ? (brief as any).one_liner.text ||
                    JSON.stringify((brief as any).one_liner)
                  : String((brief as any).one_liner)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ratings Section */}
      {items.length > 0 && (
        <div className="mb-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div
            className="hidden md:grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.min(
                8,
                hasOverall ? 1 + rest.length : items.length
              )}, minmax(0, 1fr))`,
            }}
          >
            {hasOverall && overall && (
              <Gauge
                key="overall"
                label="Overall"
                score={overall.score}
                emphasis
                scale={1.1}
              />
            )}
            {(hasOverall ? rest : items).map((e) => (
              <Gauge key={e.key} label={e.label} score={e.score} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {(hasOverall ? [overall!, ...rest] : items).map((e, i) => (
              <Gauge
                key={e.key + i}
                label={e!.label}
                score={e!.score}
                emphasis={hasOverall && i === 0}
                scale={hasOverall && i === 0 ? 1.1 : 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="grid gap-6 md:grid-cols-2 text-base leading-relaxed">
        {[
          { key: "problem", label: "Problem" },
          { key: "solution", label: "Solution" },
          {
            key: "icp_gtm",
            label: "ICP & GTM",
            nested: ["icp", "gtm"] as string[],
          },
          { key: "__web_between__", label: "__web_between__" as any },
          { key: "traction_bullets", label: "Traction" },
          { key: "business_model", label: "Business Model" },
          {
            key: "tam",
            label: "TAM",
            nested: ["global_market", "target_segment", "growth"] as string[],
          },
          { key: "team", label: "Team" },
          { key: "moat_bullets", label: "Moat / Defensibility" },
          { key: "risks_bullets", label: "Risks" },
          { key: "why_now", label: "Why Now" },
          { key: "hypotheses", label: "Hypotheses" },
          { key: "founder_questions", label: "Founder Questions" },
        ].map((section) => {
          if (section.key === "__web_between__") {
            const emptyJson =
              !webSearch ||
              (typeof webSearch === "object" &&
                Object.keys(webSearch).length === 0);
            return (
              <div key="web-summary-block" className="md:col-span-2">
                <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-100 uppercase tracking-wide">
                      Online Intelligence
                    </h3>
                  </div>
                  {webLoading ? (
                    <div className="text-[11px] opacity-70 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                      Fetching latest web signals…
                    </div>
                  ) : emptyJson ? (
                    <div className="text-[11px] opacity-80 text-emerald-700 dark:text-emerald-300">
                      Data isn&apos;t available online for these columns
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="rounded border border-emerald-400/40 dark:border-emerald-500/30 p-2 bg-white/50 dark:bg-transparent">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-200/80 mb-1 font-semibold">
                          Latest Online Updates
                        </div>
                        {Array.isArray(webSearch?.latest_online_updates) &&
                        webSearch.latest_online_updates.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-1 marker:text-emerald-600 dark:marker:text-emerald-400/80">
                            {webSearch.latest_online_updates.map(
                              (u: any, i: number) => (
                                <li
                                  key={i}
                                  className="text-[11px] text-emerald-900 dark:text-emerald-100"
                                >
                                  <span className="opacity-90">
                                    {u?.summary || ""}
                                  </span>{" "}
                                  {u?.source && (
                                    <a
                                      href={u.source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 dark:text-emerald-300/90 hover:underline"
                                    >
                                      🔗
                                    </a>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <div className="text-[11px] opacity-70 text-emerald-700 dark:text-emerald-300">
                            Data isn&apos;t available online
                          </div>
                        )}
                      </div>
                      <div className="rounded border border-emerald-400/40 dark:border-emerald-500/30 p-2 bg-white/50 dark:bg-transparent">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-200/80 mb-1 font-semibold">
                          Market Growth
                        </div>
                        {webSearch?.market_growth?.summary ? (
                          <div className="text-[11px] text-emerald-900 dark:text-emerald-100">
                            <span className="opacity-90">
                              {webSearch.market_growth.summary}
                            </span>{" "}
                            {webSearch?.market_growth?.source && (
                              <a
                                href={webSearch.market_growth.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 dark:text-emerald-300/90 hover:underline"
                              >
                                🔗
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] opacity-70 text-emerald-700 dark:text-emerald-300">
                            Data isn&apos;t available online
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const val: any = (brief as any)?.[section.key as string];
          const renderVal = () => {
            const isEmptyTextRefs = (o: any) =>
              o &&
              typeof o === "object" &&
              typeof o.text === "string" &&
              o.text.trim() === "" &&
              Array.isArray(o.refs) &&
              o.refs.length === 0;
            if (val == null) return null;
            if (
              section.hasOwnProperty("nested") &&
              val &&
              typeof val === "object" &&
              !Array.isArray(val)
            ) {
              const nestedKeys = (section as any).nested.filter(
                (sub: string) => {
                  const node = (val as any)[sub];
                  if (!node) return false;
                  if (typeof node === "object" && isEmptyTextRefs(node))
                    return false;
                  return true;
                }
              );
              if (nestedKeys.length === 0) return null;
              return (
                <div className="space-y-2">
                  {nestedKeys.map((sub: string) => {
                    const node = (val as any)[sub];
                    if (!node) return null;
                    const nodeText =
                      typeof node === "object"
                        ? node.text || JSON.stringify(node, null, 2)
                        : String(node);
                    const prettyLabel = sub
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div
                        key={sub}
                        className="rounded-md bg-slate-50 dark:bg-white/[0.02] p-2 border border-slate-200 dark:border-white/[0.04]"
                      >
                        <div className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-indigo-300/60 mb-1">
                          {prettyLabel}
                        </div>
                        <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap opacity-90">
                          {nodeText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            if (Array.isArray(val)) {
              const items = (val as any[]).filter(
                (v) => !(typeof v === "object" && v && isEmptyTextRefs(v))
              );
              if (items.length === 0) return null;
              if ((section as any).key === "hypotheses") {
                return (
                  <ul className="space-y-2">
                    {items.map((h: any, i: number) => (
                      <li
                        key={i}
                        className="rounded-md border border-amber-300/30 dark:border-amber-400/20 bg-amber-100/50 dark:bg-amber-400/5 p-2.5"
                      >
                        {h.claim && (
                          <div className="font-medium text-base md:text-lg leading-snug mb-1 text-amber-900 dark:text-amber-200/90">
                            {h.claim}
                          </div>
                        )}
                        {h.status && (
                          <div className="text-sm md:text-base text-amber-700 dark:text-amber-300/70">
                            {h.status}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              }
              if ((section as any).key === "founder_questions") {
                return (
                  <ol className="space-y-3 list-decimal pl-4 marker:text-blue-600 dark:marker:text-indigo-300/60 marker:font-semibold">
                    {items.map((q: any, i: number) => (
                      <li key={i} className="space-y-1">
                        {q.question && (
                          <div className="font-medium text-base md:text-lg leading-snug text-slate-900 dark:text-indigo-100/90">
                            {q.question}
                          </div>
                        )}
                        {q.rationale && (
                          <div className="text-sm md:text-base text-slate-700 dark:text-indigo-200/60">
                            {q.rationale}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                );
              }
              return (
                <ul className="list-disc pl-4 space-y-1 marker:text-blue-600 dark:marker:text-indigo-400/70">
                  {items.map((v: any, i: number) => (
                    <li key={i} className="opacity-90">
                      {typeof v === "object"
                        ? v.text || JSON.stringify(v)
                        : String(v)}
                    </li>
                  ))}
                </ul>
              );
            }
            if (typeof val === "object") {
              const isEmptyTextRefs = (o: any) =>
                o &&
                typeof o === "object" &&
                typeof o.text === "string" &&
                o.text.trim() === "" &&
                Array.isArray(o.refs) &&
                o.refs.length === 0;
              if (isEmptyTextRefs(val)) return null;
              const text = (val as any).text || JSON.stringify(val, null, 2);
              return (
                <div className="whitespace-pre-wrap opacity-90 font-normal">
                  {text}
                </div>
              );
            }
            return <div className="opacity-90">{String(val)}</div>;
          };
          const content = renderVal();
          if (!content) return null;

          const iconMap: Record<string, string> = {
            problem:
              "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
            solution: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            icp_gtm:
              "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
            traction_bullets: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
            business_model:
              "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            tam: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            team: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
            moat_bullets:
              "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
            risks_bullets:
              "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
            why_now: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
            hypotheses:
              "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
            founder_questions:
              "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          };

          return (
            <div
              key={(section as any).key}
              className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow shadow-blue-500/30">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        iconMap[(section as any).key] ||
                        "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      }
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wide">
                  {(section as any).label}
                </h3>
              </div>
              <div className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                {content}
              </div>
            </div>
          );
        })}
      </div>

      {brief && (brief as any).warnings && (
        <div className="mt-6 text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 font-mono">
          {((brief as any).warnings as any[]).map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        companyName={companyName}
      />
    </div>
  );
}
