"use client";
import { useState, useCallback, useRef } from "react";
import { upload } from "@vercel/blob/client";

type Brief = Record<string, any>;

// Speedometer Gauge component (0-100). Semi-circle with needle.
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
  const safe = typeof score === "number" ? Math.min(100, Math.max(0, score)) : null;
  // Dimensions (emphasis + scale)
  const baseW = emphasis ? 160 : 120;
  const baseH = emphasis ? 90 : 68;
  const baseR = emphasis ? 60 : 50;
  const width = Math.round(baseW * scale);
  const height = Math.round(baseH * scale);
  const cx = width / 2;
  const cy = height - 6; // add padding to avoid clipping the stroke
  const r = Math.round(baseR * scale);

  const angleFor = (s: number) => Math.PI - (s / 100) * Math.PI; // pi -> 0 (left -> right)
  const endAngle = safe != null ? angleFor(safe) : Math.PI;

  const startX = cx - r;
  const startY = cy;
  const fullEndX = cx + r;
  const fullEndY = cy;
  // For smooth proportional fill, we render the value arc using stroke-dasharray
  // on the same semi-circle path with pathLength=100 (so dash = score%).

  const color = safe == null
    ? "#1b62c7ff" // slate-400
    : safe < 40
      ? "#ef4444" // red-500
      : safe < 70
        ? "#f59e0b" // amber-500
        : "#22c55e"; // green-500

  const strokeW = emphasis ? 8 : 6;
  const fontSize = Math.round(r * (emphasis ? 0.68 : 0.58));
  const numberY = cy - r * 0.2;
  // To avoid a visible round "dot" at the end of the value arc when using rounded caps,
  // we slightly shorten the dash length and add a tiny negative dash offset so both caps
  // sit within the arc instead of protruding beyond the extreme endpoints.
  const capComp = 0.8; // in pathLength units (0-100)
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
        {/* Track */}
        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${fullEndX} ${fullEndY}`}
          fill="none"
          stroke="#334155" /* slate-700 */
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />
        {/* Meter (value arc) */}
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
        {/* Number inside the arc */}
        {safe != null ? (
          <text x={cx} y={numberY} textAnchor="middle" dominantBaseline="middle" className="fill-current" fontSize={fontSize} fontWeight={700}>
            {Math.round(safe)}
          </text>
        ) : (
          <text x={cx} y={numberY} textAnchor="middle" dominantBaseline="middle" className="fill-current opacity-60" fontSize={Math.max(10, fontSize - 2)}>
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

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const outRef = useRef<HTMLDivElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const formatBriefToText = (b: any) => {
    if (!b) return "";
    const lines: string[] = [];
    const add = (label: string, value: any) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        lines.push(`${label}:`);
        for (const item of value) {
          const text =
            typeof item === "object" ? JSON.stringify(item) : String(item);
          lines.push(`- ${text}`);
        }
      } else if (typeof value === "object") {
        lines.push(`${label}:`);
        lines.push(JSON.stringify(value, null, 2));
      } else {
        lines.push(`${label}: ${String(value)}`);
      }
      lines.push("");
    };

    add("One-liner", b.one_liner);
    add("Problem", b.problem);
    add("Solution", b.solution);
    add("ICP & GTM", b.icp_gtm);
    add("Traction", b.traction_bullets);
    add("Business model", b.business_model);
    add("TAM", b.tam);
    add("Team", b.team);
    add("Moat", b.moat_bullets);
    add("Risks", b.risks_bullets);
    add("Why now", b.why_now);
    add("Hypotheses", b.hypotheses);
    add("Founder questions", b.founder_questions);
    add("Ratings", b.ratings);

    return lines.join("\n").trim();
  };

  // Download the Output panel as a PDF
  const onDownloadPDF = useCallback(async () => {
    if (!brief) return;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const node = outRef.current;
      if (!node) return;

      const canvas = await html2canvas(node, {
        scale: window.devicePixelRatio > 1 ? 2 : 1.5,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background') || '#0b0b10',
        ignoreElements: (el: Element) => {
          const e = el as HTMLElement;
          return e.dataset && (e.dataset.noexport === 'true' || e.dataset.noexport === '1');
        },
        onclone: (doc) => {
          // Remove gradients and unsupported color functions (oklab/oklch/lab) and fix gradient-clipped text
          const all = Array.from(doc.querySelectorAll('*')) as HTMLElement[];
          const rootStyles = doc.defaultView?.getComputedStyle(doc.documentElement) ?? getComputedStyle(document.documentElement);
          const fg = (rootStyles.getPropertyValue('--foreground') || '#1f2937').trim();
          const bg = (rootStyles.getPropertyValue('--background') || '#ffffff').trim();
          const hasUnsupported = (s?: string) => !!s && /(oklab\(|oklch\(|lab\(|lch\()/i.test(s);
          const isTransparent = (s?: string) => s === 'rgba(0, 0, 0, 0)' || s === 'transparent';
          all.forEach((el) => {
            const cs = doc.defaultView?.getComputedStyle(el);
            if (!cs) return;
            const bgImage = cs.backgroundImage || '';
            const bgShorthand = cs.background || '';
            if (bgImage.includes('gradient(') || hasUnsupported(bgImage) || hasUnsupported(bgShorthand)) {
              el.style.backgroundImage = 'none';
              el.style.background = 'none';
              if (isTransparent(cs.backgroundColor)) {
                el.style.backgroundColor = bg;
              }
            }
            const color = cs.color || '';
            const clip = (cs as any).getPropertyValue?.('-webkit-background-clip') || (cs as any).backgroundClip || '';
            if (isTransparent(color) || clip === 'text' || hasUnsupported(color)) {
              el.style.color = fg;
              (el.style as any)['-webkit-background-clip'] = 'initial';
              el.style.backgroundClip = 'border-box';
              if (el.style.backgroundImage) el.style.backgroundImage = 'none';
            }
            // Borders and outlines
            const borderColor = cs.borderColor || '';
            if (hasUnsupported(borderColor)) el.style.borderColor = fg + '33';
            ['Top','Right','Bottom','Left'].forEach(side => {
              const v = (cs as any)[`border${side}Color`] as string | undefined;
              if (hasUnsupported(v)) (el.style as any)[`border${side}Color`] = fg + '33';
            });
            const outlineColor = cs.outlineColor || '';
            if (hasUnsupported(outlineColor)) el.style.outlineColor = fg;
            const boxShadow = cs.boxShadow || '';
            if (hasUnsupported(boxShadow)) el.style.boxShadow = 'none';
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = 0;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`${companyName ? companyName + '-' : ''}vc-summary.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      setError('Failed to generate PDF');
    }
  }, [brief, companyName]);

  // Safely coerce possible array / object fields to display text
  const toLines = (value: any): string => {
    if (Array.isArray(value))
      return value
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join("\n");
    if (value && typeof value === "object")
      return JSON.stringify(value, null, 2);
    if (value == null) return "";
    return String(value);
  };

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    setFiles(list);
    setError(null);
  }, []);

  const onAnalyze = async () => {
    try {
      setError(null);
      setAnalyzing(true);
      setBrief(null);
      if (!files || files.length === 0) throw new Error("Upload files first");

      // 1) Upload files to Vercel Blob via client SDK (streams, avoids body size limits)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url } = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploadedUrls.push(url);
      }

      // 2) Call analysis with Blob URLs (small JSON body)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: uploadedUrls, companyName }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = contentType.includes("application/json")
          ? JSON.stringify(await res.json())
          : await res.text();
        throw new Error(errText || `${res.status} ${res.statusText}`);
      }
      const data = contentType.includes("application/json")
        ? await res.json()
        : { brief: { raw: await res.text() } };
      setBrief(data.brief);
    } catch (e: any) {
      setError(e.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const totalFiles = files?.length || 0;
  const fileNames: string[] = [];
  if (files)
    for (let i = 0; i < files.length; i++) fileNames.push(files[i].name);

  const onCopy = async () => {
    try {
      if (!brief) return;
      const text = brief.raw ? brief.raw : formatBriefToText(brief);
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12 font-sans fade-in">
  <div className="max-w-screen-2xl mx-auto">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text">
              Startup Brief Generator
            </h1>
            <p className="mt-2 text-sm max-w-prose text-foreground/70 leading-relaxed">
              Upload pitch materials or planning docs (PDF / DOCX). Get an
              investor-style synopsis: one-liner, problem, solution, GTM, TAM,
              risks & more.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="text-xs font-medium opacity-70">Alpha</span>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-5">
          <section className="panel glass relative overflow-hidden md:col-span-2">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/20 to-pink-500/20 blur-3xl" />
            <div className="relative space-y-6">
              <div>
                <div className="card-title">Documents</div>
                <div
                  ref={dropRef}
                  onDragEnter={onDrag}
                  onDragOver={onDrag}
                  onDragLeave={onDrag}
                  onDrop={onDrop}
                  className={`file-drop ${dragActive ? "drag-active" : ""}`}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={analyzing}
                  />
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <span className="font-medium">
                      {dragActive
                        ? "Release to add"
                        : "Drag & drop or click to select"}
                    </span>
                    <span className="text-xs opacity-70">
                      PDF or DOCX • up to ~25MB each
                    </span>
                    {totalFiles > 0 && (
                      <span className="mt-1 outline-pill">
                        {totalFiles} file{totalFiles > 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                </div>
                {totalFiles > 0 && (
                  <ul className="mt-4 space-y-1 max-h-40 overflow-auto pr-1 text-xs">
                    {fileNames.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 py-1 px-2 rounded-md bg-indigo-500/5 border border-indigo-500/10"
                      >
                        <span className="i-tabler-file-description text-indigo-400" />
                        <span className="truncate flex-1" title={f}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="card-title">Company</div>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Robotics"
                  className="w-full rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onAnalyze}
                  disabled={analyzing || !files || files.length === 0}
                  className="btn-primary text-sm"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                      Processing…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Generate Brief</span>
                    </span>
                  )}
                </button>
                {error && (
                  <span className="text-xs text-red-500 font-medium">
                    {error}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="panel glass brief flex flex-col min-h-[420px] relative md:col-span-3" ref={outRef}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <div className="card-title">Output</div>
                <h2 className="text-lg font-semibold tracking-tight">
                  VC Style Summary
                </h2>
              </div>
              {brief && (
                <div className="flex items-center gap-2" data-noexport="true">
                  <button
                    onClick={onDownloadPDF}
                    className="copy-btn flex items-center gap-2"
                    disabled={analyzing}
                    title="Download PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    <span>Download PDF</span>
                  </button>
                </div>
              )}
            </div>
            <div className="divider" />
            <div className="relative flex-1">
              {!brief && !analyzing && (
                <div className="text-xs opacity-60 leading-relaxed">
                  The generated brief will appear here with structured sections
                  focusing on problem, solution differentiation, go-to-market
                  motion, traction signals, addressed market sizing, core moat /
                  defensibility angles and potential risk factors.
                </div>
              )}
              {analyzing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm opacity-80">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
                    <span>Analyzing documents & extracting signals…</span>
                  </div>
                  <div className="grid gap-2 text-[10px] text-indigo-400/70">
                    <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer" />
                    <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-5/6" />
                    <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-4/6" />
                    <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-3/6" />
                  </div>
                </div>
              )}
              {brief && (
                <div className="space-y-6">
                  {brief.raw ? (
                    <pre className="brief-pre">{brief.raw}</pre>
                  ) : (
                    <div className="space-y-6">
                      {brief.one_liner && (
                        <div className="text-base md:text-lg font-semibold tracking-tight leading-snug bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                          {typeof brief.one_liner === "object"
                            ? brief.one_liner.text ||
                              JSON.stringify(brief.one_liner)
                            : String(brief.one_liner)}
                        </div>
                      )}
                      {/* Ratings speedometers */}
                      {brief.ratings && (
                        <div className="space-y-3">
                          {(() => {
                            const r = (brief as any).ratings || {};

                            // Build present entries in preferred order
                            const entries = [
                              { key: 'overall', label: 'Overall', score: r.overall?.score as number | undefined, emphasis: true },
                              { key: 'team_strength', label: 'Team Strength', score: r.team_strength?.score as number | undefined },
                              { key: 'market_quality', label: 'Market Quality', score: r.market_quality?.score as number | undefined },
                              { key: 'product_maturity', label: 'Product Maturity', score: r.product_maturity?.score as number | undefined },
                              { key: 'moat', label: 'Moat', score: r.moat?.score as number | undefined },
                              { key: 'traction', label: 'Traction', score: r.traction?.score as number | undefined },
                              { key: 'risk_profile', label: 'Risk Profile', score: r.risk_profile?.score as number | undefined },
                              { key: 'data_confidence', label: 'Data Confidence', score: r.data_confidence?.score as number | undefined },
                            ].filter((e) => typeof e.score === 'number' && (e.score as number) > 0) as Array<{ key: string; label: string; score: number; emphasis?: boolean }>;

                            if (entries.length === 0) return null;

                            const hasOverall = entries.some((e) => e.key === 'overall');
                            const overall = hasOverall ? entries.find((e) => e.key === 'overall')! : null;
                            const rest = hasOverall ? entries.filter((e) => e.key !== 'overall') : entries;
                            const all = hasOverall && overall ? [overall, ...rest] : rest;

                            // Helper to choose md:grid-cols-* class from count (keep strings literal for Tailwind JIT)
                            const mdColsAll = (n: number) =>
                              n <= 1
                                ? 'md:grid-cols-1'
                                : n === 2
                                ? 'md:grid-cols-2'
                                : n === 3
                                ? 'md:grid-cols-3'
                                : n === 4
                                ? 'md:grid-cols-4'
                                : n === 5
                                ? 'md:grid-cols-5'
                                : n === 6
                                ? 'md:grid-cols-6'
                                : n === 7
                                ? 'md:grid-cols-7'
                                : 'md:grid-cols-8';

                            const overallScale = hasOverall ? 1.1 : 1; // slight emphasis
                            const itemScale = 1;

                            return (
                              <>
                                {/* Desktop: all gauges in one row */}
                                <div className={`hidden md:grid ${mdColsAll(all.length)} gap-3`}>
                                  {all.map((e) => (
                                    <Gauge
                                      key={e.key}
                                      label={e.label}
                                      score={e.score}
                                      emphasis={hasOverall && e.key === 'overall'}
                                      scale={hasOverall && e.key === 'overall' ? overallScale : itemScale}
                                    />
                                  ))}
                                </div>

                                {/* Mobile: Overall full-width first, then others 2-per-row */}
                                {hasOverall ? (
                                  <>
                                    <div className="grid grid-cols-1 gap-3 md:hidden">
                                      <Gauge label="Overall" score={overall!.score} emphasis scale={overallScale} />
                                    </div>
                                    {rest.length > 0 && (
                                      <div className="grid grid-cols-2 gap-3 md:hidden">
                                        {rest.map((e) => (
                                          <Gauge key={e.key} label={e.label} score={e.score} scale={itemScale} />
                                        ))}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // No Overall: just 2-per-row on mobile
                                  <div className="grid grid-cols-2 gap-3 md:hidden">
                                    {all.map((e) => (
                                      <Gauge key={e.key} label={e.label} score={e.score} scale={itemScale} />
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {/* First row: Overall (large), Team Strength, Market Quality */}
                          {/* Legacy layout retained as fallback above via IIFE */}
                          {/* Rationale removed by request */}
                        </div>
                      )}
                      <div className="grid gap-5 md:gap-6 text-[11px] md:text-[13px] leading-relaxed">
                        {[
                          { key: "problem", label: "Problem" },
                          { key: "solution", label: "Solution" },
                          {
                            key: "icp_gtm",
                            label: "ICP & GTM",
                            nested: ["icp", "gtm"],
                          },
                          { key: "traction_bullets", label: "Traction" },
                          { key: "business_model", label: "Business Model" },
                          {
                            key: "tam",
                            label: "TAM",
                            nested: [
                              "global_market",
                              "target_segment",
                              "growth",
                            ],
                          },
                          { key: "team", label: "Team" },
                          {
                            key: "moat_bullets",
                            label: "Moat / Defensibility",
                          },
                          { key: "risks_bullets", label: "Risks" },
                          { key: "why_now", label: "Why Now" },
                          { key: "hypotheses", label: "Hypotheses" },
                          {
                            key: "founder_questions",
                            label: "Founder Questions",
                          },
                        ].map((section) => {
                          const val: any = (brief as any)[section.key];
                          if (!val || (Array.isArray(val) && val.length === 0))
                            return null;
                          const renderVal = () => {
                            // Nested object special cases (icp_gtm, tam)
                            if (
                              section.nested &&
                              val &&
                              typeof val === "object" &&
                              !Array.isArray(val)
                            ) {
                              return (
                                <div className="space-y-2">
                                  {section.nested.map((sub) => {
                                    const node = val[sub];
                                    if (!node) return null;
                                    const nodeText =
                                      typeof node === "object"
                                        ? node.text ||
                                          JSON.stringify(node, null, 2)
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
                              // Hypotheses: objects with claim/status
                              if (section.key === "hypotheses") {
                                return (
                                  <ul className="space-y-2">
                                    {val.map((h: any, i: number) => (
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
                              // Founder questions: objects with question / rationale
                              if (section.key === "founder_questions") {
                                return (
                                  <ol className="space-y-3 list-decimal pl-4 marker:text-indigo-300/60">
                                    {val.map((q: any, i: number) => (
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
                                  {val.map((v: any, i: number) => (
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
                              const text =
                                (val as any).text ||
                                JSON.stringify(val, null, 2);
                              return (
                                <div className="whitespace-pre-wrap opacity-90 font-normal">
                                  {text}
                                </div>
                              );
                            }
                            return (
                              <div className="opacity-90">{String(val)}</div>
                            );
                          };
                          return (
                            <div
                              key={section.key}
                              className="group rounded-md bg-white/1.5 hover:bg-white/[0.03] transition-colors p-2.5 border border-white/5"
                            >
                              <div className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300/70 mb-1 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400" />
                                {section.label}
                              </div>
                              {renderVal()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {brief.warnings && (
                    <div className="text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 font-mono">
                      {(brief.warnings as any[]).map((w, i) => (
                        <div key={i}>{w}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-14 mb-4 text-center text-[11px] opacity-60 space-y-1">
          <div>
            Built for rapid diligence workflows. Documents are processed
            transiently.
          </div>
          <div>
            © Token Tribe • Loading may be slow depending on region/network.
          </div>
        </footer>
      </div>

      {analyzing && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 animate-pulse opacity-5 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500" />
        </div>
      )}
    </div>
  );
}
