"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { toast } from "sonner";
import { playChime, ensureNotificationPermission, notify } from "@/lib/notify";
import { KitchenTicket } from "@/components/kitchen/KitchenTicket";

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
    <div>
      <div className="flex items-end justify-between mb-4 px-2">
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
      </div>

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
    </div>
  );
}
