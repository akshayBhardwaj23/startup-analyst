"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const content = (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      {/* Modal */}
      <div className="pointer-events-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[85vh] w-[85vw] max-w-[1400px] glass shadow-2xl flex flex-col rounded-xl border border-white/10">
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24">
              <path d="M12 .587l3.668 7.431L24 9.748l-6 5.854 1.417 8.264L12 19.771l-7.417 4.095L6 15.602 0 9.748l8.332-1.73z" />
            </svg>
            <div className="text-base font-semibold text-black dark:text-white">Pro Model Request Form</div>
          </div>
          <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">Close</button>
        </div>
        <div className="flex-1 min-h-0 bg-white/70 dark:bg-black/30">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSeqdPm9rDciUgaUzlsI5tHeROJWO_gJNu_tW2lsdXoNzJLitA/viewform?embedded=true"
            className="w-full h-full"
            frameBorder={0}
            marginHeight={0}
            marginWidth={0}
            title="Go Pro Form"
          >
            Loading…
          </iframe>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
