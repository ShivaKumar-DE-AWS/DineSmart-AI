"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, BookOpen, Search, ShoppingBag, Sparkles, Flame, Leaf, X, ChevronLeft, ChevronRight, LayoutGrid, BotMessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import dynamic from "next/dynamic";
const HTMLFlipBook = dynamic(() => import("react-pageflip") as any, { ssr: false }) as any;
import React from "react";
import { sortCategories } from "@/utils/categoryOrder";

import type { MenuItem } from "@/types";

type DietFilter = "all" | "veg" | "non-veg";

const Page = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div className="page bg-[#FAF5EC] shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] border-x border-[#E7DFCB] overflow-hidden" ref={ref} data-density={props.density || "soft"}>
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}></div>
      <div className="p-4 lg:p-6 h-full flex flex-col relative z-10">
        {props.children}
      </div>
    </div>
  );
});
Page.displayName = "Page";


function getPairingSuggestion(category: string, name: string): string | null {
   const cat = (category || "").toLowerCase();
   const n = (name || "").toLowerCase();
   if (cat.includes("starters") || cat.includes("appetizer")) {
     return "Pairs beautifully with Fresh Lime Soda";
   }
   if (cat.includes("biryani") || cat.includes("rice")) {
     return "Pairs beautifully with Sweet Lassi";
   }
   if (cat.includes("main") || cat.includes("curry")) {
     return "Pairs beautifully with a crisp Cola";
   }
   if (cat.includes("dessert") || cat.includes("sweet")) {
     return "Pairs beautifully with Masala Chai";
   }
   return null;
}

export default function MenuPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();

  const { data, isLoading } = useQuery({
    queryKey: ["menu", slug, restaurantConfig?.id],
    queryFn: () => api<{ items: MenuItem[] }>(`/api/menu?restaurant_id=${restaurantConfig?.id || ""}`),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const cart = useCart();
  const [currentPageNum, setCurrentPageNum] = useState(0);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [showBestSellers, setShowBestSellers] = useState(false);
  const [showChefSpecials, setShowChefSpecials] = useState(false);
    const [viewMode, setViewMode] = useState<"book" | "quick">("book");
  const [showSpecialsInsert, setShowSpecialsInsert] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [quickCategory, setQuickCategory] = useState("All");
  const [isDinnerTime, setIsDinnerTime] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState("Our");
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: `Welcome to ${restaurantConfig?.name || "our restaurant"}! I am your AI assistant today. Would you like a pairing recommendation or help deciding?` }
  ]);
  const aiChatScrollRef = useRef<HTMLDivElement>(null);

  const sendAiChat = useCallback(() => {
    const text = aiChatInput.trim();
    if (!text) return;
    setAiChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setAiChatInput("");
    // Auto-reply with a simple echo + suggestion as ponytail: full AI integration via /api/chat would go here
    setTimeout(() => {
      setAiChatMessages((prev) => [...prev, { role: "assistant", content: `Great choice! I'd recommend pairing ${text} with our chef's special tonight. Would you like to add it to your tray?` }]);
    }, 600);
  }, [aiChatInput]);

  useEffect(() => {
    aiChatScrollRef.current?.scrollTo({ top: aiChatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [aiChatMessages]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 16 || hour < 4) {
      setIsDinnerTime(true);
      setTimeGreeting("Good Evening, explore our");
    } else {
      setIsDinnerTime(false);
      setTimeGreeting("Good Afternoon, explore our");
    }
  }, []);

  const audioRef = useRef<HTMLAudioElement>(null);
  
  const items = useMemo(() => (data?.items ?? []).filter((i) => i.available !== false), [data]);
  const specialsItems = useMemo(() => items.filter(i => i.tags?.includes("chef-special") || i.tags?.includes("signature")).slice(0, 3), [items]);

  // Filter items based on search, diet, and special sections
  const filtered = useMemo(() => {
    let result = items;
    const s = q.trim().toLowerCase();
    if (s) {
      result = result.filter((i) => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
    }
    if (dietFilter === "veg") {
      result = result.filter((i) => i.tags?.includes("veg") || i.tags?.includes("vegetarian"));
    } else if (dietFilter === "non-veg") {
      result = result.filter((i) => !i.tags?.includes("veg") && !i.tags?.includes("vegetarian"));
    }
    if (showBestSellers) {
      result = result.filter((i) => i.tags?.includes("bestseller"));
    }
    if (showChefSpecials) {
      result = result.filter((i) => i.tags?.includes("chef-special") || i.tags?.includes("signature"));
    }
    return result;
  }, [items, q, dietFilter, showBestSellers, showChefSpecials]);

  const hasActiveFilters = dietFilter !== "all" || showBestSellers || showChefSpecials;

  const clearFilters = () => {
    setDietFilter("all");
    setShowBestSellers(false);
    setShowChefSpecials(false);
    setQ("");
  };

  const bookRef = useRef<any>(null);
  
  // Group and sort filtered items
  const { categories, sortedFiltered } = useMemo(() => {
    const grouped = filtered.reduce((acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
    
    const sortedCategories = sortCategories(Object.keys(grouped));
    const sorted: MenuItem[] = [];
    sortedCategories.forEach(cat => {
      sorted.push(...grouped[cat]);
    });
    
    return { categories: sortedCategories, sortedFiltered: sorted };
  }, [filtered]);

  // Paginate items
  const ITEMS_PER_PAGE = 5;
  const { pages, categoryPages } = useMemo(() => {
    const p = [];
    const catPages: Record<string, number> = {};
    
    // Group by category to ensure categories start on a fresh page
    const groupedByCategory: Record<string, typeof sortedFiltered> = {};
    sortedFiltered.forEach(item => {
      const cat = item.category || "Other";
      if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
      groupedByCategory[cat].push(item);
    });

    for (const cat of categories) {
      const catItems = groupedByCategory[cat];
      if (!catItems || catItems.length === 0) continue;
      
      for (let i = 0; i < catItems.length; i += ITEMS_PER_PAGE) {
        const pageItems = catItems.slice(i, i + ITEMS_PER_PAGE);
        p.push(pageItems);
        
        const pageIndexInBook = p.length - 1 + 2; // +2 for covers
        if (i === 0) { // first page of this category
           catPages[cat] = pageIndexInBook;
        }
      }
    }
    if (p.length % 2 !== 0) p.push([]); 
    return { pages: p, categoryPages: catPages };
  }, [sortedFiltered, categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 pt-10 pb-28 overflow-x-hidden" data-testid="menu-page">
      <audio ref={audioRef} src="https://www.soundjay.com/misc/sounds/page-flip-01a.mp3" preload="auto" />
      {/* Hero */}
      <div className="text-center mb-8 lg:mb-12">
        <div className="hidden lg:block mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-xs uppercase">The royal menu</span></div>
        <h1 className="font-royal text-3xl lg:text-6xl text-brand-primary tracking-wide">{timeGreeting} <span className="font-editorial italic gold-shimmer">Menu</span></h1>
        <p className="hidden lg:block font-editorial italic text-lg text-[#1A1106]/75 mt-4 max-w-2xl mx-auto leading-relaxed">
          {isDinnerTime ? "Settle in for a royal dinner experience. We've highlighted the Chef's Specials for you." : "Explore our curated daylight favorites. Flip a card to read the chef's notes."}
        </p>
        
        {/* Search */}
        <div className="mt-5 lg:mt-7 mx-auto max-w-md flex items-center gap-3 bg-[#FAF5EC] border border-brand-secondary/40 rounded-full px-4 py-2 shadow-sm">
          <Search className="h-4 w-4 text-brand-primary" />
          <input
            data-testid="menu-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dish, ingredient or mood…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#1A1106]/40"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-[#1A1106]/40 hover:text-brand-primary">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 lg:mb-8 flex flex-col items-center">
        <div className="flex flex-wrap justify-center items-center gap-3">
          {/* Diet Filter */}
          <div className="flex items-center bg-[#FAF5EC] border border-[#E7DFCB] rounded-full p-1">
            <button
              onClick={() => setDietFilter("all")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase transition-all ${
                dietFilter === "all" ? "bg-brand-primary text-white" : "text-[#1A1106] hover:bg-[#F3EBD8]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietFilter("veg")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase transition-all inline-flex items-center gap-1 ${
                dietFilter === "veg" ? "bg-green-600 text-white" : "text-[#1A1106] hover:bg-[#F3EBD8]"
              }`}
            >
              <Leaf className="h-3 w-3" /> Veg
            </button>
            <button
              onClick={() => setDietFilter("non-veg")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase transition-all ${
                dietFilter === "non-veg" ? "bg-red-600 text-white" : "text-[#1A1106] hover:bg-[#F3EBD8]"
              }`}
            >
              Non-Veg
            </button>
          </div>

          <button
            onClick={() => { setShowBestSellers(!showBestSellers); setShowChefSpecials(false); }}
            className={`px-4 py-2 rounded-full text-[10px] font-royal tracking-wider uppercase border transition-all inline-flex items-center gap-1.5 ${
              showBestSellers 
                ? "bg-brand-secondary text-[#1A1106] border-brand-secondary" 
                : "bg-[#FAF5EC] text-[#1A1106] border-[#E7DFCB] hover:border-brand-secondary/50"
            }`}
          >
            <Sparkles className="h-3 w-3" /> Best Sellers
          </button>

          <button
            onClick={() => { setShowChefSpecials(!showChefSpecials); setShowBestSellers(false); }}
            className={`px-4 py-2 rounded-full text-[10px] font-royal tracking-wider uppercase border transition-all inline-flex items-center gap-1.5 ${
              showChefSpecials 
                ? "bg-brand-primary text-white border-brand-primary" 
                : "bg-[#FAF5EC] text-[#1A1106] border-[#E7DFCB] hover:border-brand-primary/50"
            }`}
          >
            <Flame className="h-3 w-3" /> Chef&apos;s Specials
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-full text-[10px] font-royal tracking-wider uppercase text-brand-primary hover:bg-brand-primary/10 transition-colors inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#FAF5EC] border border-[#E7DFCB] rounded-full p-1 flex items-center shadow-sm">
          <button 
            onClick={() => setViewMode("book")}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-royal tracking-widest uppercase transition-all ${viewMode === "book" ? "bg-brand-primary text-white shadow-md" : "text-[#1A1106]/70 hover:text-[#1A1106]"}`}
          >
            <BookOpen className="w-4 h-4" /> Experience
          </button>
          <button 
            onClick={() => setViewMode("quick")}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-royal tracking-widest uppercase transition-all ${viewMode === "quick" ? "bg-brand-primary text-white shadow-md" : "text-[#1A1106]/70 hover:text-[#1A1106]"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Quick Order
          </button>
        </div>
      </div>

      {/* CONDITIONAL RENDERING: BOOK OR QUICK MODE */}
      {viewMode === "book" ? (
        <div className="relative mt-8 flex flex-col items-center">
        <div className="w-full max-w-[320px] sm:max-w-[400px] mb-6 z-20 relative">
          <div className="flex overflow-x-auto gap-2 py-2 px-1 custom-scrollbar whitespace-nowrap">
            {categories.map((cat) => {
               const targetPage = categoryPages[cat];
               if (targetPage === undefined) return null;
               return (
                 <button 
                   key={cat}
                   onClick={() => {
                     const flipper = bookRef.current?.pageFlip();
                     if (flipper) {
                        try {
                            if (typeof flipper.flip === 'function') flipper.flip(targetPage);
                            else if (typeof flipper.turnToPage === 'function') flipper.turnToPage(targetPage);
                        } catch (e) {
                            console.error("Flip error:", e);
                            if (typeof flipper.turnToPage === 'function') flipper.turnToPage(targetPage);
                        }
                     }
                   }}
                   className="px-4 py-1.5 rounded-full border border-[#E7DFCB] text-[10px] font-royal tracking-widest uppercase transition bg-[#FAF5EC] text-brand-primary hover:bg-[#5C0E1B] hover:text-[#FAF5EC] shadow-sm flex-shrink-0"
                 >
                   {cat}
                 </button>
               );
            })}
          </div>
        </div>

          <AnimatePresence>
            {showSpecialsInsert && specialsItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  drag
                  dragMomentum={false}
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50, scale: 0.9 }}
                  className="pointer-events-auto w-[90%] max-w-[320px] bg-[#FAF5EC] p-6 shadow-2xl border border-[#E7DFCB] rounded-md cursor-grab active:cursor-grabbing"
                  style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}
                >
                <button onClick={() => setShowSpecialsInsert(false)} className="absolute top-3 right-3 text-[#1A1106]/50 hover:text-brand-primary">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-royal text-2xl text-brand-primary text-center mb-4 border-b border-brand-secondary/30 pb-2">Today's Specials</h3>
                <div className="flex flex-col gap-4">
                  {specialsItems.map(item => (
                    <div key={item.id} className="flex gap-3 items-center">
                       {item.image_url && <div className="w-12 h-12 shrink-0 rounded shadow-sm bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})`}} />}
                       <div className="flex-1">
                         <h4 className="font-royal text-sm text-brand-primary leading-tight">{item.name}</h4>
                         <span className="font-royal text-brand-primary font-semibold text-xs">{formatCurrency(item.price)}</span>
                       </div>
                       <div>
                          {cart.items.find(i => i.item_id === item.id) ? (
                              <button className="bg-brand-secondary text-[#1A1106] rounded px-3 py-1 text-[9px] font-royal font-bold uppercase shadow-sm cursor-default">Added</button>
                          ) : (
                              <button onClick={(e) => { e.stopPropagation(); cart.add(item); toast.success(`${item.name} added`); }} className="bg-brand-primary hover:bg-[#5C0E1B] text-white rounded px-3 py-1 text-[9px] font-royal font-bold uppercase transition shadow-sm border border-[#5C0E1B]">Add</button>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowSpecialsInsert(false)} className="w-full mt-5 py-2 bg-brand-primary text-white font-royal text-[10px] uppercase tracking-widest rounded-full hover:bg-[#5C0E1B] transition shadow-md">Explore Full Menu</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        <div className="w-full max-w-[1000px] flex justify-center perspective-[2000px] relative min-h-[500px] md:min-h-[650px]">

          {isLoading ? (
            <div className="flex justify-center items-center h-[70vh]">
              <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 && hasActiveFilters ? (
             <div className="text-center py-20">
                <p className="font-editorial italic text-lg text-[#1A1106]/60">No dish matches your criteria — try adjusting your filters.</p>
             </div>
          ) : (
            <>
              <HTMLFlipBook 
                key={`book-${pages.length}-${q}-${dietFilter}-${showBestSellers}-${showChefSpecials}`}
                width={320} 
                height={520} 
                size="stretch" 
                minWidth={250} 
                maxWidth={450} 
                minHeight={400} 
                maxHeight={650} 
                maxShadowOpacity={0.5} 
                showCover={true} 
                mobileScrollSupport={true} 
                disableFlipByClick={true}
                usePortrait={true}
                ref={bookRef}
                onFlip={(e: any) => { 
                  if(audioRef.current) audioRef.current.play().catch(()=>console.log("Audio blocked")); 
                  if (typeof e?.data === "number") setCurrentPageNum(e.data);
                }}
                className="mx-auto drop-shadow-2xl rounded-r-xl"
              >
                {/* FRONT COVER */}
                <Page density="hard">
                  <div className="h-full bg-brand-primary text-[#FAF5EC] flex flex-col items-center justify-center p-8 border-l-[12px] border-[#5C0E1B] rounded-r-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] pointer-events-none mix-blend-overlay"></div>
                    <div className="z-10 flex flex-col items-center">
                      <div className="mehfil-divider mb-6 opacity-60"></div>
                      <h1 className="font-royal text-4xl lg:text-5xl text-center leading-tight">{restaurantConfig?.name || "Menu"}</h1>
                      <div className="font-editorial italic text-brand-secondary text-xl mt-6 uppercase tracking-widest">Menu</div>
                      <div className="mehfil-divider mt-6 opacity-60"></div>
                    </div>
                    <div className="absolute bottom-10 font-royal tracking-[0.3em] text-[10px] opacity-50 uppercase">Swipe to open</div>
                  </div>
                </Page>
  
                {/* INSIDE FRONT COVER */}
                <Page density="hard">
                  <div className="h-full bg-[#EADDCA] p-8 flex flex-col items-center justify-center relative">
                     <div className="absolute inset-0 opacity-50 bg-[url('/parchment.png')] pointer-events-none mix-blend-multiply bg-cover bg-center"></div>
                     <p className="font-editorial italic text-center text-[#1A1106]/70 text-lg max-w-xs">{restaurantConfig?.history_intro || "Our journey began with a passion for great food."}</p>
                     <div className="mt-8 font-royal tracking-[0.2em] text-[#5C0E1B] text-xs uppercase">Enjoy your meal</div>
                  </div>
                </Page>
  
                {/* DISH PAGES */}
                {pages.map((pageItems, pageIdx) => (
                  <Page key={`page-${pageIdx}`}>
                    <div className="h-full w-full bg-[#FAF5EC] px-4 py-6 flex flex-col relative shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] border-r border-[#E7DFCB]/50">
                       <div className="absolute inset-0 opacity-40 bg-[url('/parchment.png')] pointer-events-none mix-blend-multiply bg-cover bg-center"></div>
                       <div className="flex-1 flex flex-col relative z-10 pt-1">
                          {pageItems.length > 0 && (
                            <div className="text-center mb-5">
                               <h3 className="font-royal text-sm text-[#5C0E1B] uppercase tracking-[0.2em] inline-block border-b border-[#5C0E1B]/30 pb-0.5">{pageItems[0].category || "Menu"}</h3>
                            </div>
                          )}
                      {pageItems.map((item) => {
                        const inCart = cart.items.find((i) => i.item_id === item.id);
                        return (
                          <div key={item.id} className="w-full bg-transparent mb-5 flex gap-3 items-center" data-testid={`menu-item-${item.id}`}>
                             {item.image_url && <div className="w-12 h-12 shrink-0 rounded shadow-sm bg-cover bg-center border border-[#E7DFCB]/50" style={{ backgroundImage: `url(${item.image_url})`}} />}
                             <div className="flex-1 flex flex-col justify-center">
                               <h4 className="font-royal text-sm text-brand-primary leading-tight font-bold">{item.name}</h4>
                               <span className="font-royal text-brand-primary font-semibold text-xs mt-0.5">{formatCurrency(item.price)}</span>
                               <div className="font-editorial italic text-[10px] text-[#1A1106]/70 leading-tight mt-1 line-clamp-2 pr-2">
                                  {item.description}
                                  {getPairingSuggestion(item.category || "", item.name) && (
                                    <span className="text-brand-secondary font-semibold ml-1">✨ {getPairingSuggestion(item.category || "", item.name)}</span>
                                  )}
                               </div>
                             </div>
                             <div className="shrink-0" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                {inCart ? (
                                  <div className="flex items-center gap-1.5 bg-[#FAF5EC] text-brand-primary border border-[#E7DFCB] rounded px-1 py-1 shadow-sm">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); cart.setQty(item.id, inCart.qty - 1); }} className="h-5 w-5 flex items-center justify-center hover:text-brand-secondary active:scale-95 transition"><Minus className="h-3 w-3" /></button>
                                    <span className="font-royal text-[10px] font-bold w-3 text-center">{inCart.qty}</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); cart.setQty(item.id, inCart.qty + 1); }} className="h-5 w-5 flex items-center justify-center hover:text-brand-secondary active:scale-95 transition"><Plus className="h-3 w-3" /></button>
                                  </div>
                                ) : (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); cart.add(item); toast.success(`${item.name} added`); }} className="bg-[#5C0E1B] text-[#FAF5EC] hover:bg-brand-primary rounded px-3 py-1.5 text-[9px] font-royal font-bold uppercase transition shadow-sm border border-[#5C0E1B] active:scale-95">Add</button>
                                )}
                             </div>
                          </div>
                        );
                      })}
                       </div>
                       <div className="absolute bottom-4 right-4 text-[10px] font-royal text-[#1A1106]/40">{pageIdx + 1}</div>
                    </div>
                  </Page>
                ))}
  
                {/* INSIDE BACK COVER */}
                <Page density="hard">
                  <div className="h-full bg-[#EADDCA] p-8 flex flex-col items-center justify-center relative">
                     <div className="absolute inset-0 opacity-50 bg-[url('/parchment.png')] pointer-events-none mix-blend-multiply bg-cover bg-center"></div>
                     <p className="font-royal tracking-[0.2em] text-brand-primary text-xs uppercase text-center max-w-[200px]">Thank you for dining with us</p>
                  </div>
                </Page>
  
                {/* BACK COVER */}
                <Page density="hard">
                  <div className="h-full bg-brand-primary flex flex-col items-center justify-center p-8 border-l-[12px] border-[#5C0E1B] rounded-l-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] pointer-events-none mix-blend-overlay"></div>
                    <div className="z-10 font-royal text-brand-secondary text-2xl">SmartDine AI</div>
                    <div className="z-10 font-editorial italic text-[#FAF5EC]/50 text-xs mt-2">© {new Date().getFullYear()}</div>
                  </div>
                </Page>
              </HTMLFlipBook>

              {/* Flip Book Navigation Controls */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 mb-8 w-full z-20">
                <button
                  type="button"
                  onClick={() => {
                    const flipper = bookRef.current?.pageFlip();
                    if (flipper && typeof flipper.flipPrev === "function") flipper.flipPrev();
                  }}
                  className="flex items-center gap-2 bg-[#FAF5EC] border border-[#E7DFCB] text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] px-5 py-2.5 rounded-full font-royal uppercase tracking-widest text-xs transition shadow-md active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="font-royal text-xs uppercase tracking-widest text-[#1A1106]/70 bg-[#E7DFCB]/50 px-4 py-2 rounded-full border border-[#E7DFCB]">
                  Page {currentPageNum + 1} of {pages.length + 4}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const flipper = bookRef.current?.pageFlip();
                    if (flipper && typeof flipper.flipNext === "function") flipper.flipNext();
                  }}
                  className="flex items-center gap-2 bg-[#FAF5EC] border border-[#E7DFCB] text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] px-5 py-2.5 rounded-full font-royal uppercase tracking-widest text-xs transition shadow-md active:scale-95"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      ) : (
        <div className="max-w-6xl mx-auto px-4 pb-20">
          <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E7DFCB] py-3 mb-6 -mx-4 px-4 overflow-x-auto whitespace-nowrap custom-scrollbar flex gap-2">
            <button onClick={() => setQuickCategory("All")} className={`px-4 py-1.5 rounded-full border border-[#E7DFCB] text-xs font-royal uppercase transition ${quickCategory === "All" ? 'bg-[#5C0E1B] text-[#FAF5EC]' : 'text-brand-primary hover:bg-[#FAF5EC]'}`}>All</button>
            {categories.map(cat => (
               <button key={cat} onClick={() => setQuickCategory(cat)} className={`px-4 py-1.5 rounded-full border border-[#E7DFCB] text-xs font-royal uppercase transition ${quickCategory === cat ? 'bg-[#5C0E1B] text-[#FAF5EC]' : 'text-brand-primary hover:bg-[#FAF5EC]'}`}>{cat}</button>
            ))}
          </div>
          {categories.map((cat) => {
            if (quickCategory !== "All" && quickCategory !== cat) return null;
            const catItems = sortedFiltered.filter(i => (i.category || "Other") === cat);
            if(catItems.length === 0) return null;
            return (
              <div key={cat} id={`cat-${cat.replace(/\s+/g, '-')}`} className="mb-12 scroll-mt-20">
                <h2 className="font-royal text-2xl text-brand-primary mb-6 border-b border-[#E7DFCB] pb-2 inline-block pr-10">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catItems.map(item => {
                    const inCart = cart.items.find(i => i.item_id === item.id);
                    return (
                      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-[#E7DFCB]/50 p-3 flex gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#5C0E1B]/10 transition-all duration-300">
                        <div className="flex-1 flex flex-col justify-center">
                          {item.tags?.includes("bestseller") && (
                            <span className="text-[9px] font-royal text-brand-secondary uppercase tracking-wider mb-1">Bestseller</span>
                          )}
                          <h3 className="font-royal text-base text-ink font-bold leading-tight">{item.name}</h3>
                          <span className="font-medium text-brand-primary font-royal text-sm mt-1">{formatCurrency(item.price)}</span>
                          <p className="text-stone text-[11px] mt-1 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="relative w-28 h-28 shrink-0 rounded-xl bg-cover bg-center border border-bone" style={{ backgroundImage: `url(${item.image_url})`}}>
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                            {inCart ? (
                               <div className="flex items-center gap-2 bg-white text-brand-primary border border-bone rounded-lg shadow-md px-2 py-1">
                                 <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} className="h-5 w-5 flex items-center justify-center hover:text-brand-secondary"><Minus className="h-3 w-3" /></button>
                                 <span className="font-royal text-xs font-bold w-3 text-center">{inCart.qty}</span>
                                 <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} className="h-5 w-5 flex items-center justify-center hover:text-brand-secondary"><Plus className="h-3 w-3" /></button>
                               </div>
                            ) : (
                               <button onClick={() => { cart.add(item); toast.success(`${item.name} added`); }} className="bg-white border border-bone text-brand-primary hover:bg-[#FAF5EC] rounded-lg shadow-md px-6 py-1.5 text-[10px] font-royal font-bold uppercase transition">ADD</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}


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
              <div className="absolute -top-2 -right-2 bg-brand-secondary text-[#1A1106] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-md">
                {cart.count()}
              </div>
            </div>
            <div className="flex flex-col items-start border-l border-white/20 pl-2.5 ml-1">
              <span className="text-[9px] font-royal tracking-wider uppercase text-white/70 leading-none mb-0.5">Your Thali</span>
              <span className="text-sm font-royal leading-none tracking-wide">{formatCurrency(cart.subtotal())}</span>
            </div>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
