"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Receipt, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Static chart styling — extracted to avoid creating new objects on every render
const CHART_GRID_STROKE = "#E2DFD8";
const CHART_TICK = { fontSize: 11, fill: "#5C5C5C" };
const CHART_TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #E2DFD8" };
const CHART_MARGIN = { top: 10, right: 20, left: -10, bottom: 0 };
const formatDayShort = (d: string) => d.slice(5);

export default function AdminDashboard() {
  const { data: dash } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api<any>("/api/analytics/dashboard"), refetchInterval: 10000 });
  const { data: rev } = useQuery({ queryKey: ["admin-revenue"], queryFn: () => api<any>("/api/analytics/revenue?days=7"), refetchInterval: 30000 });

  const kpis = [
    { label: "Revenue today", value: dash ? formatCurrency(dash.revenue_today) : "—", icon: TrendingUp, testid: "kpi-revenue" },
    { label: "Orders today", value: dash ? dash.orders_today : "—", icon: ShoppingBag, testid: "kpi-orders" },
    { label: "AI Influence", value: dash ? (dash.orders_today > 0 ? Math.round((dash.ai_orders_today / dash.orders_today) * 100) + "%" : "0%") : "—", icon: Receipt, testid: "kpi-ai" },
    { label: "Low stock items", value: dash ? dash.low_stock_count : "—", icon: AlertTriangle, testid: "kpi-low-stock" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Overview</p>
          <h1 className="font-heading text-4xl tracking-tight" data-testid="admin-dashboard-title">Restaurant pulse</h1>
        </div>
        <div className="text-xs text-stone">Auto-refreshes every 10s</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} data-testid={k.testid} className="border border-bone bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between text-stone text-xs uppercase tracking-wider">
                <span>{k.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <div className="font-heading text-3xl mt-3 tracking-tight">{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-bone rounded-2xl p-6">
          <h2 className="font-heading text-xl mb-4">Revenue · last 7 days</h2>
          <div className="h-72" data-testid="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rev?.series || []} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="date" tick={CHART_TICK} tickFormatter={formatDayShort} />
                <YAxis tick={CHART_TICK} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="revenue" stroke="#C84B31" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-bone rounded-2xl p-6">
          <h2 className="font-heading text-xl mb-4">Top items today</h2>
          {dash?.top_items?.length ? (
            <ul className="space-y-3" data-testid="top-items-list">
              {dash.top_items.map((t: any) => (
                <li key={t.name} className="flex items-center justify-between">
                  <span className="text-sm">{t.name}</span>
                  <span className="font-mono text-sm text-clay">{t.qty}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-stone">No orders yet today.</div>
          )}
        </div>
      </div>

      {dash?.low_stock?.length > 0 && (
        <div className="mt-8 bg-warn/10 border border-warn/30 rounded-2xl p-6" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5 text-warn" /> <h3 className="font-heading text-lg">Low stock alert</h3></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {dash.low_stock.map((i: any) => (
              <div key={i.id} className="bg-white rounded-xl p-3 border border-bone">
                <div className="font-medium">{i.name}</div>
                <div className="text-stone text-xs">{i.qty} {i.unit} · reorder at {i.reorder_level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
