"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { Loader2, XCircle } from "lucide-react";

export default function PaymentReturn() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"checking" | "success" | "failed" | "expired">("checking");
  const [message, setMessage] = useState("Confirming your payment with Stripe…");

  useEffect(() => {
    if (!sessionId) { setStatus("failed"); setMessage("Missing session id."); return; }
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await api<{ payment_status: string; status: string; order_id?: string }>(
          `/api/payment/checkout/status/${sessionId}`
        );
        if (res.payment_status === "paid" && res.order_id) {
          cart.clear();
          setStatus("success");
          router.replace(`/customer/token/${res.order_id}`);
          return;
        }
        if (res.status === "expired") { setStatus("expired"); setMessage("Payment session expired."); return; }
        if (attempts < 8) setTimeout(poll, 1500);
        else { setStatus("failed"); setMessage("Could not confirm payment. Please contact support."); }
      } catch (e: any) {
        if (attempts < 8) setTimeout(poll, 1500);
        else { setStatus("failed"); setMessage(e.message || "Payment check failed"); }
      }
    };
    poll();
  }, [sessionId, router, cart]);

  return (
    <div className="px-6 py-24 max-w-md mx-auto text-center" data-testid="payment-return">
      {status === "checking" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-clay mx-auto mb-4" />
          <h1 className="font-heading text-3xl tracking-tight">{message}</h1>
          <p className="text-stone mt-2 text-sm">Hang tight — this takes a few seconds.</p>
        </>
      )}
      {(status === "failed" || status === "expired") && (
        <>
          <XCircle className="h-10 w-10 text-alert mx-auto mb-4" />
          <h1 className="font-heading text-3xl tracking-tight">Payment didn't go through</h1>
          <p className="text-stone mt-2 text-sm">{message}</p>
          <button onClick={() => router.push("/customer/cart")} className="mt-6 bg-ink text-cream rounded-full px-6 py-3 font-medium">
            Back to cart
          </button>
        </>
      )}
    </div>
  );
}
