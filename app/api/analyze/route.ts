import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/vertex";
import { chunkText } from "@/lib/chunk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user ID
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

  // Check analysis limit (25 per user)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { analysisCount: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ANALYSIS_LIMIT = 25;
  if (user.analysisCount >= ANALYSIS_LIMIT) {
    return NextResponse.json(
      {
        error: `Analysis limit reached. You have used all ${ANALYSIS_LIMIT} analyses.`,
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { urls = [], companyName = "" } = body as {
    urls?: string[];
    companyName?: string;
  };

  if (!companyName || !companyName.trim()) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "No file URLs provided" },
      { status: 400 }
    );
  }

  // Fetch and parse in parallel with a per-file timeout
  const controller = new AbortController();
  const perFileTimeoutMs = 60_000;
  const tasks = urls.map(async (url) => {
    const abort = setTimeout(() => controller.abort(), perFileTimeoutMs);
    try {
      const { buffer, contentType } = await fetchAsBuffer(url);
      const lower = url.toLowerCase();
      let text = "";
      if (contentType.includes("pdf") || lower.endsWith(".pdf")) {
        text = await parsePdf(buffer);
      } else if (contentType.includes("word") || lower.endsWith(".docx")) {
        text = await parseDocx(buffer);
      } else {
        try {
          text = await parsePdf(buffer);
        } catch {}
        if (!text)
          try {
            text = await parseDocx(buffer);
          } catch {}
      }
      const name = new URL(url).pathname.split("/").pop() || "file";
      return { text, name };
    } finally {
      clearTimeout(abort);
    }
  });
  const results = await Promise.allSettled(tasks);
  const texts: string[] = [];
  const names: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.text && r.value.text.trim()) {
      texts.push(r.value.text);
      names.push(r.value.name);
    }
  }

  if (texts.length === 0) {
    return NextResponse.json(
      { error: "No text content parsed" },
      { status: 400 }
    );
  }

  // Cap total characters to protect model latency (~150k chars)
  const MAX_TOTAL = 150_000;
  let total = 0;
  const bounded: string[] = [];
  const boundedNames: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (total + t.length > MAX_TOTAL) break;
    bounded.push(t);
    boundedNames.push(names[i]);
    total += t.length;
  }
  const chunks = bounded
    .map((t, idx) => `From ${boundedNames[idx]}:\n\n${t}`)
    .join("\n\n---\n\n");

  const prompt = `You are a VC analyst. Produce ONLY valid JSON (no markdown fences, no commentary) matching EXACTLY this schema used by the UI:
{
  "industry": "FinTech|HealthTech|EdTech|PropTech|CleanTech|AgTech|FoodTech|RetailTech|Enterprise SaaS|Consumer|Marketplace|AI/ML|Cybersecurity|DeepTech|Other",
  "stage": "Idea|Pre-seed|Seed|Series A|Series B|Series C+|Growth|Other",
  "one_liner": {"text":"...","refs":["file.pdf"]},
  "problem": {"text":"...","refs":[...]},
  "solution": {"text":"...","refs":[...]},
  "icp_gtm": {
    "icp": {"text":"...","refs":[...]},
    "gtm": {"text":"...","refs":[...]}
  },
  "traction_bullets": [ {"text":"...","refs":[...]}, ... ],
  "business_model": {"text":"...","refs":[...]},
  "business_model_canvas": {
    "key_partners": {"text":"...","refs":[...]},
    "key_activities": {"text":"...","refs":[...]},
    "key_resources": {"text":"...","refs":[...]},
    "value_propositions": {"text":"...","refs":[...]},
    "customer_relationships": {"text":"...","refs":[...]},
    "channels": {"text":"...","refs":[...]},
    "customer_segments": {"text":"...","refs":[...]},
    "cost_structure": {"text":"...","refs":[...]},
    "revenue_streams": {"text":"...","refs":[...]}
  },
  "tam": {
    "global_market": {"text":"...","refs":[...]},
    "target_segment": {"text":"...","refs":[...]},
    "growth": {"text":"...","refs":[...]}
  },
  "team": {"text":"...","refs":[...]},
  "founders": [
    {
      "name": "...",
      "role": "...",
      "background": "...",
      "linkedin": "...",
      "email": "...",
      "refs": [...]
    }
  ],
  "contact_info": {
    "email": "...",
    "phone": "...",
    "website": "...",
    "location": "...",
    "refs": [...]
  },
  "moat_bullets": [ {"text":"...","refs":[...]}, ... ],
  "risks_bullets": [ {"text":"...","severity":"LOW|MEDIUM|HIGH","refs":[...]}, ... ],
  "ansoff_matrix": {
    "quadrant": "MARKET_PENETRATION|MARKET_DEVELOPMENT|PRODUCT_DEVELOPMENT|DIVERSIFICATION",
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
- **Industry**: Categorize the startup into one of the provided industries based on their product/service. Examples: FinTech (financial services), HealthTech (healthcare), EdTech (education), PropTech (real estate), CleanTech (sustainability), Enterprise SaaS (B2B software), AI/ML (artificial intelligence focus), etc. Use "Other" if none fit.
- **Stage**: Determine the funding/development stage based on traction, team size, revenue mentioned in docs. "Idea" (concept only), "Pre-seed" (early prototype), "Seed" (MVP/early users), "Series A" (product-market fit), "Series B+" (scaling), "Growth" (mature). Use "Other" if unclear.
- Use ONLY information in the provided documents.
- If a factual/metric/market size/traction/claim lacks direct evidence in the docs, DO NOT include it in normal sections; instead add an entry to hypotheses with status "NO-EVIDENCE: <brief reason>". Supported claims may use status "SUPPORTED" (optional) or omit status for normal bullets.
- Each narrative object MUST have a "text" string and a "refs" array listing source doc names that support that statement. If multiple sentences share refs you can repeat refs.
- Team: If absolutely no team/founder info exists in the documents, set team.text to "UNSPECIFIED: No team information in provided documents." (leave refs as []). Do NOT fabricate or guess.
- **Founders**: Extract individual founder details from documents - name, role/title, background/experience, LinkedIn URL, and email if available. If no founder info exists, use empty array []. Do NOT fabricate.
- **Contact Info**: Extract company contact details - general email, phone, website URL, and location/address from documents. Leave fields empty ("") if not found. Do NOT fabricate.
- Bullet arrays (traction_bullets, moat_bullets, risks_bullets) = objects with text + refs.
- **Risks severity**: Each risk must include a "severity" field: "HIGH" (critical/existential risks), "MEDIUM" (significant concerns), "LOW" (minor/manageable issues).
- Ansoff Matrix Analysis:
  - Determine which quadrant the product/strategy fits: MARKET_PENETRATION (existing product, existing market), MARKET_DEVELOPMENT (existing product, new market), PRODUCT_DEVELOPMENT (new product, existing market), or DIVERSIFICATION (new product, new market).
  - Provide rationale explaining why this quadrant applies based on evidence in documents.
- Business Model Canvas:
  - key_partners: Who are the key partners and suppliers? Strategic alliances?
  - key_activities: What key activities does the value proposition require? Distribution channels? Customer relationships?
  - key_resources: What key resources does the value proposition require? Physical, intellectual, human, financial?
  - value_propositions: What value do we deliver to the customer? Which customer needs are we satisfying?
  - customer_relationships: What type of relationship does each customer segment expect? How are they established and maintained?
  - channels: Through which channels do customers want to be reached? How are we reaching them now?
  - customer_segments: For whom are we creating value? Who are our most important customers?
  - cost_structure: What are the most important costs? Which key resources/activities are most expensive?
  - revenue_streams: For what value are customers willing to pay? How are they currently paying? How would they prefer to pay?
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

  // Increment user's analysis count
  await prisma.user.update({
    where: { id: userId },
    data: { analysisCount: { increment: 1 } },
  });

  // Persist company and analysis run
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
      fileUrls: urls as any,
      fileNames: names as any,
      industry: (parsed as any)?.industry || null,
      stage: (parsed as any)?.stage || null,
    },
  });

  // Fetch previous runs for same company (excluding current)
  const previous = await prisma.analysisRun.findMany({
    where: { userId, companyId: company.id, id: { not: run.id } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, createdAt: true, brief: true },
  });

  return NextResponse.json({
    brief: parsed,
    previousRuns: previous,
    runId: run.id,
  });
}
