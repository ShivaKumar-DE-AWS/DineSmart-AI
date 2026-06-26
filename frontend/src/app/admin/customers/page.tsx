"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Phone, Users, TrendingUp } from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  points: number;
  lifetime_spend: number;
  orders_count: number;
  created_at: string;
  last_order_at?: string | null;
}

export default function AdminCustomers() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => api<{ customers: Customer[] }>("/api/customers"),
    refetchInterval: 15_000,
  });
  const [q, setQ] = useState("");

  const customers = data?.customers || [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(s) ||
      c.code.toLowerCase().includes(s) ||
      (c.phone || "").toLowerCase().includes(s)
    );
  }, [customers, q]);

  const totalSpend = customers.reduce((s, c) => s + (c.lifetime_spend || 0), 0);
  const repeat = customers.filter((c) => c.orders_count > 1).length;
  const repeatRate = customers.length ? Math.round((repeat / customers.length) * 100) : 0;

  return (
    <div data-testid="admin-customers-page">
      <div className="mb-6 md:mb-8">
        <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Loyalty</p>
        <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Customer directory</h1>
        <p className="text-sm text-stone mt-1">{customers.length} members · 1 point per ₹100 spent · lifetime offers tracked.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={Users} label="Total members" value={String(customers.length)} testid="cust-total" />
        <Stat icon={TrendingUp} label="Repeat rate" value={`${repeatRate}%`} testid="cust-rate" />
        <Stat icon={Sparkles} label="Lifetime spend" value={formatCurrency(totalSpend)} testid="cust-lifetime" />
        <Stat icon={Phone} label="With phone" value={String(customers.filter((c) => c.phone).length)} testid="cust-withphone" />
      </div>

      <div className="bg-white border border-bone rounded-2xl">
        <div className="p-4 border-b border-bone flex items-center gap-3">
          <Search className="h-4 w-4 text-stone" />
          <Input
            data-testid="customers-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, or member code (M-…)…"
            className="border-0 shadow-none focus-visible:ring-0 px-0"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm" data-testid="customers-table">
            <thead className="bg-cream border-b border-bone text-stone uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-right px-4 py-3">Orders</th>
                <th className="text-right px-4 py-3">Lifetime ₹</th>
                <th className="text-right px-4 py-3">Points</th>
                <th className="text-left px-4 py-3">Last visit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone">Loading members…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone">No customers match.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-bone last:border-0 hover:bg-cream/40" data-testid={`cust-row-${c.code}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-clay font-mono">{c.code}</div>
                  </td>
                  <td className="px-4 py-3 text-stone font-mono text-xs">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{c.orders_count}</td>
                  <td className="px-4 py-3 text-right text-clay font-medium">{formatCurrency(c.lifetime_spend)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 bg-warn/10 text-clay border border-warn/30 rounded-full px-2 py-0.5 text-xs font-medium">
                      <Sparkles className="h-3 w-3" /> {c.points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone text-xs">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, testid }: { icon: React.ElementType; label: string; value: string; testid: string }) {
  return (
    <div className="bg-white border border-bone rounded-2xl p-4 md:p-5" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-stone">{label}</div>
        <Icon className="h-4 w-4 text-clay" />
      </div>
      <div className="font-heading text-2xl md:text-3xl mt-1">{value}</div>
    </div>
  );
}
