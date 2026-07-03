"use client";
import { useEffect, useState } from "react";
import { ArrowRight, MenuIcon, XIcon } from "./Icons";
import { useI18n } from "../i18n";
import LangSwitcher from "./LangSwitcher";

export default function Nav() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how", label: t("nav.how") },
    { href: "#features", label: t("nav.features") },
    { href: "#results", label: t("nav.results") },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <div className="mx-auto max-w-7xl px-4">
        <nav className={`flex items-center justify-between rounded-full px-3 sm:px-4 py-2.5 transition-all ${scrolled ? "card-solid shadow-2xl border border-white/15" : "glass-strong"}`}>
          <a href="#top" className="flex items-center gap-2 pl-2">
            <Logo />
            <span className="font-display text-lg tracking-tight">SmartDine<span className="text-gold">.</span><span className="text-gradient-ai font-sans text-xs align-top ml-0.5">AI</span></span>
          </a>

          <ul className="hidden lg:flex items-center gap-1">
            {links.map(l => (
              <li key={l.href}>
                <a href={l.href} className="px-3 py-2 text-sm text-cream/75 hover:text-cream transition-colors whitespace-nowrap">{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-1.5">
            <LangSwitcher compact />
            <a href="/auth/login" className="text-[12px] text-cream/80 hover:text-cream border border-white/10 hover:border-white/25 rounded-full px-3 py-1.5 transition whitespace-nowrap">
              👩‍🍳 SmartDine Staff
            </a>
            <a href="/auth/restaurant?tab=login" className="text-[12px] text-gold/90 hover:text-gold border border-gold/30 hover:border-gold/60 rounded-full px-3 py-1.5 transition whitespace-nowrap font-medium">
              🏪 Restaurant Partners
            </a>
            <a href="/auth/restaurant?tab=register" className="btn-primary !py-2 !px-4 text-sm">Sign up free <ArrowRight className="w-3.5 h-3.5" /></a>
          </div>

          <button className="md:hidden p-2 text-cream" onClick={() => setOpen(v => !v)} aria-label="Menu">
            {open ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </nav>

        {open && (
          <div className="md:hidden mt-2 glass-strong rounded-3xl p-4">
            <ul className="flex flex-col">
              {links.map(l => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block px-3 py-3 text-cream/85 border-b border-white/5">{l.label}</a>
                </li>
              ))}
              <li>
                <a href="/auth/login" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-3 text-cream/85 border-b border-white/5">
                  👩‍🍳 <span>SmartDine Staff</span>
                </a>
              </li>
              <li>
                <a href="/auth/restaurant?tab=login" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-3 text-gold border-b border-white/5 font-medium">
                  🏪 <span>Restaurant Partners</span>
                </a>
              </li>
            </ul>
            <div className="mt-3 flex items-center justify-between gap-2">
              <LangSwitcher />
              <a href="/auth/restaurant?tab=register" onClick={() => setOpen(false)} className="btn-primary">Sign up free</a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-gold-bright via-gold to-orange flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="currentColor">
        <path d="M12 2c2 4 6 5 6 10a6 6 0 1 1-12 0c0-5 4-6 6-10z" />
      </svg>
      <span className="absolute -inset-1 rounded-2xl bg-gold/30 blur-md -z-10" />
    </div>
  );
}
