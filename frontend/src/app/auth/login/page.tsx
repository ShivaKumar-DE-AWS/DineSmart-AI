"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Shield, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { toast } from "sonner";

export default function HQLoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);

  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: string; restaurant_id?: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.user.role !== "superadmin") {
        toast.error("This portal is for SmartDine HQ staff only. Restaurant partners should use the Partner Portal.");
        setBusy(false);
        return;
      }

      setSession(res.user as any, res.token);
      toast.success(`Welcome to HQ, ${res.user.name}`);
      router.push("/super-admin");
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Authentication failed.");
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
            SmartDine HQ
          </h1>
          <p className="text-stone text-sm">
            Authorized SmartDine staff access only.
          </p>
        </div>

        <div className="bg-graphite/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 transition"
                  placeholder="name@smartdine.ai"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-medium text-stone">Password</label>
                <a href="/auth/forgot-password" className="text-xs text-electric-blue hover:text-electric-blue/80 transition">
                  Forgot password?
                </a>
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
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to HQ"}
            </button>
          </form>
        <div className="mt-6 text-center">
          <Link href="/auth/restaurant" className="text-xs text-stone hover:text-white transition">
            Restaurant partner? Sign in here &rarr;
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
