import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/vertex";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchAsBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  return { buffer: Buffer.from(arr), contentType };
}

async function parsePdf(buffer: Buffer): Promise<string> {
  let firstErr: any = null;
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js"))
      .default as any;
    const res = await pdfParse(buffer);
    if (res?.text) return String(res.text);
  } catch (e: any) {
    firstErr = e;
  }
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js"))
      .default as any;
    const res = await pdfParse({ data: buffer });
    if (res?.text) return String(res.text);
  } catch (e) {
    if (!firstErr) firstErr = e;
  }
  console.warn(
    "pdf parse failed (all strategies)",
    firstErr?.message || firstErr
  );
  return "";
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")) as any;
  const res = await mammoth.extractRawText({ buffer });
  return String(res.value || "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { urls = [], companyName = "" } = body as {
    urls?: string[];
    companyName?: string;
  };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "No file URLs provided" },
      { status: 400 }
    );
  }

  const texts: string[] = [];
  const names: string[] = [];
  for (const url of urls) {
    const { buffer, contentType } = await fetchAsBuffer(url);
    const lower = url.toLowerCase();
    let text = "";
    if (contentType.includes("pdf") || lower.endsWith(".pdf")) {
      text = await parsePdf(buffer);
    } else if (contentType.includes("word") || lower.endsWith(".docx")) {
      text = await parseDocx(buffer);
    } else {
      // best effort: try both, default to empty
      try {
        text = await parsePdf(buffer);
      } catch {}
      if (!text)
        try {
          text = await parseDocx(buffer);
        } catch {}
    }
    if (text && text.trim()) {
      texts.push(text);
      names.push(new URL(url).pathname.split("/").pop() || "file");
    }
  }

  if (texts.length === 0) {
    return NextResponse.json(
      { error: "No text content parsed" },
      { status: 400 }
    );
  }

  const chunks = texts
    .map((t, idx) => `From ${names[idx]}:\n\n${t}`)
    .join("\n\n---\n\n");

  const prompt = `You are a VC analyst. Produce ONLY valid JSON (no markdown fences, no commentary) matching EXACTLY this schema used by the UI:
{
  "one_liner": {"text":"...","refs":["file.pdf"]},
  "problem": {"text":"...","refs":[...]},
  "solution": {"text":"...","refs":[...]},
  "icp_gtm": {
    "icp": {"text":"...","refs":[...]},
    "gtm": {"text":"...","refs":[...]}
  },
  "traction_bullets": [ {"text":"...","refs":[...]}, ... ],
  "business_model": {"text":"...","refs":[...]},
  "tam": {
    "global_market": {"text":"...","refs":[...]},
    "target_segment": {"text":"...","refs":[...]},
    "growth": {"text":"...","refs":[...]}
  },
  "team": {"text":"...","refs":[...]},
  "moat_bullets": [ {"text":"...","refs":[...]}, ... ],
  "risks_bullets": [ {"text":"...","refs":[...]}, ... ],
  "why_now": {"text":"...","refs":[...]},
  "hypotheses": [ {"claim":"...","status":"NO-EVIDENCE|SUPPORTED","refs":[...]}, ... ],
  "founder_questions": [ {"question":"...","rationale":"..."}, ... ]
}

Rules:
- Use ONLY information in the provided documents.
- If a factual/metric/market size/traction/claim lacks direct evidence in the docs, DO NOT include it in normal sections; instead add an entry to hypotheses with status "NO-EVIDENCE: <brief reason>". Supported claims may use status "SUPPORTED" (optional) or omit status for normal bullets.
- Each narrative object MUST have a "text" string and a "refs" array listing source doc names that support that statement. If multiple sentences share refs you can repeat refs.
- Team: If absolutely no team/founder info exists in the documents, set team.text to "UNSPECIFIED: No team information in provided documents." (leave refs as []). Do NOT fabricate or guess.
- Bullet arrays (traction_bullets, moat_bullets, risks_bullets) = objects with text + refs.
- Keep language concise, analyst tone.
- Do NOT invent numbers; if TAM components not present, still include keys with empty text "" and empty refs [].
- Always include every top-level key even if text is empty.
- Output must be pure JSON with no leading or trailing characters.

Company: ${companyName || "Unknown"}

Documents:\n${chunks}`;

  const result: any = await gemini.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  } as any);

  const text =
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const extractJson = (s: string): any | null => {
    const fenced =
      s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : s;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = candidate.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch {}
    }
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };
  const parsed = extractJson(text) ?? { raw: text };

  return NextResponse.json({ brief: parsed });
}
