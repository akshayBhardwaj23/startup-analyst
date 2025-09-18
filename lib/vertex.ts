import { promises as fs } from "node:fs";
import path from "node:path";
import { VertexAI } from "@google-cloud/vertexai";

if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  process.env.GOOGLE_CREDENTIALS_JSON
) {
  const p = path.join("/tmp", "sa.json");
  await fs.writeFile(p, process.env.GOOGLE_CREDENTIALS_JSON, "utf8");
  process.env.GOOGLE_APPLICATION_CREDENTIALS = p;
}

export const vertex = new VertexAI({
  project: process.env.GCP_PROJECT_ID!,
  location: process.env.GCP_LOCATION || "us-central1",
});

export const gemini = vertex.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function embedTextBatch(texts: string[]) {
  const embedModel: any = vertex.getGenerativeModel({
    model: "text-embedding-004",
  });
  const results = await Promise.all(
    texts.map(async (t) => {
      const res: any = await embedModel.embedContent({
        content: { parts: [{ text: t }] },
      });
      const embedding = (res.embeddings?.[0] || res.embedding)?.values || [];
      return embedding as number[];
    })
  );
  return results;
}
