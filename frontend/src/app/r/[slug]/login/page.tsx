"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useTable } from "@/stores/table";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Lock, ChevronLeft, RefreshCw, Utensils, User, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { generateFunAlias } from "@/types";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";

type Tab = "guest" | "staff";

// Extract email slug from config slug: "mehfil" → "mehfil", "spice-garden" → "spice-garden"
function emailSlug(configSlug: string): string {
  return configSlug;
}

// Default credentials per restaurant — generated dynamically from slug
const getDefaultCredentials = (slug: string) => {
  if (['mehfil', 'mehfil-hyderabad', 'spice-garden'].includes(slug)) {
    return {
      email: `admin-${emailSlug(slug)}@smartdine.ai`,
      password: "Admin@123",
    };
  }
  return { email: "", password: "" };
};

export default function LoginPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const { session: tableSession } = useTable();
  const [tab, setTab] = useState<Tab>("guest");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get restaurant config
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Restaurant";

  // Fun alias state
  const [alias, setAlias] = useState(() => generateFunAlias());
  const [customAlias, setCustomAlias] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Staff fields - dynamic based on slug
  const defaultCreds = getDefaultCredentials(slug);
  const [email, setEmail] = useState(defaultCreds.email);
  const [password, setPassword] = useState(defaultCreds.password);

  // Update defaults when slug changes
  useEffect(() => {
    const creds = getDefaultCredentials(slug);
    setEmail(creds.email);
    setPassword(creds.password);
  }, [slug]);

  // Regenerate alias
  const regenerateAlias = () => {
    setAlias(generateFunAlias());
    setUseCustom(false);
    setCustomAlias("");
  };

  // Get display name
  const getDisplayName = () => {
    if (useCustom && customAlias.trim()) {
      return customAlias.trim();
    }
    return `${alias.prefix}${alias.suffix}`;
  };

  // Continue as guest with fun alias
  const continueAsGuest = async () => {
    setBusy(true);
    try {
      const displayName = getDisplayName();
      const guestUrl = restaurantConfig?.id
        ? `/api/auth/guest?restaurant_id=${encodeURIComponent(restaurantConfig.id)}`
        : "/api/auth/guest";
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: "customer" } }>(guestUrl, {
        method: "POST",
        body: JSON.stringify({ name: displayName }),
      });
      setSession(res.user, res.token);
      toast.success(`Welcome to ${restaurantName}, ${displayName}!`);
      
      // If table session exists, go to menu; otherwise stay for table scan
      if (tableSession) {
        router.push(`/r/${slug}/menu`);
      } else {
        // Redirect to menu (TableSessionGuard will handle QR scan)
        router.push(`/r/${slug}/menu`);
      }
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  const staffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: "admin" | "kitchen" | "counter" | "customer" } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.user, res.token);
      toast.success(`Welcome ${res.user.name}`);
      const dest = res.user.role === "admin" ? `/admin`
        : res.user.role === "kitchen" ? `/kitchen`
        : res.user.role === "counter" ? `/counter`
        : `/r/${slug}/menu`;
      window.location.href = dest;
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mehfil min-h-screen mehfil-paper flex items-center justify-center p-5">
      <Link href={`/r/${slug}`} data-testid="back-to-home" className="fixed top-5 left-5 flex items-center gap-1 text-brand-primary hover:text-brand-secondary font-royal tracking-wider uppercase text-xs">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <MehfilLogo size="md" />
          <p className="font-editorial italic text-[#5C0E1B]/75 mt-3 text-sm">{restaurantConfig?.tagline || `Welcome to ${restaurantName} — step right in.`}</p>
          
          {/* Table Info */}
          {tableSession?.table_number && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-secondary/10 border border-brand-secondary/30"
            >
              <Utensils className="h-4 w-4 text-brand-secondary" />
              <span className="font-royal text-xs tracking-wider uppercase text-brand-primary">
                You&apos;re at Table {tableSession.table_number}
              </span>
            </motion.div>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-[#FAF5EC] border border-brand-secondary/40 rounded-2xl p-7 shadow-2xl backdrop-blur">
          {/* Tabs */}
          <div className="flex bg-[#F3EBD8] rounded-full p-1 mb-6" data-testid="login-tabs">
            <button
              data-testid="tab-guest"
              onClick={() => setTab("guest")}
              className={`flex-1 py-2.5 rounded-full font-royal tracking-[0.2em] uppercase text-[10px] transition ${
                tab === "guest" ? "bg-brand-primary text-[#FAF5EC] shadow-md" : "text-brand-primary"
              }`}
            >
              Enter as Guest
            </button>
            <button
              data-testid="tab-staff"
              onClick={() => setTab("staff")}
              className={`flex-1 py-2.5 rounded-full font-royal tracking-[0.2em] uppercase text-[10px] transition ${
                tab === "staff" ? "bg-brand-primary text-[#FAF5EC] shadow-md" : "text-brand-primary"
              }`}
            >
              Staff Login
            </button>
          </div>

          {tab === "guest" ? (
            <div data-testid="guest-pane">
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
                          data-testid="custom-alias"
                          value={customAlias}
                          onChange={(e) => setCustomAlias(e.target.value)}
                          placeholder="e.g. BiryaniBoss"
                          maxLength={20}
                          className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                        />
                      </div>
                    </label>
                    <p className="mt-2 text-[10px] text-[#1A1106]/50 font-editorial italic">
                      Max 20 characters. No spaces, no personal info!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enter Button */}
              <button
                data-testid="continue-as-guest"
                onClick={continueAsGuest}
                disabled={busy}
                className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy ? "One moment…" : <>Start Ordering <ArrowRight className="h-4 w-4" /></>}
              </button>

              <div className="mt-5 text-center font-editorial italic text-[11px] text-[#1A1106]/55">
                No sign-up, no phone, no email. Just good food.
              </div>
            </div>
          ) : (
            <form onSubmit={staffSubmit} data-testid="staff-pane" className="space-y-3">
              <div className="mehfil-divider mb-5">
                <span className="font-royal tracking-[0.3em] text-[10px] uppercase">Staff Sign in</span>
              </div>
              
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Email</span>
                <div className="mt-1.5 flex items-center bg-white border border-brand-secondary/30 rounded-full px-4">
                  <Sparkles className="h-4 w-4 text-brand-primary" />
                  <input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial" />
                </div>
              </label>
              
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Password</span>
                <div className="mt-1.5 flex items-center bg-white border border-brand-secondary/30 rounded-full px-4">
                  <Lock className="h-4 w-4 text-brand-primary" />
                  <input data-testid="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-brand-primary hover:text-brand-secondary transition">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              
              <button
                type="submit"
                data-testid="login-submit"
                disabled={busy}
                className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 mt-3 inline-flex items-center justify-center gap-2"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
              
              {['mehfil', 'mehfil-hyderabad', 'spice-garden'].includes(slug) && (
                <div className="mt-5 text-[10px] text-[#1A1106]/55 space-y-1 font-royal tracking-wider uppercase">
                  <div className="font-semibold text-[#8A6A1B]">Demo Credentials</div>
                  <div>admin-{emailSlug(slug)}@smartdine.ai / Admin@123 — Admin</div>
                  <div>kitchen-{emailSlug(slug)}@smartdine.ai / Chef@123 — Kitchen</div>
                  <div>counter-{emailSlug(slug)}@smartdine.ai / Counter@123 — Counter</div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Bottom Help Text */}
        <div className="mt-6 text-center">
          <p className="font-editorial italic text-xs text-[#1A1106]/50">
            Scanned a QR code? Your table will be detected automatically.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
