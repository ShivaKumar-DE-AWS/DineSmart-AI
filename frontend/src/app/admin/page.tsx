"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Receipt, AlertTriangle, Rocket, UtensilsCrossed, QrCode, CheckCircle2, ArrowRight, Users, CalendarDays, BarChart as BarChartIcon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useSession } from "@/stores/session";

// Static chart styling
const CHART_GRID_STROKE = "#E2DFD8";
const CHART_TICK = { fontSize: 11, fill: "#5C5C5C" };
const CHART_TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #E2DFD8" };
const CHART_MARGIN = { top: 10, right: 20, left: -10, bottom: 0 };
const formatDayShort = (d: string) => d.slice(5);

export default function AdminDashboard() {
  const { user } = useSession();
  const { data: dash } = useQuery({ queryKey: ["admin-dashboard", user?.restaurant_id], queryFn: () => api<any>("/api/analytics/dashboard"), refetchInterval: 10000 });
  const { data: rev } = useQuery({ queryKey: ["admin-revenue", user?.restaurant_id], queryFn: () => api<any>("/api/analytics/revenue?days=7"), refetchInterval: 10000 });

  const getPercentChange = (today?: number, yesterday?: number) => {
    if (!today || !yesterday) return null;
    const diff = today - yesterday;
    const percent = Math.round((diff / yesterday) * 100);
    return percent > 0 ? `↑ ${percent}% vs yesterday` : percent < 0 ? `↓ ${Math.abs(percent)}% vs yesterday` : `Same as yesterday`;
  };

  const avgOrderVal = dash?.orders_today ? Math.round(dash.revenue_today / dash.orders_today) : 0;
  const avgOrderValYest = dash?.revenue_yesterday && dash?.orders_yesterday ? Math.round(dash.revenue_yesterday / dash.orders_yesterday) : 0;

  const kpis = [
    { label: "Revenue today", value: dash ? formatCurrency(dash.revenue_today) : "—", change: getPercentChange(dash?.revenue_today, dash?.revenue_yesterday), icon: TrendingUp, testid: "kpi-revenue" },
    { label: "Orders today", value: dash ? dash.orders_today : "—", change: getPercentChange(dash?.orders_today, dash?.orders_yesterday), icon: ShoppingBag, testid: "kpi-orders" },
    { label: "Avg Order Value", value: dash ? formatCurrency(avgOrderVal) : "—", change: getPercentChange(avgOrderVal, avgOrderValYest), icon: Receipt, testid: "kpi-aov" },
    { label: "Customers Today", value: dash?.customers_today || dash?.orders_today || 0, change: null, icon: Users, testid: "kpi-customers" },
    { label: "AI Influence", value: dash && dash.orders_today ? `${Math.round((dash.ai_orders_today / dash.orders_today) * 100)}%` : "0%", change: null, icon: Sparkles, testid: "kpi-ai" },
    { label: "Low stock items", value: dash ? dash.low_stock_count : "—", change: null, icon: AlertTriangle, testid: "kpi-low-stock" },
  ];

  // Dummy placeholder data for hourly orders chart
  const hourlyOrders = dash?.hourly_orders || Array.from({length: 12}).map((_, i) => ({ hour: `${i+10}:00`, orders: Math.floor(Math.random() * 15) }));

  // Onboarding banner logic
  const dashLoaded = dash !== undefined;
  const isSandbox = dash?.sandbox_mode !== false;
  const isVerified = dash?.is_verified === true;
  const hasMenu = (dash?.menu_count ?? 0) > 0;
  const hasTables = (dash?.tables_count ?? 0) > 0;
  const showOnboarding = dashLoaded && (isSandbox || !isVerified || !hasMenu || !hasTables);

  return (
    <div>
      {showOnboarding && (
        <div className="mb-8 bg-gradient-to-br from-amber-50 via-cream to-amber-50/50 border-2 border-amber-300 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-amber-200 mb-5 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <Rocket className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading text-lg md:text-xl text-amber-950 font-bold">🚀 SmartDine AI — Onboarding &amp; Sandbox Guide</h2>
                  {isSandbox && (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-white font-mono text-[10px] uppercase font-bold rounded-full tracking-wider animate-bounce">
                      🟡 Sandbox Mode Active
                    </span>
                  )}
                  {!isVerified && (
                    <span className="px-2.5 py-0.5 bg-red-500 text-white font-mono text-[10px] uppercase font-bold rounded-full tracking-wider animate-pulse">
                      🔴 Unverified
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-amber-900 mt-1 max-w-2xl">
                  Complete all 3 steps below to go live. This guide will disappear automatically once your restaurant is verified, menu uploaded, tables created, and sandbox mode removed.
                </p>
              </div>
            </div>
            <Link
              href="/admin/setup"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm rounded-xl transition shadow-lg hover:shadow-xl shrink-0 flex items-center gap-2"
            >
              🚀 Setup Wizard (Exit Sandbox) →
            </Link>
          </div>

          <div className="flex gap-3 flex-wrap mb-5 relative z-10">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${hasMenu ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
              {hasMenu ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>○</span>}
              Menu {hasMenu ? "✓" : "Pending"}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${hasTables ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
              {hasTables ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>○</span>}
              Tables {hasTables ? "✓" : "Pending"}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isVerified ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-800 border-red-300"}`}>
              {isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>○</span>}
              Verification {isVerified ? "✓" : "Pending"}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${!isSandbox ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
              {!isSandbox ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>○</span>}
              Sandbox {!isSandbox ? "Removed ✓" : "Active"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {/* Step 1: Menu */}
            <div className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 flex flex-col justify-between transition shadow-sm ${hasMenu ? "border-emerald-300 bg-emerald-50/60" : "border-amber-200/80 hover:border-amber-400"}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${hasMenu ? "text-emerald-800 bg-emerald-100" : "text-amber-800 bg-amber-100"}`}>
                    Step 1 {hasMenu ? "✓" : ""}
                  </span>
                  <UtensilsCrossed className={`w-4 h-4 ${hasMenu ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <h4 className="font-heading font-bold text-sm text-ink mb-1">🍽️ Menu &amp; AI Extraction</h4>
                <p className="text-xs text-stone leading-relaxed mb-3">
                  {hasMenu
                    ? `✅ ${dash?.menu_count} menu items ready. You can add more or upload a new menu card anytime.`
                    : "Upload a photo or PDF of your restaurant menu card in Menu Manager for instant automatic AI extraction, or add dishes manually."}
                </p>
              </div>
              <Link href="/admin/menu" className={`text-xs font-bold flex items-center gap-1 group ${hasMenu ? "text-emerald-700 hover:text-emerald-900" : "text-amber-700 hover:text-amber-900"}`}>
                ✨ {hasMenu ? "Manage Menu" : "Go to Menu Manager"} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Step 2: Tables & QR */}
            <div className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 flex flex-col justify-between transition shadow-sm ${hasTables ? "border-emerald-300 bg-emerald-50/60" : "border-amber-200/80 hover:border-amber-400"}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${hasTables ? "text-emerald-800 bg-emerald-100" : "text-amber-800 bg-amber-100"}`}>
                    Step 2 {hasTables ? "✓" : ""}
                  </span>
                  <QrCode className={`w-4 h-4 ${hasTables ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <h4 className="font-heading font-bold text-sm text-ink mb-1">🪑 Tables &amp; QR Codes</h4>
                <p className="text-xs text-stone leading-relaxed mb-3">
                  {hasTables
                    ? `✅ ${dash?.tables_count} table${dash?.tables_count !== 1 ? "s" : ""} created. Print QR codes from the Tables page for each table.`
                    : "Create table numbers (e.g., Table 1 to 10) and seating capacities. Download and print high-resolution QR codes to display on tables for instant self-service ordering!"}
                </p>
              </div>
              <Link href="/admin/tables" className={`text-xs font-bold flex items-center gap-1 group ${hasTables ? "text-emerald-700 hover:text-emerald-900" : "text-amber-700 hover:text-amber-900"}`}>
                🖨️ {hasTables ? "Manage Tables" : "Create Tables & QR"} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Step 3: Exit Sandbox */}
            <div className={`bg-white/80 backdrop-blur-sm border rounded-xl p-4 flex flex-col justify-between transition shadow-sm ${!isSandbox && isVerified ? "border-emerald-300 bg-emerald-50/60" : "border-amber-200/80 hover:border-amber-400"}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${!isSandbox && isVerified ? "text-emerald-800 bg-emerald-100" : "text-amber-800 bg-amber-100"}`}>
                    Step 3 {!isSandbox && isVerified ? "✓" : ""}
                  </span>
                  <CheckCircle2 className={`w-4 h-4 ${!isSandbox && isVerified ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <h4 className="font-heading font-bold text-sm text-ink mb-1">🚀 Verify &amp; Exit Sandbox</h4>
                <p className="text-xs text-stone leading-relaxed mb-3">
                  {!isSandbox && isVerified
                    ? "✅ You are verified & live! Real customer orders and payments are active."
                    : "To exit Sandbox and take real customer orders: 1) Go to Setup Wizard. 2) Click 'Request Verification Code' to get your OTP via email/phone. 3) Enter the code to verify your restaurant and exit Sandbox mode!"}
                </p>
              </div>
              <Link href="/admin/setup" className={`text-xs font-bold flex items-center gap-1 group ${!isSandbox && isVerified ? "text-emerald-700 hover:text-emerald-900" : "text-emerald-700 hover:text-emerald-900"}`}>
                🚀 {!isSandbox && isVerified ? "Setup Complete" : "Go Live Now"} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="uppercase tracking-[0.3em] text-[10px] text-stone mb-1">Overview</p>
          <h1 className="font-heading text-2xl tracking-tight" data-testid="admin-dashboard-title">Restaurant pulse</h1>
        </div>
        <div className="text-[10px] text-stone">Auto-refreshes every 10s</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} data-testid={k.testid} className="border border-bone bg-white rounded-xl p-4 relative group hover:border-ink transition-colors shadow-sm">
              <div className="flex items-center justify-between text-stone text-[10px] uppercase tracking-wider">
                <span>{k.label}</span>
                <Icon className="h-4 w-4 text-ink/70" />
              </div>
              <div className="font-heading text-xl mt-2 tracking-tight">{k.value}</div>
              {k.change && (
                <div className={`text-[10px] font-medium mt-1 ${k.change.includes("↑") ? "text-emerald-600" : k.change.includes("↓") ? "text-alert" : "text-stone"}`}>
                  {k.change}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-8 bg-white border border-bone rounded-xl p-5 shadow-sm">
        <h2 className="font-heading text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/orders?status=confirmed" className="flex items-center gap-3 p-3 rounded-lg border border-bone hover:border-ink hover:bg-cream transition-colors group">
            <div className="h-10 w-10 bg-cream group-hover:bg-white rounded-full flex items-center justify-center shrink-0">
              <ShoppingBag className="h-4 w-4 text-ink" />
            </div>
            <span className="text-sm font-medium">Pending Orders</span>
          </Link>
          <Link href="/admin/menu" className="flex items-center gap-3 p-3 rounded-lg border border-bone hover:border-ink hover:bg-cream transition-colors group">
            <div className="h-10 w-10 bg-cream group-hover:bg-white rounded-full flex items-center justify-center shrink-0">
              <UtensilsCrossed className="h-4 w-4 text-ink" />
            </div>
            <span className="text-sm font-medium">Manage Menu</span>
          </Link>
          <Link href="/admin/reservations" className="flex items-center gap-3 p-3 rounded-lg border border-bone hover:border-ink hover:bg-cream transition-colors group">
            <div className="h-10 w-10 bg-cream group-hover:bg-white rounded-full flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-ink" />
            </div>
            <span className="text-sm font-medium">New Reservation</span>
          </Link>
          <Link href="/admin/revenue" className="flex items-center gap-3 p-3 rounded-lg border border-bone hover:border-ink hover:bg-cream transition-colors group">
            <div className="h-10 w-10 bg-cream group-hover:bg-white rounded-full flex items-center justify-center shrink-0">
              <BarChartIcon className="h-4 w-4 text-ink" />
            </div>
            <span className="text-sm font-medium">View Analytics</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-bone rounded-xl p-5 shadow-sm">
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

          <div className="bg-white border border-bone rounded-xl p-5 shadow-sm">
            <h2 className="font-heading text-base mb-3">Order Activity - Today by Hour</h2>
            <div className="h-40" data-testid="hourly-chart">
              {hourlyOrders.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyOrders} margin={CHART_MARGIN}>
                    <XAxis dataKey="hour" tick={CHART_TICK} />
                    <Tooltip cursor={{ fill: '#FAF5EC' }} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="orders" fill="#8A6A1B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-stone">No data yet today.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-bone rounded-xl p-5 shadow-sm">
            <h2 className="font-heading text-base mb-3">Top items today</h2>
            {dash?.top_items?.length ? (
              <ul className="space-y-2" data-testid="top-items-list">
                {dash.top_items.map((t: any) => (
                  <li key={t.name} className="flex items-center justify-between pb-2 border-b border-bone last:border-0 last:pb-0">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="font-mono text-sm text-clay font-bold">{t.qty}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-stone py-4 text-center bg-cream/30 rounded-lg">No orders yet today.</div>
            )}
          </div>

          {dash?.low_stock?.length > 0 && (
            <div className="bg-warn/10 border border-warn/30 rounded-xl p-4 shadow-sm" data-testid="low-stock-alert">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-warn" /> <h3 className="font-heading text-sm text-amber-900 font-bold">Low stock alert</h3></div>
              <div className="space-y-2">
                {dash.low_stock.map((i: any) => (
                  <div key={i.id} className="bg-white rounded-lg p-3 border border-warn/20 shadow-sm flex items-center justify-between">
                    <div className="font-medium text-sm text-amber-950">{i.name}</div>
                    <div className="text-xs text-amber-800 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded">{i.qty} {i.unit} left</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Sparkles(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
}
