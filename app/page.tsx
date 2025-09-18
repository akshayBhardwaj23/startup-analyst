"use client";
import { useState } from "react";

type Brief = Record<string, any>;

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatBriefToText = (b: any) => {
    if (!b) return "";
    const lines: string[] = [];
    const add = (label: string, value: any) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        lines.push(`${label}:`);
        for (const item of value) {
          const text =
            typeof item === "object" ? JSON.stringify(item) : String(item);
          lines.push(`- ${text}`);
        }
      } else if (typeof value === "object") {
        lines.push(`${label}:`);
        lines.push(JSON.stringify(value, null, 2));
      } else {
        lines.push(`${label}: ${String(value)}`);
      }
      lines.push("");
    };

    add("One-liner", b.one_liner);
    add("Problem", b.problem);
    add("Solution", b.solution);
    add("ICP & GTM", b.icp_gtm);
    add("Traction", b.traction_bullets);
    add("Business model", b.business_model);
    add("TAM", b.tam);
    add("Team", b.team);
    add("Moat", b.moat_bullets);
    add("Risks", b.risks_bullets);
    add("Why now", b.why_now);
    add("Hypotheses", b.hypotheses);
    add("Founder questions", b.founder_questions);

    return lines.join("\n").trim();
  };

  const onAnalyze = async () => {
    try {
      setError(null);
      setAnalyzing(true);
      setBrief(null);
      if (!files || files.length === 0) throw new Error("Upload files first");

      const form = new FormData();
      for (let i = 0; i < files.length; i++) form.append("files", files[i]);
      form.append("companyName", companyName);

      const res = await fetch("/api/analyze-direct", {
        method: "POST",
        body: form,
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = contentType.includes("application/json")
          ? JSON.stringify(await res.json())
          : await res.text();
        throw new Error(errText || `${res.status} ${res.statusText}`);
      }
      const data = contentType.includes("application/json")
        ? await res.json()
        : { brief: { raw: await res.text() } };
      setBrief(data.brief);
    } catch (e: any) {
      setError(e.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (analyzing) return;
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) setFiles(dropped);
  };

  const copyBrief = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(
        brief.raw ? String(brief.raw) : formatBriefToText(brief)
      );
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600">
            VC Analyst
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Upload PDF/DOCX and generate a concise, evidence-grounded VC brief.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-5 shadow-sm">
          <div
            className={
              "rounded-xl border-2 border-dashed p-6 transition " +
              (isDragOver
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-zinc-300 dark:border-zinc-700")
            }
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600/10 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-indigo-600"
                >
                  <path
                    d="M12 16V4m0 0l-4 4m4-4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Upload files (PDF/DOCX)</p>
                <p className="text-xs text-zinc-500">
                  Drag & drop or choose from your device
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFiles(e.target.files)}
                disabled={analyzing}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 dark:file:border-zinc-700 file:bg-white dark:file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-50 dark:hover:file:bg-zinc-700/50"
              />
            </div>

            {files && files.length > 0 && (
              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                Selected: {files.length} file{files.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3">
            <label className="text-sm font-medium">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corp"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={onAnalyze}
              disabled={analyzing || !files || files.length === 0}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {analyzing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M13 7h6m0 0v6m0-6l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Generate VC Brief
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-300/70 bg-red-50 text-red-800 p-3 text-sm">
              {error}
            </div>
          )}

          {brief && (
            <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Brief</h2>
                <button
                  onClick={copyBrief}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 9h9m-9 4h9M7 7h11a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7 7V6a2 2 0 012-2h7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Copy
                </button>
              </div>
              {brief.raw ? (
                <pre className="whitespace-pre-wrap text-sm">{brief.raw}</pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm">
                  {formatBriefToText(brief)}
                </pre>
              )}
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-500">
          Built with Next.js • Vertex AI
        </footer>
      </div>

      {analyzing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <div className="text-sm">
              Analyzing files… this can take up to a minute
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
