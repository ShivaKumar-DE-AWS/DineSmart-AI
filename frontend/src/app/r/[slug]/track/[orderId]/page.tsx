"use client";
import { useQuery } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api";
import { useParams } from "next/navigation";
import { fmtTime } from "@/lib/utils";
import { CheckCircle2, ChefHat, ConciergeBell, ClipboardCheck, Clock, Bell, BellRing, BellOff, MapPin } from "lucide-react";
import type { Order } from "@/types";
import { useEffect, useRef, useState } from "react";
import { playChime, ensureNotificationPermission, notify, isPushSupported, subscribeToOrderPush } from "@/lib/notify";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";

const STAGES: Array<{ key: Order["status"]; label: string; line: string; icon: React.ElementType }> = [
  { key: "confirmed", label: "Confirmed", line: "The khansama has your scroll.", icon: ClipboardCheck },
  { key: "preparing", label: "On the dum", line: "Spices waltzing in a copper handi.", icon: ChefHat },
  { key: "ready", label: "Ready", line: "Awaiting you at the counter.", icon: ConciergeBell },
  { key: "served", label: "Served", line: "Khaana khaiye — enjoy your meal.", icon: CheckCircle2 },
];

export default function TrackPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { config: restaurantConfig } = useRestaurantConfig();
  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: () => api<Order>(`/api/orders/${encodeURIComponent(orderId)}`, { timeoutMs: 8_000 } as RequestInit),
    refetchInterval: (query) => query.state.status === "success" ? 3000 : false,
    retry: 1,
  });

  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!order) return;
    if (prevStatusRef.current && prevStatusRef.current !== "ready" && order.status === "ready") {
      playChime("ready");
      notify(`Your order ${order.token} is ready!`, "Please collect from the counter.");
    }
    prevStatusRef.current = order.status;
  }, [order]);

  const [pushState, setPushState] = useState<"unknown" | "unsupported" | "denied" | "default" | "subscribed">("unknown");
  useEffect(() => {
    if (!isPushSupported()) { setPushState("unsupported"); return; }
    if (Notification.permission === "denied") { setPushState("denied"); return; }
    if (Notification.permission === "granted") { setPushState("subscribed"); return; }
    setPushState("default");
  }, []);

  const enablePush = async () => {
    if (!orderId) return;
    const perm = await ensureNotificationPermission();
    if (perm !== "granted") {
      setPushState("denied");
      toast.error("Notifications blocked — enable from browser settings.");
      return;
    }
    const ok = await subscribeToOrderPush(orderId);
    if (ok) {
      setPushState("subscribed");
      toast.success("We&apos;ll ping you even if you close this tab.");
      playChime("ready");
    } else {
      toast.error("Could not enable push — try again in a moment.");
    }
  };

  if (isLoading) {
    return <div className="py-32 text-center font-editorial italic text-[#1A1106]/60" role="status" aria-live="polite" data-testid="track-loading">Finding your order…</div>;
  }

  if (isError || !order) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center" data-testid="track-error" role="alert">
        <h1 className="font-royal text-4xl text-brand-primary">Order not found</h1>
        <p className="font-editorial italic text-[#1A1106]/70 mt-3">
          {error instanceof Error && error.message.includes("timed out")
            ? "Tracking is taking longer than expected. Your order is safe—please retry."
            : "Check the order ID from your confirmation and try again."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={() => refetch()} className="mehfil-btn-royal rounded-full px-6 py-3 font-royal text-xs tracking-widest uppercase">Retry</button>
          <a href="../track" className="rounded-full border border-brand-secondary px-6 py-3 font-royal text-xs tracking-widest uppercase">Enter another ID</a>
        </div>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === order.status);
  const idx = currentIdx === -1 ? 0 : currentIdx;
  const isCancelled = order.status === "cancelled";

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12" data-testid="track-page">
      <div className="text-center mb-8">
        <div className="mehfil-divider mb-3 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Live tracking</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide mb-2">
          Token <span className="font-editorial italic mehfil-gold-gradient">{order.token}</span>
        </h1>
        {order.table_number && (
          <div className="inline-block bg-brand-secondary/10 border border-brand-secondary/30 rounded-full px-4 py-1.5 font-royal tracking-[0.2em] uppercase text-xs text-brand-secondary mb-3">
            Table {order.table_number}
          </div>
        )}
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-1">Updates every three heartbeats.</p>
      </div>

      {!isCancelled && pushState !== "subscribed" && pushState !== "unsupported" && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="track-enable-push"
          onClick={enablePush}
          disabled={pushState === "denied"}
          className="mx-auto block mb-6 mehfil-btn-gold rounded-full px-5 py-2.5 text-xs font-royal tracking-[0.2em] uppercase inline-flex items-center gap-2 disabled:opacity-50"
        >
          {pushState === "denied" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {pushState === "denied" ? "Notifications blocked" : "Ping me when ready"}
        </motion.button>
      )}
      {pushState === "subscribed" && !isCancelled && (
        <div data-testid="track-push-on" className="mx-auto w-fit mb-6 bg-[#FAF5EC] border border-brand-secondary/40 rounded-full px-4 py-2 text-[10px] font-royal tracking-[0.2em] uppercase text-brand-primary inline-flex items-center gap-2">
          <BellRing className="h-3.5 w-3.5 text-brand-secondary" /> You&apos;ll be pinged on every stage
        </div>
      )}

      {/* Restaurant address for takeaway */}
      {order.order_type === "takeaway" && restaurantConfig?.address && (
        <div className="mehfil-card rounded-2xl p-5 mb-6">
          <div className="font-royal tracking-[0.2em] text-[10px] uppercase text-brand-primary mb-2 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Collect from
          </div>
          <p className="font-editorial text-sm text-[#1A1106]/85">{restaurantConfig.address}</p>
        </div>
      )}

      {/* Self-Service Payment Verification Notice */}
      {(restaurantConfig?.service_type === "self_service" || order.order_type === "takeaway" || order.order_type === "quick_order") && !isCancelled && (
        <div className="bg-[#FAF5EC] border-2 border-brand-primary/40 rounded-3xl p-5 mb-6 text-center shadow-md">
          <div className="font-royal text-xs font-bold uppercase tracking-widest text-brand-primary flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-brand-secondary" /> Payment Verification Required Before Pickup
          </div>
          <p className="font-editorial italic text-xs text-[#1A1106]/80 mt-1.5 leading-relaxed">
            Please settle your bill at the counter (or via mobile tap-to-pay below) and present your <span className="font-bold font-royal text-brand-primary">Token #{order.token}</span> to collect your order when ready.
          </p>
        </div>
      )}

      <div className="mehfil-card rounded-3xl p-7 md:p-9 mb-6">
        <div className="space-y-1" data-testid="track-stages">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = !isCancelled && i <= idx;
            const active = !isCancelled && i === idx;
            return (
              <div key={s.key} className="relative" data-testid={`stage-${s.key}`}>
                <div className="flex items-center gap-5 py-3">
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1.05 : 1 }}
                    className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done ? "mehfil-royal-bg text-brand-secondary shadow-lg" : "bg-[#F3EBD8] text-[#1A1106]/40"
                    } ${active ? "ring-4 ring-brand-secondary/40 mehfil-glow" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  <div className="flex-1">
                    <div className={`font-royal tracking-wide ${done ? "text-brand-primary text-lg" : "text-[#1A1106]/50 text-base"}`}>
                      {s.label}
                    </div>
                    {active && <div className="font-editorial italic text-xs text-brand-primary mt-0.5">{s.line}</div>}
                    {done && !active && <div className="font-editorial italic text-[11px] text-[#1A1106]/50 mt-0.5">Complete</div>}
                  </div>
                  {done && <CheckCircle2 className="h-5 w-5 text-brand-secondary" />}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`absolute left-6 top-[3.6rem] h-3 w-px ${done ? "bg-brand-secondary" : "bg-[#1A1106]/15"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isCancelled ? (
        <div className="mehfil-card rounded-2xl p-6 flex items-center gap-4 border-brand-primary/40" data-testid="track-cancelled">
          <BellOff className="h-6 w-6 text-brand-primary" />
          <div>
            <div className="font-royal text-brand-primary">Order cancelled</div>
            <div className="font-editorial italic text-xs text-[#1A1106]/60">Please reach the counter for assistance.</div>
          </div>
        </div>
      ) : order.status === "ready" ? (
        <div className="mehfil-card rounded-2xl p-6 flex items-center gap-4 border-brand-secondary/60" data-testid="track-ready-banner">
          <Sparkles className="h-6 w-6 text-brand-secondary animate-bounce" />
          <div>
            <div className="font-royal text-brand-primary">Ready to enjoy</div>
            <div className="font-editorial italic text-xs text-[#1A1106]/70">Please show Token #{order.token} at the service counter or to your server.</div>
          </div>
        </div>
      ) : (
        <div className="mehfil-card rounded-2xl p-6 flex items-center gap-4">
          <Clock className="h-6 w-6 text-brand-primary" />
          <div>
            <div className="font-royal tracking-wider uppercase text-[10px] text-[#1A1106]/60">Ready by</div>
            <div className="font-royal text-xl text-brand-primary" data-testid="track-eta">{fmtTime(order.estimated_ready_at)}</div>
          </div>
        </div>
      )}

      {(order.payment_method === "upi" || order.payment_method === "card_machine") && (
        <div className="mehfil-card rounded-3xl p-7 md:p-9 mt-6 text-center">
          {order.payment_method === "card_machine" ? (
            <>
              <div className="font-royal tracking-[0.2em] text-[10px] uppercase text-brand-primary mb-2">Pay via Card</div>
              <div className="flex justify-center mb-4 text-brand-primary">
                <CreditCard className="h-12 w-12" />
              </div>
              <p className="font-editorial italic text-sm text-[#1A1106]/70 mb-2">We have notified our staff.</p>
              <p className="font-editorial italic text-xs text-[#1A1106]/50 mb-6">They will bring the card swipe machine to your table shortly.</p>
              <div className="mt-5 pt-5 border-t border-brand-secondary/15">
                <div className="font-royal text-2xl text-brand-primary">₹{order.total}</div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Download Receipt */}
      <div className="mt-6 flex justify-center">
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
          className="rounded-full border border-brand-secondary/40 px-6 py-3 font-royal text-xs tracking-widest uppercase text-brand-primary hover:bg-brand-primary/5 transition inline-flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download Receipt
        </button>
      </div>
    </div>
  );
}
