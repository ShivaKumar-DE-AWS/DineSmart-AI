"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { useSession } from "@/stores/session";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { generateFunAlias } from "@/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, X, Sparkles, ArrowRight, RefreshCw, Utensils, User } from "lucide-react";
import { MehfilLogo } from "@/components/customer/MehfilLogo";

/**
 * Watches for ?t=<qr_token> on any customer route. When present:
 *  - Shows a full-page alias experience with restaurant branding + table number
 *  - Creates guest JWT session + joins table in one flow
 *  - Strips the param from the URL
 *  - Shows a live "Table N · MM:SS remaining" banner that counts down
 */
export function TableSessionGuard() {
  const search = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { session, setSession, clear } = useTable();
  const { user, token, setSession: setAuthSession } = useSession();
  const { config: restaurantConfig } = useRestaurantConfig();
  const [remaining, setRemaining] = useState<string>("");

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Alias state
  const [alias, setAlias] = useState(() => generateFunAlias());
  const [customAlias, setCustomAlias] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Extract slug from current path
  const slugFromPath = path?.match(/^\/r\/([^/]+)/)?.[1] || "";
  const restaurantName = restaurantConfig?.name || slugFromPath.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Restaurant";

  // Effect 1: capture table identifier from URL
  useEffect(() => {
    const tableId = search.get("table") || search.get("t");
    if (tableId) setQrToken(tableId);
  }, [search]);

  // Regenerate alias
  const regenerateAlias = useCallback(() => {
    setAlias(generateFunAlias());
    setUseCustom(false);
    setCustomAlias("");
  }, []);

  // Get display name
  const getDisplayName = useCallback(() => {
    if (useCustom && customAlias.trim()) return customAlias.trim();
    return `${alias.prefix}${alias.suffix}`;
  }, [alias, useCustom, customAlias]);

  // Join table with alias
  const handleJoin = async () => {
    if (!qrToken) return;
    
    const displayName = getDisplayName();
    setScanning(true);
    try {
      // Step 1: Create guest JWT session if not already authenticated
      if (!token) {
        const guestUrl = slugFromPath
          ? `/api/auth/guest?slug=${encodeURIComponent(slugFromPath)}`
          : "/api/auth/guest";
        const guestRes = await api<{ token: string; user: { id: string; email: string; name: string; role: "customer" } }>(
          guestUrl,
          { method: "POST", body: JSON.stringify({ name: displayName }) }
        );
        setAuthSession(guestRes.user, guestRes.token);
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
        router.replace(path || `/r/${slugFromPath}`, { scroll: false });
        return;
      }

      setSession(res.session);
      toast.success(`Welcome to Table ${res.table.number}, ${displayName}!`);
      setQrToken(null);
      router.replace(`/r/${slugFromPath}/menu`, { scroll: false });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Invalid table QR");
      setQrToken(null);
      router.replace(path || `/r/${slugFromPath}`, { scroll: false });
    } finally {
      setScanning(false);
    }
  };

  // Effect 2: countdown
  useEffect(() => {
    if (!session) { setRemaining(""); return; }
    const tick = () => {
      const exp = new Date(session.expires_at).getTime();
      const left = exp - Date.now();
      if (left <= 0) {
        setRemaining("");
        clear();
        toast.info("Your table hold expired — scan again to reserve.");
        return;
      }
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      setRemaining(`${min}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, clear]);

  return (
    <>
      <AnimatePresence>
        {/* Active table banner — shows after joining */}
        {session && remaining && (
          <motion.div
            key="table-banner"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="sticky top-0 z-30 mehfil-royal-bg text-[#FAF5EC] px-5 py-2.5 flex items-center justify-between gap-3 shadow-lg"
            data-testid="table-banner"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-brand-secondary/20 border border-brand-secondary/50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-brand-secondary" />
              </div>
              <div className="min-w-0">
                <div className="font-royal tracking-[0.25em] uppercase text-[10px] text-brand-secondary">Seated at</div>
                <div className="font-royal text-sm leading-tight">Table {session.table_number}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-brand-secondary/10 border border-brand-secondary/40 rounded-full px-3 py-1" data-testid="table-countdown">
                <Clock className="h-3 w-3 text-brand-secondary" />
                <span className="font-royal text-xs text-brand-secondary tabular-nums">{remaining}</span>
              </div>
              <button
                data-testid="table-banner-close"
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

                {/* Table indicator */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-secondary/10 border border-brand-secondary/30"
                >
                  <Utensils className="h-4 w-4 text-brand-secondary" />
                  <span className="font-royal text-sm tracking-wider uppercase text-brand-primary font-bold">
                    Table Detected
                  </span>
                </motion.div>
              </div>

              {/* Main card */}
              <div className="bg-[#FAF5EC] border border-brand-secondary/40 rounded-2xl p-7 shadow-2xl backdrop-blur">
                {/* Alias section heading */}
                <div className="mehfil-divider mb-5">
                  <span className="font-royal tracking-[0.3em] text-[10px] uppercase">Your Dining Identity</span>
                </div>

                <p className="font-editorial italic text-sm text-[#1A1106]/70 text-center mb-6 leading-relaxed">
                  No personal data needed! Pick a fun alias or start instantly.
                </p>

                {/* Fun Alias Display */}
                <div className="bg-gradient-to-br from-[#F3EBD8] to-[#FAF5EC] rounded-xl p-5 border border-brand-secondary/20 mb-5">
                  <div className="text-center">
                    <div className="text-xs font-royal tracking-[0.2em] uppercase text-[#8A6A1B] mb-2">Your Alias</div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={useCustom ? "custom" : `${alias.prefix}${alias.suffix}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="font-royal text-2xl md:text-3xl text-brand-primary tracking-wide"
                      >
                        {useCustom ? (customAlias || "Your Alias") : `${alias.prefix}${alias.suffix}`}
                      </motion.div>
                    </AnimatePresence>

                    {!useCustom && (
                      <button
                        onClick={regenerateAlias}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-royal tracking-wider uppercase text-brand-secondary hover:text-brand-primary transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Shuffle
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Alias Toggle */}
                <div className="mb-5">
                  <button
                    onClick={() => setUseCustom(!useCustom)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#E7DFCB] hover:border-brand-secondary/50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-royal text-[#1A1106]">
                      <User className="h-4 w-4 text-brand-primary" />
                      {useCustom ? "Use random alias instead" : "Pick my own alias"}
                    </span>
                    <div className={`w-10 h-5 rounded-full transition-colors ${useCustom ? "bg-brand-primary" : "bg-[#E7DFCB]"}`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${useCustom ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                </div>

                {/* Custom Alias Input */}
                <AnimatePresence>
                  {useCustom && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <label className="block">
                        <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your custom alias</span>
                        <div className="mt-1.5 flex items-center bg-white border border-brand-secondary/30 rounded-full px-4">
                          <Sparkles className="h-4 w-4 text-brand-primary" />
                          <input
                            value={customAlias}
                            onChange={(e) => setCustomAlias(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            placeholder="e.g. BiryaniBoss"
                            maxLength={20}
                            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                            autoFocus
                          />
                        </div>
                      </label>
                      <p className="mt-2 text-[10px] text-[#1A1106]/50 font-editorial italic">
                        Max 20 characters. No spaces, no personal info!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Start Ordering Button */}
                <button
                  onClick={handleJoin}
                  disabled={scanning}
                  className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {scanning ? (
                    "Joining Table..."
                  ) : (
                    <>Start Ordering <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

                <div className="mt-5 text-center font-editorial italic text-[11px] text-[#1A1106]/55">
                  No sign-up, no phone, no email. Just good food.
                </div>
              </div>

              {/* Bottom hint */}
              <div className="mt-6 text-center">
                <p className="font-editorial italic text-xs text-[#1A1106]/50">
                  Your table number will appear at the top after joining.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
