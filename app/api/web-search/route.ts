import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vertex } from "@/lib/vertex";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildPrompt(companyName: string): string {
  return `You are an AI analyst helping investors research startups.

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

Company to research: ${companyName}`;
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { companyName } = body as { companyName?: string };
  if (!companyName || !companyName.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  // Use Vertex AI (same setup as the rest of the app). Prefer a Flash-Lite variant for speed/cost.
  // Allow override via env in case region/model availability differs.
  const model = process.env.VERTEX_FLASH_LITE_MODEL || "gemini-2.0-flash-lite";
  const gemini = vertex.getGenerativeModel({ model });

  try {
    const prompt = buildPrompt(companyName.trim());
    const result: any = await (gemini as any).generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    });
    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const extractJson = (s: string): any | null => {
      if (!s) return null;
      const fenced = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/i);
      const candidate = fenced ? fenced[1] : s;
      const start = candidate.indexOf("{");
      const end = candidate.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const slice = candidate.slice(start, end + 1);
        try { return JSON.parse(slice); } catch {}
      }
      try { return JSON.parse(candidate); } catch { return null; }
    };

    const parsed = extractJson(text) ?? {};
    if (!parsed || (typeof parsed === "object" && Object.keys(parsed).length === 0)) {
      return NextResponse.json({ web: {} }, { status: 200 });
    }
    return NextResponse.json({ web: parsed }, { status: 200 });
  } catch (e: any) {
    // Fallback: return empty to signal no online data
    return NextResponse.json({ web: {} }, { status: 200 });
  }
}
