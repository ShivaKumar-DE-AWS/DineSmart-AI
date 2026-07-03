"use client";
import { CheckIcon, BoltIcon, ShieldIcon, CalendarIcon, BellIcon } from "./Icons";
import { ArrowRight } from "./Icons";

/**
 * "Get onboarded in a few clicks within 10 minutes"
 * - No documentation
 * - No follow-ups
 * - Zero paperwork
 */
export default function OnboardSection() {
  const steps = [
    {
      n: "01",
      icon: "📱",
      title: "Click 'Start free'",
      desc: "Enter your phone & restaurant name. That's it.",
      time: "1 min",
    },
    {
      n: "02",
      icon: "✨",
      title: "We set up everything",
      desc: "Our team builds your menu, QR codes & branded website — you just confirm.",
      time: "8 min",
    },
    {
      n: "03",
      icon: "🚀",
      title: "You go live",
      desc: "Start taking orders the same day. Zero paperwork. Zero training.",
      time: "1 min",
    },
  ];

  const promises = [
    { icon: <BoltIcon className="w-4 h-4" />, t: "Ready in 10 minutes", s: "From click to live orders" },
    { icon: <ShieldIcon className="w-4 h-4" />, t: "Zero documentation", s: "No lengthy forms. No contracts." },
    { icon: <BellIcon className="w-4 h-4" />, t: "No follow-up calls", s: "We don't spam you. It just works." },
    { icon: <CalendarIcon className="w-4 h-4" />, t: "We build it for you", s: "You don't have to set anything up." },
  ];

  return (
    <section className="py-16 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(closest-side, rgba(232,185,107,0.6), transparent 70%)" }} />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 card-solid rounded-full px-4 py-2 text-[11px] uppercase tracking-widest text-gold mb-4 border border-gold/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ONBOARDING
          </div>
          <h2 className="font-display text-[34px] sm:text-5xl md:text-6xl leading-tight tracking-tight">
            A few clicks.
            <br />
            <span className="italic text-gradient-gold">Live in 10 minutes.</span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-base text-cream/70 max-w-lg mx-auto leading-relaxed">
            No paperwork. No 50-page documentation. No endless follow-up calls.
            We do the setup for you. You just open your doors and start earning more.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line (desktop) */}
          <div className="hidden sm:block absolute top-14 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 relative">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                <div className="card-solid rounded-3xl p-5 sm:p-6 text-center border border-white/10 hover:border-gold/40 transition-all hover-lift">
                  <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gold to-orange flex items-center justify-center text-2xl sm:text-3xl shadow-lg mb-4">
                    {s.icon}
                    <span className="absolute -top-2 -right-2 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black text-cream border border-white/15">{s.time}</span>
                  </div>
                  <div className="text-[10px] font-mono text-cream/40 mb-1">{s.n}</div>
                  <h3 className="font-display text-lg sm:text-xl leading-tight mb-2">{s.title}</h3>
                  <p className="text-[12px] sm:text-[13px] text-cream/60 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:flex absolute top-14 -right-3 w-6 h-6 rounded-full bg-gold/20 border border-gold/40 items-center justify-center z-10">
                    <span className="text-gold text-[10px]">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Promise pills grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8 sm:mt-12">
          {promises.map(p => (
            <div key={p.t} className="card-solid rounded-2xl p-4 border border-white/10 hover:border-gold/30 transition">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-2.5">
                {p.icon}
              </div>
              <div className="text-[13px] sm:text-sm font-medium text-cream leading-tight">{p.t}</div>
              <div className="text-[10px] sm:text-[11px] text-cream/55 mt-0.5 leading-snug">{p.s}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 sm:mt-14 max-w-2xl mx-auto card-solid rounded-3xl p-6 sm:p-8 border-2 border-gold/40 shadow-[0_30px_80px_-20px_rgba(232,185,107,0.4)] text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
            {["No forms", "No docs", "No calls", "No credit card"].map(x => (
              <span key={x} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-300 bg-emerald-300/10 border border-emerald-300/30 rounded-full px-2.5 py-1">
                <CheckIcon className="w-3 h-3" /> {x}
              </span>
            ))}
          </div>
          <h3 className="font-display text-2xl sm:text-4xl leading-tight mb-2">
            Start your <span className="italic text-gradient-gold">10-minute setup</span> now
          </h3>
          <p className="text-[13px] sm:text-sm text-cream/70 mb-6 max-w-md mx-auto">
            We'll contact you on WhatsApp and build everything while you sip a chai.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md mx-auto">
            <a href="/auth/restaurant" className="btn-primary justify-center flex-1 py-4 text-base">
              Start free setup <ArrowRight className="w-4 h-4" />
            </a>
            <a href="https://wa.me/918333871783?text=Hi!%20I%20want%20to%20start%20my%2010-minute%20SmartDine%20setup" target="_blank" rel="noopener noreferrer"
              className="btn-ghost justify-center flex-1 py-4 text-base">
              💬 Chat on WhatsApp
            </a>
          </div>
          <p className="mt-4 text-[11px] text-cream/40">
            You're never locked in. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
