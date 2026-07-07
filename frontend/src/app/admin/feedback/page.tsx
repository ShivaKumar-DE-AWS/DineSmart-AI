"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MessageSquareHeart, Star, Utensils, Headset, Sparkles, LayoutTemplate } from "lucide-react";
import { fmtTime } from "@/lib/utils";

interface Feedback {
  id: string;
  order_id: string;
  customer_name?: string;
  customer_phone?: string;
  table_number?: number;
  rating: number;
  food_quality?: number;
  service?: number;
  ambience?: number;
  smartdine_interface?: number;
  suggestions?: string;
  points_awarded: number;
  created_at: string;
}

export default function AdminFeedback() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: () => api<{ feedbacks: Feedback[] }>("/api/feedbacks"),
    refetchInterval: 30000,
  });

  const feedbacks = data?.feedbacks || [];
  
  const avgRating = feedbacks.length 
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : "0.0";
    
  const avgFood = feedbacks.filter(f => f.food_quality).length
    ? (feedbacks.filter(f => f.food_quality).reduce((sum, f) => sum + f.food_quality!, 0) / feedbacks.filter(f => f.food_quality).length).toFixed(1)
    : "0.0";
    
  const avgInterface = feedbacks.filter(f => f.smartdine_interface).length
    ? (feedbacks.filter(f => f.smartdine_interface).reduce((sum, f) => sum + f.smartdine_interface!, 0) / feedbacks.filter(f => f.smartdine_interface).length).toFixed(1)
    : "0.0";

  return (
    <div data-testid="admin-feedback-page">
      <div className="mb-6 md:mb-8">
        <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Customer Voice</p>
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Feedback & Reviews</h1>
        <p className="text-sm text-stone mt-1">{feedbacks.length} total reviews collected.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-bone rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 bg-cream rounded-full flex items-center justify-center text-ink shrink-0">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone font-semibold">Avg Rating</div>
            <div className="font-heading text-xl md:text-2xl mt-0.5">{avgRating}</div>
          </div>
        </div>
        <div className="bg-white border border-bone rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 bg-cream rounded-full flex items-center justify-center text-ink shrink-0">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone font-semibold">Food Quality</div>
            <div className="font-heading text-xl md:text-2xl mt-0.5">{avgFood}</div>
          </div>
        </div>
        <div className="bg-white border border-bone rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 bg-cream rounded-full flex items-center justify-center text-ink shrink-0">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone font-semibold">App Interface</div>
            <div className="font-heading text-xl md:text-2xl mt-0.5">{avgInterface}</div>
          </div>
        </div>
        <div className="bg-white border border-bone rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 bg-cream rounded-full flex items-center justify-center text-ink shrink-0">
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone font-semibold">Suggestions</div>
            <div className="font-heading text-xl md:text-2xl mt-0.5">{feedbacks.filter(f => f.suggestions).length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && <div className="p-8 text-center text-stone">Loading feedback...</div>}
        {!isLoading && feedbacks.length === 0 && <div className="p-8 text-center text-stone">No feedback yet.</div>}
        
        {feedbacks.map((fb) => (
          <div key={fb.id} className="bg-white border border-bone rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg">{fb.customer_name || "Guest"}</div>
                  {fb.table_number && (
                    <span className="text-[10px] uppercase tracking-wider bg-cream text-stone px-2 py-0.5 rounded-full border border-bone font-medium">
                      Table {fb.table_number}
                    </span>
                  )}
                  {fb.customer_phone && (
                    <span className="text-[10px] text-stone font-mono">{fb.customer_phone}</span>
                  )}
                </div>
                <div className="text-xs text-stone mt-0.5 flex items-center gap-2">
                  <span>{new Date(fb.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>•</span>
                  <span>Order: {fb.order_id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-600 text-sm">{fb.rating}.0</span>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
              {fb.food_quality && (
                <div className="bg-cream/50 p-2 rounded-lg border border-bone flex justify-between items-center">
                  <span className="text-stone">Food:</span>
                  <span className="font-semibold flex items-center gap-1">{fb.food_quality} <Star className="h-3 w-3 fill-amber-400 text-amber-400"/></span>
                </div>
              )}
              {fb.service && (
                <div className="bg-cream/50 p-2 rounded-lg border border-bone flex justify-between items-center">
                  <span className="text-stone">Service:</span>
                  <span className="font-semibold flex items-center gap-1">{fb.service} <Star className="h-3 w-3 fill-amber-400 text-amber-400"/></span>
                </div>
              )}
              {fb.ambience && (
                <div className="bg-cream/50 p-2 rounded-lg border border-bone flex justify-between items-center">
                  <span className="text-stone">Ambience:</span>
                  <span className="font-semibold flex items-center gap-1">{fb.ambience} <Star className="h-3 w-3 fill-amber-400 text-amber-400"/></span>
                </div>
              )}
              {fb.smartdine_interface && (
                <div className="bg-cream/50 p-2 rounded-lg border border-bone flex justify-between items-center">
                  <span className="text-stone">App:</span>
                  <span className="font-semibold flex items-center gap-1">{fb.smartdine_interface} <Star className="h-3 w-3 fill-amber-400 text-amber-400"/></span>
                </div>
              )}
            </div>

            {fb.suggestions && (
              <div className="bg-[#FAF5EC] border-l-2 border-brand-primary p-3 rounded-r-lg mt-3">
                <div className="text-[10px] uppercase tracking-widest text-brand-primary font-bold mb-1">Customer Suggestion</div>
                <p className="text-sm italic text-ink/80">&quot;{fb.suggestions}&quot;</p>
              </div>
            )}
            
            <div className="mt-3 flex justify-end">
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  +{fb.points_awarded} Points Awarded
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
