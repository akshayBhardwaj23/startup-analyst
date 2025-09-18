import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { embedTextBatch } from "@/lib/vertex";

export async function POST(req: NextRequest) {
  const { docId, chunks } = await req.json(); // chunks: [{content, source}]
  const vectors = await embedTextBatch(chunks.map((c: any) => c.content));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        "INSERT INTO chunks(doc_id, source, content, embedding) VALUES ($1,$2,$3,$4)",
        [docId, chunks[i].source, chunks[i].content, vectors[i]]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true });
}
