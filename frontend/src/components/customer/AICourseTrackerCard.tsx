"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/stores/cart";
import { sendAIWaiterEvent, showAIUpsellSheet, AIWaiterEventResponse } from "@/lib/ai_waiter_client";
import { Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export function AICourseTrackerCard() {
  const params = useParams();
  const slug = (params?.slug as string) || "mehfil";
  const items = useCart((s) => s.items);

  const [aiResponse, setAiResponse] = useState<AIWaiterEventResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items || items.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let isMounted = true;
    
    // Map items to AIWaiterCartItem format
    const cartState = items.map(i => ({
      item_id: i.item_id || "",
      name: i.name,
      price: i.price,
      qty: i.qty,
      category: i.category,
    }));

    sendAIWaiterEvent({
      event_type: "CHECKOUT",
      restaurant_id: slug,
      cart_state: cartState,
      silent: true,
    }).then((res) => {
      if (isMounted) {
        setAiResponse(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [items, slug]);

  if (!items || items.length === 0) return null;

  const isComplete = !aiResponse || !aiResponse.suggested_items || aiResponse.suggested_items.length === 0;

  const handleCompleteMeal = () => {
    if (!aiResponse || !aiResponse.suggested_items || aiResponse.suggested_items.length === 0) {
      import("sonner").then(({ toast }) => {
        toast.info("✨ You already have a wonderful selection in your cart!");
      });
      return;
    }

    showAIUpsellSheet(
      aiResponse.dialogue_text || "Here are signature pairings recommended by our AI Chef:",
      aiResponse.suggested_items
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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isComplete ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <Sparkles className="h-5 w-5 animate-bounce" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-royal tracking-widest uppercase bg-[#8A6A1B]/15 text-[#8A6A1B] font-bold mb-1.5">
              {loading ? "🤖 AI Waiter Thinking..." : isComplete ? "🌟 Perfect Order" : "🤖 AI Waiter Course Guidance"}
            </div>
            <p className="font-editorial italic text-sm text-[#1A1106]/85 leading-relaxed">
              {loading 
                ? "Our AI chef is reviewing your order to suggest the perfect pairings..." 
                : isComplete 
                  ? (aiResponse?.dialogue_text || "Perfection! Your order is beautifully balanced.") 
                  : (aiResponse?.dialogue_text || "You are just getting started! Let's explore some delicious pairings.")}
            </p>
          </div>
        </div>

        {!loading && !isComplete && (
          <button
            type="button"
            onClick={handleCompleteMeal}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#5C0E1B] hover:bg-[#7a1324] text-[#FAF5EC] font-royal text-xs tracking-wider uppercase px-4 py-2.5 rounded-full shadow transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span>Complete Meal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
