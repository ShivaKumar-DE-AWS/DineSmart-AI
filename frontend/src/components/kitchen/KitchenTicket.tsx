"use client";
import { ChefHat, CheckCheck, Clock, AlertTriangle, Play, Check } from "lucide-react";
import { memo } from "react";
import type { Order } from "@/types";

interface Props {
  order: Order;
  elapsed: string;
  elapsedMs: number;
  isSelected?: boolean;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
  onItemStatusUpdate?: (orderId: string, cartItemId: string, status: string) => void;
  onClick?: (order: Order) => void;
}

function getCardStyle(elapsedMs: number, isPreparing: boolean): { border: string; glow: string; badge: string } {
  if (elapsedMs > 15 * 60 * 1000) return { border: "border-l-red-500", glow: "shadow-red-500/10", badge: "bg-red-500/10 text-red-400 border-red-500/20" };
  if (elapsedMs > 10 * 60 * 1000) return { border: "border-l-amber-500", glow: "shadow-amber-500/10", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  if (isPreparing) return { border: "border-l-emerald-500", glow: "shadow-emerald-500/10", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  return { border: "border-l-zinc-500", glow: "", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
}

function KitchenTicketImpl({ order, elapsed, elapsedMs, isSelected, onStart, onReady, onItemStatusUpdate, onClick }: Props) {
  const isPreparing = order.status === "preparing";
  const isLate = elapsedMs > 10 * 60 * 1000;
  const styles = getCardStyle(elapsedMs, isPreparing);
  
  const ringClass = isSelected ? "ring-2 ring-white/30 scale-[1.02] shadow-xl" : "";

  // Group items by round
  const groupedItems = order.items.reduce((acc, item) => {
    const round = item.round_number || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(item);
    return acc;
  }, {} as Record<number, typeof order.items>);
  
  const rounds = Object.keys(groupedItems).map(Number).sort((a, b) => a - b);

  const handleMarkRoundReady = (e: React.MouseEvent, roundItems: typeof order.items) => {
    e.stopPropagation();
    if (!onItemStatusUpdate) return;
    roundItems.forEach(i => {
      if (i.item_status !== "ready" && i.item_status !== "served" && i.cart_item_id) {
        onItemStatusUpdate(order.id, i.cart_item_id, "ready");
      }
    });
  };

  return (
    <div
      data-testid={`kds-ticket-${order.token}`}
      onClick={() => onClick?.(order)}
      className={`bg-zinc-900/80 border-l-[6px] ${styles.border} rounded-2xl p-4 sm:p-5 transition-all duration-200 ${ringClass} shadow-lg ${styles.glow} hover:bg-zinc-900 cursor-pointer flex flex-col`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="text-2xl sm:text-3xl font-bold text-white">{order.token}</div>
          <div className={`text-[9px] sm:text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-lg ${
            order.order_type === "takeaway"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
            {order.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
          </div>
          {isLate && (
            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg animate-pulse">
              <AlertTriangle className="h-3 w-3" /> LATE
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 sm:px-2.5 py-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className={`font-mono text-xs sm:text-sm font-bold ${isLate ? "text-red-400" : "text-zinc-300"}`}>{elapsed}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {order.table_number != null && (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold" data-testid={`kds-table-${order.token}`}>
            TABLE {order.table_number}
          </span>
        )}
        <span className="text-xs sm:text-sm text-zinc-300 font-medium truncate max-w-[120px] sm:max-w-none">{order.customer_name}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[8px] sm:text-[9px] tracking-wider uppercase font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {order.payment_method === "upi" ? "UPI QR" : order.payment_method === "card_machine" ? "CARD" : "CASH"}
          </span>
          <span className={`text-[8px] sm:text-[9px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded ${order.payment_status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {order.payment_status === "paid" ? "PAID" : "UNPAID"}
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-5 flex-1 overflow-y-auto pr-1">
        {rounds.map(roundNum => (
          <div key={`round-${roundNum}`} className="space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-2">
              <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">Round {roundNum}</span>
              {onItemStatusUpdate && groupedItems[roundNum].some(i => i.item_status !== 'ready' && i.item_status !== 'served') && (
                <button
                  onClick={(e) => handleMarkRoundReady(e, groupedItems[roundNum])}
                  className="text-[9px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 rounded font-bold transition-colors"
                >
                  MARK ROUND READY
                </button>
              )}
            </div>
            {groupedItems[roundNum].map((i, idx) => {
              const status = i.item_status || "pending";
              return (
                <div key={`${order.id}-${i.cart_item_id || i.item_id}-${idx}`} className={`bg-zinc-800/50 rounded-xl p-2.5 sm:p-3 transition-colors ${status === 'ready' ? 'opacity-50' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <span className="text-xs sm:text-sm text-white">
                      <span className="text-amber-400 font-bold mr-1.5">{i.qty}×</span>
                      <span className={status === 'ready' || status === 'served' ? 'line-through text-zinc-500' : ''}>{i.name}</span>
                    </span>
                    
                    {onItemStatusUpdate && status !== 'served' && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if(i.cart_item_id) onItemStatusUpdate(order.id, i.cart_item_id, "preparing"); }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                          >
                            <Play className="h-3 w-3" /> Prep
                          </button>
                        )}
                        {(status === "pending" || status === "preparing") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if(i.cart_item_id) onItemStatusUpdate(order.id, i.cart_item_id, "ready"); }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                          >
                            <Check className="h-3 w-3" /> Ready
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {i.notes && (
                    <div
                      className="mt-1.5 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 inline-block"
                      data-testid={`kds-note-${order.token}-${i.item_id}`}
                    >
                      {i.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-xl mb-4 font-medium shrink-0">
          NOTE: {order.notes}
        </div>
      )}

      {/* Legacy Fallback Order-Level Buttons */}
      {!onItemStatusUpdate && (
        <div className="flex gap-2 mt-auto shrink-0">
          {order.status === "confirmed" && (
            <button
              data-testid={`kds-start-${order.token}`}
              onClick={(e) => { e.stopPropagation(); onStart(order.id); }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <ChefHat className="h-4 w-4" /> START COOKING
            </button>
          )}
          {order.status === "preparing" && (
            <button
              data-testid={`kds-ready-${order.token}`}
              onClick={(e) => { e.stopPropagation(); onReady(order.id); }}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCheck className="h-4 w-4" /> MARK READY
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const KitchenTicket = memo(KitchenTicketImpl);
