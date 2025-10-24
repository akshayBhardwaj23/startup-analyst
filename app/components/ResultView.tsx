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
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-[color:var(--foreground)]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block"
        aria-label={`${label} ${safe == null ? "N/A" : Math.round(safe)}`}
      >
        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${fullEndX} ${fullEndY}`}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeW}
          strokeLinecap="butt"
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
      <div className="mt-0.5 text-center text-[10px] uppercase tracking-wider font-semibold opacity-60 text-[color:var(--foreground)]">
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
    <div className="max-w-screen-2xl mx-auto">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {companyName}
          </h1>
          <div className="text-xs opacity-70">
            Generated {new Date(createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadPDF}
            className="copy-btn flex items-center gap-2"
            title="Download PDF"
          >
            <span className="i-tabler-file-download" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => setChatOpen(true)}
            className="btn-primary text-sm flex items-center gap-2"
            title="Ask the Startup"
          >
            💬 Ask the Startup
          </button>
        </div>
      </header>

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      {brief?.one_liner && (
        <div className="text-base md:text-lg font-semibold tracking-tight leading-snug bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-5">
          {typeof (brief as any).one_liner === "object"
            ? (brief as any).one_liner.text ||
              JSON.stringify((brief as any).one_liner)
            : String((brief as any).one_liner)}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3 mb-6">
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

      <div className="grid gap-5 md:gap-6 text-[11px] md:text-[13px] leading-relaxed">
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
              <div key="web-summary-block">
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-emerald-300/80 mb-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online Summary & Market Growth
                  </div>
                  {webLoading ? (
                    <div className="text-[11px] opacity-70 flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                      Fetching latest web signals…
                    </div>
                  ) : emptyJson ? (
                    <div className="text-[11px] opacity-80">
                      Data isn&apos;t available online for these columns
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="rounded border border-emerald-500/30 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 mb-1">
                          Latest Online Updates
                        </div>
                        {Array.isArray(webSearch?.latest_online_updates) &&
                        webSearch.latest_online_updates.length > 0 ? (
                          <ul className="list-disc pl-4 space-y-1 marker:text-emerald-400/80">
                            {webSearch.latest_online_updates.map(
                              (u: any, i: number) => (
                                <li key={i} className="text-[11px]">
                                  <span className="opacity-90">
                                    {u?.summary || ""}
                                  </span>{" "}
                                  {u?.source && (
                                    <a
                                      href={u.source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-300/90 hover:underline"
                                    >
                                      🔗
                                    </a>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <div className="text-[11px] opacity-70">
                            Data isn&apos;t available online
                          </div>
                        )}
                      </div>
                      <div className="rounded border border-emerald-500/30 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 mb-1">
                          Market Growth
                        </div>
                        {webSearch?.market_growth?.summary ? (
                          <div className="text-[11px]">
                            <span className="opacity-90">
                              {webSearch.market_growth.summary}
                            </span>{" "}
                            {webSearch?.market_growth?.source && (
                              <a
                                href={webSearch.market_growth.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-300/90 hover:underline"
                              >
                                🔗
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] opacity-70">
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
                        className="rounded-md bg-white/[0.02] p-2 border border-white/[0.04]"
                      >
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-indigo-300/60 mb-1">
                          {prettyLabel}
                        </div>
                        <div className="text-[11px] md:text-[12px] leading-relaxed whitespace-pre-wrap opacity-90">
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
                        className="rounded-md border border-amber-400/20 bg-amber-400/5 p-2.5"
                      >
                        {h.claim && (
                          <div className="font-medium text-[11px] md:text-[12px] leading-snug mb-1 text-amber-200/90">
                            {h.claim}
                          </div>
                        )}
                        {h.status && (
                          <div className="text-[10px] md:text-[11px] text-amber-300/70">
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
                  <ol className="space-y-3 list-decimal pl-4 marker:text-indigo-300/60">
                    {items.map((q: any, i: number) => (
                      <li key={i} className="space-y-1">
                        {q.question && (
                          <div className="font-medium text-[11px] md:text-[12px] leading-snug text-indigo-100/90">
                            {q.question}
                          </div>
                        )}
                        {q.rationale && (
                          <div className="text-[10px] md:text-[11px] text-indigo-200/60">
                            {q.rationale}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                );
              }
              return (
                <ul className="list-disc pl-4 space-y-1 marker:text-indigo-400/70">
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
          return (
            <div
              key={(section as any).key}
              className="group rounded-md bg-white/1.5 hover:bg-white/[0.03] transition-colors p-2.5 border border-white/5"
            >
              <div className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300/70 mb-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400" />
                {(section as any).label}
              </div>
              {content}
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
