"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, Search, ShoppingBag, Sparkles, BotMessageSquare, Send, Mic, X, Utensils } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { sortCategories } from "@/utils/categoryOrder";
import type { MenuItem } from "@/types";
import { sendAIWaiterEvent } from "@/lib/ai_waiter_client";

export default function NativeAppHomeMenu() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();

  const { data, isLoading } = useQuery({
    queryKey: ["menu", slug, restaurantConfig?.id],
    queryFn: () => api<{ items: MenuItem[] }>(`/api/menu?restaurant_id=${restaurantConfig?.id || ""}`),
    refetchInterval: 15000,
  });
  
  const cart = useCart();
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  // AI Waiter: fire ITEM_ADDED toast on every add-to-cart action
  const handleAddToCart = useCallback((item: MenuItem) => {
    cart.add(item);
    toast.success(`${item.name} added`, { duration: 3000 });
    if (!restaurantConfig?.id) return;
    const cartItems = useCart.getState().items;
    sendAIWaiterEvent({
      event_type: "ITEM_ADDED",
      restaurant_id: restaurantConfig.id,
      cart_state: cartItems.map(ci => ({
        item_id: ci.item_id,
        name: ci.name,
        price: ci.price,
        qty: ci.qty,
        category: (ci as any).category ?? undefined,
      })),
      added_item: {
        item_id: item.id ?? "",
        name: item.name,
        price: item.price,
        qty: 1,
        category: item.category ?? undefined,
      },
    }).catch(() => {/* silent */});
  }, [restaurantConfig?.id, cart]);

  const items = useMemo(() => (data?.items ?? []).filter((i) => i.available !== false), [data]);

  const filtered = useMemo(() => {
    let result = items;
    const s = q.trim().toLowerCase();
    if (s) {
      result = result.filter((i) => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
    }
    return result;
  }, [items, q]);

  const { categories, sortedFiltered } = useMemo(() => {
    const grouped = filtered.reduce((acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
    
    const sortedCategories = sortCategories(Object.keys(grouped));
    const sorted: MenuItem[] = [];
    sortedCategories.forEach(cat => sorted.push(...grouped[cat]));
    
    return { categories: sortedCategories, sortedFiltered: sorted };
  }, [filtered]);

  return (
    <div className="bg-[#FAF5EC] min-h-screen pb-28 relative -mt-[76px]">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 pointer-events-none mix-blend-multiply" />
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#1A1106]/10 to-transparent pointer-events-none" />
      
      {/* 1. Full-Bleed Immersive Hero */}
      <div className="relative h-[40vh] min-h-[350px] w-full bg-[#1A1106] pt-[76px] flex flex-col justify-end">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-overlay"
          style={{ backgroundImage: `url(${restaurantConfig?.hero_images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80'})` }}
        />
        {/* Top gradient so dark header text remains readable */}
        <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-[#FAF5EC]/90 to-transparent z-10" />
        
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF5EC] via-[#FAF5EC]/30 to-transparent" />
        
        {/* Hero Content positioned at the bottom left of the hero area */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-10 w-full mb-6">
          <div className="flex flex-col items-start gap-4">
            <h1 className="font-royal text-4xl sm:text-5xl md:text-6xl text-[#FAF5EC] drop-shadow-md uppercase tracking-wider">
              {restaurantConfig?.name || "Loading..."}
            </h1>
            {restaurantConfig?.tagline && (
              <p className="font-editorial text-lg text-[#FAF5EC]/90 italic max-w-md drop-shadow-md">
                {restaurantConfig.tagline}
              </p>
            )}
            
            <a href={`/r/${slug}/about`} className="inline-flex mt-2 bg-[#5C0E1B] text-[#FAF5EC] px-5 py-2.5 rounded-full text-xs font-royal tracking-[0.2em] uppercase hover:bg-[#1A1106] transition-all shadow-xl border border-white/10">
              Discover Our Story
            </a>
          </div>
          
          <div className="relative max-w-md mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dish or ingredient..."
              className="w-full bg-white/80 backdrop-blur-md border border-white/50 rounded-full pl-10 pr-4 py-3 text-sm outline-none shadow-lg focus:bg-white focus:border-brand-primary transition-all text-[#1A1106] placeholder:text-brand-primary/60"
            />
          </div>
        </div>
      </div>

      {/* 2. Sticky Category Tabs */}
      <div className="sticky top-0 z-30 bg-[#FAF5EC]/80 backdrop-blur-xl border-b border-[#E7DFCB]/50 py-3 px-4 md:px-10 overflow-x-auto whitespace-nowrap custom-scrollbar flex gap-2 shadow-sm">
        <button 
          onClick={() => setActiveCategory("All")} 
          className={`px-6 py-2 rounded-full text-[11px] font-royal tracking-widest uppercase transition-all shadow-sm ${activeCategory === "All" ? 'bg-brand-primary text-white border border-brand-primary' : 'bg-white/80 backdrop-blur-sm text-brand-primary border border-white/60 hover:bg-[#F3EBD8]'}`}
        >
          All
        </button>
        {categories.map(cat => (
           <button 
             key={cat} 
             onClick={() => setActiveCategory(cat)} 
             className={`px-6 py-2 rounded-full text-[11px] font-royal tracking-widest uppercase transition-all shadow-sm ${activeCategory === cat ? 'bg-brand-primary text-white border border-brand-primary' : 'bg-white/80 backdrop-blur-sm text-brand-primary border border-white/60 hover:bg-[#F3EBD8]'}`}
           >
             {cat}
           </button>
        ))}
      </div>

      {/* 3. Native App Layout for Items */}
      <div className="max-w-4xl mx-auto px-4 md:px-10 pt-8 pb-36 relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
           <div className="text-center py-20 text-brand-primary/60 font-editorial italic text-lg">No dishes found.</div>
        ) : (
          categories.map((cat) => {
            if (activeCategory !== "All" && activeCategory !== cat) return null;
            const catItems = sortedFiltered.filter(i => (i.category || "Other") === cat);
            if(catItems.length === 0) return null;
            
            return (
              <div key={cat} id={`cat-${cat.replace(/\s+/g, '-')}`} className="mb-12 scroll-mt-24">
                <h2 className="font-royal text-2xl md:text-3xl text-brand-primary mb-6 pb-2 border-b border-brand-secondary/30 inline-block pr-12">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {catItems.map(item => {
                    const inCart = mounted ? cart.items.find((i) => i.item_id === item.id) : undefined;
                    return (
                      <div key={item.id} className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex gap-4 items-center hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(92,14,27,0.08)] transition-all duration-300">
                        <div className="flex-1">
                          {item.tags?.includes("bestseller") && (
                            <div className="flex items-center gap-1 text-[9px] font-royal text-brand-secondary tracking-widest uppercase mb-1.5 bg-brand-secondary/10 w-max px-2 py-0.5 rounded-full">
                               <Sparkles className="w-2.5 h-2.5" /> Bestseller
                            </div>
                          )}
                          <h3 className="font-royal text-lg md:text-xl text-brand-primary leading-tight">{item.name}</h3>
                          <div className="font-royal font-bold text-brand-primary text-sm mt-1">{formatCurrency(item.price)}</div>
                          <p className="font-editorial text-xs md:text-sm text-[#1A1106]/60 mt-2 line-clamp-2 leading-relaxed pr-2">{item.description}</p>
                        </div>
                        
                        <div className="shrink-0 relative">
                          {item.image_url ? (
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-cover bg-center shadow-inner border border-black/5" style={{ backgroundImage: `url(${item.image_url})`}} />
                          ) : (
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-[#F3EBD8]/50 flex items-center justify-center border border-[#E7DFCB]/50">
                               <Utensils className="w-8 h-8 text-brand-primary/20" />
                            </div>
                          )}
                          
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 w-[90%]">
                            {inCart ? (
                               <div className="flex items-center justify-between bg-white border border-[#E7DFCB] text-brand-primary rounded-xl shadow-lg px-1.5 py-1.5">
                                 <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F3EBD8] rounded-lg transition-colors"><Minus className="h-3 w-3" /></button>
                                 <span className="font-royal text-sm font-bold">{inCart.qty}</span>
                                 <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F3EBD8] rounded-lg transition-colors"><Plus className="h-3 w-3" /></button>
                               </div>
                            ) : (
                               <button 
                                 onClick={() => handleAddToCart(item)} 
                                 className="w-full bg-white border border-[#E7DFCB] text-brand-primary hover:bg-[#FAF5EC] hover:text-[#5C0E1B] hover:border-[#5C0E1B]/30 rounded-xl shadow-lg py-2.5 text-[11px] font-royal tracking-widest font-bold uppercase transition-all"
                               >
                                 ADD
                               </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>



      {/* 5. Fixed Cart */}
      <AnimatePresence>
        {mounted && cart.count() > 0 && (
          <motion.a
            href={`/r/${slug}/cart`}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#1A1106] text-[#FAF5EC] border border-brand-secondary/50 rounded-full shadow-2xl flex items-center justify-between gap-6 px-6 py-3.5 hover:bg-[#2A1C0A] transition-all w-[92%] max-w-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-brand-secondary/20 p-2 rounded-full">
                <ShoppingBag className="h-5 w-5 text-brand-secondary" />
                <div className="absolute -top-1.5 -right-1.5 bg-brand-secondary text-[#1A1106] text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-md">
                  {cart.count()}
                </div>
              </div>
              <div className="flex flex-col items-start border-l border-brand-secondary/30 pl-3">
                <span className="text-[10px] font-royal tracking-widest uppercase text-brand-secondary leading-none mb-1">Your Tray</span>
                <span className="text-sm font-royal font-bold leading-none text-[#FAF5EC]">{cart.count()} {cart.count() === 1 ? 'Item' : 'Items'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-brand-secondary text-[#1A1106] font-royal font-bold text-sm px-4 py-2 rounded-full shadow-md hover:brightness-110">
              <span>View · {formatCurrency(cart.subtotal())}</span>
            </div>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
