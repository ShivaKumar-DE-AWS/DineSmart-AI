"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { Check, Clock, ChefHat, Bell, Utensils, Users, Sparkles, CreditCard, QrCode } from "lucide-react";
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

function printTakeawayMenuQr(slug: string, restaurantName: string) {
  const menuUrl = `${window.location.origin}/r/${slug}/menu`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
  w.document.write(`<!doctype html><html><head><title>${restaurantName} — Takeaway QR</title>
    <style>
      @page { margin: 0; size: 1200px 1600px; }
      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #FAF5EC; font-family: Georgia, serif; }
      .card { width: 1200px; height: 1600px; background: #FAF5EC; border: 8px solid #5C0E1B; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; }
      .badge { font-size: 28px; background: #5C0E1B; color: #FAF5EC; padding: 10px 40px; border-radius: 40px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
      .name { font-size: 56px; font-weight: bold; color: #5C0E1B; margin-bottom: 10px; }
      .divider { width: 300px; height: 3px; background: #5C0E1B; margin: 20px auto; }
      .subtitle { font-size: 32px; color: #8A6A1B; margin-bottom: 20px; }
      .qr-wrap { margin: 40px 0; }
      .qr-wrap img { width: 500px; height: 500px; }
      .footer { font-size: 18px; color: #8A6A1B; margin-top: auto; }
    </style></head><body>
    <div class="card">
      <div class="badge">Takeaway Menu</div>
      <div class="name">${restaurantName}</div>
      <div class="divider"></div>
      <div class="subtitle">Scan to order takeaway</div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(menuUrl)}" alt="QR" /></div>
      <div class="footer">Powered by SmartDine AI</div>
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),500)};</script>
    </body></html>`);
  w.document.close();
}

function printTakeawayQr(order: Order, slug: string, restaurantName: string) {
  const trackUrl = `${window.location.origin}/r/${slug}/track/${order.id}`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
  w.document.write(`<!doctype html><html><head><title>${restaurantName} — ${order.token}</title>
    <style>
      @page { margin: 0; size: 1200px 1600px; }
      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #FAF5EC; font-family: Georgia, serif; }
      .card { width: 1200px; height: 1600px; background: #FAF5EC; border: 8px solid #5C0E1B; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; }
      .name { font-size: 48px; font-weight: bold; color: #5C0E1B; margin-bottom: 10px; }
      .badge { font-size: 18px; background: #5C0E1B; color: #FAF5EC; padding: 6px 24px; border-radius: 40px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; }
      .divider { width: 240px; height: 2px; background: #5C0E1B; margin: 10px auto; }
      .token { font-size: 96px; font-weight: bold; color: #5C0E1B; margin: 10px 0; }
      .customer { font-size: 28px; color: #8A6A1B; margin-bottom: 30px; }
      .qr-wrap { margin: 30px 0; }
      .qr-wrap img { width: 400px; height: 400px; }
      .instruction { font-size: 22px; color: #5C0E1B; margin-top: 20px; }
      .footer { font-size: 18px; color: #8A6A1B; margin-top: auto; }
    </style></head><body>
    <div class="card">
      <div class="badge">Takeaway</div>
      <div class="name">${restaurantName}</div>
      <div class="divider"></div>
      <div class="token">${order.token}</div>
      <div class="customer">${order.customer_name}</div>
      <div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(trackUrl)}" alt="QR" /></div>
      <div class="instruction">Scan to track your order</div>
      <div class="footer">Powered by SmartDine AI</div>
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),500)};</script>
    </body></html>`);
  w.document.close();
}

export default function CounterPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || getRestaurantName(user?.restaurant_id, user?.restaurant_slug);
  const slug = user?.restaurant_slug || "";

  useOrderStream(); // SSE real-time push

  const { data } = useQuery({
    queryKey: ["counter-orders", user?.restaurant_id],
    queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"),
    refetchInterval: 15000, // 15s auto-refresh fallback — SSE handles real-time push
  });
  const mut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "served" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counter-orders", user?.restaurant_id] }),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ payment_status: "paid" }) }),
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
    <div className="min-h-screen h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
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
          <button onClick={() => printTakeawayMenuQr(slug, restaurantName)} className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-xs px-3 py-2 rounded-xl transition-all">
            <QrCode className="h-4 w-4" /> Takeaway QR
          </button>
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

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-0 min-h-0">
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
                {o.order_type === "takeaway" && (
                  <button onClick={() => printTakeawayQr(o, slug, restaurantName)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400" title="Print takeaway QR">
                    <QrCode className="h-3 w-3" /> Print QR
                  </button>
                )}
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
                <div className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90 flex items-center justify-between">
                  <span>{o.customer_name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                      {o.payment_method === "upi" ? "UPI QR" : o.payment_method === "card_machine" ? "CARD" : "CASH"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.payment_status === "paid" ? "bg-white/40" : "bg-red-500/80 text-white"}`}>
                      {o.payment_status === "paid" ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                </div>
                {(o.items.some((i) => i.notes) || o.notes) && (
                  <div className="mt-3 space-y-1 text-[11px]" data-testid={`counter-notes-${o.token}`}>
                    {o.items.filter((i) => i.notes).map((i) => (
                      <div key={i.item_id} className="bg-white/15 border border-white/20 rounded-lg px-2.5 py-1"><span className="font-bold">{i.qty}× {i.name}:</span> {i.notes}</div>
                    ))}
                    {o.notes && <div className="bg-white/15 border border-white/20 rounded-lg px-2.5 py-1"><span className="font-bold">Note:</span> {o.notes}</div>}
                  </div>
                )}
                <div className="mt-auto pt-4 flex gap-2 flex-col sm:flex-row">
                  {o.order_type === "takeaway" && (
                    <button onClick={() => printTakeawayQr(o, slug, restaurantName)} className="inline-flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold py-3 rounded-xl transition text-sm">
                      <QrCode className="h-4 w-4" /> QR
                    </button>
                  )}
                  {o.payment_status !== "paid" && (
                    <button
                      onClick={() => markPaidMut.mutate({ id: o.id })}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                    >
                      <CreditCard className="h-4 w-4" /> MARK PAID
                    </button>
                  )}
                  <button
                    disabled={o.payment_status !== "paid"}
                    data-testid={`counter-serve-${o.token}`}
                    onClick={() => mut.mutate({ id: o.id })}
                    className={`flex-1 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm ${o.payment_status === "paid" ? "bg-white text-emerald-600 hover:bg-white/90" : "bg-white/20 text-white/50 cursor-not-allowed"}`}
                  >
                    <Check className="h-4 w-4" /> MARK SERVED
                  </button>
                </div>
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
