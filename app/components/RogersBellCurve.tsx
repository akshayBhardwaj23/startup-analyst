"use client";

import React from "react";

type AdopterCategory =
  | "INNOVATORS"
  | "EARLY_ADOPTERS"
  | "EARLY_MAJORITY"
  | "LATE_MAJORITY"
  | "LAGGARDS";

interface RogersBellCurveData {
  category: AdopterCategory;
  rationale: {
    text: string;
    refs: string[];
  };
}

interface RogersBellCurveProps {
  data: RogersBellCurveData;
}

export default function RogersBellCurve({ data }: RogersBellCurveProps) {
  const { category, rationale } = data;

  const categories = [
    {
      key: "INNOVATORS",
      label: "Innovators",
      percentage: "2.5%",
  color: "border-red-500 bg-red-500/10",
      description: "Technology enthusiasts, risk-takers",
    },
    {
      key: "EARLY_ADOPTERS",
      label: "Early Adopters",
      percentage: "13.5%",
      color: "border-blue-500 bg-blue-500/10",
      description: "Visionaries, opinion leaders",
    },
    {
      key: "EARLY_MAJORITY",
      label: "Early Majority",
      percentage: "34%",
      color: "border-emerald-500 bg-emerald-500/10",
      description: "Pragmatists, deliberate adopters",
    },
    {
      key: "LATE_MAJORITY",
      label: "Late Majority",
      percentage: "34%",
      color: "border-amber-500 bg-amber-500/10",
      description: "Skeptics, risk-averse",
    },
    {
      key: "LAGGARDS",
      label: "Laggards",
      percentage: "16%",
      color: "border-red-500 bg-red-500/10",
      description: "Traditionalists, last to adopt",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bell Curve Visualization */}
      <div className="relative">
        <div className="flex items-end justify-center gap-1 w-full max-w-2xl mx-auto">
          {categories.map((cat, idx) => {
            const heights = ["h-12", "h-24", "h-32", "h-24", "h-12"];
            const isActive = cat.key === category;
            return (
              <div
                key={cat.key}
                className={`flex-1 rounded-t-lg border-2 transition-all duration-300 ${
                  heights[idx]
                } ${
                  isActive
                    ? `${cat.color} shadow-lg`
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="h-full flex flex-col items-center justify-end p-2">
                  <div
                    className={`text-[10px] font-semibold text-center ${
                      isActive ? "text-[color:var(--foreground)]" : "opacity-60"
                    }`}
                  >
                    {cat.label}
                  </div>
                  <div
                    className={`text-[9px] text-center mt-0.5 ${
                      isActive ? "opacity-90" : "opacity-50"
                    }`}
                  >
                    {cat.percentage}
                  </div>
                  {isActive && (
                    <div className="mt-1 text-[10px] font-medium">
                      ✓ Current
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Descriptions */}
        <div className="mt-4 grid grid-cols-5 gap-1 text-center max-w-2xl mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className={`text-[9px] opacity-70 ${
                cat.key === category ? "font-semibold opacity-100" : ""
              }`}
            >
              {cat.description}
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--foreground)] mb-2">
          Target Adopter Analysis
        </h4>
        <div className="text-sm text-[color:var(--foreground)] bg-white/[0.02] border border-white/5 rounded-lg p-3">
          {rationale.text}
          {rationale.refs && rationale.refs.length > 0 && (
            <div className="mt-2 text-xs opacity-60">
              Sources: {rationale.refs.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
