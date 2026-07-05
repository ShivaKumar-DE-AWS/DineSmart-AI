"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/stores/session";
import { api } from "@/lib/api";
import { Lightbulb, TrendingUp, Package, Users, Utensils, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Insight {
  title: string;
  description: string;
  type: "sales" | "inventory" | "menu" | "customers";
  action_text: string;
  action_link: string;
}

export default function InsightsPage() {
  const { user } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ai_insights"],
    queryFn: () => api<{ insights: Insight[] }>("/api/analytics/insights"),
    enabled: !!user,
  });

  const insights: Insight[] = data?.insights || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Ideally we would bust the cache on the backend, but for now we just refetch
    await refetch();
    toast.success("Insights refreshed");
    setRefreshing(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "sales": return <TrendingUp size={24} className="text-amber-500" />;
      case "inventory": return <Package size={24} className="text-amber-500" />;
      case "customers": return <Users size={24} className="text-amber-500" />;
      case "menu": return <Utensils size={24} className="text-amber-500" />;
      default: return <Lightbulb size={24} className="text-amber-500" />;
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="text-amber-500" />
            AI Business Insights
          </h1>
          <p className="text-stone-400 mt-1">Smart recommendations based on your restaurant's data.</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-lg hover:border-amber-500/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing || isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 h-48 animate-pulse flex flex-col justify-between">
              <div>
                <div className="h-8 w-8 bg-stone-800 rounded-full mb-4"></div>
                <div className="h-6 w-3/4 bg-stone-800 rounded mb-2"></div>
                <div className="h-4 w-full bg-stone-800 rounded"></div>
              </div>
              <div className="h-10 w-1/3 bg-stone-800 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-20 bg-stone-900/50 rounded-xl border border-stone-800">
          <Lightbulb size={48} className="mx-auto text-stone-600 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Insights Yet</h3>
          <p className="text-stone-400 max-w-md mx-auto">
            Not enough data has been collected to generate meaningful insights. Check back later!
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-lg shadow-black/20 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-amber-500">
                    {getIconForType(insight.type)}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-stone-950 border border-stone-800 rounded text-stone-400 uppercase tracking-wider">
                    {insight.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-stone-100">{insight.title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  {insight.description}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-stone-800">
                <Link 
                  href={insight.action_link}
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                >
                  {insight.action_text}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
