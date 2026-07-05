"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import {
  Receipt, IndianRupee, ShieldCheck, Clock, RefreshCw, LogOut,
  CheckCircle2, XCircle, Tag, Printer, History, TrendingUp, 
  Banknote, Smartphone, CreditCard, PlusCircle, Search, Filter,
  AlertTriangle, ChevronDown, ChevronUp, X, User, Users, Table2, Loader2,
  BarChart3, ArrowDownLeft, Utensils, Calendar, Package, Map, Bell, PhoneCall
} from "lucide-react";
import { useState, useMemo } from "react";
import { useSession } from "@/stores/session";
import { useOrderStream } from "@/hooks/useOrderStream";
import { getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "live" | "history" | "shift" | "refunds" | "new-order";

interface ShiftSummary {
  cash_collected: number;
  upi_collected: number;
  card_collected: number;
  discounts_given: number;
  refunds_processed: number;
  net_collected: number;
  orders_billed: number;
}

interface Refund {
  id: string;
  order_id: string;
  amount: number;
  reason: string;
  refunded_by: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}
function paymentIcon(method: string) {
  if (method === "upi" || method === "qr") return <Smartphone className="h-3 w-3" />;
  if (method === "card") return <CreditCard className="h-3 w-3" />;
  return <Banknote className="h-3 w-3" />;
}
function statusColor(status: string) {
  if (status === "served" || status === "ready") return "text-emerald-400 bg-emerald-400/10";
  if (status === "preparing") return "text-amber-400 bg-amber-400/10";
  if (status === "awaiting_cash_verification") return "text-blue-400 bg-blue-400/10";
  if (status === "awaiting_exit") return "text-purple-400 bg-purple-400/10";
  if (status === "confirmed") return "text-sky-400 bg-sky-400/10";
  return "text-gray-400 bg-gray-400/10";
}
function payStatusColor(ps: string) {
  if (ps === "paid") return "text-emerald-400 bg-emerald-400/10";
  return "text-red-400 bg-red-400/10";
}

// ─── Bill Card ────────────────────────────────────────────────────────────────
function BillCard({ order, onDiscount, onRefund, onVerifyCash }: { order: Order; onDiscount: (o: Order) => void; onRefund: (o: Order) => void; onVerifyCash?: (o: Order) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-200">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-400 rounded-xl px-3 py-1.5 text-sm font-bold font-mono border border-amber-500/20">
            #{order.token || "—"}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{order.customer_name || "Guest"}</div>
            <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
              <Table2 className="h-3 w-3" />
              Table {order.table_number || "—"} · {fmtDate(order.created_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-bold">{fmtCurrency(order.total || 0)}</div>
            <div className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${payStatusColor(order.payment_status || "unpaid")}`}>
              {(order.payment_status || "unpaid").toUpperCase()}
            </div>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status || "")}`}>
            {(order.status || "").replace(/_/g, " ")}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Items */}
          <div className="space-y-1.5">
            {(order.items || []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-300">{item.name} × {item.qty}</span>
                <span className="text-white font-medium">{fmtCurrency(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-white/10 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span><span>{fmtCurrency(order.subtotal || 0)}</span>
            </div>
            {(order as any).discount_amount > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Discount ({(order as any).discount_reason || "Manual"})</span>
                <span>−{fmtCurrency((order as any).discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-400">
              <span>Tax (5%)</span><span>{fmtCurrency(order.tax || 0)}</span>
            </div>
            <div className="flex justify-between text-base text-white font-bold pt-1 border-t border-white/10">
              <span>Grand Total</span><span className="text-amber-400">{fmtCurrency(order.total || 0)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="flex items-center gap-2 text-sm">
            {paymentIcon(order.payment_method || "")}
            <span className="text-gray-400 capitalize">{order.payment_method || "—"}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {order.status === "awaiting_cash_verification" && onVerifyCash && (
              <button
                onClick={() => onVerifyCash(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm hover:bg-blue-500/20 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verify & Accept Cash
              </button>
            )}
            {order.payment_status !== "paid" && (
              <button
                onClick={() => onDiscount(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm hover:bg-amber-500/20 transition"
              >
                <Tag className="h-3.5 w-3.5" /> Apply Discount
              </button>
            )}
            {order.payment_status === "paid" && (
              <button
                onClick={() => onRefund(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" /> Refund
              </button>
            )}
            <a
              href={`/api/orders/${order.id}/bill`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
            >
              <Printer className="h-3.5 w-3.5" /> Print Bill
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Discount Modal ───────────────────────────────────────────────────────────
function DiscountModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"fixed" | "percent">("percent");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const discountMut = useMutation({
    mutationFn: (data: any) => api("/api/cashier/apply-discount", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res: any) => {
      toast.success(`Discount of ${fmtCurrency(res.discount_applied)} applied! New total: ${fmtCurrency(res.new_total)}`);
      qc.invalidateQueries({ queryKey: ["cashier-live"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to apply discount"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">Apply Discount</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="text-gray-400 text-sm mb-4">
          Order <span className="text-amber-400 font-mono">#{order.token}</span> · Current Total: <span className="text-white font-bold">{fmtCurrency(order.total || 0)}</span>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["percent", "fixed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${type === t ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"}`}
              >
                {t === "percent" ? "Percentage (%)" : "Fixed Amount (₹)"}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
              {type === "percent" ? "%" : "₹"}
            </span>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "percent" ? "e.g. 10" : "e.g. 50"}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white outline-none focus:border-amber-500/50"
            />
          </div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500/50"
          >
            <option value="">Select reason...</option>
            <option value="Birthday Offer">🎂 Birthday Offer</option>
            <option value="Loyalty Discount">⭐ Loyalty Discount</option>
            <option value="Manager Complimentary">🎁 Manager Complimentary</option>
            <option value="Senior Citizen Discount">👴 Senior Citizen Discount</option>
            <option value="Staff Meal">🍽️ Staff Meal</option>
            <option value="Complaint Resolution">🤝 Complaint Resolution</option>
            <option value="Promotional Offer">🏷️ Promotional Offer</option>
          </select>
          <button
            disabled={!value || !reason || discountMut.isPending}
            onClick={() => discountMut.mutate({ order_id: order.id, discount_type: type, discount_value: parseFloat(value), reason })}
            className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {discountMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Tag className="h-4 w-4" /> Apply Discount</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Refund Modal ─────────────────────────────────────────────────────────────
function RefundModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(order.total || ""));
  const [reason, setReason] = useState("");

  const refundMut = useMutation({
    mutationFn: (data: any) => api("/api/cashier/refund", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Refund processed successfully!");
      qc.invalidateQueries({ queryKey: ["cashier-live"] });
      qc.invalidateQueries({ queryKey: ["cashier-refunds"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to process refund"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-red-400" /> Process Refund
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="text-gray-400 text-sm mb-4">
          Order <span className="text-amber-400 font-mono">#{order.token}</span> · Paid: <span className="text-white font-bold">{fmtCurrency(order.total || 0)}</span>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Refund amount"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white outline-none focus:border-red-500/50"
            />
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-red-500/50 resize-none"
          />
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This action will be logged with your name and cannot be undone without admin approval.</span>
          </div>
          <button
            disabled={!amount || !reason || refundMut.isPending}
            onClick={() => refundMut.mutate({ order_id: order.id, amount: parseFloat(amount), reason })}
            className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {refundMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowDownLeft className="h-4 w-4" /> Confirm Refund</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Manual Order ──────────────────────────────────────────────────────────
function NewOrderPanel() {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [items, setItems] = useState([{ name: "", price: "", qty: "1" }]);

  const addItem = () => setItems([...items, { name: "", price: "", qty: "1" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: string) => {
    const updated = [...items];
    (updated[i] as any)[field] = val;
    setItems(updated);
  };

  const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.price) || 0) * (parseInt(it.qty) || 1), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const createOrderMut = useMutation({
    mutationFn: (data: any) => api("/api/cashier/manual-order", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Manual order created and sent to kitchen!");
      qc.invalidateQueries({ queryKey: ["cashier-live"] });
      setCustomerName(""); setTableNumber(""); setItems([{ name: "", price: "", qty: "1" }]);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create order"),
  });

  const handleSubmit = () => {
    const validItems = items.filter(it => it.name.trim() && parseFloat(it.price) > 0);
    if (!validItems.length) return toast.error("Add at least one valid item");
    if (!customerName.trim()) return toast.error("Customer name is required");
    createOrderMut.mutate({
      customer_name: customerName,
      table_number: tableNumber || "Counter",
      payment_method: payMethod,
      items: validItems.map(it => ({ name: it.name, price: parseFloat(it.price), qty: parseInt(it.qty) || 1 })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Customer Name *</label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-amber-500/50 transition">
            <User className="h-4 w-4 text-gray-500" />
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter name" className="bg-transparent outline-none flex-1 text-white text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Table / Seat</label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-amber-500/50 transition">
            <Table2 className="h-4 w-4 text-gray-500" />
            <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g. Table 5" className="bg-transparent outline-none flex-1 text-white text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Method</label>
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50">
            <option value="cash">💵 Cash</option>
            <option value="upi">📱 UPI / QR</option>
            <option value="card">💳 Card</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Order Items</span>
          <button onClick={addItem} className="flex items-center gap-1 text-amber-400 text-sm hover:text-amber-300 transition">
            <PlusCircle className="h-4 w-4" /> Add Item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={item.name}
                onChange={e => updateItem(i, "name", e.target.value)}
                placeholder="Item name"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
              />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(i, "price", e.target.value)}
                  placeholder="Price"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                />
              </div>
              <input
                type="number"
                value={item.qty}
                onChange={e => updateItem(i, "qty", e.target.value)}
                min="1"
                className="w-16 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50 text-center"
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 transition">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {subtotal > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-300"><span>Subtotal</span><span>{fmtCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-gray-300"><span>Tax (5%)</span><span>{fmtCurrency(tax)}</span></div>
          <div className="flex justify-between text-base font-bold text-white border-t border-amber-500/20 pt-2"><span>Total</span><span className="text-amber-400">{fmtCurrency(total)}</span></div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={createOrderMut.isPending}
        className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-40 transition flex items-center justify-center gap-2"
      >
        {createOrderMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Utensils className="h-5 w-5" /> Create Order & Send to Kitchen</>}
      </button>
    </div>
  );
}

// ─── Shift Summary Panel ──────────────────────────────────────────────────────
function ShiftSummaryPanel() {
  const { data, isLoading } = useQuery<ShiftSummary>({
    queryKey: ["cashier-shift"],
    queryFn: () => api("/api/cashier/shift-summary"),
    refetchInterval: 30000,
  });

  const cards = [
    { label: "Cash Collected", value: data?.cash_collected ?? 0, icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    { label: "UPI / QR", value: data?.upi_collected ?? 0, icon: Smartphone, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
    { label: "Card", value: data?.card_collected ?? 0, icon: CreditCard, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
    { label: "Discounts Given", value: data?.discounts_given ?? 0, icon: Tag, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
    { label: "Refunds", value: data?.refunds_processed ?? 0, icon: ArrowDownLeft, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
    { label: "Net Collected", value: data?.net_collected ?? 0, icon: TrendingUp, color: "text-white", bg: "bg-white/10 border-white/20" },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Today's Shift Summary</h2>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-amber-400">{data?.orders_billed ?? 0}</div>
          <div className="text-gray-400 text-xs">orders billed</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.bg} border rounded-2xl p-4`}>
            <div className={`${c.color} mb-2`}><c.icon className="h-5 w-5" /></div>
            <div className={`text-xl font-bold ${c.color}`}>{fmtCurrency(c.value)}</div>
            <div className="text-gray-400 text-xs mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Net Total Highlight */}
      <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="text-gray-300 text-sm font-medium">Net Revenue (This Shift)</div>
          <div className="text-amber-400 text-4xl font-black mt-1">{fmtCurrency(data?.net_collected ?? 0)}</div>
        </div>
        <BarChart3 className="h-12 w-12 text-amber-500/30" />
      </div>
    </div>
  );
}

// ─── Main Cashier Page ────────────────────────────────────────────────────────
export default function CashierPage() {
  const { user, clear: clearSession } = useSession();
  const qc = useQueryClient();
  const config = getRestaurantConfig(user?.restaurant_slug || "");
  const [tab, setTab] = useState<Tab>("live");
  const [search, setSearch] = useState("");
  const [discountOrder, setDiscountOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  useOrderStream();

  const { data: liveData, isLoading: liveLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["cashier-live"],
    queryFn: () => api("/api/cashier/live-bills"),
    refetchInterval: 15000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["cashier-history"],
    queryFn: () => api("/api/cashier/bill-history"),
    enabled: tab === "history",
  });

  const { data: refundsData } = useQuery<{ refunds: Refund[] }>({
    queryKey: ["cashier-refunds"],
    queryFn: () => api("/api/cashier/refunds"),
    enabled: tab === "refunds",
  });

  const { data: floorMapData } = useQuery<{ tables: { id: string; number: number; capacity: number; status: string; is_active: boolean; color_code?: string; active_order_id?: string; active_order_token?: string; active_order_status?: string }[] }>({
    queryKey: ["cashier-floor-map"],
    queryFn: () => api("/api/tables/live-floor-map"),
    refetchInterval: 10000,
  });

  const { data: notifsData } = useQuery({
    queryKey: ["notifications", "cashier"],
    queryFn: () => api("/api/notifications?role=cashier"),
    refetchInterval: 10000
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "cashier"] })
  });

  const verifyCashMut = useMutation({
    mutationFn: (orderId: string) => api(`/api/orders/${orderId}/verify-cash-paycode`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Cash verified! Kitchen token generated.");
      qc.invalidateQueries({ queryKey: ["cashier-live"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to verify cash"),
  });

  const liveOrders = useMemo(() => {
    const orders = liveData?.orders ?? [];
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      (o.customer_name || "").toLowerCase().includes(q) ||
      String(o.token || "").toLowerCase().includes(q) ||
      String(o.table_number || "").toLowerCase().includes(q)
    );
  }, [liveData, search]);

  const historyOrders = useMemo(() => {
    const orders = historyData?.orders ?? [];
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      (o.customer_name || "").toLowerCase().includes(q) ||
      String(o.token || "").toLowerCase().includes(q)
    );
  }, [historyData, search]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "live", label: "Live Bills", icon: Receipt },
    { id: "history", label: "Bill History", icon: History },
    { id: "shift", label: "Shift Summary", icon: BarChart3 },
    { id: "refunds", label: "Refunds", icon: ArrowDownLeft },
    { id: "new-order", label: "New Order", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              <Receipt className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">Cashier Dashboard</div>
              <div className="text-gray-500 text-xs mt-0.5">{config?.name || "SmartDine AI"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm">
              <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-gray-300">{user?.name || "Cashier"}</span>
            </div>
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-400/30 rounded-xl transition"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Notifications */}
        {(notifsData?.notifications ?? []).filter((n: any) => !n.read && n.type === "staff_call").map((n: any) => (
          <div key={n.id} className="bg-amber-500 text-amber-950 px-4 py-3 rounded-2xl mb-6 shadow-lg flex items-center justify-between border-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400/50 p-2 rounded-full animate-bounce">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">{n.title}</div>
                <div className="text-sm font-medium opacity-90">{n.message}</div>
              </div>
            </div>
            <button
              onClick={() => markReadMut.mutate(n.id)}
              className="bg-amber-950/10 hover:bg-amber-950/20 transition px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Acknowledge
            </button>
          </div>
        ))}

        {/* Live Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Pending Bills", value: liveOrders.filter(o => o.payment_status !== "paid").length, color: "text-amber-400", icon: Clock },
            { label: "Paid Today", value: liveOrders.filter(o => o.payment_status === "paid").length, color: "text-emerald-400", icon: CheckCircle2 },
            { label: "Active Tables", value: new Set(liveOrders.map(o => o.table_number)).size, color: "text-blue-400", icon: Table2 },
            { label: "Cash Verify Queue", value: liveOrders.filter(o => o.status === "awaiting_cash_verification").length, color: "text-purple-400", icon: ShieldCheck },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/3 border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-500 text-xs">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Floor Map Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Live Floor Map</h2>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["cashier-floor-map"] })}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(floorMapData?.tables || []).map((t) => {
              const bg = t.color_code === "green" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                         t.color_code === "yellow" ? "bg-amber-500/20 border-amber-500/50 text-amber-400" :
                         t.color_code === "red" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                         "bg-white/5 border-white/10 text-gray-400";
              
              const activeOrder = liveOrders.find(o => o.id === t.active_order_id);

              return (
                <div key={t.id} className={`border rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all ${bg}`}>
                  {t.color_code === "yellow" && <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="font-bold text-lg">Table {t.number}</div>
                    <Users className="h-4 w-4 opacity-50" />
                  </div>
                  
                  <div className="mt-2 text-xs relative z-10 space-y-1">
                    {t.status === "bill_requested" ? (
                      <div className="font-bold text-amber-300 flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" /> Bill Requested
                      </div>
                    ) : t.status === "live" ? (
                      <div className="text-emerald-300/70">Occupied</div>
                    ) : (
                      <div className="text-gray-500">Empty</div>
                    )}
                    
                    {t.active_order_token && (
                      <div className="font-mono bg-black/20 px-1.5 py-0.5 rounded w-fit mt-1">
                        #{t.active_order_token}
                      </div>
                    )}
                  </div>

                  {activeOrder && (t.status === "bill_requested" || t.status === "live") && (
                    <button 
                      onClick={() => {
                        setTab("live");
                        setSearch(t.active_order_token || "");
                      }}
                      className="mt-3 relative z-10 w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition"
                    >
                      View Bill
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                tab === t.id ? "bg-amber-500 text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "live" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-amber-500/50 transition">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by token, name, table..."
                  className="bg-transparent outline-none flex-1 text-white text-sm"
                />
              </div>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["cashier-live"] })}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {liveLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              </div>
            ) : liveOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No active bills right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveOrders.map((o) => (
                  <BillCard key={o.id} order={o} onDiscount={setDiscountOrder} onRefund={setRefundOrder} onVerifyCash={(o) => verifyCashMut.mutate(o.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-amber-500/50 transition">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bill history..."
                className="bg-transparent outline-none flex-1 text-white text-sm"
              />
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <History className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No bill history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyOrders.map((o) => (
                  <BillCard key={o.id} order={o} onDiscount={setDiscountOrder} onRefund={setRefundOrder} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "shift" && <ShiftSummaryPanel />}

        {tab === "refunds" && (
          <div className="space-y-3">
            {(refundsData?.refunds ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <ArrowDownLeft className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No refunds processed yet</p>
              </div>
            ) : (
              refundsData?.refunds.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold text-sm">Order #{r.order_id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{r.reason}</div>
                    <div className="text-gray-500 text-xs mt-0.5">by {r.refunded_by} · {fmtDate(r.created_at)}</div>
                  </div>
                  <div className="text-red-400 font-bold text-lg">−{fmtCurrency(r.amount)}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "new-order" && <NewOrderPanel />}
      </div>

      {/* Modals */}
      {discountOrder && <DiscountModal order={discountOrder} onClose={() => setDiscountOrder(null)} />}
      {refundOrder && <RefundModal order={refundOrder} onClose={() => setRefundOrder(null)} />}
    </div>
  );
}
