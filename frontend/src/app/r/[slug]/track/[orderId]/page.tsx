"use client";
import { useQuery } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api";
import { useParams } from "next/navigation";
import { fmtTime, formatCurrency } from "@/lib/utils";
import { CheckCircle2, ChefHat, ConciergeBell, ClipboardCheck, Clock, Bell, BellRing, BellOff, MapPin, Sparkles, Scissors, X, CreditCard } from "lucide-react";
import type { Order } from "@/types";
import { useEffect, useRef, useState } from "react";
import { playChime, ensureNotificationPermission, notify, isPushSupported, subscribeToOrderPush } from "@/lib/notify";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitTab, setSplitTab] = useState<"equally" | "items" | "custom">("equally");
  const [splitPeople, setSplitPeople] = useState(2);
  const [selectedSplitItems, setSelectedSplitItems] = useState<Record<string, boolean>>({});
  const [customSplitAmount, setCustomSplitAmount] = useState<string>("");

  const getSplitAmount = () => {
    if (!order) return 0;
    const total = parseFloat(String(order.total || 0));
    if (splitTab === "equally") return total / Math.max(1, splitPeople);
    if (splitTab === "items") {
      let sum = 0;
      for (const item of order.items) {
        const key = item.item_id || item.name;
        if (selectedSplitItems[key]) sum += parseFloat(String(item.price || 0)) * item.qty;
      }
      return sum;
    }
    if (splitTab === "custom") {
      const val = parseFloat(customSplitAmount);
      return isNaN(val) ? 0 : val;
    }
    return total;
  };

  const [requestingBill, setRequestingBill] = useState(false);
  const handleRequestBill = async () => {
    try {
      setRequestingBill(true);
      const res = await fetch(apiUrl(`/api/orders/${orderId}/request-bill`), { method: "POST" });
      if (!res.ok) throw new Error("Failed to request bill");
      toast.success("Bill requested! Counter staff has been alerted.", { icon: "🧾" });
      refetch();
    } catch (e) {
      toast.error("Could not request bill. Please call the server directly.");
    } finally {
      setRequestingBill(false);
    }
  };

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
      {(restaurantConfig?.service_type === "self_service" || order.order_type === "takeaway" || order.order_type === "quick_order") && !isCancelled && order.payment_status !== "paid" && (
        <div className="bg-[#FAF5EC] border-2 border-brand-primary/40 rounded-3xl p-5 mb-6 text-center shadow-md">
          <div className="font-royal text-xs font-bold uppercase tracking-widest text-brand-primary flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-brand-secondary" /> Payment Verification Required Before Pickup
          </div>
          <p className="font-editorial italic text-xs text-[#1A1106]/80 mt-1.5 leading-relaxed">
            Please settle your bill at the counter (or via mobile tap-to-pay below) and present your <span className="font-bold font-royal text-brand-primary">Token #{order.token}</span> to collect your order when ready.
          </p>
        </div>
      )}

      {order.payment_status === "paid" ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 text-[#FAF5EC] rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-emerald-400/40 relative overflow-hidden text-center mb-6"
          data-testid="digital-exit-pass"
        >
          <div className="absolute top-0 right-0 bg-emerald-500/20 px-4 py-1.5 rounded-bl-2xl font-mono text-[10px] tracking-widest text-emerald-300 uppercase font-bold">
            VERIFIED GATE PASS
          </div>
          <div className="h-16 w-16 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="h-10 w-10 text-emerald-300 animate-pulse" />
          </div>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-wide text-white mb-1">
            ✅ DIGITAL EXIT PASS
          </h2>
          <p className="font-royal text-xs uppercase tracking-[0.25em] text-emerald-300 font-bold mb-6">
            Table Settled & Cleared to Leave
          </p>
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-sm mx-auto space-y-2 font-mono text-sm text-left">
            <div className="flex justify-between items-center text-emerald-200/80 text-xs">
              <span>Token #</span>
              <span className="font-bold text-white text-base">{order.token}</span>
            </div>
            {order.table_number != null && (
              <div className="flex justify-between items-center text-emerald-200/80 text-xs">
                <span>Table</span>
                <span className="font-bold text-white text-base">Table {order.table_number}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-emerald-200/80 text-xs">
              <span>Paid Amount</span>
              <span className="font-bold text-emerald-300 text-base">₹{order.total}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-200/80 text-xs border-t border-white/10 pt-2 mt-2">
              <span>Exit Gate Verification</span>
              <span className="font-black tracking-widest text-amber-300 text-sm bg-amber-500/20 px-2 py-0.5 rounded">
                {order.exit_code || `PASS-${order.id.slice(-6).toUpperCase()}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-emerald-200/80 text-xs">
              <span>Settled Timestamp</span>
              <span className="text-white/90 text-xs">
                {order.paid_at ? new Date(order.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
          <p className="font-editorial italic text-xs text-emerald-200/70 mt-6 max-w-md mx-auto">
            Please show this verified digital exit pass to our host or security guard upon departure. Thank you for dining with us!
          </p>
        </motion.div>
      ) : null}

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

      {order.bill_requested && order.payment_status !== "paid" && !isCancelled && (
        <div className="bg-amber-100 border-2 border-amber-400 text-amber-950 rounded-3xl p-5 mt-6 flex items-center gap-4 shadow-md animate-pulse">
          <ConciergeBell className="h-8 w-8 text-amber-700 shrink-0" />
          <div>
            <div className="font-royal font-bold text-sm sm:text-base uppercase tracking-wider">🔔 Bill Settlement Requested</div>
            <div className="font-editorial text-xs sm:text-sm text-amber-900 mt-1">Our counter staff has been alerted and is preparing your final bill. You may pay via UPI/Card or cash at the desk.</div>
          </div>
        </div>
      )}

      {order.payment_status !== "paid" && !isCancelled && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={order.bill_requested || requestingBill}
            onClick={handleRequestBill}
            style={{
              background: order.bill_requested ? "#D4AC0D" : "linear-gradient(135deg, #C0392B 0%, #A93226 100%)",
              color: "#FFFFFF",
              border: "none",
              boxShadow: "0 6px 16px rgba(192, 57, 43, 0.25)"
            }}
            className="w-full py-4 px-6 rounded-2xl font-royal uppercase tracking-widest text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-lg hover:opacity-90 active:scale-[0.98]"
          >
            <ConciergeBell className="h-4 w-4 animate-bounce" />
            {order.bill_requested ? "🔔 Bill Requested (Awaiting Staff)" : "🧾 Request Bill / Stop Dining"}
          </button>
          <button
            type="button"
            onClick={() => setShowSplitModal(true)}
            style={{
              background: "#FFFFFF",
              color: "#C0392B",
              border: "2px solid #C0392B",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
            }}
            className="w-full rounded-2xl py-4 px-6 font-royal tracking-wider uppercase text-xs font-bold transition flex items-center justify-center gap-2.5 hover:bg-red-50 active:scale-[0.98]"
          >
            <Scissors className="h-4 w-4" /> Bill & Split Calculator
          </button>
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
          style={{
            background: "#FFFFFF",
            color: "#8A6A1B",
            border: "2px solid #8A6A1B",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
          }}
          className="rounded-full px-6 py-3 font-royal text-xs tracking-widest uppercase font-bold hover:bg-amber-50 transition inline-flex items-center gap-2 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download Receipt
        </button>
      </div>

      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#FAF5EC] border border-[#E7DFCB] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-[#1A1106] max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowSplitModal(false)}
              className="absolute top-5 right-5 h-9 w-9 rounded-full bg-[#1A1106]/5 hover:bg-[#1A1106]/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-[#1A1106]" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#1A1106]">Bill & Split Calculator</h3>
                <p className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/60">Total Table Bill: {formatCurrency(parseFloat(String(order.total || 0)))}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-b border-[#E7DFCB] pb-4">
              <button
                type="button"
                onClick={() => setSplitTab("equally")}
                className={`py-2 px-3 rounded-xl text-xs font-royal uppercase tracking-wider transition ${splitTab === "equally" ? "bg-brand-primary text-[#FAF5EC] shadow" : "text-[#1A1106]/70 hover:text-brand-primary"}`}
              >
                Split Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitTab("items")}
                className={`py-2 px-3 rounded-xl text-xs font-royal uppercase tracking-wider transition ${splitTab === "items" ? "bg-brand-primary text-[#FAF5EC] shadow" : "text-[#1A1106]/70 hover:text-brand-primary"}`}
              >
                By Items
              </button>
              <button
                type="button"
                onClick={() => setSplitTab("custom")}
                className={`py-2 px-3 rounded-xl text-xs font-royal uppercase tracking-wider transition ${splitTab === "custom" ? "bg-brand-primary text-[#FAF5EC] shadow" : "text-[#1A1106]/70 hover:text-brand-primary"}`}
              >
                Custom Amount
              </button>
            </div>

            {splitTab === "equally" && (
              <div className="py-6 text-center">
                <p className="font-editorial italic text-sm text-[#1A1106]/70 mb-4">How many people are sharing this bill?</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSplitPeople(p => Math.max(1, p - 1))}
                    className="h-11 w-11 rounded-full bg-[#1A1106]/5 hover:bg-[#1A1106]/10 text-xl font-bold flex items-center justify-center transition"
                  >-</button>
                  <span className="font-editorial text-3xl font-bold text-brand-primary w-12">{splitPeople}</span>
                  <button
                    type="button"
                    onClick={() => setSplitPeople(p => p + 1)}
                    className="h-11 w-11 rounded-full bg-[#1A1106]/5 hover:bg-[#1A1106]/10 text-xl font-bold flex items-center justify-center transition"
                  >+</button>
                </div>
              </div>
            )}

            {splitTab === "items" && (
              <div className="py-4 space-y-2 max-h-56 overflow-y-auto pr-1">
                <p className="font-editorial italic text-xs text-[#1A1106]/70 mb-2">Select the dishes you ordered:</p>
                {order.items.map((item, idx) => {
                  const key = item.item_id || `${item.name}-${idx}`;
                  const isChecked = !!selectedSplitItems[key];
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedSplitItems(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${isChecked ? "border-brand-primary bg-brand-primary/5" : "border-[#E7DFCB] bg-white/50 hover:bg-white"}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <div>
                          <p className="font-medium text-xs text-[#1A1106]">{item.qty}× {item.name}</p>
                        </div>
                      </div>
                      <span className="font-royal text-xs font-semibold text-brand-primary">{formatCurrency(parseFloat(String(item.price || 0)) * item.qty)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {splitTab === "custom" && (
              <div className="py-6 text-center">
                <p className="font-editorial italic text-sm text-[#1A1106]/70 mb-3">Enter the exact amount you want to pay:</p>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-royal text-lg text-[#1A1106]/50">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={customSplitAmount}
                    onChange={(e) => setCustomSplitAmount(e.target.value)}
                    className="w-full bg-white border border-[#E7DFCB] rounded-2xl py-3 pl-10 pr-4 text-center font-royal text-2xl text-brand-primary focus:outline-none focus:border-brand-primary shadow-inner"
                  />
                </div>
              </div>
            )}

            <div className="bg-[#1A1106]/5 rounded-2xl p-5 text-center mt-2 border border-[#1A1106]/10">
              <p className="font-editorial italic text-xs text-[#1A1106]/60 uppercase tracking-widest">Your Share to Settle</p>
              <p className="font-royal text-3xl font-bold text-brand-primary mt-1">
                {formatCurrency(getSplitAmount())}
              </p>
              <p className="text-[10px] text-[#1A1106]/50 mt-1">
                Total Bill: {formatCurrency(parseFloat(String(order.total || 0)))}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {restaurantConfig?.upi_id && (
                <a
                  href={`upi://pay?pa=${restaurantConfig.upi_id}&pn=${encodeURIComponent(restaurantConfig.name || "")}&am=${getSplitAmount().toFixed(2)}&cu=INR`}
                  onClick={() => toast.success(`Opened UPI App for ${formatCurrency(getSplitAmount())}`)}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-[#FAF5EC] py-3.5 px-5 rounded-xl font-royal uppercase tracking-wider text-xs text-center transition shadow-lg flex items-center justify-center gap-2"
                >
                  Pay Your Share via UPI
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="py-3.5 px-5 rounded-xl border border-[#E7DFCB] font-royal uppercase tracking-wider text-xs font-semibold text-[#1A1106]/70 hover:bg-[#1A1106]/5 transition"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
