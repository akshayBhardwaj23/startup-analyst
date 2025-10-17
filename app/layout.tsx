import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "./components";
import AuthSessionProvider from "./providers/AuthSessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Startup-Analyst-XI",
  description: "Startup-Analyst-XI – AI-assisted startup brief generator.",
  openGraph: {
    title: "Startup-Analyst-XI",
    description: "AI-assisted startup brief generator.",
    type: "website",
    images: [
      {
        url: "/brand-icon.png",
        width: 1200,
        height: 630,
        alt: "Startup-Analyst-XI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup-Analyst-XI",
    description: "AI-assisted startup brief generator.",
    images: ["/brand-icon.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/brand-icon.svg", media: "(prefers-color-scheme: light)" },
    ],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <NavBar />
          <main className="pt-6 md:pt-8">{children}</main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
