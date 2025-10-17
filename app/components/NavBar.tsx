"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Team" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const firstFocusRef = useRef<HTMLAnchorElement | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const saved = localStorage.getItem("theme");
    const sysDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark =
      saved === "dark" ? true : saved === "light" ? false : !!sysDark;
    setIsDark(dark);
    root.classList.remove("dark", "light");
    root.classList.add(dark ? "dark" : "light");
  }, []);

  // Close mobile menu on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Initial focus when menu opens (no body scroll lock for subtle UX)
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => firstFocusRef.current?.focus());
    }
  }, [open]);

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const next = !isDark;
    setIsDark(next);
    root.classList.remove("dark", "light");
    root.classList.add(next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/10 supports-[backdrop-filter]:bg-background/40">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Replace with <Image src="/brand-icon.svg" ... /> once icon added */}
          <Image src="/brand-icon.svg" alt="Logo" width={20} height={20} />
          <span className="font-semibold tracking-tight text-sm md:text-base select-none">
            Startup-Analyst-XI
          </span>
        </div>
        {/* Right: Links + Theme toggle + mobile menu */}
        <div className="flex items-center gap-2">
          {/* Desktop navigation */}
          <ul className="hidden md:flex items-center gap-1 text-sm font-medium">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`px-3 py-2 rounded-lg transition relative block ${
                      active
                        ? "text-indigo-400"
                        : "opacity-75 hover:opacity-100"
                    } hover:text-indigo-300`}
                  >
                    {l.label}
                    {active && (
                      <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
                    )}
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
            title={isDark ? "Switch to light" : "Switch to dark"}
          >
            {/* Sun icon (left) */}
            <span className="pointer-events-none absolute left-1 h-3.5 w-3.5 opacity-90 text-yellow-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`${
                  isDark ? "opacity-40" : "opacity-100"
                } transition`}
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M8.05 7.05 6.636 5.636" />
              </svg>
            </span>
            {/* Moon icon (right) */}
            <span className="pointer-events-none absolute right-1 h-4 w-4 text-gray-400">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`${
                  isDark ? "opacity-100" : "opacity-40"
                } transition`}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
              </svg>
            </span>
            {/* Knob */}
            <span
              className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isDark ? "translate-x-7" : "translate-x-2"
              }`}
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)",
              }}
            />
          </button>

          {/* Auth controls */}
          {status !== "loading" &&
            (session?.user ? (
              <div className="flex items-center gap-2 ml-1">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="hidden sm:inline text-xs opacity-80 max-w-[160px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google")}
                aria-label="Sign in"
                className="inline-flex items-center gap-2 rounded-md border border-[#dadce0] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4043] shadow-sm hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4] cursor-pointer ml-1"
              >
                <span aria-hidden className="flex h-4 w-4 items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2045c0-.638-.0573-1.251-.1636-1.836H9v3.477h4.844c-.209 1.127-.842 2.082-1.795 2.724v2.26h2.908c1.702-1.568 2.683-3.877 2.683-6.625z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.468-.806 5.957-2.17l-2.908-2.26c-.806.54-1.835.859-3.049.859-2.344 0-4.329-1.582-5.037-3.71H.957v2.332C2.437 15.983 5.481 18 9 18z" fill="#34A853"/>
                    <path d="M3.963 10.719A5.41 5.41 0 0 1 3.671 9c0-.596.102-1.173.292-1.719V4.949H.957A8.992 8.992 0 0 0 0 9c0 1.46.349 2.84.957 4.051l3.006-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.54c1.322 0 2.514.455 3.45 1.348l2.587-2.587C13.465.864 11.427 0 9 0 5.481 0 2.437 2.017.957 4.949l3.006 2.332C4.671 5.153 6.656 3.54 9 3.54z" fill="#EA4335"/>
                  </svg>
                </span>
                <span>Sign in</span>
              </button>
            ))}

          {/* Mobile menu button */}
          <button
            className="md:hidden text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-haspopup="dialog"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Subtle top dropdown (mobile only) */}
      {open && (
        <>
          {/* Invisible overlay below navbar to enable click-outside close */}
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-14 z-40 md:hidden bg-transparent"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown panel aligned to the right under the navbar */}
          <div className="fixed right-4 top-14 z-50 md:hidden">
            <div className="min-w-[12rem] rounded-lg border border-white/10 bg-[var(--background)] text-[var(--foreground)] shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-zinc-900/60">
              <ul className="py-1 text-sm font-medium">
                {links.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        ref={
                          l.href === links[0].href ? firstFocusRef : undefined
                        }
                        className={`block w-full px-3 py-2 rounded-md transition ${
                          active
                            ? "text-indigo-500 dark:text-indigo-400"
                            : "opacity-85 hover:opacity-100"
                        } hover:text-indigo-500 dark:hover:text-indigo-300`}
                      >
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
