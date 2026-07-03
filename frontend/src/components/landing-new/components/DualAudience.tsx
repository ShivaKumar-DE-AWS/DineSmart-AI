"use client";
import { useEffect, useRef } from "react";
import { CheckIcon, SparkleIcon, QrIcon, BellIcon, ChefHatIcon, ChartIcon, BoltIcon, StarIcon } from "./Icons";
import { Phone3D, Dish3D, QRCube, KitchenTicket3D, Analytics3D, AIOrb, Badge3D } from "./ThreeD";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.classList.add("in"); }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ═══════════════════════════════════════════════════
   SECTION 1 — Customer Journey (what guests experience)
   ═══════════════════════════════════════════════════ */
export function CustomerJourney() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal py-16 sm:py-28 relative overflow-hidden">
      {/* ambient */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(106,123,255,0.5), transparent)" }} />

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        {/* header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] sm:text-xs uppercase tracking-widest text-ai-2 mb-4">
            <SparkleIcon className="w-3 h-3" /> For Guests
          </div>
          <h2 className="font-display text-[34px] leading-[1.05] sm:text-6xl tracking-tight">
            Dining that feels like <span className="italic text-gradient-ai">the future.</span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-lg text-cream/65 max-w-2xl mx-auto">
            No waiting. No confusion. No shouting across the room.
            Guests get a modern, personal experience from the moment they sit down.
          </p>
        </div>

        {/* Step 1 — QR Scan */}
        <CustomerStep
          stepNo="01"
          title="Scan. Menu opens instantly."
          desc="Guests point their camera at the QR on the table. The full menu — with photos, descriptions, and dietary tags — opens in 2 seconds. No app download. No login."
          guestBenefit="Zero friction. Works on any phone."
          visual={
            <div className="flex items-center justify-center gap-6 sm:gap-10 py-6">
              <QRCube className="animate-floaty" />
              <div className="flex flex-col gap-2">
                <div className="glass-strong rounded-2xl px-4 py-2.5 text-[12px] sm:text-sm text-cream/85 flex items-center gap-2 animate-floaty" style={{ animationDelay: "0.3s" }}>
                  <span className="text-base">📷</span> Scanning QR…
                </div>
                <div className="glass-strong rounded-2xl px-4 py-2.5 text-[12px] sm:text-sm text-emerald-300 flex items-center gap-2 animate-floaty" style={{ animationDelay: "0.6s" }}>
                  <CheckIcon className="w-3.5 h-3.5" /> Menu loaded!
                </div>
              </div>
              <Dish3D emoji="🍕" label="Wood-fire Pizza" price="₹ 480" className="animate-floaty-slow" />
            </div>
          }
          flip={false}
        />

        {/* Step 2 — AI Waiter */}
        <CustomerStep
          stepNo="02"
          title="AI Waiter helps you choose."
          desc="The built-in AI knows your menu inside out. It suggests based on what's popular, handles allergies, recommends pairings, and even upsells — politely, helpfully, just like a great waiter."
          guestBenefit="Personalised. Instant. Never pushy."
          visual={
            <div className="relative flex items-center justify-center py-6">
              <AIOrb className="w-36 h-36 sm:w-48 sm:h-48 animate-floaty-slow" />
              <div className="absolute right-0 sm:right-4 top-4 space-y-2 max-w-[200px]">
                <ChatBubble from="guest">I'm vegetarian. Any spicy dishes?</ChatBubble>
                <ChatBubble from="ai">Try our <b className="text-gold-bright">Paneer Tikka</b> 🌶️ — guests love it with garlic naan.</ChatBubble>
                <ChatBubble from="guest">Add 2 please!</ChatBubble>
                <ChatBubble from="ai">Done! ✓ Total so far: <b className="text-gold-bright">₹ 640</b></ChatBubble>
              </div>
            </div>
          }
          flip={true}
        />

        {/* Step 3 — Shared ordering */}
        <CustomerStep
          stepNo="03"
          title="Everyone orders together."
          desc="At a group table, everyone adds dishes to one shared cart at the same time. No one waits, no one misses out. Split the bill at the end with one tap."
          guestBenefit="No confusion. No arguments over the bill."
          visual={
            <div className="flex items-end justify-center gap-3 sm:gap-5 py-4">
              {["A","R","M"].map((l, i) => (
                <div key={l} className="w-20 sm:w-24 animate-floaty" style={{ animationDelay: `${i * 0.4}s` }}>
                  <Phone3D>
                    <div className="p-1 space-y-1.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange to-red flex items-center justify-center text-[10px] font-bold text-white">{l}</div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-white/10" />
                        <div className="h-2 rounded-full bg-white/10 w-3/4" />
                        <div className="h-2 rounded-full bg-gold/50 w-1/2" />
                      </div>
                    </div>
                  </Phone3D>
                </div>
              ))}
              <div className="glass-strong rounded-2xl p-3 text-center mb-4 animate-floaty-slow">
                <div className="text-[10px] text-cream/60">Shared cart</div>
                <div className="text-sm text-gradient-gold font-display">₹ 2,420</div>
                <div className="text-[9px] text-cream/50 mt-0.5">9 items</div>
              </div>
            </div>
          }
          flip={false}
        />

        {/* Step 4 — Track order */}
        <CustomerStep
          stepNo="04"
          title="Track your order live."
          desc="Guests see their order status in real time on their own phone. 'Preparing', 'Almost ready', 'Served'. No guessing. No awkwardly staring at the kitchen."
          guestBenefit="Total transparency. Zero anxiety."
          visual={
            <div className="flex items-center justify-center gap-4 sm:gap-8 py-6">
              <div className="w-36 sm:w-44 animate-floaty">
                <Phone3D>
                  <div className="px-1 space-y-2 pt-1">
                    <div className="text-[9px] text-cream/50">Order #2041</div>
                    {[
                      { s: "Received", done: true },
                      { s: "Preparing", done: true, active: true },
                      { s: "Ready", done: false },
                      { s: "Served", done: false },
                    ].map(({ s, done, active }) => (
                      <div key={s} className={`flex items-center gap-2 text-[10px] ${active ? "text-orange" : done ? "text-emerald-300" : "text-cream/40"}`}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${active ? "border-orange bg-orange/20" : done ? "border-emerald-400 bg-emerald-400/20" : "border-white/15"}`}>
                          {done && !active && <CheckIcon className="w-2.5 h-2.5" />}
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />}
                        </div>
                        {s}
                      </div>
                    ))}
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-1/2 bg-gradient-to-r from-gold to-orange" />
                    </div>
                  </div>
                </Phone3D>
              </div>
              <KitchenTicket3D className="animate-floaty-slow" />
            </div>
          }
          flip={true}
        />

        {/* Step 5 — Call waiter & Pay */}
        <CustomerStep
          stepNo="05"
          title="Need help? One tap."
          desc="Refill, extra napkins, the bill — one button. Guests never have to wave their arms or shout across a noisy restaurant again. And when ready to pay, they do it right from their phone."
          guestBenefit="Dignified. Fast. Modern."
          visual={
            <div className="flex items-center justify-center gap-6 sm:gap-10 py-6">
              <div className="flex flex-col items-center gap-3 animate-floaty">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gold/30 scale-150 animate-[pulse-ring_2s_ease-out_infinite]" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gold to-orange flex items-center justify-center shadow-[0_0_40px_rgba(232,185,107,0.5)]">
                    <BellIcon className="w-8 h-8 text-black" />
                  </div>
                </div>
                <div className="text-[11px] text-cream/70">Call Waiter</div>
              </div>
              <div className="space-y-2 animate-floaty-slow">
                <Badge3D accent="ai">Pay ₹ 1,240</Badge3D>
                <div className="text-center text-[10px] text-cream/50">Split equally?</div>
                <div className="flex gap-1.5">
                  <Badge3D accent="gold">Yes</Badge3D>
                  <div className="glass-strong rounded-2xl px-3 py-1.5 text-[11px] text-cream/70">No</div>
                </div>
              </div>
            </div>
          }
          flip={false}
        />
      </div>
    </section>
  );
}

function CustomerStep({ stepNo, title, desc, guestBenefit, visual, flip }: {
  stepNo: string; title: string; desc: string; guestBenefit: string; visual: React.ReactNode; flip: boolean;
}) {
  return (
    <div className={`flex flex-col ${flip ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 sm:gap-12 items-center mb-16 sm:mb-24`}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono text-cream/40 mb-2">{stepNo}</div>
        <h3 className="font-display text-[26px] sm:text-4xl tracking-tight leading-tight">{title}</h3>
        <p className="mt-3 text-[14px] sm:text-base text-cream/65 leading-relaxed">{desc}</p>
        <div className="mt-4 inline-flex items-center gap-2 glass-strong rounded-full px-3 py-2 text-[12px] sm:text-sm">
          <CheckIcon className="w-3.5 h-3.5 text-ai-2" />
          <span className="text-cream/85">{guestBenefit}</span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[200px] glass rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-ai-1/5 to-ai-2/5" />
        {visual}
      </div>
    </div>
  );
}

function ChatBubble({ children, from }: { children: React.ReactNode; from: "guest" | "ai" }) {
  return (
    <div className={`text-[11px] px-2.5 py-1.5 rounded-xl max-w-[160px] ${from === "ai" ? "bg-gradient-to-br from-ai-1/30 to-ai-2/30 border border-ai-2/30 text-cream ml-auto" : "bg-white/5 border border-white/10 text-cream/85"}`}>
      {from === "ai" && <div className="flex items-center gap-1 text-[9px] text-ai-2 mb-0.5"><SparkleIcon className="w-2 h-2" /> AI</div>}
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION 2 — Owner Benefits (what the owner gains)
   ═══════════════════════════════════════════════════ */
export function OwnerBenefits() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal py-16 sm:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(232,185,107,0.6), transparent)" }} />

      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] sm:text-xs uppercase tracking-widest text-gold mb-4">
            <ChartIcon className="w-3 h-3" /> For Restaurant Owners
          </div>
          <h2 className="font-display text-[34px] leading-[1.05] sm:text-6xl tracking-tight">
            More revenue. Less stress. <span className="italic text-gradient-gold">Every single day.</span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-lg text-cream/65 max-w-2xl mx-auto">
            SmartDine doesn't just digitise your restaurant — it makes it measurably more profitable.
            Here's exactly how.
          </p>
        </div>

        {/* Big bento grid of owner benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

          {/* Benefit 1 — Revenue */}
          <OwnerCard
            accent="gold"
            icon="📈"
            title="Revenue goes up — automatically."
            desc="The AI waiter suggests add-ons, upgrades, and desserts on every single order. Restaurants see an average 28–32% revenue increase in the first month."
            stat="+32%"
            statLabel="avg monthly revenue lift"
            visual={<Analytics3D className="mt-4" />}
            wide
          />

          {/* Benefit 2 — Kitchen */}
          <OwnerCard
            accent="orange"
            icon="👨‍🍳"
            title="Your kitchen runs like a machine."
            desc="Live digital tickets replace shouted orders and paper slips. Chefs tap to update status. Zero mistakes. Twice as fast."
            stat="2×"
            statLabel="faster order processing"
            visual={<KitchenTicket3D className="mt-4" />}
          />

          {/* Benefit 3 — Table turnover */}
          <OwnerCard
            accent="ai"
            icon="🔄"
            title="Tables turn over faster."
            desc="Instant ordering, live tracking, and one-tap payments mean guests spend less time waiting and more time enjoying. More guests served per shift."
            stat="30%"
            statLabel="more tables served daily"
          />

          {/* Benefit 4 — No staff chaos */}
          <OwnerCard
            accent="gold"
            icon="😌"
            title="Staff work smarter, not harder."
            desc="Waiters get silent digital alerts instead of frantic shouts. They focus on hospitality, not running with paper orders. Happier staff, lower turnover."
            stat="60%"
            statLabel="less staff running around"
          />

          {/* Benefit 5 — Analytics */}
          <OwnerCard
            accent="ai"
            icon="🧠"
            title="You finally know what's working."
            desc="Live dashboards show your top dishes, peak hours, staff performance, and revenue — per day, per week, per table. Make decisions with data, not guesses."
            stat="100%"
            statLabel="data-backed decisions"
            wide
          />

          {/* Benefit 6 — QR Menus */}
          <OwnerCard
            accent="orange"
            icon="📱"
            title="No more printing menus."
            desc="Update prices, add daily specials, hide sold-out items in seconds — from your phone. Save thousands on reprints every year."
            stat="₹50k+"
            statLabel="saved on printing annually"
            visual={<QRCube className="mt-4 mx-auto" />}
          />

          {/* Benefit 7 — Reservations */}
          <OwnerCard
            accent="gold"
            icon="📅"
            title="Bookings, organised."
            desc="Online reservations, walk-in management, and a weekly calendar in one screen. No more double-bookings or missed calls."
            stat="40%"
            statLabel="higher table utilisation"
          />

          {/* Benefit 8 — Multi-branch */}
          <OwnerCard
            accent="ai"
            icon="🌐"
            title="Scale as big as you dream."
            desc="Run one café or 50 outlets from one console. Custom branding, per-branch analytics, and role-based staff access — built for growth."
            stat="50+"
            statLabel="outlets, one login"
            wide
          />
        </div>
      </div>
    </section>
  );
}

function OwnerCard({ accent, icon, title, desc, stat, statLabel, visual, wide }: {
  accent: "gold"|"orange"|"ai"; icon: string; title: string; desc: string;
  stat: string; statLabel: string; visual?: React.ReactNode; wide?: boolean;
}) {
  const accentClasses = {
    gold: { glow: "from-gold/20 to-orange/10", border: "border-gold/20", stat: "text-gradient-gold" },
    orange: { glow: "from-orange/20 to-red/10", border: "border-orange/20", stat: "text-orange" },
    ai: { glow: "from-ai-1/20 to-ai-2/10", border: "border-ai-2/20", stat: "text-gradient-ai" },
  }[accent];

  return (
    <div className={`${wide ? "sm:col-span-2 lg:col-span-2" : ""} glass rounded-3xl p-5 sm:p-6 hover-lift relative overflow-hidden border ${accentClasses.border} group`}>
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${accentClasses.glow} blur-2xl opacity-70 group-hover:opacity-100 transition`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="text-3xl">{icon}</div>
          <div className="text-right shrink-0">
            <div className={`font-display text-2xl sm:text-3xl ${accentClasses.stat}`}>{stat}</div>
            <div className="text-[9px] sm:text-[10px] text-cream/50 uppercase tracking-wider mt-0.5">{statLabel}</div>
          </div>
        </div>
        <h3 className="font-display text-lg sm:text-xl mt-4 leading-snug">{title}</h3>
        <p className="mt-2 text-[13px] sm:text-sm text-cream/65 leading-relaxed">{desc}</p>
        {visual && <div className="relative">{visual}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION 3 — Side-by-side dual view
   ═══════════════════════════════════════════════════ */
export function DualView() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal py-16 sm:py-28 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <h2 className="font-display text-[34px] leading-[1.05] sm:text-6xl tracking-tight">
            Same moment. <span className="italic text-gradient-gold">Two happy people.</span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-base text-cream/65">
            When a guest orders through SmartDine, magic happens for both sides simultaneously.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Guest side */}
          <div className="glass rounded-3xl p-5 sm:p-7 relative overflow-hidden border border-ai-2/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-ai-2/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ai-1 to-ai-2 flex items-center justify-center text-white text-sm">👤</div>
                <div>
                  <div className="text-xs text-ai-2 uppercase tracking-widest">Guest Experience</div>
                  <div className="text-sm text-cream">Aarav at Table 7</div>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  ["Scanned QR in 2 seconds","Opened full menu with photos"],
                  ["AI helped pick the perfect dish","Based on his veggie preference"],
                  ["Ordered with group","Everyone added together"],
                  ["Tracked order live","Knew exactly when food was coming"],
                  ["Called for water with one tap","No arm-waving required"],
                  ["Paid from his phone","Split it with friends instantly"],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-start gap-3">
                    <CheckIcon className="w-4 h-4 text-ai-2 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[13px] sm:text-sm text-cream">{a}</div>
                      <div className="text-[11px] sm:text-xs text-cream/50">{b}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 rounded-2xl bg-ai-2/10 border border-ai-2/20">
                <div className="flex gap-0.5 text-ai-2 mb-1">
                  {Array.from({length:5}).map((_,i) => <StarIcon key={i} className="w-3.5 h-3.5" />)}
                </div>
                <div className="text-[13px] text-cream/85 italic">"The smoothest restaurant experience I've ever had. I'll definitely be back."</div>
              </div>
            </div>
          </div>

          {/* Owner side */}
          <div className="glass rounded-3xl p-5 sm:p-7 relative overflow-hidden border border-gold/20">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gold/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-orange flex items-center justify-center text-white text-sm">🏪</div>
                <div>
                  <div className="text-xs text-gold uppercase tracking-widest">Owner Experience</div>
                  <div className="text-sm text-cream">Priya at Saffron House</div>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  ["Zero paper orders today","Kitchen was calm all evening"],
                  ["AI upsold desserts on 68% of tables","₹ 4,800 extra revenue"],
                  ["Table turnover up 30%","Served 22 more guests vs last week"],
                  ["Not a single wrong order","Zero complaints, zero waste"],
                  ["Staff had time for real service","Guest satisfaction scores up"],
                  ["Live revenue on phone all night","Watched business grow in real time"],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-start gap-3">
                    <CheckIcon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[13px] sm:text-sm text-cream">{a}</div>
                      <div className="text-[11px] sm:text-xs text-cream/50">{b}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[["₹1.42L","Today's revenue"],["312","Orders"],["4.9★","Rating"]].map(([v,l]) => (
                  <div key={l} className="rounded-xl bg-black/30 border border-white/5 p-2.5 text-center">
                    <div className="font-display text-lg text-gradient-gold">{v}</div>
                    <div className="text-[9px] text-cream/50 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION 4 — 3D Feature spotlight (the full loop)
   ═══════════════════════════════════════════════════ */
export function ThreeDShowcase() {
  const ref = useReveal<HTMLElement>();
  const items = [
    {
      icon: <QrIcon className="w-6 h-6" />,
      title: "QR Menu",
      body: "Beautiful digital menu. Update anytime. Works on every phone.",
      visual: <QRCube className="mx-auto mt-2" />,
      glow: "from-gold/25 to-orange/15",
      border: "border-gold/25",
    },
    {
      icon: <SparkleIcon className="w-6 h-6" />,
      title: "AI Waiter",
      body: "Smart recommendations. Upselling on autopilot. Never off duty.",
      visual: <AIOrb className="w-28 h-28 mx-auto mt-2" />,
      glow: "from-ai-1/25 to-ai-2/15",
      border: "border-ai-2/25",
    },
    {
      icon: <ChefHatIcon className="w-6 h-6" />,
      title: "Live Kitchen",
      body: "Digital tickets. Real-time status. Calmer chefs.",
      visual: <KitchenTicket3D className="mx-auto mt-2" />,
      glow: "from-orange/25 to-red/15",
      border: "border-orange/25",
    },
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: "Order Tracking",
      body: "Guests track live. No 'when is my food coming?' ever again.",
      visual: (
        <div className="mt-3 space-y-1.5">
          {[["Received","✓ done",true],["Preparing","● active",false,true],["Ready","○ next",false],["Served","○",false]].map(([s,d,done,active]) => (
            <div key={s as string} className={`flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg ${(active as boolean) ? "bg-orange/20 text-orange" : (done as boolean) ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-cream/40"}`}>
              <span>{s}</span><span>{d}</span>
            </div>
          ))}
        </div>
      ),
      glow: "from-gold/25 to-ai-1/15",
      border: "border-gold/25",
    },
    {
      icon: <BellIcon className="w-6 h-6" />,
      title: "Waiter Call",
      body: "One tap. Right staff. Instantly notified. Silently.",
      visual: (
        <div className="flex justify-center mt-3 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-gold/30 animate-[pulse-ring_2s_ease-out_infinite]" />
          </div>
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gold to-orange flex items-center justify-center shadow-[0_0_30px_rgba(232,185,107,0.5)]">
            <BellIcon className="w-7 h-7 text-black" />
          </div>
        </div>
      ),
      glow: "from-gold/25 to-orange/15",
      border: "border-gold/25",
    },
    {
      icon: <ChartIcon className="w-6 h-6" />,
      title: "Analytics",
      body: "Revenue, top dishes, peak hours — all live on your phone.",
      visual: <Analytics3D className="mx-auto mt-2 scale-75 origin-top" />,
      glow: "from-emerald-400/20 to-gold/15",
      border: "border-emerald-400/20",
    },
  ];

  return (
    <section ref={ref} className="reveal py-16 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-display text-[34px] leading-[1.05] sm:text-6xl tracking-tight">
            Every tool your restaurant <span className="italic text-gradient-gold">needs.</span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-base text-cream/65">One system. Zero learning curve.</p>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-3">
            {items.map((f, i) => (
              <ShowcaseCard key={i} {...f} />
            ))}
            <div className="shrink-0 w-1" />
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((f, i) => (
            <ShowcaseCard key={i} {...f} desktop />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({ icon, title, body, visual, glow, border, desktop }: {
  icon: React.ReactNode; title: string; body: string; visual: React.ReactNode;
  glow: string; border: string; desktop?: boolean;
}) {
  return (
    <div className={`snap-center shrink-0 ${desktop ? "" : "w-[72vw] max-w-[280px]"} glass rounded-3xl p-5 sm:p-6 relative overflow-hidden hover-lift border ${border} group`}>
      <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br ${glow} blur-2xl opacity-60 group-hover:opacity-100 transition`} />
      <div className="relative">
        <div className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center text-gold mb-4">{icon}</div>
        <div className="font-display text-xl sm:text-2xl">{title}</div>
        <p className="mt-1.5 text-[13px] sm:text-sm text-cream/65 leading-relaxed">{body}</p>
        <div className="min-h-[80px]">{visual}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION 5 — Staff benefits
   ═══════════════════════════════════════════════════ */
export function StaffBenefits() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal py-12 sm:py-20 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden border border-white/8">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-ai-2/5" />
          <div className="relative grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest text-cream/70 mb-4">
                👨‍🍳 For Your Team
              </div>
              <h2 className="font-display text-[28px] sm:text-5xl tracking-tight leading-tight">
                Happier staff = <span className="italic text-gradient-gold">better service.</span>
              </h2>
              <p className="mt-3 text-[14px] sm:text-base text-cream/65 max-w-xl">
                When your team isn't running paper orders and shouting across the kitchen, they can actually focus on what they're great at — hospitality.
              </p>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {[
                  ["Silent alerts instead of shouting","Staff get pinged, not stressed"],
                  ["One dashboard for everything","Orders, tables, billing — one screen"],
                  ["No more handwriting orders","Zero mistakes, zero reprints"],
                  ["Easy onboarding","Ready in 30 minutes. Really."],
                ].map(([t, d]) => (
                  <div key={t} className="glass rounded-2xl p-3.5">
                    <div className="text-[13px] sm:text-sm text-cream font-medium">{t}</div>
                    <div className="text-[11px] sm:text-xs text-cream/55 mt-1">{d}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold/20 to-orange/20 border border-gold/30 flex items-center justify-center text-6xl animate-floaty">
                  😊
                </div>
                <Badge3D accent="gold" className="absolute -bottom-2 -right-2">Happy staff</Badge3D>
              </div>
              <div className="text-center glass-strong rounded-2xl px-4 py-3">
                <div className="font-display text-2xl text-gradient-gold">-60%</div>
                <div className="text-[10px] text-cream/55 uppercase tracking-wider">less chaos per shift</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
