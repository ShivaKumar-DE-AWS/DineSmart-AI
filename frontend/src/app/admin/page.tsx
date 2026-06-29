"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Receipt, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useSession } from "@/stores/session";

// Static chart styling — extracted to avoid creating new objects on every render
const CHART_GRID_STROKE = "#E2DFD8";
const CHART_TICK = { fontSize: 11, fill: "#5C5C5C" };
const CHART_TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #E2DFD8" };
const CHART_MARGIN = { top: 10, right: 20, left: -10, bottom: 0 };
const formatDayShort = (d: string) => d.slice(5);

export default function AdminDashboard() {
  const { user } = useSession();
  const { data: dash } = useQuery({ queryKey: ["admin-dashboard", user?.restaurant_id], queryFn: () => api<any>("/api/analytics/dashboard"), refetchInterval: 15000 });
  const { data: rev } = useQuery({ queryKey: ["admin-revenue", user?.restaurant_id], queryFn: () => api<any>("/api/analytics/revenue?days=7"), refetchInterval: 15000 });

  const kpis = [
    { label: "Revenue today", value: dash ? formatCurrency(dash.revenue_today) : "—", icon: TrendingUp, testid: "kpi-revenue" },
    { label: "Orders today", value: dash ? dash.orders_today : "—", icon: ShoppingBag, testid: "kpi-orders" },
    { label: "AI Influence", value: dash ? (dash.orders_today > 0 ? Math.round((dash.ai_orders_today / dash.orders_today) * 100) + "%" : "0%") : "—", icon: Receipt, testid: "kpi-ai" },
    { label: "Low stock items", value: dash ? dash.low_stock_count : "—", icon: AlertTriangle, testid: "kpi-low-stock" },
  ];

  const { data: tablesData } = useQuery({ queryKey: ["admin-tables-dashboard", user?.restaurant_id], queryFn: () => api<any>("/api/tables") });
  const tablesCount = tablesData?.tables?.length || 0;

  return (
    <div>
      {tablesCount === 0 && (
        <div className="mb-6 bg-cream border border-brand-secondary/30 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/10 rounded-full blur-3xl" />
          <h2 className="font-heading text-lg text-brand-primary mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Welcome to SmartDine AI!
          </h2>
          <p className="text-sm text-stone mb-4">Complete these quick steps to start taking live orders.</p>
          <ul className="list-decimal pl-5 text-sm space-y-2 text-stone font-medium">
            <li><strong>Add Menu Items:</strong> Head to <a href="/admin/menu" className="text-brand-secondary hover:underline">Menu Settings</a> to set up your dishes.</li>
            <li><strong>Create Tables:</strong> Go to <a href="/admin/tables" className="text-brand-secondary hover:underline">Tables</a> to add tables and get QR codes.</li>
            <li><strong>Verify & Go Live:</strong> Enter the OTP from your welcome email in <a href="/admin/settings" className="text-brand-secondary hover:underline">Settings</a> to disable Sandbox mode.</li>
          </ul>
        </div>
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="uppercase tracking-[0.3em] text-[10px] text-stone mb-1">Overview</p>
          <h1 className="font-heading text-2xl tracking-tight" data-testid="admin-dashboard-title">Restaurant pulse</h1>
        </div>
        <div className="text-[10px] text-stone">Auto-refreshes every 10s</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} data-testid={k.testid} className="border border-bone bg-white rounded-xl p-4">
              <div className="flex items-center justify-between text-stone text-[10px] uppercase tracking-wider">
                <span>{k.label}</span>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="font-heading text-xl mt-2 tracking-tight">{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-bone rounded-xl p-5">
          <h2 className="font-heading text-base mb-3">Revenue · last 7 days</h2>
          <div className="h-56" data-testid="revenue-chart">
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

        <div className="bg-white border border-bone rounded-xl p-5">
          <h2 className="font-heading text-base mb-3">Top items today</h2>
          {dash?.top_items?.length ? (
            <ul className="space-y-2" data-testid="top-items-list">
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
        <div className="mt-6 bg-warn/10 border border-warn/30 rounded-xl p-4" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warn" /> <h3 className="font-heading text-sm">Low stock alert</h3></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {dash.low_stock.map((i: any) => (
              <div key={i.id} className="bg-white rounded-lg p-2.5 border border-bone">
                <div className="font-medium">{i.name}</div>
                <div className="text-stone">{i.qty} {i.unit} · reorder at {i.reorder_level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
