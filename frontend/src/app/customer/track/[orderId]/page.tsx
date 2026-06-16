"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { fmtTime } from "@/lib/utils";
import { CheckCircle2, ChefHat, ConciergeBell, ClipboardCheck, Clock, Bell, BellRing, BellOff } from "lucide-react";
import type { Order } from "@/types";
import { useEffect, useRef, useState } from "react";
import { playChime, ensureNotificationPermission, notify, isPushSupported, subscribeToOrderPush } from "@/lib/notify";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STAGES: Array<{ key: Order["status"]; label: string; line: string; icon: React.ElementType }> = [
  { key: "confirmed", label: "Confirmed", line: "The khansama has your scroll.", icon: ClipboardCheck },
  { key: "preparing", label: "On the dum", line: "Spices waltzing in a copper handi.", icon: ChefHat },
  { key: "ready", label: "Ready", line: "Awaiting you at the counter.", icon: ConciergeBell },
  { key: "served", label: "Served", line: "Khaana khaiye — enjoy your mehfil.", icon: CheckCircle2 },
];

export default function TrackPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: () => api<Order>(`/api/orders/${orderId}`),
    refetchInterval: 3000,
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

  if (!order) {
    return <div className="py-32 text-center font-editorial italic text-[#1A1106]/60" data-testid="track-loading">Finding your mehfil…</div>;
  }

  const currentIdx = STAGES.findIndex((s) => s.key === order.status);
  const idx = currentIdx === -1 ? 0 : currentIdx;
  const isCancelled = order.status === "cancelled";

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12" data-testid="track-page">
      <div className="text-center mb-8">
        <div className="mehfil-divider mb-3 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Live tracking</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-[#8A1A2A] tracking-wide">
          Token <span className="font-editorial italic mehfil-gold-gradient">{order.token}</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-2">Updates every three heartbeats.</p>
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
        <div data-testid="track-push-on" className="mx-auto w-fit mb-6 bg-[#FAF5EC] border border-[#C9A348]/40 rounded-full px-4 py-2 text-[10px] font-royal tracking-[0.2em] uppercase text-[#8A1A2A] inline-flex items-center gap-2">
          <BellRing className="h-3.5 w-3.5 text-[#C9A348]" /> You&apos;ll be pinged on every stage
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
                      done ? "mehfil-royal-bg text-[#C9A348] shadow-lg" : "bg-[#F3EBD8] text-[#1A1106]/40"
                    } ${active ? "ring-4 ring-[#C9A348]/40 mehfil-glow" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  <div className="flex-1">
                    <div className={`font-royal tracking-wide ${done ? "text-[#8A1A2A] text-lg" : "text-[#1A1106]/50 text-base"}`}>
                      {s.label}
                    </div>
                    {active && <div className="font-editorial italic text-xs text-[#8A1A2A] mt-0.5">{s.line}</div>}
                    {done && !active && <div className="font-editorial italic text-[11px] text-[#1A1106]/50 mt-0.5">Complete</div>}
                  </div>
                  {done && <CheckCircle2 className="h-5 w-5 text-[#C9A348]" />}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`absolute left-6 top-[3.6rem] h-3 w-px ${done ? "bg-[#C9A348]" : "bg-[#1A1106]/15"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isCancelled ? (
        <div className="mehfil-card rounded-2xl p-6 flex items-center gap-4 border-[#8A1A2A]/40" data-testid="track-cancelled">
          <BellOff className="h-6 w-6 text-[#8A1A2A]" />
          <div>
            <div className="font-royal text-[#8A1A2A]">Order cancelled</div>
            <div className="font-editorial italic text-xs text-[#1A1106]/60">Please reach the counter for assistance.</div>
          </div>
        </div>
      ) : (
        <div className="mehfil-card rounded-2xl p-6 flex items-center gap-4">
          <Clock className="h-6 w-6 text-[#8A1A2A]" />
          <div>
            <div className="font-royal tracking-wider uppercase text-[10px] text-[#1A1106]/60">Ready by</div>
            <div className="font-royal text-xl text-[#8A1A2A]" data-testid="track-eta">{fmtTime(order.estimated_ready_at)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
