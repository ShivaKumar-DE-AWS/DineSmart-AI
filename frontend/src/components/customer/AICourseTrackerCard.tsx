"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/stores/cart";
import { getMealBalanceStatus, showAIUpsellSheet } from "@/lib/ai_waiter_client";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function AICourseTrackerCard() {
  const params = useParams();
  const slug = (params?.slug as string) || "mehfil";
  const items = useCart((s) => s.items);

  if (!items || items.length === 0) return null;

  const status = getMealBalanceStatus(items);
  const isComplete = !status.missingCategory;

  const handleCompleteMeal = () => {
    let suggestedItems = [
      { item_id: "cool-1", name: "Sweet Lassi", price: 90, reason: "Refreshing royal drink to balance rich flavors" },
      { item_id: "cool-2", name: "Mint Raita", price: 80, reason: "Cooling spiced yogurt accompaniment" },
      { item_id: "bread-1", name: "Butter Naan", price: 50, reason: "Fresh tandoori bread baked to perfection" },
    ];

    if (status.missingCategory === "Breads & Beverages") {
      suggestedItems = [
        { item_id: "bread-1", name: "Butter Naan", price: 50, reason: "Fresh tandoori bread baked to perfection" },
        { item_id: "bread-2", name: "Garlic Naan", price: 65, reason: "Aromatic garlic butter naan" },
        { item_id: "bev-1", name: "Sweet Lassi", price: 90, reason: "Traditional chilled yogurt drink" },
        { item_id: "bev-2", name: "Mint Raita", price: 80, reason: "Cooling spiced mint yogurt" },
      ];
    } else if (status.missingCategory === "Dessert") {
      suggestedItems = [
        { item_id: "des-1", name: "Gulab Jamun (2 pcs)", price: 90, reason: "Warm royal sweet dumplings" },
        { item_id: "des-2", name: "Rasmalai", price: 110, reason: "Rich saffron milk sweet delicacies" },
        { item_id: "des-3", name: "Royal Kulfi", price: 120, reason: "Traditional dense Indian ice cream" },
      ];
    } else if (status.missingCategory === "Main Course") {
      suggestedItems = [
        { item_id: "main-1", name: "Dal Makhani", price: 220, reason: "24-hour slow cooked black lentils" },
        { item_id: "main-2", name: "Paneer Butter Masala", price: 260, reason: "Rich tomato cashew gravy with soft paneer" },
        { item_id: "main-3", name: "Butter Chicken", price: 310, reason: "Signature royal chicken delicacy" },
        { item_id: "main-4", name: "Pista House Keema Biryani", price: 350, reason: "Fragrant dum biryani with spiced minced meat" },
      ];
    } else if (status.missingCategory === "Starters") {
      suggestedItems = [
        { item_id: "start-1", name: "Reshmi Kebab", price: 290, reason: "Silky smooth chicken tandoori kebab" },
        { item_id: "start-2", name: "Paneer Tikka", price: 240, reason: "Charcoal grilled marinated cottage cheese" },
        { item_id: "start-3", name: "Murgh Pudina Kebab", price: 280, reason: "Refreshing mint spiced chicken tandoori" },
      ];
    }

    showAIUpsellSheet(
      `Here are signature **${status.missingCategory || "Royal"} Pairings** recommended by AI Waiter to complete your feast:`,
      suggestedItems
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
