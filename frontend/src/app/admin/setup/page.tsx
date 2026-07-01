"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Sparkles, UtensilsCrossed, QrCode, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SetupWizard() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api<any>("/api/admin/settings"),
  });

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // If not sandbox, redirect to admin
  useEffect(() => {
    if (settings && !settings.sandbox_mode) {
      router.push("/admin");
    }
  }, [settings, router]);

  const sendOtpMut = useMutation({
    mutationFn: () => api("/api/admin/resend-otp", { method: "POST" }),
    onMutate: () => setSendingOtp(true),
    onSuccess: () => {
      toast.success("Verification code sent to your email and phone!");
      setSendingOtp(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send code");
      setSendingOtp(false);
    }
  });

  const verifyMut = useMutation({
    mutationFn: (code: string) => api("/api/admin/verify", {
      method: "POST",
      body: JSON.stringify({ otp: code })
    }),
    onSuccess: () => {
      toast.success("Restaurant Verified! You are now live.");
      qc.invalidateQueries();
      router.push("/admin");
    },
    onError: (err: any) => toast.error(err.message || "Invalid code")
  });

  if (isLoading) return <div className="p-8 text-stone flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading Setup...</div>;
  if (!settings?.sandbox_mode) return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="h-16 w-16 bg-brand-secondary/10 text-brand-secondary rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-3xl mb-2 text-ink">Welcome to SmartDine!</h1>
        <p className="text-stone">Let's get your restaurant ready for live orders.</p>
      </div>

      <div className="bg-white border border-bone rounded-2xl p-8 shadow-sm">
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-bone -z-10" />
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-brand-secondary text-white' : 'bg-cream text-stone border border-bone'}`}>
              {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-brand-secondary" /> Review Menu</h2>
            <p className="text-stone text-sm mb-6">Our AI is extracting your menu if you uploaded one. Please review your menu items, set prices, and add any missing items.</p>
            <div className="flex gap-4">
              <button onClick={() => window.open("/admin/menu", "_blank")} className="px-4 py-2 border border-bone rounded-lg text-sm font-medium hover:bg-cream">Open Menu Settings</button>
              <button onClick={() => setStep(2)} className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-bold ml-auto flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><QrCode className="w-5 h-5 text-brand-secondary" /> Setup Tables & QR Codes</h2>
            <p className="text-stone text-sm mb-6">We've generated 10 default tables for you. You can print the QR codes for these tables or add more tables.</p>
            <div className="flex gap-4">
              <button onClick={() => window.open("/admin/tables", "_blank")} className="px-4 py-2 border border-bone rounded-lg text-sm font-medium hover:bg-cream">Open Tables</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-brand-secondary text-white rounded-lg text-sm font-bold ml-auto flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-brand-secondary" /> Go Live!</h2>
            <p className="text-stone text-sm mb-6">You are currently in <strong>Sandbox Mode</strong>. To disable Sandbox mode and take real customer orders, please request a final verification code.</p>
            
            <div className="bg-cream rounded-xl p-6 border border-bone">
              <button onClick={() => sendOtpMut.mutate()} disabled={sendingOtp || sendOtpMut.isPending} className="w-full mb-4 px-4 py-3 bg-white border border-bone rounded-lg font-semibold hover:bg-stone/5 transition flex justify-center">
                {sendingOtp || sendOtpMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Verification Code"}
              </button>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="flex-1 px-4 py-2 border border-bone rounded-lg focus:outline-brand-secondary text-center text-lg font-mono tracking-widest"
                />
                <button 
                  onClick={() => verifyMut.mutate(otp)} 
                  disabled={!otp || verifyMut.isPending}
                  className="px-6 py-2 bg-brand-secondary text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {verifyMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Go Live"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
