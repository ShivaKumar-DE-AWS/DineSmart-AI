"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lock, CreditCard, ExternalLink } from "lucide-react";

function renderPayLabel(submitting: boolean, stripeEnabled: boolean | null, total: number): string {
  if (submitting) return "Processing…";
  const amount = formatCurrency(total);
  if (stripeEnabled) return `Pay ${amount} with Stripe`;
  return `Pay ${amount}`;
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
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (cart.items.length === 0) { toast.error("Your cart is empty"); return; }
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
        // Persist draft customer name for cart-clear after return
        sessionStorage.setItem("sd_pending_cart_clear", "1");
        window.location.href = res.url;  // redirect to Stripe Checkout
      } else if (res.order_id) {
        // Mock path
        cart.clear();
        toast.success("Order placed!");
        router.push(`/customer/token/${res.order_id}`);
      } else {
        throw new Error("Unexpected payment response");
      }
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-5xl mx-auto">
      <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-10">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-bone rounded-2xl p-6">
            <h2 className="font-heading text-xl mb-4">Your details</h2>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <Input data-testid="checkout-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Sharma" />
          </section>
          <section className="bg-white border border-bone rounded-2xl p-6">
            <h2 className="font-heading text-xl mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment</h2>
            {stripeEnabled === true && (
              <div className="text-sm text-stone leading-relaxed">
                <p>You'll be redirected to Stripe to complete payment securely. After confirmation, you'll be returned with your token.</p>
                <p className="mt-2 text-xs text-stone/80">Use Stripe test card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC.</p>
              </div>
            )}
            {stripeEnabled === false && (
              <div className="text-sm text-stone">Mock payment — instant confirmation. No real charge.</div>
            )}
            <div className="mt-3 text-xs text-stone flex items-center gap-1.5"><Lock className="h-3 w-3" /> Payments are processed by Stripe in test mode.</div>
          </section>
        </div>

        <aside className="bg-white border border-bone rounded-2xl p-6 h-fit sticky top-24">
          <h2 className="font-heading text-xl mb-4">Order summary</h2>
          <div className="space-y-1.5 text-sm mb-4">
            {cart.items.map((i) => (
              <div key={i.item_id} className="flex justify-between">
                <span className="text-stone">{i.qty}× {i.name}</span>
                <span>{formatCurrency(i.qty * i.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-bone my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-stone">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-stone">Tax</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between font-heading text-lg font-semibold mt-3"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
          <button onClick={submit} disabled={submitting || stripeEnabled === null} data-testid="place-order-btn" className="mt-6 w-full bg-clay text-white rounded-full px-6 py-3.5 font-medium hover:bg-clay-dark disabled:opacity-50 transition inline-flex items-center justify-center gap-2">
            {stripeEnabled && <ExternalLink className="h-4 w-4" />}
            {renderPayLabel(submitting, stripeEnabled, total)}
          </button>
        </aside>
      </div>
    </div>
  );
}
