"use client";
import { useParams } from "next/navigation";
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
  const params = useParams();
  const slug = params?.slug as string;

  const { data, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: () => api<{ items: MenuItem[] }>("/api/menu"),
    refetchInterval: 8000,
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

  // Set initial category
  useEffect(() => {
    if (!categories.length) return;
    if (!activeCat) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  // Desktop scroll-spy only
  useEffect(() => {
    const onScroll = () => {
      // Only run scroll-spy on desktop (lg+)
      if (window.innerWidth < 1024) return;
      const offsets = categories.map((c) => {
        const el = document.getElementById(`chapter-${c}`);
        return { c, top: el ? el.getBoundingClientRect().top : Infinity };
      });
      const inView = offsets.find((o) => o.top >= 80 && o.top < 240) || offsets.filter((o) => o.top < 80).pop();
      if (inView) setActiveCat(inView.c);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  const scrollTo = (c: string) => {
    const el = document.getElementById(`chapter-${c}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
  };

  // Mobile: only show active category items
  const mobileItems = useMemo(() => {
    if (!activeCat) return filtered;
    return filtered.filter((i) => i.category === activeCat);
  }, [filtered, activeCat]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 pt-10 pb-28 overflow-x-hidden" data-testid="menu-page">
      {/* Hero — hidden on mobile for more space */}
      <div className="text-center mb-8 lg:mb-12">
        <div className="hidden lg:block mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-xs uppercase">The royal menu</span></div>
        <h1 className="font-royal text-3xl lg:text-6xl text-[#8A1A2A] tracking-wide">Mehfil <span className="font-editorial italic mehfil-gold-gradient">Exclusive</span></h1>
        <p className="hidden lg:block font-editorial italic text-lg text-[#1A1106]/75 mt-4 max-w-2xl mx-auto leading-relaxed">
          Twenty-seven dishes, eight chapters, one Hyderabad. Flip a card to read the chef&apos;s notes, tap ADD to seat it on your thali.
        </p>
        <div className="mt-5 lg:mt-7 mx-auto max-w-md flex items-center gap-3 bg-[#FAF5EC] border border-[#C9A348]/40 rounded-full px-4 py-2 shadow-sm">
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

      {/* ====== MOBILE LAYOUT (below lg) ====== */}
      <div className="lg:hidden">
        {/* Sticky category filter pills */}
        <div className="-mx-4 px-4 mb-4 overflow-x-auto sticky top-0 z-20 bg-[#FAF5EC]/95 backdrop-blur-sm py-2.5 border-b border-[#E7DFCB]/60" data-testid="menu-chapters-mobile">
          <div className="flex gap-2 w-max">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-royal tracking-[0.12em] uppercase border transition-all ${
                  activeCat === c
                    ? "bg-[#8A1A2A] text-white border-[#8A1A2A] shadow-md"
                    : "bg-white text-[#1A1106] border-[#ddd]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Category heading */}
        {activeCat && (
          <div className="flex items-center gap-3 mb-3">
            <h2 className="font-royal text-xl text-[#8A1A2A] tracking-wide">{activeCat}</h2>
            <span className="text-xs text-[#1A1106]/40">{mobileItems.length} items</span>
          </div>
        )}

        {isLoading && <div className="text-[#1A1106]/60 font-editorial italic py-10 text-center">Unveiling the menu…</div>}

        {/* Item list — Swiggy style */}
        <div className="divide-y divide-[#E7DFCB]">
          {mobileItems.map((item) => {
            const inCart = cart.items.find((i) => i.item_id === item.id);
            return (
              <div key={item.id} className="flex gap-3 py-4" data-testid={`menu-item-mobile-${item.id}`}>
                {/* LEFT: details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.tags?.includes("bestseller") && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#C9A348] uppercase tracking-wider">
                        <Sparkles className="h-3 w-3" /> Bestseller
                      </span>
                    )}
                    {item.tags?.includes("spicy") && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                        <Flame className="h-3 w-3" /> Spicy
                      </span>
                    )}
                  </div>
                  <h3 className="font-royal text-[15px] text-[#1A1106] leading-snug">{item.name}</h3>
                  <p className="font-royal text-sm text-[#1A1106] mt-1">{formatCurrency(item.price)}</p>
                  <p className="text-xs text-[#1A1106]/50 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                {/* RIGHT: image + ADD */}
                <div className="flex-shrink-0 w-[105px] flex flex-col items-center">
                  <div className="w-[105px] h-[96px] rounded-xl overflow-hidden bg-[#F3EBD8] shadow">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C9A348]/40"><BookOpen className="h-7 w-7" /></div>
                    )}
                  </div>
                  {/* ADD / Qty control — overlaps image bottom */}
                  <div className="-mt-3.5 relative z-10">
                    {inCart ? (
                      <div className="flex items-center bg-[#5C0E1B] text-white rounded-lg shadow-lg overflow-hidden border-2 border-white">
                        <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} className="h-7 w-8 flex items-center justify-center active:bg-[#8A1A2A]"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center font-royal text-sm font-bold">{inCart.qty}</span>
                        <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} className="h-7 w-8 flex items-center justify-center active:bg-[#8A1A2A]"><Plus className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { cart.add(item); toast.success(`${item.name} added`); }}
                        className="relative bg-white text-[#5C0E1B] font-royal font-bold text-sm uppercase border border-[#ddd] rounded-lg px-5 py-1 shadow-md active:scale-95 transition-transform"
                      >
                        ADD
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#5C0E1B] text-white text-[9px] flex items-center justify-center font-bold leading-none">+</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && mobileItems.length === 0 && (
          <div className="text-center py-16 font-editorial italic text-[#1A1106]/60" data-testid="menu-empty-mobile">
            No dishes found in this category.
          </div>
        )}
      </div>

      {/* ====== DESKTOP LAYOUT (lg+) ====== */}
      <div className="hidden lg:grid lg:grid-cols-[220px_1fr] gap-10">
        {/* Chapters sidebar */}
        <aside className="sticky top-24 self-start" data-testid="menu-chapters">
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

        {/* Desktop items */}
        <div>
          {isLoading && <div className="text-[#1A1106]/60 font-editorial italic" data-testid="menu-loading">Unveiling the menu…</div>}

          {categories.map((c, ci) => (
            <section key={c} id={`chapter-${c}`} className="mb-16 scroll-mt-24" data-testid={`chapter-section-${c}`}>
              <div className="flex items-end gap-4 mb-6">
                <div className="font-royal text-5xl text-[#C9A348]/40 leading-none tabular-nums">{String(ci + 1).padStart(2, "0")}</div>
                <div className="flex-1">
                  <div className="font-royal tracking-[0.3em] uppercase text-[10px] text-[#8A1A2A]">Chapter {ci + 1}</div>
                  <h2 className="font-royal text-3xl text-[#8A1A2A] tracking-wide">{c}</h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#C9A348]/40 to-transparent" />
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-3 gap-6" data-testid={`menu-grid-${c}`}>
                {(grouped[c] || []).map((item) => {
                  const inCart = cart.items.find((i) => i.item_id === item.id);
                  const isFlipped = !!flipped[item.id];
                  return (
                    <div key={item.id} className="relative" style={{ perspective: "1000px" }} data-testid={`menu-item-${item.id}`}>
                      <motion.div
                        className="relative w-full h-[400px]"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        {/* FRONT */}
                        <div className="absolute inset-0 mehfil-card rounded-lg overflow-hidden flex flex-col shadow-md" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                          <div className="relative aspect-[5/4] bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${item.image_url})` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#5C0E1B]/70 via-transparent to-transparent" />
                            {item.tags?.includes("bestseller") && (
                              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#C9A348] text-[#1A1106] text-[10px] font-royal tracking-wider uppercase shadow-md">Bestseller</div>
                            )}
                            {item.tags?.includes("spicy") && (
                              <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-[#8A1A2A] text-[#FAF5EC] flex items-center justify-center shadow-md" title="Spicy"><Flame className="h-3.5 w-3.5" /></div>
                            )}
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-royal text-lg text-[#8A1A2A] leading-tight">{item.name}</h3>
                            <div className="font-editorial italic text-sm text-[#1A1106]/70 mt-1.5 line-clamp-2 flex-1">{item.description}</div>
                            <div className="mt-4 pt-4 border-t border-[#E7DFCB] flex items-center justify-between">
                              <span className="font-royal text-xl text-[#8A1A2A]">{formatCurrency(item.price)}</span>
                              <div className="flex items-center gap-2">
                                <button data-testid={`flip-btn-${item.id}`} onClick={() => setFlipped((s) => ({ ...s, [item.id]: !s[item.id] }))} className="text-[10px] font-royal tracking-[0.2em] uppercase text-[#8A1A2A] hover:text-[#C9A348] transition px-2 py-1">Details</button>
                                {inCart ? (
                                  <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-1 shadow" data-testid={`qty-control-${item.id}`}>
                                    <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                                    <span className="px-2 font-royal text-sm font-semibold w-6 text-center">{inCart.qty}</span>
                                    <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                  <button data-testid={`add-to-cart-${item.id}`} onClick={() => { cart.add(item); toast.success(`${item.name} added to your thali`); }} className="mehfil-btn-royal rounded-full px-4 py-2 text-[11px] font-royal tracking-[0.15em] uppercase inline-flex items-center gap-1.5"><Plus className="h-3 w-3" /> Add</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BACK */}
                        <div className="absolute inset-0 mehfil-royal-bg text-[#FAF5EC] rounded-lg overflow-hidden flex flex-col shadow-2xl p-6" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                          <div className="font-royal tracking-[0.3em] uppercase text-[10px] text-[#C9A348]">Chef&apos;s note</div>
                          <h3 className="font-royal text-2xl text-[#FAF5EC] mt-2">{item.name}</h3>
                          <div className="mehfil-divider my-4"><span className="text-[10px] font-royal tracking-wider uppercase">est · 2006</span></div>
                          <p className="font-editorial italic text-[#FAF5EC]/90 leading-relaxed text-sm">{item.description}</p>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-royal tracking-wider uppercase text-[#FAF5EC]/80">
                            <div><span className="text-[#C9A348]">Prep · </span>{item.prep_time_min} min</div>
                            <div><span className="text-[#C9A348]">Price · </span>{formatCurrency(item.price)}</div>
                            {item.tags?.length ? <div className="col-span-2"><span className="text-[#C9A348]">Notes · </span>{item.tags.join(" · ")}</div> : null}
                          </div>
                          <div className="mt-auto flex items-center gap-3">
                            <button onClick={() => setFlipped((s) => ({ ...s, [item.id]: false }))} className="rounded-full border border-[#C9A348]/50 text-[#FAF5EC] px-4 py-2 text-[11px] font-royal tracking-[0.15em] uppercase hover:bg-[#C9A348]/10">Close</button>
                            <button onClick={() => { cart.add(item); toast.success(`${item.name} added`); setFlipped((s) => ({ ...s, [item.id]: false })); }} className="mehfil-btn-gold rounded-full px-5 py-2 text-[11px] font-royal tracking-[0.15em] uppercase inline-flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Add to thali</button>
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

      {/* ====== FIXED CHECKOUT BUTTON — bottom left ====== */}
      <AnimatePresence>
        {cart.count() > 0 && (
          <motion.a
            href={`/r/${slug}/cart`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-5 left-4 z-30 bg-[#5C0E1B] text-white rounded-full shadow-2xl flex items-center gap-2.5 pl-3 pr-4 py-3 active:scale-95 transition-transform"
            data-testid="floating-cart"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 h-[18px] w-[18px] rounded-full bg-[#C9A348] text-[#1A1106] text-[10px] font-bold flex items-center justify-center">{cart.count()}</span>
            </div>
            <span className="font-royal text-xs tracking-wider uppercase">{formatCurrency(cart.subtotal())}</span>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
