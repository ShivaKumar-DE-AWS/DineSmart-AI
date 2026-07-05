"use client";
import { useQuery } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, fmtTime } from "@/lib/utils";
import { CheckCircle2, Eye, Sparkles, Copy, CreditCard, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Order } from "@/types";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { useState } from "react";

export default function TokenPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { orderId } = useParams<{ orderId: string }>();
  const { config: restaurantConfig } = useRestaurantConfig();
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

      {/* Self-Service Payment Verification & Pay-Code Notice */}
      {order.status === "awaiting_cash_verification" ? (
        <div className="bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-5 mb-6 text-center shadow-lg animate-pulse">
          <div className="font-royal text-sm font-bold uppercase tracking-widest text-amber-700">
            {order.payment_method === 'upi' ? '⏳ UPI Payment Verification' :
             order.payment_method === 'card_machine' ? '⏳ Card Payment Verification' :
             '⏳ Temporary Pay-Code Generated'}
          </div>
          <div className="font-royal text-4xl text-amber-900 my-2 tracking-wider">
            #{order.pay_code || order.token}
          </div>
          <p className="font-editorial italic text-xs text-amber-800 mt-1 leading-relaxed">
            {order.payment_method === 'upi' ? 'Complete your UPI payment and show this code at the counter. Once verified, your kitchen preparation token will be generated!' :
             order.payment_method === 'card_machine' ? 'Please complete your card payment at the counter and show this code. Once verified, your kitchen preparation token will be generated!' :
             'Show this code at the cashier counter to complete your cash payment. Once verified, your kitchen preparation token will be automatically generated!'}
          </p>
          {restaurantConfig?.upi_id && (
            <a
              href={`upi://pay?pa=${encodeURIComponent(restaurantConfig.upi_id)}&pn=${encodeURIComponent(restaurantConfig.name)}&am=${order.total}&cu=INR&tn=Order-${order.id}`}
              className="mt-3 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-royal text-xs uppercase px-5 py-2.5 rounded-xl shadow-md hover:bg-emerald-700 transition-all"
            >
              ⚡ UPI Tap & Pay Instantly
            </a>
          )}
        </div>
      ) : (restaurantConfig?.service_type === "self_service" || order.order_type === "takeaway" || order.order_type === "quick_order") && order.status !== "cancelled" && (
        <div className="bg-[#FAF5EC] border-2 border-brand-primary/40 rounded-3xl p-5 mb-6 text-center shadow-md">
          <div className="font-royal text-xs font-bold uppercase tracking-widest text-brand-primary flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-brand-secondary" /> Payment Verification Required Before Pickup
          </div>
          <p className="font-editorial italic text-xs text-[#1A1106]/80 mt-1.5 leading-relaxed">
            Please settle your bill at the counter and present your <span className="font-bold font-royal text-brand-primary">Token #{order.token}</span> to collect your order when ready.
          </p>
        </div>
      )}

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

      {order.payment_method === "upi" && (
        <div className="mehfil-card rounded-3xl p-7 md:p-9 mb-6 text-center">
          <div className="font-royal tracking-[0.2em] text-[10px] uppercase text-brand-primary mb-2">Pay via UPI</div>
          <p className="font-editorial italic text-xs text-[#1A1106]/60 mb-6">Scan or tap to settle the bill securely from your phone.</p>
          
          {(restaurantConfig?.payment_qr_url || restaurantConfig?.upi_id) ? (
            <>
              {order.order_type !== "takeaway" && (
                <div className="bg-white p-3 rounded-2xl inline-block shadow-sm border border-brand-secondary/20 mb-4">
                  <img 
                    src={restaurantConfig?.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${restaurantConfig?.upi_id}&pn=${restaurantConfig?.name}&am=${order.total}&cu=INR`)}`} 
                    alt="UPI QR Code" 
                    className="w-48 h-auto object-contain"
                  />
                </div>
              )}
              {restaurantConfig?.upi_id && !restaurantConfig?.payment_qr_url && order.order_type !== "takeaway" && (
                <div className="font-mono text-[11px] text-[#1A1106]/70 uppercase tracking-widest">{restaurantConfig.upi_id}</div>
              )}
              {restaurantConfig?.upi_id && (
                <a 
                  href={`upi://pay?pa=${restaurantConfig.upi_id}&pn=${encodeURIComponent(restaurantConfig.name)}&am=${order.total}&cu=INR`}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-primary text-[#FAF5EC] py-3.5 rounded-full font-royal uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition"
                >
                  <span>Tap to Pay on Mobile — ₹{order.total}</span>
                </a>
              )}
            </>
          ) : (
            <div className="text-xs text-[#1A1106]/50 italic my-4">UPI payment not configured by restaurant.</div>
          )}
          
          <div className="mt-5 pt-5 border-t border-brand-secondary/15">
            <div className="font-royal text-2xl text-brand-primary">₹{order.total}</div>
            <div className="font-editorial italic text-[10px] text-[#1A1106]/50 mt-1">Please show the payment success screen to our staff.</div>
          </div>
        </div>
      )}

      {order.payment_method === "card_machine" && (
        <div className="mehfil-card rounded-3xl p-7 md:p-9 mb-6 text-center">
          <div className="font-royal tracking-[0.2em] text-[10px] uppercase text-brand-primary mb-2">Pay via Card</div>
          <div className="flex justify-center mb-4 text-brand-primary">
            <CreditCard className="h-12 w-12" />
          </div>
          <p className="font-editorial italic text-sm text-[#1A1106]/70 mb-2">We have notified our staff.</p>
          <p className="font-editorial italic text-xs text-[#1A1106]/50 mb-6">They will bring the card swipe machine to your table shortly.</p>
          <div className="mt-5 pt-5 border-t border-brand-secondary/15">
            <div className="font-royal text-2xl text-brand-primary">₹{order.total}</div>
          </div>
        </div>
      )}

      {/* Restaurant address for takeaway */}
      {order.order_type === "takeaway" && restaurantConfig?.address && (
        <div className="mehfil-card rounded-2xl p-5 mb-6">
          <div className="font-royal tracking-[0.2em] text-[10px] uppercase text-brand-primary mb-2">Collect from</div>
          <p className="font-editorial text-sm text-[#1A1106]/85">{restaurantConfig.address}</p>
        </div>
      )}

      {/* Download Receipt */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={async () => {
            try {
              const res = await fetch(apiUrl(`/api/orders/${orderId}/bill`));
              if (!res.ok) throw new Error("Download failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `bill_${order.token}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              toast.error("Failed to download receipt");
            }
          }}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-brand-secondary/40 px-6 py-3 font-royal text-xs tracking-widest uppercase text-brand-primary hover:bg-brand-primary/5 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={`/r/${slug}/track/${order.id}`} data-testid="token-track-link" className="inline-flex items-center justify-center gap-2 mehfil-btn-royal rounded-full px-6 py-3.5 font-royal tracking-[0.2em] uppercase text-xs">
          <Eye className="h-4 w-4" /> Track live
        </Link>
        <Link href={`/r/${slug}/menu?mode=quick`} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-royal tracking-[0.2em] uppercase text-xs border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5 transition">
          <Sparkles className="h-4 w-4" /> Go back to menu
        </Link>
      </div>
    </div>
  );
}
