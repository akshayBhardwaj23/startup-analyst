"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Message = { id: string; role: "user" | "assistant" | "system"; text: string };

export default function ChatDrawer({
  open,
  onClose,
  companyName,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<string>("");
  const typingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Persist chat per company
  const storageKey = useMemo(() => {
    const key = (companyName || "").trim().toLowerCase();
    return `chat:${key || "__default__"}`;
  }, [companyName]);

  // Initialize messages from storage when company changes
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    // default seed if nothing stored
    setMessages([
      { id: "s1", role: "system", text: "Ask this AI Chatbot about the startup." },
    ]);
  }, [storageKey]);

  // Save messages to storage
  useEffect(() => {
    try {
      if (messages && messages.length) {
        window.localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch {}
  }, [messages, storageKey]);

  // Focus input when opening (don’t reset history)
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Auto-scroll on new messages
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);


  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: String(Date.now()), role: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName, question: userMsg.text }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const aId = "a" + Date.now();
      setMessages((m) => [...m, { id: aId, role: "assistant", text: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const startTyper = () => {
        if (typingRef.current) return;
        typingRef.current = true;
        const tick = () => {
          if (!pendingRef.current.length) {
            typingRef.current = false;
            timerRef.current = null;
            return;
          }
          const take = pendingRef.current.slice(0, 3);
          pendingRef.current = pendingRef.current.slice(3);
          setMessages((m) => m.map((msg) => (msg.id === aId ? { ...msg, text: msg.text + take } : msg)));
          timerRef.current = window.setTimeout(tick, 15) as any;
        };
        tick();
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          pendingRef.current += chunk;
          startTyper();
        }
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: "e" + Date.now(), role: "assistant", text: `Error: ${e?.message || String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup any timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      typingRef.current = false;
      pendingRef.current = "";
    };
  }, []);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      {/* Large fixed chat panel (viewport-based), centered modal 85vw x 85vh */}
      <div
        ref={panelRef}
        className="pointer-events-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[85vh] w-[85vw] max-w-[1400px] bg-[#0b1220] text-white shadow-2xl flex flex-col rounded-xl border border-white/10"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg">💬 Ask the Startup</div>
              <div className="text-sm opacity-70">{companyName || "Company"}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMessages([{ id: "s1", role: "system", text: "Ask this AI Chatbot about the startup." }]);
                  try { window.localStorage.removeItem(storageKey); } catch {}
                }}
                className="text-white/60 hover:text-white/80 text-xs"
                title="Clear chat"
              >
                Clear
              </button>
              <button onClick={onClose} className="text-white/70">Close</button>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-amber-300/70">
            Disclaimer: AI and online sources may be inaccurate.
          </div>
        </div>

        <div ref={scroller} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block max-w-[85%] px-3 py-2 rounded ${m.role === "user" ? "bg-indigo-600/80" : "bg-white/5"}`}>
                <div className="text-[13px] whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 text-white outline-none"
              placeholder="Ask a question about the company or documents..."
              autoFocus
            />
            <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-3 py-2">
              {loading ? "Thinking…" : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
