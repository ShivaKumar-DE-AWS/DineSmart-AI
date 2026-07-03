"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/stores/cart";
import { getMealBalanceStatus } from "@/lib/ai_waiter_client";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function AICourseTrackerCard() {
  const params = useParams();
  const slug = (params?.slug as string) || "mehfil";
  const items = useCart((s) => s.items);

  if (!items || items.length === 0) return null;

  const status = getMealBalanceStatus(items);
  const isComplete = !status.missingCategory;

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
          <Link
            href={`/r/${slug}/menu`}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#5C0E1B] hover:bg-[#7a1324] text-[#FAF5EC] font-royal text-xs tracking-wider uppercase px-4 py-2.5 rounded-full shadow transition-all duration-200"
          >
            <span>{status.suggestedAction}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
