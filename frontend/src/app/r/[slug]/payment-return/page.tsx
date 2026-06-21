"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams , useParams} from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { Loader2, XCircle } from "lucide-react";

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 8;

function PaymentReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const pathParams = useParams();
  const slug = pathParams?.slug as string;
  const cart = useCart();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"checking" | "success" | "failed" | "expired">("checking");
  const [message, setMessage] = useState("Confirming your payment with Stripe…");
  const cartRef = useRef(cart);
  cartRef.current = cart;          // always have latest cart without re-running effect

  useEffect(() => {
    if (!sessionId) { setStatus("failed"); setMessage("Missing session id."); return; }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await api<{ payment_status: string; status: string; order_id?: string }>(
          `/api/payment/checkout/status/${sessionId}`
        );
        if (cancelled) return;
        if (res.payment_status === "paid" && res.order_id) {
          cartRef.current.clear();
          setStatus("success");
          router.replace(`/r/${slug}/token/${res.order_id}`);
          return;
        }
        if (res.status === "expired") {
          setStatus("expired"); setMessage("Payment session expired."); return;
        }
        if (attempts < MAX_POLL_ATTEMPTS) timer = setTimeout(poll, POLL_INTERVAL_MS);
        else { setStatus("failed"); setMessage("Could not confirm payment. Please contact support."); }
      } catch (err: any) {
        if (cancelled) return;
        console.warn("[payment-return] status poll failed:", err);
        if (attempts < MAX_POLL_ATTEMPTS) timer = setTimeout(poll, POLL_INTERVAL_MS);
        else { setStatus("failed"); setMessage(err.message || "Payment check failed"); }
      }
    };
    poll();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId, router]);

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
          <button onClick={() => router.push(`/r/${slug}/cart`)} className="mt-6 bg-ink text-cream rounded-full px-6 py-3 font-medium">
            Back to cart
          </button>
        </>
      )}
    </div>
  );
}

export default function PaymentReturn() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <Suspense fallback={
      <div className="px-6 py-24 max-w-md mx-auto text-center">
        <Loader2 className="h-10 w-10 animate-spin text-clay mx-auto mb-4" />
        <h1 className="font-heading text-3xl tracking-tight">Loading payment status…</h1>
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}
