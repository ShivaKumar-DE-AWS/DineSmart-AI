"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { toast } from "sonner";
import { Sparkles, ArrowRight, User2, Phone, Lock, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { MehfilLogo } from "@/components/customer/MehfilLogo";

type Tab = "guest" | "staff";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const [tab, setTab] = useState<Tab>("guest");
  const [busy, setBusy] = useState(false);

  // Guest fields
  const [gName, setGName] = useState("");
  const [gPhone, setGPhone] = useState("");

  // Staff fields
  const [email, setEmail] = useState("owner@smartdine.ai");
  const [password, setPassword] = useState("Owner@123");

  const continueAsGuest = async () => {
    setBusy(true);
    try {
      const res = await api<{ token: string; user: { id: string; email: string; name: string; role: "customer" } }>("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({ name: gName.trim() || undefined, phone: gPhone.trim() || undefined }),
      });
      setSession(res.user, res.token);
      toast.success(`Welcome to Mehfil, ${res.user.name}`);
      router.push("/customer/menu");
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
      const dest = res.user.role === "admin" ? "/admin"
        : res.user.role === "kitchen" ? "/kitchen"
        : res.user.role === "counter" ? "/counter"
        : "/customer";
      router.push(dest);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mehfil min-h-screen mehfil-paper flex items-center justify-center p-5">
      <Link href="/customer" data-testid="back-to-home" className="fixed top-5 left-5 flex items-center gap-1 text-[#8A1A2A] hover:text-[#C9A348] font-royal tracking-wider uppercase text-xs">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <MehfilLogo size="md" />
          <p className="font-editorial italic text-[#5C0E1B]/75 mt-3 text-sm">A Hyderabadi mehfil awaits — step right in.</p>
        </div>

        <div className="bg-[#FAF5EC] border border-[#C9A348]/40 rounded-2xl p-7 shadow-2xl backdrop-blur">
          {/* Tabs */}
          <div className="flex bg-[#F3EBD8] rounded-full p-1 mb-6" data-testid="login-tabs">
            <button
              data-testid="tab-guest"
              onClick={() => setTab("guest")}
              className={`flex-1 py-2.5 rounded-full font-royal tracking-[0.2em] uppercase text-[10px] transition ${
                tab === "guest" ? "bg-[#8A1A2A] text-[#FAF5EC] shadow-md" : "text-[#8A1A2A]"
              }`}
            >
              I&apos;m a Guest
            </button>
            <button
              data-testid="tab-staff"
              onClick={() => setTab("staff")}
              className={`flex-1 py-2.5 rounded-full font-royal tracking-[0.2em] uppercase text-[10px] transition ${
                tab === "staff" ? "bg-[#8A1A2A] text-[#FAF5EC] shadow-md" : "text-[#8A1A2A]"
              }`}
            >
              Mehfil Staff
            </button>
          </div>

          {tab === "guest" ? (
            <div data-testid="guest-pane">
              <div className="mehfil-divider mb-5"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">Continue as Guest</span></div>
              <p className="font-editorial italic text-sm text-[#1A1106]/70 text-center mb-6 leading-relaxed">
                No password needed. Tell us your name and number if you&apos;d like us to address you properly and ping when your thali is ready.
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your name (optional)</span>
                  <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                    <User2 className="h-4 w-4 text-[#8A1A2A]" />
                    <input
                      data-testid="guest-name"
                      value={gName}
                      onChange={(e) => setGName(e.target.value)}
                      placeholder="e.g. Aisha"
                      className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Phone (optional)</span>
                  <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                    <Phone className="h-4 w-4 text-[#8A1A2A]" />
                    <input
                      data-testid="guest-phone"
                      type="tel"
                      value={gPhone}
                      onChange={(e) => setGPhone(e.target.value)}
                      placeholder="+91 90000 12345"
                      className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                    />
                  </div>
                </label>
              </div>
              <button
                data-testid="continue-as-guest"
                onClick={continueAsGuest}
                disabled={busy}
                className="mt-6 w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy ? "One moment…" : <>Continue as Guest <ArrowRight className="h-4 w-4" /></>}
              </button>
              <div className="mt-5 text-center font-editorial italic text-[11px] text-[#1A1106]/55">
                By continuing you agree to our gentle terms — no spam, only delicious updates.
              </div>
            </div>
          ) : (
            <form onSubmit={staffSubmit} data-testid="staff-pane" className="space-y-3">
              <div className="mehfil-divider mb-5"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">Mehfil Staff Sign in</span></div>
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Email</span>
                <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                  <Sparkles className="h-4 w-4 text-[#8A1A2A]" />
                  <input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial" />
                </div>
              </label>
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Password</span>
                <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                  <Lock className="h-4 w-4 text-[#8A1A2A]" />
                  <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial" />
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
              <div className="mt-5 text-[10px] text-[#1A1106]/55 space-y-1 font-royal tracking-wider uppercase">
                <div className="font-semibold text-[#8A6A1B]">Seeded staff</div>
                <div>owner@smartdine.ai / Owner@123 — Admin</div>
                <div>chef@smartdine.ai / Chef@123 — Kitchen</div>
                <div>counter@smartdine.ai / Counter@123 — Counter</div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
