import { NextRequest, NextResponse } from "next/server";
import { vertex } from "@/lib/vertex";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// This chatbot uses ONLY online sources (no local document context)

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { companyName, question } = body as { companyName?: string; question?: string };
  if (!companyName || !question) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Stream the final answer using ONLY online sources
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        // 1) Fetch web context (non-stream) using flash-lite
        let webContext = "";
        try {
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
        } catch {}

        const combinedContext = webContext ? `WEB_CONTEXT:\n${webContext}\n\n` : "";
        const finalPrompt = `You are an AI analyst answering investor questions about ${companyName}.
Use ONLY WEB_CONTEXT (online sources). Do not rely on any uploaded documents or prior local context. Do not include URLs in the answer.

Question: ${question}

${combinedContext}

Answer concisely without URLs.`;

        // 2) Stream final answer from chat model
        const chatModel = process.env.VERTEX_CHAT_MODEL || "gemini-2.5-pro";
        const gem = vertex.getGenerativeModel({ model: chatModel });
        const resp: any = await (gem as any).generateContentStream({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: { temperature: 0.1 },
        } as any);

        for await (const item of (resp as any).stream as AsyncIterable<any>) {
          const chunk =
            item?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") ||
            item?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "";
          if (!chunk) continue;
          const cleaned = chunk.replace(/https?:[^\s\"]+/g, "");
          controller.enqueue(encoder.encode(cleaned));
        }
      } catch (e: any) {
        const msg = `Error: ${String(e?.message || e)}`;
        controller.enqueue(encoder.encode(msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
