"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import WhatsAppCTA from "./components/WhatsAppCTA";
import { I18nCtx, TRANSLATIONS, type Lang } from "./i18n";
import WebsiteFeature from "./components/WebsiteFeature";
import OnboardSection from "./components/OnboardSection";
import {
  LiveTicker,
  LogoMarquee,
  GuestExperience,
  OwnerWins,
  HowItWorks,
  RestaurantQuiz,
  RealStories,
  FinalCTA,
  Footer,
  StickyCTA,
  BottomNav,
} from "./components/Sections";

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("sd_lang") as Lang | null;
    if (saved && TRANSLATIONS[saved]) return saved;
    const nav = navigator.language?.slice(0, 2);
    if (nav === "hi") return "hi";
    if (nav === "ta") return "ta";
    if (nav === "mr") return "mr";
    return "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem("sd_lang", l); } catch {}
  };

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo(() => ({
    lang, setLang,
    t: (k: string) => TRANSLATIONS[lang][k] ?? TRANSLATIONS.en[k] ?? k,
  }), [lang]);

  return (
    <I18nCtx.Provider value={value}>
      <div id="top" className="relative min-h-screen bg-[#07070a] text-[#f6efe2] font-sans selection:bg-[#e8b96b] selection:text-[#07070a] overflow-x-clip w-full max-w-[100vw]" style={{ background: "radial-gradient(1100px 500px at 70% -5%, rgba(232,185,107,0.12), transparent 60%), radial-gradient(800px 500px at -5% 40%, rgba(176,107,255,0.10), transparent 60%), #07070a", color: "#f6efe2" }}>
        <Nav />
        <main>
          <Hero />
          <LiveTicker />
          <LogoMarquee />
          <GuestExperience />
          <OwnerWins />
          <WebsiteFeature />
          <HowItWorks />
          <RestaurantQuiz />
          <RealStories />
          <OnboardSection />
          <FinalCTA />
        </main>
        <Footer />
        <StickyCTA />
        <WhatsAppCTA />
        <BottomNav />
      </div>
    </I18nCtx.Provider>
  );
}
