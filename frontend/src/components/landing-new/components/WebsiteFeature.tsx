"use client";
import { useState } from "react";
import { ArrowRight, CheckIcon, SparkleIcon, GlobeIcon, QrIcon, BoltIcon } from "./Icons";

/**
 * "Build a website for your restaurant" feature section
 * Mobile-optimized with touch-friendly inputs and responsive preview
 */
export default function WebsiteFeature() {
  const [name, setName] = useState("saffronhouse");
  const domain = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "yourrestaurant";

  return (
    <section className="py-14 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[700px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(closest-side, rgba(232,185,107,0.6), transparent 70%)" }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Heading - mobile optimized */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-widest text-gold mb-3">
            <GlobeIcon className="w-3 h-3" /> FREE BRANDED WEBSITE
          </div>
          <h2 className="font-display text-[28px] sm:text-5xl md:text-6xl leading-tight tracking-tight">
            Build a website for your restaurant.
            <br />
            <span className="italic text-gradient-gold">With your name as the domain.</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-base text-cream/70 max-w-xl mx-auto leading-relaxed">
            Get a beautiful, mobile-ready website at <b className="text-cream break-all">{domain}.smartdine.co.in</b> —
            free with every plan.
          </p>
        </div>

        {/* Mobile: stack vertically, Desktop: side by side */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-12 items-center">
          {/* Left: Domain picker + features */}
          <div className="space-y-4 sm:space-y-5 order-2 lg:order-1">
            {/* Domain input - larger touch target for mobile */}
            <div className="card-solid rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gold/30">
              <label className="text-[10px] sm:text-[11px] uppercase tracking-widest text-cream/50 block mb-2">
                Your restaurant name
              </label>
              <div className="flex items-stretch gap-0 rounded-xl sm:rounded-2xl overflow-hidden bg-black/40 border border-white/10 focus-within:border-gold/50 transition">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="saffronhouse"
                  maxLength={24}
                  className="flex-1 bg-transparent px-3 sm:px-4 py-3 text-cream placeholder:text-cream/30 outline-none text-base sm:text-lg min-w-0"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                />
                <div className="flex items-center px-2 sm:px-3 text-cream/50 text-[11px] sm:text-sm bg-black/20 whitespace-nowrap">
                  .smartdine.co.in
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-emerald-300 flex items-center gap-1">
                  <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Available!
                </span>
                <span className="text-cream/40">{domain.length}/24</span>
              </div>
            </div>

            {/* Features list - 2 columns on mobile, compact */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { e: "🎨", t: "Branded design", s: "Your style" },
                { e: "🍽️", t: "Digital menu", s: "Photos & prices" },
                { e: "📅", t: "Reservations", s: "2-tap booking" },
                { e: "⭐", t: "Reviews", s: "Social proof" },
                { e: "📸", t: "Gallery", s: "Best dishes" },
                { e: "⚡", t: "Fast mobile", s: "Any phone" },
              ].map(f => (
                <div key={f.t} className="glass rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5">
                  <div className="text-lg sm:text-xl mb-1">{f.e}</div>
                  <div className="text-[11px] sm:text-[13px] font-medium text-cream leading-tight">{f.t}</div>
                  <div className="text-[9px] sm:text-[11px] text-cream/55 mt-0.5">{f.s}</div>
                </div>
              ))}
            </div>

            {/* Free & included CTA - stacked on mobile */}
            <div className="card-solid rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gold/30">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gold to-orange flex items-center justify-center shrink-0">
                  <SparkleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] sm:text-sm font-medium text-cream">Included free with every plan</div>
                  <div className="text-[11px] sm:text-[13px] text-cream/60">
                    We build it in 10 minutes
                  </div>
                </div>
              </div>
              <a href="/auth/restaurant?tab=register" className="btn-primary w-full justify-center mt-3 sm:mt-4 !py-3 text-sm sm:text-base">
                Claim my domain <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Browser preview - mobile first */}
          <div className="relative order-1 lg:order-2">
            {/* Mobile: full width, no rotation for better readability */}
            <div className="sm:rotate-1 sm:hover:rotate-0 transition-transform duration-500">
              <BrowserMockup domain={`${domain}.smartdine.co.in`} />
            </div>

            {/* Floating badges - repositioned for mobile */}
            <div className="absolute -bottom-3 left-2 sm:-bottom-6 sm:-left-6 card-solid rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-3 border border-emerald-400/40 shadow-xl flex items-center gap-1.5 sm:gap-2 max-w-[160px] sm:max-w-none">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-xs sm:text-sm shrink-0">⚡</div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[12px] text-cream font-medium leading-tight truncate">Live in minutes</div>
                <div className="text-[8px] sm:text-[10px] text-cream/50 leading-tight truncate">We set it up</div>
              </div>
            </div>
            <div className="absolute -top-3 right-2 sm:-top-6 sm:-right-6 card-solid rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-3 border border-gold/40 shadow-xl flex items-center gap-1.5 sm:gap-2 max-w-[160px] sm:max-w-none">
              <QrIcon className="w-4 h-4 sm:w-6 sm:h-6 text-gold shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[12px] text-cream font-medium leading-tight truncate">QR menu linked</div>
                <div className="text-[8px] sm:text-[10px] text-cream/50 leading-tight truncate">One presence</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrowserMockup({ domain }: { domain: string }) {
  return (
    <div className="card-solid rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/15">
      {/* Browser top bar - mobile optimized */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-black/40 border-b border-white/5">
        <div className="flex gap-1">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red/70" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gold/70" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 text-[9px] sm:text-[11px] text-cream/70 font-mono max-w-full truncate">
            <BoltIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{domain}</span>
          </div>
        </div>
        <div className="w-5 sm:w-6" />
      </div>

      {/* Fake website content - mobile optimized */}
      <div className="relative bg-gradient-to-b from-[#120c08] to-[#08080c] px-3 sm:px-4 py-4 sm:p-7 min-h-[320px] sm:min-h-[460px]">
        {/* Hero restaurant mock */}
        <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gold to-orange" />
          <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-gold truncate">{domain.split(".")[0]}</div>
        </div>
        
        {/* Hero image placeholder */}
        <div className="h-20 sm:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange/30 via-red/20 to-gold/30 flex items-center justify-center text-3xl sm:text-4xl mb-3 sm:mb-4 relative overflow-hidden">
          <span className="absolute top-1.5 left-2 text-[8px] sm:text-[9px] text-white/80 font-medium px-1.5 py-0.5 rounded-full bg-black/40 whitespace-nowrap">● DINE-IN · TAKEAWAY</span>
          <span>🍛</span>
        </div>
        
        <h3 className="font-display text-lg sm:text-2xl leading-tight mb-1">Authentic flavours. Modern experience.</h3>
        <p className="text-[10px] sm:text-[13px] text-cream/60 mb-3 sm:mb-4 leading-snug line-clamp-2 sm:line-clamp-none">
          Award-winning North Indian cuisine. Scan to order or book your table instantly.
        </p>
        
        {/* CTAs - larger touch targets on mobile */}
        <div className="flex gap-2 mb-4 sm:mb-5">
          <button className="flex-1 rounded-full bg-gradient-to-r from-gold to-orange text-black text-[11px] sm:text-sm font-semibold py-2 sm:py-2.5 text-center active:scale-95 transition">
            Book a Table
          </button>
          <button className="flex-1 rounded-full glass border border-white/15 text-cream text-[11px] sm:text-sm font-medium py-2 sm:py-2.5 text-center active:scale-95 transition">
            View Menu
          </button>
        </div>
        
        {/* Mini dishes row - compact on mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            ["🍛", "Butter Chicken", "₹480"],
            ["🫓", "Garlic Naan", "₹120"],
            ["🍮", "Gulab Jamun", "₹180"],
          ].map(([e, n, p]) => (
            <div key={n} className="bg-white/5 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-center border border-white/5">
              <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{e}</div>
              <div className="text-[9px] sm:text-[10px] text-cream truncate">{n}</div>
              <div className="text-[9px] sm:text-[10px] text-gold">{p}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
