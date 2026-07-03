"use client";
import { useState, useEffect } from "react";
import { useRouter , useParams} from "next/navigation";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { Lock, CreditCard, ExternalLink, ArrowLeft, ScrollText, User2, ChefHat, Plus, Minus, Phone, Gift, Sparkles, MapPin, Scissors, Check, X, Share2, Users } from "lucide-react";
import { sendAIWaiterEvent, showAIUpsellSheet } from "@/lib/ai_waiter_client";

interface CustomerProfile {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  points: number;
  lifetime_spend: number;
  orders_count: number;
}

function renderPayLabel(submitting: boolean, stripeEnabled: boolean | null, total: number): string {
  if (submitting) return "Sending to the khansama…";
  const amount = formatCurrency(total);
  if (stripeEnabled) return `Pay ${amount} with Stripe`;
  return `Confirm & Pay ${amount}`;
}

// Context-aware cooking chips based on item category
const CHIPS_BY_TYPE: Record<string, string[]> = {
  "meat": ["Less spicy", "Extra spicy", "Double masala", "No onion", "No garlic", "Leg piece", "Chest piece", "Less oil", "Boneless", "Extra raita", "Serve hot"],
  "veg": ["Less spicy", "Extra spicy", "No onion", "No garlic", "Less oil", "Less salt", "Extra raita", "Serve hot"],
  "bread": ["Extra butter", "No butter", "Well done", "Soft"],
  "sweets": ["Less sweet", "Extra cream", "No nuts", "Warm", "Chilled", "Extra saffron"],
  "beverages": ["Less sugar", "No sugar", "Extra ice", "No ice", "Warm", "Chilled"],
  "rice_noodles": ["Less spicy", "Extra spicy", "No onion", "Less oil", "Extra saucy", "Serve hot"],
};
function getChipsForItem(name: string, category?: string): string[] {
  const cat = (category || "").toLowerCase();
  if (CHIPS_BY_TYPE[cat]) return CHIPS_BY_TYPE[cat];
  const n = name.toLowerCase();
  if (n.includes("chicken") || n.includes("mutton") || n.includes("fish") || n.includes("kebab") || n.includes("tikka") || n.includes("biryani")) return CHIPS_BY_TYPE["meat"];
  if (n.includes("paneer") || n.includes("dal") || n.includes("sabzi") || n.includes("palak") || n.includes("chana")) return CHIPS_BY_TYPE["veg"];
  if (n.includes("naan") || n.includes("roti") || n.includes("kulcha") || n.includes("paratha")) return CHIPS_BY_TYPE["bread"];
  if (n.includes("lassi") || n.includes("chai") || n.includes("coffee") || n.includes("shake") || n.includes("juice") || n.includes("mojito")) return CHIPS_BY_TYPE["beverages"];
  if (n.includes("kheer") || n.includes("jamun") || n.includes("halwa") || n.includes("ice cream") || n.includes("kulfi")) return CHIPS_BY_TYPE["sweets"];
  if (n.includes("rice") || n.includes("pulao") || n.includes("noodle") || n.includes("hakka")) return CHIPS_BY_TYPE["rice_noodles"];
  return ["Less spicy", "Extra spicy", "Serve hot", "No onion"];
}


const COURSES = ["Auto (Natural pace)", "Starter", "Main Course", "Dessert", "All together"];

export default function CheckoutPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();

  const router = useRouter();
  const cart = useCart();
  const table = useTable((s) => s.session);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card_machine">("cash");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  // Split Bill State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitTab, setSplitTab] = useState<"equally" | "items" | "custom">("equally");
  const [splitPeople, setSplitPeople] = useState(2);
  const [selectedSplitItems, setSelectedSplitItems] = useState<Record<string, boolean>>({});
  const [customSplitAmount, setCustomSplitAmount] = useState<string>("");

  const getSplitAmount = () => {
    if (splitTab === "equally") {
      return total / Math.max(1, splitPeople);
    }
    if (splitTab === "items") {
      let itemsSubtotal = 0;
      cart.items.forEach(item => {
        if (selectedSplitItems[item.item_id]) {
          itemsSubtotal += item.price * item.qty;
        }
      });
      const proportion = subtotal > 0 ? itemsSubtotal / subtotal : 0;
      return itemsSubtotal + (tax * proportion);
    }
    if (splitTab === "custom") {
      const val = parseFloat(customSplitAmount);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  };

  useEffect(() => {
    api<{ stripe_enabled: boolean }>("/api/payment/config")
      .then((c) => setStripeEnabled(c.stripe_enabled))
      .catch(() => setStripeEnabled(false));
  }, []);

  // Lookup customer by phone after a small debounce
  useEffect(() => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setProfile(null); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await api<{ customer: CustomerProfile | null }>("/api/customers/lookup", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        if (res.customer) {
          setProfile(res.customer);
          if (!name.trim()) setName(res.customer.name);
        } else {
          setProfile(null);
        }
      } catch (err) {
        // Lookup is best-effort — never block checkout. Log so we notice if the endpoint is down.
        console.warn("[checkout] customer lookup failed:", err);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [phone, name]);

  const toggleChip = (uid: string, chip: string) => {
    const line = cart.items.find((i) => (i.cart_item_id || i.item_id) === uid || i.item_id === uid);
    if (!line) return;
    const current = (line.notes || "").trim();
    const parts = current ? current.split(/,\s*/).filter(Boolean) : [];
    const idx = parts.findIndex((p) => p.toLowerCase() === chip.toLowerCase());
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(chip);
    cart.setNote(line.cart_item_id || line.item_id, parts.join(", "));
  };

  /**
   * AI Waiter CHECKOUT interceptor.
   * Fires the CHECKOUT event to get upsell suggestions, shows the Bottom Sheet
   * to the user, then calls submit() when the user proceeds.
   * If AI Waiter fails or times out, falls through directly to submit().
   */
  const handleCheckout = async () => {
    const restId = restaurantConfig?.id;
    if (!restId || cart.items.length === 0) { submit(); return; }

    setSubmitting(true);
    try {
      const aiRes = await sendAIWaiterEvent(
        {
          event_type: "CHECKOUT",
          restaurant_id: restId,
          cart_state: cart.items.map(ci => ({
            item_id: ci.item_id,
            name: ci.name,
            price: ci.price,
            qty: ci.qty,
            category: (ci as any).category ?? undefined,
          })),
        },
        // addToCart callback: add upsell item to cart and then proceed
        (suggestedItem) => {
          cart.add({
            id: suggestedItem.item_id,
            item_id: suggestedItem.item_id,
            name: suggestedItem.name,
            price: suggestedItem.price,
            qty: 1,
            description: "",
            category: "",
            image_url: "",
            available: true,
            prep_time_min: 10,
            tags: [],
          } as any);
          toast.success(`${suggestedItem.name} added to your order!`);
          submit();
        },
        // proceedToPay callback: user skips upsell → place order directly
        () => { submit(); }
      );
      // If AI returned no suggestions or a non-UPSELL response, proceed immediately
      if (!aiRes || aiRes.action_type !== "UPSELL_OFFER" || aiRes.suggested_items.length === 0) {
        submit();
      } else {
        // Bottom Sheet is now open; stop button spinner while user decides
        setSubmitting(false);
      }
    } catch {
      // AI Waiter failure → fall through to order placement without interruption
      submit();
    }
  };

  const submit = async () => {
    const finalName = table?.customer_name || profile?.name || name.trim() || "Guest";
    if (!finalName) { toast.error("Please share your name — every great meal starts with a name."); return; }
    const currentItems = useCart.getState().items;
    if (currentItems.length === 0) { toast.error("Your thali is empty"); return; }
    setSubmitting(true);
    try {
      const restId = restaurantConfig?.id || "";
      if (!restId) { toast.error("Restaurant not found. Please try again."); setSubmitting(false); return; }

      const payload = {
        restaurant_id: restId,
        order_type: table?.id ? "dine_in" : "takeaway",
        customer_name: finalName,
        customer_phone: table?.customer_phone || profile?.phone || phone.trim() || undefined,
        items: currentItems.map((i) => {
          const courseText = i.course && i.course !== "Auto (Natural pace)" ? `[Serve: ${i.course}] ` : "";
          const finalNotes = `${courseText}${i.notes?.trim() || ""}`.trim();
          return {
            item_id: i.item_id, name: i.name, price: i.price, qty: i.qty,
            notes: finalNotes || undefined,
          };
        }),
        payment_method: paymentMethod,
        notes: generalNotes.trim() || undefined,
        table_session_id: table?.id || undefined,
        table_number: table?.table_number || undefined,
        is_ai: cart.isAi,
      };
      const res = await api<{ order_id: string; token: string }>("/api/orders", { method: "POST", body: JSON.stringify(payload) });
      cart.clear();
      toast.success("Your order is on its way to the kitchen");
      router.push(`/r/${slug}/token/${res.order_id}`);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12" data-testid="checkout-page">
      <Link href={`/r/${slug}/cart`} className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-secondary font-royal tracking-wider uppercase text-[11px] mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to thali
      </Link>
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Final step</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          Seal the <span className="font-editorial italic mehfil-gold-gradient">{restaurantConfig?.name || "order"}</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">A name, your preferences, and the feast is yours.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-cooking-instructions">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ChefHat className="h-3 w-3" /> Cooking instructions</span></div>
            <p className="font-editorial italic text-xs text-[#1A1106]/65 mb-5 leading-relaxed">
              Tell our khansama exactly how each dish should arrive. Tap a chip or type your own request — &ldquo;leg piece, less spicy, no garam masala.&rdquo;
            </p>
            <div className="space-y-5">
              {cart.items.map((line) => {
                const uid = line.cart_item_id || line.item_id;
                const selected = (line.notes || "").split(/,\s*/).map((s) => s.toLowerCase()).filter(Boolean);
                return (
                  <div key={uid} className="border border-brand-secondary/20 rounded-xl p-4 bg-white/60" data-testid={`cook-card-${uid}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-brand-primary text-[#FAF5EC] font-royal text-xs flex items-center justify-center">{line.qty}</span>
                        <div className="font-royal text-[15px] text-brand-primary leading-tight">{line.name}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end sm:justify-start mt-2 sm:mt-0">
                        <select
                          className="bg-[#FAF5EC] border border-brand-secondary/30 rounded-full px-2 py-1.5 text-[9px] sm:text-[10px] font-royal tracking-[0.1em] uppercase outline-none text-brand-primary focus:border-brand-primary cursor-pointer"
                          value={line.course || "Auto (Natural pace)"}
                          onChange={(e) => cart.setCourse(uid, e.target.value)}
                        >
                          {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center gap-1 bg-[#FAF5EC] rounded-full p-0.5 border border-brand-secondary/30 shrink-0">
                          <button data-testid={`cook-dec-${uid}`} onClick={() => cart.setQty(uid, line.qty - 1)} className="h-7 w-7 rounded-full hover:bg-brand-primary hover:text-[#FAF5EC] flex items-center justify-center transition-colors"><Minus className="h-3 w-3" /></button>
                          <span className="px-1 w-5 text-center font-royal text-xs">{line.qty}</span>
                          <button data-testid={`cook-inc-${uid}`} onClick={() => cart.setQty(uid, line.qty + 1)} className="h-7 w-7 rounded-full hover:bg-brand-primary hover:text-[#FAF5EC] flex items-center justify-center transition-colors"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3" data-testid={`cook-chips-${uid}`}>
                      {getChipsForItem(line.name, line.category).map((c) => {
                        const active = selected.includes(c.toLowerCase());
                        return (
                          <button
                            key={c}
                            type="button"
                            data-testid={`cook-chip-${uid}-${c.replace(/\W+/g, "-").toLowerCase()}`}
                            onClick={() => toggleChip(uid, c)}
                            className={`rounded-full px-3 py-1 text-[10px] font-royal tracking-[0.15em] uppercase border transition ${
                              active
                                ? "bg-brand-primary text-[#FAF5EC] border-brand-primary shadow"
                                : "bg-white text-brand-primary border-brand-secondary/40 hover:border-brand-primary"
                            }`}
                          >
                            {active ? "✓ " : "+ "}{c}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      data-testid={`cook-note-${uid}`}
                      value={line.notes || ""}
                      onChange={(e) => cart.setNote(uid, e.target.value)}
                      placeholder="Type extra preferences — e.g. extra crispy, family-size portion…"
                      className="w-full bg-white border border-brand-secondary/30 rounded-full px-4 py-2 text-xs outline-none font-editorial italic focus:border-brand-primary"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">A note for the whole order (optional)</span>
                <textarea
                  data-testid="checkout-general-notes"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Birthday — please send out the meetha last with a candle. Allergic to peanuts."
                  rows={2}
                  className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-xl px-4 py-3 text-sm outline-none font-editorial italic resize-none focus:border-brand-primary"
                />
              </label>
            </div>
          </section>

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-payment">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Payment</span></div>
            
            <p className="font-editorial italic text-xs text-[#1A1106]/65 mb-4 leading-relaxed">
              How would you like to settle the bill?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  paymentMethod === "cash" 
                  ? "bg-brand-primary/5 border-brand-primary text-brand-primary shadow-sm" 
                  : "bg-white border-brand-secondary/30 text-[#1A1106]/70 hover:border-brand-primary/50"
                }`}
              >
                <div className="font-royal text-sm uppercase tracking-widest">Cash</div>
                <div className="font-editorial italic text-[10px] opacity-80 text-center">At counter</div>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  paymentMethod === "upi" 
                  ? "bg-brand-primary/5 border-brand-primary text-brand-primary shadow-sm" 
                  : "bg-white border-brand-secondary/30 text-[#1A1106]/70 hover:border-brand-primary/50"
                }`}
              >
                <div className="font-royal text-sm uppercase tracking-widest">UPI QR</div>
                <div className="font-editorial italic text-[10px] opacity-80 text-center">Scan & pay</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card_machine")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  paymentMethod === "card_machine" 
                  ? "bg-brand-primary/5 border-brand-primary text-brand-primary shadow-sm" 
                  : "bg-white border-brand-secondary/30 text-[#1A1106]/70 hover:border-brand-primary/50"
                }`}
              >
                <div className="font-royal text-sm uppercase tracking-widest">Card</div>
                <div className="font-editorial italic text-[10px] opacity-80 text-center">Swipe at table</div>
              </button>
            </div>
          </section>
        </div>

        <aside className="mehfil-card rounded-2xl p-6 h-fit lg:sticky lg:top-24" data-testid="checkout-summary">
          <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ScrollText className="h-3 w-3" /> The bill</span></div>
          {table && (
            <div className="mb-4 flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-3 py-2" data-testid="checkout-table-badge">
              <MapPin className="h-4 w-4 text-brand-primary" />
              <div className="font-royal tracking-wider uppercase text-[11px] text-brand-primary">Dining at Table {table.table_number}</div>
            </div>
          )}
          <div className="space-y-2.5 text-sm mb-4 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((i) => (
              <div key={i.item_id} className="border-b border-brand-secondary/15 pb-2 last:border-0">
                <div className="flex justify-between gap-3">
                  <span className="font-editorial text-[#1A1106]/85 truncate">{i.qty}× {i.name}</span>
                  <span className="font-royal text-brand-primary shrink-0">{formatCurrency(i.qty * i.price)}</span>
                </div>
                {i.notes && (
                  <div className="font-editorial italic text-[10px] text-[#8A6A1B] mt-0.5 truncate" data-testid={`summary-notes-${i.item_id}`}>↳ {i.notes}</div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-brand-primary">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax</span><span className="font-royal text-brand-primary">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between items-end mt-3">
              <span className="font-royal tracking-wider uppercase text-xs text-brand-primary">Total</span>
              <span className="font-royal text-2xl text-brand-primary" data-testid="checkout-total">{formatCurrency(total)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={submitting} data-testid="place-order-btn" className="mt-6 w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {submitting ? "Sending to the khansama…" : `Confirm Order — ${formatCurrency(total)}`}
          </button>
        </aside>
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
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#1A1106]">Split the Bill</h3>
                <p className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/60">Total Table Bill: {formatCurrency(total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#E7DFCB]/40 p-1.5 rounded-2xl my-4">
              <button
                type="button"
                onClick={() => setSplitTab("equally")}
                className={`py-2 px-3 rounded-xl text-xs font-royal uppercase tracking-wider transition ${splitTab === "equally" ? "bg-brand-primary text-[#FAF5EC] shadow" : "text-[#1A1106]/70 hover:text-brand-primary"}`}
              >
                Equally
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
                Custom
              </button>
            </div>

            {splitTab === "equally" && (
              <div className="py-4 space-y-4 text-center">
                <p className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/70">How many people are sharing the bill?</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSplitPeople(p => Math.max(1, p - 1))}
                    className="h-10 w-10 rounded-full border border-brand-primary text-brand-primary flex items-center justify-center font-bold text-lg hover:bg-brand-primary hover:text-white transition"
                  >
                    -
                  </button>
                  <span className="font-editorial text-3xl font-bold text-brand-primary w-12">{splitPeople}</span>
                  <button
                    type="button"
                    onClick={() => setSplitPeople(p => p + 1)}
                    className="h-10 w-10 rounded-full border border-brand-primary text-brand-primary flex items-center justify-center font-bold text-lg hover:bg-brand-primary hover:text-white transition"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {splitTab === "items" && (
              <div className="py-2 space-y-2 max-h-52 overflow-y-auto pr-1 my-2 border-y border-[#E7DFCB]">
                <p className="text-[11px] font-royal uppercase tracking-wider text-[#8A6A1B] mb-2">Check the dishes you ordered:</p>
                {cart.items.map((item) => {
                  const isChecked = !!selectedSplitItems[item.item_id];
                  return (
                    <div
                      key={item.item_id}
                      onClick={() => setSelectedSplitItems(prev => ({ ...prev, [item.item_id]: !prev[item.item_id] }))}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${isChecked ? "bg-brand-primary/10 border-brand-primary" : "bg-white border-[#E7DFCB]"}`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border text-xs ${isChecked ? "bg-brand-primary text-white border-brand-primary" : "border-[#E7DFCB] bg-white"}`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-xs font-editorial text-[#1A1106] truncate">{item.qty}× {item.name}</span>
                      </div>
                      <span className="text-xs font-royal font-semibold text-brand-primary shrink-0">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {splitTab === "custom" && (
              <div className="py-4 space-y-2">
                <label className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/70 block">
                  Enter Your Custom Share Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-royal font-bold text-brand-primary">₹</span>
                  <input
                    type="number"
                    value={customSplitAmount}
                    onChange={(e) => setCustomSplitAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#E7DFCB] rounded-xl pl-8 pr-4 py-3 text-lg font-royal text-[#1A1106] focus:outline-none focus:border-brand-primary transition"
                  />
                </div>
              </div>
            )}

            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-4 my-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-royal uppercase tracking-wider text-[#8A6A1B]">Your Calculated Share</div>
                <div className="text-[11px] text-[#1A1106]/60 font-editorial italic">Includes proportional taxes</div>
              </div>
              <div className="font-royal text-2xl font-bold text-brand-primary">
                {formatCurrency(getSplitAmount())}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const amt = getSplitAmount().toFixed(2);
                  const upiUrl = `upi://pay?pa=${restaurantConfig?.contact?.email || 'smartdine@upi'}&pn=${encodeURIComponent(restaurantConfig?.name || 'SmartDine')}&am=${amt}&cu=INR`;
                  window.open(upiUrl, '_blank');
                  toast.success(`Opened UPI App for ${formatCurrency(getSplitAmount())}`);
                }}
                className="flex-1 py-3.5 px-4 rounded-xl bg-brand-primary text-[#FAF5EC] font-royal uppercase tracking-wider text-xs font-semibold hover:bg-brand-primary/90 transition shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>Tap to Pay My Share (UPI)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="py-3.5 px-5 rounded-xl border border-[#E7DFCB] font-royal uppercase tracking-wider text-xs font-semibold text-[#1A1106]/70 hover:bg-[#1A1106]/5 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
