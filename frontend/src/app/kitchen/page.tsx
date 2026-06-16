"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Clock, ChefHat, CheckCheck, Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Order } from "@/types";
import { toast } from "sonner";
import { playChime, ensureNotificationPermission, notify } from "@/lib/notify";

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function KitchenPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["kds-orders"], queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"), refetchInterval: 3000 });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kds-orders"] }); },
  });

  const queue = (data?.orders || []).filter((o) => ["confirmed", "preparing"].includes(o.status));
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  // Audio + browser notifications when a NEW order arrives in the queue
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => {
    if (!data) return;
    const ids = new Set((data.orders || []).filter((o) => o.status === "confirmed").map((o) => o.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = ids;          // first load — don't alert
      return;
    }
    const fresh: Order[] = [];
    for (const o of data.orders || []) {
      if (o.status === "confirmed" && !knownIdsRef.current.has(o.id)) fresh.push(o);
    }
    if (fresh.length && soundEnabled) {
      playChime("new-order");
      for (const o of fresh) notify(`New order · ${o.token}`, `${o.customer_name} — ${o.items.length} item${o.items.length>1?"s":""}`);
    }
    knownIdsRef.current = ids;
  }, [data, soundEnabled]);

  const requestPerm = async () => {
    const p = await ensureNotificationPermission();
    if (p === "granted") { setSoundEnabled(true); toast.success("Notifications enabled"); playChime("new-order"); }
    else toast.error("Notifications denied — enable in browser settings");
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-4 px-2">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-zinc-500">Kitchen display</p>
          <h1 className="font-heading text-3xl tracking-tight">Live queue · <span className="text-alert">{queue.length}</span> active</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="kitchen-toggle-sound"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs uppercase tracking-wider border ${soundEnabled ? "border-ready/40 text-ready" : "border-zinc-700 text-zinc-500"}`}
          >
            {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <button data-testid="kitchen-enable-notif" onClick={requestPerm} className="text-xs uppercase tracking-wider text-zinc-400 hover:text-white">
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
        {queue.map((o) => {
          const e = elapsed(o.created_at);
          const isLate = (Date.now() - new Date(o.created_at).getTime()) > 10 * 60 * 1000;
          const isPreparing = o.status === "preparing";
          return (
            <div
              key={o.id}
              data-testid={`kds-ticket-${o.token}`}
              className={`bg-graphite border-l-[8px] ${isLate ? "border-alert animate-pulse-alert" : isPreparing ? "border-warn" : "border-zinc-500"} rounded-md p-4`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="font-display text-4xl text-white leading-none">{o.token}</div>
                <div className="text-right">
                  <div className="font-mono text-2xl text-warn tracking-tighter">{e}</div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider">elapsed</div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{o.customer_name}</div>
              <div className="space-y-1 mb-4">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-white"><span className="text-alert font-bold mr-1">{i.qty}×</span>{i.name}</span>
                  </div>
                ))}
              </div>
              {o.notes && <div className="bg-warn text-coal text-xs px-2 py-1 rounded mb-3 font-medium">NOTE: {o.notes}</div>}
              <div className="flex gap-2">
                {o.status === "confirmed" && (
                  <button
                    data-testid={`kds-start-${o.token}`}
                    onClick={() => mut.mutate({ id: o.id, status: "preparing" })}
                    className="flex-1 bg-warn text-coal py-2.5 rounded font-bold text-sm hover:bg-warn/90 transition flex items-center justify-center gap-2"
                  ><ChefHat className="h-4 w-4" /> START</button>
                )}
                {o.status === "preparing" && (
                  <button
                    data-testid={`kds-ready-${o.token}`}
                    onClick={() => { mut.mutate({ id: o.id, status: "ready" }); toast.success(`${o.token} ready!`); }}
                    className="flex-1 bg-ready text-coal py-2.5 rounded font-bold text-sm hover:bg-ready/90 transition flex items-center justify-center gap-2"
                  ><CheckCheck className="h-4 w-4" /> READY</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
