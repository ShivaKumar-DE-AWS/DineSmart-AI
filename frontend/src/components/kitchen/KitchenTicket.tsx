"use client";
import { ChefHat, CheckCheck, Clock, AlertTriangle } from "lucide-react";
import { memo } from "react";
import type { Order } from "@/types";

interface Props {
  order: Order;
  elapsed: string;
  elapsedMs: number;
  isSelected?: boolean;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
}

function getCardStyle(elapsedMs: number, isPreparing: boolean): { border: string; glow: string; badge: string } {
  if (elapsedMs > 15 * 60 * 1000) return { border: "border-l-red-500", glow: "shadow-red-500/10", badge: "bg-red-500/10 text-red-400 border-red-500/20" };
  if (elapsedMs > 10 * 60 * 1000) return { border: "border-l-amber-500", glow: "shadow-amber-500/10", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  if (isPreparing) return { border: "border-l-emerald-500", glow: "shadow-emerald-500/10", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  return { border: "border-l-zinc-500", glow: "", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
}

function KitchenTicketImpl({ order, elapsed, elapsedMs, isSelected, onStart, onReady }: Props) {
  const isPreparing = order.status === "preparing";
  const isLate = elapsedMs > 10 * 60 * 1000;
  const styles = getCardStyle(elapsedMs, isPreparing);
  
  const ringClass = isSelected ? "ring-2 ring-white/30 scale-[1.02] shadow-xl" : "";
  const minutes = Math.floor(elapsedMs / 60000);

  return (
    <div
      data-testid={`kds-ticket-${order.token}`}
      className={`bg-zinc-900/80 border-l-[6px] ${styles.border} rounded-2xl p-5 transition-all duration-200 ${ringClass} shadow-lg ${styles.glow} hover:bg-zinc-900`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-white">{order.token}</div>
          <div className={`text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-lg ${
            order.order_type === "takeaway"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
            {order.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
          </div>
          {isLate && (
            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-lg animate-pulse">
              <AlertTriangle className="h-3 w-3" /> LATE
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className={`font-mono text-sm font-bold ${isLate ? "text-red-400" : "text-zinc-300"}`}>{elapsed}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {order.table_number != null && (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-[11px] font-bold" data-testid={`kds-table-${order.token}`}>
            TABLE {order.table_number}
          </span>
        )}
        <span className="text-sm text-zinc-300 font-medium">{order.customer_name}</span>
        {order.customer_code ? <span className="text-[10px] text-zinc-600 lowercase">· {order.customer_code}</span> : null}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] tracking-wider uppercase font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {order.payment_method === "upi" ? "UPI QR" : order.payment_method === "card_machine" ? "CARD" : "CASH"}
          </span>
          <span className={`text-[9px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded ${order.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {order.payment_status === "paid" ? "PAID" : "UNPAID"}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {order.items.map((i) => (
          <div key={`${order.id}-${i.item_id}`} className="bg-zinc-800/50 rounded-xl px-3 py-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white">
                <span className="text-amber-400 font-bold mr-1.5">{i.qty}×</span>
                {i.name}
              </span>
            </div>
            {i.notes && (
              <div
                className="mt-1.5 text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 inline-block"
                data-testid={`kds-note-${order.token}-${i.item_id}`}
              >
                {i.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-xl mb-4 font-medium">
          NOTE: {order.notes}
        </div>
      )}

      <div className="flex gap-2">
        {order.status === "confirmed" && (
          <button
            data-testid={`kds-start-${order.token}`}
            onClick={() => onStart(order.id)}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <ChefHat className="h-4 w-4" /> START COOKING
          </button>
        )}
        {order.status === "preparing" && (
          <button
            data-testid={`kds-ready-${order.token}`}
            onClick={() => onReady(order.id)}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <CheckCheck className="h-4 w-4" /> MARK READY
          </button>
        )}
      </div>
    </div>
  );
}

export const KitchenTicket = memo(KitchenTicketImpl);
