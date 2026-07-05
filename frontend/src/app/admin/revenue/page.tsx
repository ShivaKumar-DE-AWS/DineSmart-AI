"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CHART_GRID_STROKE = "#E2DFD8";
const CHART_TICK_SM = { fontSize: 10, fill: "#5C5C5C" };
const CHART_TICK = { fontSize: 11, fill: "#5C5C5C" };
const CHART_TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #E2DFD8" };
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const formatDayShort = (d: string) => d.slice(5);

type Period = '7 Days' | '30 Days' | '90 Days' | 'This Month';

export default function AdminRevenue() {
  const [period, setPeriod] = useState<Period>('30 Days');

  const daysMap = {
    '7 Days': 7,
    '30 Days': 30,
    '90 Days': 90,
    'This Month': new Date().getDate(),
  };
  const days = daysMap[period];

  const { data: revData } = useQuery({ queryKey: ["rev-data", days], queryFn: () => api<any>(`/api/analytics/revenue?days=${days}`) });
  const { data: ordersData } = useQuery({ queryKey: ["rev-orders"], queryFn: () => api<any>("/api/orders?limit=5000") });

  const series = revData?.series || [];
  const totalRev = series.reduce((s: number, x: any) => s + x.revenue, 0);
  
  // Calculate best day
  let bestDay = { date: "—", revenue: 0 };
  for (const s of series) {
    if (s.revenue > bestDay.revenue) {
      bestDay = { date: s.date, revenue: s.revenue };
    }
  }

  // Calculate order stats in this period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  let periodOrders = 0;
  const counts: Record<string, { name: string; qty: number; rev: number }> = {};
  
  for (const o of (ordersData?.orders || [])) {
    if (o.status !== "cancelled" && new Date(o.created_at) >= cutoff) {
      periodOrders++;
      for (const i of o.items) {
        if (!counts[i.item_id]) counts[i.item_id] = { name: i.name, qty: 0, rev: 0 };
        counts[i.item_id].qty += i.qty;
        counts[i.item_id].rev += i.qty * i.price;
      }
    }
  }

  const avgOrderVal = periodOrders > 0 ? totalRev / periodOrders : 0;
  
  const topItems = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const totalItemsSold = topItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-[10px] text-stone mb-1">Analytics</p>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="font-heading text-2xl tracking-tight">Revenue</h1>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-cream border border-bone rounded-lg p-1">
            {(['7 Days', '30 Days', '90 Days', 'This Month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${period === p ? "bg-white shadow-sm text-ink border-bone" : "text-stone hover:text-ink"}`}
              >
                {p}
              </button>
            ))}
          </div>
          
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
            className="bg-ink text-cream px-4 py-2 rounded-lg text-xs font-semibold hover:bg-ink/90 transition shadow-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-bone bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase text-stone tracking-wider">Total Revenue</div>
          <div className="font-heading text-xl mt-1 tracking-tight">{formatCurrency(totalRev)}</div>
        </div>
        <div className="border border-bone bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase text-stone tracking-wider">Orders</div>
          <div className="font-heading text-xl mt-1 tracking-tight">{periodOrders}</div>
        </div>
        <div className="border border-bone bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase text-stone tracking-wider">Avg Order Value</div>
          <div className="font-heading text-xl mt-1 tracking-tight">{formatCurrency(avgOrderVal)}</div>
        </div>
        <div className="border border-bone bg-white rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase text-stone tracking-wider">Best Day ({bestDay.date !== "—" ? formatDayShort(bestDay.date) : "—"})</div>
          <div className="font-heading text-xl mt-1 tracking-tight text-emerald-700">{formatCurrency(bestDay.revenue)}</div>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-xl p-5 shadow-sm">
        <h2 className="font-heading text-base mb-4">Daily Revenue ({period})</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="date" tick={CHART_TICK_SM} tickFormatter={formatDayShort} />
              <YAxis tick={CHART_TICK} />
              <Tooltip cursor={{ fill: '#FAF5EC' }} contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="revenue" fill="#8A6A1B" radius={BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="font-heading text-base mb-4">Top Selling Items ({period})</h2>
        <div className="space-y-4">
          {topItems.map((ti, i) => {
            const percent = totalItemsSold > 0 ? Math.round((ti.qty / totalItemsSold) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between border-b border-bone pb-3 last:border-0 last:pb-0 group">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-cream text-ink text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-ink">{ti.name}</div>
                    <div className="text-[10px] text-stone">{percent}% of top 5 sales</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-ink">{ti.qty} sold</div>
                  <div className="text-[11px] text-stone font-medium">{formatCurrency(ti.rev)}</div>
                </div>
              </div>
            );
          })}
          {topItems.length === 0 && <div className="text-stone text-sm text-center py-4 bg-cream/30 rounded-lg">No sales data in this period.</div>}
        </div>
      </div>
    </div>
  );
}
