"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Team" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/10 supports-[backdrop-filter]:bg-background/40">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
            {/* Replace with <Image src="/brand-icon.svg" ... /> once icon added */}
            <Image src="/brand-icon.svg" alt="Logo" width={20} height={20} />
          <span className="font-semibold tracking-tight text-sm md:text-base select-none">Startup-Analyst-XI</span>
        </div>
        <button
          className="md:hidden text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          {open ? "Close" : "Menu"}
        </button>
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
      </div>
    </nav>
  );
}
