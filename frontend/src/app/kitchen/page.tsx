"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CalendarClock, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { toast } from "sonner";
import { playChime, ensureNotificationPermission, notify } from "@/lib/notify";
import { KitchenTicket } from "@/components/kitchen/KitchenTicket";

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

const LATE_THRESHOLD_MS = 10 * 60 * 1000;

export default function KitchenPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["kds-orders"],
    queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"),
    refetchInterval: 3000,
  });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) =>
      api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kds-orders"] }); },
  });

  const onStart = useCallback((id: string) => mut.mutate({ id, status: "preparing" }), [mut]);
  const onReady = useCallback((id: string) => {
    mut.mutate({ id, status: "ready" });
    const order = (data?.orders || []).find((o) => o.id === id);
    if (order) toast.success(`${order.token} ready!`);
  }, [mut, data]);

  const queue = (data?.orders || []).filter((o) => ["confirmed", "preparing"].includes(o.status));

  const { data: resData } = useQuery({
    queryKey: ["kds-reservations"],
    queryFn: () => api<{ reservations: Reservation[] }>("/api/reservations/today"),
    refetchInterval: 30_000,
  });
  const reservations = resData?.reservations || [];

  // Active Notifications (Staff calls)
  const { data: notifsData } = useQuery({
    queryKey: ["kds-notifications"],
    queryFn: () => api<{ notifications: any[] }>("/api/notifications"),
    refetchInterval: 3000,
  });
  const notifications = notifsData?.notifications || [];

  const markReadMut = useMutation({
    mutationFn: (n_id: string) => api(`/api/notifications/${n_id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kds-notifications"] }); },
  });

  // Re-render every second for live timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Audio + browser notifications when a NEW order arrives in the queue
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => {
    if (!data) return;
    const ids = new Set((data.orders || []).filter((o) => o.status === "confirmed").map((o) => o.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = ids; // first load — don't alert
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
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <header className="flex items-end justify-between mb-4 px-2">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-zinc-500">Kitchen display</p>
          <h1 className="font-heading text-3xl tracking-tight">
            Live queue · <span className="text-alert">{queue.length}</span> active
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="kitchen-toggle-sound"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs uppercase tracking-wider border ${
              soundEnabled ? "border-ready/40 text-ready" : "border-zinc-700 text-zinc-500"
            }`}
          >
            {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button
            data-testid="kitchen-enable-notif"
            onClick={requestPerm}
            className="text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
          >
            Enable browser alerts
          </button>
          <div className="text-xs text-zinc-500">Updates every 3s</div>
        </div>
      </header>

      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-[#8A1A2A] border border-[#8A1A2A] rounded-xl p-4 shadow-2xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3 text-[#FAF5EC]">
              <Bell className="h-6 w-6" />
              <div>
                <h3 className="font-royal text-lg tracking-wider">{notifications[0].title}</h3>
                <p className="text-xs font-editorial italic opacity-90">{notifications[0].body}</p>
              </div>
            </div>
            <button
              onClick={() => markReadMut.mutate(notifications[0].id)}
              className="bg-[#FAF5EC] text-[#8A1A2A] px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-[#E7DFCB] transition-colors"
            >
              Mark Resolved
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {queue.length === 0 && (
          <div className="bg-graphite border border-slate rounded-md p-20 text-center text-zinc-500 mt-8" data-testid="kds-empty">
            No active orders. Time for a coffee.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {queue.map((o) => (
            <KitchenTicket
              key={o.id}
              order={o}
              elapsed={elapsed(o.created_at)}
              isLate={Date.now() - new Date(o.created_at).getTime() > LATE_THRESHOLD_MS}
              onStart={onStart}
              onReady={onReady}
            />
          ))}
        </div>
      </main>

      {/* Today's reservations panel */}
      <section className="mt-10" data-testid="kds-reservations">
        <div className="flex items-end justify-between mb-3 px-2">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs text-zinc-500">Tonight&apos;s mehfil</p>
            <h2 className="font-heading text-2xl tracking-tight inline-flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-warn" />
              Reservations today · <span className="text-warn">{reservations.length}</span>
            </h2>
          </div>
          <div className="text-xs text-zinc-500">Updates every 30s</div>
        </div>
        {reservations.length === 0 ? (
          <div className="bg-graphite border border-slate rounded-md p-10 text-center text-zinc-500" data-testid="kds-res-empty">
            No reservations on the books for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {reservations.map((r) => (
              <div key={r.id} className="bg-graphite border border-slate rounded-md p-4" data-testid={`kds-res-${r.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-display text-3xl text-white leading-none">{r.time}</div>
                  <div className="flex items-center gap-1 text-warn font-bold"><Users className="h-4 w-4" /> {r.guests}</div>
                </div>
                <div className="text-sm text-white font-medium">{r.name}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{r.phone}</div>
                {r.notes && (
                  <div className="mt-2 bg-warn/10 border border-warn/30 text-warn text-[11px] px-2 py-1 rounded">
                    {r.notes}
                  </div>
                )}
                <div className={`mt-2 inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                  r.status === "confirmed" ? "bg-ready/20 text-ready border border-ready/40"
                  : r.status === "seated" ? "bg-zinc-700 text-zinc-300"
                  : "bg-warn/20 text-warn border border-warn/40"
                }`}>{r.status}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
