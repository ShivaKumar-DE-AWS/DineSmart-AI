"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const [email, setEmail] = useState("owner@smartdine.ai");
  const [password, setPassword] = useState("Owner@123");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ token: string; user: any }>("/api/auth/login", {
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
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream bg-grain flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-bone p-8 shadow-xl">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
          <span className="font-heading font-semibold text-lg">SmartDine<span className="text-clay">.</span>AI</span>
        </Link>
        <h1 className="font-heading text-3xl mb-2 tracking-tight">Staff sign in</h1>
        <p className="text-stone text-sm mb-6">Use a seeded role account to enter operational portals.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Email</label>
            <Input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Password</label>
            <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <button type="submit" data-testid="login-submit" disabled={busy} className="w-full bg-ink text-cream rounded-full px-6 py-3.5 font-medium hover:bg-ink/85 disabled:opacity-50 transition">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 text-xs text-stone space-y-1.5">
          <div className="font-semibold uppercase tracking-wider">Seeded accounts</div>
          <div>owner@smartdine.ai / Owner@123 (admin)</div>
          <div>chef@smartdine.ai / Chef@123 (kitchen)</div>
          <div>counter@smartdine.ai / Counter@123 (counter)</div>
          <div>guest@smartdine.ai / Guest@123 (customer)</div>
        </div>
      </div>
    </div>
  );
}
