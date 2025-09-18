import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team | Startup-Analyst-XI",
  description: "Founding team behind Startup-Analyst-XI.",
  icons: "/brand-icon.svg" // Place your icon at public/brand-icon.svg
};

const members = [
    {
    name: "Ashwin Sheoran",
    url: "https://www.linkedin.com/in/ashwin-sheoran/",
  },
  {
    name: "Akshay Bhardwaj",
    url: "https://www.linkedin.com/in/akshaybhardwaj-23/",
  },
  {
    name: "Shreyanshu Sharma",
    url: "https://www.linkedin.com/in/shreyanshu-sharma/",
  },
];

export default function AboutTeam() {
  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14 font-sans fade-in">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text">The Team</h1>
        <p className="mt-3 text-sm max-w-2xl opacity-70 leading-relaxed">
          We're building faster founder & market diligence. Combining product intuition, deep learning systems and analytical rigor to compress hours of manual parsing into seconds.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {members.map(m => (
          <a
            key={m.name}
            href={m.url}
            target="_blank" rel="noopener noreferrer"
            className="group relative rounded-2xl overflow-hidden border border-indigo-500/15 bg-gradient-to-br from-indigo-500/5 via-fuchsia-500/5 to-pink-500/5 p-5 transition hover:border-indigo-500/30 hover:shadow hover:shadow-indigo-500/10"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-pink-500/10" />
            <div className="relative flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center text-xs font-semibold shadow-md shadow-indigo-500/30">
                {m.name.split(' ').map(p => p[0]).join('').slice(0,3)}
              </div>
              <div>
                <div className="font-medium tracking-tight">{m.name}</div>
                <div className="text-xs opacity-70 mt-0.5">{m.role}</div>
              </div>
              <div className="mt-1 text-[11px] inline-flex items-center gap-1 text-indigo-400/80 group-hover:text-indigo-300">
                <span>LinkedIn</span>
                <span className="i-tabler-external-link" />
              </div>
            </div>
          </a>
        ))}
      </div>

      <section className="rounded-2xl border border-indigo-500/15 bg-gradient-to-r from-indigo-500/5 via-fuchsia-500/5 to-pink-500/5 p-6 md:p-8">

        <div className="mt-6">
          {/* Replace the placeholder below with an actual group photo: place file at public/team-photo.jpg */}
          <div className="relative aspect-[16/14] w-full rounded-xl overflow-hidden bg-indigo-500/10 flex items-center justify-center text-xs text-indigo-400/70 border border-indigo-500/20">
            <span><Image src="/team-photo.jpg" alt="Team Photo" layout="fill" objectFit="cover" /></span>
          </div>
        </div>
      </section>
    </div>
  );
}
