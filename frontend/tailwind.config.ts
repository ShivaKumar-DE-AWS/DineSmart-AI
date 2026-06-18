import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui"],
        body: ["var(--font-body)", "system-ui"],
        display: ["var(--font-display)", "system-ui"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        // Customer / Admin (warm earth)
        cream: "#F6F4F0",
        ink: "#050505", // Deepened for premium dark mode
        clay: "#D95333", // Matched to logo 'Dine'
        "clay-dark": "#B83A1F",
        sage: "#4E6C50",
        stone: "#888888",
        bone: "#2A2A2A", // Darkened for dark mode borders
        
        // Brand accents
        gold: "#EAB308",
        "electric-blue": "#2A64F6",

        // Dynamic Brand Theme (defaults to Mehfil colors if not set)
        "brand-primary": "var(--brand-primary, #8A1A2A)",
        "brand-secondary": "var(--brand-secondary, #C9A348)",

        // Kitchen / Counter (high contrast)
        coal: "#0A0A0A",
        graphite: "#141414",
        slate: "#27272A",
        alert: "#FF3B30",
        ready: "#32D74B",
        warn: "#FF9F0A",
        // ShadCN tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-alert": { "0%, 100%": { borderColor: "rgba(255,59,48,1)" }, "50%": { borderColor: "rgba(255,59,48,0.3)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
        "pulse-alert": "pulse-alert 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
