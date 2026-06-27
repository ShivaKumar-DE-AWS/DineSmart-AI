"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Store, Phone, Users, Utensils, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useAllRestaurantConfigs } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";

type Tab = "login" | "register";

// Dynamic slug derivation from restaurant_id
function slugFromRestaurantId(restaurantId: string): string {
  return restaurantId.replace("rest_", "").replace(/_001$/, "").replace(/_/g, "-");
}

export default function RestaurantAuthPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const allRestaurants = useAllRestaurantConfigs();
  
  const [tab, setTab] = useState<Tab>("login");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRestaurantName, setRegRestaurantName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regTables, setRegTables] = useState("15");
  const [regCuisine, setRegCuisine] = useState("");
  const [regLogoUrl, setRegLogoUrl] = useState("");
  const [result, setResult] = useState<{ url: string; credentials: Record<string, { email: string; password: string }> } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: "admin" | "kitchen" | "counter" | "customer" | "superadmin"; restaurant_id?: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.user as any, res.token);
      toast.success(`Welcome back, ${res.user.name}`);

      // Superadmins go to HQ dashboard
      if (res.user.role === "superadmin") {
        router.push("/super-admin");
        return;
      }

      const restaurantId = res.user.restaurant_id;
      const slug = restaurantId ? slugFromRestaurantId(restaurantId) : null;
      const dest = slug
        ? res.user.role === "kitchen" ? `/r/${slug}/kitchen`
        : res.user.role === "counter" ? `/r/${slug}/counter`
        : res.user.role === "admin" ? `/admin`
        : `/r/${slug}`
        : "/";
      window.location.href = dest;
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Sign in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/restaurants/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regRestaurantName,
          email: regEmail,
          phone: regPhone,
          tables_count: parseInt(regTables) || 15,
          cuisine: regCuisine,
          notes: `Owner: ${regName}. Logo/Theme: ${regLogoUrl || "none provided"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create restaurant");
      setResult({ url: data.url, credentials: data.credentials });
      toast.success("Restaurant created successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create restaurant";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6 selection:bg-electric-blue/30 font-sans text-cream">
      {/* Background glowing orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-electric-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-clay/10 rounded-full blur-[150px]" />
      </div>

      <Link href="/" className="fixed top-8 left-8 flex items-center gap-2 text-stone hover:text-white transition group z-50">
        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to site</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="text-2xl font-bold tracking-tight bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-white">Smart</span>
            <span className="text-clay">Dine</span>
            <span className="text-electric-blue ml-1">AI</span>
          </div>
          <h1 className="font-heading text-3xl text-white mb-2">
            {tab === "login" ? "Partner Login" : "Create Restro"}
          </h1>
          <p className="text-stone text-sm">
            {tab === "login" 
              ? "Sign in to manage your AI-powered restaurant."
              : "Request a custom portal tailored for your restaurant."}
          </p>
        </div>

        <div className="bg-graphite/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-8">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "login" ? "bg-white/10 text-white shadow-sm" : "text-stone hover:text-white"
              }`}
            >
              Partner Login
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "register" ? "bg-white/10 text-white shadow-sm" : "text-stone hover:text-white"
              }`}
            >
              Create Restro
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 transition"
                      placeholder="owner@restaurant.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-sm font-medium text-stone">Password</label>
                    <a href="#" className="text-xs text-electric-blue hover:text-electric-blue/80 transition">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 transition"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-white hover:bg-cream text-ink font-semibold rounded-xl py-3.5 transition flex items-center justify-center gap-2 mt-2"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Dashboard"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRequestAccess}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone pl-1">Full Name</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="John Doe" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone pl-1">Restaurant Name</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input type="text" value={regRestaurantName} onChange={(e) => setRegRestaurantName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="The Golden Plate" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone pl-1">Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="owner@restaurant.com" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone pl-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="+91 98765 43210" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone pl-1">Number of Tables</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                      <input type="number" value={regTables} onChange={(e) => setRegTables(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="15" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone pl-1">Cuisine / Menu Type</label>
                    <div className="relative">
                      <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                      <input type="text" value={regCuisine} onChange={(e) => setRegCuisine(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="Italian, Indian, Cafe..." required />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone pl-1">Logo / Theme / Example Website</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input type="text" value={regLogoUrl} onChange={(e) => setRegLogoUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50" placeholder="URL or brief description" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-clay hover:bg-clay-dark text-white font-semibold rounded-xl py-3 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-clay/20"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create My Restaurant Portal"}
                </button>

                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-3"
                  >
                    <div className="text-emerald-400 font-semibold text-sm">Restaurant Created!</div>
                    <div>
                      <span className="text-stone">Your URL:</span>{" "}
                      <a href={result.url} className="text-electric-blue hover:underline">{result.url}</a>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-stone font-medium mb-1">Login Credentials:</div>
                      {Object.entries(result.credentials).map(([role, cred]) => (
                        <div key={role} className="flex justify-between bg-white/5 rounded-lg px-3 py-1.5">
                          <span className="text-white capitalize">{role}:</span>
                          <span className="text-stone">{cred.email} / {cred.password}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={result.url}
                      className="block text-center bg-white hover:bg-cream text-ink font-semibold rounded-lg py-2 text-xs transition mt-2"
                    >
                      Visit Your Restaurant
                    </Link>
                  </motion.div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {tab === "login" && (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-stone space-y-2 backdrop-blur-md">
            <div className="font-semibold text-white mb-2">Demo Credentials:</div>
            <div className="grid grid-cols-2 gap-1">
              {allRestaurants.map((r) => (
                <div key={r.slug}>
                  <span className="text-gold">{r.name}:</span> {r.email}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {allRestaurants.map((r) => (
                <div key={r.slug}>
                  <span className="text-white">Pass:</span> Owner@123
                </div>
              ))}
            </div>
            <div className="text-[10px] text-stone/60 mt-2 border-t border-white/10 pt-2">
              Staff logins available from each restaurant&apos;s login page.
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-xs text-stone hover:text-white transition">
            SmartDine Staff? Login here &rarr;
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
