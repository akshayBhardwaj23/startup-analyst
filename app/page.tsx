"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ChatDrawer = dynamic(() => import("./components/ChatDrawer"), {
  ssr: false,
});
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
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [webSearch, setWebSearch] = useState<any | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
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
            const w = (pdf as any).getTextWidth
              ? (pdf as any).getTextWidth(ln)
              : Math.min(ln.length * 6, maxW);
            pdf.link(x, y - 10, Math.min(w, maxW), 14, { url });
          } catch {}
          y += lineH;
        }
        if (yRef === "right") rightY = y + 2;
        else leftY = y + 2;
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
        if (yRef === "right") rightY += 14;
        else leftY += 14;
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
        if (yRef === "right") rightY = y + 6;
        else leftY = y + 6;
      };
      const isEmptyTextRefs = (o: any) =>
        o &&
        typeof o === "object" &&
        typeof o.text === "string" &&
        o.text.trim() === "" &&
        Array.isArray(o.refs) &&
        o.refs.length === 0;

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
      const formatWebLatest = (
        web: any
      ): {
        title: string;
        blocks: Array<{ text: string; url?: string }>;
      } | null => {
        const list = Array.isArray(web?.latest_online_updates)
          ? web.latest_online_updates
          : [];
        const items = list.filter(
          (u: any) => u && typeof u === "object" && (u.summary || u.source)
        );
        if (items.length === 0) return null;
        return {
          title: "Online: Latest Updates",
          blocks: items.map((u: any) => ({
            text: String(u.summary || ""),
            url: u.source || undefined,
          })),
        };
      };
      const formatWebGrowth = (
        web: any
      ): { title: string; text: string; url?: string } | null => {
        const mg = web?.market_growth || null;
        const summary = mg?.summary ? String(mg.summary) : "";
        const source = mg?.source ? String(mg.source) : undefined;
        if (!summary) return null;
        return { title: "Online: Market Growth", text: summary, url: source };
      };

      type Section = { title: string; text: string; linkUrls?: string[] };
      const sections: Section[] = [];
      const pushIf = (title: string, text: string, linkUrls?: string[]) => {
        if (text && text.trim())
          sections.push({ title, text: text.trim(), linkUrls });
      };
      pushIf("Problem", toLinesStr((brief as any).problem));
      pushIf("Solution", toLinesStr((brief as any).solution));
      pushIf("ICP & GTM", formatICPGTM((brief as any).icp_gtm));
      // Insert web-search sections here
      const webLatest = formatWebLatest(webSearch);
      if (webLatest) {
        // We collect as a single text block with bullets; links rendered line-by-line later
        const text = webLatest.blocks.map((b) => `• ${b.text}`).join("\n");
        const urls = webLatest.blocks
          .map((b) => b.url)
          .filter(Boolean) as string[];
        pushIf(webLatest.title, text, urls);
      }
      const webGrowth = formatWebGrowth(webSearch);
      if (webGrowth) {
        pushIf(
          webGrowth.title,
          webGrowth.text,
          webGrowth.url ? [webGrowth.url] : undefined
        );
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
            for (const u of s.linkUrls)
              writeUrlLine(yRef === "right" ? rightX : leftX, yRef, u);
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
      if (data.runId) {
        router.push(`/result/${data.runId}`);
        return;
      }
      // Fallback: if runId missing, keep inline brief (legacy)
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
    <div className="min-h-screen w-full fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-slate-50/30 dark:from-slate-900/50 dark:via-transparent dark:to-slate-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/5 dark:to-blue-600/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-slate-300/8 to-blue-400/8 dark:from-slate-700/5 dark:to-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 py-16 sm:px-8 md:px-12 sm:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/40 mb-6">
              <span
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: "#22c55e" }}
              />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Powered by Gemini AI
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-slate-900 dark:text-white">
                Startup Brief Generator
              </span>
            </h1>

            <p className="text-xl sm:text-2xl max-w-3xl mx-auto text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Transform pitch decks into investor-ready briefs with AI-powered
              analysis
            </p>
          </div>

          {/* Main Upload Card */}
          <div className="max-w-3xl mx-auto">
            <div className="panel glass relative overflow-hidden shadow-2xl">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-blue-500/15 to-blue-600/10 rounded-full blur-3xl" />

              <div className="relative space-y-8">
                {/* Upload Section */}
                <div>
                  <label className="block text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
                    Upload Documents
                  </label>
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
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                          {dragActive
                            ? "Drop files here"
                            : "Drag & drop or click to browse"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          PDF or DOCX • up to 25MB each
                        </p>
                      </div>
                      {totalFiles > 0 && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/40">
                          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {totalFiles} file{totalFiles > 1 ? "s" : ""}{" "}
                            selected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {totalFiles > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-auto">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                        >
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
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <span
                            className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          <button
                            onClick={() => removeFileAt(idx)}
                            className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                            aria-label={`Remove ${file.name}`}
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Company Name Section */}
                <div>
                  <label className="block text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="w-full px-4 py-3.5 text-base font-medium rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all company-input"
                    aria-required
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={onAnalyze}
                  disabled={
                    analyzing ||
                    !files ||
                    files.length === 0 ||
                    !companyName.trim()
                  }
                  className="w-full btn-primary text-base py-4 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Analysis...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {session ? "Generate Brief" : "Sign In to Generate"}
                    </span>
                  )}
                </button>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-5 py-16 sm:px-8 md:px-12 bg-white dark:bg-slate-950">
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow shadow-blue-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
              Private & Secure
            </h3>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              Files are processed transiently with enterprise-grade security.
              Your data is never stored.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow shadow-slate-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
              Investor-Ready
            </h3>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              Get comprehensive analysis with ICP, GTM, TAM, risks, team
              assessment and more.
            </p>
          </div>

          <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow shadow-emerald-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
              Export & Share
            </h3>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              Download polished PDF reports or share results with your team
              instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Built for rapid diligence workflows •{" "}
            <span className="font-medium">© Token Tribe</span>
          </p>
        </div>
      </footer>

      {/* Loading Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
              <span className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-center text-slate-800 dark:text-slate-100 mb-2">
              Analyzing Documents
            </h3>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400">
              This may take a minute...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
