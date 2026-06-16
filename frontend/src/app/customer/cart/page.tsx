"use client";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Trash2, Plus, Minus } from "lucide-react";

export default function CartPage() {
  const cart = useCart();
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  if (cart.items.length === 0) {
    return (
      <div className="px-6 md:px-12 lg:px-20 py-24 max-w-3xl mx-auto text-center">
        <h1 className="font-heading text-4xl mb-4">Your cart is empty</h1>
        <p className="text-stone mb-8">Add a few dishes from the menu to begin.</p>
        <Link href="/customer/menu" data-testid="cart-go-menu" className="inline-flex items-center gap-2 bg-ink text-cream rounded-full px-7 py-3.5 text-sm font-medium hover:bg-ink/85 transition">
          Browse menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-5xl mx-auto">
      <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-10" data-testid="cart-title">Your cart</h1>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-3" data-testid="cart-items">
          {cart.items.map((i) => (
            <div key={i.item_id} className="flex items-center gap-4 bg-white border border-bone rounded-2xl p-4" data-testid={`cart-row-${i.item_id}`}>
              <div className="flex-1">
                <div className="font-heading font-semibold">{i.name}</div>
                <div className="text-sm text-stone">{formatCurrency(i.price)} each</div>
              </div>
              <div className="flex items-center gap-1 bg-cream rounded-full border border-bone p-1">
                <button onClick={() => cart.setQty(i.item_id, i.qty - 1)} data-testid={`cart-dec-${i.item_id}`} className="h-8 w-8 rounded-full hover:bg-bone flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                <span className="px-2 font-mono w-6 text-center font-semibold">{i.qty}</span>
                <button onClick={() => cart.setQty(i.item_id, i.qty + 1)} data-testid={`cart-inc-${i.item_id}`} className="h-8 w-8 rounded-full hover:bg-bone flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="font-heading font-semibold w-24 text-right">{formatCurrency(i.price * i.qty)}</div>
              <button onClick={() => cart.remove(i.item_id)} data-testid={`cart-remove-${i.item_id}`} className="text-stone hover:text-alert p-2"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <aside className="bg-white border border-bone rounded-2xl p-6 h-fit sticky top-24" data-testid="cart-summary">
          <h2 className="font-heading text-xl mb-4">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone">Subtotal</span><span data-testid="summary-subtotal">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-stone">Tax (5%)</span><span data-testid="summary-tax">{formatCurrency(tax)}</span></div>
            <div className="border-t border-bone my-3" />
            <div className="flex justify-between font-heading text-lg font-semibold"><span>Total</span><span data-testid="summary-total">{formatCurrency(total)}</span></div>
          </div>
          <Link href="/customer/checkout" data-testid="cart-checkout-btn" className="mt-6 w-full bg-clay text-white rounded-full px-6 py-3 font-medium hover:bg-clay-dark transition inline-flex items-center justify-center gap-2">
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
