"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api";
import { formatCurrency, fmtTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";
import { toast } from "sonner";
import { useSession } from "@/stores/session";
import { QrCode } from "lucide-react";
import { OrderDetailsModal } from "@/components/shared/OrderDetailsModal";

const STATUS_OPTIONS: Order["status"][] = ["confirmed", "preparing", "ready", "served", "cancelled"];
const STATUS_COLOR: Record<string, "clay" | "warn" | "ready" | "sage" | "alert"> = {
  confirmed: "clay", preparing: "warn", ready: "ready", served: "sage", cancelled: "alert", pending: "warn",
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [filter, setFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { data } = useQuery({ queryKey: ["admin-orders", filter, user?.restaurant_id], queryFn: () => { const params = new URLSearchParams(); if (filter) params.set("status_filter", filter); return api<{ orders: Order[] }>(`/api/orders?${params.toString()}`); }, refetchInterval: 15000 });
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders", undefined, user?.restaurant_id] }); toast.success("Status updated"); },
  });
  const markPaidMut = useMutation({
    mutationFn: ({ id }: { id: string }) => api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ payment_status: "paid" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders", undefined, user?.restaurant_id] }); toast.success("Marked PAID!"); },
  });

  const downloadBill = async (orderId: string, tokenName: string) => {
    try {
      const t = useSession.getState().token;
      const res = await fetch(apiUrl(`/api/orders/${orderId}/bill`), {
        headers: t ? { Authorization: "Bearer " + t } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bill_" + tokenName + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download bill");
    }
  };

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
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-left px-4 py-3">QR</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Placed</th>
              <th className="text-left px-4 py-3">Update</th>
              <th className="text-left px-4 py-3">Bill</th>
            </tr>
          </thead>
          <tbody>
            {(data?.orders ?? []).map((o) => (
              <tr key={o.id} onClick={() => setSelectedOrder(o)} className={`border-b border-bone last:border-0 transition-colors cursor-pointer ${o.payment_status === "paid" ? "bg-emerald-50/60 hover:bg-emerald-100/50" : "hover:bg-cream/50"}`} data-testid={`admin-order-row-${o.token}`}>
                <td className="px-4 py-3 font-mono font-semibold text-clay">{o.token}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full ${
                    o.order_type === "takeaway"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {o.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
                  </span>
                </td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3 text-stone text-xs">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant={o.payment_method === "upi" ? "sage" : o.payment_method === "card_machine" ? "alert" : "warn"}>
                      {o.payment_method === "upi" ? "UPI QR" : o.payment_method === "card_machine" ? "CARD MACHINE" : "CASH"}
                    </Badge>
                    {o.payment_status === "paid" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                        ✅ PAID
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); markPaidMut.mutate({ id: o.id }); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 transition shadow-sm"
                        title="Click to mark order as paid"
                      >
                        ⏳ MARK PAID
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {o.order_type === "takeaway" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const slug = user?.restaurant_slug || "";
                        const trackUrl = `${window.location.origin}/r/${slug}/track/${o.id}`;
                        const w = window.open("", "_blank");
                        if (!w) { toast.error("Popup blocked"); return; }
                        const name = o.customer_name;
                        w.document.write(`<!doctype html><html><head><title>Takeaway QR</title>
                          <style>@page{margin:0;size:1200px 1600px}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#FAF5EC;font-family:Georgia,serif}.card{width:1200px;height:1600px;background:#FAF5EC;border:8px solid #5C0E1B;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px}.badge{font-size:18px;background:#5C0E1B;color:#FAF5EC;padding:6px 24px;border-radius:40px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px}.token{font-size:96px;font-weight:bold;color:#5C0E1B;margin:10px 0}.customer{font-size:28px;color:#8A6A1B;margin-bottom:30px}img{width:400px;height:400px}.footer{font-size:18px;color:#8A6A1B;margin-top:auto}</style></head><body>
                          <div class="card"><div class="badge">Takeaway</div><div class="token">${o.token}</div><div class="customer">${name}</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(trackUrl)}" /><div class="footer">Powered by SmartDine AI</div></div>
                          <script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script>
                          </body></html>`);
                        w.document.close();
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-cream transition-colors"
                      title="Print takeaway QR"
                    >
                      <QrCode className="h-4 w-4 text-clay" />
                    </button>
                  ) : <span className="text-stone/30 text-xs">—</span>}
                </td>
                <td className="px-4 py-3"><Badge variant={STATUS_COLOR[o.status] || "default"}>{o.status}</Badge></td>
                <td className="px-4 py-3 text-stone">{fmtTime(o.created_at)}</td>
                <td className="px-4 py-3">
                  <select
                    data-testid={`status-select-${o.token}`}
                    defaultValue={o.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => mut.mutate({ id: o.id, status: e.target.value })}
                    className="h-8 rounded-full border border-bone px-2 text-xs bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadBill(o.id, o.token); }}
                    className="h-8 rounded-full border border-bone px-3 text-xs bg-white hover:bg-cream transition-colors"
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {data?.orders.length === 0 && (
            <tr><td colSpan={11} className="px-4 py-10 text-center text-stone">No orders to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onMarkPaid={selectedOrder.payment_status !== "paid" ? () => markPaidMut.mutate({ id: selectedOrder.id }) : undefined}
          onMarkServed={selectedOrder.status !== "served" ? () => mut.mutate({ id: selectedOrder.id, status: "served" }) : undefined}
        />
      )}
    </div>
  );
}
