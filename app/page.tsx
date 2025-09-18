"use client";
import { useState } from "react";

type Brief = Record<string, any>;

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!files || files.length === 0) throw new Error("Upload files first");
      const form = new FormData();
      for (let i = 0; i < files.length; i++) form.append("files", files[i]);
      form.append("companyName", companyName);
      const res = await fetch("/api/analyze-direct", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyze failed");
      setBrief(data.brief);
    } catch (e: any) {
      setError(e.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          VC Analyst – Upload & Analyze
        </h1>
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Upload files (PDF/DOCX)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <label className="block text-sm font-medium">Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corp"
            className="w-full border rounded px-3 py-2"
          />
          <button
            onClick={onAnalyze}
            disabled={analyzing || !files || files.length === 0}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "Generate VC Brief"}
          </button>
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
            {error}
          </div>
        )}

        {brief && (
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Brief</h2>
            {brief.raw ? (
              <pre className="whitespace-pre-wrap text-sm">{brief.raw}</pre>
            ) : (
              <pre className="whitespace-pre-wrap text-sm">
                {formatBriefToText(brief)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
