"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Team" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const saved = localStorage.getItem('theme');
    const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' ? true : saved === 'light' ? false : !!sysDark;
    setIsDark(dark);
    root.classList.remove('dark','light');
    root.classList.add(dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const next = !isDark;
    setIsDark(next);
    root.classList.remove('dark','light');
    root.classList.add(next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/10 supports-[backdrop-filter]:bg-background/40">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
            {/* Replace with <Image src="/brand-icon.svg" ... /> once icon added */}
            <Image src="/brand-icon.svg" alt="Logo" width={20} height={20} />
          <span className="font-semibold tracking-tight text-sm md:text-base select-none">Startup-Analyst-XI</span>
        </div>
        {/* Right: Links + Theme toggle + mobile menu */}
        <div className="flex items-center gap-2">
          <ul className={`md:flex items-center gap-1 text-sm font-medium ${open ? 'absolute left-0 right-0 top-14 flex flex-col bg-background/90 backdrop-blur-xl p-4 border-b border-white/5' : 'hidden md:flex'}`}>
            {links.map(l => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2 rounded-lg transition relative block ${active ? 'text-indigo-400' : 'opacity-75 hover:opacity-100'} hover:text-indigo-300`}
                  >
                    {l.label}
                    {active && <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Sun/Moon toggle switch */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={isDark}
            className="relative inline-flex h-7 w-14 items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            title={isDark ? 'Switch to light' : 'Switch to dark'}
          >
            {/* Sun icon (left) */}
            <span className="pointer-events-none absolute left-1 h-3.5 w-3.5 opacity-90 text-yellow-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${isDark ? 'opacity-40' : 'opacity-100'} transition`}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M8.05 7.05 6.636 5.636" />
              </svg>
            </span>
            {/* Moon icon (right) */}
            <span className="pointer-events-none absolute right-1 h-4 w-4 text-gray-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className={`${isDark ? 'opacity-100' : 'opacity-40'} transition`}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
              </svg>
            </span>
            {/* Knob */}
            <span
              className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-7' : 'translate-x-2'}`}
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)' }}
            />
          </button>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
    </nav>
  );
}
