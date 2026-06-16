"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lock, CreditCard } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [name, setName] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [submitting, setSubmitting] = useState(false);
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      // 1) Payment intent (mock)
      const pay = await api<any>("/api/payment/intent", {
        method: "POST",
        body: JSON.stringify({ amount: total, method: "mock_card", card_last4: card.slice(-4) }),
      });
      if (pay.status !== "succeeded") throw new Error("Payment failed");
      // 2) Create order
      const order = await api<any>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: name,
          items: cart.items.map((i) => ({ item_id: i.item_id, name: i.name, price: i.price, qty: i.qty })),
          payment_method: "mock_card",
        }),
      });
      cart.clear();
      toast.success("Order placed!");
      router.push(`/customer/token/${order.id}`);
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
            <label className="block text-sm font-medium mb-1.5">Card number (mock — any value works)</label>
            <Input data-testid="checkout-card" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" className="font-mono" />
            <div className="mt-3 text-xs text-stone flex items-center gap-1.5"><Lock className="h-3 w-3" /> This is a mock checkout. No real charge is made.</div>
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
          <button onClick={submit} disabled={submitting} data-testid="place-order-btn" className="mt-6 w-full bg-clay text-white rounded-full px-6 py-3.5 font-medium hover:bg-clay-dark disabled:opacity-50 transition">
            {submitting ? "Processing…" : `Pay ${formatCurrency(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
