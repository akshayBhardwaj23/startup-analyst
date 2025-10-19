"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import { useSession } from "next-auth/react";

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
  const safe =
    typeof score === "number" ? Math.min(100, Math.max(0, score)) : null;
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

  const color =
    safe == null
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

export default function Home() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [webSearch, setWebSearch] = useState<any | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [previousRuns, setPreviousRuns] = useState<Array<{
    id: string;
    createdAt: string;
    brief: any;
  }> | null>(null);
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

  // Build a custom multi-page A4 PDF (no screenshot) with a two-column layout
  const onDownloadPDF = useCallback(async () => {
    if (!brief) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36; // 0.5"
      const gutter = 18;
      const contentWidth = pageWidth - margin * 2;
      const leftW = Math.floor(contentWidth * 0.46);
      const rightW = contentWidth - leftW - gutter;
      const leftX = margin;
      const rightX = margin + leftW + gutter;
      // Header: logo + company name + website URL
      // Load logo from public folder
      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const headerHeight = 48; // pts
      try {
        const logo = await loadImage("/brand-icon.png");
        const logoSize = 28; // pts
        const logoY = margin + (headerHeight - logoSize) / 2;
        pdf.addImage(logo as any, "PNG", margin, logoY, logoSize, logoSize);
      } catch {}

      // Company name
      const nameX = margin + 36; // some space after logo
      const nameY = margin + 20; // first line baseline
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(30, 30, 30);
      pdf.text("Startup Analyst XI", nameX, nameY);

      // Website URL (clickable)
      const url = "https://startup-analyst-xi.vercel.app/";
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(56, 116, 203); // link-ish blue
      const urlY = nameY + 14;
      pdf.text(url, nameX, urlY);
      try {
        const urlW = (pdf as any).getTextWidth
          ? (pdf as any).getTextWidth(url)
          : 140;
        pdf.link(nameX, urlY - 10, urlW, 14, { url });
      } catch {}

      // Top-right: user-entered company name
      if (companyName && companyName.trim()) {
        const rightLabel = companyName.trim();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        // Constrain to avoid overlapping the left header block
        const maxRightWidth = contentWidth * 0.44; // roughly the right column width
        const getW = (t: string) =>
          (pdf as any).getTextWidth
            ? (pdf as any).getTextWidth(t)
            : t.length * 6;
        let display = rightLabel;
        if (getW(display) > maxRightWidth) {
          // Truncate with ellipsis until it fits
          while (display.length > 1 && getW(display + "…") > maxRightWidth) {
            display = display.slice(0, -1);
          }
          display += "…";
        }
        // Align to the right margin at the same baseline as company title on the left
        pdf.text(display, pageWidth - margin, nameY, { align: "right" as any });
      }

      // Divider under header
      (pdf as any).setLineCap && (pdf as any).setLineCap("butt");
      pdf.setDrawColor(230, 230, 235);
      pdf.setLineWidth(0.8);
      pdf.line(
        margin,
        margin + headerHeight,
        pageWidth - margin,
        margin + headerHeight
      );

  let leftY = margin + headerHeight + 10;
  let rightY = margin + headerHeight + 10;

      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace("#", "");
        const bigint = parseInt(h, 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
      };
      const setStroke = (
        hex: string,
        w: number,
        cap: "butt" | "round" | "square" = "round"
      ) => {
        const [r, g, b] = hexToRgb(hex);
        (pdf as any).setLineCap && (pdf as any).setLineCap(cap);
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(w);
      };
      const textColor = (pdf as any).getTextColor
        ? (pdf as any).getTextColor()
        : undefined;

      const gaugeColorFor = (score: number | null | undefined) => {
        if (score == null) return "#94a3b8"; // slate-400
        if (score < 40) return "#ef4444";
        if (score < 70) return "#f59e0b";
        return "#22c55e";
      };
      const drawSemiGauge = (
        x: number,
        y: number,
        w: number,
        score: number | null | undefined,
        label: string,
        emphasize = false
      ) => {
        const r = Math.min(w / 2 - 4, 90);
        const cx = x + w / 2;
        const cy = y + r + 10;
        const trackColor = "#334155";
        const strokeW = emphasize ? 8 : 6;
        const safe =
          typeof score === "number" ? Math.max(0, Math.min(100, score)) : null;
        // Track
        setStroke(trackColor, strokeW, "butt");
        const segments = 60; // smoothness
        let prevX = cx - r,
          prevY = cy;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const ang = Math.PI * (1 - t); // pi -> 0
          const px = cx + Math.cos(ang) * r;
          const py = cy - Math.sin(ang) * r;
          pdf.line(prevX, prevY, px, py);
          prevX = px;
          prevY = py;
        }
        // Value arc
        if (safe != null && safe > 0) {
          const color = gaugeColorFor(safe);
          setStroke(color, strokeW, "round");
          const filledSeg = Math.max(1, Math.round((segments * safe) / 100));
          prevX = cx - r;
          prevY = cy;
          for (let i = 1; i <= filledSeg; i++) {
            const t = i / segments;
            const ang = Math.PI * (1 - t);
            const px = cx + Math.cos(ang) * r;
            const py = cy - Math.sin(ang) * r;
            pdf.line(prevX, prevY, px, py);
            prevX = px;
            prevY = py;
          }
        }
        // Number
        pdf.setFont("helvetica", "bold");
        const fs = emphasize ? 28 : 20;
        pdf.setFontSize(fs);
        pdf.setTextColor(30, 30, 30);
        pdf.text(
          String(safe == null ? "N/A" : Math.round(safe)),
          cx,
          cy - r * 0.2,
          { align: "center" as any }
        );
        // Label
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.text(label.toUpperCase(), cx, cy + 18, { align: "center" as any });
        // return height consumed
        return r + 24 + 10; // arc height + label + padding
      };

      const newPage = () => {
        pdf.addPage();
        leftY = margin; // no repeated header on subsequent pages
        rightY = margin;
        // optional top divider for consistency
        pdf.setDrawColor(230, 230, 235);
        pdf.setLineWidth(0.6);
        pdf.line(margin, margin - 6, pageWidth - margin, margin - 6);
      };

      const writeUrlLine = (
        x: number,
        yRef: "right" | "left",
        url: string,
        color: [number, number, number] = [56, 116, 203]
      ) => {
        if (!url) return;
        const maxW = yRef === "right" ? rightW : leftW;
        const lineH = 13;
        const lines = pdf.splitTextToSize(url, maxW);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...color);
        let y = yRef === "right" ? rightY : leftY;
        for (const ln of lines) {
          if (y > pageHeight - margin) {
            newPage();
            y = yRef === "right" ? rightY : leftY;
          }
          pdf.text(ln, x, y);
          // clickable area for the entire line
          try {
            const w = (pdf as any).getTextWidth ? (pdf as any).getTextWidth(ln) : Math.min(ln.length * 6, maxW);
            pdf.link(x, y - 10, Math.min(w, maxW), 14, { url });
          } catch {}
          y += lineH;
        }
        if (yRef === "right") rightY = y + 2; else leftY = y + 2;
      };

      const addHeading = (text: string, yRef: "right" | "left") => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(99, 102, 241); // indigo-ish
        const y = yRef === "right" ? rightY : leftY;
        const x = yRef === "right" ? rightX : leftX;
        if (y + 14 > pageHeight - margin) {
          newPage();
        }
        pdf.text(text.toUpperCase(), x, yRef === "right" ? rightY : leftY);
        if (yRef === "right") rightY += 14; else leftY += 14;
      };

      const addParagraph = (
        text: string,
        yRef: "right" | "left",
        color: [number, number, number] = [34, 34, 34]
      ) => {
        const maxW = yRef === "right" ? rightW : leftW;
        const x = yRef === "right" ? rightX : leftX;
        const lines = pdf.splitTextToSize(text, maxW);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...color);
        const lineH = 13;
        let y = yRef === "right" ? rightY : leftY;
        for (const ln of lines) {
          if (y > pageHeight - margin) {
            newPage();
            y = yRef === "right" ? rightY : leftY;
          }
          pdf.text(ln, x, y);
          y += lineH;
        }
        if (yRef === "right") rightY = y + 6; else leftY = y + 6;
      };
      const isEmptyTextRefs = (o: any) =>
        o && typeof o === "object" && typeof o.text === "string" && o.text.trim() === "" && Array.isArray(o.refs) && o.refs.length === 0;

      const toLinesStr = (value: any): string => {
        if (Array.isArray(value))
          return value
            .map((v) =>
              typeof v === "object" ? v.text ?? JSON.stringify(v) : String(v)
            )
            .join("\n");
        if (value && typeof value === "object") {
          if (isEmptyTextRefs(value)) return "";
          return String((value as any).text ?? JSON.stringify(value, null, 2));
        }
        if (value == null) return "";
        return String(value);
      };

      // Left column: Overall big gauge, then other gauges
      const ratings: any = (brief as any).ratings || {};
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
              : k === "team_strength"
              ? "Team Strength"
              : k === "market_quality"
              ? "Market Quality"
              : k === "product_maturity"
              ? "Product Maturity"
              : k === "risk_profile"
              ? "Risk Profile"
              : k === "data_confidence"
              ? "Data Confidence"
              : k.charAt(0).toUpperCase() + k.slice(1).replace("_", " "),
          score: ratings?.[k]?.score as number | undefined,
        }))
        .filter((e) => typeof e.score === "number" && (e.score as number) > 0);

      const overall = items.find((i) => i.key === "overall");
      const others = items.filter((i) => i.key !== "overall");

      if (overall) {
        // Big overall gauge
        const consumed = drawSemiGauge(
          leftX,
          leftY,
          leftW,
          overall.score,
          "Overall",
          true
        );
        leftY += consumed + 8;
      }
      if (others.length > 0) {
        // Render others in 3 columns grid of small gauges
        const cols = 3;
        const gap = 8;
        const cellW = Math.floor((leftW - gap * (cols - 1)) / cols);
        let col = 0;
        let row = 0;
        const baseY = leftY;
        for (let i = 0; i < others.length; i++) {
          const e = others[i];
          const gx = leftX + col * (cellW + gap);
          const gy = baseY + row * 90; // approx row height for small gauges
          drawSemiGauge(gx, gy, cellW, e.score, e.label, false);
          col++;
          if (col >= cols) {
            col = 0;
            row++;
          }
        }
        // advance leftY to the bottom of the last row of gauges
        const rowsUsed = row + (col > 0 ? 1 : 0);
        leftY = baseY + rowsUsed * 90 + 10;
      }

      // Right column: one-liner then sections
      const oneLiner = toLinesStr((brief as any).one_liner);
      if (oneLiner) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(80, 39, 201);
        const lines = pdf.splitTextToSize(oneLiner, rightW);
        const lh = 15;
        for (const ln of lines) {
          if (rightY > pageHeight - margin) break;
          pdf.text(ln, rightX, rightY);
          rightY += lh;
        }
        rightY += 8;
      }

      // Build formatted sections with better handling for nested objects/lists
      const formatICPGTM = (obj: any): string => {
        if (!obj || typeof obj !== "object") return toLinesStr(obj);
        const parts: string[] = [];
        if (obj.icp) {
          const icpText = toLinesStr(obj.icp);
          if (icpText) parts.push("ICP: " + icpText);
        }
        if (obj.gtm) {
          const gtmText = toLinesStr(obj.gtm);
          if (gtmText) parts.push("GTM: " + gtmText);
        }
        return parts.join("\n\n");
      };
      const formatTAM = (obj: any): string => {
        if (!obj || typeof obj !== "object") return toLinesStr(obj);
        const map: Record<string, string> = {
          global_market: "Global Market",
          target_segment: "Target Segment",
          growth: "Growth",
        };
        const parts: string[] = [];
        for (const key of Object.keys(map)) {
          const node = (obj as any)[key];
          if (!node) continue;
          const txt = toLinesStr(node);
          if (txt) parts.push(`${map[key]}: ${txt}`);
        }
        return parts.join("\n\n");
      };
      const formatList = (arr: any): string => {
        if (!Array.isArray(arr)) return toLinesStr(arr);
        return arr
          .filter((v: any) => !(typeof v === "object" && isEmptyTextRefs(v)))
          .map(
            (v: any) =>
              "• " +
              (typeof v === "object" ? v.text ?? JSON.stringify(v) : String(v))
          )
          .join("\n");
      };

      // Web-search sections
      const formatWebLatest = (web: any): { title: string; blocks: Array<{text: string; url?: string}> } | null => {
        const list = Array.isArray(web?.latest_online_updates) ? web.latest_online_updates : [];
        const items = list.filter((u: any) => u && typeof u === "object" && (u.summary || u.source));
        if (items.length === 0) return null;
        return {
          title: "Online: Latest Updates",
          blocks: items.map((u: any) => ({ text: String(u.summary || ""), url: u.source || undefined })),
        };
      };
      const formatWebGrowth = (web: any): { title: string; text: string; url?: string } | null => {
        const mg = web?.market_growth || null;
        const summary = mg?.summary ? String(mg.summary) : "";
        const source = mg?.source ? String(mg.source) : undefined;
        if (!summary) return null;
        return { title: "Online: Market Growth", text: summary, url: source };
      };

      type Section = { title: string; text: string; linkUrls?: string[] };
      const sections: Section[] = [];
      const pushIf = (title: string, text: string, linkUrls?: string[]) => {
        if (text && text.trim()) sections.push({ title, text: text.trim(), linkUrls });
      };
      pushIf("Problem", toLinesStr((brief as any).problem));
      pushIf("Solution", toLinesStr((brief as any).solution));
      pushIf("ICP & GTM", formatICPGTM((brief as any).icp_gtm));
      // Insert web-search sections here
      const webLatest = formatWebLatest(webSearch);
      if (webLatest) {
        // We collect as a single text block with bullets; links rendered line-by-line later
        const text = webLatest.blocks.map((b) => `• ${b.text}`).join("\n");
        const urls = webLatest.blocks.map((b) => b.url).filter(Boolean) as string[];
        pushIf(webLatest.title, text, urls);
      }
      const webGrowth = formatWebGrowth(webSearch);
      if (webGrowth) {
        pushIf(webGrowth.title, webGrowth.text, webGrowth.url ? [webGrowth.url] : undefined);
      }
      pushIf("Traction", formatList((brief as any).traction_bullets));
      pushIf("Business Model", toLinesStr((brief as any).business_model));
      pushIf("TAM", formatTAM((brief as any).tam));
      pushIf("Team", toLinesStr((brief as any).team));
      pushIf("Moat", formatList((brief as any).moat_bullets));
      pushIf("Risks", formatList((brief as any).risks_bullets));

      const maxY = pageHeight - margin;
      const writeSection = (s: Section) => {
        const tryWrite = (yRef: "right" | "left") => {
          addHeading(s.title, yRef);
          addParagraph(s.text, yRef);
          if (s.linkUrls && s.linkUrls.length) {
            // Render each link on its own line
            for (const u of s.linkUrls) writeUrlLine(yRef === "right" ? rightX : leftX, yRef, u);
          }
        };

        // Prefer right, then left; if both out of space, add a page and then write on right
        const spaceRight = rightY + 26 < maxY;
        const spaceLeft = leftY + 26 < maxY;
        if (spaceRight) {
          tryWrite("right");
        } else if (spaceLeft) {
          tryWrite("left");
        } else {
          newPage();
          tryWrite("right");
        }
      };

      sections.forEach(writeSection);

      pdf.save(`${companyName ? companyName + "-" : ""}vc-summary.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      setError("Failed to generate PDF");
    }
  }, [brief, companyName, webSearch]);

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
    const next: File[] = Array.from(list);
    setFiles((prev) => [...prev, ...next]);
    setError(null);
  }, []);

  const onAnalyze = async () => {
    if (!session) {
      window.location.href = "/login";
      return;
    }
    if (!companyName || !companyName.trim()) {
      setError("Company name is required");
      return;
    }
    try {
      setError(null);
      setAnalyzing(true);
  setBrief(null);
  setWebSearch(null);
      if (files.length === 0) throw new Error("Upload files first");

      // 1) First, run web-search via Gemini Flash-Lite (Vertex) before analysis
      try {
        setWebLoading(true);
        const res = await fetch("/api/web-search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyName: companyName.trim() }),
        });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) throw new Error(await res.text());
        const payload = ct.includes("application/json") ? await res.json() : {};
        setWebSearch(payload?.web ?? {});
      } catch (e) {
        setWebSearch({});
      } finally {
        setWebLoading(false);
      }

      // 2) Upload files to Vercel Blob via client SDK (streams, avoids body size limits)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url } = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploadedUrls.push(url);
      }

      // 3) Call analysis with Blob URLs (small JSON body)
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
      setPreviousRuns(
        Array.isArray(data.previousRuns) ? data.previousRuns : null
      );
    } catch (e: any) {
      setError(e.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };


  const totalFiles = files.length;
  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

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
            <span className="text-xs font-medium opacity-70">
              General Release
            </span>
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
                    {files.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 py-1 px-2 rounded-md bg-indigo-500/5 border border-indigo-500/10"
                      >
                        <span className="i-tabler-file-description text-indigo-400" />
                        <span className="truncate flex-1" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFileAt(idx)}
                          className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 text-red-400"
                          aria-label={`Remove ${file.name}`}
                          title="Remove file"
                        >
                          {/* X icon */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
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
                  placeholder="Write Company Name here"
                  className="w-full rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  aria-required
                />
                <div className="mt-1 text-[11px] opacity-70">
                  Company name is required to generate the brief.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onAnalyze}
                  disabled={
                    analyzing ||
                    !files ||
                    files.length === 0 ||
                    !companyName.trim()
                  }
                  className="btn-primary text-sm"
                  title={
                    !session
                      ? "Login to generate brief"
                      : !companyName.trim()
                      ? "Enter company name"
                      : undefined
                  }
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                      Thinking…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>
                        {session ? "Generate Brief" : "Login to Generate"}
                      </span>
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

          <section
            className="panel glass brief flex flex-col min-h-[420px] relative md:col-span-3"
            ref={outRef}
          >
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
                              {
                                key: "overall",
                                label: "Overall",
                                score: r.overall?.score as number | undefined,
                                emphasis: true,
                              },
                              {
                                key: "team_strength",
                                label: "Team Strength",
                                score: r.team_strength?.score as
                                  | number
                                  | undefined,
                              },
                              {
                                key: "market_quality",
                                label: "Market Quality",
                                score: r.market_quality?.score as
                                  | number
                                  | undefined,
                              },
                              {
                                key: "product_maturity",
                                label: "Product Maturity",
                                score: r.product_maturity?.score as
                                  | number
                                  | undefined,
                              },
                              {
                                key: "moat",
                                label: "Moat",
                                score: r.moat?.score as number | undefined,
                              },
                              {
                                key: "traction",
                                label: "Traction",
                                score: r.traction?.score as number | undefined,
                              },
                              {
                                key: "risk_profile",
                                label: "Risk Profile",
                                score: r.risk_profile?.score as
                                  | number
                                  | undefined,
                              },
                              {
                                key: "data_confidence",
                                label: "Data Confidence",
                                score: r.data_confidence?.score as
                                  | number
                                  | undefined,
                              },
                            ].filter(
                              (e) =>
                                typeof e.score === "number" &&
                                (e.score as number) > 0
                            ) as Array<{
                              key: string;
                              label: string;
                              score: number;
                              emphasis?: boolean;
                            }>;

                            if (entries.length === 0) return null;

                            const hasOverall = entries.some(
                              (e) => e.key === "overall"
                            );
                            const overall = hasOverall
                              ? entries.find((e) => e.key === "overall")!
                              : null;
                            const rest = hasOverall
                              ? entries.filter((e) => e.key !== "overall")
                              : entries;
                            const all =
                              hasOverall && overall ? [overall, ...rest] : rest;

                            // Helper to choose md:grid-cols-* class from count (keep strings literal for Tailwind JIT)
                            const mdColsAll = (n: number) =>
                              n <= 1
                                ? "md:grid-cols-1"
                                : n === 2
                                ? "md:grid-cols-2"
                                : n === 3
                                ? "md:grid-cols-3"
                                : n === 4
                                ? "md:grid-cols-4"
                                : n === 5
                                ? "md:grid-cols-5"
                                : n === 6
                                ? "md:grid-cols-6"
                                : n === 7
                                ? "md:grid-cols-7"
                                : "md:grid-cols-8";

                            const overallScale = hasOverall ? 1.1 : 1; // slight emphasis
                            const itemScale = 1;

                            return (
                              <>
                                {/* Desktop: all gauges in one row */}
                                <div
                                  className={`hidden md:grid ${mdColsAll(
                                    all.length
                                  )} gap-3`}
                                >
                                  {all.map((e) => (
                                    <Gauge
                                      key={e.key}
                                      label={e.label}
                                      score={e.score}
                                      emphasis={
                                        hasOverall && e.key === "overall"
                                      }
                                      scale={
                                        hasOverall && e.key === "overall"
                                          ? overallScale
                                          : itemScale
                                      }
                                    />
                                  ))}
                                </div>

                                {/* Mobile: Overall full-width first, then others 2-per-row */}
                                {hasOverall ? (
                                  <>
                                    <div className="grid grid-cols-1 gap-3 md:hidden">
                                      <Gauge
                                        label="Overall"
                                        score={overall!.score}
                                        emphasis
                                        scale={overallScale}
                                      />
                                    </div>
                                    {rest.length > 0 && (
                                      <div className="grid grid-cols-2 gap-3 md:hidden">
                                        {rest.map((e) => (
                                          <Gauge
                                            key={e.key}
                                            label={e.label}
                                            score={e.score}
                                            scale={itemScale}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // No Overall: just 2-per-row on mobile
                                  <div className="grid grid-cols-2 gap-3 md:hidden">
                                    {all.map((e) => (
                                      <Gauge
                                        key={e.key}
                                        label={e.label}
                                        score={e.score}
                                        scale={itemScale}
                                      />
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
                          // Inject web-search block between ICP & GTM and Traction
                          { key: "__web_between__", label: "__web_between__" as any },
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
                          // Special pseudo-section to inject online web summary block
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
                                      {/* Latest online updates */}
                                      <div className="rounded border border-emerald-500/30 p-2">
                                        <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 mb-1">Latest Online Updates</div>
                                        {Array.isArray(webSearch?.latest_online_updates) && webSearch.latest_online_updates.length > 0 ? (
                                          <ul className="list-disc pl-4 space-y-1 marker:text-emerald-400/80">
                                            {webSearch.latest_online_updates.map((u: any, i: number) => (
                                              <li key={i} className="text-[11px]">
                                                <span className="opacity-90">{u?.summary || ""}</span>{" "}
                                                {u?.source && (
                                                  <a href={u.source} target="_blank" rel="noopener noreferrer" className="text-emerald-300/90 hover:underline">
                                                    🔗
                                                  </a>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <div className="text-[11px] opacity-70">Data isn&apos;t available online</div>
                                        )}
                                      </div>
                                      {/* Market growth */}
                                      <div className="rounded border border-emerald-500/30 p-2">
                                        <div className="text-[10px] uppercase tracking-wider text-emerald-200/80 mb-1">Market Growth</div>
                                        {webSearch?.market_growth?.summary ? (
                                          <div className="text-[11px]">
                                            <span className="opacity-90">{webSearch.market_growth.summary}</span>{" "}
                                            {webSearch?.market_growth?.source && (
                                              <a href={webSearch.market_growth.source} target="_blank" rel="noopener noreferrer" className="text-emerald-300/90 hover:underline">
                                                🔗
                                              </a>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-[11px] opacity-70">Data isn&apos;t available online</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          const val: any = (brief as any)[section.key];
                          const renderVal = () => {
                            const isEmptyTextRefs = (o: any) =>
                              o &&
                              typeof o === "object" &&
                              typeof o.text === "string" &&
                              o.text.trim() === "" &&
                              Array.isArray(o.refs) &&
                              o.refs.length === 0;

                            if (val == null) return null;
                            // Nested object special cases (icp_gtm, tam)
                            if (
                              section.nested &&
                              val &&
                              typeof val === "object" &&
                              !Array.isArray(val)
                            ) {
                              const nestedKeys = section.nested.filter((sub) => {
                                const node = (val as any)[sub];
                                if (!node) return false;
                                if (typeof node === "object" && isEmptyTextRefs(node)) return false;
                                return true;
                              });
                              if (nestedKeys.length === 0) return null;
                              return (
                                <div className="space-y-2">
                                  {nestedKeys.map((sub) => {
                                    const node = (val as any)[sub];
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
                              const items = (val as any[]).filter((v) =>
                                !(typeof v === "object" && v && isEmptyTextRefs(v))
                              );
                              if (items.length === 0) return null;
                              // Hypotheses: objects with claim/status
                              if (section.key === "hypotheses") {
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
                              // Founder questions: objects with question / rationale
                              if (section.key === "founder_questions") {
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
                              if (isEmptyTextRefs(val)) return null;
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
                          const content = renderVal();
                          if (!content) return null;
                          return (
                            <div
                              key={section.key}
                              className="group rounded-md bg-white/1.5 hover:bg-white/[0.03] transition-colors p-2.5 border border-white/5"
                            >
                              <div className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300/70 mb-1 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400" />
                                {section.label}
                              </div>
                              {content}
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
              {/* Previous analyses accordion */}
              {previousRuns && previousRuns.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300/70">
                    Previous analyses
                  </div>
                  <div className="space-y-2">
                    {previousRuns.map((r) => (
                      <details
                        key={r.id}
                        className="rounded-md border border-white/10 bg-white/5"
                      >
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                          {new Date(r.createdAt).toLocaleString()}
                        </summary>
                        <div className="p-3 text-sm overflow-auto">
                          <pre className="whitespace-pre-wrap text-xs opacity-90">
                            {JSON.stringify(r.brief, null, 2)}
                          </pre>
                        </div>
                      </details>
                    ))}
                  </div>
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
