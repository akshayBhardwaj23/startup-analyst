"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CompanyHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.companyId as string;
  const [company, setCompany] = useState<{ name: string } | null>(null);
  const [runs, setRuns] = useState<
    Array<{
      id: string;
      createdAt: string;
      industry: string | null;
      stage: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/history/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company);
          setRuns(data.runs || []);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    };
    if (companyId) fetchHistory();
  }, [companyId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12 font-sans fade-in flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-3 text-sm opacity-80 justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            <span>Loading history...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12 font-sans">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-sm opacity-70">Company not found</p>
          <button
            onClick={() => router.push("/history")}
            className="btn-primary mt-6"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-5 py-10 sm:px-8 md:px-12 font-sans fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text">
              {company.name}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">Previous Analyses</p>
          </div>
          <button onClick={() => router.push("/history")} className="copy-btn">
            ← Back
          </button>
        </div>

        {runs.length === 0 ? (
          <div className="panel glass text-center py-12">
            <p className="text-sm opacity-70">No analyses found</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => router.push(`/results/${r.id}`)}
                className="group w-full text-left rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-indigo-400"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-0.5">
                      Analysis from{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {r.industry && (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 cursor-help"
                          title="Industry Category"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="2"
                              y="7"
                              width="20"
                              height="14"
                              rx="2"
                              ry="2"
                            />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                          {r.industry}
                        </span>
                      )}
                      {r.stage && (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 cursor-help"
                          title="Funding Stage"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                          </svg>
                          {r.stage}
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-60">
                      {new Date(r.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
