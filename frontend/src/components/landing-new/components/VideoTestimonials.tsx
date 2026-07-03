"use client";
import { useState } from "react";
import { useI18n } from "../i18n";
import { PlayIcon, StarIcon, XIcon } from "./Icons";

type Vid = {
  name: string;
  role: string;
  city: string;
  quote: string;
  metric: string;
  metricLabel: string;
  gradient: string;
  initials: string;
  videoUrl?: string;
};

const VIDS: Vid[] = [
  {
    name: "Priya Menon",
    role: "Owner, Saffron House",
    city: "Bengaluru",
    quote: "Our table turnover doubled. The kitchen finally feels calm.",
    metric: "2×",
    metricLabel: "table turnover",
    gradient: "from-amber-500/60 via-orange-600/40 to-red-700/60",
    initials: "PM",
  },
  {
    name: "Rohan Kapoor",
    role: "Founder, Bella Napoli",
    city: "Mumbai",
    quote: "Average order value jumped 22% in the first month. The AI just works.",
    metric: "+22%",
    metricLabel: "average order value",
    gradient: "from-purple-500/60 via-fuchsia-600/40 to-rose-700/60",
    initials: "RK",
  },
  {
    name: "Vikram Shetty",
    role: "MD, Coastal Grill Group",
    city: "Goa",
    quote: "I run 6 outlets from my phone now. SmartDine changed our business.",
    metric: "6",
    metricLabel: "outlets, one phone",
    gradient: "from-teal-500/60 via-emerald-600/40 to-cyan-700/60",
    initials: "VS",
  },
];

export default function VideoTestimonials() {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="py-12 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6 sm:mb-10">
          <div>
            <p className="text-[11px] sm:text-sm uppercase tracking-[0.2em] text-gold/80">{t("results.video")}</p>
            <h3 className="font-display text-[26px] leading-[1.1] sm:text-5xl tracking-tight mt-2 sm:mt-3">
              Stories from <span className="italic text-gradient-gold">real owners.</span>
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[12px] sm:text-sm text-cream/70">
            <div className="flex text-gold">
              {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className="w-3 h-3 sm:w-4 sm:h-4" />)}
            </div>
            <span className="ml-1.5 sm:ml-2">4.9 · 312 reviews</span>
          </div>
        </div>

        {/* Mobile: horizontal snap scroll */}
        <div className="md:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-2">
            {VIDS.map((v, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="snap-center shrink-0 w-[78vw] max-w-[300px] group relative aspect-[4/5] rounded-3xl overflow-hidden text-left border border-white/10"
              >
                <VideoTileContent v={v} idx={i} />
              </button>
            ))}
            <div className="shrink-0 w-1" />
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-5">
          {VIDS.map((v, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="group relative aspect-[4/5] rounded-3xl overflow-hidden text-left hover-lift border border-white/10"
            >
              <VideoTileContent v={v} idx={i} />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox modal */}
      {active !== null && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-[rise_.3s_ease]" onClick={() => setActive(null)}>
          <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className={`absolute inset-0 bg-gradient-to-br ${VIDS[active].gradient}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <button onClick={() => setActive(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full glass-strong flex items-center justify-center text-cream z-10" aria-label="Close">
              <XIcon className="w-4 h-4" />
            </button>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-white/90 flex items-center justify-center text-black mb-4">
                <PlayIcon className="w-7 h-7 sm:w-8 sm:h-8 ml-1" />
              </div>
              <p className="font-display text-xl sm:text-3xl max-w-xl">"{VIDS[active].quote}"</p>
              <div className="mt-4 text-cream/80 text-[13px] sm:text-sm">— {VIDS[active].name}, {VIDS[active].role}</div>
              <div className="mt-5 text-[11px] sm:text-xs text-cream/55 px-4">Full video coming soon. Book a demo to hear the full story.</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function VideoTileContent({ v, idx }: { v: Vid; idx: number }) {
  return (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient}`} />
      <div className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.5), transparent 60%)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-strong flex items-center justify-center font-display text-base sm:text-lg text-cream">
        {v.initials}
      </div>

      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 glass-strong rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-right">
        <div className="font-display text-xl sm:text-2xl text-gradient-gold leading-none">{v.metric}</div>
        <div className="text-[8px] sm:text-[9px] text-cream/70 uppercase tracking-wider mt-0.5">{v.metricLabel}</div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <span className="relative flex w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 backdrop-blur items-center justify-center text-black group-hover:scale-110 transition shadow-2xl">
            <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <blockquote className="font-display text-base sm:text-xl leading-snug text-cream">"{v.quote}"</blockquote>
        <div className="mt-2 sm:mt-3 flex items-end justify-between">
          <div>
            <div className="text-[13px] sm:text-sm text-cream">{v.name}</div>
            <div className="text-[11px] sm:text-xs text-cream/60">{v.role}</div>
          </div>
          <div className="text-[9px] sm:text-[10px] text-cream/50 uppercase tracking-wider">{v.city}</div>
        </div>
      </div>

      <div className="absolute bottom-2 right-2 text-[9px] sm:text-[10px] text-cream/60 font-mono glass px-1.5 py-0.5 rounded">
        0:{45 + idx * 7}
      </div>
    </>
  );
}
