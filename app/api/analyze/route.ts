import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/vertex";
import { retrieve } from "@/lib/retrieve";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { companyName, docId } = await req.json();
  const ctx = await retrieve(
    `${companyName} product, traction, team, market, pricing, competition`,
    10
  );
  const prompt = `You are a VC analyst. Create a JSON brief with fields: one_liner, problem, solution, icp_gtm, traction_bullets[], business_model, tam, team, moat_bullets[], risks_bullets[], why_now, founder_questions[]. Use ONLY the chunks. If a claim has no evidence, mark it as NO-EVIDENCE and move it to 'hypotheses'. For each sentence include refs[] of chunk indexes.\n\nChunks:\n${ctx
    .map((c, i) => `[${i}] ${c.content}`)
    .join("\n\n")}`;

  const result: any = await gemini.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  });
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
  const brief = extractJson(text) ?? { raw: text };

  const id = docId || crypto.randomUUID();
  await pool.query(
    "INSERT INTO briefs(id, company_name, brief_json) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET brief_json = EXCLUDED.brief_json",
    [id, companyName, brief]
  );
  return NextResponse.json({ id, brief, citations: ctx });
}
