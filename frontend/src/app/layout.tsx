import type { Metadata } from "next";
import { Manrope, Space_Grotesk, Anton, JetBrains_Mono, Cinzel, Cormorant_Garamond } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/mehfil.css";
import { Providers } from "./providers";

// Original SmartDine fonts (used by /admin, /kitchen, /counter, landing)
const heading = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

// Mehfil royal serif pair (used by /customer routes)
const royal = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-royal", display: "swap" });
const editorial = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });

export const metadata: Metadata = {
  title: "Mehfil — Hyderabad's Original Biryani Experience",
  description: "Since 2006. Authentic Hyderabadi dum biryani, royal kebabs and Nizami sweets — now powered by AI dining.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${display.variable} ${mono.variable} ${royal.variable} ${editorial.variable}`}>
      <body data-testid="app-root">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
