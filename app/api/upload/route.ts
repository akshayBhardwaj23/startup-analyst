import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { chunkText } from "@/lib/chunk";
import { embedTextBatch } from "@/lib/vertex";

export const runtime = "nodejs";
export const maxDuration = 60;

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as any;
  const res = await pdfParse(buffer);
  return String(res.text || "");
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
  const providedDocId = form.get("docId") as string | null;
  const docId =
    providedDocId && providedDocId.length > 0
      ? providedDocId
      : crypto.randomUUID();

  // Collect files from possible keys: "file" and "files"
  const files: File[] = [];
  const single = form.get("file");
  if (single && single instanceof File) files.push(single);
  const many = form.getAll("files");
  for (const f of many) if (f instanceof File) files.push(f);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Parse to text and chunk
  const allChunks: { content: string; source: string }[] = [];
  for (const f of files) {
    const { text, name } = await fileToText(f);
    const chunks = chunkText(text, { maxTokens: 1200, overlap: 150 });
    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({ content: chunks[i], source: `${name}#${i + 1}` });
    }
  }

  if (allChunks.length === 0) {
    return NextResponse.json(
      { error: "No text content found in files" },
      { status: 400 }
    );
  }

  // Embed and store
  const vectors = await embedTextBatch(allChunks.map((c) => c.content));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < allChunks.length; i++) {
      await client.query(
        "INSERT INTO chunks(doc_id, source, content, embedding) VALUES ($1,$2,$3,$4)",
        [docId, allChunks[i].source, allChunks[i].content, vectors[i]]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return NextResponse.json({
    ok: true,
    docId,
    numFiles: files.length,
    numChunks: allChunks.length,
  });
}
