"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/stores/cart";
import { getMealBalanceStatus, showAIUpsellSheet } from "@/lib/ai_waiter_client";
import { useMenuStore } from "@/stores/menu";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function AICourseTrackerCard() {
  const params = useParams();
  const slug = (params?.slug as string) || "mehfil";
  const items = useCart((s) => s.items);

  if (!items || items.length === 0) return null;

  const status = getMealBalanceStatus(items);
  const isComplete = !status.missingCategory;

  const handleCompleteMeal = () => {
    const menuStore = useMenuStore.getState();
    const currentCart = items || [];
    let keywords = ["beverage", "drink", "bread", "naan", "roti", "raita", "side", "dessert"];
    
    if (status.missingCategory === "Breads & Beverages") {
      keywords = ["bread", "naan", "roti", "beverage", "drink", "lassi", "raita", "side", "kulcha", "paratha"];
    } else if (status.missingCategory === "Dessert" || status.missingCategory === "Desserts") {
      keywords = ["dessert", "sweet", "kulfi", "jamun", "rasmalai", "ice cream", "halwa", "brownie"];
    } else if (status.missingCategory === "Main Course") {
      keywords = ["main course", "biryani", "curry", "dal", "paneer", "chicken", "mutton", "rice", "thali", "gravy"];
    } else if (status.missingCategory === "Starters") {
      keywords = ["starter", "kebab", "tikka", "snack", "appetizer", "papad", "fry", "manchurian", "tandoori"];
    }

    const realRecs = menuStore.getRecommendations(keywords, 6)
      .filter(r => !currentCart.some(ci => ci.item_id === r.id || ci.name === r.name));

    if (realRecs.length === 0) {
      const anyRecs = menuStore.getRecommendations([], 4)
        .filter(r => !currentCart.some(ci => ci.item_id === r.id || ci.name === r.name));
      if (anyRecs.length === 0) {
        import("sonner").then(({ toast }) => {
          toast.info("✨ You already have a wonderful royal selection in your cart!");
        });
        return;
      }
      showAIUpsellSheet(
        `Here are chef-recommended **Signature Additions** from our menu to complete your feast:`,
        anyRecs.map(r => ({ item_id: r.id, name: r.name, price: r.price, reason: r.description || "Chef signature recommendation" }))
      );
      return;
    }

    showAIUpsellSheet(
      `Here are signature **${status.missingCategory || "Royal"} Pairings** from our restaurant menu recommended by AI Waiter:`,
      realRecs.map(r => ({ item_id: r.id, name: r.name, price: r.price, reason: r.description || `Perfect pairing for your ${status.missingCategory || "feast"}` }))
    );
  };

  return (
    <div 
      className="mehfil-card rounded-2xl p-5 mb-6 border-2 border-[#8A6A1B]/40 bg-gradient-to-r from-[#FAF5EC] via-[#F4EBD9] to-[#FAF5EC] shadow-md transition-all duration-300 hover:shadow-lg"
      data-testid="ai-course-tracker-card"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-emerald-800 text-emerald-100" : "bg-[#8A6A1B] text-[#FAF5EC]"}`}>
            {isComplete ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <Sparkles className="h-5 w-5 animate-bounce" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-royal tracking-widest uppercase bg-[#8A6A1B]/15 text-[#8A6A1B] font-bold mb-1.5">
              {status.badgeText}
            </div>
            <p className="font-editorial italic text-sm text-[#1A1106]/85 leading-relaxed">
              {status.statusText}
            </p>
          </div>
        </div>

        {status.missingCategory && (
          <button
            type="button"
            onClick={handleCompleteMeal}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#5C0E1B] hover:bg-[#7a1324] text-[#FAF5EC] font-royal text-xs tracking-wider uppercase px-4 py-2.5 rounded-full shadow transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span>{status.suggestedAction}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
