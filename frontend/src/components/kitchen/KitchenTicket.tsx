"use client";
import { ChefHat, CheckCheck } from "lucide-react";
import { memo } from "react";
import type { Order } from "@/types";

interface Props {
  order: Order;
  elapsed: string;
  isLate: boolean;
  onStart: (id: string) => void;
  onReady: (id: string) => void;
}

function getBorderClass(isLate: boolean, isPreparing: boolean): string {
  if (isLate) return "border-alert animate-pulse-alert";
  if (isPreparing) return "border-warn";
  return "border-zinc-500";
}

function KitchenTicketImpl({ order, elapsed, isLate, onStart, onReady }: Props) {
  const isPreparing = order.status === "preparing";
  const borderClass = getBorderClass(isLate, isPreparing);

  return (
    <div
      data-testid={`kds-ticket-${order.token}`}
      className={`bg-graphite border-l-[8px] ${borderClass} rounded-md p-4`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-display text-4xl text-white leading-none">{order.token}</div>
        <div className="text-right">
          <div className="font-mono text-2xl text-warn tracking-tighter">{elapsed}</div>
          <div className="text-[10px] uppercase text-zinc-500 tracking-wider">elapsed</div>
        </div>
      </div>
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-2">
        {order.table_number != null && (
          <span className="bg-warn text-coal px-2 py-0.5 rounded font-bold text-[11px]" data-testid={`kds-table-${order.token}`}>
            TABLE {order.table_number}
          </span>
        )}
        <span>{order.customer_name}</span>
        {order.customer_code ? <span className="text-zinc-600 lowercase">{order.customer_code}</span> : null}
      </div>
      <div className="space-y-1.5 mb-4">
        {order.items.map((i) => (
          <div key={`${order.id}-${i.item_id}`} className="text-sm">
            <div className="flex justify-between">
              <span className="text-white">
                <span className="text-alert font-bold mr-1">{i.qty}×</span>
                {i.name}
              </span>
            </div>
            {i.notes && (
              <div
                className="ml-5 mt-0.5 text-[11px] uppercase tracking-wider font-bold text-warn bg-warn/10 border border-warn/30 rounded px-1.5 py-0.5 inline-block"
                data-testid={`kds-note-${order.token}-${i.item_id}`}
              >
                {i.notes}
              </div>
            )}
          </div>
        ))}
      </div>
      {order.notes && (
        <div className="bg-warn text-coal text-xs px-2 py-1 rounded mb-3 font-medium">NOTE: {order.notes}</div>
      )}
      <div className="flex gap-2">
        {order.status === "confirmed" && (
          <button
            data-testid={`kds-start-${order.token}`}
            onClick={() => onStart(order.id)}
            className="flex-1 bg-warn text-coal py-2.5 rounded font-bold text-sm hover:bg-warn/90 transition flex items-center justify-center gap-2"
          >
            <ChefHat className="h-4 w-4" /> START
          </button>
        )}
        {order.status === "preparing" && (
          <button
            data-testid={`kds-ready-${order.token}`}
            onClick={() => onReady(order.id)}
            className="flex-1 bg-ready text-coal py-2.5 rounded font-bold text-sm hover:bg-ready/90 transition flex items-center justify-center gap-2"
          >
            <CheckCheck className="h-4 w-4" /> READY
          </button>
        )}
      </div>
    </div>
  );
}

export const KitchenTicket = memo(KitchenTicketImpl);
