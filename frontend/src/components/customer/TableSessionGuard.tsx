"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { useSession } from "@/stores/session";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, X, Sparkles, ArrowRight, RefreshCw, Utensils, User, LogOut } from "lucide-react";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { sendAIWaiterEvent } from "@/lib/ai_waiter_client";

/**
 * Watches for ?t=<qr_token> on any customer route. When present:
 *  - Shows a full-page alias experience with restaurant branding + table number
 *  - Creates guest JWT session + joins table in one flow
 *  - Strips the param from the URL
 *  - Shows a live "Table N · MM:SS remaining" banner that counts down
 */
export function TableSessionGuard({ slug }: { slug?: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { session, setSession, clear } = useTable();
  const { user, token, setSession: setAuthSession } = useSession();
  const { config: restaurantConfig } = useRestaurantConfig();
  const [remaining, setRemaining] = useState<string>("");

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Use provided slug or extract from pathname as fallback
  const slugFromPath = slug || path?.match(/^\/r\/([^/]+)/)?.[1] || "";

  // Device identity — unique per browser, survives clear/restart, no PII
  const [deviceId] = useState(() => {
    if (typeof window === "undefined") return "";
    const k = localStorage.getItem("sd-did");
    if (k) return k;
    const id = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? ((typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)) : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("sd-did", id);
    return id;
  });

  // Name state — persisted per device (no PII, just a display name)
  const [customerName, setCustomerName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("sd-customer-name") || "";
  });
  const [isReturning, setIsReturning] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("sd-customer-name");
  });
  
  const [isTakeawayQr, setIsTakeawayQr] = useState(false);
  const restaurantName = restaurantConfig?.name || slugFromPath.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Restaurant";

  // Effect 1: capture table identifier or takeaway from URL
  useEffect(() => {
    const tableId = search.get("table") || search.get("t");
    const isTk = search.get("type") === "takeaway" || search.get("takeaway") === "1" || search.get("order_type") === "takeaway";
    if (tableId) {
      setQrToken(tableId);
      setIsTakeawayQr(false);
    } else if (isTk) {
      setQrToken("takeaway");
      setIsTakeawayQr(true);
    }
  }, [search]);

  // Join table or takeaway with name
  const handleJoin = async () => {
    if (!qrToken) return;
    
    if (!customerName.trim() || customerName.trim().length < 2) {
      toast.error("Please enter a valid name to continue.");
      return;
    }
    
    const displayName = customerName.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("sd-customer-name", displayName);
    }
    
    setScanning(true);
    try {
      // Step 1: Create guest JWT session if not already authenticated or if name differs
      if (!token || user?.name !== displayName) {
        const guestUrl = slugFromPath
          ? `/api/auth/guest?slug=${encodeURIComponent(slugFromPath)}`
          : "/api/auth/guest";
        const guestRes = await api<{ token: string; user: { id: string; email: string; name: string; role: "customer" } }>(
          guestUrl,
          { method: "POST", body: JSON.stringify({ name: displayName }) }
        );
        setAuthSession(guestRes.user, guestRes.token);
      }

      if (isTakeawayQr) {
        if (typeof window !== "undefined") {
          localStorage.setItem("sd-order-type", "takeaway");
          localStorage.setItem("sd-takeaway-name", displayName);
        }
        toast.success(`Welcome to ${restaurantName}, ${displayName}! Takeaway ready.`);
        if (typeof window !== "undefined") sessionStorage.removeItem("sd_ai_welcome_shown");
        sendAIWaiterEvent({ event_type: "QR_SCAN", restaurant_id: restaurantConfig?.id || slugFromPath || "", cart_state: [] }).catch(() => {/* silent */});
        setQrToken(null);
        router.replace(`/r/${slugFromPath}`, { scroll: false });
        return;
      }

      // Step 2: Join table via QR scan or table number
      const res = await api<{ table: { number: number; restaurant_id?: string }; session: import("@/stores/table").TableSession & { restaurant_id?: string } }>(
        "/api/tables/scan",
        { method: "POST", body: JSON.stringify({ qr_token: qrToken, table_number: qrToken, restaurant_slug: slugFromPath, customer_name: displayName }) }
      );

      // Verify the table belongs to this restaurant
      const currentRestaurantId = restaurantConfig?.id;
      if (currentRestaurantId && res.table.restaurant_id && res.table.restaurant_id !== currentRestaurantId) {
        toast.error("This table belongs to a different restaurant. Please scan the correct QR code.");
        setQrToken(null);
        router.replace(`/r/${slugFromPath}`, { scroll: false });
        return;
      }

      setSession(res.session);
      toast.success(`Welcome to Table ${res.table.number}, ${displayName}!`);
      if (typeof window !== "undefined") sessionStorage.removeItem("sd_ai_welcome_shown");
      sendAIWaiterEvent({ event_type: "QR_SCAN", restaurant_id: restaurantConfig?.id || res.table.restaurant_id || slugFromPath || "", cart_state: [] }).catch(() => {/* silent */});
      setQrToken(null);
      router.replace(`/r/${slugFromPath}`, { scroll: false });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Invalid table QR");
      setQrToken(null);
      router.replace(`/r/${slugFromPath}`, { scroll: false });
    } finally {
      setScanning(false);
    }
  };

  // Effect 2: countdown
  useEffect(() => {
    if (!session || !session.expires_at) { setRemaining(""); return; }
    const iv = setInterval(() => {
      const ms = new Date(session.expires_at).getTime() - Date.now();
      if (ms <= 0) { clear(); setRemaining(""); toast.info("Table session ended. Feel free to re-scan when ordering more."); }
      else {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setRemaining(`${m}:${s < 10 ? "0" : ""}${s}`);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [session, clear]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {/* Active Session Top Banner */}
        {session && remaining && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="sticky top-0 w-full z-50 bg-[#1A1106] border-b border-brand-secondary/30 px-4 py-2.5 flex items-center justify-between shadow-lg"
            data-testid="table-session-banner"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-royal text-xs text-[#FAF5EC] tracking-wider uppercase truncate">
                Table {session.table_number}
              </span>
              <span className="text-[#FAF5EC]/40 text-xs">·</span>
              <span className="font-editorial italic text-xs text-brand-secondary truncate">
                {session.customer_name}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-brand-secondary/10 border border-brand-secondary/40 rounded-full px-3 py-1" data-testid="table-countdown">
                <Clock className="h-3 w-3 text-brand-secondary" />
                <span className="font-royal text-xs text-brand-secondary tabular-nums">{remaining}</span>
              </div>
              <button
                onClick={() => { clear(); toast.info("Table released."); }}
                className="h-7 w-7 rounded-full hover:bg-brand-secondary/10 flex items-center justify-center"
                title="Release table"
              >
                <X className="h-3.5 w-3.5 text-[#FAF5EC]/70" />
              </button>
            </div>
          </motion.div>
        )}

        {/* QR Scan Alias Experience — full page overlay */}
        {qrToken && (
          <motion.div
            key="alias-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center mehfil-paper p-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-md"
            >
              {/* Header with logo */}
              <div className="text-center mb-8">
                <MehfilLogo size="md" />
                <p className="font-editorial italic text-brand-primary/75 mt-3 text-sm">
                  {restaurantConfig?.tagline || `Welcome to ${restaurantName}`}
                </p>

                {/* Table or Takeaway indicator */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-secondary/10 border border-brand-secondary/30"
                >
                  <Utensils className="h-4 w-4 text-brand-primary" />
                  <span className="font-royal text-sm tracking-wider uppercase text-brand-primary font-bold">
                    {isTakeawayQr ? "Takeaway Ordering" : `Table ${qrToken}`}
                  </span>
                </motion.div>
              </div>

              {/* Alias Card */}
              <div className="mehfil-card rounded-2xl p-6 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
                
                {/* Identity section heading */}
                <div className="mehfil-divider mb-5">
                  <span className="font-royal tracking-[0.3em] text-[10px] uppercase">Your Dining Identity</span>
                </div>

                <AnimatePresence mode="wait">
                  {isReturning ? (
                    <motion.div
                      key="returning"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center mb-6"
                    >
                      <h3 className="font-royal text-2xl md:text-3xl text-brand-primary mb-2">
                        Welcome back, <br/>
                        <span className="text-[#8A6A1B]">{customerName}</span>!
                      </h3>
                      <p className="font-editorial italic text-sm text-[#1A1106]/70 leading-relaxed">
                        Ready for another delicious meal?
                      </p>
                      <button
                        onClick={() => {
                          setIsReturning(false);
                          setCustomerName("");
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("sd-customer-name");
                          }
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-royal tracking-wider uppercase text-brand-secondary hover:text-brand-primary transition-colors"
                      >
                        <LogOut className="h-3 w-3" />
                        Not {customerName}? Switch User
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="new"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5"
                    >
                      <p className="font-editorial italic text-sm text-[#1A1106]/70 text-center mb-6 leading-relaxed">
                        Please enter your name to start ordering.
                      </p>
                      
                      <label className="block">
                        <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your Name</span>
                        <div className="mt-1.5 flex items-center bg-white border border-brand-secondary/30 rounded-xl px-4 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
                          <User className="h-4 w-4 text-brand-primary/50" />
                          <input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            placeholder="e.g. Rahul Sharma"
                            maxLength={40}
                            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                            autoFocus
                          />
                        </div>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Start Ordering Button */}
                <button
                  onClick={handleJoin}
                  disabled={scanning || (!isReturning && customerName.trim().length < 2)}
                  className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {scanning ? (
                    isTakeawayQr ? "Setting up Takeaway..." : "Joining Table..."
                  ) : (
                    <>Start Ordering <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

                <div className="mt-5 text-center font-editorial italic text-[11px] text-[#1A1106]/55">
                  No sign-up required. Just good food.
                </div>
              </div>

              {/* Bottom hint */}
              <div className="mt-6 text-center">
                <p className="font-editorial italic text-xs text-[#1A1106]/50">
                  {isTakeawayQr ? "You are ordering Takeaway. Your name will be called when ready." : "Your table number will appear at the top after joining."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
