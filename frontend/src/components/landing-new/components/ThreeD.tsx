"use client";
/* =====================================================================
   3D-style SVG / CSS illustrations used throughout the page
   All done with pure SVG + CSS — no heavy libraries, fast inline build
   ===================================================================== */

/* ── Floating 3D Phone ── */
export function Phone3D({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: "800px" }}>
      {/* shadow */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full blur-xl bg-black/60" />
      <div
        className="relative w-full"
        style={{ transform: "rotateY(-8deg) rotateX(4deg)", transformStyle: "preserve-3d" }}
      >
        {/* Phone body */}
        <div className="relative rounded-[36px] bg-gradient-to-b from-[#1e1e2a] to-[#0d0d14] border border-white/10 overflow-hidden shadow-[0_30px_80px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)]">
          {/* edge highlight */}
          <div className="absolute inset-0 rounded-[36px] pointer-events-none" style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(255,255,255,0.03)" }} />
          {/* notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black z-10" />
          {/* status bar */}
          <div className="absolute top-0 inset-x-0 flex justify-between items-center px-7 pt-2 text-[9px] text-white/60 font-medium z-10">
            <span>9:41</span>
            <span>●●●● WiFi</span>
          </div>
          {/* screen content */}
          <div className="pt-10 pb-4 px-3 min-h-[420px]">
            {children}
          </div>
          {/* home indicator */}
          <div className="flex justify-center pb-3">
            <div className="w-24 h-1 rounded-full bg-white/30" />
          </div>
        </div>
        {/* side button */}
        <div className="absolute right-[-3px] top-20 w-[3px] h-12 rounded-r-full bg-gradient-to-b from-white/10 to-white/5" />
        <div className="absolute left-[-3px] top-16 w-[3px] h-8 rounded-l-full bg-gradient-to-b from-white/10 to-white/5" />
        <div className="absolute left-[-3px] top-28 w-[3px] h-8 rounded-l-full bg-gradient-to-b from-white/10 to-white/5" />
      </div>
    </div>
  );
}

/* ── 3D Dish / Plate ── */
export function Dish3D({ emoji, label, price, className = "" }: { emoji: string; label: string; price: string; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: "600px" }}>
      <div style={{ transform: "rotateX(12deg)", transformStyle: "preserve-3d" }} className="relative">
        {/* plate shadow */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-4 rounded-full blur-lg bg-black/70" />
        {/* plate rim */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.8)]" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white to-gray-100 shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)]" />
          <div className="absolute inset-0 flex items-center justify-center text-5xl">{emoji}</div>
        </div>
        {/* label card */}
        <div className="mt-3 glass-strong rounded-xl px-3 py-1.5 text-center mx-auto w-fit">
          <div className="text-xs text-cream/80">{label}</div>
          <div className="text-sm font-display text-gradient-gold">{price}</div>
        </div>
      </div>
    </div>
  );
}

/* ── 3D QR Code cube ── */
export function QRCube({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: "600px" }}>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-4 rounded-full blur-xl bg-gold/30" />
      <div style={{ transform: "rotateX(20deg) rotateY(-25deg)", transformStyle: "preserve-3d" }} className="relative w-28 h-28 mx-auto">
        {/* front */}
        <div className="absolute inset-0 bg-white rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <MiniQR />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/20 via-transparent to-transparent" />
        </div>
        {/* right side */}
        <div className="absolute top-2 -right-2 bottom-2 w-2 rounded-r-sm bg-gradient-to-b from-gray-200 to-gray-400" style={{ transform: "rotateY(90deg) translateZ(-8px)" }} />
        {/* bottom */}
        <div className="absolute -bottom-2 left-2 right-2 h-2 rounded-b-sm bg-gradient-to-r from-gray-300 to-gray-400" style={{ transform: "rotateX(-90deg) translateZ(-8px)" }} />
      </div>
    </div>
  );
}

function MiniQR() {
  const cells = Array.from({ length: 100 }, (_, i) => ((i * 53 + 7) % 9) > 4);
  return (
    <div className="grid grid-cols-10 gap-px w-full h-full">
      {cells.map((on, i) => <div key={i} className={on ? "bg-black rounded-[0.5px]" : ""} />)}
    </div>
  );
}

/* ── 3D Kitchen ticket ── */
export function KitchenTicket3D({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: "700px" }}>
      <div style={{ transform: "rotateX(8deg) rotateY(6deg)", transformStyle: "preserve-3d" }} className="relative">
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full blur-xl bg-black/60" />
        <div className="w-52 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          {/* ticket header */}
          <div className="bg-gradient-to-r from-orange to-red p-3 flex items-center justify-between">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider">Kitchen Order</div>
            <div className="text-[10px] text-white/80">#2041</div>
          </div>
          {/* ticket body */}
          <div className="bg-[#111118] p-3 space-y-2">
            {[["🍝 Truffle Pasta","×1"],["🥗 Caesar Salad","×2"],["☕ Iced Latte","×2"]].map(([n,q]) => (
              <div key={n} className="flex justify-between text-[11px]">
                <span className="text-cream/85">{n}</span>
                <span className="text-cream/50">{q}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-gold to-orange animate-[gradient-pan_2s_ease_infinite]" style={{ backgroundSize: "200% 200%" }} />
                </div>
                <span className="text-[10px] text-orange">Preparing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3D Analytics card ── */
export function Analytics3D({ className = "" }: { className?: string }) {
  const bars = [30,55,42,70,90,65,82,98,76,88,60,72];
  return (
    <div className={`relative ${className}`} style={{ perspective: "700px" }}>
      <div style={{ transform: "rotateX(8deg) rotateY(-8deg)", transformStyle: "preserve-3d" }} className="relative">
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-6 rounded-full blur-2xl bg-gold/25" />
        <div className="w-64 glass-strong rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-cream/70">Today's Revenue</span>
            <span className="text-[10px] text-emerald-300 font-mono">● LIVE</span>
          </div>
          <div className="font-display text-2xl text-gradient-gold">₹ 1,42,800</div>
          <div className="text-[10px] text-emerald-300 mt-0.5">▲ 28% vs yesterday</div>
          <div className="mt-3 flex items-end gap-0.5 h-16">
            {bars.map((h,i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-gold/40 to-gold" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3D floating orb / AI brain ── */
export function AIOrb({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* outer rings */}
      <div className="absolute w-full h-full rounded-full border border-ai-2/20 animate-spin-slow" style={{ animationDuration: "12s" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-ai-2/80" />
      </div>
      <div className="absolute w-3/4 h-3/4 rounded-full border border-gold/20 animate-spin-slow" style={{ animationDuration: "8s", animationDirection: "reverse" }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold/80" />
      </div>
      {/* glow */}
      <div className="absolute w-1/2 h-1/2 rounded-full bg-gradient-to-br from-ai-1/50 to-ai-2/50 blur-xl" />
      {/* core */}
      <div className="relative w-1/2 h-1/2 rounded-full bg-gradient-to-br from-ai-1 via-ai-2 to-purple-500 shadow-[0_0_40px_rgba(176,107,255,0.8),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 text-white" fill="currentColor">
          <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" />
        </svg>
      </div>
    </div>
  );
}

/* ── 3D Star/badge ── */
export function Badge3D({ children, accent = "gold", className = "" }: { children: React.ReactNode; accent?: "gold"|"ai"; className?: string }) {
  const bg = accent === "gold"
    ? "from-gold-bright via-gold to-orange"
    : "from-ai-1 via-ai-2 to-purple-500";
  return (
    <div className={`relative inline-flex ${className}`} style={{ perspective: "400px" }}>
      <div style={{ transform: "rotateX(10deg)" }} className={`relative rounded-2xl bg-gradient-to-br ${bg} px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.5)] text-black font-semibold text-sm`}>
        {children}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      <div className="absolute -bottom-2 left-2 right-2 h-3 rounded-b-xl bg-gradient-to-b from-black/40 to-black/0 blur-sm" />
    </div>
  );
}
