"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Store, Phone, Users, Utensils, Link as LinkIcon, Eye, EyeOff, UploadCloud, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useAllRestaurantConfigs } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";

type Tab = "login" | "register";

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
  const [regCuisine, setRegCuisine] = useState("");
  const [regServiceType, setRegServiceType] = useState("fine_dining");
  const [regPrimaryColor, setRegPrimaryColor] = useState("#8A1A2A");
  const [regSecondaryColor, setRegSecondaryColor] = useState("#C9A348");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ url: string; credentials: Record<string, { email: string; password: string }> } | null>(null);

  // OTP State
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState<"sms" | "call" | null>(null);


  const sendOtp = async (type: "email" | "phone", value: string, phoneMethod: "sms" | "whatsapp" | "call" = "sms") => {
    if (!value) return toast.error(`Please enter a valid ${type}`);
    if (type === "email") setVerifyingEmail(true);
    else setVerifyingPhone(phoneMethod as "sms" | "call");
    
    
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "email" ? { email: value } : { phone: value, method: phoneMethod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
      toast.success(`OTP sent to your ${type}!`);
      if (type === "email") setEmailOtpSent(true);
      else setPhoneOtpSent(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (type === "email") setVerifyingEmail(false);
      else setVerifyingPhone(null);
    }
  };

  const verifyOtp = async (type: "email" | "phone", target: string, otp: string) => {
    if (!otp) return toast.error("Please enter OTP");
    if (type === "email") setVerifyingEmail(true);
    else setVerifyingPhone("sms"); // Default loading state for verify
    
    
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "email" ? { email: target, otp } : { phone: target, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");
      toast.success(`${type === "email" ? "Email" : "Phone"} verified!`);
      if (type === "email") setEmailVerified(true);
      else setPhoneVerified(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (type === "email") setVerifyingEmail(false);
      else setVerifyingPhone(null);
    }
  };

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

      if (res.user.role === "superadmin") {
        router.push("/super-admin");
        return;
      }

      const restaurantId = res.user.restaurant_id;
      const slug = restaurantId ? slugFromRestaurantId(restaurantId) : null;
      const dest = slug
        ? res.user.role === "kitchen" ? `/kitchen`
        : res.user.role === "counter" ? `/counter`
        : res.user.role === "admin" ? `/admin`
        : `/r/${slug}`
        : "/";
      if (typeof window !== "undefined") window.location.href = dest;
    } catch (e) {
      toast.error((e as Error).message || "Sign in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailVerified || !phoneVerified) {
      return toast.error("Please verify your email and phone number to continue.");
    }
    
    setBusy(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("name", regName);
      formData.append("email", regEmail);
      formData.append("phone", regPhone);
      formData.append("cuisine", regCuisine);
      formData.append("service_type", regServiceType);
      formData.append("primary_color", regPrimaryColor);
      formData.append("secondary_color", regSecondaryColor);
      if (logoFile) formData.append("logo", logoFile);
      if (menuFile) formData.append("menu", menuFile);

      const res = await fetch("/api/restaurants/request", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create restaurant");
      setResult({ url: data.url, credentials: data.credentials });
      toast.success("Restaurant created successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create restaurant");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6 selection:bg-electric-blue/30 font-sans text-cream">
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
            {tab === "login" ? "Partner Login" : "Start Free Trial"}
          </h1>
          <p className="text-stone text-sm">
            {tab === "login" 
              ? "Sign in to manage your AI-powered restaurant."
              : "Get a 14-day free trial of our Pro plan. No credit card required."}
          </p>
        </div>

        <div className="bg-graphite/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
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
              Start Free Trial
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
                    <a href="/auth/forgot-password" className="text-xs text-electric-blue hover:text-electric-blue/80 transition">Forgot password?</a>
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
                
                  <div className="space-y-4">
                    {/* EMAIL VERIFICATION */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Verify Email Address</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                          <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); setEmailVerified(false); setEmailOtpSent(false); setEmailOtp(""); }} disabled={emailVerified} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-stone disabled:opacity-50" placeholder="owner@email.com" />
                        </div>
                        {!emailVerified && !emailOtpSent && (
                          <button type="button" onClick={() => sendOtp("email", regEmail)} disabled={verifyingEmail} className="px-4 bg-clay rounded-xl text-white text-sm font-semibold whitespace-nowrap">
                            {verifyingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                          </button>
                        )}
                        {emailVerified && <CheckCircle2 className="w-6 h-6 text-emerald-400 my-auto" />}
                      </div>
                      
                      {emailOtpSent && !emailVerified && (
                        <div className="flex gap-2 mt-2">
                          <input type="text" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="Enter OTP" className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm" />
                          <button type="button" onClick={() => verifyOtp("email", regEmail, emailOtp)} disabled={verifyingEmail} className="px-4 bg-emerald-600 rounded-xl text-white text-sm font-semibold whitespace-nowrap">
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-2">Restaurant Details</h3>
                    {emailVerified && (
                      <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4" /> Identity verified successfully.
                      </div>
                    )}
                    
                    <div className="space-y-4 relative">
                      {!emailVerified && (
                        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center -mx-2 -my-2 p-2">
                          <div className="text-center">
                            <Lock className="w-6 h-6 text-stone mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-medium text-stone">Verify your email above to continue</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Full Name</label>
                      <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm" placeholder="John Doe" required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Restaurant Name</label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                        <input type="text" value={regRestaurantName} onChange={(e) => setRegRestaurantName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm" placeholder="The Golden Plate" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Cuisine / Menu Type</label>
                      <div className="relative">
                        <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone pointer-events-none" />
                        <select value={regCuisine} onChange={(e) => setRegCuisine(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm appearance-none" required>
                          <option value="" disabled>Select Cuisine</option>
                          <option value="Tiffins Center" className="bg-ink text-white">Tiffins Center / South Indian</option>
                          <option value="Indian" className="bg-ink text-white">Indian / Multi-Cuisine</option>
                          <option value="Cafe" className="bg-ink text-white">Cafe / Coffee Shop</option>
                          <option value="Fast Food" className="bg-ink text-white">Fast Food / QSR</option>
                          <option value="Fine Dining" className="bg-ink text-white">Fine Dining</option>
                          <option value="Generic" className="bg-ink text-white">Generic / Global</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Service Type</label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone pointer-events-none" />
                        <select value={regServiceType} onChange={(e) => setRegServiceType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm appearance-none" required>
                          <option value="fine_dining" className="bg-ink text-white">Fine Dining / Table Service</option>
                          <option value="self_service" className="bg-ink text-white">Self-Service / QSR / Food Court</option>
                          <option value="cafeteria" className="bg-ink text-white">Café / Casual Dining</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-stone pl-1">Primary Color (Hex)</label>
                        <input type="text" value={regPrimaryColor} onChange={e => setRegPrimaryColor(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm" placeholder="#8A1A2A" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-stone pl-1">Secondary Color (Hex)</label>
                        <input type="text" value={regSecondaryColor} onChange={e => setRegSecondaryColor(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm" placeholder="#C9A348" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Upload Logo (Optional)</label>
                      <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-stone text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone pl-1">Upload Menu (Image/PDF for AI extraction)</label>
                      <input type="file" accept="image/*,application/pdf" onChange={e => setMenuFile(e.target.files?.[0] || null)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-stone text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20" />
                    </div>

                    <button
                      type="submit"
                      disabled={busy || !emailVerified}
                      className="w-full bg-clay disabled:opacity-50 disabled:cursor-not-allowed hover:bg-clay-dark text-white font-semibold rounded-xl py-3 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-clay/20"
                    >
                      {busy ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> <span>Creating...</span></>
                      ) : "Create Restaurant"}
                    </button>
                  </div>
                  </div>


                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 text-xs space-y-3"
                  >
                    <div className="text-emerald-400 font-semibold text-sm">Trial Activated Successfully!</div>
                    <div>
                      <span className="text-stone">Your URL:</span>{" "}
                      <a href={typeof window !== "undefined" ? `${window.location.protocol}//${result.url.replace("/r/", "")}.${window.location.hostname.replace("www.", "")}${window.location.port ? ":" + window.location.port : ""}/admin` : result.url} className="text-electric-blue hover:underline font-bold">
                        {typeof window !== "undefined" ? `${window.location.protocol}//${result.url.replace("/r/", "")}.${window.location.hostname.replace("www.", "")}${window.location.port ? ":" + window.location.port : ""}/admin` : result.url}
                      </a>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-stone font-medium mb-1">Admin Login Credentials:</div>
                      {Object.entries(result.credentials).map(([role, cred]) => (
                        <div key={role} className="flex justify-between bg-white/5 rounded-lg px-3 py-1.5">
                          <span className="text-white capitalize">{role}:</span>
                          <span className="text-stone">{cred.email} / {cred.password}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={typeof window !== "undefined" ? `${window.location.protocol}//${result.url.replace("/r/", "")}.${window.location.hostname.replace("www.", "")}${window.location.port ? ":" + window.location.port : ""}/admin` : result.url}
                      className="block text-center bg-white hover:bg-cream text-ink font-semibold rounded-lg py-2 text-xs transition mt-2"
                    >
                      Login to Admin Dashboard
                    </Link>
                  </motion.div>
                )}

              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {tab === "login" && <DemoCredentialsSection />}

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-xs text-stone hover:text-white transition">
            SmartDine Staff? Login here &rarr;
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function DemoCredentialsSection() {
  const allRestaurants = useAllRestaurantConfigs();
  const [creds, setCreds] = useState<{ users: Array<{ email: string; password: string; name: string; role: string }> } | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("slug");
    if (s) setSelected(s);
  }, []);

  useEffect(() => {
    if (!selected) { setCreds(null); return; }
    api(`/api/admin/demo-creds?slug=${encodeURIComponent(selected)}`)
      .then(d => setCreds(d))
      .catch(() => setCreds({ users: [] }));
  }, [selected]);

  const roleColors: Record<string, string> = {
    admin: "bg-electric-blue/20 text-electric-blue",
    kitchen: "bg-clay/20 text-clay",
    counter: "bg-gold/20 text-gold",
    customer: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <div className="mt-8 bg-graphite/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-xs space-y-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Demo Credentials</span>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-stone text-xs focus:outline-none focus:ring-1 focus:ring-electric-blue/50"
        >
          <option value="">Select a restaurant...</option>
          {allRestaurants.map(r => (
            <option key={r.slug} value={r.slug}>{r.name}</option>
          ))}
        </select>
      </div>

      {selected && !creds && <div className="text-stone animate-pulse">Loading...</div>}

      {creds && creds.users.length === 0 && (
        <div className="text-stone">No demo credentials available for this restaurant.</div>
      )}

      {creds && creds.users.length > 0 && (
        <div className="space-y-2">
          {creds.users.map((u, i) => (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleColors[u.role] || "bg-white/10 text-stone"}`}>
                  {u.role}
                </span>
                <span className="text-white truncate">{u.email}</span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-stone">{u.password}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${u.email}:${u.password}`); toast.success("Copied email:password"); }}
                  className="text-[10px] text-electric-blue/60 hover:text-electric-blue transition-colors"
                  title="Copy email:password"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!selected && (
        <div className="text-stone/60 text-[10px]">
          Select a restaurant above to view demo login credentials for all staff roles.
        </div>
      )}
    </div>
  );
}
