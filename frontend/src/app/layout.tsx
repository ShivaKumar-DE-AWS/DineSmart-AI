import type { Metadata } from "next";
import { Manrope, Space_Grotesk, Anton, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";

// Cabinet Grotesk is not on Google Fonts free CDN; use Space Grotesk as a close, distinctive alternative
const heading = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "SmartDine AI — Unified Restaurant Operating System",
  description: "AI-powered dining, ordering and restaurant operations in one platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${display.variable} ${mono.variable}`}>
      <body data-testid="app-root">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
