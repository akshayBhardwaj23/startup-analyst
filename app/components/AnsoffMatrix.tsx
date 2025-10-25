"use client";

import React from "react";

type AnsoffQuadrant =
  | "MARKET_PENETRATION"
  | "MARKET_DEVELOPMENT"
  | "PRODUCT_DEVELOPMENT"
  | "DIVERSIFICATION";

interface AnsoffMatrixData {
  quadrant: AnsoffQuadrant;
  rationale: {
    text: string;
    refs: string[];
  };
}

interface AnsoffMatrixProps {
  data: AnsoffMatrixData;
}

export default function AnsoffMatrix({ data }: AnsoffMatrixProps) {
  const { quadrant, rationale } = data;

  return (
    <div className="space-y-4">
      {/* Matrix Visualization */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-2 w-full max-w-md mx-auto">
          {/* Market Penetration */}
          <div
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              quadrant === "MARKET_PENETRATION"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="text-sm font-semibold text-[color:var(--foreground)]">
              Market Penetration
            </div>
            <div className="text-xs opacity-70 mt-1">
              Existing Product, Existing Market
            </div>
            {quadrant === "MARKET_PENETRATION" && (
              <div className="mt-2 text-xs font-medium text-blue-400">
                ✓ Current Strategy
              </div>
            )}
          </div>

          {/* Market Development */}
          <div
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              quadrant === "MARKET_DEVELOPMENT"
                ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="text-sm font-semibold text-[color:var(--foreground)]">
              Market Development
            </div>
            <div className="text-xs opacity-70 mt-1">
              Existing Product, New Market
            </div>
            {quadrant === "MARKET_DEVELOPMENT" && (
              <div className="mt-2 text-xs font-medium text-emerald-400">
                ✓ Current Strategy
              </div>
            )}
          </div>

          {/* Product Development */}
          <div
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              quadrant === "PRODUCT_DEVELOPMENT"
                ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="text-sm font-semibold text-[color:var(--foreground)]">
              Product Development
            </div>
            <div className="text-xs opacity-70 mt-1">
              New Product, Existing Market
            </div>
            {quadrant === "PRODUCT_DEVELOPMENT" && (
              <div className="mt-2 text-xs font-medium text-amber-400">
                ✓ Current Strategy
              </div>
            )}
          </div>

          {/* Diversification */}
          <div
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              quadrant === "DIVERSIFICATION"
                ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="text-sm font-semibold text-[color:var(--foreground)]">
              Diversification
            </div>
            <div className="text-xs opacity-70 mt-1">
              New Product, New Market
            </div>
            {quadrant === "DIVERSIFICATION" && (
              <div className="mt-2 text-xs font-medium text-red-400">
                ✓ Current Strategy
              </div>
            )}
          </div>
        </div>

        {/* Axis Labels */}
        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-[color:var(--foreground)] opacity-80">
            Market: Existing ← → New
          </div>
          <div className="text-xs opacity-60 mt-1">
            Product: Existing (top) / New (bottom)
          </div>
        </div>
      </div>

      {/* Strategy Details */}
      <div className="space-y-4">
        {/* Rationale */}
        <div>
          <h4 className="text-sm font-semibold text-[color:var(--foreground)] mb-2">
            Strategy Rationale
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
    </div>
  );
}
