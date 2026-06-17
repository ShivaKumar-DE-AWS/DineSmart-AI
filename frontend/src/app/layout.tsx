import type { Metadata, Viewport } from "next";
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
  title: "SmartDine AI — AI-Powered Dining Experience",
  description: "SmartDine AI transforms restaurant dining with AI-powered ordering, smart menu recommendations, kitchen automation and real-time order tracking.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "SmartDine AI — AI-Powered Dining Experience",
    description: "SmartDine AI transforms restaurant dining with AI-powered ordering, smart menu recommendations, kitchen automation and real-time order tracking.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SmartDine AI Logo" }],
    siteName: "SmartDine AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDine AI — AI-Powered Dining Experience",
    description: "AI-powered restaurant management with smart ordering, real-time kitchen display and customer insights.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5C0E1B",
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
