"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { fmtTime } from "@/lib/utils";
import { CheckCircle2, ChefHat, ConciergeBell, ClipboardCheck, Clock } from "lucide-react";
import type { Order } from "@/types";

const STAGES: Array<{ key: Order["status"]; label: string; icon: any }> = [
  { key: "confirmed", label: "Confirmed", icon: ClipboardCheck },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: ConciergeBell },
  { key: "served", label: "Served", icon: CheckCircle2 },
];

export default function TrackPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: () => api<Order>(`/api/orders/${orderId}`),
    refetchInterval: 3000,
  });

  if (!order) return <div className="py-20 text-center text-stone">Loading…</div>;

  const currentIdx = STAGES.findIndex((s) => s.key === order.status);
  const idx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-3xl mx-auto">
      <p className="uppercase tracking-[0.3em] text-xs text-stone mb-3">Live tracking</p>
      <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-2">Token <span className="text-clay">{order.token}</span></h1>
      <p className="text-stone mb-10">Updates every 3 seconds.</p>

      <div className="bg-white border border-bone rounded-3xl p-8 mb-8">
        <div className="space-y-4" data-testid="track-stages">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = i <= idx;
            const active = i === idx;
            return (
              <div key={s.key} className="flex items-center gap-4" data-testid={`stage-${s.key}`}>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition ${done ? "bg-clay text-white" : "bg-cream text-stone"} ${active ? "ring-4 ring-clay/20" : ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-heading text-lg ${done ? "text-ink" : "text-stone"}`}>{s.label}</div>
                  {active && <div className="text-xs text-clay font-medium">In progress…</div>}
                </div>
                {done && <CheckCircle2 className="h-5 w-5 text-ready" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-cream border border-bone rounded-2xl p-6 flex items-center gap-4">
        <Clock className="h-6 w-6 text-clay" />
        <div>
          <div className="text-sm text-stone">Estimated ready</div>
          <div className="font-heading text-xl">{fmtTime(order.estimated_ready_at)}</div>
        </div>
      </div>
    </div>
  );
}
