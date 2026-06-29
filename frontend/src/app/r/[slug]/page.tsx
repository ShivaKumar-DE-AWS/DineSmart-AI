"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles, ChefHat, Heart, Crown, Users, Flame, Timer,
  Mic, ArrowRight, Utensils, ScanLine, CreditCard, Bell,
  Truck, Smartphone, Quote, Star, ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import type { MenuItem, Order } from "@/types";
import { subscribeToRestaurantPush } from "@/lib/notify";
import { useState } from "react";

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

const ICON_MAP: Record<string, any> = {
  Crown, Heart, Users, ChefHat, Flame, Sparkles,
};

export default function RestaurantHome() {
  const params = useParams();
  const slug = params?.slug as string;

  const cart = useCart();
  const { session } = useTable();

  // Get restaurant config from local JSON files
  const { config: restaurantConfig } = useRestaurantConfig();

  const { data: menuData } = useQuery({
    queryKey: ["menu", restaurantConfig?.id],
    queryFn: () => api<{ items: MenuItem[] }>(`/api/menu${restaurantConfig?.id ? `?restaurant_id=${restaurantConfig.id}` : ""}`),
  });
  const items = menuData?.items ?? [];

  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?table_session_id=${session?.id}`),
    enabled: !!session?.id,
    refetchInterval: 15000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];

  const signature = items.slice(0, 8);

  const openAI = () => window.dispatchEvent(new CustomEvent("open-ai-waiter"));
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const handlePushSubscribe = async () => {
    if (pushSubscribed) return;
    if (!restaurantConfig?.id) { toast.error("Restaurant not loaded"); return; }
    setPushLoading(true);
    const ok = await subscribeToRestaurantPush(restaurantConfig.id);
    setPushLoading(false);
    if (ok) { setPushSubscribed(true); toast.success("Notifications enabled!"); }
    else toast.error("Could not enable notifications");
  };

  return (
    <div>
      {/* ============================================================
          SECTION 1 — HERO
      ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-20" data-testid="section-hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 mehfil-paper" />
          {restaurantConfig.hero_images?.[0] && (
            <div className="absolute top-24 -left-10 w-44 h-44 rounded-full bg-cover bg-center mehfil-float opacity-60 shadow-2xl" style={{ backgroundImage: `url(${restaurantConfig.hero_images[0]})` }} />
          )}
          {restaurantConfig.hero_images?.[1] && (
            <div className="absolute top-60 -right-10 w-52 h-52 rounded-full bg-cover bg-center mehfil-float-delay opacity-60 shadow-2xl" style={{ backgroundImage: `url(${restaurantConfig.hero_images[1]})` }} />
          )}
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-5xl mx-auto text-center px-6 pt-10">
          <MehfilLogo size="lg" withTagline />
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-secondary/40 bg-brand-secondary/10">
            <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
            <span className="font-royal tracking-[0.2em] uppercase text-xs text-brand-primary">Now powered by AI Dining</span>
          </div>

          <p className="font-editorial italic text-xl md:text-2xl text-brand-primary/80 mt-10 max-w-2xl mx-auto leading-relaxed">
            &ldquo;{restaurantConfig.hero_quote || restaurantConfig.description}&rdquo;
          </p>

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link href={`/r/${slug}/menu`} data-testid="hero-explore-menu" className="mehfil-btn-royal rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Explore Menu <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={openAI} data-testid="hero-talk-ai" className="mehfil-btn-gold rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Talk to {restaurantConfig.ai_waiter?.name || "AI Waiter"}
            </button>
            <Link href={`/r/${slug}/menu`} data-testid="hero-order-now" className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors inline-flex items-center gap-2">
              Order Now
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.25em] text-brand-primary/70 font-royal">
            <span className="inline-flex items-center gap-2"><Star className="h-3.5 w-3.5 text-brand-secondary" /> 4.8 · 12K+ reviews</span>
            <span className="inline-flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-brand-secondary" /> Award Winning</span>
            <span className="inline-flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-brand-secondary" /> Avg. ready in 18 min</span>
            <button onClick={handlePushSubscribe} disabled={pushLoading || pushSubscribed} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${pushSubscribed ? "border-green-500/50 text-green-500 bg-green-500/10" : "border-brand-secondary/40 text-brand-secondary hover:border-brand-primary hover:text-brand-primary"}`}>
              <Bell className="h-3.5 w-3.5" />
              {pushLoading ? "…" : pushSubscribed ? "Subscribed" : "Get Notified"}
            </button>
          </div>
        </motion.div>
      </section>

      {/* ============================================================
          SECTION 2 — ACTIVE ORDERS (ONLY IF SESSION EXISTS)
      ============================================================ */}
      {session && sessionOrders.length > 0 && (
        <section className="py-10 px-5 md:px-6 max-w-5xl mx-auto" data-testid="section-active-orders">
          <SectionTag>Live Tracking</SectionTag>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-royal text-2xl md:text-3xl text-brand-primary tracking-wide">
              Your <span className="font-editorial italic font-normal mehfil-gold-gradient">Orders</span>
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
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-royal tracking-widest text-[10px] uppercase text-brand-secondary">Token</div>
                      <div className="font-royal text-xl text-brand-primary">{order.token}</div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-royal tracking-wider uppercase border ${isActive ? 'bg-brand-secondary/10 border-brand-secondary/50 text-brand-secondary' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="font-editorial text-sm text-brand-primary/70 mb-4 line-clamp-1">
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
          SECTION 3 — OUR STORY
      ============================================================ */}
      {restaurantConfig.history && restaurantConfig.history.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="section-story">
          <SectionTag>Our Story</SectionTag>
          <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="font-royal text-4xl md:text-6xl text-center text-brand-primary tracking-wide">
            Our <span className="font-editorial italic font-normal mehfil-gold-gradient">Journey</span>
          </motion.h2>
          <p className="font-editorial text-lg md:text-xl text-brand-primary/75 text-center mt-6 max-w-3xl mx-auto italic leading-relaxed">
            {restaurantConfig.history_intro || restaurantConfig.description}
          </p>

          <div className="mt-20 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-secondary to-transparent hidden md:block" />
            {restaurantConfig.history.map((t: any, idx: number) => (
              <motion.div key={t.year} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className={`relative grid md:grid-cols-2 gap-10 items-center my-16 ${idx % 2 ? "md:[direction:rtl]" : ""}`} data-testid={`timeline-${t.year}`}>
                <div className={`${idx % 2 ? "md:[direction:ltr] md:pl-12" : "md:pr-12"}`}>
                  <div className="font-royal mehfil-gold-gradient text-6xl md:text-7xl tracking-tight">{t.year}</div>
                  <h3 className="font-royal text-2xl md:text-3xl text-brand-primary mt-3">{t.title}</h3>
                  <p className="font-editorial italic text-lg text-brand-primary/75 mt-4 leading-relaxed">{t.description}</p>
                </div>
                <div className={`${idx % 2 ? "md:[direction:ltr]" : ""}`}>
                  <div className="aspect-[4/3] rounded-lg bg-cover bg-center shadow-2xl border border-brand-secondary/30" style={{ backgroundImage: `url(${t.image_url})` }} />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-brand-secondary hidden md:block mehfil-glow" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 4 — WHY US
      ============================================================ */}
      {restaurantConfig.why_us && restaurantConfig.why_us.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="section-why">
          <SectionTag>Why Choose Us</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">A table where memories are <span className="font-editorial italic mehfil-gold-gradient">made</span></h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
            {restaurantConfig.why_us.map((f: any) => {
              const IconComponent = ICON_MAP[f.icon] || Sparkles;
              return (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mehfil-card rounded-lg p-6 hover:-translate-y-1 transition-all">
                  <IconComponent className="h-7 w-7 text-brand-secondary" />
                  <h3 className="font-royal text-lg text-brand-primary mt-4">{f.title}</h3>
                  <p className="font-editorial text-base text-brand-primary/75 mt-2 leading-relaxed">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 5 — AI WAITER
      ============================================================ */}
      <section className="py-14 md:py-24 mehfil-royal-bg text-[#FAF5EC]" data-testid="section-ai-waiter">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 items-center gap-16">
          <div>
            <div className="font-royal tracking-[0.3em] text-xs uppercase text-brand-secondary mb-4">Your Assistant</div>
            <h2 className="font-royal text-4xl md:text-6xl leading-tight">Meet <span className="font-editorial italic mehfil-gold-gradient">{restaurantConfig.ai_waiter?.name || "AI Waiter"}</span></h2>
            <p className="font-editorial text-lg md:text-xl text-[#FAF5EC]/80 mt-6 italic leading-relaxed">
              {restaurantConfig.ai_waiter?.personality || "Your personal dining assistant. Ask for recommendations, place orders, and track your meal."}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button onClick={openAI} data-testid="ai-section-chat" className="mehfil-btn-gold rounded-full px-7 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Chat with {restaurantConfig.ai_waiter?.name || "AI Waiter"}
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
                <div className="bg-[#F3EBD8] rounded-xl rounded-br-sm px-3 py-2 ml-auto max-w-[80%] text-right">&ldquo;I want something spicy.&rdquo;</div>
                <div className="bg-brand-primary text-[#FAF5EC] rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">&ldquo;I recommend our signature dish with a side of fresh naan. Would you like to add it to your order?&rdquo;</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — SIGNATURE DISHES
      ============================================================ */}
      {signature.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="section-signature">
          <SectionTag>From Our Kitchen</SectionTag>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <h2 className="font-royal text-4xl md:text-5xl text-brand-primary">Signature <span className="font-editorial italic mehfil-gold-gradient">dishes</span></h2>
            <Link href={`/r/${slug}/menu`} data-testid="sig-see-full" className="font-royal tracking-[0.2em] uppercase text-xs text-brand-primary hover:text-brand-secondary inline-flex items-center gap-1">See full menu <ArrowRight className="h-3 w-3" /></Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {signature.map((item) => {
              const inCart = cart.items.find((i) => i.item_id === item.id);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mehfil-card rounded-lg overflow-hidden group flex flex-col">
                  <div className="aspect-[4/3] bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${item.image_url})` }} />
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-royal text-lg text-brand-primary leading-tight">{item.name}</h3>
                    <p className="font-editorial italic text-sm text-brand-primary/70 mt-1.5 line-clamp-2 flex-1">{item.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-secondary/20">
                      <span className="font-royal text-xl text-brand-primary">{formatCurrency(item.price)}</span>
                      {inCart ? (
                        <span className="text-xs font-royal tracking-wider uppercase text-brand-secondary">In cart × {inCart.qty}</span>
                      ) : (
                        <button onClick={() => { cart.add(item); toast.success(`${item.name} added`); }} className="mehfil-btn-royal rounded-full text-xs px-4 py-2 tracking-wider uppercase font-royal">Add</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 7 — ORDER FLOW
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 bg-[#F3EBD8]/40" data-testid="section-flow">
        <div className="max-w-7xl mx-auto">
          <SectionTag>How It Works</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">From craving to plate</h2>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: ScanLine, label: "Scan QR" },
              { icon: Sparkles, label: "Talk to AI" },
              { icon: Utensils, label: "Customize" },
              { icon: CreditCard, label: "Pay Securely" },
              { icon: Crown, label: "Get Token" },
              { icon: Timer, label: "Track Live" },
              { icon: Truck, label: "Pickup or Dine" },
            ].map((s, i) => (
              <div key={s.label} className="text-center">
                <div className="relative h-16 w-16 mx-auto rounded-full border-2 border-brand-secondary bg-[#FAF5EC] flex items-center justify-center">
                  <s.icon className="h-6 w-6 text-brand-primary" />
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-primary text-[#FAF5EC] text-xs font-royal flex items-center justify-center">{i + 1}</div>
                </div>
                <div className="mt-3 font-royal tracking-wider uppercase text-xs text-brand-primary">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — REVIEWS
      ============================================================ */}
      {restaurantConfig.reviews && restaurantConfig.reviews.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 mehfil-paper" data-testid="section-reviews">
          <div className="max-w-6xl mx-auto">
            <SectionTag>What People Say</SectionTag>
            <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">Customer <span className="font-editorial italic mehfil-gold-gradient">Reviews</span></h2>
            <div className="mt-14 grid md:grid-cols-3 gap-5">
              {restaurantConfig.reviews.map((r: any) => (
                <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mehfil-card rounded-lg p-6">
                  <Quote className="h-7 w-7 text-brand-secondary" />
                  <p className="font-editorial italic text-base text-brand-primary/85 mt-4 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-1 text-brand-secondary">
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={`${r.name}-star-${i}`} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <div className="mt-3 font-royal tracking-wider uppercase text-xs text-brand-primary">{r.name}</div>
                  <div className="font-editorial italic text-xs text-brand-primary/60">{r.role}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 9 — TABLE RESERVATION CTA
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="section-reserve">
        <div className="max-w-4xl mx-auto text-center">
          <div className="font-royal tracking-[0.3em] uppercase text-xs text-brand-secondary">Reservations</div>
          <h2 className="font-royal text-4xl md:text-6xl mt-4">Save a <span className="font-editorial italic mehfil-gold-gradient">seat</span></h2>
          <p className="font-editorial italic text-lg md:text-xl text-[#FAF5EC]/80 mt-6 max-w-2xl mx-auto leading-relaxed">
            We hold tables for guests who plan ahead — choose your evening, party size and any special note for the chef.
          </p>
          <Link href={`/r/${slug}/reserve`} data-testid="reserve-cta" className="mt-10 inline-flex items-center gap-2 mehfil-btn-gold rounded-full px-9 py-4 text-sm tracking-[0.2em] uppercase font-royal">
            Reserve a Table <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ============================================================
          SECTION 10 — CONTACT CTA
      ============================================================ */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="section-contact">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <SectionTag>Get in Touch</SectionTag>
            <h2 className="font-royal text-3xl md:text-4xl text-brand-primary">Visit <span className="font-editorial italic mehfil-gold-gradient">Us</span></h2>
            <div className="mt-6 space-y-4">
              {restaurantConfig.contact?.address && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-primary text-sm">📍</span>
                  </div>
                  <p className="font-editorial text-sm text-brand-primary/80">{restaurantConfig.contact.address}</p>
                </div>
              )}
              {restaurantConfig.contact?.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-primary text-sm">📞</span>
                  </div>
                  <a href={`tel:${restaurantConfig.contact.phone}`} className="font-editorial text-sm text-brand-primary/80 hover:text-brand-primary">{restaurantConfig.contact.phone}</a>
                </div>
              )}
              {restaurantConfig.contact?.email && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-secondary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-primary text-sm">✉️</span>
                  </div>
                  <a href={`mailto:${restaurantConfig.contact.email}`} className="font-editorial text-sm text-brand-primary/80 hover:text-brand-primary">{restaurantConfig.contact.email}</a>
                </div>
              )}
            </div>
            <Link href={`/r/${slug}/contact`} className="mt-6 inline-flex items-center gap-2 font-royal tracking-wider uppercase text-xs text-brand-primary hover:text-brand-secondary transition-colors">
              View Full Contact Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mehfil-card rounded-2xl p-6 shadow-xl">
            <h3 className="font-royal text-lg text-brand-primary mb-4">Business Hours</h3>
            <div className="space-y-3">
              {restaurantConfig.hours?.lunch && (
                <div className="flex justify-between items-center">
                  <span className="font-editorial text-sm text-brand-primary/70">Lunch</span>
                  <span className="font-royal text-sm text-brand-primary">{restaurantConfig.hours.lunch}</span>
                </div>
              )}
              {restaurantConfig.hours?.dinner && (
                <div className="flex justify-between items-center">
                  <span className="font-editorial text-sm text-brand-primary/70">Dinner</span>
                  <span className="font-royal text-sm text-brand-primary">{restaurantConfig.hours.dinner}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-brand-secondary/20 pt-3">
                <span className="font-editorial text-sm text-brand-primary/70">Days</span>
                <span className="font-royal text-sm text-brand-primary">{restaurantConfig.hours?.open_days || "Open all 7 days"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
