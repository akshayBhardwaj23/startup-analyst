import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/vertex";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

async function parsePdf(buffer: Buffer): Promise<string> {
  // Strategy: try normal parse -> then try passing object with data buffer
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

async function fileToText(file: File): Promise<{ text: string; name: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name || "upload";
  const mime = file.type || "";
  const lower = name.toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    return { text: await parsePdf(buffer), name };
  }
  if (mime.includes("word") || lower.endsWith(".docx")) {
    return { text: await parseDocx(buffer), name };
  }
  throw new Error(`Unsupported file type for ${name}`);
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const companyName = (form.get("companyName") as string) || "";
  if (!companyName || !companyName.trim()) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
    );
  }

  const files: File[] = [];
  const single = form.get("file");
  if (single && single instanceof File) files.push(single);
  const many = form.getAll("files");
  for (const f of many) if (f instanceof File) files.push(f);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const texts: string[] = [];
  const names: string[] = [];
  for (const f of files) {
    const { text, name } = await fileToText(f);
    if (text && text.trim().length) {
      texts.push(text);
      names.push(name);
    }
  }
  if (texts.length === 0) {
    return NextResponse.json(
      { error: "No text content found in files" },
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
  "ansoff_matrix": {
    "quadrant": "MARKET_PENETRATION|MARKET_DEVELOPMENT|PRODUCT_DEVELOPMENT|DIVERSIFICATION",
    "rationale": {"text":"...","refs":[...]}
  },
  "rogers_bell_curve": {
    "category": "INNOVATORS|EARLY_ADOPTERS|EARLY_MAJORITY|LATE_MAJORITY|LAGGARDS",
    "rationale": {"text":"...","refs":[...]}
  },
  "why_now": {"text":"...","refs":[...]},
  "hypotheses": [ {"claim":"...","status":"NO-EVIDENCE|SUPPORTED","refs":[...]}, ... ],
  "founder_questions": [ {"question":"...","rationale":"..."}, ... ],
  "ratings": {
    "overall":         {"score":0,"refs":[...]},
    "team_strength":   {"score":0,"refs":[...]},
    "market_quality":  {"score":0,"refs":[...]},
    "product_maturity":{"score":0,"refs":[...]},
    "moat":            {"score":0,"refs":[...]},
    "traction":        {"score":0,"refs":[...]},
    "risk_profile":    {"score":0,"refs":[...]},
  }
}

Rules:
- Use ONLY information in the provided documents.
- If a factual/metric/market size/traction/claim lacks direct evidence in the docs, DO NOT include it in normal sections; instead add an entry to hypotheses with status "NO-EVIDENCE: <brief reason>". Supported claims may use status "SUPPORTED" (optional) or omit status for normal bullets.
- Each narrative object MUST have a "text" string and a "refs" array listing source doc names that support that statement. If multiple sentences share refs you can repeat refs.
- Team: If absolutely no team/founder info exists in the documents, set team.text to "UNSPECIFIED: No team information in provided documents." (leave refs as []). Do NOT fabricate or guess.
- Bullet arrays (traction_bullets, moat_bullets, risks_bullets) = objects with text + refs.
- Ansoff Matrix Analysis:
  - Determine which quadrant the product/strategy fits: MARKET_PENETRATION (existing product, existing market), MARKET_DEVELOPMENT (existing product, new market), PRODUCT_DEVELOPMENT (new product, existing market), or DIVERSIFICATION (new product, new market).
  - Provide rationale explaining why this quadrant applies based on evidence in documents.
- Rogers Bell Curve (Diffusion of Innovations):
  - Determine which adopter category the startup is currently targeting: INNOVATORS (2.5% - technology enthusiasts, risk-takers), EARLY_ADOPTERS (13.5% - visionaries, opinion leaders), EARLY_MAJORITY (34% - pragmatists, deliberate), LATE_MAJORITY (34% - skeptics, risk-averse), or LAGGARDS (16% - traditionalists, last to adopt).
  - Provide rationale explaining which customer segment they're targeting based on product complexity, pricing, marketing approach, and customer characteristics mentioned in documents.
- Keep language concise, analyst tone.
- Do NOT invent numbers; if TAM components not present, still include keys with empty text "" and empty refs [].
- Ratings:
  - Provide a numeric "score" from 0-100 for each rating key (0=very weak, 50=average/unclear, 100=very strong).
  - Always give the "overall" ratings based on whatever information is given.
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
  const brief: any = undefined as any;
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

  // Persist company + run
  let userId = (session as any).user?.id as string | undefined;
  if (!userId && (session as any).user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email as string },
    });
    userId = user?.id;
  }
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 500 });
  }
  const name = companyName.trim();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const company = await prisma.company.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name, slug },
    update: { name, slug },
  });
  const run = await prisma.analysisRun.create({
    data: {
      userId,
      companyId: company.id,
      companyName: name,
      brief: parsed as any,
      fileNames: names as any,
    },
  });

  const previous = await prisma.analysisRun.findMany({
    where: { userId, companyId: company.id, id: { not: run.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, createdAt: true, brief: true },
  });

  return NextResponse.json({ brief: parsed, previousRuns: previous });
}
