"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sparkles, TrendingUp, TrendingDown, Clock, CheckCircle2, Server, Users, MessageSquare, Utensils, ShoppingBag } from "lucide-react";

export default function SuperAdminImpactPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-impact", "super-admin"],
    queryFn: () => api<any>("/api/analytics/impact"),
  });

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div></div>;
  }

  const rm = data?.restaurant_metrics || {};
  const gm = data?.global_metrics || {};

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold text-ink">SmartDine Platform Impact</h1>
        <p className="text-stone">Real-time AI performance and metrics across all restaurants globally.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-bone shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
            </div>
            {rm.aov_increase_pct > 0 ? (
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +{rm.aov_increase_pct}%
              </span>
            ) : (
              <span className="text-xs font-bold text-stone bg-cream px-2 py-1 rounded-full">
                Baseline
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-stone mb-1">Average Order Value (AI)</div>
            <div className="text-2xl font-mono font-bold text-ink">₹{Math.round(rm.ai_aov || 0)}</div>
            <div className="text-xs text-stone mt-1">vs ₹{Math.round(rm.manual_aov || 0)} manual</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-bone shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center">
              <Utensils className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-stone mb-1">Total AI Upselled Dishes</div>
            <div className="text-2xl font-mono font-bold text-ink">{rm.ai_upsell_dishes || 0}</div>
            <div className="text-xs text-stone mt-1">Dishes added via AI suggestions globally</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-bone shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Faster
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-stone mb-1">Order Placement</div>
            <div className="text-2xl font-heading font-bold text-ink">Optimized</div>
            <div className="text-xs text-stone mt-1">Customers order instantly via QR</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-bone shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Reduced
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-stone mb-1">Ordering Errors</div>
            <div className="text-2xl font-heading font-bold text-ink">Minimized</div>
            <div className="text-xs text-stone mt-1">Direct to Kitchen workflow</div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-heading font-bold text-ink mb-6">SmartDine Global Scale</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-ink text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <Users className="h-6 w-6 text-cream opacity-80" />
            <div className="text-2xl font-bold font-mono">{gm.active_restaurants || 0}</div>
            <div className="text-xs uppercase tracking-wider text-cream/70">Active Restaurants</div>
          </div>
          <div className="bg-brand-primary text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <MessageSquare className="h-6 w-6 text-cream opacity-80" />
            <div className="text-2xl font-bold font-mono">{gm.ai_conversations || 0}</div>
            <div className="text-xs uppercase tracking-wider text-cream/70">AI Conversations</div>
          </div>
          <div className="bg-[#1A1106] text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <ShoppingBag className="h-6 w-6 text-cream opacity-80" />
            <div className="text-2xl font-bold font-mono">{gm.orders_processed || 0}</div>
            <div className="text-xs uppercase tracking-wider text-cream/70">Orders Processed</div>
          </div>
          <div className="bg-green-800 text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <TrendingUp className="h-6 w-6 text-cream opacity-80" />
            <div className="text-2xl font-bold font-mono">{gm.customer_satisfaction || 0}%</div>
            <div className="text-xs uppercase tracking-wider text-cream/70">Success Rate</div>
          </div>
          <div className="bg-blue-900 text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
            <Server className="h-6 w-6 text-cream opacity-80" />
            <div className="text-2xl font-bold font-mono">₹{(gm.total_revenue || 0).toLocaleString()}</div>
            <div className="text-xs uppercase tracking-wider text-cream/70">Total Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
