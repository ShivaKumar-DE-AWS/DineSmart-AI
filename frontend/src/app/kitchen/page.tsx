"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CalendarClock, Users, ChefHat, Flame, Clock, TrendingUp, Utensils, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { useSession } from "@/stores/session";
import { useRestaurantConfig, getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { playChime, ensureNotificationPermission, notify } from "@/lib/notify";
import { KitchenTicket } from "@/components/kitchen/KitchenTicket";
import { useOrderStream } from "@/hooks/useOrderStream";
import { OrderDetailsModal } from "@/components/shared/OrderDetailsModal";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string | null;
  status: string;
  admin_note?: string | null;
}

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function getRestaurantName(restaurantId?: string, restaurantSlug?: string): string {
  if (restaurantSlug) {
    const config = getRestaurantConfig(restaurantSlug);
    if (config?.name && config.name !== "Restaurant") return config.name;
  }
  if (!restaurantId) return "Kitchen";
  return restaurantId.replace("rest_", "").replace(/_001$/, "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
}

const LATE_THRESHOLD_MS = 10 * 60 * 1000;

export default function KitchenPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || getRestaurantName(user?.restaurant_id, user?.restaurant_slug);

  useOrderStream(); // SSE real-time push

  const { data } = useQuery({
    queryKey: ["kds-orders", user?.restaurant_id],
    queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"),
    refetchInterval: 10000, // 10s auto-refresh fallback — SSE handles real-time push
  });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) =>
      api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kds-orders", user?.restaurant_id] }); },
  });

  const onStart = useCallback((id: string) => mut.mutate({ id, status: "preparing" }), [mut]);
  const onReady = useCallback((id: string) => {
    mut.mutate({ id, status: "ready" });
    const order = (data?.orders || []).find((o) => o.id === id);
    if (order) toast.success(`${order.token} ready!`);
  }, [mut, data]);

  const allOrders = data?.orders || [];
  const queue = allOrders.filter((o) => ["confirmed", "preparing"].includes(o.status));
  const confirmedCount = queue.filter((o) => o.status === "confirmed").length;
  const preparingCount = queue.filter((o) => o.status === "preparing").length;
  const readyCount = allOrders.filter((o) => o.status === "ready").length;
  const servedCount = allOrders.filter((o) => o.status === "served").length;

  // Average prep time for preparing orders
  const avgPrepTime = queue.filter((o) => o.status === "preparing").length > 0
    ? Math.round(queue.filter((o) => o.status === "preparing").reduce((acc, o) => acc + (Date.now() - new Date(o.created_at).getTime()), 0) / queue.filter((o) => o.status === "preparing").length / 60000)
    : 0;

  // --- Filter Logic ---
  const [filterType, setFilterType] = useState<"all" | "dine_in" | "takeout">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const filteredQueue = queue.filter(o => {
    if (filterType === "all") return true;
    if (filterType === "dine_in") return o.order_type !== "takeaway" && o.table_number != null;
    return o.order_type === "takeaway" || o.table_number == null;
  });

  // --- Bump Bar Logic ---
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    if (selectedIndex >= filteredQueue.length && filteredQueue.length > 0) {
      setSelectedIndex(filteredQueue.length - 1);
    } else if (filteredQueue.length === 0 && selectedIndex !== 0) {
      setSelectedIndex(0);
    }
  }, [filteredQueue.length, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, Math.max(0, filteredQueue.length - 1)));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const selectedOrder = filteredQueue[selectedIndex];
        if (selectedOrder) {
          if (selectedOrder.status === "confirmed") {
            onStart(selectedOrder.id);
          } else if (selectedOrder.status === "preparing") {
            onReady(selectedOrder.id);
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredQueue, selectedIndex, onStart, onReady]);

  const { data: resData } = useQuery({
    queryKey: ["kds-reservations"],
    queryFn: () => api<{ reservations: Reservation[] }>("/api/reservations/today"),
    refetchInterval: 10000,
  });
  const reservations = resData?.reservations || [];

  const { data: notifsData } = useQuery({
    queryKey: ["kds-notifications", user?.restaurant_id],
    queryFn: () => api<{ notifications: any[] }>("/api/notifications"),
    refetchInterval: 3000,
  });
  const notifications = (notifsData?.notifications || []).filter(n => n.type === "staff_call" && !n.read);

  const markReadMut = useMutation({
    mutationFn: (n_id: string) => api(`/api/notifications/${n_id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kds-notifications"] }); },
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const knownIdsRef = useRef<Set<string> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => {
    if (!data) return;
    const ids = new Set((data.orders || []).filter((o) => o.status === "confirmed").map((o) => o.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = ids;
      return;
    }
    const fresh: Order[] = [];
    for (const o of data.orders || []) {
      if (o.status === "confirmed" && !knownIdsRef.current.has(o.id)) fresh.push(o);
    }
    if (fresh.length && soundEnabled) {
      playChime("new-order");
      for (const o of fresh) {
        notify(`New order · ${o.token}`, `${o.customer_name} — ${o.items.length} item${o.items.length > 1 ? "s" : ""}`);
      }
    }
    knownIdsRef.current = ids;
  }, [data, soundEnabled]);

  const requestPerm = useCallback(async () => {
    const p = await ensureNotificationPermission();
    if (p === "granted") {
      setSoundEnabled(true);
      toast.success("Notifications enabled");
      playChime("new-order");
    } else {
      toast.error("Notifications denied — enable in browser settings");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-amber-400/80 text-xs font-medium tracking-widest uppercase">{restaurantName}</p>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Kitchen Display</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                data-testid="kitchen-toggle-sound"
                onClick={() => setSoundEnabled((s) => !s)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider border transition-all ${
                  soundEnabled
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                    : "border-zinc-700 text-zinc-500 bg-zinc-800/50 hover:bg-zinc-800"
                }`}
              >
                {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                {soundEnabled ? "Sound on" : "Sound off"}
              </button>
              <button
                data-testid="kitchen-enable-notif"
                onClick={requestPerm}
                className="px-4 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 transition-all"
              >
                Enable alerts
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-amber-400/70">Queue</span>
              </div>
              <div className="text-3xl font-bold text-amber-400">{queue.length}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-yellow-400/70">Pending</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{confirmedCount}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ChefHat className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-blue-400/70">Cooking</span>
              </div>
              <div className="text-3xl font-bold text-blue-400">{preparingCount}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Utensils className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-400/70">Ready</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{readyCount}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-purple-400/70">Avg Time</span>
              </div>
              <div className="text-3xl font-bold text-purple-400">{avgPrepTime}<span className="text-lg">m</span></div>
            </div>
          </div>
        </div>
      </header>

      {/* Staff Call Alert */}
      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4 text-white">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{notifications[0].title || `Table ${notifications[0].table_number || ''} needs assistance`}</h3>
                <p className="text-sm opacity-95">{notifications[0].body || notifications[0].message || 'Assistance requested'}</p>
              </div>
            </div>
            <button
              onClick={() => markReadMut.mutate(notifications[0].id)}
              className="bg-white text-red-600 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-white/90 transition-colors shrink-0 self-end sm:self-auto shadow-md"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => { setFilterType("all"); setSelectedIndex(0); }}
            className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase transition-all ${filterType === "all" ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            All Orders
          </button>
          <button 
            onClick={() => { setFilterType("dine_in"); setSelectedIndex(0); }}
            className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase transition-all ${filterType === "dine_in" ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            Dine-In
          </button>
          <button 
            onClick={() => { setFilterType("takeout"); setSelectedIndex(0); }}
            className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase transition-all ${filterType === "takeout" ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            Takeaway
          </button>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="text-center py-24" data-testid="kds-empty">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">All clear!</h3>
            <p className="text-zinc-500 text-sm">No active orders. Take a breather.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 dashboard-scroll max-h-[75vh] overflow-y-auto pr-2">
            {filteredQueue.map((o, idx) => {
              const elapsedMs = Date.now() - new Date(o.created_at).getTime();
              return (
                <KitchenTicket
                  key={o.id}
                  order={o}
                  elapsed={elapsed(o.created_at)}
                  elapsedMs={elapsedMs}
                  isSelected={idx === selectedIndex}
                  onStart={onStart}
                  onReady={onReady}
                  onClick={(o) => setSelectedOrder(o)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Reservations */}
      <section className="max-w-7xl mx-auto px-6 pb-12" data-testid="kds-reservations">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-widest uppercase text-amber-400/70">Today&apos;s Reservations</p>
              <h2 className="text-xl font-bold text-white">{reservations.length} booking{reservations.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          <div className="text-xs text-zinc-600">Updates every 30s</div>
        </div>
        {reservations.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center" data-testid="kds-res-empty">
            <p className="text-zinc-600 text-sm">No reservations on the books for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 dashboard-scroll max-h-[60vh] overflow-y-auto pr-2">
            {reservations.map((r) => (
              <div key={r.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/30 transition-colors" data-testid={`kds-res-${r.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-white">{r.time}</div>
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                    <Users className="h-3.5 w-3.5" /> {r.guests}
                  </div>
                </div>
                <div className="text-sm font-medium text-white">{r.name}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{r.phone}</div>
                {r.notes && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] px-3 py-1.5 rounded-lg">
                    {r.notes}
                  </div>
                )}
                <div className={`mt-3 inline-block text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-lg ${
                  r.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : r.status === "seated" ? "bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>{r.status}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStartCooking={selectedOrder.status === "confirmed" ? () => onStart(selectedOrder.id) : undefined}
          onMarkReady={selectedOrder.status === "preparing" ? () => onReady(selectedOrder.id) : undefined}
        />
      )}
    </div>
  );
}
