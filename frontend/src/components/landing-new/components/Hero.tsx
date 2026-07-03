"use client";
import { ArrowRight, PlayIcon, SparkleIcon, BellIcon, ChefHatIcon, ChartIcon } from "./Icons";
import { useI18n } from "../i18n";

export default function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative pt-24 pb-10 sm:pt-36 sm:pb-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl opacity-35" style={{ background:"radial-gradient(closest-side,rgba(232,185,107,.35),transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-25" style={{ background:"radial-gradient(closest-side,rgba(176,107,255,.3),transparent 70%)" }} />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* badge */}
          <div className="glass inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs text-cream/80 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {t("hero.badge")}
          </div>

          {/* headline */}
          <h1 className="font-display text-[38px] leading-[1.03] sm:text-[70px] sm:leading-[1.02] md:text-[84px] tracking-[-0.025em] max-w-4xl">
            {t("hero.title.1")}{" "}
            <span className="text-gradient-gold italic">{t("hero.title.2")}</span>
            <br />{t("hero.title.3")}
          </h1>

          <p className="mt-4 max-w-xl text-[15px] sm:text-lg text-cream/65 leading-relaxed px-2">{t("hero.sub")}</p>

          {/* CTAs — full width stacked on mobile */}
          <div className="mt-7 w-full max-w-xs sm:max-w-none flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
            <a href="#demo" className="btn-primary justify-center">{t("hero.cta.primary")} <ArrowRight className="w-4 h-4" /></a>
            <a href="#how" className="btn-ghost justify-center"><PlayIcon className="w-4 h-4" /> {t("hero.cta.secondary")}</a>
          </div>
          <p className="mt-3 text-[11px] text-cream/45">{t("hero.note")}</p>
        </div>

        {/* Visual */}
        <div className="mt-10 sm:mt-20 relative">
          <div className="sm:hidden"><MobileHeroVisual /></div>
          <div className="hidden sm:block"><DesktopHeroVisual /></div>
        </div>
      </div>
    </section>
  );
}

/* ── MOBILE: single phone + floating badges ── */
function MobileHeroVisual() {
  return (
    <div className="relative mx-auto w-[260px]">
      <div className="absolute -inset-8 rounded-full blur-3xl opacity-30 bg-gradient-to-b from-gold/30 to-ai-2/20" />
      {/* Phone */}
      <div className="relative z-10 rounded-[40px] bg-gradient-to-b from-[#1c1c26] to-[#0a0a10] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,.8),inset_0_1px_0_rgba(255,255,255,.1)] overflow-hidden">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black z-10" />
        <div className="pt-10 px-3 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] text-cream/50">Table 7 · Saffron House</div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange to-red flex items-center justify-center text-[9px] font-bold">A</div>
          </div>
          {/* AI bubble */}
          <div className="rounded-2xl p-2.5 bg-gradient-to-br from-ai-1/20 to-ai-2/20 border border-ai-2/30">
            <div className="flex items-center gap-1 text-[8px] text-ai-2 mb-1"><SparkleIcon className="w-2 h-2" /> AI Waiter</div>
            <div className="text-[10px] text-cream leading-snug">Try <b className="text-gold-bright">Truffle Pasta</b> 🍝 — chef's special today!</div>
          </div>
          {/* Menu items */}
          {[["🍕","Wood-fire Pizza","₹480"],["🥗","Caesar Salad","₹320"],["🍝","Truffle Pasta","₹540"]].map(([e,n,p]) => (
            <div key={n} className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
              <div className="text-xl">{e}</div>
              <div className="flex-1"><div className="text-[10px] text-cream">{n}</div><div className="text-[9px] text-gold">{p}</div></div>
              <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center text-black text-xs font-bold leading-none">+</div>
            </div>
          ))}
          {/* Status bar */}
          <div className="rounded-xl p-2 glass-strong">
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="text-cream/70 flex items-center gap-1"><ChefHatIcon className="w-2.5 h-2.5 text-gold" /> Order #2041</span>
              <span className="text-orange">Preparing…</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 bg-gradient-to-r from-gold to-orange" /></div>
          </div>
          <button className="w-full py-2 rounded-full bg-gradient-to-r from-gold-bright to-orange text-black text-[11px] font-semibold">Call Waiter</button>
        </div>
        <div className="flex justify-center pb-3"><div className="w-20 h-1 rounded-full bg-white/20" /></div>
      </div>

      {/* Floating chips */}
      <div className="absolute -left-16 top-10 glass-strong rounded-2xl px-2.5 py-2 animate-floaty">
        <div className="flex items-center gap-1.5">
          <BellIcon className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] text-cream">T12 needs refill</span>
        </div>
      </div>
      <div className="absolute -right-14 top-20 glass-strong rounded-2xl px-2.5 py-2 animate-floaty-slow">
        <div className="text-[9px] text-cream/60">Revenue today</div>
        <div className="text-xs text-gradient-gold font-display">₹1.42L</div>
        <div className="text-[8px] text-emerald-300">▲ 28%</div>
      </div>
      <div className="absolute -right-12 bottom-24 glass-strong rounded-xl px-2 py-1.5 animate-floaty">
        <div className="flex items-center gap-1 text-[9px] text-cream/70"><ChartIcon className="w-3 h-3 text-gold" /> 312 orders</div>
      </div>
      <div className="absolute -left-10 bottom-28 glass-strong rounded-xl p-1.5 animate-floaty-slow">
        <div className="w-10 h-10 bg-white rounded-lg p-1"><MiniQR /></div>
      </div>
    </div>
  );
}

/* ── DESKTOP hero ── */
function DesktopHeroVisual() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="relative aspect-[16/9] rounded-[24px] overflow-hidden glass-strong noise">
        <div className="absolute inset-0" style={{ background:"radial-gradient(800px 400px at 20% 20%,rgba(232,185,107,.18),transparent 60%),radial-gradient(600px 400px at 80% 80%,rgba(176,107,255,.15),transparent 60%),linear-gradient(180deg,#0d0c14,#08080c)" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 560" preserveAspectRatio="none">
          <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#e8b96b" stopOpacity=".1"/><stop offset="50%" stopColor="#e8b96b" stopOpacity=".7"/><stop offset="100%" stopColor="#b06bff" stopOpacity=".1"/></linearGradient></defs>
          <path d="M 160 350 C 260 250,380 200,500 200" stroke="url(#lg)" strokeWidth="1.5" fill="none" className="animate-dash"/>
          <path d="M 500 200 C 620 200,740 250,840 350" stroke="url(#lg)" strokeWidth="1.5" fill="none" className="animate-dash"/>
          <path d="M 160 350 C 300 430,500 450,840 350" stroke="url(#lg)" strokeWidth="1" fill="none" className="animate-dash" opacity=".5"/>
        </svg>
        {/* Left card */}
        <div className="absolute left-[4%] top-[18%] w-48 glass-strong rounded-2xl p-4 animate-floaty-slow">
          <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange to-red flex items-center justify-center text-[9px] font-bold">A</div><div className="text-[10px] text-cream/60">Table 7</div></div>
          <div className="rounded-lg bg-black/40 p-2 text-[10px] text-cream">🍝 Truffle Pasta suggested by AI</div>
        </div>
        {/* Center QR */}
        <div className="absolute left-1/2 top-[28%] -translate-x-1/2 flex flex-col items-center">
          <div className="relative w-36 h-36 rounded-2xl glass-strong p-3 animate-glow">
            <LargeQR />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-cream/80 whitespace-nowrap">SCAN TO ORDER</div>
          </div>
          <div className="mt-5 glass-strong rounded-2xl px-3 py-1.5 flex items-center gap-2">
            <SparkleIcon className="w-3.5 h-3.5 text-ai-2" />
            <span className="text-[11px] text-cream/85">AI Waiter listening…</span>
            <Eq />
          </div>
        </div>
        {/* Right card — kitchen */}
        <div className="absolute right-[4%] top-[14%] w-52 glass-strong rounded-2xl p-4 animate-floaty">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5 text-[10px] text-cream/80"><ChefHatIcon className="w-3.5 h-3.5 text-gold"/>Kitchen #2041</div><span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange/15 text-orange border border-orange/30">Preparing</span></div>
          {[["Truffle Pasta","×1"],["Caesar Salad","×2"],["Iced Latte","×2"]].map(([n,q]) => <div key={n} className="flex justify-between text-[10px] text-cream/80 mt-1"><span>{n}</span><span className="text-cream/40">{q}</span></div>)}
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 bg-gradient-to-r from-gold to-orange" /></div>
        </div>
        {/* Bottom left — waiter call */}
        <div className="absolute left-[6%] bottom-[12%] glass-strong rounded-2xl p-3 flex items-center gap-2 animate-floaty">
          <div className="relative"><BellIcon className="w-4 h-4 text-gold" /><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red animate-pulse" /></div>
          <div className="text-[10px] text-cream">T12 refill request</div>
        </div>
        {/* Bottom right — analytics */}
        <div className="absolute right-[4%] bottom-[8%] w-52 glass-strong rounded-2xl p-4 animate-floaty-slow">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5 text-[10px] text-cream/80"><ChartIcon className="w-3.5 h-3.5 text-gold"/>Today</div><span className="text-[9px] text-emerald-300">▲ 28%</span></div>
          <div className="flex items-end gap-0.5 h-10">{[30,55,42,70,90,65,82,98,76,88].map((h,i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-gold/30 to-gold" style={{height:`${h}%`}}/>)}</div>
          <div className="flex justify-between text-[10px] mt-1"><span className="text-cream/50">Revenue</span><span className="text-cream">₹ 1,42,800</span></div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/4 right-1/4 h-8 blur-3xl bg-gold/20 -z-10" />
    </div>
  );
}

function MiniQR() {
  const c = Array.from({length:64},(_,i)=>((i*43+7)%7)>3);
  return <div className="grid grid-cols-8 gap-px w-full h-full">{c.map((on,i)=><div key={i} className={on?"bg-black":""}/>)}</div>;
}
function LargeQR() {
  const c = Array.from({length:169},(_,i)=>((i*37+13)%7)>3);
  return (
    <div className="relative w-full h-full rounded-xl bg-white p-2 overflow-hidden">
      <div className="grid w-full h-full" style={{gridTemplateColumns:"repeat(13,1fr)",gap:"2px"}}>
        {c.map((on,i)=><div key={i} className={on?"bg-black rounded-[1px]":""}/>)}
      </div>
      {[["top-1.5 left-1.5"],["top-1.5 right-1.5"],["bottom-1.5 left-1.5"]].map(([cls],i) => (
        <div key={i} className={`absolute ${cls} w-6 h-6 bg-white`}><div className="w-full h-full border-[3px] border-black flex items-center justify-center"><div className="w-2 h-2 bg-black"/></div></div>
      ))}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" style={{top:"50%",filter:"drop-shadow(0 0 5px #e8b96b)"}}/>
    </div>
  );
}
function Eq() {
  return <div className="flex items-end gap-0.5 h-3">{[0,1,2,3].map(i=><span key={i} className="w-0.5 bg-ai-2 rounded-full" style={{height:`${30+(i*15)%70}%`,animation:`floaty ${.8+i*.2}s ease-in-out infinite`}}/>)}</div>;
}
