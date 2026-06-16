"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { playChime, notify } from "@/lib/notify";

export default function CounterPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["counter-orders"], queryFn: () => api<{ orders: Order[] }>("/api/orders?limit=200"), refetchInterval: 2000 });
  const mut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "served" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counter-orders"] }),
  });

  const preparing = (data?.orders || []).filter((o) => ["confirmed", "preparing"].includes(o.status));
  const ready = (data?.orders || []).filter((o) => o.status === "ready");

  // Chime + notification when a new order becomes ready
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

  return (
    <div className="h-screen grid grid-cols-2 gap-0">
      {/* Preparing column */}
      <section className="bg-coal border-r border-slate p-6 overflow-hidden flex flex-col">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="uppercase tracking-[0.4em] text-xs text-zinc-500">In preparation</p>
            <h1 className="font-heading text-4xl mt-1">Cooking now</h1>
          </div>
          <div className="font-mono text-warn text-3xl">{preparing.length}</div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 auto-rows-min gap-3 overflow-y-auto scrollbar-thin" data-testid="counter-preparing">
          {preparing.map((o) => (
            <div key={o.id} className="bg-graphite border border-slate rounded-md p-4 text-center" data-testid={`counter-prep-${o.token}`}>
              <div className="font-display text-5xl text-zinc-300 leading-none">{o.token}</div>
              <div className="text-[10px] uppercase text-zinc-500 tracking-wider mt-2">{o.customer_name}</div>
            </div>
          ))}
          {preparing.length === 0 && <div className="col-span-full text-zinc-600 text-center pt-10">Nothing cooking</div>}
        </div>
      </section>

      {/* Ready column */}
      <section className="bg-ready/10 p-6 overflow-hidden flex flex-col">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="uppercase tracking-[0.4em] text-xs text-ready">Ready for pickup</p>
            <h1 className="font-heading text-4xl mt-1 text-ready">Hand it over</h1>
          </div>
          <div className="font-mono text-ready text-3xl">{ready.length}</div>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 auto-rows-min gap-4 overflow-y-auto scrollbar-thin" data-testid="counter-ready">
          {ready.map((o) => (
            <div key={o.id} className="bg-ready text-coal rounded-md p-6 flex flex-col" data-testid={`counter-ready-${o.token}`}>
              <div className="font-display text-7xl leading-none">{o.token}</div>
              <div className="text-sm uppercase tracking-wider font-bold mt-2">{o.customer_name}</div>
              {(o.items.some((i) => i.notes) || o.notes) && (
                <div className="mt-2 space-y-1 text-[11px] text-coal/80" data-testid={`counter-notes-${o.token}`}>
                  {o.items.filter((i) => i.notes).map((i) => (
                    <div key={i.item_id} className="bg-coal/10 border border-coal/25 rounded px-2 py-0.5"><span className="font-bold">{i.qty}× {i.name}:</span> {i.notes}</div>
                  ))}
                  {o.notes && <div className="bg-coal/10 border border-coal/25 rounded px-2 py-0.5"><span className="font-bold">Note:</span> {o.notes}</div>}
                </div>
              )}
              <button
                data-testid={`counter-serve-${o.token}`}
                onClick={() => mut.mutate({ id: o.id })}
                className="mt-4 bg-coal text-ready font-bold py-2.5 rounded hover:bg-coal/90 transition flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> SERVED
              </button>
            </div>
          ))}
          {ready.length === 0 && <div className="col-span-full text-ready/40 text-center pt-10 font-heading text-2xl">Waiting on kitchen…</div>}
        </div>
      </section>
    </div>
  );
}
