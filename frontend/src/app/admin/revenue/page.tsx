"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CHART_GRID_STROKE = "#E2DFD8";
const CHART_TICK_SM = { fontSize: 10, fill: "#5C5C5C" };
const CHART_TICK = { fontSize: 11, fill: "#5C5C5C" };
const CHART_TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #E2DFD8" };
const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const formatDayShort = (d: string) => d.slice(5);

export default function AdminRevenue() {
  const { data: w } = useQuery({ queryKey: ["rev-7"], queryFn: () => api<any>("/api/analytics/revenue?days=7") });
  const { data: m } = useQuery({ queryKey: ["rev-30"], queryFn: () => api<any>("/api/analytics/revenue?days=30") });
  const { data: ordersData } = useQuery({ queryKey: ["rev-orders"], queryFn: () => api<any>("/api/orders?limit=1000") });

  const total7 = (w?.series || []).reduce((s: number, x: any) => s + x.revenue, 0);
  const total30 = (m?.series || []).reduce((s: number, x: any) => s + x.revenue, 0);

  const topItems = (() => {
    const counts: Record<string, { name: string; qty: number; rev: number }> = {};
    for (const o of (ordersData?.orders || [])) {
      if (o.status !== "cancelled") {
        for (const i of o.items) {
          if (!counts[i.item_id]) counts[i.item_id] = { name: i.name, qty: 0, rev: 0 };
          counts[i.item_id].qty += i.qty;
          counts[i.item_id].rev += i.qty * i.price;
        }
      }
    }
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  })();

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-[10px] text-stone mb-1">Analytics</p>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h1 className="font-heading text-2xl tracking-tight">Revenue</h1>
        <button
          onClick={async () => {
            try {
              const res = await api<{ orders: any[] }>("/api/orders?limit=5000");
              const orders = res.orders || [];
              if (orders.length === 0) return toast.info("No orders to export");
              
              const header = ["Date", "Order ID", "Customer", "Items", "Subtotal", "Tax", "Total", "Status"].join(",");
              const rows = orders.map(o => [
                new Date(o.created_at).toLocaleString(),
                o.token,
                `"${o.customer_name}"`,
                `"${o.items.map((i: any) => `${i.qty}x ${i.name}`).join(" | ")}"`,
                o.subtotal,
                o.tax,
                o.total,
                o.status
              ].join(","));
              
              const csv = [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `smartdine-sales-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
              toast.success("CSV Downloaded");
            } catch(e) {
              toast.error("Export failed");
            }
          }}
          className="bg-ink text-cream px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-ink/80 transition shadow-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-bone bg-white rounded-xl p-4" data-testid="rev-7d">
          <div className="text-[10px] uppercase text-stone tracking-wider">Last 7 days</div>
          <div className="font-heading text-2xl mt-1 tracking-tight">{formatCurrency(total7)}</div>
        </div>
        <div className="border border-bone bg-white rounded-xl p-4" data-testid="rev-30d">
          <div className="text-[10px] uppercase text-stone tracking-wider">Last 30 days</div>
          <div className="font-heading text-2xl mt-1 tracking-tight">{formatCurrency(total30)}</div>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-xl p-5">
        <h2 className="font-heading text-base mb-3">Daily revenue · last 30 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="date" tick={CHART_TICK_SM} tickFormatter={formatDayShort} />
              <YAxis tick={CHART_TICK} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="revenue" fill="#C84B31" radius={BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-xl p-5 mt-6">
        <h2 className="font-heading text-base mb-3">Top Selling Items</h2>
        <div className="space-y-3">
          {topItems.map((ti, i) => (
            <div key={i} className="flex items-center justify-between border-b border-bone pb-1.5 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <div className="font-bold text-stone w-3 text-xs">{i + 1}.</div>
                <div className="font-medium text-sm text-ink">{ti.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-ink">{ti.qty} sold</div>
                <div className="text-[10px] text-stone">{formatCurrency(ti.rev)}</div>
              </div>
            </div>
          ))}
          {topItems.length === 0 && <div className="text-stone text-sm">No sales data yet.</div>}
        </div>
      </div>
    </div>
  );
}
