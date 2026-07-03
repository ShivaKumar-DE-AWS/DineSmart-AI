"use client";
import React from "react";
import type { Order } from "@/types";

interface Props {
  order: Order;
  onClose: () => void;
  onMarkPaid?: () => void;
  onMarkServed?: () => void;
  onStartCooking?: () => void;
  onMarkReady?: () => void;
}

export function OrderDetailsModal({
  order,
  onClose,
  onMarkPaid,
  onMarkServed,
  onStartCooking,
  onMarkReady,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase bg-amber-500/20 text-amber-400 tracking-wider">
              {order.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
            </span>
            <h2 className="text-3xl font-black mt-1">Token #{order.token}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        <div className="py-4 space-y-4 overflow-y-auto dashboard-scroll flex-1">
          <div className="flex justify-between items-center text-sm bg-zinc-800/50 p-3.5 rounded-2xl border border-zinc-800">
            <div>
              <p className="text-zinc-400 text-xs uppercase font-bold">Customer</p>
              <p className="font-bold text-lg text-white">{order.customer_name}</p>
            </div>
            {order.table_number != null && (
              <div className="text-right">
                <p className="text-zinc-400 text-xs uppercase font-bold">Table</p>
                <p className="font-bold text-lg text-amber-400">#{order.table_number}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Ordered Dishes ({order.items.reduce((a, b) => a + b.qty, 0)} items)
            </h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div
                  key={`${item.item_id}-${i}`}
                  className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-base text-white">
                      {item.qty}× {item.name}
                    </span>
                    <span className="text-sm text-zinc-300">₹{item.price * item.qty}</span>
                  </div>
                  {item.notes && (
                    <div className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/20 inline-block w-fit mt-1 font-medium">
                      Note: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {order.notes && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-sm text-amber-300">
              <span className="font-bold">General Order Note:</span> {order.notes}
            </div>
          )}

          <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
            <div>
              <span className="text-xs uppercase font-bold text-zinc-400">Payment Status</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                    order.payment_status === "paid"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {order.payment_status === "paid" ? "PAID" : "UNPAID"}
                </span>
                <span className="text-xs uppercase text-zinc-400 font-medium">
                  ({order.payment_method || "Cash"})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-zinc-400">Total Amount</span>
              <p className="text-2xl font-black text-white">₹{order.total}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex gap-2 flex-wrap">
          {onStartCooking && order.status === "confirmed" && (
            <button
              onClick={() => {
                onStartCooking();
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-2xl transition shadow min-w-[140px]"
            >
              START COOKING
            </button>
          )}
          {onMarkReady && order.status === "preparing" && (
            <button
              onClick={() => {
                onMarkReady();
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 rounded-2xl transition shadow min-w-[140px]"
            >
              MARK READY
            </button>
          )}
          {onMarkPaid && order.payment_status !== "paid" && (
            <button
              onClick={() => {
                onMarkPaid();
                onClose();
              }}
              className="flex-1 bg-red-500/30 hover:bg-red-500/40 border border-red-400/50 text-white font-bold py-3 rounded-2xl transition shadow min-w-[120px]"
            >
              MARK PAID
            </button>
          )}
          {onMarkServed && order.status !== "served" && (
            <button
              onClick={() => {
                onMarkServed();
                onClose();
              }}
              className="flex-1 bg-white text-emerald-800 hover:bg-white/90 font-bold py-3 rounded-2xl transition shadow min-w-[120px]"
            >
              MARK SERVED
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3 rounded-2xl font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
