"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles, ChefHat, Heart, Award, Flame, Users, Timer, MessageCircleHeart,
  Mic, ArrowRight, Crown, Utensils, ScanLine, CreditCard, Bell,
  Truck, Apple, Smartphone, Quote, Star, Phone, MapPin, ShieldCheck, Wallet
} from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import type { MenuItem, Order } from "@/types";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mehfil-divider mb-6">
      <span className="font-royal tracking-[0.4em] text-xs uppercase">{children}</span>
    </div>
  );
}

export default function MehfilHome() {
  const params = useParams();
  const slug = params?.slug as string;

  const cart = useCart();
  const { session } = useTable();
  const { data: menuData } = useQuery({ queryKey: ["menu"], queryFn: () => api<{ items: MenuItem[] }>("/api/menu") });
  const items = menuData?.items ?? [];

  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?table_session_id=${session?.id}`),
    enabled: !!session?.id,
    refetchInterval: 10000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];

  const signature = items.filter((i) => ["Biryani", "Tandoori", "Starters", "Sweets"].includes(i.category)).slice(0, 8);

  const openAI = () => window.dispatchEvent(new CustomEvent("open-ai-waiter"));

  return (
    <div>
      {/* ============================================================
          SECTION 1 — HERO
      ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-20" data-testid="section-hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 mehfil-paper" />
          {/* floating biryani thalis */}
          <div className="absolute top-24 -left-10 w-44 h-44 rounded-full bg-cover bg-center mehfil-float opacity-60 shadow-2xl" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80)" }} />
          <div className="absolute top-60 -right-10 w-52 h-52 rounded-full bg-cover bg-center mehfil-float-delay opacity-60 shadow-2xl" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80)" }} />
          <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-cover bg-center mehfil-float opacity-40 shadow-xl" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=400&q=80)" }} />
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-5xl mx-auto text-center px-6 pt-10">
          <MehfilLogo size="lg" withTagline />
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-secondary/40 bg-brand-secondary/10">
            <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
            <span className="font-royal tracking-[0.2em] uppercase text-xs text-[#8A6A1B]">Now powered by AI Dining</span>
          </div>

          <p className="font-editorial italic text-xl md:text-2xl text-[#5C0E1B]/80 mt-10 max-w-2xl mx-auto leading-relaxed">
            &ldquo;Where every grain of basmati carries the perfume of saffron and the soul of old Hyderabad.&rdquo;
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link href={`/r/${slug}/menu`} data-testid="hero-explore-menu" className="mehfil-btn-royal rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Explore Menu <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={openAI} data-testid="hero-talk-ai" className="mehfil-btn-gold rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Talk to AI Waiter
            </button>
            <Link href={`/r/${slug}/menu`} data-testid="hero-order-now" className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors inline-flex items-center gap-2">
              Order Now
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.25em] text-[#5C0E1B]/70 font-royal">
            <span className="inline-flex items-center gap-2"><Star className="h-3.5 w-3.5 text-brand-secondary" /> 4.8 · 12K+ reviews</span>
            <span className="inline-flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-brand-secondary" /> Times Food Award 2024</span>
            <span className="inline-flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-brand-secondary" /> Avg. ready in 18 min</span>
          </div>
        </motion.div>
      </section>

      {/* ============================================================
          SECTION 1.5 — ACTIVE ORDERS (ONLY IF SESSION EXISTS)
      ============================================================ */}
      {session && sessionOrders.length > 0 && (
        <section className="py-10 px-5 md:px-6 max-w-5xl mx-auto" data-testid="section-active-orders">
          <SectionTag>Live Tracking</SectionTag>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-royal text-2xl md:text-3xl text-brand-primary tracking-wide">
              Your <span className="font-editorial italic font-normal mehfil-gold-gradient">Table Orders</span>
            </h2>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionOrders.map((order) => {
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/r/${slug}/track/${order.id}`}
                  className="block mehfil-card rounded-2xl p-5 border border-brand-secondary/30 hover:border-brand-primary transition-colors relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-royal tracking-widest text-[10px] uppercase text-[#8A6A1B]">Token</div>
                      <div className="font-royal text-xl text-brand-primary">{order.token}</div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-royal tracking-wider uppercase border ${isActive ? 'bg-brand-secondary/10 border-brand-secondary/50 text-[#8A6A1B]' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="font-editorial text-sm text-[#1A1106]/70 mb-4 line-clamp-1">
                    {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-secondary/20 pt-3">
                    <span className="font-royal text-sm">{formatCurrency(order.total)}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-royal tracking-wider uppercase text-brand-primary group-hover:text-brand-secondary">
                      Track <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 2 — OUR STORY (TIMELINE)
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="section-story">
        <SectionTag>Since 2006</SectionTag>
        <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="font-royal text-4xl md:text-6xl text-center text-brand-primary tracking-wide">
          A Legacy <span className="font-editorial italic font-normal mehfil-gold-gradient">of taste</span>
        </motion.h2>
        <p className="font-editorial text-lg md:text-xl text-[#1A1106]/75 text-center mt-6 max-w-3xl mx-auto italic leading-relaxed">
          From a single kitchen in old Hyderabad to a family of restaurants and now an AI-powered dining house — Mehfil&apos;s journey has always begun with one ingredient: love.
        </p>

        <div className="mt-20 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-secondary to-transparent hidden md:block" />
          {[
            { year: "2006", title: "The First Mehfil", desc: "A single tandoor and one biryani recipe — opened in the by-lanes of old Hyderabad.", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80" },
            { year: "2010", title: "Expansion", desc: "Three outlets across Hyderabad. The dum biryani earns its first city-wide following.", img: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=900&q=80" },
            { year: "2015", title: "Signature Recognition", desc: "Times Food Awards: Best Hyderabadi Biryani. The Nizami sweets win their own column.", img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=900&q=80" },
            { year: "2020", title: "Modern Dining", desc: "A new flagship — heritage architecture, modern service, contactless ordering.", img: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=900&q=80" },
            { year: "2026", title: "AI-Powered Dining", desc: "MehfilAI joins the family — recommending pairings, remembering preferences, never sleeping.", img: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=900&q=80" },
          ].map((t, idx) => (
            <motion.div key={t.year} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className={`relative grid md:grid-cols-2 gap-10 items-center my-16 ${idx % 2 ? "md:[direction:rtl]" : ""}`} data-testid={`timeline-${t.year}`}>
              <div className={`${idx % 2 ? "md:[direction:ltr] md:pl-12" : "md:pr-12"}`}>
                <div className="font-royal mehfil-gold-gradient text-6xl md:text-7xl tracking-tight">{t.year}</div>
                <h3 className="font-royal text-2xl md:text-3xl text-brand-primary mt-3">{t.title}</h3>
                <p className="font-editorial italic text-lg text-[#1A1106]/75 mt-4 leading-relaxed">{t.desc}</p>
              </div>
              <div className={`${idx % 2 ? "md:[direction:ltr]" : ""}`}>
                <div className="aspect-[4/3] rounded-lg bg-cover bg-center shadow-2xl border border-brand-secondary/30" style={{ backgroundImage: `url(${t.img})` }} />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-brand-secondary hidden md:block mehfil-glow" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHY PEOPLE LOVE MEHFIL
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="section-why">
        <SectionTag>Why Hyderabad chose us</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">A table where memories are <span className="font-editorial italic mehfil-gold-gradient">cooked</span></h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {[
            { icon: Crown, t: "Authentic Hyderabadi", d: "Recipes guarded since the Nizam era — dum cooked, never rushed." },
            { icon: Heart, t: "Fresh, Always", d: "Spices stone-ground daily, meats sourced morning-fresh." },
            { icon: Users, t: "Family Friendly", d: "Big tables, big platters, big welcomes — bring the whole crew." },
            { icon: ChefHat, t: "Signature Recipes", d: "Eight signatures, twelve heritage classics, zero shortcuts." },
            { icon: Flame, t: "Fast Service", d: "Avg. 18-minute prep on biryani — without compromising the dum." },
            { icon: Sparkles, t: "AI Waiter", d: "Your personal sommelier — chat, ask, order, track. All in one place." },
          ].map((f) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mehfil-card rounded-lg p-6 hover:-translate-y-1 transition-all" data-testid={`why-card-${f.t.toLowerCase().replace(/\s+/g, "-")}`}>
              <f.icon className="h-7 w-7 text-brand-secondary" />
              <h3 className="font-royal text-lg text-brand-primary mt-4">{f.t}</h3>
              <p className="font-editorial text-base text-[#1A1106]/75 mt-2 leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — AI WAITER EXPERIENCE
      ============================================================ */}
      <section className="py-14 md:py-24 mehfil-royal-bg text-[#FAF5EC]" data-testid="section-ai-waiter">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 items-center gap-16">
          <div>
            <div className="font-royal tracking-[0.3em] text-xs uppercase text-brand-secondary mb-4">The Concierge</div>
            <h2 className="font-royal text-4xl md:text-6xl leading-tight">Meet <span className="font-editorial italic mehfil-gold-gradient">MehfilAI</span> — Waiter</h2>
            <p className="font-editorial text-lg md:text-xl text-[#FAF5EC]/80 mt-6 italic leading-relaxed">
              Our AI Waiter is your personal sommelier. She discovers dishes for you, customises meals, places orders and tracks every step — in the warm voice of Hyderabad.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button onClick={openAI} data-testid="ai-section-chat" className="mehfil-btn-gold rounded-full px-7 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Chat with AI Waiter
              </button>
              <button onClick={openAI} data-testid="ai-section-voice" className="rounded-full px-7 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-secondary/50 text-[#FAF5EC] hover:bg-brand-secondary/10 inline-flex items-center gap-2">
                <Mic className="h-4 w-4" /> Voice Assistant
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto h-72 w-72 md:h-96 md:w-96">
              <div className="absolute inset-0 rounded-full mehfil-glow bg-brand-secondary/30 blur-3xl" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#DDB85C] via-brand-secondary to-[#8A6A1B] flex items-center justify-center shadow-2xl">
                <Sparkles className="h-24 w-24 text-[#5C0E1B]" />
              </div>
            </div>
            <div className="mt-8 mx-auto max-w-md bg-[#FAF5EC] text-[#1A1106] rounded-2xl p-5 shadow-2xl border border-brand-secondary/30">
              <div className="text-xs uppercase tracking-[0.2em] font-royal text-brand-primary">Example Conversation</div>
              <div className="mt-3 text-sm space-y-2 font-editorial italic">
                <div className="bg-[#F3EBD8] rounded-xl rounded-br-sm px-3 py-2 ml-auto max-w-[80%] text-right">&ldquo;I want spicy chicken biryani.&rdquo;</div>
                <div className="bg-brand-primary text-[#FAF5EC] rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">&ldquo;Our signature Dum Biryani with Apollo Fish on the side. Finish with Double Ka Meetha?&rdquo;</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — SIGNATURE DISHES
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="section-signature">
        <SectionTag>From the Royal Kitchen</SectionTag>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <h2 className="font-royal text-4xl md:text-5xl text-brand-primary">Signature <span className="font-editorial italic mehfil-gold-gradient">dishes</span></h2>
          <Link href={`/r/${slug}/menu`} data-testid="sig-see-full" className="font-royal tracking-[0.2em] uppercase text-xs text-brand-primary hover:text-brand-secondary inline-flex items-center gap-1">See full menu <ArrowRight className="h-3 w-3" /></Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {signature.map((item) => {
            const inCart = cart.items.find((i) => i.item_id === item.id);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mehfil-card rounded-lg overflow-hidden group flex flex-col" data-testid={`sig-${item.id}`}>
                <div className="aspect-[4/3] bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${item.image_url})` }} />
                {item.tags?.includes("bestseller") && (
                  <div className="absolute m-3 px-2.5 py-1 rounded-full bg-brand-secondary text-[#1A1106] text-[10px] font-royal tracking-wider uppercase">Bestseller</div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-royal text-lg text-brand-primary leading-tight">{item.name}</h3>
                  <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-1.5 line-clamp-2 flex-1">{item.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E7DFCB]">
                    <span className="font-royal text-xl text-brand-primary">{formatCurrency(item.price)}</span>
                    {inCart ? (
                      <span className="text-xs font-royal tracking-wider uppercase text-brand-secondary">In cart × {inCart.qty}</span>
                    ) : (
                      <button data-testid={`sig-add-${item.id}`} onClick={() => { cart.add(item); toast.success(`${item.name} added`); }} className="mehfil-btn-royal rounded-full text-xs px-4 py-2 tracking-wider uppercase font-royal">Add</button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — MENU EXPERIENCE
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-5xl mx-auto text-center" data-testid="section-menu-cta">
        <SectionTag>The Menu</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-brand-primary">27 dishes. 8 categories. <span className="font-editorial italic mehfil-gold-gradient">One Hyderabad.</span></h2>
        <p className="font-editorial italic text-lg text-[#1A1106]/75 mt-6 max-w-2xl mx-auto leading-relaxed">
          Search, filter by veg/non-veg, dive into biryanis, starters, tandoori, curries, breads, rice, traditional sweets and beverages.
        </p>
        <Link href={`/r/${slug}/menu`} data-testid="menu-cta-explore" className="mt-10 inline-flex items-center gap-2 mehfil-btn-royal rounded-full px-9 py-4 text-sm tracking-[0.2em] uppercase font-royal">
          Explore Full Menu <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ============================================================
          SECTION 7 — ORDER FLOW
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 bg-[#F3EBD8]/40" data-testid="section-flow">
        <div className="max-w-7xl mx-auto">
          <SectionTag>Seven royal steps</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">From craving to plate</h2>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: ScanLine, label: "Scan QR" },
              { icon: Sparkles, label: "Talk to AI Waiter" },
              { icon: Utensils, label: "Customize" },
              { icon: CreditCard, label: "Pay Securely" },
              { icon: Crown, label: "Get Token" },
              { icon: Timer, label: "Track Live" },
              { icon: Truck, label: "Pickup or Dine" },
            ].map((s, i) => (
              <div key={s.label} className="text-center" data-testid={`flow-step-${i + 1}`}>
                <div className="relative h-16 w-16 mx-auto rounded-full border-2 border-brand-secondary bg-[#FAF5EC] flex items-center justify-center">
                  <s.icon className="h-6 w-6 text-brand-primary" />
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-primary text-[#FAF5EC] text-xs font-royal flex items-center justify-center">{i + 1}</div>
                </div>
                <div className="mt-3 font-royal tracking-wider uppercase text-xs text-[#1A1106]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 + 9 — LIVE TRACKING + TOKEN
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center" data-testid="section-tracking-token">
        <div>
          <SectionTag>Live tracking</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-brand-primary">Know <span className="font-editorial italic mehfil-gold-gradient">exactly</span> where your meal is</h2>
          <div className="mt-10 space-y-3">
            {[
              { l: "Order Received", done: true },
              { l: "Preparing", done: true },
              { l: "Cooking on Dum", done: true, active: true },
              { l: "Ready for Pickup", done: false },
              { l: "Delivered", done: false },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-3" data-testid={`track-demo-${s.l.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${s.done ? "bg-brand-primary text-[#FAF5EC]" : "bg-[#E7DFCB] text-[#1A1106]/40"} ${s.active ? "mehfil-glow" : ""}`}>
                  {s.done ? "✓" : "·"}
                </div>
                <div className={`font-royal tracking-wider uppercase text-sm ${s.done ? "text-brand-primary" : "text-[#1A1106]/40"}`}>{s.l}</div>
              </div>
            ))}
          </div>
          <p className="font-editorial italic text-base text-[#1A1106]/70 mt-8">Est. ready in <span className="text-brand-primary not-italic font-medium">8 minutes</span> · we&apos;ll ping you the moment it&apos;s out.</p>
        </div>

        <div>
          <SectionTag>Your token</SectionTag>
          <div className="mehfil-token-card rounded-2xl p-10 text-center shadow-2xl">
            <div className="font-royal tracking-[0.3em] uppercase text-xs text-brand-secondary">Mehfil Token</div>
            <div className="font-royal text-[#FAF5EC] mt-2 text-7xl md:text-9xl tracking-tight">M-102</div>
            <div className="mehfil-divider my-6"><span className="text-xs font-royal tracking-wider uppercase text-brand-secondary">Estimated wait</span></div>
            <div className="font-royal text-[#FAF5EC] text-3xl">~ 8 minutes</div>
            <div className="font-editorial italic text-[#FAF5EC]/70 mt-2">Counter 02 · Banjara Hills</div>
            <div className="mt-6 px-4 py-2 inline-block rounded-full border border-brand-secondary/40 text-brand-secondary text-xs tracking-[0.2em] uppercase font-royal">Cooking on Dum</div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10 — PAYMENTS
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 bg-[#F3EBD8]/40" data-testid="section-payments">
        <div className="max-w-6xl mx-auto text-center">
          <SectionTag>Secure & instant</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-brand-primary">Pay <span className="font-editorial italic mehfil-gold-gradient">your way</span></h2>
          <p className="font-editorial italic text-lg text-[#1A1106]/75 mt-6 max-w-2xl mx-auto">Every major method — UPI, cards, wallets, cash. Encrypted end-to-end by Stripe.</p>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 max-w-5xl mx-auto" data-testid="payment-methods">
            {["UPI", "PhonePe", "Google Pay", "Paytm", "Razorpay", "Visa / Master", "Cash"].map((p) => (
              <div key={p} className="mehfil-card rounded-lg py-4 px-3 flex items-center justify-center font-royal tracking-wider uppercase text-xs text-brand-primary">{p}</div>
            ))}
          </div>
          <div className="mt-10 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#FAF5EC] border border-brand-secondary/40 text-xs font-royal tracking-[0.2em] uppercase text-[#8A6A1B]">
            <ShieldCheck className="h-4 w-4 text-brand-secondary" /> PCI-DSS · 256-bit TLS · Stripe Secured
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11 — NOTIFICATIONS
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="section-notifications">
        <SectionTag>Always in the loop</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-brand-primary text-center">We&apos;ll <span className="font-editorial italic mehfil-gold-gradient">ping you</span></h2>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { t: "Order Accepted", d: "Confirmed by the counter in seconds." },
            { t: "Preparing", d: "Brisket roasting, biryani layering — chef is on it." },
            { t: "Ready", d: "A gentle chime tells you to walk over." },
            { t: "Delivered", d: "Bon appétit. Tap to rate or reorder." },
          ].map((n) => (
            <div key={n.t} className="mehfil-card rounded-lg p-6" data-testid={`notif-${n.t.toLowerCase()}`}>
              <Bell className="h-6 w-6 text-brand-secondary" />
              <h3 className="font-royal text-lg text-brand-primary mt-4">{n.t}</h3>
              <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-2">{n.d}</p>
            </div>
          ))}
        </div>
        <p className="font-editorial italic text-center text-[#1A1106]/60 mt-8 text-sm">Via browser push today · SMS & WhatsApp arriving soon</p>
      </section>

      {/* ============================================================
          SECTION 12 — REVIEWS
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-paper" data-testid="section-reviews">
        <div className="max-w-6xl mx-auto">
          <SectionTag>Word of mouth</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">What Hyderabad <span className="font-editorial italic mehfil-gold-gradient">whispers</span></h2>
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {[
              { name: "Asma R.", role: "Banjara Hills · 8 visits", text: "Twenty years in Hyderabad — Mehfil is still the most authentic dum I've eaten outside my mother's kitchen. The qubani is poetry." },
              { name: "Rohit M.", role: "Family of 6", text: "Booked their family pack for a birthday. AI Waiter remembered we ordered last time and suggested the same combo — uncanny and lovely." },
              { name: "Priya K.", role: "Foodie · IG 80K", text: "Apollo fish that audibly crackles. Saffron biryani with mirchi salan that argues sweetly with you. Five stars." },
            ].map((r) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mehfil-card rounded-lg p-6" data-testid={`review-${r.name.split(" ")[0].toLowerCase()}`}>
                <Quote className="h-7 w-7 text-brand-secondary" />
                <p className="font-editorial italic text-base text-[#1A1106]/85 mt-4 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-1 text-brand-secondary">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={`${r.name}-star-${i}`} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <div className="mt-3 font-royal tracking-wider uppercase text-xs text-brand-primary">{r.name}</div>
                <div className="font-editorial italic text-xs text-[#1A1106]/60">{r.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 13 — SPECIAL OFFERS
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="section-offers">
        <SectionTag>This week at Mehfil</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-brand-primary text-center">Royal <span className="font-editorial italic mehfil-gold-gradient">offers</span></h2>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            { tag: "Family Pack", title: "Biryani for 4 + 2 Sweets", desc: "Save ₹240. Available 7 days.", img: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80" },
            { tag: "Weekend Spl.", title: "Apollo Fish + Sweet Lassi", desc: "Saturdays & Sundays only.", img: "https://images.unsplash.com/photo-1535400875775-32eb96cefd1e?w=800&q=80" },
            { tag: "AI Pick", title: "Tandoori Trio + Naan", desc: "Curated by MehfilAI based on tonight&apos;s rush.", img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=80" },
          ].map((o) => (
            <div key={o.title} className="relative rounded-lg overflow-hidden mehfil-card group" data-testid={`offer-${o.tag.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="aspect-[4/3] bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${o.img})` }} />
              <div className="p-5">
                <div className="font-royal tracking-[0.2em] uppercase text-xs text-brand-secondary">{o.tag}</div>
                <h3 className="font-royal text-xl text-brand-primary mt-2">{o.title}</h3>
                <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-2">{o.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 14 — TABLE RESERVATION CTA
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="section-reserve">
        <div className="max-w-4xl mx-auto text-center">
          <div className="font-royal tracking-[0.3em] uppercase text-xs text-brand-secondary">Reservations</div>
          <h2 className="font-royal text-4xl md:text-6xl mt-4">Save a <span className="font-editorial italic mehfil-gold-gradient">corner</span> of the mehfil</h2>
          <p className="font-editorial italic text-lg md:text-xl text-[#FAF5EC]/80 mt-6 max-w-2xl mx-auto leading-relaxed">
            We hold tables for guests who plan ahead — choose your evening, party size and any special note for the chef.
          </p>
          <Link href={`/r/${slug}/reserve`} data-testid="reserve-cta" className="mt-10 inline-flex items-center gap-2 mehfil-btn-gold rounded-full px-9 py-4 text-sm tracking-[0.2em] uppercase font-royal">
            Reserve a Table <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ============================================================
          SECTION 15 — APP TEASER
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="section-app">
        <SectionTag>Coming soon</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">Mehfil <span className="font-editorial italic mehfil-gold-gradient">in your pocket</span></h2>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { t: "Customer App", d: "Order, track, reorder favourites in one tap.", icon: Smartphone },
            { t: "Restaurant App", d: "Owner dashboard — anywhere in the world.", icon: Crown },
            { t: "Kitchen App", d: "Tablet-first KDS for our chefs.", icon: ChefHat },
          ].map((a) => (
            <div key={a.t} className="mehfil-card rounded-lg p-7 text-center" data-testid={`app-${a.t.toLowerCase().replace(/\s+/g, "-")}`}>
              <a.icon className="h-9 w-9 mx-auto text-brand-secondary" />
              <h3 className="font-royal text-xl text-brand-primary mt-4">{a.t}</h3>
              <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-2">{a.d}</p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E7DFCB] text-[10px] font-royal tracking-[0.2em] uppercase text-[#8A6A1B]">
                <Apple className="h-3 w-3" /> coming 2026
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
