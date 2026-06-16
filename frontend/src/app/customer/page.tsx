"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Star, Timer, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CustomerHome() {
  return (
    <div>
      {/* HERO */}
      <section className="relative px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-16 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-7xl mx-auto">
          <div className="lg:col-span-7 animate-fade-up">
            <Badge variant="clay" className="mb-6" data-testid="hero-tag">Now serving — AI Waiter</Badge>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight" data-testid="customer-hero-title">
              Hungry?<br />
              <span className="italic font-light text-clay">Talk to us</span>,<br />
              we'll handle the rest.
            </h1>
            <p className="mt-8 text-lg text-stone max-w-xl leading-relaxed">
              Browse a hand-crafted menu, get recommendations from our AI sommelier, pay in seconds and watch your order race through our kitchen — live.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/customer/menu" data-testid="hero-see-menu" className="inline-flex items-center gap-2 bg-ink text-cream rounded-full px-7 py-3.5 text-sm font-medium hover:bg-ink/85 transition">
                Browse the menu <ArrowRight className="h-4 w-4" />
              </Link>
              <button data-testid="hero-ask-ai" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-waiter"))} className="inline-flex items-center gap-2 border border-ink/20 text-ink rounded-full px-7 py-3.5 text-sm font-medium hover:bg-ink/5 transition">
                <Sparkles className="h-4 w-4" /> Ask the AI Waiter
              </button>
            </div>
            <div className="mt-12 flex flex-wrap gap-8 text-sm">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-clay" /> 4.8 · 2,400+ reviews</div>
              <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-clay" /> Avg ready in 12 min</div>
              <div className="flex items-center gap-2"><Award className="h-4 w-4 text-clay" /> Chef-curated</div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-cover bg-center shadow-2xl" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85)" }} />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-xl border border-bone max-w-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-clay flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-heading font-semibold leading-tight">SmartWaiter</div>
                  <div className="text-xs text-stone">always at your table</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink/80 leading-relaxed">"Pairing tonight? The truffle pizza loves a yuzu lemonade — trust me."</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 md:px-12 lg:px-20 py-20 max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl tracking-tight mb-12">From craving to plate — in four taps.</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { n: "01", t: "Browse", d: "Visual menu with prep times and tags." },
            { n: "02", t: "Ask", d: "Chat with the AI sommelier for picks." },
            { n: "03", t: "Pay", d: "One-tap checkout, instant token." },
            { n: "04", t: "Track", d: "Watch your token across the kitchen." },
          ].map((s) => (
            <div key={s.n} className="border border-bone rounded-2xl p-7 bg-white hover:border-clay transition" data-testid={`step-${s.n}`}>
              <div className="font-mono text-clay text-sm tracking-wider">{s.n}</div>
              <div className="font-heading text-2xl mt-3 tracking-tight">{s.t}</div>
              <p className="text-stone mt-2 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/customer/menu" data-testid="bottom-menu-cta" className="inline-flex items-center gap-2 bg-clay text-white rounded-full px-8 py-4 text-base font-medium hover:bg-clay-dark transition">
            See full menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
