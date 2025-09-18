export function chunkText(
  text: string,
  options?: { maxTokens?: number; overlap?: number }
) {
  const maxTokens = options?.maxTokens ?? 800;
  const overlap = options?.overlap ?? 120;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  const pushWithWindow = (fragment: string) => {
    if (!fragment.trim()) return;
    if (buffer.length === 0) {
      buffer = fragment;
      return;
    }
    if ((buffer + "\n\n" + fragment).length <= maxTokens) {
      buffer = buffer + "\n\n" + fragment;
    } else {
      chunks.push(buffer);
      const overlapSnippet = buffer.slice(-overlap);
      buffer = overlapSnippet + (overlapSnippet ? "\n\n" : "") + fragment;
      if (buffer.length > maxTokens) {
        const sentences = fragment.split(/(?<=[.!?])\s+/);
        let local = overlapSnippet;
        for (const s of sentences) {
          const candidate = (local ? local + " " : "") + s;
          if (candidate.length > maxTokens && local) {
            chunks.push(local);
            local = s;
          } else {
            local = candidate;
          }
        }
        buffer = local;
      }
    }
  };

  for (const p of paragraphs) {
    if (p.length <= maxTokens) {
      pushWithWindow(p);
      continue;
    }
    const blocks = p.split(/\n(?=[#>*\-\d]+\s|\s*\n)/);
    for (const b of blocks) {
      if (b.length <= maxTokens) {
        pushWithWindow(b);
        continue;
      }
      const sentences = b.split(/(?<=[.!?])\s+/);
      let current = "";
      for (const s of sentences) {
        const candidate = current ? current + " " + s : s;
        if (candidate.length > maxTokens) {
          if (current) chunks.push(current);
          const overlapSnippet = current.slice(-overlap);
          current = overlapSnippet ? overlapSnippet + " " + s : s;
          if (current.length > maxTokens) {
            for (let i = 0; i < s.length; i += maxTokens) {
              chunks.push(s.slice(i, i + maxTokens));
            }
            current = "";
          }
        } else {
          current = candidate;
        }
      }
      if (current) chunks.push(current);
      buffer = "";
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}
