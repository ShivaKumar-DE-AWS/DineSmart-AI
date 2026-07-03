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
      <div id="top" className="relative min-h-screen">
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
