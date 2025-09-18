import { NextRequest, NextResponse } from "next/server";
import { gemini } from "@/lib/vertex";

export const runtime = "nodejs";
export const maxDuration = 60;

async function parsePdf(buffer: Buffer): Promise<string> {
  // Strategy: try normal parse -> then try passing object with data buffer
  let firstErr: any = null;
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as any;
    const res = await pdfParse(buffer);
    if (res?.text) return String(res.text);
  } catch (e: any) {
    firstErr = e;
  }
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as any;
    const res = await pdfParse({ data: buffer });
    if (res?.text) return String(res.text);
  } catch (e) {
    if (!firstErr) firstErr = e;
  }
  console.warn("pdf parse failed (all strategies)", firstErr?.message || firstErr);
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
  const form = await req.formData();
  const companyName = (form.get("companyName") as string) || "";

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

  const prompt = `You are a VC analyst. Create a JSON brief with fields: one_liner, problem, solution, icp_gtm, traction_bullets[], business_model, tam, team, moat_bullets[], risks_bullets[], why_now, founder_questions[]. Use ONLY the provided documents. If a claim has no evidence, mark it as NO-EVIDENCE and move it to 'hypotheses'. For each sentence include refs[] indicating the source doc name.
Company: ${companyName}

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

  return NextResponse.json({ brief: parsed });
}
