import { pool } from "./db";
import { embedTextBatch } from "./vertex";

export async function retrieve(query: string, k = 8) {
  const [qvec] = await embedTextBatch([query]);
  const { rows } = await pool.query(
    `SELECT id, doc_id, source, content,
            1 - (embedding <=> $1::vector) AS score
       FROM chunks
   ORDER BY embedding <-> $1::vector
      LIMIT $2`,
    [qvec, k]
  );
  return rows as {
    id: number;
    doc_id: string;
    source: string;
    content: string;
    score: number;
  }[];
}
