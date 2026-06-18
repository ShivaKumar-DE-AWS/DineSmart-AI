import Link from "next/link";
import { ChefHat, Monitor, Utensils, BarChart3, ArrowUpRight, Sparkles } from "lucide-react";

export default function Home() {
  const portals = [
    { href: "/r/mehfil-hyderabad", label: "Customer", desc: "Order, talk to the AI waiter, track your token in realtime.", icon: Utensils, accent: "bg-clay", testid: "portal-customer" },
    { href: "/admin", label: "Restaurant", desc: "Dashboard, revenue, inventory, menu and customer analytics.", icon: BarChart3, accent: "bg-sage", testid: "portal-admin" },
    { href: "/kitchen", label: "Kitchen", desc: "Live order queue, timers, one-tap status updates.", icon: ChefHat, accent: "bg-ink", testid: "portal-kitchen" },
    { href: "/counter", label: "Counter", desc: "Big-screen token board for guests picking up orders.", icon: Monitor, accent: "bg-clay-dark", testid: "portal-counter" },
  ];
  return (
    <div className="min-h-screen bg-cream bg-grain">
      <header className="px-6 md:px-12 lg:px-24 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-heading font-semibold tracking-tight">SmartDine<span className="text-clay">.</span>AI</span>
        </div>
        <Link href="/r/mehfil-hyderabad" className="text-sm font-medium hover:text-clay" data-testid="header-enter-link">
          Enter Restaurant →
        </Link>
      </header>

      <section className="px-6 md:px-12 lg:px-24 pt-20 pb-16 max-w-6xl">
        <p className="uppercase tracking-[0.3em] text-xs text-stone mb-6 animate-fade-up">A unified operating system for restaurants</p>
        <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight animate-fade-up" data-testid="hero-title">
          Dining,<br />
          <span className="italic font-light text-clay">re-imagined</span><br />
          with AI.
        </h1>
        <p className="mt-8 text-lg text-stone max-w-2xl leading-relaxed animate-fade-up">
          One platform. Four portals. From the moment a guest scans a QR to the second a kitchen ticket clears — SmartDine connects every step with an AI sommelier-waiter at its heart.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/r/mehfil-hyderabad" data-testid="hero-cta-customer" className="inline-flex items-center gap-2 bg-ink text-cream rounded-full px-7 py-3.5 text-sm font-medium hover:bg-ink/85 transition">
            Start as a guest <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/auth/login" data-testid="hero-cta-staff" className="inline-flex items-center gap-2 border border-ink/20 text-ink rounded-full px-7 py-3.5 text-sm font-medium hover:bg-ink/5 transition">
            Staff login
          </Link>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <h2 className="font-heading text-3xl md:text-4xl mb-10 tracking-tight">Four portals, one heartbeat.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.href} href={p.href} data-testid={p.testid} className="group relative overflow-hidden rounded-3xl border border-bone bg-white p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`absolute -top-12 -right-12 h-40 w-40 ${p.accent} opacity-10 rounded-full group-hover:opacity-20 transition`} />
                <div className={`${p.accent} h-12 w-12 rounded-2xl flex items-center justify-center mb-6`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="font-heading text-2xl tracking-tight">{p.label} Portal</h3>
                    <p className="text-stone mt-2 max-w-sm">{p.desc}</p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-stone group-hover:text-clay group-hover:-translate-y-1 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-bone px-6 md:px-12 lg:px-24 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-stone">
        <div>© 2026 SmartDine AI — Powered by Claude Sonnet 4.5</div>
        <div className="flex gap-6">
          <Link href="/r/mehfil-hyderabad" className="hover:text-ink">Order</Link>
          <Link href="/admin" className="hover:text-ink">Admin</Link>
          <Link href="/kitchen" className="hover:text-ink">Kitchen</Link>
          <Link href="/counter" className="hover:text-ink">Counter</Link>
        </div>
      </footer>
    </div>
  );
}
