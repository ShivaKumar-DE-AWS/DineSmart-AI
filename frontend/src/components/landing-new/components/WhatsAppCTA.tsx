"use client";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export default function WhatsAppCTA() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // auto-show tooltip once
  useEffect(() => {
    if (!show) return;
    const open = setTimeout(() => setExpanded(true), 800);
    const close = setTimeout(() => setExpanded(false), 5500);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [show]);

  const msg = encodeURIComponent("Hi! I run a restaurant and I'd like to see SmartDine AI in action.");
  const href = `https://wa.me/918333871783?text=${msg}`;

  return (
    <div className={`fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-40 transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="flex items-end gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className="relative group"
          aria-label="Chat on WhatsApp"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
          <span className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl border-2 border-emerald-300/30">
            <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="currentColor">
              <path d="M16 3C9 3 3 9 3 16c0 2.6.9 5 2.4 7L3 29l6.3-2.2c1.9 1 4.1 1.6 6.7 1.6 7 0 13-6 13-13S23 3 16 3zm0 23.8c-2.3 0-4.4-.6-6.2-1.7l-.4-.3-3.7 1.3 1.2-3.6-.3-.4A10.7 10.7 0 0 1 5.2 16 10.8 10.8 0 0 1 16 5.2 10.8 10.8 0 0 1 26.8 16 10.8 10.8 0 0 1 16 26.8zm6-8.1c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.4 1.4 3.6.2.3 2.4 3.7 5.9 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.6.3-.7.3-1.4.2-1.6-.1-.2-.3-.3-.6-.5z" />
            </svg>
          </span>
        </a>

        <div className={`hidden sm:block origin-bottom-left transition-all duration-300 ${expanded ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}`}>
          <div className="glass-strong rounded-2xl rounded-bl-sm p-3 pr-4 max-w-[240px] shadow-2xl">
            <div className="text-[10px] text-emerald-300 uppercase tracking-widest mb-0.5">SmartDine team</div>
            <div className="text-sm text-cream/90">{t("wa.cta")} — typically reply in 2 min ⚡</div>
          </div>
        </div>
      </div>
    </div>
  );
}
