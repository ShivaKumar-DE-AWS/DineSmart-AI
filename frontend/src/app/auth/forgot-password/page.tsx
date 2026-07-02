"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success("Reset link sent if the account exists");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !token) return;
    
    setLoading(true);
    try {
      const res = await api<{ message: string; role?: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      toast.success("Password reset successfully. You can now log in.");
      if (res.role === "superadmin") {
        router.push("/auth/login");
      } else {
        router.push("/auth/restaurant");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6 selection:bg-electric-blue/30 font-sans text-cream">
      {/* Background glowing orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-electric-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-clay/10 rounded-full blur-[150px]" />
      </div>

      <Link href="/auth/restaurant" className="fixed top-8 left-8 flex items-center gap-2 text-stone hover:text-white transition group z-50">
        <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Login</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="text-2xl font-bold tracking-tight bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-2 mb-6 shadow-2xl">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-white">Smart</span>
            <span className="text-clay">Dine</span>
            <span className="text-electric-blue ml-1">AI</span>
          </div>
          <h1 className="font-heading text-3xl text-white mb-2">
            {token ? "Set New Password" : "Reset Password"}
          </h1>
          <p className="text-stone text-sm max-w-[280px]">
            {token ? "Enter a strong new password below to secure your account." : "Enter your email and we'll send you a link to reset your password securely."}
          </p>
        </div>

        <div className="bg-graphite/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {token ? (
              <motion.form 
                key="reset"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleResetPassword} 
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone pl-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  disabled={loading}
                  className="w-full bg-white hover:bg-cream text-ink font-semibold rounded-xl py-3.5 transition flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm New Password"}
                </button>
              </motion.form>
            ) : sent ? (
              <motion.div 
                key="sent"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-electric-blue/10 rounded-full flex items-center justify-center mx-auto border border-electric-blue/20">
                  <ShieldCheck className="w-8 h-8 text-electric-blue" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-heading text-white">Check your email</h2>
                  <p className="text-sm text-stone leading-relaxed">
                    We've sent a password reset link to <span className="text-white font-medium">{email}</span>. It might take a minute to arrive.
                  </p>
                </div>
                
                <button
                  onClick={() => setSent(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl py-3.5 transition border border-white/10"
                >
                  Try a different email
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="request"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleRequestReset} 
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-cream text-ink font-semibold rounded-xl py-3.5 transition flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><Loader2 className="animate-spin text-stone" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
