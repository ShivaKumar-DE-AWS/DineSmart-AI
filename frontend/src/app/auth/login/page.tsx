"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Store } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { toast } from "sonner";

type Tab = "login" | "register";

export default function SaaSAuthPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  
  const [tab, setTab] = useState<Tab>("login");
  const [busy, setBusy] = useState(false);

  // Login state
  const [email, setEmail] = useState("mehfil@smartdine.ai");
  const [password, setPassword] = useState("Owner@123");

  // Registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRestaurantName, setRegRestaurantName] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: "admin" | "kitchen" | "counter" | "customer" } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.user, res.token);
      toast.success(`Welcome back, ${res.user.name}`);
      const dest = res.user.role === "admin" ? "/admin"
        : res.user.role === "kitchen" ? "/kitchen"
        : res.user.role === "counter" ? "/counter"
        : "/customer";
      router.push(dest);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Sign in failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Registration is currently in private beta. Please contact sales.");
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
            {tab === "login" ? "Welcome back" : "Create your restaurant"}
          </h1>
          <p className="text-stone text-sm">
            {tab === "login" 
              ? "Sign in to manage your AI-powered restaurant."
              : "Start your 14-day free trial today."}
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
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "register" ? "bg-white/10 text-white shadow-sm" : "text-stone hover:text-white"
              }`}
            >
              Start Trial
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
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 transition"
                      placeholder="••••••••"
                      required
                    />
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
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">Full Name</label>
                  <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50 focus:border-clay/50 transition"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">Restaurant Name</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type="text" 
                      value={regRestaurantName}
                      onChange={(e) => setRegRestaurantName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50 focus:border-clay/50 transition"
                      placeholder="The Golden Plate"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type="email" 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50 focus:border-clay/50 transition"
                      placeholder="john@goldenplate.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type="password" 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-clay/50 focus:border-clay/50 transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-clay hover:bg-clay-dark text-white font-semibold rounded-xl py-3.5 transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-clay/20"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start 14-Day Free Trial"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {tab === "login" && (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-stone space-y-2 backdrop-blur-md">
            <div className="font-semibold text-white mb-2">Demo Credentials:</div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-white">Admin:</span> mehfil@smartdine.ai</div>
              <div><span className="text-white">Pass:</span> Owner@123</div>
              <div><span className="text-white">Kitchen:</span> chef@smartdine.ai</div>
              <div><span className="text-white">Pass:</span> Chef@123</div>
              <div><span className="text-white">Counter:</span> counter@smartdine.ai</div>
              <div><span className="text-white">Pass:</span> Counter@123</div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
