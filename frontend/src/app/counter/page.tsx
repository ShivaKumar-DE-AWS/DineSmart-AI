"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { Check, Clock, ChefHat, Bell, Utensils, Users, Sparkles, CreditCard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/stores/session";
import { useRestaurantConfig, getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { playChime, notify } from "@/lib/notify";
import { toast } from "sonner";
import { useOrderStream } from "@/hooks/useOrderStream";
import { OrderDetailsModal } from "@/components/shared/OrderDetailsModal";

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
  const slug = user?.restaurant_slug || "";

  useOrderStream(); // SSE real-time push
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data } = useQuery({
    queryKey: ["counter-orders", user?.restaurant_id],
    queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"),
    refetchInterval: 10000, // 10s auto-refresh fallback — SSE handles real-time push
  });
  const mut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "served" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counter-orders", user?.restaurant_id] }),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ payment_status: "paid" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counter-orders", user?.restaurant_id] }),
  });

  const rawOrders = data?.orders || [];
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "dine_in" | "takeaway">("all");
  const allOrders = rawOrders.filter((o) => {
    if (orderTypeFilter === "all") return true;
    if (orderTypeFilter === "dine_in") return o.order_type !== "takeaway" && o.table_number != null;
    return o.order_type === "takeaway" || o.table_number == null;
  });
  const preparing = allOrders.filter((o) => ["confirmed", "preparing"].includes(o.status));
  const ready = allOrders.filter((o) => o.status === "ready" || (o.status === "served" && o.payment_status !== "paid"));
  const servedToday = rawOrders.filter((o) => o.status === "served" && o.payment_status === "paid").length;
  const unpaidPreOrders = allOrders.filter((o) => o.payment_status !== "paid" && ["pending", "confirmed", "preparing"].includes(o.status));

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

  const billIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const billOrders = allOrders.filter((o) => o.bill_requested && o.payment_status !== "paid");
    const ids = new Set(billOrders.map((o) => o.id));
    if (billIdsRef.current === null) { billIdsRef.current = ids; return; }
    const fresh = billOrders.filter((o) => !billIdsRef.current!.has(o.id));
    if (fresh.length) {
      playChime("ready");
      for (const o of fresh) {
        notify(`🧾 BILL REQUESTED · Table ${o.table_number || o.token}`, `${o.customer_name} wants to settle ₹${o.total}`);
        toast.info(`🧾 Table ${o.table_number || o.token} requested bill! Total: ₹${o.total}`, { duration: 10000, icon: '💰' });
      }
    }
    billIdsRef.current = ids;
  }, [allOrders]);

  const { data: notifsData } = useQuery({
    queryKey: ["counter-notifications", user?.restaurant_id],
    queryFn: () => api<{ notifications: any[] }>("/api/notifications"),
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
        const msg = n.message || (n.title ? `${n.title} — ${n.body || ''}` : `Table ${n.table_number || ''} calling for staff! ${n.body || ''}`);
        const tId = toast.info(msg, {
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
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Utensils className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-emerald-400/80 text-xs font-medium tracking-widest uppercase">{restaurantName}</p>
              <h1 className="text-2xl font-bold text-white tracking-tight">Counter Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="/counter/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition shadow-lg active:scale-95"
            >
              📺 Open TV Monitor
            </a>
            <div className="hidden md:flex items-center gap-6 text-xs">
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


      {/* Staff Call Alert Banner */}
      {(() => {
        const unreadStaffCalls = (notifsData?.notifications || []).filter((n: any) => !n.read && n.type === "staff_call");
        if (unreadStaffCalls.length === 0) return null;
        return (
          <div className="max-w-7xl mx-auto px-6 mt-4 w-full z-30">
            {unreadStaffCalls.map((n: any) => (
              <div key={n.id} className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl p-4 shadow-2xl shadow-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 animate-pulse border border-amber-400/30">
                <div className="flex items-center gap-4 text-white">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Bell className="h-6 w-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{n.title || `Table ${n.table_number || ''} calling for staff!`}</h3>
                    <p className="text-sm opacity-95 font-medium">{n.body || n.message || 'Assistance requested'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => markReadMut.mutate(n.id)}
                  className="bg-white text-amber-700 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-white/90 transition shadow-md active:scale-95 shrink-0"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-4 mb-2 flex items-center gap-2">
        <button
          onClick={() => setOrderTypeFilter("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            orderTypeFilter === "all" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setOrderTypeFilter("dine_in")}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            orderTypeFilter === "dine_in" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Dine-In
        </button>
        <button
          onClick={() => setOrderTypeFilter("takeaway")}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            orderTypeFilter === "takeaway" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Takeaway
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-zinc-800/50">
        {/* Preparing Column */}
        <section className="border-b sm:border-b-0 sm:border-r border-zinc-800/50 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-blue-400" />
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
          <div
            className="grid grid-cols-2 sm:grid-cols-3 auto-rows-min gap-3 overflow-y-auto dashboard-scroll scrollbar-dark"
            style={{ maxHeight: "70vh" }}
            data-testid="counter-preparing"
          >
            {preparing.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className="relative bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-center hover:border-blue-500/30 transition-colors group cursor-pointer"
                data-testid={`counter-prep-${o.token}`}
              >
                <div className="text-4xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{o.token}</div>
                <div className={`text-[8px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                  o.order_type === "takeaway"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {o.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
                </div>
                <div className="text-[10px] uppercase text-zinc-500 tracking-wider mt-1">{o.customer_name}</div>
                {o.table_number != null && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                    <Users className="h-3 w-3" /> T{o.table_number}
                  </div>
                )}
                <div className="mt-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 text-left text-xs space-y-1">
                  {o.items.map((i, idx) => (
                    <div key={`${i.item_id}-${idx}`} className="flex justify-between items-start gap-1.5 text-zinc-300">
                      <span className="font-semibold text-white">{i.qty}× {i.name}</span>
                      {i.notes && <span className="text-[10px] text-amber-400 italic bg-amber-500/10 px-1.5 py-0.5 rounded">{i.notes}</span>}
                    </div>
                  ))}
                  {o.notes && <div className="text-[10px] text-amber-300 italic pt-1 border-t border-zinc-800">Note: {o.notes}</div>}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)}m ago</span>
                  <span className="text-blue-400 font-bold group-hover:underline">👁️ View Details</span>
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
        <section className="p-6 flex flex-col bg-gradient-to-br from-emerald-900/5 to-[#0a0a0f]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-emerald-400/70">Ready / Active Tables</p>
                <h2 className="text-lg font-bold text-white">Serve & Settle</h2>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-2xl w-12 h-12 rounded-xl flex items-center justify-center">
              {ready.length}
            </div>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 auto-rows-min gap-4 overflow-y-auto dashboard-scroll scrollbar-dark"
            style={{ maxHeight: "70vh" }}
            data-testid="counter-ready"
          >
            {ready.map((o) => {
              const isBillRequested = o.bill_requested && o.payment_status !== "paid";
              const isServed = o.status === "served";
              const cardBg = isBillRequested
                ? "bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-300 animate-pulse shadow-xl shadow-amber-500/30"
                : isServed
                ? "bg-gradient-to-br from-blue-900 to-indigo-950 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20";
              return (
              <div key={o.id} onClick={() => setSelectedOrder(o)} className={`${cardBg} text-white rounded-2xl p-6 flex flex-col transition-shadow cursor-pointer`} data-testid={`counter-ready-${o.token}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-5xl font-bold leading-none">{o.token}</div>
                  <div className={`text-[9px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full ${
                    o.order_type === "takeaway"
                      ? "bg-white/25 text-white"
                      : "bg-amber-500/30 text-white"
                  }`}>
                    {o.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
                  </div>
                  {o.table_number != null && (
                    <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl font-bold text-sm" data-testid={`counter-table-${o.token}`}>
                      Table {o.table_number}
                    </div>
                  )}
                </div>
                <div className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90 flex items-center justify-between">
                  <span>{o.customer_name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                      {o.payment_method === "upi" ? "UPI" : o.payment_method === "card_machine" ? "CARD" : "CASH"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-white/40" : "bg-red-500/80 text-white"}`}>
                      {o.payment_status === "paid" ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                </div>
                {isBillRequested && (
                  <div className="mt-3 bg-amber-400 text-amber-950 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow">
                    <span>🔔 BILL REQUESTED — SETTLE NOW</span>
                  </div>
                )}
                {!isBillRequested && isServed && (
                  <div className="mt-3 bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                    <span>🍽️ SERVED · EATING</span>
                  </div>
                )}
                <div className="mt-3 bg-black/25 border border-white/10 rounded-xl p-2.5 text-left text-xs space-y-1" data-testid={`counter-dishes-${o.token}`}>
                  {o.items.map((i, idx) => (
                    <div key={`${i.item_id}-${idx}`} className="flex justify-between items-start gap-1 text-zinc-100">
                      <span className="font-bold text-white">{i.qty}× {i.name}</span>
                      {i.notes && <span className="text-[10px] text-amber-300 bg-black/40 px-1.5 py-0.5 rounded">{i.notes}</span>}
                    </div>
                  ))}
                  {o.notes && <div className="text-[11px] text-amber-200 italic pt-1 border-t border-white/10 font-medium">Order Note: {o.notes}</div>}
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[11px] text-white/80 font-bold underline">👁️ View Full Details</span>
                </div>
                <div className="mt-auto pt-4 flex gap-2 flex-col sm:flex-row">
                  {o.payment_status !== "paid" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markPaidMut.mutate({ id: o.id }); }}
                      className="flex-1 bg-red-500/30 hover:bg-red-500/40 border border-red-300/60 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow"
                    >
                      <CreditCard className="h-4 w-4" /> MARK PAID
                    </button>
                  )}
                  {o.status !== "served" && (
                    <button
                      data-testid={`counter-serve-${o.token}`}
                      onClick={(e) => { e.stopPropagation(); mut.mutate({ id: o.id }); }}
                      className="flex-1 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm bg-white text-emerald-700 hover:bg-white/90 shadow"
                    >
                      <Check className="h-4 w-4" /> MARK SERVED
                    </button>
                  )}
                </div>
              </div>
            )})}
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

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onMarkPaid={selectedOrder.payment_status !== "paid" ? () => markPaidMut.mutate({ id: selectedOrder.id }) : undefined}
          onMarkServed={selectedOrder.status !== "served" ? () => mut.mutate({ id: selectedOrder.id }) : undefined}
        />
      )}
    </div>
  );
}
