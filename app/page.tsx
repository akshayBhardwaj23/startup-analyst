"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!session) return;
      try {
        const res = await fetch("/api/user/usage");
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (e) {
        console.error("Failed to fetch usage", e);
      }
    };
    fetchUsage();
  }, [session]);

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next: File[] = Array.from(list);
    setFiles((prev) => [...prev, ...next]);
    setError(null);
  }, []);

  const onAnalyze = async () => {
    if (!session) {
      window.location.href = "/login";
      return;
    }
    if (!companyName || !companyName.trim()) {
      setError("Company name is required");
      return;
    }
    try {
      setError(null);
      setAnalyzing(true);
      if (files.length === 0) throw new Error("Upload files first");

      // 1) Upload files to Vercel Blob via client SDK (streams, avoids body size limits)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url } = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        uploadedUrls.push(url);
      }

      // 2) Call analysis with Blob URLs (small JSON body)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: uploadedUrls, companyName }),
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

      // 3) Redirect to results page
      if (data.runId) {
        router.push(`/results/${data.runId}`);
      } else {
        throw new Error("No run ID returned from analysis");
      }
    } catch (e: any) {
      setError(e.message || "Analyze failed");
      setAnalyzing(false);
    } finally {
      // Refresh usage after analysis
      if (session) {
        try {
          const res = await fetch("/api/user/usage");
          if (res.ok) {
            const data = await res.json();
            setUsage(data);
          }
        } catch (e) {
          console.error("Failed to refresh usage", e);
        }
      }
    }
  };

  const totalFiles = files.length;
  const removeFileAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12 font-sans fade-in">
      <div className="max-w-screen-xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text mb-4">
            Startup Brief Generator
          </h1>
          <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto text-foreground/80 leading-relaxed">
            Transform your pitch materials into investor-ready summaries with
            AI-powered analysis
          </p>
          <div className="mt-6 flex items-center gap-2 justify-center">
            <div className="pulse-dot" />
            <span className="text-xs font-medium opacity-70">
              General Release
            </span>
          </div>
          {session && usage && (
            <div
              className={`mt-4 text-center text-sm px-4 py-2.5 rounded-lg border inline-block mx-auto ${
                usage.remaining <= 5
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : usage.remaining <= 10
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline mr-2 opacity-70"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="font-semibold">{usage.remaining}</span> of{" "}
              {usage.limit} analyses remaining
            </div>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Upload Form */}
          <section className="panel glass relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/20 to-pink-500/20 blur-3xl" />
            <div className="relative space-y-6">
              <div>
                <div className="card-title">Upload Documents</div>
                <div
                  ref={dropRef}
                  onDragEnter={onDrag}
                  onDragOver={onDrag}
                  onDragLeave={onDrag}
                  onDrop={onDrop}
                  className={`file-drop ${dragActive ? "drag-active" : ""}`}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={analyzing}
                  />
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-40 mb-2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                    <span className="font-medium">
                      {dragActive
                        ? "Release to add"
                        : "Drag & drop or click to select"}
                    </span>
                    <span className="text-xs opacity-70">
                      PDF or DOCX • up to ~25MB each
                    </span>
                    {totalFiles > 0 && (
                      <span className="mt-1 outline-pill">
                        {totalFiles} file{totalFiles > 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                </div>
                {totalFiles > 0 && (
                  <ul className="mt-4 space-y-1 max-h-40 overflow-auto pr-1 text-xs">
                    {files.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 py-1 px-2 rounded-md bg-indigo-500/5 border border-indigo-500/10"
                      >
                        <span className="i-tabler-file-description text-indigo-400" />
                        <span className="truncate flex-1" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFileAt(idx)}
                          className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 text-red-400"
                          aria-label={`Remove ${file.name}`}
                          title="Remove file"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="card-title">Company Name</div>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  aria-required
                />
                <div className="mt-1 text-[11px] opacity-70">
                  Company name is required to generate the brief.
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 pt-2">
                <button
                  onClick={onAnalyze}
                  disabled={
                    analyzing ||
                    !files ||
                    files.length === 0 ||
                    !companyName.trim()
                  }
                  className="btn-primary text-sm w-full"
                  title={
                    !session
                      ? "Login to generate brief"
                      : !companyName.trim()
                      ? "Enter company name"
                      : undefined
                  }
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <span>
                        {session ? "Generate Brief" : "Login to Generate"}
                      </span>
                    </span>
                  )}
                </button>
                {error && (
                  <div className="text-xs text-red-500 font-medium text-center px-2 py-1 bg-red-500/10 rounded-md border border-red-500/20">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Column: About the App */}
          <section className="panel glass relative overflow-hidden">
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 via-red-500/20 to-pink-500/20 blur-3xl" />
            <div className="relative space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-fuchsia-400 text-transparent bg-clip-text mb-3">
                  What We Do
                </h2>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Our AI-powered platform analyzes your startup documents and
                  generates comprehensive investor briefs in minutes. Upload
                  your pitch deck, business plan, or any relevant documents, and
                  we&apos;ll extract key insights to create a professional
                  summary.
                </p>
              </div>

              <div className="space-y-4">
                <div className="card-title">Key Features</div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">
                        Comprehensive Analysis
                      </h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        Extract problem, solution, market size (TAM), traction,
                        team insights, moat, risks, and more from your
                        documents.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">
                        Fast Processing
                      </h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        Get results in minutes, not hours. Our AI processes
                        documents quickly and efficiently.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">
                        Structured Output
                      </h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        Get investor-style summaries with ratings, strategic
                        analysis (Ansoff Matrix, Business Model Canvas, Rogers
                        Bell curve), hypotheses, and key questions.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">
                        Export as PDF
                      </h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        Download beautifully formatted PDF reports to share with
                        your team or investors.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">
                        Interactive Q&A
                      </h3>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        Ask follow-up questions about your startup using our
                        AI-powered chat feature.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold mb-2">How It Works</h3>
                <ol className="space-y-2 text-xs text-foreground/70">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                      1
                    </span>
                    <span>
                      Upload your pitch deck, business plan, or startup
                      documents (PDF/DOCX)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-[10px] font-bold text-fuchsia-300">
                      2
                    </span>
                    <span>
                      Enter your company name and click &quot;Generate
                      Brief&quot;
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-300">
                      3
                    </span>
                    <span>
                      Get a comprehensive analysis with insights, ratings, and
                      strategic recommendations
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-300">
                      4
                    </span>
                    <span>
                      Download as PDF or interact with our AI chat for deeper
                      insights
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-14 mb-4 text-center text-[11px] opacity-60 space-y-1">
          <div>
            Built for rapid diligence workflows. Documents are processed
            transiently.
          </div>
          <div>
            © Token Tribe • Loading may be slow depending on region/network.
          </div>
        </footer>
      </div>

      {analyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="panel glass max-w-md mx-4 text-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm opacity-80 justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
                <span>Analyzing documents & extracting signals…</span>
              </div>
              <div className="grid gap-2 text-[10px] text-indigo-400/70">
                <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer" />
                <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-5/6 mx-auto" />
                <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-4/6 mx-auto" />
                <div className="h-2.5 rounded bg-indigo-400/10 overflow-hidden shimmer w-3/6 mx-auto" />
              </div>
              <p className="text-xs opacity-70 mt-4">
                This may take 1-2 minutes depending on document size
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
