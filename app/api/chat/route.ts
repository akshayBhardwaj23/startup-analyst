import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gemini, vertex } from "@/lib/vertex";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const TEXT_CHUNK_SIZE = 512;

function splitToChunks(s: string) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += TEXT_CHUNK_SIZE) out.push(s.slice(i, i + TEXT_CHUNK_SIZE));
  return out;
}

function simpleSim(a: string, b: string) {
  // very small heuristic: Jaccard on words
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const inter = [...wa].filter((x) => wb.has(x)).length;
  const uni = new Set([...wa, ...wb]).size;
  if (uni === 0) return 0;
  return inter / uni;
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { companyName, question } = body as { companyName?: string; question?: string };
  if (!companyName || !question) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // 1) Load latest brief for company and convert to candidate chunks
  const userId = session.user.id as string;
  const company = await prisma.company.findUnique({ where: { userId_name: { userId, name: companyName } } }).catch(() => null);
  let brief: any = null;
  if (company) {
    const run = await prisma.analysisRun.findFirst({ where: { userId, companyId: company.id }, orderBy: { createdAt: "desc" } });
    brief = run?.brief ?? null;
  }

  let localContext = "";
  if (brief) {
    // flatten textual content from brief
    const acc: string[] = [];
    const gather = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach(gather);
      else if (typeof v === "object") {
        if (typeof v.text === "string") acc.push(v.text);
        else Object.values(v).forEach(gather);
      } else acc.push(String(v));
    };
    gather(brief);
    localContext = acc.join("\n\n");
  }

  // 2) Compute similarity against chunks
  const chunks = splitToChunks(localContext || "");
  let bestChunk = "";
  let bestScore = 0;
  for (const c of chunks) {
    const s = simpleSim(c, question);
    if (s > bestScore) {
      bestScore = s;
      bestChunk = c;
    }
  }

  // Threshold for local context
  const THRESH = 0.45;

  let combinedContext = "";
  let usedLocal = false;
  if (bestScore >= THRESH && bestChunk) {
    combinedContext += `LOCAL_CONTEXT:\n${bestChunk}\n\n`;
    usedLocal = true;
  }

  // If local inadequate, invoke Vertex web-search (reuse web-search prompt) and set preface
  let webContext = "";
  if (!usedLocal) {
    try {
      // Reuse same web-search prompt logic
      const buildPrompt = (name: string) => `You are an AI analyst helping investors research startups.

Perform a concise web search and summarize ONLY two areas:
1. Latest online or news updates about the company (product launches, funding, partnerships, major announcements).
2. Market growth and size information for the company’s industry or sector.

Rules:
- Use the most recent public sources available.
- Return only verified facts and cite 2–3 key URLs.
- Exclude historical background, team bios, or general mission statements.
- Output JSON only, with this structure:
- If no history exist then strictly return empty json and nothing else

{
  "company_name": "<insert company>",
  "latest_online_updates": [
    {"summary": "...", "source": "<URL>"},
    {"summary": "...", "source": "<URL>"}
  ],
  "market_growth": {
    "summary": "...",
    "source": "<URL>"
  }
}

Company to research: ${name}`;

      const model = process.env.VERTEX_FLASH_LITE_MODEL || "gemini-2.0-flash-lite";
      const g = vertex.getGenerativeModel({ model });
      const webPrompt = buildPrompt(companyName);
      const result: any = await (g as any).generateContent({
        contents: [{ role: "user", parts: [{ text: webPrompt }] }],
        generationConfig: { temperature: 0 },
      } as any);
      let text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Redact URLs per requirement
      text = text.replace(/https?:[^\s\"]+/g, "");
      webContext = text;
    } catch (e) {
      webContext = "";
    }
  }

  if (webContext) combinedContext += `WEB_CONTEXT:\n${webContext}\n\n`;

  // Compose final prompt: prefer local facts, cite sources
  const finalPrompt = `You are an AI analyst answering investor questions about ${companyName}. Use local document context first (labeled LOCAL_CONTEXT). If local context is absent or insufficient, prefer WEB_CONTEXT for the answer. Do not include URLs in the answer.\n\nQuestion: ${question}\n\n${combinedContext}\n\nAnswer concisely without URLs.`;

  try {
    const model = process.env.VERTEX_CHAT_MODEL || "gemini-2.5-pro";
    const gem = vertex.getGenerativeModel({ model });
    const resp: any = await (gem as any).generateContent({
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      generationConfig: { temperature: 0.1 },
    } as any);
  let ans = resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // Ensure no URLs leaked in answer
  ans = ans.replace(/https?:[^\s\"]+/g, "");
  return NextResponse.json({ answer: ans, usedLocal, score: bestScore });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
