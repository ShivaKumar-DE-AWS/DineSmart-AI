"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lock, CreditCard, ExternalLink, ArrowLeft, ScrollText, User2 } from "lucide-react";

function renderPayLabel(submitting: boolean, stripeEnabled: boolean | null, total: number): string {
  if (submitting) return "Sending to the khansama…";
  const amount = formatCurrency(total);
  if (stripeEnabled) return `Pay ${amount} with Stripe`;
  return `Confirm & Pay ${amount}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null);
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  useEffect(() => {
    api<{ stripe_enabled: boolean }>("/api/payment/config")
      .then((c) => setStripeEnabled(c.stripe_enabled))
      .catch(() => setStripeEnabled(false));
  }, []);

  const submit = async () => {
    if (!name.trim()) { toast.error("Please share your name so we can address you properly"); return; }
    if (cart.items.length === 0) { toast.error("Your thali is empty"); return; }
    setSubmitting(true);
    try {
      const payload = {
        order_draft: {
          customer_name: name,
          items: cart.items.map((i) => ({ item_id: i.item_id, name: i.name, price: i.price, qty: i.qty })),
          payment_method: "stripe",
        },
        origin_url: window.location.origin,
      };
      const res = await api<{ mode: string; url?: string; session_id?: string; order_id?: string }>(
        "/api/payment/checkout/session",
        { method: "POST", body: JSON.stringify(payload) }
      );

      if (res.mode === "stripe" && res.url) {
        sessionStorage.setItem("sd_pending_cart_clear", "1");
        window.location.href = res.url;
      } else if (res.order_id) {
        cart.clear();
        toast.success("Your order is on its way to the kitchen");
        router.push(`/customer/token/${res.order_id}`);
      } else {
        throw new Error("Unexpected payment response");
      }
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12" data-testid="checkout-page">
      <Link href="/customer/cart" className="inline-flex items-center gap-1 text-[#8A1A2A] hover:text-[#C9A348] font-royal tracking-wider uppercase text-[11px] mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to thali
      </Link>
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Final step</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-[#8A1A2A] tracking-wide">
          Seal the <span className="font-editorial italic mehfil-gold-gradient">mehfil</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">A name, a payment, and the feast is yours.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-details">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">Your details</span></div>
            <label className="block">
              <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your name</span>
              <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                <User2 className="h-4 w-4 text-[#8A1A2A]" />
                <input
                  data-testid="checkout-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                />
              </div>
            </label>
          </section>

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-payment">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Payment</span></div>
            {stripeEnabled === true && (
              <div className="text-sm text-[#1A1106]/75 leading-relaxed font-editorial">
                <p>You&apos;ll be redirected to Stripe to settle the bill securely. We&apos;ll bring you back with your token in hand.</p>
                <p className="mt-2 text-xs text-[#1A1106]/60">Test card: <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC.</p>
              </div>
            )}
            {stripeEnabled === false && (
              <div className="text-sm text-[#1A1106]/75 font-editorial italic">Mock payment — instant confirmation, no real charge.</div>
            )}
            <div className="mt-3 text-[11px] text-[#1A1106]/55 flex items-center gap-1.5 font-royal tracking-wider uppercase"><Lock className="h-3 w-3" /> Secured by Stripe</div>
          </section>
        </div>

        <aside className="mehfil-card rounded-2xl p-6 h-fit lg:sticky lg:top-24" data-testid="checkout-summary">
          <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ScrollText className="h-3 w-3" /> The bill</span></div>
          <div className="space-y-1.5 text-sm mb-4 max-h-60 overflow-y-auto pr-1">
            {cart.items.map((i) => (
              <div key={i.item_id} className="flex justify-between gap-3">
                <span className="font-editorial text-[#1A1106]/75 truncate">{i.qty}× {i.name}</span>
                <span className="font-royal text-[#8A1A2A] shrink-0">{formatCurrency(i.qty * i.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#C9A348]/30 my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-[#8A1A2A]">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax</span><span className="font-royal text-[#8A1A2A]">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between items-end mt-3">
              <span className="font-royal tracking-wider uppercase text-xs text-[#8A1A2A]">Total</span>
              <span className="font-royal text-2xl text-[#8A1A2A]" data-testid="checkout-total">{formatCurrency(total)}</span>
            </div>
          </div>
          <button onClick={submit} disabled={submitting || stripeEnabled === null} data-testid="place-order-btn" className="mt-6 w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {stripeEnabled && <ExternalLink className="h-4 w-4" />}
            {renderPayLabel(submitting, stripeEnabled, total)}
          </button>
        </aside>
      </div>
    </div>
  );
}
