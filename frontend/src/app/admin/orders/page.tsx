"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, fmtTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";
import { toast } from "sonner";
import { useSession } from "@/stores/session";

const STATUS_OPTIONS: Order["status"][] = ["confirmed", "preparing", "ready", "served", "cancelled"];
const STATUS_COLOR: Record<string, "clay" | "warn" | "ready" | "sage" | "alert"> = {
  confirmed: "clay", preparing: "warn", ready: "ready", served: "sage", cancelled: "alert", pending: "warn",
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [filter, setFilter] = useState<string>("");
  const { data } = useQuery({ queryKey: ["admin-orders", filter, user?.restaurant_id], queryFn: () => { const params = new URLSearchParams(); if (filter) params.set("status_filter", filter); return api<{ orders: Order[] }>(`/api/orders?${params.toString()}`); }, refetchInterval: 15000 });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders", undefined, user?.restaurant_id] }); toast.success("Status updated"); },
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Orders</p>
          <h1 className="font-heading text-4xl tracking-tight">All orders</h1>
        </div>
        <select data-testid="orders-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-full border border-bone bg-white px-4 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white border border-bone rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm" data-testid="admin-orders-table">
          <thead className="bg-cream border-b border-bone text-stone uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Token</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Placed</th>
              <th className="text-left px-4 py-3">Update</th>
            </tr>
          </thead>
          <tbody>
            {(data?.orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-bone last:border-0" data-testid={`admin-order-row-${o.token}`}>
                <td className="px-4 py-3 font-mono font-semibold text-clay">{o.token}</td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3 text-stone text-xs">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={o.payment_method === "upi" ? "sage" : "warn"}>
                    {o.payment_method === "upi" ? "UPI QR" : "CASH"}
                  </Badge>
                </td>
                <td className="px-4 py-3"><Badge variant={STATUS_COLOR[o.status] || "default"}>{o.status}</Badge></td>
                <td className="px-4 py-3 text-stone">{fmtTime(o.created_at)}</td>
                <td className="px-4 py-3">
                  <select
                    data-testid={`status-select-${o.token}`}
                    defaultValue={o.status}
                    onChange={(e) => mut.mutate({ id: o.id, status: e.target.value })}
                    className="h-8 rounded-full border border-bone px-2 text-xs bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {data?.orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-stone">No orders to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
