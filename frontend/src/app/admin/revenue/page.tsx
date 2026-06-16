"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminRevenue() {
  const { data: w } = useQuery({ queryKey: ["rev-7"], queryFn: () => api<any>("/api/analytics/revenue?days=7") });
  const { data: m } = useQuery({ queryKey: ["rev-30"], queryFn: () => api<any>("/api/analytics/revenue?days=30") });

  const total7 = (w?.series || []).reduce((s: number, x: any) => s + x.revenue, 0);
  const total30 = (m?.series || []).reduce((s: number, x: any) => s + x.revenue, 0);

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Analytics</p>
      <h1 className="font-heading text-4xl tracking-tight mb-8">Revenue</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="border border-bone bg-white rounded-2xl p-6" data-testid="rev-7d">
          <div className="text-xs uppercase text-stone tracking-wider">Last 7 days</div>
          <div className="font-heading text-4xl mt-2 tracking-tight">{formatCurrency(total7)}</div>
        </div>
        <div className="border border-bone bg-white rounded-2xl p-6" data-testid="rev-30d">
          <div className="text-xs uppercase text-stone tracking-wider">Last 30 days</div>
          <div className="font-heading text-4xl mt-2 tracking-tight">{formatCurrency(total30)}</div>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-2xl p-6">
        <h2 className="font-heading text-xl mb-4">Daily revenue · last 30 days</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2DFD8" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5C5C5C" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#5C5C5C" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2DFD8" }} />
              <Bar dataKey="revenue" fill="#C84B31" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
