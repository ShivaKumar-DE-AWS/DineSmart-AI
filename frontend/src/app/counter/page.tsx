"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { Check, Clock, ChefHat, Bell, Utensils, Users, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/stores/session";
import { useRestaurantConfig, getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { playChime, notify } from "@/lib/notify";
import { toast } from "sonner";
import { useOrderStream } from "@/hooks/useOrderStream";

function getRestaurantName(restaurantId?: string, restaurantSlug?: string): string {
  if (restaurantSlug) {
    const config = getRestaurantConfig(restaurantSlug);
    if (config?.name && config.name !== "Restaurant") return config.name;
  }
  if (!restaurantId) return "Counter";
  return restaurantId.replace("rest_", "").replace(/_001$/, "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
}

export default function CounterPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || getRestaurantName(user?.restaurant_id, user?.restaurant_slug);

  useOrderStream(); // SSE real-time push

  const { data } = useQuery({
    queryKey: ["counter-orders", user?.restaurant_id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?limit=200${user?.restaurant_id ? `&restaurant_id=${user.restaurant_id}` : ""}`),
    refetchInterval: 60000, // 60s fallback — SSE handles real-time
  });
  const mut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "served" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counter-orders", user?.restaurant_id] }),
  });

  const allOrders = data?.orders || [];
  const preparing = allOrders.filter((o) => ["confirmed", "preparing"].includes(o.status));
  const ready = allOrders.filter((o) => o.status === "ready");
  const servedToday = allOrders.filter((o) => o.status === "served").length;

  const readyIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(ready.map((o) => o.id));
    if (readyIdsRef.current === null) { readyIdsRef.current = ids; return; }
    const fresh = ready.filter((o) => !readyIdsRef.current!.has(o.id));
    if (fresh.length) {
      playChime("ready");
      for (const o of fresh) notify(`ORDER UP · ${o.token}`, `${o.customer_name} — please collect`);
    }
    readyIdsRef.current = ids;
  }, [ready]);

  const { data: notifsData } = useQuery({
    queryKey: ["counter-notifications", user?.restaurant_id],
    queryFn: () => api<{ notifications: any[] }>(`/api/notifications${user?.restaurant_id ? `?restaurant_id=${user.restaurant_id}` : ""}`),
    refetchInterval: 3000,
  });

  const markReadMut = useMutation({
    mutationFn: (n_id: string) => api(`/api/notifications/${n_id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["counter-notifications"] }); },
  });

  const [notifiedSet] = useState(() => new Set<string>());

  useEffect(() => {
    const unread = (notifsData?.notifications || []).filter((n: any) => !n.read && n.type === "staff_call");
    for (const n of unread) {
      if (!notifiedSet.has(n.id)) {
        notifiedSet.add(n.id);
        playChime("ready");
        const tId = toast.info(n.message || `Table calling for staff!`, {
          icon: '🛎️',
          duration: 15000,
          action: {
            label: 'Acknowledge',
            onClick: () => {
              markReadMut.mutate(n.id);
              toast.dismiss(tId);
            }
          }
        });
      }
    }
  }, [notifsData, notifiedSet, markReadMut]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Header */}
      <header className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Utensils className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-emerald-400/80 text-xs font-medium tracking-widest uppercase">{restaurantName}</p>
              <h1 className="text-2xl font-bold text-white tracking-tight">Counter Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5">
                <ChefHat className="h-4 w-4 text-blue-400" />
                <span className="text-zinc-400">Cooking</span>
                <span className="text-blue-400 font-bold text-lg">{preparing.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400/70">Ready</span>
                <span className="text-emerald-400 font-bold text-lg">{ready.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5">
                <Check className="h-4 w-4 text-purple-400" />
                <span className="text-zinc-400">Served</span>
                <span className="text-purple-400 font-bold text-lg">{servedToday}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        {/* Preparing Column */}
        <section className="border-r border-zinc-800/50 p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                <ChefHat className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-blue-400/70">In Preparation</p>
                <h2 className="text-lg font-bold text-white">Cooking Now</h2>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-2xl w-12 h-12 rounded-xl flex items-center justify-center">
              {preparing.length}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 auto-rows-min gap-3 overflow-y-auto scrollbar-thin" data-testid="counter-preparing">
            {preparing.map((o) => (
              <div key={o.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-center hover:border-blue-500/30 transition-colors group" data-testid={`counter-prep-${o.token}`}>
                <div className="text-4xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{o.token}</div>
                <div className="text-[10px] uppercase text-zinc-500 tracking-wider">{o.customer_name}</div>
                {o.table_number != null && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                    <Users className="h-3 w-3" /> T{o.table_number}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-zinc-600">
                  <Clock className="h-3 w-3" />
                  {Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)}m
                </div>
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
                  <ChefHat className="h-7 w-7 text-zinc-600" />
                </div>
                <p className="text-zinc-600 text-sm">Nothing cooking</p>
              </div>
            )}
          </div>
        </section>

        {/* Ready Column */}
        <section className="p-6 overflow-hidden flex flex-col bg-gradient-to-br from-emerald-900/5 to-[#0a0a0f]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-emerald-400/70">Ready for Pickup</p>
                <h2 className="text-lg font-bold text-white">Serve Now</h2>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-2xl w-12 h-12 rounded-xl flex items-center justify-center">
              {ready.length}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 auto-rows-min gap-4 overflow-y-auto scrollbar-thin" data-testid="counter-ready">
            {ready.map((o) => (
              <div key={o.id} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 flex flex-col shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-shadow" data-testid={`counter-ready-${o.token}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-5xl font-bold leading-none">{o.token}</div>
                  {o.table_number != null && (
                    <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl font-bold text-sm" data-testid={`counter-table-${o.token}`}>
                      Table {o.table_number}
                    </div>
                  )}
                </div>
                <div className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90">{o.customer_name}</div>
                {(o.items.some((i) => i.notes) || o.notes) && (
                  <div className="mt-3 space-y-1 text-[11px]" data-testid={`counter-notes-${o.token}`}>
                    {o.items.filter((i) => i.notes).map((i) => (
                      <div key={i.item_id} className="bg-white/15 border border-white/20 rounded-lg px-2.5 py-1"><span className="font-bold">{i.qty}× {i.name}:</span> {i.notes}</div>
                    ))}
                    {o.notes && <div className="bg-white/15 border border-white/20 rounded-lg px-2.5 py-1"><span className="font-bold">Note:</span> {o.notes}</div>}
                  </div>
                )}
                <button
                  data-testid={`counter-serve-${o.token}`}
                  onClick={() => mut.mutate({ id: o.id })}
                  className="mt-auto pt-3 bg-white text-emerald-600 font-bold py-3 rounded-xl hover:bg-white/90 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="h-4 w-4" /> MARK SERVED
                </button>
              </div>
            ))}
            {ready.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Clock className="h-7 w-7 text-emerald-500/40" />
                </div>
                <p className="text-emerald-500/40 text-sm font-medium">Waiting on kitchen...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
