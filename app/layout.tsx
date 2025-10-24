import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "./components";
import AuthSessionProvider from "./providers/AuthSessionProvider";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
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
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' ? true : theme === 'light' ? false : prefersDark;
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(isDark ? 'dark' : 'light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthSessionProvider>
          <NavBar />
          <main className="pt-6 md:pt-8">{children}</main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
