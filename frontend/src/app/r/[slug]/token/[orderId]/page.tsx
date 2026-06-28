"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, fmtTime } from "@/lib/utils";
import { CheckCircle2, Eye, Sparkles, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Order } from "@/types";

export default function TokenPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<Order>(`/api/orders/${orderId}`),
  });

  if (error) {
    return <div className="py-32 text-center font-editorial text-red-500">Error loading order: {(error as Error).message}</div>;
  }

  if (isLoading || !order) {
    return <div className="py-32 text-center font-editorial italic text-[#1A1106]/60" data-testid="token-loading">Sealing your order…</div>;
  }

  const copyId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied — keep it close.");
  };

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-14" data-testid="token-page">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.7 }}
          className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand-secondary/20 mb-4 ring-4 ring-brand-secondary/30"
        >
          <CheckCircle2 className="h-8 w-8 text-brand-primary" />
        </motion.div>
        <div className="mehfil-divider mb-3 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Order confirmed</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          Aadab, <span className="font-editorial italic mehfil-gold-gradient">{order.customer_name}</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">Your feast is being orchestrated. Show this token at the counter.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mehfil-royal-bg text-[#FAF5EC] rounded-3xl p-10 text-center mb-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-brand-secondary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-brand-primary/40 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="font-royal tracking-[0.4em] uppercase text-[10px] text-brand-secondary mb-2">Your token</p>
          <div className="mehfil-divider mb-4 max-w-[120px] mx-auto" />
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
            className="font-royal text-[18vw] md:text-[9rem] leading-none mehfil-gold-gradient"
            data-testid="token-number"
          >
            {order.token}
          </motion.div>
          <div className="mehfil-divider mt-4 max-w-[120px] mx-auto" />
          <div className="flex items-center justify-center gap-3 mt-3">
            {order.table_number && (
              <p className="font-royal uppercase text-[12px] tracking-widest text-brand-secondary">
                Table {order.table_number}
              </p>
            )}
            <span className={`font-royal uppercase text-[10px] tracking-widest px-2.5 py-0.5 rounded-full ${
              order.order_type === "takeaway"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}>
              {order.order_type === "takeaway" ? "TAKEAWAY" : "DINE-IN"}
            </span>
          </div>
          <p className="font-editorial italic text-[#FAF5EC]/80 mt-2">
            Ready by <span className="font-royal text-brand-secondary tracking-wider" data-testid="token-eta">{fmtTime(order.estimated_ready_at)}</span>
          </p>
        </div>
      </motion.div>

      <div className="mehfil-card rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mehfil-divider flex-1"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">The feast</span></div>
        </div>
        <div className="space-y-2 text-sm">
          {order.items.map((i) => (
            <div key={i.item_id} className="border-b border-brand-secondary/15 pb-2 last:border-0">
              <div className="flex justify-between">
                <span className="font-editorial text-[#1A1106]/85">{i.qty}× {i.name}</span>
                <span className="font-royal text-brand-primary">{formatCurrency(i.qty * i.price)}</span>
              </div>
              {i.notes && (
                <div className="font-editorial italic text-[11px] text-[#8A6A1B] mt-0.5" data-testid={`token-note-${i.item_id}`}>↳ {i.notes}</div>
              )}
            </div>
          ))}
          {order.notes && (
            <div className="mt-3 bg-brand-secondary/10 border border-brand-secondary/30 rounded-lg px-3 py-2 text-[12px] text-[#8A6A1B] font-editorial italic" data-testid="token-general-note">
              For the whole order: {order.notes}
            </div>
          )}
          <div className="border-t border-brand-secondary/30 my-3" />
          <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-brand-primary">{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax</span><span className="font-royal text-brand-primary">{formatCurrency(order.tax)}</span></div>
          <div className="flex justify-between items-end mt-3">
            <span className="font-royal tracking-wider uppercase text-xs text-brand-primary">Total due</span>
            <span className="font-royal text-xl text-brand-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
        {order.customer_code && (
          <div className="mt-4 bg-[#FAF5EC] border border-brand-secondary/30 rounded-xl p-3 flex items-center gap-3" data-testid="token-customer-code">
            <Sparkles className="h-4 w-4 text-brand-secondary" />
            <div className="font-editorial italic text-[12px] text-[#1A1106]/75">
              SmartDine member <span className="font-royal text-[#8A6A1B] tracking-wider not-italic">{order.customer_code}</span> — save this for points &amp; offers.
            </div>
          </div>
        )}
        <button onClick={copyId} className="mt-5 text-[10px] font-royal tracking-[0.2em] uppercase text-brand-primary/70 hover:text-brand-primary inline-flex items-center gap-1.5">
          <Copy className="h-3 w-3" /> Order ID {order.id.slice(0, 8)}…
        </button>
      </div>

      {(order.payment_method === "upi" || order.payment_method === "card_machine") && (
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-5 mb-6 text-center">
          <p className="font-editorial italic text-brand-primary text-sm mb-3">
            {order.payment_method === "upi" 
              ? "You selected UPI payment. Tap 'Track live' below to view the QR code and complete your payment."
              : "You requested the card machine. Our staff will bring it to your table shortly."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={`/r/${slug}/track/${order.id}`} data-testid="token-track-link" className="inline-flex items-center justify-center gap-2 mehfil-btn-royal rounded-full px-6 py-3.5 font-royal tracking-[0.2em] uppercase text-xs">
          <Eye className="h-4 w-4" /> Track live
        </Link>
        <Link href={`/r/${slug}/menu`} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-royal tracking-[0.2em] uppercase text-xs border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5 transition">
          <Sparkles className="h-4 w-4" /> Add to the mehfil
        </Link>
      </div>
    </div>
  );
}
