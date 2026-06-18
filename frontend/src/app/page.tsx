import Link from "next/link";
import { ChefHat, Monitor, Utensils, BarChart3, ArrowUpRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function Home() {
  const features = [
    { label: "AI Sommelier-Waiter", desc: "Guests order via QR code and chat with an AI that understands preferences, upsells smartly, and handles complex dietary requirements." },
    { label: "Unified POS & Dashboard", desc: "Owners get a bird's-eye view of revenue, inventory, active tables, and staff performance in real time." },
    { label: "Kitchen Display System", desc: "Live order queue with timers, ingredient breakdown, and one-tap status updates that sync directly to guests." },
    { label: "Multi-Tenant Architecture", desc: "Manage multiple restaurant branches with ease. Each tenant gets their own isolated workspace and custom URL." },
  ];

  return (
    <div className="min-h-screen bg-cream bg-grain selection:bg-clay/20">
      <header className="px-6 md:px-12 lg:px-24 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-2" data-testid="brand-logo">
          <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center shadow-lg shadow-clay/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-heading font-semibold tracking-tight">SmartDine<span className="text-clay">.</span>AI</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/auth/login" className="text-sm font-medium hover:text-clay hidden sm:block transition">
            Staff Login
          </Link>
          <Link href="/auth/login" className="bg-ink text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-ink/80 transition shadow-lg shadow-ink/10">
            Create your Restaurant
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 md:px-12 lg:px-24 pt-24 pb-20 max-w-7xl mx-auto text-center sm:text-left flex flex-col sm:flex-row items-center gap-12">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-clay/10 text-clay text-sm font-medium mb-8 animate-fade-up">
            <Sparkles className="h-4 w-4" /> Now open for all restaurants
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight animate-fade-up delay-75" data-testid="hero-title">
            Dining,<br />
            <span className="italic font-light text-clay">re-imagined</span><br />
            with AI.
          </h1>
          <p className="mt-8 text-lg text-stone max-w-xl leading-relaxed animate-fade-up delay-150 mx-auto sm:mx-0">
            The unified operating system for modern restaurants. From AI-driven guest ordering to real-time kitchen syncing and revenue analytics.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center sm:justify-start animate-fade-up delay-200">
            <Link href="/auth/login" className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark text-white rounded-full px-8 py-4 font-medium transition shadow-xl shadow-clay/20">
              Start 14-Day Free Trial <ArrowUpRight className="h-5 w-5" />
            </Link>
            <Link href="/r/mehfil-hyderabad" className="inline-flex items-center gap-2 border border-ink/20 text-ink rounded-full px-8 py-4 font-medium hover:bg-ink/5 transition">
              Try Demo Restaurant
            </Link>
          </div>
        </div>
        
        <div className="flex-1 w-full max-w-lg hidden md:block">
          {/* Abstract representation of the OS */}
          <div className="relative animate-fade-up delay-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-clay/20 to-sage/20 blur-3xl rounded-full" />
            <div className="bg-white border border-bone p-6 rounded-3xl shadow-2xl relative z-10 transform rotate-2 hover:rotate-0 transition duration-500">
              <div className="flex items-center justify-between border-b border-bone pb-4 mb-4">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="text-xs font-medium text-stone">Admin Dashboard</div>
              </div>
              <div className="space-y-4">
                <div className="h-24 bg-sage/10 rounded-xl flex items-center justify-center text-sage font-heading text-2xl">
                  ₹42,850 <span className="text-sm font-sans ml-2 text-stone">Today</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-clay/10 rounded-xl flex items-center justify-center text-clay font-medium flex-col">
                    <span className="text-2xl">14</span>
                    <span className="text-xs text-stone">Active Tables</span>
                  </div>
                  <div className="h-20 bg-ink/5 rounded-xl flex items-center justify-center text-ink font-medium flex-col">
                    <span className="text-2xl">4</span>
                    <span className="text-xs text-stone">Kitchen Load</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white border-y border-bone px-6 md:px-12 lg:px-24 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="font-heading text-4xl md:text-5xl tracking-tight mb-6">Everything you need to run your restaurant, <span className="italic text-clay">unified</span>.</h2>
            <p className="text-stone text-lg">No more piecing together 5 different software tools. SmartDine AI provides every portal out of the box.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-cream rounded-3xl p-8 border border-bone/50 hover:shadow-lg transition">
                <CheckCircle2 className="h-8 w-8 text-clay mb-6" />
                <h3 className="font-heading text-xl mb-3">{f.label}</h3>
                <p className="text-stone text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 md:px-12 lg:px-24 py-24 bg-ink text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-clay/20 to-transparent blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="font-heading text-4xl md:text-6xl tracking-tight mb-6">Simple, transparent pricing.</h2>
          <p className="text-white/70 text-lg mb-16 max-w-xl mx-auto">Start with a 14-day free trial. No credit card required. Upgrade when you're ready to scale.</p>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm max-w-2xl mx-auto text-left shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/10 pb-8 mb-8 gap-6">
              <div>
                <div className="text-clay font-medium tracking-widest uppercase text-sm mb-2">SmartDine Premium</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-5xl md:text-6xl tracking-tight">₹10,000</span>
                  <span className="text-white/50">/month</span>
                </div>
              </div>
              <Link href="/auth/login" className="bg-clay hover:bg-clay-dark text-white rounded-full px-8 py-4 font-medium transition w-full sm:w-auto text-center whitespace-nowrap">
                Start 14-Day Free Trial
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {[
                'Unlimited Tables & QR Codes',
                'Advanced AI Waiter Integration',
                'Kitchen Display System (KDS)',
                'Real-time Revenue Analytics',
                'Inventory Management',
                'Custom Branded Portal',
                'Unlimited Staff Accounts',
                '24/7 Priority Support'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-clay shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-bone px-6 md:px-12 lg:px-24 py-12 flex flex-col sm:flex-row justify-between items-center gap-6 text-sm text-stone bg-white">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-clay flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-heading font-semibold text-ink">SmartDine.AI</span>
        </div>
        <div>© 2026 SmartDine AI. All rights reserved.</div>
        <div className="flex gap-6">
          <Link href="/auth/login" className="hover:text-clay transition">Sign Up</Link>
          <Link href="/r/mehfil-hyderabad" className="hover:text-clay transition">Demo Restaurant</Link>
          <a href="https://github.com/ShivaKumar-DE-AWS/DineSmart-AI" target="_blank" className="hover:text-clay transition">Source Code</a>
        </div>
      </footer>
    </div>
  );
}
