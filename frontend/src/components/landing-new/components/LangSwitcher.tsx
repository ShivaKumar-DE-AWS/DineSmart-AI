"use client";
import { useEffect, useRef, useState } from "react";
import { LANGS, useI18n } from "../i18n";
import { GlobeIcon } from "./Icons";

export default function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const active = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition ${compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"} text-cream/85`}
        aria-label="Change language"
      >
        <GlobeIcon className="w-3.5 h-3.5 text-gold" />
        <span>{active.native}</span>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 glass-strong rounded-2xl p-1.5 shadow-2xl z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition ${
                l.code === lang ? "bg-gold/15 text-gold-bright" : "text-cream/85 hover:bg-white/5"
              }`}
            >
              <span>{l.native}</span>
              <span className="text-[10px] text-cream/45">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
