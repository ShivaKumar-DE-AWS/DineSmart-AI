"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, BookOpen, Search, ShoppingBag, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuItem } from "@/types";

export default function MenuPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: () => api<{ items: MenuItem[] }>("/api/menu"),
    refetchInterval: 8000,         // poll so admin edits reflect within ~8s
    refetchOnWindowFocus: true,
  });
  const cart = useCart();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");

  const items = useMemo(() => (data?.items ?? []).filter((i) => i.available !== false), [data]);
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
  }, [items, q]);
  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const c of categories) map[c] = [];
    for (const i of filtered) (map[i.category] ||= []).push(i);
    return map;
  }, [filtered, categories]);

  // scroll-spy for chapters
  useEffect(() => {
    if (!categories.length) return;
    if (!activeCat) setActiveCat(categories[0]);
    const onScroll = () => {
      const offsets = categories.map((c) => {
        const el = document.getElementById(`chapter-${c}`);
        return { c, top: el ? el.getBoundingClientRect().top : Infinity };
      });
      const inView = offsets.find((o) => o.top >= 80 && o.top < 240) || offsets.filter((o) => o.top < 80).pop();
      if (inView) setActiveCat(inView.c);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories, activeCat]);

  const scrollTo = (c: string) => {
    const el = document.getElementById(`chapter-${c}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-10 pb-24" data-testid="menu-page">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-xs uppercase">The royal menu</span></div>
        <h1 className="font-royal text-4xl md:text-6xl text-[#8A1A2A] tracking-wide">Mehfil <span className="font-editorial italic mehfil-gold-gradient">Exclusive</span></h1>
        <p className="font-editorial italic text-base md:text-lg text-[#1A1106]/75 mt-4 max-w-2xl mx-auto leading-relaxed">
          Twenty-seven dishes, eight chapters, one Hyderabad. Flip a card to read the chef&apos;s notes, tap ADD to seat it on your thali.
        </p>
        <div className="mt-7 mx-auto max-w-md flex items-center gap-3 bg-[#FAF5EC] border border-[#C9A348]/40 rounded-full px-5 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-[#8A1A2A]" />
          <input
            data-testid="menu-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dish, ingredient or mood…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#1A1106]/40"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        {/* Chapters sidebar */}
        <aside className="hidden lg:block sticky top-24 self-start" data-testid="menu-chapters">
          <div className="font-royal tracking-[0.3em] text-xs uppercase text-[#C9A348] mb-4 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Chapters
          </div>
          <ol className="space-y-1">
            {categories.map((c, idx) => (
              <li key={c}>
                <button
                  data-testid={`chapter-link-${c}`}
                  onClick={() => scrollTo(c)}
                  className={`group w-full flex items-center gap-3 py-2.5 pr-3 pl-2 text-left rounded-md transition-all ${
                    activeCat === c ? "bg-[#8A1A2A] text-[#FAF5EC] shadow-md" : "hover:bg-[#F3EBD8] text-[#1A1106]"
                  }`}
                >
                  <span className={`font-royal text-sm w-7 text-center tracking-wider ${activeCat === c ? "text-[#C9A348]" : "text-[#C9A348]/70"}`}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-royal tracking-wider uppercase text-[11px]">{c}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="font-editorial italic text-[11px] text-[#1A1106]/60 mt-6 leading-snug">
            Tap a chapter — scroll to that section of the mehfil.
          </p>
        </aside>

        {/* Items */}
        <div>
          {isLoading && <div className="text-[#1A1106]/60 font-editorial italic" data-testid="menu-loading">Unveiling the menu…</div>}

          {/* Mobile chapter pill scroller */}
          <div className="lg:hidden -mx-5 px-5 mb-8 overflow-x-auto" data-testid="menu-chapters-mobile">
            <div className="flex gap-2 w-max pb-1">
              {categories.map((c, idx) => (
                <button
                  key={c}
                  onClick={() => scrollTo(c)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-royal tracking-[0.2em] uppercase border transition ${
                    activeCat === c
                      ? "bg-[#8A1A2A] text-[#FAF5EC] border-[#8A1A2A]"
                      : "bg-[#FAF5EC] text-[#8A1A2A] border-[#C9A348]/40"
                  }`}
                >
                  <span className="text-[#C9A348] mr-2">{String(idx + 1).padStart(2, "0")}</span>{c}
                </button>
              ))}
            </div>
          </div>

          {categories.map((c, ci) => (
            <section key={c} id={`chapter-${c}`} className="mb-16 scroll-mt-24" data-testid={`chapter-section-${c}`}>
              <div className="flex items-end gap-4 mb-6">
                <div className="font-royal text-5xl text-[#C9A348]/40 leading-none tabular-nums">{String(ci + 1).padStart(2, "0")}</div>
                <div className="flex-1">
                  <div className="font-royal tracking-[0.3em] uppercase text-[10px] text-[#8A1A2A]">Chapter {ci + 1}</div>
                  <h2 className="font-royal text-2xl md:text-3xl text-[#8A1A2A] tracking-wide">{c}</h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#C9A348]/40 to-transparent hidden md:block" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" data-testid={`menu-grid-${c}`}>
                {(grouped[c] || []).map((item) => {
                  const inCart = cart.items.find((i) => i.item_id === item.id);
                  const isFlipped = !!flipped[item.id];
                  return (
                    <div
                      key={item.id}
                      className="relative perspective-1000"
                      style={{ perspective: "1000px" }}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <motion.div
                        className="relative w-full h-[400px]"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        {/* FRONT */}
                        <div
                          className="absolute inset-0 mehfil-card rounded-lg overflow-hidden flex flex-col shadow-md"
                          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                        >
                          <div className="relative aspect-[5/4] bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${item.image_url})` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#5C0E1B]/70 via-transparent to-transparent" />
                            {item.tags?.includes("bestseller") && (
                              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#C9A348] text-[#1A1106] text-[10px] font-royal tracking-wider uppercase shadow-md">
                                Bestseller
                              </div>
                            )}
                            {item.tags?.includes("spicy") && (
                              <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-[#8A1A2A] text-[#FAF5EC] flex items-center justify-center shadow-md" title="Spicy">
                                <Flame className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-royal text-lg text-[#8A1A2A] leading-tight">{item.name}</h3>
                            <div className="font-editorial italic text-sm text-[#1A1106]/70 mt-1.5 line-clamp-2 flex-1">{item.description}</div>
                            <div className="mt-4 pt-4 border-t border-[#E7DFCB] flex items-center justify-between">
                              <span className="font-royal text-xl text-[#8A1A2A]">{formatCurrency(item.price)}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  data-testid={`flip-btn-${item.id}`}
                                  onClick={() => setFlipped((s) => ({ ...s, [item.id]: !s[item.id] }))}
                                  className="text-[10px] font-royal tracking-[0.2em] uppercase text-[#8A1A2A] hover:text-[#C9A348] transition px-2 py-1"
                                >
                                  Details
                                </button>
                                {inCart ? (
                                  <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-1 shadow" data-testid={`qty-control-${item.id}`}>
                                    <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} data-testid={`qty-dec-${item.id}`} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                                    <span className="px-2 font-royal text-sm font-semibold w-6 text-center" data-testid={`qty-val-${item.id}`}>{inCart.qty}</span>
                                    <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} data-testid={`qty-inc-${item.id}`} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                  <button
                                    data-testid={`add-to-cart-${item.id}`}
                                    onClick={() => { cart.add(item); toast.success(`${item.name} added to your thali`); }}
                                    className="mehfil-btn-royal rounded-full px-4 py-2 text-[11px] font-royal tracking-[0.15em] uppercase inline-flex items-center gap-1.5"
                                  >
                                    <Plus className="h-3 w-3" /> Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BACK (flip details) */}
                        <div
                          className="absolute inset-0 mehfil-royal-bg text-[#FAF5EC] rounded-lg overflow-hidden flex flex-col shadow-2xl p-6"
                          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        >
                          <div className="font-royal tracking-[0.3em] uppercase text-[10px] text-[#C9A348]">Chef&apos;s note</div>
                          <h3 className="font-royal text-2xl text-[#FAF5EC] mt-2">{item.name}</h3>
                          <div className="mehfil-divider my-4"><span className="text-[10px] font-royal tracking-wider uppercase">est · 2006</span></div>
                          <p className="font-editorial italic text-[#FAF5EC]/90 leading-relaxed text-sm">{item.description}</p>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-royal tracking-wider uppercase text-[#FAF5EC]/80">
                            <div><span className="text-[#C9A348]">Prep · </span>{item.prep_time_min} min</div>
                            <div><span className="text-[#C9A348]">Price · </span>{formatCurrency(item.price)}</div>
                            {item.tags?.length ? (
                              <div className="col-span-2"><span className="text-[#C9A348]">Notes · </span>{item.tags.join(" · ")}</div>
                            ) : null}
                          </div>
                          <div className="mt-auto flex items-center gap-3">
                            <button
                              data-testid={`flip-back-${item.id}`}
                              onClick={() => setFlipped((s) => ({ ...s, [item.id]: false }))}
                              className="rounded-full border border-[#C9A348]/50 text-[#FAF5EC] px-4 py-2 text-[11px] font-royal tracking-[0.15em] uppercase hover:bg-[#C9A348]/10"
                            >
                              Close
                            </button>
                            <button
                              data-testid={`add-from-back-${item.id}`}
                              onClick={() => { cart.add(item); toast.success(`${item.name} added`); setFlipped((s) => ({ ...s, [item.id]: false })); }}
                              className="mehfil-btn-gold rounded-full px-5 py-2 text-[11px] font-royal tracking-[0.15em] uppercase inline-flex items-center gap-1.5"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" /> Add to thali
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20 font-editorial italic text-[#1A1106]/60" data-testid="menu-empty">
              No dish matches &ldquo;{q}&rdquo; — try another mood.
            </div>
          )}
        </div>
      </div>

      {/* Floating cart preview */}
      <AnimatePresence>
        {cart.count() > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 mehfil-btn-royal rounded-full px-6 py-3 shadow-2xl flex items-center gap-3"
            data-testid="floating-cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="font-royal text-sm tracking-wider uppercase">{cart.count()} in thali</span>
            <span className="font-royal text-sm">·</span>
            <span className="font-royal text-sm">{formatCurrency(cart.subtotal())}</span>
            <a href="/customer/cart" className="ml-3 underline underline-offset-4 font-royal text-xs tracking-wider uppercase text-[#C9A348]">Review</a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
